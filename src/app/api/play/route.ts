import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const file = searchParams.get('file')

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
