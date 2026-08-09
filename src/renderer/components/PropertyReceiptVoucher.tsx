import React, { useState, useMemo } from 'react'
import type { Account, Voucher, BankMapping, PostingResult } from '../accounting/types'
import type { PropAccount, LeaseEntry, TenantEntry, PropertyEntry, UnitEntry, VendorEntry } from '../data/propertyTypes'
import type { PurchaseRecord } from '../data/purchaseLedger'
import { Button, Input, Select, Badge, EmptyState, SearchIcon, CloseIcon, ChevronDownIcon } from './design/DesignSystem'
import { exportTableData } from '../services/reportExportService'
import { recordModuleEvent } from '../services/auditService'
import { formatCurrency } from '../utils/currencyHelpers'
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
import { mergeTags } from './PropertyVouchersTagHelper'

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
  vendors?: VendorEntry[]
  propTransactions?: any[]
  propExpenses?: any[]
  securityDeposits?: any[]
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
  vendors = [],
  propTransactions = [],
  propExpenses = [],
  securityDeposits = [],
}: Props) {
  const {
    detailVoucher, setDetailVoucher,
    toast, showToast, hideToast, loading,
    handlePost, handleApprove, handleCancel, handleDiscard, handleReverse
  } = useVoucherLifecycle(accountingEngine, accounts, setVouchers)

  const { customers } = useMasterData()

  const lookupService = useMemo(() => new PartyLookupService({
    tenants,
    leases,
    properties,
    units,
    propVendors: vendors,
    customers,
    purchaseRecords,
  }), [tenants, leases, properties, units, vendors, customers, purchaseRecords])

  const receiptParties = useMemo(() => lookupService.getReceiptParties('property'), [lookupService])
  const allParties = useMemo(() => lookupService.getAllPropertyParties(), [lookupService])

  const [searchQuery, setSearchQuery] = useState('')
  const [filterParty, setFilterParty] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formAmount, setFormAmount] = useState('')
  const [formTags, setFormTags] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const defaultBank = useMemo(() => getDefaultPropertyReceiptBankAccount(propAccounts), [propAccounts])
  const [formBankAccount, setFormBankAccount] = useState(defaultBank ? defaultBank.id : '')
  const [formReceivedFrom, setFormReceivedFrom] = useState('')
  const [formReference, setFormReference] = useState('')
  const [formPaymentMode, setFormPaymentMode] = useState('Bank Transfer')
  const [formCreditAccount, setFormCreditAccount] = useState('')

  const propertyOptions = useMemo(() => [
    { value: '', label: 'Select property (optional)' },
    ...properties.map(p => ({ value: p.name, label: p.name })),
  ], [properties])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [auditVoucher, setAuditVoucher] = useState<Voucher | null>(null)

  const receiptVouchers = useMemo(() =>
    vouchers.filter(v => v.type === 'Receipt' && !v.isDeleted).map(v => ({
      ...v,
      tags: mergeTags(v.tags, v.id, v.reference, propTransactions, propExpenses, pdcCheques, securityDeposits)
    })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [vouchers, propTransactions, propExpenses, pdcCheques, securityDeposits]
  )

  const filtered = useMemo(() => {
    let list = receiptVouchers
    if (dateFrom) list = list.filter(v => v.date >= dateFrom)
    if (dateTo) list = list.filter(v => v.date <= dateTo)

    if (filterParty) {
      const party = allParties.find(p => p.name === filterParty)
      list = list.filter(v => {
        if (v.reference === filterParty || v.description.includes(filterParty)) return true
        if (party) {
          const lease = leases.find(l => l.leaseNumber === v.reference || l.id === v.reference)
          if (lease) {
            if (party.type === 'Property' && party.id === lease.propertyId) return true
            if ((party.type === 'Tenant' || party.type === 'Active Tenant' || party.type === 'Historical Tenant') && party.id === lease.tenantId) return true
          }
        }
        return false
      })
    }

    if (filterTag) {
      const q = filterTag.toLowerCase()
      list = list.filter(v => v.tags && v.tags.some(t => t.toLowerCase().includes(q)))
    }

    if (!searchQuery) return list
    const q = searchQuery.toLowerCase()
    return list.filter(v =>
      v.number.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q) ||
      v.reference.toLowerCase().includes(q)
    )
  }, [receiptVouchers, searchQuery, dateFrom, dateTo, filterParty, filterTag, allParties, leases])

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
    setFormReference('')
    setFormTags('')
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
    setFormDescription(v.description.replace(/\s*\(from.*\)$/i, '').trim())
    setFormTags(v.tags ? v.tags.join(', ') : '')
    setFormBankAccount(bankId)
    setFormCreditAccount(creditLine ? creditLine.accountId : '')
    setFormReceivedFrom(v.description.match(/\(from\s+(.*)\)$/i)?.[1] || '')
    setFormReference(v.reference || '')
    setFormPaymentMode(v.paymentMode || 'Bank Transfer')
    setEditingId(v.id)
    setShowForm(true)
  }

  const handleDuplicate = (v: Voucher) => {
    openEditForm(v)
    setEditingId(null)
    setFormDate(new Date().toISOString().split('T')[0])
    setFormDescription(`Copy of ${v.description.replace(/\s*\(from.*\)$/i, '')}`)
    setFormTags(v.tags ? v.tags.join(', ') : '')
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

    const ref = formReference || formReceivedFrom || undefined
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
        reference: formReference || formReceivedFrom || '',
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
        reference: leaseRef || formReference || '',
        tags: formTags ? formTags.split(',').map(t => t.trim()).filter(Boolean) : []
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
      key: 'amount',
      header: 'Amount',
      sortable: true,
      numeric: true,
      render: v => {
        const total = v.lines.reduce((s: number, l: any) => s + (l.type === 'Debit' ? (l.baseAmount ?? l.amount) : 0), 0)
        return <span className="fw-600 text-sm" style={{ color: 'var(--accent)' }}>{currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      },
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
      header: '',
      render: v => (
        <div className="table-actions" style={{ display: 'flex', justifyContent: 'center' }}>
          <ActionsMenu
            onView={() => setDetailVoucher(v)}
            onEdit={() => openEditForm(v)}
            onDuplicate={() => handleDuplicate(v)}
            onPrint={() => printVoucher(v, accounts, currency, 'Properties Management')}
            onExportPDF={() => exportVoucherToPDF(v, accounts, currency, 'Properties Management')}
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

  const [showExportMenu, setShowExportMenu] = useState(false)

  const handleExport = (format: 'pdf' | 'csv' | 'xlsx') => {
    exportTableData({
      moduleName: 'Properties Management',
      format,
      title: 'Receipt Vouchers',
      subtitle: `Total Vouchers: ${filtered.length}`,
      filename: `Receipt_Vouchers_${new Date().toISOString().split('T')[0]}`,
      columns: ['Voucher #', 'Date', 'Received From', 'Credited To', 'Description', 'Amount', 'Payment Mode', 'Status'],
      rows: filtered.map(v => {
        const refInfo = getReferenceInfo(v.reference)
        const receivedFrom = refInfo?.tenant || v.reference || '—'
        const totalAmount = v.lines.reduce((s: number, l: any) => s + (l.type === 'Debit' ? (l.baseAmount ?? l.amount) : 0), 0)

        return [
          v.number,
          formatDate(v.date, dateFormat),
          receivedFrom,
          getBankName(v),
          v.description || '-',
          formatCurrency(totalAmount, currency),
          v.paymentMode || 'Unknown',
          v.status || 'Draft'
        ]
      }),
      currency
    })

    onAuditEvent?.(
      recordModuleEvent(
        'Property',
        'Export',
        'Receipt Vouchers',
        'export',
        `Exported ${filtered.length} receipt vouchers to ${format.toUpperCase()}`
      )
    )

    showToast('Export completed successfully.', 'success')
    setShowExportMenu(false)
  }

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
          <Select label="Reference Property" value={formReference} onChange={e => setFormReference(e.target.value)} options={propertyOptions} />
        </div>
        <div className="form-row">
          <Select
            label="Account to Credit (Income/Liability)"
            value={formCreditAccount}
            onChange={e => setFormCreditAccount(e.target.value)}
            options={coaOptions}
            searchable
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
          <Input label="Tags (comma separated)" value={formTags} onChange={e => setFormTags(e.target.value)} placeholder="e.g. advance, urgent" />
        </div>
        {formPaymentMode !== 'Cash' && (
          <div className="form-row">
            <Select label="Bank Account" value={formBankAccount} onChange={e => setFormBankAccount(e.target.value)} options={bankOptions} />
          </div>
        )}
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
        <div className="page-header-right" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Button variant="secondary" size="sm" onClick={() => setShowExportMenu(!showExportMenu)}>
              Export <ChevronDownIcon />
            </Button>
            {showExportMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, width: 140, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <button className="export-menu-item" onClick={() => handleExport('pdf')}>PDF (.pdf)</button>
                <button className="export-menu-item" onClick={() => handleExport('xlsx')}>Excel (.xlsx)</button>
                <button className="export-menu-item" onClick={() => handleExport('csv')}>CSV (.csv)</button>
              </div>
            )}
          </div>
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
          <div className="data-table-filters" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="data-table-search" style={{ maxWidth: 'none', width: 'auto', flex: '0 0 auto', padding: '0 12px' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 8 }}>From</span>
              <input type="date" className="data-table-search-input" style={{ width: 110 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="data-table-search" style={{ maxWidth: 'none', width: 'auto', flex: '0 0 auto', padding: '0 12px' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 8 }}>To</span>
              <input type="date" className="data-table-search-input" style={{ width: 110 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div style={{ width: 220 }}>
              <SearchablePartySelect
                label=""
                value={filterParty}
                onChange={setFilterParty}
                parties={allParties}
                placeholder="Filter by Vendor, Tenant, Property..."
              />
            </div>
            <div className="data-table-search" style={{ maxWidth: 'none', width: 'auto', flex: '0 0 auto', padding: '0 12px' }}>
              <SearchIcon />
              <input
                type="text"
                className="data-table-search-input"
                style={{ width: 140 }}
                placeholder="Filter by tag..."
                value={filterTag}
                onChange={e => setFilterTag(e.target.value)}
              />
              {filterTag && (
                <button className="data-table-search-clear" onClick={() => setFilterTag('')} aria-label="Clear">
                  <CloseIcon />
                </button>
              )}
            </div>
          </div>
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
