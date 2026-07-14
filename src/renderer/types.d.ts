interface SaveDialogOptions {
  defaultName: string
  filters: { name: string; extensions: string[] }[]
}

interface FileDialogResult {
  sourcePath: string
  originalName: string
  extension: string
  mimeType: string
  fileSize: number
}

interface CopyFileResult {
  storagePath: string
  finalName: string
}

interface ReadPreviewResult {
  success: boolean
  dataUrl?: string
  isImage?: boolean
  isPdf?: boolean
  error?: string
}

interface FileActionResult {
  success: boolean
  error?: string
  storagePath?: string
  finalName?: string
}

interface ElectronAPI {
  saveFile: (filename: string, content: string) => Promise<string>
  showSaveDialog: (options: SaveDialogOptions) => Promise<string | null>
  writeFileBuffer: (filePath: string, buffer: ArrayBuffer | Uint8Array) => Promise<string>

  openFileDialog: (options?: any) => Promise<FileDialogResult[]>
  copyFileToStorage: (data: { sourcePath: string; propertyId: string; fileName?: string }) => Promise<CopyFileResult>
  deleteFile: (filePath: string) => Promise<FileActionResult>
  readFilePreview: (filePath: string) => Promise<ReadPreviewResult>
  openFileInOs: (filePath: string) => Promise<FileActionResult>
  renameFileInStorage: (data: { oldPath: string; newName: string }) => Promise<FileActionResult>
  generateStoragePath: (data: { propertyId: string; fileName: string; extension: string }) => Promise<{ storagePath: string; finalName: string }>
}

interface Window {
  api: ElectronAPI
}
