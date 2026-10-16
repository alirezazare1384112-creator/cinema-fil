import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface LinkPreview {
  platform: 'Pinterest' | 'Instagram' | 'Video' | null
  embedUrl: string | null
  videoUrl: string | null
  watchUrl: string | null
  thumbnail: string | null
  /** پین تصویری (بدون ویدیو) یا ویدیویی — برای UI تا تصویر تکراری نمایش داده نشود */
  mediaType?: 'image' | 'video' | null
}

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

function extractOgImage(html: string): string | null {
  const m =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
  return m ? m[1] : null
}

/** بهترین mp4 قابل‌پخش در مرورگر از دلِ HTML صفحهٔ پین (JSON-escape شده)؛ نسخه‌های HEVC رد می‌شوند. */
function pickBrowserMp4(html: string): string | null {
  const raw = html.match(/https?:\\?\/\\?\/v1\.pinimg\.com\\?\/videos\\?\/[^"'\\\s]+\.mp4/g) || []
  const urls = Array.from(new Set(raw.map((s) => s.replace(/\\\//g, '/'))))
  return urls.find((u) => !/hevc|h265/i.test(u)) || null
}

/**
 * اطلاعات پین از یک fetchِ همان صفحهٔ پین (ویجت API عملاً خالی برمی‌گرداند و کند بود):
 * og:image برای کاور + تشخیص ویدیویی از videoUrls/videoDataV2 + آدرس مستقیم mp4 سازگار مرورگر.
 */
async function fetchPinterestPin(
  pinId: string
): Promise<{ url: string | null; isVideo: boolean; directVideoUrl: string | null }> {
  try {
    const res = await fetch(`https://www.pinterest.com/pin/${pinId}/`, {
      headers: { 'User-Agent': BROWSER_UA },
      signal: AbortSignal.timeout(8000)
    })
    if (res.ok) {
      const html = await res.text()
      const url = extractOgImage(html)
      const isVideo = /"videoUrls"|"videoDataV2"|pinimg\.com\/videos\//.test(html)
      return { url, isVideo, directVideoUrl: isVideo ? pickBrowserMp4(html) : null }
    }
  } catch {
    /* بدون پوستر */
  }
  return { url: null, isVideo: false, directVideoUrl: null }
}

async function fetchOgImage(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': BROWSER_UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(6000)
    })
    if (!res.ok) return null
    return extractOgImage(await res.text())
  } catch {
    return null
  }
}

/**
 * Turns a shared Pinterest/Instagram/direct-video link into an inline player:
 * - Pinterest  → official pin embed (assets.pinterest.com/ext/embed.html?id=PIN_ID)
 * - Instagram  → official post/reel embed (instagram.com/.../embed/)
 * - direct mp4 → native <video> playback
 * pin.it short links are resolved server-side to recover the pin id.
 */
async function resolveLink(raw: string): Promise<LinkPreview> {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error('invalid-url')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('bad-protocol')
  }

  let finalUrl = parsed
  const bareHost = parsed.hostname.toLowerCase().replace(/^www\./, '')
  if (bareHost === 'pin.it') {
    try {
      const res = await fetch(parsed.toString(), {
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
        }
      })
      finalUrl = new URL(res.url)
    } catch {
      /* اگر ریدایرکت باز نشد، همان لینک کوتاه می‌ماند و امبد در دسترس نخواهد بود */
    }
  }

  const host = finalUrl.hostname.toLowerCase().replace(/^www\./, '')

  // ── Pinterest ──────────────────────────────────────────────
  if (host === 'pin.it' || host.endsWith('pinimg.com') || host.includes('pinterest.')) {
    const pinId = finalUrl.pathname.match(/\/pin\/(\d+)/)?.[1] ?? null
    const pin = pinId ? await fetchPinterestPin(pinId) : null
    return {
      platform: 'Pinterest',
      embedUrl: pinId ? `https://assets.pinterest.com/ext/embed.html?id=${pinId}` : null,
      videoUrl: pin?.directVideoUrl ?? null,
      watchUrl: pinId ? `https://www.pinterest.com/pin/${pinId}/` : finalUrl.toString(),
      thumbnail: pin?.url ?? null,
      mediaType: pin ? (pin.isVideo ? 'video' : pin.url ? 'image' : null) : null
    }
  }

  // ── Instagram ──────────────────────────────────────────────
  if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
    const m = finalUrl.pathname.match(/^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)
    if (m) {
      const kind = m[1] === 'reels' ? 'reel' : m[1]
      const code = m[2]
      const watchUrl = `https://www.instagram.com/${kind}/${code}/`
      const thumbnail = await fetchOgImage(watchUrl)
      return {
        platform: 'Instagram',
        embedUrl: `https://www.instagram.com/${kind}/${code}/embed/`,
        videoUrl: null,
        watchUrl,
        thumbnail
      }
    }
    return { platform: 'Instagram', embedUrl: null, videoUrl: null, watchUrl: finalUrl.toString(), thumbnail: null }
  }

  // ── لینک مستقیم فایل ویدیو ────────────────────────────────
  if (/\.(mp4|webm|m4v|mov)(\?.*)?$/i.test(finalUrl.pathname + finalUrl.search)) {
    return { platform: 'Video', embedUrl: null, videoUrl: finalUrl.toString(), watchUrl: null, thumbnail: null }
  }

  return { platform: null, embedUrl: null, videoUrl: null, watchUrl: finalUrl.toString(), thumbnail: null }
}

/** کش در حافظهٔ سرور — کلیک مجدد روی کارت/لینک قبلی بدون شبکه، آنی باز می‌شود. */
const previewCache = new Map<string, { data: LinkPreview; ts: number }>()
const PREVIEW_CACHE_TTL = 30 * 60 * 1000

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')?.trim()
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  const cached = previewCache.get(url)
  if (cached && Date.now() - cached.ts < PREVIEW_CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    const preview = await resolveLink(url)
    if (previewCache.size > 200) previewCache.clear()
    previewCache.set(url, { data: preview, ts: Date.now() })
    return NextResponse.json(preview)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
