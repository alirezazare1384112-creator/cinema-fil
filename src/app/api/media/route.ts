import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const watchStatus = searchParams.get('watchStatus')
    const mediaType = searchParams.get('mediaType')
    const search = searchParams.get('search')

    if (id) {
      const media = await prisma.media.findUnique({
        where: { id }
      })
      if (!media) {
        return NextResponse.json({ error: 'Media not found' }, { status: 404 })
      }
      return NextResponse.json(media)
    }

    const where: Record<string, unknown> = {}
    if (watchStatus) where.watchStatus = watchStatus
    if (mediaType) where.mediaType = mediaType
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { overview: { contains: search } }
      ]
    }

    const media = await prisma.media.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { edits: true, quotes: true } } }
    })

    return NextResponse.json(media)
  } catch (error) {
    console.error('Error fetching media:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const existingMedia = await prisma.media.findUnique({
      where: { tmdbId: body.tmdbId }
    })

    if (existingMedia) {
      return NextResponse.json(existingMedia)
    }

    const media = await prisma.media.create({
      data: {
        tmdbId: body.tmdbId,
        title: body.title,
        overview: body.overview,
        posterPath: body.posterPath,
        backdropPath: body.backdropPath,
        mediaType: body.mediaType,
        releaseDate: body.releaseDate,
        rating: body.rating,
        userRating: body.userRating || null,
        watchStatus: body.watchStatus || 'plan_to_watch',
        personalReview: body.personalReview || null,
        notes: body.notes || null,
        watchDate: body.watchDate || null,
        genres: body.genres ? JSON.stringify(body.genres) : null
      }
    })

    return NextResponse.json(media, { status: 201 })
  } catch (error) {
    console.error('Error creating media:', error)
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

    if (updateData.genres) {
      updateData.genres = JSON.stringify(updateData.genres)
    }

    const media = await prisma.media.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(media)
  } catch (error) {
    console.error('Error updating media:', error)
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

    await prisma.media.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting media:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
