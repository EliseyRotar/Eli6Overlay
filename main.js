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
const LOGO_PATH = path.join(__dirname, 'logo.png');
const ICON_PATH = path.join(__dirname, 'assets', 'icon.ico');

// ─── Tray icon helper ─────────────────────────────────────────────────────────
function getTrayIcon() {
  // Prefer logo.png converted to nativeImage (handles transparency properly)
  if (fs.existsSync(LOGO_PATH)) {
    const img = nativeImage.createFromPath(LOGO_PATH);
    if (!img.isEmpty()) return img.resize({ width: 16, height: 16 });
  }
  if (fs.existsSync(ICON_PATH)) return nativeImage.createFromPath(ICON_PATH);
  // Fallback: 1×1 transparent pixel
  return nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
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
  // Win+G toggle — this now works after window close because the process never dies
  const ok = globalShortcut.register('Super+G', toggleVisibility);
  if (!ok) globalShortcut.register('Control+Shift+G', toggleVisibility);

  // Always register the Ctrl+Shift+G fallback too
  globalShortcut.register('Control+Shift+G', toggleVisibility);
  globalShortcut.register('Super+Shift+C', toggleClickThrough);
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

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // If launched by autostart and --autostart flag, start hidden
  const startHidden = process.argv.includes('--autostart');

  createTintWindow();
  createWindow();
  createTray();
  registerHotkeys();

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
