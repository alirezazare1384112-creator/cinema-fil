import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * پروکسی + کش دیسکیِ پوسترها/تصاویر سایت فیلم.
 *
 * چرا لازم است: مرورگر گاهی نمی‌تواند مستقیم تصاویر `f2medx.top` را بگیرد
 * (پاسخ می‌آید اما بدنه هیچ‌وقت نمی‌رسد و تگ‌های `<img>` بی‌انتها منتظر
 * می‌مانند)؛ در حالی که درخواست از سمت سرور (Node) سالم و سریع است. با
 * این روت، مرورگر از localhost تصویر را می‌گیرد و سرور کار دانلود را
 * می‌کند؛ اولین بار دانلود و در دیسک ذخیره می‌شود و همهٔ بارهای بعدی
 * چند میلی‌ثانیه‌ای و بدون اینترنت.
 */
const CACHE_DIR = path.join(process.cwd(), '.f2m-image-cache')
const FETCH_TIMEOUT_MS = 10_000
const MAX_CACHE_FILES = 4000

/** فقط این میزبان‌ها از سمت سرور دانلود می‌شوند (جلوی سوءاستفاده از پروکسی) */
const ALLOWED_HOSTS = new Set(['f2medx.top', 'www.f2medx.top'])

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let networkDownUntil = 0
const OUTAGE_COOLDOWN_MS = 30_000
const isNetworkDown = () => Date.now() < networkDownUntil
const markNetworkDown = () => {
  networkDownUntil = Date.now() + OUTAGE_COOLDOWN_MS
}

/** جلوگیری از دانلود هم‌زمانِ یک تصویرِ تکراری (چند تگ یکی) */
const inflight = new Map<string, Promise<{ buf: Buffer; type: string } | null>>()

function cacheFileFor(url: string): string {
  const hash = crypto.createHash('sha1').update(url).digest('hex')
  const ext = (path.extname(new URL(url).pathname) || '.jpg').toLowerCase()
  const safeExt = /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : '.jpg'
  return path.join(CACHE_DIR, `${hash}${safeExt}`)
}

function ensureCacheDir(): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })
  } catch {
    /* ignore */
  }
}

function pruneCacheIfNeeded(): void {
  try {
    const files = fs.readdirSync(CACHE_DIR)
    if (files.length <= MAX_CACHE_FILES) return
    const withTime = files
      .map((f) => {
        const p = path.join(CACHE_DIR, f)
        try {
          return { p, t: fs.statSync(p).mtimeMs }
        } catch {
          return null
        }
      })
      .filter((x): x is { p: string; t: number } => x !== null)
      .sort((a, b) => a.t - b.t)
    for (let i = 0; i < withTime.length - MAX_CACHE_FILES; i++) {
      try {
        fs.unlinkSync(withTime[i].p)
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

function typeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  return 'image/jpeg'
}

async function download(url: string): Promise<{ buf: Buffer; type: string } | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const upstream = await fetch(url, {
        cache: 'no-store',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          Referer: 'https://www.f2medx.top/'
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
      })
      if (!upstream.ok) return null
      const type = (upstream.headers.get('content-type') || '').toLowerCase()
      // فقط تصویر واقعی کش می‌شود (صفحهٔ خطا یا بلوکه را ذخیره نکن)
      if (type && !type.startsWith('image/')) return null
      const buf = Buffer.from(await upstream.arrayBuffer())
      if (!buf.length) continue // بدنه نرسید → یک بار دیگر
      return { buf, type: type || 'image/jpeg' }
    } catch {
      // تلاش بعدی
    }
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const target = searchParams.get('url')

    if (!target) return new NextResponse('Missing url', { status: 400 })

    let parsed: URL
    try {
      parsed = new URL(target)
    } catch {
      return new NextResponse('Invalid url', { status: 400 })
    }
    if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
      return new NextResponse('Host not allowed', { status: 403 })
    }

    ensureCacheDir()
    const cached = cacheFileFor(target)

    // ۱) کش دیسک → بدون هیچ ارتباط با اینترنت
    try {
      const stat = fs.statSync(cached)
      if (stat.isFile() && stat.size > 0) {
        return new NextResponse(new Uint8Array(fs.readFileSync(cached)), {
          status: 200,
          headers: {
            'Content-Type': typeFromPath(cached),
            'Content-Length': String(stat.size),
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Image-Cache': 'HIT'
          }
        })
      }
    } catch {
      /* cache miss */
    }

    // ۲) شبکه قطع است → بی‌معطلی جواب بده
    if (isNetworkDown()) {
      return new NextResponse('Network unavailable', {
        status: 504,
        headers: { 'Cache-Control': 'public, max-age=15' }
      })
    }

    // ۳) دانلود (درخواست‌های هم‌زمانِ یک آدرس به یک دانلود تبدیل می‌شوند)
    let task = inflight.get(target)
    if (!task) {
      task = download(target)
      inflight.set(target, task)
      task.finally(() => inflight.delete(target))
    }
    const result = await task

    if (!result) {
      markNetworkDown()
      return new NextResponse('Upstream timeout', {
        status: 504,
        headers: { 'Cache-Control': 'public, max-age=15' }
      })
    }

    try {
      fs.writeFileSync(cached, result.buf)
      pruneCacheIfNeeded()
    } catch {
      /* ذخیرهٔ کش شکست خورد؛ تصویر همین‌جا ارسال می‌شود */
    }

    return new NextResponse(new Uint8Array(result.buf), {
      status: 200,
      headers: {
        'Content-Type': result.type,
        'Content-Length': String(result.buf.length),
        'Cache-Control': 'public, max-age=604800',
        'X-Image-Cache': 'MISS'
      }
    })
  } catch (error) {
    console.error('f2m image proxy error:', error)
    return new NextResponse('Server error', { status: 500 })
  }
}
