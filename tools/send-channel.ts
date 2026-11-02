import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

// 1. .env 파일에서 토큰 로드
const rootDir = resolve(import.meta.dir, "..");
const envPath = resolve(rootDir, ".env");

let token = process.env.DISCORD_BOT_TOKEN;
if (!token && existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DISCORD_BOT_TOKEN=")) {
      token = trimmed.slice("DISCORD_BOT_TOKEN=".length).trim();
      break;
    }
  }
}

if (!token) {
  console.error("❌ DISCORD_BOT_TOKEN을 찾을 수 없습니다.");
  process.exit(1);
}

// 2. 인자 파싱: channelId, message
const channelId = process.argv[2];
const content = process.argv.slice(3).join(" ").trim();

if (!channelId || !content) {
  console.log("사용법: bun run tools/send-channel.ts <채널ID> <전송할 메시지>");
  process.exit(1);
}

// 3. 디스코드 REST API로 메시지 전송 (POST)
async function sendChannelMessage() {
  try {
    const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "vibe-bot/1.0",
      },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ 메시지 전송 실패 (HTTP ${res.status}): ${errText}`);
      process.exit(1);
    }

    const data: any = await res.json();
    console.log(`✅ [채널 ID: ${channelId}] 메시지 전송 성공! (메시지 ID: ${data.id})`);
  } catch (error: any) {
    console.error(`❌ 네트워크/실행 오류: ${error.message || error}`);
    process.exit(1);
  }
}

sendChannelMessage();
