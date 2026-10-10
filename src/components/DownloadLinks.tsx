'use client'

import { useState } from 'react'
import { Download, Subtitles, Copy, Check, Play } from 'lucide-react'

export interface DownloadItem {
  group: string
  quality: string
  url: string
}

export interface SubtitleLink {
  label: string
  url: string
}

interface DownloadLinksProps {
  downloads?: DownloadItem[]
  subtitles?: SubtitleLink[]
  /** لینک مستقیم تریلر (معمولاً MP4) */
  trailer?: string | null
  /** کلید تریلر یوتیوب */
  trailerKey?: string
  title?: string
  posterSrc?: string | null
  className?: string
}

/**
 * بلوک «لینک دانلود + زیرنویس + تریلر» — هم در پیش‌نمایشِ کشف و هم در
 * پنجرهٔ رسانهٔ کتابخانه استفاده می‌شود تا ظاهر و رفتار یکسان بماند.
 */
export default function DownloadLinks({
  downloads,
  subtitles,
  trailer,
  trailerKey,
  title,
  posterSrc,
  className = ''
}: DownloadLinksProps) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl((prev) => (prev === url ? null : prev)), 1600)
    } catch {
      // مرورگر اجازهٔ کپی نداد
    }
  }

  // گروه‌بندی بر اساس نوع نسخه / فصل
  const groups: { group: string; items: { quality: string; url: string }[] }[] = []
  for (const d of downloads || []) {
    const key = d.group || 'سایر'
    let group = groups.find((x) => x.group === key)
    if (!group) {
      group = { group: key, items: [] }
      groups.push(group)
    }
    group.items.push({ quality: d.quality, url: d.url })
  }

  const youtubeKey =
    trailerKey || (trailer ? (trailer.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|embed\/)([\w-]{6,})/) || [])[1] : undefined)
  const trailerMp4 = !youtubeKey && trailer && !trailer.includes('youtube') ? trailer : null
  const subtitleLinks = subtitles || []

  if (groups.length === 0 && subtitleLinks.length === 0 && !youtubeKey && !trailerMp4) return null

  return (
    <div className={className}>
      {groups.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-400" />
            لینک دانلود
            <span className="text-gray-500 font-normal text-xs">({(downloads || []).length} لینک)</span>
          </h3>
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.group} className="rounded-xl bg-white/5 border border-white/10 p-3">
                <p className="text-xs text-violet-300 font-medium mb-2">{g.group}</p>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((d) => (
                    <span
                      key={`${d.quality}-${d.url}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 overflow-hidden"
                    >
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/25 transition-colors"
                        title={`دانلود ${d.quality}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        {d.quality}
                      </a>
                      <button
                        onClick={() => copyLink(d.url)}
                        title="کپی لینک"
                        className="px-2 py-1.5 text-emerald-300/70 hover:text-emerald-200 hover:bg-emerald-500/25 transition-colors border-r border-emerald-500/20"
                      >
                        {copiedUrl === d.url ? (
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            لینک‌ها مستقیم و از سایت مبدأ هستند؛ اگر دانلود شروع نشد فیلترشکن را خاموش کنید.
          </p>
        </div>
      )}

      {subtitleLinks.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Subtitles className="w-4 h-4 text-sky-400" />
            زیرنویس
          </h3>
          <div className="flex flex-wrap gap-2">
            {subtitleLinks.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500/15 border border-sky-500/20 text-xs text-sky-200 hover:bg-sky-500/25 transition-colors"
              >
                <Subtitles className="w-3.5 h-3.5" />
                {s.label}
              </a>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            نسخه‌های «زیرنویس فارسی چسبیده» همان لینک‌های دانلود بالا هستند.
          </p>
        </div>
      )}

      {(youtubeKey || trailerMp4) && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Play className="w-4 h-4 text-pink-400" />
            تریلر
          </h3>
          {youtubeKey ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeKey}`}
                title={`تریلر ${title || ''}`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <video
              src={trailerMp4 as string}
              poster={posterSrc || undefined}
              controls
              preload="none"
              className="w-full max-h-80 rounded-xl bg-black"
            />
          )}
        </div>
      )}
    </div>
  )
}
