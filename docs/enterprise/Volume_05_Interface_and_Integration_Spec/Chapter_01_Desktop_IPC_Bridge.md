---
title: "Volume 05: Interface and Integration Spec - Chapter 01: Desktop IPC Bridge"
document_id: "INSACC-DOC-V05-CH01"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 05: Interface and Integration Specification
## Chapter 01: Desktop IPC Bridge

> **Single Source of Truth Reference**: All Electron Inter-Process Communication (IPC) patterns, preload bridge APIs, and main process event handlers defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Inter-Process Communication (IPC) Architecture](#71-inter-process-communication-ipc-architecture)
  - [7.2 Process Security & Isolation Configuration (`main.js`)](#72-process-security--isolation-configuration-mainjs)
  - [7.3 Preload Context Bridge Specification (`preload.js`)](#73-preload-context-bridge-specification-preloadjs)
  - [7.4 Main Process Handler Implementation (`save-file`)](#74-main-process-handler-implementation-save-file)
  - [7.5 Renderer Invocation & Error Handling (`window.api.saveFile`)](#75-renderer-invocation--error-handling-windowapisavefile)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter details the desktop Inter-Process Communication (IPC) bridge architecture in InsAcc v1.0.0. It defines the secure context isolation boundary between the React renderer process and the Electron Node.js main process, detailing the `save-file` IPC handler and TypeScript context bridge definitions.

---

## 2. Scope

This specification covers:
- Electron IPC architecture connecting renderer and main process contexts.
- Security isolation parameters (`contextIsolation: true`, `nodeIntegration: false`).
- Preload context bridge implementation (`src/main/preload.js`).
- Main process handler execution (`src/main/main.js`).
- TypeScript global window interface extensions (`window.api.saveFile()`).

Out of Scope:
- General file import/export UI workflows (covered in [Volume 05 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_05_Interface_and_Integration_Spec/Chapter_02_Import_and_Export_Interfaces.md)).
- Target REST API HTTP endpoints `[To Be Implemented]` (covered in [Volume 05 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_05_Interface_and_Integration_Spec/Chapter_03_Target_REST_API_[To_Be_Implemented].md)).

---

## 3. Audience

This document is authored for:
- Desktop Application Engineers and Electron Maintainers
- Application Security Officers and Code Auditors
- Frontend Integration Developers

---

## 4. Prerequisites

Before reviewing IPC bridge code:
1. Review the Electron architecture defined in [MASTER_ARCHITECTURE.md#5-electron-architecture](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md#5-electron-architecture).
2. Understand Electron `ipcRenderer.invoke` and `ipcMain.handle` asynchronous message-passing patterns.

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **CONTEXT ISOLATION COMPLIANCE**: Never set `nodeIntegration: true` or `contextIsolation: false` in `BrowserWindow` settings. Disabling context isolation exposes Node.js file system capabilities directly to web content, creating critical Remote Code Execution (RCE) vulnerabilities.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Minimal Surface Area Security**: InsAcc intentionally exposes a single, strictly typed IPC method (`saveFile`) through the context bridge. Exposing generic `ipcRenderer.send` methods is prohibited to prevent malicious code injection.

---

## 7. Main Content

### 7.1 Inter-Process Communication (IPC) Architecture

The InsAcc desktop application partitions responsibilities across two process contexts:

```
┌──────────────────────────────────────┐                ┌──────────────────────────────────────┐
│       React Renderer Process         │                │        Electron Main Process         │
│   (UI, Components, State Hooks)      │                │    (Node.js, OS Access, File I/O)    │
│                                      │                │                                      │
│  Calls: window.api.saveFile(...)     │                │  Handles: ipcMain.handle('save-file')│
└──────────────────┬───────────────────┘                └──────────────────▲───────────────────┘
                   │                                                       │
                   │           Secure Context Bridge Boundary              │
                   └──────────────────► src/main/preload.js ───────────────┘
                                     (ipcRenderer.invoke)
```

---

### 7.2 Process Security & Isolation Configuration (`main.js`)

In `src/main/main.js`, `BrowserWindow` enforces strict security boundaries:

```javascript
const mainWindow = new BrowserWindow({
  width: 1400,
  height: 900,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,       // Enforces strict V8 context separation
    nodeIntegration: false,        // Disables Node.js access in renderer context
    enableRemoteModule: false,     // Disables remote module
    sandbox: true                  // Enables OS-level sandbox isolation
  }
})
```

---

### 7.3 Preload Context Bridge Specification (`preload.js`)

The preload script (`src/main/preload.js`) selectively exposes main process capabilities to the renderer via `contextBridge.exposeInMainWorld`:

```javascript
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  saveFile: async (filename, content) => {
    // Transmit request to main process via 'save-file' channel
    return await ipcRenderer.invoke('save-file', { filename, content })
  }
})
```

#### TypeScript Window Declaration (`src/renderer/vite-env.d.ts`):
```typescript
declare global {
  interface Window {
    api: {
      saveFile: (filename: string, content: string) => Promise<string>
    }
  }
}
```

---

### 7.4 Main Process Handler Implementation (`save-file`)

In `src/main/main.js`, the main process registers an asynchronous IPC handler using `ipcMain.handle`:

```javascript
const { app, ipcMain, dialog } = require('electron')
const fs = require('fs/promises')
const path = require('path')

ipcMain.handle('save-file', async (event, { filename, content }) => {
  try {
    // 1. Resolve default output path in user's Downloads directory
    const defaultPath = path.join(app.getPath('downloads'), filename)

    // 2. Open native OS Save Dialog
    const { filePath, canceled } = await dialog.showSaveDialog({
      defaultPath,
      title: 'Save InsAcc Export File',
      buttonLabel: 'Save File'
    })

    if (canceled || !filePath) {
      return null // Operation canceled by user
    }

    // 3. Write content payload to target filesystem path
    await fs.writeFile(filePath, content, 'utf-8')
    console.log(`[IPC] Successfully wrote file to: ${filePath}`)
    
    return filePath
  } catch (error) {
    console.error(`[IPC Error] Failed to write file:`, error)
    throw new Error(`Failed to write file to disk: ${error.message}`)
  }
})
```

---

### 7.5 Renderer Invocation & Error Handling (`window.api.saveFile`)

Renderer UI components invoke the file export channel within an `async/await` block:

```typescript
// Invocation Example in Financial Reports UI (Reports.tsx)
const handleExportCSV = async () => {
  try {
    const csvContent = generateCSVReport(reportData)
    const savedPath = await window.api.saveFile('Profit_Loss_2026.csv', csvContent)
    
    if (savedPath) {
      alert(`Report exported successfully to:\n${savedPath}`)
    }
  } catch (error) {
    console.error('File export failed:', error)
    alert(`File export failed: ${error.message}`)
  }
}
```

---

## 8. Summary

The desktop IPC bridge provides secure, asynchronous file writing capabilities for the InsAcc renderer process. By pairing `contextIsolation: true` with a typed context bridge, InsAcc achieves OS-level file access while maintaining desktop security boundaries.

---

## 9. Chapter Appendix

### IPC Security & Performance Checklist

| Security Parameter | Enforced Setting | Functional Rationale |
|---|---|---|
| `contextIsolation` | `true` | Prevents prototype pollution and renderer context escalation |
| `nodeIntegration` | `false` | Prevents renderer JavaScript from executing arbitrary Node.js APIs |
| `sandbox` | `true` | Restricts system access via OS-level sandbox container |
| IPC Method Scope | Explicit (`saveFile`) | Prevents wildcard channel exposure (`ipcRenderer.send('*')`) |

---

## 10. Glossary

- **Context Bridge**: An Electron API that allows developers to safely create a secure, privilege-separated channel between preload scripts and renderer scripts.
- **Inter-Process Communication (IPC)**: A mechanism that allows processes in a multi-process software system to communicate and synchronize their actions.
- **Preload Script**: A script that runs before renderer content is loaded in the web page, with access to both Node.js APIs and DOM APIs.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- Import and Export Interfaces: [Volume 05 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_05_Interface_and_Integration_Spec/Chapter_02_Import_and_Export_Interfaces.md)
- Target REST API: [Volume 05 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_05_Interface_and_Integration_Spec/Chapter_03_Target_REST_API_[To_Be_Implemented].md)
- Client Security & Isolation: [Volume 08 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_08_Security_Guide/Chapter_01_Client_Security_and_Isolation.md)
