import React, { useState, useMemo } from 'react'
import type { LeaseEntry, TenantEntry, UnitEntry, PropertyEntry, PdcCheque, SecurityDeposit, SecurityDepositGlMappings, PropAccount } from '../data/propertyTypes'
import type { Account, Voucher, BankMapping, PostingResult } from '../accounting/types'
import type { AccountingEngine } from '../accounting/accountingEngine'
import { PropertyAccountingService } from '../accounting/propertyAccountingService'
import { Badge, Button, PlusIcon, Input, Select, Modal, SearchIcon, CloseIcon, EditIcon, TrashIcon, EmptyState, KpiCard } from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
import { formatDate } from '../utils'
import { LEASE_STATUS_OPTIONS, MODE_OF_PAYMENT_OPTIONS, PDC_MODE } from '../data/propertyTypes'

import { getChequesByLease, generatePdcSlots } from '../services/propertyPdcService'
import { deleteLeaseCascade, type DeleteLeaseCascadeResult } from '../services/leaseDeletionService'
import { getAccountBalance, invalidateBalanceCache } from '../accounting/ledgerService'
import { SystemAccountRegistry } from '../accounting/systemAccountRegistry'
import { autoPostVoucher } from '../hooks/useVoucherLifecycle'
import { computeDepositBalances, createInitialDeposit, addDepositTransaction } from '../services/propertyDepositService'
import { getPropertyBankAccountId } from '../services/propertyAccountingService'
import { getDefaultPropertyReceiptBankAccount, getDefaultPropertyPaymentBankAccount } from '../services/bankingService'
import VoucherTimeline from './VoucherTimeline'
import AccountDrillDown from './AccountDrillDown'
import Toast from './Toast'
import ConfirmDialog from './design/ConfirmDialog'
import { CurrencyText } from './design/CurrencyText'

interface Props {
  currency?: string
  dateFormat?: string
  language?: string
  leases: LeaseEntry[]
  setLeases: React.Dispatch<React.SetStateAction<LeaseEntry[]>>
  tenants: TenantEntry[]
  properties: PropertyEntry[]
  units: UnitEntry[]
  setUnits?: React.Dispatch<React.SetStateAction<UnitEntry[]>>
  pdcCheques: PdcCheque[]
  setPdcCheques: React.Dispatch<React.SetStateAction<PdcCheque[]>>
  accounts?: Account[]
  vouchers?: Voucher[]
  setVouchers?: React.Dispatch<React.SetStateAction<Voucher[]>>
  securityDeposits?: SecurityDeposit[]
  setSecurityDeposits?: React.Dispatch<React.SetStateAction<SecurityDeposit[]>>
  accountingEngine?: AccountingEngine
  propAccounts?: PropAccount[]
  bankMappings?: BankMapping[]
  depositMappings?: SecurityDepositGlMappings
  onNavigate?: (page: string) => void
}

// ── Reusable Component: LeaseKPIs ─────────────────────────────────────────────
interface KPIsProps {
  leases: LeaseEntry[]
  units: UnitEntry[]
  securityDeposits: SecurityDeposit[]
  currency: string
  accounts?: Account[]
  vouchers?: Voucher[]
}
function LeaseKPIs({ leases, units, securityDeposits, currency, accounts, vouchers }: KPIsProps) {
  const activeCount = leases.filter(l => l.status === 'Active').length
  const vacantCount = units.filter(u => u.status === 'Vacant').length
  
  // Contract Rental Value: sum of annual rent for all active leases
  const contractValue = leases.filter(l => l.status === 'Active').reduce((sum, l) => sum + (l.annualRent || 0), 0)

  // Deposits held: derived from accounting ledger (account 2120) — not from lease records
  const depositsHeld = accounts && vouchers
    ? getAccountBalance('2120', vouchers, accounts)
    : 0

  // Monthly Rental Income: sum of active lease monthly rents
  const monthlyIncome = leases.filter(l => l.status === 'Active').reduce((sum, l) => sum + (l.monthlyRent || 0), 0)

  const fmt = (n: number) => <CurrencyText value={n} currency={currency} />

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
      <KpiCard label="Active Leases" value={String(activeCount)} accentColor="#3B82F6" />
      <KpiCard label="Vacant Units" value={String(vacantCount)} accentColor="#10B981" />
      <KpiCard label="Contract Rental Value" value={fmt(contractValue)} accentColor="#F59E0B" />
      <KpiCard label="Deposits Held" value={fmt(depositsHeld)} accentColor="#6B5B95" />
      <KpiCard label="Monthly Rent Income" value={fmt(monthlyIncome)} accentColor="#10B981" />
    </div>
  )
}

// ── Reusable Component: LeaseFilters ──────────────────────────────────────────
interface FiltersProps {
  properties: PropertyEntry[]
  units: UnitEntry[]
  tenants: TenantEntry[]
  selectedProperty: string
  setSelectedProperty: (v: string) => void
  selectedFloor: string
  setSelectedFloor: (v: string) => void
  selectedUnit: string
  setSelectedUnit: (v: string) => void
  selectedTenant: string
  setSelectedTenant: (v: string) => void
  selectedStatus: string
  setSelectedStatus: (v: string) => void
  selectedPayMode: string
  setSelectedPayMode: (v: string) => void
  selectedExpiry: string
  setSelectedExpiry: (v: string) => void
}
function LeaseFilters({
  properties, units, tenants,
  selectedProperty, setSelectedProperty,
  selectedFloor, setSelectedFloor,
  selectedUnit, setSelectedUnit,
  selectedTenant, setSelectedTenant,
  selectedStatus, setSelectedStatus,
  selectedPayMode, setSelectedPayMode,
  selectedExpiry, setSelectedExpiry,
}: FiltersProps) {

  const uniqueFloors = useMemo(() => {
    const list = units
      .filter(u => !selectedProperty || u.propertyId === selectedProperty)
      .map(u => u.floor)
      .filter((v, i, a) => v && a.indexOf(v) === i)
    return list.sort()
  }, [units, selectedProperty])

  const filteredUnits = useMemo(() => {
    return units.filter(u => {
      if (selectedProperty && u.propertyId !== selectedProperty) return false
      if (selectedFloor && u.floor !== selectedFloor) return false
      return true
    })
  }, [units, selectedProperty, selectedFloor])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, padding: 16, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 20, alignItems: 'end' }}>
      <Select
        label="Property"
        value={selectedProperty}
        onChange={e => { setSelectedProperty(e.target.value); setSelectedFloor(''); setSelectedUnit('') }}
        options={[{ value: '', label: 'All Properties' }, ...properties.map(p => ({ value: p.id, label: p.name }))]}
      />
      <Select
        label="Floor"
        value={selectedFloor}
        onChange={e => { setSelectedFloor(e.target.value); setSelectedUnit('') }}
        options={[
          { value: '', label: 'All Floors' },
          ...uniqueFloors.map(f => ({
            value: f,
            label: f.toLowerCase().includes('parking') ? f : `Floor ${f}`
          }))
        ]}
      />
      <Select
        label="Unit"
        value={selectedUnit}
        onChange={e => setSelectedUnit(e.target.value)}
        options={[{ value: '', label: 'All Units' }, ...filteredUnits.map(u => ({ value: u.id, label: u.unitNumber }))]}
      />
      <Select
        label="Tenant"
        value={selectedTenant}
        onChange={e => setSelectedTenant(e.target.value)}
        options={[{ value: '', label: 'All Tenants' }, ...tenants.map(t => ({ value: t.id, label: t.name }))]}
      />
      <Select
        label="Status"
        value={selectedStatus}
        onChange={e => setSelectedStatus(e.target.value)}
        options={[
          { value: 'All', label: 'All Statuses' },
          { value: 'Active', label: 'Active' },
          { value: 'Draft', label: 'Draft' },
          { value: 'Expired', label: 'Expired' },
          { value: 'Terminated', label: 'Terminated' }
        ]}
      />
      <Select
        label="Payment Mode"
        value={selectedPayMode}
        onChange={e => setSelectedPayMode(e.target.value)}
        options={[{ value: '', label: 'All Modes' }, ...MODE_OF_PAYMENT_OPTIONS.map(o => ({ value: o.value, label: o.label }))]}
      />

      <Select
        label="Expiry Filter"
        value={selectedExpiry}
        onChange={e => setSelectedExpiry(e.target.value)}
        options={[
          { value: '', label: 'No Filter' },
          { value: 'Expiring30', label: 'Expiring in 30 Days' },
          { value: 'Expired', label: 'Expired' }
        ]}
      />
    </div>
  )
}

// ── Reusable Component: TenantCard ────────────────────────────────────────────
interface TenantCardProps {
  tenant: TenantEntry | null
}
function TenantCard({ tenant }: TenantCardProps) {
  if (!tenant) return <div className="text-secondary text-xs">No tenant details linked.</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Email Address</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{tenant.email || '—'}</div>
      </div>
      <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Emergency Contact</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          {tenant.emergencyContact ? `${tenant.emergencyContact} (${tenant.emergencyPhone || 'no phone'})` : '—'}
        </div>
      </div>
    </div>
  )
}

// ── Reusable Component: LeaseCard ─────────────────────────────────────────────
interface LeaseCardProps {
  lease: LeaseEntry
  property: PropertyEntry | null
  unit: UnitEntry | null
  dateFormat: string
  currency: string
}
const formatUnitNumber = (num?: any) => {
  if (num === null || num === undefined) return '—'
  const str = String(num).trim()
  if (!str) return '—'
  return str.toLowerCase().startsWith('unit') ? str : `Unit ${str}`
}
function LeaseCard({ lease, property, unit, dateFormat, currency }: LeaseCardProps) {
  const fmtVal = (n: number) => <CurrencyText value={n} currency={currency} />
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Property / Building</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{property?.name || '—'}</div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Unit / Floor</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{formatUnitNumber(unit?.unitNumber)} (Floor {unit?.floor || '—'})</div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Lease Period</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          {formatDate(lease.startDate, dateFormat)} to {formatDate(lease.endDate, dateFormat)}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Mode of Payment</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          {lease.modeOfPayment
            ? (lease.modeOfPayment === PDC_MODE
                ? `PDC (${lease.pdcCount} Cheques)`
                : lease.modeOfPayment)
            : (typeof lease.paymentFrequency === 'string'
                ? `${lease.paymentFrequency} (${lease.pdcCount} Cheques)`
                : lease.paymentFrequency === 12 ? 'Monthly (12 Cheques)'
                : lease.paymentFrequency === 6  ? 'Semi-Annual (6 Cheques)'
                : lease.paymentFrequency === 4  ? 'Quarterly (4 Cheques)'
                : `${lease.paymentFrequency} Cheques`)}
        </div>

      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Monthly Rental</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{fmtVal(lease.monthlyRent)}</div>
      </div>
      {lease.notes && (
        <div style={{ gridColumn: 'span 2', borderTop: '1px dashed var(--border)', paddingTop: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Notes</div>
          <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{lease.notes}</div>
        </div>
      )}
    </div>
  )
}

// ── Reusable Component: LeaseSummaryPanel ──────────────────────────────────────
interface SummaryProps {
  financials: any
  cheques: PdcCheque[]
  depositBalances: any
  currency: string
}
function LeaseSummaryPanel({ financials, cheques, depositBalances, currency }: SummaryProps) {
  const fmt = (n: number) => <CurrencyText value={n} currency={currency} />

  // PDC summary counts
  const totalPdcs = cheques.length
  const clearedPdcs = cheques.filter(c => c.status === 'Cleared').length
  const bouncedPdcs = cheques.filter(c => c.status === 'Bounced').length
  const pendingPdcs = cheques.filter(c => c.status === 'Pending' || c.status === 'Deposited').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--primary)' }}>Rental Collection Summary</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total Annual Rent:</span>
            <span style={{ fontWeight: 600 }}>{fmt(financials?.annualRent || 0)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Already Received:</span>
            <span style={{ fontWeight: 600, color: 'var(--success)' }}>{fmt(financials?.collectedRent || 0)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Remaining Rent:</span>
            <span style={{ fontWeight: 600, color: (financials?.outstandingRent || 0) > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>{fmt(financials?.outstandingRent || 0)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px dashed var(--border)', paddingTop: 4 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Paid %:</span>
            <span style={{ fontWeight: 600 }}>{(financials?.paidPercent || 0)}%</span>
          </div>
        </div>
      </div>

      <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--primary)' }}>Security Deposit Status</div>
        {depositBalances ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Expected Amount:</span>
              <span style={{ fontWeight: 600 }}>{fmt(depositBalances.expectedAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Received / Cleared:</span>
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>{fmt(depositBalances.receivedAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Refunded:</span>
              <span style={{ fontWeight: 600, color: 'var(--danger)' }}>{fmt(depositBalances.refundedAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px dashed var(--border)', paddingTop: 4 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Held Balance:</span>
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{fmt(depositBalances.currentBalance)}</span>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>No deposits processed.</div>
        )}
      </div>

      <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--primary)' }}>Post-Dated Cheques Progress</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Total Cheques: </span>
            <span style={{ fontWeight: 600 }}>{totalPdcs}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Pending: </span>
            <span style={{ fontWeight: 600, color: 'var(--warning)' }}>{pendingPdcs}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Cleared: </span>
            <span style={{ fontWeight: 600, color: 'var(--success)' }}>{clearedPdcs}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Bounced: </span>
            <span style={{ fontWeight: 600, color: 'var(--danger)' }}>{bouncedPdcs}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page Component: LeaseManagementPage ──────────────────────────────────
export default function PropertyLeases({
  currency = 'AED', dateFormat = 'DD/MM/YYYY', language = 'English',
  leases, setLeases, tenants, properties, units, setUnits,
  pdcCheques, setPdcCheques, accounts = [], vouchers = [], setVouchers,
  securityDeposits = [], setSecurityDeposits, accountingEngine, propAccounts = [],
  bankMappings = [], depositMappings, onNavigate,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Collapse state for lease details view (expanded row)
  const [expandedLeaseId, setExpandedLeaseId] = useState<string | null>(null)
  
  // Form and modals details
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [deleteTarget, setDeleteTarget] = useState<LeaseEntry | null>(null)

  // Filters State
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('')
  const [selectedFloorFilter, setSelectedFloorFilter] = useState('')
  const [selectedUnitFilter, setSelectedUnitFilter] = useState('')
  const [selectedTenantFilter, setSelectedTenantFilter] = useState('')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All')
  const [selectedPayModeFilter, setSelectedPayModeFilter] = useState('')

  const [selectedExpiryFilter, setSelectedExpiryFilter] = useState('')

  const [formTenantId, setFormTenantId] = useState('')

  // Lease Fields
  const [formPropertyId, setFormPropertyId] = useState('')
  const [formFloor, setFormFloor] = useState('')
  const [formUnitId, setFormUnitId] = useState('')
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formMonthlyRent, setFormMonthlyRent] = useState('')
  const [formAnnualRent, setFormAnnualRent] = useState('')
  const [formDeposit, setFormDeposit] = useState('')

  // Debug logging for properties dropdown
  React.useEffect(() => {
    if (showModal) {
      console.log(`Properties loaded: ${properties.length}`)
      if (properties.length === 0) {
        console.log("Database returned zero properties. Filter removed every property or Repository not initialized.")
      }
    }
  }, [showModal, properties])
  const [formModeOfPayment, setFormModeOfPayment] = useState<string>(PDC_MODE)

  const [formPdcStartDate, setFormPdcStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [formDueDay, setFormDueDay] = useState('1')
  const [formNotes, setFormNotes] = useState('')
  const [formPdcCount, setFormPdcCount] = useState<string>('')

  // PDC generation immediately toggles
  const [generatePdcSchedule, setGeneratePdcSchedule] = useState(true)


  // Security Deposit payment capture
  const [depositReceived, setDepositReceived] = useState(true)
  const defaultBank = useMemo(() => getDefaultPropertyReceiptBankAccount(propAccounts), [propAccounts])
  const [depositBankId, setDepositBankId] = useState(defaultBank ? defaultBank.id : '')
  const [depositPaymentMode, setDepositPaymentMode] = useState<'Cash' | 'Security Cheque' | 'Bank Transfer'>('Bank Transfer')
  const [depositDateReceived, setDepositDateReceived] = useState<string>('')

  React.useEffect(() => {
    if (formStartDate) {
      setDepositDateReceived(formStartDate)
    }
  }, [formStartDate])

  // Helper to calculate lease duration in calendar months
  const getLeaseMonthsCount = () => {
    if (!formStartDate || !formEndDate) return 0
    const s = new Date(formStartDate + 'T00:00:00')
    const e = new Date(formEndDate + 'T00:00:00')
    if (e <= s) return 0
    const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
    return e.getDate() >= s.getDate() ? months + 1 : months
  }

  const handleMonthlyRentChange = (val: string) => {
    setFormMonthlyRent(val)
  }

  const handleAnnualRentChange = (val: string) => {
    setFormAnnualRent(val)
  }

  const computedPdcCount = useMemo(() => {
    if (!formStartDate || !formEndDate) return 0
    const s = new Date(formStartDate + 'T00:00:00')
    const e = new Date(formEndDate + 'T00:00:00')
    if (e <= s) return 0
    return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1
  }, [formStartDate, formEndDate])

  React.useEffect(() => {
    setFormPdcCount(String(computedPdcCount))
  }, [computedPdcCount])

  const resetForm = () => {
    setFormTenantId('')
    setFormPropertyId('')
    setFormFloor('')
    setFormUnitId('')
    setFormStartDate('')
    setFormEndDate('')
    setFormMonthlyRent('')
    setFormAnnualRent('')
    setFormDeposit('')
    setFormModeOfPayment(PDC_MODE)

    setFormPdcStartDate(new Date().toISOString().split('T')[0])
    setFormPdcCount('')
    setFormDueDay('1')
    setFormNotes('')

    setGeneratePdcSchedule(true)
    setDepositReceived(false)
    setDepositBankId(defaultBank ? defaultBank.id : '')
  }

  const getTenantName = (tenantId: string) => tenants.find(t => t.id === tenantId)?.name || 'Unknown'
  const getPropertyName = (propertyId: string) => properties.find(p => p.id === propertyId)?.name || 'Unknown'
  const getUnitNumber = (unitId: string) => units.find(u => u.id === unitId)?.unitNumber || 'Unknown'

  // Global search & structured filtering
  const filtered = useMemo(() => {
    let result = leases
    if (selectedPropertyFilter) {
      result = result.filter(l => l.propertyId === selectedPropertyFilter)
    }
    if (selectedFloorFilter) {
      result = result.filter(l => {
        const u = units.find(unit => unit.id === l.unitId)
        return u && u.floor === selectedFloorFilter
      })
    }
    if (selectedUnitFilter) {
      result = result.filter(l => l.unitId === selectedUnitFilter)
    }
    if (selectedTenantFilter) {
      result = result.filter(l => l.tenantId === selectedTenantFilter)
    }
    if (selectedStatusFilter !== 'All') {
      result = result.filter(l => l.status === selectedStatusFilter)
    }
    if (selectedPayModeFilter) {
      result = result.filter(l =>
        (l.modeOfPayment ?? String(l.paymentFrequency ?? '')).toLowerCase() === selectedPayModeFilter.toLowerCase()
      )
    }

    if (selectedExpiryFilter === 'Expiring30') {
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      const today = new Date()
      result = result.filter(l => {
        const d = new Date(l.endDate)
        return l.status === 'Active' && d >= today && d <= thirtyDaysFromNow
      })
    } else if (selectedExpiryFilter === 'Expired') {
      const todayStr = new Date().toISOString().split('T')[0]
      result = result.filter(l => l.endDate < todayStr)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(l => {
        const t = tenants.find(ten => ten.id === l.tenantId)
        const p = properties.find(prop => prop.id === l.propertyId)
        const u = units.find(unit => unit.id === l.unitId)
        return (
          l.leaseNumber.toLowerCase().includes(q) ||
          (t?.name || '').toLowerCase().includes(q) ||
          (t?.phone || '').toLowerCase().includes(q) ||
          (u?.unitNumber || '').toLowerCase().includes(q) ||
          (p?.name || '').toLowerCase().includes(q)
        )
      })
    }
    return result
  }, [leases, units, tenants, properties, searchQuery, selectedPropertyFilter, selectedFloorFilter, selectedUnitFilter, selectedTenantFilter, selectedStatusFilter, selectedPayModeFilter, selectedExpiryFilter])


  // Form unit list filtering
  const formFloors = useMemo(() => {
    if (!formPropertyId) return []
    return units
      .filter(u => u.propertyId === formPropertyId)
      .map(u => u.floor)
      .filter((v, i, a) => v && a.indexOf(v) === i)
      .sort()
  }, [units, formPropertyId])

  const formAvailableUnits = useMemo(() => {
    if (!formPropertyId) return []
    return units.filter(u => {
      if (u.propertyId !== formPropertyId) return false
      if (formFloor && u.floor !== formFloor) return false
      if (editingId) {
        const currentLease = leases.find(l => l.id === editingId)
        if (currentLease && u.id === currentLease.unitId) return true
      }
      return u.status === 'Vacant'
    })
  }, [units, formPropertyId, formFloor, editingId, leases])

  const openAdd = () => {
    resetForm()
    setEditingId(null)
    setShowModal(true)
  }

  const openEdit = (lease: LeaseEntry) => {
    resetForm()
    setEditingId(lease.id)
    setFormPropertyId(lease.propertyId)
    const unit = units.find(u => u.id === lease.unitId)
    setFormFloor(unit?.floor || '')
    setFormUnitId(lease.unitId)
    setFormTenantId(lease.tenantId)
    setFormStartDate(lease.startDate)
    setFormEndDate(lease.endDate)
    setFormMonthlyRent(String(lease.monthlyRent))
    setFormAnnualRent(String(lease.annualRent))
    setFormDeposit(String(lease.deposit))
    setFormModeOfPayment(lease.modeOfPayment ?? String(lease.paymentFrequency ?? PDC_MODE))

    const leasePdcs = pdcCheques.filter(p => p.leaseId === lease.id)
    const firstPdc = leasePdcs.find(p => p.slotIndex === 0)
    const defaultPdcDate = firstPdc ? firstPdc.dueDate : lease.startDate
    setFormPdcStartDate(defaultPdcDate)

    setFormPdcCount(String(lease.pdcCount || ''))
    setFormDueDay(String(lease.paymentDueDay))
    setFormNotes(lease.notes || '')
    setShowModal(true)
  }

  const handleDeleteLease = () => {
    if (!deleteTarget || !accounts || !setUnits) return
    const lease = deleteTarget

    try {
      const result: DeleteLeaseCascadeResult = deleteLeaseCascade({
        lease,
        leases,
        pdcCheques,
        securityDeposits: securityDeposits || [],
        units,
        vouchers: vouchers || [],
        accounts,
      })

      setLeases(result.leases)
      setPdcCheques(result.pdcCheques)
      if (setSecurityDeposits) setSecurityDeposits(result.securityDeposits)
      setUnits(result.units)
      if (setVouchers) setVouchers(result.vouchers)

      const parts: string[] = ['Lease deleted']
      if (result.removedPdcCount > 0) parts.push(`${result.removedPdcCount} PDCs removed`)
      if (result.removedDepositCount > 0) parts.push(`${result.removedDepositCount} deposits removed`)
      if (result.clearedUnitCount > 0) parts.push(`${result.clearedUnitCount} units freed`)
      if (result.cancelledVoucherCount > 0) parts.push(`${result.cancelledVoucherCount} vouchers removed`)

      setDeleteTarget(null)
      setToast({ visible: true, message: parts.join(' — '), type: 'success' })
    } catch (e: any) {
      setToast({ visible: true, message: `Deletion failed: ${e.message}`, type: 'error' })
      setDeleteTarget(null)
    }
  }

  const handleSave = () => {
    // Validate unit and lease contract
    if (!formPropertyId || !formUnitId || !formStartDate || !formEndDate) {
      setToast({ visible: true, message: 'Property, unit, start and end dates are required', type: 'error' })
      return
    }

    if (new Date(formEndDate) <= new Date(formStartDate)) {
      setToast({ visible: true, message: 'End Date must be after Start Date.', type: 'error' })
      return
    }

    if (!formModeOfPayment) {
      setToast({ visible: true, message: 'Mode of Payment is required', type: 'error' })

      return
    }

    if (!formTenantId) {
      setToast({ visible: true, message: 'Please select a tenant', type: 'error' })
      return
    }

    const nowStr = new Date().toISOString()
    const linkedTenantId = formTenantId

    const finalMonthlyRent = Number(formMonthlyRent) || 0
    const finalAnnualRent = Number(formAnnualRent) || 0
    const finalDeposit = Number(formDeposit) || 0

    if (editingId) {
      const currentLease = leases.find(l => l.id === editingId)
      let generatedOrUpdatedCount = 0

      if (currentLease) {
        // 1. Log number of existing PDC records before generation
        const leasePdcs = pdcCheques.filter(p => p.leaseId === editingId)
        console.log(`[PDC Update] Number of existing PDC records before update for lease ${editingId}: ${leasePdcs.length}`)

        // 2. Construct updated lease representation
        const updatedLease: LeaseEntry = {
          ...currentLease,
          tenantId: linkedTenantId,
          propertyId: formPropertyId,
          unitId: formUnitId,
          startDate: formStartDate,
          endDate: formEndDate,
          monthlyRent: finalMonthlyRent,
          annualRent: finalAnnualRent,
          deposit: finalDeposit,
          modeOfPayment: formModeOfPayment,
          paymentFrequency: formModeOfPayment,
          pdcCount: formModeOfPayment === PDC_MODE ? (Number(formPdcCount) || 0) : 0,

          paymentDueDay: Number(formDueDay) || 1,
          notes: formNotes,
          updatedAt: nowStr,
        }

        // 3. Generate schedule slots based on updated lease details
        const startMonth = new Date(formStartDate).getMonth() + 1
        const startYear = new Date(formStartDate).getFullYear()
        const pdcStartDay = new Date(formPdcStartDate).getDate()
        const newSlots = generatePdcSlots(updatedLease, startMonth, startYear, pdcStartDay)

        // 4. Merge schedule
        const processedCheques = leasePdcs.filter(c => c.status !== 'Pending')
        const pendingCheques = leasePdcs.filter(c => c.status === 'Pending')

        const mergedCheques: PdcCheque[] = []
        const maxSlotsCount = Math.max(newSlots.length, leasePdcs.reduce((max, c) => Math.max(max, c.slotIndex + 1), 0))

        for (let i = 0; i < maxSlotsCount; i++) {
          const existingProcessed = processedCheques.find(c => c.slotIndex === i)
          if (existingProcessed) {
            mergedCheques.push(existingProcessed)
          } else {
            const newSlot = newSlots.find(s => s.slotIndex === i)
            if (newSlot) {
              const existingPending = pendingCheques.find(c => c.slotIndex === i)
              if (existingPending) {
                // Update dates, amount and cheque number
                mergedCheques.push({
                  ...existingPending,
                  chequeNumber: newSlot.chequeNumber,
                  chequeDate: newSlot.chequeDate,
                  dueDate: newSlot.dueDate,
                  amount: newSlot.amount,
                  updatedAt: nowStr,
                })
              } else {
                mergedCheques.push(newSlot)
              }
              generatedOrUpdatedCount++
            }
          }
        }

        // Enforce uniqueness using Lease ID + Cheque Number
        const finalMerged: PdcCheque[] = []
        for (const chq of mergedCheques) {
          const isDuplicate = finalMerged.some(x => x.leaseId === chq.leaseId && x.chequeNumber === chq.chequeNumber)
          if (!isDuplicate) {
            finalMerged.push(chq)
          } else {
            console.warn(`[PDC Update] Duplicate cheque number detected: Lease ${chq.leaseId}, Cheque ${chq.chequeNumber}. Skipping duplicate in merge.`)
          }
        }

        // 5. Update global state and log
        setPdcCheques(prev => {
          const filtered = prev.filter(c => c.leaseId !== editingId)
          const updated = [...filtered, ...finalMerged]
          console.log(`[PDC Update] Number created: ${generatedOrUpdatedCount}`)
          console.log(`[PDC Update] Number after save: ${updated.length}`)
          return updated
        })
      }

      setLeases(prev => prev.map(l =>
        l.id === editingId ? {
          ...l,
          tenantId: linkedTenantId,
          propertyId: formPropertyId,
          unitId: formUnitId,
          startDate: formStartDate,
          endDate: formEndDate,
          monthlyRent: finalMonthlyRent,
          annualRent: finalAnnualRent,
          deposit: finalDeposit,
          modeOfPayment: formModeOfPayment,
          paymentFrequency: formModeOfPayment,
          pdcCount: formModeOfPayment === PDC_MODE ? (Number(formPdcCount) || 0) : 0,

          paymentDueDay: Number(formDueDay) || 1,
          notes: formNotes,
          updatedAt: nowStr,
        } : l
      ))
      setToast({ visible: true, message: 'Lease updated', type: 'success' })
    } else {
      const leaseNumber = `LS-${new Date().getFullYear()}-${String(leases.length + 1).padStart(4, '0')}`
      const newLease: LeaseEntry = {
        id: `pl-${Date.now()}`,
        leaseNumber,
        tenantId: linkedTenantId,
        propertyId: formPropertyId,
        unitId: formUnitId,
        startDate: formStartDate,
        endDate: formEndDate,
        monthlyRent: finalMonthlyRent,
        annualRent: finalAnnualRent,
          deposit: finalDeposit,
          modeOfPayment: formModeOfPayment,
        paymentFrequency: formModeOfPayment,
        pdcCount: formModeOfPayment === PDC_MODE ? (Number(formPdcCount) || 0) : 0,

        paymentDueDay: Number(formDueDay) || 1,
        notes: formNotes,
        status: 'Active',
        amountReceived: 0,
        paymentStatus: 'Pending',
        createdBy: 'user',
        createdAt: nowStr,
        updatedAt: nowStr,
      }

      setLeases(prev => [...prev, newLease])

      // 2. Post lease creation journal entry — recognize total rental income
      if (accountingEngine && accounts && vouchers && setVouchers) {
        const prop = properties.find(p => p.id === newLease.propertyId)
        const propertyType = prop?.type
        const incomeAccount = !propertyType
          ? SystemAccountRegistry.getBuildingRentalIncomeAccount(accounts)
          : propertyType.toLowerCase() === 'villa'
            ? SystemAccountRegistry.getVillaRentalIncomeAccount(accounts)
            : propertyType.toLowerCase() === 'apartment'
              ? SystemAccountRegistry.getApartmentRentalIncomeAccount(accounts)
              : SystemAccountRegistry.getBuildingRentalIncomeAccount(accounts)
        if (incomeAccount) {
          const desc = `Lease ${leaseNumber} — ${getTenantName(formTenantId)}`
          const draftResult = accountingEngine.processAccountingEvent(
            'LEASE_CREATED',
            {
              amount: finalAnnualRent,
              date: formStartDate,
              description: desc,
              currency,
              exchangeRate: 1,
              baseCurrency: currency,
              creditAccount: incomeAccount.id,
              referenceType: 'Lease',
              referenceId: newLease.id,
              createdBy: 'user',
            },
            accounts,
            vouchers
          )
          if (draftResult.success && draftResult.voucher) {
            const postResult = autoPostVoucher(accountingEngine, draftResult.voucher, accounts)
            if (postResult.success && postResult.voucher) {
              setVouchers(prev => [postResult.voucher!, ...prev])
              invalidateBalanceCache()
            }
          }
        }
      }

      // 3. Generate PDC schedule if selected
      let generatedCount = 0
      if (generatePdcSchedule) {
        const startMonth = new Date(formStartDate).getMonth() + 1
        const startYear = new Date(formStartDate).getFullYear()
        
        // Log existing PDCs count before generation
        const existingPdcs = pdcCheques.filter(p => p.leaseId === newLease.id)
        console.log(`[PDC Generation] Number of existing PDC records before generation: ${existingPdcs.length}`)

        if (existingPdcs.length > 0) {
          console.warn(`[PDC Generation] PDC schedule already exists for lease ${newLease.id}. Skipping initial generation.`)
        } else {
          const pdcStartDay = new Date(formPdcStartDate).getDate()
          const pdcSlots = generatePdcSlots(newLease, startMonth, startYear, pdcStartDay)
          
          // Enforce uniqueness using Lease ID + Cheque Number
          const finalSlots: PdcCheque[] = []
          for (const slot of pdcSlots) {
            const hasDuplicate = pdcCheques.some(p => p.leaseId === slot.leaseId && p.chequeNumber === slot.chequeNumber)
            if (!hasDuplicate) {
              finalSlots.push(slot)
            } else {
              console.warn(`[PDC Generation] Duplicate cheque number detected: Lease ${slot.leaseId}, Cheque ${slot.chequeNumber}. Skipping this slot.`)
            }
          }

          if (finalSlots.length > 0) {
            generatedCount = finalSlots.length
            setPdcCheques(prev => {
              const updated = [...prev, ...finalSlots]
              console.log(`[PDC Generation] Number created: ${finalSlots.length}`)
              console.log(`[PDC Generation] Number after save: ${updated.length}`)
              return updated
            })
          } else {
            console.log(`[PDC Generation] Number created: 0`)
            console.log(`[PDC Generation] Number after save: ${pdcCheques.length}`)
          }
        }
      }

      // 4. Create Security Deposit expected charge
      if (finalDeposit > 0) {
        let secDeposit = createInitialDeposit(newLease, 'user')
        
        // Automatically post the security deposit GL voucher
        if (accountingEngine && depositMappings) {
          const isCheque = depositReceived && depositPaymentMode === 'Security Cheque'
          const isCash = depositReceived && depositPaymentMode === 'Cash'
          
          let coaBankAccountId: string | undefined
          if (isCash) {
            coaBankAccountId = accounts?.find(a => a.code === '1110')?.id
          } else if (depositReceived && depositPaymentMode === 'Bank Transfer') {
            const effectiveBankId = depositBankId || defaultBank?.id || propAccounts?.[0]?.id
            coaBankAccountId = effectiveBankId ? getPropertyBankAccountId(effectiveBankId, propAccounts, bankMappings) : undefined
          }
          
          if (isCheque || coaBankAccountId) {
            const desc = `Security Deposit Receipt (${depositReceived ? depositPaymentMode : 'Bank Transfer'}): Lease ${leaseNumber} — Tenant: ${getTenantName(formTenantId)}`
            const txDate = depositReceived && depositDateReceived ? depositDateReceived : formStartDate
            
            const eventType = isCheque ? 'SECURITY_DEPOSIT_PDC_RECEIVED' : 'SECURITY_DEPOSIT_RECEIVED'
            const eventPayload = isCheque ? {
              amount: finalDeposit,
              date: txDate,
              description: desc,
              currency,
              exchangeRate: 1,
              baseCurrency: currency,
              creditAccount: depositMappings.liabilityAccountId,
              referenceType: 'Lease',
              referenceId: newLease.id,
              createdBy: 'user',
            } : {
              amount: finalDeposit,
              date: txDate,
              description: desc,
              currency,
              exchangeRate: 1,
              baseCurrency: currency,
              bankAccount: coaBankAccountId,
              creditAccount: depositMappings.liabilityAccountId,
              referenceType: 'Lease',
              referenceId: newLease.id,
              createdBy: 'user',
            }

            const draftResult = accountingEngine.processAccountingEvent(
              eventType,
              eventPayload,
              accounts || [],
              vouchers || []
            )

            if (draftResult.success && draftResult.voucher) {
              const appResult = accountingEngine.approve(draftResult.voucher, 'user')
              if (appResult.success && appResult.voucher) {
                const postResult = accountingEngine.post(appResult.voucher, 'user', accounts || [], vouchers || [])
                if (postResult.success && postResult.voucher) {
                  // Add the Receipt transaction to the Security Deposit object
                  secDeposit = addDepositTransaction(secDeposit, {
                    type: 'Receipt',
                    amount: finalDeposit,
                    date: txDate,
                    bankAccountId: isCheque ? undefined : coaBankAccountId,
                    voucherId: postResult.voucher.id,
                    notes: `Deposit received inline on lease creation as ${depositReceived ? depositPaymentMode : 'Bank Transfer'}.`,
                    paymentMode: depositReceived ? depositPaymentMode as any : 'Bank Transfer',
                    status: 'Posted',
                    createdBy: 'user',
                  }, 'user')
                  setVouchers?.(prev => [postResult.voucher!, ...prev])
                }
              }
            }
          }
        }
        setSecurityDeposits?.(prev => [...prev, secDeposit])
      }

      // 4. Update unit status to Occupied
      if (setUnits) {
        setUnits(prev => prev.map(u =>
          u.id === formUnitId ? { ...u, status: 'Occupied', tenantId: linkedTenantId, leaseId: newLease.id } : u
        ))
      }

      setToast({
        visible: true,
        message: `Lease created successfully.${generatedCount > 0 ? ` Generated ${generatedCount} PDCs.` : ''}`,
        type: 'success',
      })
    }

    setShowModal(false)
    resetForm()
  }

  const handleStatusChange = (leaseId: string, status: LeaseEntry['status']) => {
    setLeases(prev => prev.map(l =>
      l.id === leaseId ? { ...l, status, updatedAt: new Date().toISOString() } : l
    ))
    setToast({ visible: true, message: `Lease status changed to ${status}`, type: 'success' })
  }

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Lease?"
        message="This will permanently delete this lease and cascade-remove all PDC cheques, security deposits, GL vouchers, and free the unit. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteLease}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="page-header">
        <div>
          <div className="page-title">Lease Management</div>
          <div className="page-subtitle">Unified workspace for Leases, Tenant details, and Post-Dated Cheques</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="primary" size="sm" icon={<PlusIcon />} onClick={openAdd}>
            Create Lease
          </Button>
        </div>
      </div>

      <div className="page-body">
        {/* KPI Cards section */}
        <LeaseKPIs leases={leases} units={units} securityDeposits={securityDeposits} currency={currency} accounts={accounts} vouchers={vouchers} />

        {/* Global Search and Filter panel */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by tenant name, phone, unit, property, contract #..."
              style={{ marginBottom: 0, paddingLeft: 36 }}
            />
            <div style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-secondary)' }}><SearchIcon /></div>
          </div>
        </div>

        <LeaseFilters
          properties={properties}
          units={units}
          tenants={tenants}
          selectedProperty={selectedPropertyFilter}
          setSelectedProperty={setSelectedPropertyFilter}
          selectedFloor={selectedFloorFilter}
          setSelectedFloor={setSelectedFloorFilter}
          selectedUnit={selectedUnitFilter}
          setSelectedUnit={setSelectedUnitFilter}
          selectedTenant={selectedTenantFilter}
          setSelectedTenant={setSelectedTenantFilter}
          selectedStatus={selectedStatusFilter}
          setSelectedStatus={setSelectedStatusFilter}
          selectedPayMode={selectedPayModeFilter}
          setSelectedPayMode={setSelectedPayModeFilter}

          selectedExpiry={selectedExpiryFilter}
          setSelectedExpiry={setSelectedExpiryFilter}
        />

        {/* Lease Grid with Expand Row Panel */}
        <div className="card card-table">
          <div className="card-body" style={{ overflowX: 'auto' }}>
            {filtered.length === 0 ? (
              <EmptyState title="No Leases Found" text="Try adjusting your filters or search query, or create a new lease." icon={<SearchIcon />} />
            ) : (
              <table className="property-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Lease #</th>
                    <th>Property / Unit</th>
                    <th>Tenant</th>
                    <th>Period</th>
                    <th style={{ textAlign: 'right' }}>Monthly Rent</th>
                    <th style={{ textAlign: 'right' }}>Deposit</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(l => {
                    const isExpanded = expandedLeaseId === l.id
                    const tenant = tenants.find(t => t.id === l.tenantId) || null
                    const property = properties.find(p => p.id === l.propertyId) || null
                    const unit = units.find(u => u.id === l.unitId) || null
                    
                    const cheques = getChequesByLease(pdcCheques, l.id)
                    const totalCheques = cheques.length
                    const clearedCheques = cheques.filter(c => c.status === 'Cleared').length
                    
                    const depositRecord = securityDeposits.find(d => d.leaseId === l.id) || null
                    const depBalances = depositRecord ? computeDepositBalances(depositRecord) : null

                    // Compute financial summary
                    const refVouchers = vouchers.filter(v => v.reference === l.leaseNumber || v.reference === l.id)
                    const posted = refVouchers.filter(v => v.status === 'Posted')
                    const derivedCollected = posted.reduce((sum, v) => {
                      if (v.type === 'Receipt') {
                        return sum + v.lines.filter(line => line.type === 'Credit').reduce((s, line) => s + line.baseAmount, 0)
                      }
                      return sum
                    }, 0)
                    const annualRent = l.annualRent || l.monthlyRent * 12
                    const collectedRent = l.amountReceived ?? derivedCollected
                    const outstandingRent = Math.max(0, annualRent - collectedRent)
                    const paidPercent = annualRent > 0 ? Math.round((collectedRent / annualRent) * 100) : 0
                    const financials = { collectedRent, annualRent, outstandingRent, paidPercent }

                    return (
                      <React.Fragment key={l.id}>
                        <tr
                          style={{
                            cursor: 'pointer',
                            background: isExpanded ? 'var(--bg-secondary)' : 'transparent',
                            borderBottom: '1px solid var(--border)',
                          }}
                          onClick={() => setExpandedLeaseId(isExpanded ? null : l.id)}
                        >
                          <td className="text-sm text-mono fw-600" style={{ color: 'var(--primary)' }}>
                            {l.leaseNumber}
                          </td>
                          <td className="text-xs">
                            <div style={{ fontWeight: 500 }}>{property?.name}</div>
                            <div style={{ color: 'var(--text-secondary)' }}>{formatUnitNumber(unit?.unitNumber)} (Floor {unit?.floor})</div>
                          </td>
                          <td className="text-sm font-medium">
                            <div>{tenant?.name || '—'}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{tenant?.phone}</div>
                          </td>
                          <td className="text-xs text-secondary">
                            <div>{formatDate(l.startDate, dateFormat)} to</div>
                            <div>{formatDate(l.endDate, dateFormat)}</div>
                          </td>
                          <td className="text-mono text-xs fw-600" style={{ textAlign: 'right' }}>
                            <CurrencyText value={l.monthlyRent} currency={currency} />
                          </td>
                          <td className="text-mono text-xs" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                            <CurrencyText value={l.deposit} currency={currency} />
                          </td>
                          <td>
                            <Badge variant={l.status === 'Active' ? 'success' : l.status === 'Draft' ? 'warning' : 'neutral'}>
                              {l.status}
                            </Badge>
                          </td>
                          <td onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <Button variant="ghost" size="sm" onClick={() => setExpandedLeaseId(isExpanded ? null : l.id)} title="Expand Details">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                              </Button>
                              <Button variant="ghost" size="sm" icon={<EditIcon />} onClick={() => openEdit(l)} title="Edit Lease" />
                              <Button variant="ghost" size="sm" icon={<TrashIcon />} onClick={() => setDeleteTarget(l)} title="Delete Lease" className="delete-lease-btn" />
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr style={{ background: 'var(--bg-secondary)' }}>
                            <td colSpan={8} style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr', gap: 32 }}>
                                
                                {/* Tenant Details */}
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 12 }}>
                                    Tenant Details
                                  </div>
                                  <TenantCard tenant={tenant} />
                                </div>

                                {/* Lease Details */}
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 12 }}>
                                    Lease Details
                                  </div>
                                  <LeaseCard lease={l} property={property} unit={unit} dateFormat={dateFormat} currency={currency} />
                                </div>

                                {/* Financial Summary Panel */}
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 12 }}>
                                    Financial Center
                                  </div>
                                  <LeaseSummaryPanel financials={financials} cheques={cheques} depositBalances={depBalances} currency={currency} />
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Lease Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm() }}
        title={editingId ? 'Edit Lease Details' : 'Create New Lease'}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm() }}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>{editingId ? 'Update' : 'Create Lease'}</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
          {properties.length === 0 ? (
            <div style={{ color: 'var(--red)', fontSize: 13, padding: '16px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontWeight: 500, lineHeight: 1.6 }}>
              No properties found.<br />Please create a property first.
            </div>
          ) : (
            <>
              {/* Unit selection hierarchy */}
              <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', marginBottom: 10 }}>Property & Unit Selector</div>
                <div className="form-row">
                  <Select
                    label="Property *"
                    value={formPropertyId}
                    onChange={e => { setFormPropertyId(e.target.value); setFormFloor(''); setFormUnitId('') }}
                    options={[{ value: '', label: 'Select Property' }, ...properties.map(p => ({ value: p.id, label: p.name }))]}
                  />
                  <Select
                    label="Floor"
                    value={formFloor}
                    onChange={e => { setFormFloor(e.target.value); setFormUnitId('') }}
                    options={(() => {
                      const base = [{ value: '', label: 'Select Floor' }]
                      const floorOptions = formFloors.map(f => ({
                        value: f,
                        label: f.toLowerCase().includes('parking') ? f : `Floor ${f}`
                      }))
                      const extra = []
                      if (!formFloors.some(f => f.toLowerCase() === 'parking')) {
                        extra.push({ value: 'Parking', label: 'Parking' })
                      }
                      if (!formFloors.some(f => f.toLowerCase() === 'rent with parking')) {
                        extra.push({ value: 'Rent with Parking', label: 'Rent with Parking' })
                      }
                      return [...base, ...floorOptions, ...extra]
                    })()}
                    disabled={!formPropertyId}
                  />
                  <Select
                    label="Unit *"
                    value={formUnitId}
                    onChange={e => setFormUnitId(e.target.value)}
                    options={[{ value: '', label: 'Select Unit' }, ...formAvailableUnits.map(u => ({ value: u.id, label: u.unitNumber }))]}
                    disabled={!formPropertyId}
                  />
                </div>
              </div>

              {/* Tenant selection */}
              <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>Tenant</span>
                  {onNavigate && (
                    <button
                      className="text-button"
                      onClick={() => onNavigate('tenants')}
                      style={{ fontSize: 12, color: 'var(--primary)', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}
                    >
                      Manage Tenants
                    </button>
                  )}
                </div>
                <Select
                  label="Select Tenant *"
                  value={formTenantId}
                  onChange={e => setFormTenantId(e.target.value)}
                  options={[{ value: '', label: 'Select Tenant' }, ...tenants.map(t => ({ value: t.id, label: t.name }))]}
                />
              </div>

              {/* Lease contract details */}
              <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', marginBottom: 10 }}>Contract Details</div>
                <div className="form-row">
                  <Input label="Start Date *" type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} />
                  <Input label="End Date *" type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} />
                </div>
                <div className="form-row">
                  <Input label="Monthly Rent" type="number" value={formMonthlyRent} onChange={e => handleMonthlyRentChange(e.target.value)} placeholder="0" />
                  <Input label="Annual Rent" type="number" value={formAnnualRent} onChange={e => handleAnnualRentChange(e.target.value)} placeholder="0" />
                </div>
                <div className="form-row">
                  <Input label="Security Deposit" type="number" value={formDeposit} onChange={e => setFormDeposit(e.target.value)} placeholder="0" />
                  <Select
                    label="Security Deposit Mode"
                    value={depositPaymentMode}
                    onChange={e => setDepositPaymentMode(e.target.value as any)}
                    options={[
                      { value: 'Security Cheque', label: 'Security Cheque Received' },
                      { value: 'Bank Transfer', label: 'Bank Transfer' },
                      { value: 'Cash', label: 'Cash' }
                    ]}
                  />
                </div>
                {Number(formDeposit) > 0 && (
                  <div className="form-row" style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, border: '1px solid var(--border)', display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', marginBottom: 12 }}>
                    <Input
                      label="Deposit Date Taken *"
                      type="date"
                      value={depositDateReceived}
                      onChange={e => setDepositDateReceived(e.target.value)}
                      required
                    />
                    {depositPaymentMode === 'Bank Transfer' && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <Select
                          label="Receiving Trust Account *"
                          value={depositBankId}
                          onChange={e => setDepositBankId(e.target.value)}
                          options={[{ value: '', label: 'Select Trust Bank' }, ...propAccounts.map(ba => ({
                            value: ba.id,
                            label: ba.institution
                          }))]}
                          required
                        />
                      </div>
                    )}
                  </div>
                )}
                <div className="form-row">
                  <Input label="Payment Due Day" type="number" value={formDueDay} onChange={e => setFormDueDay(e.target.value)} placeholder="1" />
                  <Select
                    label="Mode of Payment *"
                    value={formModeOfPayment}
                    onChange={e => setFormModeOfPayment(e.target.value)}
                    options={MODE_OF_PAYMENT_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                  />
                </div>
                {formModeOfPayment === PDC_MODE && (
                  <div className="form-row">
                    <Input
                      label="PDC Cheques Count *"
                      type="number"
                      value={formPdcCount}
                      onChange={e => setFormPdcCount(e.target.value)}
                    />
                    <Input label="PDC Start Date" type="date" value={formPdcStartDate} onChange={e => setFormPdcStartDate(e.target.value)} />
                  </div>
                )}
                <Input label="Lease Notes" value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Additional notes or references" />
              </div>

              {/* PDC scheduler toggle inside creation */}
              {!editingId && (
                <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, border: '1px solid var(--border)', marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>Post-Dated Cheques Schedule</span>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Automatically generate schedule based on contract details</div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={generatePdcSchedule} onChange={e => setGeneratePdcSchedule(e.target.checked)} />
                      Generate PDC slots
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  )
}
