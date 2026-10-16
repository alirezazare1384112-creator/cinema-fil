@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "package.json" goto wrong_place

where npm >nul 2>nul
if errorlevel 1 goto no_node

if exist node_modules\next goto ready

rem نصب ناقص يا نصب اول - از صفر و با تکرار روي سرور جايگزين
echo  در حال نصب کتابخانه ها - يک تا چند دقيقه طول مي کشد؛ پنجره را نبنديد.
if exist node_modules rmdir /s /q node_modules
call npm install
if errorlevel 1 goto install_retry
goto check_next

:install_retry
echo  [خطا] نصب اول ناموفق شد - تلاش مجدد با سرور جايگزين...
set PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
call npm install --registry=https://registry.npmmirror.com
if errorlevel 1 goto install_failed

:check_next
if not exist "node_modules\next" goto install_failed

:ready
title Cinephile Vault
echo ============================================================
echo  سينمافيل دارد بالا مي آيد...
echo  آدرس: http://localhost:3000
echo  اگر سرور به هر دليلي متوقف شد، خودش دوباره بالا مي آيد.
echo  براي خاموش کردن کامل، اين پنجره را ببنديد (X).
echo ============================================================

rem باز شدن مرورگر پيش فرض کاربر پس از آماده شدن سرور
start "" /B cmd /c "timeout /t 10 /nobreak >nul && start msedge http://localhost:3000"

:loop
call npm run dev
echo.
echo [سينمافيل] سرور متوقف شد - 3 ثانيه ديگر دوباره بالا مي آيد...
timeout /t 3 /nobreak >nul
goto loop

:wrong_place
echo  ============================================================
echo   [خطا] اين فايل داخل پوشه درستِ پروژه نيست!
echo   وارد پوشه اي شو که package.json کنارش هست و بعد
echo   setup.bat يا همين start را بزن.
echo  ============================================================
explorer .
pause
exit /b 1

:no_node
echo  [خطا] Node.js / npm پيدا نشد.
echo  از https://nodejs.org نسخه 20 را نصب کن و دوباره اجرا کن.
echo.
pause
exit /b 1

:install_failed
echo  ============================================================
echo   [خطا] نصب کتابخانه ها ناموفق ماند.
echo   اينترنت يا VPN را روشن کن و دوباره اين فايل را بزن.
echo   اگر نشد، فايل install.log را براي من بفرست.
echo  ============================================================
echo.
pause
exit /b 1
