import React, { useState, useMemo, useRef, useEffect } from 'react'
import type { PropAccount, PropTransaction } from '../data/propertyTypes'
import type { AuditEvent } from '../data/auditTypes'
import { recordModuleEvent } from '../services/auditService'
import { deriveBalance } from '../services/bankingService'
import {
  Badge, Button, KpiCard, EmptyState, PlusIcon, TrashIcon,
  PortfolioIcon, TrendingUpIcon, ActivityIcon,
  Input, Select, Modal
} from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
import EntityForm from './design/EntityForm'
import ConfirmDialog from './design/ConfirmDialog'
import Toast from './Toast'
import { formatDate, maskAccountNumber, t } from '../utils'
import type { BankReconciliationRecord, BankStatementLine } from '../accounting/types'
import BankImportModal from './BankImportModal'

export interface StatementEntry {
  date: string
  desc: string
  amount: string
  type: 'credit' | 'debit'
}

const themeOptions = [
  { value: 'emerald', label: 'Emerald Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'purple', label: 'Purple' },
  { value: 'amber', label: 'Amber' },
  { value: 'rose', label: 'Rose' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'teal', label: 'Teal' },
]

const accountTypeOptions = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit', label: 'Credit Card' },
]

type DialogType = 'addAccount' | 'deposit' | 'withdraw' | 'transfer' | null
type TxnFilter = 'all' | 'deposits' | 'withdrawals' | 'transfers'

interface Props {
  currency?: string
  dateFormat?: string
  language?: string
  propAccounts: PropAccount[]
  setPropAccounts: React.Dispatch<React.SetStateAction<PropAccount[]>>
  propTransactions: PropTransaction[]
  setPropTransactions: React.Dispatch<React.SetStateAction<PropTransaction[]>>
  onAuditEvent?: (event: AuditEvent) => void
  bankReconciliations: BankReconciliationRecord[]
  setBankReconciliations: React.Dispatch<React.SetStateAction<BankReconciliationRecord[]>>
}

export default function PropertyBankAccounts({ currency = 'AED', dateFormat = 'DD/MM/YYYY', language = 'English', propAccounts, setPropAccounts, propTransactions, setPropTransactions, onAuditEvent, bankReconciliations, setBankReconciliations }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ type: DialogType; accountId?: string }>({ type: null })
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [newTxnOpen, setNewTxnOpen] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [searchQuery, setSearchQuery] = useState('')
  const [txnFilter, setTxnFilter] = useState<TxnFilter>('all')
  const [importOpen, setImportOpen] = useState(false)
  const [selectedHistoryRec, setSelectedHistoryRec] = useState<BankReconciliationRecord | null>(null)

  const handleImportStatement = (lines: Omit<BankStatementLine, 'matchedVoucherLineId' | 'matchConfidence' | 'status'>[]) => {
    if (lines.length === 0) return
    const dates = lines.map(l => new Date(l.date).getTime())
    const minDate = new Date(Math.min(...dates)).toISOString().split('T')[0]
    const maxDate = new Date(Math.max(...dates)).toISOString().split('T')[0]
    
    const newRecord: BankReconciliationRecord = {
      id: `recon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      bankAccountId: selectedId!,
      statementStartDate: minDate,
      statementEndDate: maxDate,
      statementOpeningBalance: 0,
      statementClosingBalance: 0,
      reconciledBalance: 0,
      status: 'Draft',
      statementLines: lines.map(l => ({
        ...l,
        matchConfidence: 'None',
        status: 'Unmatched'
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    setBankReconciliations(prev => [newRecord, ...prev])
    setToast({ visible: true, message: 'Bank statement imported successfully', type: 'success' })
  }

  const [formInstitution, setFormInstitution] = useState('')
  const [formAccountName, setFormAccountName] = useState('')
  const [formAccountNumber, setFormAccountNumber] = useState('')
  const [formAccountType, setFormAccountType] = useState<'checking' | 'savings' | 'cash' | 'credit'>('checking')
  const [formOpeningBalance, setFormOpeningBalance] = useState('')
  const [formTheme, setFormTheme] = useState('emerald')
  const [formAmount, setFormAmount] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formToAccount, setFormToAccount] = useState('')

  const newTxnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newTxnRef.current && !newTxnRef.current.contains(e.target as Node)) {
        setNewTxnOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedAccount = useMemo(() => propAccounts.find(a => a.id === selectedId) || null, [propAccounts, selectedId])

  const selectedAccountReconciliations = useMemo(() => {
    return bankReconciliations.filter(r => r.bankAccountId === selectedId)
  }, [bankReconciliations, selectedId])

  useEffect(() => {
    if (propAccounts.length > 0 && !selectedId) {
      setSelectedId((propAccounts.find(a => a.status === 'active') || propAccounts[0]).id)
    }
  }, [propAccounts])

  const accountBalances = useMemo(() => {
    const map: Record<string, number> = {}
    for (const acct of propAccounts) {
      map[acct.id] = deriveBalance(acct as any, propTransactions as any)
    }
    return map
  }, [propAccounts, propTransactions])

  const totalCash = useMemo(() => Object.values(accountBalances).reduce((sum, b) => sum + b, 0), [accountBalances])
  const activeCount = useMemo(() => propAccounts.filter(a => a.status === 'active').length, [propAccounts])

  const thisMonthFlow = useMemo(() => {
    const monthStart = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)).toISOString().split('T')[0]
    const credits = propTransactions
      .filter(t => t.date >= monthStart && (t.type === 'credit' || t.type === 'transfer_in'))
      .reduce((s, t) => s + t.amount, 0)
    const debits = propTransactions
      .filter(t => t.date >= monthStart && (t.type === 'debit' || t.type === 'transfer_out'))
      .reduce((s, t) => s + t.amount, 0)
    return credits - debits
  }, [propTransactions])

  const accountTransactions = useMemo(() => {
    if (!selectedId) return []
    return propTransactions.filter(t => t.accountId === selectedId)
  }, [selectedId, propTransactions])

  const lastActivityMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const acct of propAccounts) {
      const txns = propTransactions.filter(t => t.accountId === acct.id)
      if (txns.length > 0) {
        const sorted = [...txns].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
        map[acct.id] = sorted[0].date
      }
    }
    return map
  }, [propAccounts, propTransactions])

  const accountStats = useMemo(() => {
    if (!selectedId || !selectedAccount) return null
    const txns = propTransactions.filter(t => t.accountId === selectedId)
    const deposits = txns.filter(t => t.type === 'credit' || t.type === 'transfer_in').reduce((s, t) => s + t.amount, 0)
    const withdrawals = txns.filter(t => t.type === 'debit' || t.type === 'transfer_out').reduce((s, t) => s + t.amount, 0)
    const transfers = txns.filter(t => t.type === 'transfer_in' || t.type === 'transfer_out').length
    return { deposits, withdrawals, transfers }
  }, [selectedId, selectedAccount, propTransactions])

  const runningBalances = useMemo(() => {
    const map: Record<string, number> = {}
    if (!selectedId || !selectedAccount) return map
    const sorted = [...propTransactions.filter(t => t.accountId === selectedId)]
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    let running = selectedAccount.openingBalance
    for (const txn of sorted) {
      if (txn.type === 'credit' || txn.type === 'transfer_in') running += txn.amount
      else running -= txn.amount
      map[txn.id] = running
    }
    return map
  }, [selectedId, selectedAccount, propTransactions])

  const filteredTransactions = useMemo(() => {
    let result = accountTransactions
    if (txnFilter === 'deposits') result = result.filter(t => t.type === 'credit')
    else if (txnFilter === 'withdrawals') result = result.filter(t => t.type === 'debit')
    else if (txnFilter === 'transfers') result = result.filter(t => t.type === 'transfer_in' || t.type === 'transfer_out')
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.date.includes(q) ||
        t.type.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      )
    }
    return result
  }, [accountTransactions, txnFilter, searchQuery])

  const tableData = useMemo(() => {
    return filteredTransactions.map(t => ({
      ...t,
      balanceAfter: runningBalances[t.id] ?? 0,
    }))
  }, [filteredTransactions, runningBalances])

  const formatAmount = (txn: PropTransaction) => {
    const sign = txn.type === 'credit' || txn.type === 'transfer_in' ? '+' : '-'
    return `${sign}${currency} ${txn.amount.toLocaleString()}`
  }

  const resetForm = () => {
    setFormInstitution('')
    setFormAccountName('')
    setFormAccountNumber('')
    setFormAccountType('checking')
    setFormOpeningBalance('')
    setFormTheme('emerald')
    setFormAmount('')
    setFormDesc('')
    setFormDate(new Date().toISOString().split('T')[0])
    setFormToAccount('')
  }

  const openDialog = (type: DialogType, accountId?: string) => {
    resetForm()
    if (type === 'transfer') {
      const dest = propAccounts.find(a => a.status === 'active' && a.id !== (accountId || selectedId))
      if (dest) setFormToAccount(dest.id)
    }
    setDialog({ type, accountId })
    setNewTxnOpen(false)
  }

  const handleAddAccount = () => {
    if (!formInstitution || !formAccountName) {
      setToast({ visible: true, message: 'Institution and account name are required', type: 'error' })
      return
    }
    const newAccount: PropAccount = {
      id: `pa-${Date.now()}`,
      institution: formInstitution,
      accountName: formAccountName,
      accountNumber: formAccountNumber || '----',
      currency,
      openingBalance: Number(formOpeningBalance) || 0,
      accountType: formAccountType,
      theme: formTheme,
      icon: 'bank',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user',
      updatedBy: 'user',
    }
    setPropAccounts(prev => [...prev, newAccount])
    onAuditEvent?.(recordModuleEvent('Property Bank Accounts', 'Create', newAccount.accountName, newAccount.id, `Added account: ${newAccount.accountName} @ ${newAccount.institution} (${newAccount.accountType})`))
    setDialog({ type: null })
    setToast({ visible: true, message: 'Account added', type: 'success' })
    resetForm()
  }

  const handleDeposit = () => {
    const amt = Number(formAmount)
    if (!formAmount || amt <= 0) {
      setToast({ visible: true, message: 'Amount must be greater than zero', type: 'error' })
      return
    }
    const targetId = dialog.accountId || selectedId
    if (!targetId) {
      setToast({ visible: true, message: 'No account selected', type: 'error' })
      return
    }
    const txn: PropTransaction = {
      id: `pt-${Date.now()}`,
      accountId: targetId,
      date: formDate,
      type: 'credit',
      amount: amt,
      description: formDesc || 'Deposit',
      category: '',
      status: 'cleared',
      reference: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user',
      updatedBy: 'user',
    }
    setPropTransactions(prev => [txn, ...prev])
    const targetAccount = propAccounts.find(a => a.id === targetId)
    onAuditEvent?.(recordModuleEvent('Property Bank Accounts', 'Create', targetAccount?.accountName || 'account', txn.id, `Deposit ${currency}${amt.toLocaleString()} to ${targetAccount?.accountName || 'account'}`))
    setToast({ visible: true, message: 'Deposit recorded', type: 'success' })
    setDialog({ type: null })
    resetForm()
  }

  const handleWithdraw = () => {
    const amt = Number(formAmount)
    if (!formAmount || amt <= 0) {
      setToast({ visible: true, message: 'Amount must be greater than zero', type: 'error' })
      return
    }
    const targetId = dialog.accountId || selectedId
    if (!targetId) {
      setToast({ visible: true, message: 'No account selected', type: 'error' })
      return
    }
    const txn: PropTransaction = {
      id: `pt-${Date.now()}`,
      accountId: targetId,
      date: formDate,
      type: 'debit',
      amount: amt,
      description: formDesc || 'Withdrawal',
      category: '',
      status: 'cleared',
      reference: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user',
      updatedBy: 'user',
    }
    setPropTransactions(prev => [txn, ...prev])
    const targetAccount = propAccounts.find(a => a.id === targetId)
    onAuditEvent?.(recordModuleEvent('Property Bank Accounts', 'Create', targetAccount?.accountName || 'account', txn.id, `Withdraw ${currency}${amt.toLocaleString()} from ${targetAccount?.accountName || 'account'}`))
    setToast({ visible: true, message: 'Withdrawal recorded', type: 'success' })
    setDialog({ type: null })
    resetForm()
  }

  const handleTransfer = () => {
    const amt = Number(formAmount)
    if (!formAmount || amt <= 0) {
      setToast({ visible: true, message: 'Amount must be greater than zero', type: 'error' })
      return
    }
    const fromId = dialog.accountId || selectedId
    if (!fromId) {
      setToast({ visible: true, message: 'No source account selected', type: 'error' })
      return
    }
    if (!formToAccount) {
      setToast({ visible: true, message: 'Select a destination account', type: 'error' })
      return
    }
    if (formToAccount === fromId) {
      setToast({ visible: true, message: 'Source and destination must be different', type: 'error' })
      return
    }

    const srcBalance = accountBalances[fromId]
    if (srcBalance !== undefined && amt > srcBalance) {
      setToast({ visible: true, message: `Insufficient funds — available balance is ${currency} ${srcBalance.toLocaleString()}`, type: 'error' })
      return
    }

    const now = Date.now()
    const transferRef = `tr-${now}`
    const nowISO = new Date().toISOString()
    const destAccount = propAccounts.find(a => a.id === formToAccount)
    const srcAccount = propAccounts.find(a => a.id === fromId)

    const outTxn: PropTransaction = {
      id: `pt-${now}-out`,
      accountId: fromId,
      date: formDate,
      type: 'transfer_out',
      amount: amt,
      description: formDesc || `Transfer to ${destAccount?.accountName || 'destination'}`,
      category: 'Transfer',
      status: 'cleared',
      reference: transferRef,
      createdAt: nowISO,
      updatedAt: nowISO,
      createdBy: 'user',
      updatedBy: 'user',
    }

    const inTxn: PropTransaction = {
      id: `pt-${now}-in`,
      accountId: formToAccount,
      date: formDate,
      type: 'transfer_in',
      amount: amt,
      description: formDesc || `Transfer from ${srcAccount?.accountName || 'source'}`,
      category: 'Transfer',
      status: 'cleared',
      reference: transferRef,
      createdAt: nowISO,
      updatedAt: nowISO,
      createdBy: 'user',
      updatedBy: 'user',
    }

    setPropTransactions(prev => [inTxn, outTxn, ...prev])
    onAuditEvent?.(recordModuleEvent('Property Bank Accounts', 'Transfer', `${srcAccount?.accountName || 'source'} → ${destAccount?.accountName || 'destination'}`, transferRef, `Transfer ${currency}${amt.toLocaleString()} from ${srcAccount?.accountName || 'unknown'} to ${destAccount?.accountName || 'unknown'}`))
    setToast({ visible: true, message: 'Transfer completed', type: 'success' })
    setDialog({ type: null })
    resetForm()
  }

  const handleDeleteTransaction = () => {
    if (!deleteTarget) return
    const deleted = propTransactions.find(t => t.id === deleteTarget)
    setPropTransactions(prev => prev.filter(t => t.id !== deleteTarget))
    setDeleteTarget(null)
    if (deleted) {
      const account = propAccounts.find(a => a.id === deleted.accountId)
      onAuditEvent?.(recordModuleEvent('Property Bank Accounts', 'Delete', account?.accountName || 'unknown', deleted.id, `Deleted ${deleted.type} transaction: ${deleted.description} ${currency}${deleted.amount.toLocaleString()}`))
    }
    setToast({ visible: true, message: 'Transaction deleted', type: 'success' })
  }

  const getStatusBadge = (status: string) => {
    const v = status === 'cleared' ? 'success' : status === 'pending' ? 'warning' : status === 'reconciled' ? 'primary' : 'neutral'
    return <Badge variant={v as any}>{status}</Badge>
  }

  const getTypeBadge = (txn: PropTransaction) => {
    if (txn.type === 'credit') return <Badge variant="success">deposit</Badge>
    if (txn.type === 'debit') return <Badge variant="danger">withdrawal</Badge>
    return <Badge variant="primary">Transfer</Badge>
  }

  const getTypeLabel = (type: string) => {
    if (type === 'credit') return 'Deposit'
    if (type === 'debit') return 'Withdrawal'
    if (type === 'transfer_in') return 'Transfer In'
    return 'Transfer Out'
  }

  const columns: Column<PropTransaction & { balanceAfter: number }>[] = useMemo(() => [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      width: '110px',
      render: txn => <span className="text-secondary text-mono text-xs">{formatDate(txn.date, dateFormat)}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      render: txn => <span className="fw-500 text-sm">{txn.description}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      width: '100px',
      render: txn => txn.category ? <span className="text-secondary text-xs">{txn.category}</span> : <span className="text-muted text-xs">—</span>,
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      width: '110px',
      render: txn => getTypeBadge(txn),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      numeric: true,
      render: txn => (
        <span className={`fw-600 text-sm text-nowrap ${txn.type === 'credit' || txn.type === 'transfer_in' ? 'text-success' : 'text-muted'}`}>
          {formatAmount(txn)}
        </span>
      ),
    },
    {
      key: 'balanceAfter',
      header: 'Balance',
      sortable: true,
      numeric: true,
      width: '110px',
      render: txn => (
        <span className="text-mono text-xs text-secondary text-nowrap">
          {currency} {txn.balanceAfter.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '100px',
      render: txn => getStatusBadge(txn.status),
    },
    {
      key: 'actions' as any,
      header: '',
      width: '50px',
      render: txn => (
        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(txn.id)} aria-label="Delete transaction">
          <TrashIcon />
        </Button>
      ),
    },
  ], [dateFormat])

  const transactionsEmpty = (
    <EmptyState
      icon={
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      }
      title={searchQuery || txnFilter !== 'all' ? 'No transactions found' : 'No transactions yet'}
      text={searchQuery ? 'Try adjusting your search' : txnFilter !== 'all' ? 'Try changing the filter' : 'Use + New Transaction to add one.'}
    />
  )

  const noAccountsState = (
    <EmptyState
      icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      }
      title="No property accounts yet"
      text="Add your first property account to start tracking balances."
      action={<Button variant="primary" onClick={() => openDialog('addAccount')}><PlusIcon /> Add Account</Button>}
    />
  )

  const getDialogTitle = () => {
    if (dialog.type === 'addAccount') return 'Add Bank Account'
    if (dialog.type === 'deposit') return 'Record Deposit'
    if (dialog.type === 'withdraw') return 'Record Withdrawal'
    if (dialog.type === 'transfer') return 'Transfer Funds'
    return ''
  }

  const handleDialogSubmit = () => {
    if (dialog.type === 'addAccount') handleAddAccount()
    else if (dialog.type === 'deposit') handleDeposit()
    else if (dialog.type === 'withdraw') handleWithdraw()
    else if (dialog.type === 'transfer') handleTransfer()
  }

  const flowLabel = thisMonthFlow >= 0 ? `+${currency} ${thisMonthFlow.toLocaleString()}` : `${currency} ${Math.abs(thisMonthFlow).toLocaleString()}`

  const filterOptions: { value: TxnFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'deposits', label: 'Deposits' },
    { value: 'withdrawals', label: 'Withdrawals' },
    { value: 'transfers', label: 'Transfers' },
  ]

  const remainingAccounts = useMemo(() => propAccounts.filter(a => a.id !== selectedId), [propAccounts, selectedId])

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteTransaction}
        onCancel={() => setDeleteTarget(null)}
      />

      <EntityForm
        open={dialog.type !== null}
        title={getDialogTitle()}
        submitLabel={dialog.type === 'addAccount' ? 'Add Account' : 'Record'}
        onCancel={() => { setDialog({ type: null }); resetForm() }}
        onSubmit={handleDialogSubmit}
      >
        {dialog.type === 'addAccount' && (
          <div className="form-row">
            <Input label="Institution" value={formInstitution} onChange={e => setFormInstitution(e.target.value)} placeholder="e.g. Emirates Islamic Bank" autoFocus />
            <Input label="Account Name" value={formAccountName} onChange={e => setFormAccountName(e.target.value)} placeholder="e.g. Primary Account" />
            <Input label="Account Number" value={formAccountNumber} onChange={e => setFormAccountNumber(e.target.value)} placeholder="Optional" />
            <Select label="Account Type" value={formAccountType} onChange={e => setFormAccountType(e.target.value as any)} options={accountTypeOptions} />
            <Input label="Opening Balance (AED)" type="number" value={formOpeningBalance} onChange={e => setFormOpeningBalance(e.target.value)} placeholder="0" />
            <Select label="Theme Color" value={formTheme} onChange={e => setFormTheme(e.target.value)} options={themeOptions} />
          </div>
        )}
        {dialog.type === 'deposit' && (
          <div className="form-row">
            <Input label="Amount (AED)" type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0" autoFocus />
            <Input label="Description" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="e.g. Dividend payment" />
            <Input label="Date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
          </div>
        )}
        {dialog.type === 'withdraw' && (
          <div className="form-row">
            <Input label="Amount (AED)" type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0" autoFocus />
            <Input label="Description" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="e.g. ATM withdrawal" />
            <Input label="Date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
          </div>
        )}
        {dialog.type === 'transfer' && (
          <div className="form-row">
            <Select
              label="From Account"
              value={dialog.accountId || selectedId || ''}
              disabled
              options={propAccounts.filter(a => a.status === 'active').map(a => ({ value: a.id, label: `${a.institution} - ${a.accountName}` }))}
            />
            <div className="text-xs text-secondary" style={{ marginTop: -12, marginBottom: 8 }}>
              Balance: {currency} {(accountBalances[dialog.accountId || selectedId || ''] ?? 0).toLocaleString()}
            </div>
            <Select
              label="To Account"
              value={formToAccount}
              onChange={e => setFormToAccount(e.target.value)}
              options={propAccounts.filter(a => a.status === 'active' && a.id !== (dialog.accountId || selectedId)).map(a => ({ value: a.id, label: `${a.institution} - ${a.accountName}` }))}
            />
            <Input label={`Amount (${currency})`} type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0" autoFocus />
            <Input label="Description" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Optional note" />
            <Input label="Date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
          </div>
        )}
      </EntityForm>

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">{t('property-bank-accounts', language)}</div>
            <div className="page-subtitle">
              {propAccounts.length > 0
                ? `${propAccounts.length} account${propAccounts.length !== 1 ? 's' : ''} tracked`
                : 'Manage your property bank accounts and balances'}
            </div>
          </div>
        </div>
        <div className="page-header-right">
          <Button variant="primary" size="sm" onClick={() => openDialog('addAccount')}><PlusIcon /> Add Account</Button>
        </div>
      </div>

      <div className="page-body">
        {propAccounts.length === 0 ? noAccountsState : (
          <>
            {selectedAccount && (
              <div className={`featured-account-card prop-theme-${selectedAccount.theme}`}>
                <div className="featured-account-card-inner">
                  <div className="featured-account-card-top">
                    <div className="featured-account-card-bank">
                      <div className="featured-account-card-icon">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </div>
                      <span className="featured-account-card-bank-name">{selectedAccount.institution}</span>
                    </div>
                    <div className="featured-account-card-badges">
                      <Badge variant={selectedAccount.accountType === 'savings' ? 'primary' : selectedAccount.accountType === 'credit' ? 'warning' : 'neutral'}>
                        {selectedAccount.accountType}
                      </Badge>
                      <Badge variant={selectedAccount.status === 'active' ? 'success' : 'neutral'}>
                        {selectedAccount.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="featured-account-card-balance">
                    {currency} {(accountBalances[selectedAccount.id] ?? 0).toLocaleString()}
                  </div>

                  <div className="featured-account-card-bottom">
                    <span className="featured-account-card-bottom-label">{selectedAccount.accountName}</span>
                    <span className="featured-account-card-bottom-sep">·</span>
                    <span className="featured-account-card-bottom-value">{maskAccountNumber(selectedAccount.accountNumber)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="kpi-grid">
              <KpiCard
                label="Total Cash"
                value={`${currency} ${totalCash.toLocaleString()}`}
                icon={<PortfolioIcon />}
                accentColor="var(--success)"
              />
              <KpiCard
                label="Active Accounts"
                value={String(activeCount)}
                icon={<ActivityIcon />}
                accentColor="var(--primary)"
              />
              <KpiCard
                label="This Month Net Flow"
                value={flowLabel}
                change={{
                  value: `${currency} ${Math.abs(thisMonthFlow).toLocaleString()}`,
                  direction: thisMonthFlow >= 0 ? 'up' : thisMonthFlow < 0 ? 'down' : 'neutral',
                }}
                icon={<TrendingUpIcon />}
                accentColor={thisMonthFlow >= 0 ? 'var(--success)' : 'var(--danger)'}
              />
            </div>

            {selectedAccount && accountStats && (
              <>
                <div className="account-detail">
                <div className="account-detail-header">
                  <div className="account-detail-info">
                    <div className="text-lg fw-600">{selectedAccount.accountName}</div>
                    <div className="text-secondary text-sm">
                      {selectedAccount.institution}{selectedAccount.accountNumber !== '----' ? ` · ${maskAccountNumber(selectedAccount.accountNumber)}` : ''}
                    </div>
                  </div>
                  <div className="account-detail-actions" ref={newTxnRef}>
                    <div className="account-detail-actions-wrap" style={{ display: 'flex', gap: 8 }}>
                      <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
                        Import Statement
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => setNewTxnOpen(prev => !prev)}>
                        <PlusIcon /> New Transaction
                      </Button>
                      {newTxnOpen && (
                        <div className="new-txn-dropdown">
                          <button className="new-txn-dropdown-item" onClick={() => openDialog('deposit', selectedAccount.id)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Deposit
                          </button>
                          <button className="new-txn-dropdown-item" onClick={() => openDialog('withdraw', selectedAccount.id)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Withdraw
                          </button>
                          <button className="new-txn-dropdown-item" onClick={() => openDialog('transfer', selectedAccount.id)} disabled={propAccounts.length < 2}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                            Transfer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="account-stats-grid">
                  <div className="account-stat">
                    <span className="account-stat-label">Opening Balance</span>
                    <span className="account-stat-value">{currency} {selectedAccount.openingBalance.toLocaleString()}</span>
                  </div>
                  <div className="account-stat">
                    <span className="account-stat-label">Total Deposits</span>
                    <span className="account-stat-value text-success">{currency} {accountStats.deposits.toLocaleString()}</span>
                  </div>
                  <div className="account-stat">
                    <span className="account-stat-label">Total Withdrawals</span>
                    <span className="account-stat-value text-danger">{currency} {accountStats.withdrawals.toLocaleString()}</span>
                  </div>
                  <div className="account-stat">
                    <span className="account-stat-label">Transfers</span>
                    <span className="account-stat-value">{accountStats.transfers}</span>
                  </div>
                  <div className="account-stat">
                    <span className="account-stat-label">Account Type</span>
                    <span className="account-stat-value capitalize">{selectedAccount.accountType}</span>
                  </div>
                  <div className="account-stat">
                    <span className="account-stat-label">Status</span>
                    <span className="account-stat-value capitalize">{selectedAccount.status}</span>
                  </div>
                  <div className="account-stat">
                    <span className="account-stat-label">Created</span>
                    <span className="account-stat-value">{formatDate(selectedAccount.createdAt.split('T')[0], dateFormat)}</span>
                  </div>
                  <div className="account-stat">
                    <span className="account-stat-label">Current Balance</span>
                    <span className="account-stat-value fw-700 text-md">{currency} {(accountBalances[selectedAccount.id] ?? 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="card card-table mt-4">
                  <div className="card-header">
                    <span className="card-title">Transactions ({accountTransactions.length})</span>
                  </div>
                  <div className="card-body">
                    <DataTable
                      columns={columns}
                      data={tableData}
                      keyExtractor={t => t.id}
                      emptyState={transactionsEmpty}
                      searchable
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      searchPlaceholder="Search transactions..."
                      pageSize={10}
                      filterBar={
                        <div className="filter-bar">
                          {filterOptions.map(fo => (
                            <Button key={fo.value} variant={txnFilter === fo.value ? 'primary' : 'secondary'} size="sm" onClick={() => setTxnFilter(fo.value)}>
                              {fo.label}
                            </Button>
                          ))}
                        </div>
                      }
                    />
                  </div>
                </div>

                {/* Statement Import History Card */}
                <div className="card mt-4">
                  <div className="card-header">
                    <span className="card-title">Statement Import History ({selectedAccountReconciliations.length})</span>
                  </div>
                  <div className="card-body">
                    {selectedAccountReconciliations.length === 0 ? (
                      <div style={{ color: '#8A99AD', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                        No statements imported for this bank account yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {selectedAccountReconciliations.map(rec => (
                          <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid #E4EBF4', borderRadius: 6, background: '#F8FAFC' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: '#334155' }}>
                                Statement: {rec.statementStartDate} to {rec.statementEndDate}
                              </div>
                              <div style={{ color: '#64748B', fontSize: 12 }}>
                                Imported: {new Date(rec.createdAt).toLocaleDateString()} · {rec.statementLines.length} lines
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <Badge variant={rec.status === 'Reconciled' ? 'success' : 'neutral'}>
                                {rec.status}
                              </Badge>
                              <Button size="sm" variant="secondary" onClick={() => setSelectedHistoryRec(rec)}>
                                View Summary
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {remainingAccounts.length > 0 && (
                  <div className="mt-6">
                    <div className="text-md fw-600 mb-4">Other Accounts</div>
                    <div className="account-cards-grid">
                      {remainingAccounts.map(acct => {
                        const bal = accountBalances[acct.id] ?? 0
                        const lastDate = lastActivityMap[acct.id]
                        return (
                          <div
                            key={acct.id}
                            className={`account-card compact prop-theme-${acct.theme}${acct.status !== 'active' ? ' account-card-inactive' : ''}`}
                            onClick={() => setSelectedId(acct.id)}
                          >
                            <div className="account-card-theme" />
                            <div className="account-card-institution">{acct.institution} · {maskAccountNumber(acct.accountNumber)}</div>
                            <div className="account-card-name">{acct.accountName}</div>
                            <div className="account-card-balance">{currency} {bal.toLocaleString()}</div>
                            <div className="account-card-footer">
                              <Badge variant={acct.accountType === 'savings' ? 'primary' : acct.accountType === 'credit' ? 'warning' : 'neutral'}>
                                {acct.accountType}
                              </Badge>
                              <span className="text-muted text-xs">
                                {lastDate ? formatDate(lastDate, dateFormat) : '—'}
                              </span>
                            </div>
                            {acct.status !== 'active' && (
                              <div className="mt-1">
                                <Badge variant="neutral">{acct.status}</Badge>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Statement Import Modal */}
      {importOpen && (
        <BankImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImport={handleImportStatement}
        />
      )}

      {/* Read-Only Import Summary Modal */}
      {selectedHistoryRec && (
        <Modal
          open={!!selectedHistoryRec}
          onClose={() => setSelectedHistoryRec(null)}
          title="Import Summary"
          footer={<Button variant="primary" onClick={() => setSelectedHistoryRec(null)}>Close</Button>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <span className="text-secondary text-xs block" style={{ color: '#64748B' }}>Date Range</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  {selectedHistoryRec.statementStartDate} to {selectedHistoryRec.statementEndDate}
                </span>
              </div>
              <div>
                <span className="text-secondary text-xs block" style={{ color: '#64748B' }}>Total Transactions</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  {selectedHistoryRec.statementLines.length} lines
                </span>
              </div>
              <div>
                <span className="text-secondary text-xs block" style={{ color: '#64748B' }}>Reconciliation Status</span>
                <Badge variant={selectedHistoryRec.status === 'Reconciled' ? 'success' : 'neutral'}>
                  {selectedHistoryRec.status}
                </Badge>
              </div>
              <div>
                <span className="text-secondary text-xs block" style={{ color: '#64748B' }}>Imported At</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  {new Date(selectedHistoryRec.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Transactions List</label>
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #E4EBF4', borderRadius: 6 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E4EBF4', textAlign: 'left' }}>
                      <th style={{ padding: 8 }}>Date</th>
                      <th style={{ padding: 8 }}>Description</th>
                      <th style={{ padding: 8 }}>Reference</th>
                      <th style={{ padding: 8, textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedHistoryRec.statementLines.map((line, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #E4EBF4' }}>
                        <td style={{ padding: 8 }}>{line.date}</td>
                        <td style={{ padding: 8, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.description}</td>
                        <td style={{ padding: 8 }}>{line.reference ?? '-'}</td>
                        <td style={{ padding: 8, textAlign: 'right', color: line.amount >= 0 ? '#10B981' : '#EF4444', fontWeight: 500 }}>
                          {line.amount >= 0 ? '+' : ''}{line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
