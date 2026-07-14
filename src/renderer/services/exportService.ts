
export async function saveWithDialog(
  defaultName: string,
  filters: { name: string; extensions: string[] }[],
  data: string | ArrayBuffer | Uint8Array,
): Promise<string | null> {
  const api = (window as any).api as (ElectronAPI | undefined)

  if (api?.showSaveDialog && api?.writeFileBuffer) {
    const filePath = await api.showSaveDialog({ defaultName, filters })
    if (!filePath) return null

    if (typeof data === 'string') {
      const encoder = new TextEncoder()
      await api.writeFileBuffer(filePath, encoder.encode(data))
    } else {
      await api.writeFileBuffer(filePath, data)
    }

    return filePath
  }

  // Web Browser Fallback: Trigger direct browser download
  let blob: Blob
  if (typeof data === 'string') {
    blob = new Blob([data], { type: 'text/plain;charset=utf-8' })
  } else {
    blob = new Blob([data], { type: 'application/octet-stream' })
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = defaultName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  return defaultName
}
