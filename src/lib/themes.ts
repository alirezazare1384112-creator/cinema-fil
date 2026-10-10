/**
 * تم‌های ظاهر بر اساس شخصیت‌ها و فیلم/سریال‌های محبوب.
 *
 * رنگ‌ها در `globals.css` با `[data-theme="..."]` تعریف شده‌اند؛ این فایل فقط
 * فهرست و متادیتای تم‌ها را نگه می‌دارد و انتخاب کاربر را اعمال/ذخیره می‌کند.
 */

export interface ThemeDefinition {
  id: string
  /** نام فارسی تم */
  name: string
  /** اثر الهام‌بخش */
  source: string
  /** توضیح کوتاه */
  description: string
  /** رنگ‌های نمونه برای کارت پیش‌نمایش */
  swatch: string[]
}

export const THEME_STORAGE_KEY = 'cinema_theme'

export const THEMES: ThemeDefinition[] = [
  {
    id: 'default',
    name: 'بنفش سینمایی',
    source: 'حالت پیش‌فرض برنامه',
    description: 'بنفش و صورتی ملایم روی زمینهٔ تیره',
    swatch: ['#8b5cf6', '#ec4899']
  },
  {
    id: 'batman',
    name: 'شوالیهٔ تاریکی',
    source: 'Batman — The Dark Knight',
    description: 'آسمان شبِ گاتهام با لهجهٔ آبی فولادی',
    swatch: ['#3b82f6', '#94a3b8']
  },
  {
    id: 'joker',
    name: 'جوکر',
    source: 'Joker',
    description: 'سبز اسیدی روی بنفشِ دیوانه',
    swatch: ['#22c55e', '#a855f7']
  },
  {
    id: 'spiderman',
    name: 'مرد عنکبوتی',
    source: 'Spider-Man',
    description: 'قرمز و آبیِ شب‌های نیویورک',
    swatch: ['#ef4444', '#3b82f6']
  },
  {
    id: 'matrix',
    name: 'ماتریکس',
    source: 'The Matrix',
    description: 'سبز ترمینالیِ دنیای کد',
    swatch: ['#22c55e', '#0f766e']
  },
  {
    id: 'breakingbad',
    name: 'برکینگ بد',
    source: 'Breaking Bad',
    description: 'سبزِ آزمایشگاهی و زردِ هشدار',
    swatch: ['#65a30d', '#eab308']
  },
  {
    id: 'harrypotter',
    name: 'هری پاتر',
    source: 'Harry Potter',
    description: 'طلاییِ گریفیندور روی سرمه‌ای جادو',
    swatch: ['#d4af37', '#9f1239']
  },
  {
    id: 'starwars',
    name: 'جنگ ستارگان',
    source: 'Star Wars',
    description: 'طلاییِ نورشمشیر روی مشکی فضا',
    swatch: ['#facc15', '#38bdf8']
  },
  {
    id: 'got',
    name: 'بازی تاج و تخت',
    source: 'Game of Thrones',
    description: 'یخِ شمال و آتشِ اژدها',
    swatch: ['#7dd3fc', '#fb923c']
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
}
