import React, { useState, useMemo } from 'react'
import { Plus, Download } from 'lucide-react'
import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { AccountingEngine } from '../accounting/accountingEngine'
import type { BankAccount } from '../data/banking'
import type { PurchaseRecord, ValidationError, AdditionalCostLine } from '../data/purchaseLedger'
import type { AuditEvent } from '../data/auditTypes'
import type { DocItem } from './Documents'
import AssetHoldingModal from './InvestmentHoldings'
import { mergePurchaseTags } from './InvestmentVouchersTagHelper'
import type { InvestmentCategory, InvestmentAsset } from '../data/investmentMasterData'
import { getActiveCategories, getAssetsForCategory, findCategoryByName, formatAssetType } from '../data/investmentMasterData'
import {
  createCategory as svcCreateCategory,
  createAsset as svcCreateAsset,
  isBuiltInCategory,
} from '../services/assetCategoryService'
import { recordModuleEvent } from '../services/auditService'
import { getDefaultInvestmentBankAccount } from '../services/bankingService'
import {
  createPurchaseRecord,
  updatePurchaseRecord,
  validateCreatePurchase,
  validateUpdatePurchase,
  calculateTotalInvested,
  calculateTotalQuantity,
  searchPurchases,
  filterByAssetType,
  filterByStatus,
  sortPurchases,
  type SortField,
  type SortOrder,
  getAssetWeightMultiplier,
} from '../services/purchaseLedgerService'
import { purchaseAndCreateVoucher, updatePurchaseVouchers } from '../services/purchaseAccountingService'
import { getLinesForAccount, getLinesByReference, getAccountBalance, invalidateBalanceCache } from '../accounting/ledgerService'
import { getAccountById } from '../accounting/chartOfAccountsService'
import { findOrCreateAccount } from '../accounting/assetAccountMapping'
import { getAccountIdForBank } from '../accounting/bankAccountMapping'
import { exportVoucherToPDF } from '../utils/pdfVoucherHelper'
import { DataTable, type Column } from './design/Table'
import BankAccountAvatar from './BankAccountAvatar'
import EntityForm from './design/EntityForm'
import ConfirmDialog from './design/ConfirmDialog'
import { CurrencyText } from './design/CurrencyText'
import {
  KpiCard, Button, Badge, Select, Input, EmptyState, Modal,
  PortfolioIcon, TrendingUpIcon, ActivityIcon, CalendarIcon, PlusIcon,
  EditIcon, TrashIcon, CloseIcon, ChevronLeftIcon,
} from './design/DesignSystem'
import Toast from './Toast'
import { formatDate, formatModifiedDateTime } from '../utils'
import { TransactionLifecycleService } from '../services/transactionLifecycleService'
import { formatCurrency } from '../utils/reportFormatters'
import ActionsMenu from './design/ActionsMenu'
import { printVoucher } from '../utils/printVoucherHelper'
import { exportTableData } from '../services/reportExportService'

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
  investmentCategories?: InvestmentCategory[]
  setInvestmentCategories?: React.Dispatch<React.SetStateAction<InvestmentCategory[]>>
  investmentAssets?: InvestmentAsset[]
  setInvestmentAssets?: React.Dispatch<React.SetStateAction<InvestmentAsset[]>>
  loggedInUser?: string
}

interface FormState {
  assetType: string
  assetName: string
  purchaseDate: string
  quantity: string
  unitPrice: string
  buyer: string
  notes: string
  tags: string
  status: 'active' | 'sold' | 'partially_sold'
  bankAccountId: string
  paymentMode: string
  paymentReference: string
}

const emptyForm: FormState = {
  assetType: '',
  assetName: '',
  purchaseDate: new Date().toISOString().split('T')[0],
  quantity: '',
  unitPrice: '',
  buyer: '',
  notes: '',
  tags: '',
  status: 'active',
  bankAccountId: '',
  paymentMode: 'Bank Transfer',
  paymentReference: '',
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
  investmentCategories = [],
  setInvestmentCategories,
  investmentAssets = [],
  setInvestmentAssets,
  loggedInUser,
}: Props) {
  const getAccountName = (codeOrIdOrName: string) => {
    if (!codeOrIdOrName) return '—'
    const list = accounts || []
    const acc = list.find(a => 
      a.code === codeOrIdOrName || 
      a.id === codeOrIdOrName || 
      a.name.toLowerCase() === codeOrIdOrName.toLowerCase()
    )
    return acc ? acc.name : codeOrIdOrName
  }

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [showForm, setShowForm] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormState>(emptyForm)
  const [formErrors, setFormErrors] = useState<ValidationError[]>([])
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [additionalCosts, setAdditionalCosts] = useState<Array<{
    id: string
    expenseType: string
    description: string
    amount: string
  }>>([])

  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [acctImpactId, setAcctImpactId] = useState<string | null>(null)
  const [holdingModalId, setHoldingModalId] = useState<string | null>(null)

  // ── Create Category Modal ────────────────────────────────────────────────────
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [createCategoryError, setCreateCategoryError] = useState('')

  // ── Add Asset Modal ──────────────────────────────────────────────────────────
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [newAssetName, setNewAssetName] = useState('')
  const [newAssetDesc, setNewAssetDesc] = useState('')
  const [addAssetError, setAddAssetError] = useState('')
  const [addAssetCategoryId, setAddAssetCategoryId] = useState('')

  const bankByIdMap = useMemo(
    () => new Map(bankAccounts.map(ba => [ba.id, ba])),
    [bankAccounts],
  )

  const activeRecords = useMemo(() => purchaseRecords.map(r => ({
    ...r,
    tags: mergePurchaseTags(r.tags, r.voucherId, vouchers)
  })), [purchaseRecords, vouchers])

  const kpis = useMemo(() => {
    let gold = 0
    let silver = 0
    for (const r of activeRecords) {
      const type = (r.assetType || '').toLowerCase()
      if (type === 'gold') {
        gold += r.quantity * getAssetWeightMultiplier(r.assetName)
      } else if (type === 'silver') {
        silver += r.quantity * getAssetWeightMultiplier(r.assetName)
      }
    }
    return {
      totalInvested: calculateTotalInvested(activeRecords),
      totalQuantity: calculateTotalQuantity(activeRecords),
      activeLots: activeRecords.filter(r => r.status === 'active').length,
      goldQty: gold,
      silverQty: silver,
    }
  }, [activeRecords])

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
        debitAccountName: debitLine ? getAccountById(debitLine.accountId, accounts)?.name || '—' : '—',
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

  const activeCategories = useMemo(() => getActiveCategories(investmentCategories), [investmentCategories])

  // ── Derived: current category for selected assetType ────────────────────────
  const selectedCategory = useMemo(
    () => findCategoryByName(investmentCategories, formData.assetType),
    [investmentCategories, formData.assetType]
  )
  const isCustomCategory = selectedCategory ? !isBuiltInCategory(selectedCategory.id) : false
  const isUnknownType = useMemo(() => {
    if (!formData.assetType || formData.assetType === '__custom__') return false
    return !activeCategories.some(c => c.name === formData.assetType)
  }, [formData.assetType, activeCategories])

  // Asset name dropdown options — filtered by selected assetType
  const assetNameOptions = useMemo(() => {
    if (!formData.assetType) return [{ value: '', label: 'Select Asset Name' }]
    const cat = findCategoryByName(investmentCategories, formData.assetType)
    if (!cat) return [{ value: '', label: 'No assets found' }]
    const assets = getAssetsForCategory(investmentAssets, cat.id)
    return [
      { value: '', label: 'Select Asset Name' },
      ...assets.map(a => ({ value: a.name, label: a.name, deletable: true })),
      { value: '__add_custom__', label: '+ Add Custom Asset' },
    ]
  }, [formData.assetType, investmentCategories, investmentAssets])

  const currentCategoryAssets = useMemo(() => {
    if (!selectedCategory) return []
    return getAssetsForCategory(investmentAssets, selectedCategory.id)
  }, [selectedCategory, investmentAssets])

  // ── Create Category Handler ──────────────────────────────────────────────────
  const handleCreateCategory = () => {
    const result = svcCreateCategory(newCategoryName, investmentCategories)
    if (!result.ok || !result.data) {
      setCreateCategoryError(result.error || 'Invalid')
      return
    }
    setInvestmentCategories?.(prev => [...prev, result.data!])
    setFormData(prev => ({ ...prev, assetType: result.data!.name, assetName: '' }))
    setNewCategoryName('')
    setCreateCategoryError('')
    setShowCreateCategory(false)
    setToast({ visible: true, message: 'Asset category created successfully.', type: 'success' })
  }

  // ── Add Asset Handler ────────────────────────────────────────────────────────
  const openAddAssetModal = () => {
    if (!selectedCategory) return
    setAddAssetCategoryId(selectedCategory.id)
    setNewAssetName('')
    setNewAssetDesc('')
    setAddAssetError('')
    setShowAddAsset(true)
  }

  const handleAddAsset = () => {
    const result = svcCreateAsset(addAssetCategoryId, newAssetName, investmentAssets)
    if (!result.ok || !result.data) {
      setAddAssetError(result.error || 'Invalid')
      return
    }
    setInvestmentAssets?.(prev => [...prev, result.data!])
    setFormData(prev => ({ ...prev, assetName: result.data!.name }))
    setNewAssetName('')
    setNewAssetDesc('')
    setAddAssetError('')
    setShowAddAsset(false)
    setToast({ visible: true, message: 'Asset added successfully.', type: 'success' })
  }

  const handleDeleteAssetOption = (assetName: string) => {
    // Check if the asset is used in any purchases
    const isUsed = purchaseRecords.some(r => r.assetName === assetName)
    if (isUsed) {
      alert(`The asset "${assetName}" is currently used in one or more purchase transactions and cannot be deleted.`)
      return
    }
    
    if (confirm(`Are you sure you want to delete "${assetName}"?`)) {
      setInvestmentAssets?.(prev => prev.filter(a => a.name !== assetName))
      setToast({ visible: true, message: `Asset "${assetName}" deleted successfully.`, type: 'success' })
      if (formData.assetName === assetName) {
        setFormData(prev => ({ ...prev, assetName: '' }))
      }
    }
  }

  const bankOptions = useMemo(() => [
    { value: '', label: 'Select bank account' },
    ...bankAccounts.filter(a => a.status === 'active' || a.id === formData.bankAccountId).map(a => ({
      value: a.id,
      label: a.institution,
    })),
  ], [bankAccounts, formData.bankAccountId])

  const columns: Column<PurchaseRecord>[] = [
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
      key: 'purchaseDate', header: 'Date', sortable: true, width: '90px',
      render: r => {
        const v = r.voucherId ? vouchers.find(vch => vch.id === r.voucherId) : undefined
        return (
          <div>
            <span className="text-secondary text-xs">{formatDate(r.purchaseDate, dateFormat)}</span>
          </div>
        )
      },
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
          <div className="text-xs text-secondary">{formatAssetType(r.assetType)}</div>
        </div>
      ),
    },
    {
      key: 'quantity', header: 'Qty', sortable: true, numeric: true, width: '70px',
      render: r => <span className="text-xs">{r.quantity.toLocaleString()}</span>,
    },
    {
      key: 'unitPrice', header: 'Unit Price', sortable: true, numeric: true, width: '100px',
      render: r => <span className="text-xs"><CurrencyText value={r.unitPrice} currency={currency} /></span>,
    },
    {
      key: 'totalValue', header: 'Total', sortable: true, numeric: true, width: '110px',
      render: r => <span className="fw-600 text-xs text-gold"><CurrencyText value={r.totalValue} currency={currency} /></span>,
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
      key: 'buyer', header: 'Buyer', width: '100px',
      render: r => <span className="text-xs text-secondary">{r.buyer || '—'}</span>,
    },
    {
      key: 'paymentMode', header: 'Payment Mode', width: '100px',
      render: r => <span className="text-xs text-secondary">{r.paymentMode || 'Unknown'}</span>,
    },
    {
      key: 'tags', header: 'Tags', width: '100px',
      render: r => <span className="text-xs text-secondary">{r.tags?.length > 0 ? r.tags.join(', ') : '—'}</span>,
    },
    {
      key: 'notes', header: 'Notes', width: '120px',
      render: r => <span className="text-xs text-secondary" title={r.notes}>{r.notes ? (r.notes.length > 20 ? r.notes.slice(0, 20) + '...' : r.notes) : '—'}</span>,
    },
    {
      key: 'accountCode', header: 'Chart', width: '70px',
      render: r => r.accountCode ? (
        <Badge variant="neutral">{r.accountCode}</Badge>
      ) : <span className="text-xs text-secondary">—</span>,
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
      key: 'status', header: 'Status', width: '70px',
      render: r => statusBadge(r.status),
    },
    {
      key: 'actions', header: 'Actions', width: '90px',
      render: r => {
        const v = r.voucherId ? vouchers.find(vch => vch.id === r.voucherId) : undefined
        return (
          <div className="table-actions" style={{ display: 'flex', justifyContent: 'center' }}>
            <ActionsMenu
              onView={() => setAcctImpactId(r.id)}
              onEdit={() => openEditForm(r)}
              onDuplicate={() => handleDuplicate(r)}
              onPrint={() => {
                if (v) {
                  printVoucher(v, accounts, currency)
                } else {
                  setToast({ visible: true, message: 'No accounting voucher linked to print', type: 'error' })
                }
              }}
              onExportPDF={() => {
                if (v) {
                  exportVoucherToPDF(v, accounts, currency, 'Investment Portfolio', loggedInUser)
                } else {
                  setToast({ visible: true, message: 'No accounting voucher linked to export', type: 'error' })
                }
              }}
              onDelete={() => {
                if (r.status !== 'active') {
                  setToast({
                    visible: true,
                    message: `Cannot delete purchase lot ${r.lotId} because its status is ${r.status}.`,
                    type: 'error'
                  })
                  return
                }
                if (r.voucherId) {
                  const voucher = vouchers.find(vch => vch.id === r.voucherId)
                  if (voucher) {
                    if (voucher.isReconciled) {
                      setToast({
                        visible: true,
                        message: `Cannot delete purchase because the associated voucher ${voucher.number} is reconciled.`,
                        type: 'error'
                      })
                      return
                    }
                    if (voucher.isLocked) {
                      setToast({
                        visible: true,
                        message: `Cannot delete purchase because the associated voucher ${voucher.number} is locked.`,
                        type: 'error'
                      })
                      return
                    }
                  }
                }
                setDeleteTargetId(r.id)
              }}
              canDelete={true}
            />
          </div>
        )
      },
    },
  ]

  const resetForm = () => {
    const defaultBank = getDefaultInvestmentBankAccount(bankAccounts)
    setFormData({
      ...emptyForm,
      bankAccountId: defaultBank ? defaultBank.id : '',
      paymentMode: 'Bank Transfer',
      paymentReference: '',
    })
    setAdditionalCosts([])
    setFormErrors([])
    setEditingId(null)
  }

  const openAddForm = () => {
    resetForm()
    const defaultBank = getDefaultInvestmentBankAccount(bankAccounts)
    setFormData(prev => ({
      ...prev,
      purchaseDate: new Date().toISOString().split('T')[0],
      bankAccountId: defaultBank ? defaultBank.id : '',
      paymentMode: 'Bank Transfer',
      paymentReference: '',
    }))
    setAdditionalCosts([])
    setShowForm(true)
  }

  const openEditForm = (r: PurchaseRecord) => {
    setFormData({
      assetType: r.assetType,
      assetName: r.assetName,
      purchaseDate: r.purchaseDate,
      quantity: String(r.quantity),
      unitPrice: String(r.unitPrice),
      buyer: r.buyer || '',
      notes: r.notes,
      tags: r.tags.join(', '),
      status: r.status,
      bankAccountId: r.fundingBankAccountId || '',
      paymentMode: r.paymentMode || 'Bank Transfer',
      paymentReference: r.paymentReference || '',
    })
    if (r.additionalCosts) {
      setAdditionalCosts(r.additionalCosts.map(c => ({
        id: c.id,
        expenseType: c.expenseType,
        description: c.description || '',
        amount: String(c.amount)
      })))
    } else {
      setAdditionalCosts([])
    }
    setEditingId(r.id)
    setFormErrors([])
    setShowForm(true)
  }

  const handlePaymentModeChange = (mode: string) => {
    setFormData(prev => ({ ...prev, paymentMode: mode }))
  }

  const handleAddCostRow = () => {
    setAdditionalCosts(prev => [
      ...prev,
      {
        id: `cost-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        expenseType: '5180',
        description: '',
        amount: '',
      }
    ])
  }

  const handleRemoveCostRow = (id: string) => {
    setAdditionalCosts(prev => prev.filter(c => c.id !== id))
  }

  const handleUpdateCostRow = (id: string, field: 'expenseType' | 'description' | 'amount', value: string) => {
    setAdditionalCosts(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, [field]: value }
      }
      return c
    }))
  }

  const handleExport = (format: 'pdf' | 'csv' | 'xlsx') => {
    const exportColumns = [
      'VOUCHER', 'DATE', 'ASSET', 'QTY', 'UNIT PRICE', 'TOTAL', 
      'PAID FROM', 'BUYER', 'PAYMENT MODE', 'TAGS', 'NOTES',
      'DOCS', 'POSTING', 'STATUS'
    ]
    
    const rows = filtered.map(r => {
      const bank = r.fundingBankAccountId ? bankByIdMap.get(r.fundingBankAccountId) ?? null : null
      const d = purchaseDetailMap.get(r.id)
      const paidFrom = bank ? bank.institution : (d?.creditAccountName || (r.voucherNumber ? '—' : 'N/A'))
      
      return [
        r.voucherNumber || '—',
        formatDate(r.purchaseDate, dateFormat),
        `${r.assetName}\n(${formatAssetType(r.assetType)})`,
        r.quantity.toLocaleString(),
        formatCurrency(r.unitPrice, currency),
        formatCurrency(r.totalValue, currency),
        paidFrom,
        r.buyer || '—',
        r.paymentMode || 'Unknown',
        r.tags?.length > 0 ? r.tags.join(', ') : '—',
        r.notes || '—',
        d && d.docsCount > 0 ? String(d.docsCount) : '—',
        d && d.postingStatus !== '—' ? d.postingStatus : '—',
        r.status
      ]
    })

    const totalInvested = calculateTotalInvested(filtered)
    const foot = [
      ['', '', '', '', 'Total Invested:', formatCurrency(totalInvested, currency), '', '', '', '', '', '', '', '']
    ]

    exportTableData({
      moduleName: 'Investment Portfolio',
      format,
      title: 'Purchase Ledger',
      subtitle: `Exported on ${formatDate(new Date().toISOString(), dateFormat)}`,
      filename: `Purchase_Ledger_${new Date().toISOString().split('T')[0]}`,
      columns: exportColumns,
      rows,
      foot,
      currency,
      orientation: 'landscape',
      generatedBy: loggedInUser
    })
    setShowExportMenu(false)
  }

  const handleDuplicate = (r: PurchaseRecord) => {
    setFormData({
      assetType: r.assetType,
      assetName: r.assetName,
      purchaseDate: new Date().toISOString().split('T')[0],
      quantity: String(r.quantity),
      unitPrice: String(r.unitPrice),
      buyer: r.buyer || '',
      notes: `Duplicate of ${r.lotId}: ${r.notes}`,
      tags: r.tags.join(', '),
      status: 'active',
      bankAccountId: r.fundingBankAccountId || '',
      paymentMode: r.paymentMode || 'Bank Transfer',
      paymentReference: r.paymentReference || '',
    })
    setEditingId(null)
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

      if (isNaN(qty) || qty <= 0) {
        setToast({ visible: true, message: 'Quantity must be greater than zero', type: 'error' })
        return
      }
      if (isNaN(price) || price <= 0) {
        setToast({ visible: true, message: 'Unit price must be greater than zero', type: 'error' })
        return
      }
      if (!formData.bankAccountId) {
        setToast({ visible: true, message: 'Please select a bank account', type: 'error' })
        return
      }

      const multiplier = getAssetWeightMultiplier(formData.assetName)
      const totalVal = Math.round(qty * price * multiplier * 100) / 100

      let assetAccountId = record.accountId
      let assetAccountCode = record.accountCode
      let updatedCoa = accounts

      if (accounts && accounts.length > 0) {
        const { account: assetAccount, updatedAccounts } = findOrCreateAccount(
          formData.assetType,
          formData.assetName,
          accounts,
        )
        assetAccountId = assetAccount.id
        assetAccountCode = assetAccount.code
        updatedCoa = updatedAccounts
      }

      const changes: Record<string, any> = {
        updatedBy: 'user',
        assetType: formData.assetType,
        assetName: formData.assetName,
        purchaseDate: formData.purchaseDate,
        status: formData.status,
        buyer: formData.buyer,
        notes: formData.notes,
        tags: tags,
        quantity: qty,
        unitPrice: price,
        totalValue: totalVal,
        fundingBankAccountId: formData.bankAccountId,
        paymentMode: formData.paymentMode as any,
        paymentReference: formData.paymentReference || undefined,
        accountId: assetAccountId,
        accountCode: assetAccountCode,
      }

      const errors = validateUpdatePurchase(record, changes as any)
      if (errors.length > 0) {
        setFormErrors(errors)
        return
      }

      // Check if voucher is locked or reconciled
      if (record.voucherId) {
        const voucher = vouchers.find(v => v.id === record.voucherId)
        if (voucher) {
          if (voucher.isReconciled) {
            setToast({ visible: true, message: `Cannot modify purchase because the associated voucher ${voucher.number} is reconciled.`, type: 'error' })
            return
          }
          if (voucher.isLocked) {
            setToast({ visible: true, message: `Cannot modify purchase because the associated voucher ${voucher.number} is locked.`, type: 'error' })
            return
          }
        }
      }

      // Check if any additional cost vouchers are locked or reconciled
      if (record.additionalCosts) {
        for (const costLine of record.additionalCosts) {
          if (costLine.voucherId) {
            const vch = vouchers.find(v => v.id === costLine.voucherId)
            if (vch) {
              if (vch.isReconciled) {
                setToast({ visible: true, message: `Cannot modify purchase because additional cost voucher ${vch.number} is reconciled.`, type: 'error' })
                return
              }
              if (vch.isLocked) {
                setToast({ visible: true, message: `Cannot modify purchase because additional cost voucher ${vch.number} is locked.`, type: 'error' })
                return
              }
            }
          }
        }
      }

      const formattedCosts: AdditionalCostLine[] = additionalCosts
        .filter(c => c.expenseType && parseFloat(c.amount) > 0)
        .map(c => ({
          id: c.id || `cost-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          expenseType: c.expenseType,
          description: c.description || undefined,
          amount: parseFloat(c.amount),
          voucherId: (record.additionalCosts?.find(oc => oc.id === c.id))?.voucherId,
          voucherNumber: (record.additionalCosts?.find(oc => oc.id === c.id))?.voucherNumber,
        }))

      if (accountingEngine && setVouchers && setAccounts) {
        const updateResult = updatePurchaseVouchers(
          record,
          {
            ...changes,
            additionalCosts: formattedCosts,
          } as any,
          accounts,
          vouchers,
          bankMappings,
          accountingEngine,
          currency,
        )

        if (!updateResult.success) {
          setToast({ visible: true, message: updateResult.errors.join(', '), type: 'error' })
          return
        }

        const before = { ...record } as Record<string, unknown>
        const updated = updateResult.purchase!

        setPurchaseRecords(prev => prev.map(r => r.id === editingId ? updated : r))
        setVouchers(updateResult.vouchers)
        setAccounts(updateResult.accounts)
        invalidateBalanceCache()

        onAuditEvent?.(recordModuleEvent('Purchase Ledger', 'Update', record.assetName, record.id, `Updated purchase & vouchers: ${record.assetName} (${record.assetType})`, 'Info', before, updated as any))
        setShowForm(false)
        resetForm()
        setToast({ visible: true, message: 'Purchase updated', type: 'success' })
      } else {
        const before = { ...record } as Record<string, unknown>
        const updated = updatePurchaseRecord(record, {
          ...changes,
          additionalCosts: formattedCosts,
        } as any)
        setPurchaseRecords(prev => prev.map(r => r.id === editingId ? updated : r))
        onAuditEvent?.(recordModuleEvent('Purchase Ledger', 'Update', record.assetName, record.id, `Updated purchase: ${record.assetName} (${record.assetType})`, 'Info', before, updated as any))
        setShowForm(false)
        resetForm()
        setToast({ visible: true, message: 'Purchase updated', type: 'success' })
      }
    } else {
      if (!formData.bankAccountId) {
        setToast({ visible: true, message: 'Please select a bank account', type: 'error' })
        return
      }

      const formattedCosts: AdditionalCostLine[] = additionalCosts
        .filter(c => c.expenseType && parseFloat(c.amount) > 0)
        .map(c => ({
          id: c.id || `cost-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          expenseType: c.expenseType,
          description: c.description || undefined,
          amount: parseFloat(c.amount),
        }))

      const input = {
        assetType: formData.assetType,
        assetName: formData.assetName,
        purchaseDate: formData.purchaseDate,
        quantity: qty,
        unitPrice: price,
        buyer: formData.buyer,
        notes: formData.notes,
        tags,
        paymentMode: formData.paymentMode as any,
        paymentReference: formData.paymentReference || undefined,
        additionalCosts: formattedCosts,
        createdBy: 'user',
      }
      console.log('--- SAVING INVESTMENT PURCHASE ---')
      console.log(`Asset Type: ${input.assetType}`)
      console.log(`Asset Name: ${input.assetName}`)
      console.log(`Repository: Local Storage / State Store`)
      const errors = validateCreatePurchase(input)
      console.log(`Validation result: ${errors.length > 0 ? 'FAILED: ' + JSON.stringify(errors) : 'SUCCESS'}`)
      if (errors.length > 0) {
        setFormErrors(errors)
        return
      }

      const inputWithFunding = { 
        ...input, 
        fundingBankAccountId: formData.bankAccountId
      }
      if (accountingEngine && setVouchers && setAccounts && formData.bankAccountId) {
        try {
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
            console.log(`Database response: FAILED - ${acctErrors.join(', ')}`)
            setToast({ visible: true, message: acctErrors.join(', '), type: 'error' })
            return
          }
          const { purchase, voucher, additionalVouchers = [], updatedAccounts } = result
          console.log(`Generated IDs: Purchase ID = ${purchase.id}, Voucher ID = ${voucher.id}`)
          console.log(`Database response: SUCCESS`)
          
          setPurchaseRecords(prev => [purchase, ...prev])
          setVouchers(prev => [voucher, ...additionalVouchers, ...prev])
          setAccounts(updatedAccounts)
          invalidateBalanceCache()
          onAuditEvent?.(recordModuleEvent('Purchase Ledger', 'Create', purchase.assetName, purchase.id,
            `Recorded purchase & vouchers: ${purchase.assetName} - Vch ${voucher.number}`))
          setShowForm(false)
          resetForm()
          setToast({ visible: true, message: `Purchase recorded & posted as ${voucher.number}`, type: 'success' })
        } catch (e: any) {
          console.log(`Database response: EXCEPTION - ${e.message}`)
          setToast({ visible: true, message: `Error: ${e.message}`, type: 'error' })
        }
      } else {
        const record = createPurchaseRecord(input)
        console.log(`Generated IDs: Purchase ID = ${record.id}`)
        console.log(`Database response: SUCCESS (No accounting)`)
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
    const record = purchaseRecords.find(r => r.id === deleteTargetId)
    if (!record) return

    // Safety: Prevent deletion if status is sold or partially_sold
    if (record.status !== 'active') {
      setToast({
        visible: true,
        message: `Cannot delete purchase lot ${record.lotId} because its status is ${record.status}.`,
        type: 'error'
      })
      setDeleteTargetId(null)
      return
    }

    // Safety: Check if associated voucher is locked or reconciled
    if (record.voucherId) {
      const voucher = vouchers.find(v => v.id === record.voucherId)
      if (voucher) {
        if (voucher.isReconciled) {
          setToast({ visible: true, message: `Cannot delete purchase because the associated voucher ${voucher.number} is reconciled.`, type: 'error' })
          setDeleteTargetId(null)
          return
        }
        if (voucher.isLocked) {
          setToast({ visible: true, message: `Cannot delete purchase because the associated voucher ${voucher.number} is locked.`, type: 'error' })
          setDeleteTargetId(null)
          return
        }
      }
    }

    // Safety: Check if any additional cost vouchers are locked or reconciled
    if (record.additionalCosts) {
      for (const costLine of record.additionalCosts) {
        if (costLine.voucherId) {
          const vch = vouchers.find(v => v.id === costLine.voucherId)
          if (vch) {
            if (vch.isReconciled) {
              setToast({ visible: true, message: `Cannot delete purchase because additional cost voucher ${vch.number} is reconciled.`, type: 'error' })
              setDeleteTargetId(null)
              return
            }
            if (vch.isLocked) {
              setToast({ visible: true, message: `Cannot delete purchase because additional cost voucher ${vch.number} is locked.`, type: 'error' })
              setDeleteTargetId(null)
              return
            }
          }
        }
      }
    }

    // 1. Remove the purchase record
    setPurchaseRecords(prev => prev.filter(r => r.id !== deleteTargetId))

    // 2. Soft-delete linked payment voucher and additional cost vouchers
    if (setVouchers) {
      const voucherIdsToSoftDelete = new Set<string>()
      if (record.voucherId) voucherIdsToSoftDelete.add(record.voucherId)
      if (record.additionalCosts) {
        for (const c of record.additionalCosts) {
          if (c.voucherId) voucherIdsToSoftDelete.add(c.voucherId)
        }
      }

      if (voucherIdsToSoftDelete.size > 0) {
        setVouchers(prev => prev.map(v => {
          if (voucherIdsToSoftDelete.has(v.id)) {
            return {
              ...v,
              isDeleted: true,
              modifiedAt: new Date().toISOString(),
              modifiedBy: 'user',
            }
          }
          return v
        }))
      }
    }

    // 3. Invalidate accounting ledger balance cache
    invalidateBalanceCache()

    // 4. Log Audit Event
    onAuditEvent?.(recordModuleEvent(
      'Purchase Ledger',
      'Delete',
      record.assetName,
      record.id,
      `Permanently deleted purchase: ${record.assetName} (${record.assetType}) and reversed linked vouchers`
    ))

    setDeleteTargetId(null)
    setToast({ visible: true, message: 'Purchase deleted and accounting reversed', type: 'success' })
  }

  const fieldError = (field: string): string | undefined => {
    return formErrors.find(e => e.field === field)?.message
  }

  const typeOptions = [
    { value: '', label: 'All Types' },
    ...activeCategories.map(c => ({ value: c.name, label: c.name })),
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
      value: <CurrencyText value={kpis.totalInvested} currency={currency} />,
      icon: <TrendingUpIcon />,
      accentColor: 'var(--accent)',
    },
    {
      label: 'Total Gold Qty',
      value: `${kpis.goldQty.toLocaleString()} g`,
      icon: <ActivityIcon />,
      accentColor: 'var(--warning)',
    },
    {
      label: 'Total Silver Qty',
      value: `${kpis.silverQty.toLocaleString()} g`,
      icon: <ActivityIcon />,
      accentColor: 'var(--text-secondary)',
    },
    {
      label: 'Active Lots',
      value: String(kpis.activeLots),
      icon: <CalendarIcon />,
      accentColor: 'var(--accent)',
    },
  ]

  const commodityPrice = useMemo(() => {
    const qty = parseFloat(formData.quantity) || 0
    const price = parseFloat(formData.unitPrice) || 0
    const multiplier = getAssetWeightMultiplier(formData.assetName)
    return Math.round(qty * price * multiplier * 100) / 100
  }, [formData.quantity, formData.unitPrice, formData.assetName])

  const additionalTotal = useMemo(() => {
    return additionalCosts.reduce((sum, row) => {
      const amt = parseFloat(row.amount) || 0
      return sum + amt
    }, 0)
  }, [additionalCosts])

  const totalPurchaseCost = commodityPrice + additionalTotal

  return (
    <div className="main-content">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Purchase Ledger</div>
          <div className="page-subtitle">Record purchases and track investment costs</div>
        </div>
        <div className="page-header-right" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Button variant="secondary" onClick={() => setShowExportMenu(!showExportMenu)}>
              <Download size={16} style={{ marginRight: 6 }} /> Export <span style={{ display: 'inline-block', transform: showExportMenu ? 'rotate(90deg)' : 'rotate(-90deg)', width: 12, height: 12, marginLeft: 4 }}><ChevronLeftIcon /></span>
            </Button>
            {showExportMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, width: 140, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <button className="export-menu-item" onClick={() => handleExport('pdf')} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer' }}>PDF (.pdf)</button>
                <button className="export-menu-item" onClick={() => handleExport('xlsx')} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer' }}>Excel (.xlsx)</button>
                <button className="export-menu-item" onClick={() => handleExport('csv')} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer' }}>CSV (.csv)</button>
              </div>
            )}
          </div>
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
                  <div className="kpi-value" style={{ fontSize: 18 }}><CurrencyText value={p.totalValue} currency={currency} /></div>
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
                          <td className="text-xs text-mono text-success">{line.type === 'Debit' ? <CurrencyText value={line.baseAmount} currency={currency} /> : '—'}</td>
                          <td className="text-xs text-mono text-danger">{line.type === 'Credit' ? <CurrencyText value={line.baseAmount} currency={currency} /> : '—'}</td>
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
                            <td className="text-xs text-mono text-success">{line.type === 'Debit' ? <CurrencyText value={line.baseAmount} currency={currency} /> : '—'}</td>
                            <td className="text-xs text-mono text-danger">{line.type === 'Credit' ? <CurrencyText value={line.baseAmount} currency={currency} /> : '—'}</td>
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
                  <div className="text-xs text-secondary">Type: <span className="fw-500">{formatAssetType(p.assetType)}</span></div>
                  <div className="text-xs text-secondary">Date: <span className="fw-500">{formatDate(p.purchaseDate, dateFormat)}</span></div>
                  <div className="text-xs text-secondary">Quantity: <span className="fw-500">{p.quantity.toLocaleString()}</span></div>
                  <div className="text-xs text-secondary">Unit Price: <span className="fw-500"><CurrencyText value={p.unitPrice} currency={currency} /></span></div>
                  <div className="text-xs text-secondary">Buyer: <span className="fw-500">{p.buyer || '—'}</span></div>
                  <div className="text-xs text-secondary">Chart Account: <span className="fw-500">{p.accountCode || '—'}</span></div>
                  <div className="text-xs text-secondary">Voucher: <span className="fw-500">{p.voucherNumber || '—'}</span></div>

                  {p.additionalCosts && p.additionalCosts.length > 0 && (
                    <div style={{ gridColumn: 'span 2', marginTop: 12, borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
                      <div className="text-xs fw-600 mb-2">Additional Acquisition Costs</div>
                      <table className="property-table" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th className="text-xs">Type</th>
                            <th className="text-xs">Description</th>
                            <th className="text-xs text-right">Amount</th>
                            <th className="text-xs">Voucher</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.additionalCosts.map(c => (
                            <tr key={c.id}>
                              <td className="text-xs">{getAccountName(c.expenseType)}</td>
                              <td className="text-xs text-secondary">{c.description || '—'}</td>
                              <td className="text-xs text-mono text-right"><CurrencyText value={c.amount} currency={currency} /></td>
                              <td className="text-xs text-mono">{c.voucherNumber || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', marginTop: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          Additional Costs Total: <span className="fw-600"><CurrencyText value={p.additionalCosts.reduce((s, c) => s + c.amount, 0)} currency={currency} /></span>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
                          Total Purchase Cost: <span><CurrencyText value={p.totalValue + p.additionalCosts.reduce((s, c) => s + c.amount, 0)} currency={currency} /></span>
                        </div>
                      </div>
                    </div>
                  )}
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
          {activeCategories.length === 0 ? (
            <div className="form-group">
              <label className="form-label">Asset Type</label>
              <div className="input-empty-state">No asset categories found.</div>
            </div>
          ) : (
            <Select
              label="Asset Type"
              value={formData.assetType}
              onChange={e => {
                const val = e.target.value
                if (val === '__custom__') {
                  setNewCategoryName('')
                  setCreateCategoryError('')
                  setShowCreateCategory(true)
                  return
                }
                setFormData(prev => ({ ...prev, assetType: val, assetName: '' }))
              }}
              options={[
                { value: '', label: 'Select Asset Type' },
                ...activeCategories.map(c => ({ value: c.name, label: c.name })),
                ...(isUnknownType ? [{ value: formData.assetType, label: formatAssetType(formData.assetType) }] : []),
                { value: '__custom__', label: '+ Custom...' }
              ]}
              error={fieldError('assetType')}
            />
          )}
          {isCustomCategory && currentCategoryAssets.length === 0 ? (
            <div className="form-group">
              <label className="form-label">Asset Name</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="input-empty-state" style={{ padding: '10px 12px', borderRadius: 6, border: '1px dashed var(--border)', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
                  No assets yet for this category.
                </div>
                {!editingId && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: '6px 14px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    onClick={openAddAssetModal}
                  >
                    <Plus size={14} strokeWidth={1.75} /> Add Asset
                  </button>
                )}
              </div>
              {fieldError('assetName') && (
                <div className="form-error">{fieldError('assetName')}</div>
              )}
            </div>
          ) : (
            formData.assetType ? (
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="form-label">Asset Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <Select
                      label=""
                      value={formData.assetName}
                      onChange={e => {
                        if (e.target.value === '__add_custom__') {
                          openAddAssetModal()
                          setFormData(prev => ({ ...prev, assetName: '' }))
                        } else {
                          setFormData(prev => ({ ...prev, assetName: e.target.value }))
                        }
                      }}
                      options={assetNameOptions}
                      onDeleteOption={handleDeleteAssetOption}
                      error={fieldError('assetName')}
                      disabled={!!editingId}
                    />
                  </div>
                  {selectedCategory && !editingId && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: 12, padding: '10px 12px', flexShrink: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={openAddAssetModal}
                      title="Add new asset to this category"
                    >
                      <Plus size={14} strokeWidth={1.75} /> Add Custom
                    </button>
                  )}
                </div>
              </div>
            ) : null
          )}
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
            label="Buyer"
            placeholder="e.g. Dubai Gold Buyer"
            value={formData.buyer}
            onChange={e => setFormData(prev => ({ ...prev, buyer: e.target.value }))}
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
          {editingId && (
            <Select
              label="Status"
              value={formData.status}
              onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
              options={editStatusOptions}
              error={fieldError('status')}
            />
          )}
        </div>
        <div className="form-row">
          <Select
            label="Payment Mode"
            value={formData.paymentMode}
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
          <Select
            label="Funding Bank Account"
            value={formData.bankAccountId}
            onChange={e => setFormData(prev => ({ ...prev, bankAccountId: e.target.value }))}
            options={bankOptions}
          />
        </div>

        <div style={{ marginTop: 24, borderTop: '1px solid var(--divider)', paddingTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Additional Acquisition Costs</h4>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={handleAddCostRow}
            >
              <Plus size={12} strokeWidth={2} /> Add Expense
            </button>
          </div>

          {additionalCosts.length === 0 ? (
            <div style={{ padding: '12px 16px', background: '#faf8f5', border: '1px dashed var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 16 }}>
              No additional acquisition costs recorded for this purchase.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {additionalCosts.map((cost, idx) => (
                <div key={cost.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr auto', gap: 12, alignItems: 'flex-end', background: '#faf9f6', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <Select
                    label="Expense Type"
                    value={cost.expenseType}
                    onChange={e => handleUpdateCostRow(cost.id, 'expenseType', e.target.value)}
                    options={[
                      { value: 'EXP_PURCHASE_INPUT_VAT', label: 'Purchase Input VAT Expense' },
                      { value: '5130', label: 'Brokerage Fees' },
                      { value: '5150', label: 'Bank Charges' },
                      { value: '5220', label: 'Transportation' },
                      { value: '5230', label: 'Insurance' },
                      { value: '5240', label: 'Documentation' },
                      { value: '5140', label: 'Transfer Fees' },
                      { value: '5180', label: 'Other Expenses' },
                    ]}
                  />
                  <Input
                    label="Description"
                    placeholder="e.g. VAT/Brokerage detail"
                    value={cost.description}
                    onChange={e => handleUpdateCostRow(cost.id, 'description', e.target.value)}
                  />
                  <Input
                    label={`Amount (${currency})`}
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={cost.amount}
                    onChange={e => handleUpdateCostRow(cost.id, 'amount', e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ padding: '8px 10px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 'auto', background: 'transparent', border: 'none', color: 'var(--danger)' }}
                    onClick={() => handleRemoveCostRow(cost.id)}
                    title="Remove expense line"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{
            marginTop: 16,
            padding: '12px 16px',
            background: 'var(--surface-variant, #FAF8F4)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Commodity Price:</span>
              <span className="fw-500"><CurrencyText value={commodityPrice} currency={currency} /></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>+ Additional Costs:</span>
              <span className="fw-500"><CurrencyText value={additionalTotal} currency={currency} /></span>
            </div>
            <div style={{ height: '1px', background: 'var(--divider)', margin: '2px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
              <span>Total Purchase Cost:</span>
              <span style={{ color: 'var(--primary)' }}><CurrencyText value={totalPurchaseCost} currency={currency} /></span>
            </div>
          </div>
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

      {/* ── Create Asset Category Modal ───────────────────────────────────── */}
      <Modal
        open={showCreateCategory}
        title="Create Asset Category"
        onClose={() => { setShowCreateCategory(false); setNewCategoryName(''); setCreateCategoryError('') }}
      >
        <div style={{ minWidth: 380, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Asset Category Name <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              className="input"
              placeholder="e.g. Cryptocurrency, Artwork, Luxury Watches"
              value={newCategoryName}
              maxLength={50}
              onChange={e => { setNewCategoryName(e.target.value); setCreateCategoryError('') }}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateCategory() }}
              autoFocus
            />
            {createCategoryError && (
              <div className="form-error" style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{createCategoryError}</div>
            )}
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
              {newCategoryName.trim().length}/50 characters
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => { setShowCreateCategory(false); setNewCategoryName(''); setCreateCategoryError('') }}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateCategory}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* ── Add Asset Modal ───────────────────────────────────────────────── */}
      <Modal
        open={showAddAsset}
        title="Add Asset"
        onClose={() => { setShowAddAsset(false); setNewAssetName(''); setAddAssetError('') }}
      >
        <div style={{ minWidth: 380, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Asset Name <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              className="input"
              placeholder="e.g. Bitcoin, Rolex Submariner"
              value={newAssetName}
              maxLength={50}
              onChange={e => { setNewAssetName(e.target.value); setAddAssetError('') }}
              onKeyDown={e => { if (e.key === 'Enter') handleAddAsset() }}
              autoFocus
            />
            {addAssetError && (
              <div className="form-error" style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{addAssetError}</div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Description <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>(optional)</span></label>
            <input
              className="input"
              placeholder="Optional description"
              value={newAssetDesc}
              onChange={e => setNewAssetDesc(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => { setShowAddAsset(false); setNewAssetName(''); setAddAssetError('') }}>Cancel</Button>
            <Button variant="primary" onClick={handleAddAsset}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
