'use client'

import { useState, useEffect } from 'react'
import { X, Star, Play, Plus, Check, Clapperboard, Download, Subtitles, Copy } from 'lucide-react'
import { getBackdropURL, getPosterURL, genreLabels, getStoredApiKey } from '@/lib/tmdb'
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
}

function fullSizePoster(url: string | null | undefined): string | null {
  if (!url || !url.startsWith('http')) return null
  return url.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, '$1')
}

export default function MediaPreviewModal({ item, isOpen, onClose, onAdded }: MediaPreviewModalProps) {
  const [details, setDetails] = useState<Details | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState<Media | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl((prev) => (prev === url ? null : prev)), 1600)
    } catch {
      // مرورگر اجازهٔ کپی نداد
    }
  }

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

    if (item.source === 'f2m') {
      if (!item.detail_url) {
        setLoadingDetails(false)
        return
      }
      fetch(`/api/f2m?action=details&url=${encodeURIComponent(item.detail_url)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return
          setDetails({
            cast: Array.isArray(data.cast) ? data.cast : [],
            overview: data.overview || '',
            downloads: Array.isArray(data.downloads) ? data.downloads : [],
            subtitles: Array.isArray(data.subtitles) ? data.subtitles : [],
            trailer: data.trailer || null
          })
        })
        .catch(() => setDetails(null))
        .finally(() => setLoadingDetails(false))
      return
    }

    const id = item.id
    const type = item.media_type || ('title' in item ? 'movie' : 'tv')
    const key = getStoredApiKey()
    fetch(`/api/tmdb?action=details&id=${id}&type=${type}${key ? `&apiKey=${encodeURIComponent(key)}` : ''}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        const cast = (data.credits?.cast || []).slice(0, 8).map((c: { name: string; character: string; profile_path: string | null }) => ({
          name: c.name,
          character: c.character,
          profile_path: c.profile_path
        }))
        const trailer = (data.videos?.results || []).find(
          (v: { site: string; type: string; key: string }) => v.site === 'YouTube' && v.type === 'Trailer'
        )
        setDetails({ cast, trailerKey: trailer?.key })
      })
      .catch(() => setDetails(null))
      .finally(() => setLoadingDetails(false))
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
          genres: item.genre_names?.length ? item.genre_names : item.genre_ids
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

  // گروه‌بندی لینک‌های دانلود بر اساس نوع نسخه (دوبله فارسی، زیرنویس چسبیده، …)
  const downloadGroups: { group: string; items: { quality: string; url: string }[] }[] = []
  for (const d of details?.downloads || []) {
    const key = d.group || 'سایر'
    let group = downloadGroups.find((x) => x.group === key)
    if (!group) {
      group = { group: key, items: [] }
      downloadGroups.push(group)
    }
    group.items.push({ quality: d.quality, url: d.url })
  }

  const youtubeKey =
    details?.trailerKey ||
    (details?.trailer
      ? (details.trailer.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|embed\/)([\w-]{6,})/) || [])[1]
      : undefined)
  const trailerMp4 =
    !youtubeKey && details?.trailer && !details.trailer.includes('youtube') ? details.trailer : null
  const subtitleLinks = details?.subtitles || []

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
                {rating > 0 && (
                  <span className="flex items-center gap-1 text-yellow-400 font-medium">
                    <Star className="w-4 h-4 fill-yellow-400" />
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

          {downloadGroups.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                لینک دانلود
                <span className="text-gray-500 font-normal text-xs">
                  ({details?.downloads?.length} لینک)
                </span>
              </h3>
              <div className="space-y-3">
                {downloadGroups.map((g) => (
                  <div key={g.group} className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <p className="text-xs text-violet-300 font-medium mb-2">{g.group}</p>
                    <div className="flex flex-wrap gap-2">
                      {g.items.map((d) => (
                        <span
                          key={`${d.quality}-${d.url}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 overflow-hidden"
                        >
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/25 transition-colors"
                            title={`دانلود ${d.quality}`}
                          >
                            <Download className="w-3.5 h-3.5" />
                            {d.quality}
                          </a>
                          <button
                            onClick={() => copyLink(d.url)}
                            title="کپی لینک"
                            className="px-2 py-1.5 text-emerald-300/70 hover:text-emerald-200 hover:bg-emerald-500/25 transition-colors border-r border-emerald-500/20"
                          >
                            {copiedUrl === d.url ? (
                              <Check className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                لینک‌ها مستقیم و از سایت مبدأ هستند؛ اگر دانلود شروع نشد فیلترشکن را خاموش کنید.
              </p>
            </div>
          )}

          {subtitleLinks.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Subtitles className="w-4 h-4 text-sky-400" />
                زیرنویس
              </h3>
              <div className="flex flex-wrap gap-2">
                {subtitleLinks.map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500/15 border border-sky-500/20 text-xs text-sky-200 hover:bg-sky-500/25 transition-colors"
                  >
                    <Subtitles className="w-3.5 h-3.5" />
                    {s.label}
                  </a>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                نسخه‌های «زیرنویس فارسی چسبیده» همان لینک‌های دانلود بالا هستند.
              </p>
            </div>
          )}

          {(youtubeKey || trailerMp4) && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Play className="w-4 h-4 text-pink-400" />
                تریلر
              </h3>
              {youtubeKey ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeKey}`}
                    title={`تریلر ${title}`}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <video
                  src={trailerMp4 as string}
                  poster={posterSrc || undefined}
                  controls
                  preload="none"
                  className="w-full max-h-80 rounded-xl bg-black"
                />
              )}
            </div>
          )}

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
