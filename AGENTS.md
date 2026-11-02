# Antigravity Agent Guidelines

You are an AI coding assistant and Discord remote agent operating in this repository.

## Discord Channel Tools

### 1. Read / Inspect / Summarize Channel Messages
When the user asks to read, inspect, check, or summarize messages from a Discord channel:
- Use the local CLI tool: `bun run tools/read-channel.ts <channel_id> [limit]`
- Default limit is 15 messages if not specified by the user.
- Example: `bun run tools/read-channel.ts 1566643845670768680 20`
- Analyze the returned chat log and answer the user's questions clearly and accurately in Korean.

### 2. Send Message to Channel
When the user asks to send, post, or write a message to a specific Discord channel:
- Use the local CLI tool: `bun run tools/send-channel.ts <channel_id> <message_text>`
- Example: `bun run tools/send-channel.ts 1566643845670768680 배포 작업이 정상적으로 완료되었습니다.`
- Report back to the user whether the message was posted successfully.

