import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export function detectCategory(title: string): string {
  return /(s\d{1,2}e\d{1,2})|(\bseason\b)|(\bseries\b)|(قسمت)|(فصل)/i.test(title)
    ? 'series'
    : 'movie'
}

export function pathToTmdbId(p: string) {
  let h = 7
  for (let i = 0; i < p.length; i++) h = (h * 31 + p.charCodeAt(i)) | 0
  return Math.abs(h)
}

export interface ImportFile {
  path: string
  name: string
  size?: number
  dir?: string
  title?: string | null
  poster?: string | null
  tmdbId?: number | null
  mediaType?: string | null
  category?: string | null
  overview?: string | null
  backdropPath?: string | null
  genres?: number[] | string | null
  rating?: number | null
  releaseDate?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const files: ImportFile[] = Array.isArray(body.files) ? body.files : []
    const withMedia = body.withMedia !== false

    if (!files.length) {
      return NextResponse.json({ added: 0, skipped: 0 }, { status: 200 })
    }

    const existing = await prisma.localFile.findMany({ select: { filePath: true } })
    const existingPaths = new Set(existing.map((f) => f.filePath))

    const toImport: {
      filePath: string
      fileName: string
      fileSize: bigint | null
      folderPath: string | null
      category: string | null
      mediaId: string | null
    }[] = []

    let skipped = 0
    for (const f of files) {
      const filePath = (f.path || '').trim()
      if (!filePath) continue
      if (existingPaths.has(filePath)) {
        skipped++
        continue
      }
      existingPaths.add(filePath)
      toImport.push({
        filePath,
        fileName: f.name,
        fileSize: f.size ? BigInt(f.size) : null,
        folderPath: f.dir || null,
        category: f.category || detectCategory(f.name || f.path),
        mediaId: null
      })
    }

    if (withMedia) {
      const filesByPath = new Map<string, (typeof files)[number]>()
      for (const f of files) filesByPath.set((f.path || '').trim(), f)

      for (const item of toImport) {
        const f = filesByPath.get(item.filePath)
        const baseName = item.fileName || item.filePath
        const title = ((f && f.title) || baseName).replace(/\.[^.]+$/, '')
        const category = item.category || 'movie'
        const mediaType = (f && f.mediaType) || (category === 'series' ? 'tv' : 'movie')
        const media = await prisma.media.upsert({
          where: { tmdbId: (f && f.tmdbId) ?? pathToTmdbId(item.filePath) },
          update: {},
          create: {
            tmdbId: (f && f.tmdbId) ?? pathToTmdbId(item.filePath),
            title,
            overview: (f && f.overview) || null,
            posterPath: (f && f.poster) || null,
            backdropPath: (f && f.backdropPath) || null,
            mediaType,
            releaseDate: (f && f.releaseDate) || null,
            rating: (f && f.rating) || null,
            userRating: null,
            watchStatus: 'plan_to_watch',
            personalReview: null,
            notes: null,
            watchDate: null,
            genres:
              f && Array.isArray(f.genres)
                ? JSON.stringify(f.genres)
                : typeof f?.genres === 'string'
                  ? f.genres
                  : null,
            category
          }
        })
        item.mediaId = media.id
      }
    }

    let added = 0
    if (toImport.length) {
      const created = await prisma.localFile.createMany({ data: toImport })
      added = created.count
    }

    return NextResponse.json({ added, skipped }, { status: 200 })
  } catch (error) {
    console.error('Error importing local files:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}