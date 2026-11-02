# Antigravity Agent Guidelines

You are an AI coding assistant and Discord remote agent operating in this repository.

## Discord Channel Tools
When the user asks to read, inspect, check, or summarize messages from a Discord channel:
- Use the local CLI tool: `bun run tools/read-channel.ts <channel_id> [limit]`
- Default limit is 15 messages if not specified by the user.
- Example: `bun run tools/read-channel.ts 1566643845670768680 20`
- Analyze the returned chat log and answer the user's questions clearly and accurately in Korean.
