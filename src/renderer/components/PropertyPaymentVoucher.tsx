import React, { useState, useMemo } from 'react'
import type { Account, Voucher, BankMapping, PostingResult } from '../accounting/types'
import type { PropAccount, PropertyEntry } from '../data/propertyTypes'
import { Button, Input, Select, Badge, EmptyState, SearchIcon, CloseIcon } from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
import EntityForm from './design/EntityForm'
import Toast from './Toast'
import { formatDate } from '../utils'
import { getAccountIdForBank } from '../accounting/bankAccountMapping'
import type { AccountingEngine } from '../accounting/accountingEngine'
import { useVoucherLifecycle } from '../hooks/useVoucherLifecycle'
import VoucherStatusBadge from './design/VoucherStatusBadge'
import VoucherDetailsModal from './design/VoucherDetailsModal'

const EXPENSE_ACCOUNTS = [
  { code: '5120', name: 'Maintenance' },
  { code: '5170', name: 'Repairs' },
  { code: '5140', name: 'Utilities' },
  { code: '5110', name: 'Management Fees' },
  { code: '5130', name: 'Insurance' },
  { code: '5150', name: 'Professional Fees' },
  { code: '5180', name: 'Miscellaneous' },
]

interface Props {
  currency?: string
  dateFormat?: string
  language?: string
  accounts: Account[]
  vouchers: Voucher[]
  setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>
  propAccounts: PropAccount[]
  bankMappings: BankMapping[]
  accountingEngine: AccountingEngine
  properties?: PropertyEntry[]
}

export default function PropertyPaymentVoucher({
  currency = 'AED', dateFormat = 'DD/MM/YYYY',
  accounts, vouchers, setVouchers,
  propAccounts, bankMappings, accountingEngine,
  properties = [],
}: Props) {
  const {
    detailVoucher, setDetailVoucher,
    toast, showToast, hideToast, loading,
    handlePost, handleApprove, handleCancel, handleDiscard, handleReverse
  } = useVoucherLifecycle(accountingEngine, accounts, setVouchers)

  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formAmount, setFormAmount] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formBankAccount, setFormBankAccount] = useState('')
  const [formExpenseAccount, setFormExpenseAccount] = useState('')
  const [formReference, setFormReference] = useState('')
  const [formPaidTo, setFormPaidTo] = useState('')

  const paymentVouchers = useMemo(() =>
    vouchers.filter(v => v.type === 'Payment').sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [vouchers]
  )

  const filtered = useMemo(() => {
    if (!searchQuery) return paymentVouchers
    const q = searchQuery.toLowerCase()
    return paymentVouchers.filter(v =>
      v.number.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q) ||
      v.reference.toLowerCase().includes(q)
    )
  }, [paymentVouchers, searchQuery])

  const bankOptions = useMemo(() => [
    { value: '', label: 'Select bank account' },
    ...propAccounts.map(a => ({
      value: a.id,
      label: `${a.institution} - ${a.accountName}`,
    })),
  ], [propAccounts])

  const expenseOptions = useMemo(() => {
    const found = EXPENSE_ACCOUNTS.map(ea => {
      const acct = accounts.find(a => a.code === ea.code)
      return acct ? { value: acct.id, label: ea.name } : null
    }).filter((x): x is { value: string; label: string } => x !== null)
    return [{ value: '', label: 'Select expense type' }, ...found]
  }, [accounts])

  const propertyOptions = useMemo(() => [
    { value: '', label: 'Select property (optional)' },
    ...properties.map(p => ({ value: p.name, label: p.name })),
  ], [properties])

  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0])
    setFormAmount('')
    setFormDescription('')
    setFormBankAccount('')
    setFormExpenseAccount('')
    setFormReference('')
    setFormPaidTo('')
  }

  const handleCreateVoucher = () => {
    const amt = Number(formAmount)
    if (!formAmount || amt <= 0) {
      showToast('Amount must be greater than zero', 'error')
      return
    }
    if (!formBankAccount || !formExpenseAccount) {
      showToast('Please select bank account and expense type', 'error')
      return
    }
    if (!formDescription) {
      showToast('Description is required', 'error')
      return
    }

    const bankAccountId = getAccountIdForBank(formBankAccount, bankMappings)
    if (!bankAccountId) {
      showToast('Bank account not mapped to chart of accounts', 'error')
      return
    }

    const ref = formPaidTo || formReference || undefined

    const result: PostingResult = accountingEngine.processAccountingEvent(
      'EXPENSE_PAID',
      {
        amount: amt,
        date: formDate,
        description: formDescription + (formPaidTo ? ` (paid to ${formPaidTo})` : ''),
        currency,
        exchangeRate: 1,
        baseCurrency: 'AED',
        bankAccount: bankAccountId,
        debitAccount: formExpenseAccount,
        referenceType: 'Property',
        referenceId: ref,
        createdBy: 'user',
      },
      accounts,
      vouchers,
    )

    if (!result.success || !result.voucher) {
      showToast(result.errors.map(e => e.message).join(', '), 'error')
      return
    }

    setVouchers(prev => [result.voucher!, ...prev])
    setShowForm(false)
    showToast(`Draft payment voucher ${result.voucher.number} created`, 'success')
    resetForm()
  }

  const getBankName = (v: Voucher) => {
    const creditLine = v.lines.find(l => l.type === 'Credit')
    if (!creditLine) return '—'
    const acct = accounts.find(a => a.id === creditLine.accountId)
    return acct?.name || '—'
  }

  const getExpenseName = (v: Voucher) => {
    const debitLine = v.lines.find(l => l.type === 'Debit')
    if (!debitLine) return '—'
    const acct = accounts.find(a => a.id === debitLine.accountId)
    return acct?.name || '—'
  }

  const columns: Column<Voucher>[] = useMemo(() => [
    {
      key: 'number',
      header: 'Voucher #',
      sortable: true,
      render: v => (
        <Button variant="ghost" size="sm" onClick={() => setDetailVoucher(v)} style={{ padding: 0, height: 'auto', fontWeight: 600 }}>
          <span className="text-mono text-xs fw-600" style={{ color: 'var(--primary)' }}>{v.number}</span>
        </Button>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: v => <span className="text-secondary text-xs">{formatDate(v.date, dateFormat)}</span>,
    },
    {
      key: 'paidTo',
      header: 'Paid To',
      sortable: true,
      render: v => <span className="fw-500 text-sm">{v.reference || formPaidTo || '—'}</span>,
    },
    {
      key: 'bankAccount',
      header: 'Paid From',
      render: v => <span className="text-secondary text-xs">{getBankName(v)}</span>,
    },
    {
      key: 'expenseType',
      header: 'Expense Type',
      render: v => <Badge variant="neutral">{getExpenseName(v)}</Badge>,
    },
    {
      key: 'description',
      header: 'Description',
      render: v => <span className="text-sm" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{v.description}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: v => <VoucherStatusBadge status={v.status} />,
    },
  ], [dateFormat, formPaidTo])

  const totalAmount = useMemo(() =>
    filtered.filter(v => v.status === 'Posted').reduce((s, v) => s + v.lines.reduce((ls, l) => ls + (l.type === 'Credit' ? l.amount : 0), 0), 0),
    [filtered]
  )

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      <EntityForm
        open={showForm}
        title="New Payment Voucher"
        submitLabel="Create Draft"
        onCancel={() => { setShowForm(false); resetForm() }}
        onSubmit={handleCreateVoucher}
      >
        <div className="form-row">
          <Input label="Date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
          <Input label={`Amount (${currency})`} type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0" />
        </div>
        <div className="form-row">
          <Input label="Paid To" value={formPaidTo} onChange={e => setFormPaidTo(e.target.value)} placeholder="Supplier or payee name" />
          <Select label="Reference Property" value={formReference} onChange={e => setFormReference(e.target.value)} options={propertyOptions} />
        </div>
        <div className="form-row">
          <Input label="Description" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="e.g. Maintenance payment" />
          <Select label="Expense Type" value={formExpenseAccount} onChange={e => setFormExpenseAccount(e.target.value)} options={expenseOptions} />
        </div>
        <div className="form-row">
          <Select label="Bank Account" value={formBankAccount} onChange={e => setFormBankAccount(e.target.value)} options={bankOptions} />
        </div>
      </EntityForm>

      <VoucherDetailsModal
        open={detailVoucher !== null}
        voucher={detailVoucher}
        accounts={accounts}
        currency={currency}
        dateFormat={dateFormat}
        loading={loading}
        onClose={() => setDetailVoucher(null)}
        onPost={handlePost}
        onApprove={handleApprove}
        onCancel={handleCancel}
        onDiscard={handleDiscard}
        onReverse={handleReverse}
      />

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Payment Vouchers</div>
            <div className="page-subtitle">Record expenses paid from bank accounts</div>
          </div>
        </div>
        <div className="page-header-right">
          <Button variant="primary" size="sm" onClick={() => { setShowForm(true); resetForm() }}>+ New Payment</Button>
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid" style={{ marginBottom: 16 }}>
          <div className="kpi-card" style={{ borderTop: '2px solid var(--danger)' }}>
            <div className="kpi-label">Total Payments (Posted)</div>
            <div className="kpi-value" style={{ fontSize: 22 }}>{currency} {totalAmount.toLocaleString()}</div>
          </div>
          <div className="kpi-card" style={{ borderTop: '2px solid var(--primary)' }}>
            <div className="kpi-label">This Period</div>
            <div className="kpi-value" style={{ fontSize: 22 }}>{String(filtered.length)}</div>
          </div>
        </div>

        <div className="data-table-toolbar">
          <div className="data-table-filters" />
          <div className="data-table-search" style={{ minWidth: 260 }}>
            <SearchIcon />
            <input
              type="text"
              className="data-table-search-input"
              placeholder="Search vouchers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="data-table-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear">
                <CloseIcon />
              </button>
            )}
          </div>
        </div>

        <DataTable<Voucher>
          columns={columns}
          data={filtered}
          keyExtractor={v => v.id}
          pageSize={10}
          emptyState={
            <EmptyState
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
              title="No payment vouchers"
              text="Create a payment voucher to record expenses paid from a bank account."
            />
          }
        />
      </div>
    </>
  )
}
