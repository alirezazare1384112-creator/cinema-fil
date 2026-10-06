export interface UploadResult {
  url: string
}

/**
 * Downloads an external image URL and stores a permanent local copy on disk.
 * Returns the local /api/uploads/... URL so posters never depend on fragile remote links.
 */
export async function saveImageUrl(url: string): Promise<string> {
  const res = await fetch(`/api/save-image?url=${encodeURIComponent(url)}`)
  const data = await res.json()
  if (!res.ok || !data.url) {
    throw new Error(data.error || 'خطا در ذخیره تصویر')
  }
  return data.url as string
}

const MIN_POSTER_LUMINANCE = 14

/**
 * Loads an image and estimates its average brightness (0-255).
 * Near-black images (e.g. an empty frame grabbed from a video) return false.
 */
export async function isImageBright(url: string, minLum = MIN_POSTER_LUMINANCE): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const img = new Image()
    const done = (v: boolean) => {
      clearTimeout(timer)
      resolve(v)
    }
    const timer = setTimeout(() => done(false), 12000)
    img.onload = () => {
      try {
        const size = 32
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return done(false)
        const w = img.naturalWidth || size
        const h = img.naturalHeight || size
        const s = Math.max(w, h) / size
        const dw = Math.max(Math.round(w / s), 1)
        const dh = Math.max(Math.round(h / s), 1)
        ctx.drawImage(img, Math.max(0, Math.round((w - dw) / 2)), Math.max(0, Math.round((h - dh) / 2)), dw, dh, 0, 0, size, size)
        const data = ctx.getImageData(0, 0, size, size).data
        let sum = 0
        for (let i = 0; i < data.length; i += 4) {
          sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        }
        done(sum / (size * size) >= minLum)
      } catch {
        done(true)
      }
    }
    img.onerror = () => done(false)
    img.crossOrigin = 'anonymous'
    img.src = url
  })
}

/**
 * Uploads a File/Blob as a raw octet-stream with upload progress.
 * The server streams the body straight to disk, so memory stays constant.
 */
export function uploadFile(
  file: Blob,
  opts?: { onProgress?: (percent: number) => void }
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const name = file instanceof File && file.name ? file.name : 'file'
    const type = file.type || 'application/octet-stream'

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/upload?name=${encodeURIComponent(name)}`)
    xhr.setRequestHeader('Content-Type', type)

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && opts?.onProgress) {
        opts.onProgress(Math.round((ev.loaded / ev.total) * 100))
      }
    }

    xhr.onload = () => {
      let data: { url?: string; error?: string } = {}
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        data = {}
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.url) {
        resolve({ url: data.url })
      } else {
        reject(new Error(data.error || `آپلود ناموفق (${xhr.status})`))
      }
    }

    xhr.onerror = () => reject(new Error('خطا در ارتباط با سرور'))
    xhr.onabort = () => reject(new Error('آپلود لغو شد'))

    xhr.send(file)
  })
}