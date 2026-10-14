'use client'

import { useEffect, useRef, useState } from 'react'
import { Star, Loader2 } from 'lucide-react'

export interface RatingsData {
  imdb?: number
  rottenTomatoes?: number
  metacritic?: number
  imdbId?: string | null
  source?: 'omdb' | 'fallback' | 'none'
}

interface RatingsProps {
  /** ترجیحاً با IMDb ID */
  imdbId?: string | null
  /** اگر imdbId نباشد، با عنوان + سال + نوع جستجو می‌کنیم */
  title?: string
  year?: string | null
  type?: 'movie' | 'tv' | null
  /** نمرهٔ پیش‌فرض (vote_average از TMDB یا f2m) — وقتی OMDb نباشد همین IMDb نمایش داده می‌شود */
  fallbackRating?: number | null
  /** اندازهٔ بج‌ها */
  size?: 'sm' | 'md'
  className?: string
}

/** کلید OMDb از localStorage کاربر (در کنار TMDB) — اگر نباشد، سرور به .env رجوع می‌کند */
function getOmdbKey(): string | null {
  if (typeof window === 'undefined') return null
  const k = localStorage.getItem('omdb_api_key')
  return k && k.trim() ? k.trim() : null
}

/**
 * نمایش نمره‌های IMDb / Rotten Tomatoes / Metacritic.
 *
 * سعی می‌کند با imdbId (دقیق) وگرنه با title+year+type از OMDb نمره بگیرد.
 * اگر کلید OMDb نباشد یا جواب نداد، همان vote_average (که معمولاً IMDb است)
 * را در بج IMDb نشان می‌دهد ولی بج RT و Metacritic پنهان می‌شوند.
 *
 * هر بار دریافت برای یک آیتم کش می‌شود تا دفعات بعد فوراً نمایش داده شود.
 */
export default function Ratings({
  imdbId,
  title,
  year,
  type,
  fallbackRating,
  size = 'md',
  className = ''
}: RatingsProps) {
  const [data, setData] = useState<RatingsData | null>(null)
  const [loading, setLoading] = useState(false)
  const reqIdRef = useRef(0)

  useEffect(() => {
    // کش ساده در localStorage تا بین رفرش‌ها و مودال‌های مختلف حفظ شود
    const cacheKey = `ratings:${imdbId || ''}|${title || ''}|${year || ''}|${type || ''}`
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached) as RatingsData
        if (parsed && typeof parsed === 'object') {
          setData(parsed)
          return
        }
      }
    } catch {
      // کش خراب است → نادیده
    }

    const reqId = ++reqIdRef.current
    setLoading(true)

    const params = new URLSearchParams()
    if (imdbId) params.set('imdbId', imdbId)
    if (title) params.set('title', title)
    if (year) params.set('year', year)
    if (type) params.set('type', type)
    if (fallbackRating && fallbackRating > 0) params.set('fallbackRating', String(fallbackRating))
    const apiKey = getOmdbKey()
    if (apiKey) params.set('apiKey', apiKey)

    fetch(`/api/ratings?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((result: RatingsData | null) => {
        if (reqIdRef.current !== reqId) return
        if (result && result.source && result.source !== 'none') {
          setData(result)
          try {
            localStorage.setItem(cacheKey, JSON.stringify(result))
          } catch {
            // پر شدن localStorage → بی‌خی
          }
        } else {
          setData(null)
        }
      })
      .catch(() => {
        if (reqIdRef.current !== reqId) return
        setData(null)
      })
      .finally(() => {
        if (reqIdRef.current === reqId) setLoading(false)
      })
  }, [imdbId, title, year, type, fallbackRating])

  const hasAny =
    data && (data.imdb || data.rottenTomatoes || data.metacritic)
  const isSm = size === 'sm'
  const badgeSize = isSm ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
  const iconSize = isSm ? 'w-2.5 h-2.5' : 'w-3 h-3'

  if (loading && !hasAny) {
    return (
      <span className={`inline-flex items-center gap-1 ${isSm ? 'text-[11px]' : 'text-xs'} text-gray-500 ${className}`}>
        <Loader2 className={`${iconSize} animate-spin`} />
        در حال دریافت نمره‌ها…
      </span>
    )
  }

  if (!hasAny) return null

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {data.imdb ? (
        <a
          href={data.imdbId ? `https://www.imdb.com/title/${data.imdbId}/` : 'https://www.imdb.com/'}
          target="_blank"
          rel="noopener noreferrer"
          title="نمرهٔ IMDb"
          className={`inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium ${badgeSize}`}
        >
          <Star className={`${iconSize} fill-amber-400 text-amber-400`} />
          <span className="font-bold">{data.imdb.toFixed(1)}</span>
          <span className="opacity-60">/ ۱۰</span>
        </a>
      ) : null}

      {data.rottenTomatoes ? (
        <a
          href="https://www.rottentomatoes.com/"
          target="_blank"
          rel="noopener noreferrer"
          title="نمرهٔ Rotten Tomatoes"
          className={`inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 font-medium ${badgeSize}`}
        >
          {/* Tomato icon (simple emoji-free SVG) */}
          <svg viewBox="0 0 24 24" className={iconSize} fill="currentColor" aria-hidden>
            <path d="M12 2c-3.2 0-5.5 2-6 4.8C4 7.3 2 9.2 2 12c0 4.4 3.6 8 8 8h4c4.4 0 8-3.6 8-8 0-2.8-2-4.7-4-5.2C17.5 4 15.2 2 12 2zm-2 5c1.5 0 2.8.7 3.5 1.8C14.2 7.7 15.5 7 17 7c.5 0 1 .1 1.4.3-.6 1.4-2 2.7-3.8 3.4-1.6.7-3.3.7-4.8.1-1.7-.7-3.1-2-3.7-3.5.4-.2.9-.3 1.4-.3z" />
          </svg>
          <span className="font-bold">{data.rottenTomatoes}%</span>
        </a>
      ) : null}

      {data.metacritic ? (
        <a
          href="https://www.metacritic.com/"
          target="_blank"
          rel="noopener noreferrer"
          title="نمرهٔ Metacritic"
          className={`inline-flex items-center gap-1 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-200 font-medium ${badgeSize}`}
        >
          <span className="font-bold tracking-tight">M</span>
          <span>{data.metacritic}</span>
          <span className="opacity-60">/ ۱۰۰</span>
        </a>
      ) : null}

      {data.source === 'fallback' && (
        <span className={`opacity-60 ${isSm ? 'text-[10px]' : 'text-[11px]'} text-gray-500`} title="نمره از سایت فیلم — برای نمرهٔ دقیق، کلید OMDb را در تنظیمات وارد کنید">
          تقریبی
        </span>
      )}
    </div>
  )
}
