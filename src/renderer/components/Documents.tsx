import React, { useState, useMemo } from 'react'
import type { Profile } from '../data/sampleData'
import type { PropertyTenant } from '../data/propertyData'
import Toast from './Toast'
import { formatDate, t } from '../utils'

interface Props {
  profile: Profile
  dateFormat?: string
  language?: string
  documents: DocItem[]
  setDocuments: React.Dispatch<React.SetStateAction<DocItem[]>>
  tenants?: PropertyTenant[]
}

export interface DocItem {
  name: string
  type: string
  date: string
  size: string
  icon: string
  source?: string
}

export const defaultDocuments: DocItem[] = [
  { name: 'Gold Certificate - Bullion 500g.pdf', type: 'PDF', date: '2024-01-15', size: '2.4 MB', icon: '📄' },
  { name: 'Bond Agreement - UAE 2029.pdf', type: 'PDF', date: '2024-03-10', size: '1.8 MB', icon: '📄' },
  { name: 'Bank Statement - June 2024.pdf', type: 'PDF', date: '2024-07-01', size: '856 KB', icon: '📄' },
  { name: 'Property Deed - Emaar Hills.pdf', type: 'PDF', date: '2024-05-12', size: '4.2 MB', icon: '📄' },
  { name: 'Investment Portfolio Snapshot.xlsx', type: 'Excel', date: '2024-06-30', size: '1.1 MB', icon: '📊' },
  { name: 'Sukuk Certificate - Al-Ijarah.pdf', type: 'PDF', date: '2024-04-05', size: '1.5 MB', icon: '📄' },
  { name: 'Silver Vault Receipt.jpg', type: 'Image', date: '2024-02-20', size: '3.6 MB', icon: '🖼️' },
]

const TYPE_ORDER = ['PDF', 'Excel', 'Image', 'Word', 'Other', 'Contract']
const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  PDF: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444' },
  Excel: { bg: 'rgba(46,139,87,0.1)', color: 'var(--green)' },
  Image: { bg: 'rgba(99,102,241,0.1)', color: '#6366F1' },
  Word: { bg: 'rgba(37,99,235,0.1)', color: '#2563EB' },
  Other: { bg: 'rgba(107,114,128,0.1)', color: '#6B7280' },
  Contract: { bg: 'rgba(212,175,55,0.1)', color: 'var(--gold)' },
}

function sizeFromBase64(data: string): string {
  const bytes = (data.length * 3) / 4 - (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0)
  const kb = bytes / 1024
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`
}

function mimeToType(mime: string): string {
  if (mime.startsWith('image/')) return 'Image'
  if (mime === 'application/pdf') return 'PDF'
  if (mime.includes('spreadsheet') || mime.includes('excel')) return 'Excel'
  if (mime.includes('word') || mime.includes('document')) return 'Word'
  return 'Other'
}

export default function Documents({ profile, dateFormat = 'DD/MM/YYYY', language = 'English', documents, setDocuments, tenants }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [collapsed, setCollapsed] = useState<string[]>([])
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const allDocs = useMemo(() => {
    const contractDocs: DocItem[] = (tenants || []).flatMap(t =>
      t.contractFile ? [{
        name: t.contractFile.name,
        type: 'Contract',
        date: t.leaseStart || '',
        size: sizeFromBase64(t.contractFile.data),
        icon: '📋',
        source: `Tenant: ${t.name}`,
      }] : []
    )
    return [...documents, ...contractDocs]
  }, [documents, tenants])

  const grouped = useMemo(() => {
    const map: Record<string, DocItem[]> = {}
    const seen = new Set<string>()
    allDocs.forEach(doc => {
      if (seen.has(doc.name)) return
      seen.add(doc.name)
      const key = doc.type
      if (!map[key]) map[key] = []
      map[key].push(doc)
    })
    return TYPE_ORDER
      .filter(key => map[key])
      .map(key => ({ category: key, items: map[key] }))
      .concat(
        Object.keys(map)
          .filter(k => !TYPE_ORDER.includes(k))
          .map(key => ({ category: key, items: map[key] }))
      )
  }, [allDocs])

  const handleUpload = () => {
    setUploading(true)
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.xlsx,.xls,.jpg,.jpeg,.png,.doc,.docx'
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0]
      if (file) {
        const ext = file.name.split('.').pop()?.toUpperCase() || ''
        const typeMap: Record<string, string> = { PDF: 'PDF', XLSX: 'Excel', XLS: 'Excel', JPG: 'Image', JPEG: 'Image', PNG: 'Image', DOC: 'Word', DOCX: 'Word' }
        const type = typeMap[ext] || 'Other'
        const iconMap: Record<string, string> = { PDF: '📄', Excel: '📊', Image: '🖼️', Word: '📝', Other: '📎' }
        const newDoc: DocItem = {
          name: file.name,
          type,
          date: new Date().toISOString().split('T')[0],
          size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
          icon: iconMap[type] || '📎',
        }
        setDocuments(prev => [newDoc, ...prev])
      }
      setUploading(false)
    }
    input.click()
  }

  const toggleCollapse = (cat: string) => {
    setCollapsed(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  return (
    <div className="main-content">
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />
      <div className="main-header">
        <div>
          <h1>{t('documents', language)}</h1>
          <p>{t('manageDocs', language)}</p>
        </div>
        <div className="header-actions">
          <button className="header-btn" onClick={handleUpload} title="Upload Document" aria-label="Upload Document">{uploading ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="14" x2="12" y2="18"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}</button>
        </div>
      </div>

      <div className="scroll-content">
        <div style={{ display: 'grid', gridTemplateColumns: preview ? '1fr 380px' : '1fr', gap: 20 }}>
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">All Documents</div>
              <div className="chart-subtitle">{allDocs.length} files</div>
            </div>
            {grouped.map(group => {
              const tc = TYPE_COLORS[group.category]
              const isCollapsed = collapsed.includes(group.category)
              return (
                <div key={group.category} style={{ marginBottom: 4 }}>
                  <div
                    onClick={() => toggleCollapse(group.category)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px',
                      cursor: 'pointer', borderRadius: 6,
                      fontSize: 12, fontWeight: 600, color: tc?.color || 'var(--text-secondary)',
                      background: tc?.bg || 'transparent',
                    }}
                  >
                    <span style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.2s', fontSize: 10 }}>▼</span>
                    {group.category} ({group.items.length})
                  </div>
                  {!isCollapsed && group.items.map((doc, i) => (
                    <div
                      key={doc.name}
                      onClick={() => setPreview(preview === doc.name ? null : doc.name)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px 10px 24px',
                        borderBottom: i < group.items.length - 1 ? '1px solid var(--border)' : 'none',
                        cursor: 'pointer', borderRadius: 6,
                        background: preview === doc.name ? 'var(--bg-secondary)' : 'transparent',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { if (preview !== doc.name) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                      onMouseLeave={e => { if (preview !== doc.name) e.currentTarget.style.background = 'transparent' }}
                    >
                      <span style={{ fontSize: 20 }}>{doc.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {doc.date ? formatDate(doc.date, dateFormat) + ' · ' : ''}{doc.size}
                          {doc.source && <span style={{ marginLeft: 6, opacity: 0.7 }}>({doc.source})</span>}
                        </div>
                      </div>
                      <span style={{
                        padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600,
                        background: tc?.bg || 'rgba(107,114,128,0.1)',
                        color: tc?.color || '#6B7280',
                      }}>{doc.type}</span>
                      <button className="header-btn" style={{ width: 32, height: 32 }} onClick={async e => {
                        e.stopPropagation()
                        const api = (window as any).api
                        if (api?.saveFile) {
                          const content = `${doc.name}\nType: ${doc.type}\nSize: ${doc.size}\nDate: ${doc.date}\n\n---\nThis document was exported from InsAcc on ${new Date().toLocaleString()}.\n`
                          const savedPath = await api.saveFile(doc.name, content)
                          setToast({ visible: true, message: `Saved to Downloads`, type: 'success' })
                        } else {
                          setToast({ visible: true, message: 'Download available in desktop app', type: 'error' })
                        }
                      }} aria-label="Download document"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
                    </div>
                  ))}
                </div>
              )
            })}
            {allDocs.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>No documents yet</div>
            )}
          </div>

          {preview && (
            <div className="chart-card">
              <div className="chart-header">
                <div className="chart-title">Preview</div>
              </div>
              <div style={{
                background: 'var(--bg-secondary)', borderRadius: 8, padding: 32, textAlign: 'center',
                color: 'var(--text-secondary)', fontSize: 14, border: '2px dashed var(--border)', minHeight: 300,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{preview}</div>
                <div style={{ fontSize: 12 }}>Preview not available in demo mode</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
