'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// The renderer runs with nodeIntegration:false and cannot require() anything,
// so the app version is read here (preload still has Node) and exposed with the API.
let appVersion = null;
try { appVersion = require('./package.json').version; } catch (_e) {}

contextBridge.exposeInMainWorld('eli6', {
  // ── App info ────────────────────────────────────────────────────────
  version: appVersion,
  // ── Window control ──────────────────────────────────────────────────
  hide:  () => ipcRenderer.send('window-hide'),
  show:  () => ipcRenderer.send('window-show'),
  quit:  () => ipcRenderer.send('window-quit'),
  panic: () => ipcRenderer.send('panic-key'),

  // ── Overlay appearance ──────────────────────────────────────────────
  setOpacity:    (v) => ipcRenderer.send('set-opacity', Math.min(1, Math.max(0.1, v))),
  setTint:       (v) => ipcRenderer.send('set-tint', Math.min(1, Math.max(0, v))),
  setZoom:       (v) => ipcRenderer.send('set-zoom', v),

  // ── Audio ───────────────────────────────────────────────────────────
  setAudioMuted: (m) => ipcRenderer.send('set-audio-muted', !!m),

  // ── Click-through & pop-out ─────────────────────────────────────────
  toggleClickThrough: () => ipcRenderer.send('toggle-click-through'),
  togglePopOut:       () => ipcRenderer.send('toggle-popout'),
  getClickThrough:    () => ipcRenderer.invoke('get-click-through'),
  getPopOut:          () => ipcRenderer.invoke('get-popout'),

  // ── Position presets ────────────────────────────────────────────────
  snapPosition: (preset) => ipcRenderer.send('snap-position', preset),

  // ── Auto-hide timer ─────────────────────────────────────────────────
  setAutoHide: (minutes) => ipcRenderer.send('set-auto-hide', minutes),

  // ── Lock mode ───────────────────────────────────────────────────────
  setLock:       (enabled, pin) => ipcRenderer.send('set-lock', { enabled, pin }),
  lockVerified:  () => ipcRenderer.send('lock-verified'),

  // ── Autostart ───────────────────────────────────────────────────────
  setAutostart:  (v) => ipcRenderer.send('set-autostart', !!v),
  getAutostart:  () => ipcRenderer.invoke('get-autostart'),

  // ── Ad blocker ──────────────────────────────────────────────────────────────
  setAdBlocker: (v) => ipcRenderer.send('set-adblocker', !!v),
  getAdBlocker: () => ipcRenderer.invoke('get-adblocker'),

  // ── Screenshot ──────────────────────────────────────────────────────
  screenshot: () => ipcRenderer.invoke('capture-screenshot'),

  // ── Updates ─────────────────────────────────────────────────────────
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  downloadUpdate:  () => ipcRenderer.send('download-update'),
  installUpdate:   () => ipcRenderer.send('install-update'),

  // ── Events from main → renderer ────────────────────────────────────
  on: (channel, cb) => {
    const ALLOWED = [
      'set-mute', 'click-through-changed', 'panic-navigate',
      'show-lock-prompt', 'popout-changed', 'autostart-changed',
      'update-available', 'update-progress', 'update-downloaded',
      'update-error', 'update-not-found',
      'adblocker-changed',
    ];
    if (!ALLOWED.includes(channel)) return () => {};
    const handler = (_e, ...args) => cb(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
