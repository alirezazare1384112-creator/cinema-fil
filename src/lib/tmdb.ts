const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY

function resolveKey(apiKey?: string): string {
  const key = apiKey || TMDB_API_KEY
  if (!key || key === 'your_tmdb_api_key_here') {
    throw new Error('کلید API TMDB تنظیم نشده است')
  }
  return key
}

export async function searchTMDB(query: string, type: 'multi' | 'movie' | 'tv' = 'multi', apiKey?: string, page = 1) {
  const key = resolveKey(apiKey)

  const response = await fetch(
    `${TMDB_BASE_URL}/search/${type}?api_key=${key}&query=${encodeURIComponent(query)}&include_adult=false&language=fa&page=${page}`
  )

  if (!response.ok) {
    if (response.status === 401) throw new Error('کلید API TMDB نامعتبر است')
    throw new Error('جستجوی TMDB با خطا مواجه شد')
  }

  return response.json()
}

export async function getTrending(mediaType: 'all' | 'movie' | 'tv' = 'all', apiKey?: string, page = 1) {
  const key = resolveKey(apiKey)

  const response = await fetch(
    `${TMDB_BASE_URL}/trending/${mediaType}/week?api_key=${key}&language=fa&page=${page}`
  )

  if (!response.ok) {
    if (response.status === 401) throw new Error('کلید API TMDB نامعتبر است')
    throw new Error('دریافت محتوای پرطرفدار با خطا مواجه شد')
  }

  return response.json()
}

export async function getDetails(id: number, type: 'movie' | 'tv', apiKey?: string) {
  const key = resolveKey(apiKey)

  const response = await fetch(
    `${TMDB_BASE_URL}/${type}/${id}?api_key=${key}&append_to_response=credits,videos&language=fa`
  )

  if (!response.ok) {
    if (response.status === 401) throw new Error('کلید API TMDB نامعتبر است')
    throw new Error('دریافت جزئیات با خطا مواجه شد')
  }

  return response.json()
}

export const GENRE_MAP: Record<number, string> = {
  28: 'اکشن', 12: 'ماجراجویی', 16: 'انیمیشن', 35: 'کمدی', 80: 'جنایی',
  99: 'مستند', 18: 'درام', 10751: 'خانوادگی', 14: 'فانتزی', 36: 'تاریخی',
  27: 'ترسناک', 10402: 'موزیکال', 9648: 'معمایی', 10749: 'عاشقانه',
  878: 'علمی-تخیلی', 10770: 'تلویزیونی', 53: 'هیجان‌انگیز', 10752: 'جنگی',
  37: 'وسترن', 10759: 'اقدام‌محور', 10762: 'کودک', 10763: 'اخبار',
  10764: 'واقع‌نما', 10765: 'علمی-تخیلی‌واقعی', 10766: 'صابونی',
  10767: 'گفتگو', 10768: 'سیاسی', 10769: 'تاک‌شو'
}

export function genreNames(ids: (number | string)[] | null | undefined): string[] {
  if (!ids || !ids.length) return []
  return ids
    .map((id) => (typeof id === 'string' ? id : GENRE_MAP[id]))
    .filter((name): name is string => Boolean(name))
}

export function genreLabels(
  ids?: number[] | null,
  names?: string[] | null
): string[] {
  if (names && names.length) return names
  return genreNames(ids)
}

export function getPosterURL(path: string | null, size: 'w200' | 'w300' | 'w500' | 'original' = 'w500'): string {
  if (!path) return '/placeholder-poster.svg'
  if (path.startsWith('http')) return path
  if (path.startsWith('/api/')) return path
  return `/api/image?path=${encodeURIComponent(path)}&size=${size}`
}

export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null
  const k = localStorage.getItem('tmdb_api_key')
  return k && k.trim() ? k.trim() : null
}

export function getBackdropURL(path: string | null, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w1280'): string {
  if (!path) return '/placeholder-backdrop.svg'
  if (path.startsWith('http')) return path
  if (path.startsWith('/api/')) return path
  return `/api/image?path=${encodeURIComponent(path)}&size=${size}`
}
