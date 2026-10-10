import { getStoredApiKey } from '@/lib/tmdb'
import type { TMDBMovie, TMDBTVShow } from '@/types'

export interface PreviewDetails {
  cast: { name: string; character: string; profile_path: string | null }[]
  trailerKey?: string
  overview?: string
  downloads?: { group: string; quality: string; url: string }[]
  subtitles?: { label: string; url: string }[]
  trailer?: string | null
}

type Prefetchable =
  | (Partial<TMDBMovie | TMDBTVShow> & { source?: string; detail_url?: string; id?: number })
  | null
  | undefined

/**
 * کش مشترک جزئیات پیش‌نمایش.
 *
 * هدف: وقتی کاربر روی نتیجهٔ جستجو یا کارت گرید می‌رود (hover) یا با کلیدهای
 * جهت‌نما حرکت می‌کند، درخواست جزئیات از همان‌جا شروع شود تا لحظهٔ کلیک
 * عملاً آماده باشد. چون promise کش می‌شود، کلیک بعدی منتظر نمی‌ماند.
 */
const store = new Map<string, Promise<PreviewDetails | null>>()

function keyOf(item: Prefetchable): string {
  if (!item) return ''
  if (item.source === 'f2m') return `f2m:${item.detail_url || ''}`
  if (!item.id) return ''
  const type = item.media_type || ('title' in item ? 'movie' : 'tv')
  return `tmdb:${type}:${item.id}`
}

function endpointOf(item: Prefetchable & { id?: number }): string {
  if (item.source === 'f2m' && item.detail_url) {
    return `/api/f2m?action=details&url=${encodeURIComponent(item.detail_url)}`
  }
  const type = item.media_type || ('title' in item ? 'movie' : 'tv')
  const key = getStoredApiKey()
  return `/api/tmdb?action=details&id=${item.id}&type=${type}${key ? `&apiKey=${encodeURIComponent(key)}` : ''}`
}

function normalize(data: Record<string, unknown>, item: Prefetchable): PreviewDetails | null {
  if (!data) return null

  if (item?.source === 'f2m') {
    return {
      cast: Array.isArray(data.cast) ? (data.cast as PreviewDetails['cast']) : [],
      overview: (data.overview as string) || '',
      downloads: Array.isArray(data.downloads)
        ? (data.downloads as NonNullable<PreviewDetails['downloads']>)
        : [],
      subtitles: Array.isArray(data.subtitles)
        ? (data.subtitles as NonNullable<PreviewDetails['subtitles']>)
        : [],
      trailer: (data.trailer as string) || null
    }
  }

  const credits = (data.credits || {}) as { cast?: Record<string, unknown>[] }
  const cast = (credits.cast || [])
    .slice(0, 8)
    .map((c) => ({
      name: String(c.name || ''),
      character: String(c.character || ''),
      profile_path: (c.profile_path as string | null) ?? null
    }))
  const videos = (data.videos || {}) as { results?: { site: string; type: string; key: string }[] }
  const trailer = (videos.results || []).find((v) => v.site === 'YouTube' && v.type === 'Trailer')
  return {
    cast,
    trailerKey: trailer?.key,
    overview: (data.overview as string) || ''
  }
}

/** دریافت جزئیات (با کش) — هم از مودال و هم از پیش‌واکشی استفاده می‌شود */
export function getDetails(item: Prefetchable): Promise<PreviewDetails | null> {
  const key = keyOf(item)
  if (!key) return Promise.resolve(null)

  const hit = store.get(key)
  if (hit) return hit

  const request = fetch(endpointOf(item as Prefetchable & { id?: number }))
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => (data ? normalize(data, item) : null))
    .catch(() => {
      // شکست را کش نکن تا کلیک بعدی دوباره تلاش کند
      store.delete(key)
      return null
    })

  store.set(key, request)
  return request
}

/** شروع بی‌صدا دریافت جزئیات (hover / کلید جهت‌نما) — بدون انتظار */
export function prefetchDetails(item: Prefetchable): void {
  if (!keyOf(item) || store.has(keyOf(item))) return
  void getDetails(item)
}
