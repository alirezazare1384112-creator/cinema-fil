/**
 * Theme system for Cinephile Vault — each theme is a full visual identity,
 * not just a color swap. Every theme defines:
 *   - accent color variables (wired up in globals.css via [data-theme="..."])
 *   - background pattern overlay (--bg-pattern as SVG data URL)
 *   - display font for headings (--font-display)
 *   - decorative icon (rendered in the Sidebar header & Settings preview)
 *   - atmospheric description so the user can feel the theme before applying it
 */

import type { ComponentType, SVGProps } from 'react'

export interface ThemeDefinition {
  id: string
  name: string
  source: string
  description: string
  swatch: string[]
  icon: ComponentType<SVGProps<SVGSVGElement>>
  atmosphere: string
}

export const THEME_STORAGE_KEY = 'cinema_theme'

/* ─────────────── inline SVG decorative icons per theme ─────────────── */

const SpiderIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <ellipse cx="12" cy="13" rx="2.5" ry="3.5" />
    <circle cx="12" cy="8.5" r="1.8" />
    <path d="M 10 11 C 6 9 3 11 2 14" />
    <path d="M 10 13 C 5 13 2 16 2 19" />
    <path d="M 11 15 C 7 17 5 21 5 23" />
    <path d="M 12 16 C 12 19 12 21 13 23" />
    <path d="M 14 11 C 18 9 21 11 22 14" />
    <path d="M 14 13 C 19 13 22 16 22 19" />
    <path d="M 13 15 C 17 17 19 21 19 23" />
  </svg>
)

const BatIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 4c-.6 0-1 .3-1.1.8-.6 1.5-1.7 2.6-3.2 3-1 .3-2 .2-2.9-.2.4 1.6 1.5 2.9 3 3.6-1.5.5-2.8 1.4-3.8 2.7 1.7-.4 3.2-.5 4.5-.1.6 1.5 1.7 2.6 3.5 3.2L12 17v-3c.7-1 1-2.2 1-3.5 1.3-.4 2.8-.3 4.5.1-1-1.3-2.3-2.2-3.8-2.7 1.5-.7 2.6-2 3-3.6-.9.4-1.9.5-2.9.2-1.5-.4-2.6-1.5-3.2-3C13 4.3 12.6 4 12 4z" />
  </svg>
)

const JokerIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M 4 13 Q 12 22 20 13" />
    <path d="M 4 13 Q 12 18 20 13" />
    <path d="M 8 9 l -1.5 -1 M 16 9 l 1.5 -1" />
    <path d="M 8 9 l 1.5 1.5 M 16 9 l -1.5 1.5" />
  </svg>
)

const MatrixIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <text x="2" y="6" fontSize="6" fontFamily="monospace">10</text>
    <text x="2" y="13" fontSize="6" fontFamily="monospace" opacity="0.9">01</text>
    <text x="2" y="20" fontSize="6" fontFamily="monospace" opacity="0.7">11</text>
    <text x="11" y="6" fontSize="6" fontFamily="monospace" opacity="0.6">01</text>
    <text x="11" y="13" fontSize="6" fontFamily="monospace" opacity="0.8">10</text>
    <text x="11" y="20" fontSize="6" fontFamily="monospace" opacity="0.4">00</text>
    <text x="19" y="9" fontSize="6" fontFamily="monospace" opacity="0.5">1</text>
    <text x="19" y="17" fontSize="6" fontFamily="monospace" opacity="0.7">0</text>
  </svg>
)

const AtomIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M 3 12 L 21 12 M 12 3 L 12 21 M 5.5 5.5 L 18.5 18.5 M 18.5 5.5 L 5.5 18.5" opacity="0.5" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>
)

const LightningIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M 14 3 L 9 11 L 13 11 L 8 19 L 16 9 L 12 9 L 16 3 Z" />
    <path d="M 4 19 L 5 20 L 4 21 L 3 20 Z" opacity="0.7" />
    <path d="M 20 4 L 21 5 L 20 6 L 19 5 Z" opacity="0.7" />
  </svg>
)

const LightsaberIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" {...props}>
    <line x1="6" y1="18" x2="18" y2="6" strokeWidth="3" opacity="0.4" />
    <line x1="6" y1="18" x2="18" y2="6" strokeWidth="1.5" />
    <circle cx="6" cy="18" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="18" cy="6" r="1.5" fill="currentColor" stroke="none" />
  </svg>
)

const DragonIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M 4 20 L 12 4 L 20 20 Z" />
    <path d="M 7 20 L 12 10 L 17 20" opacity="0.6" />
    <path d="M 10 20 L 12 16 L 14 20" opacity="0.4" />
  </svg>
)

const FilmReelIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="6" width="18" height="14" rx="2" />
    <circle cx="7" cy="10" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="17" cy="10" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="7" cy="18" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="17" cy="18" r="1.2" fill="currentColor" stroke="none" />
    <path d="M 7 14 L 17 14" opacity="0.4" />
  </svg>
)

export const THEMES: ThemeDefinition[] = [
  {
    id: 'default',
    name: 'بنفش سینمایی',
    source: 'حالت پیش‌فرض برنامه',
    description: 'بنفش و صورتی ملایم روی زمینهٔ تیره',
    swatch: ['#8b5cf6', '#ec4899'],
    icon: FilmReelIcon,
    atmosphere: 'فضای سینماییِ آرام با نورِ بنفش-صورتی و حسِ سینمای خانگی'
  },
  {
    id: 'batman',
    name: 'شوالیهٔ تاریکی',
    source: 'Batman — The Dark Knight',
    description: 'آسمان شبِ گاتهام با لهجهٔ آبی فولادی',
    swatch: ['#3b82f6', '#94a3b8'],
    icon: BatIcon,
    atmosphere: 'شبِ سنگینِ گاتهام، باران، سیاهِ عمیق با هالهٔ آبی فولادی و حسِ بلندمرتبه‌ایِ بروس وین'
  },
  {
    id: 'joker',
    name: 'جوکر',
    source: 'Joker',
    description: 'سبز اسیدی روی بنفشِ دیوانه',
    swatch: ['#22c55e', '#a855f7'],
    icon: JokerIcon,
    atmosphere: 'دیوانگیِ آرتور فلچر، رنگ‌های ناهنجار و حسِ هرج‌ومرجِ کمیک‌بوک'
  },
  {
    id: 'spiderman',
    name: 'مرد عنکبوتی',
    source: 'Spider-Man',
    description: 'قرمز و آبیِ شب‌های نیویورک',
    swatch: ['#ef4444', '#3b82f6'],
    icon: SpiderIcon,
    atmosphere: 'شبِ نیویورک با تارِ عنکبوت در گوشه‌ها، آسمان‌خراشِ مه‌آلود، قرمزِ جسور و آبیِ متعادل'
  },
  {
    id: 'matrix',
    name: 'ماتریکس',
    source: 'The Matrix',
    description: 'سبز ترمینالیِ دنیای کد',
    swatch: ['#22c55e', '#0f766e'],
    icon: MatrixIcon,
    atmosphere: 'ترمینالِ سبزِ ماتریکس با بارانِ کدِ در حال ریزش و خطوطِ اسکنِ صفحه'
  },
  {
    id: 'breakingbad',
    name: 'برکینگ بد',
    source: 'Breaking Bad',
    description: 'سبزِ آزمایشگاهی و زردِ هشدار',
    swatch: ['#65a30d', '#eab308'],
    icon: AtomIcon,
    atmosphere: 'آزمایشگاهِ زیرزمینی، نمادِ اتمِ خطرناک، خطوطِ هشدارِ زرد-مشکی'
  },
  {
    id: 'harrypotter',
    name: 'هری پاتر',
    source: 'Harry Potter',
    description: 'طلاییِ گریفیندور روی سرمه‌ای جادو',
    swatch: ['#d4af37', '#9f1239'],
    icon: LightningIcon,
    atmosphere: 'قلعهٔ هاگوارتز در شب، ابرهای نقره‌ای، جادو و طلوعِ طلاییِ گریفیندور'
  },
  {
    id: 'starwars',
    name: 'جنگ ستارگان',
    source: 'Star Wars',
    description: 'طلاییِ نورِ شمشیر روی مشکی فضا',
    swatch: ['#facc15', '#38bdf8'],
    icon: LightsaberIcon,
    atmosphere: 'فضای عمیقِ پر از ستاره، هالهٔ نورِ شمشیر نوری، حسیِ حماسیِ کهکشانی'
  },
  {
    id: 'got',
    name: 'بازی تاج و تخت',
    source: 'Game of Thrones',
    description: 'یخِ شمال و آتشِ اژدها',
    swatch: ['#7dd3fc', '#fb923c'],
    icon: DragonIcon,
    atmosphere: 'زمستانِ آینده، یخِ شمال و آتشِ اژدها، حسیِ قرون‌وسطه‌ایِ سلطنتی'
  }
]

export function getStoredThemeId(): string {
  if (typeof window === 'undefined') return 'default'
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'default'
  } catch {
    return 'default'
  }
}

/** تم را روی <html> اعمال و در localStorage ذخیره می‌کند */
export function applyTheme(id: string): void {
  if (typeof document === 'undefined') return
  const theme = THEMES.find((t) => t.id === id) || THEMES[0]
  document.documentElement.setAttribute('data-theme', theme.id)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme.id)
  } catch {
    /* حالت خصوصی مرورگر */
  }
  // به سایدبار (و هر کس دیگری که گوش می‌دهد) اطلاع بده تم عوض شد
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('theme-changed'))
  }
}

/** آیکون تزئینیِ تمِ فعلی — برای استفاده در سایدبار */
export function getThemeIcon(id: string): ComponentType<SVGProps<SVGSVGElement>> {
  return THEMES.find((t) => t.id === id)?.icon || FilmReelIcon
}
