# Code Signing — Eli6Overlay

This document tracks the code signing status of Eli6Overlay and contains all details needed to apply for and maintain free OSS signing via [SignPath Foundation](https://signpath.org).

---

## Current Status

| | |
|---|---|
| **Signed** | ❌ Pending SignPath Foundation approval |
| **SmartScreen warning** | ⚠️ Shows on first run — click "More info" → "Run anyway" |
| **SignPath application** | 🕐 Not yet submitted — see instructions below |

---

## SignPath Foundation

[SignPath Foundation](https://signpath.org) provides **free code signing certificates** for open-source projects. Once approved:

- Every release build is automatically signed via GitHub Actions
- SmartScreen warning disappears permanently
- Users see "Verified publisher: eli6" in Windows security dialogs

### What SignPath Foundation requires

- Public GitHub repository ✅
- Open-source license (MIT) ✅
- Active project with real source code ✅
- Application form submitted at [signpath.org/open-source](https://signpath.org/open-source)

---

## Application Details

When submitting the application at https://signpath.org/open-source, use these details:

| Field | Value |
|---|---|
| **Project name** | Eli6Overlay |
| **Project URL** | https://github.com/EliseyRotar/Eli6Overlay |
| **Website** | https://eliseyrotar.github.io/Eli6Overlay/ |
| **Contact email** | nutellaelik@gmail.com |
| **Publisher display name** | eli6 |
| **License** | MIT |
| **Description** | Anti-capture transparent browser overlay for Windows. Uses SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE) to hide the window from OBS, Discord, Zoom, and screenshots. |
| **Build system** | GitHub Actions |
| **Signing workflow file** | `.github/workflows/build-and-sign.yml` |

---

## Post-Approval Setup (do this after SignPath emails you)

### Step 1 — Add secrets to GitHub

Go to: https://github.com/EliseyRotar/Eli6Overlay/settings/secrets/actions

Add two secrets:

| Secret name | Where to find the value |
|---|---|
| `SIGNPATH_API_TOKEN` | SignPath dashboard → CI Users → your token |
| `SIGNPATH_ORGANIZATION_ID` | SignPath dashboard → Settings → Organization ID |

### Step 2 — Enable signing

Go to: https://github.com/EliseyRotar/Eli6Overlay/settings/variables/actions

Add one variable:

| Variable name | Value |
|---|---|
| `SIGNPATH_ENABLED` | `true` |

### Step 3 — Configure your SignPath project

In the SignPath dashboard set:
- Project slug: `eli6overlay`
- Signing policy slug: `release-signing`
- Artifact configuration slug: `exe`
- Artifact path pattern: `Eli6Overlay-Setup.exe`

### Step 4 — Release a signed build

```bash
git tag v1.1.0
git push origin v1.1.0
```

The GitHub Actions workflow will automatically: build → submit to SignPath → download signed exe → publish GitHub release. The `.exe` in the release will have a valid certificate and SmartScreen will not warn.

---

## Verification

After signing, verify with PowerShell:

```powershell
Get-AuthenticodeSignature .\Eli6Overlay-Setup.exe
```

Expected: `Status: Valid`, `SignerCertificate` showing `eli6`.
