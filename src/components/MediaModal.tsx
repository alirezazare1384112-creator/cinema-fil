'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Star, Clock, Eye, Play, Save, FileVideo, Quote, HardDrive, Upload, Link as LinkIcon, Loader2, Download } from 'lucide-react'
import { getBackdropURL, getPosterURL, genreNames } from '@/lib/tmdb'
import { uploadFile, saveImageUrl, isImageBright } from '@/lib/uploadFile'
import DownloadLinks from '@/components/DownloadLinks'
import Ratings from '@/components/Ratings'
import type { Media, MediaEdit } from '@/types'
import { useToast } from '@/components/Toast'

interface MediaModalProps {
  media: Media | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (id: string, data: Partial<Media>) => void
}

const watchStatusConfig = {
  watched: { label: 'مشاهده شده', color: 'bg-green-500', icon: Eye },
  plan_to_watch: { label: 'قصد تماشا', color: 'bg-blue-500', icon: Clock },
  currently_watching: { label: 'در حال تماشا', color: 'bg-yellow-500', icon: Play }
}

function parseTags(raw?: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
  } catch {
    return []
  }
}

export default function MediaModal({ media, isOpen, onClose, onUpdate }: MediaModalProps) {
  const { toast } = useToast()

  const [title, setTitle] = useState(media?.title || '')
  const [poster, setPoster] = useState<string | null>(media?.posterPath || null)
  const [userRating, setUserRating] = useState(media?.userRating || 0)
  const [watchStatus, setWatchStatus] = useState(media?.watchStatus || 'plan_to_watch')
  const [personalReview, setPersonalReview] = useState(media?.personalReview || '')
  const [notes, setNotes] = useState(media?.notes || '')

  const [activeTab, setActiveTab] = useState<'details' | 'edits' | 'quotes' | 'files'>('details')
  const [localFiles, setLocalFiles] = useState<{ id: string; filePath: string; fileName: string; folderPath: string | null; poster: string | null }[]>([])
  const [localLoading, setLocalLoading] = useState(false)

  const [posterUploading, setPosterUploading] = useState(false)
  const [posterUrlInput, setPosterUrlInput] = useState('')
  const [showPosterUrl, setShowPosterUrl] = useState(false)

  // لینک‌های دانلود/زیرنویس/تریلر از سایت فیلم (وقتی فایل محلی نداریم)
  const [links, setLinks] = useState<{
    downloads?: { group: string; quality: string; url: string }[]
    subtitles?: { label: string; url: string }[]
    trailer?: string | null
  } | null>(null)
  const [linksLoading, setLinksLoading] = useState(false)
  const [linksError, setLinksError] = useState('')
  const posterInputRef = useRef<HTMLInputElement>(null)

  // شمارهٔ درخواست تا جوابِ دیررسیدهٔ فیلمِ قبلی، روی فیلمِ جدید اعمال نشود
  const filesTokenRef = useRef(0)
  // آخرین رسانه‌ای که فهرست فایل‌هایش کامل گرفته شده → جلوگیری از درخواست تکراری
  const filesLoadedIdRef = useRef<string | null>(null)

  const fetchLocalFiles = useCallback(async (force = false) => {
    if (!media) return
    if (!force && filesLoadedIdRef.current === media.id) return
    const token = ++filesTokenRef.current
    setLocalLoading(true)
    try {
      const res = await fetch(`/api/local-files?mediaId=${media.id}`)
      const data = await res.json()
      if (filesTokenRef.current !== token) return
      setLocalFiles(Array.isArray(data) ? data : [])
      filesLoadedIdRef.current = media.id
    } catch {
      if (filesTokenRef.current !== token) return
      setLocalFiles([])
      filesLoadedIdRef.current = null
    } finally {
      if (filesTokenRef.current === token) setLocalLoading(false)
    }
  }, [media])

  /* ---------- ویرایش‌ها / فن‌آرت‌های همین فیلم ---------- */
  const [mediaEdits, setMediaEdits] = useState<MediaEdit[]>([])
  const [editsLoading, setEditsLoading] = useState(false)
  const editsTokenRef = useRef(0)
  const editsLoadedIdRef = useRef<string | null>(null)

  const fetchMediaEdits = useCallback(async (force = false) => {
    if (!media) return
    if (!force && editsLoadedIdRef.current === media.id) return
    const token = ++editsTokenRef.current
    setEditsLoading(true)
    try {
      const res = await fetch(`/api/edits?mediaId=${media.id}`)
      const data = await res.json()
      if (editsTokenRef.current !== token) return
      setMediaEdits(Array.isArray(data) ? data : [])
      editsLoadedIdRef.current = media.id
    } catch {
      if (editsTokenRef.current !== token) return
      setMediaEdits([])
      editsLoadedIdRef.current = null
    } finally {
      if (editsTokenRef.current === token) setEditsLoading(false)
    }
  }, [media])

  const [playingFile, setPlayingFile] = useState<string | null>(null)

  // وقتی کاربر روی لینک دانلود کلیک می‌کند — برای نشان دادنِ «پیوند دادنِ فایل دانلودشده»
  const [downloadStarted, setDownloadStarted] = useState<{ quality: string; url: string } | null>(null)
  const [linkingFile, setLinkingFile] = useState(false)

  const handlePlayExternal = async (filePath: string) => {
    if (playingFile) return
    setPlayingFile(filePath)
    try {
      const res = await fetch('/api/play-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) toast(data.error || 'نمی‌توان پخش‌کننده را باز کرد', 'error')
      else if (data.url) toast('لینک در مرورگر پیش‌فرض باز شد', 'success')
      else toast('فیلم در حال پخش است', 'success')
    } catch {
      toast('خطا در ارسال درخواست', 'error')
    } finally {
      setPlayingFile(null)
    }
  }

  /** باز کردن پنجرهٔ انتخاب فایل (ویندوز) و پیوند دادن فایل به این رسانه */
  const handlePickAndLinkFile = async (): Promise<void> => {
    if (linkingFile) return
    if (!media) return
    setLinkingFile(true)
    try {
      // ۱) باز کردن پنجرهٔ انتخاب فایل
      const pickRes = await fetch('/api/pick-file', { method: 'POST' })
      const pick = await pickRes.json().catch(() => null)
      if (!pickRes.ok) {
        toast(pick?.error || 'باز کردن پنجرهٔ انتخاب فایل ناموفق بود', 'error')
        return
      }
      if (pick.canceled) {
        // کاربر لغو کرد — بدون پیام
        return
      }
      if (!pick?.path) {
        toast('فایلی انتخاب نشد', 'error')
        return
      }

      // ۲) ساخت LocalFile پیوند‌خورده با media.id
      const createRes = await fetch('/api/local-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: media.id,
          filePath: pick.path,
          fileName: pick.name,
          folderPath: pick.dir,
          fileSize: pick.size ? String(pick.size) : null,
          // فرض می‌کنیم کاربر فایل ویدیوییِ درست انتخاب کرده — پس category رو هم تنظیم کن
          category: media.category || (media.mediaType === 'tv' ? 'series' : 'movie')
        })
      })
      const created = await createRes.json().catch(() => null)
      if (!createRes.ok) {
        toast(created?.error || 'ذخیرهٔ فایل ناموفق بود', 'error')
        return
      }

      toast(`فایل «${pick.name}» به «${media.title}» پیوند داده شد`, 'success')
      setDownloadStarted(null)
      // ۳) رفرش لیست فایل‌ها
      void fetchLocalFiles(true)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'خطا در پیوند دادن فایل', 'error')
    } finally {
      setLinkingFile(false)
    }
  }

  /** وقتی کاربر روی لینک دانلود کلیک می‌کند */
  const handleDownloadStart = (_url: string, quality: string): void => {
    setDownloadStarted({ quality, url: _url })
  }

  const handleUpdateLocalFile = async (id: string, data: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/local-files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data })
      })
      const updated = await res.json()
      setLocalFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updated } : f)))
    } catch { }
  }

  useEffect(() => {
    if (media) {
      setTitle(media.title)
      setPoster(media.posterPath || null)
      setUserRating(media.userRating || 0)
      setWatchStatus(media.watchStatus)
      setPersonalReview(media.personalReview || '')
      setNotes(media.notes || '')
      setPosterUrlInput('')
      setShowPosterUrl(false)
      // فیلمِ قبلی را کنار بگذار و فوراً فایل‌های همین رسانه را بگیر
      // تا دکمهٔ پخش هیچ‌وقت مسیر فیلم قبلی را نفرستد
      filesTokenRef.current++
      filesLoadedIdRef.current = null
      setLocalFiles([])
      void fetchLocalFiles(true)
      // ویرایش‌های همین فیلم (تطبیق با پوشهٔ هم‌نام در سرور انجام می‌شود)
      editsTokenRef.current++
      editsLoadedIdRef.current = null
      setMediaEdits([])
      void fetchMediaEdits(true)
      // لینک‌های دانلودِ رسانهٔ قبلی را نگه ندار
      setLinks(null)
      setLinksError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media])

  /** دریافت لینک‌های دانلود/زیرنویس/تریلر این رسانه از سایت فیلم */
  const loadLinks = async () => {
    if (!media || linksLoading) return
    setLinksLoading(true)
    setLinksError('')
    try {
      const params = new URLSearchParams()
      if (media.detailUrl) {
        params.set('detailUrl', media.detailUrl)
      } else {
        // رسانه‌های قدیمی آدرس ندارند → با عنوان + سال پیدا می‌کنیم
        params.set('title', media.title)
        params.set('year', (media.releaseDate || '').split('-')[0] || '')
        params.set('mediaType', media.mediaType || '')
      }
      const res = await fetch(`/api/f2m?action=links&${params.toString()}`)
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'لینک‌ها پیدا نشد')
      setLinks(data)
      // آدرس دقیقِ همین اثر را ذخیره کن تا دفعات بعد سریع‌تر و دقیق‌تر باشد
      if (!media.detailUrl && data.detailUrl) {
        fetch('/api/media', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: media.id, detailUrl: data.detailUrl })
        }).catch(() => {})
      }
    } catch (e) {
      setLinksError(e instanceof Error ? e.message : 'دریافت لینک‌ها ناموفق بود')
    } finally {
      setLinksLoading(false)
    }
  }

  // وقتی رسانه فایل محلی ندارد، لینک‌های دانلودِ سایت فیلم را خودکار بیاور
  // (یک بار؛ بعد از آن stateها مانع تکرار می‌شوند و دکمه برای تلاش دوباره هست)
  useEffect(() => {
    if (!isOpen || !media) return
    if (localLoading || localFiles.length > 0) return
    if (links || linksLoading || linksError) return
    const timer = setTimeout(() => {
      void loadLinks()
    }, 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, media, localLoading, localFiles.length, links, linksLoading, linksError])

  if (!isOpen || !media) return null

  let genreList: (number | string)[] = []
  try {
    if (media.genres) genreList = JSON.parse(media.genres)
  } catch {
    genreList = []
  }
  const genres = genreNames(genreList)

  const status = watchStatusConfig[watchStatus as keyof typeof watchStatusConfig]

  const handleSave = () => {
    if (!title.trim()) {
      toast('نام فیلم نمی‌تواند خالی باشد', 'warning')
      return
    }
    onUpdate(media.id, {
      title: title.trim(),
      posterPath: poster,
      userRating,
      watchStatus,
      personalReview,
      notes
    } as Partial<Media>)
    toast('تغییرات ذخیره شد', 'success')
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
      onUpdate(media.id, { posterPath: data.url } as Partial<Media>)
      toast('پوستر آپلود و روی فیلم اعمال شد', 'success')
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
      setPosterUrlInput('')
      setShowPosterUrl(false)
      onUpdate(media.id, { posterPath: target } as Partial<Media>)
      toast('پوستر اعمال شد', 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'خطا در دریافت پوستر', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl glass-card animate-fade-in flex flex-col">
        <div className="relative h-64 md:h-80 shrink-0">
          <img
            src={getBackdropURL(media.backdropPath ?? null)}
            alt={title}
            className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 right-4 left-4 flex items-end gap-4">
            <img
              src={getPosterURL(poster ?? null, 'w200')}
              alt={title}
              className="w-24 h-36 rounded-lg object-cover shadow-xl" loading="lazy" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">{title || 'بدون نام'}</h2>
              <p className="text-gray-300 mt-1">{media.releaseDate}</p>
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white ${status.color} mt-2`}>
                <status.icon className="w-3 h-3" />
                {status.label}
              </div>
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {genres.map((g) => (
                    <span key={g} className="px-2 py-0.5 rounded-full bg-white/10 text-gray-300 text-[11px]">
                      {g}
                    </span>
                  ))}
                </div>
              )}
              {/* نمرات IMDb / Rotten Tomatoes / Metacritic — از OMDb با عنوان + سال */}
              <div className="mt-2">
                <Ratings
                  title={media.title}
                  year={(media.releaseDate || '').split('-')[0] || null}
                  type={media.mediaType === 'tv' || media.category === 'series' ? 'tv' : 'movie'}
                  fallbackRating={media.rating ?? null}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          <div className="flex gap-4 border-b border-white/10 mb-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === 'details'
                  ? 'text-violet-400 border-b-2 border-violet-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              جزئیات
            </button>
            <button
              onClick={() => {
                setActiveTab('edits')
                void fetchMediaEdits()
              }}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === 'edits'
                  ? 'text-violet-400 border-b-2 border-violet-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ویرایش‌ها
            </button>
            <button
              onClick={() => setActiveTab('quotes')}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === 'quotes'
                  ? 'text-violet-400 border-b-2 border-violet-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              نقل‌قول‌ها
            </button>
            <button
              onClick={() => { setActiveTab('files'); fetchLocalFiles() }}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === 'files'
                  ? 'text-violet-400 border-b-2 border-violet-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              فایل‌ها
            </button>
          </div>

          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* لینک‌های دانلود/زیرنویس/تریلر — همیشه در تب جزئیات قابل دسترس */}
              {!localLoading && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
                  {linksLoading && (
                    <p className="text-xs text-gray-400 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      در حال دریافت لینک‌های دانلود از سایت فیلم…
                    </p>
                  )}
                  {linksError && (
                    <p className="text-xs text-red-400">
                      {linksError} —{' '}
                      <button onClick={loadLinks} className="underline">
                        تلاش دوباره
                      </button>
                    </p>
                  )}
                  {localFiles.length > 0 && !links && !linksLoading && !linksError && (
                    <button
                      onClick={loadLinks}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-sm hover:bg-emerald-500/25 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      نمایش لینک‌های دانلود، زیرنویس و تریلر
                    </button>
                  )}
                  <DownloadLinks
                    downloads={links?.downloads}
                    subtitles={links?.subtitles}
                    trailer={links?.trailer}
                    title={media.title}
                    className="mt-0"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">نام فیلم</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">پوستر</label>
                  <div className="flex items-center gap-4">
                    <img
                      src={getPosterURL(poster ?? null, 'w200')}
                      alt="پوستر"
                      onError={(e) => { e.currentTarget.src = '/placeholder-poster.svg' }}
                      className="w-20 h-28 rounded-lg object-cover bg-white/5 shrink-0"
                    />
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
                          onClick={() => setShowPosterUrl((v) => !v)}
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
                      {showPosterUrl && (
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
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-gray-300 leading-relaxed">{media.overview}</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">وضعیت تماشا</label>
                  <select
                    value={watchStatus}
                    onChange={(e) => setWatchStatus(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="plan_to_watch">قصد تماشا</option>
                    <option value="watched">مشاهده شده</option>
                    <option value="currently_watching">در حال تماشا</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">امتیاز شما</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setUserRating(rating === userRating ? 0 : rating)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            rating <= userRating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">نظر شخصی</label>
                <textarea
                  value={personalReview}
                  onChange={(e) => setPersonalReview(e.target.value)}
                  rows={3}
                  placeholder="نظرات خود را بنویسید..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">یادداشت‌ها</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="یادداشت‌های سریع..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-l from-violet-500 to-pink-500 rounded-lg font-medium text-white hover:opacity-90 transition-opacity"
              >
                <Save className="w-4 h-4" />
                ذخیره تغییرات
              </button>
            </div>
          )}

          {activeTab === 'edits' && (
            <div>
              {editsLoading ? (
                <p className="text-center text-gray-400 py-8 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  در حال بارگذاری...
                </p>
              ) : mediaEdits.length === 0 ? (
                <div className="text-center py-12">
                  <FileVideo className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">هنوز ویرایش یا فن‌آرتی برای این فیلم نیست</p>
                  <p className="text-sm text-gray-500 mt-2">
                    در بخش «ویرایش‌ها» پوشه‌ای با همین نام فیلم بسازید؛ کلیپ‌هایش همین‌جا نمایش داده می‌شوند
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {mediaEdits.map((edit) => {
                    const tagsList = parseTags(edit.tags)
                    return (
                      <div
                        key={edit.id}
                        className="group rounded-lg overflow-hidden bg-white/5 hover:ring-1 hover:ring-violet-500/50 transition-all"
                      >
                        <button
                          onClick={() => handlePlayExternal(edit.videoUrl)}
                          className="relative block w-full aspect-video cursor-pointer"
                          title={`پخش «${edit.title}»`}
                        >
                          {edit.thumbnailUrl ? (
                            <img
                              src={edit.thumbnailUrl}
                              alt={edit.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center">
                              <FileVideo className="w-8 h-8 text-violet-400" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="flex items-center gap-1.5 bg-violet-500/80 rounded-full px-3 py-1.5 text-white text-sm font-medium">
                              <Play className="w-4 h-4" />
                              پخش
                            </span>
                          </div>
                        </button>
                        <div className="p-3">
                          <p className="text-white text-sm font-medium truncate" title={edit.title}>
                            {edit.title}
                          </p>
                          {edit.folder?.name && (
                            <p className="text-xs text-gray-500 truncate mt-0.5" title={edit.folder.name}>
                              پوشه: {edit.folder.name}
                            </p>
                          )}
                          {tagsList.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {tagsList.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 text-[10px]"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'quotes' && (
            <div className="text-center py-12">
              <Quote className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">هنوز نقل‌قولی ذخیره نشده</p>
              <p className="text-sm text-gray-500 mt-2">نقل‌قول‌های به یاد ماندنی از این رسانه را ذخیره کنید</p>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="space-y-3">
              {/* نوار «پیوند دادنِ فایلِ دانلودشده» — وقتی کاربر روی لینک دانلود کلیک کرده */}
              {downloadStarted && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-emerald-200 font-medium">
                        دانلود «{downloadStarted.quality}» شروع شد
                      </p>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        وقتی دانلود در مرورگر تمام شد، دکمهٔ پایین را بزن تا فایل را
                        از پوشهٔ Downloads انتخاب کنی و خودکار به این فیلم پیوند بدهیم.
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handlePickAndLinkFile}
                          disabled={linkingFile}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-l from-emerald-500 to-sky-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-wait"
                        >
                          {linkingFile ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <LinkIcon className="w-4 h-4" />
                          )}
                          {linkingFile ? 'در حال پیوند دادن…' : 'پیوند دادنِ فایل دانلودشده'}
                        </button>
                        <button
                          onClick={() => setDownloadStarted(null)}
                          disabled={linkingFile}
                          className="px-3 py-2 rounded-lg bg-white/5 text-gray-300 text-sm hover:bg-white/10 transition-colors disabled:opacity-60"
                        >
                          بستن
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* هدرِ لیست فایل‌ها + دکمهٔ افزودن فایل */}
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-violet-400" />
                  فایل‌های پیوند‌داده‌شده
                  {localFiles.length > 0 && (
                    <span className="text-gray-500 font-normal text-xs">({localFiles.length})</span>
                  )}
                </h3>
                <button
                  onClick={handlePickAndLinkFile}
                  disabled={linkingFile}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 text-sm hover:bg-violet-500/25 transition-colors disabled:opacity-60 disabled:cursor-wait shrink-0"
                  title="باز کردن پنجرهٔ انتخاب فایل (ویندوز) و پیوند دادن به این فیلم"
                >
                  {linkingFile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  افزودن فایل
                </button>
              </div>

              {localLoading ? (
                <p className="text-center text-gray-400 py-8">در حال بارگذاری...</p>
              ) : localFiles.length === 0 ? (
                <div className="text-center py-12">
                  <HardDrive className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">هنوز فایلی به این رسانه پیوند داده نشده</p>
                  <p className="text-sm text-gray-500 mt-2">
                    روی «افزودن فایل» بالا کلیک کن و فایلِ ویدیوییِ روی هاردت رو انتخاب کن
                  </p>
                  <p className="text-xs text-gray-600 mt-3">
                    یا پایین‌تر، لینکِ دانلود از سایت فیلم رو بزن — بعد از اتمام دانلود،
                    دکمهٔ «پیوند دادنِ فایل دانلودشده» ظاهر می‌شه
                  </p>
                </div>
              ) : (
                localFiles.map((f) => (
                  <div key={f.id} className="flex items-center gap-4 p-4 rounded-lg bg-white/5">
                    {f.poster || (media?.posterPath ? getPosterURL(media.posterPath, 'w500') : null) ? (
                      <img src={f.poster || (media?.posterPath ? getPosterURL(media.posterPath, 'w500') : '')} alt="" className="w-12 h-16 object-cover rounded-lg shrink-0" loading="lazy" />
                    ) : (
                      <HardDrive className="w-6 h-6 text-violet-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white truncate">{f.fileName}</p>
                      {f.folderPath && <p className="text-xs text-gray-500 truncate">{f.folderPath}</p>}
                    </div>
                    <button
                      onClick={() => handlePlayExternal(f.filePath)}
                      disabled={playingFile === f.filePath}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-l from-violet-500 to-pink-500 rounded-lg font-medium text-white hover:opacity-90 transition-opacity shrink-0 disabled:opacity-70 disabled:cursor-wait"
                    >
                      {playingFile === f.filePath ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      {playingFile === f.filePath ? 'در حال باز کردن…' : 'پخش در پلیر پیش‌فرض'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'files' && (
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between mb-3 gap-3">
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-400" />
                  لینک‌های دانلود از سایت فیلم
                </h3>
                {!links && (
                  <button
                    onClick={loadLinks}
                    disabled={linksLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-sm hover:bg-emerald-500/25 transition-colors disabled:opacity-60 disabled:cursor-wait shrink-0"
                  >
                    {linksLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {linksLoading ? 'در حال دریافت…' : 'نمایش لینک‌ها'}
                  </button>
                )}
              </div>

              {linksError && <p className="text-xs text-red-400 mb-3">{linksError}</p>}

              {!links && !linksLoading && !linksError && (
                <p className="text-[11px] text-gray-500">
                  فایلی برای این رسانه نداری؟ اینجا لینک دانلود نسخه‌ها، زیرنویس و تریلر را بگیر.
                  بعد از دانلود، خودکار به این فیلم پیوند داده می‌شه.
                </p>
              )}

              <DownloadLinks
                downloads={links?.downloads}
                subtitles={links?.subtitles}
                trailer={links?.trailer}
                title={media.title}
                className="mt-2"
                onDownloadStart={handleDownloadStart}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}