const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  saveFile: (filename, content) => ipcRenderer.invoke('save-file', filename, content),
})
