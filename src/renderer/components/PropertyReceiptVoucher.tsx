import React, { useState, useMemo } from 'react'
import type { Account, Voucher, BankMapping, PostingResult } from '../accounting/types'
import type { PropAccount, LeaseEntry, TenantEntry } from '../data/propertyTypes'
import { Button, Input, Select, Badge, EmptyState, SearchIcon, CloseIcon } from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
import EntityForm from './design/EntityForm'
import Toast from './Toast'
import { formatDate } from '../utils'
import { getAccountIdForBank } from '../accounting/bankAccountMapping'
import type { AccountingEngine } from '../accounting/accountingEngine'
import { getLinesForAccount } from '../accounting/ledgerService'
import { useVoucherLifecycle } from '../hooks/useVoucherLifecycle'
import VoucherStatusBadge from './design/VoucherStatusBadge'
import VoucherDetailsModal from './design/VoucherDetailsModal'

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
  leases?: LeaseEntry[]
  tenants?: TenantEntry[]
}

export default function PropertyReceiptVoucher({
  currency = 'AED', dateFormat = 'DD/MM/YYYY',
  accounts, vouchers, setVouchers,
  propAccounts, bankMappings, accountingEngine,
  leases = [], tenants = [],
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
  const [formReference, setFormReference] = useState('')
  const [formReceivedFrom, setFormReceivedFrom] = useState('')

  const receiptVouchers = useMemo(() =>
    vouchers.filter(v => v.type === 'Receipt').sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [vouchers]
  )

  const filtered = useMemo(() => {
    if (!searchQuery) return receiptVouchers
    const q = searchQuery.toLowerCase()
    return receiptVouchers.filter(v =>
      v.number.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q) ||
      v.reference.toLowerCase().includes(q)
    )
  }, [receiptVouchers, searchQuery])

  const bankOptions = useMemo(() => [
    { value: '', label: 'Select bank account' },
    ...propAccounts.map(a => ({
      value: a.id,
      label: `${a.institution} - ${a.accountName}`,
    })),
  ], [propAccounts])

  const leaseOptions = useMemo(() => [
    { value: '', label: 'Select lease (optional)' },
    ...leases.filter(l => l.status === 'Active').map(l => {
      const tenant = tenants.find(t => t.id === l.tenantId)
      return { value: l.leaseNumber, label: `${l.leaseNumber} — ${tenant?.name || 'Unknown'}` }
    }),
  ], [leases, tenants])

  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0])
    setFormAmount('')
    setFormDescription('')
    setFormBankAccount('')
    setFormReference('')
    setFormReceivedFrom('')
  }

  const handleCreateVoucher = () => {
    const amt = Number(formAmount)
    if (!formAmount || amt <= 0) {
      showToast('Amount must be greater than zero', 'error')
      return
    }
    if (!formBankAccount) {
      showToast('Please select a bank account', 'error')
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

    const ref = formReceivedFrom || formReference || undefined
    const event = formReference ? 'RENT_RECEIVED' : 'INCOME_RECEIVED'

    const result: PostingResult = accountingEngine.processAccountingEvent(
      event,
      {
        amount: amt,
        date: formDate,
        description: formDescription + (formReceivedFrom ? ` (from ${formReceivedFrom})` : ''),
        currency,
        exchangeRate: 1,
        baseCurrency: 'AED',
        bankAccount: bankAccountId,
        creditAccount: accounts.find(a => a.code === '4120')?.id,
        referenceType: formReference ? 'Lease' : 'Property',
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
    showToast(`Draft receipt voucher ${result.voucher.number} created`, 'success')
    resetForm()
  }

  const getBankName = (v: Voucher) => {
    const debitLine = v.lines.find(l => l.type === 'Debit')
    if (!debitLine) return '—'
    const acct = accounts.find(a => a.id === debitLine.accountId)
    return acct?.name || '—'
  }

  const getReferenceInfo = (ref: string) => {
    if (!ref) return null
    const lease = leases.find(l => l.leaseNumber === ref || l.id === ref)
    if (lease) {
      const tenant = tenants.find(t => t.id === lease.tenantId)
      return { lease: lease.leaseNumber, tenant: tenant?.name || 'Unknown' }
    }
    return null
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
      key: 'receivedFrom',
      header: 'Received From',
      sortable: true,
      render: v => {
        const refInfo = getReferenceInfo(v.reference)
        return <span className="fw-500 text-sm">{refInfo?.tenant || v.reference || formReceivedFrom || '—'}</span>
      },
    },
    {
      key: 'bankAccount',
      header: 'Credited To',
      render: v => <span className="text-secondary text-xs">{getBankName(v)}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: v => <span className="text-sm" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{v.description}</span>,
    },
    {
      key: 'reference',
      header: 'Reference',
      render: v => {
        const refInfo = getReferenceInfo(v.reference)
        return refInfo ? (
          <div>
            <span className="text-xs fw-500">{refInfo.lease}</span>
            <div className="text-xs text-secondary">{refInfo.tenant}</div>
          </div>
        ) : (
          <span className="text-secondary text-xs">{v.reference || '—'}</span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: v => <VoucherStatusBadge status={v.status} />,
    },
  ], [dateFormat, formReceivedFrom])

  const totalAmount = useMemo(() =>
    filtered.filter(v => v.status === 'Posted').reduce((s, v) => s + v.lines.reduce((ls, l) => ls + (l.type === 'Debit' ? l.amount : 0), 0), 0),
    [filtered]
  )

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      <EntityForm
        open={showForm}
        title="New Receipt Voucher"
        submitLabel="Create Draft"
        onCancel={() => { setShowForm(false); resetForm() }}
        onSubmit={handleCreateVoucher}
      >
        <div className="form-row">
          <Input label="Date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
          <Input label={`Amount (${currency})`} type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0" />
        </div>
        <div className="form-row">
          <Input label="Received From" value={formReceivedFrom} onChange={e => setFormReceivedFrom(e.target.value)} placeholder="Tenant or payer name" />
          <Select label="Reference Lease" value={formReference} onChange={e => setFormReference(e.target.value)} options={leaseOptions} />
        </div>
        <div className="form-row">
          <Input label="Description" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="e.g. Rent received" />
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
            <div className="page-title">Receipt Vouchers</div>
            <div className="page-subtitle">Record income received into bank accounts</div>
          </div>
        </div>
        <div className="page-header-right">
          <Button variant="primary" size="sm" onClick={() => { setShowForm(true); resetForm() }}>+ New Receipt</Button>
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid" style={{ marginBottom: 16 }}>
          <div className="kpi-card" style={{ borderTop: '2px solid var(--success)' }}>
            <div className="kpi-label">Total Receipts (Posted)</div>
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
              title="No receipt vouchers"
              text="Create a receipt voucher to record income received into a bank account."
            />
          }
        />
      </div>
    </>
  )
}
