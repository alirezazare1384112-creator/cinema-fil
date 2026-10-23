import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { prisma } from '@/lib/prisma'

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
 * پخش فایل با «تأییدِ پخش» — نسخهٔ بهینه
 *
 * مشکل قبلی: اگر پخش‌کنندهٔ قدیمیِ تک‌نمونه از قبل باز بود و بسته‌شدنش
 * شکست می‌خورد، فایل جدید نادیده گرفته می‌شد و همان فیلم قبلی می‌ماند.
 *
 * راه‌حل: بستن + باز کردن + خواندن عنوان پنجره و تأیید، همه در «یک»
 * اسکریپت PowerShell انجام می‌شود (قبلاً ۱۰+ بار PowerShell اجرا می‌شد و
 * هر بار Add-Type کامپایل می‌شد). حالا هر تلاش فقط یک بار PowerShell
 * اجرا می‌کند و پاسخ پخش از ~۴-۸ ثانیه به ~۲-۳ ثانیه رسیده است.
 * اگر تأیید نشد، حداکثر ۳ بار بسته و دوباره باز می‌شود.
 * ------------------------------------------------------------------ */

const PLAYER_EXE_NAMES = [
  'PotPlayerMini64', 'PotPlayerMini', 'PotPlayer64',
  'vlc', 'mpc-hc64', 'mpc-hc', 'KMPlayer64', 'KMPlayer',
  'wmplayer', 'MediaPlayer', 'Video.UI', 'Music.UI'
]

const PLAYER_MARKERS = ['potplayer', 'vlc', 'media player', 'kmplayer', 'mpc', 'wmplayer']

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

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64')

/**
 * رشته‌هایی که باید در عنوان پنجره دیده شوند: نام کامل فایل، نام بدون
 * پسوند و پیشوند ۲۴ کاراکتری (برای عنوان‌های کوتاه‌شده).
 */
function buildNeedles(target: string): string[] {
  // برای URL پارامترها/بخش‌ها را حذف می‌کنیم تا فقط نامِ فایل بماند
  const base = path.basename(target.split('?')[0].split('#')[0])
  const stem = base.replace(/\.[^.]+$/, '')
  const out = new Set<string>()
  for (const s of [base, stem]) {
    if (s.length >= 6) out.add(s.toLowerCase())
    const p = s.slice(0, 24).toLowerCase()
    if (p.length >= 8) out.add(p)
  }
  return [...out]
}

interface PlayScriptOptions {
  target: string
  exe: string | null
  /** نام فایل باید در عنوان پنجره باشد؟ (وقتی پخش‌کننده مستقیم اجرا می‌شود بله) */
  requireFile: boolean
  /** برای URL فقط باز کن، تأیید نکن */
  verify: boolean
}

/**
 * یک اسکریپت واحد: بستن مؤدبانه → در صورت لزوم کشتن اجباری → اجرا →
 * پایش عنوان پنجره تا دیده شدن فایل درخواستی.
 */
function buildPlayScript(opts: PlayScriptOptions): string {
  const needles = buildNeedles(opts.target).map((n) => `'${b64(n)}'`).join(',')
  const markers = PLAYER_MARKERS.map((m) => `'${b64(m)}'`).join(',')

  return `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'
$names = @(${PS_NAMES})
$file = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64(opts.target)}'))
$exe = '${opts.exe ? b64(opts.exe) : ''}'
if ($exe -ne '') { $exe = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($exe)) }
$needles = @(${needles})
$markers = @(${markers})
$needles = @($needles | ForEach-Object { [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($_)).ToLower() })
$markers = @($markers | ForEach-Object { [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($_)).ToLower() })
$requireFile = ${opts.requireFile ? '$true' : '$false'}
$doVerify = ${opts.verify ? '$true' : '$false'}

Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class PlayWin {
  public delegate bool E(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(E cb, IntPtr l);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int c);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int c);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern bool PostMessage(IntPtr h, uint msg, IntPtr wp, IntPtr lp);
}
"@

$script:sbT = New-Object System.Text.StringBuilder 512
$script:sbC = New-Object System.Text.StringBuilder 512

function Get-Alive {
  $a = 0
  foreach ($n in $names) {
    $p = Get-Process -Name $n -ErrorAction SilentlyContinue
    if ($p) { $a += @($p).Count }
  }
  return $a
}

function Get-Titles {
  $script:titles = New-Object System.Collections.ArrayList
  $cb = [PlayWin+E]{
    param($h, $l)
    if (-not [PlayWin]::IsWindowVisible($h)) { return $true }
    $null = [PlayWin]::GetWindowText($h, $script:sbT, 512)
    $t = $script:sbT.ToString()
    if ($t.Length -gt 0) { [void]$script:titles.Add($t) }
    return $true
  }
  [void][PlayWin]::EnumWindows($cb, [IntPtr]::Zero)
  return $script:titles
}

function Close-PlayerWindows {
  $script:closed = 0
  $cb = [PlayWin+E]{
    param($h, $l)
    if (-not [PlayWin]::IsWindowVisible($h)) { return $true }
    $null = [PlayWin]::GetWindowText($h, $script:sbT, 512)
    $null = [PlayWin]::GetClassName($h, $script:sbC, 512)
    $t = $script:sbT.ToString()
    $c = $script:sbC.ToString()
    $isUwp = ($c -eq 'ApplicationFrameWindow' -and ($t -eq 'Media Player' -or $t -eq 'Films & TV' -or $t -eq 'Movies & TV'))
    $isPlayer = ($t -match 'PotPlayer|VLC|Media Player|KMPlayer|Windows Media Player|Media Player Classic')
    if ($isUwp -or $isPlayer) {
      if ([PlayWin]::PostMessage($h, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)) { $script:closed++ }
    }
    return $true
  }
  [void][PlayWin]::EnumWindows($cb, [IntPtr]::Zero)
  return $script:closed
}

$sw = [Diagnostics.Stopwatch]::StartNew()
$closed = 0
$forced = 0

# 1) بستن پخش‌کنندهٔ قبلی (اول مؤدبانه، بعد در صورت لزوم اجباری)
if ((Get-Alive) -gt 0) {
  $closed = Close-PlayerWindows
  $deadline = (Get-Date).AddMilliseconds(2500)
  while ((Get-Date) -lt $deadline -and (Get-Alive) -gt 0) { Start-Sleep -Milliseconds 150 }
  if ((Get-Alive) -gt 0) {
    foreach ($n in $names) {
      $p = Get-Process -Name $n -ErrorAction SilentlyContinue
      if ($p) { $forced += @($p).Count; $p | Stop-Process -Force -ErrorAction SilentlyContinue }
    }
    $deadline = (Get-Date).AddMilliseconds(2000)
    while ((Get-Date) -lt $deadline -and (Get-Alive) -gt 0) { Start-Sleep -Milliseconds 150 }
  }
}
$aliveAfterClose = Get-Alive

# 2) باز کردن فیلم درخواستی
$spawned = 0
if ($exe -ne '') {
  try { Start-Process -FilePath $exe -ArgumentList ('"' + $file + '"') | Out-Null; $spawned = 1 } catch { $spawned = 0 }
} else {
  try { Start-Process -FilePath $file | Out-Null; $spawned = 1 } catch { $spawned = 0 }
}

# 3) تأیید: عنوان پنجره باید فایل درخواستی (یا یک پخش‌کننده) را نشان دهد
$title = ''
$ok = $false
if ($doVerify) {
  $deadline = (Get-Date).AddSeconds(5)
  while ((Get-Date) -lt $deadline -and -not $ok) {
    foreach ($t in (Get-Titles)) {
      $lt = $t.ToLower()
      if ($requireFile) {
        foreach ($n in $needles) { if ($lt.Contains($n)) { $title = $t; $ok = $true; if ([PlayWin]::IsIconic($h)) { [void][PlayWin]::ShowWindow($h, 9) } break } }
      } else {
        foreach ($m in $markers) { if ($lt.Contains($m)) { $title = $t; $ok = $true; if ([PlayWin]::IsIconic($h)) { [void][PlayWin]::ShowWindow($h, 9) } break } }
      }
      if ($ok) { break }
    }
    if (-not $ok) { Start-Sleep -Milliseconds 250 }
  }
}

$result = 'FAIL'
if (-not $doVerify) { $result = 'SKIP' }
elseif ($ok) { $result = 'OK' }

Write-Output ("PLAYRESULT=" + $result)
Write-Output ("CLOSED=" + $closed)
Write-Output ("FORCED=" + $forced)
Write-Output ("ALIVE_AFTER_CLOSE=" + $aliveAfterClose)
Write-Output ("SPAWNED=" + $spawned)
Write-Output ("TITLE=" + $title)
Write-Output ("MS=" + [int]$sw.ElapsedMilliseconds)
`
}

function runPowerShell(script: string, timeoutMs = 25000): Promise<string> {
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

function field(out: string, key: string): string {
  const m = new RegExp(`^${key}=(.*)$`, 'm').exec(out)
  return m ? m[1].trim() : ''
}

function fieldNumber(out: string, key: string): number {
  const v = field(out, key)
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
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

/**
 * باز کردن لینک وب (پینترست/اینستاگرام/...) در مرورگر پیش‌فرض.
 * از rundll32 استفاده می‌شود چون:
 * - بدون واسطهٔ cmd/start است → کاراکترهای & و ? در لینک خراب نمی‌شوند
 * - برخلاف فایل محلی، نیازی به بستن پخش‌کنندهٔ در حال اجرا نیست
 */
function openUrl(url: string): void {
  try {
    const child = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    })
    child.on('error', (err) => console.error('open url error:', err.message))
    child.unref()
  } catch (error) {
    console.error('open url failed:', error)
  }
}

/**
 * نتیجهٔ جست‌وجوی پخش‌کننده یک‌بار کش می‌شود؛ قبلاً برای هر درخواست — و در
 * مسیر «قسمت بعد» چند بار — هشت مسیر با existsSync چک می‌شد.
 */
let cachedPlayer: string | null | undefined

function firstAvailableDesktopPlayer(): string | null {
  if (cachedPlayer !== undefined) return cachedPlayer

  const fromEnv = process.env.CINEPHILE_PLAYER
  if (fromEnv) {
    try {
      if (fs.existsSync(fromEnv)) {
        cachedPlayer = fromEnv
        return cachedPlayer
      }
    } catch { /* ignore */ }
  }
  for (const candidate of DESKTOP_PLAYERS) {
    try {
      if (fs.existsSync(candidate)) {
        cachedPlayer = candidate
        return cachedPlayer
      }
    } catch { /* ignore */ }
  }
  cachedPlayer = null
  return cachedPlayer
}

/**
 * زیرنویسِ ثبت‌شده برای این ویدیو را کنارِ خودِ فایل ویدیو با همان نام
 * (مثل Se7en.1995.1080.srt) کپی می‌کند تا هر پخش‌کننده‌ای — PotPlayer،
 * VLC، ویندوز — خودکار آن را بارگذاری کند. بدون این کپی، زیرنویس فقط
 * در پایگاه‌داده ثبت بود و موقع پخش اصلاً استفاده نمی‌شد.
 * اگر پوشه قابل‌نوشتن نباشد، بی‌صدا رد می‌شود و پخش ادامه پیدا می‌کند.
 */
const SUBTITLE_EXTS = ['.srt', '.vtt', '.ass', '.ssa', '.sub', '.txt']

async function prepareAdjacentSubtitle(videoPath: string): Promise<string | null> {
  try {
    const record = await prisma.localFile.findFirst({
      where: { filePath: videoPath },
      select: { subtitle: true }
    })
    const subUrl = record?.subtitle
    if (!subUrl || !subUrl.startsWith('/api/uploads/')) return null

    const subDisk = path.join(process.cwd(), 'uploads', path.basename(subUrl.split('?')[0]))
    if (!fs.existsSync(subDisk)) return null

    const subExt = path.extname(subDisk).toLowerCase()
    if (!SUBTITLE_EXTS.includes(subExt)) return null

    const videoDir = path.dirname(videoPath)
    const target = path.join(videoDir, path.basename(videoPath, path.extname(videoPath)) + subExt)

    fs.copyFileSync(subDisk, target)
    return target
  } catch (error) {
    console.warn('prepareAdjacentSubtitle skipped:', error instanceof Error ? error.message : error)
    return null
  }
}

interface OpenOutcome {
  success: boolean
  player: string
  attempts: number
  closedPrevious: number
  windowTitle: string | null
  verified: boolean
  elapsedMs?: number
  error?: string
}

/**
 * باز کردن فایل و تأیید اینکه همان فایل روی صفحه است.
 * هر تلاش = یک اسکریپت PowerShell (بستن + اجرا + پایش عنوان پنجره).
 */
async function openAndVerify(target: string, opts: { verify: boolean } = { verify: true }): Promise<OpenOutcome> {
  const exe = firstAvailableDesktopPlayer()
  const player = exe ? path.basename(exe) : 'default'
  const requireFile = !!exe && opts.verify
  let closedPrevious = 0
  let lastTitle: string | null = null
  let lastMs = 0
  const MAX_ATTEMPTS = 3

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const out = await runPowerShell(
      buildPlayScript({ target, exe, requireFile, verify: opts.verify }),
      25000
    )

    // اگر PowerShell اصلاً جوابی نداد، بی‌صدا رها نمی‌کنیم:
    // فایل را مستقیم باز می‌کنیم تا دکمهٔ پخش هیچ‌وقت بی‌نتیجه نماند.
    if (!out.trim()) {
      console.error('play-external: PowerShell خروجی نداد؛ باز کردن مستقیم انجام شد برای', target)
      if (exe) spawnPlayer(exe, [target])
      else openWithShell(target)
      return {
        success: true, player, attempts: attempt, closedPrevious,
        windowTitle: null, verified: false
      }
    }

    closedPrevious += fieldNumber(out, 'CLOSED') + fieldNumber(out, 'FORCED')
    lastMs = fieldNumber(out, 'MS')
    const result = field(out, 'PLAYRESULT')
    lastTitle = field(out, 'TITLE') || null

    if (result === 'OK' || result === 'SKIP') {
      console.log(
        `play-external: ${result} (attempt ${attempt}/${MAX_ATTEMPTS}, ${lastMs}ms, ` +
        `closed=${fieldNumber(out, 'CLOSED')}, forced=${fieldNumber(out, 'FORCED')}) -> ${lastTitle || target}`
      )
      return {
        success: true, player, attempts: attempt, closedPrevious,
        windowTitle: opts.verify ? lastTitle : null,
        verified: result === 'OK',
        elapsedMs: lastMs
      }
    }

    console.warn(
      `play-external: تأیید نشد (attempt ${attempt}/${MAX_ATTEMPTS}, ${lastMs}ms, ` +
      `aliveAfterClose=${fieldNumber(out, 'ALIVE_AFTER_CLOSE')}, spawned=${fieldNumber(out, 'SPAWNED')}, ` +
      `عنوان: ${lastTitle ?? 'هیچ'}) برای ${target}`
    )
  }

  return {
    success: false,
    player,
    attempts: MAX_ATTEMPTS,
    closedPrevious,
    windowTitle: lastTitle,
    verified: false,
    elapsedMs: lastMs,
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
  windowTitle: null,
  verified: false
})

export async function POST(request: NextRequest) {
  try {
    const { filePath, folderPath, stream } = await request.json()

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json({ error: 'مسیر فایل نامعتبر است' }, { status: 400 })
    }

    const requestId = ++latestRequest

    if (isUrl(filePath)) {
      const diskPath = resolveUploadUrl(filePath)
      if (diskPath) {
        console.log('Upload URL resolved to disk:', diskPath)
        const outcome = await withPlayLock(() =>
          requestId === latestRequest ? openAndVerify(diskPath) : Promise.resolve(superseded())
        )
        return NextResponse.json(
          { resolvedPath: diskPath, disk: true, ...outcome },
          { status: outcome.success ? 200 : 502 }
        )
      }

      const target = filePath.startsWith('/') ? `http://localhost:3000${filePath}` : filePath
      console.log('Play URL:', target)

      // پخش آنلاین در پلیر سیستم: URL مستقیماً به PotPlayer/VLC داده می‌شود.
      // مرورگر MKV را پخش نمی‌کند ولی پلیر سیستم آن را استریم می‌کند (بدون دانلود کامل).
      if (stream === true && /^https?:\/\//i.test(target)) {
        if (!firstAvailableDesktopPlayer()) {
          return NextResponse.json(
            { error: 'پخش‌کننده‌ای (PotPlayer/VLC/...) روی سیستم پیدا نشد' },
            { status: 400 }
          )
        }
        const outcome = await withPlayLock(() =>
          requestId === latestRequest ? openAndVerify(target) : Promise.resolve(superseded())
        )
        if (!outcome.success) {
          return NextResponse.json({ error: outcome.error, ...outcome }, { status: 502 })
        }
        return NextResponse.json({ resolvedPath: target, stream: true, ...outcome })
      }

      // لینک وب (پینترست/اینستاگرام/لینک مستقیم) در مرورگر پیش‌فرض باز می‌شود؛
      // برخلاف فایل محلی، پخش‌کنندهٔ در حال اجرای کاربر نباید بسته شود.
      openUrl(target)
      return NextResponse.json({ resolvedPath: target, url: true, success: true })
    }

    const resolved = resolveFilePath(filePath, folderPath)
    console.log('Play request:', resolved)

    if (!fs.existsSync(resolved)) {
      return NextResponse.json(
        { error: 'فایل در مسیر ذخیره‌شده یافت نشد؛ ممکن است جابه‌جا یا حذف شده باشد' },
        { status: 404 }
      )
    }

    // زیرنویس ثبت‌شده را کنارِ ویدیو بگذار تا هنگام پخش استفاده شود
    const subtitlePath = await prepareAdjacentSubtitle(resolved)
    if (subtitlePath) console.log('play-external: subtitle prepared ->', subtitlePath)

    const outcome = await withPlayLock(() =>
      requestId === latestRequest ? openAndVerify(resolved) : Promise.resolve(superseded())
    )

    if (!outcome.success) {
      console.error('play-external: verification failed for', resolved, outcome)
      return NextResponse.json({ error: outcome.error, subtitlePath, ...outcome }, { status: 502 })
    }

    return NextResponse.json({ resolvedPath: resolved, subtitlePath, ...outcome })
  } catch (error) {
    console.error('External play error:', error)
    return NextResponse.json({ error: 'خطا در باز کردن پخش‌کننده' }, { status: 500 })
  }
}
