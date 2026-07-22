---
title: "Volume 01: System Installation & Deployment Guide - Chapter 01: System Requirements and Prerequisites"
document_id: "INSACC-DOC-V01-CH01"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 01: Installation & Deployment Guide
## Chapter 01: System Requirements and Prerequisites

> **Single Source of Truth Reference**: All hardware, operating system, network, and runtime specifications defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Desktop Client Hardware Requirements](#71-desktop-client-hardware-requirements)
  - [7.2 Operating System Compatibility Matrix](#72-operating-system-compatibility-matrix)
  - [7.3 Zero-Dependency Embedded Runtimes](#73-zero-dependency-embedded-runtimes)
  - [7.4 Target Enterprise Server Requirements [To Be Implemented]](#74-target-enterprise-server-requirements-to-be-implemented)
  - [7.5 Network & Port Allocation Specifications](#75-network--port-allocation-specifications)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter defines the technical hardware, operating system, network port allocation, and environmental prerequisites required to deploy, execute, and maintain the InsAcc Enterprise Asset & Investment Accounting Platform v1.0.0 across workstation client endpoints and future enterprise server infrastructure.

---

## 2. Scope

This specification covers:
- Local workstation client hardware and display requirements for standalone desktop execution.
- Operating system compatibility across Microsoft Windows, Apple macOS, and Linux distributions.
- Embedded runtime specifications (Chromium 120.x, Node.js 18.x embedded in Electron 28.x).
- Target enterprise server hardware and database cluster specifications `[To Be Implemented]`.
- Network firewall, security software exclusions, and local port allocation.

Out of Scope:
- Interactive installation setup wizard steps (covered in [Volume 01 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_01_Installation_Guide/Chapter_02_Desktop_Client_Deployment.md)).
- Source code compilation procedures (covered in [Volume 01 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_01_Installation_Guide/Chapter_03_Build_From_Source.md)).

---

## 3. Audience

This document is authored for:
- Enterprise IT Infrastructure & Desktop Support Administrators
- DevOps Engineers and System Architects
- Information Security & Endpoint Compliance Auditors
- Enterprise Implementation Partners

---

## 4. Prerequisites

Before evaluating system environment compatibility:
1. Review the platform software architecture defined in [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).
2. Ensure endpoint security policies permit local execution of packaged Electron applications (`.exe`, `.dmg`, `.AppImage`).
3. Verify local user write access to OS-specific application data directories (`%APPDATA%`, `~/Library/Application Support/`, `~/.config/`).

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **STORAGE PERMISSION HAZARD**: InsAcc v1.0.0 persists operational financial data locally inside browser `localStorage` (`usePersistedState.ts`). Enforcing aggressive endpoint security policies that automatically wipe browser storage or temporary user profiles on logoff will result in data loss. Enterprise IT MUST exclude InsAcc storage paths from automated cleanup utilities.

> [!WARNING]
> **To Be Implemented**: Multi-tenant server deployment components (PostgreSQL 17 database clusters, Node.js PM2 backend APIs, Nginx SSL reverse proxies) are target architecture specifications planned for enterprise release v2.0.0 and are not present in the v1.0.0 desktop binary bundle.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Zero Third-Party CDN Dependency**: InsAcc is engineered for 100% offline, air-gapped execution. All typography (Inter `.woff2` fonts), icons (inline SVG components), and stylesheets are compiled directly into the client package bundle. Workstations do NOT require active internet connectivity to run InsAcc.

---

## 7. Main Content

### 7.1 Desktop Client Hardware Requirements

The desktop client requires minimal system resources due to its React 18 virtual DOM optimizations and memoized read-model projection layer (`investmentReadModels.ts`, `reportService.ts`).

| Hardware Resource | Minimum Requirement | Recommended Specification | Power User / Heavy Ledger Spec |
|---|---|---|---|
| **CPU Processor** | Dual-Core 2.0 GHz (x86_64 or ARM64) | Quad-Core 2.5 GHz+ (Intel i5/i7, AMD Ryzen, Apple M1+) | Octa-Core 3.0 GHz+ (Apple M-Series Pro/Max, Intel i9) |
| **System Memory (RAM)** | 512 MB available | 2 GB available | 4 GB+ available |
| **Disk Storage Space** | 200 MB free space | 1 GB SSD storage | 5 GB NVMe SSD (for large attachment stores) |
| **Display Resolution** | 1024 x 768 pixels | 1920 x 1080 (FHD 1080p) | 2560 x 1440 (QHD) or 4K Dual-Monitor |
| **Graphics Processing** | Hardware-accelerated GPU or software fallback | Integrated Intel/AMD/Apple GPU | Dedicated GPU with WebGL hardware acceleration |

---

### 7.2 Operating System Compatibility Matrix

InsAcc v1.0.0 desktop binaries are compiled for 64-bit operating systems via Electron Builder:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    InsAcc Cross-Platform Client Matrix                      │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│  Microsoft Windows   │     Apple macOS      │       Linux Distributions     │
│  Windows 10/11 x64   │  macOS 12.0+ Universal│   Ubuntu 22.04/24.04, Debian  │
│  (NSIS / Portable)   │     (DMG / ZIP)      │     (AppImage / .deb / Bin)   │
└──────────────────────┴──────────────────────┴───────────────────────────────┘
```

#### Supported Operating System Releases:
1. **Microsoft Windows**:
   - Windows 10 (64-bit, Version 20H2 or newer)
   - Windows 11 (64-bit, all builds)
   - Windows Server 2019 / 2022 (Citrix & Remote Desktop Services environments)
2. **Apple macOS**:
   - macOS 12.0 (Monterey), macOS 13.0 (Ventura), macOS 14.0 (Sonoma), macOS 15.0 (Sequoia+)
   - Universal Binary Architecture: Native support for Apple Silicon (M1/M2/M3/M4) and Intel x86_64
3. **Linux Distributions**:
   - Ubuntu 22.04 LTS / 24.04 LTS, Debian 11/12, RHEL 9+, Fedora 38+, Arch Linux

---

### 7.3 Zero-Dependency Embedded Runtimes

Client workstations **do not require** pre-installed Node.js, Python, Java, or database servers. The executable package bundles:
- Chromium 120.x rendering engine.
- Node.js 18.x runtime (isolated within the main process context).
- Bundled Inter font family (8 weights in `.woff2` format).
- HTML5 LocalStorage persistence subsystem.

---

### 7.4 Target Enterprise Server Requirements `[To Be Implemented]`

For future multi-user client-server deployments, the target server node requires the following specifications:

| Server Resource | Standard Enterprise Deployment (up to 25 users) | High-Availability Cluster (25–500 users) |
|---|---|---|
| **CPU Cores** | 4 vCPU / Cores (2.4 GHz+) | 16 vCPU / Cores (3.0 GHz+) |
| **System RAM** | 8 GB System Memory | 32 GB System Memory |
| **Storage Subsystem** | 100 GB Enterprise SSD (RAID-1) | 500 GB NVMe SSD Array (RAID-10) |
| **Database Engine** | PostgreSQL 17 Relational Database | PostgreSQL 17 High-Availability Cluster |
| **Reverse Proxy** | Nginx with TLS 1.3 Termination | Nginx Load-Balancer Pair |

---

### 7.5 Network & Port Allocation Specifications

InsAcc v1.0.0 client executes locally. Port allocation applies only during developer HMR mode:

| Port | Protocol | Interface Scope | Usage Description |
|---|---|---|---|
| **5174** | TCP | `127.0.0.1` (Localhost) | Vite Development Server & HMR (Development build only) |
| **443** | TCP | Outbound HTTPS | Optional auto-updater checks `[To Be Implemented]` |

#### Endpoint Security Exclusions
Enterprise endpoint security software (EDR / Antivirus) MUST grant read/write access to application storage paths:
- **Windows**: `%APPDATA%\InsAcc\` and `%LOCALAPPDATA%\Programs\InsAcc\`
- **macOS**: `~/Library/Application Support/InsAcc/`
- **Linux**: `~/.config/InsAcc/`

---

## 8. Summary

InsAcc v1.0.0 delivers an enterprise-grade asset management experience with minimal endpoint hardware requirements. By bundling Chromium and Node.js within a local-first Electron wrapper, InsAcc provides zero-dependency, air-gapped operational capability across Windows, macOS, and Linux workstations.

---

## 9. Chapter Appendix

### Standard Storage Directory Paths

```
Client Workstation Storage Paths
├── Windows:  C:\Users\<Username>\AppData\Roaming\InsAcc\
├── macOS:    /Users/<Username>/Library/Application Support/InsAcc/
└── Linux:    /home/<Username>/.config/InsAcc/
```

---

## 10. Glossary

- **Air-Gapped**: A security measure that ensures a computer network is physically and logically isolated from unsecured networks, such as the public internet.
- **Electron**: An open-source framework developed by GitHub that allows for the development of desktop GUI applications using web technologies.
- **Local-First**: A software architecture paradigm where primary data storage and processing occur on the local device, prioritizing performance and offline availability.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- Master Navigation Index: [docs/enterprise/INDEX.md](file:///Users/t6ux/InsAcc/docs/enterprise/INDEX.md)
- Desktop Deployment Guide: [Volume 01 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_01_Installation_Guide/Chapter_02_Desktop_Client_Deployment.md)
