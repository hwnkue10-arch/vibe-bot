import { Client, GatewayIntentBits, Partials, TextChannel } from "discord.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// 1. 현재 폴더 기준 경로 설정 (이식성 보장)
const rootDir = resolve(import.meta.dir);

// agy 실행 경로 동적 탐색
function getAgyExecutable(): string {
  if (process.env.AGY_BIN && existsSync(process.env.AGY_BIN)) {
    return `"${process.env.AGY_BIN}"`;
  }
  const userProfile = process.env.USERPROFILE || "";
  const localAppData = process.env.LOCALAPPDATA || "";

  const candidatePaths = [
    join(localAppData, "agy", "bin", "agy.exe"),
    join(userProfile, ".gemini", "bin", "agy.exe"),
    join(userProfile, "AppData", "Local", "agy", "bin", "agy.exe"),
  ];

  for (const candidate of candidatePaths) {
    if (existsSync(candidate)) {
      return `"${candidate}"`;
    }
  }

  return "agy";
}

// 2. 모델 설정 관리 (bot-settings.json 에 영구 저장)
const settingsPath = resolve(rootDir, "bot-settings.json");
interface BotSettings {
  baseModel: string;
  effort: "low" | "medium" | "high";
}

const DEFAULT_SETTINGS: BotSettings = {
  baseModel: "gemini-3.8-flash",
  effort: "high",
};

function loadSettings(): BotSettings {
  if (existsSync(settingsPath)) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(readFileSync(settingsPath, "utf8")) };
    } catch {}
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: BotSettings) {
  try {
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
  } catch (err) {
    console.error("설정 파일 저장 실패:", err);
  }
}

let currentSettings = loadSettings();

// 지원 모델 메타데이터
const SUPPORTED_MODELS = [
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", desc: "초고속, 경량, 추천" },
  { id: "gemini-4-argon", name: "Gemini 4 Argon", desc: "차세대 고성능 모델" },
  { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", desc: "코딩 및 추론 특화" },
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", desc: "복잡한 문제 해결" },
  { id: "gpt-oss-120b", name: "GPT-OSS 120B", desc: "오픈소스 대형 모델" },
];

function getFullModelString(): string {
  return `${currentSettings.baseModel}-${currentSettings.effort}`;
}

// 3. 설정 및 허용목록(access.json) 로드
const accessConfigPath = resolve(rootDir, "access.json");
if (!existsSync(accessConfigPath)) {
  console.error("❌ access.json 파일을 찾을 수 없습니다.");
  console.error("👉 access.example.json 파일을 복사하여 access.json 을 생성하고 본인의 Discord 유저 ID를 입력하세요.");
  process.exit(1);
}

const accessConfig = JSON.parse(readFileSync(accessConfigPath, "utf8"));
const allowList: string[] = accessConfig.allowFrom || [];
const groupsConfig = accessConfig.groups || {};
const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.error("❌ DISCORD_BOT_TOKEN이 .env에 설정되어 있지 않습니다. (.env.example 참조)");
  process.exit(1);
}

// 4. 디스코드 클라이언트 생성
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// 채널 메시지 읽기 헬퍼 함수
async function fetchChannelMessages(targetChannelId: string, limitCount: number = 15): Promise<string> {
  const targetChannel = await client.channels.fetch(targetChannelId).catch(() => null);
  if (!targetChannel || !targetChannel.isTextBased()) {
    throw new Error(`채널을 찾을 수 없거나 텍스트 채널이 아닙니다. (ID: ${targetChannelId})`);
  }
  const messages = await (targetChannel as any).messages.fetch({ limit: limitCount });
  const sorted = Array.from(messages.values()).reverse();
  if (sorted.length === 0) return "(채널에 메시지가 없습니다)";
  
  return sorted.map((m: any) => {
    const time = new Date(m.createdTimestamp).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    return `[${time}] ${m.author.username}: ${m.content || "(첨부/내용없음)"}`;
  }).join("\n");
}

client.once("ready", () => {
  console.log(`====================================================`);
  console.log(`✅ Antigravity Discord 봇 로그인 성공! [${client.user?.tag}]`);
  console.log(`🔒 허용된 사용자 ID: ${allowList.join(", ")}`);
  console.log(`⚙️ 현재 모델: ${getFullModelString()} (Effort: ${currentSettings.effort})`);
  console.log(`====================================================`);
  console.log(`📡 디스코드 메시지 수신 대기 중...`);
});

// 5. 메시지 수신 및 명령어 처리
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // 허용목록 검증
  if (!allowList.includes(message.author.id)) {
    return;
  }

  const isDM = !message.guild;
  const channelId = message.channel.id;
  const channelPolicy = groupsConfig[channelId];
  const isBotMentioned = client.user ? message.mentions.has(client.user) : false;

  let shouldRespond = false;
  if (isDM) {
    shouldRespond = true;
  } else if (channelPolicy && channelPolicy.requireMention === false) {
    shouldRespond = true;
  } else if (isBotMentioned) {
    shouldRespond = true;
  }

  if (!shouldRespond) {
    return;
  }

  // 멘션 태그 제거
  let userQuery = message.content;
  if (client.user) {
    userQuery = userQuery.replace(new RegExp(`<@!?${client.user.id}>`, "g"), "").trim();
  }

  if (!userQuery) {
    await message.reply("네! 말씀해 주시면 Antigravity 에이전트가 도와드립니다.");
    return;
  }

  console.log(`📩 [수신 (${channelId}) from ${message.author.username}]: ${userQuery}`);

  // ----------------------------------------------------
  // 내부 제어 명령어 처리 (!ping, !help, !models, !model, !effort, !read, !summary)
  // ----------------------------------------------------
  const lowerQuery = userQuery.toLowerCase();

  // (1) 핑 테스트
  if (lowerQuery === "!ping" || lowerQuery === "ping") {
    await message.reply(`🏓 pong! 봇 정상 가동 중 (현재 모델: \`${getFullModelString()}\`)`);
    return;
  }

  // (2) 도움말 (!help, !도움말)
  if (lowerQuery === "!help" || lowerQuery === "!도움말") {
    const helpText = [
      "**🤖 vibe-bot 제어 명령어 안내**",
      "• `!model` : 현재 활성화된 모델 및 강도(Effort) 확인",
      "• `!models` : 사용 가능한 모델 및 강도 목록 확인",
      "• `!model <모델명> [강도]` : 모델 변경 (예: `!model claude-sonnet-5-5 high`)",
      "• `!effort <low|medium|high>` : 모델 강도만 변경 (예: `!effort medium`)",
      "• `!read [채널ID] [개수]` : 채널 최근 대화 읽기 (기본: 현재 채널 15개)",
      "• `!ping` : 봇 응답 속도 및 연결 상태 확인",
      "• `git status 해줘` 등 일반 메시지 : 로컬 Antigravity 에이전트가 작업 수행",
    ].join("\n");
    await message.reply(helpText);
    return;
  }

  // (3) 모델 목록 조회 (!models, !모델목록)
  if (lowerQuery === "!models" || lowerQuery === "!모델목록") {
    const lines = [
      "**📋 사용 가능한 Antigravity AI 모델 목록**",
      "",
      ...SUPPORTED_MODELS.map(
        (m) => `• **\`${m.id}\`** : ${m.name} (${m.desc})`
      ),
      "",
      "**⚡ 지원 강도(Effort / 추론 수준)**: `low` | `medium` | `high`",
      "",
      "💡 *변경 예시*: `!model claude-sonnet-5-5 high` 또는 `!effort medium`",
    ];
    await message.reply(lines.join("\n"));
    return;
  }

  // (4) 모델 강도만 변경 (!effort <level>, !강도 <level>)
  if (lowerQuery.startsWith("!effort") || lowerQuery.startsWith("!강도")) {
    const parts = userQuery.split(/\s+/);
    if (parts.length < 2) {
      await message.reply(`현재 설정된 강도는 **\`${currentSettings.effort}\`** 입니다.\n변경하려면 \`!effort low\`, \`!effort medium\`, \`!effort high\` 중 하나를 입력하세요.`);
      return;
    }
    const level = (parts[1] || "").toLowerCase();
    if (level !== "low" && level !== "medium" && level !== "high") {
      await message.reply("⚠️ 잘못된 강도입니다. `low`, `medium`, `high` 중에서 선택해 주세요.");
      return;
    }
    currentSettings.effort = level;
    saveSettings(currentSettings);
    await message.reply(`✅ 모델 강도가 **\`${level}\`**(으)로 변경되었습니다!\n👉 현재 활성 모델: **\`${getFullModelString()}\`**`);
    return;
  }

  // (5) 현재 모델 조회 및 변경 (!model [모델명] [강도])
  if (lowerQuery.startsWith("!model") || lowerQuery.startsWith("!모델")) {
    const parts = userQuery.split(/\s+/);
    if (parts.length === 1) {
      await message.reply(
        `현재 활성 모델은 **\`${getFullModelString()}\`** 입니다.\n(모델: \`${currentSettings.baseModel}\`, 강도: \`${currentSettings.effort}\`)\n\n모델을 변경하려면 \`!model <모델명> [강도]\` 또는 목록 확인은 \`!models\` 를 입력하세요.`
      );
      return;
    }

    let requestedModel = (parts[1] || "").toLowerCase();
    let requestedEffort: "low" | "medium" | "high" | null = null;

    for (const eff of ["low", "medium", "high"] as const) {
      if (requestedModel.endsWith(`-${eff}`)) {
        requestedModel = requestedModel.slice(0, -(eff.length + 1));
        requestedEffort = eff;
        break;
      }
    }

    if (parts.length >= 3) {
      const secondArg = (parts[2] || "").toLowerCase();
      if (secondArg === "low" || secondArg === "medium" || secondArg === "high") {
        requestedEffort = secondArg;
      }
    }

    const matchedModel = SUPPORTED_MODELS.find(
      (m) => m.id === requestedModel || m.id.includes(requestedModel)
    );

    if (!matchedModel) {
      await message.reply(
        `⚠️ 지원되지 않는 모델 이름입니다: \`${parts[1]}\`\n\`!models\` 명령어로 사용 가능한 모델 목록을 확인해 보세요.`
      );
      return;
    }

    currentSettings.baseModel = matchedModel.id;
    if (requestedEffort) {
      currentSettings.effort = requestedEffort;
    }
    saveSettings(currentSettings);

    await message.reply(
      `✅ 모델이 성공적으로 변경되었습니다!\n` +
      `• 모델: **${matchedModel.name}** (\`${matchedModel.id}\`)\n` +
      `• 강도(Effort): **\`${currentSettings.effort}\`**\n` +
      `• 최종 실행 식별자: **\`${getFullModelString()}\`**`
    );
    return;
  }

  // (6) 채널 대화 읽기 (!read [채널ID] [개수], !읽기)
  if (lowerQuery.startsWith("!read") || lowerQuery.startsWith("!읽기")) {
    const parts = userQuery.split(/\s+/);
    let targetCh = channelId;
    let count = 15;
    const arg1 = parts[1] || "";
    const arg2 = parts[2] || "";

    if (parts.length === 2) {
      if (/^\d{17,20}$/.test(arg1)) {
        targetCh = arg1;
      } else if (!isNaN(parseInt(arg1, 10))) {
        count = parseInt(arg1, 10);
      }
    } else if (parts.length >= 3) {
      targetCh = arg1.replace(/[^0-9]/g, "") || channelId;
      count = parseInt(arg2, 10) || 15;
    }

    try {
      await message.channel.sendTyping();
      const chatLog = await fetchChannelMessages(targetCh, count);
      const header = `📜 **채널 [${targetCh}] 최근 메시지 ${count}개**\n\`\`\`text\n`;
      const footer = `\n\`\`\``;
      const combined = header + chatLog + footer;

      if (combined.length <= 1900) {
        await message.reply(combined);
      } else {
        await message.reply(header + chatLog.slice(0, 1800) + `\n... (일부 생략)` + footer);
      }
    } catch (err: any) {
      await message.reply(`⚠️ 채널 메시지를 읽어오지 못했습니다: ${err.message}`);
    }
    return;
  }

  // ----------------------------------------------------
  // 일반 AI 코딩 에이전트 질문 처리
  // ----------------------------------------------------
  await message.channel.sendTyping().catch(() => {});
  const typingInterval = setInterval(() => {
    message.channel.sendTyping().catch(() => {});
  }, 8000);

  try {
    const agyBin = getAgyExecutable();
    const activeModel = getFullModelString();
    const escapedQuery = userQuery.replace(/"/g, '\\"');
    const cmd = `${agyBin} --dangerously-skip-permissions --model "${activeModel}" --effort "${currentSettings.effort}" -p "${escapedQuery}"`;

    console.log(`🤖 Antigravity CLI 실행 중 [${activeModel}]...`);

    const { stdout, stderr } = await execAsync(cmd, {
      cwd: rootDir,
      timeout: 180000,
      maxBuffer: 10 * 1024 * 1024,
    });

    const output = (stdout || stderr || "응답이 비어 있습니다.").trim();

    if (output.length <= 1900) {
      await message.reply(output);
    } else {
      for (let i = 0; i < output.length; i += 1900) {
        await message.reply(output.slice(i, i + 1900));
      }
    }
  } catch (error: any) {
    console.error("❌ 명령 실행 오류:", error);
    await message.reply(`⚠️ 처리 중 오류가 발생했습니다: ${error.message || error}`);
  } finally {
    clearInterval(typingInterval);
  }
});

client.login(token);
