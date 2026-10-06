import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

function resolveFilePath(filePath: string, folderPath?: string | null): string {
  const normalized = filePath.trim().replace(/\//g, '\\')

  try {
    if (fs.existsSync(normalized)) return normalized
  } catch { /* ignore */ }

  if (folderPath) {
    const fp = folderPath.trim().replace(/\//g, '\\')
    const fileName = path.basename(normalized)
    const full = fp + '\\' + fileName
    try {
      if (fs.existsSync(full)) return full
    } catch { /* ignore */ }
  }

  return normalized
}

function resolveUploadUrl(filePath: string): string | null {
  const match = /^\/?(?:api\/)?uploads\/([^?]+)/.exec(filePath)
  if (!match) return null
  const candidate = path.join(process.cwd(), 'uploads', path.basename(match[1]))
  try {
    if (fs.existsSync(candidate)) return candidate
  } catch { /* ignore */ }
  return null
}

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith('/')
}

function openWithDefaultPlayer(target: string) {
  console.log('Opening with default player:', target)

  const child = spawn('explorer.exe', [target], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  })
  child.on('error', (err) => {
    console.error('Spawn error:', err.message)
  })
  child.on('close', () => {
    // explorer.exe returns nonzero exit codes even on success; ignore.
  })
  child.unref()
}

export async function POST(request: NextRequest) {
  try {
    const { filePath, folderPath } = await request.json()

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json({ error: 'مسیر فایل نامعتبر است' }, { status: 400 })
    }

    if (isUrl(filePath)) {
      const diskPath = resolveUploadUrl(filePath)
      if (diskPath) {
        console.log('Upload URL resolved to disk:', diskPath)
        openWithDefaultPlayer(diskPath)
        return NextResponse.json({ success: true, resolvedPath: diskPath, player: 'default', disk: true })
      }

      const target = filePath.startsWith('/')
        ? `http://localhost:3000${filePath}`
        : filePath
      console.log('Play URL:', target)
      openWithDefaultPlayer(target)
      return NextResponse.json({ success: true, resolvedPath: target, player: 'default', url: true })
    }

    const resolved = resolveFilePath(filePath, folderPath)
    console.log('Play request:', resolved)

    if (!fs.existsSync(resolved)) {
      return NextResponse.json(
        { error: 'فایل در مسیر ذخیره‌شده یافت نشد؛ ممکن است جابه‌جا یا حذف شده باشد' },
        { status: 404 }
      )
    }

    openWithDefaultPlayer(resolved)

    return NextResponse.json({ success: true, resolvedPath: resolved, player: 'default' })
  } catch (error) {
    console.error('External play error:', error)
    return NextResponse.json({ error: 'خطا در باز کردن پخش‌کننده' }, { status: 500 })
  }
}