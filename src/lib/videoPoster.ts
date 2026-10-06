function luminanceFromCanvas(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d')
  if (!ctx) return 0
  const { width: w, height: h } = canvas
  const step = Math.max(1, Math.floor(Math.min(w, h) / 48))
  const data = ctx.getImageData(0, 0, w, h).data
  let sum = 0
  let n = 0
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      n++
    }
  }
  return n ? sum / n : 0
}

export function extractPoster(source: File | string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const isUrl = typeof source === 'string'
    const url = isUrl ? source : URL.createObjectURL(source)
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    video.src = url

    let cleanupTimer: ReturnType<typeof setTimeout> | null = null
    const cleanup = () => {
      if (cleanupTimer) clearTimeout(cleanupTimer)
      video.removeAttribute('src')
      video.load()
      if (!isUrl) URL.revokeObjectURL(url)
    }

    let canvas: HTMLCanvasElement | null = null
    let ctx: CanvasRenderingContext2D | null = null
    let positions: number[] = []
    let idx = 0
    let best: { lum: number; t: number } | null = null
    let anyFrame = false
    let locked = false

    const draw = (): number => {
      if (!canvas || !ctx) return 0
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      return luminanceFromCanvas(canvas)
    }

    const finish = () => {
      locked = true
      if (!anyFrame) {
        cleanup()
        resolve(null)
        return
      }
      const target = best?.t ?? 0
      video.onseeked = () => {
        const lum = draw()
        if (!canvas || lum < 0) {
          cleanup()
          resolve(null)
          return
        }
        canvas.toBlob((blob) => {
          cleanup()
          resolve(blob)
        }, 'image/jpeg', 0.82)
      }
      video.currentTime = target
    }

    const processCurrent = () => {
      if (locked) return
      const lum = draw()
      if (lum > 0) {
        anyFrame = true
        if (lum > 10 && (best === null || lum > best.lum)) {
          best = { lum, t: video.currentTime }
        } else if (best === null) {
          best = { lum, t: video.currentTime }
        }
      }
      idx++
      if (idx < positions.length) {
        video.currentTime = positions[idx]
      } else {
        finish()
      }
    }

    video.onseeked = processCurrent

    video.onloadedmetadata = () => {
      const vw = video.videoWidth || 640
      const vh = video.videoHeight ? Math.round(vw * (video.videoHeight / Math.max(video.videoWidth, 1))) : Math.round((vw * 9) / 16)
      canvas = document.createElement('canvas')
      canvas.width = Math.min(vw, 1280)
      canvas.height = Math.min(vh, Math.round((Math.min(vw, 1280) * vh) / Math.max(vw, 1)))
      ctx = canvas.getContext('2d')

      const dur = video.duration || 0
      positions = [0.04, 0.1, 0.18, 0.26, 0.38]
        .map((f) => Math.min(Math.max(dur * f, 0), Math.max(dur - 2, 0)))
        .filter((t) => t > 0)
      if (!positions.length) positions = [Math.max(dur * 0.05, 0.5)]
      video.currentTime = positions[0]
    }

    video.onerror = () => {
      cleanup()
      resolve(null)
    }

    cleanupTimer = setTimeout(() => {
      cleanup()
      resolve(null)
    }, 25000)
  })
}