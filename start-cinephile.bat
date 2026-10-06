@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
    echo Installing dependencies, please wait...
    call "D:\npm.cmd" install
)
echo در حال راه‌اندازی سینمافیل... Edge به‌زودی باز می‌شود
start "" /B "D:\npm.cmd" run dev
timeout /t 12 /nobreak >nul
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" "http://localhost:3000"