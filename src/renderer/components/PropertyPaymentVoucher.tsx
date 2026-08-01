import React, { useState, useMemo } from 'react'
import type { Account, Voucher, BankMapping, PostingResult } from '../accounting/types'
import type { PropAccount, PropertyEntry, UnitEntry, VendorEntry } from '../data/propertyTypes'
import type { PurchaseRecord } from '../data/purchaseLedger'
import { Button, Input, Select, Badge, EmptyState, SearchIcon, CloseIcon } from './design/DesignSystem'
import { useMasterData } from '../contexts/MasterDataContext'
import { PartyLookupService, type Party } from '../services/partyLookupService'
import { SearchablePartySelect } from './design/SearchablePartySelect'
import { DataTable, type Column } from './design/Table'
import EntityForm from './design/EntityForm'
import Toast from './Toast'
import { formatDate, formatModifiedDateTime } from '../utils'
import { getAccountIdForBank } from '../accounting/bankAccountMapping'
import { getDefaultPropertyPaymentBankAccount } from '../services/bankingService'
import type { AccountingEngine } from '../accounting/accountingEngine'
import { useVoucherLifecycle, autoPostVoucher } from '../hooks/useVoucherLifecycle'
import { invalidateBalanceCache } from '../accounting/ledgerService'
import VoucherStatusBadge from './design/VoucherStatusBadge'
import VoucherDetailsModal from './design/VoucherDetailsModal'
import ActionsMenu from './design/ActionsMenu'
import { CurrencyText } from './design/CurrencyText'
import AuditTrailModal from './design/AuditTrailModal'
import { printVoucher } from '../utils/printVoucherHelper'
import { exportVoucherToPDF } from '../utils/pdfVoucherHelper'
import type { AuditEvent } from '../data/auditTypes'

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
  units?: UnitEntry[]
  purchaseRecords?: PurchaseRecord[]
  defaultParty?: Party
  onAuditEvent?: (event: AuditEvent) => void
  auditEvents?: AuditEvent[]
  vendors?: VendorEntry[]
}

export default function PropertyPaymentVoucher({
  currency = 'AED', dateFormat = 'DD/MM/YYYY',
  accounts, vouchers, setVouchers,
  propAccounts, bankMappings, accountingEngine,
  properties = [],
  units = [],
  purchaseRecords = [],
  defaultParty,
  onAuditEvent,
  auditEvents = [],
  vendors = [],
}: Props) {
  const {
    detailVoucher, setDetailVoucher,
    toast, showToast, hideToast, loading,
    handlePost, handleApprove, handleCancel, handleDiscard, handleReverse
  } = useVoucherLifecycle(accountingEngine, accounts, setVouchers)

  const { customers } = useMasterData()

  const lookupService = useMemo(() => new PartyLookupService({
    properties,
    units,
    propVendors: vendors,
    customers,
    purchaseRecords,
  }), [properties, units, vendors, customers, purchaseRecords])

  const paymentParties = useMemo(() => lookupService.getPaymentParties('property'), [lookupService])

  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formAmount, setFormAmount] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const defaultBank = useMemo(() => getDefaultPropertyPaymentBankAccount(propAccounts), [propAccounts])
  const [formBankAccount, setFormBankAccount] = useState(defaultBank ? defaultBank.id : '')
  const [formExpenseAccount, setFormExpenseAccount] = useState('')
  const [formReference, setFormReference] = useState('')
  const [formPaidTo, setFormPaidTo] = useState('')

  const [formPaymentMode, setFormPaymentMode] = useState<string>('Bank Transfer')
  const [formPaymentReference, setFormPaymentReference] = useState('')

  const handlePaymentModeChange = (mode: string) => {
    setFormPaymentMode(mode)
  }

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [auditVoucher, setAuditVoucher] = useState<Voucher | null>(null)

  const paymentVouchers = useMemo(() =>
    vouchers.filter(v => v.type === 'Payment' && !v.isDeleted).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
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
    ...propAccounts.filter(a => a.status === 'active' || a.id === formBankAccount).map(a => ({
      value: a.id,
      label: a.institution,
    })),
  ], [propAccounts, formBankAccount])

  const coaOptions = useMemo(() => {
    const leafAccounts = accounts.filter(a => {
      if (!a.isActive) return false
      // Exclude parent accounts (those that have children)
      const hasChildren = accounts.some(child => child.parentId === a.id && child.isActive)
      if (hasChildren) return false
      return true
    })
    // Sort: expense accounts first, then others
    const sorted = [...leafAccounts].sort((a, b) => {
      const aIsExpense = a.type === 'expense' ? 0 : 1
      const bIsExpense = b.type === 'expense' ? 0 : 1
      if (aIsExpense !== bIsExpense) return aIsExpense - bIsExpense
      return a.code.localeCompare(b.code)
    })
    return [
      { value: '', label: 'Select account to debit' },
      ...sorted.map(a => ({ value: a.id, label: `${a.code} — ${a.name} (${a.type})` }))
    ]
  }, [accounts])

  const propertyOptions = useMemo(() => [
    { value: '', label: 'Select property (optional)' },
    ...properties.map(p => ({ value: p.name, label: p.name })),
  ], [properties])


  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0])
    setFormAmount('')
    setFormDescription('')
    setFormBankAccount(defaultBank ? defaultBank.id : '')
    setFormExpenseAccount('')
    setFormReference('')
    setFormPaidTo('')
    setFormPaymentMode('Bank Transfer')
    setFormPaymentReference('')
    setEditingId(null)
  }

  const openEditForm = (v: Voucher) => {
    const debitLine = v.lines.find(l => l.type === 'Debit')
    const creditLine = v.lines.find(l => l.type === 'Credit')

    const mapping = bankMappings.find(m => m.accountId === creditLine?.accountId)
    const bankId = mapping ? mapping.bankAccountId : ''

    setFormDate(v.date)
    setFormAmount(String(debitLine?.amount || 0))
    setFormDescription(v.description.replace(/\s*\(paid to.*\)$/i, ''))
    setFormBankAccount(bankId)
    setFormExpenseAccount(debitLine?.accountId || '')
    setFormReference(v.reference)

    const paidToMatch = v.description.match(/\(paid to\s+(.*)\)$/i)
    setFormPaidTo(paidToMatch ? paidToMatch[1] : v.reference || '')

    setFormPaymentMode(v.paymentMode || 'Bank Transfer')
    setFormPaymentReference(v.paymentReference || '')

    setEditingId(v.id)
    setShowForm(true)
  }

  const handleDuplicate = (v: Voucher) => {
    openEditForm(v)
    setEditingId(null)
    setFormDate(new Date().toISOString().split('T')[0])
    setFormDescription(`Copy of ${v.description.replace(/\s*\(paid to.*\)$/i, '')}`)
  }

  const handleDelete = (v: Voucher) => {
    if (v.isReconciled) {
      showToast('Cannot delete reconciled vouchers', 'error')
      return
    }
    if (v.isLocked) {
      showToast('Cannot delete locked vouchers', 'error')
      return
    }
    if (window.confirm(`Are you sure you want to delete payment voucher ${v.number}?`)) {
      const updatedVoucher = { ...v, isDeleted: true }
      setVouchers(prev => prev.map(item => item.id === v.id ? updatedVoucher : item))
      invalidateBalanceCache()
      showToast(`Voucher ${v.number} deleted successfully`, 'success')

      onAuditEvent?.({
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        module: 'Accounting' as const,
        action: 'Delete' as const,
        entityName: 'Voucher',
        entityId: v.id,
        description: `Soft deleted payment voucher ${v.number}`,
        user: 'user',
        icon: 'trash',
        severity: 'Warning' as const,
        before: v as any,
      })
    }
  }

  const handleCreateVoucher = () => {
    const amt = Number(formAmount)
    if (!formAmount || amt <= 0) {
      showToast('Amount must be greater than zero', 'error')
      return
    }
    if (!formExpenseAccount) {
      showToast('Please select an account to debit', 'error')
      return
    }
    if (!formDescription) {
      showToast('Description is required', 'error')
      return
    }

    let bankAccountId = ''
    if (formPaymentMode === 'Cash') {
      bankAccountId = accounts.find(a => (a.id === '1110-prop' || a.code === '1110') && a.isActive)?.id || '1110-prop'
    } else {
      if (!formBankAccount) {
        showToast('Please select a bank account', 'error')
        return
      }
      const mappedId = getAccountIdForBank(formBankAccount, bankMappings, accounts)
      if (!mappedId) {
        showToast('Bank account not mapped to chart of accounts', 'error')
        return
      }
      bankAccountId = mappedId
    }

    const ref = formPaidTo || formReference || undefined
    const desc = formDescription + (formPaidTo ? ` (paid to ${formPaidTo})` : '')

    if (editingId) {
      const oldVoucher = vouchers.find(v => v.id === editingId)
      if (!oldVoucher) return

      const updatedVoucher: Voucher = {
        ...oldVoucher,
        date: formDate,
        description: desc,
        reference: formPaidTo || formReference || '',
        modifiedAt: new Date().toISOString(),
        modifiedBy: 'user',
        paymentMode: formPaymentMode as any,
        paymentChannel: formPaymentMode === 'Cash' ? 'Cash In Hand' : 'Bank Account',
        paymentReference: formPaymentReference || undefined,
        lines: oldVoucher.lines.map(line => {
          if (line.type === 'Debit') {
            return {
              ...line,
              accountId: formExpenseAccount,
              amount: amt,
              baseAmount: amt,
              narration: formDescription,
            }
          } else {
            return {
              ...line,
              accountId: bankAccountId,
              amount: amt,
              baseAmount: amt,
              narration: formDescription,
            }
          }
        })
      }

      setVouchers(prev => prev.map(v => v.id === editingId ? updatedVoucher : v))
      invalidateBalanceCache()

      // Record Audit Event
      onAuditEvent?.({
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        module: 'Accounting' as const,
        action: 'Update' as const,
        entityName: 'Voucher',
        entityId: oldVoucher.id,
        description: `Edited payment voucher ${oldVoucher.number}`,
        user: 'user',
        icon: 'edit',
        severity: 'Info' as const,
        before: oldVoucher as any,
        after: updatedVoucher as any,
      })

      setShowForm(false)
      showToast(`Payment voucher ${oldVoucher.number} updated`, 'success')
      resetForm()
    } else {
      const result: PostingResult = accountingEngine.processAccountingEvent(
        'EXPENSE_PAID',
        {
          amount: amt,
          date: formDate,
          description: desc,
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

      const postResult = autoPostVoucher(accountingEngine, result.voucher, accounts)
      if (!postResult.success || !postResult.voucher) {
        showToast(postResult.errors.map(e => e.message).join(', '), 'error')
        return
      }

      const newVch: Voucher = {
        ...postResult.voucher,
        paymentMode: formPaymentMode as any,
        paymentChannel: formPaymentMode === 'Cash' ? 'Cash In Hand' : 'Bank Account',
        paymentReference: formPaymentReference || undefined,
        reference: ref || ''
      }

      setVouchers(prev => [newVch, ...prev])
      setShowForm(false)
      showToast(`Payment voucher ${newVch.number} created and posted`, 'success')
      resetForm()
    }
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
      render: v => (
        <div>
          <span className="text-secondary text-xs">{formatDate(v.date, dateFormat)}</span>
        </div>
      ),
    },
    {
      key: 'paidTo',
      header: 'Paid To',
      sortable: true,
      render: v => <span className="fw-500 text-sm">{v.reference || '—'}</span>,
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
      key: 'amount',
      header: 'Amount',
      sortable: true,
      numeric: true,
      render: v => {
        const total = v.lines.reduce((s: number, l: any) => s + (l.type === 'Credit' ? (l.baseAmount ?? l.amount) : 0), 0)
        return <span className="fw-600 text-sm" style={{ color: 'var(--accent)' }}>{currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      },
    },
    {
      key: 'paymentMode',
      header: 'Payment Mode',
      render: v => <span className="text-sm">{v.paymentMode || 'Unknown'}</span>,
    },

    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: v => <VoucherStatusBadge status={v.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: v => (
        <div className="table-actions" style={{ display: 'flex', justifyContent: 'center' }}>
          <ActionsMenu
            onView={() => setDetailVoucher(v)}
            onEdit={() => openEditForm(v)}
            onDuplicate={() => handleDuplicate(v)}
            onPrint={() => printVoucher(v, accounts, currency)}
            onExportPDF={() => exportVoucherToPDF(v, accounts, currency)}
            onDelete={() => handleDelete(v)}
            onAuditTrail={() => {
              setAuditVoucher(v)
              setShowAuditModal(true)
            }}
            canDelete={!v.isReconciled && !v.isLocked}
          />
        </div>
      ),
    },
  ], [dateFormat, accounts, currency, bankMappings])

  const totalAmount = useMemo(() =>
    filtered.filter(v => v.status === 'Posted').reduce((s, v) => s + v.lines.reduce((ls, l) => ls + (l.type === 'Credit' ? l.amount : 0), 0), 0),
    [filtered]
  )

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      <EntityForm
        open={showForm}
        title={editingId ? "Edit Payment Voucher" : "New Payment Voucher"}
        submitLabel={editingId ? "Save Changes" : "Create"}
        onCancel={() => { setShowForm(false); resetForm() }}
        onSubmit={handleCreateVoucher}
      >
        <div className="form-row">
          <Input label="Date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
          <Input label={`Amount (${currency})`} type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0" />
        </div>
        <div className="form-row">
          <SearchablePartySelect
            label="Paid To"
            value={formPaidTo}
            onChange={setFormPaidTo}
            parties={paymentParties}
            placeholder="Supplier or payee name"
            customLabel="Use custom payee / supplier"
          />
          <Select label="Reference Property" value={formReference} onChange={e => setFormReference(e.target.value)} options={propertyOptions} />
        </div>
        <div className="form-row">
          <Input label="Description" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="e.g. Maintenance payment" />
          <Select label="Account to Debit" value={formExpenseAccount} onChange={e => setFormExpenseAccount(e.target.value)} options={coaOptions} />
        </div>
        <div className="form-row">
          <Select
            label="Mode of Payment"
            value={formPaymentMode}
            onChange={e => handlePaymentModeChange(e.target.value)}
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'Bank Transfer', label: 'Bank Transfer' },
              { value: 'Cheque', label: 'Cheque' },
              { value: 'Post Dated Cheque (PDC)', label: 'Post Dated Cheque (PDC)' },
              { value: 'Online Transfer', label: 'Online Transfer' },
              { value: 'Card', label: 'Card' },
              { value: 'Other', label: 'Other' }
            ]}
          />
        </div>
        <div className="form-row">
          {formPaymentMode !== 'Cash' && (
            <Select label="Bank Account" value={formBankAccount} onChange={e => setFormBankAccount(e.target.value)} options={bankOptions} />
          )}
          <Input 
            label="Reference Number (optional)" 
            value={formPaymentReference} 
            onChange={e => setFormPaymentReference(e.target.value)} 
            placeholder="e.g. TXN-12345" 
          />
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

      <AuditTrailModal
        open={showAuditModal}
        voucher={auditVoucher}
        auditEvents={auditEvents}
        onClose={() => setShowAuditModal(false)}
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
            <div className="kpi-value"><CurrencyText value={totalAmount} currency={currency} /></div>
          </div>
          <div className="kpi-card" style={{ borderTop: '2px solid var(--primary)' }}>
            <div className="kpi-label">This Period</div>
            <div className="kpi-value" style={{ fontSize: 22 }}>{String(filtered.length)}</div>
          </div>
        </div>

        <div className="data-table-toolbar">
          <div className="data-table-filters" />
          <div className="data-table-search">
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
