/**
 * Preload script — bridges the renderer (web page) and main process.
 *
 * For now this is intentionally minimal: the Next.js app talks to itself
 * via /api/* routes which run in the spawned Next.js server. No direct
 * Node.js APIs are exposed to the renderer.
 *
 * If we later want to access native APIs (file system dialogs, system
 * notifications without webNotification, etc.) we should expose them
 * through here via contextBridge.
 */

const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  platform: process.platform,
  version: process.versions.electron
})
