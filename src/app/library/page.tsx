'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Film, Grid, List, Eye, Clock, Play, Laptop, Star } from 'lucide-react'
import SearchBar from '@/components/SearchBar'
import MediaCard from '@/components/MediaCard'
import MediaModal from '@/components/MediaModal'
import AddMovieModal from '@/components/AddMovieModal'
import MediaPreviewModal from '@/components/MediaPreviewModal'
import type { Media, TMDBMovie, TMDBTVShow } from '@/types'
import { getPosterURL } from '@/lib/tmdb'
import { useToast } from '@/components/Toast'

export default function LibraryPage() {
  const { toast } = useToast()
  const [media, setMedia] = useState<Media[]>([])
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [previewItem, setPreviewItem] = useState<(TMDBMovie | TMDBTVShow) | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const fetchMedia = useCallback(async () => {
    try {
      const response = await fetch('/api/media')
      const data = await response.json()
      setMedia(data)
    } catch (error) {
      console.error('Error fetching media:', error)
    }
  }, [])

  useEffect(() => {
    fetchMedia()
  }, [fetchMedia])

const filteredMedia = useMemo(() => {
    let result = media
    if (activeFilter !== 'all') {
      result = result.filter((m) => m.watchStatus === activeFilter)
    }
    if (selectedCategory !== 'all') {
      result = result.filter((m) => (m.category || 'movie') === selectedCategory)
    }
    return result
  }, [media, activeFilter, selectedCategory])

  const handleSearchSelect = useCallback((item: TMDBMovie | TMDBTVShow) => {
    setPreviewItem(item)
    setIsPreviewOpen(true)
  }, [])

  const selectedMediaRef = useRef(selectedMedia)
  useEffect(() => {
    selectedMediaRef.current = selectedMedia
  }, [selectedMedia])

  const handleUpdateMedia = useCallback(async (id: string, data: Partial<Media>) => {
    try {
      const response = await fetch('/api/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data })
      })

      const updated = await response.json()
      if (response.ok) {
        setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, ...updated } : m)))
        if (selectedMediaRef.current?.id === id) {
          setSelectedMedia({ ...selectedMediaRef.current, ...updated })
        }
      }
    } catch (error) {
      console.error('Error updating media:', error)
    }
  }, [])

  const handleDeleteMedia = useCallback(async (id: string) => {
    if (!window.confirm('این رسانه از کتابخانه حذف شود؟')) return
    try {
      const res = await fetch(`/api/media?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMedia((prev) => prev.filter((m) => m.id !== id))
        toast('رسانه حذف شد', 'success')
      }
    } catch (error) {
      console.error('Error deleting media:', error)
    }
  }, [toast])

  const handleSelectMedia = useCallback((item: Media) => {
    setSelectedMedia(item)
    setIsModalOpen(true)
  }, [])

  const handleAddLocalFiles = useCallback(async (result: { added: number; skipped: number }) => {
    await fetchMedia()
    if (result.added > 0) {
      toast(`${result.added} فیلم اضافه شد${result.skipped > 0 ? `، ${result.skipped} تکراری` : ''}`, 'success')
    } else if (result.skipped > 0) {
      toast('این فایل قبلاً اضافه شده است', 'info')
    }
  }, [fetchMedia, toast])

  const statusCounts = useMemo(() => {
    const c = { all: media.length, watched: 0, plan_to_watch: 0, currently_watching: 0 }
    for (const m of media) {
      if (m.watchStatus === 'watched') c.watched++
      else if (m.watchStatus === 'currently_watching') c.currently_watching++
      else c.plan_to_watch++
    }
    return c
  }, [media])

  const filters = [
    { key: 'all', label: 'همه', icon: Film, count: statusCounts.all },
    { key: 'watched', label: 'مشاهده شده', icon: Eye, count: statusCounts.watched },
    { key: 'plan_to_watch', label: 'قصد تماشا', icon: Clock, count: statusCounts.plan_to_watch },
    { key: 'currently_watching', label: 'در حال تماشا', icon: Play, count: statusCounts.currently_watching }
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Film className="w-8 h-8 text-violet-400" />
            کتابخانه من
          </h1>
          <p className="text-gray-400">مجموعه رسانه شخصی شما</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPickerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-500 rounded-lg font-medium text-white hover:bg-pink-600 transition-colors"
          >
            <Laptop className="w-4 h-4" />
            افزودن از کامپیوتر
          </button>
          <SearchBar
            onSelect={handleSearchSelect}
            onSelectLocalMedia={handleSelectMedia}
            placeholder="جستجو از سایت آنلاین و کتابخانه..."
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeFilter === filter.key
                  ? 'bg-violet-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <filter.icon className="w-4 h-4" />
              {filter.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeFilter === filter.key ? 'bg-white/20' : 'bg-white/10'
              }`}>
                {filter.count}
              </span>
            </button>
          ))}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-violet-500"
          >
            <option value="all">همه دسته‌ها</option>
            <option value="movie">فیلم سینمایی</option>
            <option value="series">سریال</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-violet-500 text-white' : 'bg-white/5 text-gray-400'
            }`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-violet-500 text-white' : 'bg-white/5 text-gray-400'
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {filteredMedia.length === 0 ? (
        <div className="text-center py-20">
          <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-400 mb-2">رسانه‌ای یافت نشد</h3>
          <p className="text-gray-500">
            {activeFilter === 'all'
              ? 'شروع به افزودن فیلم و سریال به کتابخانه کنید'
              : `رسانه ${filters.find(f => f.key === activeFilter)?.label} یافت نشد`}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {filteredMedia.map((item) => (
            <MediaCard
              key={item.id}
              media={item}
              onUpdate={handleUpdateMedia}
              onDelete={handleDeleteMedia}
              onSelect={handleSelectMedia}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMedia.map((item) => (
            <div
              key={item.id}
              className="glass-card p-4 flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-colors"
              onClick={() => handleSelectMedia(item)}
            >
              <img
                src={getPosterURL(item.posterPath ?? null, 'w200')}
                alt={item.title}
                onError={(e) => { e.currentTarget.src = '/placeholder-poster.svg' }}
                className="w-16 h-24 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h3 className="font-medium text-white">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.releaseDate?.split('-')[0]}</p>
                <div className="flex items-center gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleUpdateMedia(item.id, { userRating: rating === item.userRating ? 0 : rating })
                      }}
                      className="p-0.5 transition-transform hover:scale-125"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          (item.userRating || 0) >= rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                  {item.userRating ? (
                    <span className="text-xs font-medium text-yellow-400 ml-1">{item.userRating}</span>
                  ) : null}
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                item.watchStatus === 'watched' ? 'bg-green-500/20 text-green-400' :
                item.watchStatus === 'currently_watching' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {item.watchStatus === 'watched' ? 'مشاهده شده' :
                 item.watchStatus === 'currently_watching' ? 'در حال تماشا' : 'قصد تماشا'}
              </div>
            </div>
          ))}
        </div>
      )}

      <MediaModal
        media={selectedMedia}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdate={handleUpdateMedia}
      />

      <AddMovieModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSaved={handleAddLocalFiles}
      />

      <MediaPreviewModal
        item={previewItem}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onAdded={(m) => {
          setMedia((prev) => (prev.some((x) => x.id === m.id) ? prev : [m, ...prev]))
          toast('فیلم به کتابخانه اضافه شد', 'success')
        }}
      />
    </div>
  )
}