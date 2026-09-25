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
  dialog,
} = require('electron');
const path = require('path');
const fs = require('fs');

// ─── State ──────────────────────────────────────────────────────────────────
let win = null;
let tray = null;
let isClickThrough = false;
let audioMuted = false;        // current forced-mute state
let userAudioState = false;    // what the user actually set before hide

// ─── Tray icon helper ────────────────────────────────────────────────────────
function getTrayIcon() {
  const icoPath = path.join(__dirname, 'assets', 'icon.ico');
  if (fs.existsSync(icoPath)) {
    return nativeImage.createFromPath(icoPath);
  }
  // Fallback: generate a tiny 16×16 green pixel as base64 PNG
  const fallbackBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHklEQVQ4jWNgYGD4' +
    'z8BQDwAAAP//AwBY+AX0xWcIrQAAAABJRU5ErkJggg==';
  return nativeImage.createFromDataURL(`data:image/png;base64,${fallbackBase64}`);
}

// ─── Window creation ─────────────────────────────────────────────────────────
function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 600,
    minHeight: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,            // hide from taskbar & Alt+Tab
    resizable: true,
    hasShadow: false,
    show: false,                  // show after ready-to-show
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,           // allow <webview> tags for tabs
      devTools: false,
    },
  });

  // ── Anti-capture: SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE) ──────────
  // Electron exposes setContentProtection() which internally calls
  // SetWindowDisplayAffinity with WDA_EXCLUDEFROMCAPTURE on Windows,
  // hiding the window from OBS, Discord, Zoom, Teams, and screenshots.
  win.setContentProtection(true);

  win.loadFile('index.html');

  // Show window after paint so it appears clean, no white flash
  win.once('ready-to-show', () => {
    win.show();
  });

  // ── Soft-close: hide instead of quit ─────────────────────────────────────
  win.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      win.hide();
      muteAllTabs(true);
    }
  });

  // ── Auto-hide on blur ─────────────────────────────────────────────────────
  win.on('blur', () => {
    win.hide();
    muteAllTabs(true);
  });
}

// ─── Tray setup ──────────────────────────────────────────────────────────────
function createTray() {
  tray = new Tray(getTrayIcon());
  tray.setToolTip('Eli6Overlay');

  const buildMenu = () =>
    Menu.buildFromTemplate([
      {
        label: 'Show',
        click: () => {
          showOverlay();
        },
      },
      {
        label: 'Hide',
        click: () => {
          hideOverlay();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit Application',
        click: () => {
          app.isQuiting = true;
          app.quit();
        },
      },
    ]);

  tray.setContextMenu(buildMenu());
  tray.on('click', () => toggleVisibility());
}

// ─── Visibility helpers ───────────────────────────────────────────────────────
function showOverlay() {
  if (!win) return;
  win.show();
  win.focus();
  // Restore audio state the user had before hide
  muteAllTabs(userAudioState);
}

function hideOverlay() {
  if (!win) return;
  // Save user's audio preference before forcing mute
  userAudioState = audioMuted;
  muteAllTabs(true);
  win.hide();
}

function toggleVisibility() {
  if (!win) return;
  if (win.isVisible()) {
    hideOverlay();
  } else {
    showOverlay();
  }
}

// ─── Audio helpers ────────────────────────────────────────────────────────────
function muteAllTabs(mute) {
  audioMuted = mute;
  if (!win) return;
  win.webContents.setAudioMuted(mute);
  // Also mute any <webview> guests – renderer will handle that via IPC
  win.webContents.send('set-mute', mute);
}

// ─── Click-through toggle ─────────────────────────────────────────────────────
function toggleClickThrough() {
  if (!win) return;
  isClickThrough = !isClickThrough;
  win.setIgnoreMouseEvents(isClickThrough, { forward: true });
  win.webContents.send('click-through-changed', isClickThrough);
}

// ─── Panic key handler ────────────────────────────────────────────────────────
function panicHide() {
  if (!win) return;
  muteAllTabs(true);
  win.webContents.send('panic-navigate');   // navigate all tabs to about:blank
  win.hide();
}

// ─── Global hotkeys ───────────────────────────────────────────────────────────
function registerHotkeys() {
  // Win+G  OR  Ctrl+Shift+G  → toggle visibility
  const toggled1 = globalShortcut.register('Super+G', toggleVisibility);
  if (!toggled1) {
    globalShortcut.register('Control+Shift+G', toggleVisibility);
  }

  // Win+Shift+C → toggle click-through
  globalShortcut.register('Super+Shift+C', toggleClickThrough);
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────
ipcMain.on('window-hide', () => hideOverlay());
ipcMain.on('window-show', () => showOverlay());
ipcMain.on('window-quit', () => {
  app.isQuiting = true;
  app.quit();
});
ipcMain.on('toggle-click-through', () => toggleClickThrough());
ipcMain.on('set-opacity', (_e, value) => {
  if (win) win.setOpacity(value);
});
ipcMain.on('set-audio-muted', (_e, muted) => {
  audioMuted = muted;
  if (win) win.webContents.setAudioMuted(muted);
});
ipcMain.on('panic-key', () => panicHide());

// Renderer can ask for current click-through state
ipcMain.handle('get-click-through', () => isClickThrough);

// Window drag (frameless drag regions handled via renderer CSS -webkit-app-region)
// But we also support programmatic move for the drag bar
ipcMain.on('window-drag-start', (_e, { startX, startY }) => {
  if (!win) return;
  const pos = win.getPosition();
  const onMouseMove = (_ev, { x, y }) => {
    win.setPosition(Math.round(pos[0] + (x - startX)), Math.round(pos[1] + (y - startY)));
  };
  win.webContents.on('cursor-changed', onMouseMove);
  setTimeout(() => win.webContents.off('cursor-changed', onMouseMove), 5000);
});

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  createTray();
  registerHotkeys();
});

app.on('window-all-closed', (e) => {
  // On Windows, keep the process alive – tray keeps app running
  e.preventDefault();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  // macOS dock click
  if (win && !win.isVisible()) showOverlay();
});
