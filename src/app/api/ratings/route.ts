import { NextRequest, NextResponse } from 'next/server'
import { fetchRatings } from '@/lib/omdb'

export const dynamic = 'force-dynamic'

/**
 * دریافت نمرات IMDb / Rotten Tomatoes / Metacritic.
 *
 * پارامترهای درخواست:
 *   imdbId=tt1375666                 → دقیق‌ترین حالت (ترجیحاً از TMDB external_ids)
 *   title=Inception&year=2010&type=movie  → جستجو در OMDb
 *   apiKey=xxx                       → اختیاری، وگرنه از .env خوانده می‌شود
 *   fallbackRating=8.8               → اگر کلید نبود یا OMDb جواب نداد، همین مقدار IMDb نمایش داده می‌شود
 *
 * پاسخ:
 *   { imdb: 8.8, rottenTomatoes: 87, metacritic: 74, imdbId: "tt1375666", source: "omdb" | "fallback" | "none" }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const imdbId = searchParams.get('imdbId') || null
    const title = searchParams.get('title') || ''
    const year = searchParams.get('year') || ''
    const rawType = searchParams.get('type')
    const type: 'movie' | 'tv' | null =
      rawType === 'movie' ? 'movie' : rawType === 'tv' ? 'tv' : null
    const fallbackRating = parseFloat(searchParams.get('fallbackRating') || '0') || 0

    // کلید اولویت با localStorage کاربر، بعد .env سرور
    const apiKey =
      searchParams.get('apiKey') ||
      process.env.OMDB_API_KEY ||
      ''

    if (!apiKey) {
      // کلید وجود ندارد → همان vote_average سایت فیلم را به‌عنوان IMDb برمی‌گردانیم
      if (fallbackRating > 0) {
        return NextResponse.json({
          imdb: Math.round(fallbackRating * 10) / 10,
          source: 'fallback'
        })
      }
      return NextResponse.json({ source: 'none' })
    }

    if (!imdbId && !title) {
      return NextResponse.json({ error: 'title یا imdbId لازم است' }, { status: 400 })
    }

    const ratings = await fetchRatings({
      apiKey,
      imdbId,
      title,
      year,
      type
    })

    if (ratings) return NextResponse.json(ratings)

    // OMDb چیزی پیدا نکرد → اگر نمرهٔ فالبک داریم همان را نشان بده
    if (fallbackRating > 0) {
      return NextResponse.json({
        imdb: Math.round(fallbackRating * 10) / 10,
        source: 'fallback'
      })
    }
    return NextResponse.json({ source: 'none' })
  } catch (error) {
    console.error('Ratings API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطای داخلی سرور' },
      { status: 500 }
    )
  }
}
