export interface PlayCandidate {
  group: string
  quality: string
  url: string
}

const VIDEO_EXT = /\.(mp4|mkv|webm|m4v|mov)(\?|#|$)/i
/** فرمت‌هایی که خودِ مرورگر بدون واسطه پخش می‌کند (MKV در Chromium پخش نمی‌شود) */
const BROWSER_EXT = /\.(mp4|webm|m4v|mov)(\?|#|$)/i

export function isBrowserVideo(url: string): boolean {
  return BROWSER_EXT.test(url)
}

/** نسخه‌های x265/HEVC/10bit در مرورگر تصویر ندارند (فقط صدا) → پلیر سیستم */
export function isHevcQuality(quality: string): boolean {
  return /x265|hevc|10bit/i.test(quality)
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
  if (/x265|hevc|10bit/i.test(quality)) score -= 0.5
  return score
}

/**
 * لینک‌های قابل‌پخش را برمی‌گرداند، مرتب‌شده بر اساس:
 * نسخهٔ «زیرنویس فارسی چسبیده» → «دوبله فارسی» → «زبان اصلی»،
 * در هر گروه کیفیت مناسب (۱۰۸۰ > ۷۲۰ > ۴۸۰) با ترجیح x264،
 * و در ترازِ مساوی اولویت با فرمتی که داخل مرورگر پخش می‌شود (mp4 غیر-HEVC).
 * خروجی‌ها همه با پلیر سیستم هم قابل‌پخش‌اند؛ تشخیص مسیر پخش با
 * isBrowserVideo / isHevcQuality انجام می‌شود.
 */
export function pickPlayable(
  downloads?: { group: string; quality: string; url: string }[]
): PlayCandidate[] {
  return (downloads || [])
    .map((d, i) => ({
      ...d,
      i,
      gs: groupScore(d.group),
      qs: qualityScore(d.quality),
      bs: isBrowserVideo(d.url) && !isHevcQuality(d.quality) ? 0.6 : 0
    }))
    .filter((d) => VIDEO_EXT.test(d.url) && d.qs >= 0)
    .sort((a, b) => b.gs - a.gs || b.qs - a.qs || b.bs - a.bs || a.i - b.i)
    .map(({ group, quality, url }) => ({ group, quality, url }))
}
