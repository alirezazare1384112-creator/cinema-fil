@echo off
chcp 65001 >nul
title Cinephile Vault - Setup
cd /d "%~dp0"

echo.
echo  ============================================================
echo   نصب سينمافيل - قدم به قدم و با پيام مشخص
echo   هر مرحله را ببين؛ اگر [خطا] ديدی همان‌جا متوقف مي شود.
echo  ============================================================
echo.

rem ===== محافظ ۱: آيا داخل پوشه درستِ پروژه هستيم؟ =====
if not exist "package.json" goto wrong_place

rem ===== محافظ ۲: Node و npm =====
where node >nul 2>nul
if errorlevel 1 goto no_node
where npm >nul 2>nul
if errorlevel 1 goto no_node
node -e "process.exit(+process.versions.node.split('.')[0]>=18?0:1)" >nul 2>nul
if errorlevel 1 goto old_node
for /f "delims=" %%v in ('node -v') do echo  [چک] Node %%v آماده است.
for /f "delims=" %%v in ('npm -v') do echo  [چک] npm %%v آماده است.
echo.

rem ===== مرحله ۱: نصب کتابخانه ها =====
echo  [1/4] در حال نصب کتابخانه ها...
echo        اولين نصب ۱ تا ۵ دقيقه طول مي کشد؛ اين پنجره را نبنديد.
echo [%date% %time%] npm install start >> install.log
call npm install
if errorlevel 1 goto install_retry
echo [%date% %time%] npm install OK >> install.log
goto install_done

:install_retry
echo [%date% %time%] npm install failed, retry with mirror >> install.log
echo  [خطا] نصب اول ناموفق شد - در حال تلاش مجدد با سرور جايگزين...
call npm config set registry https://registry.npmmirror.com
set PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
if exist node_modules rmdir /s /q node_modules
call npm install
if errorlevel 1 goto install_failed
echo [%date% %time%] npm install mirror OK >> install.log
goto install_done

:install_failed
echo [%date% %time%] npm install failed twice >> install.log
echo  ============================================================
echo   [خطا] نصب کتابخانه ها دو بار ناموفق شد.
echo   اينترنت يا VPN را روشن کن و دوباره setup را بزن.
echo   اگر باز هم نشد، فايل install.log را براي من بفرست.
echo  ============================================================
echo.
pause
exit /b 1

:install_done
if not exist "node_modules\next" goto install_incomplete
echo        کتابخانه ها نصب شد.

rem ===== مرحله ۲: فايل تنظيمات =====
echo  [2/4] ساخت فايل تنظيمات...
if not exist ".env" goto make_env
echo        فايل .env از قبل هست (دست نخورده).
goto env_done

:make_env
if not exist ".env.example" goto env_missing
copy /Y ".env.example" ".env" >nul
echo        فايل .env ساخته شد.
goto env_done

:env_missing
echo        .env.example نيست - رد مي شود (اختياري است).

:env_done
rem ===== مرحله ۳: ديتابيس محلي =====
echo  [3/4] ساخت ديتابيس محلي...
echo [%date% %time%] prisma db push start >> install.log
call node_modules\.bin\prisma db push
if errorlevel 1 goto db_failed
echo [%date% %time%] prisma db push OK >> install.log
echo        ديتابيس خالی آماده شد.
goto db_done

:db_failed
echo [%date% %time%] prisma db push failed >> install.log
echo  [خطا] ساخت ديتابيس ناموفق بود. فايل install.log را براي من بفرست.
echo.
pause
exit /b 1

:db_done
rem ===== مرحله ۴: راه اندازي =====
echo  [4/4] راه اندازي برنامه...
echo.
echo  ============================================================
echo   نصب کامل شد. برنامه بالا مي آيد و مرورگر باز مي شود.
echo   براي خاموش کردن، همين پنجره را ببنديد.
echo  ============================================================
echo.
call start-cinephile.bat
exit /b 0

rem ===== پيام هاي خطا =====
:wrong_place
echo  ============================================================
echo   [خطا] اين setup.bat داخل پوشه درستِ پروژه نيست!
echo.
echo   بايد کل پوشه cinephile-vault را Extract کرده باشي و اين
echo   فايل داخل همان پوشه باشد؛ نه دانلودِ تکی و نه دسکتاپ.
echo.
echo   راه حل: کل ZIP را از حالت فشرده دربيار، وارد پوشه اي شو
echo   که package.json کنارش هست، و دوباره setup را بزن.
echo  ============================================================
explorer .
pause
exit /b 1

:no_node
echo  [خطا] Node.js يا npm پيدا نشد.
echo  از https://nodejs.org نسخه 20 LTS را نصب کن،
echo  بعد پنجره را ببند و دوباره setup را اجرا کن.
echo.
pause
exit /b 1

:old_node
echo  [خطا] نسخه Node.js خيلي قديمي است و کار نمي کند.
echo  از https://nodejs.org نسخه 20 LTS را نصب کن،
echo  بعد دوباره setup را اجرا کن.
echo.
pause
exit /b 1

:install_incomplete
echo [%date% %time%] install incomplete: node_modules\next missing >> install.log
echo  [خطا] نصب ناقص ماند - پوشه node_modules\next ساخته نشد.
echo  پوشه node_modules را حذف کن و دوباره setup را بزن.
echo  اگر نشد، فايل install.log را براي من بفرست.
echo.
pause
exit /b 1
