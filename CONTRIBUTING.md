# Contributing to Eli6Overlay

Thanks for your interest in contributing. This is a small solo project but PRs and issues are welcome.

## Getting Started

```bash
git clone https://github.com/EliseyRotar/Eli6Overlay.git
cd Eli6Overlay
npm install
npm start
```

## Project Structure

| File | Purpose |
|---|---|
| `main.js` | Electron main process — window creation, tray, hotkeys, IPC handlers |
| `preload.js` | contextBridge — the only bridge between main and renderer |
| `index.html` | App shell HTML |
| `renderer.js` | All UI logic — tabs, navigation, settings, shortcuts |
| `styles.css` | Dark theme CSS |
| `i18n.js` | EN/IT translation strings |
| `docs/index.html` | GitHub Pages website |

## Guidelines

- **Keep it minimal.** This app is intentionally lean. Don't add heavy frameworks or dependencies.
- **Test on Windows.** The anti-capture feature is Windows-only. macOS/Linux builds are not a goal.
- **IPC discipline.** Any new renderer→main communication must go through `preload.js` contextBridge with an explicit whitelist. Never enable `nodeIntegration`.
- **No new runtime deps.** The app has zero runtime npm dependencies by design. Keep it that way.

## Submitting a PR

1. Fork the repo
2. Create a branch: `git checkout -b my-feature`
3. Make your changes
4. Test with `npm start`
5. Open a PR with a clear description of what you changed and why

## Issues

Bug reports and feature requests are welcome via [GitHub Issues](https://github.com/EliseyRotar/Eli6Overlay/issues).
