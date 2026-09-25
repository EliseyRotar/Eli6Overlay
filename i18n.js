'use strict';

/**
 * i18n.js — Bilingual EN/IT string table for Eli6Overlay.
 * Loaded as a plain script tag before renderer.js.
 */

window.I18N = {
  en: {
    // Toolbar
    newTab:          'New Tab',
    closeTab:        'Close',
    back:            'Back',
    forward:         'Forward',
    refresh:         'Refresh',
    home:            'Home',
    urlPlaceholder:  'Search or enter URL…',
    muteBtn:         'Mute',
    unmuteBtn:       'Unmute',

    // Settings panel labels
    settings:        'Settings',
    opacity:         'Opacity',
    clickThrough:    'Click-Through',
    clickThroughOn:  'ON — clicks pass through',
    clickThroughOff: 'OFF — window catches clicks',
    autoMute:        'Auto-Mute when hidden',
    hideOnBlank:     'Hide on blank click',
    language:        'Language',
    langEN:          'EN',
    langIT:          'IT',

    // Scratchpad tab
    scratchpad:      'Scratchpad',
    scratchpadPH:    'Type your private notes here…',
    scratchpadSave:  'Saved to localStorage',

    // Quick bookmarks
    bookmarks:       'Bookmarks',
    bmChatGPT:       'ChatGPT',
    bmGoogle:        'Google',
    bmWikipedia:     'Wikipedia',

    // Tray / status
    hiding:          'Hiding overlay…',
    showing:         'Showing overlay',
    panicMsg:        '🚨 Panic! Overlay hidden.',

    // Hotkeys help
    hotkeys:         'Hotkeys',
    hkToggle:        'Win+G / Ctrl+Shift+G  →  Show/Hide',
    hkClickThrough:  'Win+Shift+C  →  Toggle Click-Through',
    hkEscape:        'Escape  →  Panic Hide',
  },

  it: {
    // Toolbar
    newTab:          'Nuova Scheda',
    closeTab:        'Chiudi',
    back:            'Indietro',
    forward:         'Avanti',
    refresh:         'Ricarica',
    home:            'Home',
    urlPlaceholder:  'Cerca o inserisci URL…',
    muteBtn:         'Muto',
    unmuteBtn:       'Attiva audio',

    // Settings panel labels
    settings:        'Impostazioni',
    opacity:         'Trasparenza',
    clickThrough:    'Trasparenza Click',
    clickThroughOn:  'ON — i clic passano oltre',
    clickThroughOff: 'OFF — la finestra riceve i clic',
    autoMute:        'Muto automatico quando nascosto',
    hideOnBlank:     'Nascondi al clic vuoto',
    language:        'Lingua',
    langEN:          'EN',
    langIT:          'IT',

    // Scratchpad tab
    scratchpad:      'Appunti',
    scratchpadPH:    'Scrivi qui le tue note private…',
    scratchpadSave:  'Salvato in localStorage',

    // Quick bookmarks
    bookmarks:       'Segnalibri',
    bmChatGPT:       'ChatGPT',
    bmGoogle:        'Google',
    bmWikipedia:     'Wikipedia',

    // Tray / status
    hiding:          'Nascondo overlay…',
    showing:         'Mostro overlay',
    panicMsg:        '🚨 Panico! Overlay nascosto.',

    // Hotkeys help
    hotkeys:         'Scorciatoie',
    hkToggle:        'Win+G / Ctrl+Shift+G  →  Mostra/Nascondi',
    hkClickThrough:  'Win+Shift+C  →  Attiva/disattiva Click-Through',
    hkEscape:        'Escape  →  Nascondersi di Emergenza',
  },
};

/**
 * Current active locale. Call i18n.set('it') to switch.
 */
window.i18n = {
  _lang: 'en',

  get lang() { return this._lang; },

  /** Get a translated string. Falls back to EN key if missing in target locale. */
  t(key) {
    return (
      window.I18N[this._lang]?.[key] ??
      window.I18N.en[key] ??
      key
    );
  },

  /** Switch locale and re-render all [data-i18n] elements. */
  set(lang) {
    if (!window.I18N[lang]) return;
    this._lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      const attr = el.dataset.i18nAttr; // e.g. 'placeholder'
      const text = this.t(key);
      if (attr) {
        el[attr] = text;
      } else {
        el.textContent = text;
      }
    });
    // Save preference
    try { localStorage.setItem('eli6_lang', lang); } catch (_) {}
    // Dispatch event so renderer can react
    document.dispatchEvent(new CustomEvent('i18n-changed', { detail: lang }));
  },
};
