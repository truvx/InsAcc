import React, { useState, useMemo } from 'react'
import type { PdcCheque, LeaseEntry, TenantEntry, PropAccount } from '../data/propertyTypes'
import { DataTable, type Column } from './design/Table'
import { Badge, Button, SearchIcon, CloseIcon, EmptyState, Modal } from './design/DesignSystem'
import { formatDate } from '../utils'
import { transitionPdcCheque, replaceCheque } from '../services/propertyPdcService'
import Toast from './Toast'
import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { AccountingEngine } from '../accounting/accountingEngine'
import { getPropertyBankAccountId } from '../services/propertyAccountingService'

interface Props {
  pdcCheques: PdcCheque[]
  setPdcCheques: React.Dispatch<React.SetStateAction<PdcCheque[]>>
  leases: LeaseEntry[]
  tenants: TenantEntry[]
  dateFormat?: string
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
  setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>
  accountingEngine: AccountingEngine
  propAccounts: PropAccount[]
  bankMappings: BankMapping[]
}

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  Pending: 'warning',
  Deposited: 'neutral',
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
  accounts, vouchers, setVouchers, accountingEngine, propAccounts, bankMappings
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState<'All' | 'Today' | 'ThisWeek' | 'ThisMonth' | 'Overdue'>('All')
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [replaceModalOpen, setReplaceModalOpen] = useState(false)
  const [replaceTarget, setReplaceTarget] = useState<PdcCheque | null>(null)
  const [replaceChequeNumber, setReplaceChequeNumber] = useState('')
  const [replaceDate, setReplaceDate] = useState('')

  // Transition & Wizard Modals state
  const [activePdc, setActivePdc] = useState<PdcCheque | null>(null)
  const [activeAction, setActiveAction] = useState<'Deposit' | 'Clear' | 'Bounce' | 'Cancel' | 'Re-deposit' | 'Audit' | null>(null)
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('')
  const [bounceReason, setBounceReason] = useState('')
  const [bounceDate, setBounceDate] = useState(new Date().toISOString().split('T')[0])
  const [bounceFee, setBounceFee] = useState('')
  const [penaltyAmount, setPenaltyAmount] = useState('')
  const [clearDate, setClearDate] = useState(new Date().toISOString().split('T')[0])
  const [cancelReason, setCancelReason] = useState('')

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

    const todayStr = new Date().toISOString().split('T')[0]
    const today = new Date(todayStr)

    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    if (dateFilter === 'Today') {
      result = result.filter(c => c.dueDate === todayStr)
    } else if (dateFilter === 'ThisWeek') {
      result = result.filter(c => {
        const d = new Date(c.dueDate)
        return d >= startOfWeek && d <= endOfWeek
      })
    } else if (dateFilter === 'ThisMonth') {
      result = result.filter(c => {
        const d = new Date(c.dueDate)
        return d >= startOfMonth && d <= endOfMonth
      })
    } else if (dateFilter === 'Overdue') {
      result = result.filter(c => c.status === 'Pending' && new Date(c.dueDate) < new Date(todayStr))
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
  }, [pdcCheques, statusFilter, dateFilter, searchQuery, chequeMeta])

  const openActionModal = (cheque: PdcCheque, action: 'Deposit' | 'Clear' | 'Bounce' | 'Cancel' | 'Re-deposit' | 'Audit') => {
    setActivePdc(cheque)
    setActiveAction(action)
    setSelectedBankAccountId(cheque.bankAccountId || (propAccounts[0]?.id || ''))
    setBounceReason(cheque.bounceReason || '')
    setBounceFee(cheque.bounceFee ? String(cheque.bounceFee) : '')
    setPenaltyAmount(cheque.penaltyAmount ? String(cheque.penaltyAmount) : '')
    setCancelReason('')
  }

  const handleDeposit = () => {
    if (!activePdc || !selectedBankAccountId) return
    try {
      const updated = transitionPdcCheque(pdcCheques, activePdc.id, 'Deposited', {
        bankAccountId: selectedBankAccountId,
        user: 'user'
      })
      setPdcCheques(updated)
      setToast({ visible: true, message: `Cheque ${activePdc.chequeNumber} deposited to bank account.`, type: 'success' })
      setActiveAction(null)
      setActivePdc(null)
    } catch (e: any) {
      setToast({ visible: true, message: e.message, type: 'error' })
    }
  }

  const handleClear = () => {
    if (!activePdc) return
    const bankAcctId = activePdc.bankAccountId || selectedBankAccountId
    if (!bankAcctId) {
      setToast({ visible: true, message: 'Please select a bank account.', type: 'error' })
      return
    }

    // mappingId is the Chart-of-Accounts Account ID (e.g. "acc-112001") that the posting
    // rule resolver expects as ctx.bankAccount. bankAcctId is the PropAccount UUID.
    const mappingId = getPropertyBankAccountId(bankAcctId, propAccounts, bankMappings)
    if (!mappingId) {
      setToast({ visible: true, message: 'Bank account mapping not found in Chart of Accounts.', type: 'error' })
      return
    }

    const desc = `Matured Rent PDC cleared: Cheque No. ${activePdc.chequeNumber}`
    const draftResult = accountingEngine.processAccountingEvent(
      'PDC_DEPOSITED',
      {
        amount: activePdc.amount,
        date: clearDate,
        description: desc,
        currency: currency,
        exchangeRate: 1,
        baseCurrency: currency,
        bankAccount: mappingId,
        referenceType: 'Lease',
        referenceId: activePdc.leaseId,
        createdBy: 'user',
      },
      accounts,
      vouchers
    )

    if (!draftResult.success || !draftResult.voucher) {
      setToast({ visible: true, message: draftResult.errors.map(e => e.message).join(', '), type: 'error' })
      return
    }

    const appResult = accountingEngine.approve(draftResult.voucher, 'user')
    if (!appResult.success || !appResult.voucher) {
      setToast({ visible: true, message: appResult.errors.map(e => e.message).join(', '), type: 'error' })
      return
    }

    const postResult = accountingEngine.post(appResult.voucher, 'user', accounts, vouchers)
    if (!postResult.success || !postResult.voucher) {
      setToast({ visible: true, message: postResult.errors.map(e => e.message).join(', '), type: 'error' })
      return
    }

    const postedVoucher = postResult.voucher

    // Transition PDC state first — if this throws, we have not yet mutated voucher state
    try {
      const updated = transitionPdcCheque(pdcCheques, activePdc.id, 'Cleared', {
        bankAccountId: bankAcctId,
        clearedVoucherId: postedVoucher.id,
        timestamp: clearDate,
        user: 'user'
      })
      setPdcCheques(updated)
      setVouchers(prev => [postedVoucher, ...prev])
      setToast({ visible: true, message: `Cheque ${activePdc.chequeNumber} cleared. Voucher ${postedVoucher.number} posted.`, type: 'success' })
      setActiveAction(null)
      setActivePdc(null)
    } catch (e: any) {
      setToast({ visible: true, message: e.message, type: 'error' })
    }
  }

  const handleBounce = () => {
    if (!activePdc) return
    const bankAcctId = activePdc.bankAccountId || selectedBankAccountId
    if (!bankAcctId) {
      setToast({ visible: true, message: 'Please select a bank account.', type: 'error' })
      return
    }

    const mappingId = getPropertyBankAccountId(bankAcctId, propAccounts, bankMappings)
    if (!mappingId) {
      setToast({ visible: true, message: 'Bank account mapping not found in Chart of Accounts.', type: 'error' })
      return
    }

    let bouncedVoucherId: string | null = null
    let feeVoucherId: string | null = null
    let penaltyVoucherId: string | null = null
    let updatedVouchers = [...vouchers]

    if (activePdc.status === 'Cleared' && activePdc.clearedVoucherId) {
      // Reverse the original clearance receipt voucher
      const origVoucher = vouchers.find(v => v.id === activePdc.clearedVoucherId)
      if (origVoucher) {
        const revResult = accountingEngine.reverse(origVoucher, bounceDate, 'user', accounts, vouchers)
        if (!revResult.success || !revResult.voucher) {
          setToast({ visible: true, message: 'Clearance reversal failed: ' + revResult.errors.map(e => e.message).join(', '), type: 'error' })
          return
        }
        bouncedVoucherId = revResult.voucher.id
        updatedVouchers = [revResult.voucher, ...updatedVouchers]
      }
    } else {
      // Deposited → Bounced: post a bounce journal to restore receivable
      const desc = `Bounced Rent PDC: Cheque No. ${activePdc.chequeNumber}`
      const draftResult = accountingEngine.processAccountingEvent(
        'PDC_BOUNCED',
        {
          amount: activePdc.amount,
          date: bounceDate,
          description: desc,
          currency: currency,
          exchangeRate: 1,
          baseCurrency: currency,
          bankAccount: mappingId,
          referenceType: 'Lease',
          referenceId: activePdc.leaseId,
          createdBy: 'user',
        },
        accounts,
        updatedVouchers
      )

      if (!draftResult.success || !draftResult.voucher) {
        setToast({ visible: true, message: 'Bounce journal failed: ' + draftResult.errors.map(e => e.message).join(', '), type: 'error' })
        return
      }
      const appResult = accountingEngine.approve(draftResult.voucher, 'user')
      if (!appResult.success || !appResult.voucher) {
        setToast({ visible: true, message: 'Bounce journal approval failed: ' + appResult.errors.map(e => e.message).join(', '), type: 'error' })
        return
      }
      const postResult = accountingEngine.post(appResult.voucher, 'user', accounts, updatedVouchers)
      if (!postResult.success || !postResult.voucher) {
        setToast({ visible: true, message: 'Bounce journal posting failed: ' + postResult.errors.map(e => e.message).join(', '), type: 'error' })
        return
      }
      bouncedVoucherId = postResult.voucher.id
      updatedVouchers = [postResult.voucher, ...updatedVouchers]
    }

    // Optional: bank bounce fee (expense journal)
    const feeNum = Number(bounceFee) || 0
    if (feeNum > 0) {
      const desc = `Bank bounce fee for Cheque No. ${activePdc.chequeNumber}`
      const draftResult = accountingEngine.processAccountingEvent(
        'PDC_BOUNCE_FEE',
        {
          amount: feeNum,
          date: bounceDate,
          description: desc,
          currency: currency,
          exchangeRate: 1,
          baseCurrency: currency,
          bankAccount: mappingId,
          createdBy: 'user',
        },
        accounts,
        updatedVouchers
      )
      if (!draftResult.success || !draftResult.voucher) {
        setToast({ visible: true, message: `Bank fee journal failed: ${draftResult.errors.map(e => e.message).join(', ')}`, type: 'error' })
      } else {
        const appResult = accountingEngine.approve(draftResult.voucher, 'user')
        if (!appResult.success || !appResult.voucher) {
          setToast({ visible: true, message: `Bank fee approval failed: ${appResult.errors.map(e => e.message).join(', ')}`, type: 'error' })
        } else {
          const postResult = accountingEngine.post(appResult.voucher, 'user', accounts, updatedVouchers)
          if (!postResult.success || !postResult.voucher) {
            setToast({ visible: true, message: `Bank fee posting failed: ${postResult.errors.map(e => e.message).join(', ')}`, type: 'error' })
          } else {
            feeVoucherId = postResult.voucher.id
            updatedVouchers = [postResult.voucher, ...updatedVouchers]
          }
        }
      }
    }

    // Optional: tenant penalty (income journal)
    const penaltyNum = Number(penaltyAmount) || 0
    if (penaltyNum > 0) {
      const desc = `Bounced cheque penalty charged to tenant: Cheque No. ${activePdc.chequeNumber}`
      const draftResult = accountingEngine.processAccountingEvent(
        'PDC_PENALTY',
        {
          amount: penaltyNum,
          date: bounceDate,
          description: desc,
          currency: currency,
          exchangeRate: 1,
          baseCurrency: currency,
          referenceType: 'Lease',
          referenceId: activePdc.leaseId,
          createdBy: 'user',
        },
        accounts,
        updatedVouchers
      )
      if (!draftResult.success || !draftResult.voucher) {
        setToast({ visible: true, message: `Penalty journal failed: ${draftResult.errors.map(e => e.message).join(', ')}`, type: 'error' })
      } else {
        const appResult = accountingEngine.approve(draftResult.voucher, 'user')
        if (!appResult.success || !appResult.voucher) {
          setToast({ visible: true, message: `Penalty approval failed: ${appResult.errors.map(e => e.message).join(', ')}`, type: 'error' })
        } else {
          const postResult = accountingEngine.post(appResult.voucher, 'user', accounts, updatedVouchers)
          if (!postResult.success || !postResult.voucher) {
            setToast({ visible: true, message: `Penalty posting failed: ${postResult.errors.map(e => e.message).join(', ')}`, type: 'error' })
          } else {
            penaltyVoucherId = postResult.voucher.id
            updatedVouchers = [postResult.voucher, ...updatedVouchers]
          }
        }
      }
    }

    // Atomic: transition PDC state FIRST, then commit voucher state.
    // If the transition throws (invalid status), we avoid a split-brain where
    // vouchers are saved but the cheque status is not updated.
    try {
      const updated = transitionPdcCheque(pdcCheques, activePdc.id, 'Bounced', {
        bankAccountId: bankAcctId,
        bounceReason: bounceReason,
        bounceFee: feeNum || undefined,
        penaltyAmount: penaltyNum || undefined,
        bouncedVoucherId,
        feeVoucherId,
        penaltyVoucherId,
        timestamp: bounceDate,
        user: 'user'
      })
      setPdcCheques(updated)
      setVouchers(updatedVouchers)
      setToast({ visible: true, message: `Cheque ${activePdc.chequeNumber} marked as Bounced. Reversals posted.`, type: 'success' })
      setActiveAction(null)
      setActivePdc(null)
    } catch (e: any) {
      setToast({ visible: true, message: e.message, type: 'error' })
    }
  }

  const handleReDeposit = () => {
    if (!activePdc || !selectedBankAccountId) return
    try {
      const updated = transitionPdcCheque(pdcCheques, activePdc.id, 'Deposited', {
        bankAccountId: selectedBankAccountId,
        user: 'user'
      })
      setPdcCheques(updated)
      setToast({ visible: true, message: `Cheque ${activePdc.chequeNumber} re-deposited.`, type: 'success' })
      setActiveAction(null)
      setActivePdc(null)
    } catch (e: any) {
      setToast({ visible: true, message: e.message, type: 'error' })
    }
  }

  const handleCancel = () => {
    if (!activePdc) return
    try {
      const updated = transitionPdcCheque(pdcCheques, activePdc.id, 'Cancelled', {
        bounceReason: cancelReason,
        user: 'user'
      })
      setPdcCheques(updated)
      setToast({ visible: true, message: `Cheque ${activePdc.chequeNumber} cancelled.`, type: 'success' })
      setActiveAction(null)
      setActivePdc(null)
    } catch (e: any) {
      setToast({ visible: true, message: e.message, type: 'error' })
    }
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
      width: '240px',
      render: row => {
        return (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {row.status === 'Pending' && (
              <>
                <Button variant="secondary" size="sm" onClick={() => openActionModal(row, 'Deposit')}>Deposit</Button>
                <Button variant="secondary" size="sm" onClick={() => openActionModal(row, 'Cancel')}>Cancel</Button>
              </>
            )}
            {row.status === 'Deposited' && (
              <>
                <Button variant="secondary" size="sm" onClick={() => openActionModal(row, 'Clear')}>Clear</Button>
                <Button variant="secondary" size="sm" onClick={() => openActionModal(row, 'Bounce')}>Bounce</Button>
                <Button variant="secondary" size="sm" onClick={() => openActionModal(row, 'Cancel')}>Cancel</Button>
              </>
            )}
            {row.status === 'Bounced' && (
              <>
                <Button variant="secondary" size="sm" onClick={() => openActionModal(row, 'Re-deposit')}>Re-deposit</Button>
                <Button variant="secondary" size="sm" onClick={() => openActionModal(row, 'Cancel')}>Cancel</Button>
              </>
            )}
            {row.status === 'Cleared' && (
              <Button variant="secondary" size="sm" onClick={() => openActionModal(row, 'Bounce')}>Bounce</Button>
            )}
            {(row.status === 'Pending' || row.status === 'Deposited' || row.status === 'Bounced') && (
              <Button variant="secondary" size="sm" onClick={() => openReplaceModal(row)}>Replace</Button>
            )}
            {row.auditHistory && row.auditHistory.length > 0 && (
              <Button variant="secondary" size="sm" onClick={() => openActionModal(row, 'Audit')}>History</Button>
            )}
          </div>
        )
      },
    },
  ], [currency, dateFormat, pdcCheques, chequeMeta, propAccounts])

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
            <div className="filter-bar" style={{ marginLeft: 12 }}>
              {['All', 'Today', 'ThisWeek', 'ThisMonth', 'Overdue'].map(d => (
                <button
                  key={d}
                  className={`filter-btn${dateFilter === d ? ' active' : ''}`}
                  onClick={() => setDateFilter(d as any)}
                  style={{ cursor: 'pointer', fontSize: 12 }}
                >
                  {d === 'ThisWeek' ? 'This Week' : d === 'ThisMonth' ? 'This Month' : d}
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

      {/* Deposit Modal */}
      <Modal open={activeAction === 'Deposit'} title="Deposit Cheque" onClose={() => setActiveAction(null)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 380 }}>
          {activePdc && (
            <div>
              <div className="text-sm text-secondary mb-1">Cheque Number</div>
              <div className="text-sm fw-600">{activePdc.chequeNumber} (Amount: {currency} {activePdc.amount.toLocaleString()})</div>
            </div>
          )}
          <div>
            <label className="text-sm text-secondary mb-1">Select Bank Account *</label>
            <select
              value={selectedBankAccountId}
              onChange={e => setSelectedBankAccountId(e.target.value)}
              className="input"
              style={{ width: '100%', borderRadius: 6, border: '1px solid var(--border)', padding: '8px 12px', fontSize: 13 }}
            >
              {propAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.institution} - {acc.accountName} ({acc.currency})
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="secondary" onClick={() => setActiveAction(null)}>Cancel</Button>
            <Button onClick={handleDeposit}>Deposit Cheque</Button>
          </div>
        </div>
      </Modal>

      {/* Clear Modal */}
      <Modal open={activeAction === 'Clear'} title="Clear Cheque" onClose={() => setActiveAction(null)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 380 }}>
          {activePdc && (
            <div>
              <div className="text-sm text-secondary mb-1">Cheque Number</div>
              <div className="text-sm fw-600">{activePdc.chequeNumber} (Amount: {currency} {activePdc.amount.toLocaleString()})</div>
            </div>
          )}
          <div>
            <label className="text-sm text-secondary mb-1">Clearance Date *</label>
            <input
              type="date"
              value={clearDate}
              onChange={e => setClearDate(e.target.value)}
              style={{ width: '100%', borderRadius: 6, border: '1px solid var(--border)', padding: '8px 12px', fontSize: 13 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="secondary" onClick={() => setActiveAction(null)}>Cancel</Button>
            <Button onClick={handleClear}>Clear Cheque</Button>
          </div>
        </div>
      </Modal>

      {/* Bounce Modal */}
      <Modal open={activeAction === 'Bounce'} title="Bounce Cheque" onClose={() => setActiveAction(null)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 380 }}>
          {activePdc && (
            <div>
              <div className="text-sm text-secondary mb-1">Cheque Number</div>
              <div className="text-sm fw-600">{activePdc.chequeNumber} (Amount: {currency} {activePdc.amount.toLocaleString()})</div>
            </div>
          )}
          <div>
            <label className="text-sm text-secondary mb-1">Bounce Date *</label>
            <input
              type="date"
              value={bounceDate}
              onChange={e => setBounceDate(e.target.value)}
              style={{ width: '100%', borderRadius: 6, border: '1px solid var(--border)', padding: '8px 12px', fontSize: 13 }}
            />
          </div>
          <div>
            <label className="text-sm text-secondary mb-1">Reason for Bounce *</label>
            <input
              type="text"
              placeholder="e.g. Insufficient Funds"
              value={bounceReason}
              onChange={e => setBounceReason(e.target.value)}
              style={{ width: '100%', borderRadius: 6, border: '1px solid var(--border)', padding: '8px 12px', fontSize: 13 }}
            />
          </div>
          <div>
            <label className="text-sm text-secondary mb-1">Bank Bounce Fee (Debit Expense, optional)</label>
            <input
              type="number"
              placeholder="0.00"
              value={bounceFee}
              onChange={e => setBounceFee(e.target.value)}
              style={{ width: '100%', borderRadius: 6, border: '1px solid var(--border)', padding: '8px 12px', fontSize: 13 }}
            />
          </div>
          <div>
            <label className="text-sm text-secondary mb-1">Penalty Charged to Tenant (Debit Receivable, optional)</label>
            <input
              type="number"
              placeholder="0.00"
              value={penaltyAmount}
              onChange={e => setPenaltyAmount(e.target.value)}
              style={{ width: '100%', borderRadius: 6, border: '1px solid var(--border)', padding: '8px 12px', fontSize: 13 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="secondary" onClick={() => setActiveAction(null)}>Cancel</Button>
            <Button onClick={handleBounce}>Bounce Cheque</Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Modal */}
      <Modal open={activeAction === 'Cancel'} title="Cancel Cheque" onClose={() => setActiveAction(null)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 380 }}>
          {activePdc && (
            <div>
              <div className="text-sm text-secondary mb-1">Cheque Number</div>
              <div className="text-sm fw-600">{activePdc.chequeNumber} (Amount: {currency} {activePdc.amount.toLocaleString()})</div>
            </div>
          )}
          <div>
            <label className="text-sm text-secondary mb-1">Reason for Cancellation *</label>
            <input
              type="text"
              placeholder="e.g. Lease Terminated Early"
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              style={{ width: '100%', borderRadius: 6, border: '1px solid var(--border)', padding: '8px 12px', fontSize: 13 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="secondary" onClick={() => setActiveAction(null)}>Cancel</Button>
            <Button onClick={handleCancel}>Cancel Cheque</Button>
          </div>
        </div>
      </Modal>

      {/* Re-deposit Modal */}
      <Modal open={activeAction === 'Re-deposit'} title="Re-deposit Cheque" onClose={() => setActiveAction(null)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 380 }}>
          {activePdc && (
            <div>
              <div className="text-sm text-secondary mb-1">Cheque Number</div>
              <div className="text-sm fw-600">{activePdc.chequeNumber} (Amount: {currency} {activePdc.amount.toLocaleString()})</div>
            </div>
          )}
          <div>
            <label className="text-sm text-secondary mb-1">Select Bank Account *</label>
            <select
              value={selectedBankAccountId}
              onChange={e => setSelectedBankAccountId(e.target.value)}
              className="input"
              style={{ width: '100%', borderRadius: 6, border: '1px solid var(--border)', padding: '8px 12px', fontSize: 13 }}
            >
              {propAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.institution} - {acc.accountName} ({acc.currency})
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="secondary" onClick={() => setActiveAction(null)}>Cancel</Button>
            <Button onClick={handleReDeposit}>Re-deposit Cheque</Button>
          </div>
        </div>
      </Modal>

      {/* Audit History Modal */}
      <Modal open={activeAction === 'Audit'} title="Cheque Transition History" onClose={() => setActiveAction(null)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 500 }}>
          {activePdc && (
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                Cheque No: {activePdc.chequeNumber} (Amount: {currency} {activePdc.amount.toLocaleString()})
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #E4EBF4', borderRadius: 6 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E4EBF4', textAlign: 'left' }}>
                      <th style={{ padding: 8 }}>Date</th>
                      <th style={{ padding: 8 }}>Transition</th>
                      <th style={{ padding: 8 }}>User</th>
                      <th style={{ padding: 8 }}>Reason / Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activePdc.auditHistory || []).map((entry, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #E4EBF4' }}>
                        <td style={{ padding: 8 }}>{formatDate(entry.timestamp.split('T')[0], dateFormat)}</td>
                        <td style={{ padding: 8 }}>
                          <span style={{ fontWeight: 500 }}>{entry.previousState}</span> →{' '}
                          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{entry.newState}</span>
                        </td>
                        <td style={{ padding: 8 }}>{entry.user}</td>
                        <td style={{ padding: 8 }}>
                          {entry.reason || '—'}
                          {entry.voucherId && (
                            <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                              Voucher ID: {entry.voucherId}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button onClick={() => setActiveAction(null)}>Close</Button>
          </div>
        </div>
      </Modal>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast({ ...toast, visible: false })} />
    </>
  )
}
