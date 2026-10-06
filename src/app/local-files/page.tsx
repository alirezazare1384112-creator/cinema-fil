'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { HardDrive, Film, Folder, Search, Plus } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { LocalFile } from '@/types'
import { useToast } from '@/components/Toast'
import AddMovieModal from '@/components/AddMovieModal'

const FileCard = dynamic(() => import('@/components/FileCard'), { ssr: false })

export default function LocalFilesPage() {
  const { toast } = useToast()
  const [files, setFiles] = useState<LocalFile[]>([])
  const [drives, setDrives] = useState<string[]>([])
  const [selectedDrive, setSelectedDrive] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  const filteredFiles = useMemo(() => {
    let result = files

    if (selectedDrive !== 'all') {
      result = result.filter((f) => f.driveLabel === selectedDrive)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((f) =>
        f.fileName.toLowerCase().includes(q) ||
        f.filePath.toLowerCase().includes(q)
      )
    }

    if (selectedCategory !== 'all') {
      result = result.filter((f) => (f.category || 'movie') === selectedCategory)
    }

    return result
  }, [files, selectedDrive, searchQuery, selectedCategory])

  const stats = useMemo(() => ({
    total: files.length,
    totalSize: files.reduce((acc, f) => acc + (f.fileSize ? Number(f.fileSize) : 0), 0)
  }), [files])

  const fetchFiles = useCallback(async () => {
    try {
      const response = await fetch('/api/local-files')
      const data = await response.json()
      setFiles(data)

      const uniqueDrives = [...new Set(data.map((f: LocalFile) => f.driveLabel).filter(Boolean))] as string[]
      setDrives(uniqueDrives)
    } catch (error) {
      console.error('Error fetching files:', error)
    }
  }, [])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  const handlePlayExternal = useCallback(async (file: LocalFile) => {
    try {
      const res = await fetch('/api/play-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: file.filePath, folderPath: file.folderPath })
      })
      const data = await res.json()
      if (!res.ok) {
        toast(data.error || 'نمی‌توان پخش‌کننده را باز کرد', 'error')
      }
    } catch {
      toast('خطا در ارتباط با سرور', 'error')
    }
  }, [toast])

  const handleDeleteFile = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/local-files?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id))
        toast('فایل حذف شد', 'success')
      }
    } catch (error) {
      console.error('Error deleting file:', error)
    }
  }, [toast])

  const handleUpdateFile = useCallback(async (id: string, data: Partial<LocalFile>) => {
    try {
      const response = await fetch('/api/local-files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data })
      })

      const updated = await response.json()
      if (response.ok) {
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updated } : f)))
      }
    } catch (error) {
      console.error('Error updating file:', error)
    }
  }, [])

  const handleAddLocalFiles = async (result: { added: number; skipped: number }) => {
    await fetchFiles()
    if (result.added > 0) {
      toast(`${result.added} فیلم اضافه شد${result.skipped > 0 ? `، ${result.skipped} تکراری` : ''}`, 'success')
    } else if (result.skipped > 0) {
      toast('این فایل قبلاً اضافه شده است', 'info')
    }
  }

  const formatTotalSize = useCallback((bytes: number) => {
    const units = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت', 'ترا بایت']
    let unitIndex = 0
    let size = bytes
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`
  }, [])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-violet-400" />
            مرکز فایل‌های محلی
          </h1>
          <p className="text-gray-400">مدیریت فایل‌های رسانه دانلود شده</p>
        </div>

        <button
          onClick={() => setIsPickerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-l from-violet-500 to-pink-500 rounded-lg font-medium text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          افزودن فیلم از کامپیوتر
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Film className="w-5 h-5 text-violet-400" />
            </div>
            <span className="text-gray-400">کل فایل‌ها</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-pink-400" />
            </div>
            <span className="text-gray-400">حجم کل</span>
          </div>
          <p className="text-3xl font-bold text-white">{formatTotalSize(stats.totalSize)}</p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Folder className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-gray-400">درایوها</span>
          </div>
          <p className="text-3xl font-bold text-white">{drives.length}</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی فایل‌ها..."
            className="w-full pl-4 pr-10 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-right"
          />
        </div>

        <select
          value={selectedDrive}
          onChange={(e) => setSelectedDrive(e.target.value)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-violet-500"
        >
          <option value="all">همه درایوها</option>
          {drives.map((drive) => (
            <option key={drive} value={drive}>{drive}</option>
          ))}
        </select>

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

      {filteredFiles.length === 0 ? (
        <div className="text-center py-20">
          <HardDrive className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-400 mb-2">فایلی یافت نشد</h3>
          <p className="text-gray-500">
            {files.length === 0
              ? 'فایل‌های رسانه محلی خود را با «افزودن فیلم از کامپیوتر» اضافه کنید'
              : 'فایلی با معیارهای جستجوی شما مطابقت ندارد'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredFiles.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onUpdate={handleUpdateFile}
              onDelete={handleDeleteFile}
              onPlay={handlePlayExternal}
            />
          ))}
        </div>
      )}

      <AddMovieModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSaved={handleAddLocalFiles}
      />
    </div>
  )
}