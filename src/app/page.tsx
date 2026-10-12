'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Clock, Eye, Play, Film, Tv, Sparkles } from 'lucide-react'
import { getPosterURL, getStoredApiKey } from '@/lib/tmdb'
import { sharedJson } from '@/lib/api-cache'
import type { Media } from '@/types'
import type { TMDBMovie, TMDBTVShow } from '@/types'

export default function HomePage() {
  const [recentMedia, setRecentMedia] = useState<Media[]>([])
  const [trending, setTrending] = useState<(TMDBMovie | TMDBTVShow)[]>([])
  const [stats, setStats] = useState({
    total: 0,
    watched: 0,
    planToWatch: 0,
    currentlyWatching: 0
  })

  useEffect(() => {
    fetchMedia()
    fetchTrending()
  }, [])

  const fetchMedia = async () => {
    try {
      const data = (await sharedJson<Media[]>('/api/media')) || []
      setRecentMedia(data.slice(0, 6))

      const watched = data.filter((m: Media) => m.watchStatus === 'watched').length
      const planToWatch = data.filter((m: Media) => m.watchStatus === 'plan_to_watch').length
      const currentlyWatching = data.filter((m: Media) => m.watchStatus === 'currently_watching').length

      setStats({
        total: data.length,
        watched,
        planToWatch,
        currentlyWatching
      })
    } catch (error) {
      console.error('Error fetching media:', error)
    }
  }

  const fetchTrending = async () => {
    try {
      const key = getStoredApiKey()
      const url = `/api/tmdb?action=trending&type=all${key ? `&apiKey=${encodeURIComponent(key)}` : ''}`
      const response = await fetch(url)
      const data = await response.json()
      if (response.ok) {
        setTrending(data.results?.slice(0, 8) || [])
      }
    } catch (error) {
      console.error('Error fetching trending:', error)
    }
  }

  const getTitle = (item: TMDBMovie | TMDBTVShow) => {
    return 'title' in item ? item.title : item.name
  }

  const getYear = (item: TMDBMovie | TMDBTVShow) => {
    const date = 'release_date' in item ? item.release_date : item.first_air_date
    return date?.split('-')[0] || ''
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">به سینمافیل خوش آمدید</h1>
        <p className="text-gray-400">مرکز ردیابی شخصی رسانه شما</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Film className="w-5 h-5 text-violet-400" />
            </div>
            <span className="text-gray-400">کل رسانه</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Eye className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-gray-400">مشاهده شده</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.watched}</p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-gray-400">قصد تماشا</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.planToWatch}</p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Play className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-gray-400">در حال تماشا</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.currentlyWatching}</p>
        </div>
      </div>

      {recentMedia.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-violet-400" />
              به‌روز شده اخیراً
            </h2>
            <a href="/library" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
              مشاهده همه ←
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {recentMedia.map((media) => (
              <a
                key={media.id}
                href={`/library?id=${media.id}`}
                className="glass-card overflow-hidden group hover:scale-[1.02] transition-all duration-300"
              >
                <div className="aspect-[2/3] relative">
                  <img
                    src={getPosterURL(media.posterPath ?? null)}
                    alt={media.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-sm font-medium text-white truncate">{media.title}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pink-400" />
            پرطرفدارهای الان
          </h2>
          <a href="/discover" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
            کشف بیشتر ←
          </a>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {trending.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="glass-card overflow-hidden group hover:scale-[1.02] transition-all duration-300 cursor-pointer"
            >
              <div className="aspect-[2/3] relative">
                <img
                  src={getPosterURL(item.poster_path)}
                  alt={getTitle(item)}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
                  <span className="text-xs font-medium text-yellow-400">★ {item.vote_average.toFixed(1)}</span>
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-xs font-medium text-white truncate">{getTitle(item)}</p>
                  <p className="text-xs text-gray-400">{getYear(item)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
