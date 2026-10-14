# Cinephile Vault 🎬

[![CI](https://github.com/alirezazare1384112-creator/cinema-fil/actions/workflows/ci.yml/badge.svg)](https://github.com/alirezazare1384112-creator/cinema-fil/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A **personal movie & TV hub** that runs **entirely on your own computer**: track what you watch, manage your downloaded files, collect fan edits and quotes. Your data never leaves your machine.

> برنامهٔ شخصی فیلم و سریال که **کاملاً روی کامپیوتر خودتان** اجرا می‌شود؛ داده‌هایتان هرگز به بیرون فرستاده نمی‌شود.

## Features

- **Discover & Library** — Search movies/shows via [TMDB](https://www.themoviedb.org/), track watch status, ratings & notes
- **Local Files Hub** — Index downloaded videos with specs (resolution, size, format) and play them with one click
- **Edits Gallery** — Fan edits & clips with tags; add them from local files **or Pinterest/Instagram/web links**
- **Quotes Collector** — Memorable dialogue with backdrop images
- **Cinematic UI** — Dark, glassmorphism design

## Quick Start (Windows)

**پیش‌نیاز:** [Node.js 20+](https://nodejs.org)

```bat
git clone https://github.com/alirezazare1384112-creator/cinema-fil.git
cd cinema-fil
setup.bat
```

`setup.bat` installs dependencies, creates the empty database, and starts the app — the browser opens automatically at **http://localhost:3000**.

After the first install, just run **`start-cinephile.bat`** (auto-restarts the server if it stops).

> **macOS / Linux:** the web app runs (`npm install && npx prisma db push && npm run dev`), but Windows-only features (file-picker dialog, local player integration) won't work.

## TMDB API Key (for search)

The app runs without a key; only **Discover/search** needs one:

1. Get a free key at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
2. Put it in `.env` (`NEXT_PUBLIC_TMDB_API_KEY=...`) — or paste it in the app's **Settings** page

Optional `.env` settings: `CINEPHILE_PLAYER` (custom player path), `F2M_BASE` (subtitle service override). See [`.env.example`](.env.example).

## Project Structure

```
cinephile-vault/
├── setup.bat               # One-click install + first run (Windows)
├── start-cinephile.bat     # Daily launcher with auto-restart
├── prisma/schema.prisma    # Database schema (SQLite → dev.db at project root)
├── src/
│   ├── app/                # Pages + API routes (App Router)
│   ├── components/         # UI components
│   └── lib/                # Prisma client, TMDB, utilities
└── public/                 # Static assets
```

## Data & Privacy

- Database (`dev.db`), uploads (`uploads/`), and `.env` are **gitignored** — a fresh clone always starts with an empty database
- Poster images and TMDB search are the only network traffic; everything else is local
- To move your data to another machine, copy `dev.db` (and `uploads/` if you use it)

## For Developers

```bash
npm install          # also runs `prisma generate`
npx prisma db push   # create/update SQLite database
npm run dev          # http://localhost:3000
npm run build        # production build (CI runs this on every push)
```

## Deploy

- **VPS / سرور شخصی:** `npm ci && npx prisma db push && npm run build && npm start` (keep it alive with `pm2 start npm --name cinephile -- start`)
- **Vercel:** works for demo purposes, but SQLite storage is ephemeral there — use a server/VPS for real data

## License

[MIT](LICENSE)

---

## نصب برای کاربران (فارسی)

این برنامه **کاملاً محلی** است: روی کامپیوتر خودتان اجرا می‌شود، دیتابیسش همان `dev.db` کنار برنامه است و **هیچ فیلم، ادیت یا دادهٔ شخصی داخل بسته نیست**.

### نصب سه‌قدمی

1. [Node.js نسخه ۲۰ یا بالاتر](https://nodejs.org) را نصب کن (یک‌بار برای همیشه)
2. ریپو را دانلود کن: `Code` → `Download ZIP` (یا `git clone`)
3. داخل پوشه، روی **`setup.bat`** دوبار کلیک کن — خودش نصب می‌کند، دیتابیس خالی می‌سازد و برنامه را بالا می‌آورد

> دفعات بعد کافی است **`start-cinephile.bat`** را اجرا کنی.

### بعد از نصب: وصل کردن فایل‌های خودت

| می‌خواهی چه چیزی را وصل کنی؟ | کجا؟ |
|---|---|
| ویدیوهای دانلودشده روی هارد/فلش | **«فایل‌های محلی»** → افزودن فایل یا اتصال پوشه |
| پوشهٔ ادیت‌ها و کلیپ‌ها | **«گالری ویرایش‌ها»** → اتصال پوشه / آپلود فایل / **لینک پینترست و اینستاگرام (پخش داخلی)** |
| فیلم/سریال برای ردیابی تماشا | **«کشف»** → جستجو (نیازمند کلید TMDB در تنظیمات) |
| زیرنویس | کنار فایل همان ویدیو، از دکمهٔ انتخاب زیرنویس |

مسیرها و داده‌ها فقط در دیتابیس **همان کامپیوتر** می‌مانند؛ چیزی به بیرون فرستاده نمی‌شود (برای جستجو و پوستر به اینترنت نیاز هست، بقیه‌اش محلی است).
