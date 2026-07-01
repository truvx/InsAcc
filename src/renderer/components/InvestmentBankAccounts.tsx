import React, { useState, useMemo } from 'react'
import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { BankAccount, BankTransaction } from '../data/banking'
import type { AuditEvent } from '../data/auditTypes'
import type { AccountingEngine } from '../accounting/accountingEngine'
import { recordModuleEvent } from '../services/auditService'
import {
  Badge, Button, KpiCard, EmptyState, PlusIcon, TrashIcon,
  Input, Select, Modal
} from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
import EntityForm from './design/EntityForm'
import ConfirmDialog from './design/ConfirmDialog'
import Toast from './Toast'
import { formatDate, maskAccountNumber, t } from '../utils'
import type { BankReconciliationRecord, BankStatementLine } from '../accounting/types'
import BankImportModal from './BankImportModal'
import { getBankDashboardProjection, getAccountStatementProjection } from '../readModels/InvestmentBankReadModel'
import BankAccountAvatar from './BankAccountAvatar'

interface Props {
  currency?: string
  dateFormat?: string
  language?: string
  accounts: Account[]
  vouchers: Voucher[]
  setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>
  bankAccounts: BankAccount[]
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>
  bankTransactions: BankTransaction[]
  setBankTransactions: React.Dispatch<React.SetStateAction<BankTransaction[]>>
  bankMappings: BankMapping[]
  accountingEngine: AccountingEngine
  onAuditEvent?: (event: AuditEvent) => void
  bankReconciliations: BankReconciliationRecord[]
  setBankReconciliations: React.Dispatch<React.SetStateAction<BankReconciliationRecord[]>>
}

type DialogType = 'addAccount' | 'deposit' | 'withdraw' | 'transfer' | null

export default function InvestmentBankAccounts({
  currency = 'AED', dateFormat = 'DD/MM/YYYY', language = 'English',
  accounts, vouchers, setVouchers,
  bankAccounts, setBankAccounts, bankTransactions, setBankTransactions,
  bankMappings, accountingEngine, onAuditEvent,
  bankReconciliations, setBankReconciliations,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ type: DialogType; accountId?: string }>({ type: null })
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [searchQuery, setSearchQuery] = useState('')
  const [txnFilter, setTxnFilter] = useState<'all' | 'deposits' | 'withdrawals' | 'transfers'>('all')
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

  const selectedBankAccount = useMemo(() => bankAccounts.find(a => a.id === selectedId) || null, [bankAccounts, selectedId])

  const selectedAccountReconciliations = useMemo(() => {
    return bankReconciliations.filter(r => r.bankAccountId === selectedId)
  }, [bankReconciliations, selectedId])

  const bankProjection = useMemo(
    () => getBankDashboardProjection(bankAccounts, bankTransactions, accounts, vouchers),
    [bankAccounts, bankTransactions, accounts, vouchers],
  )

  const accountStatement = useMemo(() => {
    if (!selectedId) return { transactions: [], runningBalances: {} as Record<string, number>, stats: { deposits: 0, withdrawals: 0, transfers: 0 } }
    return getAccountStatementProjection(selectedId, bankAccounts, bankTransactions, accounts, vouchers)
  }, [selectedId, bankAccounts, bankTransactions, accounts, vouchers])

  const accountTransactions = accountStatement.transactions
  const accountStats = accountStatement.stats
  const runningBalances = accountStatement.runningBalances

  const filteredTransactions = useMemo(() => {
    let result = accountTransactions
    if (txnFilter === 'deposits') result = result.filter(t => t.type === 'credit')
    else if (txnFilter === 'withdrawals') result = result.filter(t => t.type === 'debit')
    else if (txnFilter === 'transfers') result = result.filter(t => t.type === 'transfer_in' || t.type === 'transfer_out')
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.date.includes(q)
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

  const formatAmount = (txn: typeof tableData[0]) => {
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
    onAuditEvent?.(recordModuleEvent('Bank Accounts', 'Create', newAccount.accountName, newAccount.id, `Added account: ${newAccount.accountName} @ ${newAccount.institution}`))
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
    if (!fromId || !formToAccount) {
      setToast({ visible: true, message: 'Select source and destination', type: 'error' })
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
    const deleted = bankTransactions.find(t => t.id === deleteTarget)
    setBankTransactions(prev => prev.filter(t => t.id !== deleteTarget))
    setDeleteTarget(null)
    if (deleted) {
      const account = bankAccounts.find(a => a.id === deleted.accountId)
      onAuditEvent?.(recordModuleEvent('Bank Accounts', 'Delete', account?.accountName || 'unknown', deleted.id, `Deleted ${deleted.type} transaction: ${deleted.description}`))
    }
    setToast({ visible: true, message: 'Transaction deleted', type: 'success' })
  }

  const getStatusBadge = (status: string) => {
    const v = status === 'cleared' ? 'success' : status === 'pending' ? 'warning' : 'neutral'
    return <Badge variant={v as any}>{status}</Badge>
  }

  const getTypeBadge = (txn: typeof tableData[0]) => {
    if (txn.type === 'credit' || txn.type === 'transfer_in') return <Badge variant="success">deposit</Badge>
    if (txn.type === 'debit' || txn.type === 'transfer_out') return <Badge variant="danger">withdrawal</Badge>
    return <Badge variant="primary">Transfer</Badge>
  }

  const columns: Column<typeof tableData[0]>[] = useMemo(() => [
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

  const themeOptions = [
    { value: 'emerald', label: 'Emerald Green' },
    { value: 'blue', label: 'Blue' },
    { value: 'purple', label: 'Purple' },
    { value: 'amber', label: 'Amber' },
    { value: 'rose', label: 'Rose' },
    { value: 'indigo', label: 'Indigo' },
    { value: 'teal', label: 'Teal' },
  ]

  const accountTypeOptions = [
    { value: 'checking', label: 'Checking' },
    { value: 'savings', label: 'Savings' },
    { value: 'cash', label: 'Cash' },
    { value: 'credit', label: 'Credit Card' },
  ]

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction?"
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
            <Input label="Account Name" value={formAccountName} onChange={e => setFormAccountName(e.target.value)} placeholder="e.g. Savings Account" />
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
            <Input label="Description" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="e.g. Asset purchase" />
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
            <Select
              label="To Account"
              value={formToAccount}
              onChange={e => setFormToAccount(e.target.value)}
              options={bankAccounts.filter(a => a.status === 'active' && a.id !== (dialog.accountId || selectedId)).map(a => ({ value: a.id, label: `${a.institution} - ${a.accountName}` }))}
            />
            <Input label={`Amount (${currency})`} type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0" autoFocus />
            <Input label="Description" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Optional" />
            <Input label="Date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
          </div>
        )}
      </EntityForm>

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Bank Accounts</div>
            <div className="page-subtitle">
              {bankAccounts.length > 0
                ? `${bankAccounts.length} account${bankAccounts.length !== 1 ? 's' : ''} tracked`
                : 'Manage your bank accounts'}
            </div>
          </div>
        </div>
        <div className="page-header-right">
          <Button variant="primary" size="sm" onClick={() => openDialog('addAccount')}><PlusIcon /> Add Account</Button>
        </div>
      </div>

      <div className="page-body">
        {bankAccounts.length === 0 ? (
          <EmptyState
            icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>}
            title="No bank accounts yet"
            text="Add your first bank account to start tracking balances."
            action={<Button variant="primary" onClick={() => openDialog('addAccount')}><PlusIcon /> Add Account</Button>}
          />
        ) : (
          <>
            <div className="kpi-grid">
              <KpiCard label="Total Cash" value={`${currency} ${bankProjection.totalTransactionBalance.toLocaleString()}`} accentColor="var(--success)" />
              <KpiCard label="Active Accounts" value={String(bankProjection.activeAccounts)} accentColor="var(--primary)" />
              <KpiCard label="This Month Flow" value={`${bankProjection.thisMonthFlow >= 0 ? '+' : ''}${currency} ${Math.abs(bankProjection.thisMonthFlow).toLocaleString()}`} accentColor={bankProjection.thisMonthFlow >= 0 ? 'var(--success)' : 'var(--danger)'} />
              <KpiCard label="Ledger Bank Balance" value={`${currency} ${bankProjection.totalLedgerBankBalance.toLocaleString()}`} accentColor="var(--accent)" />
            </div>

            {/* Reconciliation Summary */}
            <div className="card card-table" style={{ marginBottom: 20 }}>
              <div className="card-body">
                <div className="text-sm fw-600 mb-2">Bank Reconciliation Summary</div>
                <table className="property-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th className="text-xs">Account</th>
                      <th className="text-xs" style={{ textAlign: 'right' }}>Ledger Balance</th>
                      <th className="text-xs" style={{ textAlign: 'right' }}>Statement Balance</th>
                      <th className="text-xs" style={{ textAlign: 'right' }}>Difference</th>
                      <th className="text-xs">Last Reconciled</th>
                      <th className="text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankProjection.accounts.map(({ account: acct, transactionBalance: bal, ledgerBalance }) => {
                      const diff = ledgerBalance - bal
                      const lastReconciled = bankTransactions
                        .filter(t => t.accountId === acct.id && (t.status === 'reconciled' || t.status === 'cleared'))
                        .sort((a, b) => b.date.localeCompare(a.date))[0]?.date || 'Never'
                      const statusLabel = Math.abs(diff) < 0.01 ? 'Reconciled' : 'Unreconciled'
                      const statusVariant = Math.abs(diff) < 0.01 ? 'success' : 'danger'
                      return (
                        <tr key={acct.id}>
                          <td className="text-xs fw-500">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <BankAccountAvatar bank={acct} size={24} />
                              <span>{acct.institution} — {acct.accountName}</span>
                            </div>
                          </td>
                          <td className="text-mono text-xs" style={{ textAlign: 'right' }}>{currency} {ledgerBalance.toLocaleString()}</td>
                          <td className="text-mono text-xs" style={{ textAlign: 'right' }}>{currency} {bal.toLocaleString()}</td>
                          <td className={`text-mono text-xs fw-600 ${Math.abs(diff) < 0.01 ? '' : diff > 0 ? 'text-success' : 'text-danger'}`} style={{ textAlign: 'right' }}>
                            {Math.abs(diff) < 0.01 ? '—' : `${currency} ${Math.abs(diff).toLocaleString()}`}
                          </td>
                          <td className="text-xs text-secondary">{lastReconciled === 'Never' ? 'Never' : formatDate(lastReconciled, dateFormat)}</td>
                          <td><Badge variant={statusVariant}>{statusLabel}</Badge></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="account-cards-grid" style={{ marginBottom: 20 }}>
              {bankProjection.accounts.map(({ account: acct, transactionBalance: bal }) => (
                <div
                  key={acct.id}
                  className={`account-card compact prop-theme-${acct.theme}${selectedId === acct.id ? ' account-card-selected' : ''}${acct.status !== 'active' ? ' account-card-inactive' : ''}`}
                  onClick={() => setSelectedId(acct.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="account-card-theme" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 0 0 14px' }}>
                    <BankAccountAvatar bank={acct} />
                    <div className="account-card-institution">{acct.institution} · {maskAccountNumber(acct.accountNumber)}</div>
                  </div>
                  <div className="account-card-name">{acct.accountName}</div>
                  <div className="account-card-balance">{currency} {bal.toLocaleString()}</div>
                  <div className="account-card-footer">
                    <Badge variant={acct.accountType === 'savings' ? 'primary' : acct.accountType === 'credit' ? 'warning' : 'neutral'}>
                      {acct.accountType}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {selectedBankAccount && accountStats && (
              <>
                <div className="card card-table">
                <div className="card-header">
                  <span className="card-title">{selectedBankAccount.accountName} — Transactions</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>Import Statement</Button>
                    <Button variant="primary" size="sm" onClick={() => openDialog('deposit', selectedId!)}>Deposit</Button>
                    <Button variant="secondary" size="sm" onClick={() => openDialog('withdraw', selectedId!)}>Withdraw</Button>
                    {bankAccounts.length > 1 && (
                      <Button variant="secondary" size="sm" onClick={() => openDialog('transfer', selectedId!)}>Transfer</Button>
                    )}
                  </div>
                </div>
                <div className="card-body">
                  <DataTable
                    columns={columns}
                    data={tableData}
                    keyExtractor={t => t.id}
                    pageSize={10}
                    emptyState={
                      <EmptyState
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>}
                        title="No transactions"
                        text="Use the buttons above to add transactions."
                      />
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
