import React, { useState, useMemo, useCallback } from 'react'
import type { Profile } from '../data/sampleData'
import { Badge, Button, EditIcon, TrashIcon, PlusIcon, KpiCard, EmptyState, Select, Input, SearchIcon, CloseIcon } from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
import ConfirmDialog from './design/ConfirmDialog'
import EntityForm from './design/EntityForm'
import Toast from './Toast'
import { formatDate, t } from '../utils'

interface Props {
  profile: Profile
  currency?: string
  dateFormat?: string
  language?: string
  transactions: Transaction[]
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>
}

export interface Transaction {
  id: string
  date: string
  type: 'Income' | 'Expense' | 'Journal'
  category: string
  amount: number
  status: string
}

type DateRange = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom'

const incomeCategories = ['Salary', 'Rental Income', 'Dividend', 'Interest', 'Other Income']
const expenseCategories = ['Maintenance', 'Utilities', 'Insurance', 'Taxes', 'Fees', 'Miscellaneous']
const journalCategories = ['Adjustment', 'Transfer', 'Opening Balance', 'Correction']

const typeColors: Record<string, { color: string; bg: string }> = {
  Income: { color: 'var(--success)', bg: 'var(--success-light)' },
  Expense: { color: 'var(--text-muted)', bg: 'var(--bg-tertiary)' },
  Journal: { color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
}

const dateRangeLabels: { value: DateRange; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom' },
]

const typeFilterOptions = ['All', 'Income', 'Expense', 'Journal'] as const

function getDateRange(range: DateRange, customStart?: string, customEnd?: string): [string, string] {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  const today = new Date(y, m, d)

  switch (range) {
    case 'today': {
      const s = today.toISOString().split('T')[0]
      return [s, s]
    }
    case 'week': {
      const start = new Date(today)
      const day = today.getDay()
      const diff = day === 0 ? -6 : 1 - day
      start.setDate(today.getDate() + diff)
      return [start.toISOString().split('T')[0], today.toISOString().split('T')[0]]
    }
    case 'month':
      return [new Date(y, m, 1).toISOString().split('T')[0], today.toISOString().split('T')[0]]
    case 'year':
      return [`${y}-01-01`, today.toISOString().split('T')[0]]
    case 'custom':
      return [customStart || '2000-01-01', customEnd || today.toISOString().split('T')[0]]
    default:
      return ['2000-01-01', '2099-12-31']
  }
}

export default function Transactions({ currency = 'AED', dateFormat = 'DD/MM/YYYY', language = 'English', transactions, setTransactions }: Props) {
  const [typeFilter, setTypeFilter] = useState<string>('All')
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [formType, setFormType] = useState<'Income' | 'Expense' | 'Journal'>('Income')
  const [formCategory, setFormCategory] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])

  const categories = formType === 'Income' ? incomeCategories : formType === 'Expense' ? expenseCategories : journalCategories

  const resetForm = () => {
    setFormType('Income')
    setFormCategory('')
    setFormAmount('')
    setFormDate(new Date().toISOString().split('T')[0])
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

  const handleAdd = () => {
    if (!validate()) return
    setTransactions(prev => [{
      id: `TXN-${String(prev.length + 1).padStart(3, '0')}`,
      date: formDate,
      type: formType,
      category: formCategory,
      amount: Number(formAmount),
      status: 'Completed',
    }, ...prev])
    setShowForm(false)
    setToast({ visible: true, message: 'Transaction recorded', type: 'success' })
    resetForm()
  }

  const handleEdit = (txn: Transaction) => {
    setFormType(txn.type)
    setFormCategory(txn.category)
    setFormAmount(String(txn.amount))
    setFormDate(txn.date)
    setEditingId(txn.id)
    setShowForm(true)
  }

  const handleUpdate = () => {
    if (!validate()) return
    setTransactions(prev => prev.map(t =>
      t.id === editingId ? { ...t, date: formDate, type: formType, category: formCategory, amount: Number(formAmount) } : t
    ))
    setEditingId(null)
    setShowForm(false)
    setToast({ visible: true, message: 'Transaction updated', type: 'success' })
    resetForm()
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    setTransactions(prev => prev.filter(t => t.id !== deleteTarget))
    setDeleteTarget(null)
    setToast({ visible: true, message: 'Transaction deleted', type: 'success' })
  }

  const fmt = useCallback((n: number) => `${currency} ${n.toLocaleString()}`, [currency])

  const totalIncome = useMemo(() =>
    transactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0),
    [transactions]
  )
  const totalExpense = useMemo(() =>
    transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0),
    [transactions]
  )
  const netCashFlow = totalIncome - totalExpense

  const dateRangeBounds = useMemo(() => getDateRange(dateRange, customStart, customEnd), [dateRange, customStart, customEnd])

  const filtered = useMemo(() => {
    let result = transactions
    if (typeFilter !== 'All') {
      result = result.filter(t => t.type === typeFilter)
    }
    if (dateRange !== 'all') {
      const [start, end] = dateRangeBounds
      result = result.filter(t => t.date >= start && t.date <= end)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.category.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q)
      )
    }
    return result
  }, [transactions, typeFilter, dateRange, dateRangeBounds, searchQuery])

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range)
    if (range !== 'custom') {
      setCustomStart('')
      setCustomEnd('')
    }
  }

  const columns: Column<Transaction>[] = useMemo(() => [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      width: '100px',
      render: txn => (
        <span className="text-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>
          {txn.id}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: txn => <span className="text-secondary">{formatDate(txn.date, dateFormat)}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: txn => (
        <Badge variant={txn.type === 'Income' ? 'success' : txn.type === 'Expense' ? 'neutral' : 'primary'}>
          {txn.type}
        </Badge>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      render: txn => <span style={{ fontWeight: 500 }}>{txn.category}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      numeric: true,
      render: txn => {
        const tc = typeColors[txn.type]
        return (
          <span style={{ fontWeight: 600, color: tc.color }}>
            {txn.type === 'Income' ? '+' : '-'}{fmt(txn.amount)}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: txn => (
        <Badge variant={txn.status === 'Completed' ? 'success' : 'warning'}>{txn.status}</Badge>
      ),
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
      title="No transactions found"
      text="Try adjusting your search or filters"
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
          <Select
            label="Type"
            value={formType}
            onChange={e => {
              setFormType(e.target.value as any)
              setFormCategory('')
            }}
            options={[
              { value: 'Income', label: 'Income' },
              { value: 'Expense', label: 'Expense' },
              { value: 'Journal', label: 'Journal (Non-Cash)' },
            ]}
          />
          <Select
            label="Category"
            value={formCategory}
            onChange={e => setFormCategory(e.target.value)}
            options={[
              { value: '', label: 'Select category' },
              ...categories.map(c => ({ value: c, label: c })),
            ]}
          />
          <Input label="Date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
          <Input
            label={`Amount (${currency})`}
            type="number"
            placeholder="0"
            value={formAmount}
            onChange={e => setFormAmount(e.target.value)}
          />
        </div>
      </EntityForm>

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">{t('transactions', language)}</div>
            <div className="page-subtitle">{t('trackTransactions', language)}</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid">
          <KpiCard label="Total Income" value={fmt(totalIncome)} accentColor="var(--success)" />
          <KpiCard label="Total Expenses" value={fmt(totalExpense)} accentColor="var(--text-muted)" />
          <KpiCard
            label="Net Cash Flow"
            value={fmt(Math.abs(netCashFlow))}
            accentColor={netCashFlow >= 0 ? 'var(--success)' : 'var(--danger)'}
          />
        </div>

        <div className="data-table-toolbar">
          <div className="data-table-filters">
            <div className="filter-bar" style={{ padding: 0 }}>
              {dateRangeLabels.map(dr => (
                <Button
                  key={dr.value}
                  variant={dateRange === dr.value ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => handleDateRangeChange(dr.value)}
                >
                  {dr.label}
                </Button>
              ))}
              {dateRange === 'custom' && (
                <>
                  <input className="input" type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                  <span className="text-muted">—</span>
                  <input className="input" type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                </>
              )}
            </div>
          </div>
          <div className="data-table-search" style={{ minWidth: 320 }}>
            <SearchIcon />
            <input
              type="text"
              className="data-table-search-input"
              placeholder="Search by category, ID, or type..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="data-table-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">
                <CloseIcon />
              </button>
            )}
          </div>
        </div>

        <div className="data-table-toolbar" style={{ marginTop: 0 }}>
          <div className="data-table-filters">
            <div className="filter-bar" style={{ padding: 0 }}>
              {typeFilterOptions.map(f => (
                <Button key={f} variant={typeFilter === f ? 'primary' : 'secondary'} size="sm" onClick={() => setTypeFilter(f)}>
                  {f}
                </Button>
              ))}
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => { setShowForm(true); setEditingId(null); resetForm() }}>
            <PlusIcon />
            Add Transaction
          </Button>
        </div>

        <DataTable<Transaction>
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
