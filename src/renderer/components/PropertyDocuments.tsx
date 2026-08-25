import React, { useState, useMemo, useRef } from 'react'
import type { PropertyEntry, PropertyDocument } from '../data/propertyTypes'
import { Button, SearchIcon, CloseIcon, EmptyState, Badge, Input } from './design/DesignSystem'
import ConfirmDialog from './design/ConfirmDialog'
import Toast from './Toast'
import {
  getDocumentsByProperty, openFileDialog, addDocuments,
  deleteDocument, renameDocument, updateDocumentNotes,
  addFileFromBuffer,
} from '../services/propertyDocumentService'
import { formatDate, formatFileSize } from '../utils'

interface Props {
  propDocuments?: PropertyDocument[]
  setPropDocuments?: React.Dispatch<React.SetStateAction<any[]>>
  properties?: PropertyEntry[]
  dateFormat?: string
  currentUser?: string
}

const FILE_TYPE_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  pdf: 'danger',
  doc: 'primary',
  docx: 'primary',
  xls: 'success',
  xlsx: 'success',
  csv: 'neutral',
  txt: 'neutral',
  jpg: 'warning',
  jpeg: 'warning',
  png: 'warning',
  webp: 'warning',
}

type SortKey = 'uploadDate' | 'fileName' | 'fileSize' | 'fileExtension'
type FilterType = 'all' | 'pdf' | 'images' | 'word' | 'excel' | 'other'

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])
const WORD_EXTENSIONS = new Set(['doc', 'docx'])
const EXCEL_EXTENSIONS = new Set(['xls', 'xlsx'])
const PDF_EXTENSION = 'pdf'

function docMatchesFilter(doc: PropertyDocument, filter: FilterType): boolean {
  switch (filter) {
    case 'pdf': return doc.fileExtension === PDF_EXTENSION
    case 'images': return IMAGE_EXTENSIONS.has(doc.fileExtension)
    case 'word': return WORD_EXTENSIONS.has(doc.fileExtension)
    case 'excel': return EXCEL_EXTENSIONS.has(doc.fileExtension)
    case 'other': return !IMAGE_EXTENSIONS.has(doc.fileExtension) && !WORD_EXTENSIONS.has(doc.fileExtension) && !EXCEL_EXTENSIONS.has(doc.fileExtension) && doc.fileExtension !== PDF_EXTENSION
    default: return true
  }
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function PaperclipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}

function FileIcon({ ext }: { ext: string }) {
  const size = 20
  if (IMAGE_EXTENSIONS.has(ext)) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
  }
  if (ext === 'pdf') {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
}

function ActionMenu({ onOpen, onDownload, onRename, onEditNotes, onDelete }: {
  onOpen: () => void; onDownload: () => void; onRename: () => void; onEditNotes: () => void; onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const actions = [
    { label: 'Open', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>, onClick: onOpen },
    { label: 'Download', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>, onClick: onDownload },
    { label: 'Rename', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>, onClick: onRename },
    { label: 'Edit Notes', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>, onClick: onEditNotes },
    { label: 'Delete', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>, onClick: onDelete, danger: true },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(!open)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>
      </Button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', right: 0, top: '100%', zIndex: 101,
            background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 160, padding: 4,
          }}>
            {actions.map(a => (
              <button
                key={a.label}
                onClick={() => { setOpen(false); a.onClick() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 12px', border: 'none', background: 'none',
                  cursor: 'pointer', fontSize: 13, borderRadius: 6,
                  color: (a as any).danger ? '#EF4444' : '#374151',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function PropertyDocuments({
  propDocuments = [], setPropDocuments, properties = [],
  dateFormat = 'DD/MM/YYYY', currentUser = 'User',
}: Props) {
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortKey, setSortKey] = useState<SortKey>('uploadDate')
  const [sortAsc, setSortAsc] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [previewDoc, setPreviewDoc] = useState<PropertyDocument | null>(null)
  const [previewDataUrl, setPreviewDataUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  const [renameDoc, setRenameDoc] = useState<PropertyDocument | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const [notesDoc, setNotesDoc] = useState<PropertyDocument | null>(null)
  const [notesValue, setNotesValue] = useState('')

  const [deleteDoc, setDeleteDoc] = useState<PropertyDocument | null>(null)

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type })
  }

  const documents = useMemo(() => {
    if (!selectedPropertyId) return []
    return getDocumentsByProperty(selectedPropertyId)
  }, [selectedPropertyId, propDocuments])

  const filteredSorted = useMemo(() => {
    let result = documents

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(d =>
        d.fileName.toLowerCase().includes(q) ||
        d.originalFileName.toLowerCase().includes(q) ||
        d.notes.toLowerCase().includes(q) ||
        d.fileExtension.toLowerCase().includes(q)
      )
    }

    result = result.filter(d => docMatchesFilter(d, filterType))

    result.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'uploadDate': cmp = a.uploadDate.localeCompare(b.uploadDate); break
        case 'fileName': cmp = a.fileName.localeCompare(b.fileName); break
        case 'fileSize': cmp = a.fileSize - b.fileSize; break
        case 'fileExtension': cmp = a.fileExtension.localeCompare(b.fileExtension); break
      }
      return sortAsc ? cmp : -cmp
    })

    return result
  }, [documents, searchQuery, filterType, sortKey, sortAsc])

  const handleUpload = async () => {
    if (!window.api?.openFileDialog) {
      // Browser fallback
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = true
      input.onchange = async (e) => {
        const fileList = Array.from((e.target as HTMLInputElement).files || [])
        if (fileList.length === 0) return
        
        setUploading(true)
        let successCount = 0
        const SUPPORTED = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'jpg', 'jpeg', 'png', 'webp'])
        for (const file of fileList) {
          const ext = file.name.split('.').pop()?.toLowerCase() || ''
          if (!SUPPORTED.has(ext)) continue
          try {
            const buffer = await file.arrayBuffer()
            const result = await addFileFromBuffer(
              { name: file.name, size: file.size, buffer },
              selectedPropertyId,
              currentUser,
            )
            if (result.success) successCount++
          } catch {}
        }
    
        if (successCount > 0) {
          showToast(`${successCount} file(s) uploaded successfully`, 'success')
          if (setPropDocuments) {
            setPropDocuments(getDocumentsByProperty(selectedPropertyId))
          }
        } else {
          showToast('Upload failed or no valid files', 'error')
        }
        setUploading(false)
      }
      input.click()
      return
    }

    const files = await openFileDialog()
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const result = await addDocuments(files, selectedPropertyId, currentUser)
      if (result.success) {
        showToast(`${result.docs.length} file(s) uploaded successfully`, 'success')
        if (setPropDocuments) {
          setPropDocuments(getDocumentsByProperty(selectedPropertyId))
        }
      } else {
        showToast(result.error || 'Upload failed', 'error')
      }
    } catch {
      showToast('Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (!selectedPropertyId) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    setUploading(true)
    let successCount = 0
    const SUPPORTED = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'jpg', 'jpeg', 'png', 'webp'])
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      if (!SUPPORTED.has(ext)) continue
      try {
        const buffer = await file.arrayBuffer()
        const result = await addFileFromBuffer(
          { name: file.name, size: file.size, buffer },
          selectedPropertyId,
          currentUser,
        )
        if (result.success) successCount++
      } catch {}
    }

    if (successCount > 0) {
      showToast(`${successCount} file(s) uploaded successfully`, 'success')
      if (setPropDocuments) {
        setPropDocuments(getDocumentsByProperty(selectedPropertyId))
      }
    }
    setUploading(false)
  }

  const handleDelete = async () => {
    if (!deleteDoc) return
    const result = await deleteDocument(deleteDoc)
    if (result.success) {
      showToast('Document deleted', 'success')
      if (setPropDocuments) {
        setPropDocuments(getDocumentsByProperty(selectedPropertyId))
      }
    } else {
      showToast('Delete failed', 'error')
    }
    setDeleteDoc(null)
  }

  const handleRename = async () => {
    if (!renameDoc || !renameValue.trim()) return
    const result = await renameDocument(renameDoc, renameValue.trim())
    if (result.success) {
      showToast('Document renamed', 'success')
      if (setPropDocuments) {
        setPropDocuments(getDocumentsByProperty(selectedPropertyId))
      }
      setRenameDoc(null)
    } else {
      showToast(result.error || 'Rename failed', 'error')
    }
  }

  const handleSaveNotes = async () => {
    if (!notesDoc) return
    const updated = await updateDocumentNotes(notesDoc.id, notesValue)
    if (updated) {
      showToast('Notes updated', 'success')
      if (setPropDocuments) {
        setPropDocuments(getDocumentsByProperty(selectedPropertyId))
      }
      setNotesDoc(null)
    }
  }

  const handlePreview = async (doc: PropertyDocument) => {
    setPreviewDoc(doc)
    setPreviewLoading(true)
    setPreviewDataUrl('')
    try {
      const result = await window.api.readFilePreview(doc.storagePath)
      if (result.success && result.dataUrl) {
        setPreviewDataUrl(result.dataUrl)
      } else {
        setPreviewDataUrl('')
      }
    } catch {
      setPreviewDataUrl('')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleDownload = async (doc: PropertyDocument) => {
    try {
      const result = await window.api.readFilePreview(doc.storagePath)
      if (result.success && result.dataUrl) {
        const a = document.createElement('a')
        a.href = result.dataUrl
        a.download = doc.originalFileName || doc.fileName
        a.click()
      } else {
        await window.api.openFileInOs(doc.storagePath)
      }
    } catch {}
  }

  const handleOpen = async (doc: PropertyDocument) => {
    await window.api.openFileInOs(doc.storagePath)
  }

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'pdf', label: 'PDF' },
    { value: 'images', label: 'Images' },
    { value: 'word', label: 'Word' },
    { value: 'excel', label: 'Excel' },
    { value: 'other', label: 'Other' },
  ]

  const canPreview = (doc: PropertyDocument) =>
    doc.fileExtension === 'pdf' || IMAGE_EXTENSIONS.has(doc.fileExtension)

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Documents</div>
            <div className="page-subtitle">
              {selectedPropertyId
                ? `${filteredSorted.length} document(s) for selected property`
                : 'Select a property to manage documents'}
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="data-table-toolbar" style={{ marginBottom: 16 }}>
          <div className="data-table-filters" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="input"
              style={{ minWidth: 200 }}
              value={selectedPropertyId}
              onChange={e => setSelectedPropertyId(e.target.value)}
            >
              <option value="">-- Select Property --</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              className="input"
              style={{ minWidth: 110 }}
              value={filterType}
              onChange={e => setFilterType(e.target.value as FilterType)}
            >
              {filterOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <select
              className="input"
              style={{ minWidth: 120 }}
              value={sortAsc ? `${sortKey}-asc` : sortKey}
              onChange={e => {
                const val = e.target.value
                if (val.endsWith('-asc')) {
                  setSortKey(val.replace('-asc', '') as SortKey)
                  setSortAsc(true)
                } else {
                  setSortKey(val as SortKey)
                  setSortAsc(false)
                }
              }}
            >
              <option value="uploadDate">Newest</option>
              <option value="uploadDate-asc">Oldest</option>
              <option value="fileName">Name</option>
              <option value="fileSize">Size</option>
              <option value="fileExtension">Type</option>
            </select>

            {selectedPropertyId && (
              <Button variant="primary" size="sm" onClick={handleUpload} loading={uploading}>
                <PaperclipIcon /> Upload
              </Button>
            )}
          </div>

          <div className="data-table-search">
            <SearchIcon />
            <input
              type="text"
              className="data-table-search-input"
              placeholder="Search files..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="data-table-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear">
                <CloseIcon />
              </button>
            )}
          </div>
        </div>

        {selectedPropertyId && (
          <div
            className={`drag-drop-zone${dragOver ? ' drag-over' : ''}${uploading ? ' uploading' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? 'var(--primary)' : '#D1D5DB'}`,
              borderRadius: 12, padding: '20px', textAlign: 'center',
              marginBottom: 16, cursor: 'pointer',
              background: dragOver ? 'var(--primary-bg)' : '#F9FAFB',
              transition: 'all 0.2s',
            }}
            onClick={handleUpload}
          >
            <UploadIcon />
            <div style={{ marginTop: 4, fontSize: 14, color: '#6B7280' }}>
              {uploading ? 'Uploading...' : dragOver ? 'Drop files here' : 'Drag & drop files or click to upload'}
            </div>
          </div>
        )}

        <div className="card card-table">
          <div className="card-body" style={{ padding: 0 }}>
            {!selectedPropertyId ? (
              <div style={{ padding: '60px 20px' }}>
                <EmptyState
                  icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
                  title="Select a Property"
                  text="Choose a property from the dropdown above to view and manage its documents."
                />
              </div>
            ) : filteredSorted.length === 0 ? (
              <div style={{ padding: '60px 20px' }}>
                <EmptyState
                  icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>}
                  title="No documents uploaded"
                  text={searchQuery || filterType !== 'all' ? 'Try adjusting your search or filters' : 'Upload documents using the button above or drag & drop files here.'}
                  action={!searchQuery && filterType === 'all' ? (
                    <Button variant="primary" size="sm" onClick={handleUpload}><PaperclipIcon /> Upload Documents</Button>
                  ) : undefined}
                />
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '35%' }}>Document Name</th>
                      <th style={{ width: '10%' }}>Type</th>
                      <th style={{ width: '10%' }} className="numeric">Size</th>
                      <th style={{ width: '15%' }}>Uploaded Date</th>
                      <th style={{ width: '12%' }}>Uploaded By</th>
                      <th style={{ width: '13%' }}>Notes</th>
                      <th style={{ width: '5%' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSorted.map(doc => (
                      <tr key={doc.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ color: FILE_TYPE_COLORS[doc.fileExtension] === 'danger' ? '#EF4444' : '#6B7280' }}>
                              <FileIcon ext={doc.fileExtension} />
                            </span>
                            <span
                              className="fw-500 text-sm"
                              style={{ cursor: 'pointer', color: 'var(--link)' }}
                              onClick={() => canPreview(doc) ? handlePreview(doc) : handleDownload(doc)}
                            >
                              {doc.fileName}
                            </span>
                          </div>
                        </td>
                        <td>
                          <Badge variant={FILE_TYPE_COLORS[doc.fileExtension] || 'neutral'}>
                            {doc.fileExtension.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="numeric text-secondary text-xs">{formatFileSize(doc.fileSize)}</td>
                        <td><span className="text-secondary text-xs">{formatDate(doc.uploadDate, dateFormat)}</span></td>
                        <td><span className="text-secondary text-xs">{doc.uploadedBy}</span></td>
                        <td>
                          <span className="text-secondary text-xs" style={{
                            maxWidth: 150, display: 'inline-block',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {doc.notes || '-'}
                          </span>
                        </td>
                        <td>
                          <ActionMenu
                            onOpen={() => handleOpen(doc)}
                            onDownload={() => handleDownload(doc)}
                            onRename={() => { setRenameDoc(doc); setRenameValue(doc.fileName.replace(/\.[^.]+$/, '')) }}
                            onEditNotes={() => { setNotesDoc(doc); setNotesValue(doc.notes) }}
                            onDelete={() => setDeleteDoc(doc)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteDoc !== null}
        title="Delete Document"
        message={
          <span>
            Are you sure you want to delete <strong>{deleteDoc?.fileName}</strong>?<br />
            This will permanently remove the file and its metadata.
          </span>
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDoc(null)}
      />

      <PreviewModal
        doc={previewDoc}
        dataUrl={previewDataUrl}
        loading={previewLoading}
        onClose={() => { setPreviewDoc(null); setPreviewDataUrl('') }}
        onDownload={handleDownload}
        onOpen={handleOpen}
      />

      <RenameModal
        doc={renameDoc}
        value={renameValue}
        onChange={setRenameValue}
        onSave={handleRename}
        onClose={() => setRenameDoc(null)}
      />

      <NotesModal
        doc={notesDoc}
        value={notesValue}
        onChange={setNotesValue}
        onSave={handleSaveNotes}
        onClose={() => setNotesDoc(null)}
      />
    </>
  )
}

function PreviewModal({ doc, dataUrl, loading, onClose, onDownload, onOpen }: {
  doc: PropertyDocument | null
  dataUrl: string
  loading: boolean
  onClose: () => void
  onDownload: (doc: PropertyDocument) => void
  onOpen: (doc: PropertyDocument) => void
}) {
  if (!doc) return null
  const isImage = IMAGE_EXTENSIONS.has(doc.fileExtension)
  const isPdf = doc.fileExtension === 'pdf'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 800, width: '90vw', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{doc.fileName}</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body" style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
          {loading ? (
            <div style={{ color: '#9CA3AF' }}>Loading preview...</div>
          ) : dataUrl && isImage ? (
            <img src={dataUrl} alt={doc.fileName} style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }} />
          ) : dataUrl && isPdf ? (
            <iframe src={dataUrl} title={doc.fileName} style={{ width: '100%', height: '60vh', border: 'none' }} />
          ) : (
            <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>
              <FileIcon ext={doc.fileExtension} />
              <div style={{ marginTop: 12, fontSize: 14 }}>Preview not available</div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
                <Button variant="primary" size="sm" onClick={() => onOpen(doc)}>Open in App</Button>
                <Button variant="secondary" size="sm" onClick={() => onDownload(doc)}>Download</Button>
              </div>
            </div>
          )}
        </div>
        {(dataUrl || loading) && (
          <div className="modal-footer">
            <Button variant="secondary" size="sm" onClick={() => onOpen(doc)}>Open in App</Button>
            <Button variant="primary" size="sm" onClick={() => onDownload(doc)}>Download</Button>
          </div>
        )}
      </div>
    </div>
  )
}

function RenameModal({ doc, value, onChange, onSave, onClose }: {
  doc: PropertyDocument | null
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onClose: () => void
}) {
  if (!doc) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Rename Document</div>
          <button className="modal-close" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>
        <div className="modal-body">
          <Input
            label="File Name"
            value={value}
            onChange={e => onChange(e.target.value)}
            hint={`Extension (.${doc.fileExtension}) will be preserved`}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') onSave() }}
          />
        </div>
        <div className="modal-footer">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={onSave} disabled={!value.trim()}>Save</Button>
        </div>
      </div>
    </div>
  )
}

function NotesModal({ doc, value, onChange, onSave, onClose }: {
  doc: PropertyDocument | null
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onClose: () => void
}) {
  if (!doc) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Edit Notes</div>
          <button className="modal-close" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Notes for {doc.fileName}</label>
            <textarea
              className="input"
              style={{ minHeight: 100, resize: 'vertical' }}
              value={value}
              onChange={e => onChange(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="modal-footer">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={onSave}>Save</Button>
        </div>
      </div>
    </div>
  )
}
