import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const mediaId = searchParams.get('mediaId')

    if (id) {
      const quote = await prisma.quote.findUnique({
        where: { id },
        include: { media: { select: { title: true, posterPath: true } } }
      })
      if (!quote) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
      }
      return NextResponse.json(quote)
    }

    const where: Record<string, unknown> = {}
    if (mediaId) where.mediaId = mediaId

    const quotes = await prisma.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { media: { select: { title: true, posterPath: true } } }
    })

    return NextResponse.json(quotes)
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    let mediaId = body.mediaId || null
    let movieTitle = body.movieTitle || null

    if (!mediaId && movieTitle) {
      const needle = String(movieTitle).trim().toLowerCase()
      const candidates = await prisma.media.findMany({
        where: { title: { contains: needle } },
        select: { id: true, title: true }
      })
      const matched = candidates.find((m) => m.title.trim().toLowerCase() === needle)
      if (matched) {
        mediaId = matched.id
        movieTitle = null
      }
    }

    if (!mediaId && !movieTitle) {
      return NextResponse.json({ error: 'نام رسانه یا فیلم الزامی است' }, { status: 400 })
    }

    const quote = await prisma.quote.create({
      data: {
        mediaId,
        movieTitle,
        quoteText: body.quoteText,
        character: body.character || null,
        scene: body.scene || null,
        backdropUrl: body.backdropUrl || null,
        gifUrl: body.gifUrl || null
      },
      include: { media: { select: { title: true, posterPath: true } } }
    })

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    console.error('Error creating quote:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const quote = await prisma.quote.update({
      where: { id },
      data: updateData,
      include: { media: { select: { title: true, posterPath: true } } }
    })

    return NextResponse.json(quote)
  } catch (error) {
    console.error('Error updating quote:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await prisma.quote.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting quote:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
