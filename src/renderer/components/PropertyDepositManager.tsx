import React, { useState, useMemo } from 'react'
import type { LeaseEntry, TenantEntry, PropAccount, SecurityDeposit, SecurityDepositTransaction, SecurityDepositStatus, SecurityDepositGlMappings } from '../data/propertyTypes'
import { DataTable, type Column } from './design/Table'
import { Badge, Button, SearchIcon, CloseIcon, EmptyState, Modal, Select, Input } from './design/DesignSystem'
import { formatDate } from '../utils'
import { computeDepositBalances, createInitialDeposit, addDepositTransaction, closeDeposit } from '../services/propertyDepositService'
import Toast from './Toast'
import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { AccountingEngine } from '../accounting/accountingEngine'
import { getPropertyBankAccountId } from '../services/propertyAccountingService'

interface Props {
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
  securityDeposits: SecurityDeposit[]
  setSecurityDeposits: React.Dispatch<React.SetStateAction<SecurityDeposit[]>>
  depositMappings: SecurityDepositGlMappings
  setDepositMappings: React.Dispatch<React.SetStateAction<SecurityDepositGlMappings>>
}

const STATUS_COLORS: Record<SecurityDepositStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  Expected: 'warning',
  Received: 'neutral',
  Held: 'neutral',
  'Partially Refunded': 'warning',
  'Fully Refunded': 'success',
  'Partially Forfeited': 'warning',
  'Fully Forfeited': 'danger',
  Closed: 'neutral',
}

function DepositKpiCard({ label, value, color, subtitle }: { label: string; value: string; color: string; subtitle?: string }) {
  return (
    <div className="kpi-card" style={{ borderTop: `2px solid ${color}` }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ fontSize: 22 }}>{value}</div>
      {subtitle && <div className="text-xs text-secondary">{subtitle}</div>}
    </div>
  )
}

export default function PropertyDepositManager({
  leases, tenants, dateFormat = 'DD/MM/YYYY', currency = 'AED',
  accounts, vouchers, setVouchers, accountingEngine, propAccounts, bankMappings,
  securityDeposits, setSecurityDeposits, depositMappings, setDepositMappings
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  // Active record states for modals
  const [activeDeposit, setActiveDeposit] = useState<SecurityDeposit | null>(null)
  const [activeAction, setActiveAction] = useState<'Receive' | 'Refund' | 'Forfeit' | 'Close' | 'History' | null>(null)

  // Wizard fields
  const [txAmount, setTxAmount] = useState('')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedPropBankId, setSelectedPropBankId] = useState('')
  const [txNotes, setTxNotes] = useState('')

  // Map tenants for lookup
  const tenantMap = useMemo(() => {
    return new Map(tenants.map(t => [t.id, t.name]))
  }, [tenants])

  // Map leases for lookup
  const leaseMap = useMemo(() => {
    return new Map(leases.map(l => [l.id, l]))
  }, [leases])

  // Filter dynamic COA accounts
  const liabilityAccounts = useMemo(() => {
    return accounts.filter(a => a.type === 'liability' && a.isActive)
  }, [accounts])

  const revenueAccounts = useMemo(() => {
    return accounts.filter(a => a.type === 'revenue' && a.isActive)
  }, [accounts])

  // Config mapping verification
  const mappingError = useMemo(() => {
    if (!depositMappings.liabilityAccountId) {
      return 'Security Deposit Liability Account is not configured in Chart of Accounts settings.'
    }
    if (!depositMappings.forfeitureIncomeAccountId) {
      return 'Deposit Forfeiture Income Account is not configured in Chart of Accounts settings.'
    }
    const hasLiability = accounts.some(a => a.id === depositMappings.liabilityAccountId)
    const hasRevenue = accounts.some(a => a.id === depositMappings.forfeitureIncomeAccountId)
    if (!hasLiability) {
      return 'Configured Security Deposit Liability Account does not exist in Chart of Accounts.'
    }
    if (!hasRevenue) {
      return 'Configured Deposit Forfeiture Income Account does not exist in Chart of Accounts.'
    }
    return null
  }, [depositMappings, accounts])

  // Auto-initialize deposits for active leases that don't have one yet
  const unifiedDeposits = useMemo(() => {
    let updated = [...securityDeposits]
    let changed = false

    for (const lease of leases) {
      if (lease.status !== 'Draft' && lease.deposit > 0) {
        const existing = updated.find(d => d.leaseId === lease.id)
        if (!existing) {
          updated.push(createInitialDeposit(lease, 'system'))
          changed = true
        }
      }
    }

    if (changed) {
      // Async state update to prevent side effects in render
      setTimeout(() => setSecurityDeposits(updated), 0)
    }

    return updated
  }, [leases, securityDeposits])

  // Memoized calculations for table & KPIs
  const enrichedDeposits = useMemo(() => {
    return unifiedDeposits.map(d => {
      const lease = leaseMap.get(d.leaseId)
      const tenantName = tenantMap.get(d.tenantId) || 'Unknown Tenant'
      const leaseNumber = lease?.leaseNumber || 'N/A'
      const balances = computeDepositBalances(d)

      return {
        ...d,
        leaseNumber,
        tenantName,
        ...balances,
      }
    })
  }, [unifiedDeposits, leaseMap, tenantMap])

  // KPI Computations
  const kpiData = useMemo(() => {
    let totalExpected = 0
    let totalReceived = 0
    let totalHeld = 0
    let totalRefunded = 0
    let totalForfeited = 0

    for (const d of enrichedDeposits) {
      totalExpected += d.expectedAmount
      totalReceived += d.receivedAmount
      totalHeld += d.currentBalance
      totalRefunded += d.refundedAmount
      totalForfeited += d.forfeitedAmount
    }

    return {
      totalExpected,
      totalReceived,
      totalHeld,
      totalRefunded,
      totalForfeited,
    }
  }, [enrichedDeposits])

  // Searching and Filtering
  const filtered = useMemo(() => {
    let result = enrichedDeposits

    if (statusFilter !== 'All') {
      result = result.filter(d => d.status === statusFilter)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(d =>
        d.leaseNumber.toLowerCase().includes(q) ||
        d.tenantName.toLowerCase().includes(q)
      )
    }

    return result
  }, [enrichedDeposits, searchQuery, statusFilter])

  // Modals controls
  const openWizard = (deposit: SecurityDeposit, action: typeof activeAction) => {
    setActiveDeposit(deposit)
    setActiveAction(action)
    setTxAmount('')
    setTxNotes('')
    setTxDate(new Date().toISOString().split('T')[0])
    setSelectedPropBankId(propAccounts[0]?.id || '')
  }

  const closeWizard = () => {
    setActiveDeposit(null)
    setActiveAction(null)
  }

  // Event Handlers for Wizards

  const handleReceive = () => {
    if (!activeDeposit || mappingError) return
    const amountNum = parseFloat(txAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setToast({ visible: true, message: 'Please enter a valid amount.', type: 'error' })
      return
    }

    if (!selectedPropBankId) {
      setToast({ visible: true, message: 'Please select a bank account.', type: 'error' })
      return
    }

    const coaBankAccountId = getPropertyBankAccountId(selectedPropBankId, propAccounts, bankMappings)
    if (!coaBankAccountId) {
      setToast({ visible: true, message: 'Bank account mapping not found in Chart of Accounts.', type: 'error' })
      return
    }

    const desc = `Security Deposit Receipt: Lease ${activeDeposit.id.split('-')[2] || ''} — Tenant: ${tenantMap.get(activeDeposit.tenantId)}`
    
    // Create Draft Voucher in AccountingEngine
    const draftResult = accountingEngine.processAccountingEvent(
      'SECURITY_DEPOSIT_RECEIVED',
      {
        amount: amountNum,
        date: txDate,
        description: desc,
        currency,
        exchangeRate: 1,
        baseCurrency: currency,
        bankAccount: coaBankAccountId,
        creditAccount: depositMappings.liabilityAccountId,
        referenceType: 'Lease',
        referenceId: activeDeposit.leaseId,
        createdBy: 'user',
      },
      accounts,
      vouchers
    )

    if (!draftResult.success || !draftResult.voucher) {
      setToast({ visible: true, message: 'Voucher creation failed: ' + draftResult.errors.map(e => e.message).join(', '), type: 'error' })
      return
    }

    // Auto-approve Voucher
    const appResult = accountingEngine.approve(draftResult.voucher, 'user')
    if (!appResult.success || !appResult.voucher) {
      setToast({ visible: true, message: 'Approval failed: ' + appResult.errors.map(e => e.message).join(', '), type: 'error' })
      return
    }

    // Auto-post Voucher
    const postResult = accountingEngine.post(appResult.voucher, 'user', accounts, vouchers)
    if (!postResult.success || !postResult.voucher) {
      setToast({ visible: true, message: 'Posting failed: ' + postResult.errors.map(e => e.message).join(', '), type: 'error' })
      return
    }

    const postedVoucher = postResult.voucher

    // Commit Transaction Atomic State Update
    try {
      const updated = addDepositTransaction(activeDeposit, {
        type: 'Receipt',
        amount: amountNum,
        date: txDate,
        bankAccountId: coaBankAccountId,
        voucherId: postedVoucher.id,
        notes: txNotes || 'Deposit collected.',
        status: 'Posted',
        createdBy: 'user'
      }, 'user')

      setSecurityDeposits(prev => prev.map(d => d.id === activeDeposit.id ? updated : d))
      setVouchers(prev => [postedVoucher, ...prev])
      setToast({ visible: true, message: `Successfully recorded collection of ${currency} ${amountNum.toLocaleString()}. Voucher ${postedVoucher.number} posted.`, type: 'success' })
      closeWizard()
    } catch (e: any) {
      setToast({ visible: true, message: e.message, type: 'error' })
    }
  }

  const handleRefund = () => {
    if (!activeDeposit || mappingError) return
    const amountNum = parseFloat(txAmount)
    const activeBalances = computeDepositBalances(activeDeposit)

    if (isNaN(amountNum) || amountNum <= 0) {
      setToast({ visible: true, message: 'Please enter a valid amount.', type: 'error' })
      return
    }

    if (amountNum > activeBalances.currentBalance) {
      setToast({ visible: true, message: `Refund amount cannot exceed held balance of ${currency} ${activeBalances.currentBalance.toLocaleString()}.`, type: 'error' })
      return
    }

    if (!selectedPropBankId) {
      setToast({ visible: true, message: 'Please select a bank account.', type: 'error' })
      return
    }

    const coaBankAccountId = getPropertyBankAccountId(selectedPropBankId, propAccounts, bankMappings)
    if (!coaBankAccountId) {
      setToast({ visible: true, message: 'Bank account mapping not found in Chart of Accounts.', type: 'error' })
      return
    }

    const desc = `Security Deposit Refund: Lease ${activeDeposit.id.split('-')[2] || ''} — Tenant: ${tenantMap.get(activeDeposit.tenantId)}`
    
    // Create Draft Voucher
    const draftResult = accountingEngine.processAccountingEvent(
      'SECURITY_DEPOSIT_REFUNDED',
      {
        amount: amountNum,
        date: txDate,
        description: desc,
        currency,
        exchangeRate: 1,
        baseCurrency: currency,
        bankAccount: coaBankAccountId,
        debitAccount: depositMappings.liabilityAccountId,
        referenceType: 'Lease',
        referenceId: activeDeposit.leaseId,
        createdBy: 'user',
      },
      accounts,
      vouchers
    )

    if (!draftResult.success || !draftResult.voucher) {
      setToast({ visible: true, message: 'Voucher creation failed: ' + draftResult.errors.map(e => e.message).join(', '), type: 'error' })
      return
    }

    // Auto-approve Voucher
    const appResult = accountingEngine.approve(draftResult.voucher, 'user')
    if (!appResult.success || !appResult.voucher) {
      setToast({ visible: true, message: 'Approval failed: ' + appResult.errors.map(e => e.message).join(', '), type: 'error' })
      return
    }

    // Auto-post Voucher
    const postResult = accountingEngine.post(appResult.voucher, 'user', accounts, vouchers)
    if (!postResult.success || !postResult.voucher) {
      setToast({ visible: true, message: 'Posting failed: ' + postResult.errors.map(e => e.message).join(', '), type: 'error' })
      return
    }

    const postedVoucher = postResult.voucher

    // Commit Transaction Atomic State Update
    try {
      const updated = addDepositTransaction(activeDeposit, {
        type: 'Refund',
        amount: amountNum,
        date: txDate,
        bankAccountId: coaBankAccountId,
        voucherId: postedVoucher.id,
        notes: txNotes || 'Deposit refunded.',
        status: 'Posted',
        createdBy: 'user'
      }, 'user')

      setSecurityDeposits(prev => prev.map(d => d.id === activeDeposit.id ? updated : d))
      setVouchers(prev => [postedVoucher, ...prev])
      setToast({ visible: true, message: `Successfully recorded refund of ${currency} ${amountNum.toLocaleString()}. Voucher ${postedVoucher.number} posted.`, type: 'success' })
      closeWizard()
    } catch (e: any) {
      setToast({ visible: true, message: e.message, type: 'error' })
    }
  }

  const handleForfeit = () => {
    if (!activeDeposit || mappingError) return
    const amountNum = parseFloat(txAmount)
    const activeBalances = computeDepositBalances(activeDeposit)

    if (isNaN(amountNum) || amountNum <= 0) {
      setToast({ visible: true, message: 'Please enter a valid amount.', type: 'error' })
      return
    }

    if (amountNum > activeBalances.currentBalance) {
      setToast({ visible: true, message: `Forfeit amount cannot exceed held balance of ${currency} ${activeBalances.currentBalance.toLocaleString()}.`, type: 'error' })
      return
    }

    const desc = `Security Deposit Forfeit: Lease ${activeDeposit.id.split('-')[2] || ''} — Tenant: ${tenantMap.get(activeDeposit.tenantId)}`
    
    // Create Draft Journal Voucher
    const draftResult = accountingEngine.processAccountingEvent(
      'SECURITY_DEPOSIT_FORFEITED',
      {
        amount: amountNum,
        date: txDate,
        description: desc,
        currency,
        exchangeRate: 1,
        baseCurrency: currency,
        debitAccount: depositMappings.liabilityAccountId,
        creditAccount: depositMappings.forfeitureIncomeAccountId,
        referenceType: 'Lease',
        referenceId: activeDeposit.leaseId,
        createdBy: 'user',
      },
      accounts,
      vouchers
    )

    if (!draftResult.success || !draftResult.voucher) {
      setToast({ visible: true, message: 'Voucher creation failed: ' + draftResult.errors.map(e => e.message).join(', '), type: 'error' })
      return
    }

    // Auto-approve Voucher
    const appResult = accountingEngine.approve(draftResult.voucher, 'user')
    if (!appResult.success || !appResult.voucher) {
      setToast({ visible: true, message: 'Approval failed: ' + appResult.errors.map(e => e.message).join(', '), type: 'error' })
      return
    }

    // Auto-post Voucher
    const postResult = accountingEngine.post(appResult.voucher, 'user', accounts, vouchers)
    if (!postResult.success || !postResult.voucher) {
      setToast({ visible: true, message: 'Posting failed: ' + postResult.errors.map(e => e.message).join(', '), type: 'error' })
      return
    }

    const postedVoucher = postResult.voucher

    // Commit Transaction Atomic State Update
    try {
      const updated = addDepositTransaction(activeDeposit, {
        type: 'Forfeit',
        amount: amountNum,
        date: txDate,
        voucherId: postedVoucher.id,
        notes: txNotes || 'Deposit forfeited to other income.',
        status: 'Posted',
        createdBy: 'user'
      }, 'user')

      setSecurityDeposits(prev => prev.map(d => d.id === activeDeposit.id ? updated : d))
      setVouchers(prev => [postedVoucher, ...prev])
      setToast({ visible: true, message: `Successfully recorded forfeiture of ${currency} ${amountNum.toLocaleString()}. Voucher ${postedVoucher.number} posted.`, type: 'success' })
      closeWizard()
    } catch (e: any) {
      setToast({ visible: true, message: e.message, type: 'error' })
    }
  }

  const handleClose = () => {
    if (!activeDeposit) return
    try {
      const updated = closeDeposit(activeDeposit, 'user', txNotes)
      setSecurityDeposits(prev => prev.map(d => d.id === activeDeposit.id ? updated : d))
      setToast({ visible: true, message: `Deposit record closed successfully.`, type: 'success' })
      closeWizard()
    } catch (e: any) {
      setToast({ visible: true, message: e.message, type: 'error' })
    }
  }

  // Helper to match Voucher Number from ID
  const getVoucherNumber = (vid?: string | null) => {
    if (!vid) return null
    return vouchers.find(v => v.id === vid)?.number || vid
  }

  const columns: Column<any>[] = useMemo(() => [
    {
      key: 'leaseNumber',
      header: 'Lease No.',
      width: '120px',
      sortable: true,
      render: row => <span className="text-mono text-xs fw-600">{row.leaseNumber}</span>,
    },
    {
      key: 'tenantName',
      header: 'Tenant',
      sortable: true,
      render: row => <span className="text-sm">{row.tenantName}</span>,
    },
    {
      key: 'expectedAmount',
      header: 'Required',
      numeric: true,
      sortable: true,
      render: row => <span className="text-mono text-xs">{currency} {row.expectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>,
    },
    {
      key: 'receivedAmount',
      header: 'Collected',
      numeric: true,
      sortable: true,
      render: row => <span className="text-mono text-xs">{currency} {row.receivedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>,
    },
    {
      key: 'currentBalance',
      header: 'Held Balance',
      numeric: true,
      sortable: true,
      render: row => (
        <span className="text-mono text-xs fw-600" style={{ color: row.currentBalance > 0 ? '#10B981' : undefined }}>
          {currency} {row.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      sortable: true,
      render: row => <Badge variant={STATUS_COLORS[row.status as SecurityDepositStatus] || 'neutral'}>{row.status}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '320px',
      render: row => {
        const canAction = !mappingError
        return (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {row.status === 'Expected' && (
              <Button variant="secondary" size="sm" disabled={!canAction} onClick={() => openWizard(row, 'Receive')}>Collect</Button>
            )}
            {row.currentBalance > 0 && (
              <>
                <Button variant="secondary" size="sm" disabled={!canAction} onClick={() => openWizard(row, 'Refund')}>Refund</Button>
                <Button variant="secondary" size="sm" disabled={!canAction} onClick={() => openWizard(row, 'Forfeit')}>Forfeit</Button>
              </>
            )}
            {row.status !== 'Expected' && row.status !== 'Closed' && row.currentBalance === 0 && (
              <Button variant="secondary" size="sm" onClick={() => openWizard(row, 'Close')}>Close Record</Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => openWizard(row, 'History')}>Ledger & History</Button>
          </div>
        )
      },
    },
  ], [currency, mappingError, vouchers])

  const statusOptions = ['All', 'Expected', 'Received', 'Held', 'Partially Refunded', 'Fully Refunded', 'Partially Forfeited', 'Fully Forfeited', 'Closed']

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Security Deposit Manager</div>
            <div className="page-subtitle">Derive balances and record collections, refunds, and forfeitures</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Mapping Alert Banner */}
        {mappingError && (
          <div className="alert alert-danger" style={{ marginBottom: 20, display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
            <div>
              <strong>Configuration Required:</strong> {mappingError}
            </div>
          </div>
        )}

        {/* Mappings Settings Card */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">GL Chart of Accounts Settings Mappings</span>
          </div>
          <div className="card-body">
            <div className="form-row">
              <Select
                label="Security Deposit Liability Account (GL Code)"
                value={depositMappings.liabilityAccountId}
                onChange={e => setDepositMappings(prev => ({ ...prev, liabilityAccountId: e.target.value }))}
                options={[
                  { value: '', label: '-- Select Liability Account --' },
                  ...liabilityAccounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))
                ]}
              />
              <Select
                label="Deposit Forfeiture Income Account (GL Code)"
                value={depositMappings.forfeitureIncomeAccountId}
                onChange={e => setDepositMappings(prev => ({ ...prev, forfeitureIncomeAccountId: e.target.value }))}
                options={[
                  { value: '', label: '-- Select Revenue Account --' },
                  ...revenueAccounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))
                ]}
              />
            </div>
          </div>
        </div>

        {/* KPI Summaries Grid */}
        <div className="kpi-grid">
          <DepositKpiCard label="Total Required Expected" value={`${currency} ${kpiData.totalExpected.toLocaleString()}`} color="#3B82F6" />
          <DepositKpiCard label="Total Collected Received" value={`${currency} ${kpiData.totalReceived.toLocaleString()}`} color="#10B981" />
          <DepositKpiCard label="Held Balance in Trust" value={`${currency} ${kpiData.totalHeld.toLocaleString()}`} color="#059669" subtitle="Dr Bank / Cr Liability Balance" />
          <DepositKpiCard label="Total Refunded" value={`${currency} ${kpiData.totalRefunded.toLocaleString()}`} color="#F59E0B" />
          <DepositKpiCard label="Total Forfeited (Income)" value={`${currency} ${kpiData.totalForfeited.toLocaleString()}`} color="#EF4444" />
        </div>

        {/* Grid Toolbar & List */}
        <div className="card" style={{ marginTop: 20 }}>
          <div className="toolbar">
            <div className="toolbar-left">
              <div className="search-input-container">
                <SearchIcon />
                <input
                  type="text"
                  placeholder="Search by Lease No. or Tenant..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="search-clear-btn"><CloseIcon /></button>}
              </div>
              <div className="filter-group">
                {statusOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setStatusFilter(opt)}
                    className={`filter-tab ${statusFilter === opt ? 'active' : ''}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DataTable
            data={filtered}
            columns={columns}
            keyExtractor={row => row.id}
            emptyState={
              <EmptyState
                title="No Security Deposit records found"
                text="Leases with active deposit values will automatically generate records here."
              />
            }
          />
        </div>
      </div>

      {/* Collect Receipt Modal */}
      {activeAction === 'Receive' && activeDeposit && (
        <Modal open={true} title="Record Security Deposit Collection" onClose={closeWizard}>
          <div className="form-group">
            <label className="form-label">Lease No.</label>
            <input type="text" className="form-control" value={enrichedDeposits.find(d => d.id === activeDeposit.id)?.leaseNumber || ''} disabled />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Required Amount</label>
            <input type="text" className="form-control" value={`${currency} ${enrichedDeposits.find(d => d.id === activeDeposit.id)?.outstandingAmount.toLocaleString()}`} disabled />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input
              label="Collection Amount"
              type="number"
              value={txAmount}
              onChange={e => setTxAmount(e.target.value)}
              placeholder="e.g. 5000"
              required
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input
              label="Payment Receipt Date"
              type="date"
              value={txDate}
              onChange={e => setTxDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Select
              label="Deposit Bank Account"
              value={selectedPropBankId}
              onChange={e => setSelectedPropBankId(e.target.value)}
              options={propAccounts.map(b => ({ value: b.id, label: `${b.institution} — ${b.accountName} (${b.currency})` }))}
              required
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input
              label="Collection Notes"
              value={txNotes}
              onChange={e => setTxNotes(e.target.value)}
              placeholder="Cheque number, reference details..."
            />
          </div>
          <div className="modal-actions" style={{ marginTop: 20 }}>
            <Button variant="secondary" onClick={closeWizard}>Cancel</Button>
            <Button variant="primary" onClick={handleReceive}>Post Receipt Voucher</Button>
          </div>
        </Modal>
      )}

      {/* Refund Wizard Modal */}
      {activeAction === 'Refund' && activeDeposit && (
        <Modal open={true} title="Post Security Deposit Refund" onClose={closeWizard}>
          <div className="form-group">
            <label className="form-label">Current Held Balance</label>
            <input type="text" className="form-control" value={`${currency} ${enrichedDeposits.find(d => d.id === activeDeposit.id)?.currentBalance.toLocaleString()}`} disabled />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input
              label="Refund Payment Amount"
              type="number"
              value={txAmount}
              onChange={e => setTxAmount(e.target.value)}
              placeholder="e.g. 2500"
              required
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input
              label="Refund Payment Date"
              type="date"
              value={txDate}
              onChange={e => setTxDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Select
              label="Source Bank Account"
              value={selectedPropBankId}
              onChange={e => setSelectedPropBankId(e.target.value)}
              options={propAccounts.map(b => ({ value: b.id, label: `${b.institution} — ${b.accountName} (${b.currency})` }))}
              required
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input
              label="Refund Notes"
              value={txNotes}
              onChange={e => setTxNotes(e.target.value)}
              placeholder="Refund cheque, bank transfer code..."
            />
          </div>
          <div className="modal-actions" style={{ marginTop: 20 }}>
            <Button variant="secondary" onClick={closeWizard}>Cancel</Button>
            <Button variant="primary" onClick={handleRefund}>Post Payment Voucher</Button>
          </div>
        </Modal>
      )}

      {/* Forfeit Wizard Modal */}
      {activeAction === 'Forfeit' && activeDeposit && (
        <Modal open={true} title="Post Security Deposit Forfeiture" onClose={closeWizard}>
          <div className="form-group">
            <label className="form-label">Current Held Balance</label>
            <input type="text" className="form-control" value={`${currency} ${enrichedDeposits.find(d => d.id === activeDeposit.id)?.currentBalance.toLocaleString()}`} disabled />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input
              label="Forfeit Amount"
              type="number"
              value={txAmount}
              onChange={e => setTxAmount(e.target.value)}
              placeholder="e.g. 500"
              required
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input
              label="Forfeiture Date"
              type="date"
              value={txDate}
              onChange={e => setTxDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input
              label="Forfeit Notes / Reason"
              value={txNotes}
              onChange={e => setTxNotes(e.target.value)}
              placeholder="Maintenance charges offset, early termination penalty..."
              required
            />
          </div>
          <div className="modal-actions" style={{ marginTop: 20 }}>
            <Button variant="secondary" onClick={closeWizard}>Cancel</Button>
            <Button variant="primary" onClick={handleForfeit}>Post Forfeiture Journal</Button>
          </div>
        </Modal>
      )}

      {/* Close Record Modal */}
      {activeAction === 'Close' && activeDeposit && (
        <Modal open={true} title="Close Security Deposit Record" onClose={closeWizard}>
          <div style={{ padding: '10px 0' }}>
            <p className="text-sm text-secondary">
              Are you sure you want to close this security deposit record? This will mark the lifecycle as terminated.
            </p>
            <div className="form-group" style={{ marginTop: 12 }}>
              <Input
                label="Closure Reason"
                value={txNotes}
                onChange={e => setTxNotes(e.target.value)}
                placeholder="Lease completed, fully settled..."
              />
            </div>
          </div>
          <div className="modal-actions" style={{ marginTop: 20 }}>
            <Button variant="secondary" onClick={closeWizard}>Cancel</Button>
            <Button variant="primary" onClick={handleClose}>Confirm Close</Button>
          </div>
        </Modal>
      )}

      {/* History timeline & Ledger audit modal */}
      {activeAction === 'History' && activeDeposit && (
        <Modal open={true} title="Deposit Transactions Ledger & History" onClose={closeWizard}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Ledger Transactions Sub-Table */}
            <div>
              <h4 className="text-sm fw-600" style={{ marginBottom: 8 }}>Transactions Ledger</h4>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Linked Voucher</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDeposit.transactions.map((tx, idx) => (
                    <tr key={tx.id || idx}>
                      <td>{formatDate(tx.date, dateFormat)}</td>
                      <td>
                        <Badge variant={tx.type === 'Charge' ? 'neutral' : tx.type === 'Receipt' ? 'success' : tx.type === 'Refund' ? 'warning' : 'danger'}>
                          {tx.type}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={tx.status === 'Posted' ? 'success' : tx.status === 'Draft' ? 'warning' : 'neutral'}>
                          {tx.status}
                        </Badge>
                      </td>
                      <td style={{ textAlign: 'right' }} className="text-mono">
                        {currency} {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        {tx.voucherId ? (
                          <span className="text-xs text-mono" style={{ textDecoration: 'underline', color: '#3B82F6' }}>
                            {getVoucherNumber(tx.voucherId)}
                          </span>
                        ) : (
                          <span className="text-xs text-secondary">—</span>
                        )}
                      </td>
                      <td className="text-xs text-secondary">{tx.notes}</td>
                    </tr>
                  ))}
                  {activeDeposit.transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '16px' }} className="text-secondary">
                        No transactions recorded in ledger.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Audit History Timeline */}
            <div>
              <h4 className="text-sm fw-600" style={{ marginBottom: 8 }}>Audit Log Timeline</h4>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Transition</th>
                    <th>Operator</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDeposit.auditHistory?.map((aud, idx) => (
                    <tr key={idx}>
                      <td className="text-xs text-secondary">{new Date(aud.timestamp).toLocaleString()}</td>
                      <td>
                        <span className="text-xs text-secondary">{aud.previousStatus}</span>
                        <span style={{ margin: '0 8px' }}>&rarr;</span>
                        <Badge variant={STATUS_COLORS[aud.newStatus] || 'neutral'}>{aud.newStatus}</Badge>
                      </td>
                      <td className="text-xs">{aud.user}</td>
                      <td className="text-xs text-secondary">{aud.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
          <div className="modal-actions" style={{ marginTop: 20 }}>
            <Button variant="secondary" onClick={closeWizard}>Close</Button>
          </div>
        </Modal>
      )}
    </>
  )
}
