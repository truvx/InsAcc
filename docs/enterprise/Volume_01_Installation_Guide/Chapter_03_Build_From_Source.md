---
title: "Volume 01: System Installation & Deployment Guide - Chapter 03: Build From Source"
document_id: "INSACC-DOC-V01-CH03"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 01: Installation & Deployment Guide
## Chapter 03: Build From Source

> **Single Source of Truth Reference**: All compilation toolchains, package scripts, and build outputs defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Compiler & Toolchain Setup](#71-compiler--toolchain-setup)
  - [7.2 Repository Cloning & Lockfile Installation (`npm ci`)](#72-repository-cloning--lockfile-installation-npm-ci)
  - [7.3 Interactive Development Execution (`npm run dev`)](#73-interactive-development-execution-npm-run-dev)
  - [7.4 Static Typecheck Validation (`npx tsc --noEmit`)](#74-static-typecheck-validation-npx-tsc---noemit)
  - [7.5 Two-Stage Production Packaging Pipeline (Vite + Electron Builder)](#75-two-stage-production-packaging-pipeline-vite--electron-builder)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter provides the technical specification and step-by-step developer guide for compiling, auditing, and packaging the InsAcc desktop client application from raw source code across Microsoft Windows, Apple macOS, and Linux build environments.

---

## 2. Scope

This specification covers:
- Developer build environment prerequisites (Node.js 22 LTS, npm 10+, C++ build tools).
- Deterministic dependency installation using lockfile verification (`npm ci`).
- Concurrent development environment execution (`npm run dev` with HMR on port 5174).
- TypeScript static analysis validation (`npx tsc --noEmit`).
- Two-stage production build pipeline (Vite 5 bundling $\rightarrow$ Electron Builder 23 packaging).

Out of Scope:
- End-user binary installation (covered in [Volume 01 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_01_Installation_Guide/Chapter_02_Desktop_Client_Deployment.md)).
- Post-build integration testing (covered in [Volume 01 Chapter 04](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_01_Installation_Guide/Chapter_04_Deployment_Verification.md)).

---

## 3. Audience

This document is authored for:
- Enterprise Software Engineers and Core Maintainers
- Quality Assurance Automation Engineers
- DevOps Pipeline Engineers
- Independent Security Code Auditors

---

## 4. Prerequisites

Before setting up the build environment:
1. Review the application directory structure in [MASTER_ARCHITECTURE.md#11-folder-structure](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md#11-folder-structure).
2. Install Git version control (Version 2.40 or newer).
3. Install Node.js 22 LTS (Active Long Term Support release) and npm 10+.

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **DETERMINISTIC DEPENDENCY MANDATE**: Enterprise builds MUST use `npm ci` rather than `npm install`. Using `npm install` can resolve unvetted transitive dependency updates, breaking build reproducibility and violating security audit baselines.

> [!WARNING]
> **NATIVE NODE-GYP BUILD TOOLS**: Building native C/C++ dependencies on Windows requires Microsoft Visual C++ Build Tools. On macOS, Xcode Command Line Tools are mandatory. Ensure native compiler tools are installed before running package scripts.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Port Allocation in Dev Mode**: During `npm run dev`, Vite launches an HMR server bound to `http://localhost:5174`. The Electron main process (`src/main/main.js`) polls this URL via `wait-on` before opening the desktop window. Ensure port 5174 is unblocked by local firewalls.

---

## 7. Main Content

### 7.1 Compiler & Toolchain Setup

To compile InsAcc from source, verify the local developer environment meets toolchain requirements:

| Tool / Runtime | Version Requirement | Purpose | Command Verification |
|---|---|---|---|
| **Git** | 2.40.0+ | Version control & source retrieval | `git --version` |
| **Node.js** | 22.x LTS (22.0.0+) | JavaScript runtime environment | `node -v` |
| **npm** | 10.x+ | Package manager | `npm -v` |
| **Python** | 3.10+ | Required by `node-gyp` for native modules | `python3 --version` |
| **C/C++ Compiler** | MSVC 2022 (Win) / Xcode (Mac) / GCC (Linux) | Native dependency compilation | `gcc --version` / `clang --version` |

---

### 7.2 Repository Cloning & Lockfile Installation (`npm ci`)

1. Clone the repository:
   ```bash
   git clone https://github.com/truvx/InsAcc.git
   cd InsAcc
   ```

2. Inspect `package.json` to verify core build scripts and dependencies:
   - React 18.3.1 & TypeScript 5.3.3
   - Vite 5.x bundler plugin
   - Electron 28.x and Electron Builder 23.6.0

3. Install dependencies deterministically:
   ```bash
   npm ci
   ```

---

### 7.3 Interactive Development Execution (`npm run dev`)

To launch InsAcc in interactive development mode with Hot Module Replacement:

```bash
npm run dev
```

#### Execution Mechanics:
```
npm run dev
   │
   ├──► 1. Launches `vite` server on http://localhost:5174
   │
   ├──► 2. Runs `wait-on http://localhost:5174`
   │
   └──► 3. Spawns Electron main process (`src/main/main.js`) loading port 5174
```

---

### 7.4 Static Typecheck Validation (`npx tsc --noEmit`)

InsAcc enforces strict TypeScript compilation rules (`strict: true` in `tsconfig.json`). Before initiating production packaging, run the static analysis validator:

```bash
npx tsc --noEmit
```

*Expected Terminal Output:*
```
--- No compilation errors ---
```

---

### 7.5 Two-Stage Production Packaging Pipeline (Vite + Electron Builder)

Production distribution packages are generated via a two-stage build process:

```
┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
│     Source Code           │      │    Stage 1: Vite Build    │      │ Stage 2: Electron Builder │
│  src/main/ & src/renderer/├───►  │  Compiles TS/JSX to dist/ ├───►  │ Packages binaries into    │
│                           │      │  Minifies CSS & Assets    │      │ release/ directory        │
└───────────────────────────┘      └───────────────────────────┘      └───────────────────────────┘
```

#### Stage 1: Front-End Compilation (Vite)
Run the Vite compiler script:
```bash
npm run build
```
This minifies static assets into `dist/` (`dist/index.html`, vendor-split JS chunks, compiled CSS tokens).

#### Stage 2: Desktop Package Generation (Electron Builder)
Execute the build command matching your target operating system:

```bash
# Package for Microsoft Windows (x64 NSIS + Portable Executable)
npm run build:win

# Package for Apple macOS (Universal DMG + ZIP)
npm run build:mac

# Package for Linux (x64 AppImage + .deb Package)
npm run build:linux
```

Output distribution binaries are written directly to `release/`:
- `release/InsAcc-Setup-1.0.0-x64.exe`
- `release/InsAcc-1.0.0.dmg`
- `release/InsAcc-1.0.0-mac.zip`
- `release/InsAcc-1.0.0.AppImage`

---

## 8. Summary

Compiling InsAcc from source is a deterministic process powered by Node.js 22 LTS, Vite 5, and Electron Builder. By following the two-stage compilation pipeline, developers can generate fully signed, minified distribution binaries across Windows, macOS, and Linux platforms.

---

## 9. Chapter Appendix

### Package Script Command Reference Matrix

| npm Script Command | Underling Shell Execution | Operational Output |
|---|---|---|
| `npm run dev` | `concurrently "vite" "wait-on http://localhost:5174 && electron ."` | Interactive dev app with HMR |
| `npm run build` | `tsc && vite build` | Minified static files in `dist/` |
| `npm run build:win` | `npm run build && electron-builder --win` | Windows NSIS installer in `release/` |
| `npm run build:mac` | `npm run build && electron-builder --mac` | macOS DMG & ZIP in `release/` |
| `npm run build:linux` | `npm run build && electron-builder --linux` | Linux AppImage & `.deb` in `release/` |

---

## 10. Glossary

- **HMR (Hot Module Replacement)**: A feature in bundlers like Vite that exchanges, adds, or removes modules while an application is running without a full reload.
- **Lockfile**: A file (`package-lock.json`) that records the exact versions of all dependencies installed in a project to ensure reproducible builds.
- **Vite**: A modern front-end build tool that provides a fast development server and bundles assets for production using Rollup.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- Client Deployment Guide: [Volume 01 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_01_Installation_Guide/Chapter_02_Desktop_Client_Deployment.md)
- Deployment Verification: [Volume 01 Chapter 04](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_01_Installation_Guide/Chapter_04_Deployment_Verification.md)
