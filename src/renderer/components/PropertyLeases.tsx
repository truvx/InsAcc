import React, { useState, useMemo } from 'react'
import type { LeaseEntry, TenantEntry, UnitEntry, PropertyEntry, PdcCheque, SecurityDeposit } from '../data/propertyTypes'
import type { Account, Voucher } from '../accounting/types'
import { Badge, Button, PlusIcon, Input, Select, Modal, SearchIcon, CloseIcon, EditIcon, EmptyState, KpiCard } from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
import { formatDate } from '../utils'
import { LEASE_STATUS_OPTIONS, PAYMENT_FREQUENCY_OPTIONS } from '../data/propertyTypes'
import { getChequesByLease, generatePdcSlots } from '../services/propertyPdcService'
import { getAccountBalance } from '../accounting/ledgerService'
import { computeDepositBalances } from '../services/propertyDepositService'
import VoucherTimeline from './VoucherTimeline'
import AccountDrillDown from './AccountDrillDown'
import Toast from './Toast'

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
  securityDeposits?: SecurityDeposit[]
}

export default function PropertyLeases({
  currency = 'AED', dateFormat = 'DD/MM/YYYY',
  leases, setLeases, tenants, properties, units,
  setUnits,
  pdcCheques, setPdcCheques,
  accounts = [], vouchers = [],
  securityDeposits = [],
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null)
  const [drillVoucher, setDrillVoucher] = useState<Voucher | null>(null)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const [formTenantId, setFormTenantId] = useState('')
  const [formPropertyId, setFormPropertyId] = useState('')
  const [formUnitId, setFormUnitId] = useState('')
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formMonthlyRent, setFormMonthlyRent] = useState('')
  const [formAnnualRent, setFormAnnualRent] = useState('')
  const [formDeposit, setFormDeposit] = useState('')
  const [formSecurityCheque, setFormSecurityCheque] = useState('')
  const [formSecurityChequeDate, setFormSecurityChequeDate] = useState('')
  const [formPaymentFrequency, setFormPaymentFrequency] = useState(12)
  const [formPdcCount, setFormPdcCount] = useState(12)
  const [formDueDay, setFormDueDay] = useState('1')

  const resetForm = () => {
    setFormTenantId('')
    setFormPropertyId('')
    setFormUnitId('')
    setFormStartDate('')
    setFormEndDate('')
    setFormMonthlyRent('')
    setFormAnnualRent('')
    setFormDeposit('')
    setFormSecurityCheque('')
    setFormSecurityChequeDate('')
    setFormPaymentFrequency(12)
    setFormPdcCount(12)
    setFormDueDay('1')
  }

  const getTenantName = (tenantId: string) => tenants.find(t => t.id === tenantId)?.name || 'Unknown'
  const getPropertyName = (propertyId: string) => properties.find(p => p.id === propertyId)?.name || 'Unknown'
  const getUnitNumber = (unitId: string) => units.find(u => u.id === unitId)?.unitNumber || 'Unknown'

  const filtered = useMemo(() => {
    let result = leases
    if (statusFilter !== 'All') {
      result = result.filter(l => l.status === statusFilter)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(l =>
        l.leaseNumber.toLowerCase().includes(q) ||
        getTenantName(l.tenantId).toLowerCase().includes(q) ||
        getPropertyName(l.propertyId).toLowerCase().includes(q) ||
        getUnitNumber(l.unitId).toLowerCase().includes(q)
      )
    }
    return result
  }, [leases, statusFilter, searchQuery])

  const availableUnits = useMemo(() => {
    return units.filter(u => {
      if (editingId) {
        const currentLease = leases.find(l => l.id === editingId)
        if (currentLease && u.id === currentLease.unitId) return true
      }
      return u.status === 'Vacant'
    })
  }, [units, editingId, leases])

  const tenantOptions = useMemo(() => [
    { value: '', label: 'Select tenant' },
    ...tenants.map(t => ({ value: t.id, label: t.name })),
  ], [tenants])

  const propertyOptions = useMemo(() => [
    { value: '', label: 'Select property' },
    ...properties.map(p => ({ value: p.id, label: p.name })),
  ], [properties])

  const unitOptions = useMemo(() => [
    { value: '', label: 'Select unit' },
    ...availableUnits.map(u => ({
      value: u.id,
      label: `${u.unitNumber} (${getPropertyName(u.propertyId)})`,
    })),
  ], [availableUnits])

  const openAdd = () => {
    resetForm()
    setEditingId(null)
    setShowModal(true)
  }

  const openEdit = (lease: LeaseEntry) => {
    setEditingId(lease.id)
    setFormTenantId(lease.tenantId)
    setFormPropertyId(lease.propertyId)
    setFormUnitId(lease.unitId)
    setFormStartDate(lease.startDate)
    setFormEndDate(lease.endDate)
    setFormMonthlyRent(String(lease.monthlyRent))
    setFormAnnualRent(String(lease.annualRent))
    setFormDeposit(String(lease.deposit))
    setFormSecurityCheque(lease.securityChequeNumber)
    setFormSecurityChequeDate(lease.securityChequeDate)
    setFormPaymentFrequency(lease.paymentFrequency)
    setFormPdcCount(lease.pdcCount)
    setFormDueDay(String(lease.paymentDueDay))
    setShowModal(true)
  }

  const handleSave = () => {
    if (!formTenantId || !formPropertyId || !formUnitId || !formStartDate || !formEndDate) {
      setToast({ visible: true, message: 'Tenant, property, unit, start and end dates are required', type: 'error' })
      return
    }
    const now = new Date().toISOString()
    if (editingId) {
      setLeases(prev => prev.map(l =>
        l.id === editingId ? {
          ...l,
          tenantId: formTenantId,
          propertyId: formPropertyId,
          unitId: formUnitId,
          startDate: formStartDate,
          endDate: formEndDate,
          monthlyRent: Number(formMonthlyRent) || 0,
          annualRent: Number(formAnnualRent) || 0,
          deposit: Number(formDeposit) || 0,
          securityChequeNumber: formSecurityCheque,
          securityChequeDate: formSecurityChequeDate,
          paymentFrequency: formPaymentFrequency,
          pdcCount: formPdcCount,
          paymentDueDay: Number(formDueDay) || 1,
          updatedAt: now,
        } : l
      ))
      setToast({ visible: true, message: 'Lease updated', type: 'success' })
    } else {
      const leaseNumber = `LS-${new Date().getFullYear()}-${String(leases.length + 1).padStart(4, '0')}`
      const newLease: LeaseEntry = {
        id: `pl-${Date.now()}`,
        leaseNumber,
        tenantId: formTenantId,
        propertyId: formPropertyId,
        unitId: formUnitId,
        startDate: formStartDate,
        endDate: formEndDate,
        monthlyRent: Number(formMonthlyRent) || 0,
        annualRent: Number(formAnnualRent) || 0,
        deposit: Number(formDeposit) || 0,
        securityChequeNumber: formSecurityCheque,
        securityChequeDate: formSecurityChequeDate,
        paymentFrequency: formPaymentFrequency,
        pdcCount: formPdcCount,
        paymentDueDay: Number(formDueDay) || 1,
        status: 'Active',
        createdBy: 'user',
        createdAt: now,
        updatedAt: now,
      }
      setLeases(prev => [...prev, newLease])

      // Auto-generate PDC slots
      const startMonth = new Date(formStartDate).getMonth() + 1
      const startYear = new Date(formStartDate).getFullYear()
      const pdcSlots = generatePdcSlots(newLease, startMonth, startYear)
      if (pdcSlots.length > 0) {
        setPdcCheques(prev => [...prev, ...pdcSlots])
      }

      // Update unit status to Occupied
      if (setUnits) {
        setUnits(prev => prev.map(u =>
          u.id === formUnitId ? { ...u, status: 'Occupied', tenantId: formTenantId, leaseId: newLease.id } : u
        ))
      }

      setToast({ visible: true, message: `Lease created with ${pdcSlots.length} PDC slots`, type: 'success' })
    }
    setShowModal(false)
    resetForm()
  }

  const handleStatusChange = (leaseId: string, status: LeaseEntry['status']) => {
    setLeases(prev => prev.map(l =>
      l.id === leaseId ? { ...l, status, updatedAt: new Date().toISOString() } : l
    ))
    setToast({ visible: true, message: `Lease ${status.toLowerCase()}`, type: 'success' })
  }

  const selectedLease = useMemo(() => {
    if (!selectedLeaseId) return null
    return leases.find(l => l.id === selectedLeaseId) || null
  }, [selectedLeaseId, leases])

  const leaseDepositRecord = useMemo(() => {
    if (!selectedLeaseId) return null
    return securityDeposits.find(d => d.leaseId === selectedLeaseId) || null
  }, [selectedLeaseId, securityDeposits])

  const depositBalances = useMemo(() => {
    if (!leaseDepositRecord) return null
    return computeDepositBalances(leaseDepositRecord)
  }, [leaseDepositRecord])

  const selectedTenant = useMemo(() => {
    if (!selectedLease) return null
    return tenants.find(t => t.id === selectedLease.tenantId) || null
  }, [selectedLease, tenants])

  const selectedProperty = useMemo(() => {
    if (!selectedLease) return null
    return properties.find(p => p.id === selectedLease.propertyId) || null
  }, [selectedLease, properties])

  const selectedUnit = useMemo(() => {
    if (!selectedLease) return null
    return units.find(u => u.id === selectedLease.unitId) || null
  }, [selectedLease, units])

  const selectedLeaseCheques = useMemo(() => {
    if (!selectedLeaseId) return []
    return getChequesByLease(pdcCheques, selectedLeaseId)
  }, [selectedLeaseId, pdcCheques])

  const leaseFinancials = useMemo(() => {
    if (!selectedLease) return null
    const refVouchers = vouchers.filter(v => v.reference === selectedLease.leaseNumber || v.reference === selectedLease.id)
    const posted = refVouchers.filter(v => v.status === 'Posted')
    const collectedRent = posted.reduce((sum, v) => {
      if (v.type === 'Receipt') {
        const creditLines = v.lines.filter(l => l.type === 'Credit')
        return sum + creditLines.reduce((s, l) => s + l.baseAmount, 0)
      }
      return sum
    }, 0)
    const annualRent = selectedLease.annualRent || selectedLease.monthlyRent * 12
    const monthlyRent = selectedLease.monthlyRent
    const outstandingRent = Math.max(0, annualRent - collectedRent)

    const linkedVouchers = posted.sort((a, b) => b.date.localeCompare(a.date))
    return { collectedRent, annualRent, monthlyRent, outstandingRent, linkedVouchers }
  }, [selectedLease, vouchers])

  const fmt = (n: number) => `${currency} ${n.toLocaleString()}`
  const totalAnnualRent = useMemo(() => leases.reduce((s, l) => s + l.annualRent, 0), [leases])
  const activeLeases = useMemo(() => leases.filter(l => l.status === 'Active').length, [leases])
  const totalDeposits = useMemo(() => leases.reduce((s, l) => s + l.deposit, 0), [leases])

  const columns: Column<LeaseEntry>[] = useMemo(() => [
    {
      key: 'leaseNumber',
      header: 'Lease #',
      sortable: true,
      render: l => <span className="fw-600 text-sm text-mono">{l.leaseNumber}</span>,
    },
    {
      key: 'tenantId',
      header: 'Tenant',
      sortable: true,
      render: l => <span className="fw-500">{getTenantName(l.tenantId)}</span>,
    },
    {
      key: 'unitId',
      header: 'Unit',
      sortable: true,
      render: l => (
        <span className="text-secondary text-xs">
          {getUnitNumber(l.unitId)} &middot; {getPropertyName(l.propertyId)}
        </span>
      ),
    },
    {
      key: 'monthlyRent',
      header: 'Monthly Rent',
      sortable: true,
      numeric: true,
      render: l => <span className="text-mono text-xs fw-600">{fmt(l.monthlyRent)}</span>,
    },
    {
      key: 'startDate',
      header: 'Period',
      sortable: true,
      render: l => (
        <span className="text-secondary text-xs">
          {formatDate(l.startDate, dateFormat)} &mdash; {formatDate(l.endDate, dateFormat)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: l => (
        <Badge variant={l.status === 'Active' ? 'success' : l.status === 'Draft' ? 'warning' : 'neutral'}>
          {l.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: l => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button variant="ghost" size="sm" onClick={() => setSelectedLeaseId(l.id)} aria-label="View Financials" title="View lease financials">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(l)} aria-label="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </Button>
        </div>
      ),
    },
  ], [dateFormat])

  const pdcColumns: Column<PdcCheque>[] = useMemo(() => [
    {
      key: 'slotIndex',
      header: '#',
      width: '40px',
      render: c => <span className="text-secondary text-xs">{c.slotIndex + 1}</span>,
    },
    {
      key: 'chequeNumber',
      header: 'Cheque #',
      render: c => <span className="text-mono text-xs">{c.chequeNumber}</span>,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: c => <span className="text-xs">{formatDate(c.dueDate, dateFormat)}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      numeric: true,
      render: c => <span className="text-mono text-xs fw-600">{fmt(c.amount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: c => {
        const v = c.status === 'Cleared' ? 'success' : c.status === 'Deposited' ? 'primary' : c.status === 'Bounced' ? 'danger' : c.status === 'Cancelled' || c.status === 'Replaced' ? 'neutral' : 'warning'
        return <Badge variant={v as any}>{c.status}</Badge>
      },
    },
  ], [dateFormat])

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm() }}
        title={editingId ? 'Edit Lease' : 'New Lease'}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm() }}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>{editingId ? 'Update' : 'Create Lease'}</Button>
          </>
        }
      >
        <div className="form-row">
          <Select label="Tenant" value={formTenantId} onChange={e => setFormTenantId(e.target.value)} options={tenantOptions} />
          <Select label="Property" value={formPropertyId} onChange={e => setFormPropertyId(e.target.value)} options={propertyOptions} />
          <Select label="Unit" value={formUnitId} onChange={e => setFormUnitId(e.target.value)} options={unitOptions} />
        </div>
        <div className="form-row">
          <Input label="Start Date" type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} />
          <Input label="End Date" type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} />
          <Input label="Monthly Rent" type="number" value={formMonthlyRent} onChange={e => setFormMonthlyRent(e.target.value)} placeholder="0" />
        </div>
        <div className="form-row">
          <Input label="Annual Rent" type="number" value={formAnnualRent} onChange={e => setFormAnnualRent(e.target.value)} placeholder="0" />
          <Input label="Security Deposit" type="number" value={formDeposit} onChange={e => setFormDeposit(e.target.value)} placeholder="0" />
          <Input label="Due Day" type="number" value={formDueDay} onChange={e => setFormDueDay(e.target.value)} placeholder="1" />
        </div>
        <div className="form-row">
          <Input label="Security Cheque Number" value={formSecurityCheque} onChange={e => setFormSecurityCheque(e.target.value)} placeholder="e.g. CHQ-001" />
          <Input label="Security Cheque Date" type="date" value={formSecurityChequeDate} onChange={e => setFormSecurityChequeDate(e.target.value)} />
        </div>
        <div className="form-row">
          <Select
            label="Payment Frequency"
            value={String(formPaymentFrequency)}
            onChange={e => {
              const v = Number(e.target.value)
              setFormPaymentFrequency(v)
              setFormPdcCount(v)
            }}
            options={PAYMENT_FREQUENCY_OPTIONS.map(o => ({ value: String(o.value), label: o.label }))}
          />
          <Input label="PDC Count" type="number" value={formPdcCount} onChange={e => setFormPdcCount(Number(e.target.value))} placeholder="12" />
        </div>
      </Modal>

      {/* Financial Centre Modal */}
      <Modal
        open={selectedLeaseId !== null}
        onClose={() => setSelectedLeaseId(null)}
        title={selectedLease ? `Financial Centre — ${selectedLease.leaseNumber}` : 'Financial Centre'}
        footer={
          <Button variant="secondary" onClick={() => setSelectedLeaseId(null)}>Close</Button>
        }
      >
        {selectedLease && leaseFinancials && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 520, maxWidth: 600 }}>
            {/* Tenant, Property, Unit Details */}
            <div className="grid-2" style={{ gap: 12 }}>
              <div className="settings-field" style={{ margin: 0 }}>
                <div>
                  <div className="settings-field-label">Tenant</div>
                  <div className="text-xs text-secondary">{selectedTenant?.name || 'Unknown'}</div>
                </div>
              </div>
              <div className="settings-field" style={{ margin: 0 }}>
                <div>
                  <div className="settings-field-label">Property</div>
                  <div className="text-xs text-secondary">{selectedProperty?.name || 'Unknown'}</div>
                </div>
              </div>
              <div className="settings-field" style={{ margin: 0 }}>
                <div>
                  <div className="settings-field-label">Unit</div>
                  <div className="text-xs text-secondary">{selectedUnit?.unitNumber || 'Unknown'}</div>
                </div>
              </div>
              <div className="settings-field" style={{ margin: 0 }}>
                <div>
                  <div className="settings-field-label">Status</div>
                  <Badge variant={selectedLease.status === 'Active' ? 'success' : 'neutral'}>{selectedLease.status}</Badge>
                </div>
              </div>
            </div>

            {/* Contract Financial Summary */}
            <div>
              <div className="text-sm fw-600 mb-1" style={{ color: 'var(--primary)' }}>Contract Financials</div>
              <div className="settings-field" style={{ margin: 0, marginBottom: 4 }}>
                <span className="settings-field-label">Annual Contract</span>
                <span className="fw-600">{fmt(leaseFinancials.annualRent)}</span>
              </div>
              <div className="settings-field" style={{ margin: 0, marginBottom: 4 }}>
                <span className="settings-field-label">Monthly Rent</span>
                <span className="fw-600">{fmt(leaseFinancials.monthlyRent)}</span>
              </div>
              <div className="settings-field" style={{ margin: 0, marginBottom: 4 }}>
                <span className="settings-field-label">Collected Rent</span>
                <span className="fw-600 text-success">{fmt(leaseFinancials.collectedRent)}</span>
              </div>
              <div className="settings-field" style={{ margin: 0, marginBottom: 4 }}>
                <span className="settings-field-label">Outstanding Rent</span>
                <span className={`fw-600 ${leaseFinancials.outstandingRent > 0 ? 'text-danger' : 'text-success'}`}>
                  {fmt(leaseFinancials.outstandingRent)}
                </span>
              </div>
              {depositBalances && leaseDepositRecord ? (
                <>
                  <div className="settings-field" style={{ margin: 0, marginBottom: 4 }}>
                    <span className="settings-field-label">Deposit Required</span>
                    <span className="fw-600">{fmt(depositBalances.expectedAmount)}</span>
                  </div>
                  <div className="settings-field" style={{ margin: 0, marginBottom: 4 }}>
                    <span className="settings-field-label">Deposit Held</span>
                    <span className="fw-600 text-success">{fmt(depositBalances.currentBalance)}</span>
                  </div>
                  <div className="settings-field" style={{ margin: 0, marginBottom: 4 }}>
                    <span className="settings-field-label">Deposit Outstanding</span>
                    <span className={`fw-600 ${depositBalances.outstandingAmount > 0 ? 'text-warning' : ''}`}>{fmt(depositBalances.outstandingAmount)}</span>
                  </div>
                  <div className="settings-field" style={{ margin: 0, marginBottom: 4 }}>
                    <span className="settings-field-label">Deposit Refunded</span>
                    <span className="fw-600 text-secondary">{fmt(depositBalances.refundedAmount)}</span>
                  </div>
                  <div className="settings-field" style={{ margin: 0, marginBottom: 4 }}>
                    <span className="settings-field-label">Deposit Forfeited</span>
                    <span className="fw-600 text-danger">{fmt(depositBalances.forfeitedAmount)}</span>
                  </div>
                  <div className="settings-field" style={{ margin: 0, marginBottom: 4 }}>
                    <span className="settings-field-label">Deposit Status</span>
                    <Badge variant={
                      leaseDepositRecord.status === 'Fully Refunded' ? 'success' :
                      leaseDepositRecord.status === 'Fully Forfeited' ? 'danger' :
                      leaseDepositRecord.status === 'Expected' ? 'warning' : 'neutral'
                    }>{leaseDepositRecord.status}</Badge>
                  </div>
                </>
              ) : (
                <div className="settings-field" style={{ margin: 0, marginBottom: 4 }}>
                  <span className="settings-field-label">Security Deposit</span>
                  <span className="fw-600">{fmt(selectedLease.deposit)}</span>
                </div>
              )}
              <div className="settings-field" style={{ margin: 0 }}>
                <span className="settings-field-label">Security Cheque</span>
                <span className="text-mono text-sm">{selectedLease.securityChequeNumber || '—'}</span>
              </div>
            </div>

            {/* PDC Schedule */}
            <div>
              <div className="text-sm fw-600 mb-1" style={{ color: 'var(--primary)' }}>PDC Schedule</div>
              {selectedLeaseCheques.length === 0 ? (
                <div className="text-xs text-secondary" style={{ padding: '12px 0' }}>
                  No PDC slots generated yet. PDC slots are created when rent is first recorded.
                </div>
              ) : (
                <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <table className="property-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th className="text-xs">#</th>
                        <th className="text-xs">Cheque</th>
                        <th className="text-xs">Due</th>
                        <th className="text-xs">Amount</th>
                        <th className="text-xs">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedLeaseCheques.map(c => (
                        <tr key={c.id}>
                          <td className="text-xs text-secondary">{c.slotIndex + 1}</td>
                          <td className="text-xs text-mono">{c.chequeNumber}</td>
                          <td className="text-xs">{formatDate(c.dueDate, dateFormat)}</td>
                          <td className="text-xs text-mono fw-600">{fmt(c.amount)}</td>
                          <td><Badge variant={c.status === 'Cleared' ? 'success' : c.status === 'Deposited' ? 'primary' : c.status === 'Bounced' ? 'danger' : 'warning'}>{c.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Linked Vouchers */}
            <div>
              <div className="text-sm fw-600 mb-1" style={{ color: 'var(--primary)' }}>Accounting Entries</div>
              {leaseFinancials.linkedVouchers.length === 0 ? (
                <div className="text-xs text-secondary" style={{ padding: '12px 0' }}>
                  No accounting entries linked to this lease. Create receipt vouchers with the lease number as reference.
                </div>
              ) : (
                <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <table className="property-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th className="text-xs">Voucher</th>
                        <th className="text-xs">Date</th>
                        <th className="text-xs">Type</th>
                        <th className="text-xs">Description</th>
                        <th className="text-xs">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaseFinancials.linkedVouchers.map(v => (
                        <tr key={v.id}
                          className="hover-lift"
                          style={{ cursor: 'pointer' }}
                          onClick={() => setDrillVoucher(drillVoucher?.id === v.id ? null : v)}
                        >
                          <td className="text-xs text-mono fw-600" style={{ color: 'var(--primary)' }}>{v.number}</td>
                          <td className="text-xs">{formatDate(v.date, dateFormat)}</td>
                          <td className="text-xs"><Badge variant="neutral">{v.type}</Badge></td>
                          <td className="text-xs">{v.description}</td>
                          <td><Badge variant="success">Posted</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {drillVoucher && (
                <div style={{ marginTop: 8, padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg-secondary)' }}>
                  <div className="text-sm fw-600 mb-1" style={{ color: 'var(--primary)' }}>Voucher Timeline</div>
                  <VoucherTimeline voucher={drillVoucher} dateFormat={dateFormat} />
                  <div className="text-sm fw-600 mb-1 mt-2" style={{ color: 'var(--primary)' }}>Ledger Entries</div>
                  <table className="property-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th className="text-xs">Account</th>
                        <th className="text-xs">Debit</th>
                        <th className="text-xs">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drillVoucher.lines.map((line, i) => {
                        const acct = accounts.find(a => a.id === line.accountId)
                        return (
                          <tr key={i}>
                            <td className="text-xs fw-500">{acct?.name || line.accountId}</td>
                            <td className="text-xs text-mono">{line.type === 'Debit' ? `${currency} ${line.baseAmount.toLocaleString()}` : '—'}</td>
                            <td className="text-xs text-mono">{line.type === 'Credit' ? `${currency} ${line.baseAmount.toLocaleString()}` : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Leases</div>
            <div className="page-subtitle">{leases.length} lease{leases.length !== 1 ? 's' : ''} on record</div>
          </div>
        </div>
        <div className="page-header-right">
          <Button variant="primary" size="sm" onClick={openAdd}><PlusIcon /> New Lease</Button>
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid">
          <KpiCard label="Active Leases" value={String(activeLeases)} accentColor="var(--success)" />
          <KpiCard label="Total Annual Rent" value={fmt(totalAnnualRent)} accentColor="var(--primary)" />
          <KpiCard label="Total Security Deposits" value={fmt(totalDeposits)} accentColor="var(--accent)" />
        </div>

        <div className="data-table-toolbar">
          <div className="data-table-filters">
            <div className="filter-bar" style={{ padding: 0 }}>
              {['All', 'Active', 'Expired', 'Terminated'].map(f => (
                <Button key={f} variant={statusFilter === f ? 'primary' : 'secondary'} size="sm" onClick={() => setStatusFilter(f)}>
                  {f}
                </Button>
              ))}
            </div>
          </div>
          <div className="data-table-search" style={{ minWidth: 260 }}>
            <SearchIcon />
            <input
              type="text"
              className="data-table-search-input"
              placeholder="Search lease number, tenant, property..."
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

        <DataTable<LeaseEntry>
          columns={columns}
          data={filtered}
          keyExtractor={l => l.id}
          pageSize={10}
          emptyState={
            <EmptyState
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>}
              title={searchQuery || statusFilter !== 'All' ? 'No leases found' : 'No leases yet'}
              text={searchQuery ? 'Try adjusting your search' : 'Create your first lease to start tracking rent.'}
              action={!searchQuery && statusFilter === 'All' ? <Button variant="primary" onClick={openAdd}><PlusIcon /> New Lease</Button> : undefined}
            />
          }
        />
      </div>
    </>
  )
}
