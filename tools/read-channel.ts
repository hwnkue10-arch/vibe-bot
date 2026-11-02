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

// 2. 인자 파싱: channelId, limit
const channelId = process.argv[2];
const limit = Math.min(Math.max(parseInt(process.argv[3] || "20", 10), 1), 100);

if (!channelId) {
  console.log("사용법: bun run tools/read-channel.ts <채널ID> [가져올개수]");
  process.exit(1);
}

// 3. 디스코드 REST API로 채널 메시지 조회
async function fetchChannelMessages() {
  try {
    const url = `https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bot ${token}`,
        "User-Agent": "vibe-bot/1.0",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ 메시지 조회 실패 (HTTP ${res.status}): ${errText}`);
      process.exit(1);
    }

    const messages = await res.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      console.log(`[채널 ${channelId}] 최근 메시지가 없습니다.`);
      return;
    }

    // 시간 오름차순(과거 -> 최신) 정렬
    messages.reverse();

    console.log(`=== [채널 ID: ${channelId}] 최근 메시지 ${messages.length}개 ===\n`);
    for (const msg of messages) {
      const timestamp = new Date(msg.timestamp).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
      const author = msg.author?.username || "알 수 없음";
      const content = msg.content || "(내용 없음 또는 첨부파일)";
      console.log(`[${timestamp}] ${author}: ${content}`);
    }
  } catch (error: any) {
    console.error(`❌ 네트워크/실행 오류: ${error.message || error}`);
    process.exit(1);
  }
}

fetchChannelMessages();
