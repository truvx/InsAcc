interface ElectronAPI {
  saveFile: (filename: string, content: string) => Promise<string>
}

interface Window {
  api: ElectronAPI
}
