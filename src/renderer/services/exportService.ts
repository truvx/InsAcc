function getApi(): ElectronAPI {
  const api = (window as any).api as (ElectronAPI | undefined)
  if (!api?.showSaveDialog || !api?.writeFileBuffer) {
    throw new Error('Export requires the InsAcc desktop application.')
  }
  return api
}

export async function saveWithDialog(
  defaultName: string,
  filters: { name: string; extensions: string[] }[],
  data: string | ArrayBuffer | Uint8Array,
): Promise<string | null> {
  const api = getApi()

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
