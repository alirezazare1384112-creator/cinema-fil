import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import dns from 'node:dns/promises'
import net from 'node:net'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.mpg': 'video/mpeg',
  '.mpeg': 'video/mpeg',
  '.ts': 'video/mp2t',
  '.m2ts': 'video/mp2t',
  '.3gp': 'video/3gpp'
}

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number)
    if (p[0] === 10 || p[0] === 127 || p[0] === 0) return true
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true
    if (p[0] === 192 && p[1] === 168) return true
    if (p[0] === 169 && p[1] === 254) return true
    return false
  }
  const v = ip.toLowerCase().replace(/^\[|\]$/g, '')
  if (v === '::1' || v === '::') return true
  if (v.startsWith('fe80') || v.startsWith('fc') || v.startsWith('fd')) return true
  if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7))
  return false
}

/** فقط http(s) و آدرس‌های عمومی؛ آدرس‌های داخلی/localhost مسدود می‌شوند (محافظت SSRF). */
async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    throw new Error('آدرس نامعتبر است')
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('پروتکل پشتیبانی نمی‌شود')
  }
  if (net.isIP(u.hostname)) {
    if (isPrivateIp(u.hostname)) throw new Error('آدرس داخلی مجاز نیست')
  } else {
    const addrs = await dns.lookup(u.hostname, { all: true })
    if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) {
      throw new Error('آدرس داخلی مجاز نیست')
    }
  }
  return u
}

/** پخش فایل ویدیویی مستقیم از سایت مبدأ — با حفظ Range تا جست‌وجوی داخل ویدیو کار کند. */
async function streamRemote(request: NextRequest, raw: string): Promise<Response> {
  const u = await assertPublicHttpUrl(raw)

  const headers: Record<string, string> = {
    'User-Agent': BROWSER_UA,
    Referer: 'https://www.f2medx.top/'
  }
  const range = request.headers.get('range')
  if (range) headers.Range = range

  const upstream = await fetch(u.toString(), { headers, redirect: 'follow' })
  if (upstream.status !== 200 && upstream.status !== 206) {
    return new NextResponse('مبدأ ویدیو در دسترس نیست', { status: 502 })
  }

  const ext = path.extname(u.pathname).toLowerCase()
  const out = new Headers()
  out.set('Content-Type', MIME[ext] || upstream.headers.get('content-type') || 'application/octet-stream')
  out.set('Accept-Ranges', 'bytes')
  out.set('Cache-Control', 'public, max-age=3600')
  const cr = upstream.headers.get('content-range')
  if (cr) out.set('Content-Range', cr)
  const cl = upstream.headers.get('content-length')
  if (cl) out.set('Content-Length', cl)

  return new Response(upstream.body as unknown as BodyInit, { status: upstream.status, headers: out })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const file = searchParams.get('file')
    const remoteUrl = searchParams.get('url')

    if (remoteUrl) {
      return await streamRemote(request, remoteUrl)
    }

    if (!file || !path.isAbsolute(file)) {
      return new NextResponse('Invalid path', { status: 400 })
    }

    let stat: fs.Stats
    try {
      stat = fs.statSync(file)
    } catch {
      return new NextResponse('File not found', { status: 404 })
    }

    if (!stat.isFile()) {
      return new NextResponse('Not a file', { status: 400 })
    }

    const ext = path.extname(file).toLowerCase()
    const contentType = MIME[ext]
    if (!contentType) {
      return new NextResponse('Unsupported file type', { status: 400 })
    }

    const total = stat.size
    const range = request.headers.get('range')
    const download = searchParams.get('download') === '1'

    if (download) {
      const headers = new Headers()
      headers.set('Content-Type', contentType)
      headers.set('Content-Length', String(total))
      headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(path.basename(file))}"`)
      headers.set('Cache-Control', 'no-store')
      const stream = fs.createReadStream(file)
      return new Response(stream as unknown as BodyInit, { status: 200, headers })
    }

    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range)
      let start = match && match[1] ? parseInt(match[1], 10) : 0
      let end = match && match[2] ? parseInt(match[2], 10) : total - 1

      if (isNaN(start) || isNaN(end) || start > end || end >= total) {
        end = total - 1
        if (isNaN(start) || start > end) start = 0
      }

      const chunkSize = end - start + 1
      const stream = fs.createReadStream(file, { start, end })

      const headers = new Headers()
      headers.set('Content-Range', `bytes ${start}-${end}/${total}`)
      headers.set('Accept-Ranges', 'bytes')
      headers.set('Content-Length', String(chunkSize))
      headers.set('Content-Type', contentType)
      headers.set('Cache-Control', 'no-store')

      return new Response(stream as unknown as BodyInit, { status: 206, headers })
    }

    const stream = fs.createReadStream(file)
    const headers = new Headers()
    headers.set('Content-Length', String(total))
    headers.set('Content-Type', contentType)
    headers.set('Accept-Ranges', 'bytes')
    headers.set('Cache-Control', 'no-store')

    return new Response(stream as unknown as BodyInit, { status: 200, headers })
  } catch (error) {
    console.error('Play error:', error)
    return new NextResponse('Server error', { status: 500 })
  }
}
