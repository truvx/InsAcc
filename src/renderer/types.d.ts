interface SaveDialogOptions {
  defaultName: string
  filters: { name: string; extensions: string[] }[]
}

interface ElectronAPI {
  saveFile: (filename: string, content: string) => Promise<string>
  showSaveDialog: (options: SaveDialogOptions) => Promise<string | null>
  writeFileBuffer: (filePath: string, buffer: ArrayBuffer | Uint8Array) => Promise<string>
}

interface Window {
  api: ElectronAPI
}
