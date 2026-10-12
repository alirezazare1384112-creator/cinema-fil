@echo off
chcp 65001 >nul
title Cinephile Vault - Setup
cd /d "%~dp0"

echo.
echo  ============================================================
echo   نصب سينمافيل (فيلم و سريال)
echo   اين برنامه کاملاً روي کامپيوتر خودت اجرا مي شود.
echo   هيچ فيلم يا اديتي با نصب همراه نيست؛ خودت فيلم ها و
echo   پوشه هاي اديتت را وصل مي کني.
echo  ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo  [خطا] Node.js پيدا نشد.
    echo  از https://nodejs.org نسخه 20 يا بالاتر را نصب کن،
    echo  سپس دوباره همين فايل را اجرا کن.
    echo.
    pause
    exit /b 1
)

set NPM=npm
where npm >nul 2>nul
if errorlevel 1 if exist "D:\npm.cmd" set NPM=D:\npm.cmd

echo  [1/4] در حال نصب کتابخانه ها (يک تا چند دقيقه)...
call "%NPM%" install
if errorlevel 1 (
    echo  [خطا] نصب کتابخانه ها ناموفق بود. اينترنت را چک کن و دوباره اجرا کن.
    pause
    exit /b 1
)

echo  [2/4] ساخت فايل تنظيمات...
if not exist ".env" (
    copy /Y ".env.example" ".env" >nul
    echo         فايل .env ساخته شد.
) else (
    echo         فايل .env از قبل هست (دست نخورده).
)

echo  [3/4] ساخت ديتابيس محلي...
call npx prisma db push
if errorlevel 1 (
    echo  [خطا] ساخت ديتابيس ناموفق بود.
    pause
    exit /b 1
)

echo  [4/4] راه اندازي برنامه...
echo.
echo  ============================================================
echo   نصب کامل شد. برنامه الان بالا مي آيد و مرورگر باز مي شود.
echo   براي خاموش کردن، پنجره مشکي برنامه را ببنديد.
echo  ============================================================
echo.

call start-cinephile.bat
