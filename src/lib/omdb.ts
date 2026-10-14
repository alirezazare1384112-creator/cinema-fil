/**
 * ارتباط با OMDb API — منبع رسمی نمرات IMDb / Rotten Tomatoes / Metacritic
 *
 * چرا؟ تا پیش از این فقط `vote_average` از سایت فیلم داشتیم که تقریباً همان
 * نمرهٔ IMDb است ولی بدون منبع رسمی و بدون Critic Score. OMDb به‌صورت
 * همزمان سه نمره را برمی‌گرداند:
 *   - Internet Movie Database → «8.8/10»
 *   - Rotten Tomatoes         → «87%»
 *   - Metacritic               → «74/100»
 *
 * لایهٔ رایگان: ۱۰۰۰ درخواست در روز کافیِ کاربرد شخصی است.
 * کلید از فایل .env یا از صفحهٔ تنظیمات (localStorage) خوانده می‌شود.
 */

export interface Ratings {
  /** 0 یعنی ناموجود یا نامعتبر */
  imdb?: number
  rottenTomatoes?: number
  metacritic?: number
  /** شناسهٔ IMDb برای لینک مستقیم به صفحهٔ فیلم */
  imdbId?: string | null
  /** منبع نهایی (اگر از OMDb نیامده باشد، از f2mvote_average است) */
  source?: 'omdb' | 'fallback' | 'none'
}

interface OMDbResponse {
  Response: 'True' | 'False'
  Error?: string
  imdbID?: string
  imdbRating?: string
  Ratings?: { Source: string; Value: string }[]
  Metascore?: string
}

const OMDB_BASE = 'https://www.omdbapi.com'
const OMDB_TTL = 30 * 24 * 60 * 60 * 1000 // ۳۰ روز — نمرهٔ فیلم‌ها کم تغییر می‌کند

const cache = new Map<string, { exp: number; data: Ratings | null }>()
const inflight = new Map<string, Promise<Ratings | null>>()
const MAX_ENTRIES = 200

function trimCache() {
  if (cache.size <= MAX_ENTRIES) return
  const now = Date.now()
  for (const [key, entry] of cache) {
    if (entry.exp <= now) cache.delete(key)
  }
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
}

function parseRatingValue(raw: string | undefined, kind: 'imdb' | 'rt' | 'meta'): number {
  if (!raw) return 0
  // «8.8/10»  → 8.8
  // «87%»     → 87
  // «74/100»  → 74
  const match = raw.match(/([\d.]+)\s*(?:\/\s*(\d+))?\s*%?/)
  if (!match) return 0
  const value = parseFloat(match[1])
  if (!Number.isFinite(value) || value <= 0) return 0

  if (kind === 'imdb') {
    // OMDb برای IMDb بر اساس ۱۰ برمی‌گرداند → همان مقدار را نگه می‌داریم
    return value <= 10 ? Math.round(value * 10) / 10 : 0
  }
  if (kind === 'rt') {
    // معمولاً «87%» است؛ اگه عدد > 100 بود نادیده بگیر
    return value <= 100 ? Math.round(value) : 0
  }
  if (kind === 'meta') {
    // «74/100» — denom ممکن است نباشد ولی همیشه ۱۰۰ است
    return value <= 100 ? Math.round(value) : 0
  }
  return 0
}

function normalize(data: OMDbResponse | null): Ratings | null {
  if (!data || data.Response !== 'True') return null

  const ratings = data.Ratings || []
  const imdb = parseRatingValue(
    ratings.find((r) => r.Source === 'Internet Movie Database')?.Value || data.imdbRating,
    'imdb'
  )
  const rt = parseRatingValue(
    ratings.find((r) => r.Source === 'Rotten Tomatoes')?.Value,
    'rt'
  )
  const meta = parseRatingValue(
    ratings.find((r) => r.Source === 'Metacritic')?.Value || data.Metascore,
    'meta'
  )

  if (!imdb && !rt && !meta && !data.imdbID) return null

  return {
    imdb: imdb || undefined,
    rottenTomatoes: rt || undefined,
    metacritic: meta || undefined,
    imdbId: data.imdbID || null,
    source: 'omdb'
  }
}

interface ResolveOptions {
  apiKey: string
  /** ترجیحاً با نوع IMDb (tt1375666) */
  imdbId?: string | null
  title?: string
  year?: string | null
  type?: 'movie' | 'tv' | null
}

function buildUrl(opts: ResolveOptions): string {
  const params = new URLSearchParams({ apikey: opts.apiKey, r: 'json' })
  if (opts.imdbId) {
    params.set('i', opts.imdbId)
  } else {
    params.set('t', opts.title || '')
    if (opts.year) params.set('y', opts.year)
    if (opts.type === 'movie') params.set('type', 'movie')
    else if (opts.type === 'tv') params.set('type', 'series')
  }
  return `${OMDB_BASE}/?${params.toString()}`
}

/**
 * دریافت نمرات با کش حافظه.
 * هر «imdbId» (یا title+year+type) فقط یک‌بار fetch می‌شود و تا ۳۰ روز
 * در حافظه نگه داشته می‌شود. درخواست‌های هم‌زمان به یک درخواست ادغام می‌شوند.
 */
export async function fetchRatings(opts: ResolveOptions): Promise<Ratings | null> {
  if (!opts.apiKey) return null

  const key = opts.imdbId
    ? `i:${opts.imdbId}`
    : `t:${opts.title || ''}|y:${opts.year || ''}|t:${opts.type || ''}`

  const hit = cache.get(key)
  if (hit && hit.exp > Date.now()) return hit.data

  const existing = inflight.get(key)
  if (existing) return existing

  const task = (async () => {
    try {
      const res = await fetch(buildUrl(opts), {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000)
      })
      if (!res.ok) {
        cache.set(key, { exp: Date.now() + 5 * 60 * 1000, data: null })
        trimCache()
        return null
      }
      const json = (await res.json()) as OMDbResponse
      const normalized = normalize(json)
      cache.set(key, { exp: Date.now() + OMDB_TTL, data: normalized })
      trimCache()
      return normalized
    } catch {
      cache.set(key, { exp: Date.now() + 5 * 60 * 1000, data: null })
      trimCache()
      return null
    }
  })()

  inflight.set(key, task)
  try {
    return await task
  } finally {
    inflight.delete(key)
  }
}

/**
 * «نمرهٔ احتمالی IMDb» از سایت فیلم (vote_average از HTML استخراج شده).
 * اگر به OMDb دسترسی نباشد، همان را به‌عنوان IMDb نشان می‌دهیم ولی
 * Rotten Tomatoes و Metacritic خالی می‌مانند.
 */
export function fallbackFromVoteAverage(voteAverage?: number | null): Ratings | null {
  if (!voteAverage || voteAverage <= 0) return null
  return {
    imdb: Math.round(voteAverage * 10) / 10,
    source: 'fallback'
  }
}

export function getStoredOmdbKey(): string | null {
  if (typeof window === 'undefined') return null
  const k = localStorage.getItem('omdb_api_key')
  return k && k.trim() ? k.trim() : null
}
