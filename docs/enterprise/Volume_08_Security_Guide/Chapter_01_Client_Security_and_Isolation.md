---
title: "Volume 08: Security Guide - Chapter 01: Client Security and Isolation"
document_id: "INSACC-DOC-V08-CH01"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 08: InsAcc Security Guide
## Chapter 01: Client Security and Isolation

> **Single Source of Truth Reference**: All security models, process isolation parameters, and air-gapped privacy rules defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Desktop Application Security Model](#71-desktop-application-security-model)
  - [7.2 Electron Process Isolation Parameters (`main.js`)](#72-electron-process-isolation-parameters-mainjs)
  - [7.3 Local-First Data Privacy & Air-Gapped Network Isolation](#73-local-first-data-privacy--air-gapped-network-isolation)
  - [7.4 OS-Level Disk Encryption Requirements (BitLocker / FileVault)](#74-os-level-disk-encryption-requirements-bitlocker--filevault)
  - [7.5 Endpoint Security Compliance & Antivirus Audits](#75-endpoint-security-compliance--antivirus-audits)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter defines the desktop security architecture, process isolation parameters, local-first data privacy guarantees, and OS-level encryption recommendations for InsAcc v1.0.0.

---

## 2. Scope

This specification covers:
- Desktop application threat model and security boundaries.
- Electron process isolation settings (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`).
- 100% offline, air-gapped data privacy (zero outbound telemetry or network requests).
- OS-level full disk encryption (BitLocker, FileVault, LUKS).
- Endpoint security compliance and EDR antivirus exclusions.

Out of Scope:
- Plaintext credential storage audit findings (covered in [Volume 08 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_08_Security_Guide/Chapter_02_Credential_Storage_and_Authentication_Gaps.md)).
- Enterprise security hardening roadmap `[To Be Implemented]` (covered in [Volume 08 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_08_Security_Guide/Chapter_03_Security_Hardening_Roadmap_[To_Be_Implemented].md)).

---

## 3. Audience

This document is authored for:
- Chief Information Security Officers (CISOs) & Security Architects
- Information Security Compliance Auditors
- Enterprise Desktop Management Technicians

---

## 4. Prerequisites

Before evaluating security posture:
1. Review the security architecture specified in [MASTER_ARCHITECTURE.md#8-security-architecture](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md#8-security-architecture).
2. Understand Electron process isolation and OS-level container sandboxing mechanisms.

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **UNENCRYPTED LOCALSTORAGE HAZARD**: InsAcc v1.0.0 persists operational data inside browser `localStorage`. Because `localStorage` files are stored unencrypted on the host filesystem (`%APPDATA%` on Windows, `~/Library/Application Support/` on macOS), workstations MUST enforce OS-level Full Disk Encryption (BitLocker / FileVault).

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Zero Telemetry / Zero Phone Home**: InsAcc contains zero analytics trackers, zero telemetry libraries, and zero external font or icon dependencies. All application execution occurs 100% locally within the client process.

---

## 7. Main Content

### 7.1 Desktop Application Security Model

InsAcc v1.0.0 executes as a local desktop application. Its threat model prioritizes:
1. Preventing untrusted renderer code from executing Node.js system commands.
2. Protecting local financial data from unauthorized external network exfiltration.
3. Guaranteeing air-gapped operational security.

---

### 7.2 Electron Process Isolation Parameters (`main.js`)

In `src/main/main.js`, Electron enforces process isolation:

```javascript
const mainWindow = new BrowserWindow({
  width: 1400,
  height: 900,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,       // Enforces strict V8 context separation
    nodeIntegration: false,        // Disables Node.js access in renderer context
    enableRemoteModule: false,     // Disables remote module
    sandbox: true                  // Enables OS-level sandbox container
  }
})
```

#### Security Functional Rationale:
- **`contextIsolation: true`**: Isolates JavaScript contexts so renderer scripts cannot tamper with main process prototypes or context bridge functions.
- **`nodeIntegration: false`**: Prevents cross-site scripting (XSS) or malicious dependencies from invoking Node.js `child_process` or `fs` modules.
- **`sandbox: true`**: Restricts the renderer process to an OS-level sandbox container with minimal system privileges.

---

### 7.3 Local-First Data Privacy & Air-Gapped Network Isolation

InsAcc is engineered for 100% offline, air-gapped execution:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Air-Gapped Client Security Boundary                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  [ Bundled Inter Font ]    [ Inline SVG Icons ]    [ Local JS & CSS ]       │
│                                                                             │
│                   No Outbound Network Calls / Zero CDN                      │
│                                                                             │
│  [ Client Renderer ] ──► [ LocalStorage ] ──► [ Local Disk Snapshot ]       │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Privacy Guarantees:
- Zero telemetry, tracking cookies, or analytics pingbacks.
- All fonts (Inter `.woff2`), icons (inline SVG), and styling are bundled into the binary package.
- Operates on network-isolated, air-gapped workstations without internet connectivity.

---

### 7.4 OS-Level Disk Encryption Requirements (BitLocker / FileVault)

Because `localStorage` data files are stored on the host filesystem, enterprise IT MUST enforce Full Disk Encryption (FDE):

| Operating System | Recommended Encryption Technology | Enforced Cipher Standard |
|---|---|---|
| **Microsoft Windows** | BitLocker Drive Encryption | AES-256 with XTS |
| **Apple macOS** | FileVault 2 Encryption | XTS-AES-128 / 256 |
| **Linux Distribution** | LUKS (Linux Unified Key Setup) | AES-XTS-PLAIN64 256-bit |

---

### 7.5 Endpoint Security Compliance & Antivirus Audits

Enterprise Endpoint Detection and Response (EDR) agents (e.g., CrowdStrike, Microsoft Defender for Endpoint) should be configured to trust signed InsAcc client binaries while monitoring write access to application storage directories (`%APPDATA%\InsAcc\`).

---

## 8. Summary

InsAcc v1.0.0 delivers local-first security through Electron process isolation (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`), air-gapped network isolation, and OS-level full disk encryption recommendations (BitLocker / FileVault).

---

## 9. Chapter Appendix

### Endpoint Security Checklist Reference

| Security Controls Domain | Mandated Security Setting | Audit Verification Method |
|---|---|---|
| Process Isolation | `contextIsolation: true` | Verify in `src/main/main.js` |
| Node Integration | `nodeIntegration: false` | Verify in `src/main/main.js` |
| Sandboxing | `sandbox: true` | Verify in `src/main/main.js` |
| Storage Encryption | BitLocker / FileVault Active | OS Security Audit Policy |
| Outbound Network Calls | Zero Outbound Connections | Network Packet Inspection |

---

## 10. Glossary

- **Air-Gapped**: A security measure that ensures a computer or network is physically and logically isolated from unsecured networks, such as the public internet.
- **Context Isolation**: An Electron security feature that ensures preload scripts and Electron internal logic run in a separate context from the website loaded in `webPreferences`.
- **Full Disk Encryption (FDE)**: Encryption of all data on a hard disk, including the operating system, applications, and data files.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- Credential Storage Audit: [Volume 08 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_08_Security_Guide/Chapter_02_Credential_Storage_and_Authentication_Gaps.md)
- Security Hardening Roadmap: [Volume 08 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_08_Security_Guide/Chapter_03_Security_Hardening_Roadmap_[To_Be_Implemented].md)
- Desktop IPC Bridge: [Volume 05 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_05_Interface_and_Integration_Spec/Chapter_01_Desktop_IPC_Bridge.md)
