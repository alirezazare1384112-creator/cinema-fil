@echo off
chcp 65001 >nul
title Cinephile Vault - Installer
setlocal EnableDelayedExpansion
cd /d "%~dp0"

rem ========================================================================
rem  CinephileInstaller.bat — نصبِ کاملِ برنامه در یه فایل
rem
rem  این فایل رو از هرجا دابل‌کلیک کنی کار می‌کنه:
rem    - اگه Node.js نباشه، خودش یه نسخهٔ portable (بدون admin) دانلود می‌کنه
rem    - اگه داخل پوشهٔ پروژه نباشی، خودش ZIP پروژه رو از گیتهاب می‌گیره
rem    - npm install + prisma db push + شورتکات دسکتاپ + استارت منو
rem    - اجرای برنامه
rem
rem  مسیر نصبِ پیش‌فرض: %LOCALAPPDATA%\CinephileVault
rem  shortcut دسکتاپ: "Cinephile Vault.lnk"
rem ========================================================================

set "INSTALL_DIR=%LOCALAPPDATA%\CinephileVault"
set "NODE_VERSION=v22.11.0"
set "NODE_DIST=https://nodejs.org/dist/%NODE_VERSION%/node-%NODE_VERSION%-win-x64.zip"
set "NODE_DIR=%LOCALAPPDATA%\CinephileNode"
set "PROJECT_ZIP_URL=https://github.com/alirezazare1384112-creator/cinema-fil/archive/refs/heads/master.zip"
set "LOG_FILE=%INSTALL_DIR%\install.log"

echo.
echo  ============================================================
echo                  نصب سینمافیل - Cinephile Vault
echo  ============================================================
echo   این ویزارد تمام مراحل نصب را خودکار انجام می‌دهد:
echo     1. بررسی و نصب Node.js (بدون نیاز به دسترسی مدیر)
echo     2. دانلود پروژه از GitHub
echo     3. نصب کتابخانه‌ها (1-3 دقیقه)
echo     4. ساخت دیتابیس محلی
echo     5. ساخت شورتکات دسکتاپ و Start Menu
echo     6. اجرای برنامه
echo.
echo   لطفاً این پنجره را تا پایان نصب نببندید.
echo  ============================================================
echo.

rem ===== مرحله ۰: آماده‌سازیِ مسیر نصب =====
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

rem اگر کاربر این فایل رو داخل پوشهٔ پروژه اجرا کرده (مثلاً از ZIP استخراج‌شده)،
rem از همین پوشه استفاده کن؛ وگرنه پروژه رو دانلود کن
if exist "package.json" (
    echo  [چک] داخل پوشهٔ پروژه هستی - از همین پوشه استفاده می‌کنیم.
    set "PROJECT_DIR=%CD%"
    goto node_check
)

echo  [چک] در پوشهٔ پروژه نیستیم - پروژه دانلود می‌شه.
set "PROJECT_DIR=%INSTALL_DIR%\app"

rem اگه قبلاً دانلود شده، دیگه دانلود نده
if exist "%PROJECT_DIR%\package.json" (
    echo  [چک] پروژه قبلاً دانلود شده - استفاده مجدد.
    goto node_check
)

echo  [1/6] در حال دانلود پروژه از GitHub...
echo     آدرس: %PROJECT_ZIP_URL%
echo [%date% %time%] download start >> "%LOG_FILE%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ProgressPreference = 'SilentlyContinue';" ^
    "try {" ^
    "  Invoke-WebRequest -Uri '%PROJECT_ZIP_URL%' -OutFile '%INSTALL_DIR%\project.zip' -UseBasicParsing;" ^
    "  exit 0;" ^
    "} catch {" ^
    "  exit 1;" ^
    "}"
if errorlevel 1 goto download_failed

echo [%date% %time%] download OK >> "%LOG_FILE%"

echo  [1/6] استخراج پروژه...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ProgressPreference = 'SilentlyContinue';" ^
    "Expand-Archive -Path '%INSTALL_DIR%\project.zip' -DestinationPath '%INSTALL_DIR%\_extract' -Force;"
if errorlevel 1 goto extract_failed

rem محتوایِ استخراج‌شده داخل پوشهٔ cinema-fil-master هست
if not exist "%INSTALL_DIR%\_extract\cinema-fil-master\package.json" (
    echo  [خطا] فایل package.json داخل ZIP پیدا نشد.
    goto extract_failed
)

rem انتقال به PROJECT_DIR
xcopy "%INSTALL_DIR%\_extract\cinema-fil-master\*" "%PROJECT_DIR%\" /E /I /Q /Y >nul
rmdir /s /q "%INSTALL_DIR%\_extract"
del "%INSTALL_DIR%\project.zip"

echo [%date% %time%] extract OK >> "%LOG_FILE%"

rem ===== مرحله ۲: بررسی Node.js =====
:node_check
echo  [2/6] بررسی Node.js...

rem اول ببین Node سراسری نصبه
where node >nul 2>nul
if not errorlevel 1 (
    for /f "delims=" %%v in ('node -v') do echo        [چک] Node سراسری %%v پیدا شد.
    set "NODE_BIN=node"
    set "NPM_BIN=npm"
    goto node_done
)

rem اگه قبلاً Node portable نصب کردیم از همون استفاده کن
if exist "%NODE_DIR%\node.exe" (
    set "NODE_BIN=%NODE_DIR%\node.exe"
    set "NPM_BIN=%NODE_DIR%\npm.cmd"
    echo        [چک] Node portable قبلاً نصب شده.
    goto node_done
)

rem گرنه Node portable رو دانلود کن
echo  [2/6] Node.js پیدا نشد - در حال دانلودِ نسخهٔ portable...
echo     (بدون نیاز به دسترسیِ مدیر - نصبِ بی‌صدا)
echo     نسخه: %NODE_VERSION% (~30MB)
echo [%date% %time%] node download start >> "%LOG_FILE%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ProgressPreference = 'SilentlyContinue';" ^
    "Invoke-WebRequest -Uri '%NODE_DIST%' -OutFile '%INSTALL_DIR%\node.zip' -UseBasicParsing;"
if errorlevel 1 goto node_download_failed

echo  [2/6] استخراج Node.js...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ProgressPreference = 'SilentlyContinue';" ^
    "Expand-Archive -Path '%INSTALL_DIR%\node.zip' -DestinationPath '%NODE_DIR%' -Force;"
if errorlevel 1 goto node_extract_failed

del "%INSTALL_DIR%\node.zip"

set "NODE_BIN=%NODE_DIR%\node.exe"
set "NPM_BIN=%NODE_DIR%\npm.cmd"

rem بررسی نسخه
"%NODE_BIN%" -v >nul 2>nul
if errorlevel 1 goto node_extract_failed

for /f "delims=" %%v in ('"%NODE_BIN%" -v') do echo        [چک] Node %%v نصب شد.

echo [%date% %time%] node install OK: %NODE_VERSION% >> "%LOG_FILE%"

:node_done
echo.

rem ===== مرحله ۳: نصب کتابخانه‌ها =====
echo  [3/6] در حال نصب کتابخانه‌ها...
echo     اولین نصب ۱ تا ۳ دقیقه طول می‌کشد؛ این پنجره را نببندید.
echo     (اگر اینترنت کند است، ممکن است بیشتر طول بکشد)
echo [%date% %time%] npm install start >> "%LOG_FILE%"

pushd "%PROJECT_DIR%"

set "PATH=%NODE_DIR%;%PATH%"

call "%NPM_BIN%" install --no-audit --no-fund --loglevel=error 2>&1 | findstr /V "npm warn" | findstr /V "deprecated"
if errorlevel 1 goto install_retry_mirror

echo [%date% %time%] npm install OK >> "%LOG_FILE%"
goto install_done

:install_retry_mirror
echo  [هشدار] نصب اول ناموفق بود - تلاش مجدد با سرور آینه‌ای...
set PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
if exist node_modules rmdir /s /q node_modules
call "%NPM_BIN%" install --no-audit --no-fund --loglevel=error --registry=https://registry.npmmirror.com 2>&1 | findstr /V "npm warn" | findstr /V "deprecated"
if errorlevel 1 goto install_failed
echo [%date% %time%] npm install (mirror) OK >> "%LOG_FILE%"

:install_done
if not exist "node_modules\next" goto install_incomplete
echo        کتابخانه‌ها نصب شدند.

rem ===== مرحله ۴: دیتابیس =====
echo  [4/6] ساخت دیتابیس محلی...
echo [%date% %time%] prisma db push start >> "%LOG_FILE%"
call "%NODE_BIN%" "node_modules\prisma\build\index.js" db push --accept-data-loss 2>nul
if errorlevel 1 (
    rem مسیر جایگزین
    call node_modules\.bin\prisma db push
)
if errorlevel 1 goto db_failed
echo [%date% %time%] prisma db push OK >> "%LOG_FILE%"
echo        دیتابیس خالی آماده شد.

rem ===== مرحله ۵: شورتکات دسکتاپ و استارت منو =====
echo  [5/6] ساخت شورتکات‌ها...
call :make_shortcut "Cinephile Vault" "start-cinephile.bat" "Cinephile Vault"
echo        شورتکات دسکتاپ ساخته شد.

rem ===== مرحله ۶: اجرای برنامه =====
echo  [6/6] اجرای برنامه...
echo.
echo  ============================================================
echo   نصب کامل شد!
echo.
echo   - برنامه در حال اجراست و مرورگر به‌زودی باز می‌شود.
echo   - برای اجرای بعدی: روی آیکون «Cinephile Vault» دسکتاپ
echo     دابل‌کلیک کن.
echo   - برای خاموش کردن، پنجرهٔ سیاه را ببند.
echo.
echo   مسیر نصب: %PROJECT_DIR%
echo  ============================================================
echo [%date% %time%] install complete >> "%LOG_FILE%"

call start-cinephile.bat
exit /b 0

rem ========================================================================
rem  تابعِ ساختِ شورتکات (دسکتاپ + استارت منو)
rem ========================================================================
:make_shortcut
set "SHORTCUT_NAME=%~1"
set "TARGET_BAT=%~2"
set "ICON_HINT=%~3"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ws = New-Object -ComObject WScript.Shell;" ^
    "$desktop = [Environment]::GetFolderPath('Desktop');" ^
    "$startmenu = [Environment]::GetFolderPath('Programs');" ^
    "$target = Join-Path '%PROJECT_DIR%' '%TARGET_BAT%';" ^
    "$workdir = '%PROJECT_DIR%';" ^
    "$iconPath = Join-Path '%PROJECT_DIR%' 'build\icon.ico';" ^
    "if (-not (Test-Path $iconPath)) { $iconPath = $null };" ^
    "foreach ($loc in @($desktop, (Join-Path $startmenu 'Cinephile'))) {" ^
    "  if (-not (Test-Path $loc)) { New-Item -ItemType Directory -Path $loc -Force | Out-Null };" ^
    "  $lnk = Join-Path $loc '%SHORTCUT_NAME%.lnk';" ^
    "  $s = $ws.CreateShortcut($lnk);" ^
    "  $s.TargetPath = $target;" ^
    "  $s.WorkingDirectory = $workdir;" ^
    "  $s.WindowStyle = 1;" ^
    "  $s.Description = '%ICON_HINT%';" ^
    "  if ($iconPath) { $s.IconLocation = $iconPath };" ^
    "  $s.Save();" ^
    "}"
goto :eof

rem ========================================================================
rem  پیام‌های خطا
rem ========================================================================

:download_failed
echo [%date% %time%] project download failed >> "%LOG_FILE%"
echo  ============================================================
echo   [خطا] دانلود پروژه از گیتهاب ناموفق بود.
echo.
echo   راه‌حل‌ها:
echo     1. اینترنت/VPN را روشن کن و دوباره این فایل را اجرا کن.
echo     2. اگه از داخل ایران هستی و فیلتره، یه VPN روشن کن.
echo     3. اگه باز هم نشد، کل ZIP پروژه را از این آدرس دانلود کن:
echo        %PROJECT_ZIP_URL%
echo        و داخل %INSTALL_DIR%\app استخراج کن.
echo  ============================================================
echo.
pause
exit /b 1

:extract_failed
echo [%date% %time%] project extract failed >> "%LOG_FILE%"
echo  [خطا] استخراج فایل ZIP ناموفق بود.
echo   ممکنه فایل ناقص دانلود شده باشه. دوباره تلاش کن.
pause
exit /b 1

:node_download_failed
echo [%date% %time%] node download failed >> "%LOG_FILE%"
echo  ============================================================
echo   [خطا] دانلود Node.js ناموفق بود.
echo.
echo   راه‌حل:
echo     1. اینترنت/VPN را روشن کن.
echo     2. یا خودت Node.js را از https://nodejs.org نصب کن
echo        (نسخه 22 یا بالاتر) و دوباره این فایل را اجرا کن.
echo  ============================================================
echo.
pause
exit /b 1

:node_extract_failed
echo [%date% %time%] node extract failed >> "%LOG_FILE%"
echo  [خطا] استخراج Node.js ناموفق بود.
echo   فایل node.zip در %INSTALL_DIR% را پاک کن و دوباره اجرا کن.
pause
exit /b 1

:install_failed
echo [%date% %time%] npm install failed >> "%LOG_FILE%"
echo  ============================================================
echo   [خطا] نصب کتابخانه‌ها دو بار ناموفق بود.
echo.
echo   اینترنت/VPN را روشن کن و دوباره این فایل را اجرا کن.
echo   اگه باز هم نشد، فایل install.log را بفرست:
echo     %LOG_FILE%
echo  ============================================================
echo.
pause
exit /b 1

:install_incomplete
echo [%date% %time%] install incomplete >> "%LOG_FILE%"
echo  [خطا] نصب ناقص ماند.
echo   پوشه node_modules را در %PROJECT_DIR% پاک کن و دوباره اجرا کن.
pause
exit /b 1

:db_failed
echo [%date% %time%] prisma db push failed >> "%LOG_FILE%"
echo  [خطا] ساخت دیتابیس ناموفق بود.
echo   فایل install.log را بفرست: %LOG_FILE%
pause
exit /b 1
