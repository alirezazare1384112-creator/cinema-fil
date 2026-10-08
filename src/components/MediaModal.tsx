'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Star, Clock, Eye, Play, Save, FileVideo, Quote, HardDrive, Upload, Link as LinkIcon, Loader2 } from 'lucide-react'
import { getBackdropURL, getPosterURL, genreNames } from '@/lib/tmdb'
import { uploadFile, saveImageUrl, isImageBright } from '@/lib/uploadFile'
import type { Media } from '@/types'
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

  const [playingFile, setPlayingFile] = useState<string | null>(null)

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
      else toast('فیلم در حال پخش است', 'success')
    } catch {
      toast('خطا در ارسال درخواست', 'error')
    } finally {
      setPlayingFile(null)
    }
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media])

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

      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl glass-card animate-fade-in">
        <div className="relative h-64 md:h-80">
          <img
            src={getBackdropURL(media.backdropPath ?? null)}
            alt={title}
            className="w-full h-full object-cover"
          />
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
              className="w-24 h-36 rounded-lg object-cover shadow-xl"
            />
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
            </div>
          </div>
        </div>

        <div className="p-6">
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
              onClick={() => setActiveTab('edits')}
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
            <div className="text-center py-12">
              <FileVideo className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">هنوز ویرایش یا فن‌آرتی اضافه نشده</p>
              <p className="text-sm text-gray-500 mt-2">کلیپ‌ها و ویرایش‌ها را به این رسانه اضافه کنید</p>
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
              {localLoading ? (
                <p className="text-center text-gray-400 py-8">در حال بارگذاری...</p>
              ) : localFiles.length === 0 ? (
                <div className="text-center py-12">
                  <HardDrive className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">فایل محلی برای این رسانه یافت نشد</p>
                  <p className="text-sm text-gray-500 mt-2">از بخش «فیلم‌های لپتاپ» فایلی را به این رسانه پیوند دهید</p>
                </div>
              ) : (
                localFiles.map((f) => (
                  <div key={f.id} className="flex items-center gap-4 p-4 rounded-lg bg-white/5">
                    {f.poster || (media?.posterPath ? getPosterURL(media.posterPath, 'w500') : null) ? (
                      <img src={f.poster || (media?.posterPath ? getPosterURL(media.posterPath, 'w500') : '')} alt="" className="w-12 h-16 object-cover rounded-lg shrink-0" />
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
        </div>
      </div>
    </div>
  )
}