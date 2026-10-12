@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
    echo Installing dependencies, please wait...
    call "D:\npm.cmd" install
)
title Cinephile Vault - Dev Server
echo ============================================================
echo  سینمافیل دارد بالا می‌آید...
echo  اگر سرور به هر دلیلی متوقف شد، خودش دوباره بالا می‌آید.
echo  برای خاموش کردن کامل، این پنجره را ببندید (X).
echo ============================================================
start "" /B cmd /c "timeout /t 10 /nobreak >nul && start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" "http://localhost:3000""

:loop
call "D:\npm.cmd" run dev
echo.
echo [سينمافيل] سرور متوقف شد - 3 ثانيه ديگر دوباره بالا مي آيد...
timeout /t 3 /nobreak >nul
goto loop