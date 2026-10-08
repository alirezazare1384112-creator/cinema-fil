import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

/* ------------------------------------------------------------------ *
 * پخش فایل با «تأییدِ پخش»
 *
 * مشکل قبلی: اگر پخش‌کنندهٔ قدیمیِ تک‌نمونه (Media Player ویندوز یا
 * PotPlayer) از قبل باز بود و بسته‌شدنش به هر دلیلی شکست می‌خورد،
 * فایل جدید نادیده گرفته می‌شد و همان فیلم قبلی روی صفحه می‌ماند.
 *
 * راه‌حل: بعد از هر بار باز کردن، عنوان پنجره‌های باز خوانده می‌شود و
 * بررسی می‌شود که واقعاً همان فایلِ درخواستی دیده می‌شود. اگر نه،
 * پخش‌کننده دوباره بسته و باز می‌شود (حداکثر ۳ بار). درخواست‌ها هم صف
 * می‌شوند تا دو پخشِ همزمان روی هم نیفتند.
 * ------------------------------------------------------------------ */

const PLAYER_EXE_NAMES = [
  'PotPlayerMini64', 'PotPlayerMini', 'PotPlayer64',
  'vlc', 'mpc-hc64', 'mpc-hc', 'KMPlayer64', 'KMPlayer',
  'wmplayer', 'MediaPlayer', 'Video.UI', 'Music.UI'
]

const DESKTOP_PLAYERS = [
  'C:\\Program Files\\DAUM\\PotPlayer\\PotPlayerMini64.exe',
  'C:\\Program Files\\DAUM\\PotPlayer\\PotPlayerMini.exe',
  'C:\\Program Files (x86)\\DAUM\\PotPlayer\\PotPlayerMini.exe',
  'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
  'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe',
  'C:\\Program Files\\MPC-HC\\mpc-hc64.exe',
  'C:\\Program Files\\KMPlayer 64X\\KMPlayer64.exe',
  'C:\\Program Files\\Windows Media Player\\wmplayer.exe'
]

const PS_NAMES = PLAYER_EXE_NAMES.map((n) => `'${n}'`).join(',')

/** بستن مؤدبانهٔ پنجره‌های پخش‌کننده (WM_CLOSE — بدون کشتن اجباری) */
const CLOSE_GRACEFUL_PS = `
$names = @(${PS_NAMES})
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class WinCloseMP {
  public delegate bool E(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(E cb, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int c);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int c);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll", EntryPoint="PostMessageW")] public static extern bool PostMessage(IntPtr h, uint msg, IntPtr wp, IntPtr lp);
}
"@
$WM_CLOSE = 0x0010
$sbT = New-Object System.Text.StringBuilder 512
$sbC = New-Object System.Text.StringBuilder 512
$closedWindows = 0
$cb = [WinCloseMP+E]{
  param($h, $l)
  if (-not [WinCloseMP]::IsWindowVisible($h)) { return $true }
  $null = [WinCloseMP]::GetWindowText($h, $sbT, 512)
  $null = [WinCloseMP]::GetClassName($h, $sbC, 512)
  $t = $sbT.ToString(); $c = $sbC.ToString()
  $isUwpMedia = ($c -eq 'ApplicationFrameWindow' -and ($t -eq 'Media Player' -or $t -eq 'Films & TV' -or $t -eq 'Movies & TV'))
  $isPlayerWindow = ($t -match 'PotPlayer|VLC|Media Player|KMPlayer|Windows Media Player|Media Player Classic')
  if ($isUwpMedia -or $isPlayerWindow) {
    $null = [WinCloseMP]::PostMessage($h, $WM_CLOSE, [IntPtr]::Zero, [IntPtr]::Zero)
    $script:closedWindows++
  }
  return $true
}
[void][WinCloseMP]::EnumWindows($cb, [IntPtr]::Zero)
Write-Output ("GRACEFUL_CLOSED=" + $closedWindows)
`

/** شمارش پخش‌کننده‌های زنده — بدون Add-Type، سریع و قابل‌اعتماد */
const COUNT_PS = `
$names = @(${PS_NAMES})
$alive = 0
foreach ($n in $names) {
  $p = Get-Process -Name $n -ErrorAction SilentlyContinue
  if ($p) { $alive += @($p).Count }
}
Write-Output ("ALIVE=" + $alive)
`

/** کشتن اجباری — فقط وقتی بستن مؤدبانه جواب نداده باشد */
const FORCE_KILL_PS = `
$names = @(${PS_NAMES})
$killed = 0
foreach ($n in $names) {
  $p = Get-Process -Name $n -ErrorAction SilentlyContinue
  if ($p) { $killed += @($p).Count; $p | Stop-Process -Force -ErrorAction SilentlyContinue }
}
Write-Output ("KILLED=" + $killed)
`

/** عنوان همهٔ پنجره‌های باز — خروجی UTF-8 تا نام فارسی فایل هم درست خوانده شود */
const WINDOW_TITLES_PS = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class WinTitleMP {
  public delegate bool E(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(E cb, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int c);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
}
"@
$script:sbT = New-Object System.Text.StringBuilder 512
$script:titles = New-Object System.Collections.ArrayList
$cb = [WinTitleMP+E]{
  param($h, $l)
  if (-not [WinTitleMP]::IsWindowVisible($h)) { return $true }
  $null = [WinTitleMP]::GetWindowText($h, $script:sbT, 512)
  $t = $script:sbT.ToString()
  if ($t.Length -gt 0) { [void]$script:titles.Add($t) }
  return $true
}
[void][WinTitleMP]::EnumWindows($cb, [IntPtr]::Zero)
foreach ($t in $script:titles) { Write-Output ("TITLE=" + $t) }
`

function runPowerShell(script: string, timeoutMs = 20000): Promise<string> {
  return new Promise((resolve) => {
    const encoded = Buffer.from(script, 'utf16le').toString('base64')
    let out = ''
    try {
      const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-STA', '-EncodedCommand', encoded], {
        windowsHide: true
      })
      const timer = setTimeout(() => { try { child.kill() } catch { } resolve(out) }, timeoutMs)
      child.stdout?.on('data', (d: Buffer) => { out += d.toString('utf-8') })
      child.stderr?.on('data', (d: Buffer) => { out += d.toString('utf-8') })
      child.on('error', () => { clearTimeout(timer); resolve('') })
      child.on('close', () => { clearTimeout(timer); resolve(out) })
    } catch {
      resolve('')
    }
  })
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

function readNumber(out: string, key: string): number | null {
  const m = new RegExp(`${key}=(\\d+)`).exec(out)
  return m ? Number(m[1]) : null
}

async function countRunningPlayers(): Promise<number | null> {
  const out = await runPowerShell(COUNT_PS, 8000)
  return readNumber(out, 'ALIVE')
}

async function windowTitles(): Promise<string[]> {
  const out = await runPowerShell(WINDOW_TITLES_PS, 8000)
  return out
    .split(/\r?\n/)
    .map((l) => l.replace(/^TITLE=/, '').trim())
    .filter((l) => l.length > 0)
}

/**
 * آیا پنجره‌ای هست که دارد همین فایل را نشان می‌دهد؟
 * برای نام‌های خیلی بلند، پیشوند ۲۴ کاراکتری هم پذیرفته می‌شود چون
 * عنوان بعضی پنجره‌ها کوتاه‌شده است.
 */
function findPlayingTitle(titles: string[], target: string): string | null {
  const base = path.basename(target)
  const stem = base.replace(/\.[^.]+$/, '')
  const needles = [base, stem]
    .map((s) => s.toLowerCase())
    .filter((s) => s.length >= 6)
  const prefixes = [base, stem]
    .map((s) => s.slice(0, 24).toLowerCase())
    .filter((s) => s.length >= 8)

  for (const title of titles) {
    const lt = title.toLowerCase()
    if (needles.some((n) => lt.includes(n))) return title
    if (prefixes.some((p) => lt.includes(p))) return title
  }
  return null
}

/**
 * بستن پخش‌کننده‌ها: اول مؤدبانه، بعد در صورت لزوم اجباری، و در هر دو
 * حالت تا وقتی واقعاً بسته شوند صبر می‌کنیم تا پخشِ قبلی هرگز باقی نماند.
 */
async function closeRunningPlayers(): Promise<{ closed: number; remaining: number }> {
  let closed = 0

  const out = await runPowerShell(CLOSE_GRACEFUL_PS, 10000)
  closed = readNumber(out, 'GRACEFUL_CLOSED') ?? 0

  for (let i = 0; i < 6; i++) {
    await delay(300)
    const alive = await countRunningPlayers()
    if (alive === null || alive === 0) return { closed, remaining: 0 }
  }

  // هنوز زنده‌اند → کشتن اجباری
  const killOut = await runPowerShell(FORCE_KILL_PS, 8000)
  closed += readNumber(killOut, 'KILLED') ?? 0

  for (let i = 0; i < 6; i++) {
    await delay(300)
    const alive = await countRunningPlayers()
    if (alive === null || alive === 0) return { closed, remaining: 0 }
  }

  return { closed, remaining: (await countRunningPlayers()) ?? 0 }
}

function spawnPlayer(exe: string, args: string[]): void {
  try {
    const child = spawn(exe, args, { detached: true, stdio: 'ignore', windowsHide: false })
    child.on('error', (err) => console.error('player spawn error:', err.message))
    child.unref()
  } catch (error) {
    console.error('player spawn failed:', error)
  }
}

function openWithShell(target: string): void {
  // مثل دوبار کلیک روی فایل در ویندوز عمل می‌کند
  try {
    const child = spawn('cmd.exe', ['/c', 'start', '', target], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    })
    child.on('error', (err) => console.error('shell open error:', err.message))
    child.unref()
  } catch (error) {
    console.error('shell open failed:', error)
  }
}

function firstAvailableDesktopPlayer(): string | null {
  const fromEnv = process.env.CINEPHILE_PLAYER
  if (fromEnv) {
    try { if (fs.existsSync(fromEnv)) return fromEnv } catch { /* ignore */ }
  }
  for (const candidate of DESKTOP_PLAYERS) {
    try { if (fs.existsSync(candidate)) return candidate } catch { /* ignore */ }
  }
  return null
}

interface OpenOutcome {
  success: boolean
  player: string
  attempts: number
  closedPrevious: number
  windowTitle: string | null
  error?: string
}

/**
 * باز کردن فایل و تأیید اینکه همان فایل روی صفحه است.
 * اگر پنجره‌ای باز شد ولی فایلِ دیگری (یا هیچ فایلی) دیده شد،
 * پخش‌کننده بسته و دوباره تلاش می‌شود.
 */
async function openAndVerify(target: string): Promise<OpenOutcome> {
  const exe = firstAvailableDesktopPlayer()
  const player = exe ? path.basename(exe) : 'default'
  let closedPrevious = 0
  let lastTitle: string | null = null
  const MAX_ATTEMPTS = 3

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const closeResult = await closeRunningPlayers()
    closedPrevious += closeResult.closed
    await delay(300)

    if (exe) {
      console.log(`play attempt ${attempt}/${MAX_ATTEMPTS}: opening with ${exe} -> ${target}`)
      spawnPlayer(exe, [target])
    } else {
      console.log(`play attempt ${attempt}/${MAX_ATTEMPTS}: opening with default handler -> ${target}`)
      openWithShell(target)
    }

    // تا ۶ ثانیه صبر می‌کنیم تا عنوان پنجره، فایل درخواستی را نشان دهد
    const deadline = Date.now() + 6000
    while (Date.now() < deadline) {
      await delay(500)
      const titles = await windowTitles()
      // وقتی پخش‌کننده را مستقیم اجرا می‌کنیم، نام فایل باید در عنوان پنجره باشد؛
      // وقتی از هندلر پیش‌فرض ویندوز استفاده می‌کنیم (عنوان ممکن است نام فایل
      // را نداشته باشد) کافی است یک پنجرهٔ پخش‌کنندهٔ باز پیدا شود.
      const hit = exe
        ? findPlayingTitle(titles, target)
        : (titles.find((t) => /potplayer|vlc|media player|kmplayer|mpc|wmplayer/i.test(t)) ?? null)
      if (hit) {
        return { success: true, player, attempts: attempt, closedPrevious, windowTitle: hit }
      }
      lastTitle = titles.find((t) => /potplayer|vlc|media player|kmplayer|mpc/i.test(t)) ?? null
    }

    console.warn(`play attempt ${attempt}/${MAX_ATTEMPTS}: فایل درخواستی روی صفحه نبود (آخرین عنوان پخش‌کننده: ${lastTitle ?? 'هیچ'})`)
  }

  return {
    success: false,
    player,
    attempts: MAX_ATTEMPTS,
    closedPrevious,
    windowTitle: lastTitle,
    error: 'پخش‌کننده باز شد اما فایل درخواستی روی صفحه نیامد'
  }
}

/* درخواست‌ها صف می‌شوند تا دو پخش همزمان روی هم نیفتند */
let playQueue: Promise<unknown> = Promise.resolve()
let latestRequest = 0

function withPlayLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = playQueue.then(fn, fn)
  playQueue = run.catch(() => undefined)
  return run
}

const superseded = (): OpenOutcome => ({
  success: true,
  player: '-',
  attempts: 0,
  closedPrevious: 0,
  windowTitle: null
})

export async function POST(request: NextRequest) {
  try {
    const { filePath, folderPath } = await request.json()

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json({ error: 'مسیر فایل نامعتبر است' }, { status: 400 })
    }

    const requestId = ++latestRequest

    if (isUrl(filePath)) {
      const diskPath = resolveUploadUrl(filePath)
      if (diskPath) {
        console.log('Upload URL resolved to disk:', diskPath)
        const outcome = await withPlayLock(() => (requestId === latestRequest ? openAndVerify(diskPath) : Promise.resolve(superseded())))
        return NextResponse.json(
          { resolvedPath: diskPath, disk: true, ...outcome },
          { status: outcome.success ? 200 : 502 }
        )
      }

      const target = filePath.startsWith('/') ? `http://localhost:3000${filePath}` : filePath
      console.log('Play URL:', target)
      // آدرس وب را فقط به هندلر پیش‌فرض می‌دهیم (پخش‌کنندهٔ دسکتاپ برای URL مناسب نیست)
      const outcome = await withPlayLock(async () => {
        if (requestId !== latestRequest) return superseded()
        const closeResult = await closeRunningPlayers()
        await delay(300)
        openWithShell(target)
        return {
          success: true,
          player: 'default',
          attempts: 1,
          closedPrevious: closeResult.closed,
          windowTitle: null
        } satisfies OpenOutcome
      })
      return NextResponse.json({ resolvedPath: target, url: true, ...outcome })
    }

    const resolved = resolveFilePath(filePath, folderPath)
    console.log('Play request:', resolved)

    if (!fs.existsSync(resolved)) {
      return NextResponse.json(
        { error: 'فایل در مسیر ذخیره‌شده یافت نشد؛ ممکن است جابه‌جا یا حذف شده باشد' },
        { status: 404 }
      )
    }

    const outcome = await withPlayLock(() => (requestId === latestRequest ? openAndVerify(resolved) : Promise.resolve(superseded())))

    if (!outcome.success) {
      console.error('play-external: verification failed for', resolved, outcome)
      return NextResponse.json({ error: outcome.error, ...outcome }, { status: 502 })
    }

    console.log('play-external: verified ->', outcome.windowTitle, `(attempt ${outcome.attempts})`)
    return NextResponse.json({ resolvedPath: resolved, ...outcome })
  } catch (error) {
    console.error('External play error:', error)
    return NextResponse.json({ error: 'خطا در باز کردن پخش‌کننده' }, { status: 500 })
  }
}
