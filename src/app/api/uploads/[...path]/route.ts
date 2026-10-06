import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.m4v': 'video/x-m4v',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.ts': 'video/mp2t',
  '.m2ts': 'video/mp2t',
  '.mpg': 'video/mpeg',
  '.mpeg': 'video/mpeg'
}

function parseRange(range: string, size: number): { start: number; end: number } | null {
  const m = /bytes=(\d*)-(\d*)/.exec(range)
  if (!m) return null
  const startStr = m[1]
  const endStr = m[2]
  let start: number
  let end: number
  if (startStr === '') {
    const suffix = parseInt(endStr, 10)
    if (isNaN(suffix) || suffix <= 0) return null
    start = Math.max(size - suffix, 0)
    end = size - 1
  } else {
    start = parseInt(startStr, 10)
    end = endStr === '' ? size - 1 : parseInt(endStr, 10)
    if (isNaN(start) || isNaN(end) || start < 0 || end < start) return null
  }
  if (start >= size) return null
  end = Math.min(end, size - 1)
  return { start, end }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: segs } = await params
    const rel = segs.join('/')
    const base = path.join(process.cwd(), 'uploads')
    const filePath = path.join(base, rel)

    if (!filePath.startsWith(base) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return new NextResponse('Not found', { status: 404 })
    }

    const ext = path.extname(filePath).toLowerCase()
    const mime = MIME[ext] || 'application/octet-stream'
    const size = fs.statSync(filePath).size
    const rangeHeader = req.headers.get('range')

    const headers: Record<string, string> = {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }

    if (rangeHeader && /^video\//.test(mime)) {
      const range = parseRange(rangeHeader, size)
      if (range) {
        const chunkSize = range.end - range.start + 1
        const fd = fs.openSync(filePath, 'r')
        const buf = Buffer.alloc(chunkSize)
        fs.readSync(fd, buf, 0, chunkSize, range.start)
        fs.closeSync(fd)
        return new Response(buf, {
          status: 206,
          headers: {
            ...headers,
            'Content-Type': mime,
            'Content-Length': String(chunkSize),
            'Content-Range': `bytes ${range.start}-${range.end}/${size}`
          }
        })
      }
    }

    const data = fs.readFileSync(filePath)
    return new NextResponse(data, {
      headers: {
        ...headers,
        'Content-Type': mime,
        'Content-Length': String(size)
      }
    })
  } catch {
    return new NextResponse('Server error', { status: 500 })
  }
}