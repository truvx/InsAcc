import type { PropertyDocument } from '../data/propertyTypes'

const STORAGE_KEY = 'insacc_prop_documents_metadata'

function generateId(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `pd-${ts}-${rand}`
}

function sanitizeName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim()
}

function loadMetadata(): PropertyDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveMetadata(docs: PropertyDocument[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs))
  } catch {}
}

export async function openFileDialog(): Promise<FileDialogResult[]> {
  if (!window.api?.openFileDialog) return []
  try {
    return await window.api.openFileDialog()
  } catch {
    return []
  }
}

export async function addDocuments(
  files: FileDialogResult[],
  propertyId: string,
  uploadedBy: string,
): Promise<{ success: boolean; docs: PropertyDocument[]; error?: string }> {
  const added: PropertyDocument[] = []

  for (const file of files) {
    try {
      const sanitized = sanitizeName(file.originalName.replace(/\.[^.]+$/, ''))
      if (!sanitized) continue

      const result = await window.api.copyFileToStorage({
        sourcePath: file.sourcePath,
        propertyId,
        fileName: sanitized,
      })

      const doc: PropertyDocument = {
        id: generateId(),
        propertyId,
        fileName: result.finalName,
        originalFileName: file.originalName,
        fileExtension: file.extension,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        uploadDate: new Date().toISOString(),
        uploadedBy: uploadedBy || 'User',
        notes: '',
        storagePath: result.storagePath,
      }

      added.push(doc)
    } catch (err) {
      return { success: false, docs: added, error: `Failed to copy ${file.originalName}: ${err}` }
    }
  }

  const existing = loadMetadata()
  const updated = [...existing, ...added]
  saveMetadata(updated)

  return { success: true, docs: added }
}

export async function deleteDocument(doc: PropertyDocument): Promise<{ success: boolean; error?: string }> {
  try {
    await window.api.deleteFile(doc.storagePath)
  } catch {}

  const existing = loadMetadata().filter(d => d.id !== doc.id)
  saveMetadata(existing)
  return { success: true }
}

export async function renameDocument(
  doc: PropertyDocument,
  newName: string,
): Promise<{ success: boolean; doc?: PropertyDocument; error?: string }> {
  const sanitized = sanitizeName(newName)
  if (!sanitized) return { success: false, error: 'Invalid file name' }

  try {
    const result = await window.api.renameFileInStorage({
      oldPath: doc.storagePath,
      newName: sanitized,
    })

    if (!result.success) return { success: false, error: result.error || 'Rename failed' }

    const updated: PropertyDocument = {
      ...doc,
      fileName: result.finalName || doc.fileName,
      storagePath: result.storagePath || doc.storagePath,
    }

    const existing = loadMetadata().map(d => d.id === doc.id ? updated : d)
    saveMetadata(existing)

    return { success: true, doc: updated }
  } catch (err) {
    return { success: false, error: `${err}` }
  }
}

export async function updateDocumentNotes(
  docId: string,
  notes: string,
): Promise<PropertyDocument | undefined> {
  const existing = loadMetadata()
  const idx = existing.findIndex(d => d.id === docId)
  if (idx === -1) return undefined

  existing[idx] = { ...existing[idx], notes }
  saveMetadata(existing)
  return existing[idx]
}

export function getDocuments(): PropertyDocument[] {
  return loadMetadata()
}

export function getDocumentsByProperty(propertyId: string): PropertyDocument[] {
  return loadMetadata().filter(d => d.propertyId === propertyId)
}

export async function addFileFromBuffer(
  file: { name: string; size: number; buffer: ArrayBuffer },
  propertyId: string,
  uploadedBy: string,
): Promise<{ success: boolean; doc?: PropertyDocument; error?: string }> {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  const baseName = sanitizeName(file.name.replace(/\.[^.]+$/, ''))
  if (!baseName) return { success: false, error: 'Invalid file name' }

  try {
    const pathResult = await window.api.generateStoragePath({
      propertyId,
      fileName: baseName,
      extension,
    })

    await window.api.writeFileBuffer(pathResult.storagePath, file.buffer)

    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf', doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv', txt: 'text/plain',
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    }

    const doc: PropertyDocument = {
      id: generateId(),
      propertyId,
      fileName: pathResult.finalName,
      originalFileName: file.name,
      fileExtension: extension,
      mimeType: mimeMap[extension] || 'application/octet-stream',
      fileSize: file.size,
      uploadDate: new Date().toISOString(),
      uploadedBy: uploadedBy || 'User',
      notes: '',
      storagePath: pathResult.storagePath,
    }

    const existing = loadMetadata()
    saveMetadata([...existing, doc])

    return { success: true, doc }
  } catch (err) {
    return { success: false, error: `Upload failed: ${err}` }
  }
}
