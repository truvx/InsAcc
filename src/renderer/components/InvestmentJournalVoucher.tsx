import React, { useState, useMemo } from 'react'
import type { Account, Voucher, PostingResult } from '../accounting/types'
import { Button, Input, Select, Badge, EmptyState, SearchIcon, CloseIcon, KpiCard, Modal } from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
import EntityForm from './design/EntityForm'
import Toast from './Toast'
import { formatDate } from '../utils'
import type { AccountingEngine } from '../accounting/accountingEngine'
import VoucherTimeline from './VoucherTimeline'

interface Props {
  currency?: string
  dateFormat?: string
  accounts: Account[]
  vouchers: Voucher[]
  setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>
  accountingEngine: AccountingEngine
}

export default function InvestmentJournalVoucher({
  currency = 'AED', dateFormat = 'DD/MM/YYYY',
  accounts, vouchers, setVouchers, accountingEngine,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formDescription, setFormDescription] = useState('')
  const [formDebitAccount, setFormDebitAccount] = useState('')
  const [formCreditAccount, setFormCreditAccount] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formReference, setFormReference] = useState('')
  const [detailVoucher, setDetailVoucher] = useState<Voucher | null>(null)

  const journalVouchers = useMemo(() =>
    vouchers.filter(v => v.type === 'Journal').sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
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
  }

  const handleCreateVoucher = () => {
    const amt = Number(formAmount)
    if (!formAmount || amt <= 0) {
      setToast({ visible: true, message: 'Amount must be greater than zero', type: 'error' })
      return
    }
    if (!formDebitAccount || !formCreditAccount) {
      setToast({ visible: true, message: 'Please select both debit and credit accounts', type: 'error' })
      return
    }
    if (formDebitAccount === formCreditAccount) {
      setToast({ visible: true, message: 'Debit and credit accounts must be different', type: 'error' })
      return
    }
    if (!formDescription) {
      setToast({ visible: true, message: 'Description is required', type: 'error' })
      return
    }

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
        referenceType: 'Investment',
        referenceId: formReference || undefined,
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
    setToast({ visible: true, message: `Journal voucher ${postResult.voucher.number} created and posted`, type: 'success' })
    resetForm()
  }

  const getStatusBadge = (status: string) => {
    const v = status === 'Posted' ? 'success' : status === 'Approved' ? 'primary' : status === 'Cancelled' ? 'danger' : 'warning'
    return <Badge variant={v as any}>{status}</Badge>
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
      render: v => getStatusBadge(v.status),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: v => <span className="text-secondary text-xs">{formatDate(v.createdAt.split('T')[0], dateFormat)}</span>,
    },
  ], [dateFormat])

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

      <EntityForm
        open={showForm}
        title="New Journal Voucher"
        submitLabel="Create & Post"
        onCancel={() => { setShowForm(false); resetForm() }}
        onSubmit={handleCreateVoucher}
      >
        <div className="form-row">
          <Input label="Date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
          <Input label={`Amount (${currency})`} type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0" />
        </div>
        <div className="form-row">
          <Input label="Description" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="e.g. Opening balance" />
          <Input label="Reference (optional)" value={formReference} onChange={e => setFormReference(e.target.value)} placeholder="e.g. Ref #" />
        </div>
        <div className="form-row">
          <Select label="Debit Account" value={formDebitAccount} onChange={e => setFormDebitAccount(e.target.value)} options={accountOptions} />
          <Select label="Credit Account" value={formCreditAccount} onChange={e => setFormCreditAccount(e.target.value)} options={accountOptions} />
        </div>
      </EntityForm>

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
          </div>
        )}
      </Modal>

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Journal Vouchers</div>
            <div className="page-subtitle">Adjusting entries and transfers between accounts</div>
          </div>
        </div>
        <div className="page-header-right">
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
          <div className="data-table-search" style={{ minWidth: 260 }}>
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
