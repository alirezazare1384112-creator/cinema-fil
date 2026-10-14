# Contributing to Cinephile Vault

Thanks for taking the time to contribute! 🎬 This document covers the workflow, conventions and setup needed to send a pull request.

> کمک به پروژه رو دریافت می‌کنیم! قبل از PR، این فایل رو بخون تا روند رو بدونی.

---

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Style](#code-style)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Workflow](#pull-request-workflow)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Working on Themes](#working-on-themes)
- [License](#license)

---

## Getting Started

Cinephile Vault is a **Next.js 15** app (App Router) with **Prisma + SQLite**, **Tailwind CSS 4**, and **TypeScript 5**. The app runs **100% locally** — your data (movies, edits, quotes, ratings cache) lives in `dev.db` next to the project root.

Before contributing, please:

1. Skim the [README](README.md) to understand what the app does
2. Open an issue describing what you want to change (so we can discuss before you code)
3. Make sure your Node version is **20+**

---

## Development Setup

```bash
# 1. Fork & clone
git clone https://github.com/<YOUR_USERNAME>/cinema-fil.git
cd cinema-fil

# 2. Install dependencies (also runs `prisma generate` postinstall)
npm install

# 3. Create the local SQLite database
npx prisma db push

# 4. Copy .env.example to .env and (optionally) fill in TMDB / OMDb keys
cp .env.example .env

# 5. Start the dev server
npm run dev
# → http://localhost:3000
```

### Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server with hot reload |
| `npm run build` | Production build (CI runs this on every push) |
| `npm run lint` | ESLint check |
| `npx tsc --noEmit` | Type-check only |
| `npx prisma studio` | Open Prisma Studio to inspect `dev.db` |
| `npx prisma db push` | Apply schema changes to the local SQLite DB |

---

## Project Structure

```
src/
├── app/                # App Router pages + API routes
│   ├── api/            # /api/tmdb, /api/f2m, /api/ratings, /api/media, /api/edits, …
│   ├── discover/       # Discover page (TMDB/f2m browsing)
│   ├── library/        # Personal library
│   ├── settings/       # Settings (TMDB key, OMDb key, theme picker)
│   └── ...
├── components/         # React components (MediaCard, MediaModal, Ratings, Sidebar, ThemePreview, …)
├── lib/                # tmdb.ts, f2m.ts, omdb.ts, prisma.ts, themes.tsx, details-cache.ts, …
└── types/              # Shared TypeScript interfaces

prisma/
└── schema.prisma        # Data models: Media, LocalFile, MediaEdit, EditFolder, Quote

public/                  # Static assets (SVG placeholders)
```

---

## Code Style

- **TypeScript strict** is on — every file must type-check with `npx tsc --noEmit`
- **No `any`** without a `// eslint-disable-next-line` comment explaining why
- **Tailwind tokens are wired to theme CSS variables** — every `violet-500` / `pink-500` class automatically follows the active theme. **Do not hardcode colors** like `text-red-500` or `bg-blue-500` if a theme-accented equivalent exists
- **RTL by default** — the page is `dir="rtl"` (Persian). New UI must work in RTL
- **Persian comments** are welcome for explaining *why*; **English** is preferred for code identifiers
- **No emojis in code identifiers** — emojis are OK in user-facing UI text and comments

---

## Commit Message Convention

This project uses **Conventional Commits**:

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Common types

| Type | When to use |
|---|---|
| `feat` | New feature (e.g., `feat(ratings): add IMDb + RT scores`) |
| `fix` | Bug fix (e.g., `fix(library): modal body now scrolls`) |
| `docs` | Documentation only (e.g., `docs(readme): add badges`) |
| `refactor` | Code restructuring without behavior change |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `chore` | Maintenance, deps, configs |
| `ci` | GitHub Actions / CI changes |

### Common scopes (based on the project)

`ratings`, `themes`, `library`, `discover`, `edits`, `quotes`, `local-files`, `settings`, `tmdb`, `f2m`, `omdb`, `media`, `readme`, `install`, `start`

### Examples

```
feat(ratings): cache OMDb responses for 30 days in-memory

fix(themes): spider-man web pattern was clipped on wide screens

docs(readme): professional README with badges and themes table

chore(deps): bump prisma to 7.9.1
```

---

## Pull Request Workflow

1. **Open an issue first** (for any non-trivial change) — describe what & why
2. Fork the repo and create a feature branch:
   ```bash
   git checkout -b feat/your-feature
   # or: fix/some-bug, docs/improve-readme, etc.
   ```
3. Make your changes. Keep commits atomic and well-named.
4. **Run all of these** before pushing:
   ```bash
   npm run lint
   npx tsc --noEmit
   npm run build
   ```
5. Push to your fork and open a Pull Request against `master`.
6. In the PR description:
   - Reference the issue (e.g., `Fixes #12`)
   - Describe what changed and why
   - Note any breaking changes
   - Add screenshots for UI changes
7. Be responsive to review feedback.

### What gets reviewed

- ✅ Type-safety (no `any` without justification)
- ✅ Theme-compatibility (new UI must work with all 9 themes)
- ✅ RTL-compatibility
- ✅ No hardcoded colors that should follow the theme
- ✅ Lint & build pass
- ✅ Commit messages follow Conventional Commits

---

## Reporting Bugs

Use the **Bug Report** issue template (`.github/ISSUE_TEMPLATE/bug_report.yml`). Include:

- Steps to reproduce
- Expected vs. actual behavior
- Browser, OS, Node version
- Console errors (screenshots if possible)
- Theme in use (default, spiderman, …)
- Whether the issue happens with a fresh `dev.db`

---

## Suggesting Features

Use the **Feature Request** issue template. Include:

- The problem you're trying to solve
- The proposed solution
- Alternative solutions you've considered
- Whether this is theme-specific or app-wide

---

## Working on Themes

Cinephile Vault has **9 immersive themes** (Spider-Man, Batman, Matrix, Joker, Breaking Bad, Harry Potter, Star Wars, Game of Thrones, Default). If your PR touches UI:

1. **Test on at least 3 themes** (one serif, one mono, one display) — they often surface different bugs
2. **Don't break the existing theme tokens** — `var(--accent)`, `var(--accent-glow)`, etc. are wired into Tailwind utilities
3. **New per-theme decorations go in `globals.css`** under a `[data-theme='<id>']` block, with the matching `ThemeDefinition` in `themes.tsx`
4. **Background patterns** use SVG data URLs — keep them small (under 4 KB) and test that they tile cleanly
5. **Micro-interactions** should respect the theme's personality (Spider-Man = pulse, Joker = jitter, Matrix = glitch, HP = float, …)

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

<div align="center">

اگه سوالی داری، [issue بزن](https://github.com/alirezazare1384112-creator/cinema-fil/issues/new) — خوشحال می‌شم کمک کنم.

</div>
