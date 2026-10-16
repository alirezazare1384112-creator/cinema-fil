# Cinephile Vault 🎬

[![CI](https://github.com/alirezazare1384112-creator/cinema-fil/actions/workflows/ci.yml/badge.svg)](https://github.com/alirezazare1384112-creator/cinema-fil/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![TMDB](https://img.shields.io/badge/Powered_by-TMDB-01B4E4?logo=themoviedatabase&logoColor=white)](https://www.themoviedb.org)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](# contributing-)

> A **personal movie & TV hub** that runs **entirely on your own computer** — track what you watch, manage your downloaded files, collect fan edits and quotes, with 9 immersive character-based themes. Your data never leaves your machine.

> برنامهٔ شخصیِ فیلم و سریال که **کاملاً روی کامپیوتر خودتان** اجرا می‌شود؛ ردیابیِ تماشا، مدیریتِ فایل‌های محلی، گالریِ ویرایش‌ها و نقل‌قول‌ها، با ۹ تمِ حرفه‌ای. داده‌هایتان هرگز به بیرون فرستاده نمی‌شود.

---

## ✨ Features

| | Feature | What it does |
|---|---|---|
| 🔍 | **Discover & Library** | Search movies/shows via [TMDB](https://www.themoviedb.org/) or the Persian site film 2 media, track watch status, ratings & notes |
| 📁 | **Local Files Hub** | Index downloaded videos with specs (resolution, size, codec) and play them with one click |
| ✂️ | **Edits Gallery** | Fan edits & clips with tags; add them from local files **or Pinterest/Instagram/web links** — plays inline |
| 💬 | **Quotes Collector** | Memorable dialogue with backdrop images |
| 🎭 | **9 Immersive Themes** | Spider-Man (web pattern + spidey-sense), Batman (Gotham skyline), Matrix (code rain + CRT scanlines), Joker, Breaking Bad, Harry Potter, Star Wars, Game of Thrones, Default — each with its own pattern, font, divider & micro-interaction |
| ⭐ | **IMDb + Rotten Tomatoes + Metacritic** | Three real-time ratings per title via [OMDb API](https://www.omdbapi.com/), cached for 30 days |
| 🔒 | **100% Local** | Database, uploads, `.env` all gitignored — a fresh clone always starts with empty data |
| 🇮🇷 | **Bilingual UI** | Full Persian (RTL) interface with English-language code |

---

## 🚀 Quick Start

### Windows (one-click)

1. Install **[Node.js 20 LTS](https://nodejs.org)** once (check: `node -v` in a terminal).
2. Download this repo: `Code` → **Download ZIP**, then **extract the whole ZIP** (never download individual files).
3. Open the extracted folder — the one where `setup.bat` sits next to `package.json` — and double-click **`setup.bat`**.

`setup.bat` verifies each step (right folder, Node version, npm), installs dependencies, retries once against a mirror registry on network failures, creates the empty SQLite database, and opens the app at **http://localhost:3000**. Every step is appended to **`install.log`** — if anything fails, send that file.

For subsequent runs, just double-click **`start-cinephile.bat`** (auto-restarts the server if it stops).

> **Double-click did nothing, or commands say `package.json` not found (ENOENT)?** You are not inside the project folder. Open the folder in Explorer, type `cmd` in the address bar, press Enter, then run `setup.bat` — the prompt is guaranteed to be in the right directory.

### macOS / Linux

```bash
git clone https://github.com/alirezazare1384112-creator/cinema-fil.git
cd cinema-fil
npm install && npx prisma db push && npm run dev
```

> ⚠️ Windows-only features (file-picker dialog, local player integration) won't work on macOS/Linux, but the web UI runs fine.

---

## 🔑 API Keys

The app runs without any keys. They're only needed for these features:

| Key | Used for | Free? | Where to get |
|---|---|---|---|
| `NEXT_PUBLIC_TMDB_API_KEY` | Search & Discover | Yes | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) |
| `OMDB_API_KEY` | IMDb / RT / Metacritic ratings | Yes (1,000 req/day) | [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx) |

Both keys can be set in the in-app **Settings** page (stored in `localStorage`) or in `.env` for production.

See [`.env.example`](.env.example) for all configuration options.

---

## 🎨 Themes

Each theme is a **full visual identity**, not just a color swap:

| Theme | Pattern | Font | Signature Quote |
|---|---|---|---|
| 🎬 **بنفش سینمایی** | gradient glow | Inter | *"سینما حقیقت است؛ ۲۴ بار در ثانیه."* — Godard |
| 🦇 **شوالیهٔ تاریکی** | bat-signal + Gotham skyline | Georgia serif | *"یا می‌میری قهرمان..."* — Harvey Dent |
| 🃏 **جوکر** | "HA HA HA" repeating pattern | Impact/Bangers | *"چرا این‌قدر جدی؟"* — Joker |
| 🕷️ **مرد عنکبوتی** | spider-web in corners + NYC silhouette | Bangers | *"با قدرت بزرگ، مسئولیت بزرگ..."* — Uncle Ben |
| 🟢 **ماتریکس** | code rain + CRT scanlines | Courier New | *"قرمز یا آبی؟"* — Morpheus |
| ☢️ **برکینگ‌بد** | hazard stripes + atom | Arial Black | *"من کسی هستم که..."* — Heisenberg |
| ⚡ **هری پاتر** | gold starfield + sparkles | Georgia italic | *"برای جادوگر بااستعداد..."* — Dumbledore |
| ⚔️ **جنگ ستارگان** | starfield + hyperspace drift | Arial Black | *"بکن یا نکن..."* — Yoda |
| 🐉 **بازی تاج‌وتخت** | dragon sigil | Georgia italic | *"زمستان میاد."* — Ned Stark |

Plus per-theme **scrollbar colors**, **selection colors**, **focus rings**, **hover micro-interactions** (Spider-Man pulses, Joker jitters, Matrix glitches, HP floats, ...) and **dividers** styled after the franchise (sword lines for GoT, lightsaber lines for Star Wars, hazard stripes for Breaking Bad, ...).

---

## 📁 Project Structure

```
cinephile-vault/
├── setup.bat               # One-click install + first run (Windows)
├── start-cinephile.bat     # Daily launcher with auto-restart
├── prisma/
│   └── schema.prisma       # Database schema (SQLite → dev.db at project root)
├── src/
│   ├── app/
│   │   ├── api/            # API routes (TMDB, F2M, ratings, media, edits, …)
│   │   └── (pages)/        # App Router pages
│   ├── components/         # UI components (MediaCard, MediaModal, Ratings, Sidebar, …)
│   ├── lib/                # Prisma client, TMDB client, OMDb client, f2m scraper,
│   │                       # themes, details cache, upload utilities
│   └── types/              # Shared TypeScript interfaces
└── public/                 # Static assets (placeholders, svgs)
```

---

## 🔒 Data & Privacy

| What stays on your machine | What goes to the internet |
|---|---|
| `dev.db` (SQLite — all your media, edits, quotes) | TMDB API calls for search & poster images |
| `uploads/` (uploaded posters, backdrops) | f2medx.top calls for Persian-site Discover & downloads |
| `.env` (API keys, player path) | OMDb API calls for IMDb / RT / Metacritic ratings |
| `localStorage` (theme choice, TMDB key if entered in Settings) | |

- To **move data to another machine**, copy `dev.db` (and `uploads/` if you use it).
- A **fresh clone** always starts with an empty database.

---

## 🛠️ For Developers

```bash
npm install          # also runs `prisma generate`
npx prisma db push   # create/update SQLite database
npm run dev          # http://localhost:3000
npm run build        # production build (CI runs this on every push)
npm run lint         # eslint
```

### Architecture notes

- **Tailwind tokens are wired to CSS variables** — every `violet-500`/`pink-500` class automatically follows the active theme.
- **OMDb ratings** are cached for 30 days in-memory + in `localStorage` to avoid re-fetching on every modal open.
- **f2m HTML pages** are cached to disk (`.f2m-cache/`) so dev-server hot-reloads stay fast.
- **Theme application** happens pre-hydration via a tiny inline script in `layout.tsx` to prevent the default-theme flash.

---

## 🌐 Deploy

- **VPS / personal server:** `npm ci && npx prisma db push && npm run build && npm start` — keep it alive with `pm2 start npm --name cinephile -- start`
- **Vercel:** works for demo purposes, but SQLite storage is ephemeral — use a server/VPS for real data

---

## 🤝 Contributing

PRs welcome! Please run `npm run lint` and `npm run build` before submitting.

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes
4. Open a PR describing what & why

---

## 📜 License

[MIT](LICENSE) — do whatever you want, just don't blame me if it eats your data (it won't, but still).

---

## 🙏 Acknowledgements

- [The Movie Database (TMDB)](https://www.themoviedb.org/) for the rich movie metadata API
- [OMDb API](https://www.omdbapi.com/) for IMDb / Rotten Tomatoes / Metacritic ratings
- [Lucide](https://lucide.dev/) for the icon set
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first styling
- [Prisma](https://www.prisma.io/) for the type-safe ORM
- All the movie/TV franchises that inspired the themes 🎬

---

## نصب برای کاربران فارسی‌زبان (فارسی)

این برنامه **کاملاً محلی** است: روی کامپیوتر خودتان اجرا می‌شود، دیتابیسش همان `dev.db` کنار برنامه است و **هیچ فیلم، ادیت یا دادهٔ شخصی داخل بسته نیست**.

### نصب سه‌قدمی

1. [Node.js نسخهٔ ۲۰](https://nodejs.org) را نصب کن (یک‌بار برای همیشه)
2. ریپو را دانلود کن: `Code` → `Download ZIP` — **کل ZIP را Extract کن** (فایل‌ها را تکی دانلود نکن)
3. وارد پوشهٔ استخراج‌شده شو — جایی که **`setup.bat` کنار `package.json` است** — و روی `setup.bat` دوبار کلیک کن

نصب ۱ تا ۵ دقیقه طول می‌کشد؛ **پنجره را نبند**. `setup.bat` هر مرحله را چک می‌کند، اگر خطای شبکه بدهد خودش یک‌بار با سرور جایگزین دوباره تلاش می‌کند و همهٔ مراحل را در فایل `install.log` می‌نویسد.

> اگر دابل‌کلیک **هیچ‌چیز نشان نداد** یا خطا داد `package.json not found`:
> یعنی داخل پوشهٔ پروژه نیستی. در Explorer وارد پوشهٔ پروژه شو، در **نوار آدرس** تایپ کن `cmd` و Enter بزن؛
> بعد بنویس `setup.bat` و Enter. با این روش مطمئنی پنجره دقیقاً داخل پوشهٔ درست باز شده.
> هر خطایی دیدی، فایل `install.log` کنار setup را بفرست.

### بعد از نصب: وصل کردن فایل‌های خودت

| می‌خواهی چه چیزی را وصل کنی؟ | کجا؟ |
|---|---|
| ویدیوهای دانلودشده روی هارد/فلش | **«فایل‌های محلی»** → افزودن فایل یا اتصال پوشه |
| پوشهٔ ادیت‌ها و کلیپ‌ها | **«گالری ویرایش‌ها»** → اتصال پوشه / آپلود فایل / **لینک پینترست و اینستاگرام (پخش داخلی)** |
| فیلم/سریال برای ردیابی تماشا | **«کشف»** → جستجو (نیازمند کلید TMDB در تنظیمات) |
| زیرنویس | کنار فایل همان ویدیو، از دکمهٔ انتخاب زیرنویس |
| نمرهٔ IMDb / Rotten Tomatoes / Metacritic | به‌صورت خودکار در صفحهٔ جزئیات هر فیلم (نیازمند کلید OMDb در تنظیمات) |

مسیرها و داده‌ها فقط در دیتابیس **همان کامپیوتر** می‌مانند؛ چیزی به بیرون فرستاده نمی‌شود (برای جستجو، پوستر و نمره‌ها به اینترنت نیاز هست، بقیه‌اش محلی است).
