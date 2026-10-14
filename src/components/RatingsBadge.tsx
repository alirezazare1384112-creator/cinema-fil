'use client'

import { useEffect, useRef, useState } from 'react'
import { Star } from 'lucide-react'
import type { RatingsData } from '@/components/Ratings'

/**
 * نسخهٔ سبکِ Ratings برای کارت‌های گرید.
 *
 * تفاوت‌ها با Ratings اصلی:
 *   ۱. **IntersectionObserver** — فقط وقتی کارت نزدیک viewport شد fetch می‌کنه.
 *      این یعنی ۵۰ کارت توی صفحه‌ی Discover فقط ۱۰ درخواست هم‌زمان (اونایی که
 *      visible هستن) می‌فرسته، نه همه‌شون.
 *   ۲. فقط IMDb رو نشون می‌ده (نه RT/Metacritic) تا فضای کارت کوچک بمونه.
 *   ۳. از همان کش localStorage استفاده می‌کنه پس کش مشترکه.
 *   ۴. Loading state سبک‌تره (یه Star کوچک با pulse).
 *
 * برای دیدن RT و Metacritic، کارت رو باز کن (MediaPreviewModal یا MediaModal).
 */

interface RatingsBadgeProps {
  imdbId?: string | null
  title?: string
  year?: string | null
  type?: 'movie' | 'tv' | null
  fallbackRating?: number | null
  /** className اضافی برای جای‌گذاری */
  className?: string
}

function getOmdbKey(): string | null {
  if (typeof window === 'undefined') return null
  const k = localStorage.getItem('omdb_api_key')
  return k && k.trim() ? k.trim() : null
}

export default function RatingsBadge({
  imdbId,
  title,
  year,
  type,
  fallbackRating,
  className = ''
}: RatingsBadgeProps) {
  const [data, setData] = useState<RatingsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  // Ref روی HTMLElement — هم روی <span> و هم روی <a> قابل‌استفاده است
  const ref = useRef<HTMLElement>(null)
  const reqIdRef = useRef(0)
  const fetchedRef = useRef(false)

  // IntersectionObserver — وقتی عنصر نزدیک viewport شد (با ۲۰۰px buffer) visible=true
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true) // مرورگر قدیمی → همیشه visible
      return
    }
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            obs.disconnect()
            break
          }
        }
      },
      { rootMargin: '200px 0px', threshold: 0 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || fetchedRef.current) return
    fetchedRef.current = true

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
      // کش خراب است
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
            /* localStorage پر شده */
          }
        } else {
          setData(null)
        }
      })
      .catch(() => {
        if (reqIdRef.current === reqId) setData(null)
      })
      .finally(() => {
        if (reqIdRef.current === reqId) setLoading(false)
      })
  }, [visible, imdbId, title, year, type, fallbackRating])

  // اگر noch داده‌ای نباشه و fallback هم نباشه — چیزی نشان نده
  if (!loading && !data) {
    // کارتِ توی Discover از قبل vote_average داره — اگه داده‌ای از OMDb نیومد،
    // حداقل یه بجِ IMDb با fallbackRating نشون می‌دیم تا جای خالی نباشه
    if (fallbackRating && fallbackRating > 0) {
      return (
        <span
          ref={ref}
          title="نمرهٔ سایت فیلم (تقریبی)"
          className={`inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-medium px-1.5 py-0.5 ${className}`}
        >
          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
          <span className="font-bold">{fallbackRating.toFixed(1)}</span>
        </span>
      )
    }
    return <span ref={ref} className={className} />
  }

  if (loading && !data) {
    return (
      <span
        ref={ref}
        className={`inline-flex items-center gap-0.5 rounded-full bg-white/10 border border-white/10 text-gray-400 text-[10px] font-medium px-1.5 py-0.5 ${className}`}
      >
        <Star className="w-2.5 h-2.5 animate-pulse" />
        <span className="opacity-60">…</span>
      </span>
    )
  }

  if (!data || (!data.imdb && !data.rottenTomatoes && !data.metacritic)) {
    // هیچ نمره‌ای پیدا نشد — اگه fallback داریم همان را نشان بده
    if (fallbackRating && fallbackRating > 0) {
      return (
        <span
          ref={ref}
          title="نمرهٔ سایت فیلم (تقریبی)"
          className={`inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-medium px-1.5 py-0.5 ${className}`}
        >
          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
          <span className="font-bold">{fallbackRating.toFixed(1)}</span>
        </span>
      )
    }
    return <span ref={ref} className={className} />
  }

  // نمایش: IMDb (با color وصل به source)
  const imdbValue = data.imdb ?? fallbackRating ?? 0
  if (imdbValue <= 0) return <span ref={ref} className={className} />

  return (
    <a
      ref={ref as React.Ref<HTMLAnchorElement>}
      href={data.imdbId ? `https://www.imdb.com/title/${data.imdbId}/` : 'https://www.imdb.com/'}
      target="_blank"
      rel="noopener noreferrer"
      title={
        data.source === 'omdb'
          ? `IMDb: ${imdbValue.toFixed(1)}/10${data.rottenTomatoes ? ` • RT: ${data.rottenTomatoes}%` : ''}${data.metacritic ? ` • Metacritic: ${data.metacritic}` : ''} — کلیک برای صفحهٔ IMDb`
          : `نمرهٔ تقریبی IMDb از سایت فیلم — برای نمرهٔ دقیق، کلید OMDb را در تنظیمات وارد کنید`
      }
      className={`inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 hover:bg-amber-500/30 transition-colors ${className}`}
    >
      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
      <span>{imdbValue.toFixed(1)}</span>
      {data.source === 'fallback' && (
        <span className="opacity-60 font-normal ml-0.5" title="تقریبی">~</span>
      )}
    </a>
  )
}
