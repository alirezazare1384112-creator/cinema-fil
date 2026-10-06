import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SIZES = ['w92', 'w154', 'w185', 'w200', 'w300', 'w342', 'w500', 'w780', 'w1280', 'original']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')
    const size = searchParams.get('size') || 'w500'

    if (!path || !path.startsWith('/')) {
      return new NextResponse('Invalid path', { status: 400 })
    }
    if (!SIZES.includes(size)) {
      return new NextResponse('Invalid size', { status: 400 })
    }

    const url = `https://image.tmdb.org/t/p/${size}${path}`
    const upstream = await fetch(url, { cache: 'no-store' })
    if (!upstream.ok) {
      return new NextResponse('Image not found', {
        status: upstream.status,
        headers: { 'Cache-Control': 'public, max-age=3600' },
      })
    }

    const buf = Buffer.from(await upstream.arrayBuffer())
    const contentType = upstream.headers.get('content-type') || 'image/jpeg'

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch (error) {
    console.error('Image proxy error:', error)
    return new NextResponse('Server error', { status: 500 })
  }
}
