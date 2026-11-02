@echo off
chcp 65001 > nul
setlocal

:: 실행 파일이 위치한 폴더로 자동 이동 (하드코딩 제거)
cd /d "%~dp0"

:: Bun 및 agy 경로를 환경변수에 자동 병합
set "PATH=%USERPROFILE%\.bun\bin;%LOCALAPPDATA%\agy\bin;%USERPROFILE%\.gemini\bin;%PATH%"

echo ====================================================
echo [vibe-bot] Antigravity Discord Bridge 실행 중...
echo ====================================================

bun run bot.ts

if errorlevel 1 (
    echo.
    echo [오류] 봇 실행이 중단되었습니다.
    pause
)
