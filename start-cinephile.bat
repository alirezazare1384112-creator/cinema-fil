@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "package.json" goto wrong_place

rem اگر Node سراسری نباشد، از portable استفاده کن
where npm >nul 2>nul
if not errorlevel 1 (
    set "NPM_BIN=npm"
    set "PATH=%PATH%"
) else if exist "%LOCALAPPDATA%\CinephileNode\node.exe" (
    set "NPM_BIN=%LOCALAPPDATA%\CinephileNode\npm.cmd"
    set "PATH=%LOCALAPPDATA%\CinephileNode;%PATH%"
    echo  [چک] Node portable استفاده می‌شود.
) else goto no_node

if exist node_modules\next goto ready

rem نصب ناقص یا نصب اول - از صفر و با تکرار روی سرور جایگزین
echo  در حال نصب کتابخانه‌ها - ۱ تا چند دقیقه طول می‌کشد؛ پنجره را نببندید.
if exist node_modules rmdir /s /q node_modules
call "%NPM_BIN%" install --no-audit --no-fund --loglevel=error 2>&1 | findstr /V "npm warn" | findstr /V "deprecated"
if errorlevel 1 goto install_retry
goto check_next

:install_retry
echo  [هشدار] نصب اول ناموفق بود - تلاش مجدد با سرور آینه‌ای...
set PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
call "%NPM_BIN%" install --no-audit --no-fund --loglevel=error --registry=https://registry.npmmirror.com 2>&1 | findstr /V "npm warn" | findstr /V "deprecated"
if errorlevel 1 goto install_failed

:check_next
if not exist "node_modules\next" goto install_failed

:ready
title Cinephile Vault
echo ============================================================
echo  سینمافیل در حال بالا آمدن است...
echo  آدرس: http://localhost:3000
echo  اگر سرور به هر دلیلی متوقف شد، خودش دوباره بالا می‌آید.
echo  برای خاموش کردن کامل، این پنجره را ببند (X).
echo ============================================================

rem باز شدن مرورگر پیش‌فرض کاربر پس از آماده شدن سرور
start "" /B cmd /c "timeout /t 10 /nobreak >nul && start msedge http://localhost:3000"

:loop
call "%NPM_BIN%" run dev
echo.
echo [سینمافیل] سرور متوقف شد - ۳ ثانیه دیگر دوباره بالا می‌آید...
timeout /t 3 /nobreak >nul
goto loop

:wrong_place
echo  ============================================================
echo   [خطا] این فایل داخل پوشه درستِ پروژه نیست!
echo   وارد پوشه‌ای شو که package.json کنارش هست و بعد
echo   setup.bat یا همین start را بزن.
echo  ============================================================
explorer .
pause
exit /b 1

:no_node
echo  ============================================================
echo   [خطا] Node.js پیدا نشد!
echo.
echo   راه‌حل‌ها:
echo     1. اول فایل setup.bat را اجرا کن - خودش Node را نصب می‌کند.
echo     2. یا از https://nodejs.org نسخه 20 را نصب کن.
echo  ============================================================
echo.
pause
exit /b 1

:install_failed
echo  ============================================================
echo   [خطا] نصب کتابخانه‌ها ناموفق ماند.
echo   اینترنت/VPN را روشن کن و دوباره این فایل را بزن.
echo   اگر نشد، فایل install.log را بفرست.
echo  ============================================================
echo.
pause
exit /b 1
