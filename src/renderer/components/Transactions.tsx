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

const incomeCategories = ['Salary', 'Investment Returns', 'Dividends', 'Interest', 'Rental Income', 'Other Income']
const expenseCategories = ['Personal Expenses', 'Fees', 'Miscellaneous']
const journalCategories = ['Depreciation', 'Amortization', 'Accruals', 'Write-offs', 'Revaluations']

const typeColors: Record<string, { color: string; bg: string }> = {
  Income: { color: 'var(--success)', bg: 'var(--success-light)' },
  Expense: { color: 'var(--text-muted)', bg: 'var(--bg-tertiary)' },
  Journal: { color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
}

export default function Transactions({ currency = 'AED', dateFormat = 'DD/MM/YYYY', language = 'English', transactions, setTransactions }: Props) {
  const [filter, setFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [formType, setFormType] = useState<'Income' | 'Expense' | 'Journal'>('Income')
  const [formCategory, setFormCategory] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])

  const filtered = filter === 'All' ? transactions : transactions.filter(t => t.type === filter)
  const categories = formType === 'Income' ? incomeCategories : formType === 'Expense' ? expenseCategories : journalCategories

  const resetForm = () => { setFormType('Income'); setFormCategory(''); setFormAmount(''); setFormDate(new Date().toISOString().split('T')[0]) }

  const handleAdd = () => {
    if (!formCategory || !formAmount) { setToast({ visible: true, message: 'Please fill in category and amount', type: 'error' }); return }
    setTransactions(prev => [{ id: `TXN-${String(prev.length + 1).padStart(3, '0')}`, date: formDate, type: formType, category: formCategory, amount: Number(formAmount), status: 'Completed' }, ...prev])
    setShowForm(false); setToast({ visible: true, message: 'Transaction recorded', type: 'success' }); resetForm()
  }

  const handleEdit = (txn: Transaction) => { setFormType(txn.type); setFormCategory(txn.category); setFormAmount(String(txn.amount)); setFormDate(txn.date); setEditingId(txn.id); setShowForm(true) }
  const handleUpdate = () => {
    if (!formCategory || !formAmount) { setToast({ visible: true, message: 'Please fill in all fields', type: 'error' }); return }
    setTransactions(prev => prev.map(t => t.id === editingId ? { ...t, date: formDate, type: formType, category: formCategory, amount: Number(formAmount) } : t))
    setEditingId(null); setShowForm(false); setToast({ visible: true, message: 'Transaction updated', type: 'success' }); resetForm()
  }
  const handleDelete = (id: string) => { if (confirm('Delete this transaction?')) { setTransactions(prev => prev.filter(t => t.id !== id)); setToast({ visible: true, message: 'Transaction deleted', type: 'success' }) } }

  const fmt = (n: number) => `${currency} ${n.toLocaleString()}`
  const totalIncome = filtered.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0)
  const totalJournal = filtered.filter(t => t.type === 'Journal').reduce((s, t) => s + t.amount, 0)

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">{t('transactions', language)}</div>
            <div className="page-subtitle">{t('trackTransactions', language)}</div>
          </div>
        </div>
        <div className="page-header-right">
          <Button variant="primary" size="sm" onClick={() => { setShowForm(!showForm); setEditingId(null); resetForm() }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Transaction
          </Button>
        </div>
      </div>
      <div className="page-body">
        {showForm && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header"><span className="card-title">{editingId ? 'Edit Transaction' : 'New Transaction'}</span></div>
            <div className="card-body">
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="input" value={formType} onChange={e => setFormType(e.target.value as any)}>
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                    <option value="Journal">Journal (Non-Cash)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="input" value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="input" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount ({currency})</label>
                  <input className="input" type="number" placeholder="0" value={formAmount} onChange={e => setFormAmount(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => { setShowForm(false); setEditingId(null); resetForm() }}>Cancel</Button>
                <Button variant="primary" onClick={editingId ? handleUpdate : handleAdd}>{editingId ? 'Update' : 'Add'} Transaction</Button>
              </div>
            </div>
          </div>
        )}

        <div className="filter-bar">
          {['All', 'Income', 'Expense', 'Journal'].map(f => (
            <Button key={f} variant={filter === f ? 'primary' : 'secondary'} size="sm" onClick={() => setFilter(f)}>{f}</Button>
          ))}
        </div>

        <div className="table-container" style={{ marginBottom: 24 }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th className="numeric">Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(txn => {
                const tc = typeColors[txn.type]
                return (
                  <tr key={txn.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--font-size-xs)' }}>{txn.id}</td>
                    <td className="text-secondary">{formatDate(txn.date, dateFormat)}</td>
                    <td><Badge variant={txn.type === 'Income' ? 'success' : txn.type === 'Expense' ? 'neutral' : 'primary'}>{txn.type}</Badge></td>
                    <td style={{ fontWeight: 500 }}>{txn.category}</td>
                    <td className="numeric" style={{ fontWeight: 600, color: tc.color }}>
                      {txn.type === 'Income' ? '+' : '-'}{fmt(txn.amount)}
                    </td>
                    <td><Badge variant={txn.status === 'Completed' ? 'success' : 'warning'}>{txn.status}</Badge></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(txn)} aria-label="Edit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(txn.id)} aria-label="Delete">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--danger)' }}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No transactions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="kpi-grid">
          <div className="kpi-card">
            <span className="kpi-label">Total Income</span>
            <span className="kpi-value" style={{ color: 'var(--success)' }}>{fmt(totalIncome)}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Total Expenses</span>
            <span className="kpi-value" style={{ color: 'var(--text-muted)' }}>{fmt(totalExpense)}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Journal Entries</span>
            <span className="kpi-value" style={{ color: '#6366F1' }}>{fmt(totalJournal)}</span>
          </div>
        </div>
      </div>
    </>
  )
}
