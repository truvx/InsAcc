const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  saveFile: (filename, content) => ipcRenderer.invoke('save-file', filename, content),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  writeFileBuffer: (filePath, buffer) => ipcRenderer.invoke('write-file-buffer', filePath, buffer),

  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  copyFileToStorage: (data) => ipcRenderer.invoke('copy-file-to-storage', data),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  readFilePreview: (filePath) => ipcRenderer.invoke('read-file-preview', filePath),
  openFileInOs: (filePath) => ipcRenderer.invoke('open-file-in-os', filePath),
  renameFileInStorage: (data) => ipcRenderer.invoke('rename-file-in-storage', data),
  generateStoragePath: (data) => ipcRenderer.invoke('generate-storage-path', data),
})
