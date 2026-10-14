'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Film,
  HardDrive,
  Scissors,
  Quote,
  Home,
  Settings,
  Sparkles
} from 'lucide-react'
import { getStoredThemeId, getThemeIcon } from '@/lib/themes'

const navItems = [
  { href: '/', label: 'خانه', icon: Home },
  { href: '/discover', label: 'کشف', icon: Sparkles },
  { href: '/library', label: 'کتابخانه من', icon: Film },
  { href: '/local-files', label: 'فایل‌های محلی', icon: HardDrive },
  { href: '/edits', label: 'گالری ویرایش', icon: Scissors },
  { href: '/quotes', label: 'نقل‌قول‌ها', icon: Quote },
]

/* آیکنِ تم را در سربرگ سایدبار نشان بده (با تمِ فعلیِ localStorage) */
export default function Sidebar() {
  const pathname = usePathname()
  const [themeId, setThemeId] = useState<string>('default')

  useEffect(() => {
    setThemeId(getStoredThemeId())
    // وقتی کاربر تم را عوض می‌کند، با یک Event ساده آپدیت می‌شود
    const handler = () => setThemeId(getStoredThemeId())
    window.addEventListener('storage', handler)
    window.addEventListener('theme-changed', handler)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('theme-changed', handler)
    }
  }, [])

  const ThemeIcon = getThemeIcon(themeId)

  return (
    <aside className="fixed right-0 top-0 h-full w-64 bg-black/50 backdrop-blur-xl border-l border-white/10 z-50">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center neon-glow group-hover:scale-110 transition-transform relative">
            {/* آیکون تزئینیِ تمِ فعلی — با تم پیش‌فرض آیکون قوطی فیلم است */}
            <ThemeIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">سینمافیل</h1>
            <p className="text-xs text-gray-400"> vault و رسانه</p>
          </div>
        </Link>
      </div>

      <nav className="px-4 mt-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-l from-violet-500/20 to-pink-500/20 text-white border border-violet-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-violet-400' : ''}`} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="absolute bottom-6 left-4 right-4">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">تنظیمات</span>
        </Link>
      </div>
    </aside>
  )
}
