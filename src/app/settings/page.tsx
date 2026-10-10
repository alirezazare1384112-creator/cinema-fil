'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, Key, Database, Info, ExternalLink, Palette, Check } from 'lucide-react'
import { THEMES, THEME_STORAGE_KEY, applyTheme, getStoredThemeId } from '@/lib/themes'

export default function SettingsPage() {
  const [tmdbApiKey, setTmdbApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [activeTheme, setActiveTheme] = useState('default')

  useEffect(() => {
    const savedKey = localStorage.getItem('tmdb_api_key')
    if (savedKey) {
      setTmdbApiKey(savedKey)
    }
    setActiveTheme(getStoredThemeId())
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
          <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            <Palette className="w-5 h-5 text-violet-400" />
            تم و ظاهر
          </h2>
          <p className="text-gray-400 mb-5 text-sm">
            تمی بر اساس شخصیت‌ها و فیلم/سریال‌های محبوب انتخاب کن؛ همان لحظه در کل برنامه اعمال و برای دفعات بعد ذخیره می‌شود.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {THEMES.map((theme) => {
              const isActive = activeTheme === theme.id
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    applyTheme(theme.id)
                    setActiveTheme(theme.id)
                  }}
                  className={`relative text-right rounded-xl border p-4 transition-all ${
                    isActive ? 'bg-white/10' : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/10 hover:border-white/25'
                  }`}
                  style={isActive ? { borderColor: theme.swatch[0], boxShadow: `0 0 0 1px ${theme.swatch[0]}, 0 8px 24px -12px ${theme.swatch[0]}` } : undefined}
                >
                  {isActive && (
                    <span
                      className="absolute top-3 left-3 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: theme.swatch[0] }}
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                    </span>
                  )}

                  <span
                    className="block h-2.5 w-full rounded-full mb-3"
                    style={{ background: `linear-gradient(90deg, ${theme.swatch.join(', ')})` }}
                  />

                  <span className="block text-sm font-semibold text-white">{theme.name}</span>
                  <span className="block text-[11px] text-gray-500 mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>
                    {theme.source}
                  </span>
                  <span className="block text-xs text-gray-400 mt-1">{theme.description}</span>

                  <span className="flex items-center gap-2 mt-3">
                    <span
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-white"
                      style={{ backgroundColor: theme.swatch[0] }}
                    >
                      دکمه
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[11px]" style={{ backgroundColor: `${theme.swatch[1]}26`, color: theme.swatch[1] }}>
                      کارت
                    </span>
                    <span className="text-[11px]" style={{ color: theme.swatch[0] }}>
                      متن لهجه‌ای
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <p className="text-xs text-gray-500 mt-4">
            انتخاب تو در همین مرورگر ذخیره می‌شود (کلید <code className="text-gray-400" dir="ltr">{THEME_STORAGE_KEY}</code>).
          </p>
        </div>

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
