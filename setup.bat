@echo off
chcp 65001 >nul
title Cinephile Vault - Setup
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo  ============================================================
echo                  نصب سینمافیل - Cinephile Vault
echo  ============================================================
echo   این ویزارد تمام مراحل نصب را خودکار انجام می‌دهد:
echo     1. بررسی Node.js (اگر نباشد، نسخهٔ portable نصب می‌شود)
echo     2. نصب کتابخانه‌ها (1-3 دقیقه)
echo     3. ساخت دیتابیس محلی
echo     4. ساخت شورتکات دسکتاپ و Start Menu
echo     5. اجرای برنامه
echo.
echo   لطفاً این پنجره را تا پایان نصب نببندید.
echo  ============================================================
echo.

rem ===== محافظ ۱: آیا داخل پوشه درستِ پروژه هستیم؟ =====
if not exist "package.json" goto wrong_place

rem ===== مسیرِ Node portable (در صورت نیاز) =====
set "NODE_DIR=%LOCALAPPDATA%\CinephileNode"
set "NODE_VERSION=v22.11.0"
set "NODE_DIST=https://nodejs.org/dist/%NODE_VERSION%/node-%NODE_VERSION%-win-x64.zip"

rem ===== محافظ ۲: Node و npm =====
where node >nul 2>nul
if not errorlevel 1 (
    set "NODE_BIN=node"
    set "NPM_BIN=npm"
    rem بررسی نسخه
    node -e "process.exit(+process.versions.node.split('.')[0]>=18?0:1)" >nul 2>nul
    if errorlevel 1 goto old_node
    for /f "delims=" %%v in ('node -v') do echo  [چک] Node %%v آماده است.
    for /f "delims=" %%v in ('npm -v') do echo  [چک] npm %%v آماده است.
) else if exist "%NODE_DIR%\node.exe" (
    set "NODE_BIN=%NODE_DIR%\node.exe"
    set "NPM_BIN=%NODE_DIR%\npm.cmd"
    set "PATH=%NODE_DIR%;%PATH%"
    echo  [چک] Node portable (قبلاً نصب‌شده) استفاده می‌شود.
) else (
    echo  [چک] Node.js پیدا نشد - در حال نصبِ نسخهٔ portable بدون دسترسی مدیر...
    echo     نسخه: %NODE_VERSION% (~30MB)
    echo [%date% %time%] node download start >> install.log
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "$ProgressPreference = 'SilentlyContinue';" ^
        "Invoke-WebRequest -Uri '%NODE_DIST%' -OutFile '%TEMP%\node.zip' -UseBasicParsing;"
    if errorlevel 1 goto no_node
    echo  [چک] استخراج Node.js...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "$ProgressPreference = 'SilentlyContinue';" ^
        "Expand-Archive -Path '%TEMP%\node.zip' -DestinationPath '%NODE_DIR%' -Force;"
    if errorlevel 1 goto no_node
    del "%TEMP%\node.zip"
    set "NODE_BIN=%NODE_DIR%\node.exe"
    set "NPM_BIN=%NODE_DIR%\npm.cmd"
    set "PATH=%NODE_DIR%;%PATH%"
    for /f "delims=" %%v in ('"%NODE_BIN%" -v') do echo  [چک] Node %%v portable نصب شد.
)
echo.

rem ===== مرحله ۱: نصب کتابخانه‌ها =====
echo  [1/4] در حال نصب کتابخانه‌ها...
echo        اولین نصب ۱ تا ۳ دقیقه طول می‌کشد؛ این پنجره را نببندید.
echo [%date% %time%] npm install start >> install.log

call "%NPM_BIN%" install --no-audit --no-fund --loglevel=error 2>&1 | findstr /V "npm warn" | findstr /V "deprecated"
if errorlevel 1 goto install_retry

echo [%date% %time%] npm install OK >> install.log
goto install_done

:install_retry
echo [%date% %time%] npm install failed, retry with mirror >> install.log
echo  [هشدار] نصب اول ناموفق شد - تلاش مجدد با سرور آینه‌ای...
set PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
if exist node_modules rmdir /s /q node_modules
call "%NPM_BIN%" install --no-audit --no-fund --loglevel=error --registry=https://registry.npmmirror.com 2>&1 | findstr /V "npm warn" | findstr /V "deprecated"
if errorlevel 1 goto install_failed
echo [%date% %time%] npm install (mirror) OK >> install.log

:install_done
if not exist "node_modules\next" goto install_incomplete
echo        کتابخانه‌ها نصب شدند.

rem ===== مرحله ۲: فایل تنظیمات =====
echo  [2/4] ساخت فایل تنظیمات...
if not exist ".env" (
    if exist ".env.example" (
        copy /Y ".env.example" ".env" >nul
        echo        فایل .env ساخته شد.
    ) else (
        echo        .env.example نیست - رد می‌شود.
    )
) else (
    echo        فایل .env از قبل هست (دست نخورده).
)

rem ===== مرحله ۳: دیتابیس محلی =====
echo  [3/4] ساخت دیتابیس محلی...
echo [%date% %time%] prisma db push start >> install.log
call "%NODE_BIN%" "node_modules\prisma\build\index.js" db push 2>nul
if errorlevel 1 call node_modules\.bin\prisma db push
if errorlevel 1 goto db_failed
echo [%date% %time%] prisma db push OK >> install.log
echo        دیتابیس خالی آماده شد.

rem ===== مرحله ۴: شورتکات + راه‌اندازی =====
echo  [4/4] ساخت شورتکات و راه‌اندازی برنامه...

rem ساخت شورتکات دسکتاپ
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ws = New-Object -ComObject WScript.Shell;" ^
    "$desktop = [Environment]::GetFolderPath('Desktop');" ^
    "$startmenu = [Environment]::GetFolderPath('Programs');" ^
    "$target = '%~dp0start-cinephile.bat';" ^
    "$workdir = '%~dp0';" ^
    "$iconPath = Join-Path $workdir 'build\icon.ico';" ^
    "if (-not (Test-Path $iconPath)) { $iconPath = $null };" ^
    "foreach ($loc in @($desktop, (Join-Path $startmenu 'Cinephile'))) {" ^
    "  if (-not (Test-Path $loc)) { New-Item -ItemType Directory -Path $loc -Force | Out-Null };" ^
    "  $lnk = Join-Path $loc 'Cinephile Vault.lnk';" ^
    "  $s = $ws.CreateShortcut($lnk);" ^
    "  $s.TargetPath = $target;" ^
    "  $s.WorkingDirectory = $workdir;" ^
    "  $s.WindowStyle = 1;" ^
    "  $s.Description = 'Cinephile Vault';" ^
    "  if ($iconPath) { $s.IconLocation = $iconPath };" ^
    "  $s.Save();" ^
    "}"
echo        شورتکات دسکتاپ ساخته شد.

echo.
echo  ============================================================
echo   نصب کامل شد!
echo.
echo   - برنامه در حال اجراست و مرورگر باز می‌شود.
echo   - برای اجرای بعدی: روی آیکون «Cinephile Vault» دسکتاپ
echo     دابل‌کلیک کن.
echo   - برای خاموش کردن، همین پنجره را ببند (X).
echo  ============================================================
echo [%date% %time%] install complete >> install.log

call start-cinephile.bat
exit /b 0

rem ===== پیام‌های خطا =====

:wrong_place
echo  ============================================================
echo   [خطا] این setup.bat داخل پوشه درستِ پروژه نیست!
echo.
echo   باید کل پوشه را Extract کرده باشی و این فایل داخل
echo   همان پوشه باشد؛ نه دانلودِ تکی و نه دسکتاپ.
echo.
echo   راه‌حل: کل ZIP را از حالت فشرده دربیار، وارد پوشه‌ای شو
echo   که package.json کنارش هست، و دوباره setup را بزن.
echo.
echo   یا اگه نمی‌خواهی دردسر بکشی، فایل CinephileInstaller.bat
echo   را از ریپو دانلود کن - خودش همه چیز را انجام می‌دهد.
echo  ============================================================
explorer .
pause
exit /b 1

:no_node
echo [%date% %time%] node download failed >> install.log
echo  ============================================================
echo   [خطا] دانلود Node.js ناموفق بود.
echo.
echo   راه‌حل:
echo     1. اینترنت/VPN را روشن کن.
echo     2. یا خودت Node.js را از https://nodejs.org نصب کن
echo        (نسخه 20 یا بالاتر) و دوباره setup را بزن.
echo  ============================================================
echo.
pause
exit /b 1

:old_node
echo  [خطا] نسخه Node.js خیلی قدیمی است.
echo  از https://nodejs.org نسخه 20 LTS یا بالاتر را نصب کن،
echo  بعد دوباره setup را اجرا کن.
echo.
pause
exit /b 1

:install_failed
echo [%date% %time%] npm install failed twice >> install.log
echo  ============================================================
echo   [خطا] نصب کتابخانه‌ها دو بار ناموفق شد.
echo.
echo   اینترنت/VPN را روشن کن و دوباره setup را بزن.
echo   اگه باز هم نشد، فایل install.log را بفرست.
echo  ============================================================
echo.
pause
exit /b 1

:install_incomplete
echo [%date% %time%] install incomplete: node_modules\next missing >> install.log
echo  [خطا] نصب ناقص ماند - پوشه node_modules\next ساخته نشد.
echo  پوشه node_modules را حذف کن و دوباره setup را بزن.
echo  اگه نشد، فایل install.log را بفرست.
echo.
pause
exit /b 1

:db_failed
echo [%date% %time%] prisma db push failed >> install.log
echo  [خطا] ساخت دیتابیس ناموفق بود. فایل install.log را بفرست.
echo.
pause
exit /b 1
