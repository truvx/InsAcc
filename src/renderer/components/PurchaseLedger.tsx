import React, { useState, useMemo } from 'react'
import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { AccountingEngine } from '../accounting/accountingEngine'
import type { BankAccount } from '../data/banking'
import type { PurchaseRecord, ValidationError } from '../data/purchaseLedger'
import type { AuditEvent } from '../data/auditTypes'
import type { DocItem } from './Documents'
import { recordModuleEvent } from '../services/auditService'
import { VALID_ASSET_TYPES } from '../data/purchaseLedger'
import {
  createPurchaseRecord,
  updatePurchaseRecord,
  validateCreatePurchase,
  validateUpdatePurchase,
  calculateTotalInvested,
  calculateTotalQuantity,
  calculateWeightedAverage,
  searchPurchases,
  filterByAssetType,
  filterByStatus,
  sortPurchases,
  type SortField,
  type SortOrder,
} from '../services/purchaseLedgerService'
import { purchaseAndCreateVoucher } from '../services/purchaseAccountingService'
import { getLinesForAccount, getLinesByReference, getAccountBalance } from '../accounting/ledgerService'
import { getAccountById } from '../accounting/chartOfAccountsService'
import { DataTable, type Column } from './design/Table'
import BankAccountAvatar from './BankAccountAvatar'
import EntityForm from './design/EntityForm'
import ConfirmDialog from './design/ConfirmDialog'
import {
  KpiCard, Button, Badge, Select, Input, EmptyState, Modal,
  PortfolioIcon, TrendingUpIcon, ActivityIcon, CalendarIcon, PlusIcon,
  EditIcon, TrashIcon, CloseIcon,
} from './design/DesignSystem'
import Toast from './Toast'
import { formatDate } from '../utils'
import { TransactionLifecycleService } from '../services/transactionLifecycleService'
import { formatCurrency } from '../utils/reportFormatters'

interface Props {
  currency?: string
  dateFormat?: string
  language?: string
  purchaseRecords: PurchaseRecord[]
  setPurchaseRecords: React.Dispatch<React.SetStateAction<PurchaseRecord[]>>
  onAuditEvent?: (event: AuditEvent) => void
  accounts?: Account[]
  vouchers?: Voucher[]
  setVouchers?: React.Dispatch<React.SetStateAction<Voucher[]>>
  bankAccounts?: BankAccount[]
  bankMappings?: BankMapping[]
  setAccounts?: React.Dispatch<React.SetStateAction<Account[]>>
  accountingEngine?: AccountingEngine
  documents?: DocItem[]
  onNavigate?: (page: string) => void
}

interface FormState {
  assetType: string
  assetName: string
  purchaseDate: string
  quantity: string
  unitPrice: string
  broker: string
  notes: string
  tags: string
  status: 'active' | 'sold' | 'partially_sold'
  bankAccountId: string
}

const emptyForm: FormState = {
  assetType: 'Gold',
  assetName: '',
  purchaseDate: new Date().toISOString().split('T')[0],
  quantity: '',
  unitPrice: '',
  broker: '',
  notes: '',
  tags: '',
  status: 'active',
  bankAccountId: '',
}

export default function PurchaseLedger({
  currency = 'AED',
  dateFormat = 'DD/MM/YYYY',
  language = 'English',
  purchaseRecords,
  setPurchaseRecords,
  onAuditEvent,
  accounts = [],
  vouchers = [],
  setVouchers,
  bankAccounts = [],
  bankMappings = [],
  setAccounts,
  accountingEngine,
  documents = [],
  onNavigate = () => {},
}: Props) {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormState>(emptyForm)
  const [formErrors, setFormErrors] = useState<ValidationError[]>([])
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [acctImpactId, setAcctImpactId] = useState<string | null>(null)
  const [holdingModalId, setHoldingModalId] = useState<string | null>(null)

  const bankByIdMap = useMemo(
    () => new Map(bankAccounts.map(ba => [ba.id, ba])),
    [bankAccounts],
  )

  const activeRecords = useMemo(() => purchaseRecords, [purchaseRecords])

  const kpis = useMemo(() => ({
    totalInvested: calculateTotalInvested(activeRecords),
    totalQuantity: calculateTotalQuantity(activeRecords),
    weightedAvg: calculateWeightedAverage(activeRecords),
    activeLots: activeRecords.filter(r => r.status === 'active').length,
  }), [activeRecords])

  const filtered = useMemo(() => {
    let result = activeRecords
    if (typeFilter) result = filterByAssetType(result, typeFilter)
    if (statusFilter) result = filterByStatus(result, statusFilter as 'active' | 'sold' | 'partially_sold')
    if (tagFilter) {
      const q = tagFilter.toLowerCase()
      result = result.filter(r => r.tags.some(t => t.toLowerCase().includes(q)))
    }
    if (searchQuery) result = searchPurchases(result, searchQuery)
    return result
  }, [activeRecords, typeFilter, statusFilter, tagFilter, searchQuery])

  interface PurchaseDetail {
    postingStatus: string
    currentHolding: number
    currentValue: number
    ledgerEntries: number
    voucherStatus: string
    creditAccountId: string
    creditAccountName: string
    debitAccountId: string
    debitAccountName: string
    docsCount: number
  }

  const purchaseDetailMap = useMemo(() => {
    const map = new Map<string, PurchaseDetail>()
    for (const p of purchaseRecords) {
      const voucher = p.voucherId ? vouchers.find(v => v.id === p.voucherId) : undefined
      const creditLine = voucher?.lines.find(l => l.type === 'Credit')
      const debitLine = voucher?.lines.find(l => l.type === 'Debit')
      const bankCoaAcct = creditLine ? getAccountById(creditLine.accountId, accounts) : undefined
      const holding = p.status === 'active' && p.accountId ? getAccountBalance(p.accountId, vouchers, accounts) : 0
      const linesForAcct = p.accountId ? getLinesByReference('Purchase', p.id, vouchers) : []

      const docsCount = documents.filter(d => d.linkedType === 'purchase' && d.linkedId === p.id).length
      map.set(p.id, {
        postingStatus: voucher?.status === 'Posted' ? 'Posted'
          : voucher?.status === 'Approved' ? 'Approved'
          : voucher?.status === 'Draft' ? 'Draft'
          : voucher?.status || '—',
        currentHolding: p.status === 'active' ? 1 : 0,
        currentValue: p.status === 'active' ? holding : 0,
        ledgerEntries: linesForAcct.length,
        voucherStatus: voucher?.status || '—',
        creditAccountId: creditLine?.accountId || '',
        creditAccountName: bankCoaAcct?.name || '—',
        debitAccountId: debitLine?.accountId || p.accountId || '',
        debitAccountName: debitLine ? (getAccountById(debitLine.accountId, accounts)?.name || '—') : '—',
        docsCount,
      })
    }
    return map
  }, [purchaseRecords, vouchers, accounts])

  const statusBadge = (status: string) => {
    const map: Record<string, 'success' | 'neutral' | 'warning'> = {
      active: 'success',
      sold: 'neutral',
      partially_sold: 'warning',
    }
    return <Badge variant={map[status] || 'neutral'}>{status.replace('_', ' ')}</Badge>
  }

  const bankOptions = useMemo(() => [
    { value: '', label: 'Select bank account' },
    ...bankAccounts.map(a => ({
      value: a.id,
      label: `${a.institution} - ${a.accountName}`,
    })),
  ], [bankAccounts])

  const columns: Column<PurchaseRecord>[] = [
    {
      key: 'purchaseNumber', header: 'Purchase #', width: '100px',
      render: r => <span className="text-mono text-xs fw-500">{r.lotId}</span>,
    },
    {
      key: 'purchaseDate', header: 'Date', sortable: true, width: '90px',
      render: r => <span className="text-secondary text-xs">{formatDate(r.purchaseDate, dateFormat)}</span>,
    },
    {
      key: 'assetName', header: 'Asset', sortable: true,
      render: r => (
        <div>
          <span
            className="fw-500 text-sm"
            style={{ color: 'var(--primary)', cursor: 'pointer' }}
            onClick={() => onNavigate('holdings')}
            title="View in Holdings"
          >{r.assetName}</span>
          <div className="text-xs text-secondary">{r.assetType}</div>
        </div>
      ),
    },
    {
      key: 'quantity', header: 'Qty', sortable: true, numeric: true, width: '70px',
      render: r => <span className="text-xs">{r.quantity.toLocaleString()}</span>,
    },
    {
      key: 'unitPrice', header: 'Unit Price', sortable: true, numeric: true, width: '100px',
      render: r => <span className="text-xs">{formatCurrency(r.unitPrice, currency)}</span>,
    },
    {
      key: 'totalValue', header: 'Total', sortable: true, numeric: true, width: '110px',
      render: r => <span className="fw-600 text-xs text-gold">{formatCurrency(r.totalValue, currency)}</span>,
    },
    {
      key: 'fundingBank', header: 'Paid From',
      render: r => {
        const bank = r.fundingBankAccountId ? bankByIdMap.get(r.fundingBankAccountId) ?? null : null
        const d = purchaseDetailMap.get(r.id)
        if (bank) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BankAccountAvatar bank={bank} />
              <div className="text-xs text-secondary">{bank.institution}</div>
            </div>
          )
        }
        return <span className="text-xs text-secondary">{d?.creditAccountName || (r.voucherNumber ? '—' : 'N/A')}</span>
      },
    },
    {
      key: 'broker', header: 'Vendor', width: '100px',
      render: r => <span className="text-xs text-secondary">{r.broker || '—'}</span>,
    },
    {
      key: 'accountCode', header: 'Chart', width: '70px',
      render: r => r.accountCode ? (
        <Badge variant="neutral">{r.accountCode}</Badge>
      ) : <span className="text-xs text-secondary">—</span>,
    },
    {
      key: 'voucherNumber', header: 'Voucher', width: '100px',
      render: r => r.voucherNumber ? (
        <span
          className="text-mono text-xs fw-600"
          style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline dotted' }}
          onClick={() => r.voucherId && onNavigate('reports')}
          title="View in Reports"
        >{r.voucherNumber}</span>
      ) : (
        <span className="text-xs text-secondary">—</span>
      ),
    },
    {
      key: 'journalNumber', header: 'Journal #', width: '100px',
      render: r => r.voucherNumber ? (
        <span className="text-mono text-xs">JRNL-{r.voucherNumber.replace('VCH-', '')}</span>
      ) : (
        <span className="text-xs text-secondary">—</span>
      ),
    },
    {
      key: 'docsCount', header: 'Docs', width: '50px',
      render: r => {
        const d = purchaseDetailMap.get(r.id)
        return d && d.docsCount > 0 ? (
          <span className="text-mono text-xs fw-500" style={{ color: 'var(--primary)' }}>{d.docsCount}</span>
        ) : <span className="text-xs text-secondary">—</span>
      },
    },
    {
      key: 'postingStatus', header: 'Posting', width: '70px',
      render: r => {
        const d = purchaseDetailMap.get(r.id)
        if (!d || d.postingStatus === '—') return <span className="text-xs text-secondary">—</span>
        const variant: Record<string, 'success' | 'warning' | 'neutral' | 'danger'> = {
          Posted: 'success', Approved: 'warning', Draft: 'neutral',
        }
        return <Badge variant={variant[d.postingStatus] || 'neutral'}>{d.postingStatus}</Badge>
      },
    },
    {
      key: 'acctImpact', header: 'Impact', width: '65px',
      render: r => r.voucherId ? (
        <Button variant="ghost" size="sm" onClick={() => setAcctImpactId(r.id)}
          style={{ padding: '2px 6px', fontSize: 11, color: 'var(--primary)' }}
        >
          Impact
        </Button>
      ) : (
        <span className="text-xs text-secondary">—</span>
      ),
    },
    {
      key: 'currentValue', header: 'Cur Val', sortable: true, numeric: true, width: '100px',
      render: r => {
        const d = purchaseDetailMap.get(r.id)
        return d?.currentValue ? (
          <span className="text-xs fw-500">{formatCurrency(d.currentValue, currency)}</span>
        ) : <span className="text-xs text-secondary">—</span>
      },
    },
    {
      key: 'status', header: 'Status', width: '70px',
      render: r => statusBadge(r.status),
    },
    {
      key: 'actions', header: '', width: '65px',
      render: r => (
        <div className="table-actions">
          {TransactionLifecycleService.canDelete('Purchase', r) ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <Button variant="ghost" size="sm" icon={<EditIcon />} onClick={() => openEditForm(r)} aria-label="Edit purchase" />
              <Button variant="ghost" size="sm" icon={<TrashIcon />} onClick={() => setDeleteTargetId(r.id)} aria-label="Delete purchase" />
            </div>
          ) : (
            <span className="text-secondary text-xs fw-500" style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, display: 'inline-block' }}>Posted</span>
          )}
        </div>
      ),
    },
  ]

  const resetForm = () => {
    setFormData(emptyForm)
    setFormErrors([])
    setEditingId(null)
  }

  const openAddForm = () => {
    resetForm()
    setFormData(prev => ({ ...prev, purchaseDate: new Date().toISOString().split('T')[0] }))
    setShowForm(true)
  }

  const openEditForm = (r: PurchaseRecord) => {
    setFormData({
      assetType: r.assetType,
      assetName: r.assetName,
      purchaseDate: r.purchaseDate,
      quantity: String(r.quantity),
      unitPrice: String(r.unitPrice),
      broker: r.broker,
      notes: r.notes,
      tags: r.tags.join(', '),
      status: r.status,
      bankAccountId: '',
    })
    setEditingId(r.id)
    setFormErrors([])
    setShowForm(true)
  }

  const handleSubmit = () => {
    const qty = parseFloat(formData.quantity)
    const price = parseFloat(formData.unitPrice)
    const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean)

    if (editingId) {
      const record = purchaseRecords.find(r => r.id === editingId)
      if (!record) return
      const changes: Record<string, any> = { updatedBy: 'user' }
      if (formData.assetName !== record.assetName) changes.assetName = formData.assetName
      if (formData.purchaseDate !== record.purchaseDate) changes.purchaseDate = formData.purchaseDate
      if (formData.status !== record.status) changes.status = formData.status
      if (formData.broker !== record.broker) changes.broker = formData.broker
      if (formData.notes !== record.notes) changes.notes = formData.notes
      if (tags.join(', ') !== record.tags.join(', ')) changes.tags = tags
      if (qty !== record.quantity) changes.quantity = qty
      if (price !== record.unitPrice) changes.unitPrice = price

      const errors = validateUpdatePurchase(record, changes as any)
      if (errors.length > 0) {
        setFormErrors(errors)
        return
      }

      const before = { ...record } as Record<string, unknown>
      const updated = updatePurchaseRecord(record, changes as any)
      setPurchaseRecords(prev => prev.map(r =>
        r.id === editingId ? updated : r
      ))
      onAuditEvent?.(recordModuleEvent('Purchase Ledger', 'Update', record.assetName, record.id, `Updated purchase: ${record.assetName} (${record.assetType})`, 'Info', before, updated as any))
      setShowForm(false)
      resetForm()
      setToast({ visible: true, message: 'Purchase updated', type: 'success' })
    } else {
      const input = {
        assetType: formData.assetType,
        assetName: formData.assetName,
        purchaseDate: formData.purchaseDate,
        quantity: qty,
        unitPrice: price,
        broker: formData.broker,
        notes: formData.notes,
        tags,
        createdBy: 'user',
      }
      const errors = validateCreatePurchase(input)
      if (errors.length > 0) {
        setFormErrors(errors)
        return
      }

      const inputWithFunding = { ...input, fundingBankAccountId: formData.bankAccountId }
    if (accountingEngine && setVouchers && setAccounts && formData.bankAccountId) {
        const { result, errors: acctErrors } = purchaseAndCreateVoucher(
          inputWithFunding,
          formData.bankAccountId,
          accounts,
          vouchers,
          bankMappings,
          accountingEngine,
          currency,
        )
        if (!result) {
          setToast({ visible: true, message: acctErrors.join(', '), type: 'error' })
          return
        }
        const { purchase, voucher, updatedAccounts } = result
        setPurchaseRecords(prev => [purchase, ...prev])
        setVouchers(prev => [voucher, ...prev])
        setAccounts(updatedAccounts)
        onAuditEvent?.(recordModuleEvent('Purchase Ledger', 'Create', purchase.assetName, purchase.id,
          `Recorded purchase & voucher: ${purchase.assetName} - Vch ${voucher.number}`))
        setShowForm(false)
        resetForm()
        setToast({ visible: true, message: `Purchase recorded & posted as ${voucher.number}`, type: 'success' })
      } else {
        const record = createPurchaseRecord(input)
        setPurchaseRecords(prev => [record, ...prev])
        onAuditEvent?.(recordModuleEvent('Purchase Ledger', 'Create', record.assetName, record.id,
          `Recorded purchase: ${record.assetName} (${record.assetType})`))
        setShowForm(false)
        resetForm()
        setToast({ visible: true, message: 'Purchase recorded (no voucher)', type: 'success' })
      }
    }
  }

  const handleDelete = () => {
    if (!deleteTargetId) return
    const deleted = purchaseRecords.find(r => r.id === deleteTargetId)
    setPurchaseRecords(prev => prev.filter(r => r.id !== deleteTargetId))
    setDeleteTargetId(null)
    if (deleted) {
      onAuditEvent?.(recordModuleEvent('Purchase Ledger', 'Delete', deleted.assetName, deleted.id, `Deleted purchase: ${deleted.assetName} (${deleted.assetType})`))
    }
    setToast({ visible: true, message: 'Purchase deleted', type: 'success' })
  }

  const fieldError = (field: string): string | undefined => {
    return formErrors.find(e => e.field === field)?.message
  }

  const typeOptions = [
    { value: '', label: 'All Types' },
    ...VALID_ASSET_TYPES.map(t => ({ value: t, label: t })),
  ]

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'sold', label: 'Sold' },
    { value: 'partially_sold', label: 'Partially Sold' },
  ]

  const editStatusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'sold', label: 'Sold' },
    { value: 'partially_sold', label: 'Partially Sold' },
  ]

  const kpiCards = [
    {
      label: 'Total Invested',
      value: formatCurrency(kpis.totalInvested, currency),
      icon: <TrendingUpIcon />,
      accentColor: 'var(--accent)',
    },
    {
      label: 'Total Quantity',
      value: kpis.totalQuantity.toLocaleString(),
      icon: <ActivityIcon />,
      accentColor: 'var(--success)',
    },
    {
      label: 'Weighted Average',
      value: `${currency} ${kpis.weightedAvg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <PortfolioIcon />,
      accentColor: 'var(--primary-text)',
    },
    {
      label: 'Active Lots',
      value: String(kpis.activeLots),
      icon: <CalendarIcon />,
      accentColor: 'var(--accent)',
    },
  ]

  return (
    <div className="main-content">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Purchase Ledger</div>
          <div className="page-subtitle">Record purchases and track average costs</div>
        </div>
        <div className="page-header-right">
          <Button variant="primary" onClick={openAddForm}>
            <PlusIcon /> Add Purchase
          </Button>
        </div>
      </div>

      <div className="page-body">
        {kpis.totalInvested > 0 && (
          <div className="kpi-grid mb-6">
            {kpiCards.map((k, i) => (
              <KpiCard key={k.label} label={k.label} value={k.value} icon={k.icon} accentColor={k.accentColor} delay={i * 0.05} />
            ))}
          </div>
        )}

        {purchaseRecords.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              }
              title="No purchases yet"
              text="Record your first purchase to start tracking your investment portfolio."
              action={<Button variant="primary" onClick={openAddForm}><PlusIcon /> Add Purchase</Button>}
            />
          </div>
        ) : (
          <DataTable<PurchaseRecord>
            columns={columns}
            data={filtered}
            keyExtractor={r => r.id}
            pageSize={10}
            searchable
            searchPlaceholder="Search purchases..."
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterBar={
              <>
                <Select
                  options={typeOptions}
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="min-w-140"
                />
                <Select
                  options={statusOptions}
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="min-w-150"
                />
                <Input
                  placeholder="Filter by tag..."
                  value={tagFilter}
                  onChange={e => setTagFilter(e.target.value)}
                  className="min-w-160 max-w-200"
                />
              </>
            }
            emptyState={
              <EmptyState
                icon={
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                }
                title="No matching purchases"
                text="Try adjusting your search or filters"
              />
            }
          />
        )}
      </div>

      <Modal
        open={acctImpactId !== null}
        title="Accounting Impact"
        onClose={() => setAcctImpactId(null)}
      >
        {(() => {
          const p = acctImpactId ? purchaseRecords.find(r => r.id === acctImpactId) : undefined
          if (!p) return null
          const d = purchaseDetailMap.get(p.id)
          const voucher = p.voucherId ? vouchers.find(v => v.id === p.voucherId) : undefined
          const lines = p.id ? getLinesByReference('Purchase', p.id, vouchers) : []
          return (
            <div style={{ minWidth: 520, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="kpi-grid" style={{ marginBottom: 0 }}>
                <div className="kpi-card" style={{ borderTop: '2px solid var(--accent)', padding: 12 }}>
                  <div className="kpi-label">Total Value</div>
                  <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(p.totalValue, currency)}</div>
                </div>
                <div className="kpi-card" style={{ borderTop: '2px solid var(--success)', padding: 12 }}>
                  <div className="kpi-label">Posting Status</div>
                  <div className="kpi-value" style={{ fontSize: 14 }}>{d?.voucherStatus || '—'}</div>
                </div>
                <div className="kpi-card" style={{ borderTop: '2px solid var(--warning)', padding: 12 }}>
                  <div className="kpi-label">Voucher</div>
                  <div className="kpi-value" style={{ fontSize: 14 }}>{voucher?.number || '—'}</div>
                </div>
              </div>

              <div className="card-accent-purple" style={{ padding: '12px 16px', borderRadius: 8 }}>
                <div className="text-sm fw-600 mb-2">Journal Entry</div>
                <table className="property-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th className="text-xs">Account</th>
                      <th className="text-xs">Code</th>
                      <th className="text-xs">Debit</th>
                      <th className="text-xs">Credit</th>
                      <th className="text-xs">Narration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voucher?.lines.map(line => {
                      const acct = getAccountById(line.accountId, accounts)
                      return (
                        <tr key={line.id}>
                          <td className="text-xs">{acct?.name || line.accountId}</td>
                          <td className="text-xs text-mono">{acct?.code || '—'}</td>
                          <td className="text-xs text-mono text-success">{line.type === 'Debit' ? formatCurrency(line.baseAmount, currency) : '—'}</td>
                          <td className="text-xs text-mono text-danger">{line.type === 'Credit' ? formatCurrency(line.baseAmount, currency) : '—'}</td>
                          <td className="text-xs text-secondary">{line.narration || ''}</td>
                        </tr>
                      )
                    })}
                    {(!voucher || !voucher.lines.length) && (
                      <tr>
                        <td colSpan={5} className="text-xs text-secondary text-center">No journal entries</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="card-accent-purple" style={{ padding: '12px 16px', borderRadius: 8 }}>
                <div className="text-sm fw-600 mb-2">Ledger Entries ({lines.length})</div>
                {lines.length === 0 ? (
                  <div className="text-xs text-secondary">No ledger entries found</div>
                ) : (
                  <table className="property-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th className="text-xs">Voucher</th>
                        <th className="text-xs">Account</th>
                        <th className="text-xs">Debit</th>
                        <th className="text-xs">Credit</th>
                        <th className="text-xs">Narration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map(({ line, voucher: v }) => {
                        const acct = getAccountById(line.accountId, accounts)
                        return (
                          <tr key={`${v.id}-${line.id}`}>
                            <td className="text-xs text-mono fw-500">{v.number}</td>
                            <td className="text-xs">{acct?.name || line.accountId}</td>
                            <td className="text-xs text-mono text-success">{line.type === 'Debit' ? formatCurrency(line.baseAmount, currency) : '—'}</td>
                            <td className="text-xs text-mono text-danger">{line.type === 'Credit' ? formatCurrency(line.baseAmount, currency) : '—'}</td>
                            <td className="text-xs text-secondary">{line.narration || v.description}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="card-accent-purple" style={{ padding: '12px 16px', borderRadius: 8 }}>
                <div className="text-sm fw-600 mb-2">Purchase Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="text-xs text-secondary">Asset: <span className="fw-500">{p.assetName}</span></div>
                  <div className="text-xs text-secondary">Type: <span className="fw-500">{p.assetType}</span></div>
                  <div className="text-xs text-secondary">Date: <span className="fw-500">{formatDate(p.purchaseDate, dateFormat)}</span></div>
                  <div className="text-xs text-secondary">Quantity: <span className="fw-500">{p.quantity.toLocaleString()}</span></div>
                  <div className="text-xs text-secondary">Unit Price: <span className="fw-500">{formatCurrency(p.unitPrice, currency)}</span></div>
                  <div className="text-xs text-secondary">Broker: <span className="fw-500">{p.broker || '—'}</span></div>
                  <div className="text-xs text-secondary">Chart Account: <span className="fw-500">{p.accountCode || '—'}</span></div>
                  <div className="text-xs text-secondary">Voucher: <span className="fw-500">{p.voucherNumber || '—'}</span></div>
                </div>
              </div>
            </div>
          )
        })()}
      </Modal>

      <EntityForm
        open={showForm}
        title={editingId ? 'Edit Purchase' : 'New Purchase'}
        submitLabel={editingId ? 'Update' : 'Record'}
        onCancel={() => { setShowForm(false); resetForm() }}
        onSubmit={handleSubmit}
      >
        {formErrors.length > 0 && !formErrors.some(e =>
          ['assetType', 'assetName', 'purchaseDate', 'quantity', 'unitPrice', 'status'].includes(e.field)
        ) && (
          <div className="form-error-block">
            {formErrors.map(e => <div key={e.code}>{e.message}</div>)}
          </div>
        )}
        <div className="form-row">
          {VALID_ASSET_TYPES.length === 0 ? (
            <div className="form-group">
              <label className="form-label">Asset Type</label>
              <div className="input-empty-state">No asset types found. Please create one first.</div>
              <input type="hidden" value={formData.assetType} onChange={e => setFormData(prev => ({ ...prev, assetType: e.target.value }))} />
            </div>
          ) : (
            <Select
              label="Asset Type"
              value={formData.assetType}
              onChange={e => setFormData(prev => ({ ...prev, assetType: e.target.value }))}
              options={VALID_ASSET_TYPES.map(t => ({ value: t, label: t }))}
              error={fieldError('assetType')}
            />
          )}
          <Input
            label="Asset Name"
            placeholder="e.g. 24K Gold Bar 1kg"
            value={formData.assetName}
            onChange={e => setFormData(prev => ({ ...prev, assetName: e.target.value }))}
            error={fieldError('assetName')}
          />
        </div>
        <div className="form-row">
          <Input
            label="Purchase Date"
            type="date"
            value={formData.purchaseDate}
            onChange={e => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
            error={fieldError('purchaseDate')}
          />
          <Input
            label="Quantity"
            type="number"
            step="any"
            placeholder="e.g. 100"
            value={formData.quantity}
            onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
            error={fieldError('quantity')}
          />
          <Input
            label={`Unit Price (${currency})`}
            type="number"
            step="any"
            placeholder="e.g. 490"
            value={formData.unitPrice}
            onChange={e => setFormData(prev => ({ ...prev, unitPrice: e.target.value }))}
            error={fieldError('unitPrice')}
          />
        </div>
        <div className="form-row">
          <Input
            label="Broker"
            placeholder="e.g. Dubai Gold"
            value={formData.broker}
            onChange={e => setFormData(prev => ({ ...prev, broker: e.target.value }))}
          />
          <Input
            label="Tags"
            placeholder="Comma-separated tags"
            value={formData.tags}
            onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))}
          />
        </div>
        <div className="form-row">
          <Input
            label="Notes"
            placeholder="Optional notes"
            value={formData.notes}
            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          />
          {editingId ? (
            <Select
              label="Status"
              value={formData.status}
              onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
              options={editStatusOptions}
              error={fieldError('status')}
            />
          ) : (
            <Select
              label="Bank Account"
              value={formData.bankAccountId}
              onChange={e => setFormData(prev => ({ ...prev, bankAccountId: e.target.value }))}
              options={bankOptions}
            />
          )}
        </div>
      </EntityForm>

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="Delete Purchase"
        message="Are you sure you want to delete this purchase? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}
