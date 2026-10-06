'use client'

import { useState, useEffect, useRef } from 'react'
import { Scissors, Plus, Tag, Play, Trash2, Edit, Film, Upload, Loader2, Check, ArrowRight, Folder, FolderOpen } from 'lucide-react'
import type { MediaEdit, EditFolder } from '@/types'
import { useToast } from '@/components/Toast'
import { extractPoster } from '@/lib/videoPoster'
import { uploadFile } from '@/lib/uploadFile'

export default function EditsPage() {
  const { toast } = useToast()
  const [edits, setEdits] = useState<MediaEdit[]>([])
  const [folders, setFolders] = useState<EditFolder[]>([])
  const [currentFolder, setCurrentFolder] = useState<EditFolder | null>(null)
  const [isAddingEdit, setIsAddingEdit] = useState(false)
  const [activeTag, setActiveTag] = useState<string>('all')
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [videoFileName, setVideoFileName] = useState('')
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [newEdit, setNewEdit] = useState({
    title: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    tags: [] as string[],
    audioInfo: ''
  })

  const availableTags = ['سینمایی', 'زیبا', 'هایپ', 'احساسی', 'حماسی', 'AMV', 'ویرایش', 'فن‌آرت']

  useEffect(() => {
    fetchFolders()
  }, [])

  useEffect(() => {
    if (currentFolder) {
      fetchEditsByFolder(currentFolder.id)
    }
  }, [currentFolder])

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/edits/folders')
      const data = await response.json()
      setFolders(data)
    } catch (error) {
      console.error('Error fetching folders:', error)
    }
  }

  const fetchEditsByFolder = async (folderId: string) => {
    try {
      const response = await fetch(`/api/edits?folderId=${folderId}`)
      const data = await response.json()
      setEdits(data)
    } catch (error) {
      console.error('Error fetching edits:', error)
    }
  }

  const getFilteredEdits = () => {
    if (activeTag === 'all') {
      return edits
    }
    return edits.filter((e) => {
      const tags = e.tags ? JSON.parse(e.tags) : []
      return tags.includes(activeTag)
    })
  }

  const handleAddEdit = async () => {
    if (!currentFolder || !newEdit.title || !newEdit.videoUrl) return

    try {
      const response = await fetch('/api/edits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: currentFolder.id,
          title: newEdit.title,
          description: newEdit.description || null,
          videoUrl: newEdit.videoUrl,
          thumbnailUrl: newEdit.thumbnailUrl || null,
          tags: newEdit.tags.length > 0 ? newEdit.tags : null,
          audioInfo: newEdit.audioInfo || null
        })
      })

      const edit = await response.json()
      if (!response.ok) {
        toast(edit.error || 'خطا در افزودن ویرایش', 'error')
        return
      }
      setEdits((prev) => [edit, ...prev])
      setFolders((prev) => prev.map((f) =>
        f.id === currentFolder.id ? { ...f, editCount: (f.editCount || 0) + 1, thumbnailUrl: f.thumbnailUrl || edit.thumbnailUrl } : f
      ))
      setCurrentFolder((prev) => prev ? { ...prev, editCount: (prev.editCount || 0) + 1, thumbnailUrl: prev.thumbnailUrl || edit.thumbnailUrl } : prev)
      toast('ویرایش با موفقیت اضافه شد', 'success')
      resetNewEdit()
      setIsAddingEdit(false)
    } catch (error) {
      console.error('Error adding edit:', error)
      toast('خطا در ارتباط با سرور', 'error')
    }
  }

  const handleNewFolder = async () => {
    const name = newEdit.title.trim()
    if (!name) {
      toast('ابتدا عنوان پوشه را وارد کنید', 'warning')
      return
    }
    try {
      const response = await fetch('/api/edits/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      const folder = await response.json()
      if (!response.ok) {
        toast(folder.error || 'خطا در ساخت پوشه', 'error')
        return
      }
      await fetchFolders()
      setNewEdit({ title: '', description: '', videoUrl: '', thumbnailUrl: '', tags: [], audioInfo: '' })
      setCurrentFolder({ ...folder, editCount: 0 })
      toast('پوشه ساخته شد', 'success')
    } catch (error) {
      console.error('Error creating folder:', error)
      toast('خطا در ارتباط با سرور', 'error')
    }
  }

  const handleDeleteEdit = async (id: string) => {
    try {
      await fetch(`/api/edits?id=${id}`, { method: 'DELETE' })
      setEdits((prev) => prev.filter((e) => e.id !== id))
      if (currentFolder) {
        setFolders((prev) => prev.map((f) =>
          f.id === currentFolder.id ? { ...f, editCount: Math.max(0, (f.editCount || 0) - 1) } : f
        ))
        setCurrentFolder((prev) => prev ? { ...prev, editCount: Math.max(0, (prev.editCount || 0) - 1) } : prev)
      }
      toast('ویرایش حذف شد', 'success')
    } catch (error) {
      console.error('Error deleting edit:', error)
      toast('خطا در حذف ویرایش', 'error')
    }
  }

  const handleDeleteFolder = async (id: string) => {
    if (!window.confirm('این پوشه و همه ادیت‌های داخلش حذف شود؟')) return
    try {
      await fetch(`/api/edits/folders?id=${id}`, { method: 'DELETE' })
      setFolders((prev) => prev.filter((f) => f.id !== id))
      toast('پوشه حذف شد', 'success')
    } catch (error) {
      console.error('Error deleting folder:', error)
      toast('خطا در حذف پوشه', 'error')
    }
  }

  const resetNewEdit = () => {
    setNewEdit({ title: '', description: '', videoUrl: '', thumbnailUrl: '', tags: [], audioInfo: '' })
    setVideoFileName('')
  }

  const toggleTag = (tag: string) => {
    setNewEdit((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag]
    }))
  }

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingVideo(true)
    setUploadProgress(0)
    setVideoFileName(file.name)
    try {
      const data = await uploadFile(file, { onProgress: setUploadProgress })
      if (!data.url) {
        toast('خطا در آپلود ویدیو', 'error')
        return
      }
      setNewEdit((prev) => ({ ...prev, videoUrl: data.url }))

      const poster = await extractPoster(file)
      if (poster) {
        const posterFile = new File([poster], 'poster.jpg', { type: 'image/jpeg' })
        const posterData = await uploadFile(posterFile)
        if (posterData.url) {
          setNewEdit((prev) => ({ ...prev, thumbnailUrl: posterData.url }))
          toast('کاور ویدیو به‌صورت خودکار ساخته شد', 'success')
        }
      }
      toast('ویدیو آپلود شد', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'خطا در آپلود ویدیو', 'error')
    } finally {
      setUploadingVideo(false)
      if (videoInputRef.current) videoInputRef.current.value = ''
    }
  }

  const handlePlayExternal = async (url: string) => {
    try {
      const res = await fetch('/api/play-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: url })
      })
      if (!res.ok) toast('نمی‌توان پخش‌کننده را باز کرد', 'error')
    } catch {
      toast('خطا در ارسال درخواست', 'error')
    }
  }

  const filteredEdits = getFilteredEdits()

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Scissors className="w-8 h-8 text-violet-400" />
            گالری ویرایش و فن‌آرت
          </h1>
          <p className="text-gray-400">{currentFolder ? 'ادیت‌های داخل پوشه' : 'مجموعه ویرایش‌های ویدیویی، کلیپ‌ها و محتوای طرفداران'}</p>
        </div>

        {currentFolder && (
          <button
            onClick={() => setCurrentFolder(null)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg font-medium text-white hover:bg-white/20 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            بازگشت به پوشه‌ها
          </button>
        )}
      </div>

      {currentFolder ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Folder className="w-6 h-6 text-violet-400" />
              {currentFolder.name}
              <span className="text-sm font-normal text-gray-400">({currentFolder.editCount || edits.length} ویرایش)</span>
            </h2>
            <button
              onClick={() => setIsAddingEdit(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-500 rounded-lg font-medium text-white hover:bg-violet-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              افزودن ویرایش به این پوشه
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveTag('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTag === 'all'
                  ? 'bg-violet-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              همه
            </button>
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTag === tag
                    ? 'bg-violet-500 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <Tag className="w-3 h-3" />
                {tag}
              </button>
            ))}
          </div>

          {isAddingEdit && (
            <div className="glass-card p-6 mb-8 animate-fade-in">
              <h3 className="text-lg font-medium text-white mb-4">
                افزودن ویرایش جدید به «{currentFolder.name}»
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-2">عنوان ویرایش *</label>
                  <input
                    type="text"
                    value={newEdit.title}
                    onChange={(e) => setNewEdit({ ...newEdit, title: e.target.value })}
                    placeholder="مثلاً: پارت ۱، سینمایی، AMV..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-2">انتخاب ویدیو از کامپیوتر</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploadingVideo}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg text-white font-medium hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingVideo ? `در حال آپلود... ${uploadProgress}%` : 'انتخاب فایل ویدیو'}
                    </button>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoFileChange}
                      className="hidden"
                    />
                    {newEdit.videoUrl && (
                      <span className="text-sm text-green-400 flex items-center gap-1">
                        <Check className="w-4 h-4" /> {videoFileName || newEdit.videoUrl}
                      </span>
                    )}
                    {uploadingVideo && (
                      <div className="w-full">
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-l from-violet-500 to-pink-500 transition-all duration-200"
                            style={{ width: `${Math.max(uploadProgress, 2)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{uploadProgress}% — لطفاً تا پایان آپلود صبر کنید</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={newEdit.videoUrl.startsWith('/api/uploads/') ? '' : newEdit.videoUrl}
                    onChange={(e) => setNewEdit({ ...newEdit, videoUrl: e.target.value })}
                    placeholder="یا لینک ویدیو... (اختیاری)"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 mt-2"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-2">توضیحات</label>
                  <textarea
                    value={newEdit.description}
                    onChange={(e) => setNewEdit({ ...newEdit, description: e.target.value })}
                    rows={2}
                    placeholder="توضیحات اختیاری..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">اطلاعات صدا</label>
                  <input
                    type="text"
                    value={newEdit.audioInfo}
                    onChange={(e) => setNewEdit({ ...newEdit, audioInfo: e.target.value })}
                    placeholder="نام آهنگ، هنرمند..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-2">برچسب‌ها</label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                          newEdit.tags.includes(tag)
                            ? 'bg-violet-500 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAddEdit}
                  className="px-4 py-2 bg-violet-500 rounded-lg text-white font-medium hover:bg-violet-600 transition-colors"
                >
                  افزودن ویرایش
                </button>
                <button
                  onClick={() => { setIsAddingEdit(false); resetNewEdit(); }}
                  className="px-4 py-2 bg-white/10 rounded-lg text-white font-medium hover:bg-white/20 transition-colors"
                >
                  انصراف
                </button>
              </div>
            </div>
          )}

          {filteredEdits.length === 0 ? (
            <div className="text-center py-20">
              <Scissors className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400 mb-2">ویرایشی یافت نشد</h3>
              <p className="text-gray-500">
                {edits.length === 0
                  ? 'هنوز ویرایشی به این پوشه اضافه نشده است'
                  : `ویرایشی با برچسب "${activeTag}" یافت نشد`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEdits.map((edit) => {
                const tags = edit.tags ? JSON.parse(edit.tags) : []

                return (
                  <div
                    key={edit.id}
                    className="glass-card overflow-hidden group hover:scale-[1.02] transition-all duration-300"
                  >
                    <div
                      className="relative aspect-video cursor-pointer"
                      onClick={() => handlePlayExternal(edit.videoUrl)}
                    >
                      {edit.thumbnailUrl ? (
                        <img
                          src={edit.thumbnailUrl}
                          alt={edit.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center">
                          <Film className="w-12 h-12 text-violet-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-violet-500/80 flex items-center justify-center">
                          <Play className="w-8 h-8 text-white mr-1" />
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-white group-hover:text-violet-400 transition-colors">
                            {edit.title}
                          </h3>
                          <p className="text-sm text-gray-400 mt-1">{edit.media?.title}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteEdit(edit.id)
                          }}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {edit.description && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{edit.description}</p>
                      )}

                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {tags.map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {edit.audioInfo && (
                        <p className="text-xs text-gray-500 mt-2">♪ {edit.audioInfo}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-medium text-gray-300 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-violet-400" />
              همه پوشه‌ها
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newEdit.title}
                onChange={(e) => setNewEdit({ ...newEdit, title: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleNewFolder()
                  }
                }}
                placeholder="نام پوشه (مثلاً: اینتراستلار)..."
                className="w-64 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
              <button
                onClick={handleNewFolder}
                className="flex items-center gap-2 px-4 py-2 bg-violet-500 rounded-lg font-medium text-white hover:bg-violet-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                ساخت پوشه
              </button>
            </div>
          </div>

          {folders.length === 0 ? (
            <div className="text-center py-20">
              <Folder className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400 mb-2">هنوز پوشه‌ای ساخته نشده است</h3>
              <p className="text-gray-500">
                یک نام (مثل اسم فیلم موردعلاقه‌ات) بنویس و «ساخت پوشه» را بزن تا ادیت‌هایت را داخلش جمع کنی
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => setCurrentFolder(folder)}
                  className="glass-card overflow-hidden group hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                >
                  <div className="relative aspect-video">
                    {folder.thumbnailUrl ? (
                      <img
                        src={folder.thumbnailUrl}
                        alt={folder.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center">
                        <Folder className="w-16 h-16 text-violet-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-violet-500/80 rounded-full px-4 py-2 text-white font-medium flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        باز کردن
                      </div>
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <h3 className="font-medium text-white group-hover:text-violet-400 transition-colors">
                      {folder.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs">
                        {folder.editCount || 0} ویرایش
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteFolder(folder.id)
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                        title="حذف پوشه"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}