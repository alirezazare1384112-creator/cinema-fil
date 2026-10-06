import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const folders = await prisma.editFolder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { edits: true } },
        edits: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    })

    return NextResponse.json(
      folders.map((f) => ({
        id: f.id,
        name: f.name,
        thumbnailUrl: f.thumbnailUrl || f.edits[0]?.thumbnailUrl || null,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        editCount: f._count.edits
      }))
    )
  } catch (error) {
    console.error('Error fetching folders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'نام پوشه الزامی است' }, { status: 400 })
    }

    const trimmed = name.trim()
    const existing = await prisma.editFolder.findUnique({ where: { name: trimmed } })
    if (existing) {
      return NextResponse.json(existing)
    }

    const folder = await prisma.editFolder.create({ data: { name: trimmed } })
    return NextResponse.json(folder, { status: 201 })
  } catch (error) {
    console.error('Error creating folder:', error)
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

    // Delete edits in the folder first, then the folder
    await prisma.mediaEdit.deleteMany({ where: { folderId: id } })
    await prisma.editFolder.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting folder:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}