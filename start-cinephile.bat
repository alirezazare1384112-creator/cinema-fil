@echo off
chcp 65001 >nul
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
    echo  [خطا] Node.js / npm پیدا نشد.
    echo  از https://nodejs.org نسخه 20 یا بالاتر را نصب کن،
    echo  سپس دوباره همین فایل را اجرا کن.
    echo.
    pause
    exit /b 1
)

if not exist node_modules\next (
    echo  در حال نصب کتابخانه‌ها - ممکن است یک تا چند دقیقه طول بکشد...
    rem نصب ناتمام قبلی را کامل پاک کن تا از صفر برود
    if exist node_modules rmdir /s /q node_modules
    call npm install
    if errorlevel 1 (
        echo  [خطا] نصب کتابخانه‌ها ناموفق بود.
        echo  اگر خطای شبکه یا اینترنت دیدی، اول این دستور را بزن:
        echo  npm config set registry https://registry.npmmirror.com
        echo  بعد پوشه node_modules را حذف کن و دوباره همین فایل را اجرا کن.
        echo.
        pause
        exit /b 1
    )
)

title Cinephile Vault
echo ============================================================
echo  سینمافیل دارد بالا می‌آید...
echo  آدرس: http://localhost:3000
echo  اگر سرور به هر دلیلی متوقف شد، خودش دوباره بالا می‌آید.
echo  برای خاموش کردن کامل، این پنجره را ببندید (X).
echo ============================================================

rem باز شدن مرورگر پیش‌فرض کاربر پس از آماده شدن سرور
start "" /B cmd /c "timeout /t 10 /nobreak >nul && start msedge http://localhost:3000"

:loop
call npm run dev
echo.
echo [سینمافیل] سرور متوقف شد - 3 ثانیه دیگر دوباره بالا می‌آید...
timeout /t 3 /nobreak >nul
goto loop
