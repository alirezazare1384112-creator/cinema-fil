'use client'

import { useState, useEffect, useMemo } from 'react'
import { Sparkles, TrendingUp, Film, Tv, ArrowUpDown, CalendarDays, Star, Layers } from 'lucide-react'
import SearchBar from '@/components/SearchBar'
import MediaPreviewModal from '@/components/MediaPreviewModal'
import RatingsBadge from '@/components/RatingsBadge'
import { getPosterURL, genreLabels } from '@/lib/tmdb'
import { prefetchDetails } from '@/lib/details-cache'
import { sharedJson } from '@/lib/api-cache'
import type { Media, TMDBMovie, TMDBTVShow } from '@/types'

interface GenreOption {
  slug: string
  name: string
  type: 'movie' | 'tv'
  count: number
}

type SortBy = 'popularity' | 'rating' | 'year' | 'title'
type TypeFilter = 'all' | 'movie' | 'tv'

const SORT_MAP: Record<SortBy, string> = {
  popularity: 'popular',
  rating: 'imdb_rate',
  year: 'release',
  title: 'newest'
}

export default function DiscoverPage() {
  const [items, setItems] = useState<(TMDBMovie | TMDBTVShow)[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [trendingError, setTrendingError] = useState('')
  const [previewItem, setPreviewItem] = useState<(TMDBMovie | TMDBTVShow) | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<TypeFilter>('all')
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>('popularity')
  const [savedMedia, setSavedMedia] = useState<Media[]>([])
  const [genreOptions, setGenreOptions] = useState<GenreOption[]>([])

  const fetchPage = async (
    type: TypeFilter,
    pageNum: number
  ): Promise<{ results: (TMDBMovie | TMDBTVShow)[]; hasMore: boolean }> => {
    const params = new URLSearchParams({
      action: 'list',
      type,
      page: String(pageNum),
      sortby: SORT_MAP[sortBy]
    })
    if (selectedGenre) params.set('genre', selectedGenre)

    const response = await fetch(`/api/f2m?${params.toString()}`)
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error || 'خطا در دریافت محتوا')
    }
    return { results: data.results || [], hasMore: Boolean(data.hasMore) }
  }

  const fetchTrending = async (reset: boolean, requestedPage?: number) => {
    setIsLoading(true)
    setTrendingError('')
    try {
      const nextPage = reset ? 1 : requestedPage || page
      const types: TypeFilter[] = activeFilter === 'all' ? ['movie', 'tv'] : [activeFilter]

      const parts = await Promise.all(types.map((t) => fetchPage(t, nextPage)))
      const merged = parts.flatMap((part) => part.results)
      setHasMore(parts.some((part) => part.hasMore))

      const seen = new Set<string>()
      const unique = merged.filter((item) => {
        const key = `${item.media_type || ('title' in item ? 'movie' : 'tv')}-${item.id}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      setItems((prev) => {
        if (reset || nextPage === 1) return unique
        const prevKeys = new Set(prev.map((i) => `${i.media_type || ('title' in i ? 'movie' : 'tv')}-${i.id}`))
        return [...prev, ...unique.filter((i) => {
          const k = `${i.media_type || ('title' in i ? 'movie' : 'tv')}-${i.id}`
          return !prevKeys.has(k)
        })]
      })
    } catch (error) {
      console.error('Error fetching content:', error)
      setTrendingError(error instanceof Error ? error.message : 'خطا در دریافت محتوا')
      setItems((prev) => (reset ? [] : prev))
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSavedMedia = async () => {
    try {
      const data = await sharedJson<Media[]>('/api/media')
      setSavedMedia(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching saved media:', error)
    }
  }

  useEffect(() => {
    fetchTrending(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, selectedGenre, sortBy])

  useEffect(() => {
    fetchSavedMedia()
  }, [])

  useEffect(() => {
    fetch('/api/f2m?action=genres')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('genres'))))
      .then((data) => setGenreOptions(Array.isArray(data?.genres) ? data.genres : []))
      .catch(() => setGenreOptions([]))
  }, [])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    fetchTrending(false, next)
  }

  const handleSearchSelect = (item: TMDBMovie | TMDBTVShow) => {
    setPreviewItem(item)
    setIsPreviewOpen(true)
  }

  const getTitle = (item: TMDBMovie | TMDBTVShow) => 'title' in item ? item.title : item.name

  const getYear = (item: TMDBMovie | TMDBTVShow) => {
    const date = 'release_date' in item ? item.release_date : item.first_air_date
    return date?.split('-')[0] || ''
  }

  const getType = (item: TMDBMovie | TMDBTVShow) => item.media_type || ('title' in item ? 'movie' : 'tv')

  const isMediaSaved = (tmdbId: number) => savedMedia.some((m) => m.tmdbId === tmdbId)

  const availableGenres = useMemo(() => {
    const wantedType = activeFilter === 'all' ? null : activeFilter
    const list = genreOptions.filter((genre) => !wantedType || genre.type === wantedType)
    const seen = new Set<string>()
    return list.filter((genre) => {
      if (seen.has(genre.slug)) return false
      seen.add(genre.slug)
      return true
    })
  }, [genreOptions, activeFilter])

  const selectedGenreName =
    availableGenres.find((genre) => genre.slug === selectedGenre)?.name || ''

  const visibleItems = useMemo(() => {
    const sorted = [...items]
    switch (sortBy) {
      case 'rating':
        sorted.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
        break
      case 'year': {
        const y = (i: TMDBMovie | TMDBTVShow) => Number(getYear(i)) || 0
        sorted.sort((a, b) => y(b) - y(a))
        break
      }
      case 'title': {
        const t = (i: TMDBMovie | TMDBTVShow) => getTitle(i).toLowerCase()
        sorted.sort((a, b) => t(a).localeCompare(t(b), 'fa'))
        break
      }
      default:
        sorted.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    }
    return sorted
  }, [items, sortBy])

  const handleSelectGenre = (slug: string) => {
    setPage(1)
    setSelectedGenre((prev) => (prev === slug ? null : slug))
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-violet-400" />
          کشف
        </h1>
        <p className="text-gray-400">جستجو و کشف فیلم و سریال از سایت آنلاین — به‌همراه ژانر، مرتب‌سازی و جزئیات</p>
      </div>

      <div className="flex justify-center mb-8">
        <SearchBar
          onSelect={handleSearchSelect}
          placeholder="جستجوی فیلم و سریال در سایت آنلاین..."
        />
      </div>

      {trendingError && items.length === 0 && (
        <div className="mb-8 px-5 py-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm flex items-start gap-3">
          <div>
            <p className="font-medium">سایت فیلم در دسترس نیست ({trendingError})</p>
            <p className="text-amber-200/70 mt-1">
              فعلاً می‌توانی از «افزودن از کامپیوتر» در کتابخانه فیلم اضافه کنی، یا کمی بعد دوباره این صفحه را باز کنی.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center mb-6">
        {([
          { key: 'all', label: 'همه', icon: TrendingUp },
          { key: 'movie', label: 'فیلم‌ها', icon: Film },
          { key: 'tv', label: 'سریال‌ها', icon: Tv }
        ] as { key: TypeFilter; label: string; icon: typeof Film }[]).map((filter) => (
          <button
            key={filter.key}
            onClick={() => { setActiveFilter(filter.key); setSelectedGenre(null); setPage(1) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeFilter === filter.key
                ? 'bg-violet-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <filter.icon className="w-4 h-4" />
            {filter.label}
          </button>
        ))}

        <div className="flex-1" />

        <label className="flex items-center gap-2 text-sm text-gray-400">
          <ArrowUpDown className="w-4 h-4 text-gray-500" />
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value as SortBy); setPage(1) }}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
          >
            <option value="popularity">پرطرفدارترین</option>
            <option value="rating">بالاترین امتیاز</option>
            <option value="year">جدیدترین</option>
            <option value="title">نام فیلم</option>
          </select>
        </label>
      </div>

      {availableGenres.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
            <Layers className="w-4 h-4 text-violet-400" />
            فیلتر ژانر
          </div>
          <div className="flex flex-wrap gap-2">
            {availableGenres.map((genre) => (
              <button
                key={`${genre.type}-${genre.slug}`}
                onClick={() => handleSelectGenre(genre.slug)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  selectedGenre === genre.slug
                    ? 'bg-gradient-to-l from-violet-500 to-pink-500 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {genre.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <section>
        <h2 className="text-xl font-bold text-white mb-6 flex items-center justify-between">
          <span>
            {activeFilter === 'all' ? 'پرطرفدارهای الان' : activeFilter === 'movie' ? 'فیلم‌های پرطرفدار' : 'سریال‌های پرطرفدار'}
            {selectedGenre && selectedGenreName ? ` — ${selectedGenreName}` : ''}
          </span>
          <span className="text-sm font-normal text-gray-500">{visibleItems.length} عنوان</span>
        </h2>

        {isLoading && items.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {selectedGenre && selectedGenreName ? `عنوانی از ژانر «${selectedGenreName}» پیدا نشد` : 'محتوا در دسترس نیست'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {visibleItems.map((item, index) => {
              const saved = isMediaSaved(item.id)
              const title = getTitle(item)
              const year = getYear(item)
              const type = getType(item)

              return (
                <div
                  key={`${type}-${item.id}-${index}`}
                  className="glass-card overflow-hidden group hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => prefetchDetails(item)}
                  onClick={() => {
                    setPreviewItem(item)
                    setIsPreviewOpen(true)
                  }}
                >
                  <div className="aspect-[2/3] relative">
                    <img
                      src={getPosterURL(item.poster_path)}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      {/* نمرهٔ IMDb واقعی از OMDb — با lazy loading و کشِ localStorage */}
                      <RatingsBadge
                        title={title}
                        year={year || null}
                        type={type as 'movie' | 'tv'}
                        fallbackRating={item.vote_average}
                      />
                    </div>

                    {saved && (
                      <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-green-500/80 backdrop-blur-sm">
                        <span className="text-xs font-medium text-white">ذخیره شده</span>
                      </div>
                    )}

                    <div className="absolute top-10 left-2 px-2 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 bg-black/50 backdrop-blur-sm
                      text-sky-300">
                      {type === 'movie' ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3 text-pink-300" />}
                      {type === 'movie' ? 'فیلم' : 'سریال'}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="font-medium text-white truncate">{title}</p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                        {year && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{year}</span>}
                        {genreLabels(item.genre_ids, item.genre_names).slice(0, 2).map((g) => (
                          <span key={g} className="text-xs text-gray-500">{g}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {hasMore && visibleItems.length > 0 && (
          <div className="flex justify-center mt-8">
            <button
              onClick={loadMore}
              disabled={isLoading}
              className="px-6 py-2.5 bg-white/10 rounded-xl text-white font-medium hover:bg-white/20 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isLoading ? 'در حال بارگذاری...' : 'بیشتر'}
            </button>
          </div>
        )}
      </section>

      <MediaPreviewModal
        item={previewItem}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onAdded={(m) =>
          setSavedMedia((prev) => (prev.find((x) => x.id === m.id) ? prev : [m, ...prev]))
        }
      />
    </div>
  )
}