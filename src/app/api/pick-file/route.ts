import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VIDEO_EXT = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg', '.ts', '.m2ts', '.3gp']

const DIALOG_TIMEOUT_MS = 5 * 60 * 1000

let dialogOpen = false
let dialogOpenedAt = 0

const PS_SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
try {
  Add-Type -Namespace U -Name W -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd); [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);'
} catch { }

# یک پنجره مالک نامرئی و همیشه-رو؛ تضمین می‌کند دیالوگ پشت پنجره مرورگر پنهان نماند
$owner = New-Object System.Windows.Forms.Form
$owner.FormBorderStyle = 'None'
$owner.ShowInTaskbar = $false
$owner.StartPosition = 'CenterScreen'
$owner.Size = New-Object System.Drawing.Size(1, 1)
$owner.TopMost = $true
$owner.Opacity = 0
try { $owner.Show(); $owner.Activate() } catch { }

$d = New-Object System.Windows.Forms.OpenFileDialog
$d.Filter = 'Video files|*.mp4;*.mkv;*.avi;*.mov;*.wmv;*.flv;*.webm;*.m4v;*.mpg;*.mpeg;*.ts;*.m2ts;*.3gp|All files|*.*'
$d.Title = 'Choose a video file'
$d.RestoreDirectory = $true
try {
  $t = New-Object System.Windows.Forms.Timer
  $t.Interval = 300
  $t.Add_Tick({
    try {
      $h = $d.Handle
      if ($h -ne [IntPtr]::Zero) { [U.W]::ShowWindow($h, 9) | Out-Null; [U.W]::SetForegroundWindow($h) | Out-Null; $t.Stop() }
    } catch { $t.Stop() }
  })
  $t.Start()
} catch { }

try {
  $res = $d.ShowDialog($owner)
} finally {
  try { $t.Stop() } catch { }
  try { $owner.Close(); $owner.Dispose() } catch { }
}

if ($res -eq [System.Windows.Forms.DialogResult]::OK) {
  $b = [System.Text.Encoding]::UTF8.GetBytes($d.FileName)
  [Convert]::ToBase64String($b)
}
`

interface DialogResult2 {
  stdout: string
  stderr: string
  code: number | null
  spawnFailed: boolean
  timedOut: boolean
}

function openPickerDialog(): Promise<DialogResult2> {
  return new Promise((resolve) => {
    const encoded = Buffer.from(PS_SCRIPT, 'utf16le').toString('base64')
    let stdout = ''
    let stderr = ''
    let settled = false

    let child: ReturnType<typeof spawn>
    try {
      child = spawn('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-STA',
        '-EncodedCommand', encoded
      ], { windowsHide: false })
    } catch (error) {
      console.error('pick-file: could not spawn powershell:', error)
      resolve({ stdout: '', stderr: String(error), code: null, spawnFailed: true, timedOut: false })
      return
    }

    const finish = (r: DialogResult2) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(r)
    }

    const timer = setTimeout(() => {
      try { child.kill() } catch { }
      finish({ stdout, stderr, code: null, spawnFailed: false, timedOut: true })
    }, DIALOG_TIMEOUT_MS)

    child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf-8') })
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf-8') })
    child.on('error', (error) => {
      console.error('pick-file: powershell error:', error)
      finish({ stdout, stderr: stderr + String(error), code: null, spawnFailed: true, timedOut: false })
    })
    child.on('close', (code) => {
      finish({ stdout, stderr, code, spawnFailed: false, timedOut: false })
    })
  })
}

export async function POST() {
  // قفل کهنه (اگر دیالوگ قبلی از بین رفته باشد) نباید دکمه را برای همیشه از کار بیندازد
  if (dialogOpen && Date.now() - dialogOpenedAt > DIALOG_TIMEOUT_MS) {
    dialogOpen = false
  }
  if (dialogOpen) {
    return NextResponse.json({ error: 'یک پنجره انتخاب فایل باز است؛ ابتدا آن را ببندید' }, { status: 409 })
  }
  dialogOpen = true
  dialogOpenedAt = Date.now()

  try {
    const result = await openPickerDialog()

    if (result.spawnFailed) {
      return NextResponse.json(
        { error: 'اجرای PowerShell برای باز کردن پنجره انتخاب فایل ناموفق بود. اجرای PowerShell روی این سیستم مسدود است.' },
        { status: 500 }
      )
    }

    if (result.timedOut) {
      return NextResponse.json({ error: 'پنجره انتخاب فایل بیش از حد باز ماند و بسته شد. دوباره تلاش کنید.' }, { status: 500 })
    }

    const token = result.stdout.replace(/^\uFEFF/, '').trim()
    const errText = result.stderr.replace(/^#< CLIXML/m, '').trim()

    // خروجی خالی + خطا یا کد خروج غیرصفر یعنی دیالوگ واقعاً کار نکرده (نه اینکه کاربر لغو کرده باشد)
    if (!token && (result.code !== 0 || /Exception|Error|not recognized|cannot|denied/i.test(errText))) {
      console.error('pick-file: powershell reported failure:', { code: result.code, stderr: errText.slice(0, 600) })
      return NextResponse.json(
        { error: 'باز کردن پنجره انتخاب فایل ناموفق بود. جزئیات در کنسول سرور ثبت شد.' },
        { status: 500 }
      )
    }

    if (!token) {
      return NextResponse.json({ canceled: true }, { status: 200 })
    }

    let filePath: string
    try {
      filePath = Buffer.from(token, 'base64').toString('utf-8')
    } catch {
      return NextResponse.json({ error: 'مسیر فایل نامعتبر برگشت داده شد' }, { status: 500 })
    }
    filePath = filePath.replace(/^\uFEFF/, '').trim()
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
