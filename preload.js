'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Secure IPC bridge exposed to the renderer process via window.eli6.
 * All communication is one-way or request/response through defined channels.
 * The renderer cannot access Node.js internals.
 */
contextBridge.exposeInMainWorld('eli6', {
  // ── Window control ─────────────────────────────────────────────────────
  hide: () => ipcRenderer.send('window-hide'),
  show: () => ipcRenderer.send('window-show'),
  quit: () => ipcRenderer.send('window-quit'),

  // ── Opacity ────────────────────────────────────────────────────────────
  setOpacity: (value) => ipcRenderer.send('set-opacity', Math.min(1, Math.max(0.1, value))),

  // ── Audio ──────────────────────────────────────────────────────────────
  setAudioMuted: (muted) => ipcRenderer.send('set-audio-muted', !!muted),

  // ── Click-through ──────────────────────────────────────────────────────
  toggleClickThrough: () => ipcRenderer.send('toggle-click-through'),
  getClickThrough: () => ipcRenderer.invoke('get-click-through'),

  // ── Panic key ─────────────────────────────────────────────────────────
  panic: () => ipcRenderer.send('panic-key'),

  // ── Events from main → renderer ───────────────────────────────────────
  /**
   * @param {'set-mute'|'click-through-changed'|'panic-navigate'} channel
   * @param {Function} callback
   * @returns {Function} unsubscribe
   */
  on: (channel, callback) => {
    const ALLOWED = ['set-mute', 'click-through-changed', 'panic-navigate'];
    if (!ALLOWED.includes(channel)) {
      console.warn(`[preload] Blocked unknown channel: ${channel}`);
      return () => {};
    }
    const handler = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, handler);
    // Return unsubscribe function
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
