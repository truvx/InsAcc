import React, { useState, useMemo } from 'react'
import type { PdcCheque, LeaseEntry, TenantEntry } from '../data/propertyTypes'
import { DataTable, type Column } from './design/Table'
import { Badge, Button, SearchIcon, CloseIcon, EmptyState, Modal } from './design/DesignSystem'
import { formatDate } from '../utils'
import { updatePdcStatus, replaceCheque } from '../services/propertyPdcService'
import Toast from './Toast'

interface Props {
  pdcCheques: PdcCheque[]
  setPdcCheques: React.Dispatch<React.SetStateAction<PdcCheque[]>>
  leases: LeaseEntry[]
  tenants: TenantEntry[]
  dateFormat?: string
  currency?: string
}

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  Pending: 'warning',
  Deposited: 'success',
  Cleared: 'success',
  Bounced: 'danger',
  Replaced: 'neutral',
  Cancelled: 'neutral',
}

function PdcKpiCard({ label, value, color, subtitle }: { label: string; value: string; color: string; subtitle?: string }) {
  return (
    <div className="kpi-card" style={{ borderTop: `2px solid ${color}` }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ fontSize: 22 }}>{value}</div>
      {subtitle && <div className="text-xs text-secondary">{subtitle}</div>}
    </div>
  )
}

export default function PropertyPdcManager({
  pdcCheques, setPdcCheques, leases, tenants,
  dateFormat = 'DD/MM/YYYY', currency = 'AED',
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [replaceModalOpen, setReplaceModalOpen] = useState(false)
  const [replaceTarget, setReplaceTarget] = useState<PdcCheque | null>(null)
  const [replaceChequeNumber, setReplaceChequeNumber] = useState('')
  const [replaceDate, setReplaceDate] = useState('')

  const chequeMeta = useMemo(() => {
    const map: Record<string, { tenantName: string }> = {}
    for (const chq of pdcCheques) {
      const lease = leases.find(l => l.id === chq.leaseId)
      const tenant = lease ? tenants.find(t => t.id === lease.tenantId) : undefined
      map[chq.id] = { tenantName: tenant?.name || 'Unknown' }
    }
    return map
  }, [pdcCheques, leases, tenants])

  const kpiData = useMemo(() => {
    const pending = pdcCheques.filter(c => c.status === 'Pending').length
    const deposited = pdcCheques.filter(c => c.status === 'Deposited').length
    const cleared = pdcCheques.filter(c => c.status === 'Cleared').length
    const bounced = pdcCheques.filter(c => c.status === 'Bounced').length
    const securityCheques = leases.filter(l => l.securityChequeNumber?.trim()).length
    const now = new Date()
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const upcoming = pdcCheques.filter(c => {
      if (c.status !== 'Pending') return false
      const d = new Date(c.dueDate)
      return d >= now && d <= thirtyDays
    }).length
    const totalAmount = pdcCheques.reduce((s, c) => s + c.amount, 0)
    return { pending, deposited, cleared, bounced, securityCheques, upcoming, totalAmount }
  }, [pdcCheques, leases])

  const filtered = useMemo(() => {
    let result = [...pdcCheques].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
    if (statusFilter !== 'All') {
      result = result.filter(c => c.status === statusFilter)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c => {
        const meta = chequeMeta[c.id]
        return c.chequeNumber.toLowerCase().includes(q) ||
          (meta?.tenantName || '').toLowerCase().includes(q) ||
          c.leaseId.toLowerCase().includes(q)
      })
    }
    return result
  }, [pdcCheques, statusFilter, searchQuery, chequeMeta])

  const handleStatusChange = (cheque: PdcCheque, newStatus: PdcCheque['status']) => {
    const updated = updatePdcStatus(pdcCheques, cheque.id, newStatus)
    setPdcCheques(updated)
    setToast({ visible: true, message: `Cheque ${cheque.chequeNumber} marked as ${newStatus}`, type: 'success' })
  }

  const handleReplace = () => {
    if (!replaceTarget || !replaceChequeNumber.trim()) return
    const updated = replaceCheque(pdcCheques, replaceTarget.id, replaceChequeNumber.trim(), replaceDate)
    setPdcCheques(updated)
    setReplaceModalOpen(false)
    setReplaceTarget(null)
    setReplaceChequeNumber('')
    setReplaceDate('')
    setToast({ visible: true, message: `Cheque replaced with ${replaceChequeNumber}`, type: 'success' })
  }

  const openReplaceModal = (cheque: PdcCheque) => {
    setReplaceTarget(cheque)
    setReplaceChequeNumber('')
    setReplaceDate('')
    setReplaceModalOpen(true)
  }

  const columns: Column<PdcCheque>[] = useMemo(() => [
    {
      key: 'chequeNumber',
      header: 'Cheque No.',
      width: '120px',
      sortable: true,
      render: row => <span className="text-mono text-xs fw-600">{row.chequeNumber}</span>,
    },
    {
      key: 'tenantName',
      header: 'Tenant',
      sortable: true,
      render: row => <span className="text-sm">{chequeMeta[row.id]?.tenantName || 'Unknown'}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      numeric: true,
      sortable: true,
      render: row => (
        <span className="text-mono text-xs fw-600">{currency} {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: 'chequeDate',
      header: 'Cheque Date',
      width: '110px',
      sortable: true,
      render: row => <span className="text-xs text-secondary">{formatDate(row.chequeDate, dateFormat)}</span>,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      width: '110px',
      sortable: true,
      render: row => <span className="text-xs text-secondary">{formatDate(row.dueDate, dateFormat)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      sortable: true,
      render: row => <Badge variant={STATUS_COLORS[row.status] || 'neutral'}>{row.status}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '200px',
      render: row => {
        if (row.status === 'Cancelled' || row.status === 'Cleared' || row.status === 'Replaced') return null
        return (
          <div style={{ display: 'flex', gap: 4 }}>
            {row.status === 'Pending' && (
              <Button variant="secondary" size="sm" onClick={() => handleStatusChange(row, 'Deposited')}>Deposit</Button>
            )}
            {row.status === 'Deposited' && (
              <>
                <Button variant="secondary" size="sm" onClick={() => handleStatusChange(row, 'Cleared')}>Clear</Button>
                <Button variant="secondary" size="sm" onClick={() => handleStatusChange(row, 'Bounced')}>Bounce</Button>
              </>
            )}
            {(row.status === 'Pending' || row.status === 'Deposited' || row.status === 'Bounced') && (
              <Button variant="secondary" size="sm" onClick={() => openReplaceModal(row)}>Replace</Button>
            )}
          </div>
        )
      },
    },
  ], [currency, dateFormat, pdcCheques, chequeMeta])

  const statusOptions = ['All', 'Pending', 'Deposited', 'Cleared', 'Bounced', 'Replaced', 'Cancelled']

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">PDC Manager</div>
            <div className="page-subtitle">{pdcCheques.length} cheques &middot; {currency} {kpiData.totalAmount.toLocaleString()} total value</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid">
          <div className="hover-lift" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('Pending')}>
            <PdcKpiCard label="Pending" value={String(kpiData.pending)} color="var(--warning)" subtitle="Awaiting deposit" />
          </div>
          <div className="hover-lift" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('Deposited')}>
            <PdcKpiCard label="Deposited" value={String(kpiData.deposited)} color="var(--primary)" subtitle="In bank collection" />
          </div>
          <div className="hover-lift" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('Cleared')}>
            <PdcKpiCard label="Cleared" value={String(kpiData.cleared)} color="var(--success)" subtitle="Successfully cleared" />
          </div>
          <div className="hover-lift" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('Bounced')}>
            <PdcKpiCard label="Bounced" value={String(kpiData.bounced)} color="var(--danger)" subtitle="Payment failed" />
          </div>
          <div className="hover-lift" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('Pending')}>
            <PdcKpiCard label="Upcoming (30d)" value={String(kpiData.upcoming)} color="var(--accent)" subtitle="Due within 30 days" />
          </div>
          <PdcKpiCard label="Security Cheques" value={String(kpiData.securityCheques)} color="var(--primary-text)" subtitle="Held as security" />
        </div>

        <div className="data-table-toolbar">
          <div className="data-table-filters">
            <div className="filter-bar">
              {statusOptions.map(s => (
                <button
                  key={s}
                  className={`filter-btn${statusFilter === s ? ' active' : ''}`}
                  onClick={() => setStatusFilter(s)}
                  style={{ cursor: 'pointer', fontSize: 12 }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="data-table-search" style={{ minWidth: 260 }}>
            <SearchIcon />
            <input
              type="text"
              className="data-table-search-input"
              placeholder="Search cheques..."
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

        <div className="card card-table">
          <div className="card-body">
            <DataTable
              columns={columns}
              data={filtered}
              keyExtractor={row => row.id}
              pageSize={25}
              emptyState={
                <EmptyState
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>}
                  title={statusFilter !== 'All' ? `No ${statusFilter.toLowerCase()} cheques` : 'No PDC cheques'}
                  text="PDC cheques are generated from lease agreements."
                />
              }
            />
          </div>
        </div>
      </div>

      <Modal open={replaceModalOpen} title="Replace Cheque" onClose={() => setReplaceModalOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 380 }}>
          {replaceTarget && (
            <div>
              <div className="text-sm text-secondary mb-1">Original Cheque</div>
              <div className="text-sm fw-600">{replaceTarget.chequeNumber}</div>
            </div>
          )}
          <div>
            <label className="text-sm text-secondary mb-1">New Cheque Number *</label>
            <input
              type="text"
              placeholder="Enter new cheque number"
              value={replaceChequeNumber}
              onChange={e => setReplaceChequeNumber(e.target.value)}
              style={{ width: '100%', borderRadius: 6, border: '1px solid var(--border)', padding: '8px 12px', fontSize: 13 }}
            />
          </div>
          <div>
            <label className="text-sm text-secondary mb-1">New Cheque Date (optional)</label>
            <input
              type="date"
              value={replaceDate}
              onChange={e => setReplaceDate(e.target.value)}
              style={{ width: '100%', borderRadius: 6, border: '1px solid var(--border)', padding: '8px 12px', fontSize: 13 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="secondary" onClick={() => setReplaceModalOpen(false)}>Cancel</Button>
            <Button onClick={handleReplace}>Replace Cheque</Button>
          </div>
        </div>
      </Modal>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast({ ...toast, visible: false })} />
    </>
  )
}
