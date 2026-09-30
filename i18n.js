'use strict';

/**
 * i18n.js — Bilingual EN/IT string table for Eli6Overlay.
 * Loaded as a plain script tag before renderer.js.
 *
 * Static markup picks up translations through [data-i18n] attributes
 * (add data-i18n-attr="placeholder" / "title" for attribute targets).
 * Renderer-side strings call i18n.t(key).
 */

window.I18N = {
  en: {
    // Toolbar / chrome
    newTab:          'New Tab',
    newTabTitle:     'New Tab (Ctrl+T)',
    closeTab:        'Close',
    back:            'Back',
    backTitle:       'Back (Alt+←)',
    forward:         'Forward',
    forwardTitle:    'Forward (Alt+→)',
    refresh:         'Refresh',
    refreshTitle:    'Refresh (F5)',
    home:            'Home',
    homeTitle:       'Home',
    urlPlaceholder:  'Search or enter URL…',
    muteBtn:         'Mute',
    unmuteBtn:       'Unmute',
    statusDotTitle:  'Anti-capture active',
    hideTitle:       'Hide',
    hideHotkeyTitle: 'Hide (Ctrl+Shift+G)',

    // Settings panel
    settings:        'Settings',
    settingsTitle:   'Settings',
    setup:           'Setup',
    setupTitle:      'Set up your overlay',
    setupText:       'Choose your language and every option below — you can change them any time in Settings.',
    start:           'Start',
    setupDone:       'Setup complete',

    // Groups
    appearance:      'Appearance',
    behaviour:       'Behaviour',
    browser:         'Browser',
    position:        'Position',
    autoHide:        'Auto-hide',
    lock:            'Lock',
    system:          'System',
    hotkeys:         'Hotkeys',

    // Appearance
    windowOpacity:   'Window opacity',
    screenTint:      'Screen tint',
    tintEnabled:     'Tint enabled',
    pageZoom:        'Page zoom',
    opacity:         'Opacity',

    // Behaviour
    clickThrough:    'Click-Through',
    clickThroughOn:  'ON — clicks pass through',
    clickThroughOff: 'OFF — window catches clicks',
    popoutMode:      'Pop-out mode',
    autoMute:        'Auto-Mute when hidden',
    hideOnBlank:     'Hide on blank click',
    adBlocker:       'Ad blocker',

    // Browser
    homepage:        'Homepage',
    customBookmarks: 'Custom bookmarks',
    bmName:          'Name',
    bmAdd:           'Add',
    bookmarks:       'Bookmarks',
    bmChatGPT:       'ChatGPT',
    bmGoogle:        'Google',
    bmWikipedia:     'Wikipedia',

    // Auto-hide
    hideAfter:       'Hide after',
    optDisabled:     'Disabled',
    min1:            '1 min',
    min5:            '5 min',
    min10:           '10 min',
    min30:           '30 min',

    // Lock
    requirePin:      'Require PIN to show',
    setPin:          'Set PIN',
    enterPin:        'Enter PIN',
    incorrectPin:    'Incorrect PIN',
    cancel:          'Cancel',
    unlock:          'Unlock',

    // System
    startWithWindows:'Start with Windows',
    language:        'Language',
    langEN:          'EN',
    langIT:          'IT',
    screenshotL:     'Screenshot',
    capture:         'Capture',
    updatesL:        'Updates',
    checkNow:        'Check now',

    // Hotkey rows
    hkShowHide:      'Show / Hide',
    hkClick:         'Click-through',
    hkPanicGlobal:   'Panic (global)',
    hkPanicApp:      'Panic (in-app)',
    hkNewTab:        'New tab',
    hkCloseTab:      'Close tab',
    hkUrlBar:        'URL bar',

    // States
    on:              'On',
    off:             'Off',

    // Scratchpad
    scratchpad:      'Scratchpad',
    scratchpadPH:    'Type your private notes here…',
    scratchpadSave:  'Saved to localStorage',
    saved:           'Saved',

    // Status messages
    ready:           'eli6overlay ready — Ctrl+Shift+G to hide',
    ctStatusOn:      '● Click-through ON',
    ctStatusOff:     '○ Click-through OFF',
    poStatusOn:      'Pop-out mode ON',
    poStatusOff:     'Pop-out mode OFF',
    ssSaved:         'Screenshot saved: ',
    ssCancelled:     'Screenshot cancelled.',
    checkingUpdates: 'Checking for updates…',
    hiding:          'Hiding overlay…',
    showing:         'Showing overlay',
    panicMsg:        '🚨 Panic! Overlay hidden.',

    // Update banner
    download:        'Download',
    updateAvail:     '{new} is available — you are on {current}',
    updateStatus:    'Update available: {v}',

    // Status bar badges
    badgeCT:         'CLICK-THROUGH',
    badgePO:         'POP-OUT',
    badgeLock:       'LOCKED',

    // Legacy keys (kept so nothing breaks)
    hotkeysHelp:     'Hotkeys',
    hkToggle:        'Ctrl+Shift+G  →  Show/Hide',
    hkClickThrough:  'Ctrl+Shift+C  →  Toggle Click-Through',
    hkEscape:        'Escape  →  Panic Hide',
  },

  it: {
    // Toolbar / chrome
    newTab:          'Nuova scheda',
    newTabTitle:     'Nuova scheda (Ctrl+T)',
    closeTab:        'Chiudi',
    back:            'Indietro',
    backTitle:       'Indietro (Alt+←)',
    forward:         'Avanti',
    forwardTitle:    'Avanti (Alt+→)',
    refresh:         'Ricarica',
    refreshTitle:    'Ricarica (F5)',
    home:            'Home',
    homeTitle:       'Home',
    urlPlaceholder:  'Cerca o inserisci URL…',
    muteBtn:         'Muto',
    unmuteBtn:       'Attiva audio',
    statusDotTitle:  'Anti-cattura attiva',
    hideTitle:       'Nascondi',
    hideHotkeyTitle: 'Nascondi (Ctrl+Shift+G)',

    // Settings panel
    settings:        'Impostazioni',
    settingsTitle:   'Impostazioni',
    setup:           'Configurazione',
    setupTitle:      'Configura la tua overlay',
    setupText:       'Scegli la lingua e tutte le opzioni qui sotto: potrai modificarle in qualsiasi momento nelle Impostazioni.',
    start:           'Inizia',
    setupDone:       'Configurazione completata',

    // Groups
    appearance:      'Aspetto',
    behaviour:       'Comportamento',
    browser:         'Browser',
    position:        'Posizione',
    autoHide:        'Nascondi automaticamente',
    lock:            'Blocco',
    system:          'Sistema',
    hotkeys:         'Scorciatoie',

    // Appearance
    windowOpacity:   'Opacità della finestra',
    screenTint:      'Tinta dello schermo',
    tintEnabled:     'Tinta attiva',
    pageZoom:        'Zoom della pagina',
    opacity:         'Opacità',

    // Behaviour
    clickThrough:    'Trasparenza Click',
    clickThroughOn:  'ON — i clic passano oltre',
    clickThroughOff: 'OFF — la finestra riceve i clic',
    popoutMode:      'Modalità pop-out',
    autoMute:        'Muto automatico quando nascosto',
    hideOnBlank:     'Nascondi al clic vuoto',
    adBlocker:       'Blocca pubblicità',

    // Browser
    homepage:        'Homepage',
    customBookmarks: 'Segnalibri personalizzati',
    bmName:          'Nome',
    bmAdd:           'Aggiungi',
    bookmarks:       'Segnalibri',
    bmChatGPT:       'ChatGPT',
    bmGoogle:        'Google',
    bmWikipedia:     'Wikipedia',

    // Auto-hide
    hideAfter:       'Nascondi dopo',
    optDisabled:     'Disattivato',
    min1:            '1 min',
    min5:            '5 min',
    min10:           '10 min',
    min30:           '30 min',

    // Lock
    requirePin:      'Richiedi PIN per mostrare',
    setPin:          'Imposta PIN',
    enterPin:        'Inserisci PIN',
    incorrectPin:    'PIN errato',
    cancel:          'Annulla',
    unlock:          'Sblocca',

    // System
    startWithWindows:'Avvia con Windows',
    language:        'Lingua',
    langEN:          'EN',
    langIT:          'IT',
    screenshotL:     'Screenshot',
    capture:         'Cattura',
    updatesL:        'Aggiornamenti',
    checkNow:        'Controlla ora',

    // Hotkey rows
    hkShowHide:      'Mostra / Nascondi',
    hkClick:         'Click-through',
    hkPanicGlobal:   'Panico (globale)',
    hkPanicApp:      'Panico (nell’app)',
    hkNewTab:        'Nuova scheda',
    hkCloseTab:      'Chiudi scheda',
    hkUrlBar:        'Barra URL',

    // States
    on:              'Attivo',
    off:             'Off',

    // Scratchpad
    scratchpad:      'Appunti',
    scratchpadPH:    'Scrivi qui le tue note private…',
    scratchpadSave:  'Salvato in localStorage',
    saved:           'Salvato',

    // Status messages
    ready:           'eli6overlay pronto — Ctrl+Shift+G per nascondere',
    ctStatusOn:      '● Click-through ATTIVO',
    ctStatusOff:     '○ Click-through OFF',
    poStatusOn:      'Modalità pop-out ATTIVA',
    poStatusOff:     'Modalità pop-out OFF',
    ssSaved:         'Screenshot salvato: ',
    ssCancelled:     'Screenshot annullato.',
    checkingUpdates: 'Controllo aggiornamenti…',
    hiding:          'Nascondo overlay…',
    showing:         'Mostro overlay',
    panicMsg:        '🚨 Panico! Overlay nascosto.',

    // Update banner
    download:        'Scarica',
    updateAvail:     '{new} è disponibile — stai su {current}',
    updateStatus:    'Aggiornamento disponibile: {v}',

    // Status bar badges
    badgeCT:         'TRASPARENZA',
    badgePO:         'POP-OUT',
    badgeLock:       'BLOCCATO',

    // Legacy keys (kept so nothing breaks)
    hotkeysHelp:     'Scorciatoie',
    hkToggle:        'Ctrl+Shift+G  →  Mostra/Nascondi',
    hkClickThrough:  'Ctrl+Shift+C  →  Attiva/disattiva Click-Through',
    hkEscape:        'Escape  →  Nascondi di emergenza',
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
      const attr = el.dataset.i18nAttr; // e.g. 'placeholder' or 'title'
      const text = this.t(key);
      if (attr) {
        el.setAttribute(attr, text);
      } else {
        el.textContent = text;
      }
    });
    try { document.documentElement.lang = lang; } catch (_) {}
    // Save preference
    try { localStorage.setItem('eli6_lang', lang); } catch (_) {}
    // Dispatch event so renderer can react
    document.dispatchEvent(new CustomEvent('i18n-changed', { detail: lang }));
  },
};
