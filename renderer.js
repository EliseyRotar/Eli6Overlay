'use strict';
/**
 * renderer.js — Eli6Overlay
 * Full feature set: tabs, browser, tint, zoom, bookmarks, auto-hide,
 * lock, pop-out, position, resize, screenshot, autostart, language
 */

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_HOME = 'https://google.com';
const BLANK        = 'about:blank';
const LS           = { PREFIX: 'eli6_' };
function lsGet(k, def) { try { const v = localStorage.getItem(LS.PREFIX + k); return v !== null ? v : def; } catch { return def; } }
function lsSet(k, v)   { try { localStorage.setItem(LS.PREFIX + k, v); } catch {} }

// ── State ─────────────────────────────────────────────────────────────────────
let tabCtr    = 0;
let activeId  = null;
let tabs      = {};
let isMuted   = false;
let autoMute  = true;
let hideBlank = true;
let homeURL   = lsGet('homepage', DEFAULT_HOME);
let customBMs = JSON.parse(lsGet('bookmarks', '[]'));

// ── DOM ───────────────────────────────────────────────────────────────────────
const $  = (id) => document.getElementById(id);
const tabsList       = $('tabs-list');
const webviewCont    = $('webview-container');
const scratchPnl     = $('scratchpad-panel');
const scratchTxt     = $('scratchpad-text');
const scratchStat    = $('scratchpad-status');
const settingsPnl    = $('settings-panel');
const urlBar         = $('url-bar');
const statusMsg      = $('status-msg');
const btnMute        = $('btn-mute');
const iconMuteOn     = $('icon-mute-on');
const iconMuteOff    = $('icon-mute-off');

// ── Status ────────────────────────────────────────────────────────────────────
let statusTimer = null;
function setStatus(msg, ms = 3000) {
  statusMsg.textContent = msg;
  clearTimeout(statusTimer);
  if (ms > 0) statusTimer = setTimeout(() => { statusMsg.textContent = ''; }, ms);
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
function createTab(url = homeURL, isScratch = false) {
  const id = ++tabCtr;
  const label = isScratch ? i18n.t('scratchpad') : extractDomain(url);

  const tabEl = document.createElement('div');
  tabEl.className = 'tab' + (isScratch ? ' scratchpad-tab' : '');
  tabEl.dataset.tabId = String(id);
  tabEl.innerHTML = `<span class="tab-title">${esc(label)}</span>
    ${isScratch ? '' : `<button class="tab-x" data-id="${id}">&#10005;</button>`}`;
  tabEl.addEventListener('click', (e) => {
    if (!e.target.classList.contains('tab-x')) switchTab(id);
  });
  const xBtn = tabEl.querySelector('.tab-x');
  if (xBtn) xBtn.addEventListener('click', (e) => { e.stopPropagation(); closeTab(id); });
  tabsList.appendChild(tabEl);

  if (isScratch) {
    tabs[id] = { id, tabEl, webview: null, isScratch: true };
  } else {
    const wv = document.createElement('webview');
    wv.setAttribute('src', url);
    wv.setAttribute('allowpopups', '');
    wv.style.display = 'none';
    wv.addEventListener('page-title-updated', (e) => updateTabTitle(id, e.title));
    wv.addEventListener('did-navigate',         (e) => { if (activeId === id) urlBar.value = e.url; });
    wv.addEventListener('did-navigate-in-page', (e) => { if (activeId === id) urlBar.value = e.url; });
    wv.addEventListener('dom-ready', () => { if (isMuted) wv.setAudioMuted(true); });
    webviewCont.appendChild(wv);
    tabs[id] = { id, tabEl, webview: wv, isScratch: false };
  }

  switchTab(id);
  return id;
}

function switchTab(id) {
  const tab = tabs[id];
  if (!tab) return;
  Object.values(tabs).forEach((t) => {
    t.tabEl.classList.remove('active');
    if (t.webview) { t.webview.style.display = 'none'; t.webview.classList.remove('active-view'); }
  });
  scratchPnl.classList.add('hidden');
  tab.tabEl.classList.add('active');
  activeId = id;
  if (tab.isScratch) {
    scratchPnl.classList.remove('hidden');
    urlBar.value = '';
  } else if (tab.webview) {
    tab.webview.style.display = 'flex';
    tab.webview.classList.add('active-view');
    urlBar.value = tab.webview.src || '';
  }
}

function closeTab(id) {
  const tab = tabs[id];
  if (!tab) return;
  tab.tabEl.remove();
  if (tab.webview) { try { tab.webview.src = BLANK; } catch {} tab.webview.remove(); }
  delete tabs[id];
  const remaining = Object.keys(tabs);
  if (!remaining.length) { window.eli6.hide(); }
  else { switchTab(Number(remaining[remaining.length - 1])); }
}

function updateTabTitle(id, title) {
  const tab = tabs[id];
  if (!tab) return;
  const span = tab.tabEl.querySelector('.tab-title');
  if (span) span.textContent = trunc(title, 20);
}

function activeWebview() {
  return activeId && tabs[activeId]?.webview || null;
}

// ── Navigation ────────────────────────────────────────────────────────────────
function navigate(raw) {
  let url = raw.trim();
  if (!url) return;
  if (url.startsWith('about:') || url.includes('://')) { /* ok */ }
  else if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(url)) { url = 'https://' + url; }
  else { url = `https://www.google.com/search?q=${encodeURIComponent(url)}`; }
  const wv = activeWebview();
  if (wv) { wv.src = url; urlBar.value = url; }
  else createTab(url);
}

// ── URL bar ───────────────────────────────────────────────────────────────────
urlBar.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { navigate(urlBar.value); urlBar.blur(); }
  if (e.key === 'Escape') { urlBar.blur(); e.stopPropagation(); }
});
urlBar.addEventListener('click',  (e) => e.stopPropagation());
urlBar.addEventListener('focus',  () => urlBar.select());

// ── Nav buttons ───────────────────────────────────────────────────────────────
$('btn-back').onclick    = () => activeWebview()?.goBack();
$('btn-forward').onclick = () => activeWebview()?.goForward();
$('btn-refresh').onclick = () => activeWebview()?.reload();
$('btn-home').onclick    = () => navigate(homeURL);
$('btn-new-tab').onclick = () => createTab(homeURL);

// ── Mute ──────────────────────────────────────────────────────────────────────
function updateMuteUI() {
  if (iconMuteOn)  iconMuteOn.style.display  = isMuted ? 'none' : '';
  if (iconMuteOff) iconMuteOff.style.display = isMuted ? ''     : 'none';
  btnMute.title = isMuted ? 'Unmute' : 'Mute';
}
function muteAll(m) {
  isMuted = m;
  Object.values(tabs).forEach((t) => { try { t.webview?.setAudioMuted(m); } catch {} });
  window.eli6.setAudioMuted(m);
  updateMuteUI();
}
btnMute.onclick = (e) => { e.stopPropagation(); muteAll(!isMuted); };

// ── Default bookmarks (nav bar) ───────────────────────────────────────────────
document.querySelectorAll('.bm-btn').forEach((b) => {
  b.addEventListener('click', (e) => { e.stopPropagation(); navigate(b.dataset.url); });
});

// ── Settings panel ────────────────────────────────────────────────────────────
$('btn-settings').onclick  = (e) => { e.stopPropagation(); settingsPnl.classList.toggle('hidden'); };
$('settings-close').onclick = (e) => { e.stopPropagation(); settingsPnl.classList.add('hidden'); };

// ── Opacity ───────────────────────────────────────────────────────────────────
const opSlider = $('opacity-slider');
const opVal    = $('opacity-val');
opSlider.addEventListener('input', () => {
  const pct = parseInt(opSlider.value);
  opVal.textContent = pct + '%';
  window.eli6.setOpacity(pct / 100);
  lsSet('opacity', pct);
});

// ── Tint ──────────────────────────────────────────────────────────────────────
const tintSlider   = $('tint-slider');
const tintVal      = $('tint-val');
const tintEnabled  = $('tint-enabled');

function applyTint() {
  const enabled = tintEnabled.checked;
  const pct = parseInt(tintSlider.value);
  tintVal.textContent = pct + '%';
  window.eli6.setTint(enabled ? pct / 100 : 0);
  lsSet('tint', pct);
  lsSet('tintEnabled', enabled);
}
tintSlider.addEventListener('input',  applyTint);
tintEnabled.addEventListener('change', applyTint);

// ── Zoom ──────────────────────────────────────────────────────────────────────
const zoomSlider = $('zoom-slider');
const zoomVal    = $('zoom-val');
zoomSlider.addEventListener('input', () => {
  const pct = parseInt(zoomSlider.value);
  zoomVal.textContent = pct + '%';
  window.eli6.setZoom(pct / 100);
  lsSet('zoom', pct);
});

// ── Click-through ─────────────────────────────────────────────────────────────
const btnCT = $('btn-click-through');
btnCT.onclick = (e) => { e.stopPropagation(); window.eli6.toggleClickThrough(); };

// ── Pop-out ───────────────────────────────────────────────────────────────────
const btnPO = $('btn-popout');
btnPO.onclick = (e) => { e.stopPropagation(); window.eli6.togglePopOut(); };

// ── Auto-mute / hide-blank ────────────────────────────────────────────────────
const chkAutoMute = $('chk-auto-mute');
const chkHideBlank = $('chk-hide-blank');
chkAutoMute.onchange  = () => { autoMute = chkAutoMute.checked; lsSet('automute', autoMute); };
chkHideBlank.onchange = () => { hideBlank = chkHideBlank.checked; lsSet('hideblank', hideBlank); };

// ── Homepage ──────────────────────────────────────────────────────────────────
const homeInput = $('homepage-input');
homeInput.value = homeURL;
homeInput.addEventListener('change', () => {
  const v = homeInput.value.trim();
  if (v) { homeURL = v.startsWith('http') ? v : 'https://' + v; lsSet('homepage', homeURL); }
});
homeInput.addEventListener('click', (e) => e.stopPropagation());
homeInput.addEventListener('keydown', (e) => e.stopPropagation());

// ── Custom bookmarks ──────────────────────────────────────────────────────────
function renderCustomBookmarks() {
  const list = $('bookmarks-custom-list');
  list.innerHTML = '';
  customBMs.forEach((bm, i) => {
    const item = document.createElement('div');
    item.className = 'bm-custom-item';
    item.innerHTML = `<span title="${esc(bm.url)}">${esc(bm.name)}</span>
      <button class="bm-del" data-i="${i}">&#10005;</button>`;
    item.querySelector('.bm-del').onclick = () => {
      customBMs.splice(i, 1);
      lsSet('bookmarks', JSON.stringify(customBMs));
      renderCustomBookmarks();
      renderNavBookmarks();
    };
    list.appendChild(item);
  });
}

function renderNavBookmarks() {
  // Sync custom bookmarks to the nav bar (after the defaults)
  document.querySelectorAll('.bm-btn.custom').forEach((b) => b.remove());
  const bar = $('bookmarks-bar');
  customBMs.forEach((bm) => {
    const btn = document.createElement('button');
    btn.className = 'bm-btn custom';
    btn.textContent = trunc(bm.name, 8);
    btn.title = bm.url;
    btn.dataset.url = bm.url;
    btn.onclick = (e) => { e.stopPropagation(); navigate(bm.url); };
    bar.appendChild(btn);
  });
}

$('btn-bm-add').onclick = (e) => {
  e.stopPropagation();
  const name = $('bm-name-input').value.trim();
  const url  = $('bm-url-input').value.trim();
  if (!name || !url) return;
  customBMs.push({ name, url: url.startsWith('http') ? url : 'https://' + url });
  lsSet('bookmarks', JSON.stringify(customBMs));
  $('bm-name-input').value = '';
  $('bm-url-input').value  = '';
  renderCustomBookmarks();
  renderNavBookmarks();
};
$('bm-name-input').addEventListener('click', (e) => e.stopPropagation());
$('bm-name-input').addEventListener('keydown', (e) => e.stopPropagation());
$('bm-url-input').addEventListener('click', (e) => e.stopPropagation());
$('bm-url-input').addEventListener('keydown', (e) => e.stopPropagation());

// ── Position presets ──────────────────────────────────────────────────────────
document.querySelectorAll('.pos-btn').forEach((b) => {
  b.onclick = (e) => { e.stopPropagation(); window.eli6.snapPosition(b.dataset.pos); };
});

// ── Auto-hide ─────────────────────────────────────────────────────────────────
$('auto-hide-sel').onchange = function() {
  window.eli6.setAutoHide(parseInt(this.value));
  lsSet('autohide', this.value);
};

// ── Lock ──────────────────────────────────────────────────────────────────────
const chkLock  = $('chk-lock');
const pinInput = $('pin-input');
const pinRow   = $('pin-row');

chkLock.onchange = () => {
  pinRow.style.display = chkLock.checked ? '' : 'none';
  if (!chkLock.checked) window.eli6.setLock(false, '');
  else if (pinInput.value) window.eli6.setLock(true, pinInput.value);
  $('lock-badge').classList.toggle('hidden', !chkLock.checked);
};
pinInput.addEventListener('input', () => {
  if (chkLock.checked) window.eli6.setLock(true, pinInput.value);
});
pinInput.addEventListener('click',   (e) => e.stopPropagation());
pinInput.addEventListener('keydown', (e) => e.stopPropagation());

// Lock prompt (shown by main when lock is active)
window.eli6.on('show-lock-prompt', () => showLockPrompt());

function showLockPrompt() {
  $('lock-prompt').classList.remove('hidden');
  $('lock-pin-input').value = '';
  $('lock-error').classList.add('hidden');
  $('lock-pin-input').focus();
}
function hideLockPrompt() { $('lock-prompt').classList.add('hidden'); }

$('btn-lock-cancel').onclick = (e) => { e.stopPropagation(); hideLockPrompt(); window.eli6.hide(); };
$('btn-lock-ok').onclick = (e) => { e.stopPropagation(); checkPin(); };
$('lock-pin-input').addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Enter') checkPin();
});
$('lock-pin-input').addEventListener('click', (e) => e.stopPropagation());

function checkPin() {
  const entered = $('lock-pin-input').value;
  if (entered === pinInput.value) {
    hideLockPrompt();
    window.eli6.lockVerified();
  } else {
    $('lock-error').classList.remove('hidden');
    $('lock-pin-input').value = '';
    $('lock-pin-input').focus();
  }
}

// ── Autostart ────────────────────────────────────────────────────────────────
const chkAutostart = $('chk-autostart');
window.eli6.getAutostart().then((v) => { chkAutostart.checked = !!v; });
chkAutostart.onchange = () => { window.eli6.setAutostart(chkAutostart.checked); };
window.eli6.on('autostart-changed', (v) => { chkAutostart.checked = !!v; });

// ── Screenshot ────────────────────────────────────────────────────────────────
$('btn-screenshot').onclick = async (e) => {
  e.stopPropagation();
  const path = await window.eli6.screenshot();
  if (path) setStatus('Screenshot saved: ' + path);
  else setStatus('Screenshot cancelled.');
};

// ── Language ──────────────────────────────────────────────────────────────────
function applyLang(lang) {
  i18n.set(lang);
  ['btn-en','btn-it'].forEach((id) => {
    $(id).classList.toggle('active', id.endsWith(lang));
  });
  ['s-btn-en','s-btn-it'].forEach((id) => {
    $(id).classList.toggle('active', id.endsWith(lang));
  });
  // Update scratchpad tab label if it exists
  Object.values(tabs).filter((t) => t.isScratch).forEach((t) => {
    const s = t.tabEl.querySelector('.tab-title');
    if (s) s.textContent = i18n.t('scratchpad');
  });
  lsSet('lang', lang);
}

$('btn-en').onclick   = (e) => { e.stopPropagation(); applyLang('en'); };
$('btn-it').onclick   = (e) => { e.stopPropagation(); applyLang('it'); };
$('s-btn-en').onclick = (e) => { e.stopPropagation(); applyLang('en'); };
$('s-btn-it').onclick = (e) => { e.stopPropagation(); applyLang('it'); };

// ── IPC events from main ──────────────────────────────────────────────────────
window.eli6.on('set-mute', (m) => {
  if (autoMute) { Object.values(tabs).forEach((t) => { try { t.webview?.setAudioMuted(m); } catch {} }); isMuted = m; updateMuteUI(); }
});

window.eli6.on('click-through-changed', (on) => {
  btnCT.dataset.on = String(on);
  btnCT.textContent = on ? 'On' : 'Off';
  $('ct-badge').classList.toggle('hidden', !on);
  setStatus(on ? '● Click-through ON' : '○ Click-through OFF');
});

window.eli6.on('popout-changed', (on) => {
  btnPO.dataset.on = String(on);
  btnPO.textContent = on ? 'On' : 'Off';
  $('po-badge').classList.toggle('hidden', !on);
  setStatus(on ? 'Pop-out mode ON' : 'Pop-out mode OFF');
});

window.eli6.on('panic-navigate', () => {
  Object.values(tabs).forEach((t) => { if (t.webview) try { t.webview.src = BLANK; } catch {} });
});

// ── Hide on blur/blank click ──────────────────────────────────────────────────
webviewCont.addEventListener('click', (e) => {
  if (e.target === webviewCont && hideBlank) window.eli6.hide();
});
document.body.addEventListener('click', (e) => {
  const inside = ['#titlebar','#nav-bar','#content-area','#status-bar']
    .some((s) => e.target.closest(s));
  if (!inside && hideBlank && e.target === document.body) window.eli6.hide();
});

// ── Window controls ───────────────────────────────────────────────────────────
$('btn-minimize').onclick = (e) => { e.stopPropagation(); window.eli6.hide(); };
$('btn-close').onclick    = (e) => { e.stopPropagation(); window.eli6.hide(); };

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (document.activeElement === scratchTxt) return;
  if (document.activeElement?.tagName === 'INPUT') return;

  if (e.key === 'Escape')           { e.preventDefault(); panic(); return; }
  if (e.key === 'F5')               { e.preventDefault(); activeWebview()?.reload(); return; }
  if (e.altKey && e.key === 'ArrowLeft')  { e.preventDefault(); activeWebview()?.goBack(); return; }
  if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); activeWebview()?.goForward(); return; }
  if (e.ctrlKey && e.key === 't')   { e.preventDefault(); createTab(homeURL); return; }
  if (e.ctrlKey && e.key === 'w')   { e.preventDefault(); if (activeId) closeTab(activeId); return; }
  if (e.ctrlKey && e.key === 'l')   { e.preventDefault(); urlBar.focus(); return; }
  if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
    e.preventDefault();
    const ids = Object.keys(tabs);
    const idx = parseInt(e.key) - 1;
    if (ids[idx]) switchTab(Number(ids[idx]));
    return;
  }
});

scratchTxt.addEventListener('keydown', (e) => e.stopPropagation());

// ── Panic ─────────────────────────────────────────────────────────────────────
function panic() {
  Object.values(tabs).forEach((t) => { if (t.webview) try { t.webview.src = BLANK; } catch {} });
  muteAll(true);
  window.eli6.panic();
}

// ── Scratchpad ────────────────────────────────────────────────────────────────
scratchTxt.value = lsGet('scratchpad', '');
let scratchTimer = null;
scratchTxt.addEventListener('input', () => {
  clearTimeout(scratchTimer);
  scratchTimer = setTimeout(() => {
    lsSet('scratchpad', scratchTxt.value);
    scratchStat.textContent = 'Saved';
    setTimeout(() => { scratchStat.textContent = ''; }, 1500);
  }, 600);
});

// ── Resize handles ────────────────────────────────────────────────────────────
(function initResize() {
  document.querySelectorAll('.rh').forEach((handle) => {
    const dir = handle.dataset.dir;
    handle.addEventListener('mousedown', (startEvent) => {
      startEvent.preventDefault();
      startEvent.stopPropagation();
      // Use CSS cursor: handled. Native resize via electron isn't possible
      // on transparent windows without a custom implementation.
      // We use a mouse-delta approach via ipcMain dragability.
      // For now the handles show resize cursor as a UX cue.
      // Full native resize requires electron's startResizing API or
      // win.setBounds() called from main — left for future implementation.
    });
  });
})();

// ── Restore settings from localStorage ───────────────────────────────────────
function restoreSettings() {
  const lang = lsGet('lang', 'en');
  applyLang(lang);

  const opacity = parseInt(lsGet('opacity', '100'));
  opSlider.value = opacity;
  opVal.textContent = opacity + '%';
  window.eli6.setOpacity(opacity / 100);

  const tint = parseInt(lsGet('tint', '20'));
  const tintOn = lsGet('tintEnabled', 'true') === 'true';
  tintSlider.value = tint;
  tintVal.textContent = tint + '%';
  tintEnabled.checked = tintOn;
  window.eli6.setTint(tintOn ? tint / 100 : 0);

  const zoom = parseInt(lsGet('zoom', '100'));
  zoomSlider.value = zoom;
  zoomVal.textContent = zoom + '%';
  window.eli6.setZoom(zoom / 100);

  const am = lsGet('automute', 'true') === 'true';
  autoMute = am;
  chkAutoMute.checked = am;

  const hb = lsGet('hideblank', 'true') === 'true';
  hideBlank = hb;
  chkHideBlank.checked = hb;

  homeInput.value = homeURL;

  const ahVal = lsGet('autohide', '0');
  $('auto-hide-sel').value = ahVal;
  window.eli6.setAutoHide(parseInt(ahVal));
}

// ── Init ──────────────────────────────────────────────────────────────────────
(function init() {
  restoreSettings();
  renderCustomBookmarks();
  renderNavBookmarks();
  createTab(homeURL);
  createScratchTab();
  const ids = Object.keys(tabs);
  if (ids.length) switchTab(Number(ids[0]));
  setStatus('eli6overlay ready — Win+G to hide');
})();

function createScratchTab() {
  const id = ++tabCtr;
  const title = i18n.t('scratchpad') || 'Scratchpad';
  const tabEl = document.createElement('div');
  tabEl.className = 'tab scratchpad-tab';
  tabEl.dataset.tabId = String(id);
  tabEl.innerHTML = `<span class="tab-title">${esc(title)}</span>`;
  tabEl.onclick = () => switchTab(id);
  tabsList.appendChild(tabEl);
  tabs[id] = { id, tabEl, webview: null, isScratch: true };
}

// ── Update banner ─────────────────────────────────────────────────────────────
window.eli6.on('update-available', (info) => {
  const banner  = $('update-banner');
  const msg     = $('update-msg');
  const dlBtn   = $('update-dl-btn');

  msg.innerHTML = `<strong>v${info.version}</strong> is available — you're on v${__appVersion || '?'}`;
  dlBtn.href    = `https://github.com/EliseyRotar/Eli6Overlay/releases/latest/download/Eli6Overlay-Setup.exe`;

  banner.classList.remove('hidden');
  document.body.classList.add('has-update');
  setStatus(`Update available: v${info.version}`);
});

$('update-dismiss').onclick = (e) => {
  e.stopPropagation();
  $('update-banner').classList.add('hidden');
  document.body.classList.remove('has-update');
};

// Also add a "Check for updates" row in settings (below screenshot row)
// and hook up the manual check button added in index.html
const btnCheckUpdate = $('btn-check-update');
if (btnCheckUpdate) {
  btnCheckUpdate.onclick = (e) => {
    e.stopPropagation();
    window.eli6.checkForUpdates();
    setStatus('Checking for updates…');
  };
}

// App version for display — injected at build time via electron-builder
// Falls back to reading package.json in dev
const __appVersion = (() => {
  try { return require('./package.json').version; } catch { return null; }
})();
function extractDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url.slice(0, 18); }
}
function trunc(s, max) { return s.length > max ? s.slice(0, max - 1) + '…' : s; }
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
