import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import https from 'https'
import type { LookupFunction } from 'net'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 25 * 1024 * 1024

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

/** DNS-over-HTTPS از طریق IP رمز-شکننده نیست و آدرس واقعی برمی‌گرداند (شبکه‌هایی که DNS دامنه‌ها را مسموم می‌کنند). */
async function dohResolveA(hostname: string): Promise<string | null> {
  try {
    const res = await fetch(`https://1.1.1.1/dns-query?name=${encodeURIComponent(hostname)}&type=A`, {
      headers: { accept: 'application/dns-json' },
      signal: AbortSignal.timeout(5000)
    })
    if (!res.ok) return null
    const data = await res.json()
    const ips = ((data?.Answer ?? []) as Array<{ type?: number; data?: string }>)
      .filter((a) => a.type === 1 && a.data)
      .map((a) => a.data as string)
    return ips[0] ?? null
  } catch {
    return null
  }
}

/** دریافت با https.get و IP اختیاری (برای دور زدن DNS مسموم)؛ ریدایرکت‌ها هم دوباره DoH می‌شوند. */
function httpsGetBuffer(url: string, ip: string, headers: Record<string, string>, redirects = 3): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = { headers, timeout: 15000 }
    // در Node با autoSelectFamily، lookup با all=true و آرایه صدا می‌شود — هر دو حالت را پاسخ می‌دهیم
    options.lookup = ((_h: string, opts: unknown, cb: (err: NodeJS.ErrnoException | null, address: unknown, family?: number) => void) => {
      if ((opts as { all?: boolean })?.all) cb(null, [{ address: ip, family: 4 }])
      else cb(null, ip, 4)
    }) as unknown as LookupFunction
    const req = https.get(url, options, (res) => {
      const status = res.statusCode ?? 0
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume()
        if (redirects <= 0) return reject(new Error('too many redirects'))
        const next = new URL(res.headers.location, url)
        dohResolveA(next.hostname)
          .then((nextIp) => (nextIp ? httpsGetBuffer(next.toString(), nextIp, headers, redirects - 1) : Promise.reject(new Error('DoH failed'))))
          .then(resolve, reject)
        return
      }
      if (status !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${status}`))
      }
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('timeout')))
  })
}

/** پروکسی تصویر: سرور واسط خودش از مبدأ می‌گیرد؛ حتی وقتی DNS دامنه مسموم یا TLS مسدود باشد کار می‌کند. */
function weservProxyUrl(raw: string): string {
  const u = new URL(raw)
  return `https://images.weserv.nl/?url=${encodeURIComponent(u.hostname + u.pathname + u.search)}&q=95`
}

/** دریافت یک منبع با abort؛ خطا یا بافر برمی‌گرداند. */
async function fetchBuffer(url: string, timeoutMs: number): Promise<Buffer> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
    headers: { 'User-Agent': BROWSER_UA }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

/** مسابقهٔ هم‌زمانِ fetch مستقیم و پروکسی تصویر — هر کدام زودتر جواب داد برد؛ فقط DoH واقعی fallback است. */
async function downloadImageBuffer(raw: string): Promise<Buffer> {
  const racers = Promise.any([
    fetchBuffer(raw, 6000),
    fetchBuffer(weservProxyUrl(raw), 15000)
  ])
  try {
    return await racers
  } catch {
    const ip = await dohResolveA(new URL(raw).hostname)
    if (!ip) throw new Error('دریافت تصویر ناموفق بود')
    return httpsGetBuffer(raw, ip, { 'User-Agent': BROWSER_UA })
  }
}

function sniffImage(buf: Buffer): string | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg'
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return '.png'
  if (buf.length > 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return '.gif'
  if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return '.webp'
  return null
}

/** کش «آدرس راه‌دور → فایل محلی» — ذخیرهٔ تکراری همان لینک آنی است و فایل تکراری ساخته نمی‌شود. */
const savedUrlCache = new Map<string, string>()
const SAVED_CACHE_LIMIT = 500

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('url') || ''
  if (!/^https?:\/\//i.test(raw)) {
    return NextResponse.json({ error: 'آدرس تصویر نامعتبر است' }, { status: 400 })
  }

  const cached = savedUrlCache.get(raw)
  if (cached) {
    return NextResponse.json({ url: cached })
  }

  try {
    const buf = await downloadImageBuffer(raw)

    if (buf.length === 0) {
      return NextResponse.json({ error: 'تصویر خالی است' }, { status: 400 })
    }
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: 'حجم تصویر بیش از حد مجاز است' }, { status: 400 })
    }

    const ext = sniffImage(buf)
    if (!ext) {
      return NextResponse.json({ error: 'فرمت فایل تصویر نیست' }, { status: 400 })
    }

    const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`
    const dir = path.join(process.cwd(), 'uploads')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, name), buf)

    if (savedUrlCache.size >= SAVED_CACHE_LIMIT) savedUrlCache.clear()
    savedUrlCache.set(raw, `/api/uploads/${name}`)

    return NextResponse.json({ url: `/api/uploads/${name}` })
  } catch (error) {
    console.error('save-image error:', error)
    return NextResponse.json({ error: 'دریافت تصویر ناموفق بود (اینترنت/مبدأ در دسترس نیست)' }, { status: 502 })
  }
}