import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface LinkPreview {
  platform: 'Pinterest' | 'Instagram' | 'Video' | null
  embedUrl: string | null
  videoUrl: string | null
  watchUrl: string | null
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
    return {
      platform: 'Pinterest',
      embedUrl: pinId ? `https://assets.pinterest.com/ext/embed.html?id=${pinId}` : null,
      videoUrl: null,
      watchUrl: pinId ? `https://www.pinterest.com/pin/${pinId}/` : finalUrl.toString()
    }
  }

  // ── Instagram ──────────────────────────────────────────────
  if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
    const m = finalUrl.pathname.match(/^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)
    if (m) {
      const kind = m[1] === 'reels' ? 'reel' : m[1]
      const code = m[2]
      return {
        platform: 'Instagram',
        embedUrl: `https://www.instagram.com/${kind}/${code}/embed/`,
        videoUrl: null,
        watchUrl: `https://www.instagram.com/${kind}/${code}/`
      }
    }
    return { platform: 'Instagram', embedUrl: null, videoUrl: null, watchUrl: finalUrl.toString() }
  }

  // ── لینک مستقیم فایل ویدیو ────────────────────────────────
  if (/\.(mp4|webm|m4v|mov)(\?.*)?$/i.test(finalUrl.pathname + finalUrl.search)) {
    return { platform: 'Video', embedUrl: null, videoUrl: finalUrl.toString(), watchUrl: null }
  }

  return { platform: null, embedUrl: null, videoUrl: null, watchUrl: finalUrl.toString() }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')?.trim()
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  try {
    const preview = await resolveLink(url)
    return NextResponse.json(preview)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
