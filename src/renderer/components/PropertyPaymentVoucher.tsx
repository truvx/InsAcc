import React, { useState, useMemo } from 'react'
import type { Account, Voucher, BankMapping, PostingResult } from '../accounting/types'
import type { PropAccount, PropertyEntry } from '../data/propertyTypes'
import { Button, Input, Select, Badge, EmptyState, SearchIcon, CloseIcon, Modal } from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
import EntityForm from './design/EntityForm'
import Toast from './Toast'
import { formatDate } from '../utils'
import { getAccountIdForBank } from '../accounting/bankAccountMapping'
import type { AccountingEngine } from '../accounting/accountingEngine'
import VoucherTimeline from './VoucherTimeline'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formAmount, setFormAmount] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formBankAccount, setFormBankAccount] = useState('')
  const [formExpenseAccount, setFormExpenseAccount] = useState('')
  const [formReference, setFormReference] = useState('')
  const [formPaidTo, setFormPaidTo] = useState('')
  const [detailVoucher, setDetailVoucher] = useState<Voucher | null>(null)

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
      setToast({ visible: true, message: 'Amount must be greater than zero', type: 'error' })
      return
    }
    if (!formBankAccount || !formExpenseAccount) {
      setToast({ visible: true, message: 'Please select bank account and expense type', type: 'error' })
      return
    }
    if (!formDescription) {
      setToast({ visible: true, message: 'Description is required', type: 'error' })
      return
    }

    const bankAccountId = getAccountIdForBank(formBankAccount, bankMappings)
    if (!bankAccountId) {
      setToast({ visible: true, message: 'Bank account not mapped to chart of accounts', type: 'error' })
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
      setToast({ visible: true, message: result.errors.map(e => e.message).join(', '), type: 'error' })
      return
    }

    const approveResult = accountingEngine.approve(result.voucher, 'user')
    const postResult = accountingEngine.post(approveResult.voucher!, 'user', accounts, vouchers)
    if (!postResult.success || !postResult.voucher) {
      setToast({ visible: true, message: 'Voucher created but posting failed', type: 'error' })
      return
    }

    setVouchers(prev => [postResult.voucher!, ...prev])
    setShowForm(false)
    setToast({ visible: true, message: `Payment voucher ${postResult.voucher.number} created and posted`, type: 'success' })
    resetForm()
  }

  const getStatusBadge = (status: string) => {
    const v = status === 'Posted' ? 'success' : status === 'Approved' ? 'primary' : status === 'Cancelled' ? 'danger' : 'warning'
    return <Badge variant={v as any}>{status}</Badge>
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
      render: v => getStatusBadge(v.status),
    },
  ], [dateFormat, formPaidTo])

  const totalAmount = useMemo(() =>
    filtered.filter(v => v.status === 'Posted').reduce((s, v) => s + v.lines.reduce((ls, l) => ls + (l.type === 'Credit' ? l.amount : 0), 0), 0),
    [filtered]
  )

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

      <EntityForm
        open={showForm}
        title="New Payment Voucher"
        submitLabel="Create & Post"
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

      {/* Voucher Detail Modal */}
      <Modal open={detailVoucher !== null} title="Voucher Details" onClose={() => setDetailVoucher(null)}>
        {detailVoucher && (
          <div style={{ minWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="grid-2" style={{ gap: 8 }}>
              <div className="settings-field" style={{ margin: 0 }}>
                <div className="settings-field-label">Voucher #</div>
                <div className="text-mono text-xs fw-600">{detailVoucher.number}</div>
              </div>
              <div className="settings-field" style={{ margin: 0 }}>
                <div className="settings-field-label">Date</div>
                <div className="text-xs">{formatDate(detailVoucher.date, dateFormat)}</div>
              </div>
              <div className="settings-field" style={{ margin: 0 }}>
                <div className="settings-field-label">Status</div>
                {getStatusBadge(detailVoucher.status)}
              </div>
              <div className="settings-field" style={{ margin: 0 }}>
                <div className="settings-field-label">Type</div>
                <Badge variant="neutral">{detailVoucher.type}</Badge>
              </div>
            </div>

            <div>
              <div className="text-sm fw-600 mb-1" style={{ color: 'var(--primary)' }}>Voucher Timeline</div>
              <div className="card-accent-purple" style={{ padding: '8px 12px', borderRadius: 8 }}>
                <VoucherTimeline voucher={detailVoucher} dateFormat={dateFormat} />
              </div>
            </div>

            <div>
              <div className="text-sm fw-600 mb-1" style={{ color: 'var(--primary)' }}>Ledger Entries</div>
              <table className="property-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th className="text-xs">Account</th>
                    <th className="text-xs">Debit</th>
                    <th className="text-xs">Credit</th>
                    <th className="text-xs">Narration</th>
                  </tr>
                </thead>
                <tbody>
                  {detailVoucher.lines.map((line, i) => {
                    const acct = accounts.find(a => a.id === line.accountId)
                    return (
                      <tr key={i}>
                        <td className="text-xs fw-500">{acct?.name || line.accountId}</td>
                        <td className="text-xs text-mono">{line.type === 'Debit' ? `${currency} ${line.baseAmount.toLocaleString()}` : '—'}</td>
                        <td className="text-xs text-mono">{line.type === 'Credit' ? `${currency} ${line.baseAmount.toLocaleString()}` : '—'}</td>
                        <td className="text-xs text-secondary">{line.narration || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {detailVoucher.reference && (
              <div className="settings-field" style={{ margin: 0 }}>
                <div className="settings-field-label">Reference</div>
                <div className="text-xs">{detailVoucher.reference}</div>
              </div>
            )}
          </div>
        )}
      </Modal>

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
