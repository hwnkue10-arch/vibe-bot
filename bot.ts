import { Client, GatewayIntentBits, Partials } from "discord.js";
import { readFileSync, existsSync } from "fs";
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

// 2. 설정 및 허용목록(access.json) 로드
const accessConfigPath = resolve(rootDir, "access.json");
if (!existsSync(accessConfigPath)) {
  console.error("❌ access.json 파일을 찾을 수 없습니다.");
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

// 3. 디스코드 클라이언트 생성
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.once("ready", () => {
  console.log(`====================================================`);
  console.log(`✅ Antigravity Discord 봇 로그인 성공! [${client.user?.tag}]`);
  console.log(`🔒 허용된 사용자 ID: ${allowList.join(", ")}`);
  console.log(`====================================================`);
  console.log(`📡 디스코드 메시지 수신 대기 중...`);
});

// 4. 메시지 수신 및 처리
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // 허용목록(allowlist) 검증 - 지정된 사용자만 처리
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
    // 지정 채널: 멘션 없이 응답
    shouldRespond = true;
  } else if (isBotMentioned) {
    // 일반 채널: 멘션 시 응답
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

  // 지속적인 '입력 중...(typing)' 상태 유지 (10초마다 갱신)
  await message.channel.sendTyping().catch(() => {});
  const typingInterval = setInterval(() => {
    message.channel.sendTyping().catch(() => {});
  }, 8000);

  try {
    if (userQuery === "!ping" || userQuery === "ping") {
      await message.reply("🏓 pong! Antigravity 에이전트 브릿지가 정상 연결되어 있습니다.");
      return;
    }

    // 동적 탐색된 agy 바이너리로 Antigravity 호출
    const agyBin = getAgyExecutable();
    const escapedQuery = userQuery.replace(/"/g, '\\"');
    const cmd = `${agyBin} --dangerously-skip-permissions --model gemini-3.8-flash-high -p "${escapedQuery}"`;

    console.log(`🤖 Antigravity CLI 실행 중 (타임아웃 180초)...`);
    
    // 타임아웃을 180초(3분)로 넉넉하게 설정하여 복잡한 조사/코드 실행도 안정적으로 완료
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
