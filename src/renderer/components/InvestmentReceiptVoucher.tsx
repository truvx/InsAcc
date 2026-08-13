import React, { useState, useMemo } from 'react'
import type { Account, Voucher, BankMapping, PostingResult } from '../accounting/types'
import type { BankAccount } from '../data/banking'
import type { PurchaseRecord } from '../data/purchaseLedger'
import { Button, Input, Select, Badge, EmptyState, SearchIcon, CloseIcon, ChevronDownIcon } from './design/DesignSystem'
import { exportTableData } from '../services/reportExportService'
import { recordModuleEvent } from '../services/auditService'
import { useMasterData } from '../contexts/MasterDataContext'
import { PartyLookupService } from '../services/partyLookupService'
import { SearchablePartySelect } from './design/SearchablePartySelect'
import { DataTable, type Column } from './design/Table'
import EntityForm from './design/EntityForm'
import Toast from './Toast'
import { formatDate, formatModifiedDateTime } from '../utils'
import { getAccountIdForBank } from '../accounting/bankAccountMapping'
import { getDefaultInvestmentBankAccount } from '../services/bankingService'
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
import { mergeTags } from './InvestmentVouchersTagHelper'

interface Props {
  currency?: string
  dateFormat?: string
  accounts: Account[]
  vouchers: Voucher[]
  setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>
  bankAccounts: BankAccount[]
  bankMappings: BankMapping[]
  accountingEngine: AccountingEngine
  purchaseRecords?: PurchaseRecord[]
  onAuditEvent?: (event: AuditEvent) => void
  auditEvents?: AuditEvent[]
  loggedInUser?: string
}

const REVENUE_ACCOUNTS = [
  { code: '4110', name: 'Dividend Income' },
  { code: '4140', name: 'Interest Income' },
  { code: '4130', name: 'Capital Gain' },
  { code: '4150', name: 'Sukuk Profit' },
  { code: '4160', name: 'Bond Coupon' },
  { code: '4170', name: 'Mutual Fund Distribution' },
  { code: '4180', name: 'Investment Sale Proceeds' },
  { code: '4190', name: 'Investment Refund' },
]

export default function InvestmentReceiptVoucher({
  currency = 'AED', dateFormat = 'DD/MM/YYYY',
  accounts, vouchers, setVouchers,
  bankAccounts, bankMappings, accountingEngine,
  purchaseRecords = [],
  onAuditEvent,
  auditEvents = [],
  loggedInUser,
}: Props) {
  const {
    detailVoucher, setDetailVoucher,
    toast, showToast, hideToast, loading,
    handlePost, handleApprove, handleCancel, handleDiscard, handleReverse
  } = useVoucherLifecycle(accountingEngine, accounts, setVouchers)

  const { vendors, customers } = useMasterData()

  const lookupService = useMemo(() => new PartyLookupService({
    vendors,
    customers,
    purchaseRecords,
  }), [vendors, customers, purchaseRecords])

  const receiptParties = useMemo(() => lookupService.getReceiptParties('investment'), [lookupService])

  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formAmount, setFormAmount] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const defaultBank = useMemo(() => getDefaultInvestmentBankAccount(bankAccounts), [bankAccounts])
  const [formBankAccount, setFormBankAccount] = useState(defaultBank ? defaultBank.id : '')
  const [formRevenueAccount, setFormRevenueAccount] = useState('')
  const [formReference, setFormReference] = useState('')
  const [formReceivedFrom, setFormReceivedFrom] = useState('')

  const [formPaymentMode, setFormPaymentMode] = useState<string>('Bank Transfer')
  const [formPaymentReference, setFormPaymentReference] = useState('')

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)

  const [showAuditModal, setShowAuditModal] = useState(false)
  const [auditVoucher, setAuditVoucher] = useState<Voucher | null>(null)

  const receiptVouchers = useMemo(() =>
    vouchers.filter(v => v.type === 'Receipt' && !v.isDeleted).map(v => ({
      ...v,
      tags: mergeTags(v.tags, v.id, v.reference, purchaseRecords)
    })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [vouchers, purchaseRecords]
  )

  const filtered = useMemo(() => {
    let result = receiptVouchers
    if (dateFrom) result = result.filter(v => v.date >= dateFrom)
    if (dateTo) result = result.filter(v => v.date <= dateTo)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(v =>
        v.number.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.reference.toLowerCase().includes(q)
      )
    }
    return result
  }, [receiptVouchers, searchQuery, dateFrom, dateTo])

  const handleExport = (format: 'pdf' | 'csv' | 'xlsx') => {
    try {
      const columns = ['Voucher #', 'Date', 'Revenue Account', 'Description', 'Amount', 'Payment Mode', 'Status']
      const rows = filtered.map(v => {
        const totalAmount = v.lines.reduce((sum, l) => l.type === 'Credit' ? sum + l.amount : sum, 0)
        return [
          v.number,
          formatDate(v.date, dateFormat),
          accounts.find(a => a.id === v.lines[0]?.accountId)?.name || '—',
          v.description,
          `${currency} ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          v.paymentMode || '—',
          v.status
        ]
      })
      
      exportTableData({
      moduleName: 'Investment Portfolio',
        title: 'Investment Receipt Vouchers',
        subtitle: `Report generated on ${new Date().toLocaleDateString()}${dateFrom || dateTo ? ` | Period: ${dateFrom || 'Start'} to ${dateTo || 'End'}` : ''}`,
        columns,
        rows,
        generatedBy: loggedInUser,
        format,
        filename: `Investment_Receipt_Vouchers_${new Date().toISOString().split('T')[0]}`
      })

      onAuditEvent?.(
        recordModuleEvent(
          'Investments',
          'Export',
          'Receipt Vouchers',
          'export',
          `Exported ${filtered.length} receipt vouchers to ${format.toUpperCase()}`
        )
      )
      
      showToast?.('Export completed successfully.', 'success')
      setShowExportMenu(false)
    } catch (error) {
      console.error('Export failed:', error)
      showToast?.('Export failed. Please try again.', 'error')
    }
  }


  const bankOptions = useMemo(() => [
    { value: '', label: 'Select bank account' },
    ...bankAccounts.filter(a => a.status === 'active' || a.id === formBankAccount).map(a => ({
      value: a.id,
      label: a.institution,
    })),
  ], [bankAccounts, formBankAccount])

  const coaOptions = useMemo(() => {
    return [
      { value: '', label: 'Select account to credit' },
      ...accounts
        .filter(a => a.isActive)
        .map(a => ({ value: a.id, label: `${a.code} — ${a.name} (${a.type.toUpperCase()})` }))
    ]
  }, [accounts])

  const [editingId, setEditingId] = useState<string | null>(null)

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

  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0])
    setFormAmount('')
    setFormDescription('')
    setFormBankAccount(defaultBank ? defaultBank.id : '')
    setFormRevenueAccount('')
    setFormReference('')
    setFormReceivedFrom('')
    setFormPaymentMode('Bank Transfer')
    setFormPaymentReference('')
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
    setFormRevenueAccount(creditLine?.accountId || '')
    setFormReference(v.reference || '')

    const payerMatch = v.description.match(/\(from\s+(.*)\)$/i)
    setFormReceivedFrom(payerMatch ? payerMatch[1] : '')

    setFormPaymentMode(v.paymentMode || 'Bank Transfer')
    setFormPaymentReference(v.paymentReference || '')

    setEditingId(v.id)
    setShowForm(true)
  }

  const handleDuplicate = (v: Voucher) => {
    openEditForm(v)
    setEditingId(null)
    setFormDate(new Date().toISOString().split('T')[0])
    setFormDescription(`Copy of ${v.description.replace(/\s*\(from.*\)$/i, '')}`)
  }

  const handleCreateVoucher = () => {
    const amt = Number(formAmount)
    if (!formAmount || amt <= 0) {
      showToast('Amount must be greater than zero', 'error')
      return
    }
    if (!formRevenueAccount) {
      showToast('Please select an income type', 'error')
      return
    }
    if (!formDescription) {
      showToast('Description is required', 'error')
      return
    }

    let bankAccountId = ''
    if (formPaymentMode === 'Cash') {
      bankAccountId = accounts.find(a => (a.id === '1110-inv' || a.code === '1110') && a.isActive)?.id || '1110-inv'
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

    const ref = formReference || undefined
    const desc = formDescription + (formReceivedFrom ? ` (from ${formReceivedFrom})` : '')

    if (editingId) {
      const oldVoucher = vouchers.find(v => v.id === editingId)
      if (!oldVoucher) return

      const updatedVoucher: Voucher = {
        ...oldVoucher,
        date: formDate,
        description: desc,
        reference: formReference || '',
        modifiedAt: new Date().toISOString(),
        modifiedBy: 'user',
        paymentMode: formPaymentMode as any,
        paymentChannel: formPaymentMode === 'Cash' ? 'Cash In Hand' : 'Bank Account',
        paymentReference: formPaymentReference || undefined,
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
              accountId: formRevenueAccount,
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
          creditAccount: formRevenueAccount,
          referenceType: 'Investment',
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
      render: v => <span className="fw-500 text-sm">{v.reference || '—'}</span>,
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
  ], [dateFormat, accounts, currency, bankMappings])

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
            placeholder="Payer name"
            customLabel="Use custom payer"
          />
          <Select label="Account to Credit" value={formRevenueAccount} onChange={e => setFormRevenueAccount(e.target.value)} options={coaOptions} searchable />
        </div>
        <div className="form-row">
          <Input label="Description" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="e.g. Dividend received" />
          <Input 
            label="Reference (optional)" 
            value={formReference} 
            onChange={e => setFormReference(e.target.value)} 
            placeholder="e.g. Inv #" 
          />
        </div>
        <div className="form-row">
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
          <Input 
            label="Reference Number (optional)" 
            value={formPaymentReference} 
            onChange={e => setFormPaymentReference(e.target.value)} 
            placeholder="e.g. TXN-12345" 
          />
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
            <div className="page-subtitle">Record investment income: dividends, interest, sale proceeds, and sukuk profits</div>
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
          <div className="data-table-filters" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div className="data-table-search" style={{ maxWidth: 'none', width: 'auto', flex: '0 0 auto', padding: '0 12px' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 8 }}>From</span>
              <input type="date" className="data-table-search-input" style={{ width: 110 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="data-table-search" style={{ maxWidth: 'none', width: 'auto', flex: '0 0 auto', padding: '0 12px' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 8 }}>To</span>
              <input type="date" className="data-table-search-input" style={{ width: 110 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
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
              text="Create a receipt voucher to record income received."
            />
          }
        />
      </div>
    </>
  )
}
