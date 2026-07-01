import React, { useState, useMemo, useCallback, useRef } from 'react'
import type { Profile } from '../data/sampleData'

import type { Investment } from '../components/Investments'
import type { Transaction } from '../components/Transactions'
import type { PurchaseRecord } from '../data/purchaseLedger'
import type { BankAccount } from '../data/banking'
import type { AuditEvent } from '../data/auditTypes'
import { recordModuleEvent } from '../services/auditService'
import Toast from './Toast'
import { formatDate, t } from '../utils'
import { Button, Input, Select, Badge, Card, EmptyState, UploadIcon, DownloadIcon, EditIcon, TrashIcon, PlusIcon, SearchIcon, CloseIcon, FilterIcon } from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
import ConfirmDialog from './design/ConfirmDialog'
import EntityForm from './design/EntityForm'

export interface DocItem {
  id: string
  title: string
  description: string
  fileName: string
  fileSize: number
  fileType: string
  mimeType: string
  data: string
  uploadDate: string
  lastModified: string
  tags: string[]
  notes: string
  linkedType: 'investment' | 'transaction' | 'purchase' | 'bank' | 'property' | ''
  linkedId: string
}

interface Props {
  profile: Profile
  currency?: string
  dateFormat?: string
  language?: string
  documents: DocItem[]
  setDocuments: React.Dispatch<React.SetStateAction<DocItem[]>>
  tenants?: any[]
  investments?: Investment[]
  transactions?: Transaction[]
  purchaseRecords?: PurchaseRecord[]
  bankAccounts?: BankAccount[]
  onAuditEvent?: (event: AuditEvent) => void
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp']
const MAX_FILE_SIZE = 20 * 1024 * 1024
const FILE_TYPE_OPTIONS = ['All', 'PDF', 'Image']
const LINKED_MODULE_OPTIONS = [
  { value: '', label: 'All Modules' },
  { value: 'investment', label: 'Investment' },
  { value: 'transaction', label: 'Transaction' },
  { value: 'purchase', label: 'Purchase Ledger' },
  { value: 'bank', label: 'Bank Account' },
] as const

let _docCounter = 0

function nextDocId(): string {
  _docCounter++
  return `DOC-${String(_docCounter).padStart(4, '0')}`
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

function mimeToFileType(mime: string): string {
  if (mime.startsWith('image/')) return 'Image'
  if (mime === 'application/pdf') return 'PDF'
  return 'Other'
}

export const defaultDocuments: DocItem[] = []

function resolveLinkedName(
  doc: DocItem,
  investments?: Investment[],
  transactions?: Transaction[],
  purchaseRecords?: PurchaseRecord[],
  bankAccounts?: BankAccount[],
): string | null {
  if (!doc.linkedType || !doc.linkedId) return null
  switch (doc.linkedType) {
    case 'investment':
      return investments?.find(i => i.id === doc.linkedId)?.assetName || null
    case 'transaction':
      return transactions?.find(t => t.id === doc.linkedId)?.category || null
    case 'purchase':
      return purchaseRecords?.find(p => p.id === doc.linkedId)?.assetName || null
    case 'bank':
      return bankAccounts?.find(b => b.id === doc.linkedId)?.accountName || null
    default:
      return null
  }
}

function getLinkedEntityOptions(
  linkedType: string,
  investments?: Investment[],
  transactions?: Transaction[],
  purchaseRecords?: PurchaseRecord[],
  bankAccounts?: BankAccount[],
): { value: string; label: string }[] {
  switch (linkedType) {
    case 'investment':
      return (investments || []).map(i => ({ value: i.id, label: `${i.assetName} (${i.type})` }))
    case 'transaction':
      return (transactions || []).map(t => ({ value: t.id, label: `TXN ${t.id} - ${t.category} (${t.type})` }))
    case 'purchase':
      return (purchaseRecords || []).map(p => ({ value: p.id, label: `${p.assetName} (${p.assetType})` }))
    case 'bank':
      return (bankAccounts || []).map(b => ({ value: b.id, label: `${b.accountName} @ ${b.institution}` }))
    default:
      return []
  }
}

export default function Documents({
  profile, dateFormat = 'DD/MM/YYYY', language = 'English',
  documents, setDocuments, tenants,
  investments, transactions, purchaseRecords, bankAccounts,
  onAuditEvent,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [moduleFilter, setModuleFilter] = useState('')
  const [previewDoc, setPreviewDoc] = useState<DocItem | null>(null)
  const [previewZoom, setPreviewZoom] = useState(1)
  const [editTarget, setEditTarget] = useState<DocItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [linkTarget, setLinkTarget] = useState<DocItem | null>(null)
  const [linkFormType, setLinkFormType] = useState('')
  const [linkFormEntity, setLinkFormEntity] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editFormTitle, setEditFormTitle] = useState('')
  const [editFormDescription, setEditFormDescription] = useState('')
  const [editFormTags, setEditFormTags] = useState('')
  const [editFormNotes, setEditFormNotes] = useState('')

  const contractDocs = useMemo(() => {
    if (!tenants) return []
    return tenants.flatMap(t =>
      t.contractFile ? [{
        id: nextDocId(),
        title: `Contract - ${t.name}`,
        description: `Lease contract for ${t.name}`,
        fileName: t.contractFile.name,
        fileSize: (t.contractFile.data.length * 3) / 4,
        fileType: 'Contract',
        mimeType: 'application/pdf',
        data: t.contractFile.data,
        uploadDate: t.leaseStart || new Date().toISOString().split('T')[0],
        lastModified: new Date().toISOString(),
        tags: ['contract', 'lease'],
        notes: '',
        linkedType: 'property' as const,
        linkedId: t.id,
      }] : []
    )
  }, [tenants])

  const allDocs = useMemo(() => {
    return [...documents, ...contractDocs]
  }, [documents, contractDocs])

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files)
    for (const file of fileArr) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setToast({ visible: true, message: `Unsupported file type: ${ext}`, type: 'error' })
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        setToast({ visible: true, message: `${file.name} exceeds 20 MB limit`, type: 'error' })
        continue
      }
      const dup = documents.find(d => d.fileName === file.name && d.fileSize === file.size)
      if (dup) {
        setToast({ visible: true, message: `Duplicate: ${file.name}`, type: 'error' })
        continue
      }

      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      const base64 = btoa(binary)

      const newDoc: DocItem = {
        id: nextDocId(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        description: '',
        fileName: file.name,
        fileSize: file.size,
        fileType: mimeToFileType(file.type),
        mimeType: file.type,
        data: base64,
        uploadDate: new Date().toISOString().split('T')[0],
        lastModified: new Date().toISOString(),
        tags: [],
        notes: '',
        linkedType: '',
        linkedId: '',
      }
      setDocuments(prev => [newDoc, ...prev])
      onAuditEvent?.(recordModuleEvent('Documents', 'Upload', newDoc.title, newDoc.id, `Uploaded ${file.name} (${formatFileSize(file.size)})`))
    }
    setToast({ visible: true, message: `${fileArr.length} file(s) uploaded`, type: 'success' })
  }, [documents, setDocuments, onAuditEvent])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleBrowseUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
      e.target.value = ''
    }
  }, [handleFiles])

  const handleDownload = useCallback((doc: DocItem) => {
    const byteChars = atob(doc.data)
    const byteNums = new Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i)
    }
    const byteArr = new Uint8Array(byteNums)
    const blob = new Blob([byteArr], { type: doc.mimeType || 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = doc.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setToast({ visible: true, message: 'Download started', type: 'success' })
  }, [])

  const handleOpenPreviewWindow = useCallback((doc: DocItem) => {
    const byteChars = atob(doc.data)
    const byteNums = new Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i)
    }
    const byteArr = new Uint8Array(byteNums)
    const blob = new Blob([byteArr], { type: doc.mimeType || 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }, [])

  const openEdit = useCallback((doc: DocItem) => {
    setEditTarget(doc)
    setEditFormTitle(doc.title)
    setEditFormDescription(doc.description)
    setEditFormTags(doc.tags.join(', '))
    setEditFormNotes(doc.notes)
  }, [])

  const saveEdit = useCallback(() => {
    if (!editTarget) return
    const updated = editTarget
    updated.title = editFormTitle.trim()
    updated.description = editFormDescription.trim()
    updated.tags = editFormTags.split(',').map(t => t.trim()).filter(Boolean)
    updated.notes = editFormNotes.trim()
    updated.lastModified = new Date().toISOString()
    setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d))
    setEditTarget(null)
    setToast({ visible: true, message: 'Document updated', type: 'success' })
  }, [editTarget, editFormTitle, editFormDescription, editFormTags, editFormNotes, setDocuments])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    const deleted = documents.find(d => d.id === deleteTarget)
    setDocuments(prev => prev.filter(d => d.id !== deleteTarget))
    setDeleteTarget(null)
    if (previewDoc?.id === deleteTarget) setPreviewDoc(null)
    if (deleted) {
      onAuditEvent?.(recordModuleEvent('Documents', 'Delete', deleted.title, deleted.id, `Deleted ${deleted.fileName}`))
    }
    setToast({ visible: true, message: 'Document deleted', type: 'success' })
  }, [deleteTarget, setDocuments, previewDoc, onAuditEvent, documents])

  const openLink = useCallback((doc: DocItem) => {
    setLinkTarget(doc)
    setLinkFormType(doc.linkedType || '')
    setLinkFormEntity(doc.linkedId || '')
  }, [])

  const saveLink = useCallback(() => {
    if (!linkTarget) return
    setDocuments(prev => prev.map(d =>
      d.id === linkTarget.id ? { ...d, linkedType: linkFormType as DocItem['linkedType'], linkedId: linkFormEntity } : d
    ))
    setLinkTarget(null)
    setToast({ visible: true, message: 'Document link updated', type: 'success' })
  }, [linkTarget, linkFormType, linkFormEntity, setDocuments])

  const filtered = useMemo(() => {
    let result = allDocs
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.fileName.toLowerCase().includes(q) ||
        d.tags.some(t => t.toLowerCase().includes(q)) ||
        (resolveLinkedName(d, investments, transactions, purchaseRecords, bankAccounts) || '').toLowerCase().includes(q)
      )
    }
    if (typeFilter !== 'All') {
      result = result.filter(d => d.fileType === typeFilter)
    }
    if (moduleFilter) {
      result = result.filter(d => d.linkedType === moduleFilter)
    }
    return result
  }, [allDocs, searchQuery, typeFilter, moduleFilter, investments, transactions, purchaseRecords, bankAccounts])

  const tagList = useMemo(() => {
    const set = new Set<string>()
    allDocs.forEach(d => d.tags.forEach(t => set.add(t)))
    return [...set].sort()
  }, [allDocs])

  const columns: Column<DocItem>[] = useMemo(() => [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: doc => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`doc-icon doc-icon-${doc.fileType.toLowerCase()}`}>
            {doc.fileType === 'PDF' ? '📄' : doc.fileType === 'Image' ? '🖼️' : '📎'}
          </span>
          <div>
            <div className="doc-title">{doc.title}</div>
            <div className="doc-filename">{doc.fileName}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'fileType',
      header: 'Type',
      sortable: true,
      width: '80px',
      render: doc => (
        <Badge variant={doc.fileType === 'PDF' ? 'warning' : 'primary'}>{doc.fileType}</Badge>
      ),
    },
    {
      key: 'fileSize',
      header: 'Size',
      sortable: true,
      numeric: true,
      width: '90px',
      render: doc => <span className="text-secondary">{formatFileSize(doc.fileSize)}</span>,
    },
    {
      key: 'uploadDate',
      header: 'Date',
      sortable: true,
      width: '120px',
      render: doc => <span className="text-secondary">{formatDate(doc.uploadDate, dateFormat)}</span>,
    },
    {
      key: 'linkedType',
      header: 'Linked To',
      sortable: true,
      width: '180px',
      render: doc => {
        const name = resolveLinkedName(doc, investments, transactions, purchaseRecords, bankAccounts)
        if (!name) return <span className="text-muted">—</span>
        return (
          <div>
            <Badge variant="success">{doc.linkedType}</Badge>
            <div className="doc-linked-name">{name}</div>
          </div>
        )
      },
    },
    {
      key: 'actions',
      header: '',
      width: '160px',
      render: doc => (
        <div className="doc-actions">
          <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setPreviewDoc(previewDoc?.id === doc.id ? null : doc) }} aria-label="Preview">
            👁️
          </Button>
          <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); openLink(doc) }} aria-label="Link">
            🔗
          </Button>
          <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); handleDownload(doc) }} aria-label="Download">
            <DownloadIcon />
          </Button>
          <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); openEdit(doc) }} aria-label="Edit">
            <EditIcon />
          </Button>
          <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setDeleteTarget(doc.id) }} aria-label="Delete">
            <TrashIcon />
          </Button>
        </div>
      ),
    },
  ], [dateFormat, previewDoc, investments, transactions, purchaseRecords, bankAccounts, handleDownload, openEdit, openLink])

  const emptyState = (
    <EmptyState
      icon={
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      }
      title="No documents yet"
      text="Upload your first document using the Upload button or drag & drop files here"
      action={
        <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()}>
          <PlusIcon /> Upload Document
        </Button>
      }
    />
  )

  const filterBar = (
    <div className="filter-bar" style={{ padding: 0 }}>
      {FILE_TYPE_OPTIONS.map(f => (
        <Button key={f} variant={typeFilter === f ? 'primary' : 'secondary'} size="sm" onClick={() => setTypeFilter(f)}>
          {f}
        </Button>
      ))}
      <Select
        value={moduleFilter}
        onChange={e => setModuleFilter(e.target.value)}
        options={[...LINKED_MODULE_OPTIONS]}
        className="doc-filter-select"
      />
    </div>
  )

  return (
    <div className="main-content">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <EntityForm
        open={editTarget !== null}
        title="Edit Document"
        submitLabel="Save"
        onCancel={() => setEditTarget(null)}
        onSubmit={saveEdit}
      >
        <div className="form-row">
          <Input label="Title" value={editFormTitle} onChange={e => setEditFormTitle(e.target.value)} />
        </div>
        <div className="form-row">
          <Input label="Description" value={editFormDescription} onChange={e => setEditFormDescription(e.target.value)} />
        </div>
        <div className="form-row">
          <Input label="Tags (comma-separated)" placeholder="e.g. tax, audit, 2026" value={editFormTags} onChange={e => setEditFormTags(e.target.value)} />
        </div>
        <div className="form-row">
          <Input label="Notes" value={editFormNotes} onChange={e => setEditFormNotes(e.target.value)} />
        </div>
      </EntityForm>

      <EntityForm
        open={linkTarget !== null}
        title={linkTarget ? `Link Document: ${linkTarget.title}` : 'Link Document'}
        submitLabel="Save Link"
        onCancel={() => setLinkTarget(null)}
        onSubmit={saveLink}
      >
        <div className="form-row">
          <Select
            label="Linked Module"
            value={linkFormType}
            onChange={e => { setLinkFormType(e.target.value); setLinkFormEntity('') }}
            options={[
              { value: '', label: 'Select module' },
              { value: 'investment', label: 'Investment' },
              { value: 'transaction', label: 'Transaction' },
              { value: 'purchase', label: 'Purchase Ledger' },
              { value: 'bank', label: 'Bank Account' },
            ]}
          />
        </div>
        {linkFormType && (
          <div className="form-row">
            <Select
              label="Linked Record"
              value={linkFormEntity}
              onChange={e => setLinkFormEntity(e.target.value)}
              options={[
                { value: '', label: 'Select record' },
                ...getLinkedEntityOptions(linkFormType, investments, transactions, purchaseRecords, bankAccounts),
              ]}
            />
          </div>
        )}
      </EntityForm>

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">{t('documents', language)}</div>
            <div className="page-subtitle">{allDocs.length} document{allDocs.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div className="page-header-right">
          <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()}>
            <UploadIcon /> Upload
          </Button>
        </div>
      </div>

      <div className="page-body">
        <div
          className={`doc-upload-zone${dragOver ? ' doc-upload-zone-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadIcon />
          <span>Drag & drop files here or click to browse</span>
          <span className="doc-upload-hint">PDF, JPG, JPEG, PNG, WEBP (max 20 MB)</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            multiple
            style={{ display: 'none' }}
            onChange={handleBrowseUpload}
          />
        </div>

        <div className="doc-layout">
          <div className="doc-list">
            <DataTable<DocItem>
              columns={columns}
              data={filtered}
              keyExtractor={doc => doc.id}
              emptyState={emptyState}
              pageSize={10}
              searchable
              searchPlaceholder="Search by title, description, tags, filename, linked entity..."
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterBar={filterBar}
            />
          </div>

          {previewDoc && (
            <div className="doc-preview">
              <div className="doc-preview-header">
                <div className="doc-preview-title">{previewDoc.title}</div>
                <div className="doc-preview-actions">
                  <Button variant="ghost" size="sm" onClick={() => setPreviewZoom(z => Math.max(0.25, z - 0.25))} aria-label="Zoom out">−</Button>
                  <span className="doc-preview-zoom-label">{Math.round(previewZoom * 100)}%</span>
                  <Button variant="ghost" size="sm" onClick={() => setPreviewZoom(z => Math.min(3, z + 0.25))} aria-label="Zoom in">+</Button>
                  <Button variant="ghost" size="sm" onClick={() => setPreviewZoom(1)} aria-label="Fit">⊡</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleOpenPreviewWindow(previewDoc)} aria-label="Open in new window">↗</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setPreviewDoc(null); setPreviewZoom(1) }} aria-label="Close preview">
                    <CloseIcon />
                  </Button>
                </div>
              </div>
              <div className="doc-preview-body">
                <div className="doc-preview-content" style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top left' }}>
                  {previewDoc.fileType === 'Image' ? (
                    <img
                      src={`data:${previewDoc.mimeType};base64,${previewDoc.data}`}
                      alt={previewDoc.title}
                      className="doc-preview-image"
                    />
                  ) : previewDoc.fileType === 'PDF' ? (
                    <iframe
                      src={`data:application/pdf;base64,${previewDoc.data}`}
                      title={previewDoc.title}
                      className="doc-preview-iframe"
                    />
                  ) : (
                    <div className="doc-preview-placeholder">
                      <span className="doc-preview-placeholder-icon">📄</span>
                      <span>Preview not available for this file type</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="doc-preview-info">
                <div className="doc-preview-info-row"><span>File</span><span>{previewDoc.fileName}</span></div>
                <div className="doc-preview-info-row"><span>Size</span><span>{formatFileSize(previewDoc.fileSize)}</span></div>
                <div className="doc-preview-info-row"><span>Type</span><span>{previewDoc.fileType}</span></div>
                <div className="doc-preview-info-row"><span>Uploaded</span><span>{formatDate(previewDoc.uploadDate, dateFormat)}</span></div>
                {previewDoc.tags.length > 0 && (
                  <div className="doc-preview-info-row"><span>Tags</span><span>{previewDoc.tags.join(', ')}</span></div>
                )}
                {previewDoc.linkedType && (() => {
                  const name = resolveLinkedName(previewDoc, investments, transactions, purchaseRecords, bankAccounts)
                  return name ? (
                    <div className="doc-preview-info-row"><span>Linked To</span><span>{name}</span></div>
                  ) : null
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
