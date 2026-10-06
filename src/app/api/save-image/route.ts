import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 25 * 1024 * 1024

function sniffImage(buf: Buffer): string | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg'
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return '.png'
  if (buf.length > 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return '.gif'
  if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return '.webp'
  return null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('url') || ''
  if (!/^https?:\/\//i.test(raw)) {
    return NextResponse.json({ error: 'آدرس تصویر نامعتبر است' }, { status: 400 })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(raw, { signal: controller.signal, redirect: 'follow' })
    if (!res.ok) {
      return NextResponse.json({ error: 'تصویر از مبدأ دریافت نشد' }, { status: 502 })
    }
    const buf = Buffer.from(await res.arrayBuffer())
    clearTimeout(timer)

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

    return NextResponse.json({ url: `/api/uploads/${name}` })
  } catch (error) {
    clearTimeout(timer)
    console.error('save-image error:', error)
    return NextResponse.json({ error: 'دریافت تصویر ناموفق بود (اینترنت/مبدأ در دسترس نیست)' }, { status: 502 })
  }
}