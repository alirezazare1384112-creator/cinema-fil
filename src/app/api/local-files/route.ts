import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function serializeFile(file: Record<string, unknown>) {
  return {
    ...file,
    fileSize: file.fileSize ? String(file.fileSize) : null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const mediaId = searchParams.get('mediaId')
    const driveLabel = searchParams.get('driveLabel')

    if (id) {
      const file = await prisma.localFile.findUnique({
        where: { id },
        include: { media: { select: { title: true, posterPath: true } } }
      })
      if (!file) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
      return NextResponse.json(serializeFile(file as unknown as Record<string, unknown>))
    }

    const where: Record<string, unknown> = {}
    if (mediaId) where.mediaId = mediaId
    if (driveLabel) where.driveLabel = driveLabel

    const files = await prisma.localFile.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { media: { select: { title: true, posterPath: true } } }
    })

    return NextResponse.json(files.map((f) => serializeFile(f as unknown as Record<string, unknown>)))
  } catch (error) {
    console.error('Error fetching local files:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      body = {}
      for (const [key, value] of formData.entries()) {
        body[key] = value
      }
    } else {
      body = await request.json()
    }

    const file = await prisma.localFile.create({
      data: {
        mediaId: (body.mediaId as string) || null,
        filePath: body.videoPath as string || body.filePath as string,
        fileName: body.title as string || body.fileName as string,
        fileSize: body.fileSize ? BigInt(body.fileSize as string) : null,
        resolution: (body.resolution as string) || null,
        format: (body.format as string) || null,
        codec: (body.codec as string) || null,
        driveLabel: (body.driveLabel as string) || null,
        folderPath: (body.folderPath as string) || null,
        poster: (body.poster as string) || null,
        subtitle: (body.subtitle as string) || null,
        category: (body.category as string) || null
      }
    })

    return NextResponse.json(serializeFile(file as unknown as Record<string, unknown>), { status: 201 })
  } catch (error) {
    console.error('Error creating local file:', error)
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

    if (updateData.fileSize) {
      updateData.fileSize = BigInt(updateData.fileSize)
    }

    const file = await prisma.localFile.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(serializeFile(file as unknown as Record<string, unknown>))
  } catch (error) {
    console.error('Error updating local file:', error)
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

    await prisma.localFile.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting local file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
