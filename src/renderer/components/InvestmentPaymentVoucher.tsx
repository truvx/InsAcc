import React, { useState, useMemo, useEffect } from 'react'
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
import { getChildren } from '../accounting/chartOfAccountsService'
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

const ASSET_ACCOUNTS = [
  { code: '1210', name: 'Gold' },
  { code: '1220', name: 'Silver' },
  { code: '1230', name: 'Sukuk' },
  { code: '1240', name: 'Bonds' },
  { code: '1250', name: 'Mutual Funds' },
  { code: '1260', name: 'Stocks' },
  { code: '1265', name: 'Shares' },
]

const EXPENSE_ACCOUNTS = [
  { code: '5130', name: 'Brokerage Fees' },
  { code: '5140', name: 'Transfer Fees' },
  { code: '5150', name: 'Bank Charges' },
  { code: '5160', name: 'Fund Management Charges' },
  { code: '5180', name: 'Other Expenses' },
  { code: '5210', name: 'Purchase Input VAT Expense' },
  { code: '5220', name: 'Transportation' },
  { code: '5230', name: 'Insurance' },
  { code: '5240', name: 'Documentation' },
]

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
}

export default function InvestmentPaymentVoucher({
  currency = 'AED', dateFormat = 'DD/MM/YYYY',
  accounts, vouchers, setVouchers,
  bankAccounts, bankMappings, accountingEngine,
  purchaseRecords = [],
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
    vendors,
    customers,
    purchaseRecords,
  }), [vendors, customers, purchaseRecords])

  const paymentParties = useMemo(() => lookupService.getPaymentParties('investment'), [lookupService])

  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formAmount, setFormAmount] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const defaultBank = useMemo(() => getDefaultInvestmentBankAccount(bankAccounts), [bankAccounts])
  const [formBankAccount, setFormBankAccount] = useState(defaultBank ? defaultBank.id : '')
  const [formPaymentType, setFormPaymentType] = useState<'asset' | 'expense'>('asset')
  const [formAssetAccount, setFormAssetAccount] = useState('')
  const [formHoldingAccount, setFormHoldingAccount] = useState('')
  const [formExpenseAccount, setFormExpenseAccount] = useState('')
  const [formReference, setFormReference] = useState('')
  const [formPaidTo, setFormPaidTo] = useState('')

  const [formPaymentMode, setFormPaymentMode] = useState<string>('Bank Transfer')
  const [formPaymentReference, setFormPaymentReference] = useState('')

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)

  const handlePaymentModeChange = (mode: string) => {
    setFormPaymentMode(mode)
  }

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [auditVoucher, setAuditVoucher] = useState<Voucher | null>(null)

  const paymentVouchers = useMemo(() =>
    vouchers.filter(v => v.type === 'Payment' && !v.isDeleted).map(v => ({
      ...v,
      tags: mergeTags(v.tags, v.id, v.reference, purchaseRecords)
    })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [vouchers, purchaseRecords]
  )

  const filtered = useMemo(() => {
    let result = paymentVouchers
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
    if (tagFilter) {
      const q = tagFilter.toLowerCase()
      result = result.filter(v => {
        const refs = v.lines.filter(l => l.referenceType === 'Purchase' || l.referenceType === 'Investment')
        for (const ref of refs) {
          if (ref.referenceId) {
            const p = purchaseRecords.find(pr => pr.id === ref.referenceId)
            if (p && p.tags && p.tags.some(t => t.toLowerCase().includes(q))) return true
          }
        }
        return false
      })
    }
    return result
  }, [paymentVouchers, searchQuery, tagFilter, dateFrom, dateTo])

  const handleExport = (format: 'pdf' | 'csv' | 'xlsx') => {
    try {
      const columns = ['Voucher #', 'Date', 'Paid To', 'Asset/Expense', 'Description', 'Amount', 'Payment Mode', 'Status']
      const rows = filtered.map(v => {
        const totalAmount = v.lines.reduce((sum, l) => l.type === 'Debit' ? sum + l.amount : sum, 0)
        return [
          v.number,
          formatDate(v.date, dateFormat),
          getPaidTo(v),
          accounts.find(a => a.id === v.lines[0]?.accountId)?.name || '—',
          v.description,
          `${currency} ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          v.paymentMode || '—',
          v.status
        ]
      })
      
      exportTableData({
      moduleName: 'Investment Portfolio',
        title: 'Investment Payment Vouchers',
        subtitle: `Report generated on ${new Date().toLocaleDateString()}${dateFrom || dateTo ? ` | Period: ${dateFrom || 'Start'} to ${dateTo || 'End'}` : ''}`,
        columns,
        rows,
        format,
        filename: `Investment_Payment_Vouchers_${new Date().toISOString().split('T')[0]}`
      })

      onAuditEvent?.(
        recordModuleEvent(
          'Investments',
          'Export',
          'Payment Vouchers',
          'export',
          `Exported ${filtered.length} payment vouchers to ${format.toUpperCase()}`
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

  const assetOptions = useMemo(() => {
    const found = ASSET_ACCOUNTS.map(ea => {
      const acct = accounts.find(a => a.code === ea.code)
      return acct ? { value: acct.id, label: ea.name } : null
    }).filter((x): x is { value: string; label: string } => x !== null)
    return [{ value: '', label: 'Select asset type' }, ...found]
  }, [accounts])

  const coaOptions = useMemo(() => {
    return [
      { value: '', label: 'Select account to debit' },
      ...accounts
        .filter(a => a.isActive)
        .map(a => ({ value: a.id, label: `${a.code} — ${a.name} (${a.type.toUpperCase()})` }))
    ]
  }, [accounts])

  const selectedAssetParent = useMemo(() => {
    if (!formAssetAccount) return null
    return accounts.find(a => a.id === formAssetAccount) || null
  }, [accounts, formAssetAccount])

  const holdingOptions = useMemo(() => {
    if (!selectedAssetParent) return []
    const children = getChildren(selectedAssetParent.id, accounts)
    const leaves = children.filter(
      c => !accounts.some(a => a.parentId === c.id && a.isActive)
    )
    return leaves.map(a => ({ value: a.id, label: a.name }))
  }, [selectedAssetParent, accounts])

  // Auto-select holding when exactly one leaf exists
  useEffect(() => {
    if (holdingOptions.length === 1 && !formHoldingAccount) {
      setFormHoldingAccount(holdingOptions[0].value)
    }
  }, [holdingOptions, formHoldingAccount])

  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0])
    setFormAmount('')
    setFormDescription('')
    setFormBankAccount(defaultBank ? defaultBank.id : '')
    setFormAssetAccount('')
    setFormHoldingAccount('')
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
    setFormReference(v.reference)

    const paidToMatch = v.description.match(/\(paid to\s+(.*)\)$/i)
    setFormPaidTo(paidToMatch ? paidToMatch[1] : v.reference || '')

    // Check whether the debit account or its parent is an asset account
    const debitAcct = debitLine ? accounts.find(a => a.id === debitLine.accountId) : null
    const isAsset = debitAcct && ASSET_ACCOUNTS.some(aa => {
      if (debitAcct.code === aa.code) return true
      const parentAcct = debitAcct.parentId ? accounts.find(a => a.id === debitAcct.parentId) : null
      return parentAcct?.code === aa.code
    })

    if (isAsset && debitAcct) {
      setFormPaymentType('asset')
      setFormExpenseAccount('')
      if (debitAcct.parentId) {
        // Leaf account under a parent — set parent as asset type, leaf as holding
        const parentAccount = accounts.find(a => a.id === debitAcct.parentId)
        setFormAssetAccount(parentAccount?.id || debitAcct.parentId)
        setFormHoldingAccount(debitAcct.id)
      } else {
        // Direct parent account (legacy voucher) — no holding
        setFormAssetAccount(debitAcct.id)
        setFormHoldingAccount('')
      }
    } else {
      setFormPaymentType('expense')
      setFormExpenseAccount(debitLine?.accountId || '')
      setFormAssetAccount('')
      setFormHoldingAccount('')
    }

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
    if (formPaymentType === 'asset' && !formAssetAccount) {
      showToast('Please select an asset type', 'error')
      return
    }
    if (formPaymentType === 'asset' && holdingOptions.length > 0 && !formHoldingAccount) {
      showToast('Please select a specific asset holding', 'error')
      return
    }
    if (formPaymentType === 'expense' && !formExpenseAccount) {
      showToast('Please select an expense type', 'error')
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

    const ref = formPaidTo || formReference || undefined
    const desc = formDescription + (formPaidTo ? ` (paid to ${formPaidTo})` : '')
    const resolvedAssetAccount = formHoldingAccount || formAssetAccount
    const targetDebitAccount = formPaymentType === 'asset' ? resolvedAssetAccount : formExpenseAccount

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
              accountId: targetDebitAccount,
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
      const event = formPaymentType === 'asset' ? 'ASSET_PURCHASE' : 'EXPENSE_PAID'
      const result: PostingResult = accountingEngine.processAccountingEvent(
        event,
        {
          amount: amt,
          date: formDate,
          description: desc,
          currency,
          exchangeRate: 1,
          baseCurrency: 'AED',
          bankAccount: bankAccountId,
          assetAccount: formPaymentType === 'asset' ? resolvedAssetAccount : undefined,
          debitAccount: formPaymentType === 'expense' ? formExpenseAccount : undefined,
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

  const getDebitName = (v: Voucher) => {
    const debitLine = v.lines.find(l => l.type === 'Debit')
    if (!debitLine) return '—'
    const acct = accounts.find(a => a.id === debitLine.accountId)
    return acct?.name || '—'
  }

  const getPaidTo = (v: Voucher) => {
    const purchase = purchaseRecords.find(p => p.voucherId === v.id)
    if (purchase && purchase.buyer) {
      return purchase.buyer
    }
    
    let match = v.description.match(/\(paid to\s+(.*?)\)$/i)
    if (!match && v.description.includes('Expense:')) {
      match = v.description.match(/for\s+(.*)$/i)
    }
    return match ? match[1] : '—'
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
      render: v => {
        const val = getPaidTo(v)
        return <span className="fw-500 text-sm">{val}</span>
      }
    },
    {
      key: 'debitAccount',
      header: 'For',
      render: v => <Badge variant="neutral">{getDebitName(v)}</Badge>,
    },
    {
      key: 'description',
      header: 'Description',
      render: v => <span className="text-sm" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{v.description}</span>,
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
            placeholder="Supplier name"
            customLabel="Use custom payee / supplier"
          />
          <Input label="Description" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="e.g. Asset purchase" />
        </div>
        <div className="form-row">
          <Select label="Payment Type" value={formPaymentType} onChange={e => setFormPaymentType(e.target.value as any)}
            options={[{ value: 'asset', label: 'Asset Purchase' }, { value: 'expense', label: 'Expense Payment' }]}
          />
          {formPaymentType === 'asset' ? (
            <>
              <Select label="Asset Category" value={formAssetAccount} onChange={e => { setFormAssetAccount(e.target.value); setFormHoldingAccount('') }} options={assetOptions} />
              {formAssetAccount && holdingOptions.length > 0 && (
                <Select label="Asset Holding" value={formHoldingAccount} onChange={e => setFormHoldingAccount(e.target.value)}
                  options={[{ value: '', label: 'Select holding' }, ...holdingOptions]} />
              )}
            </>
          ) : (
            <Select label="Account to Debit" value={formExpenseAccount} onChange={e => setFormExpenseAccount(e.target.value)} options={coaOptions} />
          )}
        </div>
        <div className="form-row">
          <Input 
            label="Reference (optional)" 
            value={formReference} 
            onChange={e => setFormReference(e.target.value)} 
            placeholder="e.g. Ref #" 
          />
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
            <div className="page-subtitle">Record asset purchases, brokerage fees, and investment charges</div>
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
          <div className="data-table-filters" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div className="data-table-search" style={{ maxWidth: 'none', width: 'auto', flex: '0 0 auto', padding: '0 12px' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 8 }}>From</span>
              <input type="date" className="data-table-search-input" style={{ width: 110 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="data-table-search" style={{ maxWidth: 'none', width: 'auto', flex: '0 0 auto', padding: '0 12px' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 8 }}>To</span>
              <input type="date" className="data-table-search-input" style={{ width: 110 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="data-table-search" style={{ maxWidth: 'none', width: 'auto', flex: '0 0 auto' }}>
              <input type="text" className="data-table-search-input" style={{ width: 140 }} placeholder="Filter by tag..." value={tagFilter} onChange={e => setTagFilter(e.target.value)} />
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
              title="No payment vouchers"
              text="Create a payment voucher to record asset purchases or expenses."
            />
          }
        />
      </div>
    </>
  )
}
