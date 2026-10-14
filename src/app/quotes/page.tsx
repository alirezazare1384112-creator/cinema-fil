'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Quote, Plus, Film, Dice5, Upload, LinkIcon, X, Loader2, Copy, Check } from 'lucide-react'
import QuoteCard from '@/components/QuoteCard'
import { getBackdropURL } from '@/lib/tmdb'
import { sharedJson } from '@/lib/api-cache'
import { uploadFile } from '@/lib/uploadFile'
import type { Quote as QuoteData, Media } from '@/types'

const quoteTitle = (quote: QuoteData) => quote.media?.title || quote.movieTitle || 'بدون نام'

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteData[]>([])
  const [media, setMedia] = useState<Media[]>([])
  const [featured, setFeatured] = useState<QuoteData | null>(null)
  const [isAddingQuote, setIsAddingQuote] = useState(false)
  const [movieInput, setMovieInput] = useState('')
  const [backgroundUploading, setBackgroundUploading] = useState(false)
  const [backgroundProgress, setBackgroundProgress] = useState(0)
  const [showBackdropUrl, setShowBackdropUrl] = useState(false)
  const [featuredCopied, setFeaturedCopied] = useState(false)
  const backdropInputRef = useRef<HTMLInputElement>(null)
  const featuredCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [newQuote, setNewQuote] = useState({
    quoteText: '',
    character: '',
    scene: '',
    backdropUrl: '',
    gifUrl: ''
  })

  // تعریف fetchQuotes و fetchMedia قبل از useEffect — برای جلوگیری از TDZ
  const fetchQuotes = useCallback(async () => {
    try {
      const response = await fetch('/api/quotes')
      const data = await response.json()
      setQuotes(data)
    } catch (error) {
      console.error('Error fetching quotes:', error)
    }
  }, [])

  const fetchMedia = useCallback(async () => {
    try {
      const data = (await sharedJson<Media[]>('/api/media')) || []
      setMedia(data)
    } catch (error) {
      console.error('Error fetching media:', error)
    }
  }, [])

  useEffect(() => {
    void fetchQuotes()
    void fetchMedia()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAddQuote = async () => {
    const name = movieInput.trim()
    if (!name || !newQuote.quoteText.trim()) return

    const match = media.find((m) => m.title?.trim().toLowerCase() === name.toLowerCase())

    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: match ? match.id : undefined,
          movieTitle: match ? undefined : name,
          quoteText: newQuote.quoteText,
          character: newQuote.character || null,
          scene: newQuote.scene || null,
          backdropUrl: newQuote.backdropUrl || null,
          gifUrl: newQuote.gifUrl || null
        })
      })

      const quote = await response.json()
      setQuotes((prev) => [quote, ...prev])
      resetNewQuote()
      setIsAddingQuote(false)
    } catch (error) {
      console.error('Error adding quote:', error)
    }
  }

  const handleUpdateQuote = useCallback(async (id: string, data: Partial<QuoteData>) => {
    try {
      const response = await fetch('/api/quotes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data })
      })

      const updated = await response.json()
      setQuotes((prev) =>
        prev.map((q) => (q.id === id ? { ...q, ...updated } : q))
      )
    } catch (error) {
      console.error('Error updating quote:', error)
    }
  }, [])

  const handleDeleteQuote = useCallback(async (id: string) => {
    try {
      await fetch(`/api/quotes?id=${id}`, { method: 'DELETE' })
      setQuotes((prev) => prev.filter((q) => q.id !== id))
    } catch (error) {
      console.error('Error deleting quote:', error)
    }
  }, [])

  const handleCopyFeatured = async () => {
    if (!featured) return
    try {
      await navigator.clipboard.writeText(featured.quoteText)
      setFeaturedCopied(true)
      if (featuredCopyTimer.current) clearTimeout(featuredCopyTimer.current)
      featuredCopyTimer.current = setTimeout(() => setFeaturedCopied(false), 1500)
    } catch { /* ignore */ }
  }

  const handleUploadBackground = async (input: HTMLInputElement) => {
    const file = input.files?.[0]
    if (!file) return
    setBackgroundUploading(true)
    setBackgroundProgress(0)
    try {
      const { url } = await uploadFile(file, { onProgress: setBackgroundProgress })
      setNewQuote((prev) => ({ ...prev, backdropUrl: url, gifUrl: '' }))
    } catch (error) {
      console.error('Error uploading quote image:', error)
    } finally {
      setBackgroundUploading(false)
      setBackgroundProgress(0)
      input.value = ''
    }
  }

  const resetNewQuote = () => {
    setNewQuote({ quoteText: '', character: '', scene: '', backdropUrl: '', gifUrl: '' })
    setMovieInput('')
    setShowBackdropUrl(false)
  }

  const movieCount = useMemo(() => {
    const names = new Set<string>()
    for (const q of quotes) names.add(quoteTitle(q).trim().toLowerCase())
    return names.size
  }, [quotes])

  const groupedQuotes = useMemo(() => {
    const grouped: Record<string, QuoteData[]> = {}
    for (const quote of quotes) {
      const key = quoteTitle(quote).trim().toLowerCase()
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(quote)
    }
    return grouped
  }, [quotes])

  const movieSuggestionTitles = useMemo(() => {
    const titles = new Set<string>()
    media.forEach((m) => m.title && titles.add(m.title))
    quotes.forEach((q) => q.movieTitle && titles.add(q.movieTitle))
    return Array.from(titles)
  }, [media, quotes])

  useEffect(() => {
    if (quotes.length > 0) {
      setFeatured(quotes[Math.floor(Math.random() * quotes.length)])
    } else {
      setFeatured(null)
    }
  }, [quotes])

  const pickRandom = () => {
    if (quotes.length === 0) return
    let next = featured
    if (quotes.length > 1) {
      while (next === featured) {
        next = quotes[Math.floor(Math.random() * quotes.length)]
      }
    }
    setFeatured(next)
  }

  return (
    <div className="p-8">
      <div className="pointer-events-none fixed -top-40 -right-40 w-96 h-96 rounded-full bg-violet-600/10 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 -left-40 w-96 h-96 rounded-full bg-pink-600/10 blur-3xl" />

      <div className="relative mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 shadow-lg">
              <Quote className="w-6 h-6 text-white" />
            </span>
            جمع‌کننده نقل‌قول‌ها
          </h1>
          <p className="text-gray-400">ذخیره دیالوگ‌های به یاد ماندنی و صحنه‌های نمادین</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="px-3 py-1.5 rounded-full bg-white/5 text-gray-300 text-sm flex items-center gap-1.5">
              <Quote className="w-3.5 h-3.5 text-violet-400" />
              {quotes.length} نقل‌قول
            </span>
            <span className="px-3 py-1.5 rounded-full bg-white/5 text-gray-300 text-sm flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-pink-400" />
              {movieCount} فیلم
            </span>
          </div>
        </div>

      <button
        onClick={() => setIsAddingQuote(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-l from-violet-500 to-pink-500 rounded-lg font-medium text-white hover:opacity-90 transition-opacity shadow-lg"
      >
        <Plus className="w-4 h-4" />
        افزودن نقل‌قول
      </button>
    </div>

    {featured && (
      <div className="relative mb-10 rounded-3xl overflow-hidden glass-card animate-fade-in">
        {featured.backdropUrl && (
          <img
            src={getBackdropURL(featured.backdropUrl, 'w1280')}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-40" loading="lazy" />
        )}
        {featured.gifUrl && !featured.backdropUrl && (
          <img
            src={featured.gifUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30" loading="lazy" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-[#0a0a0f]/80 to-[#0a0a0f]" />
        <Quote className="absolute -top-6 -right-6 w-40 h-40 text-white/5" />

        <div className="relative p-10 md:p-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/20 text-violet-300 text-xs font-medium tracking-widest backdrop-blur-sm">
            <Quote className="w-3.5 h-3.5" />
            نقل‌قول برگزیده
          </div>
          <blockquote className="mt-8 text-2xl md:text-4xl text-white font-semibold leading-loose max-w-4xl mx-auto">
            «{featured.quoteText}»
          </blockquote>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
            {featured.character && (
              <span className="px-3.5 py-1.5 rounded-full bg-white/10 text-violet-200 font-medium">— {featured.character}</span>
            )}
            <span className="px-3.5 py-1.5 rounded-full bg-white/5 text-gray-300">از {quoteTitle(featured)}</span>
          </div>
          <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={pickRandom}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-l from-violet-500 to-pink-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Dice5 className="w-4 h-4" /> نقل‌قول تصادفی
            </button>
            <button
              onClick={handleCopyFeatured}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 rounded-xl text-white text-sm font-medium hover:bg-white/20 transition-colors"
            >
              {featuredCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {featuredCopied ? 'کپی شد' : 'کپی نقل‌قول'}
            </button>
          </div>
        </div>
      </div>
    )}

    {isAddingQuote && (
        <div className="glass-card p-6 mb-8 animate-fade-in">
          <h3 className="text-lg font-medium text-white mb-4">افزودن نقل‌قول جدید</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-2">نام فیلم *</label>
              <input
                type="text"
                list="movie-suggestions"
                value={movieInput}
                onChange={(e) => setMovieInput(e.target.value)}
                placeholder="نام فیلم را بنویسید یا از پیشنهادها انتخاب کنید..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
              <datalist id="movie-suggestions">
                {movieSuggestionTitles.map((title) => (
                  <option key={title} value={title} />
                ))}
              </datalist>
              <p className="text-xs text-gray-500 mt-1">اگر فیلم در کتابخانه باشد به آن متصل می‌شود، وگرنه فقط با همین نام ذخیره می‌شود — برای همان فیلم می‌توانید چند نقل‌قول بسازید.</p>
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-2">متن نقل‌قول *</label>
              <textarea
                value={newQuote.quoteText}
                onChange={(e) => setNewQuote({ ...newQuote, quoteText: e.target.value })}
                rows={3}
                placeholder="نقل‌قول را وارد کنید..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">شخصیت</label>
              <input
                type="text"
                value={newQuote.character}
                onChange={(e) => setNewQuote({ ...newQuote, character: e.target.value })}
                placeholder="چه کسی گفته؟"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">صحنه</label>
              <input
                type="text"
                value={newQuote.scene}
                onChange={(e) => setNewQuote({ ...newQuote, scene: e.target.value })}
                placeholder="زمینه صحنه..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">عکس صحنه</label>
              <div className="flex items-start gap-3">
                {newQuote.backdropUrl || newQuote.gifUrl ? (
                  <div className="relative shrink-0">
                    <img
                      src={newQuote.gifUrl && !newQuote.backdropUrl ? newQuote.gifUrl : getBackdropURL(newQuote.backdropUrl, 'w300')}
                      alt=""
                      className="w-28 h-20 rounded-lg object-cover" loading="lazy" />
                    <button
                      onClick={() => setNewQuote((p) => ({ ...p, backdropUrl: '', gifUrl: '' }))}
                      className="absolute -top-1.5 -left-1.5 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-28 h-20 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 text-xs shrink-0">
                    {backgroundUploading ? `${backgroundProgress}%` : 'بدون عکس'}
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => backdropInputRef.current?.click()}
                      disabled={backgroundUploading}
                      className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20 transition-colors disabled:opacity-50"
                    >
                      {backgroundUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      آپلود عکس
                    </button>
                    <button
                      onClick={() => setShowBackdropUrl((v) => !v)}
                      className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20 transition-colors"
                    >
                      <LinkIcon className="w-4 h-4" />
                      لینک عکس
                    </button>
                    <input
                      ref={backdropInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadBackground(e.target)}
                    />
                  </div>
                  {backgroundUploading && (
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all"
                        style={{ width: `${Math.max(backgroundProgress, 2)}%` }}
                      />
                    </div>
                  )}
                  {showBackdropUrl && (
                    <input
                      type="text"
                      value={newQuote.backdropUrl}
                      onChange={(e) => setNewQuote({ ...newQuote, backdropUrl: e.target.value, gifUrl: '' })}
                      placeholder="https://... یا /api/uploads/..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500"
                    />
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">لینک GIF</label>
              <input
                type="text"
                value={newQuote.gifUrl}
                onChange={(e) => setNewQuote({ ...newQuote, gifUrl: e.target.value })}
                placeholder="اختیاری..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAddQuote}
              className="px-4 py-2 bg-violet-500 rounded-lg text-white font-medium hover:bg-violet-600 transition-colors"
            >
              افزودن نقل‌قول
            </button>
            <button
              onClick={() => { setIsAddingQuote(false); resetNewQuote(); }}
              className="px-4 py-2 bg-white/10 rounded-lg text-white font-medium hover:bg-white/20 transition-colors"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      {quotes.length === 0 ? (
        <div className="relative text-center py-24">
          <Quote className="absolute -top-2 left-1/2 -translate-x-1/2 w-40 h-40 text-white/5" />
          <Quote className="w-14 h-14 text-violet-500/60 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-300 mb-2">هنوز نقل‌قولی ذخیره نشده</h3>
          <p className="text-gray-500 mb-6">شروع به ذخیره دیالوگ‌های به یاد ماندنی از فیلم‌ها و سریال‌های مورد علاقه خود کنید</p>
          <button
            onClick={() => setIsAddingQuote(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-l from-violet-500 to-pink-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> اولین نقل‌قول را اضافه کن
          </button>
        </div>
      ) : (
        <div className="space-y-14">
          {Object.entries(groupedQuotes).map(([key, mediaQuotes]) => {
            const firstQuote = mediaQuotes[0]
            return (
              <section key={key}>
                <div className="flex items-center gap-4 mb-8">
                  {firstQuote.media?.posterPath ? (
                    <img
                      src={getBackdropURL(firstQuote.media.posterPath, 'w300')}
                      alt=""
                      className="w-12 h-16 rounded-lg object-cover shadow-lg ring-1 ring-white/10"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-violet-600/40 to-pink-600/40 flex items-center justify-center">
                      <Film className="w-5 h-5 text-violet-300" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-white">{quoteTitle(firstQuote)}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{mediaQuotes.length} نقل‌قول</p>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-l from-white/10 to-transparent hidden md:block" />
                </div>
                <div className="columns-1 md:columns-2 xl:columns-3 gap-6">
                  {mediaQuotes.map((quote, index) => (
                    <QuoteCard
                      key={quote.id}
                      quote={quote}
                      index={index}
                      onUpdate={handleUpdateQuote}
                      onDelete={handleDeleteQuote}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}