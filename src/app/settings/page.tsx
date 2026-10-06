'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, Key, Database, Info, ExternalLink } from 'lucide-react'

export default function SettingsPage() {
  const [tmdbApiKey, setTmdbApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const savedKey = localStorage.getItem('tmdb_api_key')
    if (savedKey) {
      setTmdbApiKey(savedKey)
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem('tmdb_api_key', tmdbApiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Settings className="w-8 h-8 text-violet-400" />
          تنظیمات
        </h1>
        <p className="text-gray-400">پیکربندی سینمافیل خود</p>
      </div>

      <div className="space-y-6">
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-violet-400" />
            پیکربندی TMDB API
          </h2>
          <p className="text-gray-400 mb-4">
            برای جستجو و کشف فیلم و سریال، به کلید API TMDB نیاز دارید.
          </p>

          <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-violet-400 mt-0.5" />
              <div>
                <p className="text-sm text-violet-300 font-medium">نحوه دریافت کلید API:</p>
                <ol className="text-sm text-gray-400 mt-2 list-decimal list-inside space-y-1">
                  <li>به <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline inline-flex items-center gap-1">تنظیمات TMDB API <ExternalLink className="w-3 h-3" /></a> مراجعه کنید</li>
                  <li>حساب کاربری بسازید یا وارد شوید</li>
                  <li>درخواست کلید API بدهید (گزینه &quot;Developer&quot; را انتخاب کنید)</li>
                  <li>کلید API خود را کپی کرده و در زیر وارد کنید</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <input
              type="password"
              value={tmdbApiKey}
              onChange={(e) => setTmdbApiKey(e.target.value)}
              placeholder="کلید API TMDB خود را وارد کنید..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-violet-500 text-white hover:bg-violet-600'
              }`}
            >
              <Save className="w-4 h-4" />
              {saved ? 'ذخیره شد!' : 'ذخیره'}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            توجه: برای استفاده در تولید، کلید API را در فایل .env به عنوان NEXT_PUBLIC_TMDB_API_KEY تنظیم کنید
          </p>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-violet-400" />
            پایگاه داده
          </h2>
          <p className="text-gray-400 mb-4">
            داده‌های شما به صورت محلی با استفاده از پایگاه داده SQLite ذخیره می‌شوند.
          </p>
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-sm text-gray-400">
              <span className="font-medium text-white">مکان:</span> prisma/dev.db
            </p>
            <p className="text-sm text-gray-400 mt-2">
              <span className="font-medium text-white">مدل‌ها:</span> Media, LocalFile, MediaEdit, Quote
            </p>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">درباره ما</h2>
          <div className="space-y-2 text-gray-400">
            <p><span className="font-medium text-white">نام برنامه:</span> سینمافیل - Vault و رسانه</p>
            <p><span className="font-medium text-white">نسخه:</span> 1.0.0</p>
            <p><span className="font-medium text-white">فناوری:</span> Next.js, TypeScript, Tailwind CSS, Prisma, SQLite</p>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">نکات سریع</h2>
          <ul className="space-y-2 text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-1">•</span>
              از صفحه کشف برای جستجو و افزودن فیلم و سریال از TMDB استفاده کنید
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-1">•</span>
              وضعیت تماشا و امتیازات شخصی را در کتابخانه من ردیابی کنید
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-1">•</span>
              فایل‌های دانلود شده محلی را در مرکز فایل‌های محلی مدیریت کنید
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-1">•</span>
              ویرایش‌های ویدیویی و محتوای طرفداران را در گالری ویرایش اضافه کنید
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-1">•</span>
              نقل‌قول‌های به یاد ماندنی از صحنه‌های مورد علاقه خود را ذخیره کنید
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
