'use client'

import { memo, useState, useRef } from 'react'
import { Quote, Copy, Check, Edit, Trash2, MoreVertical, Upload, X, Loader2 } from 'lucide-react'
import { getBackdropURL } from '@/lib/tmdb'
import { uploadFile } from '@/lib/uploadFile'
import type { Quote as QuoteData } from '@/types'

interface QuoteCardProps {
  quote: QuoteData
  onUpdate: (id: string, data: Partial<QuoteData>) => void
  onDelete: (id: string) => void
  index?: number
}

const quoteImage = (quote: QuoteData) =>
  quote.backdropUrl ? getBackdropURL(quote.backdropUrl, 'w780') : quote.gifUrl || null

function QuoteCard({ quote, onUpdate, onDelete, index = 0 }: QuoteCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editText, setEditText] = useState(quote.quoteText)
  const [editCharacter, setEditCharacter] = useState(quote.character || '')
  const [editScene, setEditScene] = useState(quote.scene || '')
  const [editImage, setEditImage] = useState(quote.backdropUrl || quote.gifUrl || '')
  const [uploading, setUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSave = () => {
    onUpdate(quote.id, {
      quoteText: editText,
      character: editCharacter,
      scene: editScene,
      backdropUrl: editImage || null,
      gifUrl: null
    } as Partial<QuoteData>)
    setIsEditing(false)
  }

  const handleUploadImage = async (input: HTMLInputElement) => {
    const file = input.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadFile(file)
      setEditImage(url)
    } catch (error) {
      console.error('Error uploading quote image:', error)
    } finally {
      setUploading(false)
      input.value = ''
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(quote.quoteText)
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  const image = quoteImage(quote)

  if (isEditing) {
    return (
      <div className="glass-card p-6 animate-fade-in mb-6 break-inside-avoid" style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-white">ویرایش نقل‌قول</h4>
          <Quote className="w-6 h-6 text-violet-400/70" />
        </div>
        <div className="space-y-4 text-right">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={editCharacter}
              onChange={(e) => setEditCharacter(e.target.value)}
              placeholder="نام شخصیت"
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
            <input
              type="text"
              value={editScene}
              onChange={(e) => setEditScene(e.target.value)}
              placeholder="صحنه"
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">عکس صحنه</label>
            <div className="flex items-center gap-3 flex-wrap">
              {editImage ? (
                <div className="relative">
                  <img
                    src={getBackdropURL(editImage, 'w300')}
                    alt=""
                    className="w-28 h-20 rounded-lg object-cover"
                    onError={(e) => { e.currentTarget.src = '/placeholder-poster.svg' }}
                  />
                  <button
                    onClick={() => setEditImage('')}
                    className="absolute -top-1.5 -left-1.5 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-28 h-20 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 text-xs">
                  بدون عکس
                </div>
              )}
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                آپلود عکس
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadImage(e.target)}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-violet-500 rounded-lg text-white text-sm font-medium hover:bg-violet-600 transition-colors"
            >
              ذخیره
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-white/10 rounded-lg text-white text-sm font-medium hover:bg-white/20 transition-colors"
            >
              انصراف
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="glass-card overflow-hidden group animate-fade-in relative flex flex-col mb-6 break-inside-avoid"
      style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
    >
      <div className={`relative overflow-hidden ${image ? 'h-52' : 'h-32'} shrink-0`}>
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/40 via-fuchsia-600/25 to-transparent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/30 to-transparent" />

        <div className="absolute top-3 right-3 flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-[11px] text-gray-200 flex items-center gap-1">
            <Quote className="w-3 h-3 text-violet-400" />
            از {quote.media?.title || quote.movieTitle || 'ناشناس'}
          </span>
        </div>

        <button
          onClick={handleCopy}
          title="کپی نقل‌قول"
          className="absolute top-3 left-16 p-2 rounded-full bg-black/50 backdrop-blur-sm text-gray-300 hover:text-white hover:bg-black/70 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>

        <button
          onClick={() => setShowMenu(!showMenu)}
          className="absolute top-3 left-3 p-2 rounded-full bg-black/50 backdrop-blur-sm text-gray-300 hover:text-white hover:bg-black/70 transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {showMenu && (
          <div className="absolute top-14 left-3 w-40 glass-card p-2 z-10 animate-fade-in">
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'کپی شد' : 'کپی'}
            </button>
            <button
              onClick={() => {
                setIsEditing(true)
                setShowMenu(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
              ویرایش
            </button>
            <hr className="my-2 border-white/10" />
            <button
              onClick={() => {
                onDelete(quote.id)
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

      <div className="relative px-7 pb-7 pt-3 grow">
        <div className="absolute -top-8 right-7 w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg ring-4 ring-[#0a0a0f]">
          <Quote className="w-5 h-5 text-white" />
        </div>

        <blockquote className="mt-8 text-lg md:text-xl text-white font-medium leading-loose">
          «{quote.quoteText}»
        </blockquote>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {quote.character && (
            <span className="px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-300 text-sm flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-violet-400" />
              {quote.character}
            </span>
          )}
          {quote.scene && (
            <span className="px-2.5 py-1 rounded-full bg-white/5 text-gray-400 text-xs">{quote.scene}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(QuoteCard)