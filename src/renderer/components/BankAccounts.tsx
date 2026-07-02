import React, { useState, useMemo, useRef, useEffect } from 'react'
import type { BankAccount, BankTransaction } from '../data/banking'
import type { AuditEvent } from '../data/auditTypes'
import { recordModuleEvent } from '../services/auditService'
import { deriveBalance } from '../services/bankingService'
import { deleteBankTransaction } from '../services/bankTransactionService'
import { TransactionLifecycleService } from '../services/transactionLifecycleService'
import {
  Badge, Button, KpiCard, EmptyState, PlusIcon, TrashIcon,
  PortfolioIcon, TrendingUpIcon, ActivityIcon,
  Input, Select,
} from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
import EntityForm from './design/EntityForm'
import ConfirmDialog from './design/ConfirmDialog'
import Toast from './Toast'
import { formatDate, maskAccountNumber, t } from '../utils'

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
  bankAccounts: BankAccount[]
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>
  bankTransactions: BankTransaction[]
  setBankTransactions: React.Dispatch<React.SetStateAction<BankTransaction[]>>
  onAuditEvent?: (event: AuditEvent) => void
}

export default function BankAccounts({ currency = 'AED', dateFormat = 'DD/MM/YYYY', language = 'English', bankAccounts, setBankAccounts, bankTransactions, setBankTransactions, onAuditEvent }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ type: DialogType; accountId?: string }>({ type: null })
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [newTxnOpen, setNewTxnOpen] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [searchQuery, setSearchQuery] = useState('')
  const [txnFilter, setTxnFilter] = useState<TxnFilter>('all')

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

  const selectedAccount = useMemo(() => bankAccounts.find(a => a.id === selectedId) || null, [bankAccounts, selectedId])

  useEffect(() => {
    if (bankAccounts.length > 0 && !selectedId) {
      setSelectedId((bankAccounts.find(a => a.status === 'active') || bankAccounts[0]).id)
    }
  }, [bankAccounts])

  const accountBalances = useMemo(() => {
    const map: Record<string, number> = {}
    for (const acct of bankAccounts) {
      map[acct.id] = deriveBalance(acct, bankTransactions)
    }
    return map
  }, [bankAccounts, bankTransactions])

  const totalCash = useMemo(() => Object.values(accountBalances).reduce((sum, b) => sum + b, 0), [accountBalances])
  const activeCount = useMemo(() => bankAccounts.filter(a => a.status === 'active').length, [bankAccounts])

  const thisMonthFlow = useMemo(() => {
    const monthStart = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)).toISOString().split('T')[0]
    const credits = bankTransactions
      .filter(t => t.date >= monthStart && (t.type === 'credit' || t.type === 'transfer_in'))
      .reduce((s, t) => s + t.amount, 0)
    const debits = bankTransactions
      .filter(t => t.date >= monthStart && (t.type === 'debit' || t.type === 'transfer_out'))
      .reduce((s, t) => s + t.amount, 0)
    return credits - debits
  }, [bankTransactions])

  const accountTransactions = useMemo(() => {
    if (!selectedId) return []
    return bankTransactions.filter(t => t.accountId === selectedId)
  }, [selectedId, bankTransactions])

  const lastActivityMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const acct of bankAccounts) {
      const txns = bankTransactions.filter(t => t.accountId === acct.id)
      if (txns.length > 0) {
        const sorted = [...txns].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
        map[acct.id] = sorted[0].date
      }
    }
    return map
  }, [bankAccounts, bankTransactions])

  const accountStats = useMemo(() => {
    if (!selectedId || !selectedAccount) return null
    const txns = bankTransactions.filter(t => t.accountId === selectedId)
    const deposits = txns.filter(t => t.type === 'credit' || t.type === 'transfer_in').reduce((s, t) => s + t.amount, 0)
    const withdrawals = txns.filter(t => t.type === 'debit' || t.type === 'transfer_out').reduce((s, t) => s + t.amount, 0)
    const transfers = txns.filter(t => t.type === 'transfer_in' || t.type === 'transfer_out').length
    return { deposits, withdrawals, transfers }
  }, [selectedId, selectedAccount, bankTransactions])

  const runningBalances = useMemo(() => {
    const map: Record<string, number> = {}
    if (!selectedId || !selectedAccount) return map
    const sorted = [...bankTransactions.filter(t => t.accountId === selectedId)]
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    let running = selectedAccount.openingBalance
    for (const txn of sorted) {
      if (txn.type === 'credit' || txn.type === 'transfer_in') running += txn.amount
      else running -= txn.amount
      map[txn.id] = running
    }
    return map
  }, [selectedId, selectedAccount, bankTransactions])

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

  const formatAmount = (txn: BankTransaction) => {
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
      const dest = bankAccounts.find(a => a.status === 'active' && a.id !== (accountId || selectedId))
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
    const newAccount: BankAccount = {
      id: `ba-${Date.now()}`,
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
    setBankAccounts(prev => [...prev, newAccount])
    onAuditEvent?.(recordModuleEvent('Bank Accounts', 'Create', newAccount.accountName, newAccount.id, `Added account: ${newAccount.accountName} @ ${newAccount.institution} (${newAccount.accountType})`))
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
    const txn: BankTransaction = {
      id: `bt-${Date.now()}`,
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
    setBankTransactions(prev => [txn, ...prev])
    const targetAccount = bankAccounts.find(a => a.id === targetId)
    onAuditEvent?.(recordModuleEvent('Bank Accounts', 'Create', targetAccount?.accountName || 'account', txn.id, `Deposit ${currency}${amt.toLocaleString()} to ${targetAccount?.accountName || 'account'}`))
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
    const txn: BankTransaction = {
      id: `bt-${Date.now()}`,
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
    setBankTransactions(prev => [txn, ...prev])
    const targetAccount = bankAccounts.find(a => a.id === targetId)
    onAuditEvent?.(recordModuleEvent('Bank Accounts', 'Create', targetAccount?.accountName || 'account', txn.id, `Withdraw ${currency}${amt.toLocaleString()} from ${targetAccount?.accountName || 'account'}`))
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
    const destAccount = bankAccounts.find(a => a.id === formToAccount)
    const srcAccount = bankAccounts.find(a => a.id === fromId)

    const outTxn: BankTransaction = {
      id: `bt-${now}-out`,
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

    const inTxn: BankTransaction = {
      id: `bt-${now}-in`,
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

    setBankTransactions(prev => [inTxn, outTxn, ...prev])
    onAuditEvent?.(recordModuleEvent('Bank Accounts', 'Transfer', `${srcAccount?.accountName || 'source'} → ${destAccount?.accountName || 'destination'}`, transferRef, `Transfer ${currency}${amt.toLocaleString()} from ${srcAccount?.accountName || 'unknown'} to ${destAccount?.accountName || 'unknown'}`))
    setToast({ visible: true, message: 'Transfer completed', type: 'success' })
    setDialog({ type: null })
    resetForm()
  }

  const handleDeleteTransaction = () => {
    if (!deleteTarget) return
    const result = deleteBankTransaction(deleteTarget, bankTransactions, bankAccounts, currency)
    if (!result.success) {
      setToast({ visible: true, message: result.error!, type: 'error' })
      setDeleteTarget(null)
      return
    }
    setBankTransactions(result.updatedTransactions)
    setDeleteTarget(null)
    if (result.auditDetails) {
      onAuditEvent?.(recordModuleEvent('Bank Accounts', result.auditDetails.action, result.auditDetails.entityName, result.auditDetails.entityId, result.auditDetails.description))
    }
    setToast({ visible: true, message: 'Transaction deleted', type: 'success' })
  }

  const getStatusBadge = (status: string) => {
    const v = status === 'cleared' ? 'success' : status === 'pending' ? 'warning' : status === 'reconciled' ? 'primary' : 'neutral'
    return <Badge variant={v as any}>{status}</Badge>
  }

  const getTypeBadge = (txn: BankTransaction) => {
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

  const columns: Column<BankTransaction & { balanceAfter: number }>[] = useMemo(() => [
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
        <Button variant="ghost" size="sm" disabled={!TransactionLifecycleService.canDelete('BankTransaction', txn)} onClick={() => setDeleteTarget(txn.id)} aria-label="Delete transaction">
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
      title="No bank accounts yet"
      text="Add your first bank account to start tracking balances."
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

  const remainingAccounts = useMemo(() => bankAccounts.filter(a => a.id !== selectedId), [bankAccounts, selectedId])

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
              options={bankAccounts.filter(a => a.status === 'active').map(a => ({ value: a.id, label: `${a.institution} - ${a.accountName}` }))}
            />
            <div className="text-xs text-secondary" style={{ marginTop: -12, marginBottom: 8 }}>
              Balance: {currency} {(accountBalances[dialog.accountId || selectedId || ''] ?? 0).toLocaleString()}
            </div>
            <Select
              label="To Account"
              value={formToAccount}
              onChange={e => setFormToAccount(e.target.value)}
              options={bankAccounts.filter(a => a.status === 'active' && a.id !== (dialog.accountId || selectedId)).map(a => ({ value: a.id, label: `${a.institution} - ${a.accountName}` }))}
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
            <div className="page-title">{t('bank-accounts', language)}</div>
            <div className="page-subtitle">
              {bankAccounts.length > 0
                ? `${bankAccounts.length} account${bankAccounts.length !== 1 ? 's' : ''} tracked`
                : 'Manage your bank accounts and balances'}
            </div>
          </div>
        </div>
        <div className="page-header-right">
          <Button variant="primary" size="sm" onClick={() => openDialog('addAccount')}><PlusIcon /> Add Account</Button>
        </div>
      </div>

      <div className="page-body">
        {bankAccounts.length === 0 ? noAccountsState : (
          <>
            {selectedAccount && (
              <div className={`featured-account-card bank-theme-${selectedAccount.theme}`}>
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
              <div className="account-detail">
                <div className="account-detail-header">
                  <div className="account-detail-info">
                    <div className="text-lg fw-600">{selectedAccount.accountName}</div>
                    <div className="text-secondary text-sm">
                      {selectedAccount.institution}{selectedAccount.accountNumber !== '----' ? ` · ${maskAccountNumber(selectedAccount.accountNumber)}` : ''}
                    </div>
                  </div>
                  <div className="account-detail-actions" ref={newTxnRef}>
                    <div className="account-detail-actions-wrap">
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
                          <button className="new-txn-dropdown-item" onClick={() => openDialog('transfer', selectedAccount.id)} disabled={bankAccounts.length < 2}>
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
                            className={`account-card compact bank-theme-${acct.theme}${acct.status !== 'active' ? ' account-card-inactive' : ''}`}
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
            )}
          </>
        )}
      </div>
    </>
  )
}
