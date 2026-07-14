import React, { useState, useMemo, useCallback } from 'react'
import type { Profile } from '../data/sampleData'
import type { AuditEvent } from '../data/auditTypes'
import { recordModuleEvent } from '../services/auditService'
import { Badge, Button, EditIcon, TrashIcon, PlusIcon, KpiCard, EmptyState, Select, Input, SearchIcon, CloseIcon } from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
import ConfirmDialog from './design/ConfirmDialog'
import EntityForm from './design/EntityForm'
import Toast from './Toast'
import { formatDate, t } from '../utils'
import { incomeCategories, expenseCategories, journalCategories } from '../data/transactionCategories'
import { CUSTOM_OPTION, normalizeCategoryName, findDuplicate, mergeCategories } from '../services/customCategoryService'

interface Props {
  profile: Profile
  currency?: string
  dateFormat?: string
  language?: string
  transactions: Transaction[]
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>
  incomeCustomCategories: string[]
  expenseCustomCategories: string[]
  setIncomeCustomCategories: React.Dispatch<React.SetStateAction<string[]>>
  setExpenseCustomCategories: React.Dispatch<React.SetStateAction<string[]>>
  onAuditEvent?: (event: AuditEvent) => void
}

export interface Transaction {
  id: string
  date: string
  type: 'Income' | 'Expense' | 'Journal'
  category: string
  amount: number
  status: string
}

const TYPE_DISPLAY: Record<string, string> = {
  Income: 'Payment Voucher',
  Expense: 'Receipt Voucher',
  Journal: 'Journal Voucher',
}

const TYPE_VALUE: Record<string, 'Income' | 'Expense' | 'Journal'> = {
  Income: 'Income',
  Expense: 'Expense',
  Journal: 'Journal',
}

type DateRange = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom'

const typeColors: Record<string, { color: string; bg: string }> = {
  Income: { color: 'var(--success)', bg: 'var(--success-light)' },
  Expense: { color: 'var(--text-muted)', bg: 'var(--bg-tertiary)' },
  Journal: { color: 'var(--primary-text)', bg: 'var(--primary-light)' },
}

const TYPE_OPTIONS = [
  { value: 'Income', label: 'Payment Voucher' },
  { value: 'Expense', label: 'Receipt Voucher' },
  { value: 'Journal', label: 'Journal Voucher' },
]

const TYPE_FILTER_OPTIONS = [
  { value: 'All', label: 'All' },
  { value: 'Income', label: 'Payment Voucher' },
  { value: 'Expense', label: 'Receipt Voucher' },
  { value: 'Journal', label: 'Journal Voucher' },
] as const

const dateRangeLabels: { value: DateRange; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom' },
]

const TYPE_FILTER_VALUES = ['All', 'Income', 'Expense', 'Journal'] as const

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

export default function Transactions({
  currency = 'AED', dateFormat = 'DD/MM/YYYY', language = 'English',
  transactions, setTransactions,
  incomeCustomCategories, expenseCustomCategories,
  setIncomeCustomCategories, setExpenseCustomCategories,
  onAuditEvent,
}: Props) {
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
  const [customCategoryName, setCustomCategoryName] = useState('')

  const customCategories = formType === 'Income' ? incomeCustomCategories : formType === 'Expense' ? expenseCustomCategories : []

  const allHardcoded = formType === 'Income' ? incomeCategories : formType === 'Expense' ? expenseCategories : journalCategories

  const categoryOptions = useMemo(() => {
    const merged = mergeCategories(allHardcoded, customCategories)
    const base: { value: string; label: string }[] = merged.map(c => ({ value: c, label: c }))
    if (formType !== 'Journal') {
      base.push({ value: CUSTOM_OPTION, label: CUSTOM_OPTION })
    }
    if (editingId && formCategory && !merged.includes(formCategory)) {
      base.unshift({ value: formCategory, label: formCategory })
    }
    return [{ value: '', label: 'Select category' }, ...base]
  }, [allHardcoded, customCategories, editingId, formCategory, formType])

  const resetForm = () => {
    setFormType('Income')
    setFormCategory('')
    setCustomCategoryName('')
    setFormAmount('')
    setFormDate(new Date().toISOString().split('T')[0])
  }

  const validate = () => {
    if (formCategory === CUSTOM_OPTION) {
      const name = customCategoryName.trim()
      if (!name) {
        setToast({ visible: true, message: 'Please enter a custom category name', type: 'error' })
        return false
      }
      if (name.length < 2) {
        setToast({ visible: true, message: 'Category name must be at least 2 characters', type: 'error' })
        return false
      }
      if (name.length > 60) {
        setToast({ visible: true, message: 'Category name must be 60 characters or less', type: 'error' })
        return false
      }
      if (findDuplicate(name, allHardcoded, customCategories)) {
        setToast({ visible: true, message: 'Category already exists', type: 'error' })
        return false
      }
    } else {
      if (!formCategory) {
        setToast({ visible: true, message: 'Please select a category', type: 'error' })
        return false
      }
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
    let category = formCategory
    if (formCategory === CUSTOM_OPTION) {
      category = normalizeCategoryName(customCategoryName)
      const setter = formType === 'Income' ? setIncomeCustomCategories : setExpenseCustomCategories
      setter(prev => prev.includes(category) ? prev : [...prev, category])
    }
    const newTxn = {
      id: `TXN-${String(transactions.length + 1).padStart(3, '0')}`,
      date: formDate,
      type: formType,
      category,
      amount: Number(formAmount),
      status: 'Completed',
    }
    setTransactions(prev => [newTxn, ...prev])
    onAuditEvent?.(recordModuleEvent('Accounting', 'Create', `${formType} - ${category}`, newTxn.id, `${formType} entry: ${category} ${currency}${Number(formAmount).toLocaleString()}`))
    setShowForm(false)
    setToast({ visible: true, message: 'Entry recorded', type: 'success' })
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
    let category = formCategory
    if (formCategory === CUSTOM_OPTION) {
      category = normalizeCategoryName(customCategoryName)
      const setter = formType === 'Income' ? setIncomeCustomCategories : setExpenseCustomCategories
      setter(prev => prev.includes(category) ? prev : [...prev, category])
    }
    const prevTxn = transactions.find(t => t.id === editingId)
    setTransactions(prev => prev.map(t =>
      t.id === editingId ? { ...t, date: formDate, type: formType, category, amount: Number(formAmount) } : t
    ))
    if (prevTxn) {
      onAuditEvent?.(recordModuleEvent('Accounting', 'Update', `${formType} - ${category}`, editingId!, `Updated entry: ${category} ${currency}${Number(formAmount).toLocaleString()}`, 'Info', prevTxn as any, { date: formDate, type: formType, category, amount: Number(formAmount) }))
    }
    setEditingId(null)
    setShowForm(false)
    setToast({ visible: true, message: 'Entry updated', type: 'success' })
    resetForm()
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    const deleted = transactions.find(t => t.id === deleteTarget)
    setTransactions(prev => prev.filter(t => t.id !== deleteTarget))
    setDeleteTarget(null)
    if (deleted) {
    onAuditEvent?.(recordModuleEvent('Accounting', 'Delete', `${deleted.type} - ${deleted.category}`, deleted.id, `Deleted ${deleted.type} entry: ${deleted.category} ${currency}${deleted.amount.toLocaleString()}`))
    }
    setDeleteTarget(null)
    setToast({ visible: true, message: 'Entry deleted', type: 'success' })
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
        t.type.toLowerCase().includes(q) ||
        (TYPE_DISPLAY[t.type] ?? '').toLowerCase().includes(q)
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
          {TYPE_DISPLAY[txn.type] ?? txn.type}
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
      render: txn => (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {txn.status !== 'Completed' && txn.status !== 'cleared' ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => handleEdit(txn)} aria-label="Edit">
                <EditIcon />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(txn.id)} aria-label="Delete">
                <TrashIcon />
              </Button>
            </>
          ) : (
            <span className="text-secondary text-xs fw-500" style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>Posted</span>
          )}
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
      title="No accounting entries found"
      text="Try adjusting your search or filters"
    />
  )

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Entry"
        message="Are you sure you want to delete this accounting entry? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <EntityForm
        open={showForm}
        title={editingId ? 'Edit Entry' : 'New Entry'}
        submitLabel={editingId ? 'Update' : 'Add'}
        onCancel={() => { setShowForm(false); setEditingId(null); resetForm() }}
        onSubmit={editingId ? handleUpdate : handleAdd}
      >
        <div className="form-row">
          <Select
            label="Type"
            value={formType}
            onChange={e => {
              setFormType(e.target.value as 'Income' | 'Expense' | 'Journal')
              setFormCategory('')
              setCustomCategoryName('')
            }}
            options={TYPE_OPTIONS}
          />
          <Select
            label="Category"
            value={formCategory}
            onChange={e => setFormCategory(e.target.value)}
            options={categoryOptions}
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
        {formCategory === CUSTOM_OPTION && (
          <div className="form-row" style={{ marginTop: 0 }}>
            <Input
              label="Custom Category Name"
              placeholder="Enter category name..."
              value={customCategoryName}
              onChange={e => setCustomCategoryName(e.target.value)}
            />
          </div>
        )}
      </EntityForm>

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">{t('accounting', language)}</div>
            <div className="page-subtitle">{t('trackAccounting', language)}</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid">
          <KpiCard label="Total Receipts" value={fmt(totalIncome)} accentColor="var(--success)" />
          <KpiCard label="Total Payments" value={fmt(totalExpense)} accentColor="var(--text-muted)" />
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
          <div className="data-table-search">
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
              {TYPE_FILTER_OPTIONS.map(fo => (
                <Button key={fo.value} variant={typeFilter === fo.value ? 'primary' : 'secondary'} size="sm" onClick={() => setTypeFilter(fo.value)}>
                  {fo.label}
                </Button>
              ))}
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => { setShowForm(true); setEditingId(null); resetForm() }}>
            <PlusIcon />
            Add Entry
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
