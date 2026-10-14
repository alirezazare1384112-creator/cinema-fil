'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, Key, Database, Info, ExternalLink, Palette, Check, Star } from 'lucide-react'
import { THEMES, THEME_STORAGE_KEY, applyTheme, getStoredThemeId } from '@/lib/themes'
import ThemePreview from '@/components/ThemePreview'

export default function SettingsPage() {
  const [tmdbApiKey, setTmdbApiKey] = useState('')
  const [omdbApiKey, setOmdbApiKey] = useState('')
  const [savedTmdb, setSavedTmdb] = useState(false)
  const [savedOmdb, setSavedOmdb] = useState(false)
  const [activeTheme, setActiveTheme] = useState('default')

  useEffect(() => {
    const savedTmdbKey = localStorage.getItem('tmdb_api_key')
    if (savedTmdbKey) {
      setTmdbApiKey(savedTmdbKey)
    }
    const savedOmdb = localStorage.getItem('omdb_api_key')
    if (savedOmdb) {
      setOmdbApiKey(savedOmdb)
    }
    setActiveTheme(getStoredThemeId())
  }, [])

  const handleSaveTmdb = () => {
    localStorage.setItem('tmdb_api_key', tmdbApiKey)
    setSavedTmdb(true)
    setTimeout(() => setSavedTmdb(false), 2000)
  }

  const handleSaveOmdb = () => {
    localStorage.setItem('omdb_api_key', omdbApiKey)
    setSavedOmdb(true)
    setTimeout(() => setSavedOmdb(false), 2000)
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
            تمی بر اساس شخصیت‌ها و فیلم/سریال‌های محبوب انتخاب کن؛ هر تم فقط رنگ عوض نمی‌کند، بلکه الگوی پس‌زمینه، فونت، اسکرول‌بار، حس و حال و آیکونِ سایدبار خودش را دارد. همین لحظه در کل برنامه اعمال و برای دفعات بعد ذخیره می‌شود.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {THEMES.map((theme) => {
              const isActive = activeTheme === theme.id
              const Icon = theme.icon
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    applyTheme(theme.id)
                    setActiveTheme(theme.id)
                  }}
                  className={`relative text-right rounded-xl border p-0 transition-all overflow-hidden ${
                    isActive ? 'border-2' : 'border border-white/10 hover:border-white/30'
                  }`}
                  style={isActive ? { borderColor: theme.swatch[0], boxShadow: `0 0 0 1px ${theme.swatch[0]}, 0 12px 32px -10px ${theme.swatch[0]}99` } : undefined}
                >
                  {isActive && (
                    <span
                      className="absolute top-3 left-3 z-20 w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: theme.swatch[0] }}
                    >
                      <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    </span>
                  )}

                  <ThemePreview theme={theme} />

                  <div className="p-4 text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 shrink-0" style={{ color: theme.swatch[0] }} />
                      <span className="block text-sm font-semibold text-white truncate">{theme.name}</span>
                    </div>
                    <span className="block text-[11px] text-gray-500 mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>
                      {theme.source}
                    </span>
                    <p className="block text-[11px] text-gray-400 mt-2 leading-relaxed line-clamp-2">
                      {theme.atmosphere}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          <p className="text-xs text-gray-500 mt-4">
            انتخاب تو در همین مرورگر ذخیره می‌شود (کلید <code className="text-gray-400" dir="ltr">{THEME_STORAGE_KEY}</code>). آیکون بالای سایدبار هم با تم عوض می‌شود.
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
              onClick={handleSaveTmdb}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
                savedTmdb
                  ? 'bg-green-500 text-white'
                  : 'bg-violet-500 text-white hover:bg-violet-600'
              }`}
            >
              <Save className="w-4 h-4" />
              {savedTmdb ? 'ذخیره شد!' : 'ذخیره'}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            توجه: برای استفاده در تولید، کلید API را در فایل .env به عنوان NEXT_PUBLIC_TMDB_API_KEY تنظیم کنید
          </p>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" />
            نمره‌های IMDb و Rotten Tomatoes
          </h2>
          <p className="text-gray-400 mb-4">
            با تنظیم کلید OMDb API، در صفحهٔ جزئیات فیلم/سریال، علاوه بر نمرهٔ IMDb، نمرهٔ Rotten Tomatoes و Metacritic هم نمایش داده می‌شود.
          </p>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-400 mt-0.5" />
              <div>
                <p className="text-sm text-amber-300 font-medium">نحوه دریافت کلید OMDb:</p>
                <ol className="text-sm text-gray-400 mt-2 list-decimal list-inside space-y-1">
                  <li>به <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline inline-flex items-center gap-1">صفحهٔ دریافت کلید OMDb <ExternalLink className="w-3 h-3" /></a> مراجعه کنید</li>
                  <li>ایمیل خود را وارد و گزینهٔ «Free» (۱۰۰۰ درخواست در روز) را انتخاب کنید</li>
                  <li>کلید به ایمیل شما فرستاده می‌شود — آن را کپی کرده و در زیر وارد کنید</li>
                </ol>
                <p className="text-xs text-gray-500 mt-3">
                  بدون این کلید هم برنامه کار می‌کند؛ فقط به‌جای نمرهٔ دقیق IMDb از OMDb، همان نمرهٔ سایت فیلم به‌صورت «تقریبی» نمایش داده می‌شود و نمرهٔ Rotten Tomatoes و Metacritic پنهان می‌شود.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <input
              type="password"
              value={omdbApiKey}
              onChange={(e) => setOmdbApiKey(e.target.value)}
              placeholder="کلید API OMDb خود را وارد کنید..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleSaveOmdb}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
                savedOmdb
                  ? 'bg-green-500 text-white'
                  : 'bg-amber-500 text-white hover:bg-amber-600'
              }`}
            >
              <Save className="w-4 h-4" />
              {savedOmdb ? 'ذخیره شد!' : 'ذخیره'}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            توجه: برای استفاده در تولید، کلید را در فایل .env به عنوان OMDB_API_KEY تنظیم کنید
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
