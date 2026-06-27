import React, { useState } from 'react'
import type { Profile } from '../data/sampleData'
import { Badge, Button } from './design/DesignSystem'
import Toast from './Toast'
import { formatDate, t } from '../utils'

interface Props {
  profile: Profile
  currency?: string
  dateFormat?: string
  language?: string
  investments: Investment[]
  setInvestments: React.Dispatch<React.SetStateAction<Investment[]>>
  generateId: (type: string, index: number) => string
}

export interface Investment {
  id: string
  date: string
  assetName: string
  type: string
  purchaseValue: number
  quantity: number
  unitPrice: number
  broker: string
}

export function generateId(type: string, index: number): string {
  const shortForms: Record<string, string> = {
    'Gold': 'GLD', 'Silver': 'SLV', 'Bonds': 'BND', 'Sukuk': 'SUK',
    'Mutual Funds': 'MUF', 'ETF': 'ETF', 'Real Estate': 'RST',
    'Shares': 'SHR', 'Private Investment': 'PRI', 'Business Investment': 'BSN',
    'Fixed Deposit': 'FXD', 'Others': 'OTH',
  }
  const prefix = shortForms[type] || type.substring(0, 3).toUpperCase()
  return `${prefix}-${String(index).padStart(3, '0')}`
}

const ASSET_TYPES = ['Gold', 'Silver', 'Bonds', 'Sukuk', 'Mutual Funds', 'ETF', 'Shares', 'Real Estate', 'Private Investment', 'Business Investment', 'Fixed Deposit', 'Others']

export default function Investments({ currency = 'AED', dateFormat = 'DD/MM/YYYY', language = 'English', investments, setInvestments, generateId }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [formData, setFormData] = useState({
    type: 'Gold', assetName: '', purchaseValue: '', quantity: '', unitPrice: '', broker: '',
    date: new Date().toISOString().split('T')[0],
  })

  const handleAdd = () => {
    const count = investments.filter(i => i.type === formData.type).length + 1
    if (!formData.assetName || !formData.purchaseValue) {
      setToast({ visible: true, message: 'Please fill in Asset Name and Purchase Value', type: 'error' })
      return
    }
    setInvestments(prev => [{
      id: generateId(formData.type, count), date: formData.date, assetName: formData.assetName,
      type: formData.type, purchaseValue: Number(formData.purchaseValue),
      quantity: Number(formData.quantity), unitPrice: Number(formData.unitPrice), broker: formData.broker,
    }, ...prev])
    setShowForm(false)
    setToast({ visible: true, message: 'Investment added successfully', type: 'success' })
    resetForm()
  }

  const resetForm = () => setFormData({ type: 'Gold', assetName: '', purchaseValue: '', quantity: '', unitPrice: '', broker: '', date: new Date().toISOString().split('T')[0] })

  const handleEdit = (inv: Investment) => {
    setFormData({ type: inv.type, assetName: inv.assetName, purchaseValue: String(inv.purchaseValue), quantity: String(inv.quantity), unitPrice: String(inv.unitPrice), broker: inv.broker, date: inv.date })
    setEditingId(inv.id)
    setShowForm(true)
  }

  const handleUpdate = () => {
    if (!formData.assetName || !formData.purchaseValue) { setToast({ visible: true, message: 'Please fill in all required fields', type: 'error' }); return }
    setInvestments(prev => prev.map(inv => inv.id === editingId ? { ...inv, date: formData.date, assetName: formData.assetName, type: formData.type, purchaseValue: Number(formData.purchaseValue), quantity: Number(formData.quantity), unitPrice: Number(formData.unitPrice), broker: formData.broker } : inv))
    setEditingId(null); setShowForm(false); setToast({ visible: true, message: 'Investment updated', type: 'success' }); resetForm()
  }

  const handleDelete = (id: string) => {
    if (confirm('Delete this investment record?')) { setInvestments(prev => prev.filter(inv => inv.id !== id)); setToast({ visible: true, message: 'Investment deleted', type: 'success' }) }
  }

  const fmt = (n: number) => `${currency} ${n.toLocaleString()}`

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">{t('investments', language)}</div>
            <div className="page-subtitle">{t('managePortfolio', language)}</div>
          </div>
        </div>
        <div className="page-header-right">
          <Button variant="primary" size="sm" onClick={() => { setShowForm(!showForm); setEditingId(null); resetForm() }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Investment
          </Button>
        </div>
      </div>
      <div className="page-body">
        {showForm && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header"><span className="card-title">{editingId ? 'Edit Investment' : 'New Investment'}</span></div>
            <div className="card-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Asset Type</label>
                  <select className="input" value={formData.type} onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}>
                    {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Asset Name</label>
                  <input className="input" placeholder="Gold Bullion 24K" value={formData.assetName} onChange={e => setFormData(prev => ({ ...prev, assetName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="input" type="date" value={formData.date} onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Purchase Value ({currency})</label>
                  <input className="input" type="number" placeholder="0" value={formData.purchaseValue} onChange={e => setFormData(prev => ({ ...prev, purchaseValue: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input className="input" type="number" placeholder="0" value={formData.quantity} onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Price ({currency})</label>
                  <input className="input" type="number" placeholder="0" value={formData.unitPrice} onChange={e => setFormData(prev => ({ ...prev, unitPrice: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Broker</label>
                  <input className="input" placeholder="Broker name" value={formData.broker} onChange={e => setFormData(prev => ({ ...prev, broker: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <Button variant="secondary" onClick={() => { setShowForm(false); setEditingId(null); resetForm() }}>Cancel</Button>
                <Button variant="primary" onClick={editingId ? handleUpdate : handleAdd}>{editingId ? 'Update' : 'Add'} Investment</Button>
              </div>
            </div>
          </div>
        )}

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Asset Name</th>
                <th>Type</th>
                <th className="numeric">Purchase Value</th>
                <th className="numeric">Qty</th>
                <th className="numeric">Unit Price</th>
                <th>Broker</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {investments.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--font-size-xs)' }}>{inv.id}</td>
                  <td className="text-secondary">{formatDate(inv.date, dateFormat)}</td>
                  <td style={{ fontWeight: 500 }}>{inv.assetName}</td>
                  <td><Badge variant="primary">{inv.type}</Badge></td>
                  <td className="numeric" style={{ fontWeight: 600 }}>{fmt(inv.purchaseValue)}</td>
                  <td className="numeric text-secondary">{inv.quantity.toLocaleString()}</td>
                  <td className="numeric text-secondary">{fmt(inv.unitPrice)}</td>
                  <td className="text-secondary">{inv.broker}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(inv)} aria-label="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(inv.id)} aria-label="Delete" style={{ color: 'var(--danger)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {investments.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No investments recorded yet. Click "Add Investment" to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
