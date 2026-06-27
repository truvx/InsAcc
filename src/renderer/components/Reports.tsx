import React, { useState } from 'react'
import type { Profile } from '../data/sampleData'
import { Badge, Button } from './design/DesignSystem'
import Toast from './Toast'
import { t } from '../utils'

interface Props {
  profile: Profile
  language?: string
}

const reportCategories = [
  {
    title: 'Asset Reports',
    reports: ['Gold Report', 'Silver Report', 'Bond Report', 'Mutual Fund Report'],
  },
  {
    title: 'Banking Reports',
    reports: ['Bank Statement', 'Cash Flow Report'],
  },
  {
    title: 'Financial Reports',
    reports: ['Profit & Loss', 'Balance Sheet', 'Fund Flow Statement', 'Asset Allocation Report'],
  },
]

export default function Reports({ language = 'English' }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [exportFormat, setExportFormat] = useState('PDF')
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const handleExport = async (format: string) => {
    setExportFormat(format)
    const api = (window as any).api
    if (api?.saveFile && selected) {
      const content = `${selected}\nFormat: ${format}\nGenerated: ${new Date().toLocaleString()}\n\n---\nThis report was exported from InsAcc.\n`
      const filename = `${selected.replace(/\s+/g, '_')}.${format.toLowerCase()}`
      await api.saveFile(filename, content)
      setToast({ visible: true, message: `${selected} saved as ${format}`, type: 'success' })
    } else {
      setToast({ visible: true, message: `${selected} exported as ${format}`, type: 'success' })
    }
  }

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">{t('reports', language)}</div>
            <div className="page-subtitle">{t('generateReports', language)}</div>
          </div>
        </div>
      </div>
      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {reportCategories.map(cat => (
            <div className="card" key={cat.title}>
              <div className="card-header"><span className="card-title">{cat.title}</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {cat.reports.map(r => (
                  <Button
                    key={r}
                    variant={selected === r ? 'primary' : 'ghost'}
                    onClick={() => setSelected(r)}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    {r}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {selected && (
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-header">
              <span className="card-title">{selected}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {['PDF', 'Excel', 'CSV'].map(f => (
                  <Button key={f} variant={exportFormat === f ? 'primary' : 'secondary'} size="sm" onClick={() => handleExport(f)}>{f}</Button>
                ))}
              </div>
            </div>
            <div className="card-body">
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 40, textAlign: 'center', color: 'var(--text-secondary)', border: '2px dashed var(--border)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>Preview for {selected}</div>
                <div style={{ fontSize: 'var(--font-size-sm)' }}>Click an export format above to download</div>
              </div>
            </div>
          </div>
        )}

        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header"><span className="card-title">Report Period</span></div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">From</label>
                <input className="input" type="date" defaultValue="2024-01-01" />
              </div>
              <div className="form-group">
                <label className="form-label">To</label>
                <input className="input" type="date" defaultValue="2024-12-31" />
              </div>
              <div style={{ alignSelf: 'flex-end' }}>
                <Button variant="primary" onClick={() => setToast({ visible: true, message: 'Report period applied', type: 'success' })}>Apply</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
