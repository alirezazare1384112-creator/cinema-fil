import { promises as fs } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'

export type F2MType = 'movie' | 'tv' | 'all'
export type F2MSort = 'newest' | 'modified' | 'popular' | 'imdb_rate' | 'release'

export interface F2MGenre {
  slug: string
  name: string
  type: 'movie' | 'tv'
  count: number
}

export interface F2MItem {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  genre_ids: number[]
  genre_names: string[]
  media_type: 'movie' | 'tv'
  popularity: number
  source: 'f2m'
  detail_url: string
}

export interface F2MListResult {
  results: F2MItem[]
  hasMore: boolean
}

export interface F2MDownload {
  /** گروه نسخه: «دوبله فارسی…»، «زیرنویس فارسی چسبیده…»، «زبان اصلی…» */
  group: string
  quality: string
  url: string
}

export interface F2MSubtitleLink {
  label: string
  url: string
}

export interface F2MDetails {
  overview: string
  poster: string | null
  cast: { name: string; character: string; profile_path: string | null }[]
  downloads: F2MDownload[]
  subtitles: F2MSubtitleLink[]
  trailer: string | null
}

const F2M_BASE = (process.env.F2M_BASE || 'https://f2medx.top').replace(/\/+$/, '')

const LIST_TTL = 5 * 60 * 1000
const GENRE_TTL = 24 * 60 * 60 * 1000
const DETAILS_TTL = 24 * 60 * 60 * 1000
const REQUEST_TIMEOUT = 12000
const MAX_CACHE_ENTRIES = 80

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export const F2M_GENRE_IDS: Record<string, number> = {
  '%d9%90drama': 18,
  action: 28,
  adventure: 12,
  animation: 16,
  anime: 16,
  children: 10751,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  musical: 10402,
  mystery: 9648,
  realitytv: 10764,
  'reality-tv': 10764,
  romance: 10749,
  'sci-fi': 878,
  'science-fiction': 878,
  'talk-show': 10769,
  thriller: 53,
  war: 10752,
  western: 37
}

interface CacheEntry {
  exp: number
  html: string
}

const htmlCache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<string>>()

function trimCache() {
  if (htmlCache.size <= MAX_CACHE_ENTRIES) return
  const now = Date.now()
  for (const [key, entry] of htmlCache) {
    if (entry.exp <= now) htmlCache.delete(key)
  }
  while (htmlCache.size > MAX_CACHE_ENTRIES) {
    const oldest = htmlCache.keys().next().value
    if (oldest === undefined) break
    htmlCache.delete(oldest)
  }
}

const MAX_ATTEMPTS = 3

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function requestHtml(url: string): Promise<string> {
  let lastError: unknown = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const retry = attempt < MAX_ATTEMPTS
    let response: Response

    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept-Language': 'fa,en;q=0.8'
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT)
      })
    } catch (error) {
      lastError = error
      if (!retry) break
      await delay(300 * attempt)
      continue
    }

    if (response.ok) {
      try {
        return await response.text()
      } catch (error) {
        lastError = error
        if (!retry) break
        await delay(300 * attempt)
        continue
      }
    }

    const statusError = new Error(`سایت فیلم با کد ${response.status} پاسخ داد`)
    if (response.status < 500) throw statusError
    lastError = statusError
    if (!retry) break
    await delay(300 * attempt)
  }

  throw lastError instanceof Error ? lastError : new Error('ارتباط با سایت فیلم ناموفق بود')
}

// کش صفحات روی دیسک → بعد از ری‌استارت سرور یا هات‌ریلود در حالت dev هم
// سریع می‌ماند و درخواست دوباره به سایت نمی‌رود.
const HTML_CACHE_DIR = path.join(process.cwd(), '.f2m-cache')

function htmlCachePath(url: string): string {
  return path.join(HTML_CACHE_DIR, `${createHash('sha256').update(url).digest('hex').slice(0, 32)}.json`)
}

async function readHtmlFromDisk(url: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(htmlCachePath(url), 'utf8')
    const parsed = JSON.parse(raw) as { exp: number; html: string }
    if (parsed && parsed.exp > Date.now() && typeof parsed.html === 'string') return parsed.html
  } catch {
    // فایل نیست یا خراب است → از سایت می‌گیریم
  }
  return null
}

async function writeHtmlToDisk(url: string, exp: number, html: string): Promise<void> {
  try {
    await fs.mkdir(HTML_CACHE_DIR, { recursive: true })
    await fs.writeFile(htmlCachePath(url), JSON.stringify({ exp, html }), 'utf8')
  } catch {
    // دیسک در دسترس نیست → فقط کش حافظه می‌ماند
  }
}

async function loadHtml(url: string, ttl: number): Promise<string> {
  const cached = htmlCache.get(url)
  if (cached && cached.exp > Date.now()) return cached.html

  const running = inflight.get(url)
  if (running) return running

  const task = (async () => {
    const fromDisk = await readHtmlFromDisk(url)
    if (fromDisk) {
      htmlCache.set(url, { exp: Date.now() + ttl, html: fromDisk })
      trimCache()
      return fromDisk
    }

    const html = await requestHtml(url)
    const exp = Date.now() + ttl
    htmlCache.set(url, { exp, html })
    trimCache()
    void writeHtmlToDisk(url, exp, html)
    return html
  })()

  inflight.set(url, task)
  try {
    return await task
  } finally {
    inflight.delete(url)
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function absoluteUrl(value: string): string {
  if (!value) return ''
  if (value.startsWith('http')) return value
  if (value.startsWith('//')) return `https:${value}`
  return `${F2M_BASE}${value.startsWith('/') ? '' : '/'}${value}`
}

function extractYear(block: string, title: string): string {
  const metaYear = block.match(/icon-calendar[\s\S]{0,400}?<\/svg>\s*([\d]{4})/)
  if (metaYear) return metaYear[1]

  const caption = block.match(/<figcaption class="sr-only">([\s\S]*?)<\/figcaption>/)
  const candidates = [caption ? decodeEntities(caption[1]) : '', title]
  for (const candidate of candidates) {
    const year = candidate.match(/\b((?:19|20)\d{2})\b/)
    if (year) return year[1]
  }
  return ''
}

function stableId(url: string): number {
  const postMatch = url.match(/\/(\d{3,})\/[^/]+\/?$/)
  if (postMatch) return parseInt(postMatch[1], 10)

  let hash = 0x811c9dc5
  for (let i = 0; i < url.length; i++) {
    hash ^= url.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) % 1000000000 || 1
}

function extractGenres(block: string): { ids: number[]; names: string[]; slugs: string[] } {
  const ids: number[] = []
  const names: string[] = []
  const slugs: string[] = []
  const pattern = /<a[^>]+href="[^"]*\/genres\/([^/"?]+)\/[^"]*"[^>]*>([\s\S]*?)<\/a>/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(block))) {
    const slug = match[1]
    const name = decodeEntities(match[2])
    if (!slug || !name || slugs.includes(slug)) continue
    slugs.push(slug)
    names.push(name)
    const mapped = F2M_GENRE_IDS[slug]
    if (mapped) ids.push(mapped)
  }
  return { ids, names, slugs }
}

function parseEntries(html: string, fallbackType: 'movie' | 'tv' | null): F2MItem[] {
  const items: F2MItem[] = []
  const seen = new Set<string>()
  const articlePattern = /<article class="entry">([\s\S]*?)<\/article>/g
  let article: RegExpExecArray | null

  while ((article = articlePattern.exec(html))) {
    const block = article[1]
    const linkMatch = block.match(/<a[^>]*href="([^"]+)"[^>]*class="[^"]*stretched-link/)
    const titleMatch = block.match(/<h2 class="entry-title">([\s\S]*?)<\/h2>/)
    if (!linkMatch || !titleMatch) continue

    const url = absoluteUrl(linkMatch[1])
    const title = decodeEntities(titleMatch[1])
    if (!title || !url) continue

    const dedupeKey = url
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    const posterMatch = block.match(/<img[^>]*\ssrc="([^"]+)"/)
    const ratingMatch = block.match(/<strong[^>]*>([\d.]+)<\/strong>\s*\/\s*10/)
    const genresBlock = block.match(/<div class="entry-ganers">([\s\S]*?)<\/div>/)
    const genreInfo = genresBlock ? extractGenres(genresBlock[1]) : { ids: [], names: [], slugs: [] }

    const mediaType: 'movie' | 'tv' = fallbackType || (url.includes('/series/') ? 'tv' : 'movie')
    const year = extractYear(block, title)

    items.push({
      id: -stableId(url),
      title,
      overview: '',
      poster_path: posterMatch ? absoluteUrl(posterMatch[1]) : null,
      backdrop_path: null,
      release_date: year,
      vote_average: ratingMatch ? parseFloat(ratingMatch[1]) : 0,
      genre_ids: genreInfo.ids,
      genre_names: genreInfo.names,
      media_type: mediaType,
      popularity: 0,
      source: 'f2m',
      detail_url: url
    })
  }

  return items
}

function hasNextPage(html: string): boolean {
  return /<link[^>]+rel="next"/.test(html)
}

function hasSearchNextPage(html: string): boolean {
  return /<a[^>]*class="[^"]*page-numbers/.test(html)
}

function archiveUrl(type: 'movie' | 'tv', genre: string | undefined, sortby: F2MSort, page: number): string {
  const base = genre ? `${F2M_BASE}/genres/${genre}/?type=${type === 'tv' ? 'series' : 'movie'}` : `${F2M_BASE}/${type === 'tv' ? 'series' : 'movies'}/`
  const separator = base.includes('?') ? '&' : '?'
  return `${base}${separator}sortby=${sortby}&paged=${page}`
}

function searchUrl(query: string, page: number): string {
  return `${F2M_BASE}/?s=${encodeURIComponent(query)}&paged=${page}`
}

async function fetchArchive(
  type: 'movie' | 'tv',
  genre: string | undefined,
  sortby: F2MSort,
  page: number
): Promise<F2MListResult> {
  const url = archiveUrl(type, genre, sortby, page)
  const html = await loadHtml(url, LIST_TTL)
  return { results: parseEntries(html, type), hasMore: hasNextPage(html) }
}

export async function fetchList(options: {
  type: F2MType
  genre?: string | null
  sortby?: F2MSort
  page?: number
  query?: string | null
}): Promise<F2MListResult> {
  const page = Math.max(1, options.page || 1)
  const sortby = options.sortby || 'popular'
  const genre = options.genre || undefined
  const query = (options.query || '').trim()

  if (query) {
    const siteType = options.type === 'all' ? 'both' : options.type === 'tv' ? 'series' : 'movie'
    const html = await loadHtml(`${searchUrl(query, page)}&type=${siteType}`, LIST_TTL)
    return { results: parseEntries(html, null), hasMore: hasSearchNextPage(html) }
  }

  const wanted: ('movie' | 'tv')[] = options.type === 'all' ? ['movie', 'tv'] : [options.type]
  const parts = await Promise.all(wanted.map((type) => fetchArchive(type, genre, sortby, page)))

  const results: F2MItem[] = []
  const seen = new Set<string>()
  for (const part of parts) {
    for (const item of part.results) {
      const key = `${item.media_type}-${item.id}`
      if (seen.has(key)) continue
      seen.add(key)
      results.push({ ...item, popularity: (page - 1) * 100 + (results.length + 1) })
    }
  }

  return { results, hasMore: parts.some((part) => part.hasMore) }
}

/**
 * آدرس صفحهٔ یک عنوان در سایت فیلم را پیدا می‌کند — برای رسانه‌هایی که هنگام
 * افزودن به کتابخانه آدرس ذخیره نشده است. اول با همان نوع (فیلم/سریال)
 * جستجو می‌کند و اگر چیزی نیافت، کل سایت را می‌گردد؛ سپس نزدیک‌ترین عنوان
 * (و در صورت امکان با همان سال) را برمی‌گرداند.
 */
export async function resolveDetailUrl(
  title: string,
  year?: string | null,
  mediaType?: string | null
): Promise<string | null> {
  const query = (title || '').trim()
  if (!query) return null

  const wanted: F2MType[] = mediaType === 'movie' || mediaType === 'tv' ? [mediaType, 'all'] : ['all']

  let results: F2MItem[] = []
  for (const type of wanted) {
    try {
      const list = await fetchList({ type, sortby: 'popular', page: 1, query })
      if (list.results.length) {
        results = list.results
        break
      }
    } catch {
      // تلاش بعدی (با کل سایت)
    }
  }
  if (!results.length) return null

  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const want = norm(query)
  const score = (candidate: string) => {
    const t = norm(candidate)
    if (t === want) return 3
    if (t.startsWith(want) || want.startsWith(t)) return 2
    if (t.includes(want) || want.includes(t)) return 1
    return 0
  }

  const ranked = results
    .map((item) => ({ item, s: score(item.title) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
  const pool = ranked.length ? ranked : results.map((item) => ({ item, s: 0 }))

  if (year && year.length === 4) {
    const byYear = pool.filter((x) => (x.item.release_date || '').startsWith(year))
    if (byYear.length) return byYear[0].item.detail_url
  }

  return pool[0].item.detail_url
}

function extractBlock(html: string, id: string): string {
  const match = html.match(new RegExp(`<div id="${id}">([\\s\\S]*?)</div>`))
  return match ? match[1] : ''
}

function parseGenreBlock(block: string, type: 'movie' | 'tv'): F2MGenre[] {
  const genres: F2MGenre[] = []
  const pattern = /<li><a href="[^"]*\/genres\/([^/"?]+)\/\?type=(?:movie|series)">([\s\S]*?)<\/a>\s*(?:\((\d+)\))?/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(block))) {
    genres.push({
      slug: match[1],
      name: decodeEntities(match[2]),
      type,
      count: match[3] ? parseInt(match[3], 10) : 0
    })
  }
  return genres
}

export async function fetchGenres(): Promise<F2MGenre[]> {
  const html = await loadHtml(`${F2M_BASE}/`, GENRE_TTL)
  const movieGenres = parseGenreBlock(extractBlock(html, 'genres-movies'), 'movie')
  const tvGenres = parseGenreBlock(extractBlock(html, 'genres-series'), 'tv')
  return [...movieGenres, ...tvGenres]
}

function isSameHost(url: string): boolean {
  try {
    const target = new URL(url)
    const base = new URL(F2M_BASE)
    return target.hostname.replace(/^www\./, '') === base.hostname.replace(/^www\./, '')
  } catch {
    return false
  }
}

const BOILERPLATE_MARKERS = [
  'دانلود فیلم بدون سانسور',
  'دانلود رایگان فیلم',
  'پخش آنلاین فیلم و سریال',
  'دانلود سریال بدون سانسور',
  'دانلود فیلم جدید',
  'فیلم 2 مدیا'
]

function isBoilerplate(text: string): boolean {
  return BOILERPLATE_MARKERS.some((marker) => text.includes(marker))
}

function extractOverview(html: string): string {
  const excerpt = html.match(/<div class="entry-excerpt[^"]*">([\s\S]*?)<\/div>/)
  const fromBody = excerpt ? decodeEntities(excerpt[1]) : ''
  if (fromBody && !isBoilerplate(fromBody)) return fromBody

  const descriptions = Array.from(
    html.matchAll(/<meta[^>]+property="og:description"[^>]+content="([^"]*)"/g)
  )
    .map((match) => decodeEntities(match[1]))
    .filter((text) => text.length > 40 && !isBoilerplate(text))

  return descriptions.sort((a, b) => b.length - a.length)[0] || ''
}

function extractCast(html: string): { name: string; character: string; profile_path: string | null }[] {
  const cast: { name: string; character: string; profile_path: string | null }[] = []
  const pattern = /<a[^>]*class="[^"]*person-item[^"]*"[^>]*>([\s\S]*?)<\/a>/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(html))) {
    const block = match[1]
    const name = block.match(/class="person-name">([\s\S]*?)<\/div>/)
    if (!name) continue
    const character = block.match(/class="person-role">([\s\S]*?)<\/div>/)
    const image = block.match(/background-image:url\(([^)]+)\)/)

    cast.push({
      name: decodeEntities(name[1]),
      character: character ? decodeEntities(character[1]) : '',
      profile_path: image ? image[1].replace(/&amp;/g, '&') : null
    })
    if (cast.length >= 8) break
  }

  return cast
}

export async function fetchDetails(url: string): Promise<F2MDetails> {
  if (!url || !isSameHost(url)) {
    throw new Error('آدرس نامعتبر است')
  }

  // صفحهٔ فیلم و زیرنویس (Subzone) هم‌زمان گرفته می‌شوند → زمان پاسخ برابر
  // بزرگ‌ترین درخواست است نه جمعشان (حدود ۵۰۰ تا ۷۰۰ میلی‌ثانیه کمتر).
  const [html, subzoneLink] = await Promise.all([
    loadHtml(url, DETAILS_TTL),
    resolveSubzoneLink(url).catch(() => null)
  ])
  const posterMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]*)"/)

  return {
    overview: extractOverview(html),
    poster: posterMatch ? absoluteUrl(posterMatch[1]) : null,
    cast: extractCast(html),
    downloads: extractDownloads(html),
    subtitles: await extractSubtitles(html, url, subzoneLink),
    trailer: extractTrailerUrl(html)
  }
}

/* ------------------------------------------------------------------ *
 * لینک‌های دانلود، زیرنویس و تریلر از صفحهٔ جزئیات سایت
 * ------------------------------------------------------------------ */

/** عنوان قابل‌استفاده برای جستجوی زیرنویس: بخش لاتینِ عنوان صفحه، یا اسلاگِ آدرس */
function extractTitleFromHtml(html: string, url: string): string {
  const og = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]*)"/)
  if (og) {
    const raw = decodeEntities(og[1])
    const runs = (raw.match(/[A-Za-z0-9][A-Za-z0-9:.'’&\- ]{2,}/g) || [])
      .map((s) => s.trim())
      .filter((s) => s.length >= 3)
    if (runs.length) return runs.sort((a, b) => b.length - a.length)[0]
  }
  return slugFromUrl(url).replace(/-/g, ' ')
}

/** آخرین قطعهٔ آدرس = اسلاگ فیلم (مثل wuthering-heights-2026) */
function slugFromUrl(url: string): string {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    return parts[parts.length - 1] || ''
  } catch {
    return ''
  }
}

/** پسوندهایی که لینکِ مستقیمِ دانلود محسوب می‌شوند */
const FILE_LINK_RE = /\.(mkv|mp4|avi|mov|wmv|flv|ts|m2ts|m4v|rmvb|mpg|mpeg|zip|rar|7z)(\?|#|$)/i

/** متنِ خالصِ یک قطعه HTML (بدون تگ) */
function plainText(fragment: string): string {
  return decodeEntities(fragment.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

/**
 * باکس دانلود — دو ساختار متفاوت سایت را می‌پوشاند:
 *
 * فیلم: هر بلاک `download-list` یک نسخه (دوبله فارسی، زیرنویس چسبیده،
 *       زبان اصلی) است و هر `<li>` یک کیفیت با یک لینک «دانلود مستقیم».
 *
 * سریال: هر فصل یک `download-season` است («فصل اول دوبله فارسی»)؛ داخل آن
 *       بلاک‌های `download-list` با کیفیت‌های مختلف می‌آید و لینک‌ها
 *       **تک‌تک قسمت‌ها** هستند (`قسمت 01`، `قسمت 02`، …) — برای هر قسمت
 *       یک آدرس مستقیم جدا وجود دارد.
 */
function extractDownloads(html: string): F2MDownload[] {
  const sectionMatch = html.match(/<section id="downloads"[\s\S]*?(?=<section |<footer|<\/main>)/)
  const section = sectionMatch ? sectionMatch[0] : html
  const out: F2MDownload[] = []
  const seen = new Set<string>()

  // برچسب فصل‌ها (فقط صفحات سریال دارای download-season هستند)
  const seasons: { at: number; label: string }[] = []
  const seasonPattern = /<div class="download-season[\s\S]*?<button[^>]*>([\s\S]*?)<\/button>/g
  let sm: RegExpExecArray | null
  while ((sm = seasonPattern.exec(section))) {
    // نشان «به اتمام رسیده» را حذف می‌کنیم
    seasons.push({ at: sm.index, label: plainText(sm[1].replace(/<span[\s\S]*?<\/span>/g, '')) })
  }

  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/g
  const blockPattern = /<div class="download-list[^"]*">([\s\S]*?)(?=<div class="download-list|<\/section>|$)/g
  let seasonIdx = 0
  let block: RegExpExecArray | null

  while ((block = blockPattern.exec(section))) {
    while (seasonIdx + 1 < seasons.length && seasons[seasonIdx + 1].at < block.index) seasonIdx++
    const season = seasons.length && seasons[seasonIdx].at < block.index ? seasons[seasonIdx].label : ''

    const blockHtml = block[1]
    const titleMatch = blockHtml.match(/<p class="title">\s*<span>([\s\S]*?)<\/span>/)
    const blockTitle = titleMatch ? plainText(titleMatch[1]) : ''

    for (const li of blockHtml.split(/<li[^>]*>/).slice(1)) {
      const qualityMatch = li.match(/<span class="text"[^>]*>([^<]+)<\/span>/)
      const quality = qualityMatch ? plainText(qualityMatch[1]) : ''

      // لینک‌های فایلِ داخل این ردیف (URL واحد → بهترین برچسبِ موجود)
      const byUrl = new Map<string, string>()
      const isMeaningful = (t: string) => Boolean(t) && t !== quality && t !== 'دانلود مستقیم'

      anchorPattern.lastIndex = 0
      let am: RegExpExecArray | null
      while ((am = anchorPattern.exec(li))) {
        const attrs = am[1]
        const href = (attrs.match(/href="([^"]*)"/) || [])[1]?.replace(/&amp;/g, '&') || ''
        const click = (attrs.match(/handleDownloadClick\('([^']+)'\)/) || [])[1]?.replace(/&amp;/g, '&') || ''

        let fileUrl = ''
        let trusted = false
        if (href && !href.startsWith('#')) {
          fileUrl = href
          trusted =
            FILE_LINK_RE.test(fileUrl) || /(\?|&)download=/i.test(fileUrl) || /\sdownload(\s|=|>)/i.test(attrs)
        } else if (click) {
          fileUrl = click
          trusted = true // داخل handleDownloadClick سایت لینک دانلود می‌سازد
        }
        if (!fileUrl || !trusted) continue

        const text = plainText(am[2])
        const prev = byUrl.get(fileUrl)
        if (!prev || (isMeaningful(text) && !isMeaningful(prev))) {
          byUrl.set(fileUrl, isMeaningful(text) ? text : quality || text || 'دانلود')
        }
      }

      if (byUrl.size === 0) continue

      // گروه: فیلم → فقط نسخه (چیپ‌ها کیفیت‌ها هستند).
      // سریال → فصل + نسخه + کیفیت، چون هر کیفیت قسمت‌های خودش را دارد.
      const group = season
        ? [season, blockTitle, quality].filter(Boolean).join(' — ')
        : blockTitle || quality

      for (const [fileUrl, label] of byUrl) {
        const key = `${group}|${fileUrl}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ group, quality: label, url: fileUrl })
      }
    }
  }

  return out
}

/** ویدیوی تریلر داخل مودال `trailerModal` سایت (فایل MP4 مستقیم) */
function extractTrailerUrl(html: string): string | null {
  const idx = html.indexOf('id="trailerModal"')
  if (idx < 0) return null
  const chunk = html.slice(idx, idx + 4000)
  const video = chunk.match(/<video[^>]+src="([^"]+)"/)
  if (video) return video[1].replace(/&amp;/g, '&')
  const yt = chunk.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/)
  if (yt) return `https://www.youtube.com/watch?v=${yt[1]}`
  return null
}

const SUBZONE_BASE = 'https://subzone.ir'
const SUBZONE_TTL = 24 * 60 * 60 * 1000

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * صفحهٔ زیرنویسِ همان فیلم در Subzone را با اسلاگِ آدرس (با/بدون سال) پیدا
 * می‌کند. به HTML صفحهٔ فیلم وابسته نیست، پس هم‌زمان با دانلود آن صفحه
 * اجرا می‌شود و به زمان پاسخ چیزی اضافه نمی‌کند.
 */
async function resolveSubzoneLink(url: string): Promise<string | null> {
  const slug = slugFromUrl(url)
  const candidates = Array.from(
    new Set([slug, slug.replace(/-(?:19|20)\d{2}$/, '')].filter((s) => s && s.length >= 3))
  )
  for (const candidate of candidates) {
    try {
      await loadHtml(`${SUBZONE_BASE}/subtitles/${candidate}`, SUBZONE_TTL)
      return `${SUBZONE_BASE}/subtitles/${candidate}`
    } catch {
      // اسلاگ بعدی (۴۰۴ یعنی این اسلاگ وجود ندارد)
    }
  }
  return null
}

/**
 * زیرنویس: اول لینک‌های مستقیم داخل صفحهٔ فیلم؛ وگرنه صفحهٔ زیرنویسِ
 * همان فیلم در Subzone را با اسلاگ (با و بدون سال) پیدا می‌کنیم و
 * در آخر سراغ جستجو می‌رویم.
 */
async function extractSubtitles(html: string, url: string, subzoneLink: string | null): Promise<F2MSubtitleLink[]> {
  const links: F2MSubtitleLink[] = []
  const seen = new Set<string>()

  const directPattern = /<a[^>]+href="([^"]+)"[^>]*>\s*دانلود زیرنویس/g
  let m: RegExpExecArray | null
  while ((m = directPattern.exec(html))) {
    const fileUrl = m[1].replace(/&amp;/g, '&')
    if (!fileUrl || fileUrl === SUBZONE_BASE || fileUrl === `${SUBZONE_BASE}/`) continue
    if (seen.has(fileUrl)) continue
    seen.add(fileUrl)
    links.push({ label: 'دانلود زیرنویس', url: fileUrl })
  }
  if (links.length > 0) return links

  const title = extractTitleFromHtml(html, url)
  const slug = slugFromUrl(url)
  const candidates = Array.from(
    new Set([slug, slug.replace(/-(?:19|20)\d{2}$/, '')].filter((s) => s && s.length >= 3))
  )

  // ۱) نتیجهٔ پیش‌واکشی‌شدهٔ هم‌زمان (resolveSubzoneLink)
  if (subzoneLink) {
    links.push({
      label: title ? `زیرنویس «${title}» در Subzone` : 'زیرنویس در Subzone',
      url: subzoneLink
    })
    return links
  }

  // ۲) جستجو بر اساس عنوان
  const query = `${SUBZONE_BASE}/subtitles/searchbytitle?query=${encodeURIComponent(title || slug.replace(/-/g, ' '))}`
  try {
    const searchHtml = await loadHtml(query, SUBZONE_TTL)
    const slugs = Array.from(searchHtml.matchAll(/href="(\/subtitles\/[^"?#]+)"/g)).map((x) => x[1])
    if (slugs.length) {
      const want = slugify(title) || candidates[0] || ''
      const exact = slugs.find((s) => s === `/subtitles/${want}`)
      const partial = want ? slugs.find((s) => s.includes(want) || want.includes(s.replace('/subtitles/', ''))) : undefined
      links.push({ label: `زیرنویس «${title}» در Subzone`, url: `${SUBZONE_BASE}${exact || partial || slugs[0]}` })
      return links
    }
  } catch {
    // اینترنت در دسترس نیست → لینک جستجو را برمی‌گردانیم
  }

  links.push({ label: `جستجوی زیرنویس «${title}»`, url: query })
  return links
}
