'use strict';
/**
 * renderer.js — Eli6Overlay renderer process
 *
 * Responsibilities:
 *   - Multi-tab management (create / switch / close browser tabs)
 *   - URL bar + navigation controls
 *   - Settings panel (opacity, click-through, auto-mute, hide-on-blank)
 *   - Keyboard shortcut handling (Escape panic key)
 *   - Scratchpad tab with localStorage persistence
 *   - Language switching via i18n.js
 *   - IPC bridge calls via window.eli6
 */

// ─── Constants ────────────────────────────────────────────────────────────────
const HOME_URL = 'https://google.com';
const BLANK    = 'about:blank';
const CHATGPT  = 'https://chatgpt.com';
const GOOGLE   = 'https://google.com';
const WIKI     = 'https://en.wikipedia.org';

// ─── State ────────────────────────────────────────────────────────────────────
let tabCounter    = 0;          // auto-increment id
let activeTabId   = null;
let isMuted       = false;
let autoMute      = true;
let hideOnBlank   = true;
let tabs          = {};         // { id: { id, title, url, webview, tabEl, isScratchpad } }

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const tabsList       = document.getElementById('tabs-list');
const webviewCont    = document.getElementById('webview-container');
const scratchpadPnl  = document.getElementById('scratchpad-panel');
const scratchpadTxt  = document.getElementById('scratchpad-text');
const scratchpadStat = document.getElementById('scratchpad-status');
const settingsPnl    = document.getElementById('settings-panel');
const urlBar         = document.getElementById('url-bar');
const statusMsg      = document.getElementById('status-msg');
const ctIndicator    = document.getElementById('click-through-indicator');
const opacitySlider  = document.getElementById('opacity-slider');
const opacityVal     = document.getElementById('opacity-val');
const btnClickThru   = document.getElementById('btn-click-through');
const chkAutoMute    = document.getElementById('chk-auto-mute');
const chkHideBlank   = document.getElementById('chk-hide-on-blank');
const btnMute        = document.getElementById('btn-mute');

// ─── Status helper ────────────────────────────────────────────────────────────
function setStatus(msg, durationMs = 3000) {
  statusMsg.textContent = msg;
  if (durationMs > 0) {
    clearTimeout(setStatus._t);
    setStatus._t = setTimeout(() => { statusMsg.textContent = ''; }, durationMs);
  }
}

// ─── Tab management ───────────────────────────────────────────────────────────
function createTab(url = HOME_URL, isScratchpad = false) {
  const id = ++tabCounter;
  const title = isScratchpad ? (i18n.t('scratchpad') || 'Scratchpad') : (url === BLANK ? 'New Tab' : extractDomain(url));

  // ── Tab element
  const tabEl = document.createElement('div');
  tabEl.className = 'tab' + (isScratchpad ? ' scratchpad-tab' : '');
  tabEl.dataset.tabId = id;
  tabEl.innerHTML = `
    <span class="tab-title">${escHtml(title)}</span>
    <button class="tab-close" data-tab-id="${id}" title="Close">✕</button>
  `;
  tabEl.addEventListener('click', (e) => {
    if (!e.target.classList.contains('tab-close')) switchTab(id);
  });
  tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(id);
  });
  tabsList.appendChild(tabEl);

  if (isScratchpad) {
    // No webview for scratchpad
    tabs[id] = { id, title, url: 'scratchpad', webview: null, tabEl, isScratchpad: true };
  } else {
    // ── Webview element
    const wv = document.createElement('webview');
    wv.setAttribute('src', url);
    wv.setAttribute('allowpopups', '');
    wv.setAttribute('autosize', 'on');
    wv.style.display = 'none';

    wv.addEventListener('page-title-updated', (e) => {
      updateTabTitle(id, e.title);
    });
    wv.addEventListener('did-navigate', (e) => {
      if (activeTabId === id) urlBar.value = e.url;
    });
    wv.addEventListener('did-navigate-in-page', (e) => {
      if (activeTabId === id) urlBar.value = e.url;
    });
    wv.addEventListener('dom-ready', () => {
      if (isMuted) wv.setAudioMuted(true);
    });

    webviewCont.appendChild(wv);
    tabs[id] = { id, title, url, webview: wv, tabEl, isScratchpad: false };
  }

  switchTab(id);
  return id;
}

function switchTab(id) {
  const tab = tabs[id];
  if (!tab) return;

  // Deactivate all
  Object.values(tabs).forEach((t) => {
    t.tabEl.classList.remove('active');
    if (t.webview) {
      t.webview.classList.remove('active-view');
      t.webview.style.display = 'none';
    }
  });
  scratchpadPnl.classList.add('hidden');

  // Activate selected
  tab.tabEl.classList.add('active');
  activeTabId = id;

  if (tab.isScratchpad) {
    scratchpadPnl.classList.remove('hidden');
    urlBar.value = '';
  } else {
    if (tab.webview) {
      tab.webview.style.display = 'flex';
      tab.webview.classList.add('active-view');
      urlBar.value = tab.webview.src || tab.url;
    }
  }
}

function closeTab(id) {
  const tab = tabs[id];
  if (!tab) return;

  // Remove DOM elements
  tab.tabEl.remove();
  if (tab.webview) {
    tab.webview.src = BLANK;  // stop any loading
    tab.webview.remove();
  }
  delete tabs[id];

  const remaining = Object.keys(tabs);
  if (remaining.length === 0) {
    // No tabs left — hide the overlay
    window.eli6.hide();
  } else {
    // Switch to last tab
    switchTab(Number(remaining[remaining.length - 1]));
  }
}

function updateTabTitle(id, title) {
  const tab = tabs[id];
  if (!tab) return;
  tab.title = title;
  const span = tab.tabEl.querySelector('.tab-title');
  if (span) span.textContent = truncate(title, 22);
}

function getActiveWebview() {
  const tab = activeTabId ? tabs[activeTabId] : null;
  return tab?.webview || null;
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function navigate(url) {
  // Smart URL / search detection
  if (!url.startsWith('http') && !url.startsWith('about:') && !url.includes('://')) {
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(url)) {
      url = 'https://' + url;
    } else {
      url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    }
  }
  const wv = getActiveWebview();
  if (!wv) {
    createTab(url);
    return;
  }
  wv.src = url;
  urlBar.value = url;
}

// ─── URL bar ──────────────────────────────────────────────────────────────────
urlBar.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    navigate(urlBar.value.trim());
    urlBar.blur();
  }
  if (e.key === 'Escape') {
    urlBar.blur();
    e.stopPropagation();
  }
});

// Allow selecting text in URL bar (no hide-on-blank conflict)
urlBar.addEventListener('click', (e) => e.stopPropagation());
urlBar.addEventListener('focus', () => urlBar.select());

// ─── Nav buttons ──────────────────────────────────────────────────────────────
document.getElementById('btn-back').addEventListener('click', () => {
  getActiveWebview()?.goBack();
});
document.getElementById('btn-forward').addEventListener('click', () => {
  getActiveWebview()?.goForward();
});
document.getElementById('btn-refresh').addEventListener('click', () => {
  getActiveWebview()?.reload();
});
document.getElementById('btn-home').addEventListener('click', () => {
  navigate(HOME_URL);
});

// New tab
document.getElementById('btn-new-tab').addEventListener('click', () => {
  createTab(HOME_URL);
});

// Bookmarks
document.querySelectorAll('.bm-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigate(btn.dataset.url);
  });
});

// ─── Mute button ──────────────────────────────────────────────────────────────
function updateMuteButton() {
  btnMute.textContent = isMuted ? '🔇' : '🔊';
  btnMute.title = isMuted ? i18n.t('unmuteBtn') : i18n.t('muteBtn');
}

btnMute.addEventListener('click', (e) => {
  e.stopPropagation();
  isMuted = !isMuted;
  applyMuteToAll(isMuted);
  window.eli6.setAudioMuted(isMuted);
  updateMuteButton();
});

function applyMuteToAll(mute) {
  Object.values(tabs).forEach((t) => {
    if (t.webview) {
      try { t.webview.setAudioMuted(mute); } catch (_) {}
    }
  });
}

// ─── Settings panel ───────────────────────────────────────────────────────────
document.getElementById('btn-settings').addEventListener('click', (e) => {
  e.stopPropagation();
  settingsPnl.classList.toggle('hidden');
});
document.getElementById('settings-close').addEventListener('click', (e) => {
  e.stopPropagation();
  settingsPnl.classList.add('hidden');
});

// Opacity slider
opacitySlider.addEventListener('input', () => {
  const pct = parseInt(opacitySlider.value, 10);
  opacityVal.textContent = pct + '%';
  window.eli6.setOpacity(pct / 100);
  try { localStorage.setItem('eli6_opacity', pct); } catch (_) {}
});

// Click-through toggle
btnClickThru.addEventListener('click', (e) => {
  e.stopPropagation();
  window.eli6.toggleClickThrough();
});

// Auto-mute checkbox
chkAutoMute.addEventListener('change', () => {
  autoMute = chkAutoMute.checked;
  try { localStorage.setItem('eli6_automute', autoMute); } catch (_) {}
});

// Hide-on-blank checkbox
chkHideBlank.addEventListener('change', () => {
  hideOnBlank = chkHideBlank.checked;
  try { localStorage.setItem('eli6_hideonblank', hideOnBlank); } catch (_) {}
});

// ─── Hide on blank (background) click ────────────────────────────────────────
document.getElementById('webview-container').addEventListener('click', (e) => {
  if (e.target === webviewCont && hideOnBlank) {
    window.eli6.hide();
  }
});

// Also intercept direct body clicks in empty space
document.body.addEventListener('click', (e) => {
  const interactable = [
    '#titlebar', '#tab-bar', '#nav-bar', '#settings-panel',
    '#scratchpad-panel', '#status-bar',
  ].some((sel) => e.target.closest(sel));
  if (!interactable && hideOnBlank && e.target === document.body) {
    window.eli6.hide();
  }
});

// ─── Language switcher ────────────────────────────────────────────────────────
function setLang(lang) {
  i18n.set(lang);
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  document.getElementById('btn-it').classList.toggle('active', lang === 'it');
  // Update scratchpad tab title if present
  Object.values(tabs).forEach((t) => {
    if (t.isScratchpad) updateTabTitle(t.id, i18n.t('scratchpad'));
  });
}

document.getElementById('btn-en').addEventListener('click', (e) => {
  e.stopPropagation();
  setLang('en');
});
document.getElementById('btn-it').addEventListener('click', (e) => {
  e.stopPropagation();
  setLang('it');
});

// ─── Scratchpad persistence ───────────────────────────────────────────────────
let scratchSaveTimer = null;
const SCRATCH_KEY = 'eli6_scratchpad';

function loadScratchpad() {
  try {
    scratchpadTxt.value = localStorage.getItem(SCRATCH_KEY) || '';
  } catch (_) {}
}

scratchpadTxt.addEventListener('input', () => {
  clearTimeout(scratchSaveTimer);
  scratchSaveTimer = setTimeout(() => {
    try {
      localStorage.setItem(SCRATCH_KEY, scratchpadTxt.value);
      scratchpadStat.textContent = i18n.t('scratchpadSave');
      setTimeout(() => { scratchpadStat.textContent = ''; }, 2000);
    } catch (_) {}
  }, 600);
});

// Prevent scratchpad keypresses from triggering overlay shortcuts
scratchpadTxt.addEventListener('keydown', (e) => {
  e.stopPropagation();
});

// ─── Keyboard shortcuts (renderer-side) ──────────────────────────────────────
document.addEventListener('keydown', (e) => {
  // Escape = Panic Hide
  if (e.key === 'Escape' && document.activeElement !== scratchpadTxt) {
    e.preventDefault();
    panicHide();
    return;
  }

  // F5 = Refresh active tab
  if (e.key === 'F5') {
    e.preventDefault();
    getActiveWebview()?.reload();
    return;
  }

  // Alt+Left / Alt+Right = Back / Forward
  if (e.altKey && e.key === 'ArrowLeft') {
    e.preventDefault();
    getActiveWebview()?.goBack();
    return;
  }
  if (e.altKey && e.key === 'ArrowRight') {
    e.preventDefault();
    getActiveWebview()?.goForward();
    return;
  }

  // Ctrl+T = New tab
  if (e.ctrlKey && e.key === 't') {
    e.preventDefault();
    createTab(HOME_URL);
    return;
  }

  // Ctrl+W = Close current tab
  if (e.ctrlKey && e.key === 'w') {
    e.preventDefault();
    if (activeTabId) closeTab(activeTabId);
    return;
  }

  // Ctrl+L = Focus URL bar
  if (e.ctrlKey && e.key === 'l') {
    e.preventDefault();
    urlBar.focus();
    return;
  }

  // Ctrl+1..9 = Switch tab by index
  if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
    e.preventDefault();
    const idx = parseInt(e.key, 10) - 1;
    const ids = Object.keys(tabs);
    if (ids[idx]) switchTab(Number(ids[idx]));
    return;
  }
});

// ─── Panic hide ───────────────────────────────────────────────────────────────
function panicHide() {
  // Navigate all webview tabs to about:blank
  Object.values(tabs).forEach((t) => {
    if (t.webview && !t.isScratchpad) {
      try { t.webview.src = BLANK; } catch (_) {}
    }
  });
  applyMuteToAll(true);
  setStatus(i18n.t('panicMsg'), 0);
  window.eli6.panic();
}

// ─── IPC events from main process ────────────────────────────────────────────
window.eli6.on('set-mute', (muted) => {
  if (autoMute) {
    applyMuteToAll(muted);
    if (muted !== isMuted) {
      isMuted = muted;
      updateMuteButton();
    }
  }
});

window.eli6.on('click-through-changed', (enabled) => {
  btnClickThru.dataset.state = enabled ? 'on' : 'off';
  btnClickThru.textContent = i18n.t(enabled ? 'clickThroughOn' : 'clickThroughOff');
  ctIndicator.classList.toggle('hidden', !enabled);
  setStatus(enabled ? '● Click-through ON' : '○ Click-through OFF');
});

window.eli6.on('panic-navigate', () => {
  Object.values(tabs).forEach((t) => {
    if (t.webview) {
      try { t.webview.src = BLANK; } catch (_) {}
    }
  });
});

// ─── Title bar buttons ────────────────────────────────────────────────────────
document.getElementById('btn-minimize').addEventListener('click', (e) => {
  e.stopPropagation();
  window.eli6.hide();
});
document.getElementById('btn-close').addEventListener('click', (e) => {
  e.stopPropagation();
  window.eli6.hide();
});

// ─── Restore settings from localStorage ──────────────────────────────────────
function restoreSettings() {
  try {
    const lang = localStorage.getItem('eli6_lang') || 'en';
    setLang(lang);

    const opacity = parseInt(localStorage.getItem('eli6_opacity') || '90', 10);
    opacitySlider.value = opacity;
    opacityVal.textContent = opacity + '%';
    window.eli6.setOpacity(opacity / 100);

    const storedAutoMute = localStorage.getItem('eli6_automute');
    if (storedAutoMute !== null) {
      autoMute = storedAutoMute === 'true';
      chkAutoMute.checked = autoMute;
    }

    const storedHideBlank = localStorage.getItem('eli6_hideonblank');
    if (storedHideBlank !== null) {
      hideOnBlank = storedHideBlank === 'true';
      chkHideBlank.checked = hideOnBlank;
    }
  } catch (_) {}
}

// ─── Utility helpers ─────────────────────────────────────────────────────────
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch (_) {
    return url.slice(0, 20);
  }
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
(function init() {
  restoreSettings();
  loadScratchpad();

  // Open default tab + scratchpad
  createTab(HOME_URL);
  createScratchpadTab();

  // Switch to first (browser) tab
  const ids = Object.keys(tabs);
  if (ids.length > 0) switchTab(Number(ids[0]));

  setStatus('Eli6Overlay ready — Win+G to hide');
})();

function createScratchpadTab() {
  const id = ++tabCounter;
  const title = i18n.t('scratchpad') || 'Scratchpad';

  const tabEl = document.createElement('div');
  tabEl.className = 'tab scratchpad-tab';
  tabEl.dataset.tabId = id;
  tabEl.innerHTML = `<span class="tab-title">${escHtml(title)}</span>`;
  tabEl.addEventListener('click', () => switchTab(id));
  tabsList.appendChild(tabEl);

  tabs[id] = { id, title, url: 'scratchpad', webview: null, tabEl, isScratchpad: true };
}
