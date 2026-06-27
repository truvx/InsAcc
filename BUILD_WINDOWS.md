# Building InsAcc for Windows

## Prerequisites (Windows 11 VM)

```powershell
# 1. Install Node.js 20 LTS (includes npm)
# Download from https://nodejs.org (v20.x LTS)

# 2. Open PowerShell as Administrator and run:
npm install -g windows-build-tools
# OR manually install:
#   - Visual Studio 2022 Build Tools (https://visualstudio.microsoft.com/downloads/)
#     → Select "Desktop development with C++"
#   - Python 3.x

# 3. Install Git (optional, for cloning)
# https://git-scm.com/download/win
```

## Setup

```powershell
# 1. Copy the project to your Windows machine
# (USB drive, network share, or git clone)

# 2. Open PowerShell in the project directory

# 3. Install dependencies
npm install

# 4. Generate icons (creates resources/icon.png)
npm run icons
```

## Build the Installer

```powershell
# One command — generates the .exe installer:
npm run build
```

The installer will be created in `release/InsAcc-Setup-1.0.0-x64.exe`

## Build Options

```powershell
# Build only for Windows 64-bit
npm run build

# Preview the production build locally first
npm run preview
```

## Testing the Production Build

```powershell
# Before building the installer, test the production build:
npm run preview
```

This runs the compiled app from `dist/` — if anything looks wrong, fix it and rebuild.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `node-gyp` errors | Run PowerShell as Admin: `npm install --global windows-build-tools` |
| `electron-builder` not found | `npm install -g electron-builder` or use `npx electron-builder` |
| Icon not found | Run `npm run icons` first to generate resources/icon.png |
| Build takes long | Normal on first run — Electron downloads platform-specific binaries |
| NSIS error | Install NSIS from https://nsis.sourceforge.io/ or the build tools will handle it |
| Anti-virus flags installer | This is normal for unsigned Electron apps. Sign with a code signing certificate or add an exception |

## Notes

- The **default password/PIN** is `1234`
- Data is stored in-memory (demo) — add a database backend for production persistence
- The app is unsigned — Windows Defender may warn. To remove the warning, purchase a code signing certificate and configure it in `package.json` under `win.certificateFile`
