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
const PATTERN_INFO: Record<string, { url: string | null; size: string; opacity: number }> = {
  default:    { url: null, size: '600px 600px', opacity: 0 },
  batman: {
    url: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'><g fill='none' stroke='%233b82f6' stroke-width='0.6' opacity='0.5'><path d='M300 80 L280 140 L260 200 M300 80 L320 140 L340 200 M300 80 L300 200'/><circle cx='300' cy='80' r='3' fill='%233b82f6'/></g></svg>\")",
    size: '600px 600px',
    opacity: 0.5
  },
  joker: {
    url: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><text x='10' y='40' font-family='Arial Black' font-size='24' fill='%2322c55e' opacity='0.18' font-weight='900'>HA</text><text x='60' y='80' font-family='Arial Black' font-size='20' fill='%23a855f7' opacity='0.15' font-weight='900'>HA</text><text x='110' y='40' font-family='Arial Black' font-size='26' fill='%2322c55e' opacity='0.18' font-weight='900'>HA</text><text x='40' y='130' font-family='Arial Black' font-size='22' fill='%23a855f7' opacity='0.16' font-weight='900'>HA</text><text x='110' y='170' font-family='Arial Black' font-size='24' fill='%2322c55e' opacity='0.16' font-weight='900'>HA</text></svg>\")",
    size: '200px 200px',
    opacity: 1
  },
  spiderman: {
    url: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'><g fill='none' stroke='%23ef4444' stroke-width='1' opacity='0.6'><g><line x1='0' y1='0' x2='120' y2='0'/><line x1='0' y1='0' x2='0' y2='120'/><line x1='0' y1='0' x2='120' y2='40'/><line x1='0' y1='0' x2='40' y2='120'/><line x1='0' y1='0' x2='120' y2='120'/><path d='M 30 0 Q 5 25 0 30'/><path d='M 60 0 Q 5 55 0 60'/><path d='M 90 0 Q 5 85 0 90'/></g><g transform='translate(300,0) scale(-1,1)'><line x1='0' y1='0' x2='120' y2='0'/><line x1='0' y1='0' x2='0' y2='120'/><line x1='0' y1='0' x2='120' y2='40'/><line x1='0' y1='0' x2='40' y2='120'/><line x1='0' y1='0' x2='120' y2='120'/><path d='M 30 0 Q 5 25 0 30'/><path d='M 60 0 Q 5 55 0 60'/><path d='M 90 0 Q 5 85 0 90'/></g></g></svg>\")",
    size: '300px 300px',
    opacity: 0.22
  },
  matrix: {
    url: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><g font-family='Courier New, monospace' font-size='10' fill='%2322c55e'><text x='5' y='15' opacity='0.9'>1</text><text x='5' y='30' opacity='0.5'>0</text><text x='5' y='45' opacity='0.85'>1</text><text x='5' y='60' opacity='0.4'>0</text><text x='25' y='20' opacity='0.7'>0</text><text x='25' y='35' opacity='0.4'>1</text><text x='25' y='50' opacity='0.8'>0</text><text x='45' y='15' opacity='0.85'>1</text><text x='45' y='30' opacity='0.5'>0</text><text x='45' y='45' opacity='0.7'>1</text><text x='65' y='25' opacity='0.6'>0</text><text x='65' y='40' opacity='0.3'>1</text><text x='85' y='15' opacity='0.8'>1</text><text x='85' y='30' opacity='0.4'>0</text><text x='85' y='45' opacity='0.95'>1</text><text x='105' y='20' opacity='0.7'>0</text><text x='105' y='35' opacity='0.4'>1</text><text x='125' y='15' opacity='0.9'>1</text><text x='125' y='30' opacity='0.5'>0</text><text x='145' y='25' opacity='0.65'>0</text><text x='165' y='15' opacity='0.75'>1</text></g></svg>\")",
    size: '200px 200px',
    opacity: 0.35
  },
  breakingbad: {
    url: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'><path d='M0 0 L20 0 L20 12 L0 12 Z' fill='%23eab308' opacity='0.08'/><path d='M20 0 L40 0 L40 12 L20 12 Z' fill='%23000' opacity='0.25'/><path d='M40 0 L60 0 L60 12 L40 12 Z' fill='%23eab308' opacity='0.08'/><path d='M0 12 L20 12 L20 24 L0 24 Z' fill='%23000' opacity='0.25'/><path d='M20 12 L40 12 L40 24 L20 24 Z' fill='%23eab308' opacity='0.08'/><path d='M40 12 L60 12 L60 24 L40 24 Z' fill='%23000' opacity='0.25'/></svg>\")",
    size: '60px 60px',
    opacity: 0.7
  },
  harrypotter: {
    url: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><g fill='%23d4af37'><circle cx='30' cy='40' r='1.2' opacity='0.5'/><circle cx='90' cy='20' r='1' opacity='0.4'/><circle cx='140' cy='60' r='1.5' opacity='0.6'/><circle cx='40' cy='100' r='1.2' opacity='0.5'/><circle cx='100' cy='120' r='1.5' opacity='0.6'/><circle cx='160' cy='100' r='1' opacity='0.4'/><circle cx='60' cy='170' r='1.2' opacity='0.5'/><circle cx='120' cy='180' r='1' opacity='0.4'/></g></svg>\")",
    size: '200px 200px',
    opacity: 0.5
  },
  starwars: {
    url: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><g fill='%23ffffff'><circle cx='15' cy='20' r='0.8' opacity='0.9'/><circle cx='45' cy='60' r='1' opacity='0.7'/><circle cx='80' cy='30' r='0.6' opacity='0.5'/><circle cx='110' cy='90' r='1.2' opacity='0.85'/><circle cx='150' cy='40' r='0.8' opacity='0.6'/><circle cx='180' cy='80' r='1' opacity='0.75'/><circle cx='25' cy='110' r='0.9' opacity='0.7'/><circle cx='75' cy='150' r='1.1' opacity='0.8'/><circle cx='120' cy='130' r='0.5' opacity='0.5'/><circle cx='170' cy='160' r='1' opacity='0.75'/><circle cx='40' cy='180' r='0.8' opacity='0.65'/><circle cx='90' cy='190' r='0.6' opacity='0.55'/></g></svg>\")",
    size: '200px 200px',
    opacity: 0.7
  },
  got: {
    url: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><g fill='none' stroke='%237dd3fc' stroke-width='0.5' opacity='0.5'><path d='M50 10 L60 30 L50 40 L40 30 Z'/><path d='M50 40 L65 55 L50 65 L35 55 Z'/></g></svg>\")",
    size: '100px 100px',
    opacity: 0.45
  }
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
        backgroundImage:
          pattern.url != null
            ? `${pattern.url}, radial-gradient(60% 80% at 20% 10%, ${theme.swatch[0]}33, transparent 60%), radial-gradient(50% 60% at 90% 10%, ${theme.swatch[1]}26, transparent 60%)`
            : `radial-gradient(60% 80% at 20% 10%, ${theme.swatch[0]}33, transparent 60%), radial-gradient(50% 60% at 90% 10%, ${theme.swatch[1]}26, transparent 60%)`,
        backgroundSize: `${pattern.size}, 100% 100%, 100% 100%`,
        backgroundPosition: 'center top, center, center',
        backgroundRepeat: 'repeat, no-repeat, no-repeat'
      }}
    >
      {/* Subtle pattern opacity overlay */}
      {pattern.url != null && pattern.opacity < 1 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ opacity: pattern.opacity }}
        />
      )}

      {/* Theme icon in the top-right corner */}
      <div
        className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-lg backdrop-blur-sm border border-white/10"
        style={{ backgroundColor: `${theme.swatch[0]}33` }}
      >
        <Icon className="w-4 h-4" style={{ color: theme.swatch[0] }} />
      </div>

      {/* Sample mini glass-card + sample button — like real app */}
      <div className="absolute bottom-2 right-2 left-2 flex items-end justify-between gap-2">
        <div
          className="flex-1 rounded-md px-2 py-1.5 backdrop-blur-sm"
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
