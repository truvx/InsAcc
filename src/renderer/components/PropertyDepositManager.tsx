import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import type { LeaseEntry, TenantEntry, PropAccount, SecurityDeposit, SecurityDepositTransaction, SecurityDepositStatus, SecurityDepositGlMappings, PropertyEntry } from '../data/propertyTypes'
import { DataTable, type Column } from './design/Table'
import { Badge, Button, SearchIcon, CloseIcon, EmptyState, Modal, Select, Input } from './design/DesignSystem'
import { formatDate } from '../utils'
import { computeDepositBalances, createInitialDeposit, addDepositTransaction, closeDeposit } from '../services/propertyDepositService'
import Toast from './Toast'
import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { AccountingEngine } from '../accounting/accountingEngine'
import { getPropertyBankAccountId, validateBankChartLink } from '../services/propertyAccountingService'
import { getDefaultPropertyReceiptBankAccount, getDefaultPropertyPaymentBankAccount } from '../services/bankingService'
import { MoreVertical, History as HistoryIcon, Download, Upload, Scissors, Printer, ChevronDown, ChevronUp, ArrowDownToLine } from 'lucide-react'
import { printVoucher } from '../utils/printVoucherHelper'
import { CurrencyText } from './design/CurrencyText'
import { formatCurrency } from '../utils/currencyHelpers'

import type { AuditEvent } from '../data/auditTypes'
import { recordModuleEvent } from '../services/auditService'

interface Props {
  leases: LeaseEntry[]
  tenants: TenantEntry[]
  properties: PropertyEntry[]
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
  onAuditEvent?: (event: AuditEvent) => void
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

function DepositKpiCard({ label, value, color, subtitle }: { label: string; value: React.ReactNode; color: string; subtitle?: string }) {
  return (
    <div className="kpi-card" style={{ borderTop: `2px solid ${color}` }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ fontSize: 22 }}>{value}</div>
      {subtitle && <div className="text-xs text-secondary">{subtitle}</div>}
    </div>
  )
}

const menuItemStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '8px 16px',
  textAlign: 'left',
  width: '100%',
  cursor: 'pointer',
  fontSize: '13px',
  color: 'var(--text-primary, #1F2937)',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontFamily: 'inherit',
}

interface DepositActionsMenuProps {
  row: any
  canAction: boolean
  onCollect: () => void
  onRefund: () => void
  onForfeit: () => void
  onPartialRefund: () => void
  onCloseRecord: () => void
  onViewLedger: () => void
  onPrintReceipt: () => void
  onDepositPDC: () => void
}

function DepositActionsMenu({
  row,
  canAction,
  onCollect,
  onRefund,
  onForfeit,
  onPartialRefund,
  onCloseRecord,
  onViewLedger,
  onPrintReceipt,
  onDepositPDC,
}: DepositActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)

  const recalc = useRef<() => void>(() => {})

  useEffect(() => {
    recalc.current = () => {
      const btn = buttonRef.current
      const menu = portalRef.current
      if (!btn) return
      const br = btn.getBoundingClientRect()
      const mw = 180
      const mh = menu ? menu.offsetHeight : 220
      const vw = window.innerWidth
      const vh = window.innerHeight
      let top = br.bottom + 4
      if (top + mh > vh) top = Math.max(4, br.top - mh - 4)
      let left = br.right - mw
      if (left < 4) left = 4
      else if (left + mw > vw - 4) left = vw - mw - 4
      Object.assign(menu?.style ?? {}, {
        top: `${top}px`,
        left: `${left}px`,
      })
    }
  })

  useLayoutEffect(() => {
    if (!isOpen) return
    recalc.current()
    const reposition = () => recalc.current()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    window.addEventListener('keydown', esc)
    document.addEventListener('mousedown', handleOutClick)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('keydown', esc)
      document.removeEventListener('mousedown', handleOutClick)
    }
  }, [isOpen])

  function handleOutClick(e: MouseEvent) {
    if (
      buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
      portalRef.current && !portalRef.current.contains(e.target as Node)
    ) {
      setIsOpen(false)
    }
  }

  const showCollect = row.status === 'Expected'
  const showRefundForfeit = row.currentBalance > 0
  const showClose = row.status !== 'Expected' && row.status !== 'Closed' && row.currentBalance === 0
  const showPrint = row.receivedAmount > 0
  const showDepositPDC = row.transactions?.some((t: any) => t.paymentMode === 'Post Dated Cheque (PDC)' || t.paymentMode === 'Security Cheque')

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(v => !v)
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '6px',
          borderRadius: '4px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary, #6B7280)',
          outline: 'none',
        }}
        aria-label="Actions"
      >
        <MoreVertical size={16} strokeWidth={2.5} />
      </button>

      {isOpen && createPortal(
        <div
          ref={portalRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            background: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border, #E5E7EB)',
            borderRadius: 'var(--radius-md, 6px)',
            boxShadow: 'var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1))',
            zIndex: 99999,
            minWidth: '180px',
            display: 'flex',
            flexDirection: 'column',
            padding: '4px 0',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onViewLedger(); setIsOpen(false) }}
            style={menuItemStyle}
          >
            <HistoryIcon size={14} strokeWidth={1.75} /> View Ledger
          </button>
          
          {showCollect && (
            <button
              onClick={() => { if (canAction) { onCollect(); setIsOpen(false) } }}
              disabled={!canAction}
              style={{
                ...menuItemStyle,
                color: canAction ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: canAction ? 'pointer' : 'not-allowed',
                opacity: canAction ? 1 : 0.5
              }}
            >
              <Download size={14} strokeWidth={1.75} /> Collect Deposit
            </button>
          )}

          {showRefundForfeit && (
            <>
              <button
                onClick={() => { if (canAction) { onRefund(); setIsOpen(false) } }}
                disabled={!canAction}
                style={{
                  ...menuItemStyle,
                  color: canAction ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: canAction ? 'pointer' : 'not-allowed',
                  opacity: canAction ? 1 : 0.5
                }}
              >
                <Upload size={14} strokeWidth={1.75} /> Refund Deposit
              </button>
              <button
                onClick={() => { if (canAction) { onPartialRefund(); setIsOpen(false) } }}
                disabled={!canAction}
                style={{
                  ...menuItemStyle,
                  color: canAction ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: canAction ? 'pointer' : 'not-allowed',
                  opacity: canAction ? 1 : 0.5
                }}
              >
                <Upload size={14} strokeWidth={1.75} /> Partial Refund
              </button>
              <button
                onClick={() => { if (canAction) { onForfeit(); setIsOpen(false) } }}
                disabled={!canAction}
                style={{
                  ...menuItemStyle,
                  color: canAction ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: canAction ? 'pointer' : 'not-allowed',
                  opacity: canAction ? 1 : 0.5
                }}
              >
                <Scissors size={14} strokeWidth={1.75} /> Forfeit Deposit
              </button>
            </>
          )}

          {showDepositPDC && (
            <button
              onClick={() => { if (canAction) { onDepositPDC(); setIsOpen(false) } }}
              disabled={!canAction}
              style={{
                ...menuItemStyle,
                color: canAction ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: canAction ? 'pointer' : 'not-allowed',
                opacity: canAction ? 1 : 0.5
              }}
            >
              <ArrowDownToLine size={14} strokeWidth={1.75} /> Deposit PDC Cheque
            </button>
          )}

          {showClose && (
            <button
              onClick={() => { onCloseRecord(); setIsOpen(false) }}
              style={menuItemStyle}
            >
              <Upload size={14} strokeWidth={1.75} style={{ transform: 'rotate(180deg)' }} /> Close Record
            </button>
          )}

          {showPrint && (
            <button
              onClick={() => { onPrintReceipt(); setIsOpen(false) }}
              style={menuItemStyle}
            >
              <Printer size={14} strokeWidth={1.75} /> Print Receipt
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

export default function PropertyDepositManager({
  leases, tenants, properties, dateFormat = 'DD/MM/YYYY', currency = 'AED',
  accounts, vouchers, setVouchers, accountingEngine, propAccounts, bankMappings,
  securityDeposits, setSecurityDeposits, depositMappings, setDepositMappings,
  onAuditEvent
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [propertyFilter, setPropertyFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('All')
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  // Collapsible GL Mappings Settings
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false)
  const [localMappings, setLocalMappings] = useState({
    liabilityAccountId: depositMappings.liabilityAccountId,
    forfeitureIncomeAccountId: depositMappings.forfeitureIncomeAccountId
  })

  useEffect(() => {
    setLocalMappings({
      liabilityAccountId: depositMappings.liabilityAccountId,
      forfeitureIncomeAccountId: depositMappings.forfeitureIncomeAccountId
    })
  }, [depositMappings])

  // Active record states for modals
  const [activeDeposit, setActiveDeposit] = useState<SecurityDeposit | null>(null)
  const [activeAction, setActiveAction] = useState<'Receive' | 'Refund' | 'Forfeit' | 'PartialRefund' | 'Close' | 'History' | 'DepositPDC' | null>(null)

  // Wizard fields
  const [txAmount, setTxAmount] = useState('')
  const [txRetainedAmount, setTxRetainedAmount] = useState('')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedPropBankId, setSelectedPropBankId] = useState('')
  const [txNotes, setTxNotes] = useState('')

  const [formPaymentMode, setFormPaymentMode] = useState<string>('Bank Transfer')
  const [formPaymentReference, setFormPaymentReference] = useState('')

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
    const list = accounts.filter(a => a.type === 'liability' && a.isActive)
    console.log('--- DEPOSIT MANAGER LIABILITY ACCOUNTS ---')
    console.log('Total accounts in prop: ', accounts.length)
    console.log('Liability accounts found: ', list.length)
    list.forEach(a => console.log(`  id: ${a.id}, code: ${a.code}, name: ${a.name}, isActive: ${a.isActive}`))
    console.log('Current selected liability id: ', depositMappings.liabilityAccountId)
    console.log('------------------------------------------')
    return list
  }, [accounts, depositMappings.liabilityAccountId])

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

    if (propertyFilter !== 'All') {
      result = result.filter(d => {
        const lease = leaseMap.get(d.leaseId)
        return lease?.propertyId === propertyFilter
      })
    }

    if (dateFilter !== 'All') {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(now.getDate() - 30)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(now.getDate() - 90)

      result = result.filter(d => {
        const lease = leaseMap.get(d.leaseId)
        if (!lease || !lease.startDate) return false
        const leaseDate = new Date(lease.startDate)
        
        if (dateFilter === 'This Month') {
          return leaseDate.getFullYear() === now.getFullYear() && leaseDate.getMonth() === now.getMonth()
        }
        if (dateFilter === 'This Year') {
          return leaseDate.getFullYear() === now.getFullYear()
        }
        if (dateFilter === 'Last 30 Days') {
          return leaseDate >= thirtyDaysAgo
        }
        if (dateFilter === 'Last 90 Days') {
          return leaseDate >= ninetyDaysAgo
        }
        return true
      })
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(d =>
        d.leaseNumber.toLowerCase().includes(q) ||
        d.tenantName.toLowerCase().includes(q)
      )
    }

    return result
  }, [enrichedDeposits, searchQuery, statusFilter, propertyFilter, dateFilter, leaseMap])

  // Modals controls
  const openWizard = (deposit: SecurityDeposit, action: typeof activeAction) => {
    setActiveDeposit(deposit)
    setActiveAction(action)
    setTxAmount('')
    setTxRetainedAmount('')
    setTxNotes('')
    setTxDate(new Date().toISOString().split('T')[0])
    const defaultBank = action === 'Receive' || action === 'DepositPDC'
      ? getDefaultPropertyReceiptBankAccount(propAccounts)
      : getDefaultPropertyPaymentBankAccount(propAccounts)
    setSelectedPropBankId(defaultBank ? defaultBank.id : '')
    setFormPaymentMode('Bank Transfer')
    setFormPaymentReference('')
  }

  const closeWizard = () => {
    setActiveDeposit(null)
    setActiveAction(null)
  }

  // Event Handlers for Wizards

  const handleSaveMappings = () => {
    setDepositMappings(localMappings)
    setToast({ visible: true, message: 'GL mappings saved successfully.', type: 'success' })
    setIsSettingsExpanded(false)
  }

  const handleReceive = () => {
    if (!activeDeposit || mappingError) return
    const amountNum = parseFloat(txAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setToast({ visible: true, message: 'Please enter a valid amount.', type: 'error' })
      return
    }

    const isPdcMode = formPaymentMode === 'Post Dated Cheque (PDC)'
    const isCashMode = formPaymentMode === 'Cash'
    const isSecurityChequeMode = formPaymentMode === 'Security Cheque'

    let coaBankAccountId: string | undefined
    if (!isPdcMode) {
      if (isCashMode) {
        coaBankAccountId = accounts.find(a => a.code === '1110')?.id
        if (!coaBankAccountId) {
          setToast({ visible: true, message: 'Cash In Hand account (1110) not found.', type: 'error' })
          return
        }
      } else if (isSecurityChequeMode) {
        coaBankAccountId = accounts.find(a => a.code === '1420')?.id
        if (!coaBankAccountId) {
          setToast({ visible: true, message: 'Security Cheques Received account (1420) not found.', type: 'error' })
          return
        }
      } else {
        if (!selectedPropBankId) {
          setToast({ visible: true, message: 'Please select a bank account.', type: 'error' })
          return
        }
        const linkResult = validateBankChartLink(selectedPropBankId, propAccounts, bankMappings)
        if (!linkResult.valid) {
          setToast({ visible: true, message: linkResult.error + ' Open Bank Accounts to fix it.', type: 'error' })
          return
        }
        coaBankAccountId = linkResult.chartAccountId
      }
    }

    const desc = `Security Deposit Receipt: Lease ${activeDeposit.id.split('-')[2] || ''} — Tenant: ${tenantMap.get(activeDeposit.tenantId)}`
    
    // Create Draft Voucher in AccountingEngine
    const draftResult = accountingEngine.processAccountingEvent(
      isPdcMode ? 'SECURITY_DEPOSIT_PDC_RECEIVED' : 'SECURITY_DEPOSIT_RECEIVED',
      isPdcMode ? {
        amount: amountNum,
        date: txDate,
        description: desc,
        currency,
        exchangeRate: 1,
        baseCurrency: currency,
        creditAccount: depositMappings.liabilityAccountId,
        referenceType: 'Lease',
        referenceId: activeDeposit.leaseId,
        createdBy: 'user',
      } : {
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
    postedVoucher.paymentMode = formPaymentMode as any
    postedVoucher.paymentReference = formPaymentReference || undefined

    // Commit Transaction Atomic State Update
    try {
      const updated = addDepositTransaction(activeDeposit, {
        type: 'Receipt',
        amount: amountNum,
        date: txDate,
        bankAccountId: coaBankAccountId,
        voucherId: postedVoucher.id,
        notes: txNotes || 'Deposit collected.',
        paymentMode: formPaymentMode as any,
        paymentReference: formPaymentReference || undefined,
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

  const handleDepositPDC = () => {
    if (!activeDeposit || mappingError) return
    if (!selectedPropBankId) {
      setToast({ visible: true, message: 'Please select a bank account.', type: 'error' })
      return
    }
    const linkResult = validateBankChartLink(selectedPropBankId, propAccounts, bankMappings)
    if (!linkResult.valid) {
      setToast({ visible: true, message: linkResult.error + ' Open Bank Accounts to fix it.', type: 'error' })
      return
    }
    const coaBankAccountId = linkResult.chartAccountId
    const amountNum = parseFloat(txAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setToast({ visible: true, message: 'Please enter a valid amount.', type: 'error' })
      return
    }

    const desc = `Security Deposit PDC Deposit: Lease ${activeDeposit.id.split('-')[2] || ''} — Tenant: ${tenantMap.get(activeDeposit.tenantId)}`

    const draftResult = accountingEngine.processAccountingEvent(
      'SECURITY_DEPOSIT_PDC_DEPOSITED',
      {
        amount: amountNum,
        date: txDate,
        description: desc,
        currency,
        exchangeRate: 1,
        baseCurrency: currency,
        bankAccount: coaBankAccountId,
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

    const appResult = accountingEngine.approve(draftResult.voucher, 'user')
    if (!appResult.success || !appResult.voucher) {
      setToast({ visible: true, message: 'Approval failed: ' + appResult.errors.map(e => e.message).join(', '), type: 'error' })
      return
    }

    const postResult = accountingEngine.post(appResult.voucher, 'user', accounts, vouchers)
    if (!postResult.success || !postResult.voucher) {
      setToast({ visible: true, message: 'Posting failed: ' + postResult.errors.map(e => e.message).join(', '), type: 'error' })
      return
    }

    const postedVoucher = postResult.voucher
    postedVoucher.paymentMode = 'PDC Deposit' as any
    postedVoucher.paymentReference = formPaymentReference || undefined

    try {
      const updated = addDepositTransaction(activeDeposit, {
        type: 'Receipt',
        amount: amountNum,
        date: txDate,
        bankAccountId: coaBankAccountId,
        voucherId: postedVoucher.id,
        notes: txNotes || 'PDC deposited to bank.',
        paymentMode: 'Bank Transfer',
        paymentReference: formPaymentReference || undefined,
        status: 'Posted',
        createdBy: 'user'
      }, 'user')

      setSecurityDeposits(prev => prev.map(d => d.id === activeDeposit.id ? updated : d))
      setVouchers(prev => [postedVoucher, ...prev])
      setToast({ visible: true, message: `PDC deposited. Voucher ${postedVoucher.number} posted.`, type: 'success' })
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

    const isCashMode = formPaymentMode === 'Cash'
    const isSecurityChequeMode = formPaymentMode === 'Security Cheque'

    let coaBankAccountId: string | undefined
    if (isCashMode) {
      coaBankAccountId = accounts.find(a => a.code === '1110')?.id
      if (!coaBankAccountId) {
        setToast({ visible: true, message: 'Cash In Hand account (1110) not found.', type: 'error' })
        return
      }
    } else if (isSecurityChequeMode) {
      coaBankAccountId = accounts.find(a => a.code === '1420')?.id
      if (!coaBankAccountId) {
        setToast({ visible: true, message: 'Security Cheques Received account (1420) not found.', type: 'error' })
        return
      }
    } else {
      if (!selectedPropBankId) {
        setToast({ visible: true, message: 'Please select a bank account.', type: 'error' })
        return
      }
      const linkResult = validateBankChartLink(selectedPropBankId, propAccounts, bankMappings)
      if (!linkResult.valid) {
        setToast({ visible: true, message: linkResult.error + ' Open Bank Accounts to fix it.', type: 'error' })
        return
      }
      coaBankAccountId = linkResult.chartAccountId
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
    postedVoucher.paymentMode = formPaymentMode as any
    postedVoucher.paymentReference = formPaymentReference || undefined

    // Commit Transaction Atomic State Update
    try {
      const updated = addDepositTransaction(activeDeposit, {
        type: 'Refund',
        amount: amountNum,
        date: txDate,
        bankAccountId: coaBankAccountId,
        voucherId: postedVoucher.id,
        notes: txNotes || 'Deposit refunded.',
        paymentMode: formPaymentMode as any,
        paymentReference: formPaymentReference || undefined,
        status: 'Posted',
        createdBy: 'user'
      }, 'user')

      setSecurityDeposits(prev => prev.map(d => d.id === activeDeposit.id ? updated : d))
      setVouchers(prev => [postedVoucher, ...prev])
      onAuditEvent?.(recordModuleEvent('Property Transactions', 'Update', activeDeposit.leaseId, activeDeposit.id, `Refunded security deposit of ${currency} ${amountNum.toLocaleString()}`))
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
    postedVoucher.paymentMode = formPaymentMode as any
    postedVoucher.paymentReference = formPaymentReference || undefined

    // Commit Transaction Atomic State Update
    try {
      const updated = addDepositTransaction(activeDeposit, {
        type: 'Forfeit',
        amount: amountNum,
        date: txDate,
        voucherId: postedVoucher.id,
        notes: txNotes || 'Deposit forfeited to other income.',
        paymentMode: formPaymentMode as any,
        paymentReference: formPaymentReference || undefined,
        status: 'Posted',
        createdBy: 'user'
      }, 'user')

      setSecurityDeposits(prev => prev.map(d => d.id === activeDeposit.id ? updated : d))
      setVouchers(prev => [postedVoucher, ...prev])
      onAuditEvent?.(recordModuleEvent('Property Transactions', 'Update', activeDeposit.leaseId, activeDeposit.id, `Forfeited security deposit of ${currency} ${amountNum.toLocaleString()}`))
      setToast({ visible: true, message: `Successfully recorded forfeiture of ${currency} ${amountNum.toLocaleString()}. Voucher ${postedVoucher.number} posted.`, type: 'success' })
      closeWizard()
    } catch (e: any) {
      setToast({ visible: true, message: e.message, type: 'error' })
    }
  }

  const handlePartialRefund = () => {
    if (!activeDeposit || mappingError) return
    const refundNum = parseFloat(txAmount)
    const retainNum = parseFloat(txRetainedAmount)
    const activeBalances = computeDepositBalances(activeDeposit)

    if (isNaN(refundNum) || refundNum <= 0) {
      setToast({ visible: true, message: 'Please enter a valid refund amount.', type: 'error' })
      return
    }
    if (isNaN(retainNum) || retainNum < 0) {
      setToast({ visible: true, message: 'Please enter a valid retained amount.', type: 'error' })
      return
    }
    const total = refundNum + retainNum
    if (total > activeBalances.currentBalance) {
      setToast({ visible: true, message: `Total amount (${currency} ${total.toLocaleString()}) cannot exceed held balance of ${currency} ${activeBalances.currentBalance.toLocaleString()}.`, type: 'error' })
      return
    }

    const isCashMode = formPaymentMode === 'Cash'
    const isSecurityChequeMode = formPaymentMode === 'Security Cheque'

    let coaBankAccountId: string | undefined
    if (isCashMode) {
      coaBankAccountId = accounts.find(a => a.code === '1110')?.id
      if (!coaBankAccountId) {
        setToast({ visible: true, message: 'Cash In Hand account (1110) not found.', type: 'error' })
        return
      }
    } else if (isSecurityChequeMode) {
      coaBankAccountId = accounts.find(a => a.code === '1420')?.id
      if (!coaBankAccountId) {
        setToast({ visible: true, message: 'Security Cheques Received account (1420) not found.', type: 'error' })
        return
      }
    } else {
      if (!selectedPropBankId) {
        setToast({ visible: true, message: 'Please select a bank account for the refund.', type: 'error' })
        return
      }
      const linkResult = validateBankChartLink(selectedPropBankId, propAccounts, bankMappings)
      if (!linkResult.valid) {
        setToast({ visible: true, message: linkResult.error + ' Open Bank Accounts to fix it.', type: 'error' })
        return
      }
      coaBankAccountId = linkResult.chartAccountId
    }

    const desc = `Security Deposit Partial Refund: Lease ${activeDeposit.id.split('-')[2] || ''} — Tenant: ${tenantMap.get(activeDeposit.tenantId)}`

    // Create Draft Journal Voucher with compound entry
    const draftResult = accountingEngine.processAccountingEvent(
      'SECURITY_DEPOSIT_PARTIAL_REFUND',
      {
        amount: total,
        refundAmount: refundNum,
        date: txDate,
        description: desc,
        currency,
        exchangeRate: 1,
        baseCurrency: currency,
        bankAccount: coaBankAccountId,
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

    const appResult = accountingEngine.approve(draftResult.voucher, 'user')
    if (!appResult.success || !appResult.voucher) {
      setToast({ visible: true, message: 'Approval failed: ' + appResult.errors.map(e => e.message).join(', '), type: 'error' })
      return
    }

    const postResult = accountingEngine.post(appResult.voucher, 'user', accounts, vouchers)
    if (!postResult.success || !postResult.voucher) {
      setToast({ visible: true, message: 'Posting failed: ' + postResult.errors.map(e => e.message).join(', '), type: 'error' })
      return
    }

    const postedVoucher = postResult.voucher

    try {
      // Refund transaction
      let updated = addDepositTransaction(activeDeposit, {
        type: 'Refund',
        amount: refundNum,
        date: txDate,
        bankAccountId: coaBankAccountId,
        voucherId: postedVoucher.id,
        notes: txNotes || `Deposit refunded (${currency} ${refundNum.toLocaleString()}).`,
        paymentMode: 'Bank Transfer',
        status: 'Posted',
        createdBy: 'user'
      }, 'user')

      // Forfeit transaction for retained portion
      if (retainNum > 0) {
        updated = addDepositTransaction(updated, {
          type: 'Forfeit',
          amount: retainNum,
          date: txDate,
          voucherId: postedVoucher.id,
          notes: txNotes || `Deposit retained as damage recovery (${currency} ${retainNum.toLocaleString()}).`,
          status: 'Posted',
          createdBy: 'user'
        }, 'user')
      }

      setSecurityDeposits(prev => prev.map(d => d.id === activeDeposit.id ? updated : d))
      setVouchers(prev => [postedVoucher, ...prev])
      setToast({ visible: true, message: `Partial refund posted. Refunded ${currency} ${refundNum.toLocaleString()}, retained ${currency} ${retainNum.toLocaleString()}. Voucher ${postedVoucher.number} posted.`, type: 'success' })
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

  const printReceipt = (row: SecurityDeposit) => {
    const collTx = row.transactions.find(t => t.type === 'Receipt' && t.voucherId)
    if (collTx && collTx.voucherId) {
      const vch = vouchers.find(v => v.id === collTx.voucherId)
      if (vch) {
        printVoucher(vch, accounts, currency, 'Properties Management')
      } else {
        setToast({ visible: true, message: 'Voucher not found in system records.', type: 'error' })
      }
    } else {
      setToast({ visible: true, message: 'No collection receipt voucher has been posted yet.', type: 'error' })
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
      key: 'propertyName',
      header: 'Property',
      sortable: true,
      render: row => {
        const lease = leaseMap.get(row.leaseId)
        const prop = properties.find(p => p.id === lease?.propertyId)
        return <span className="text-sm fw-500">{prop?.name || 'N/A'}</span>
      }
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
      render: row => <CurrencyText value={row.expectedAmount} currency={currency} />,
    },
    {
      key: 'receivedAmount',
      header: 'Collected',
      numeric: true,
      sortable: true,
      render: row => <CurrencyText value={row.receivedAmount} currency={currency} />,
    },
    {
      key: 'currentBalance',
      header: 'Held Liability',
      numeric: true,
      sortable: true,
      render: row => (
        <CurrencyText
          value={row.currentBalance}
          currency={currency}
          className="fw-600"
          style={row.currentBalance > 0 ? { color: '#10B981' } : undefined}
        />
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
      width: '80px',
      render: row => {
        const canAction = !mappingError
        return (
          <DepositActionsMenu
            row={row}
            canAction={canAction}
            onCollect={() => openWizard(row, 'Receive')}
            onRefund={() => openWizard(row, 'Refund')}
            onPartialRefund={() => openWizard(row, 'PartialRefund')}
            onForfeit={() => openWizard(row, 'Forfeit')}
            onCloseRecord={() => openWizard(row, 'Close')}
            onViewLedger={() => openWizard(row, 'History')}
            onPrintReceipt={() => printReceipt(row)}
            onDepositPDC={() => openWizard(row, 'DepositPDC')}
          />
        )
      },
    },
  ], [currency, mappingError, vouchers, leaseMap, properties])

  const statusOptions = ['All', 'Expected', 'Received', 'Held', 'Partially Refunded', 'Fully Refunded', 'Partially Forfeited', 'Fully Forfeited', 'Closed']

  const securityChequeLabel = useMemo(() => {
    if (!activeDeposit) return 'Security Cheque'
    const originalChequeTx = activeDeposit.transactions?.find((tx: any) => tx.type === 'Receipt' && tx.paymentMode === 'Security Cheque')
    if (originalChequeTx && originalChequeTx.paymentReference) {
      return `Security Cheque (${originalChequeTx.paymentReference})`
    }
    return 'Security Cheque'
  }, [activeDeposit])

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

        {/* Collapsible GL Account Mapping Card */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div 
            className="card-header" 
            onClick={() => setIsSettingsExpanded(!isSettingsExpanded)} 
            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span className="card-title">GL Chart of Accounts Settings Mappings</span>
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
              {isSettingsExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>
          {isSettingsExpanded && (
            <div className="card-body">
              <div className="form-row">
                <Select
                  label="Security Deposit Liability Account (GL Code)"
                  value={localMappings.liabilityAccountId}
                  onChange={e => setLocalMappings(prev => ({ ...prev, liabilityAccountId: e.target.value }))}
                  options={[
                    { value: '', label: '-- Select Liability Account --' },
                    ...liabilityAccounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))
                  ]}
                />
                <Select
                  label="Deposit Forfeiture Income Account (GL Code)"
                  value={localMappings.forfeitureIncomeAccountId}
                  onChange={e => setLocalMappings(prev => ({ ...prev, forfeitureIncomeAccountId: e.target.value }))}
                  options={[
                    { value: '', label: '-- Select Revenue Account --' },
                    ...revenueAccounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))
                  ]}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <Button variant="primary" size="sm" onClick={handleSaveMappings}>
                  Save Mappings
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* KPI Summaries Grid */}
        <div className="kpi-grid">
          <DepositKpiCard label="Expected" value={<CurrencyText value={kpiData.totalExpected} currency={currency} />} color="#3B82F6" />
          <DepositKpiCard label="Collected" value={<CurrencyText value={kpiData.totalReceived} currency={currency} />} color="#10B981" />
          <DepositKpiCard label="Held Liability" value={<CurrencyText value={kpiData.totalHeld} currency={currency} />} color="#059669" />
          <DepositKpiCard label="Refunded" value={<CurrencyText value={kpiData.totalRefunded} currency={currency} />} color="#F59E0B" />
        </div>

        {/* Grid Toolbar & List */}
        <div className="card" style={{ marginTop: 20 }}>
          <div 
            className="data-table-toolbar" 
            style={{ 
              display: 'flex', 
              gap: '16px', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              padding: '16px 20px',
              width: '100%'
            }}
          >
            <div 
              className="search-input-wrapper" 
              style={{ 
                flex: '1 1 70%', 
                minWidth: '320px', 
                position: 'relative', 
                display: 'flex', 
                alignItems: 'center' 
              }}
            >
              <span style={{ position: 'absolute', left: '16px', color: 'var(--text-secondary)', pointerEvents: 'none', zIndex: 10, display: 'flex', alignItems: 'center' }}>
                <SearchIcon />
              </span>
              <Input
                type="text"
                placeholder="Search by Lease No., Tenant or Property..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ 
                  width: '100%', 
                  paddingLeft: '44px', 
                  height: '44px', 
                  borderRadius: 'var(--radius-lg, 8px)',
                  margin: 0,
                }}
                className="search-input"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  style={{
                    position: 'absolute',
                    right: '16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                  aria-label="Clear search"
                >
                  <span style={{ display: 'flex', alignItems: 'center' }}><CloseIcon /></span>
                </button>
              )}
            </div>
            <div 
              className="filters-wrapper" 
              style={{ 
                flex: '1 1 25%', 
                display: 'flex', 
                gap: '16px', 
                alignItems: 'center', 
                flexWrap: 'wrap', 
                minWidth: '320px' 
              }}
            >
              <Select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                options={statusOptions.map(o => ({ value: o, label: o === 'All' ? 'All Statuses' : o }))}
                style={{ flex: '1 1 120px', marginBottom: 0 }}
              />
              <Select
                value={propertyFilter}
                onChange={e => setPropertyFilter(e.target.value)}
                options={[
                  { value: 'All', label: 'All Properties' },
                  ...properties.map(p => ({ value: p.id, label: p.name }))
                ]}
                style={{ flex: '1 1 140px', marginBottom: 0 }}
              />
              <Select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                options={[
                  { value: 'All', label: 'All Dates' },
                  { value: 'This Month', label: 'This Month' },
                  { value: 'This Year', label: 'This Year' },
                  { value: 'Last 30 Days', label: 'Last 30 Days' },
                  { value: 'Last 90 Days', label: 'Last 90 Days' }
                ]}
                style={{ flex: '1 1 120px', marginBottom: 0 }}
              />
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
            <input type="text" className="form-control" value={formatCurrency(enrichedDeposits.find(d => d.id === activeDeposit.id)?.outstandingAmount || 0, currency)} disabled />
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
              label="Payment Mode"
              value={formPaymentMode}
              onChange={e => setFormPaymentMode(e.target.value)}
              options={[
                { value: 'Security Cheque', label: securityChequeLabel },
                { value: 'Bank Transfer', label: 'Bank Transfer' },
                { value: 'Cash', label: 'Cash' }
              ]}
            />
          </div>
          {formPaymentMode === 'Bank Transfer' && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <Select
                label="Deposit Bank Account"
                value={selectedPropBankId}
                onChange={e => setSelectedPropBankId(e.target.value)}
                options={propAccounts.map(b => ({
                  value: b.id,
                  label: `${b.institution} (${b.currency})`
                }))}
                required
              />
            </div>
          )}
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input 
              label="Reference Number (optional)" 
              value={formPaymentReference} 
              onChange={e => setFormPaymentReference(e.target.value)} 
              placeholder="e.g. TXN-12345" 
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input
              label="Collection Notes"
              value={txNotes}
              onChange={e => setTxNotes(e.target.value)}
              placeholder="Collection description details..."
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
            <input type="text" className="form-control" value={formatCurrency(enrichedDeposits.find(d => d.id === activeDeposit.id)?.currentBalance || 0, currency)} disabled />
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
              label="Payment Mode"
              value={formPaymentMode}
              onChange={e => setFormPaymentMode(e.target.value)}
              options={[
                { value: 'Cash', label: 'Cash' },
                { value: 'Bank Transfer', label: 'Bank Transfer' },
                { value: 'Security Cheque', label: securityChequeLabel },
                { value: 'Post Dated Cheque (PDC)', label: 'Post Dated Cheque (PDC)' },
                { value: 'Online Transfer', label: 'Online Transfer' },
                { value: 'Card', label: 'Card' },
                { value: 'Other', label: 'Other' }
              ]}
            />
          </div>
          {formPaymentMode !== 'Cash' && formPaymentMode !== 'Security Cheque' && formPaymentMode !== 'Post Dated Cheque (PDC)' && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <Select
                label="Source Bank Account"
                value={selectedPropBankId}
                onChange={e => setSelectedPropBankId(e.target.value)}
                options={propAccounts.map(b => ({
                  value: b.id,
                  label: `${b.institution} (${b.currency})`
                }))}
                required
              />
            </div>
          )}
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input 
              label="Reference Number (optional)" 
              value={formPaymentReference} 
              onChange={e => setFormPaymentReference(e.target.value)} 
              placeholder="e.g. TXN-12345" 
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input
              label="Refund Notes"
              value={txNotes}
              onChange={e => setTxNotes(e.target.value)}
              placeholder="Refund comments..."
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
            <input type="text" className="form-control" value={formatCurrency(enrichedDeposits.find(d => d.id === activeDeposit.id)?.currentBalance || 0, currency)} disabled />
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
            <Select
              label="Payment Mode (optional)"
              value={formPaymentMode}
              onChange={e => setFormPaymentMode(e.target.value)}
              options={[
                { value: '', label: 'None' },
                { value: 'Cash', label: 'Cash' },
                { value: 'Bank Transfer', label: 'Bank Transfer' },
                { value: 'Security Cheque', label: securityChequeLabel },
                { value: 'Post Dated Cheque (PDC)', label: 'Post Dated Cheque (PDC)' },
                { value: 'Online Transfer', label: 'Online Transfer' },
                { value: 'Card', label: 'Card' },
                { value: 'Other', label: 'Other' }
              ]}
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input 
              label="Reference Number (optional)" 
              value={formPaymentReference} 
              onChange={e => setFormPaymentReference(e.target.value)} 
              placeholder="e.g. TXN-12345" 
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input
              label="Forfeit Notes / Reason"
              value={txNotes}
              onChange={e => setTxNotes(e.target.value)}
              placeholder="Maintenance charges offset, early termination penalty..."
            />
          </div>
          <div className="modal-actions" style={{ marginTop: 20 }}>
            <Button variant="secondary" onClick={closeWizard}>Cancel</Button>
            <Button variant="primary" onClick={handleForfeit}>Post Forfeiture Journal</Button>
          </div>
        </Modal>
      )}

      {/* Deposit PDC Cheque Wizard */}
      {activeAction === 'DepositPDC' && activeDeposit && (
        <Modal open={true} title="Deposit Security Deposit PDC Cheque" onClose={closeWizard}>
          <div className="form-group">
            <label className="form-label">Current Held Balance</label>
            <input type="text" className="form-control" value={formatCurrency(enrichedDeposits.find(d => d.id === activeDeposit.id)?.currentBalance || 0, currency)} disabled />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input
              label="Deposit Amount"
              type="number"
              value={txAmount}
              onChange={e => setTxAmount(e.target.value)}
              placeholder="e.g. 5000"
              required
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Select
              label="Deposit Into Bank Account *"
              value={selectedPropBankId}
              onChange={e => setSelectedPropBankId(e.target.value)}
              options={[
                { value: '', label: 'Select Bank Account' },
                ...propAccounts.map(ba => ({
                  value: ba.id,
                  label: ba.institution,
                })),
              ]}
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input
              label="Deposit Date"
              type="date"
              value={txDate}
              onChange={e => setTxDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input
              label="Reference Number (optional)"
              value={formPaymentReference}
              onChange={e => setFormPaymentReference(e.target.value)}
              placeholder="e.g. TXN-12345"
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input
              label="Notes (optional)"
              value={txNotes}
              onChange={e => setTxNotes(e.target.value)}
              placeholder="PDC deposited to bank"
            />
          </div>
          <div className="modal-actions" style={{ marginTop: 20 }}>
            <Button variant="secondary" onClick={closeWizard}>Cancel</Button>
            <Button variant="primary" onClick={handleDepositPDC}>Deposit PDC Cheque</Button>
          </div>
        </Modal>
      )}

      {/* Partial Refund Wizard Modal — compound entry: Dr 2120 / Cr Bank (refund) / Cr Damage Recovery (retained) */}
      {activeAction === 'PartialRefund' && activeDeposit && (
        <Modal open={true} title="Partial Security Deposit Refund with Retainment" onClose={closeWizard}>
          <div className="form-group">
            <label className="form-label">Current Held Balance</label>
            <input type="text" className="form-control" value={formatCurrency(enrichedDeposits.find(d => d.id === activeDeposit.id)?.currentBalance || 0, currency)} disabled />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input
              label="Amount to Refund to Tenant"
              type="number"
              value={txAmount}
              onChange={e => setTxAmount(e.target.value)}
              placeholder="e.g. 1500"
              required
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input
              label="Amount to Retain as Damage Recovery"
              type="number"
              value={txRetainedAmount}
              onChange={e => setTxRetainedAmount(e.target.value)}
              placeholder="e.g. 500"
              required
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input
              label="Transaction Date"
              type="date"
              value={txDate}
              onChange={e => setTxDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Select
              label="Payment Mode"
              value={formPaymentMode}
              onChange={e => setFormPaymentMode(e.target.value)}
              options={[
                { value: 'Cash', label: 'Cash' },
                { value: 'Bank Transfer', label: 'Bank Transfer' },
                { value: 'Security Cheque', label: securityChequeLabel },
                { value: 'Post Dated Cheque (PDC)', label: 'Post Dated Cheque (PDC)' },
                { value: 'Online Transfer', label: 'Online Transfer' },
                { value: 'Card', label: 'Card' },
                { value: 'Other', label: 'Other' }
              ]}
            />
          </div>
          {formPaymentMode !== 'Cash' && formPaymentMode !== 'Security Cheque' && formPaymentMode !== 'Post Dated Cheque (PDC)' && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <Select
                label="Refund Bank Account"
                value={selectedPropBankId}
                onChange={e => setSelectedPropBankId(e.target.value)}
                options={propAccounts.map(b => ({
                  value: b.id,
                  label: `${b.institution} (${b.currency})`
                }))}
                required
              />
            </div>
          )}
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input 
              label="Reference Number (optional)" 
              value={formPaymentReference} 
              onChange={e => setFormPaymentReference(e.target.value)} 
              placeholder="e.g. TXN-12345" 
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <Input
              label="Notes"
              value={txNotes}
              onChange={e => setTxNotes(e.target.value)}
              placeholder="Damage description, reason for retainment..."
            />
          </div>
          <div className="modal-actions" style={{ marginTop: 20 }}>
            <Button variant="secondary" onClick={closeWizard}>Cancel</Button>
            <Button variant="primary" onClick={handlePartialRefund}>Post Compound Journal</Button>
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
                      <td style={{ textAlign: 'right' }}>
                        <CurrencyText value={tx.amount} currency={currency} />
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
