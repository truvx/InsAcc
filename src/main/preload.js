const { contextBridge, ipcRenderer } = require('electron')

console.log('[Preload] Setting up IPC bridge')

contextBridge.exposeInMainWorld('api', {
  saveFile: (filename, content) => {
    console.log('[Preload] api.saveFile called:', filename)
    return ipcRenderer.invoke('save-file', filename, content)
  },
  showSaveDialog: (options) => {
    console.log('[Preload] api.showSaveDialog called:', JSON.stringify(options))
    return ipcRenderer.invoke('show-save-dialog', options)
  },
  writeFileBuffer: (filePath, buffer) => {
    console.log('[Preload] api.writeFileBuffer called:', filePath)
    return ipcRenderer.invoke('write-file-buffer', filePath, buffer)
  },
})

console.log('[Preload] IPC bridge ready')
