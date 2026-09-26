'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('eli6', {
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

  // ── Screenshot ──────────────────────────────────────────────────────
  screenshot: () => ipcRenderer.invoke('capture-screenshot'),

  // ── Updates ─────────────────────────────────────────────────────────
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),

  // ── Events from main → renderer ────────────────────────────────────
  on: (channel, cb) => {
    const ALLOWED = [
      'set-mute', 'click-through-changed', 'panic-navigate',
      'show-lock-prompt', 'popout-changed', 'autostart-changed',
      'update-available',
    ];
    if (!ALLOWED.includes(channel)) return () => {};
    const handler = (_e, ...args) => cb(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
