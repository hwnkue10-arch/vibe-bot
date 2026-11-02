@echo off
chcp 65001 > nul
setlocal

:: 1. 스크립트 실행 폴더로 이동 (이식성 보장)
cd /d "%~dp0"
title vibe-bot [Antigravity Discord Bridge]

:: 2. Bun 및 Antigravity CLI(agy) 경로를 PATH에 자동 병합
set "PATH=%USERPROFILE%\.bun\bin;%LOCALAPPDATA%\agy\bin;%USERPROFILE%\.gemini\bin;%PATH%"

echo ========================================================
echo   🤖 vibe-bot : Google Antigravity Discord Bridge
echo ========================================================
echo.

:: 3. Bun 설치 여부 확인
where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo [경고] Bun 런타임을 찾을 수 없습니다.
    echo PowerShell에서 다음 명령을 실행하여 Bun을 설치해 주세요:
    echo powershell -c "irm bun.sh/install.ps1|iex"
    echo.
    pause
    exit /b 1
)

:: 4. .env 파일 확인
if not exist ".env" (
    echo [안내] .env 파일이 없습니다.
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo 👉 .env.example 을 복사하여 .env 파일을 생성했습니다.
        echo 👉 .env 파일을 메모장 등으로 열어 디스코드 봇 토큰을 입력해 주세요!
    )
    echo.
    pause
    exit /b 1
)

:: 5. access.json 파일 확인
if not exist "access.json" (
    echo [안내] access.json 파일이 없습니다.
    if exist "access.example.json" (
        copy "access.example.json" "access.json" >nul
        echo 👉 access.example.json 을 복사하여 access.json 파일을 생성했습니다.
        echo 👉 access.json 파일에 본인의 디스코드 유저 ID를 입력해 주세요!
    )
    echo.
    pause
    exit /b 1
)

:: 6. 의존성(node_modules) 자동 설치 검사
if not exist "node_modules\" (
    echo 📦 의존성 패키지를 설치하는 중입니다 (bun install)...
    bun install
    echo.
)

:: 7. 봇 실행
echo 🚀 봇을 가동합니다... (종료하려면 Ctrl+C 를 누르세요)
echo.
bun run bot.ts

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ 봇 실행이 비정상 종료되었습니다.
    pause
)

