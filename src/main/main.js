const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow
let ipcRegistered = false

const SUPPORTED_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx',
  'csv', 'txt', 'jpg', 'jpeg', 'png', 'webp',
]

function initializeDataDirectories() {
  const userDataPath = app.getPath('userData')
  const dirs = [
    path.join(userDataPath, 'PropertyDocuments'),
    path.join(userDataPath, 'logs'),
  ]
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}

function createWindow() {
  const isDev = !app.isPackaged
  const iconPath = isDev
    ? path.join(__dirname, '../../resources/icon.png')
    : path.join(process.resourcesPath, 'resources', 'icon.png')

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
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      enableWebSQL: false,
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,
    },
    icon: iconPath,
    backgroundColor: '#FFFFFF',
    show: false,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
    mainWindow.removeMenu()
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    if (!ipcRegistered) {
      registerIpcHandlers()
      ipcRegistered = true
    }
  })

  mainWindow.webContents.on('did-finish-load', () => {
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  })

  if (!isDev) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools()
    })
  }

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow.webContents.send('app-close-requested')
    }
  })
}

let isQuitting = false

function registerIpcHandlers() {
  ipcMain.on('sync-completed', () => {
    isQuitting = true
    if (mainWindow) mainWindow.close()
  })

  ipcMain.handle('save-file', async (_event, filename, content) => {
    const downloadsPath = app.getPath('downloads')
    const safeName = filename.replace(/\.pdf$/i, '.txt').replace(/[<>:"/\\|?*]/g, '_')
    const filePath = path.join(downloadsPath, safeName)
    fs.writeFileSync(filePath, content, 'utf-8')
    return filePath
  })

  ipcMain.handle('show-save-dialog', async (_event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: options.defaultName,
      filters: options.filters,
    })
    return result.canceled ? null : result.filePath
  })

  ipcMain.handle('write-file-buffer', async (_event, filePath, buffer) => {
    fs.writeFileSync(filePath, Buffer.from(buffer))
    return filePath
  })

  ipcMain.handle('open-file-dialog', async (_event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'All Supported Documents', extensions: SUPPORTED_EXTENSIONS },
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'Documents', extensions: ['doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'] },
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] },
      ],
    })
    if (result.canceled) return []

    return result.filePaths.map(filePath => {
      const stats = fs.statSync(filePath)
      const ext = path.extname(filePath).toLowerCase().replace('.', '')
      const mimeMap = {
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv',
        txt: 'text/plain',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
      }
      return {
        sourcePath: filePath,
        originalName: path.basename(filePath),
        extension: ext,
        mimeType: mimeMap[ext] || 'application/octet-stream',
        fileSize: stats.size,
      }
    })
  })

  ipcMain.handle('copy-file-to-storage', async (_event, { sourcePath, propertyId, fileName }) => {
    const userDataPath = app.getPath('userData')
    const docsDir = path.join(userDataPath, 'PropertyDocuments', propertyId)
    fs.mkdirSync(docsDir, { recursive: true })

    const ext = path.extname(sourcePath)
    const baseName = fileName || path.basename(sourcePath, ext)

    let destPath = path.join(docsDir, baseName + ext)
    let counter = 1
    while (fs.existsSync(destPath)) {
      destPath = path.join(docsDir, `${baseName} (${counter})${ext}`)
      counter++
    }

    fs.copyFileSync(sourcePath, destPath)

    return { storagePath: destPath, finalName: path.basename(destPath) }
  })

  ipcMain.handle('delete-file', async (_event, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('read-file-preview', async (_event, filePath) => {
    try {
      const stats = fs.statSync(filePath)
      const ext = path.extname(filePath).toLowerCase().replace('.', '')
      const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(ext)
      const isPdf = ext === 'pdf'

      const maxPreviewSize = 20 * 1024 * 1024
      if (stats.size > maxPreviewSize) {
        return { success: false, error: 'File too large for preview', isImage, isPdf }
      }

      const buffer = fs.readFileSync(filePath)
      const base64 = buffer.toString('base64')
      const mimeMap = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
      }
      const mime = mimeMap[ext] || 'application/octet-stream'
      const dataUrl = `data:${mime};base64,${base64}`

      return { success: true, dataUrl, isImage, isPdf }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('open-file-in-os', async (_event, filePath) => {
    try {
      await shell.openPath(filePath)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('generate-storage-path', async (_event, { propertyId, fileName, extension }) => {
    const userDataPath = app.getPath('userData')
    const docsDir = path.join(userDataPath, 'PropertyDocuments', propertyId)
    fs.mkdirSync(docsDir, { recursive: true })

    let destPath = path.join(docsDir, fileName + '.' + extension)
    let counter = 1
    while (fs.existsSync(destPath)) {
      destPath = path.join(docsDir, `${fileName} (${counter}).${extension}`)
      counter++
    }

    return { storagePath: destPath, finalName: path.basename(destPath) }
  })

  ipcMain.handle('rename-file-in-storage', async (_event, { oldPath, newName }) => {
    try {
      const dir = path.dirname(oldPath)
      const ext = path.extname(oldPath)
      let destPath = path.join(dir, newName + ext)
      let counter = 1
      while (fs.existsSync(destPath)) {
        destPath = path.join(dir, `${newName} (${counter})${ext}`)
        counter++
      }
      fs.renameSync(oldPath, destPath)
      return { success: true, storagePath: destPath, finalName: path.basename(destPath) }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })
}

app.whenReady().then(() => {
  initializeDataDirectories()
  createWindow()
  if (!ipcRegistered) {
    registerIpcHandlers()
    ipcRegistered = true
  }

  // Auto-Update Preparation:
  // To enable future auto-updates, import autoUpdater:
  // const { autoUpdater } = require('electron-updater')
  // And uncomment the check below:
  // autoUpdater.checkForUpdatesAndNotify()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

