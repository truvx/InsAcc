import React, { useState, useMemo } from 'react'
import type { Account, Voucher, PostingResult } from '../accounting/types'
import { Button, Input, Select, EmptyState, SearchIcon, CloseIcon, KpiCard, ChevronDownIcon } from './design/DesignSystem'
import { exportTableData } from '../services/reportExportService'
import { formatCurrency } from '../utils/currencyHelpers'
import { DataTable, type Column } from './design/Table'
import EntityForm from './design/EntityForm'
import Toast from './Toast'
import { formatDate, formatModifiedDateTime } from '../utils'
import type { AccountingEngine } from '../accounting/accountingEngine'
import { useVoucherLifecycle, autoPostVoucher } from '../hooks/useVoucherLifecycle'
import { invalidateBalanceCache } from '../accounting/ledgerService'
import VoucherStatusBadge from './design/VoucherStatusBadge'
import VoucherDetailsModal from './design/VoucherDetailsModal'
import ActionsMenu from './design/ActionsMenu'
import AuditTrailModal from './design/AuditTrailModal'
import { printVoucher } from '../utils/printVoucherHelper'
import { exportVoucherToPDF } from '../utils/pdfVoucherHelper'
import type { AuditEvent } from '../data/auditTypes'

interface Props {
  currency?: string
  dateFormat?: string
  language?: string
  accounts: Account[]
  vouchers: Voucher[]
  setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>
  accountingEngine: AccountingEngine
  onAuditEvent?: (event: AuditEvent) => void
  auditEvents?: AuditEvent[]
  setPropTransactions?: React.Dispatch<React.SetStateAction<any[]>>
  setPropExpenses?: React.Dispatch<React.SetStateAction<any[]>>
}

export default function PropertyJournalVoucher({
  currency = 'AED', dateFormat = 'DD/MM/YYYY',
  accounts, vouchers, setVouchers, accountingEngine,
  onAuditEvent,
  auditEvents = [],
  setPropTransactions,
  setPropExpenses,
}: Props) {
  const {
    detailVoucher, setDetailVoucher,
    toast, showToast, hideToast, loading,
    handlePost, handleApprove, handleCancel, handleDiscard, handleReverse
  } = useVoucherLifecycle(accountingEngine, accounts, setVouchers)

  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formDescription, setFormDescription] = useState('')
  const [formDebitAccount, setFormDebitAccount] = useState('')
  const [formCreditAccount, setFormCreditAccount] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formReference, setFormReference] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [auditVoucher, setAuditVoucher] = useState<Voucher | null>(null)

  const journalVouchers = useMemo(() =>
    vouchers.filter(v => v.type === 'Journal' && !v.isDeleted).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [vouchers]
  )

  const filtered = useMemo(() => {
    if (!searchQuery) return journalVouchers
    const q = searchQuery.toLowerCase()
    return journalVouchers.filter(v =>
      v.number.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q)
    )
  }, [journalVouchers, searchQuery])

  const leafAccounts = useMemo(() =>
    accounts.filter(a => a.isActive && !accounts.some(c => c.parentId === a.id && c.isActive))
      .sort((a, b) => a.code.localeCompare(b.code)),
    [accounts]
  )

  const accountOptions = useMemo(() => [
    { value: '', label: 'Select account' },
    ...leafAccounts.map(a => ({
      value: a.id,
      label: `${a.code} — ${a.name} (${a.type})`,
    })),
  ], [leafAccounts])

  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0])
    setFormDescription('')
    setFormDebitAccount('')
    setFormCreditAccount('')
    setFormAmount('')
    setFormReference('')
    setEditingId(null)
  }

  const openEditForm = (v: Voucher) => {
    const debitLine = v.lines.find(l => l.type === 'Debit')
    const creditLine = v.lines.find(l => l.type === 'Credit')

    setFormDate(v.date)
    setFormAmount(String(debitLine?.amount || 0))
    setFormDescription(v.description)
    setFormDebitAccount(debitLine?.accountId || '')
    setFormCreditAccount(creditLine?.accountId || '')
    setFormReference(v.reference)
    setEditingId(v.id)
    setShowForm(true)
  }

  const handleDuplicate = (v: Voucher) => {
    openEditForm(v)
    setEditingId(null)
    setFormDate(new Date().toISOString().split('T')[0])
    setFormDescription(`Copy of ${v.description}`)
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
    if (window.confirm(`Are you sure you want to delete journal voucher ${v.number}?`)) {
      const updatedVoucher = { ...v, isDeleted: true }
      setVouchers(prev => prev.map(item => item.id === v.id ? updatedVoucher : item))
      
      // Delete connected transaction if it exists
      if (v.id.startsWith('vch-exp-') && setPropExpenses) {
        const expId = v.id.replace('vch-exp-', '')
        setPropExpenses(prev => prev.filter(e => e.id !== expId))
      } else if (v.id.startsWith('vch-') && setPropTransactions) {
        const txnId = v.id.replace('vch-', '')
        setPropTransactions(prev => prev.filter(t => t.id !== txnId))
      }
      
      invalidateBalanceCache()
      showToast(`Voucher ${v.number} deleted successfully`, 'success')

      onAuditEvent?.({
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        module: 'Accounting' as const,
        action: 'Delete' as const,
        entityName: 'Voucher',
        entityId: v.id,
        description: `Soft deleted journal voucher ${v.number}`,
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
    if (!formDebitAccount || !formCreditAccount) {
      showToast('Please select both debit and credit accounts', 'error')
      return
    }
    if (formDebitAccount === formCreditAccount) {
      showToast('Debit and credit accounts must be different', 'error')
      return
    }
    if (!formDescription) {
      showToast('Description is required', 'error')
      return
    }

    if (editingId) {
      const oldVoucher = vouchers.find(v => v.id === editingId)
      if (!oldVoucher) return

      const updatedVoucher: Voucher = {
        ...oldVoucher,
        date: formDate,
        description: formDescription,
        reference: formReference || '',
        modifiedAt: new Date().toISOString(),
        modifiedBy: 'user',
        lines: oldVoucher.lines.map(line => {
          if (line.type === 'Debit') {
            return {
              ...line,
              accountId: formDebitAccount,
              amount: amt,
              baseAmount: amt,
              narration: formDescription,
            }
          } else {
            return {
              ...line,
              accountId: formCreditAccount,
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
        description: `Edited journal voucher ${oldVoucher.number}`,
        user: 'user',
        icon: 'edit',
        severity: 'Info' as const,
        before: oldVoucher as any,
        after: updatedVoucher as any,
      })

      setShowForm(false)
      showToast(`Journal voucher ${oldVoucher.number} updated`, 'success')
      resetForm()
    } else {
      const result: PostingResult = accountingEngine.processAccountingEvent(
        'OPENING_BALANCE',
        {
          amount: amt,
          date: formDate,
          description: formDescription,
          currency,
          exchangeRate: 1,
          baseCurrency: 'AED',
          debitAccount: formDebitAccount,
          creditAccount: formCreditAccount,
          referenceType: 'Property',
          referenceId: formReference || undefined,
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

      const newVch: Voucher = { ...postResult.voucher }

      setVouchers(prev => [newVch, ...prev])
      setShowForm(false)
      showToast(`Journal voucher ${newVch.number} created and posted`, 'success')
      resetForm()
    }
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
      key: 'description',
      header: 'Description',
      sortable: true,
      render: v => <span className="fw-500">{v.description}</span>,
    },
    {
      key: 'reference',
      header: 'Reference',
      render: v => <span className="text-secondary text-xs">{v.reference || '—'}</span>,
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
  ], [dateFormat, accounts, currency])

  const [showExportMenu, setShowExportMenu] = useState(false)

  const handleExport = (format: 'pdf' | 'csv' | 'xlsx') => {
    exportTableData({
      format,
      title: 'Journal Vouchers',
      subtitle: `Total Journals: ${filtered.length}`,
      filename: `Journal_Vouchers_${new Date().toISOString().split('T')[0]}`,
      columns: ['Voucher #', 'Date', 'Description', 'Reference', 'Total Amount', 'Status'],
      rows: filtered.map(v => {
        const totalAmount = v.lines.reduce((s: number, l: any) => s + (l.type === 'Debit' ? (l.baseAmount ?? l.amount) : 0), 0)

        return [
          v.number,
          formatDate(v.date, dateFormat),
          v.description || '-',
          v.reference || '-',
          totalAmount ? formatCurrency(totalAmount, currency) : '-',
          v.status || 'Draft'
        ]
      }),
      currency
    })

    onAuditEvent?.(
      recordModuleEvent(
        'Journal Vouchers',
        'Export',
        'Export Vouchers',
        'System',
        `Exported ${filtered.length} journal vouchers to ${format.toUpperCase()}`
      )
    )

    setToast?.({ visible: true, message: 'Export completed successfully.', type: 'success' })
    setShowExportMenu(false)
  }

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      <EntityForm
        open={showForm}
        title={editingId ? "Edit Journal Voucher" : "New Journal Voucher"}
        submitLabel={editingId ? "Save Changes" : "Create"}
        onCancel={() => { setShowForm(false); resetForm() }}
        onSubmit={handleCreateVoucher}
      >
        <div className="form-row">
          <Input label="Date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
          <Input label={`Amount (${currency})`} type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0" />
        </div>
        <div className="form-row">
          <Input label="Description" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="e.g. PDC adjustment" />
          <Input label="Reference (optional)" value={formReference} onChange={e => setFormReference(e.target.value)} placeholder="e.g. Ref #" />
        </div>
        <div className="form-row">
          <Select label="Debit Account" value={formDebitAccount} onChange={e => setFormDebitAccount(e.target.value)} options={accountOptions} />
          <Select label="Credit Account" value={formCreditAccount} onChange={e => setFormCreditAccount(e.target.value)} options={accountOptions} />
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
            <div className="page-title">Journal Vouchers</div>
            <div className="page-subtitle">Adjusting entries and transfers between accounts</div>
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
          <Button variant="primary" size="sm" onClick={() => { setShowForm(true); resetForm() }}>+ New Journal</Button>
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid">
          <KpiCard label="Total Journals (Posted)" value={String(filtered.filter(v => v.status === 'Posted').length)} accentColor="var(--accent)" />
          <KpiCard label="This Period" value={String(filtered.length)} accentColor="var(--primary)" />
        </div>

        <div className="data-table-toolbar">
          <div className="data-table-filters" />
          <div className="data-table-search">
            <SearchIcon />
            <input
              type="text"
              className="data-table-search-input"
              placeholder="Search journals..."
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
              title="No journal vouchers"
              text="Create a journal voucher for adjusting entries or transfers."
            />
          }
        />
      </div>
    </>
  )
}
