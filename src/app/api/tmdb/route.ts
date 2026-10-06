import { NextRequest, NextResponse } from 'next/server'
import { searchTMDB, getTrending, getDetails } from '@/lib/tmdb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'search': {
        const query = searchParams.get('query')
        const type = (searchParams.get('type') as 'multi' | 'movie' | 'tv') || 'multi'
        const apiKey = searchParams.get('apiKey') || undefined

        if (!query) {
          return NextResponse.json({ error: 'Query is required' }, { status: 400 })
        }

        const results = await searchTMDB(query, type, apiKey)
        return NextResponse.json(results)
      }

      case 'trending': {
        const type = (searchParams.get('type') as 'all' | 'movie' | 'tv') || 'all'
        const apiKey = searchParams.get('apiKey') || undefined
        const page = parseInt(searchParams.get('page') || '1', 10) || 1
        const results = await getTrending(type, apiKey, page)
        return NextResponse.json(results)
      }

      case 'details': {
        const id = searchParams.get('id')
        const type = (searchParams.get('type') as 'movie' | 'tv') || 'movie'
        const apiKey = searchParams.get('apiKey') || undefined

        if (!id) {
          return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        const results = await getDetails(parseInt(id), type, apiKey)
        return NextResponse.json(results)
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('TMDB API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
