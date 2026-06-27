const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow

function createWindow() {
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
    mainWindow.show()
  })
}

ipcMain.handle('save-file', async (event, filename, content) => {
  const downloadsPath = app.getPath('downloads')
  const safeName = filename.replace(/\.pdf$/i, '.txt').replace(/[<>:"/\\|?*]/g, '_')
  const filePath = path.join(downloadsPath, safeName)
  fs.writeFileSync(filePath, content, 'utf-8')
  return filePath
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
