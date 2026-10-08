import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SIZES = ['w92', 'w154', 'w185', 'w200', 'w300', 'w342', 'w500', 'w780', 'w1280', 'original']

/**
 * کشِ دیسکی پوسترها.
 *
 * قبلاً هر بار بارگذاری صفحه، هر پوستر یک رفت‌وبرگشتِ ~۰.۵ ثانیه‌ای به
 * image.tmdb.org می‌زد و با `no-store` هیچ‌وقت کش نمی‌شد؛ با ۲۰ پوستر
 * صفحه چند ثانیه «سنگین» به‌نظر می‌رسید. حالا اولین بار از اینترنت
 * می‌آید و در دیسک ذخیره می‌شود؛ همهٔ بارهای بعدی چند میلی‌ثانیه‌ای.
 */
const CACHE_DIR = path.join(process.cwd(), '.tmdb-image-cache')
const FETCH_TIMEOUT_MS = 6000
const MAX_CACHE_FILES = 4000

/**
 * اگر اینترنت تا TMDB قطع شد، همهٔ درخواست‌ها چند ثانیه معطل نمانند:
 * یک بار خطا کافی است تا ۳۰ ثانیه درخواست‌های بعدی سریع جواب بگیرند.
 */
let networkDownUntil = 0
const OUTAGE_COOLDOWN_MS = 30_000
const isNetworkDown = () => Date.now() < networkDownUntil
const markNetworkDown = () => { networkDownUntil = Date.now() + OUTAGE_COOLDOWN_MS }

function cacheFileFor(size: string, imgPath: string): string {
  const hash = crypto.createHash('sha1').update(`${size}:${imgPath}`).digest('hex')
  const ext = (path.extname(imgPath) || '.jpg').toLowerCase()
  const safeExt = /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : '.jpg'
  return path.join(CACHE_DIR, `${hash}${safeExt}`)
}

function ensureCacheDir(): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })
  } catch { /* ignore */ }
}

/** ساده‌ترین پاک‌سازی: اگر فایل‌ها زیاد شدند، قدیمی‌ها حذف می‌شوند */
function pruneCacheIfNeeded(): void {
  try {
    const files = fs.readdirSync(CACHE_DIR)
    if (files.length <= MAX_CACHE_FILES) return
    const withTime = files
      .map((f) => {
        const p = path.join(CACHE_DIR, f)
        try { return { p, t: fs.statSync(p).mtimeMs } } catch { return null }
      })
      .filter((x): x is { p: string; t: number } => x !== null)
      .sort((a, b) => a.t - b.t)
    const excess = withTime.length - MAX_CACHE_FILES
    for (let i = 0; i < excess; i++) {
      try { fs.unlinkSync(withTime[i].p) } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}

function toResponse(buf: Buffer, contentType: string, maxAgeSeconds: number, hit: boolean): NextResponse {
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(buf.length),
      'Cache-Control': `public, max-age=${maxAgeSeconds}, immutable`,
      'X-Image-Cache': hit ? 'HIT' : 'MISS'
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imgPath = searchParams.get('path')
    const size = searchParams.get('size') || 'w500'

    if (!imgPath || !imgPath.startsWith('/')) {
      return new NextResponse('Invalid path', { status: 400 })
    }
    if (!SIZES.includes(size)) {
      return new NextResponse('Invalid size', { status: 400 })
    }

    ensureCacheDir()
    const cached = cacheFileFor(size, imgPath)

    // 1) کش دیسکی → بدون هیچ ارتباط با اینترنت
    try {
      const stat = fs.statSync(cached)
      if (stat.isFile() && stat.size > 0) {
        const buf = fs.readFileSync(cached)
        const ext = path.extname(cached).toLowerCase()
        const type = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
        return toResponse(buf, type, 60 * 60 * 24 * 30, true)
      }
    } catch { /* cache miss */ }

    // 2) اگر اینترنت همین حالا قطع است، بی‌معطلی جواب بده
    if (isNetworkDown()) {
      return new NextResponse('Network unavailable', {
        status: 504,
        headers: { 'Cache-Control': 'public, max-age=15' }
      })
    }

    // 3) از اینترنت بگیر (با مهلت مشخص تا صفحه معطل نماند)
    const url = `https://image.tmdb.org/t/p/${size}${imgPath}`
    let upstream: globalThis.Response
    try {
      upstream = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    } catch {
      markNetworkDown()
      return new NextResponse('Upstream timeout', {
        status: 504,
        headers: { 'Cache-Control': 'public, max-age=15' }
      })
    }

    if (!upstream.ok) {
      return new NextResponse('Image not found', {
        status: upstream.status,
        headers: { 'Cache-Control': 'public, max-age=300' }
      })
    }

    const buf = Buffer.from(await upstream.arrayBuffer())
    const contentType = upstream.headers.get('content-type') || 'image/jpeg'

    try {
      fs.writeFileSync(cached, buf)
      pruneCacheIfNeeded()
    } catch { /* ذخیرهٔ کش شکست خورد؛ تصویر همین‌جا ارسال می‌شود */ }

    return toResponse(buf, contentType, 60 * 60 * 24, false)
  } catch (error) {
    console.error('Image proxy error:', error)
    return new NextResponse('Server error', { status: 500 })
  }
}
