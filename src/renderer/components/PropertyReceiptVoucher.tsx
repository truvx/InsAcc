import React, { useState, useMemo } from 'react'
import type { Account, Voucher, BankMapping, PostingResult } from '../accounting/types'
import type { PropAccount, LeaseEntry, TenantEntry, PropertyEntry, UnitEntry } from '../data/propertyTypes'
import type { PurchaseRecord } from '../data/purchaseLedger'
import { Button, Input, Select, Badge, EmptyState, SearchIcon, CloseIcon } from './design/DesignSystem'
import { useMasterData } from '../contexts/MasterDataContext'
import { PartyLookupService } from '../services/partyLookupService'
import { SearchablePartySelect } from './design/SearchablePartySelect'
import { DataTable, type Column } from './design/Table'
import EntityForm from './design/EntityForm'
import Toast from './Toast'
import { formatDate, formatModifiedDateTime } from '../utils'
import { getAccountIdForBank } from '../accounting/bankAccountMapping'
import { getDefaultPropertyReceiptBankAccount } from '../services/bankingService'
import type { AccountingEngine } from '../accounting/accountingEngine'
import { getLinesForAccount, invalidateBalanceCache } from '../accounting/ledgerService'
import { useVoucherLifecycle, autoPostVoucher } from '../hooks/useVoucherLifecycle'
import VoucherStatusBadge from './design/VoucherStatusBadge'
import VoucherDetailsModal from './design/VoucherDetailsModal'
import ActionsMenu from './design/ActionsMenu'
import { CurrencyText } from './design/CurrencyText'
import AuditTrailModal from './design/AuditTrailModal'
import { printVoucher } from '../utils/printVoucherHelper'
import { exportVoucherToPDF } from '../utils/pdfVoucherHelper'
import type { AuditEvent } from '../data/auditTypes'
import type { PdcCheque } from '../data/propertyTypes'
import { findLeaseForReceipt, validateReceiptAmount, settleRent } from '../services/rentSettlementService'

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
  setLeases?: React.Dispatch<React.SetStateAction<LeaseEntry[]>>
  tenants?: TenantEntry[]
  properties?: PropertyEntry[]
  units?: UnitEntry[]
  purchaseRecords?: PurchaseRecord[]
  pdcCheques?: PdcCheque[]
  setPdcCheques?: React.Dispatch<React.SetStateAction<PdcCheque[]>>
  onAuditEvent?: (event: AuditEvent) => void
  auditEvents?: AuditEvent[]
}

export default function PropertyReceiptVoucher({
  currency = 'AED', dateFormat = 'DD/MM/YYYY',
  accounts, vouchers, setVouchers,
  propAccounts, bankMappings, accountingEngine,
  leases = [], setLeases,
  tenants = [],
  properties = [], units = [], purchaseRecords = [],
  pdcCheques = [], setPdcCheques,
  onAuditEvent,
  auditEvents = [],
}: Props) {
  const {
    detailVoucher, setDetailVoucher,
    toast, showToast, hideToast, loading,
    handlePost, handleApprove, handleCancel, handleDiscard, handleReverse
  } = useVoucherLifecycle(accountingEngine, accounts, setVouchers)

  const { vendors, customers } = useMasterData()

  const lookupService = useMemo(() => new PartyLookupService({
    tenants,
    leases,
    properties,
    units,
    vendors,
    customers,
    purchaseRecords,
  }), [tenants, leases, properties, units, vendors, customers, purchaseRecords])

  const receiptParties = useMemo(() => lookupService.getReceiptParties('property'), [lookupService])

  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formAmount, setFormAmount] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const defaultBank = useMemo(() => getDefaultPropertyReceiptBankAccount(propAccounts), [propAccounts])
  const [formBankAccount, setFormBankAccount] = useState(defaultBank ? defaultBank.id : '')
  const [formReceivedFrom, setFormReceivedFrom] = useState('')

  const [formPaymentMode, setFormPaymentMode] = useState<string>('Bank Transfer')
  const [formCreditAccount, setFormCreditAccount] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [auditVoucher, setAuditVoucher] = useState<Voucher | null>(null)

  const receiptVouchers = useMemo(() =>
    vouchers.filter(v => v.type === 'Receipt' && !v.isDeleted).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
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
    ...propAccounts.filter(a => a.status === 'active' || a.id === formBankAccount).map(a => ({
      value: a.id,
      label: a.institution,
    })),
  ], [propAccounts, formBankAccount])

  const coaOptions = useMemo(() => {
    return accounts
      .filter(a => a.isActive)
      .map(a => ({ value: a.id, label: `${a.code} — ${a.name} (${a.type.toUpperCase()})` }))
  }, [accounts])

  React.useEffect(() => {
    if (!formCreditAccount && accounts.length > 0) {
      const defaultCredit = accounts.find(a => a.code === '4120')?.id || ''
      setFormCreditAccount(defaultCredit)
    }
  }, [accounts, formCreditAccount])

  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0])
    setFormAmount('')
    setFormDescription('')
    setFormBankAccount(defaultBank ? defaultBank.id : '')
    setFormReceivedFrom('')
    setFormPaymentMode('Bank Transfer')
    const defaultCredit = accounts.find(a => a.code === '4120')?.id || ''
    setFormCreditAccount(defaultCredit)
    setEditingId(null)
  }

  const openEditForm = (v: Voucher) => {
    const debitLine = v.lines.find(l => l.type === 'Debit')
    const creditLine = v.lines.find(l => l.type === 'Credit')

    const mapping = bankMappings.find(m => m.accountId === debitLine?.accountId)
    const bankId = mapping ? mapping.bankAccountId : ''

    setFormDate(v.date)
    setFormAmount(String(debitLine?.amount || 0))
    setFormDescription(v.description.replace(/\s*\(from.*\)$/i, ''))
    setFormBankAccount(bankId)
    setFormCreditAccount(creditLine ? creditLine.accountId : '')

    const payerMatch = v.description.match(/\(from\s+(.*)\)$/i)
    setFormReceivedFrom(payerMatch ? payerMatch[1] : v.reference || '')

    setFormPaymentMode(v.paymentMode || 'Bank Transfer')

    setEditingId(v.id)
    setShowForm(true)
  }

  const handleDuplicate = (v: Voucher) => {
    openEditForm(v)
    setEditingId(null)
    setFormDate(new Date().toISOString().split('T')[0])
    setFormDescription(`Copy of ${v.description.replace(/\s*\(from.*\)$/i, '')}`)
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
    if (window.confirm(`Are you sure you want to delete receipt voucher ${v.number}?`)) {
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
        description: `Soft deleted receipt voucher ${v.number}`,
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

    const ref = formReceivedFrom || undefined
    const desc = formDescription + (formReceivedFrom ? ` (from ${formReceivedFrom})` : '')
    const targetCreditAccount = formCreditAccount || accounts.find(a => a.code === '4120')?.id

    // Find linked lease for rent settlement
    const linkedLease = findLeaseForReceipt(formReceivedFrom, tenants as TenantEntry[], leases as LeaseEntry[])

    if (!editingId && linkedLease) {
      const validationError = validateReceiptAmount(linkedLease, amt, vouchers)
      if (validationError) {
        showToast(validationError, 'error')
        return
      }

      // Validate PDC: receipt must exactly cover full PDC cheques
      if (linkedLease.modeOfPayment === 'Post-Dated Cheques (PDC)') {
        const pendingCheques = pdcCheques
          .filter(c => c.leaseId === linkedLease.id && c.status === 'Pending')
          .sort((a, b) => a.slotIndex - b.slotIndex)
        if (pendingCheques.length > 0) {
          let sum = 0
          let covered = false
          for (const c of pendingCheques) {
            sum += c.amount
            if (sum === amt) { covered = true; break }
            if (sum > amt) break
          }
          if (!covered) {
            showToast('Receipt amount must exactly match one or more full PDC cheques. Partial PDC payments are not supported.', 'error')
            return
          }
        }
      }
    }

    if (editingId) {
      const oldVoucher = vouchers.find(v => v.id === editingId)
      if (!oldVoucher) return

      const updatedVoucher: Voucher = {
        ...oldVoucher,
        date: formDate,
        description: desc,
        reference: formReceivedFrom || '',
        modifiedAt: new Date().toISOString(),
        modifiedBy: 'user',
        paymentMode: formPaymentMode as any,
        paymentChannel: formPaymentMode === 'Cash' ? 'Cash In Hand' : 'Bank Account',
        lines: oldVoucher.lines.map(line => {
          if (line.type === 'Debit') {
            return {
              ...line,
              accountId: bankAccountId,
              amount: amt,
              baseAmount: amt,
              narration: formDescription,
            }
          } else {
            return {
              ...line,
              accountId: targetCreditAccount || line.accountId,
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
        description: `Edited receipt voucher ${oldVoucher.number}`,
        user: 'user',
        icon: 'edit',
        severity: 'Info' as const,
        before: oldVoucher as any,
        after: updatedVoucher as any,
      })

      setShowForm(false)
      showToast(`Receipt voucher ${oldVoucher.number} updated`, 'success')
      resetForm()
    } else {
      const result: PostingResult = accountingEngine.processAccountingEvent(
        'INCOME_RECEIVED',
        {
          amount: amt,
          date: formDate,
          description: desc,
          currency,
          exchangeRate: 1,
          baseCurrency: 'AED',
          bankAccount: bankAccountId,
          creditAccount: targetCreditAccount,
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

      const leaseRef = linkedLease ? linkedLease.leaseNumber : ref
      const newVch: Voucher = {
        ...postResult.voucher,
        paymentMode: formPaymentMode as any,
        paymentChannel: formPaymentMode === 'Cash' ? 'Cash In Hand' : 'Bank Account',
        reference: leaseRef || ''
      }

      // Settle rent against linked lease
      if (linkedLease && setLeases && setPdcCheques) {
        const { updatedLease, updatedCheques } = settleRent(
          linkedLease,
          amt,
          vouchers,
          pdcCheques,
        )
        setLeases(prev => prev.map(l => l.id === updatedLease.id ? updatedLease : l))
        if (updatedCheques.length > 0) {
          setPdcCheques(prev => {
            const next = [...prev]
            for (const uc of updatedCheques) {
              const idx = next.findIndex(c => c.id === uc.id)
              if (idx !== -1) next[idx] = uc
            }
            return next
          })
        }
      }

      setVouchers(prev => [newVch, ...prev])
      setShowForm(false)
      showToast(`Receipt voucher ${newVch.number} created and posted`, 'success')
      resetForm()
    }
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
      render: v => (
        <div>
          <span className="text-secondary text-xs">{formatDate(v.date, dateFormat)}</span>
          {v.modifiedAt && (
            <div style={{ fontSize: '10px', color: '#B91C1C', marginTop: '2px', fontWeight: 500 }} title={`Last modified on ${v.modifiedAt}`}>
              Edited<br/>
              <span style={{ fontSize: '9px', color: '#6B7280', fontWeight: 'normal' }}>{formatModifiedDateTime(v.modifiedAt)}</span>
            </div>
          )}
        </div>
      ),
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
      key: 'paymentMode',
      header: 'Payment Mode',
      render: v => <span className="text-sm">{v.paymentMode || 'Unknown'}</span>,
    },
    {
      key: 'paymentChannel',
      header: 'Channel',
      render: v => <span className="text-secondary text-xs">{v.paymentChannel || 'Unknown'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: v => <VoucherStatusBadge status={v.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
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
  ], [dateFormat, accounts, currency, bankMappings, formReceivedFrom, leases, tenants])

  const totalAmount = useMemo(() =>
    filtered.filter(v => v.status === 'Posted').reduce((s, v) => s + v.lines.reduce((ls, l) => ls + (l.type === 'Debit' ? l.amount : 0), 0), 0),
    [filtered]
  )

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      <EntityForm
        open={showForm}
        title={editingId ? "Edit Receipt Voucher" : "New Receipt Voucher"}
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
            label="Received From"
            value={formReceivedFrom}
            onChange={setFormReceivedFrom}
            parties={receiptParties}
            placeholder="Tenant or payer name"
            customLabel="Use custom payer"
          />
          <Select
            label="Account to Credit (Income/Liability)"
            value={formCreditAccount}
            onChange={e => setFormCreditAccount(e.target.value)}
            options={coaOptions}
          />
          <Select
            label="Mode of Payment"
            value={formPaymentMode}
            onChange={e => setFormPaymentMode(e.target.value)}
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
          <Input label="Description" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="e.g. Rent received" />
          {formPaymentMode !== 'Cash' && (
            <Select label="Bank Account" value={formBankAccount} onChange={e => setFormBankAccount(e.target.value)} options={bankOptions} />
          )}
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
              title="No receipt vouchers"
              text="Create a receipt voucher to record income received into a bank account."
            />
          }
        />
      </div>
    </>
  )
}
