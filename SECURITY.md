# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅ Yes    |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues by email to: **nutellaelik@gmail.com**

Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

You will receive a response within 72 hours. If the issue is confirmed, a fix will be released as soon as possible and you will be credited in the release notes (unless you prefer to remain anonymous).

## Scope

This project is a Windows desktop application. Relevant security areas include:

- **IPC bridge** (`preload.js` contextBridge): only whitelisted channels are exposed to the renderer
- **Webview isolation**: browser tabs run in isolated webview contexts with no access to Node.js
- **Content Security Policy**: enforced via meta tag in `index.html`
- **Anti-capture API**: uses `SetWindowDisplayAffinity` — a documented Windows API, not a bypass of any security control

## Out of Scope

- Vulnerabilities in Electron itself (report to [electron/electron](https://github.com/electron/electron/security))
- Vulnerabilities in Chromium/V8 (report to [Google](https://g.co/vulnz))
- Social engineering attacks
