import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import zlib from 'node:zlib'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function srtToVtt(srt: string): string {
  const text = srt.replace(/﻿/g, '').replace(/\r/g, '')
  const blocks = text.split(/\n\s*\n/).filter((b) => b.trim())
  let out = 'WEBVTT\n\n'
  for (const block of blocks) {
    const lines = block.split('\n')
    let i = 0
    if (lines.length && /^\d+$/.test(lines[0].trim())) i = 1
    const body = lines
      .slice(i)
      .join('\n')
      .replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, '$1:$2:$3.$4')
    if (body.trim()) out += body.trim() + '\n\n'
  }
  return out
}

/* ---------------- زیرنویس از Subzone (zip حاوی srt) ---------------- */

const SUBZONE_HOSTS = new Set(['subzone.ir', 'www.subzone.ir', 'subf2m.co', 'www.subf2m.co'])
const SUBZONE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const MAX_ZIP_BYTES = 10 * 1024 * 1024
const VTT_TTL = 24 * 60 * 60 * 1000

const vttCache = new Map<string, { exp: number; vtt: string }>()

/** اولین فایل srt داخل zip را از central directory استخراج می‌کند (بدون کتابخانهٔ جانبی). */
function unzipFirstSrt(buf: Buffer): string | null {
  let eocd = -1
  for (let i = buf.length - 22; i >= 0 && i >= buf.length - 22 - 65535; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) return null

  const count = buf.readUInt16LE(eocd + 10)
  let off = buf.readUInt32LE(eocd + 16)
  let best: { method: number; csize: number; lho: number } | null = null

  for (let n = 0; n < count && off + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break
    const method = buf.readUInt16LE(off + 10)
    const csize = buf.readUInt32LE(off + 20)
    const nameLen = buf.readUInt16LE(off + 28)
    const extraLen = buf.readUInt16LE(off + 30)
    const commentLen = buf.readUInt16LE(off + 32)
    const lho = buf.readUInt32LE(off + 42)
    const name = buf.slice(off + 46, off + 46 + nameLen).toString('utf8')
    if (/\.srt$/i.test(name) && !best) best = { method, csize, lho }
    off += 46 + nameLen + extraLen + commentLen
  }
  if (!best) return null

  const lNameLen = buf.readUInt16LE(best.lho + 26)
  const lExtraLen = buf.readUInt16LE(best.lho + 28)
  const dataStart = best.lho + 30 + lNameLen + lExtraLen
  const data = buf.slice(dataStart, dataStart + best.csize)
  const out = best.method === 0 ? data : zlib.inflateRawSync(data)

  const utf8 = out.toString('utf8')
  if (!utf8.includes('�')) return utf8
  try {
    return new TextDecoder('windows-1256').decode(out)
  } catch {
    return utf8
  }
}

function vttResponse(vtt: string): Response {
  return new NextResponse(vtt, {
    status: 200,
    headers: { 'Content-Type': 'text/vtt; charset=utf-8', 'Cache-Control': 'public, max-age=86400' }
  })
}

/** زیرنویس فارسیِ همان فیلم: صفحهٔ لیست Subzone → آیتم فارسی → zip → srt → VTT */
async function subzoneVtt(pageUrl: string): Promise<Response> {
  let u: URL
  try {
    u = new URL(pageUrl)
  } catch {
    return new NextResponse('Invalid URL', { status: 400 })
  }
  if (!SUBZONE_HOSTS.has(u.hostname) || !/^\/subtitles\/[^/]+\/?$/.test(u.pathname)) {
    return new NextResponse('Only Subzone subtitle pages are allowed', { status: 400 })
  }

  const cached = vttCache.get(pageUrl)
  if (cached && cached.exp > Date.now()) return vttResponse(cached.vtt)

  const pageRes = await fetch(u.toString(), { headers: { 'User-Agent': SUBZONE_UA }, signal: AbortSignal.timeout(15000) })
  if (!pageRes.ok) return new NextResponse('Subtitle page not found', { status: 404 })
  const html = await pageRes.text()

  const itemRe = /<span class='language [^']*'>([^<]+)<\/span>[\s\S]{0,800}?<a class='download icon-download' href='([^']+)'/g
  let target: string | null = null
  let m: RegExpExecArray | null
  while ((m = itemRe.exec(html))) {
    const langText = m[1].trim().toLowerCase()
    const href = m[2]
    if (/farsi|persian/.test(langText) || /\/(farsi|persian)\//.test(href)) {
      target = href
      break
    }
  }
  if (!target) return new NextResponse('Persian subtitle not found', { status: 404 })

  const dlUrl = new URL(`${target.replace(/\/+$/, '')}/download`, u.origin).toString()
  const zipRes = await fetch(dlUrl, { headers: { 'User-Agent': SUBZONE_UA }, signal: AbortSignal.timeout(20000) })
  if (!zipRes.ok) return new NextResponse('Subtitle download failed', { status: 502 })
  const zipBuf = Buffer.from(await zipRes.arrayBuffer())
  if (zipBuf.length > MAX_ZIP_BYTES) return new NextResponse('Subtitle too large', { status: 502 })

  const srt = unzipFirstSrt(zipBuf)
  if (!srt) return new NextResponse('Subtitle extraction failed', { status: 502 })

  const vtt = srtToVtt(srt)
  vttCache.set(pageUrl, { exp: Date.now() + VTT_TTL, vtt })
  if (vttCache.size > 40) vttCache.delete(vttCache.keys().next().value as string)
  return vttResponse(vtt)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    const file = searchParams.get('file')
    const subzone = searchParams.get('subzone')

    if (subzone) {
      return await subzoneVtt(subzone)
    }

    let filePath: string | null = null
    if (url) {
      try {
        const p = new URL(url, 'http://localhost').pathname
        const name = path.basename(p)
        filePath = path.join(process.cwd(), 'uploads', name)
      } catch { }
    } else if (file && path.isAbsolute(file)) {
      filePath = file
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return new NextResponse('Subtitle not found', { status: 404 })
    }

    const ext = path.extname(filePath).toLowerCase()
    const raw = fs.readFileSync(filePath, 'utf-8')

    let body: string
    const contentType = 'text/vtt; charset=utf-8'
    if (ext === '.vtt') {
      body = raw
    } else {
      body = srtToVtt(raw)
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Subtitle error:', error)
    return new NextResponse('Server error', { status: 500 })
  }
}
