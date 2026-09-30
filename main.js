'use strict';

const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  shell,
  screen,
  dialog,
  session,
} = require('electron');
const path = require('path');
const fs   = require('fs');

// ─── Single-instance lock ─────────────────────────────────────────────────────
// This is the core fix for Win+G dying after close.
// Only one process runs at all times. Second launch just shows the window.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  // Another instance is already running — tell it to show and exit this one
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (win) { win.show(); win.focus(); }
});

// ─── State ───────────────────────────────────────────────────────────────────
let win       = null;
let tintWin   = null;   // the dark tint overlay behind the main window
let tray      = null;
let isClickThrough = false;
let isLocked  = false;
let lockPin   = '';
let audioMuted    = false;
let userAudioState = false;
let autoHideTimer = null;
let popOutMode    = false;

// ─── Paths ───────────────────────────────────────────────────────────────────
// In packaged app, __dirname points inside the asar archive.
// process.resourcesPath points to the real resources directory on disk.
const APP_ROOT  = app.isPackaged ? process.resourcesPath : __dirname;
const LOGO_PATH = path.join(APP_ROOT, 'app', 'logo.png');
const LOGO_PATH_DEV = path.join(__dirname, 'logo.png');
// Window/taskbar icon. Must be a real file on disk when packaged — native icon
// loading cannot read inside the asar archive, so prefer the unpacked copy.
const ICON_PATH = (() => {
  const unpacked = path.join(process.resourcesPath || '', 'app.asar.unpacked', 'assets', 'icon.ico');
  const inAsar   = path.join(__dirname, 'assets', 'icon.ico');
  const order    = app.isPackaged ? [unpacked, inAsar] : [inAsar, unpacked];
  for (const p of order) {
    try { if (p && fs.existsSync(p)) return p; } catch (_) {}
  }
  return '';
})();

// ─── Tray icon helper ─────────────────────────────────────────────────────────
function getTrayIcon() {
  // Try every possible location the logo might be at runtime
  const candidates = [
    LOGO_PATH_DEV,                                                              // dev: project root
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'logo.png'),   // packaged: unpacked
    path.join(path.dirname(app.getPath('exe')), 'resources', 'app.asar.unpacked', 'logo.png'),
    ICON_PATH,                                                                  // fallback: .ico
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const img = nativeImage.createFromPath(p);
        if (!img.isEmpty()) return img.resize({ width: 16, height: 16 });
      }
    } catch (_) {}
  }

  // Final fallback: tiny green square so tray always has SOMETHING visible
  return nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAI0lEQVQ4jWNg' +
    'YGD4z8BQDwAAAAAA//8DABSuCQFGiAKxAAAAAElFTkSuQmCC'
  );
}

// ─── Tint window ─────────────────────────────────────────────────────────────
// A second, always-on-top, transparent, click-through window that sits behind
// the main window and darkens the rest of the screen.
function createTintWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  tintWin = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  // Tint is click-through — clicks always pass through to desktop/apps
  tintWin.setIgnoreMouseEvents(true, { forward: true });
  // Put it below the main window in the z-order
  tintWin.setAlwaysOnTop(true, 'screen-saver', 0);
  tintWin.setContentProtection(true);

  // Serve a minimal HTML page with a dark rgba background
  tintWin.loadURL(
    'data:text/html,<html style="margin:0;padding:0;background:rgba(0,0,0,0.20);width:100vw;height:100vh;display:block;"></html>'
  );
  tintWin.once('ready-to-show', () => {
    // tint starts hidden; shown when main window shows
  });
}

function setTintOpacity(fraction) {
  // fraction: 0–1 (0 = off, 0.20 = default 20%)
  if (!tintWin || tintWin.isDestroyed()) return;
  const pct = Math.round(fraction * 100);
  tintWin.loadURL(
    `data:text/html,<html style="margin:0;padding:0;background:rgba(0,0,0,${fraction.toFixed(2)});width:100vw;height:100vh;display:block;"></html>`
  );
}

function showTint() {
  if (!tintWin || tintWin.isDestroyed()) return;
  tintWin.showInactive();
  // Ensure tint is below main window
  if (win && !win.isDestroyed()) win.moveTop();
}

function hideTint() {
  if (!tintWin || tintWin.isDestroyed()) return;
  tintWin.hide();
}

// ─── Main window ─────────────────────────────────────────────────────────────
function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 500,
    minHeight: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    hasShadow: false,
    show: false,
    icon: ICON_PATH || undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
      devTools: false,
    },
  });

  // Anti-capture: SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)
  win.setContentProtection(true);
  win.loadFile('index.html');

  win.once('ready-to-show', () => {
    win.show();
    showTint();
  });

  // Soft-close — NEVER quit, always hide
  win.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      hideOverlay();
    }
  });

  // Auto-hide on blur (click outside)
  win.on('blur', () => {
    if (!isLocked) hideOverlay();
  });
}

// ─── Tray ─────────────────────────────────────────────────────────────────────
function createTray() {
  tray = new Tray(getTrayIcon());
  tray.setToolTip('Eli6Overlay');
  rebuildTrayMenu();
  tray.on('click', () => toggleVisibility());
}

function rebuildTrayMenu() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    { label: 'Show',  click: showOverlay },
    { label: 'Hide',  click: hideOverlay },
    { type: 'separator' },
    {
      label: 'Start with Windows',
      type: 'checkbox',
      checked: getAutostart(),
      click: (item) => setAutostart(item.checked),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => { app.isQuiting = true; app.quit(); },
    },
  ]);
  tray.setContextMenu(menu);
}

// ─── Autostart (no admin required — uses HKCU) ───────────────────────────────
function getAutostart() {
  return app.getLoginItemSettings().openAtLogin;
}

function setAutostart(enable) {
  app.setLoginItemSettings({
    openAtLogin: enable,
    // openAsHidden: true keeps window hidden on autostart
    args: enable ? ['--autostart'] : [],
  });
  rebuildTrayMenu();
  if (win && !win.isDestroyed()) {
    win.webContents.send('autostart-changed', enable);
  }
}

// ─── Visibility ───────────────────────────────────────────────────────────────
function showOverlay() {
  if (!win || win.isDestroyed()) return;
  if (isLocked && lockPin) {
    // Renderer will show pin prompt
    win.show();
    win.focus();
    win.webContents.send('show-lock-prompt');
    return;
  }
  win.show();
  win.focus();
  showTint();
  muteAllTabs(userAudioState);
  resetAutoHideTimer();
}

function hideOverlay() {
  if (!win || win.isDestroyed()) return;
  userAudioState = audioMuted;
  muteAllTabs(true);
  hideTint();
  win.hide();
  clearAutoHideTimer();
}

function toggleVisibility() {
  if (!win || win.isDestroyed()) return;
  win.isVisible() ? hideOverlay() : showOverlay();
}

// ─── Audio ────────────────────────────────────────────────────────────────────
function muteAllTabs(mute) {
  audioMuted = mute;
  if (!win || win.isDestroyed()) return;
  win.webContents.setAudioMuted(mute);
  win.webContents.send('set-mute', mute);
}

// ─── Click-through ────────────────────────────────────────────────────────────
function toggleClickThrough() {
  if (!win || win.isDestroyed()) return;
  isClickThrough = !isClickThrough;
  win.setIgnoreMouseEvents(isClickThrough, { forward: true });
  win.webContents.send('click-through-changed', isClickThrough);
}

// ─── Auto-hide timer ──────────────────────────────────────────────────────────
function resetAutoHideTimer(minutes = 0) {
  clearAutoHideTimer();
  if (minutes > 0) {
    autoHideTimer = setTimeout(hideOverlay, minutes * 60 * 1000);
  }
}

function clearAutoHideTimer() {
  if (autoHideTimer) { clearTimeout(autoHideTimer); autoHideTimer = null; }
}

// ─── Pop-out mode ─────────────────────────────────────────────────────────────
function togglePopOut() {
  if (!win || win.isDestroyed()) return;
  popOutMode = !popOutMode;
  win.setSkipTaskbar(!popOutMode);
  win.setAlwaysOnTop(!popOutMode);
  win.setContentProtection(!popOutMode);
  if (popOutMode) { hideTint(); } else { showTint(); }
  win.webContents.send('popout-changed', popOutMode);
}

// ─── Position presets ─────────────────────────────────────────────────────────
function snapToPosition(preset) {
  if (!win || win.isDestroyed()) return;
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  const [ww, wh] = win.getSize();
  const positions = {
    'top-left':     [0,       0      ],
    'top-right':    [sw - ww, 0      ],
    'bottom-left':  [0,       sh - wh],
    'bottom-right': [sw - ww, sh - wh],
    'center':       [Math.round((sw - ww) / 2), Math.round((sh - wh) / 2)],
    'top-center':   [Math.round((sw - ww) / 2), 0     ],
    'bottom-center':[Math.round((sw - ww) / 2), sh - wh],
  };
  const pos = positions[preset];
  if (pos) win.setPosition(pos[0], pos[1], false);
}

// ─── Panic ────────────────────────────────────────────────────────────────────
function panicHide() {
  muteAllTabs(true);
  if (win && !win.isDestroyed()) win.webContents.send('panic-navigate');
  hideOverlay();
}

// ─── Global hotkeys ───────────────────────────────────────────────────────────
function registerHotkeys() {
  // Ctrl+Shift+G — toggle visibility (show/hide)
  globalShortcut.register('Control+Shift+G', toggleVisibility);

  // Ctrl+Shift+C — toggle click-through
  globalShortcut.register('Control+Shift+C', toggleClickThrough);

  // Ctrl+Shift+X — panic hide (global emergency key)
  globalShortcut.register('Control+Shift+X', panicHide);
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────
ipcMain.on('window-hide',  () => hideOverlay());
ipcMain.on('window-show',  () => showOverlay());
ipcMain.on('window-quit',  () => { app.isQuiting = true; app.quit(); });
ipcMain.on('panic-key',    () => panicHide());
ipcMain.on('toggle-click-through', () => toggleClickThrough());
ipcMain.on('toggle-popout',        () => togglePopOut());

ipcMain.on('set-opacity', (_e, value) => {
  if (win && !win.isDestroyed()) win.setOpacity(Math.min(1, Math.max(0.1, value)));
});

ipcMain.on('set-tint', (_e, fraction) => {
  // fraction 0–1; 0 hides tint window entirely
  if (fraction <= 0) { hideTint(); }
  else { setTintOpacity(fraction); showTint(); }
});

ipcMain.on('set-audio-muted', (_e, muted) => muteAllTabs(!!muted));

ipcMain.on('set-auto-hide', (_e, minutes) => resetAutoHideTimer(minutes));

ipcMain.on('set-lock', (_e, { enabled, pin }) => {
  isLocked = enabled;
  lockPin  = pin || '';
});

ipcMain.on('snap-position', (_e, preset) => snapToPosition(preset));

ipcMain.on('set-autostart', (_e, enable) => setAutostart(enable));

ipcMain.on('set-zoom', (_e, factor) => {
  if (win && !win.isDestroyed()) {
    win.webContents.setZoomFactor(Math.min(3, Math.max(0.25, factor)));
  }
});

ipcMain.on('lock-verified', () => {
  // User entered correct PIN — actually show the window now
  if (win && !win.isDestroyed()) { win.show(); win.focus(); showTint(); }
});

// Screenshot of the active webview content
ipcMain.handle('capture-screenshot', async () => {
  if (!win || win.isDestroyed()) return null;
  try {
    const image = await win.webContents.capturePage();
    const savePath = dialog.showSaveDialogSync(win, {
      title: 'Save Screenshot',
      defaultPath: `eli6overlay-${Date.now()}.png`,
      filters: [{ name: 'PNG', extensions: ['png'] }],
    });
    if (savePath) {
      fs.writeFileSync(savePath, image.toPNG());
      return savePath;
    }
  } catch (e) { /* ignore */ }
  return null;
});

// Queries
ipcMain.handle('get-click-through', () => isClickThrough);
ipcMain.handle('get-autostart',     () => getAutostart());
ipcMain.handle('get-popout',        () => popOutMode);

// ─── Ad blocker ───────────────────────────────────────────────────────────────
// Uses @ghostery/adblocker-electron — EasyList + EasyPrivacy + uBlock Origin
// filter lists. Hooks into session.defaultSession.webRequest to block requests
// before they leave the machine. Webviews created without a `partition`
// attribute resolve to the default session, so every tab is covered.
//
// Cosmetic filtering (element hiding / scriptlets) needs
// session.registerPreloadScript, which Electron 32 does not expose — enabling it
// throws, and that exception takes network blocking down with it. Network-level
// blocking needs neither, so that is what ships here.
const ADBLOCK_CONFIG = { loadCosmeticFilters: false };

let adBlockerEnabled = true;   // on by default
let adblocker = null;
let adblockerBusy  = false;

// Serialised engine cache: first launch downloads the lists once, later launches
// read them from disk instantly (and keep working while offline).
// Stale entries are dropped so the lists still refresh over time.
const ADBLOCK_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;   // refresh weekly

function adBlockerCache() {
  const file = path.join(app.getPath('userData'), 'adblocker-engine.bin');
  try {
    const st = fs.statSync(file);
    if (Date.now() - st.mtimeMs > ADBLOCK_CACHE_TTL) fs.unlinkSync(file);
  } catch (_) {}
  return {
    path: file,
    read:  (p) => fs.promises.readFile(p),
    write: async (p, buf) => { try { await fs.promises.writeFile(p, buf); } catch (_) {} },
  };
}

async function initAdBlocker() {
  if (adblockerBusy || adblocker) return;
  adblockerBusy = true;
  try {
    const { ElectronBlocker, adsAndTrackingLists } = require('@ghostery/adblocker-electron');
    // Node's built-in fetch — no extra dependency. Wrapped so it is always
    // called unbound (globalThis.fetch does not depend on a receiver).
    const fetchImpl = (...args) => globalThis.fetch(...args);

    const blocker = await ElectronBlocker.fromLists(
      fetchImpl,
      adsAndTrackingLists,
      ADBLOCK_CONFIG,
      adBlockerCache()
    );
    // Re-assert after deserialize(): a cache written with another config must
    // never re-enable the cosmetic path (see ADBLOCK_CONFIG above).
    blocker.config.loadCosmeticFilters = false;
    adblocker = blocker;

    if (adBlockerEnabled) {
      adblocker.enableBlockingInSession(session.defaultSession);
    }
  } catch (e) {
    // Offline or list download failed — browsing still works, no blocking.
    // setAdBlocker(true) retries this later.
    adblocker = null;
  } finally {
    adblockerBusy = false;
  }
}

function setAdBlocker(enabled) {
  adBlockerEnabled = enabled;
  if (adblocker) {
    try {
      if (enabled) adblocker.enableBlockingInSession(session.defaultSession);
      else         adblocker.disableBlockingInSession(session.defaultSession);
    } catch (_) {}
  } else if (enabled) {
    initAdBlocker();   // startup attempt failed or was still running — make sure it lands
  }
  if (win && !win.isDestroyed()) {
    win.webContents.send('adblocker-changed', enabled);
  }
}

ipcMain.on('set-adblocker', (_e, enabled) => setAdBlocker(!!enabled));
ipcMain.handle('get-adblocker', () => adBlockerEnabled);

// ─── Auto-updater ─────────────────────────────────────────────────────────────
// Check GitHub Releases for a newer version on startup.
// autoDownload = false → never installs without user consent.
// On update-available, we just send a notification to the renderer
// which shows a subtle banner: "v1.x.x available — Download"
function initUpdater() {
  // Only run in packaged app — not in dev (no app-update.yml present)
  if (!app.isPackaged) return;

  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload        = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.allowPrerelease     = false;

    autoUpdater.on('update-available', (info) => {
      // Tell the renderer to show the update banner
      if (win && !win.isDestroyed()) {
        win.webContents.send('update-available', {
          version:      info.version,
          releaseNotes: info.releaseNotes || '',
          releaseDate:  info.releaseDate  || '',
        });
      }
    });

    autoUpdater.on('error', () => {
      // Silently ignore — no network, GitHub down, etc. Don't bother the user.
    });

    // Check ~5 seconds after launch so startup isn't slowed down
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 5000);

  } catch (_) {
    // electron-updater not available in this build — ignore
  }
}

// IPC: renderer can trigger a manual update check
ipcMain.on('check-for-updates', () => {
  if (!app.isPackaged) return;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.checkForUpdates().catch(() => {});
  } catch (_) {}
});
app.whenReady().then(async () => {
  // If launched by autostart flag, start hidden
  const startHidden = process.argv.includes('--autostart');

  // ── Autostart on first launch (default ON) ──────────────────────────────
  // Only set once — if user toggles it off later, we respect that setting.
  const FIRST_RUN_KEY = 'eli6_autostart_set';
  if (!app.getLoginItemSettings().openAtLogin) {
    try {
      const userDataPath = app.getPath('userData');
      const flagFile = require('path').join(userDataPath, FIRST_RUN_KEY);
      if (!require('fs').existsSync(flagFile)) {
        setAutostart(true);
        require('fs').writeFileSync(flagFile, '1');
      }
    } catch (_) {}
  }

  // ── Ad blocker ──────────────────────────────────────────────────────────
  // Deliberately not awaited: fetching the filter lists must never hold up
  // window creation. Blocking is attached as soon as the engine is ready.
  initAdBlocker();

  createTintWindow();
  createWindow();
  createTray();
  registerHotkeys();
  initUpdater();

  if (startHidden && win) {
    win.once('ready-to-show', () => { win.hide(); hideTint(); });
  }
});

// NEVER quit on all-windows-closed — this is what keeps Win+G alive
app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  if (win && !win.isVisible()) showOverlay();
});
