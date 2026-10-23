export interface PlayCandidate {
  group: string
  quality: string
  url: string
}

const VIDEO_EXT = /\.(mp4|mkv|webm|m4v|mov)(\?|#|$)/i
/** فرمت‌هایی که خودِ مرورگر بدون واسطه پخش می‌کند (MKV در Chromium پخش نمی‌شود) */
const BROWSER_EXT = /\.(mp4|webm|m4v|mov)(\?|#|$)/i
/** نشانهٔ وجود رزولوشن در یک برچسب */
const RES_RE = /(1080|720|480|2160|\b4k\b|full\s*hd)/i

export function isBrowserVideo(url: string): boolean {
  return BROWSER_EXT.test(url)
}

/** نسخه‌های x265/HEVC/10bit در مرورگر تصویر ندارند (فقط صدا) → پلیر سیستم */
export function isHevcQuality(quality: string): boolean {
  return /x265|hevc|10bit|h\.?265/i.test(quality)
}

/**
 * متنِ کاملِ یک گزینه = کیفیت + گروه.
 * در فیلم‌ها رزولوشن در «کیفیت» است، ولی در سریال‌ها «کیفیت» نامِ قسمت
 * («قسمت 01») است و رزولوشن/انکود داخل «گروه» می‌آید؛ پس هر دو را با هم
 * می‌بینیم تا انتخاب نسخه برای سریال هم درست انجام شود.
 */
export function metaText(d: { group?: string; quality?: string }): string {
  return `${d.quality || ''} ${d.group || ''}`
}

function groupScore(group: string): number {
  if (group.includes('زیرنویس فارسی چسبیده')) return 3
  if (group.includes('دوبله فارسی')) return 2
  if (group.includes('زبان اصلی')) return 1
  return 0
}

function qualityScore(quality: string): number {
  if (/صوت|audio/i.test(quality)) return -1
  let score: number
  if (/1080|full hd/i.test(quality)) score = 5
  else if (/720/i.test(quality)) score = 4
  else if (/480/i.test(quality)) score = 3
  else if (/2160|4k/i.test(quality)) score = 2
  else score = 1
  // x265/HEVC در مرورگر پخش نمی‌شود → اولویت با نسخه‌های x264
  if (isHevcQuality(quality)) score -= 0.5
  return score
}

/**
 * لینک‌های قابل‌پخش را برمی‌گرداند، مرتب‌شده بر اساس:
 * نسخهٔ «زیرنویس فارسی چسبیده» → «دوبله فارسی» → «زبان اصلی»،
 * در هر گروه کیفیت مناسب (۱۰۸۰ > ۷۲۰ > ۴۸۰) با ترجیح x264،
 * و در ترازِ مساوی اولویت با فرمتی که داخل مرورگر پخش می‌شود (mp4 غیر-HEVC).
 * خروجی‌ها همه با پلیر سیستم هم قابل‌پخش‌اند؛ تشخیص مسیر پخش با
 * isBrowserPlayable انجام می‌شود.
 */
export function pickPlayable(downloads?: PlayCandidate[]): PlayCandidate[] {
  return (downloads || [])
    .map((d, i) => {
      const meta = metaText(d)
      return {
        ...d,
        i,
        gs: groupScore(meta),
        qs: qualityScore(RES_RE.test(d.quality) ? d.quality : meta),
        bs: isBrowserVideo(d.url) && !isHevcQuality(meta) ? 0.6 : 0
      }
    })
    .filter((d) => VIDEO_EXT.test(d.url) && d.qs >= 0)
    .sort((a, b) => b.gs - a.gs || b.qs - a.qs || b.bs - a.bs || a.i - b.i)
    .map(({ group, quality, url }) => ({ group, quality, url }))
}

/** آیا این نسخه واقعاً داخل مرورگر پخش می‌شود؟ (فرمت + کدک) */
export function isBrowserPlayable(d: { url: string; quality?: string; group?: string }): boolean {
  return isBrowserVideo(d.url) && !isHevcQuality(metaText(d))
}

/* ------------------------------------------------------------------ *
 * سریال‌ها — فصل / نسخه / قسمت
 *
 * در صفحهٔ سریال، هر لینک یک «قسمت» از یک «نسخه» در یک «فصل» است:
 *   گروه  = «فصل اول دوبله فارسی — دوبله فارسی بدون حذفیات — 1080p»
 *   کیفیت = «قسمت 03»
 * این بخش همان ساختار را به فصل‌های مرتب، نسخه‌های قابل‌انتخاب و
 * قسمت‌های شماره‌دار تبدیل می‌کند تا پلیر بتواند بین قسمت‌ها جابه‌جا شود.
 * ------------------------------------------------------------------ */

export interface SeriesEpisode {
  episode: number
  /** برچسب اصلی سایت («قسمت 03») */
  label: string
  url: string
}

export interface SeriesVariant {
  key: string
  /** مثل «دوبله فارسی بدون حذفیات (دو زبانه)» */
  version: string
  /** مثل «WEB-DL 1080p» */
  quality: string
  episodes: SeriesEpisode[]
}

export interface SeriesSeason {
  key: string
  /** مثل «فصل اول دوبله فارسی» */
  label: string
  /** ۱، ۲، … (۰ اگر شماره‌اش پیدا نشد) */
  number: number
  variants: SeriesVariant[]
  episodeCount: number
}

export interface SeriesContent {
  seasons: SeriesSeason[]
  /** تعداد کل قسمت‌ها (بیشترین شمارهٔ قسمت در هر فصل، جمع‌شده) */
  totalEpisodes: number
}

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'

function latinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
}

const ORDINALS: Record<string, number> = {
  اول: 1,
  یکم: 1,
  دوم: 2,
  دومین: 2,
  سوم: 3,
  سومین: 3,
  چهارم: 4,
  چهارمین: 4,
  پنجم: 5,
  پنجمین: 5,
  ششم: 6,
  ششمین: 6,
  هفتم: 7,
  هفتمین: 7,
  هشتم: 8,
  هشتمین: 8,
  نهم: 9,
  نهمین: 9,
  دهم: 10,
  دهمین: 10,
  یازدهم: 11,
  دوازدهم: 12,
  سیزدهم: 13,
  چهاردهم: 14,
  پانزدهم: 15,
  شانزدهم: 16,
  هفدهم: 17,
  هجدهم: 18,
  نوزدهم: 19,
  بیستم: 20,
  بیست‌ویکم: 21,
  بیست‌ودوم: 22
}

/** «فصل اول …» → ۱ ، «فصل 3» → ۳ ، در غیر این صورت null */
export function seasonNumberFromLabel(label: string): number | null {
  if (!label) return null
  const text = latinDigits(label)
  const after = text.match(/فصل\s*([^\s—–-]+)/)
  if (after) {
    const word = after[1].replace(/[.،,:؛]$/g, '')
    if (/^\d+$/.test(word)) return parseInt(word, 10)
    if (ORDINALS[word]) return ORDINALS[word]
  }
  const numbered = text.match(/season\s*(\d{1,2})/i)
  if (numbered) return parseInt(numbered[1], 10)
  return null
}

/**
 * شمارهٔ قسمت از یک برچسب: «قسمت 03» → ۳ ، «قسمت ۱۲» → ۱۲ ،
 * «S02E07» → ۷ ، «Episode 5» → ۵.
 */
export function episodeNumberFromLabel(label: string): number | null {
  if (!label) return null
  const text = latinDigits(label)

  const fa = text.match(/قسمت\s*#?\s*(\d{1,4})/)
  if (fa) return parseInt(fa[1], 10)

  const sxe = text.match(/s\d{1,2}\s*[.\-_ ]?\s*e(?:p)?\s*(\d{1,4})/i)
  if (sxe) return parseInt(sxe[1], 10)

  const ep = text.match(/(?:episode|ep\.?)\s*#?\s*(\d{1,4})/i)
  if (ep) return parseInt(ep[1], 10)

  // برچسب‌هایی مثل «03» یا «قسمت سوم» (فقط وقتی کل برچسب همین باشد)
  const bare = text.trim().match(/^(\d{1,4})$/)
  if (bare) return parseInt(bare[1], 10)

  return null
}

/** شمارهٔ قسمت از آدرس فایل: …S01E05… یا …Ep05… */
function episodeNumberFromUrl(url: string): number | null {
  const byName = url.match(/s\d{1,2}\s*[.\-_ ]?\s*e(?:p)?\s*(\d{1,4})/i)
  if (byName) return parseInt(byName[1], 10)
  const byEpisode = url.match(/[.\-_ ]ep?\.?\s*(\d{1,3})\.(?:mkv|mp4|webm|m4v|mov)/i)
  if (byEpisode) return parseInt(byEpisode[1], 10)
  return null
}

const QUALITY_TOKEN_RE =
  /web[- ]?dl|blu-?ray|brrip|bdrip|hdtv|hdrip|hdcam|dvdrip|webrip|x264|x265|hevc|10bit|2160|1080|720|480|\b4k\b/i

interface ParsedGroup {
  seasonLabel: string
  seasonNumber: number
  version: string
  quality: string
}

/** گروه یک لینک را به «فصل + نسخه + کیفیت» می‌شکند */
function parseGroup(group: string): ParsedGroup {
  const parts = (group || '')
    .split(/\s+[—–-]\s+/)
    .map((p) => p.trim())
    .filter(Boolean)

  let seasonLabel = ''
  let season = 0
  // «فصل اول زیرنویس فارسی» و «فصل اول دوبله فارسی» یک فصل‌اند؛ پس فقط
  // «فصل اول» را نگه می‌داریم و تفاوت نسخه (دوبله/زیرنویس) در «نسخه» می‌آید.
  let seasonHint = ''
  if (parts.length && /^فصل(\s|$)/.test(parts[0])) {
    const head = parts[0]
    const numberWord = head.match(/^فصل\s*([^\s—–-]+)/)
    seasonLabel = numberWord ? `فصل ${numberWord[1]}` : head
    seasonHint = numberWord ? head.slice(numberWord[0].length).trim() : ''
    season = seasonNumberFromLabel(head) ?? 0
    parts.shift()
  }

  let quality = ''
  const last = parts[parts.length - 1]
  if (last && QUALITY_TOKEN_RE.test(last) && episodeNumberFromLabel(last) === null) {
    quality = last
    parts.pop()
  }

  return {
    seasonLabel,
    seasonNumber: season,
    version: parts.join(' — ') || seasonHint,
    quality
  }
}

/** قطعهٔ نمایشی کوتاه برای نسخه: «زیرنویس چسبیده · 1080p» */
export function variantLabel(variant: SeriesVariant): string {
  const version = variant.version || ''
  const tag = version.includes('دوبله')
    ? 'دوبله فارسی'
    : version.includes('چسبیده')
      ? 'زیرنویس چسبیده'
      : version.includes('زبان اصلی')
        ? 'زبان اصلی'
        : version.replace(/\s*بدون حذفیات\s*/g, ' ').trim() || 'نسخه'

  const shortQuality = (variant.quality || '')
    .replace(/^web[- ]?dl\s*/i, '')
    .replace(/^web[- ]?rip\s*/i, '')
    .replace(/^blu[- ]?ray\s*/i, '')
    .trim()
  const codec = isHevcQuality(`${variant.quality} ${variant.version}`) && !/x265/i.test(shortQuality) ? ' · x265' : ''
  return [tag, shortQuality].filter(Boolean).join(' · ') + codec
}

/** امتیاز یک نسخه برای انتخاب پیش‌فرض (بالاتر = بهتر) */
export function variantRank(variant: SeriesVariant): number {
  const meta = `${variant.quality} ${variant.version}`
  const browser = variant.episodes.some((e) => isBrowserPlayable({ url: e.url, quality: variant.quality, group: variant.version }))
  return (
    groupScore(meta) * 100 +
    qualityScore(RES_RE.test(variant.quality) ? variant.quality : meta) * 10 +
    (browser ? 1 : 0)
  )
}

/** بهترین نسخهٔ یک فصل */
export function bestVariant(season?: SeriesSeason | null): SeriesVariant | null {
  if (!season || !season.variants.length) return null
  return [...season.variants].sort((a, b) => variantRank(b) - variantRank(a))[0]
}

/**
 * ساختار فصل/نسخه/قسمت را از لیست لینک‌ها می‌سازد.
 * اگر لینک‌ها «قسمت‌دار» نباشند (فیلم)، خروجی خالی است.
 */
export function buildSeries(downloads?: PlayCandidate[]): SeriesContent {
  const seasonMap = new Map<string, SeriesSeason>()

  for (const item of downloads || []) {
    const episode = episodeNumberFromLabel(item.quality) ?? episodeNumberFromUrl(item.url)
    if (episode === null) continue

    const parsed = parseGroup(item.group)
    const seasonKey = parsed.seasonLabel || 'همهٔ قسمت‌ها'
    let season = seasonMap.get(seasonKey)
    if (!season) {
      season = {
        key: seasonKey,
        label: parsed.seasonLabel || 'همهٔ قسمت‌ها',
        number: parsed.seasonNumber,
        variants: [],
        episodeCount: 0
      }
      seasonMap.set(seasonKey, season)
    }

    const variantKey = `${parsed.version}|${parsed.quality}`
    let variant = season.variants.find((v) => v.key === variantKey)
    if (!variant) {
      variant = { key: variantKey, version: parsed.version, quality: parsed.quality, episodes: [] }
      season.variants.push(variant)
    }

    if (!variant.episodes.some((e) => e.episode === episode)) {
      variant.episodes.push({
        episode,
        label: item.quality && episodeNumberFromLabel(item.quality) !== null ? item.quality : `قسمت ${episode}`,
        url: item.url
      })
    }

    if (episode > season.episodeCount) season.episodeCount = episode
  }

  if (!seasonMap.size) return { seasons: [], totalEpisodes: 0 }

  const seasons = [...seasonMap.values()].map((season) => {
    const variants = season.variants
      .map((variant) => ({
        ...variant,
        episodes: [...variant.episodes].sort((a, b) => a.episode - b.episode)
      }))
      .sort((a, b) => variantRank(b) - variantRank(a))

    return {
      ...season,
      variants,
      episodeCount: Math.max(season.episodeCount, ...variants.map((v) => v.episodes.length))
    }
  })

  // فصل‌های شماره‌دار به ترتیب شماره، فصل‌های بی‌شماره در انتها
  seasons.sort((a, b) => {
    if (a.number && b.number) return a.number - b.number
    if (a.number) return -1
    if (b.number) return 1
    return 0
  })

  return { seasons, totalEpisodes: seasons.reduce((sum, s) => sum + s.episodeCount, 0) }
}
