import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { Transform } from 'stream'
import { pipeline } from 'stream/promises'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const IMAGE_TYPES = ['image/jpeg', 'image/jfif', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/avif', 'image/x-icon', 'image/tiff']
const IMAGE_EXT = ['.jpg', '.jpeg', '.jfif', '.png', '.webp', '.gif', '.bmp', '.avif', '.ico', '.tif', '.tiff']
const SUB_EXT = ['.srt', '.vtt', '.sub', '.ass', '.ssa', '.txt']
const VIDEO_EXT = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg', '.ts', '.m2ts']
const VIDEO_MIME = ['video/mp4', 'video/x-matroska', 'video/x-msvideo', 'video/quicktime', 'video/x-ms-wmv', 'video/x-flv', 'video/webm', 'video/x-m4v', 'video/mpeg', 'video/mp2t']
const MAX_IMAGE = 20 * 1024 * 1024
const MAX_VIDEO = Infinity

const SIZE_EXCEEDED = 'SIZE_EXCEEDED'

function validateUpload(name: string, mime: string) {
  const ext = name.includes('.') ? path.extname(name).toLowerCase() : ''
  // هم بر اساس MIME و هم پسوند فایل؛ چون بعضی سیستم‌ها MIME عجیب می‌فرستند
  const isImage =
    IMAGE_TYPES.includes(mime) ||
    IMAGE_EXT.includes(ext) ||
    (mime.startsWith('image/') && mime !== 'image/svg+xml')
  const isSub =
    SUB_EXT.includes(ext) ||
    mime === 'application/x-subrip' ||
    mime === 'text/vtt'
  const isVideo =
    VIDEO_EXT.includes(ext) ||
    VIDEO_MIME.includes(mime) ||
    mime.startsWith('video/')

  if (!isImage && !isSub && !isVideo) {
    return { ok: false as const, error: 'فقط تصاویر، زیرنویس و ویدیو مجاز هستند' }
  }

  const maxSize = isVideo ? MAX_VIDEO : MAX_IMAGE
  return { ok: true as const, isImage, isSub, isVideo, maxSize }
}

function safeFileExt(name: string, mime: string, v: { isImage: boolean; isVideo: boolean }): string {
  const ext = name.includes('.') ? path.extname(name).toLowerCase() : ''
  if (ext && /^[./A-Za-z0-9-]{1,10}$/.test(ext)) return ext
  return v.isImage ? '.jpg' : v.isVideo ? '.mp4' : '.srt'
}

export async function POST(req: NextRequest) {
  try {
    const mime = req.headers.get('content-type') || 'application/octet-stream'
    const isMultipart = mime.startsWith('multipart/form-data')

    let name = req.nextUrl.searchParams.get('name') || ''
    let bodyBuf: Buffer | null = null
    let maxSize = MAX_VIDEO

    // Legacy fallback: multipart uploads (buffered, small files only)
    if (isMultipart) {
      const form = await req.formData()
      const file = form.get('file')
      if (!file || typeof file === 'string') {
        return NextResponse.json({ error: 'فایلی انتخاب نشده است' }, { status: 400 })
      }
      name = name || file.name || 'file'
      const ftype = file.type || 'application/octet-stream'
      const mv = validateUpload(name, ftype)
      if (!mv.ok) return NextResponse.json({ error: mv.error }, { status: 400 })
      maxSize = mv.maxSize
      if (file.size > mv.maxSize) {
        const mb = mv.maxSize / 1024 / 1024
        return NextResponse.json({ error: `حجم فایل بیش از ${mb} مگابایت است` }, { status: 400 })
      }
      bodyBuf = Buffer.from(await file.arrayBuffer())
    } else {
      const sv = validateUpload(name, mime)
      if (!sv.ok) return NextResponse.json({ error: sv.error }, { status: 400 })
      maxSize = sv.maxSize
    }

    if (!name) {
      return NextResponse.json({ error: 'نام فایل ارسال نشده است' }, { status: 400 })
    }

    const contentLength = Number(req.headers.get('content-length') || 0)
    if (!isMultipart && contentLength > maxSize) {
      const mb = maxSize / 1024 / 1024
      return NextResponse.json({ error: `حجم فایل بیش از ${mb} مگابایت است` }, { status: 400 })
    }

    const ext = safeFileExt(name, mime, {
      isImage: IMAGE_TYPES.includes(mime),
      isVideo: maxSize === MAX_VIDEO
    })
    const savedName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`
    const dir = path.join(process.cwd(), 'uploads')
    fs.mkdirSync(dir, { recursive: true })
    const dest = path.join(dir, savedName)

    if (bodyBuf) {
      if (bodyBuf.length > maxSize) {
        const mb = maxSize / 1024 / 1024
        return NextResponse.json({ error: `حجم فایل بیش از ${mb} مگابایت است` }, { status: 400 })
      }
      fs.writeFileSync(dest, bodyBuf)
      return NextResponse.json({ url: `/api/uploads/${savedName}` })
    }

    // Streaming upload: write the request body straight to disk (constant memory)
    if (!req.body) {
      return NextResponse.json({ error: 'بدنه درخواست خالی است' }, { status: 400 })
    }

    let written = 0
    const limiter = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        written += chunk.length
        if (written > maxSize) cb(new Error(SIZE_EXCEEDED))
        else cb(null, chunk)
      }
    })

    try {
      await pipeline(Readable.fromWeb(req.body as never), limiter, fs.createWriteStream(dest))
    } catch (err) {
      try { fs.unlinkSync(dest) } catch { }
      if (err instanceof Error && err.message === SIZE_EXCEEDED) {
        const mb = maxSize / 1024 / 1024
        return NextResponse.json({ error: `حجم فایل بیش از ${mb} مگابایت است` }, { status: 400 })
      }
      return NextResponse.json({ error: 'آپلود ناتمام شد؛ لطفاً دوباره تلاش کنید' }, { status: 500 })
    }

    return NextResponse.json({ url: `/api/uploads/${savedName}` })
  } catch {
    return NextResponse.json({ error: 'آپلود انجام نشد' }, { status: 500 })
  }
}