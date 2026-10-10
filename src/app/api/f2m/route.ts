import { NextRequest, NextResponse } from 'next/server'
import { fetchDetails, fetchGenres, fetchList, resolveDetailUrl, type F2MSort, type F2MType } from '@/lib/f2m'

export const dynamic = 'force-dynamic'

const SORTS: F2MSort[] = ['newest', 'modified', 'popular', 'imdb_rate', 'release']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'list': {
        const type = (searchParams.get('type') as F2MType) || 'all'
        const genre = searchParams.get('genre') || undefined
        const query = searchParams.get('q') || undefined
        const page = parseInt(searchParams.get('page') || '1', 10) || 1
        const rawSort = searchParams.get('sortby') as F2MSort | null
        const sortby = rawSort && SORTS.includes(rawSort) ? rawSort : 'popular'

        const result = await fetchList({ type, genre, sortby, page, query })
        return NextResponse.json(result)
      }

      case 'genres': {
        const genres = await fetchGenres()
        return NextResponse.json({ genres })
      }

      case 'details': {
        const url = searchParams.get('url')
        if (!url) {
          return NextResponse.json({ error: 'آدرس مورد نیاز است' }, { status: 400 })
        }
        const details = await fetchDetails(url)
        return NextResponse.json(details)
      }

      case 'links': {
        // آدرسِ دقیق را داریم؟ سریع. نداریم؟ با عنوان + سال پیدا می‌کنیم.
        const knownUrl = searchParams.get('detailUrl') || ''
        const title = searchParams.get('title') || ''
        const year = searchParams.get('year') || ''
        const mediaType = searchParams.get('mediaType') || ''

        const url = knownUrl || (await resolveDetailUrl(title, year, mediaType))
        if (!url) {
          return NextResponse.json({ error: 'این عنوان در سایت فیلم پیدا نشد' }, { status: 404 })
        }

        const details = await fetchDetails(url)
        return NextResponse.json({ ...details, detailUrl: url })
      }

      default:
        return NextResponse.json({ error: 'درخواست نامعتبر است' }, { status: 400 })
    }
  } catch (error) {
    console.error('F2M API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در ارتباط با سایت فیلم' },
      { status: 502 }
    )
  }
}
