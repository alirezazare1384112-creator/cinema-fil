import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    const file = searchParams.get('file')

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
