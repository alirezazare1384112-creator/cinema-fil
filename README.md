# Cinephile Vault & Media Hub

A personal movie and TV show tracking application with local media management, fan content gallery, and quotes collector.

## Features

- **Movie & Series Tracker**: Search movies/shows via TMDB API, track watch status, add ratings and reviews
- **Local Files Hub**: Manage downloaded media files with path tracking and video specs
- **Edits & Fan-Art Lounge**: Store video edits, clips, and fan art with tags and audio info
- **Quotes Collector**: Save memorable dialogue with backdrop images and GIFs
- **Cinematic UI**: Dark, immersive design with glassmorphism effects and neon accents

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM
- SQLite Database
- Lucide React Icons

## Setup Instructions

### 1. Install Dependencies

```bash
cd cinephile-vault
npm install
```

### 2. Configure TMDB API Key

You need a TMDB API key to search and discover movies/TV shows:

1. Visit [TMDB API Settings](https://www.themoviedb.org/settings/api)
2. Create an account or sign in
3. Request an API key (choose "Developer" option)
4. Copy your API key

**Option A: Environment Variable (Recommended)**

Create or edit `.env` file in the project root:

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_TMDB_API_KEY=your_api_key_here
```

**Option B: Settings Page**

You can also add your API key through the Settings page in the app.

### 3. Initialize Database

The database is created automatically on install/postinstall. To create or update it manually:

```bash
npx prisma db push
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
cinephile-vault/
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── dev.db               # SQLite database
├── src/
│   ├── app/
│   │   ├── api/             # API routes
│   │   │   ├── media/       # Media CRUD
│   │   │   ├── local-files/ # Local files CRUD
│   │   │   ├── edits/       # Edits CRUD
│   │   │   ├── quotes/      # Quotes CRUD
│   │   │   └── tmdb/        # TMDB API proxy
│   │   ├── discover/        # Search & discover page
│   │   ├── library/         # My library page
│   │   ├── local-files/     # Local files hub
│   │   ├── edits/           # Edits gallery
│   │   ├── quotes/          # Quotes collector
│   │   └── settings/        # App settings
│   ├── components/          # Reusable UI components
│   └── lib/                 # Utilities (Prisma, TMDB)
└── public/                  # Static assets
```

## Database Schema

- **Media**: Movies and TV shows from TMDB with user data
- **LocalFile**: Downloaded media files with specs and paths
- **MediaEdit**: Video edits, clips, and fan content
- **Quote**: Memorable dialogue and scenes

## API Endpoints

- `GET/POST/PUT/DELETE /api/media` - Manage media entries
- `GET/POST/PUT/DELETE /api/local-files` - Manage local files
- `GET/POST/PUT/DELETE /api/edits` - Manage edits
- `GET/POST/PUT/DELETE /api/quotes` - Manage quotes
- `GET /api/tmdb?action=search&query=...` - Search TMDB
- `GET /api/tmdb?action=trending` - Get trending content

## License

MIT

---

## دیپلوی روی گیت‌هاب (فارسی)

### ۰) چه چیزهایی آپلود نمی‌شوند (مهم)

| چیز | در گیت‌هاب؟ | دلیل |
|---|---|---|
| `dev.db` (دیتابیس، تاریخچهٔ تماشا، یادداشت‌ها) | ❌ نه | در `.gitignore` است تا دادهٔ شخصی‌ات لو نرود |
| `uploads/` (پوسترها و کلیپ‌های آپلودی) | ❌ نه | فایل‌های سنگینِ دادهٔ محلی |
| `.env` و `.env.local` (کلید TMDB) | ❌ نه | راز است؛ فقط `.env.example` آپلود می‌شود |
| `node_modules`، `.next`، کش‌ها | ❌ نه | بازسازی‌پذیرند |

> نتیجه: نسخهٔ مستقر **یک دیتابیس خالی** می‌سازد. داده‌های خودت را با کپی کردن `dev.db` می‌بری (بخش ۴).

### ۱) آپلود کد روی گیت‌هاب

```bash
# اول یک ریپوی خالی در github.com بسازید (پیشنهاد: Private)
git remote add origin https://github.com/USER/REPO.git
git branch -M main
git push -u origin main
```

### ۲) ساخت خودکار (GitHub Actions)

فایل `.github/workflows/ci.yml` بعد از هر push، پروژه را روی یک محیط تمیز بیلد می‌کند.
سبز بودن آن یعنی همان کد روی سرور دیپلوی هم بدون خطا بالا می‌آید.

برای اینکه بیلد کلید TMDB را داشته باشد: در صفحهٔ ریپو → `Settings` → `Secrets and variables` → `Actions` → `New repository secret` و نام `NEXT_PUBLIC_TMDB_API_KEY`.

### ۳) دیپلوی — دو روش

**الف) Vercel (سریع‌ترین — برای نمایش/تست)**

1. [vercel.com](https://vercel.com) → `Add New…` → `Project` → Import از گیت‌هاب
2. در قسمت `Environment Variables` متغیر `NEXT_PUBLIC_TMDB_API_KEY` را وارد کنید
3. `Deploy`

> ⚠️ نکتهٔ صادقانه: روی Vercel دیتابیس SQLite دائمی نیست و با هر دیپلویِ جدید ریست می‌شود. برای نمایش‌دادنِ پروژه خوب است؛ برای نگه‌داشتن داده‌های واقعی نه.

**ب) سرور شخصی / VPS (توصیه‌شده برای دادهٔ واقعی)**

```bash
git clone https://github.com/USER/REPO.git cinephile-vault
cd cinephile-vault
npm ci                 # وابستگی‌ها + ساخت کلاینت Prisma (postinstall)
npx prisma db push     # ساخت دیتابیس SQLite
npm run build          # بیلد تولید
npm start              # اجرا روی پورت 3000
```

برای اینکه بعد از خروج از SSH هم بماند:

```bash
npm install -g pm2
pm2 start npm --name cinephile -- start
pm2 save
```

### ۴) انتقال داده‌های خودت به سرور

فایل `dev.db` را از کامپیوتر خودت روی سرور کپی کنید (جایگزینِ فایل خالی) و بعد:

```bash
npx prisma db push
```

پوشهٔ `uploads/` را هم اگر پوستر/کلیپ آپلودشده می‌خواهی، همین‌طور کپی کن.
