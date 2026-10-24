/**
 * Electron main process for Cinephile Vault.
 *
 * Strategy:
 *   1. (production) Spawn the bundled Next.js standalone server (in resourcesPath)
 *      (dev) Just connect to the running `npm run dev` server on :3000
 *   2. Wait until the server responds on http://127.0.0.1:3000
 *   3. Open a BrowserWindow pointing to that URL
 *   4. On app quit, kill the Next.js server process
 *
 * Why spawn instead of using static export?
 *   The app has many API routes (/api/tmdb, /api/f2m, /api/ratings, /api/media,
 *   /api/play-external, /api/pick-file, …) that need a Node.js runtime.
 *   Static export would break all of them.
 */

const { app, BrowserWindow, shell, Menu } = require('electron')
const { spawn } = require('node:child_process')
const path = require('node:path')
const http = require('node:http')

const isDev = !app.isPackaged
const PORT = process.env.PORT || 3000
const HOST = '127.0.0.1'
const URL = `http://${HOST}:${PORT}`

let nextProcess = null
let mainWindow = null
let isQuitting = false

/* ─── Start the Next.js standalone server (production only) ─── */

function startNextServer() {
  if (isDev) {
    // dev mode assumes `npm run dev` is already running on :3000
    console.log('[main] dev mode — assuming Next.js dev server is already running on', URL)
    return
  }

  // Production: the standalone Next.js server is bundled under resourcesPath/app
  const serverRoot = path.join(process.resourcesPath, 'app', '.next', 'standalone')
  const serverFile = path.join(serverRoot, 'server.js')

  console.log('[main] starting Next.js standalone server:', serverFile)

  // Electron ships with Node.js built-in. Setting ELECTRON_RUN_AS_NODE=1
  // makes the Electron binary behave like a regular `node` binary.
  // This avoids needing a separate Node.js installation on the user's
  // machine — Electron itself runs the Next.js server.
  nextProcess = spawn(process.execPath, [serverFile], {
    cwd: serverRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(PORT),
      HOSTNAME: HOST,
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  })

  nextProcess.stdout.on('data', (chunk) => {
    console.log('[next]', chunk.toString().trim())
  })
  nextProcess.stderr.on('data', (chunk) => {
    console.error('[next]', chunk.toString().trim())
  })
  nextProcess.on('exit', (code) => {
    console.log('[main] Next.js server exited with code', code)
    if (!isQuitting) {
      // Server died unexpectedly — show an error and quit
      showErrorDialog('سرویس سینمافیل متوقف شد', `کد خروج: ${code}`)
      app.quit()
    }
  })
}

/* ─── Wait for server to be ready ─── */

function waitForServer(maxAttempts = 60) {
  return new Promise((resolve, reject) => {
    let attempts = 0
    const check = () => {
      attempts++
      const req = http.get(URL, (res) => {
        if (res.statusCode === 200 || res.statusCode === 302 || res.statusCode === 404) {
          resolve()
        } else {
          retry()
        }
        res.resume()
      })
      req.on('error', retry)
      req.setTimeout(2000, () => {
        req.destroy()
        retry()
      })
    }
    const retry = () => {
      if (attempts >= maxAttempts) {
        reject(new Error(`Server did not start within ${maxAttempts * 2}s`))
      } else {
        setTimeout(check, 500)
      }
    }
    check()
  })
}

/* ─── Window management ─── */

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0a0a0f',
    title: 'سینمافیل — Cinephile Vault',
    autoHideMenuBar: true,
    show: false, // show when ready-to-appear (avoid white flash)
    icon: path.join(__dirname, '..', 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  // Open external links (imdb.com, rottentomatoes.com, etc.) in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(URL) || url.startsWith('http://localhost:')) {
      return { action: 'allow' }
    }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Hide the menu bar entirely on Windows
  Menu.setApplicationMenu(null)

  mainWindow.loadURL(URL)
}

/* ─── Error helper ─── */

function showErrorDialog(title, body) {
  // Lazy-load to avoid dependency cycle
  const { dialog } = require('electron')
  dialog.showErrorBox(title, body)
}

/* ─── App lifecycle ─── */

app.whenReady().then(async () => {
  startNextServer()

  try {
    if (!isDev) {
      console.log('[main] waiting for Next.js server to be ready…')
      await waitForServer()
    } else {
      // In dev mode also wait a bit, but less
      try {
        await waitForServer(15)
      } catch {
        // dev server might still be starting; try to load anyway
      }
    }
    createWindow()
  } catch (err) {
    console.error('[main] failed to start server:', err.message)
    showErrorDialog(
      'خطا در راه‌اندازی سینمافیل',
      `برنامه نتوانست سرویس محلی خود را شروع کند.\n\n${err.message}\n\nاز Task Manager مطمئن شو که پورت ${PORT} اشغال نیست.`
    )
    app.quit()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', (event) => {
  if (nextProcess && !isQuitting) {
    event.preventDefault()
    isQuitting = true
    console.log('[main] shutting down Next.js server…')
    if (process.platform === 'win32') {
      // Use taskkill /T to kill the process tree on Windows
      spawn('taskkill', ['/PID', String(nextProcess.pid), '/T', '/F'], {
        windowsHide: true
      }).on('exit', () => app.exit(0))
    } else {
      // Send SIGTERM to the process group on Unix
      try { process.kill(-nextProcess.pid, 'SIGTERM') } catch { /* ignore */ }
      nextProcess.kill('SIGTERM')
      setTimeout(() => app.exit(0), 500)
    }
  }
})

/* ─── Crash safety: also kill server if Electron dies ─── */

process.on('exit', () => {
  if (nextProcess) {
    try { nextProcess.kill('SIGKILL') } catch { /* ignore */ }
  }
})

process.on('SIGINT', () => app.quit())
process.on('SIGTERM', () => app.quit())
