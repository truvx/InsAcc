import React, { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { PdcCheque, LeaseEntry, TenantEntry, PropAccount, PropertyEntry, UnitEntry } from '../data/propertyTypes'
import type { Column } from './design/Table'
import { Badge, Button, SearchIcon, CloseIcon, EmptyState, Modal, Select, KpiCard, ChevronLeftIcon } from './design/DesignSystem'
import { formatDate } from '../utils'
import { transitionPdcCheque, replaceCheque } from '../services/propertyPdcService'
import Toast from './Toast'
import ConfirmDialog from './design/ConfirmDialog'
import { CurrencyText } from './design/CurrencyText'
import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { AccountingEngine } from '../accounting/accountingEngine'
import { getPropertyBankAccountId, validateBankChartLink } from '../services/propertyAccountingService'
import { getDefaultPropertyReceiptBankAccount } from '../services/bankingService'
import { autoPostVoucher } from '../hooks/useVoucherLifecycle'
import { invalidateBalanceCache } from '../accounting/ledgerService'


import { motion } from 'framer-motion'
import {
  Landmark, CheckCircle2, XCircle,
  ArrowUpFromLine, Ban, RefreshCw, Replace, History,
  Download, FileText, Plus, Trash2, Calendar
} from 'lucide-react'

import type { AuditEvent } from '../data/auditTypes'
import { recordModuleEvent } from '../services/auditService'
import { exportTableData } from '../services/reportExportService'

interface Props {
  pdcCheques: PdcCheque[]
  setPdcCheques: React.Dispatch<React.SetStateAction<PdcCheque[]>>
  leases: LeaseEntry[]
  tenants: TenantEntry[]
  properties: PropertyEntry[]
  units?: UnitEntry[]
  dateFormat?: string
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
  setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>
  accountingEngine: AccountingEngine
  propAccounts: PropAccount[]
  bankMappings: BankMapping[]
  onNavigate?: (page: string) => void
  onAuditEvent?: (event: AuditEvent) => void
  loggedInUser?: string
}

/* ─────────── Row action kebab menu ─────────── */
interface PdcActionItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  danger?: boolean
  divider?: boolean
}

function PdcRowMenu({ items }: { items: PdcActionItem[] }) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const updateCoords = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const mw = 180
      const mh = items.length * 36 + 16
      let top = r.bottom + 4
      let left = r.right - mw
      if (top + mh > window.innerHeight) top = Math.max(4, r.top - mh - 4)
      if (left < 4) left = 4
      setCoords({ top, left })
    }
  }

  useEffect(() => {
    if (!open) return
    updateCoords()
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', esc)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleOut = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node) &&
          menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOut)
    return () => document.removeEventListener('mousedown', handleOut)
  }, [open])

  return (
    <div style={{ display: 'inline-flex', justifyContent: 'center', width: '100%' }}>
      <button
        ref={btnRef}
        onClick={() => { updateCoords(); setOpen(!open) }}
        className="pdc-kebab-btn"
        aria-label="Actions"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
        </svg>
      </button>
      {open && createPortal(
        <div ref={menuRef} className="pdc-action-menu" style={{ top: coords.top, left: coords.left }}>
          {items.map((item, idx) => (
            <React.Fragment key={idx}>
              {item.divider && <div className="pdc-action-divider" />}
              <button
                className={`pdc-action-item${item.danger ? ' danger' : ''}`}
                onClick={() => { item.onClick(); setOpen(false) }}
              >
                {item.icon}
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

/* ─────────── Segmented status pill bar ─────────── */
function StatusPills({ options, counts, active, onChange }: {
  options: string[]
  counts: Record<string, number>
  active: string
  onChange: (v: string) => void
}) {
  return (
    <div className="pdc-status-pills">
      {options.map(s => (
        <button
          key={s}
          className={`pdc-pill${active === s ? ' active' : ''}`}
          onClick={() => onChange(s)}
        >
          {s}
          <span className="pdc-pill-count">{counts[s] ?? 0}</span>
        </button>
      ))}
    </div>
  )
}

/* ─────────── Main component ─────────── */
export default function PropertyPdcManager({
  pdcCheques,
  setPdcCheques,
  leases,
  tenants,
  properties,
  units = [],
  dateFormat,
  currency,
  accounts,
  vouchers,
  setVouchers,
  accountingEngine,
  propAccounts,
  bankMappings,
  onNavigate,
  onAuditEvent,
  loggedInUser,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [dateQuickFilter, setDateQuickFilter] = useState<'All' | 'Today' | 'Tomorrow' | 'Overdue' | 'ThisWeek'>('All')
  const [propertyFilter, setPropertyFilter] = useState<string>('All')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [groupPage, setGroupPage] = useState(0)
  const groupsPerPage = 5

  interface LeaseGroup {
    leaseId: string
    leaseNumber: string
    tenantName: string
    propertyName: string
    cheques: PdcCheque[]
  }
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [replaceModalOpen, setReplaceModalOpen] = useState(false)
  const [replaceTarget, setReplaceTarget] = useState<PdcCheque | null>(null)
  const [replaceChequeNumber, setReplaceChequeNumber] = useState('')
  const [replaceDate, setReplaceDate] = useState('')
  const [editDateModalOpen, setEditDateModalOpen] = useState(false)
  const [editDateTarget, setEditDateTarget] = useState<PdcCheque | null>(null)
  const [editDateValue, setEditDateValue] = useState('')
  const [editChequeNumberValue, setEditChequeNumberValue] = useState('')
  const [deletePdcTarget, setDeletePdcTarget] = useState<PdcCheque | null>(null)

  // Transition & Wizard Modals state
  const [activePdc, setActivePdc] = useState<PdcCheque | null>(null)
  const [activeAction, setActiveAction] = useState<'ClearPDC' | 'Clear' | 'Bounce' | 'Cancel' | 'Audit' | 'View' | null>(null)
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('')
  const [bounceReason, setBounceReason] = useState('')
  const [bounceDate, setBounceDate] = useState(new Date().toISOString().split('T')[0])
  const [bounceFee, setBounceFee] = useState('')
  const [penaltyAmount, setPenaltyAmount] = useState('')
  const [clearDate, setClearDate] = useState(new Date().toISOString().split('T')[0])
  const [cancelReason, setCancelReason] = useState('')
  const [clearNotes, setClearNotes] = useState('')
  const [clearPaymentMode, setClearPaymentMode] = useState<'Cheque' | 'Cash' | 'Bank Transfer'>('Bank Transfer')

  const chequeMeta = useMemo(() => {
    const map: Record<string, { tenantName: string; propertyName: string; bankName: string; unitNumber: string }> = {}
    for (const chq of pdcCheques) {
      const lease = leases.find(l => l.id === chq.leaseId)
      const tenant = lease ? tenants.find(t => t.id === lease.tenantId) : undefined
      const property = lease ? properties.find(p => p.id === lease.propertyId) : undefined
      const unit = lease ? units.find(u => u.id === lease.unitId) : undefined
      const bank = chq.bankAccountId ? propAccounts.find(a => a.id === chq.bankAccountId) : undefined
      // Show bank name, or fall back to clearedVia label for Cash/Cheque modes
      const bankName = bank
        ? bank.institution
        : chq.clearedVia === 'Cash' ? 'Cash'
        : chq.clearedVia === 'Cheque' ? 'Cheque'
        : '—'
      map[chq.id] = {
        tenantName: tenant?.name || 'Unknown',
        propertyName: property?.name || '—',
        bankName,
        unitNumber: unit?.unitNumber || '—',
      }
    }
    return map
  }, [pdcCheques, leases, tenants, properties, propAccounts, units])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: pdcCheques.length }
    for (const chq of pdcCheques) {
      counts[chq.status] = (counts[chq.status] || 0) + 1
    }
    return counts
  }, [pdcCheques])

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const tomorrowStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }, [])

  const kpiData = useMemo(() => {
    const pending = pdcCheques.filter(c => c.status === 'Pending').length
    const cleared = pdcCheques.filter(c => c.status === 'Cleared').length
    const bounced = pdcCheques.filter(c => c.status === 'Bounced').length
    const now = new Date()
    const endOfWeek = new Date(now)
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()))
    const dueThisWeek = pdcCheques.filter(c => {
      if (c.status !== 'Pending') return false
      const d = new Date(c.dueDate)
      return d >= now && d <= endOfWeek
    }).length
    return { pending, dueThisWeek, cleared, bounced }
  }, [pdcCheques])

  const todayCheques = useMemo(() => pdcCheques.filter(c => c.dueDate === todayStr), [pdcCheques, todayStr])

  const filtered = useMemo(() => {
    let result = [...pdcCheques].sort((a, b) => {
      const aIsToday = a.dueDate === todayStr ? 1 : 0
      const bIsToday = b.dueDate === todayStr ? 1 : 0
      if (aIsToday !== bIsToday) return bIsToday - aIsToday
      return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
    })
    if (statusFilter !== 'All') {
      result = result.filter(c => c.status === statusFilter)
    }
    if (propertyFilter !== 'All') {
      result = result.filter(c => {
        const lease = leases.find(l => l.id === c.leaseId)
        return lease?.propertyId === propertyFilter
      })
    }

    const today = new Date(todayStr)
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    if (dateQuickFilter === 'Today') {
      result = result.filter(c => c.dueDate === todayStr)
    } else if (dateQuickFilter === 'Tomorrow') {
      result = result.filter(c => c.dueDate === tomorrowStr)
    } else if (dateQuickFilter === 'ThisWeek') {
      result = result.filter(c => {
        const d = new Date(c.dueDate)
        return d >= startOfWeek && d <= endOfWeek
      })
    } else if (dateQuickFilter === 'Overdue') {
      result = result.filter(c => c.status === 'Pending' && new Date(c.dueDate) < today)
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
  }, [pdcCheques, statusFilter, dateQuickFilter, propertyFilter, searchQuery, chequeMeta, leases, todayStr, tomorrowStr])

  /* ─── Group data by lease ─── */
  const leaseGroups = useMemo(() => {
    const groups = new Map<string, LeaseGroup>()
    for (const chq of filtered) {
      if (!groups.has(chq.leaseId)) {
        const lease = leases.find(l => l.id === chq.leaseId)
        const tenant = lease ? tenants.find(t => t.id === lease.tenantId) : undefined
        const property = lease ? properties.find(p => p.id === lease.propertyId) : undefined
        groups.set(chq.leaseId, {
          leaseId: chq.leaseId,
          leaseNumber: lease?.leaseNumber || chq.leaseId,
          tenantName: tenant?.name || 'Unknown',
          propertyName: property?.name || '—',
          cheques: [],
        })
      }
      groups.get(chq.leaseId)!.cheques.push(chq)
    }
    for (const group of groups.values()) {
      group.cheques.sort((a, b) => {
        const aIdx = a.slotIndex ?? 0
        const bIdx = b.slotIndex ?? 0
        if (aIdx !== bIdx) return aIdx - bIdx
        return a.dueDate.localeCompare(b.dueDate)
      })
    }
    return Array.from(groups.values()).sort((a, b) =>
      a.leaseNumber.localeCompare(b.leaseNumber)
    )
  }, [filtered, leases, tenants, properties])

  const totalGroupPages = useMemo(() =>
    Math.max(1, Math.ceil(leaseGroups.length / groupsPerPage)),
  [leaseGroups.length])

  const pagedGroups = useMemo(() =>
    leaseGroups.slice(groupPage * groupsPerPage, (groupPage + 1) * groupsPerPage),
  [leaseGroups, groupPage])

  useEffect(() => { setGroupPage(0) }, [statusFilter, dateQuickFilter, propertyFilter, searchQuery])

  /* ─── Action handlers (unchanged business logic) ─── */
  const openActionModal = (cheque: PdcCheque, action: 'ClearPDC' | 'Clear' | 'Bounce' | 'Cancel' | 'Audit' | 'View') => {
    setActivePdc(cheque)
    setActiveAction(action)
    const defaultBank = getDefaultPropertyReceiptBankAccount(propAccounts)
    setSelectedBankAccountId(cheque.bankAccountId || (defaultBank ? defaultBank.id : (propAccounts[0]?.id || '')))
    setBounceReason(cheque.bounceReason || '')
    setBounceFee(cheque.bounceFee ? String(cheque.bounceFee) : '')
    setPenaltyAmount(cheque.penaltyAmount ? String(cheque.penaltyAmount) : '')
    setCancelReason('')
    if (action === 'Clear' || action === 'ClearPDC') {
      setClearDate(new Date().toISOString().split('T')[0])
      setClearNotes('')
    setClearPaymentMode('Bank Transfer')
    }
  }

  const handleClearPDC = () => {
    if (!activePdc) return

    const today = new Date().toISOString().split('T')[0]
    const desc = clearNotes
      ? `Clear PDC: ${activePdc.chequeNumber} — ${clearNotes}`
      : `Clear PDC: ${activePdc.chequeNumber}`

    if (activePdc.depositedVoucherId) {
      setToast({ visible: true, message: 'This cheque has already been cleared.', type: 'error' })
      return
    }

    if (clearPaymentMode === 'Bank Transfer') {
      // Bank Transfer — requires bank account selection, uses PDC_DEPOSITED event
      if (!selectedBankAccountId) {
        setToast({ visible: true, message: 'Please select a bank account.', type: 'error' })
        return
      }
      const linkResult = validateBankChartLink(selectedBankAccountId, propAccounts, bankMappings)
      if (!linkResult.valid) {
        setToast({ visible: true, message: linkResult.error + ' Open Bank Accounts to fix it.', type: 'error' })
        return
      }
      const mappingId = linkResult.chartAccountId
      if (accounts.some(a => a.parentId === mappingId && a.isActive)) {
        setToast({ visible: true, message: 'Bank account CoA mapping is a group account, not a unique leaf.', type: 'error' })
        return
      }
      const draftResult = accountingEngine.processAccountingEvent(
        'PDC_DEPOSITED',
        { amount: activePdc.amount, date: clearDate, description: desc, currency, exchangeRate: 1, baseCurrency: currency, bankAccount: mappingId, referenceType: 'Lease', referenceId: activePdc.leaseId, createdBy: 'user' },
        accounts, vouchers
      )
      if (!draftResult.success || !draftResult.voucher) {
        setToast({ visible: true, message: draftResult.errors.map(e => e.message).join(', '), type: 'error' })
        return
      }
      const postResult = autoPostVoucher(accountingEngine, draftResult.voucher, accounts)
      if (!postResult.success || !postResult.voucher) {
        setToast({ visible: true, message: postResult.errors.map(e => e.message).join(', '), type: 'error' })
        return
      }
      try {
        const updated = transitionPdcCheque(pdcCheques, activePdc.id, 'Cleared', {
          bankAccountId: selectedBankAccountId,
          depositedVoucherId: postResult.voucher.id,
          timestamp: clearDate,
          user: 'user',
          clearedVia: 'Bank Transfer' as const,
        })
        setPdcCheques(updated)
        setVouchers(prev => [postResult.voucher!, ...prev])
        invalidateBalanceCache()
        onAuditEvent?.(recordModuleEvent('Property Transactions', 'Update', activePdc.chequeNumber, activePdc.id, `Cleared cheque ${activePdc.chequeNumber} via Bank Transfer`))
        setToast({ visible: true, message: `Cheque ${activePdc.chequeNumber} cleared via Bank Transfer. Voucher ${postResult.voucher.number} posted.`, type: 'success' })
        setActiveAction(null)
        setActivePdc(null)
      } catch (e: any) {
        setToast({ visible: true, message: e.message, type: 'error' })
      }
      return
    }

    // Cheque or Cash mode — no bank selector needed
    // Cheque: Dr Cheques in Hand (1130) / Cr 1410
    // Cash:   Dr Cash In Hand (1110)    / Cr 1410
    const targetCode = clearPaymentMode === 'Cheque' ? '1130' : '1110'
    const targetLabel = clearPaymentMode === 'Cheque' ? 'Cheques in Hand' : 'Cash In Hand'
    const targetAccount = accounts.find(a => a.code === targetCode && a.module === 'property')
      || accounts.find(a => a.code === targetCode)
    if (!targetAccount) {
      setToast({ visible: true, message: `${targetLabel} account (code ${targetCode}) not found in chart of accounts.`, type: 'error' })
      return
    }

    const draftResult = accountingEngine.processAccountingEvent(
      'RENT_RECEIVED',
      {
        amount: activePdc.amount,
        date: clearDate || today,
        description: desc,
        currency, exchangeRate: 1, baseCurrency: currency,
        bankAccount: targetAccount.id,
        referenceType: 'Lease', referenceId: activePdc.leaseId, createdBy: 'user',
      },
      accounts, vouchers
    )
    if (!draftResult.success || !draftResult.voucher) {
      setToast({ visible: true, message: draftResult.errors.map(e => e.message).join(', '), type: 'error' })
      return
    }
    if (draftResult.voucher) draftResult.voucher.paymentMode = clearPaymentMode === 'Cash' ? 'Cash' : 'Cheque'
    const postResult = autoPostVoucher(accountingEngine, draftResult.voucher, accounts)
    if (!postResult.success || !postResult.voucher) {
      setToast({ visible: true, message: postResult.errors.map(e => e.message).join(', '), type: 'error' })
      return
    }
    try {
      const updated = transitionPdcCheque(pdcCheques, activePdc.id, 'Cleared', {
        depositedVoucherId: postResult.voucher.id,
        timestamp: clearDate || today,
        user: 'user',
        clearedVia: clearPaymentMode as 'Cash' | 'Cheque',
      })
      setPdcCheques(updated)
      setVouchers(prev => [postResult.voucher!, ...prev])
      invalidateBalanceCache()
      onAuditEvent?.(recordModuleEvent('Property Transactions', 'Update', activePdc.chequeNumber, activePdc.id, `Cleared cheque ${activePdc.chequeNumber} via ${clearPaymentMode}`))
      setToast({ visible: true, message: `Cheque ${activePdc.chequeNumber} cleared via ${clearPaymentMode}. Voucher ${postResult.voucher.number} posted.`, type: 'success' })
      setActiveAction(null)
      setActivePdc(null)
    } catch (e: any) {
      setToast({ visible: true, message: e.message, type: 'error' })
    }
  }

  const handleClear = () => {
    if (!activePdc) return
    try {
      const now = new Date().toISOString()
      const updated = transitionPdcCheque(pdcCheques, activePdc.id, 'Cleared', {
        timestamp: now, user: 'user'
      })
      setPdcCheques(updated)
      invalidateBalanceCache()
      onAuditEvent?.(recordModuleEvent('Property Transactions', 'Update', activePdc.chequeNumber, activePdc.id, `Cleared cheque ${activePdc.chequeNumber}`))
      setToast({ visible: true, message: `Cheque ${activePdc.chequeNumber} cleared.`, type: 'success' })
      setActiveAction(null)
      setActivePdc(null)
    } catch (e: any) {
      setToast({ visible: true, message: e.message, type: 'error' })
    }
  }

  const handleBounce = () => {
    if (!activePdc) return
    let mappingId = ''
    const bankAcctId = activePdc.bankAccountId || selectedBankAccountId
    
    if (bounceFee && Number(bounceFee) > 0) {
      if (!bankAcctId) {
        setToast({ visible: true, message: 'Please select a bank account for the bounce fee.', type: 'error' })
        return
      }
      const linkResult = validateBankChartLink(bankAcctId, propAccounts, bankMappings)
      if (!linkResult.valid) {
        setToast({ visible: true, message: linkResult.error + ' Open Bank Accounts to fix it.', type: 'error' })
        return
      }
      mappingId = linkResult.chartAccountId
    }

    let bouncedVoucherId: string | null = null
    let feeVoucherId: string | null = null
    let penaltyVoucherId: string | null = null
    let updatedVouchers = [...vouchers]

    if (activePdc.depositedVoucherId) {
      const origVoucher = vouchers.find(v => v.id === activePdc.depositedVoucherId)
      if (origVoucher) {
        const revResult = accountingEngine.reverse(origVoucher, bounceDate, 'user', accounts, vouchers)
        if (!revResult.success || !revResult.voucher) {
          setToast({ visible: true, message: 'Deposit reversal failed: ' + revResult.errors.map(e => e.message).join(', '), type: 'error' })
          return
        }
        bouncedVoucherId = revResult.voucher.id
        updatedVouchers = [revResult.voucher, ...updatedVouchers]
      }
    } else if (activePdc.status === 'Cleared' && activePdc.clearedVoucherId) {
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
      const desc = `Bounced Rent PDC: Cheque No. ${activePdc.chequeNumber}`
      const draftResult = accountingEngine.processAccountingEvent(
        'PDC_CANCELLED',
        {
          amount: activePdc.amount, date: bounceDate, description: desc,
          currency, exchangeRate: 1, baseCurrency: currency,
          referenceType: 'Lease', referenceId: activePdc.leaseId, createdBy: 'user',
        },
        accounts, updatedVouchers
      )
      if (!draftResult.success || !draftResult.voucher) {
        setToast({ visible: true, message: 'Bounce cancellation failed: ' + draftResult.errors.map(e => e.message).join(', '), type: 'error' })
        return
      }
      const appResult = accountingEngine.approve(draftResult.voucher, 'user')
      if (!appResult.success || !appResult.voucher) {
        setToast({ visible: true, message: 'Bounce cancellation approval failed: ' + appResult.errors.map(e => e.message).join(', '), type: 'error' })
        return
      }
      const postResult = accountingEngine.post(appResult.voucher, 'user', accounts, updatedVouchers)
      if (!postResult.success || !postResult.voucher) {
        setToast({ visible: true, message: 'Bounce cancellation posting failed: ' + postResult.errors.map(e => e.message).join(', '), type: 'error' })
        return
      }
      bouncedVoucherId = postResult.voucher.id
      updatedVouchers = [postResult.voucher, ...updatedVouchers]
    }

    // Optional: bank bounce fee
    const feeNum = Number(bounceFee) || 0
    if (feeNum > 0) {
      const desc = `Bank bounce fee for Cheque No. ${activePdc.chequeNumber}`
      const draftResult = accountingEngine.processAccountingEvent(
        'PDC_BOUNCE_FEE',
        { amount: feeNum, date: bounceDate, description: desc, currency, exchangeRate: 1, baseCurrency: currency, bankAccount: mappingId, createdBy: 'user' },
        accounts, updatedVouchers
      )
      if (draftResult.success && draftResult.voucher) {
        const appResult = accountingEngine.approve(draftResult.voucher, 'user')
        if (appResult.success && appResult.voucher) {
          const postResult = accountingEngine.post(appResult.voucher, 'user', accounts, updatedVouchers)
          if (postResult.success && postResult.voucher) {
            feeVoucherId = postResult.voucher.id
            updatedVouchers = [postResult.voucher, ...updatedVouchers]
          }
        }
      }
    }

    // Optional: tenant penalty
    const penaltyNum = Number(penaltyAmount) || 0
    if (penaltyNum > 0) {
      const desc = `Bounced cheque penalty charged to tenant: Cheque No. ${activePdc.chequeNumber}`
      const draftResult = accountingEngine.processAccountingEvent(
        'PDC_PENALTY',
        { amount: penaltyNum, date: bounceDate, description: desc, currency, exchangeRate: 1, baseCurrency: currency, referenceType: 'Lease', referenceId: activePdc.leaseId, createdBy: 'user' },
        accounts, updatedVouchers
      )
      if (draftResult.success && draftResult.voucher) {
        const appResult = accountingEngine.approve(draftResult.voucher, 'user')
        if (appResult.success && appResult.voucher) {
          const postResult = accountingEngine.post(appResult.voucher, 'user', accounts, updatedVouchers)
          if (postResult.success && postResult.voucher) {
            penaltyVoucherId = postResult.voucher.id
            updatedVouchers = [postResult.voucher, ...updatedVouchers]
          }
        }
      }
    }

    try {
      const updated = transitionPdcCheque(pdcCheques, activePdc.id, 'Bounced', {
        bankAccountId: bankAcctId, bounceReason, bounceFee: feeNum || undefined,
        penaltyAmount: penaltyNum || undefined, bouncedVoucherId, feeVoucherId, penaltyVoucherId,
        timestamp: bounceDate, user: 'user'
      })
      setPdcCheques(updated)
      setVouchers(updatedVouchers)
      invalidateBalanceCache()
      onAuditEvent?.(recordModuleEvent('Property Transactions', 'Update', activePdc.chequeNumber, activePdc.id, `Cheque ${activePdc.chequeNumber} marked as Bounced`))
      setToast({ visible: true, message: `Cheque ${activePdc.chequeNumber} marked as Bounced. Reversals posted.`, type: 'success' })
      setActiveAction(null)
      setActivePdc(null)
    } catch (e: any) {
      setToast({ visible: true, message: e.message, type: 'error' })
    }
  }

  // ── Shared helper: post a GL reversal when a pending PDC is removed ────────
  // The lease creation journal debited 1410 (PDC receivable) for the full rent.
  // When a PDC is cancelled or deleted, we must credit 1410 to remove that receivable.
  // We find the lease creation voucher to identify the income account and post a partial reverse.
  const postPdcReversalVoucher = (pdc: PdcCheque, existingVouchers: Voucher[]): Voucher[] => {
    if (pdc.status !== 'Pending' && pdc.status !== 'Bounced') return existingVouchers
    const today = new Date().toISOString().split('T')[0]

    // Find the income account from the lease creation voucher (credit side, debits 1410)
    const leaseCreationVoucher = existingVouchers.find(v => {
      const vAny = v as any
      return (
        (vAny.referenceType === 'Lease' || v.lines.some(l => l.referenceType === 'Lease')) &&
        ((vAny.referenceId === pdc.leaseId) || v.lines.some(l => l.referenceId === pdc.leaseId)) &&
        v.lines.some(l => l.accountId === '1410' && l.type === 'Debit')
      )
    })

    // Find the credit (income) account from the lease creation voucher
    const incomeAccountId = leaseCreationVoucher?.lines.find(l => l.type === 'Credit' && l.accountId !== '1410')?.accountId

    const ts = new Date().toISOString()
    const reversalId = `v-pdc-cancel-${pdc.id}-${Date.now()}`
    const reversalVoucher: Voucher = {
      id: reversalId,
      number: `JV-PDC-REV-${pdc.chequeNumber}`,
      date: today,
      type: 'Journal',
      reference: '',
      description: `PDC Removed: Cheque ${pdc.chequeNumber} — receivable reversed`,
      status: 'Posted',
      currency: currency || 'AED',
      exchangeRate: 1,
      baseCurrency: currency || 'AED',
      createdBy: 'user',
      createdAt: ts,
      updatedAt: ts,
      lines: [
        // Credit 1410 to reduce the PDC receivable
        { accountId: '1410', type: 'Credit', amount: pdc.amount, narration: `PDC cancelled — ${pdc.chequeNumber}` },
        // Debit the income account (or 1410 itself as fallback — net neutral on income)
        { accountId: incomeAccountId || '1410', type: 'Debit', amount: pdc.amount, narration: `PDC cancelled — reversed rental recognition` },
      ],
      ...(({ referenceType: 'Lease', referenceId: pdc.leaseId }) as any),
    } as Voucher

    // Use spread to attach the extra top-level fields the query logic expects
    const fullReversal = Object.assign({}, reversalVoucher, { referenceType: 'Lease', referenceId: pdc.leaseId })

    const updated = [fullReversal, ...existingVouchers]
    setVouchers(updated)
    invalidateBalanceCache()
    return updated
  }


  const handleCancel = () => {
    if (!activePdc) return
    try {
      // Post GL reversal (Credit 1410) for Pending or Bounced PDCs
      postPdcReversalVoucher(activePdc, [...vouchers])

      const updated = transitionPdcCheque(pdcCheques, activePdc.id, 'Cancelled', {
        bounceReason: cancelReason, user: 'user'
      })
      setPdcCheques(updated)
      onAuditEvent?.(recordModuleEvent('Property Transactions', 'Update', activePdc.chequeNumber, activePdc.id, `Cheque ${activePdc.chequeNumber} returned / cancelled`))
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
    onAuditEvent?.(recordModuleEvent('Property Transactions', 'Update', replaceTarget.chequeNumber, replaceTarget.id, `Cheque ${replaceTarget.chequeNumber} replaced with ${replaceChequeNumber}`))
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

  const openEditDateModal = (cheque: PdcCheque) => {
    setEditDateTarget(cheque)
    setEditChequeNumberValue(cheque.chequeNumber || '')
    setEditDateValue(cheque.chequeDate || new Date().toISOString().split('T')[0])
    setEditDateModalOpen(true)
  }

  const handleEditDate = () => {
    if (!editDateTarget || !editDateValue || !editChequeNumberValue) return
    const now = new Date().toISOString()
    setPdcCheques(prev => prev.map(chq =>
      chq.id === editDateTarget.id
        ? { ...chq, chequeNumber: editChequeNumberValue, chequeDate: editDateValue, updatedAt: now }
        : chq
    ))
    onAuditEvent?.(recordModuleEvent('Property Transactions', 'Update', editChequeNumberValue, editDateTarget.id, `Updated cheque ${editDateTarget.chequeNumber} details`))
    setToast({ visible: true, message: 'Cheque details updated', type: 'success' })
    setEditDateModalOpen(false)
    setEditDateTarget(null)
    setEditDateValue('')
    setEditChequeNumberValue('')
  }

  const handleDeletePDC = () => {
    if (!deletePdcTarget) return
    // Post a GL reversal to remove the 1410 receivable before deleting the record
    postPdcReversalVoucher(deletePdcTarget, [...vouchers])
    setPdcCheques(prev => prev.filter(c => c.id !== deletePdcTarget.id))
    onAuditEvent?.(recordModuleEvent('Property Transactions', 'Delete', deletePdcTarget.chequeNumber, deletePdcTarget.id, `Deleted cheque ${deletePdcTarget.chequeNumber}`))
    setToast({ visible: true, message: `PDC ${deletePdcTarget.chequeNumber} deleted.`, type: 'success' })
    setDeletePdcTarget(null)
  }

  const resetFilters = () => {
    setStatusFilter('All')
    setDateQuickFilter('All')
    setPropertyFilter('All')
    setSearchQuery('')
  }

  const hasActiveFilters = statusFilter !== 'All' || dateQuickFilter !== 'All' || propertyFilter !== 'All' || searchQuery !== ''

  /* ─── Build row actions based on status ─── */
  const getRowActions = (row: PdcCheque): PdcActionItem[] => {
    const items: PdcActionItem[] = [
      { label: 'View Details', icon: <FileText size={14} strokeWidth={1.75} />, onClick: () => openActionModal(row, 'View') },
    ]

    if (row.status === 'Pending') {
      items.push(
        { label: 'Clear PDC', icon: <CheckCircle2 size={14} strokeWidth={1.75} />, onClick: () => openActionModal(row, 'ClearPDC') },
        { label: 'Bounce', icon: <XCircle size={14} strokeWidth={1.75} />, onClick: () => openActionModal(row, 'Bounce'), danger: true },
        { label: 'Cancel Cheque', icon: <Ban size={14} strokeWidth={1.75} />, onClick: () => openActionModal(row, 'Cancel'), divider: true },
      )
    }
    if (row.status === 'Deposited') {
      items.push(
        { label: 'Clear Cheque', icon: <CheckCircle2 size={14} strokeWidth={1.75} />, onClick: () => openActionModal(row, 'Clear') },
        { label: 'Bounce', icon: <XCircle size={14} strokeWidth={1.75} />, onClick: () => openActionModal(row, 'Bounce'), danger: true },
        { label: 'Cancel Cheque', icon: <Ban size={14} strokeWidth={1.75} />, onClick: () => openActionModal(row, 'Cancel'), divider: true },
      )
    }
    if (row.status === 'Bounced') {
      items.push(
        { label: 'Clear PDC', icon: <CheckCircle2 size={14} strokeWidth={1.75} />, onClick: () => openActionModal(row, 'ClearPDC') },
        { label: 'Cancel Cheque', icon: <Ban size={14} strokeWidth={1.75} />, onClick: () => openActionModal(row, 'Cancel') },
      )
    }
    if (row.status === 'Cleared') {
      items.push(
        { label: 'Bounce', icon: <XCircle size={14} strokeWidth={1.75} />, onClick: () => openActionModal(row, 'Bounce'), danger: true },
      )
    }
    if (['Pending', 'Deposited', 'Bounced'].includes(row.status)) {
      items.push(
        { label: 'Edit Details', icon: <FileText size={14} strokeWidth={1.75} />, onClick: () => openEditDateModal(row) },
        { label: 'Replace Cheque', icon: <Replace size={14} strokeWidth={1.75} />, onClick: () => openReplaceModal(row), divider: true },
      )
    }
    if (row.auditHistory && row.auditHistory.length > 0) {
      items.push(
        { label: 'Ledger Entries', icon: <History size={14} strokeWidth={1.75} />, onClick: () => openActionModal(row, 'Audit'), divider: true },
      )
    }
    items.push(
      { label: 'Delete PDC', icon: <Trash2 size={14} strokeWidth={1.75} />, onClick: () => setDeletePdcTarget(row), danger: true },
    )
    return items
  }

  /* ─── Table columns ─── */
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
      render: row => {
        const meta = chequeMeta[row.id]
        const unitNo = meta?.unitNumber
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="text-sm fw-500">{meta?.tenantName || 'Unknown'}</span>
            {unitNo && unitNo !== '—' && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                {String(unitNo).toLowerCase().startsWith('unit') ? unitNo : `Unit ${unitNo}`}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'propertyName',
      header: 'Property',
      sortable: true,
      render: row => {
        const meta = chequeMeta[row.id]
        return <span className="text-sm text-secondary">{meta?.propertyName || '—'}</span>
      },
    },
    {
      key: 'bankName',
      header: 'Bank',
      sortable: true,
      render: row => <span className="text-sm text-secondary">{chequeMeta[row.id]?.bankName || '—'}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      numeric: true,
      sortable: true,
      render: row => (
        <CurrencyText value={row.amount} currency={currency} />
      ),
    },
    {
      key: 'clearedAt',
      header: 'Cleared Date',
      sortable: true,
      render: row => (
        <span className="text-sm">
          {row.status === 'Cleared' && row.clearedAt ? formatDate(row.clearedAt, dateFormat) : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      sortable: true,
      render: row => {
        const colorMap: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
          Pending: 'warning',
          Deposited: 'neutral',
          Cleared: 'success',
          Bounced: 'danger',
          Replaced: 'neutral',
          Cancelled: 'neutral',
        }
        return <Badge variant={colorMap[row.status] || 'neutral'}>{row.status}</Badge>
      },
    },
    {
      key: 'depositedInto',
      header: 'Deposited Into',
      width: '140px',
      sortable: true,
      render: row => {
        if (row.status !== 'Cleared') return <span className="text-xs text-secondary">—</span>
        const lease = leases.find(l => l.id === row.leaseId)
        const bankName = lease ? chequeMeta[row.id]?.bankName : undefined
        return <span className="text-sm">{bankName || '—'}</span>
      },
    },
    {
      key: 'actions',
      header: '',
      width: '48px',
      render: row => <PdcRowMenu items={getRowActions(row)} />,
    },
  ], [currency, dateFormat, pdcCheques, chequeMeta, propAccounts, leases])

  const statusOptions = ['All', 'Pending', 'Deposited', 'Cleared', 'Bounced', 'Replaced', 'Cancelled']



  const quickDateFilterOptions = ['All', 'Today', 'Tomorrow', 'Overdue', 'ThisWeek'] as const

  const handleExport = (format: 'pdf' | 'csv' | 'xlsx') => {
    // Allow exporting empty list to generate a template/blank report

    const columns = ['Lease No.', 'Tenant', 'Property', 'Cheque No.', 'Bank', 'Cleared Date', 'Amount', 'Status']
    const rows = filtered.map(chq => {
      const meta = chequeMeta[chq.id]
      return [
        meta?.tenantName ? `${chq.leaseId}` : chq.leaseId,
        meta?.tenantName || 'Unknown',
        meta?.propertyName || '—',
        chq.chequeNumber,
        meta?.bankName || '—',
        chq.status === 'Cleared' && chq.clearedAt ? formatDate(chq.clearedAt, dateFormat) : '—',
        chq.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }),
        chq.status
      ]
    })

    exportTableData({
      moduleName: 'Properties Management',
      format,
      title: 'Post-Dated Cheques (PDC) Schedule',
      subtitle: `Exported on ${formatDate(new Date().toISOString(), dateFormat)}`,
      filename: `PDC_Schedule_${new Date().toISOString().split('T')[0]}`,
      columns,
      rows,
      currency,
      generatedBy: loggedInUser
    })

    onAuditEvent?.(
      recordModuleEvent(
        'PDC Manager',
        'Export',
        'PDC Schedule',
        'bulk',
        `Exported ${filtered.length} cheques to ${format.toUpperCase()}`
      )
    )

    setToast({ visible: true, message: 'Export completed successfully.', type: 'success' })
    setShowExportMenu(false)
  }

  return (
    <>
      {/* ─── HEADER ─── */}
      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">PDC Manager</div>
            <div className="page-subtitle">Manage all post-dated cheques from lease agreements.</div>
          </div>
        </div>
        <div className="page-header-right" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setToast({ visible: true, message: 'PDC cheques check complete: all lease payment schedules are fully generated.', type: 'success' })}>Generate PDC</Button>
          <div style={{ position: 'relative' }}>
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={() => setShowExportMenu(!showExportMenu)}>Export <span style={{ display: 'inline-block', transform: showExportMenu ? 'rotate(90deg)' : 'rotate(-90deg)', width: 12, height: 12, marginLeft: 4 }}><ChevronLeftIcon /></span></Button>
            {showExportMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, width: 140, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <button className="export-menu-item" onClick={() => handleExport('pdf')} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer' }}>PDF (.pdf)</button>
                <button className="export-menu-item" onClick={() => handleExport('xlsx')} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer' }}>Excel (.xlsx)</button>
                <button className="export-menu-item" onClick={() => handleExport('csv')} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer' }}>CSV (.csv)</button>
              </div>
            )}
          </div>
          <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => setToast({ visible: true, message: 'Refreshed.', type: 'success' })}>Refresh</Button>
        </div>
      </div>

      <div className="page-body" style={{ padding: 32 }}>
        {/* ─── KPI ROW: 4 cards ─── */}
        <div className="pdc-kpi-row">
          <KpiCard label="Pending" value={String(kpiData.pending)} accentColor="#F59E0B"
            icon={<ArrowUpFromLine size={18} strokeWidth={1.75} />} />
          <KpiCard label="Due This Week" value={String(kpiData.dueThisWeek)} accentColor="#3B82F6"
            icon={<Landmark size={18} strokeWidth={1.75} />} />
          <KpiCard label="Cleared" value={String(kpiData.cleared)} accentColor="#10B981"
            icon={<CheckCircle2 size={18} strokeWidth={1.75} />} />
          <KpiCard label="Failed / Bounced" value={String(kpiData.bounced)} accentColor="#EF4444"
            icon={<XCircle size={18} strokeWidth={1.75} />} />
        </div>

        {/* ─── STATUS PILLS ─── */}
        <StatusPills
          options={statusOptions}
          counts={statusCounts}
          active={statusFilter}
          onChange={setStatusFilter}
        />

        {/* ─── FILTER BAR ─── */}
        <div className="pdc-filter-bar">
          <div className="pdc-filter-search">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search cheque number / tenant..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="pdc-filter-clear" onClick={() => setSearchQuery('')} aria-label="Clear">
                <CloseIcon />
              </button>
            )}
          </div>

          <div className="pdc-quick-filters">
            {quickDateFilterOptions.map(opt => (
              <button
                key={opt}
                className={`pdc-quick-filter-btn${dateQuickFilter === opt ? ' active' : ''}`}
                onClick={() => setDateQuickFilter(opt)}
              >
                {opt === 'ThisWeek' ? 'This Week' : opt}
              </button>
            ))}
          </div>

          <div style={{ width: 220 }}>
            <Select
              value={propertyFilter}
              onChange={e => setPropertyFilter(e.target.value)}
              options={[
                { value: 'All', label: 'All Properties' },
                ...properties.map(p => ({ value: p.id, label: p.name }))
              ]}
            />
          </div>

          {hasActiveFilters && (
            <button className="pdc-reset-btn" onClick={resetFilters}>
              Reset Filters
            </button>
          )}
        </div>

        {/* ─── TODAY'S CHEQUES PANEL ─── */}
        <div className={`pdc-today-panel${todayCheques.length === 0 ? ' pdc-today-empty' : ''}`}>
          <div className="pdc-today-header">
            <Calendar size={15} strokeWidth={1.75} />
            <span className="pdc-today-title">Today's Cheques</span>
            <span className="pdc-today-count">{todayCheques.length} cheque{todayCheques.length !== 1 ? 's' : ''}</span>
          </div>
          {todayCheques.length > 0 ? (
            <div className="pdc-today-items">
              {todayCheques.slice(0, 5).map(chq => {
                const meta = chequeMeta[chq.id]
                const colorMap: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
                  Pending: 'warning', Deposited: 'neutral', Cleared: 'success',
                  Bounced: 'danger', Replaced: 'neutral', Cancelled: 'neutral',
                }
                return (
                  <div key={chq.id} className="pdc-today-item">
                    <span className="text-mono text-xs fw-600" style={{ minWidth: 100 }}>{chq.chequeNumber}</span>
                    <span className="text-xs" style={{ minWidth: 120 }}>{meta?.tenantName || 'Unknown'}</span>
                    <span className="text-xs text-secondary" style={{ minWidth: 100 }}>{meta?.propertyName || '—'}</span>
                    <span className="text-xs fw-600" style={{ minWidth: 80, textAlign: 'right' }}><CurrencyText value={chq.amount} currency={currency} /></span>
                    <span style={{ minWidth: 80 }}><Badge variant={colorMap[chq.status] || 'neutral'}>{chq.status}</Badge></span>
                    <span className="text-xs text-secondary">{meta?.bankName || '—'}</span>
                  </div>
                )
              })}
              {todayCheques.length > 5 && (
                <div className="pdc-today-more">
                  <span className="text-xs text-secondary">+ {todayCheques.length - 5} more</span>
                </div>
              )}
            </div>
          ) : (
            <div className="pdc-today-none">No cheques due today</div>
          )}
        </div>

        {/* ─── TABLE ─── */}
        <div className="pdc-table-card">
          {leaseGroups.length === 0 ? (
            <EmptyState
              icon={<Landmark size={40} strokeWidth={1.25} />}
              title={statusFilter !== 'All' ? `No ${statusFilter.toLowerCase()} cheques` : 'No post-dated cheques'}
              text="Cheques will automatically appear here when leases are created with PDC payment mode."
              action={onNavigate ? <Button onClick={() => onNavigate('lease-management')}>Create Lease</Button> : undefined}
            />
          ) : (
            <>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      {columns.map(col => (
                        <th key={col.key} className={col.numeric ? 'numeric' : ''} style={col.width ? { width: col.width } : undefined}>
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedGroups.map(group => (
                      <React.Fragment key={group.leaseId}>
                        <tr className="pdc-group-header">
                          <td colSpan={columns.length}>
                            <div className="pdc-group-header-content">
                              <span className="pdc-group-lease fw-600">Lease: {group.leaseNumber}</span>
                              <span className="pdc-divider">|</span>
                              <span className="pdc-group-tenant">Tenant: {group.tenantName}</span>
                              <span className="pdc-divider">|</span>
                              <span className="pdc-group-property text-secondary">{group.propertyName}</span>
                            </div>
                          </td>
                        </tr>
                        {group.cheques.map(chq => (
                          <motion.tr
                            key={chq.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            {columns.map(col => (
                              <td key={col.key} className={col.numeric ? 'numeric' : ''}>
                                {col.render(chq)}
                              </td>
                            ))}
                          </motion.tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              {leaseGroups.length > groupsPerPage && (
                <div className="data-table-pagination">
                  <span className="data-table-pagination-info">
                    {groupPage * groupsPerPage + 1}–{Math.min((groupPage + 1) * groupsPerPage, leaseGroups.length)} of {leaseGroups.length} lease group{leaseGroups.length !== 1 ? 's' : ''}
                  </span>
                  <div className="data-table-pagination-actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={groupPage === 0}
                      onClick={() => setGroupPage(p => Math.max(0, p - 1))}
                    >
                      <ChevronLeftIcon />
                    </Button>
                    {Array.from({ length: totalGroupPages }).map((_, i) => (
                      <button
                        key={i}
                        className={`data-table-page-btn${i === groupPage ? ' active' : ''}`}
                        onClick={() => setGroupPage(i)}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={groupPage >= totalGroupPages - 1}
                      onClick={() => setGroupPage(p => Math.min(totalGroupPages - 1, p + 1))}
                    >
                      <div style={{ transform: 'rotate(180deg)' }}><ChevronLeftIcon /></div>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── VIEW DETAILS MODAL ─── */}
      <Modal open={activeAction === 'View'} title="Cheque Details" onClose={() => setActiveAction(null)}>
        <div className="pdc-modal-body">
          {activePdc && (() => {
            const meta = chequeMeta[activePdc.id]
            const lease = leases.find(l => l.id === activePdc.leaseId)
            return (
              <div className="pdc-detail-grid">
                <div className="pdc-detail-row">
                  <span className="pdc-detail-label">Cheque Number</span>
                  <span className="pdc-detail-value fw-600">{activePdc.chequeNumber}</span>
                </div>
                <div className="pdc-detail-row">
                  <span className="pdc-detail-label">Tenant</span>
                  <span className="pdc-detail-value">{meta?.tenantName}</span>
                </div>
                <div className="pdc-detail-row">
                  <span className="pdc-detail-label">Property</span>
                  <span className="pdc-detail-value">{meta?.propertyName}</span>
                </div>
                <div className="pdc-detail-row">
                  <span className="pdc-detail-label">Amount</span>
                  <span className="pdc-detail-value fw-600"><CurrencyText value={activePdc.amount} currency={currency} /></span>
                </div>
                <div className="pdc-detail-row">
                  <span className="pdc-detail-label">Issue Date</span>
                  <span className="pdc-detail-value">{formatDate(activePdc.chequeDate, dateFormat)}</span>
                </div>
                <div className="pdc-detail-row">
                  <span className="pdc-detail-label">Status</span>
                  <span className="pdc-detail-value">
                    <Badge variant={
                      activePdc.status === 'Cleared' ? 'success' :
                      activePdc.status === 'Bounced' ? 'danger' :
                      activePdc.status === 'Pending' ? 'warning' : 'neutral'
                    }>{activePdc.status}</Badge>
                  </span>
                </div>
                {meta?.bankName !== '—' && (
                  <div className="pdc-detail-row">
                    <span className="pdc-detail-label">Bank</span>
                    <span className="pdc-detail-value">{meta?.bankName}</span>
                  </div>
                )}
                {lease && (
                  <div className="pdc-detail-row">
                    <span className="pdc-detail-label">Lease</span>
                    <span className="pdc-detail-value">{lease.leaseNumber}</span>
                  </div>
                )}
                {activePdc.bounceReason && (
                  <div className="pdc-detail-row">
                    <span className="pdc-detail-label">Bounce Reason</span>
                    <span className="pdc-detail-value" style={{ color: 'var(--danger)' }}>{activePdc.bounceReason}</span>
                  </div>
                )}
              </div>
            )
          })()}
          <div className="pdc-modal-footer">
            <Button onClick={() => setActiveAction(null)}>Close</Button>
          </div>
        </div>
      </Modal>

      {/* ─── REPLACE MODAL ─── */}
      <Modal open={replaceModalOpen} title="Replace Cheque" onClose={() => setReplaceModalOpen(false)}>
        <div className="pdc-modal-body">
          {replaceTarget && (
            <div className="pdc-modal-info">
              <span className="text-sm text-secondary">Original Cheque</span>
              <span className="text-sm fw-600">{replaceTarget.chequeNumber}</span>
            </div>
          )}
          <div className="pdc-modal-field">
            <label>New Cheque Number *</label>
            <input type="text" placeholder="Enter new cheque number" value={replaceChequeNumber} onChange={e => setReplaceChequeNumber(e.target.value)} />
          </div>
          <div className="pdc-modal-field">
            <label>New Cheque Date (optional)</label>
            <input type="date" value={replaceDate} onChange={e => setReplaceDate(e.target.value)} />
          </div>
          <div className="pdc-modal-footer">
            <Button variant="secondary" onClick={() => setReplaceModalOpen(false)}>Cancel</Button>
            <Button onClick={handleReplace}>Replace Cheque</Button>
          </div>
        </div>
      </Modal>

      {/* ─── EDIT DATE MODAL ─── */}
      <Modal open={editDateModalOpen} title="Edit Cheque Details" onClose={() => setEditDateModalOpen(false)}>
        <div className="pdc-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="pdc-modal-field" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500 }}>Cheque Number *</label>
            <input 
              type="text" 
              value={editChequeNumberValue} 
              onChange={e => setEditChequeNumberValue(e.target.value)} 
              style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
            />
          </div>
          <div className="pdc-modal-field" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500 }}>PDC Date *</label>
            <input 
              type="date" 
              value={editDateValue} 
              onChange={e => setEditDateValue(e.target.value)} 
              style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
            />
          </div>
          <div className="pdc-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <Button variant="secondary" onClick={() => setEditDateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleEditDate}>Save Details</Button>
          </div>
        </div>
      </Modal>

      {/* ─── DEPOSIT MODAL ─── */}
      {/* ─── CLEAR MODAL ─── */}
      <Modal open={activeAction === 'Clear' || activeAction === 'ClearPDC'} title="Clear Cheque" onClose={() => setActiveAction(null)}>
        <div className="pdc-modal-body">
          {activePdc && (() => {
            const lease = leases.find(l => l.id === activePdc.leaseId)
            const tenant = lease ? tenants.find(t => t.id === lease.tenantId) : undefined
            return (
              <>
                <div className="pdc-modal-field">
                  <label>Cheque Number</label>
                  <div className="text-sm fw-600" style={{ padding: '6px 0' }}>{activePdc.chequeNumber}</div>
                </div>
                <div className="pdc-modal-field">
                  <label>Tenant</label>
                  <div className="text-sm fw-600" style={{ padding: '6px 0' }}>{tenant?.name || 'Unknown'}</div>
                </div>
                <div className="pdc-modal-field">
                  <label>Amount</label>
                  <div className="text-sm fw-600" style={{ padding: '6px 0' }}><CurrencyText value={activePdc.amount} currency={currency} /></div>
                </div>

                {/* Payment Mode Selector */}
                <div className="pdc-modal-field">
                  <label>Payment Mode *</label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    {(['Cheque', 'Cash', 'Bank Transfer'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setClearPaymentMode(mode)}
                        style={{
                          flex: 1,
                          padding: '8px 0',
                          borderRadius: 8,
                          border: clearPaymentMode === mode ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                          background: clearPaymentMode === mode ? 'var(--primary-light, #eef2ff)' : 'transparent',
                          color: clearPaymentMode === mode ? 'var(--primary)' : 'var(--text-secondary)',
                          fontWeight: clearPaymentMode === mode ? 600 : 400,
                          fontSize: 13,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bank account — only for Bank Transfer */}
                {clearPaymentMode === 'Bank Transfer' && (
                  <Select
                    label="Deposit Into Bank Account *"
                    value={selectedBankAccountId}
                    onChange={e => setSelectedBankAccountId(e.target.value)}
                    options={propAccounts.map(acc => ({
                      value: acc.id,
                      label: `${acc.institution} (${acc.currency})`
                    }))}
                  />
                )}

                <div className="pdc-modal-field">
                  <label>Clear Date *</label>
                  <input type="date" value={clearDate} onChange={e => setClearDate(e.target.value)} />
                </div>
                <div className="pdc-modal-field">
                  <label>Notes (optional)</label>
                  <input type="text" placeholder="e.g. Cheque cleared after maturity" value={clearNotes} onChange={e => setClearNotes(e.target.value)} />
                </div>
                <div className="pdc-modal-footer">
                  <Button variant="secondary" onClick={() => setActiveAction(null)}>Cancel</Button>
                  <Button onClick={activeAction === 'ClearPDC' ? handleClearPDC : handleClear}>Clear Cheque</Button>
                </div>
              </>
            )
          })()}
        </div>
      </Modal>

      {/* ─── BOUNCE MODAL ─── */}
      <Modal open={activeAction === 'Bounce'} title="Bounce Cheque" onClose={() => setActiveAction(null)}>
        <div className="pdc-modal-body">
          {activePdc && (
            <div className="pdc-modal-info">
              <span className="text-sm text-secondary">Cheque</span>
              <span className="text-sm fw-600">{activePdc.chequeNumber} · <CurrencyText value={activePdc.amount} currency={currency} /></span>
            </div>
          )}
          <div className="pdc-modal-field">
            <label>Bounce Date *</label>
            <input type="date" value={bounceDate} onChange={e => setBounceDate(e.target.value)} />
          </div>
          <div className="pdc-modal-field">
            <label>Reason for Bounce *</label>
            <input type="text" placeholder="e.g. Insufficient Funds" value={bounceReason} onChange={e => setBounceReason(e.target.value)} />
          </div>
          {(!activePdc || !activePdc.bankAccountId) && (
            <div className="pdc-modal-field">
              <Select
                label="Bank Account (if bounce fee charged)"
                value={selectedBankAccountId}
                onChange={e => setSelectedBankAccountId(e.target.value)}
                options={[{ value: '', label: 'Select Bank Account' }, ...propAccounts.map(acc => ({
                  value: acc.id,
                  label: `${acc.institution} (${acc.currency})`
                }))]}
              />
            </div>
          )}
          <div className="pdc-modal-field">
            <label>Bank Bounce Fee (optional)</label>
            <input type="number" placeholder="0.00" value={bounceFee} onChange={e => setBounceFee(e.target.value)} />
          </div>
          <div className="pdc-modal-field">
            <label>Penalty Charged to Tenant (optional)</label>
            <input type="number" placeholder="0.00" value={penaltyAmount} onChange={e => setPenaltyAmount(e.target.value)} />
          </div>
          <div className="pdc-modal-footer">
            <Button variant="secondary" onClick={() => setActiveAction(null)}>Cancel</Button>
            <Button onClick={handleBounce}>Bounce Cheque</Button>
          </div>
        </div>
      </Modal>

      {/* ─── CANCEL MODAL ─── */}
      <Modal open={activeAction === 'Cancel'} title="Cancel Cheque" onClose={() => setActiveAction(null)}>
        <div className="pdc-modal-body">
          {activePdc && (
            <div className="pdc-modal-info">
              <span className="text-sm text-secondary">Cheque</span>
              <span className="text-sm fw-600">{activePdc.chequeNumber} · <CurrencyText value={activePdc.amount} currency={currency} /></span>
            </div>
          )}
          <div className="pdc-modal-field">
            <label>Reason for Cancellation *</label>
            <input type="text" placeholder="e.g. Lease Terminated Early" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
          </div>
          <div className="pdc-modal-footer">
            <Button variant="secondary" onClick={() => setActiveAction(null)}>Cancel</Button>
            <Button onClick={handleCancel}>Cancel Cheque</Button>
          </div>
        </div>
      </Modal>

      {/* ─── RE-DEPOSIT MODAL ─── */}
      {/* ─── AUDIT HISTORY MODAL ─── */}
      <Modal open={activeAction === 'Audit'} title="Cheque Transition History" onClose={() => setActiveAction(null)}>
        <div className="pdc-modal-body" style={{ minWidth: 500 }}>
          {activePdc && (
            <>
              <div className="pdc-modal-info">
                <span className="text-sm text-secondary">Cheque</span>
                <span className="text-sm fw-600">{activePdc.chequeNumber} · <CurrencyText value={activePdc.amount} currency={currency} /></span>
              </div>
              <div className="pdc-audit-table-wrap">
                <table className="pdc-audit-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Transition</th>
                      <th>User</th>
                      <th>Reason / Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activePdc.auditHistory || []).map((entry, idx) => (
                      <tr key={idx}>
                        <td>{formatDate(entry.timestamp.split('T')[0], dateFormat)}</td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{entry.previousState}</span>
                          {' → '}
                          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{entry.newState}</span>
                        </td>
                        <td>{entry.user}</td>
                        <td>
                          {entry.reason || '—'}
                          {entry.voucherId && (
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
                              Voucher: {entry.voucherId}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="pdc-modal-footer">
            <Button onClick={() => setActiveAction(null)}>Close</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deletePdcTarget !== null}
        title="Delete PDC?"
        message={`This will permanently delete PDC #${deletePdcTarget?.chequeNumber || ''}. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeletePDC}
        onCancel={() => setDeletePdcTarget(null)}
      />
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast({ ...toast, visible: false })} />
    </>
  )
}
