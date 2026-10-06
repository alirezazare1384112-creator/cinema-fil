'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X, Film, Loader2, Upload, Search, Link as LinkIcon, Trash2, Check,
  ImageIcon, FileVideo
} from 'lucide-react'
import { getPosterURL, getStoredApiKey } from '@/lib/tmdb'
import { extractPoster } from '@/lib/videoPoster'
import { uploadFile, saveImageUrl, isImageBright } from '@/lib/uploadFile'
import { useToast } from '@/components/Toast'

interface AddMovieModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: (result: { added: number; skipped: number }) => void
}

interface TMDBItem {
  id: number
  media_type?: string
  title?: string
  name?: string
  poster_path?: string | null
  backdrop_path?: string | null
  overview?: string | null
  genre_ids?: number[]
  vote_average?: number
  release_date?: string
  first_air_date?: string
}

function cleanTitle(name: string) {
  return name.replace(/\.[^.]+$/, '').trim()
}

export default function AddMovieModal({ isOpen, onClose, onSaved }: AddMovieModalProps) {
  const { toast } = useToast()

  const [pickingVideo, setPickingVideo] = useState(false)
  const [videoFileName, setVideoFileName] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoSize, setVideoSize] = useState(0)

  const [title, setTitle] = useState('')
  const [poster, setPoster] = useState<string | null>(null)
  const [posterAuto, setPosterAuto] = useState(false)
  const [tmdbId, setTmdbId] = useState<number | null>(null)
  const [mediaType, setMediaType] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [genres, setGenres] = useState<number[] | null>(null)
  const [rating, setRating] = useState<number | null>(null)
  const [releaseDate, setReleaseDate] = useState<string | null>(null)
  const [overview, setOverview] = useState<string | null>(null)

  const [tQuery, setTQuery] = useState('')
  const [tResults, setTResults] = useState<TMDBItem[]>([])
  const [tLoading, setTLoading] = useState(false)
  const [tError, setTError] = useState('')
  const tDebounce = useRef<NodeJS.Timeout | null>(null)

  const [posterUploading, setPosterUploading] = useState(false)
  const [posterUrlInput, setPosterUrlInput] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const posterInputRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setPickingVideo(false)
      setVideoFileName('')
      setVideoUrl('')
      setVideoSize(0)
      setTitle('')
      setPoster(null)
      setPosterAuto(false)
      setTmdbId(null)
      setMediaType(null)
      setCategory(null)
      setGenres(null)
      setRating(null)
      setReleaseDate(null)
      setOverview(null)
      setTQuery('')
      setTResults([])
      setTError('')
      setPosterUrlInput('')
      setShowUrlInput(false)
      setSaving(false)
    }
  }, [isOpen])

  const handlePickVideo = async () => {
    if (pickingVideo) return
    setPickingVideo(true)
    try {
      const res = await fetch('/api/pick-file', { method: 'POST' })
      let data: {
        path?: string
        name?: string
        size?: number
        dir?: string
        canceled?: boolean
        error?: string
      } = {}
      try {
        data = await res.json()
      } catch {
        data = {}
      }

      if (data.canceled) {
        toast('انتخاب فایل لغو شد', 'info')
        return
      }

      if (!res.ok || !data.path || !data.name) {
        toast(data.error || 'خطا در انتخاب فایل', 'error')
        return
      }

      // فقط مسیر فایل اصلی ذخیره می‌شود؛ هیچ کپی از ویدیو انجام نمی‌شود
      const pickedName = data.name
      setVideoFileName(pickedName)
      setVideoUrl(data.path)
      setVideoSize(data.size || 0)
      setTitle((prev) => prev || cleanTitle(pickedName))
      toast('فایل انتخاب شد؛ فایل در مسیر اصلی خود باقی می‌ماند', 'success')

      try {
        const poster = await extractPoster(`/api/play?file=${encodeURIComponent(data.path)}`)
        if (poster) {
          const posterFile = new File([poster], 'poster.jpg', { type: 'image/jpeg' })
          const posterData = await uploadFile(posterFile)
          if (posterData.url) {
            if (await isImageBright(posterData.url)) {
              setPoster(posterData.url)
              setPosterAuto(true)
              toast('کاور ویدیو به‌صورت خودکار ساخته شد', 'success')
            } else {
              toast('کاور خودکار خیلی تیره بود؛ پس از افزودن، پوستر را جداگانه تنظیم کنید', 'warning')
            }
          }
        } else {
          toast('کاور خودکار برای این ویدیو ساخته نشد؛ پوستر را جداگانه انتخاب کنید', 'info')
        }
      } catch {
        toast('کاور خودکار ساخته نشد؛ پوستر را جداگانه انتخاب کنید', 'info')
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'خطا در ارتباط با سرور', 'error')
    } finally {
      setPickingVideo(false)
    }
  }

  const pickTMDB = (item: TMDBItem) => {
    const t = item.title || item.name || ''
    setTitle(t)
    setPoster(item.poster_path || null)
    setPosterAuto(false)
    setTmdbId(item.id)
    const mt = item.media_type || (item.title ? 'movie' : 'tv')
    setMediaType(mt)
    setCategory(mt === 'tv' ? 'series' : 'movie')
    setGenres(item.genre_ids || null)
    setRating(item.vote_average || null)
    setReleaseDate(item.release_date || item.first_air_date || null)
    setOverview(item.overview || null)
    setTQuery('')
    setTResults([])
  }

  const searchTMDB = async (q: string) => {
    if (!q.trim()) {
      setTResults([])
      setTError('')
      return
    }
    setTLoading(true)
    setTError('')
    try {
      const key = getStoredApiKey()
      const url = `/api/tmdb?action=search&query=${encodeURIComponent(q)}&type=multi${key ? `&apiKey=${encodeURIComponent(key)}` : ''}`
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'خطا')
      setTResults(data.results?.slice(0, 8) || [])
    } catch (e) {
      setTResults([])
      setTError(e instanceof Error ? e.message : 'خطا در جستجو')
    } finally {
      setTLoading(false)
    }
  }

  const handleTMDBInput = (v: string) => {
    setTQuery(v)
    if (tDebounce.current) clearTimeout(tDebounce.current)
    if (v.trim()) {
      tDebounce.current = setTimeout(() => searchTMDB(v), 400)
    } else {
      setTResults([])
      setTError('')
    }
  }

  const uploadPoster = async (input: HTMLInputElement) => {
    const f = input.files?.[0]
    if (!f) return
    setPosterUploading(true)
    try {
      const data = await uploadFile(f)
      if (!(await isImageBright(data.url))) {
        toast('این تصویر تقریباً سیاه است؛ پوستر دیگری انتخاب یا آپلود کنید', 'error')
        return
      }
      setPoster(data.url)
      setPosterAuto(false)
      toast('پوستر آپلود شد', 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'خطا در آپلود پوستر', 'error')
    } finally {
      setPosterUploading(false)
      input.value = ''
    }
  }

  const applyPosterUrl = async () => {
    const url = posterUrlInput.trim()
    if (!url) return
    setPosterUploading(true)
    try {
      let target = url
      if (!url.startsWith('/api/uploads/')) {
        target = await saveImageUrl(url)
      }
      if (!(await isImageBright(target))) {
        toast('این تصویر تقریباً سیاه است یا در دسترس نیست؛ پوستر دیگری انتخاب کنید', 'error')
        return
      }
      setPoster(target)
      setPosterAuto(false)
      setPosterUrlInput('')
      setShowUrlInput(false)
      toast('پوستر دریافت و به‌صورت دائمی ذخیره شد', 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'خطا در دریافت پوستر', 'error')
    } finally {
      setPosterUploading(false)
    }
  }

  const handleSave = async () => {
    if (!videoUrl) {
      toast('ابتدا ویدیو را انتخاب کنید', 'warning')
      return
    }
    if (!title.trim()) {
      toast('نام فیلم را وارد کنید', 'warning')
      return
    }
    setSaving(true)
    try {
      const sep = Math.max(videoUrl.lastIndexOf('/'), videoUrl.lastIndexOf('\\'))
      const dir = sep > 0 ? videoUrl.slice(0, sep) : null
      const res = await fetch('/api/import-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: [{
            path: videoUrl,
            name: videoFileName,
            size: videoSize,
            dir,
            title: title.trim(),
            poster,
            tmdbId,
            mediaType,
            category,
            overview,
            genres,
            rating,
            releaseDate
          }],
          withMedia: true
        })
      })
      const data = await res.json()
      if (res.ok) {
        onSaved(data)
        onClose()
      } else {
        toast(data.error || 'خطا در ذخیره', 'error')
      }
    } catch {
      toast('خطا در ارتباط با سرور', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl glass-card animate-fade-in flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Film className="w-6 h-6 text-pink-400" />
            افزودن فیلم
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Video file — same as edits gallery */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <FileVideo className="w-4 h-4 text-violet-400" />
              انتخاب ویدیو از کامپیوتر
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handlePickVideo}
                disabled={pickingVideo}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg text-white font-medium hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pickingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {pickingVideo ? 'منتظر انتخاب فایل...' : 'انتخاب فایل ویدیو'}
              </button>
              {videoUrl && (
                <span className="text-sm text-green-400 flex items-center gap-1">
                  <Check className="w-4 h-4" /> {videoFileName}
                </span>
              )}
            </div>
            {!videoUrl && !pickingVideo && (
              <p className="text-xs text-gray-500 mt-2">دیالوگ ویندوز باز می‌شود؛ فایل در مسیر اصلی خودش می‌ماند و فقط مسیرش ذخیره می‌شود (بدون کپی)</p>
            )}
          </div>

          {/* Title */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">نام فیلم</h3>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="نام فیلم را وارد کنید..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Poster */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-pink-400" />
              پوستر {posterAuto && <span className="text-xs font-normal text-emerald-400">(خودکار از ویدیو)</span>}
            </h3>

            <div className="flex gap-4">
              <div className="w-32 h-48 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 relative">
                <img
                  src={getPosterURL(poster, 'w300')}
                  alt="پوستر"
                  onError={(e) => { e.currentTarget.src = '/placeholder-poster.svg' }}
                  className="w-full h-full object-cover"
                />
                {poster && (
                  <button
                    onClick={() => { setPoster(null); setPosterAuto(false) }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-red-400 hover:bg-black/80 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => posterInputRef.current?.click()}
                    disabled={posterUploading}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20 transition-colors disabled:opacity-50"
                  >
                    {posterUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    آپلود پوستر
                  </button>
                  <button
                    onClick={() => setShowUrlInput((v) => !v)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20 transition-colors"
                  >
                    <LinkIcon className="w-4 h-4" />
                    لینک پوستر
                  </button>
                  <input
                    ref={posterInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => uploadPoster(e.target)}
                  />
                </div>

                {showUrlInput && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={posterUrlInput}
                      onChange={(e) => setPosterUrlInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') applyPosterUrl() }}
                      placeholder="https://... یا /api/uploads/..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500"
                    />
                    <button
                      onClick={applyPosterUrl}
                      className="px-3 py-2 bg-violet-500 rounded-lg text-white text-sm hover:bg-violet-600 transition-colors"
                    >
                      اعمال
                    </button>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="w-4 h-4 text-violet-400" />
                    <input
                      type="text"
                      value={tQuery}
                      onChange={(e) => handleTMDBInput(e.target.value)}
                      placeholder="جستجوی پوستر در TMDB..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500"
                    />
                    {tLoading && <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />}
                  </div>
                  {tError && <p className="text-xs text-red-400 mb-2">{tError}</p>}
                  {tResults.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 max-h-44 overflow-y-auto">
                      {tResults.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => pickTMDB(item)}
                          className="group relative rounded-lg overflow-hidden bg-white/5 hover:ring-2 hover:ring-violet-500 transition-all"
                        >
                          <img
                            src={getPosterURL(item.poster_path || null, 'w200')}
                            alt={item.title || item.name || ''}
                            onError={(e) => { e.currentTarget.src = '/placeholder-poster.svg' }}
                            className="w-full aspect-[2/3] object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                            <span className="text-[10px] text-white truncate">{item.title || item.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/10 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {videoUrl ? `${videoFileName} · ${title.trim() || 'بدون نام'}` : 'ویدیویی انتخاب نشده'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 rounded-lg text-white font-medium hover:bg-white/20 transition-colors"
            >
              انصراف
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !videoUrl || !title.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-l from-violet-500 to-pink-500 rounded-lg font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              افزودن فیلم
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}