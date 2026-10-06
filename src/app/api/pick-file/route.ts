import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VIDEO_EXT = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg', '.ts', '.m2ts', '.3gp']

const DIALOG_TIMEOUT_MS = 5 * 60 * 1000

let dialogOpen = false

const PS_SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms
try {
  Add-Type -Namespace U -Name W -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd); [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);'
} catch { }
$d = New-Object System.Windows.Forms.OpenFileDialog
$d.Filter = 'Video files|*.mp4;*.mkv;*.avi;*.mov;*.wmv;*.flv;*.webm;*.m4v;*.mpg;*.mpeg;*.ts;*.m2ts;*.3gp|All files|*.*'
$d.Title = 'Select video file'
try {
  $t = New-Object System.Windows.Forms.Timer
  $t.Interval = 400
  $t.Add_Tick({
    try {
      $h = $d.Handle
      if ($h -ne [IntPtr]::Zero) { [U.W]::ShowWindow($h, 9) | Out-Null; [U.W]::SetForegroundWindow($h) | Out-Null; $t.Stop() }
    } catch { $t.Stop() }
  })
  $t.Start()
} catch { }
$res = $d.ShowDialog()
try { $t.Stop() } catch { }
if ($res -eq [System.Windows.Forms.DialogResult]::OK) {
  $b = [System.Text.Encoding]::UTF8.GetBytes($d.FileName)
  [Convert]::ToBase64String($b)
}
`

export async function POST() {
  if (dialogOpen) {
    return NextResponse.json({ error: 'یک پنجره انتخاب فایل باز است؛ ابتدا آن را ببندید' }, { status: 409 })
  }
  dialogOpen = true

  try {
    const encoded = Buffer.from(PS_SCRIPT, 'utf16le').toString('base64')

    const result = await new Promise<{ stdout: string; failed: boolean }>((resolve) => {
      let stdout = ''
      let settled = false
      const child = spawn('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-STA',
        '-EncodedCommand', encoded
      ], { windowsHide: false })

      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        try { child.kill() } catch { }
        resolve({ stdout, failed: true })
      }, DIALOG_TIMEOUT_MS)

      child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf-8') })
      child.stderr.on('data', () => { /* dialog UI noise */ })
      child.on('error', () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ stdout: '', failed: true })
      })
      child.on('close', () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ stdout, failed: false })
      })
    })

    if (result.failed) {
      return NextResponse.json({ error: 'پنجره انتخاب فایل باز نشد یا بیش از حد طول کشید' }, { status: 500 })
    }

    const token = result.stdout.trim()
    if (!token) {
      return NextResponse.json({ canceled: true }, { status: 200 })
    }

    let filePath: string
    try {
      filePath = Buffer.from(token, 'base64').toString('utf-8')
    } catch {
      return NextResponse.json({ error: 'مسیر فایل نامعتبر برگشت داده شد' }, { status: 500 })
    }
    filePath = filePath.trim()
    if (!filePath) {
      return NextResponse.json({ canceled: true }, { status: 200 })
    }

    if (!path.isAbsolute(filePath)) {
      return NextResponse.json({ error: 'مسیر فایل نامعتبر است' }, { status: 400 })
    }

    const ext = path.extname(filePath).toLowerCase()
    if (!VIDEO_EXT.includes(ext)) {
      return NextResponse.json({ error: 'فقط فایل‌های ویدیویی مجاز هستند' }, { status: 400 })
    }

    let stat: fs.Stats
    try {
      stat = fs.statSync(filePath)
    } catch {
      return NextResponse.json({ error: 'فایل انتخاب‌شده یافت نشد' }, { status: 404 })
    }
    if (!stat.isFile()) {
      return NextResponse.json({ error: 'مسیر انتخاب‌شده یک فایل نیست' }, { status: 400 })
    }

    return NextResponse.json({
      path: filePath,
      name: path.basename(filePath),
      size: stat.size,
      dir: path.dirname(filePath)
    })
  } catch (error) {
    console.error('pick-file error:', error)
    return NextResponse.json({ error: 'خطا در باز کردن دیالوگ انتخاب فایل' }, { status: 500 })
  } finally {
    dialogOpen = false
  }
}
