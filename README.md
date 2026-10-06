# Cinephile Vault & Media Hub

A personal movie and TV show tracking application with local media management, fan content gallery, and quotes collector.

## Features

- **Movie & Series Tracker**: Search movies/shows via TMDB API, track watch status, add ratings and reviews
- **Local Files Hub**: Manage downloaded media files with path tracking and video specs
- **Edits & Fan-Art Lounge**: Store video edits, clips, and fan art with tags and audio info
- **Quotes Collector**: Save memorable dialogue with backdrop images and GIFs
- **Cinematic UI**: Dark, immersive design with glassmorphism effects and neon accents

## Tech Stack

- Next.js 15 (App Router)
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

The database is automatically initialized when you first run the app. To manually run migrations:

```bash
npx prisma migrate dev
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
