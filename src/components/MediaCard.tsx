'use client'

import { memo, useState, useRef } from 'react'
import { Star, Eye, Clock, Play, MoreVertical, Trash2 } from 'lucide-react'
import { getPosterURL } from '@/lib/tmdb'
import RatingsBadge from '@/components/RatingsBadge'
import type { Media } from '@/types'

interface MediaCardProps {
  media: Media
  onUpdate: (id: string, data: Partial<Media>) => void
  onDelete: (id: string) => void
  onSelect: (media: Media) => void
}

const watchStatusConfig = {
  watched: { label: 'مشاهده شده', color: 'bg-green-500', icon: Eye },
  plan_to_watch: { label: 'قصد تماشا', color: 'bg-blue-500', icon: Clock },
  currently_watching: { label: 'در حال تماشا', color: 'bg-yellow-500', icon: Play }
}

export default memo(function MediaCard({ media, onUpdate, onDelete, onSelect }: MediaCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [hoverRating, setHoverRating] = useState(0)
  const [promptVisible, setPromptVisible] = useState(false)
  const promptTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const status = watchStatusConfig[media.watchStatus as keyof typeof watchStatusConfig] || watchStatusConfig.plan_to_watch
  const currentRating = hoverRating || media.userRating || 0

  const handleStatusChange = (newStatus: string) => {
    onUpdate(media.id, { watchStatus: newStatus } as Partial<Media>)
    setShowMenu(false)
    if (newStatus === 'watched') {
      setPromptVisible(true)
      if (promptTimer.current) clearTimeout(promptTimer.current)
      promptTimer.current = setTimeout(() => setPromptVisible(false), 5000)
    } else {
      setPromptVisible(false)
    }
  }

  const handleRate = (rating: number) => {
    onUpdate(media.id, { userRating: rating === media.userRating ? 0 : rating } as Partial<Media>)
    setPromptVisible(false)
  }

  return (
    <div
      className="glass-card group cursor-pointer transition-all duration-300 hover:scale-[1.02] animate-fade-in"
      onClick={() => onSelect(media)}
    >
      <div className="relative aspect-[2/3] rounded-t-xl overflow-hidden">
        <img
          src={getPosterURL(media.posterPath ?? null)}
          alt={media.title}
          onError={(e) => { e.currentTarget.src = '/placeholder-poster.svg' }}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium text-white ${status.color} flex items-center gap-1`}>
          <status.icon className="w-3 h-3" />
          {status.label}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {showMenu && (
          <div className="absolute top-14 right-3 w-48 glass-card p-2 z-10 animate-fade-in">
            {Object.entries(watchStatusConfig).map(([key, config]) => (
              <button
                key={key}
                onClick={(e) => {
                  e.stopPropagation()
                  handleStatusChange(key)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
              >
                <config.icon className="w-4 h-4" />
                {config.label}
              </button>
            ))}
            <hr className="my-2 border-white/10" />
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(media.id)
                setShowMenu(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              حذف
            </button>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-white truncate group-hover:text-violet-400 transition-colors">
          {media.title}
        </h3>
        <div className="flex items-center justify-between mt-1 gap-2">
          <p className="text-sm text-gray-400">{media.releaseDate?.split('-')[0]}</p>
          {/* نمرهٔ IMDb با lazy loading — فقط وقتی کارت visible بشه fetch می‌کنه */}
          <RatingsBadge
            title={media.title}
            year={(media.releaseDate || '').split('-')[0] || null}
            type={media.mediaType === 'tv' || media.category === 'series' ? 'tv' : 'movie'}
            fallbackRating={media.rating ?? null}
          />
        </div>

        {media.category === 'series' ? (
          <span className="inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300">
            سریال
          </span>
        ) : media.category === 'movie' ? (
          <span className="inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300">
            فیلم
          </span>
        ) : null}

        {promptVisible && !media.userRating && (
          <div className="mt-2 flex items-center gap-1 text-xs text-yellow-300 animate-pulse">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            امتیاز بده
          </div>
        )}

        <div
          className="flex items-center gap-1 mt-2"
          onMouseLeave={() => setHoverRating(0)}
        >
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              onClick={(e) => {
                e.stopPropagation()
                handleRate(rating)
              }}
              onMouseEnter={() => setHoverRating(rating)}
              className="p-0.5 transition-transform hover:scale-125"
              title={`امتیاز ${rating}`}
            >
              <Star
                className={`w-4 h-4 ${
                  currentRating >= rating
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-600'
                }`}
              />
            </button>
          ))}
          {media.userRating ? (
            <span className="text-xs font-medium text-yellow-400 ml-1">{media.userRating}</span>
          ) : (
            <span className="text-[11px] text-gray-500 mr-1">نمره بده</span>
          )}
        </div>
      </div>
    </div>
  )
})
