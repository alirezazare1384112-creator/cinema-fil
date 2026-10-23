'use client'

import { ThemeDefinition } from '@/lib/themes'

interface ThemePreviewProps {
  theme: ThemeDefinition
}

/**
 * Mini live preview of a single theme: a small "stage" with the theme's
 * actual background tint, decorative icon, sample button and a sample card,
 * so the user can feel the theme before applying it.
 *
 * The preview is rendered inline (not an iframe) using inline styles that
 * mirror the per-theme CSS variables defined in globals.css. This way the
 * preview is faithful without needing a full DOM subtree with [data-theme].
 */
/**
 * الگوهای پس‌زمینهٔ تم‌ها حالا فایل‌های SVG مستقل در public/themes/patterns
 * هستند (همان فایل‌هایی که globals.css استفاده می‌کند) — قبلاً همان SVG
 * هم داخل CSS و هم داخل این کامپوننت به‌صورت Data-URL تکرار می‌شد.
 * فقط اندازه/شفافیتِ مناسبِ پیش‌نمایش اینجا تنظیم می‌شود.
 */
const PATTERN_INFO: Record<string, { url: string | null; size: string; opacity: number }> = {
  default: { url: null, size: '600px 600px', opacity: 0 },
  batman: { url: "url('/themes/patterns/batman.svg')", size: '600px 600px', opacity: 0.5 },
  joker: { url: "url('/themes/patterns/joker.svg')", size: '200px 200px', opacity: 1 },
  spiderman: { url: "url('/themes/patterns/spiderman.svg')", size: '300px 300px', opacity: 0.22 },
  matrix: { url: "url('/themes/patterns/matrix.svg')", size: '200px 400px', opacity: 0.35 },
  breakingbad: { url: "url('/themes/patterns/breakingbad.svg')", size: '60px 60px', opacity: 0.7 },
  harrypotter: { url: "url('/themes/patterns/harrypotter.svg')", size: '200px 200px', opacity: 0.5 },
  starwars: { url: "url('/themes/patterns/starwars.svg')", size: '200px 200px', opacity: 0.7 },
  got: { url: "url('/themes/patterns/got.svg')", size: '100px 100px', opacity: 0.45 }
}

const FONT_STACK: Record<string, string> = {
  default: "'Inter', system-ui, sans-serif",
  batman: "'Georgia', serif",
  joker: "'Impact', 'Arial Black', sans-serif",
  spiderman: "'Bangers', 'Impact', 'Arial Black', sans-serif",
  matrix: "'Courier New', monospace",
  breakingbad: "'Arial Black', 'Impact', sans-serif",
  harrypotter: "'Georgia', serif",
  starwars: "'Arial Black', 'Impact', sans-serif",
  got: "'Georgia', serif"
}

export default function ThemePreview({ theme }: ThemePreviewProps) {
  const Icon = theme.icon
  const pattern = PATTERN_INFO[theme.id] || PATTERN_INFO.default
  const fontFamily = FONT_STACK[theme.id] || FONT_STACK.default

  // background colors per theme (mirrors globals.css :root variables)
  const bgColors: Record<string, string> = {
    default: '#0a0a0f',
    batman: '#05070d',
    joker: '#0b0710',
    spiderman: '#0a0810',
    matrix: '#020604',
    breakingbad: '#060a06',
    harrypotter: '#07060e',
    starwars: '#050505',
    got: '#060810'
  }
  const bg = bgColors[theme.id] || '#0a0a0f'

  return (
    <div
      className="relative h-28 w-full overflow-hidden"
      style={{
        backgroundColor: bg,
        // فقط هاله‌های رنگی روی خودِ کارت؛ الگو در لایهٔ جداگانه با شفافیتِ
        // درست (همان مقدارِ تمِ واقعی در globals.css) کشیده می‌شود.
        backgroundImage: `radial-gradient(60% 80% at 20% 10%, ${theme.swatch[0]}33, transparent 60%), radial-gradient(50% 60% at 90% 10%, ${theme.swatch[1]}26, transparent 60%)`,
        backgroundSize: '100% 100%, 100% 100%',
        backgroundPosition: 'center, center',
        backgroundRepeat: 'no-repeat, no-repeat'
      }}
    >
      {/* الگوی تم با شفافیتِ نهایی — قبلاً این div خالی بود و الگو با
          شفافیت کامل (۱) رسم می‌شد؛ برای همین پیش‌نمایش از خودِ تم شلوغ‌تر بود. */}
      {pattern.url != null && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: pattern.url,
            backgroundSize: pattern.size,
            backgroundPosition: 'center top',
            backgroundRepeat: 'repeat',
            opacity: pattern.opacity
          }}
        />
      )}

      {/* Theme icon in the top-right corner */}
      <div
        className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-lg border border-white/10"
        style={{ backgroundColor: `${theme.swatch[0]}33` }}
      >
        <Icon className="w-4 h-4" style={{ color: theme.swatch[0] }} />
      </div>

      {/* Sample mini glass-card + sample button — like real app */}
      <div className="absolute bottom-2 right-2 left-2 flex items-end justify-between gap-2">
        <div
          className="flex-1 rounded-md px-2 py-1.5"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${theme.swatch[0]}40`,
            fontFamily
          }}
        >
          <p
            className="text-[10px] font-bold leading-tight truncate"
            style={{ color: '#fff', fontFamily }}
          >
            {theme.name}
          </p>
          <p className="text-[8px] leading-tight truncate mt-0.5" style={{ color: '#9ca3af' }}>
            {theme.id === 'spiderman' ? 'پوستر در نقلِ قول' : 'نمونه کارت'}
          </p>
        </div>
        <span
          className="shrink-0 rounded-md text-[9px] font-bold px-2 py-1.5 text-white"
          style={{
            backgroundColor: theme.swatch[0],
            fontFamily
          }}
        >
          دکمه
        </span>
      </div>

      {/* Spider-Man: یک «movie still» کوچک در گوشهٔ پایین چپ — نشون‌دهندهٔ
          جایی که تصویر در ریبونِ نقلِ قولِ سایدبار استفاده می‌شه */}
      {theme.id === 'spiderman' && (
        <div
          className="absolute bottom-2 left-2 w-14 h-9 rounded-md overflow-hidden border border-red-500/50 shadow-lg"
          style={{
            backgroundImage: 'url(/themes/spiderman/bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 25%',
          }}
          title="تصویر در ریبون نقلِ قول سایدبار استفاده می‌شه"
        />
      )}
    </div>
  )
}
