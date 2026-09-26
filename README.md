<div align="center">

# Eli6Overlay

**Anti-capture transparent browser overlay for Windows**

[![Release](https://img.shields.io/github/v/release/EliseyRotar/Eli6Overlay?style=flat-square&color=00e5ff)](https://github.com/EliseyRotar/Eli6Overlay/releases/latest)
[![License](https://img.shields.io/github/license/EliseyRotar/Eli6Overlay?style=flat-square&color=555)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-blue?style=flat-square)](https://github.com/EliseyRotar/Eli6Overlay/releases/latest)
[![Built with Electron](https://img.shields.io/badge/built%20with-Electron-47848f?style=flat-square)](https://www.electronjs.org/)

[**Download**](https://github.com/EliseyRotar/Eli6Overlay/releases/latest/download/Eli6Overlay-Setup.exe) · [**Website**](https://eliseyrotar.github.io/Eli6Overlay/) · [**Releases**](https://github.com/EliseyRotar/Eli6Overlay/releases)

</div>

---

## What is Eli6Overlay?

Eli6Overlay is a frameless, always-on-top browser overlay for Windows that is **completely invisible to screen capture software** — OBS, Discord screen share, Zoom, Teams, and Windows screenshots all show a blank where the overlay is.

It uses the Windows API `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` via Electron's `setContentProtection(true)`, the same DRM mechanism used by Netflix and documented by Microsoft. The window renders normally on your physical monitor and is invisible to any recording or remote viewer.

Built for people who need a private, always-accessible browser that doesn't show up anywhere it shouldn't.

---

## Features

| Feature | Description |
|---|---|
| 🛡 **Anti-Capture** | Invisible to OBS, Discord, Zoom, Teams, PrintScreen via `WDA_EXCLUDEFROMCAPTURE` |
| 👻 **Skip Taskbar** | Never appears in Taskbar or Alt+Tab. Access only via system tray |
| 💾 **Soft Close** | Window hides instead of closing — all tabs, sessions, form state stay in memory |
| 🖱 **Click-Through** | Toggle mouse pass-through so clicks go to apps underneath |
| 🔇 **Auto-Mute** | Audio mutes when hidden, restores when shown |
| 🚨 **Panic Key** | Escape instantly hides overlay, mutes audio, and navigates all tabs to `about:blank` |
| 🌐 **Multi-Tab Browser** | Full browser with tabs, URL/search bar, back/forward/refresh |
| 🔖 **Quick Bookmarks** | One-click access to ChatGPT, Google, Wikipedia |
| 📝 **Offline Scratchpad** | Private notes tab, auto-saved to localStorage |
| 🌍 **EN / IT** | Full English and Italian interface |
| ⚙️ **Opacity Slider** | 10% to 100% opacity control |

---

## Download & Install

**[⬇ Download Eli6Overlay-Setup.exe](https://github.com/EliseyRotar/Eli6Overlay/releases/latest/download/Eli6Overlay-Setup.exe)**

> **Windows SmartScreen note:** Because this is an open-source project without a paid code-signing certificate, Windows may show a SmartScreen prompt on first run. Click **"More info" → "Run anyway"** to proceed. The application is safe — all source code is visible in this repository.
>
> Code signing via [SignPath Foundation](https://signpath.org) is in progress. Once approved, the SmartScreen warning will be gone.

**Requirements:** Windows 10 (build 1903+) or Windows 11, 64-bit.

---

## Hotkeys

### Global (work even when overlay is hidden)

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+G` | Toggle overlay visibility (Show / Hide) |
| `Ctrl+Shift+C` | Toggle click-through mode |
| `Ctrl+Shift+X` | Panic hide (global) |

### In-App

| Shortcut | Action |
|---|---|
| `Escape` | **Panic hide** — hides overlay, mutes audio, clears all tabs |
| `Ctrl+T` | New browser tab |
| `Ctrl+W` | Close current tab |
| `Ctrl+L` | Focus URL bar |
| `Ctrl+1` – `9` | Switch to tab by number |
| `F5` | Refresh active tab |
| `Alt+←` / `Alt+→` | Back / Forward |

---

## How Anti-Capture Works

Eli6Overlay calls `win.setContentProtection(true)` in Electron, which internally calls:

```
SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)  // 0x00000011
```

This is a Windows API function that instructs the Desktop Window Manager (DWM) to exclude the window's content from any capture operation — screenshots, screen recording, remote desktop, and GPU-based capture all see a black rectangle or nothing at all.

This is the same mechanism used by:
- Netflix / Disney+ DRM (prevents screen recording of protected content)
- Windows Hello credential UI
- Banking apps

Reference: [Microsoft Docs — SetWindowDisplayAffinity](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowdisplayaffinity)

---

## Build from Source

```bash
# Clone
git clone https://github.com/EliseyRotar/Eli6Overlay.git
cd Eli6Overlay

# Install dependencies
npm install

# Run in development
npm start

# Build Windows executable
npm run build
```

**Requirements:** Node.js 18+, npm.

The built executable will be at `dist/Eli6Overlay-Setup.exe`.

> **Note on Windows build:** electron-builder downloads a `winCodeSign` package that contains macOS symlinks. On Windows without Developer Mode, this extraction fails. Fix: enable Developer Mode in Settings → System → For Developers, or pre-seed the cache manually. See [issue discussion](https://github.com/electron-userland/electron-builder/issues/6232).

---

## Project Structure

```
Eli6Overlay/
├── main.js          # Electron main process (window, tray, hotkeys, IPC)
├── preload.js       # contextBridge — secure IPC between main and renderer
├── index.html       # App shell (tab bar, nav bar, layout)
├── renderer.js      # UI logic (tabs, navigation, settings, shortcuts)
├── styles.css       # Dark theme UI
├── i18n.js          # EN/IT translations
├── assets/
│   └── icon.ico     # App icon
└── docs/
    └── index.html   # GitHub Pages website
```

---

## Security

See [SECURITY.md](SECURITY.md) for how to report vulnerabilities.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">
Made by <a href="https://github.com/EliseyRotar">eli6</a>
</div>
