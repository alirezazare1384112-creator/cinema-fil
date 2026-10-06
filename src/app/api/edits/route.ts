import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const mediaId = searchParams.get('mediaId')
    const tag = searchParams.get('tag')
    const folderId = searchParams.get('folderId')

    if (id) {
      const edit = await prisma.mediaEdit.findUnique({
        where: { id },
        include: { media: { select: { title: true } }, folder: { select: { name: true } } }
      })
      if (!edit) {
        return NextResponse.json({ error: 'Edit not found' }, { status: 404 })
      }
      return NextResponse.json(edit)
    }

    const where: Record<string, unknown> = {}
    if (mediaId) where.mediaId = mediaId
    if (folderId) where.folderId = folderId
    if (tag) {
      where.tags = { contains: tag }
    }

    const edits = await prisma.mediaEdit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { media: { select: { title: true } }, folder: { select: { name: true } } }
    })

    return NextResponse.json(edits)
  } catch (error) {
    console.error('Error fetching edits:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    let folderId = body.folderId || null
    const folderName = typeof body.folderName === 'string' ? body.folderName.trim() : ''

    if (!folderId && folderName) {
      const found = await prisma.editFolder.findUnique({ where: { name: folderName } })
      if (found) {
        folderId = found.id
      } else {
        const created = await prisma.editFolder.create({ data: { name: folderName } })
        folderId = created.id
      }
    }

    const edit = await prisma.mediaEdit.create({
      data: {
        mediaId: body.mediaId || null,
        folderId,
        title: body.title,
        description: body.description || null,
        videoUrl: body.videoUrl,
        thumbnailUrl: body.thumbnailUrl || null,
        tags: body.tags ? JSON.stringify(body.tags) : null,
        audioInfo: body.audioInfo || null,
        duration: body.duration || null
      },
      include: { media: true, folder: true }
    })

    return NextResponse.json(edit, { status: 201 })
  } catch (error) {
    console.error('Error creating edit:', error)
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

    if (updateData.tags) {
      updateData.tags = JSON.stringify(updateData.tags)
    }

    const edit = await prisma.mediaEdit.update({
      where: { id },
      data: updateData,
      include: { media: true, folder: true }
    })

    return NextResponse.json(edit)
  } catch (error) {
    console.error('Error updating edit:', error)
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

    await prisma.mediaEdit.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting edit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
