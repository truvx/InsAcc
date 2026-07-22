---
title: "Volume 05: Interface and Integration Specification - Chapter 01: Electron IPC Bridge Specification"
document_id: "INSACC-DOC-V05-CH01"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 05: Interface & Integration Specification
## Chapter 01: Electron IPC Bridge Specification

> **Reference Specification**: Inter-Process Communication (IPC) architecture and security flags conform strictly to [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

---

### 1.1 Overview

InsAcc executes across Electron's isolated process architecture. The main process (`src/main/main.js`) manages native OS windows, file system access, and IPC channels, while the renderer process (`src/renderer/`) executes the React web application interface.

This chapter defines the IPC context bridge, security boundaries, and API signatures exposed to the renderer process.

---

### 1.2 IPC Security Model

To protect client systems from remote code execution or unauthorized filesystem access, InsAcc enforces strict security flags in `main.js`:

```javascript
const mainWindow = new BrowserWindow({
  width: 1400,
  height: 900,
  minWidth: 1200,
  minHeight: 800,
  webPreferences: {
    nodeIntegration: false,    // Disables Node.js access in renderer DOM
    contextIsolation: true,     // Isolates preload scripts from window global
    sandbox: false,             // Preload bridge execution isolation
    preload: path.join(__dirname, 'preload.js')
  }
})
```

---

### 1.3 Context Bridge API Signature (`preload.js`)

The preload script (`src/main/preload.js`) exposes a single secure IPC channel to the renderer via `contextBridge`:

```javascript
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  saveFile: (filename, content) => ipcRenderer.invoke('save-file', { filename, content })
})
```

#### TypeScript Declaration (`src/renderer/types.d.ts`):
```typescript
export interface ElectronAPI {
  saveFile: (filename: string, content: string) => Promise<string>
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
```

---

### 1.4 IPC Channel Reference: `save-file`

- **Channel Name**: `'save-file'`
- **Direction**: Renderer Process $\longrightarrow$ Main Process (`ipcRenderer.invoke` / `ipcMain.handle`).
- **Purpose**: Writes formatted text, CSV, PDF, or Excel report content to disk.
- **Parameters**:
  - `filename` (`string`): Target file name (e.g., `Balance_Sheet_2026-06-30.csv`).
  - `content` (`string`): Text or base64 file data payload.
- **Return Value**: `Promise<string>` resolving to the absolute file path saved (e.g., `C:\Users\Username\Downloads\Balance_Sheet_2026-06-30.csv`).
- **Main Process Handler Implementation (`src/main/main.js`)**:
  ```javascript
  ipcMain.handle('save-file', async (event, { filename, content }) => {
    const downloadsPath = app.getPath('downloads')
    const filePath = path.join(downloadsPath, filename)
    await fs.promises.writeFile(filePath, content, 'utf-8')
    return filePath
  })
  ```

---

*Next Chapter: [Chapter 02: File Import Export Interfaces](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_05_Interface_and_Integration_Spec/Chapter_02_File_Import_Export_Interfaces.md)*
