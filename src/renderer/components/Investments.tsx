import React, { useState, useMemo } from 'react'
import type { Profile } from '../data/sampleData'
import { Badge, Button, Modal, Select, Input, PlusIcon, EditIcon, TrashIcon } from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
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
    setConfirmDelete(id)
  }

  const confirmDeleteAction = () => {
    if (confirmDelete) {
      setInvestments(prev => prev.filter(inv => inv.id !== confirmDelete))
      setToast({ visible: true, message: 'Investment deleted', type: 'success' })
      setConfirmDelete(null)
    }
  }

  const openAddForm = () => {
    resetForm()
    setEditingId(null)
    setShowForm(true)
  }

  const fmt = (n: number) => `${currency} ${n.toLocaleString()}`

  const filtered = useMemo(() => {
    let result = investments
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(inv =>
        inv.id.toLowerCase().includes(q) ||
        inv.assetName.toLowerCase().includes(q) ||
        inv.type.toLowerCase().includes(q) ||
        inv.broker.toLowerCase().includes(q)
      )
    }
    if (typeFilter) {
      result = result.filter(inv => inv.type === typeFilter)
    }
    return result
  }, [investments, searchQuery, typeFilter])

  const summary = useMemo(() => {
    const totalValue = investments.reduce((s, i) => s + i.purchaseValue, 0)
    const totalQty = investments.reduce((s, i) => s + i.quantity, 0)
    const types = new Set(investments.map(i => i.type))
    return { totalValue, totalQty, uniqueTypes: types.size, count: investments.length }
  }, [investments])

  const typeOptions = [
    { value: '', label: 'All Types' },
    ...ASSET_TYPES.map(t => ({ value: t, label: t })),
  ]

  const columns: Column<Investment>[] = [
    {
      key: 'id', header: 'ID', sortable: true, width: '110px',
      render: inv => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--font-size-xs)' }}>{inv.id}</span>,
    },
    {
      key: 'date', header: 'Date', sortable: true, width: '120px',
      render: inv => <span className="text-secondary">{formatDate(inv.date, dateFormat)}</span>,
    },
    {
      key: 'assetName', header: 'Asset Name', sortable: true,
      render: inv => <span style={{ fontWeight: 500 }}>{inv.assetName}</span>,
    },
    {
      key: 'type', header: 'Type', sortable: true, width: '140px',
      render: inv => <Badge variant="primary">{inv.type}</Badge>,
    },
    {
      key: 'purchaseValue', header: 'Purchase Value', sortable: true, numeric: true, width: '140px',
      render: inv => <span style={{ fontWeight: 600 }}>{fmt(inv.purchaseValue)}</span>,
    },
    {
      key: 'quantity', header: 'Qty', sortable: true, numeric: true, width: '90px',
      render: inv => <span className="text-secondary">{inv.quantity.toLocaleString()}</span>,
    },
    {
      key: 'unitPrice', header: 'Unit Price', sortable: true, numeric: true, width: '120px',
      render: inv => <span className="text-secondary">{fmt(inv.unitPrice)}</span>,
    },
    {
      key: 'broker', header: 'Broker', sortable: true, width: '130px',
      render: inv => <span className="text-secondary">{inv.broker}</span>,
    },
    {
      key: 'actions', header: '', width: '80px',
      render: inv => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(inv)} aria-label="Edit">
            <EditIcon />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(inv.id)} aria-label="Delete" style={{ color: 'var(--danger)' }}>
            <TrashIcon />
          </Button>
        </div>
      ),
    },
  ]

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
          <Button variant="primary" size="sm" onClick={openAddForm}>
            <PlusIcon />
            Add Investment
          </Button>
        </div>
      </div>

      <div className="page-body">
        {investments.length > 0 && (
          <div className="invest-summary-grid">
            <div className="invest-summary-card">
              <span className="invest-summary-label">Total Portfolio Value</span>
              <span className="invest-summary-value">{fmt(summary.totalValue)}</span>
              <span className="invest-summary-sub">{summary.count} investment{summary.count !== 1 ? 's' : ''}</span>
            </div>
            <div className="invest-summary-card">
              <span className="invest-summary-label">Total Quantity</span>
              <span className="invest-summary-value">{summary.totalQty.toLocaleString()}</span>
            </div>
            <div className="invest-summary-card">
              <span className="invest-summary-label">Asset Types</span>
              <span className="invest-summary-value">{summary.uniqueTypes}</span>
              <span className="invest-summary-sub">of {ASSET_TYPES.length} available</span>
            </div>
            <div className="invest-summary-card">
              <span className="invest-summary-label">Avg Investment</span>
              <span className="invest-summary-value">{summary.count ? fmt(Math.round(summary.totalValue / summary.count)) : `${currency} 0`}</span>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={inv => inv.id}
          loading={loading}
          pageSize={10}
          searchable
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by ID, name, type or broker..."
          filterBar={
            <div className="invest-filter-bar">
              <Select
                options={typeOptions}
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
              />
            </div>
          }
          emptyState={
            <div className="empty-state" style={{ padding: '64px 24px' }}>
              <div className="empty-state-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>
              <div className="empty-state-title">{investments.length === 0 ? 'No investments yet' : 'No matching investments'}</div>
              <div className="empty-state-text">
                {investments.length === 0
                  ? 'Click "Add Investment" to start building your portfolio.'
                  : 'Try adjusting your search or filters.'}
              </div>
              {investments.length === 0 && (
                <div style={{ marginTop: 8 }}>
                  <Button variant="primary" onClick={openAddForm}>
                    <PlusIcon />
                    Add Investment
                  </Button>
                </div>
              )}
            </div>
          }
        />
      </div>

      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingId(null); resetForm() }}
        title={editingId ? 'Edit Investment' : 'New Investment'}
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => { setShowForm(false); setEditingId(null); resetForm() }}>Cancel</Button>
            <Button variant="primary" onClick={editingId ? handleUpdate : handleAdd}>{editingId ? 'Update' : 'Add'} Investment</Button>
          </div>
        }
      >
        <div className="form-row">
          <Select
            label="Asset Type"
            options={ASSET_TYPES.map(t => ({ value: t, label: t }))}
            value={formData.type}
            onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
          />
          <Input
            label="Asset Name"
            placeholder="Gold Bullion 24K"
            value={formData.assetName}
            onChange={e => setFormData(prev => ({ ...prev, assetName: e.target.value }))}
          />
          <Input
            label="Date"
            type="date"
            value={formData.date}
            onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
          />
          <Input
            label={`Purchase Value (${currency})`}
            type="number"
            placeholder="0"
            value={formData.purchaseValue}
            onChange={e => setFormData(prev => ({ ...prev, purchaseValue: e.target.value }))}
          />
          <Input
            label="Quantity"
            type="number"
            placeholder="0"
            value={formData.quantity}
            onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
          />
          <Input
            label={`Unit Price (${currency})`}
            type="number"
            placeholder="0"
            value={formData.unitPrice}
            onChange={e => setFormData(prev => ({ ...prev, unitPrice: e.target.value }))}
          />
          <Input
            label="Broker"
            placeholder="Broker name"
            value={formData.broker}
            onChange={e => setFormData(prev => ({ ...prev, broker: e.target.value }))}
          />
        </div>
      </Modal>

      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete Investment"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDeleteAction}>Delete</Button>
          </div>
        }
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.6 }}>
          Are you sure you want to delete this investment record? This action cannot be undone.
        </p>
      </Modal>
    </>
  )
}
