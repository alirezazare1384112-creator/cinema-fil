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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const id = body.id as string | undefined
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const data: { name?: string; thumbnailUrl?: string | null } = {}

    if (typeof body.name === 'string' && body.name.trim()) {
      data.name = body.name.trim()
    }

    // thumbnailUrl: رشته → پوستر جدید | null/خالی → حذف پوستر
    if (body.thumbnailUrl === null || body.thumbnailUrl === '') {
      data.thumbnailUrl = null
    } else if (typeof body.thumbnailUrl === 'string') {
      data.thumbnailUrl = body.thumbnailUrl.trim()
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'چیزی برای به‌روزرسانی ارسال نشده' }, { status: 400 })
    }

    const folder = await prisma.editFolder.update({ where: { id }, data })
    return NextResponse.json(folder)
  } catch (error) {
    console.error('Error updating folder:', error)
    return NextResponse.json({ error: 'پوشه پیدا نشد' }, { status: 404 })
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