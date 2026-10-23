'use client'

import { useState } from 'react'
import { Download, Subtitles, Copy, Check, Play, X, MonitorPlay } from 'lucide-react'
import { pickPlayable, isHevcQuality, isBrowserPlayable, buildSeries } from '@/lib/playable'
import SeriesStream from '@/components/SeriesStream'

export interface DownloadItem {
  group: string
  quality: string
  url: string
}

export interface SubtitleLink {
  label: string
  url: string
}

/** یک چیپ «دانلود + کپی» — مشترک بین نمای فیلم و نمای فصل/نسخهٔ سریال */
function DownloadChip({
  quality,
  url,
  copied,
  onCopy
}: {
  quality: string
  url: string
  copied: boolean
  onCopy: (url: string) => void
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 overflow-hidden">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/25 transition-colors"
        title={`دانلود ${quality}`}
      >
        <Download className="w-3.5 h-3.5" />
        {quality}
      </a>
      <button
        onClick={() => onCopy(url)}
        title="کپی لینک"
        className="px-2 py-1.5 text-emerald-300/70 hover:text-emerald-200 hover:bg-emerald-500/25 transition-colors border-r border-emerald-500/20"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </span>
  )
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
  const [playingUrl, setPlayingUrl] = useState<string | null>(null)
  const [streaming, setStreaming] = useState<{ group: string; quality: string; url: string } | null>(null)
  const [streamBusy, setStreamBusy] = useState(false)
  const [subsOn, setSubsOn] = useState(false)
  const [playError, setPlayError] = useState('')

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl((prev) => (prev === url ? null : prev)), 1600)
    } catch {
      // مرورگر اجازهٔ کپی نداد
    }
  }

  const youtubeKey =
    trailerKey || (trailer ? (trailer.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|embed\/)([\w-]{6,})/) || [])[1] : undefined)
  const trailerMp4 = !youtubeKey && trailer && !trailer.includes('youtube') ? trailer : null
  const subtitleLinks = subtitles || []

  // سریال یا فیلم؟ اگر لینک‌ها قسمت‌دار باشند، بخش پخش آنلاین به
  // «فصل / نسخه / قسمت» تبدیل می‌شود تا همهٔ قسمت‌ها قابل تماشا باشند.
  const series = buildSeries(downloads)
  // فقط وقتی «لیست قسمت» واقعی داریم (دست‌کم دو قسمت در یک نسخه) سریال حساب می‌شود؛
  // فیلمی که برچسب کیفیتش عددی است نباید اشتباهی سریال شود.
  const isSeries = series.seasons.some((s) => s.variants.some((v) => v.episodes.length >= 2))

  // گروه‌بندی بر اساس نوع نسخه / فصل — برای سریال لازم نیست، چون نمایش
  // فصل/نسخه از همان ساختار buildSeries می‌آید (۳۰۰ لینک = ۳۰۰ آبجکت اضافه).
  const groups: { group: string; items: { quality: string; url: string }[] }[] = []
  if (!isSeries) {
    for (const d of downloads || []) {
      const key = d.group || 'سایر'
      let group = groups.find((x) => x.group === key)
      if (!group) {
        group = { group: key, items: [] }
        groups.push(group)
      }
      group.items.push({ quality: d.quality, url: d.url })
    }
  }

  // پخش آنلاین فیلم: mp4 غیر-HEVC داخل مرورگر، بقیه (MKV/x265) در پلیر سیستم
  const playable = isSeries ? [] : pickPlayable(downloads)
  const browserList = playable.filter((p) => isBrowserPlayable(p))
  const best = playable.length > 0 ? playable[0] : null
  const bestIsBrowser = best ? isBrowserPlayable(best) : false
  const bestIsHevc = best ? isHevcQuality(`${best.quality} ${best.group}`) : false
  const subPageUrl = subtitles?.find((s) =>
    /^https:\/\/(?:www\.)?(?:subzone\.ir|subf2m\.co)\/subtitles\/[^/]+\/?$/.test(s.url)
  )?.url
  const trackUrl = subPageUrl ? `/api/subtitle?subzone=${encodeURIComponent(subPageUrl)}` : null

  const startPlay = (url: string) => {
    setPlayError('')
    setSubsOn(false)
    setStreaming(null)
    setPlayingUrl(url)
  }

  const startStream = async (item: { group: string; quality: string; url: string }) => {
    setPlayError('')
    setPlayingUrl(null)
    setSubsOn(false)
    setStreamBusy(true)
    try {
      const res = await fetch('/api/play-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: item.url, stream: true })
      })
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: unknown }
      if (!res.ok || !data.success) {
        setPlayError(typeof data.error === 'string' ? data.error : 'پخش در پلیر سیستم شروع نشد.')
      } else {
        setStreaming(item)
      }
    } catch {
      setPlayError('خطا در ارتباط با سرور.')
    } finally {
      setStreamBusy(false)
    }
  }

  const hasDownloads = (downloads || []).length > 0
  if (!hasDownloads && subtitleLinks.length === 0 && !youtubeKey && !trailerMp4) return null

  const current = browserList.find((p) => p.url === playingUrl)

  return (
    <div className={className}>
      {isSeries && (
        <SeriesStream
          seasons={series.seasons}
          title={title}
          posterSrc={posterSrc}
          trackUrl={trackUrl}
          className="mt-6"
        />
      )}

      {!isSeries && playable.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Play className="w-4 h-4 text-violet-400" />
            پخش آنلاین
            <span className="text-gray-500 font-normal text-xs">({playable.length} نسخهٔ قابل‌پخش)</span>
          </h3>

          {!playingUrl && !streaming && best && (
            <>
              <button
                onClick={() => (bestIsBrowser ? startPlay(best.url) : startStream(best))}
                disabled={streamBusy}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-l from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white text-sm font-medium transition-all disabled:opacity-60"
              >
                <Play className="w-4 h-4" />
                {streamBusy
                  ? 'در حال باز کردن پلیر…'
                  : bestIsBrowser
                    ? `پخش داخل برنامه — ${best.group} · ${best.quality}`
                    : `پخش با پلیر سیستم — ${best.group} · ${best.quality}`}
              </button>

              <div className="flex flex-wrap gap-2 mt-2">
                {!bestIsBrowser && browserList.length > 0 && (
                  <button
                    onClick={() => startPlay(browserList[0].url)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    پخش داخل مرورگر ({browserList[0].quality})
                  </button>
                )}
                {bestIsBrowser && (
                  <button
                    onClick={() => startStream(best)}
                    disabled={streamBusy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-60"
                  >
                    <MonitorPlay className="w-3.5 h-3.5" />
                    پخش با پلیر سیستم
                  </button>
                )}
              </div>

              {!bestIsBrowser && (
                <p className="text-[11px] text-gray-500 mt-2">
                  {bestIsHevc
                    ? 'این نسخه x265/10bit است و مرورگر تصویرش را نشان نمی‌دهد؛ با پلیر سیستم استریم می‌شود — بدون دانلود کامل، با جلو/عقب بردن و زیرنویسِ داخلِ فایل.'
                    : 'این نسخه در پلیر سیستم استریم می‌شود — بدون دانلود کامل، با جلو/عقب بردن و زیرنویسِ داخلِ فایل.'}
                </p>
              )}
              {playable.length > 1 && !streamBusy && (
                <p className="text-[11px] text-gray-500 mt-1">
                  {bestIsBrowser
                    ? 'بعد از شروع پخش می‌توانی نسخه و کیفیت را عوض کنی.'
                    : 'بعد از باز شدن پلیر، از منوی نسخه می‌توانی فیلم دیگری را هم در پلیر باز کنی.'}
                </p>
              )}
              {playError && (
                <p className="text-[12px] text-red-400 mt-2">{playError}</p>
              )}
            </>
          )}

          {streaming && !playingUrl && (
            <div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-emerald-200">
                  <MonitorPlay className="w-4 h-4 text-emerald-300 shrink-0" />
                  در حال پخش در پلیر سیستم — {streaming.group} · {streaming.quality}
                </span>
                <button
                  onClick={() => {
                    setStreaming(null)
                    setPlayError('')
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  بستن
                </button>
              </div>

              {playable.length > 1 && (
                <select
                  value={streaming.url}
                  onChange={(e) => {
                    const next = playable.find((p) => p.url === e.target.value)
                    if (next) startStream(next)
                  }}
                  className="mt-2 w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-violet-500"
                >
                  {playable.map((p) => (
                    <option key={p.url} value={p.url}>
                      {p.group} — {p.quality}
                    </option>
                  ))}
                </select>
              )}

              <p className="text-[11px] text-gray-500 mt-2">
                استریم است و فیلم دانلود نمی‌شود؛ در منوی پلیر می‌توانی زبان صدا و زیرنویس را انتخاب کنی.
              </p>
              {playError && (
                <p className="text-[12px] text-red-400 mt-2">{playError}</p>
              )}
            </div>
          )}

          {playingUrl && (
            <div>
              <video
                key={playingUrl}
                src={`/api/play?url=${encodeURIComponent(playingUrl)}`}
                poster={posterSrc || undefined}
                controls
                autoPlay
                playsInline
                className="w-full max-h-96 rounded-xl bg-black"
                onError={() => setPlayError('پخش آنلاین شروع نشد؛ احتمالاً نسخهٔ این فرمت در مرورگر پخش نمی‌شود.')}
                onLoadedMetadata={(e) => {
                  // نسخه‌های HEVC بدون برچسب: ویدیو «پخش» می‌شود ولی فریمی رندر نمی‌شود
                  const el = e.currentTarget
                  setTimeout(() => {
                    if (el.isConnected && el.readyState >= 3 && !el.videoWidth) {
                      setPlayError('این نسخه در مرورگر تصویر ندارد (احتمالاً x265)؛ از دکمهٔ «پلیر سیستم» زیر ویدیو استفاده کن.')
                    }
                  }, 3500)
                }}
              >
                {subsOn && trackUrl && (
                  <track key={trackUrl} default kind="subtitles" srcLang="fa" label="فارسی" src={trackUrl} />
                )}
              </video>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                {browserList.length > 1 && (
                  <select
                    value={playingUrl}
                    onChange={(e) => startPlay(e.target.value)}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-violet-500"
                  >
                    {browserList.map((p) => (
                      <option key={p.url} value={p.url}>
                        {p.group} — {p.quality}
                      </option>
                    ))}
                  </select>
                )}
                {trackUrl && (
                  <button
                    onClick={() => setSubsOn((v) => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      subsOn
                        ? 'bg-sky-500/25 border-sky-400/40 text-sky-200'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <Subtitles className="w-3.5 h-3.5" />
                    زیرنویس فارسی: {subsOn ? 'روشن' : 'خاموش'}
                  </button>
                )}
                {current && (
                  <button
                    onClick={() => startStream(current)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-colors"
                  >
                    <MonitorPlay className="w-3.5 h-3.5" />
                    پلیر سیستم
                  </button>
                )}
                <button
                  onClick={() => {
                    setPlayingUrl(null)
                    setSubsOn(false)
                    setPlayError('')
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  بستن پخش
                </button>
              </div>

              {current?.group.includes('زیرنویس فارسی چسبیده') && (
                <p className="text-[11px] text-emerald-300/80 mt-2">
                  زیرنویس فارسیِ این نسخه روی تصویر چسبیده است؛ نیازی به دکمهٔ زیرنویس نیست.
                </p>
              )}
              {!current?.group.includes('زیرنویس فارسی چسبیده') && !subsOn && (
                <p className="text-[11px] text-gray-500 mt-2">
                  زیرنویس فارسیِ جداگانه (در صورت موجود بودن) با دکمهٔ بالا فعال می‌شود.
                </p>
              )}
              {playError && (
                <p className="text-[12px] text-red-400 mt-2">{playError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {hasDownloads && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-400" />
            لینک دانلود
            <span className="text-gray-500 font-normal text-xs">({(downloads || []).length} لینک)</span>
          </h3>

          {/* برای سریال‌ها صدها لینک وجود دارد (۳۰۰+ لینک = ۳۰۰ دکمه در DOM).
              اینجا به‌جای رندر همه، فصل‌ها و نسخه‌ها جمع‌شده‌اند و فقط با باز
              کردن هر بخش، لینک‌های همان نسخه ساخته می‌شوند. */}
          {isSeries ? (
            <div className="space-y-2">
              {series.seasons.map((season) => (
                <details key={season.key} className="rounded-xl bg-white/5 border border-white/10">
                  <summary className="cursor-pointer select-none px-3 py-2 text-xs flex flex-wrap items-center gap-2">
                    <span className="text-violet-300 font-medium">{season.label}</span>
                    <span className="text-gray-500">
                      {season.variants.length} نسخه · {season.episodeCount} قسمت
                    </span>
                  </summary>
                  <div className="px-3 pb-3 space-y-2">
                    {season.variants.map((v) => (
                      <details key={v.key} className="rounded-lg bg-black/25 border border-white/5">
                        <summary className="cursor-pointer select-none px-2.5 py-1.5 text-[11px] flex flex-wrap items-center gap-2">
                          <span className="text-sky-300">
                            {[v.version, v.quality].filter(Boolean).join(' · ')}
                          </span>
                          <span className="text-gray-500">({v.episodes.length} لینک)</span>
                        </summary>
                        <div className="flex flex-wrap gap-2 p-2">
                          {v.episodes.map((ep) => (
                            <DownloadChip
                              key={`${ep.episode}-${ep.url}`}
                              quality={ep.label}
                              url={ep.url}
                              copied={copiedUrl === ep.url}
                              onCopy={copyLink}
                            />
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((g) => (
                <div key={g.group} className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <p className="text-xs text-violet-300 font-medium mb-2">{g.group}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map((d) => (
                      <DownloadChip
                        key={`${d.quality}-${d.url}`}
                        quality={d.quality}
                        url={d.url}
                        copied={copiedUrl === d.url}
                        onCopy={copyLink}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
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
