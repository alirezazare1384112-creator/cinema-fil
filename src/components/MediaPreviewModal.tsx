'use client'

import { useState, useEffect } from 'react'
import { X, Star, Play, Plus, Check, Clapperboard } from 'lucide-react'
import { getBackdropURL, getPosterURL, genreLabels, viaImageProxy } from '@/lib/tmdb'
import { getDetails } from '@/lib/details-cache'
import DownloadLinks from '@/components/DownloadLinks'
import Ratings from '@/components/Ratings'
import type { TMDBMovie, TMDBTVShow, Media } from '@/types'

interface MediaPreviewModalProps {
  item: (TMDBMovie | TMDBTVShow) | null
  isOpen: boolean
  onClose: () => void
  onAdded?: (media: Media) => void
}

interface Details {
  cast: { name: string; character: string; profile_path: string | null }[]
  trailerKey?: string
  overview?: string
  downloads?: { group: string; quality: string; url: string }[]
  subtitles?: { label: string; url: string }[]
  trailer?: string | null
  /** شناسهٔ IMDb از TMDB external_ids یا از سایت فیلم */
  imdbId?: string | null
}

function fullSizePoster(url: string | null | undefined): string | null {
  if (!url || !url.startsWith('http')) return null
  return viaImageProxy(url.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, '$1'))
}

export default function MediaPreviewModal({ item, isOpen, onClose, onAdded }: MediaPreviewModalProps) {
  const [details, setDetails] = useState<Details | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState<Media | null>(null)
  const title = item ? ('title' in item ? item.title : item.name) : ''
  const year = item
    ? (('release_date' in item ? item.release_date : item.first_air_date) || '').split('-')[0]
    : ''
  const overview = item?.overview || ''
  const mediaType = (item?.media_type || ('title' in (item || {}) ? 'movie' : 'tv')) as 'movie' | 'tv'
  const rating = item?.vote_average || 0
  const genres = genreLabels(item?.genre_ids, item?.genre_names)
  const synopsis = overview || details?.overview || ''
  const backdropFallback = getBackdropURL(item?.backdrop_path ?? item?.poster_path ?? null)
  const backdropSrc =
    (item?.source === 'f2m' ? fullSizePoster(item.backdrop_path ?? item.poster_path) : null) ||
    backdropFallback
  const posterFallback = getPosterURL(item?.poster_path ?? null, 'w300')
  const posterSrc =
    (item?.source === 'f2m' ? fullSizePoster(item.poster_path) : null) || posterFallback

  useEffect(() => {
    if (!isOpen || !item) return
    setAdded(null)
    setDetails(null)
    setLoadingDetails(true)

    // از کش مشترک استفاده می‌کند؛ اگر hover/کلید جهت‌نما از قبل پیش‌واکشی
    // کرده باشد، همین‌جا بلافاصله resolve می‌شود.
    let cancelled = false
    getDetails(item)
      .then((data) => {
        if (!cancelled) setDetails(data)
      })
      .finally(() => {
        if (!cancelled) setLoadingDetails(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, item])

  if (!isOpen || !item) return null

  const handleAdd = async () => {
    if (!item) return
    setAdding(true)
    try {
      const releaseDate = 'release_date' in item ? item.release_date : item.first_air_date
      const response = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: item.id,
          title,
          overview: synopsis,
          posterPath: item.poster_path,
          backdropPath: item.backdrop_path,
          mediaType,
          releaseDate,
          rating: item.vote_average,
          genres: item.genre_names?.length ? item.genre_names : item.genre_ids,
          detailUrl: item.source === 'f2m' ? item.detail_url : null
        })
      })
      if (response.ok) {
        const saved: Media = await response.json()
        setAdded(saved)
        onAdded?.(saved)
      }
    } catch {
      // ignore
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl glass-card animate-fade-in flex flex-col">
        <div className="relative h-72 md:h-80 shrink-0">
          <img
            src={backdropSrc}
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = backdropFallback
            }}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/50 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="flex flex-col md:flex-row gap-6 -mt-24 relative z-10">
            <img
              src={posterSrc}
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = posterFallback
              }}
              alt={title}
              className="w-32 md:w-44 rounded-xl object-cover shadow-2xl border border-white/10 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs font-medium">
                  {mediaType === 'movie' ? 'فیلم' : 'سریال'}
                </span>
                {year && <span className="text-sm text-gray-400">{year}</span>}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mt-2 leading-tight">{title}</h2>

              <div className="flex items-center gap-4 mt-3 flex-wrap">
                {/* نمرات IMDb / Rotten Tomatoes / Metacritic از OMDb (یا فالبک از vote_average) */}
                <Ratings
                  imdbId={details?.imdbId}
                  title={title}
                  year={year || null}
                  type={mediaType}
                  fallbackRating={rating}
                  size="md"
                />
                {rating > 0 && (
                  <span className="flex items-center gap-1 text-xs text-gray-500" title="نمره نمایش‌داده‌شده در منبع کشف">
                    <Star className="w-3 h-3 fill-gray-500 text-gray-500" />
                    {rating.toFixed(1)}
                  </span>
                )}
                {genres.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {genres.map((g) => (
                      <span key={g} className="px-2 py-0.5 rounded-full bg-white/10 text-gray-300 text-xs">
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 flex gap-3">
                {added ? (
                  <span className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-green-500/20 text-green-400">
                    <Check className="w-4 h-4" /> افزوده شد به کتابخانه
                  </span>
                ) : (
                  <button
                    onClick={handleAdd}
                    disabled={adding}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-gradient-to-l from-violet-500 to-pink-500 text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    <Plus className="w-4 h-4" /> {adding ? 'در حال افزودن...' : 'افزودن به کتابخانه'}
                  </button>
                )}
                {details?.trailerKey && (
                  <a
                    href={`https://www.youtube.com/watch?v=${details.trailerKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
                  >
                    <Play className="w-4 h-4" />                     پخش تریلر
                  </a>
                )}
              </div>
              {!added && (
                <p className="mt-3 text-xs text-gray-500">
                  با «افزودن به کتابخانه» با وضعیت «قصد تماشا» ذخیره می‌شود و بعداً از کتابخانه قابل تغییر است.
                </p>
              )}
            </div>
          </div>

          {synopsis && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">خلاصه داستان</h3>
              <p className="text-gray-300 leading-relaxed text-justify">{synopsis}</p>
            </div>
          )}

          <DownloadLinks
            downloads={details?.downloads}
            subtitles={details?.subtitles}
            trailer={details?.trailer}
            trailerKey={details?.trailerKey}
            title={title}
            posterSrc={posterSrc}
          />

          {loadingDetails && (
            <p className="text-sm text-gray-500 mt-6">در حال بارگذاری اطلاعات بیشتر...</p>
          )}

          {details?.cast && details.cast.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">بازیگران</h3>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {details.cast.map((c, i) => (
                  <div key={i} className="text-center w-20 shrink-0">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-white/10 mx-auto">
                      {c.profile_path ? (
                        <img
                          src={
                            c.profile_path.startsWith('http')
                              ? c.profile_path
                              : `https://image.tmdb.org/t/p/w200${c.profile_path}`
                          }
                          alt={c.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <Clapperboard className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-white mt-2 truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{c.character}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
