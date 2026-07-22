---
title: "Volume 01: System Installation & Deployment Guide - Chapter 02: Desktop Client Deployment"
document_id: "INSACC-DOC-V01-CH02"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 01: Installation & Deployment Guide
## Chapter 02: Desktop Client Deployment

> **Single Source of Truth Reference**: All client packaging, installer mechanics, and operational paths defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

---

## Revision History

| Version | Release Date | Primary Author | Summary of Changes | Approved By |
|---|---|---|---|---|
| 1.0.0 | 2026-07-22 | Lead Enterprise Documentation Architect | Initial publication-grade enterprise release | Chief Architecture Review Board |

---

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Scope](#2-scope)
- [3. Audience](#3-audience)
- [4. Prerequisites](#4-prerequisites)
- [5. Warnings & Operational Hazards](#5-warnings--operational-hazards)
- [6. Notes & Architecture Context](#6-notes--architecture-context)
- [7. Main Content](#7-main-content)
  - [7.1 Microsoft Windows Installation & Unattended Silent Rollout](#71-microsoft-windows-installation--unattended-silent-rollout)
  - [7.2 Apple macOS Deployment & MDM Management](#72-apple-macos-deployment--mdm-management)
  - [7.3 Linux AppImage & Debian Package Installation](#73-linux-appimage--debian-package-installation)
  - [7.4 Directory Hierarchy & Execution Paths Across OS Platforms](#74-directory-hierarchy--execution-paths-across-os-platforms)
  - [7.5 Client Upgrades & Distribution Artifact Inspection](#75-client-upgrades--distribution-artifact-inspection)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter provides step-by-step technical procedures for deploying pre-built InsAcc desktop client binaries across Microsoft Windows, Apple macOS, and Linux workstations. It includes instructions for interactive GUI installations, unattended silent command-line deployments via Microsoft Intune/SCCM, Jamf Pro MDM deployment, and directory permission management.

---

## 2. Scope

This specification covers:
- Interactive setup wizard procedures for Windows (`InsAcc-Setup-1.0.0-x64.exe`), macOS (`InsAcc-1.0.0.dmg`), and Linux (`InsAcc-1.0.0.AppImage`).
- Silent, unattended enterprise command switches (`/S`, `/allusers`, `/D=`).
- macOS Gatekeeper, Quarantine attribute management, and codesign verification.
- Local execution directories, user configuration storage paths, and log output directories.

Out of Scope:
- Source code compilation (covered in [Volume 01 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_01_Installation_Guide/Chapter_03_Build_From_Source.md)).
- Post-installation automated test suite execution (covered in [Volume 01 Chapter 04](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_01_Installation_Guide/Chapter_04_Deployment_Verification.md)).

---

## 3. Audience

This document is authored for:
- Systems Administrators and Desktop Support Personnel
- Endpoint Management Engineers (SCCM, Intune, Jamf, Kandji)
- Enterprise Software Deployment Technicians
- IT Security Operations Teams

---

## 4. Prerequisites

Before initiating client deployment:
1. Verify endpoint workstation compatibility against [Volume 01 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_01_Installation_Guide/Chapter_01_System_Requirements_and_Prerequisites.md).
2. Obtain officially compiled binary distribution packages from the release repository (`release/` directory).
3. Ensure administrative privileges if performing per-machine (`/allusers`) deployments on Windows or package installations on Linux.

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **WINDOWS PER-MACHINE INSTALLATION PATH**: When performing an unattended per-machine installation (`/allusers`), the installer target parameter `/D=` MUST be the last command-line parameter. Placing additional arguments after `/D=` will cause the target path string to corrupt.

> [!WARNING]
> **MACOS QUARANTINE ATTRIBUTE**: When distributing unpacked `.app` bundles manually via terminal or network shares without Apple Notarization `[To Be Implemented]`, macOS Gatekeeper may flag the app with the `com.apple.quarantine` attribute. System administrators must clear this attribute prior to user execution.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **User-Space Zero-Privilege Deployment**: On Windows, the default NSIS installer targets per-user installation (`%LOCALAPPDATA%\Programs\InsAcc\`). This permits users to install and update InsAcc without requiring Local Administrator rights or UAC elevation.

---

## 7. Main Content

### 7.1 Microsoft Windows Installation & Unattended Silent Rollout

Pre-compiled Windows binaries are generated using Electron Builder and packaged into the `release/` directory.

#### Method A: Interactive NSIS Setup Wizard

1. Locate the setup executable: `InsAcc-Setup-1.0.0-x64.exe`.
2. Double-click the file to initiate the NSIS Setup Wizard.
3. Select installation scope:
   - **Only for me** (Default): Installs to `%LOCALAPPDATA%\Programs\InsAcc\`. Requires no UAC elevation.
   - **Anyone who uses this computer**: Installs to `C:\Program Files\InsAcc\`. Requires UAC administrative approval.
4. Click **Install**. The setup copies application binaries, creates Start Menu shortcuts, and registers uninstall metadata in `Control Panel -> Programs and Features`.
5. Click **Finish** to launch InsAcc.

#### Method B: Unattended Silent Command-Line Deployment (SCCM / Intune)

To automate enterprise distribution without user intervention:

```cmd
:: Command 1: Silent per-user deployment (No admin rights required)
InsAcc-Setup-1.0.0-x64.exe /S

:: Command 2: Silent per-machine deployment for all users (Administrative Command Prompt)
InsAcc-Setup-1.0.0-x64.exe /S /allusers

:: Command 3: Silent per-machine deployment to custom target path (Note: /D= must be last)
InsAcc-Setup-1.0.0-x64.exe /S /allusers /D=C:\EnterpriseApps\InsAcc
```

| Switch / Parameter | Functional Description |
|---|---|
| `/S` | Enables silent mode (suppresses all GUI dialogs, progress bars, and prompts). |
| `/allusers` | Instructs installer to install for all machine users into `Program Files`. |
| `/D=<path>` | Overrides default installation directory. Must be the final command switch. |

---

### 7.2 Apple macOS Deployment & MDM Management

InsAcc for macOS is built as a Universal Binary supporting both Apple Silicon (M1/M2/M3/M4) and Intel processors.

#### Method A: Interactive Drag-and-Drop Installation

1. Mount the Disk Image archive: `InsAcc-1.0.0.dmg`.
2. A Finder window presents the `InsAcc.app` bundle and a shortcut to the `/Applications` directory.
3. Drag `InsAcc.app` into the `Applications` folder.
4. Eject the DMG image.
5. Launch InsAcc from Launchpad or via Spotlight (`Cmd + Space` $\rightarrow$ type `InsAcc`).

#### Method B: Enterprise MDM Rollout & Security Clearance

For automated deployment via Jamf Pro, Kandji, or deployment scripts:

```bash
# Verify application signature status
codesign --verify --deep --verbose /Applications/InsAcc.app

# Remove Gatekeeper quarantine attribute if pushed via custom script
sudo xattr -rd com.apple.quarantine /Applications/InsAcc.app
```

---

### 7.3 Linux AppImage & Debian Package Installation

#### Method A: Universal AppImage Deployment

1. Make the AppImage executable:
   ```bash
   chmod +x InsAcc-1.0.0.AppImage
   ```
2. Launch the standalone application:
   ```bash
   ./InsAcc-1.0.0.AppImage
   ```

#### Method B: Debian / Ubuntu Package Installation (`.deb`)

1. Install via `dpkg`:
   ```bash
   sudo dpkg -i insacc_1.0.0_amd64.deb
   sudo apt-get install -f # Resolve any missing system dependencies
   ```

---

### 7.4 Directory Hierarchy & Execution Paths Across OS Platforms

| Operating System | Binary Executable Target Path | Local Storage & Application Data Path | Application Log Output Directory |
|---|---|---|---|
| **Microsoft Windows** | `%LOCALAPPDATA%\Programs\InsAcc\InsAcc.exe` | `%APPDATA%\InsAcc\` | `%APPDATA%\InsAcc\logs\` |
| **Apple macOS** | `/Applications/InsAcc.app/` | `~/Library/Application Support/InsAcc/` | `~/Library/Logs/InsAcc/` |
| **Linux Distribution** | `/opt/InsAcc/insacc` or AppImage dir | `~/.config/InsAcc/` | `~/.config/InsAcc/logs/` |

---

### 7.5 Client Upgrades & Distribution Artifact Inspection

When upgrading InsAcc to a newer version:
1. Running the new installer automatically overwrites binary executables while **preserving user local storage data** (`localStorage` keys under `insacc_*`).
2. Schema version migrations are handled automatically on first launch via `insacc_clear_version` (`CLEAR_VERSION = '8'`).

---

## 8. Summary

InsAcc client binaries provide flexible deployment options across Windows, macOS, and Linux endpoints. With support for user-space installations, unattended silent command switches, and universal macOS binaries, enterprise IT teams can seamlessly integrate InsAcc into automated endpoint deployment systems.

---

## 9. Chapter Appendix

### Unattended Uninstall Command Reference (Windows)

To silently remove InsAcc from a Windows workstation:

```cmd
:: Execute silent uninstaller from per-user installation path
"%LOCALAPPDATA%\Programs\InsAcc\Uninstall InsAcc.exe" /S

:: Execute silent uninstaller from per-machine path
"C:\Program Files\InsAcc\Uninstall InsAcc.exe" /S /allusers
```

---

## 10. Glossary

- **AppImage**: A universal software format for distributing portable software on Linux without needing superuser permissions to install.
- **Jamf Pro**: An enterprise management software solution used by IT administrators to automate Apple device deployment and compliance.
- **NSIS**: Nullsoft Scriptable Install System, a script-driven Windows installer authoring tool used by Electron Builder.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- System Requirements: [Volume 01 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_01_Installation_Guide/Chapter_01_System_Requirements_and_Prerequisites.md)
- Build From Source: [Volume 01 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_01_Installation_Guide/Chapter_03_Build_From_Source.md)
- Deployment Verification: [Volume 01 Chapter 04](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_01_Installation_Guide/Chapter_04_Deployment_Verification.md)
