'use client'

import React from 'react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, HardDrive, Film, MoreVertical, Trash2, Link, Unlink, Folder, ImagePlus, History, Subtitles, Clapperboard, Edit, Check, X } from 'lucide-react'
import type { LocalFile } from '@/types'
import { getPosterURL } from '@/lib/tmdb'
import { uploadFile } from '@/lib/uploadFile'
import { useToast } from '@/components/Toast'

interface FileCardProps {
  file: LocalFile
  onUpdate: (id: string, data: Partial<LocalFile>) => void
  onDelete: (id: string) => void
  onPlay: (file: LocalFile) => void
}

const FileCard = React.memo(function FileCard({ file, onUpdate, onDelete, onPlay }: FileCardProps) {
  const { toast } = useToast()
  const [showMenu, setShowMenu] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [resumePos, setResumePos] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(file.fileName)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const subtitleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const pos = Number(localStorage.getItem(`cv_pos_${file.id}`))
      if (pos > 5) setResumePos(pos)
    } catch { }
  }, [file.id])

  const handleSave = async () => {
    if (editName.trim() && editName !== file.fileName) {
      await onUpdate(file.id, { fileName: editName.trim() } as Partial<LocalFile>)
    }
    setEditing(false)
  }

  const handleCancel = () => {
    setEditName(file.fileName)
    setEditing(false)
  }

  const formatFileSize = (bytes: string | null | undefined) => {
    if (!bytes) return 'نامشخص'
    const size = Number(bytes)
    if (isNaN(size)) return 'نامشخص'
    const units = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت', 'ترا بایت']
    let unitIndex = 0
    let fileSize = size

    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024
      unitIndex++
    }

    return `${fileSize.toFixed(2)} ${units[unitIndex]}`
  }

  const getFormatIcon = (format: string | null) => {
    switch (format?.toLowerCase()) {
      case 'mp4':
      case 'mkv':
      case 'avi':
      case 'mov':
        return Film
      default:
        return HardDrive
    }
  }

  const FormatIcon = getFormatIcon(file.format ?? null)
  const displayPoster = file.poster || (file.media?.posterPath ? getPosterURL(file.media.posterPath, 'w500') : null)

  const handleLink = async () => {
    setShowMenu(false)
    const term = window.prompt('نام فیلم یا سریال برای پیوند را وارد کنید:')
    if (!term || !term.trim()) return
    try {
      const res = await fetch(`/api/media?search=${encodeURIComponent(term.trim())}`)
      const list = res.ok ? await res.json() : []
      const match = Array.isArray(list) ? list[0] : null
      if (match && match.id) {
        onUpdate(file.id, { mediaId: match.id } as Partial<LocalFile>)
      } else {
        toast('رسانه‌ای با این نام یافت نشد. ابتدا آن را به کتابخانه اضافه کنید.', 'warning')
      }
    } catch {
      toast('خطا در پیوند به رسانه', 'error')
    }
  }

  const handlePosterClick = () => fileInputRef.current?.click()

  const handleSubtitleClick = () => subtitleInputRef.current?.click()

  const handleSubtitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowMenu(false)
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    try {
      const data = await uploadFile(f)
      onUpdate(file.id, { subtitle: data.url } as Partial<LocalFile>)
      toast('زیرنویس با موفقیت آپلود شد', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'آپلود زیرنویس انجام نشد', 'error')
    } finally {
      setUploading(false)
      if (subtitleInputRef.current) subtitleInputRef.current.value = ''
    }
  }

  const handlePosterChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowMenu(false)
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    try {
      const data = await uploadFile(f)
      onUpdate(file.id, { poster: data.url } as Partial<LocalFile>)
      toast('پوستر با موفقیت آپلود شد', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'آپلود پوستر انجام نشد', 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="glass-card p-4 group hover:scale-[1.01] transition-all duration-300 animate-fade-in cursor-pointer" onDoubleClick={() => onPlay(file)} title="دوبار کلیک کنید تا در پلیر پیش‌فرض ویندوز باز شود">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePosterChange} />
      <input ref={subtitleInputRef} type="file" accept=".srt,.vtt,text/plain" className="hidden" onChange={handleSubtitleChange} />
      <div className="flex items-start gap-4">
        <div className="w-20 h-28 rounded-xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden group-hover:ring-2 group-hover:ring-violet-500/50 transition-all">
          {displayPoster ? (
            <img src={displayPoster} alt="" className="w-full h-full object-cover" />
          ) : (
            <FormatIcon className="w-8 h-8 text-violet-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {editing ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
                onBlur={handleSave}
                autoFocus
                className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-violet-500"
              />
            ) : (
              <h3 className="font-medium text-white truncate group-hover:text-violet-400 transition-colors" title={file.fileName}>
                {file.fileName}
              </h3>
            )}
            {!editing && (
              <button onClick={() => setEditing(true)} className="p-1 text-gray-400 hover:text-white transition-colors" title="تغییر نام">
                <Edit className="w-4 h-4" />
              </button>
            )}
          </div>

          {resumePos ? (
            <span className="inline-flex items-center gap-1 mt-1 text-xs text-violet-300">
              <History className="w-3 h-3" />
              ادامهٔ تماشا
            </span>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-400">
            {file.category === 'series' ? (
              <span className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 flex items-center gap-1">
                <Clapperboard className="w-3 h-3" /> سریال
              </span>
            ) : file.category === 'movie' ? (
              <span className="px-2 py-1 rounded-md bg-sky-500/20 text-sky-300 flex items-center gap-1">
                <Film className="w-3 h-3" /> فیلم
              </span>
            ) : null}
            {file.subtitle && (
              <span className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                <Subtitles className="w-3 h-3" /> زیرنویس
              </span>
            )}
            {file.resolution && (
              <span className="px-2 py-1 rounded-md bg-white/5">{file.resolution}</span>
            )}
            {file.format && (
              <span className="px-2 py-1 rounded-md bg-white/5 uppercase">{file.format}</span>
            )}
            {file.codec && (
              <span className="px-2 py-1 rounded-md bg-white/5">{file.codec}</span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>{formatFileSize(file.fileSize)}</span>
            {file.driveLabel && (
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {file.driveLabel}
              </span>
            )}
          </div>

          {file.folderPath && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-600 truncate">
              <Folder className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{file.folderPath}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPlay(file)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-l from-violet-500 to-pink-500 rounded-lg font-medium text-white hover:opacity-90 transition-opacity"
          >
            <Play className="w-4 h-4" />
            پخش
          </button>
          <button
            onClick={handleSubtitleClick}
            disabled={uploading}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-emerald-500/20 hover:border-emerald-500/30 hover:text-emerald-300 transition-all disabled:opacity-50"
            title="افزودن/تغییر زیرنویس"
          >
            <Subtitles className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        <div className="relative">
          {showMenu && (
            <div className="absolute top-full left-0 mt-2 w-48 glass-card p-2 z-10 animate-fade-in">
              <div className="px-3 py-1 text-xs text-gray-500">دسته‌بندی</div>
              <button
                onClick={() => { onUpdate(file.id, { category: 'movie' } as Partial<LocalFile>); setShowMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Film className="w-4 h-4" />
                فیلم سینمایی
              </button>
              <button
                onClick={() => { onUpdate(file.id, { category: 'series' } as Partial<LocalFile>); setShowMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Clapperboard className="w-4 h-4" />
                سریال
              </button>
              {!file.mediaId ? (
                <button
                  onClick={handleLink}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Link className="w-4 h-4" />
                  پیوند به رسانه
                </button>
              ) : (
                <button
                  onClick={() => {
                    onUpdate(file.id, { mediaId: null } as Partial<LocalFile>)
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Unlink className="w-4 h-4" />
                  حذف پیوند رسانه
                </button>
              )}
              <button
                onClick={handlePosterClick}
                disabled={uploading}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <ImagePlus className="w-4 h-4" />
                {uploading ? 'در حال آپلود…' : 'تنظیم پوستر'}
              </button>
              <button
                onClick={handleSubtitleClick}
                disabled={uploading}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <Subtitles className="w-4 h-4" />
                تنظیم زیرنویس
              </button>
              {file.subtitle && (
                <button
                  onClick={() => { onUpdate(file.id, { subtitle: null } as Partial<LocalFile>); setShowMenu(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  <Subtitles className="w-4 h-4" />
                  حذف زیرنویس
                </button>
              )}
              <hr className="my-2 border-white/10" />
              <button
                onClick={() => {
                  onDelete(file.id)
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
      </div>
    </div>
  )
})

export default FileCard
