<p align="center">
  <img src="assets/vibe_bot_banner.jpg" alt="vibe-bot Banner" width="100%">
</p>

<h1 align="center">⚡ vibe-bot: Antigravity Discord Agent Bridge</h1>

<p align="center">
  <b>스마트폰 및 외부 Discord 메신저로 내 컴퓨터의 Google Antigravity AI 에이전트를 원격 제어하는 양방향 브릿지 시스템</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Runtime-Bun_v1.4.4-black?logo=bun" alt="Bun">
  <img src="https://img.shields.io/badge/Language-TypeScript-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Library-Discord.js_v14-5865F2?logo=discord" alt="Discord.js">
  <img src="https://img.shields.io/badge/AI_Engine-Antigravity_CLI_(agy)-4285F4?logo=google" alt="Antigravity">
  <img src="https://img.shields.io/badge/Model-Gemini_3.8_Flash-orange" alt="Gemini">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

---

## 📖 프로젝트 개요

`vibe-bot`은 집이나 사무실의 컴퓨터를 켜두고 외출했을 때, **스마트폰 디스코드 앱으로 내 PC의 AI 에이전트(Antigravity CLI)에게 코딩 작업이나 명령을 지시하고 실시간으로 결과를 돌려받을 수 있도록 연결해 주는 에이전틱 브릿지(Agentic Bridge)**입니다.

<p align="center">
  <img src="assets/vibe_bot_icon.jpg" alt="vibe-bot Avatar" width="120" style="border-radius: 50%;">
</p>

---

## ✨ 핵심 기능 (Features)

- 📱 **원격 코드 및 터미널 제어**: 어디서든 디스코드 채팅으로 `"git status 해줘"`, `"버그 찾아줘"`, `"테스트 돌려줘"` 등 실제 로컬 작업 실행
- 🔒 **화이트리스트 보안 제어 (`access.json`)**: 지정된 사용자 ID(본인)의 메시지만 처리하여 외부인의 무단 명령 원천 차단
- 📢 **스마트 멘션 라우팅**:
  - **전용 작업 채널**: 멘션(`@봇`) 없이 텍스트만 입력해도 자동 응답
  - **일반 서버 채널**: 다른 대화를 방해하지 않도록 `@vibe bot` 멘션 시에만 선택적 응답
  - **1:1 개인 메시지(DM)**: 멘션 없이 자유롭게 1:1 대화
- ⚡ **초고속 응답 & 경량화**: Zig 기반 초고속 **Bun 런타임**과 가볍고 빠른 **Gemini 3.8 Flash** 모델 탑재
- 💻 **어떤 PC에서도 무설치 호환**: 하드코딩된 절대 경로가 없어 깃허브 클론 후 더블클릭만으로 즉시 구동

---

## 🛠️ 기술 스택 (Tech Stack)

| 구분 | 기술 / 도구 | 용도 및 설명 |
| :--- | :--- | :--- |
| **Runtime** | **[Bun](https://bun.sh) (v1.4+)** | Node.js 대비 수배 빠른 초고속 TypeScript 실행 및 패키지 관리 |
| **Language** | **TypeScript** | 정적 타입을 통한 안정적인 이벤트 처리 및 모듈 개발 |
| **Discord API** | **[Discord.js](https://discord.js.org/) (v14)** | Gateway Intents 및 실시간 WebSocket 이벤트 송수신 |
| **AI Agent CLI**| **Google Antigravity CLI (`agy`)** | 파일 편집, 쉘 명령어 실행, 분석을 수행하는 로컬 AI 에이전트 |
| **AI Model** | **Gemini 3.8 Flash (High)** | 지연 시간이 짧고 토큰 효율이 뛰어난 코딩 특화 모델 |
| **Security** | **JSON Allowlist & `.env`** | 봇 토큰 보호 및 사용자/채널별 접근 권한 격리 |

---

## 🏛️ 시스템 구조도 (Architecture)

```mermaid
sequenceDiagram
    autonumber
    actor User as 사용자 (스마트폰 / 디스코드)
    participant Gateway as Discord Gateway
    participant Bridge as vibe-bot (Bun Runtime)
    participant Auth as access.json (보안 허용목록)
    participant Agent as Antigravity CLI (Gemini 3.8 Flash)
    participant Workspace as 로컬 PC 프로젝트

    User->>Gateway: "git status 해줘" 메시지 전송
    Gateway->>Bridge: messageCreate 이벤트 수신
    Bridge->>Auth: 사용자 ID & 채널 멘션 규칙 검증
    alt 허용되지 않은 사용자
        Bridge-->>Gateway: 메시지 조용히 무시 (보안 유지)
    else 허용된 사용자
        Bridge->>Gateway: typing indicator (입력 중...)
        Bridge->>Agent: agy -p "git status 해줘" 실행
        Agent->>Workspace: 로컬 git 명령 실행 및 결과 도출
        Workspace-->>Agent: 결과 반환
        Agent-->>Bridge: 표준 출력(stdout) 수집
        Bridge->>Gateway: 디스코드 메시지 전송 (2000자 초과 시 분할 전송)
        Gateway-->>User: 디스코드 채팅창에 결과 답장 도착!
    end
```

---

## 🚀 상세 설정 및 실행 가이드 (Step-by-Step)

### 1단계: 디스코드 봇 애플리케이션 생성
1. [Discord Developer Portal](https://discord.com/developers/applications)에 접속하여 **New Application** 클릭 (이름: `vibe-bot`)
2. **General Information**:
   - `assets/vibe_bot_icon.jpg`를 **APP ICON**으로 등록
   - `assets/vibe_bot_banner.jpg`를 **APP BANNER**로 등록
3. **Bot 탭**:
   - ⚠️ **`MESSAGE CONTENT INTENT` 토글을 반드시 ON으로 켜고 저장** (최다 사고 방지!)
   - **`Public Bot`**을 **OFF**로 변경 (외부 서버 초대 방지)
   - **`Reset Token`**을 눌러 봇 토큰 문자열 복사
4. **OAuth2 → URL Generator**:
   - **Scopes**: `bot` 체크
   - **Bot Permissions** (딱 6개만 체크):
     `View Channels`, `Send Messages`, `Send Messages in Threads`, `Read Message History`, `Attach Files`, `Add Reactions`
   - 생성된 URL을 브라우저에 열어 **내 디스코드 서버로 봇 초대**

---

### 2단계: 환경 설정 파일 준비

1. 저장소를 클론합니다:
   ```bash
   git clone <내_저장소_URL>
   cd my-bot
   ```
2. `.env.example`을 복사하여 `.env` 파일을 생성하고 봇 토큰을 입력합니다:
   ```env
   DISCORD_BOT_TOKEN=여기에_발급받은_디스코드_봇_토큰_입력
   ```
3. `access.json` 파일에 본인의 디스코드 사용자 ID와 전용 채널 ID를 설정합니다:
   ```json
   {
     "dmPolicy": "allowlist",
     "allowFrom": [
       "내_디스코드_숫자_ID"
     ],
     "groups": {
       "전용_채널_ID": {
         "requireMention": false,
         "allowFrom": ["내_디스코드_숫자_ID"]
       }
     },
     "pending": {}
   }
   ```
   > 💡 **사용자 ID 확인법**: 디스코드 설정 → 고급 → `개발자 모드` ON 후, 채팅창 내 프로필 우클릭 → `사용자 ID 복사`

---

### 3단계: 실행하기

의존성을 설치하고 봇을 실행합니다:

```powershell
# 의존성 설치
bun install

# 봇 실행
bun run bot.ts
```

> **Windows 사용자 팁**: 폴더에 있는 **`discord_bot.bat`** 파일을 더블클릭하면 모든 경로를 자동으로 설정하여 원클릭으로 봇이 켜집니다!

---

## 💬 사용 예시 (Usage Examples)

| 입력 메시지 (디스코드) | 동작 내용 |
| :--- | :--- |
| `!ping` | 🏓 `pong! Antigravity 에이전트 브릿지가 정상 연결되어 있습니다.` 즉시 응답 |
| `안녕` | 환영 인사 및 대기 중인 Antigravity 에이전트 안내 |
| `git status 해줘` | 로컬 PC의 현재 브랜치 상태 및 변경된 파일 목록 출력 |
| `최근 커밋 로그 보여줘` | `git log -n 3` 등의 실행 결과를 요약하여 디스코드로 전송 |
| `@vibe bot 이 버그 코드 분석해줘` | 일반 서버 채널에서 멘션과 함께 질문 시 Antigravity 에이전트가 코드 분석 답변 제공 |

---

## 🔒 보안 주의사항 (Security)

- **`.env` 파일은 절대 커밋하지 마세요**: `.gitignore`에 등록되어 있어 실수로 올라가지 않도록 방지되어 있습니다.
- **토큰 재발급**: 공용 PC 등 외부 환경에서 작업한 후에는 디스코드 개발자 포털에서 `Reset Token`을 눌러 기존 토큰을 즉시 무효화하세요.
- **최소 권한 원칙**: 봇에 불필요한 관리자(`Administrator`) 권한을 부여하지 마세요.

---

## 📄 라이선스 (License)

This project is licensed under the MIT License.
