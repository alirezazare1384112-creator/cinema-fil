'use client'

import { useState } from 'react'
import { Play, MonitorPlay, X, Subtitles, SkipBack, SkipForward, Loader2 } from 'lucide-react'
import {
  bestVariant,
  isBrowserPlayable,
  variantLabel,
  type SeriesEpisode,
  type SeriesSeason,
  type SeriesVariant
} from '@/lib/playable'

interface SeriesStreamProps {
  seasons: SeriesSeason[]
  title?: string
  posterSrc?: string | null
  /** آدرس زیرنویس فارسی (VTT) برای پخش داخل مرورگر */
  trackUrl?: string | null
  className?: string
}

interface ActivePlay {
  url: string
  label: string
  episode: number
  mode: 'browser' | 'system'
}

const faNum = (n: number) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d])

/**
 * پخش آنلاین سریال — انتخاب فصل، انتخاب نسخه (دوبله/زیرنویس/کیفیت) و
 * لیست شماره‌دار قسمت‌ها. هر قسمت جداگانه استریم می‌شود؛ نسخه‌های mp4
 * داخل خودِ برنامه و نسخه‌های MKV/x265 در پلیر سیستم (بدون دانلود کامل).
 */
export default function SeriesStream({ seasons, title, posterSrc, trackUrl, className = '' }: SeriesStreamProps) {
  const [seasonKey, setSeasonKey] = useState(seasons[0]?.key ?? '')
  const [variantKey, setVariantKey] = useState(() => bestVariant(seasons[0])?.key ?? '')
  const [active, setActive] = useState<ActivePlay | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [subsOn, setSubsOn] = useState(false)

  const season = seasons.find((s) => s.key === seasonKey) || seasons[0]
  const variant = season?.variants.find((v) => v.key === variantKey) || bestVariant(season)

  const totalEpisodes = seasons.reduce((sum, s) => sum + s.episodeCount, 0)

  /** نسخهٔ جایگزینی که همین قسمت را داخل مرورگر پخش می‌کند (اگر باشد) */
  const browserAlternative = (() => {
    if (!season || !active || active.mode === 'browser') return null
    for (const v of season.variants) {
      const ep = v.episodes.find((e) => e.episode === active.episode)
      if (ep && isBrowserPlayable({ url: ep.url, quality: v.quality, group: v.version })) {
        return { variant: v, episode: ep }
      }
    }
    return null
  })()

  const stop = () => {
    setActive(null)
    setError('')
    setSubsOn(false)
  }

  const changeSeason = (key: string) => {
    const next = seasons.find((s) => s.key === key)
    if (!next) return
    const sameVersion = next.variants.find((v) => v.version === variant?.version)
    setSeasonKey(key)
    setVariantKey((sameVersion || bestVariant(next))?.key ?? '')
    stop()
  }

  const playEpisode = async (
    targetSeason: SeriesSeason,
    targetVariant: SeriesVariant,
    episode: SeriesEpisode,
    prefer: 'auto' | 'browser' | 'system' = 'auto'
  ) => {
    setError('')
    setSeasonKey(targetSeason.key)
    setVariantKey(targetVariant.key)

    const browserFits =
      prefer === 'browser' ||
      (prefer === 'auto' &&
        isBrowserPlayable({ url: episode.url, quality: targetVariant.quality, group: targetVariant.version }))

    if (browserFits) {
      setActive({ url: episode.url, label: episode.label, episode: episode.episode, mode: 'browser' })
      return
    }

    setBusy(true)
    try {
      const res = await fetch('/api/play-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: episode.url, stream: true })
      })
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: unknown }
      if (!res.ok || data.success === false) {
        setError(typeof data.error === 'string' ? data.error : 'پخش در پلیر سیستم شروع نشد.')
      } else {
        setActive({ url: episode.url, label: episode.label, episode: episode.episode, mode: 'system' })
      }
    } catch {
      setError('خطا در ارتباط با سرور.')
    } finally {
      setBusy(false)
    }
  }

  /** قسمت بعد/قبل — در پایان فصل، به فصل بعد/قبل می‌رود */
  const neighbour = (direction: 1 | -1) => {
    if (!season || !variant || !active) return null
    const index = variant.episodes.findIndex((e) => e.episode === active.episode)
    if (index < 0) return null

    const sibling = variant.episodes[index + direction]
    if (sibling) return { season, variant, episode: sibling }

    const seasonIndex = seasons.findIndex((s) => s.key === season.key)
    const nextSeason = seasons[seasonIndex + direction]
    if (!nextSeason) return null

    const nextVariant =
      nextSeason.variants.find((v) => v.version === variant.version) || bestVariant(nextSeason)
    if (!nextVariant || !nextVariant.episodes.length) return null

    const episode =
      direction > 0 ? nextVariant.episodes[0] : nextVariant.episodes[nextVariant.episodes.length - 1]
    return { season: nextSeason, variant: nextVariant, episode }
  }

  const gotoNeighbour = (direction: 1 | -1) => {
    const target = neighbour(direction)
    if (target) void playEpisode(target.season, target.variant, target.episode)
  }

  if (!season || !variant) return null

  const prev = active ? neighbour(-1) : null
  const next = active ? neighbour(1) : null
  const variantIsBrowser = variant.episodes.some((e) =>
    isBrowserPlayable({ url: e.url, quality: variant.quality, group: variant.version })
  )

  return (
    <div className={className}>
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <Play className="w-4 h-4 text-violet-400" />
          پخش آنلاین سریال
          <span className="text-gray-500 font-normal text-xs">
            ({faNum(totalEpisodes)} قسمت
            {seasons.length > 1 ? ` · ${faNum(seasons.length)} فصل` : ''})
          </span>
        </h3>

        {/* فصل‌ها */}
        {seasons.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {seasons.map((s) => (
              <button
                key={s.key}
                onClick={() => changeSeason(s.key)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  s.key === season.key
                    ? 'bg-violet-500/25 border-violet-400/50 text-violet-100'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* نسخه‌ها */}
        <div className="flex flex-wrap gap-2 mb-3">
          {season.variants.map((v) => (
            <button
              key={v.key}
              onClick={() => {
                setVariantKey(v.key)
                stop()
              }}
              title={[v.version, v.quality].filter(Boolean).join(' — ')}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                v.key === variant.key
                  ? 'bg-sky-500/20 border-sky-400/45 text-sky-100'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              {variantLabel(v)}
            </button>
          ))}
        </div>

        {/* پخش‌کننده */}
        {!active && (
          <div className="rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3">
            <p className="text-[12px] text-gray-400">
              روی شمارهٔ هر قسمت بزن تا همان قسمت استریم شود.
              {!variantIsBrowser && (
                <span className="text-gray-500">
                  {' '}
                  نسخهٔ انتخاب‌شده MKV/x265 است و مرورگر تصویرش را نشان نمی‌دهد؛ در پلیر سیستم
                  (PotPlayer/VLC) بدون دانلود کامل پخش می‌شود.
                </span>
              )}
            </p>
            {busy && (
              <p className="text-[12px] text-gray-400 mt-2 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                در حال باز کردن پلیر…
              </p>
            )}
            {error && <p className="text-[12px] text-red-400 mt-2">{error}</p>}
          </div>
        )}

        {active?.mode === 'system' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-emerald-200">
                <MonitorPlay className="w-4 h-4 text-emerald-300 shrink-0" />
                {active.label} در پلیر سیستم در حال پخش است
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => gotoNeighbour(-1)}
                  disabled={!prev || busy}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-40"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                  قبلی
                </button>
                <button
                  onClick={() => gotoNeighbour(1)}
                  disabled={!next || busy}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-xs text-emerald-100 hover:bg-emerald-500/30 transition-colors disabled:opacity-40"
                >
                  قسمت بعد
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={stop}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  بستن
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {browserAlternative && (
                <button
                  onClick={() =>
                    playEpisode(season, browserAlternative.variant, browserAlternative.episode)
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  پخش داخل مرورگر ({variantLabel(browserAlternative.variant)})
                </button>
              )}
              {!browserAlternative && (
                <button
                  onClick={() =>
                    playEpisode(
                      season,
                      variant,
                      variant.episodes.find((e) => e.url === active.url) || variant.episodes[0],
                      'browser'
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-colors"
                  title="اگر مرورگر شما این فرمت را پخش می‌کند، اینجا امتحان کنید"
                >
                  <Play className="w-3.5 h-3.5" />
                  امتحان پخش در مرورگر
                </button>
              )}
            </div>

            <p className="text-[11px] text-gray-500 mt-2">
              استریم است و قسمت دانلود نمی‌شود؛ با دکمهٔ «قسمت بعد» همان پنجرهٔ پلیر قسمت بعدی را
              باز می‌کند.
            </p>
            {busy && (
              <p className="text-[12px] text-gray-400 mt-2 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                در حال باز کردن قسمت بعدی…
              </p>
            )}
            {error && <p className="text-[12px] text-red-400 mt-2">{error}</p>}
          </div>
        )}

        {active?.mode === 'browser' && (
          <div>
            <video
              key={active.url}
              src={`/api/play?url=${encodeURIComponent(active.url)}`}
              poster={posterSrc || undefined}
              controls
              autoPlay
              playsInline
              className="w-full max-h-80 rounded-xl bg-black"
              onEnded={() => gotoNeighbour(1)}
              onError={() =>
                setError('پخش آنلاین این قسمت شروع نشد؛ احتمالاً فرمت یا کدک آن در مرورگر پشتیبانی نمی‌شود.')
              }
            >
              {subsOn && trackUrl && (
                <track key={trackUrl} default kind="subtitles" srcLang="fa" label="فارسی" src={trackUrl} />
              )}
            </video>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs text-gray-300">
                {active.label} · {variantLabel(variant)}
              </span>
              <button
                onClick={() => gotoNeighbour(-1)}
                disabled={!prev || busy}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-40"
              >
                <SkipBack className="w-3.5 h-3.5" />
                قبلی
              </button>
              <button
                onClick={() => gotoNeighbour(1)}
                disabled={!next || busy}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500/20 border border-violet-400/30 text-xs text-violet-100 hover:bg-violet-500/30 transition-colors disabled:opacity-40"
              >
                قسمت بعد
                <SkipForward className="w-3.5 h-3.5" />
              </button>
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
              <button
                onClick={() =>
                  playEpisode(
                    season,
                    variant,
                    variant.episodes.find((e) => e.url === active.url) || variant.episodes[0],
                    'system'
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-colors"
              >
                <MonitorPlay className="w-3.5 h-3.5" />
                پلیر سیستم
              </button>
              <button
                onClick={stop}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                بستن پخش
              </button>
            </div>

            {error && <p className="text-[12px] text-red-400 mt-2">{error}</p>}
          </div>
        )}

        {/* قسمت‌ها */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-gray-400">
              {season.label} — {faNum(variant.episodes.length)} قسمت موجود
            </p>
            <p className="text-[11px] text-gray-500">{[variant.version, variant.quality].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {variant.episodes.map((ep) => {
              const isActive = active?.episode === ep.episode && active.url === ep.url
              return (
                <button
                  key={`${ep.episode}-${ep.url}`}
                  onClick={() => playEpisode(season, variant, ep)}
                  disabled={busy}
                  title={ep.label}
                  className={`min-w-[2.75rem] h-9 px-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-60 ${
                    isActive
                      ? 'bg-violet-500/30 border-violet-400/60 text-white'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {faNum(ep.episode)}
                </button>
              )
            })}
          </div>
          {title && (
            <p className="text-[11px] text-gray-500 mt-2">
              لینک‌ها مستقیم از منبع پخش می‌شوند؛ اگر پخش شروع نشد فیلترشکن را خاموش کنید.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
