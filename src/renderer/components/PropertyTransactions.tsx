import React, { useState, useMemo, useCallback } from 'react'
import type { PropTransaction } from '../data/propertyTypes'
import type { AuditEvent } from '../data/auditTypes'
import { recordModuleEvent } from '../services/auditService'
import { PROP_TRANSACTION_CATEGORIES } from '../data/propertyTypes'
import { Badge, Button, EditIcon, TrashIcon, PlusIcon, KpiCard, EmptyState, SearchIcon, CloseIcon } from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
import ConfirmDialog from './design/ConfirmDialog'
import EntityForm from './design/EntityForm'
import Toast from './Toast'
import { formatDate } from '../utils'

interface Props {
  currency?: string
  dateFormat?: string
  language?: string
  propTransactions: PropTransaction[]
  setPropTransactions: React.Dispatch<React.SetStateAction<PropTransaction[]>>
  onAuditEvent?: (event: AuditEvent) => void
}

const typeFilterOptions = ['All', 'Income', 'Expense'] as const

export default function PropertyTransactions({
  currency = 'AED', dateFormat = 'DD/MM/YYYY', language = 'English',
  propTransactions, setPropTransactions,
  onAuditEvent,
}: Props) {
  const [typeFilter, setTypeFilter] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [formType, setFormType] = useState<'credit' | 'debit'>('credit')
  const [formCategory, setFormCategory] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formDescription, setFormDescription] = useState('')

  const displayType = formType === 'credit' ? 'Income' : 'Expense'

  const categoryOptions = useMemo(() => {
    const categories = formType === 'credit' ? PROP_TRANSACTION_CATEGORIES.income : PROP_TRANSACTION_CATEGORIES.expense
    return [{ value: '', label: 'Select category' }, ...categories.map(c => ({ value: c, label: c }))]
  }, [formType])

  const resetForm = () => {
    setFormType('credit')
    setFormCategory('')
    setFormAmount('')
    setFormDate(new Date().toISOString().split('T')[0])
    setFormDescription('')
  }

  const validate = () => {
    if (!formCategory) {
      setToast({ visible: true, message: 'Please select a category', type: 'error' })
      return false
    }
    if (!formDate) {
      setToast({ visible: true, message: 'Please enter a valid date', type: 'error' })
      return false
    }
    const amt = Number(formAmount)
    if (!formAmount || amt <= 0) {
      setToast({ visible: true, message: 'Amount must be greater than zero', type: 'error' })
      return false
    }
    return true
  }

  const generateId = () => `PTXN-${Date.now()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`

  const handleAdd = () => {
    if (!validate()) return
    const now = new Date().toISOString()
    const newTxn: PropTransaction = {
      id: generateId(),
      accountId: 'property-income',
      date: formDate,
      type: formType,
      amount: Number(formAmount),
      description: formDescription,
      category: formCategory,
      status: 'cleared',
      reference: '',
      createdAt: now,
      updatedAt: now,
      createdBy: 'user',
      updatedBy: 'user',
    }
    setPropTransactions(prev => [newTxn, ...prev])
    onAuditEvent?.(recordModuleEvent('Property Transactions', 'Create', `${displayType} - ${formCategory}`, newTxn.id, `${displayType} transaction: ${formCategory} ${currency}${Number(formAmount).toLocaleString()}`))
    setShowForm(false)
    setToast({ visible: true, message: 'Transaction recorded', type: 'success' })
    resetForm()
  }

  const handleEdit = (txn: PropTransaction) => {
    setFormType(txn.type === 'credit' ? 'credit' : 'debit')
    setFormCategory(txn.category)
    setFormAmount(String(txn.amount))
    setFormDate(txn.date)
    setFormDescription(txn.description)
    setEditingId(txn.id)
    setShowForm(true)
  }

  const handleUpdate = () => {
    if (!validate()) return
    const prevTxn = propTransactions.find(t => t.id === editingId)
    setPropTransactions(prev => prev.map(t =>
      t.id === editingId ? {
        ...t,
        date: formDate,
        type: formType,
        category: formCategory,
        amount: Number(formAmount),
        description: formDescription,
        updatedAt: new Date().toISOString(),
        updatedBy: 'user',
      } : t
    ))
    if (prevTxn) {
      onAuditEvent?.(recordModuleEvent('Property Transactions', 'Update', `${displayType} - ${formCategory}`, editingId!, `Updated ${displayType} transaction: ${formCategory} ${currency}${Number(formAmount).toLocaleString()}`, 'Info', prevTxn as any, { date: formDate, type: formType, category: formCategory, amount: Number(formAmount), description: formDescription }))
    }
    setEditingId(null)
    setShowForm(false)
    setToast({ visible: true, message: 'Transaction updated', type: 'success' })
    resetForm()
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    const deleted = propTransactions.find(t => t.id === deleteTarget)
    setPropTransactions(prev => prev.filter(t => t.id !== deleteTarget))
    setDeleteTarget(null)
    if (deleted) {
      const delType = deleted.type === 'credit' ? 'Income' : 'Expense'
      onAuditEvent?.(recordModuleEvent('Property Transactions', 'Delete', `${delType} - ${deleted.category}`, deleted.id, `Deleted ${delType} transaction: ${deleted.category} ${currency}${deleted.amount.toLocaleString()}`))
    }
    setToast({ visible: true, message: 'Transaction deleted', type: 'success' })
  }

  const fmt = useCallback((n: number) => `${currency} ${n.toLocaleString()}`, [currency])

  const totalIncome = useMemo(() =>
    propTransactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
    [propTransactions]
  )
  const totalExpense = useMemo(() =>
    propTransactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0),
    [propTransactions]
  )
  const netIncome = totalIncome - totalExpense

  const filtered = useMemo(() => {
    let result = propTransactions
    if (typeFilter !== 'All') {
      const mappedType = typeFilter === 'Income' ? 'credit' : 'debit'
      result = result.filter(t => t.type === mappedType)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.category.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      )
    }
    return result
  }, [propTransactions, typeFilter, searchQuery])

  const columns: Column<PropTransaction>[] = useMemo(() => [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: txn => <span className="text-secondary">{formatDate(txn.date, dateFormat)}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      render: txn => <span style={{ fontWeight: 500 }}>{txn.description || '—'}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      render: txn => <Badge variant="neutral">{txn.category}</Badge>,
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: txn => (
        <Badge variant={txn.type === 'credit' ? 'success' : 'danger'}>
          {txn.type === 'credit' ? 'Income' : 'Expense'}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      numeric: true,
      render: txn => {
        const isIncome = txn.type === 'credit'
        return (
          <span style={{ fontWeight: 600, color: isIncome ? 'var(--success)' : 'var(--danger)' }}>
            {isIncome ? '+' : '-'}{fmt(txn.amount)}
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '80px',
      render: txn => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(txn)} aria-label="Edit">
            <EditIcon />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(txn.id)} aria-label="Delete">
            <TrashIcon />
          </Button>
        </div>
      ),
    },
  ], [dateFormat, fmt])

  const empty = (
    <EmptyState
      icon={
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      }
      title={typeFilter !== 'All' || searchQuery ? 'No transactions found' : 'No property transactions yet'}
      text={typeFilter !== 'All' || searchQuery ? 'Try adjusting your search or filters' : 'Add your first income or expense transaction to get started'}
    />
  )

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <EntityForm
        open={showForm}
        title={editingId ? 'Edit Transaction' : 'New Transaction'}
        submitLabel={editingId ? 'Update' : 'Add'}
        onCancel={() => { setShowForm(false); setEditingId(null); resetForm() }}
        onSubmit={editingId ? handleUpdate : handleAdd}
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Type</label>
            <select
              className="input"
              value={formType}
              onChange={e => {
                setFormType(e.target.value as 'credit' | 'debit')
                setFormCategory('')
              }}
            >
              <option value="credit">Income</option>
              <option value="debit">Expense</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="input" value={formCategory} onChange={e => setFormCategory(e.target.value)}>
              {categoryOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="input" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Amount ({currency})</label>
            <input className="input" type="number" placeholder="0" min="0" step="0.01" value={formAmount} onChange={e => setFormAmount(e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <input className="input" type="text" placeholder="Enter description..." value={formDescription} onChange={e => setFormDescription(e.target.value)} />
          </div>
        </div>
      </EntityForm>

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Property Transactions</div>
            <div className="page-subtitle">Track income and expenses for your property investments</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid">
          <KpiCard label="Total Income" value={fmt(totalIncome)} accentColor="var(--success)" />
          <KpiCard label="Total Expenses" value={fmt(totalExpense)} accentColor="var(--danger)" />
          <KpiCard
            label="Net Income"
            value={fmt(Math.abs(netIncome))}
            accentColor={netIncome >= 0 ? 'var(--success)' : 'var(--danger)'}
          />
        </div>

        <div className="data-table-toolbar">
          <div className="data-table-filters">
            <div className="filter-bar" style={{ padding: 0 }}>
              {typeFilterOptions.map(f => (
                <Button key={f} variant={typeFilter === f ? 'primary' : 'secondary'} size="sm" onClick={() => setTypeFilter(f)}>
                  {f}
                </Button>
              ))}
            </div>
          </div>
          <div className="data-table-search" style={{ minWidth: 260 }}>
            <SearchIcon />
            <input
              type="text"
              className="data-table-search-input"
              placeholder="Search by category, description, or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="data-table-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">
                <CloseIcon />
              </button>
            )}
          </div>
          <Button variant="primary" size="sm" onClick={() => { setShowForm(true); setEditingId(null); resetForm() }}>
            <PlusIcon />
            Add Transaction
          </Button>
        </div>

        <DataTable<PropTransaction>
          columns={columns}
          data={filtered}
          keyExtractor={txn => txn.id}
          emptyState={empty}
          pageSize={10}
        />
      </div>
    </>
  )
}
