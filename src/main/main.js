const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

console.log('[Main] Starting InsAcc main process')

let mainWindow

function createWindow() {
  console.log('[Main] Creating BrowserWindow')
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    frame: true,
    titleBarStyle: 'default',
    title: 'InsAcc - Intelligent Asset & Investment Accounting',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../../resources/icon.png'),
    backgroundColor: '#FFFFFF',
    show: false,
  })

  const isDev = !app.isPackaged

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
    mainWindow.removeMenu()
  }

  mainWindow.once('ready-to-show', () => {
    console.log('[Main] Window ready-to-show')
    mainWindow.show()
  })
}

// --- IPC Handlers ---

console.log('[Main] Registering IPC handlers...')

ipcMain.handle('save-file', async (event, filename, content) => {
  console.log('[Main] save-file invoked:', filename)
  const downloadsPath = app.getPath('downloads')
  const safeName = filename.replace(/\.pdf$/i, '.txt').replace(/[<>:"/\\|?*]/g, '_')
  const filePath = path.join(downloadsPath, safeName)
  fs.writeFileSync(filePath, content, 'utf-8')
  return filePath
})
console.log('[Main] Handler registered: save-file')

ipcMain.handle('show-save-dialog', async (event, options) => {
  console.log('[Main] show-save-dialog invoked:', JSON.stringify(options))
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: options.defaultName,
    filters: options.filters,
  })
  console.log('[Main] show-save-dialog result:', JSON.stringify(result))
  return result.canceled ? null : result.filePath
})
console.log('[Main] Handler registered: show-save-dialog')

ipcMain.handle('write-file-buffer', async (event, filePath, buffer) => {
  console.log('[Main] write-file-buffer invoked:', filePath)
  fs.writeFileSync(filePath, Buffer.from(buffer))
  console.log('[Main] write-file-buffer complete:', filePath)
  return filePath
})
console.log('[Main] Handler registered: write-file-buffer')

console.log('[Main] All IPC handlers registered')

// --- App lifecycle ---

app.whenReady().then(() => {
  console.log('[Main] app.whenReady() resolved')
  createWindow()
})

app.on('window-all-closed', () => {
  console.log('[Main] window-all-closed')
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  console.log('[Main] activate')
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
