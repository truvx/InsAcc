import React, { useState, useMemo } from 'react'
import type { TenantEntry, LeaseEntry, UnitEntry } from '../data/propertyTypes'
import { Badge, Button, PlusIcon, Input, Select, Modal, SearchIcon, CloseIcon, EditIcon, TrashIcon, EmptyState, KpiCard } from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
import { formatDate } from '../utils'
import { createTenant, updateTenant, deleteTenant, searchTenants } from '../services/tenantService'
import ConfirmDialog from './design/ConfirmDialog'
import Toast from './Toast'

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

interface Props {
  currency?: string
  dateFormat?: string
  language?: string
  tenants: TenantEntry[]
  setTenants: React.Dispatch<React.SetStateAction<TenantEntry[]>>
  leases?: LeaseEntry[]
  units?: UnitEntry[]
  properties?: any[]
  onNavigate?: (page: string) => void
}

interface TenantForm {
  name: string
  phone: string
  email: string
  documents: string[]
  nationality: string
  passportNumber: string
  emiratesId: string
  dateOfBirth: string
  occupation: string
  company: string
  emergencyContact: string
  emergencyPhone: string
  emergencyRelationship: string
  country: string
  city: string
  address: string
  notes: string
  status: 'Active' | 'Inactive'
  unitId: string | null
}

const DEFAULT_FORM: TenantForm = {
  name: '',
  phone: '',
  email: '',
  documents: [],
  nationality: '',
  passportNumber: '',
  emiratesId: '',
  dateOfBirth: '',
  occupation: '',
  company: '',
  emergencyContact: '',
  emergencyPhone: '',
  emergencyRelationship: '',
  country: '',
  city: '',
  address: '',
  notes: '',
  status: 'Active',
  unitId: null,
}

export default function PropertyTenants({ currency: _currency, dateFormat = 'DD/MM/YYYY', language: _language, tenants, setTenants, leases = [], units = [], properties = [], onNavigate }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...DEFAULT_FORM })
  const [deleteTarget, setDeleteTarget] = useState<TenantEntry | null>(null)
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' })
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const [showMoreDetails, setShowMoreDetails] = useState(false)

  const activeTenants = useMemo(() => tenants.filter(t => (t.status ?? 'Active') === 'Active'), [tenants])

  const tenantsWithLease = useMemo(() => {
    const leaseTenantIds = new Set(leases.map(l => l.tenantId))
    return tenants.filter(t => leaseTenantIds.has(t.id))
  }, [tenants, leases])

  const filteredTenants = useMemo(() => {
    let result = searchTenants(tenants, searchQuery)
    if (statusFilter !== 'All') {
      result = result.filter(t => (t.status ?? 'Active') === statusFilter)
    }
    return result
  }, [tenants, searchQuery, statusFilter])

  const getActiveLeaseCount = (tenantId: string) => leases.filter(l => l.tenantId === tenantId && l.status === 'Active').length
  const getTotalLeaseCount = (tenantId: string) => leases.filter(l => l.tenantId === tenantId).length
  const getUnitName = (unitId: string | null) => {
    if (!unitId) return '—'
    const u = units.find(u => u.id === unitId)
    return u?.unitNumber || u?.id || '—'
  }

  const selectedTenant = useMemo(() => {
    if (!selectedTenantId) return null
    return tenants.find(t => t.id === selectedTenantId) || null
  }, [tenants, selectedTenantId])

  const tenantLeases = useMemo(() => {
    if (!selectedTenantId) return []
    return leases.filter(l => l.tenantId === selectedTenantId)
  }, [leases, selectedTenantId])

  const openAdd = () => {
    setForm({ ...DEFAULT_FORM })
    setEditingId(null)
    setShowMoreDetails(false)
    setShowModal(true)
  }

  const openEdit = (tenant: TenantEntry) => {
    setForm({
      name: tenant.name,
      phone: tenant.phone,
      email: tenant.email,
      documents: tenant.documents,
      nationality: tenant.nationality || '',
      passportNumber: tenant.passportNumber || '',
      emiratesId: tenant.emiratesId || '',
      dateOfBirth: tenant.dateOfBirth || '',
      occupation: tenant.occupation || '',
      company: tenant.company || '',
      emergencyContact: tenant.emergencyContact,
      emergencyPhone: tenant.emergencyPhone,
      emergencyRelationship: tenant.emergencyRelationship || '',
      country: tenant.country || '',
      city: tenant.city || '',
      address: tenant.address || '',
      notes: tenant.notes,
      status: tenant.status || 'Active',
      unitId: tenant.unitId,
    })
    setEditingId(tenant.id)
    setShowModal(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      setToast({ visible: true, message: 'Tenant name is required', type: 'error' })
      return
    }

    if (editingId) {
      updateTenant(setTenants, editingId, form)
      setToast({ visible: true, message: 'Tenant updated successfully', type: 'success' })
      setShowModal(false)
    } else {
      const created = createTenant(setTenants, form)
      setToast({ visible: true, message: 'Tenant created successfully', type: 'success' })
      setShowModal(false)
      setSelectedTenantId(created.id)
    }
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    const activeLeaseCount = getActiveLeaseCount(deleteTarget.id)
    if (activeLeaseCount > 0) {
      setToast({ visible: true, message: `Cannot delete tenant with ${activeLeaseCount} active lease(s)`, type: 'error' })
      setDeleteTarget(null)
      return
    }
    deleteTenant(setTenants, deleteTarget.id)
    setToast({ visible: true, message: 'Tenant deleted successfully', type: 'success' })
    setDeleteTarget(null)
    if (selectedTenantId === deleteTarget.id) setSelectedTenantId(null)
  }

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const columns: Column<TenantEntry>[] = [
    {
      key: 'name',
      header: 'Name',
      render: t => {
        const activeLease = leases.find(l => l.tenantId === t.id && l.status === 'Active')
        const unit = activeLease ? units.find(u => u.id === activeLease.unitId) : null
        const prop = unit ? properties.find(p => p.id === unit.propertyId) : null
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{ cursor: 'pointer', fontWeight: 500 }}
              onClick={() => setSelectedTenantId(selectedTenantId === t.id ? null : t.id)}
            >
              {t.name}
            </span>
            {unit && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                🏠 {prop ? prop.name : 'Property'} · Unit {unit.unitNumber}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'phone',
      header: 'Phone',
      render: t => <span className="text-sm">{t.phone || '—'}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      render: t => <span className="text-sm">{t.email || '—'}</span>,
    },
    {
      key: 'nationality',
      header: 'Nationality',
      render: t => <span className="text-sm">{t.nationality || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: t => (
        <Badge variant={(t.status ?? 'Active') === 'Active' ? 'success' : 'neutral'}>
          {t.status ?? 'Active'}
        </Badge>
      ),
    },
    {
      key: 'leases',
      header: 'Leases',
      render: t => (
        <span className="text-sm">
          {getTotalLeaseCount(t.id)} ({getActiveLeaseCount(t.id)} active)
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: t => <span className="text-sm">{formatDate(t.createdAt, dateFormat)}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: t => (
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="icon-button" onClick={() => openEdit(t)} title="Edit tenant">
            <EditIcon />
          </button>
          <button className="icon-button" onClick={() => setDeleteTarget(t)} title="Delete tenant" style={{ color: 'var(--danger)' }}>
            <TrashIcon />
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Tenant Management</div>
          <div className="page-subtitle">Manage property tenants and their details</div>
        </div>
        <Button variant="primary" size="sm" onClick={openAdd}>
          <PlusIcon /> Add Tenant
        </Button>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          <KpiCard label="Total Tenants" value={String(tenants.length)} accentColor="#3B82F6" />
          <KpiCard label="Active" value={String(activeTenants.length)} accentColor="#10B981" />
          <KpiCard label="With Leases" value={String(tenantsWithLease.length)} accentColor="#F59E0B" />
        </div>

        <DataTable<TenantEntry>
          columns={columns}
          data={filteredTenants}
          keyExtractor={t => t.id}
          searchable
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterBar={
            <Select
              label="Status"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
          }
          emptyState={
            <EmptyState
              title={searchQuery ? 'No tenants match your search' : 'No tenants yet'}
              text={searchQuery ? 'Try adjusting your search query' : 'Add your first tenant to get started'}
              action={searchQuery ? undefined : <Button variant="primary" onClick={openAdd}>Add Tenant</Button>}
            />
          }
        />

        {selectedTenant && (
          <div style={{ marginTop: 24, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedTenant.name}</div>
              <Button variant="secondary" size="sm" onClick={() => setSelectedTenantId(null)}>Close</Button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Contact</div>
                <div style={{ fontSize: 13 }}>{selectedTenant.phone || '—'}</div>
                <div style={{ fontSize: 13 }}>{selectedTenant.email || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Identity</div>
                <div style={{ fontSize: 13 }}>Passport: {selectedTenant.passportNumber || '—'}</div>
                <div style={{ fontSize: 13 }}>Emirates ID: {selectedTenant.emiratesId || '—'}</div>
                <div style={{ fontSize: 13 }}>Nationality: {selectedTenant.nationality || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Address</div>
                <div style={{ fontSize: 13 }}>{selectedTenant.address || '—'}</div>
                <div style={{ fontSize: 13 }}>{[selectedTenant.city, selectedTenant.country].filter(Boolean).join(', ') || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Emergency Contact</div>
                <div style={{ fontSize: 13 }}>{selectedTenant.emergencyContact || '—'}</div>
                <div style={{ fontSize: 13 }}>{selectedTenant.emergencyPhone || '—'}</div>
                {selectedTenant.emergencyRelationship && <div style={{ fontSize: 13 }}>{selectedTenant.emergencyRelationship}</div>}
              </div>
            </div>
            {tenantLeases.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>Leases ({tenantLeases.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tenantLeases.map(l => (
                    <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                      <div>
                        <span style={{ fontWeight: 500, fontSize: 13 }}>{l.leaseNumber}</span>
                        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                          Unit: {getUnitName(l.unitId)}
                        </span>
                      </div>
                      <Badge variant={l.status === 'Active' ? 'success' : l.status === 'Expired' ? 'neutral' : 'warning'}>
                        {l.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Tenant' : 'New Tenant'}
      >
        {editingId ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-row">
              <Input label="Full Name *" value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="e.g. John Doe" />
              <Input label="Phone" value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="e.g. +971 50 123 4567" />
              <Input label="Email" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="e.g. john@example.com" />
            </div>
            <div className="form-row">
              <Input label="Nationality" value={form.nationality} onChange={e => updateField('nationality', e.target.value)} placeholder="e.g. UAE" />
              <Input label="Passport Number" value={form.passportNumber} onChange={e => updateField('passportNumber', e.target.value)} placeholder="e.g. N12345678" />
              <Input label="Emirates ID" value={form.emiratesId} onChange={e => updateField('emiratesId', e.target.value)} placeholder="e.g. 784-..." />
            </div>
            <div className="form-row">
              <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={e => updateField('dateOfBirth', e.target.value)} />
              <Input label="Occupation" value={form.occupation} onChange={e => updateField('occupation', e.target.value)} placeholder="e.g. Engineer" />
              <Input label="Company" value={form.company} onChange={e => updateField('company', e.target.value)} placeholder="e.g. Acme Corp" />
            </div>
            <div className="form-row">
              <Input label="Country" value={form.country} onChange={e => updateField('country', e.target.value)} placeholder="e.g. UAE" />
              <Input label="City" value={form.city} onChange={e => updateField('city', e.target.value)} placeholder="e.g. Dubai" />
            </div>
            <Input label="Street Address" value={form.address} onChange={e => updateField('address', e.target.value)} placeholder="e.g. 123 Main St, Apt 4B" />
            <div className="form-row">
              <Input label="Emergency Contact" value={form.emergencyContact} onChange={e => updateField('emergencyContact', e.target.value)} placeholder="e.g. Jane Doe" />
              <Input label="Emergency Phone" value={form.emergencyPhone} onChange={e => updateField('emergencyPhone', e.target.value)} placeholder="e.g. +971 50..." />
              <Input label="Relationship" value={form.emergencyRelationship} onChange={e => updateField('emergencyRelationship', e.target.value)} placeholder="e.g. Spouse" />
            </div>
            <Input label="Notes" value={form.notes} onChange={e => updateField('notes', e.target.value)} placeholder="Additional notes..." />
            <Select
              label="Status"
              value={form.status}
              onChange={e => updateField('status', e.target.value as 'Active' | 'Inactive')}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSave}>Update Tenant</Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-row">
              <Input label="Full Name *" value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="e.g. John Doe" />
              <Input label="Mobile Number *" value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="e.g. +971 50 123 4567" />
            </div>
            <div className="form-row">
              <Input label="Email (optional)" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="e.g. john@example.com" />
              <Input label="Emirates ID / Passport (optional)" value={form.emiratesId || form.passportNumber} onChange={e => {
                const val = e.target.value
                updateField('emiratesId', val)
                updateField('passportNumber', '')
              }} placeholder="e.g. 784-... or N12345678" />
            </div>

            <div
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '8px 0', fontSize: 12, fontWeight: 600, color: 'var(--primary)', userSelect: 'none' }}
            >
              {showMoreDetails ? <ChevronDown /> : <ChevronRight />}
              More Details (Optional)
            </div>

            {showMoreDetails && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-row">
                  <Input label="Nationality" value={form.nationality} onChange={e => updateField('nationality', e.target.value)} placeholder="e.g. UAE" />
                  <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={e => updateField('dateOfBirth', e.target.value)} />
                  <Input label="Occupation" value={form.occupation} onChange={e => updateField('occupation', e.target.value)} placeholder="e.g. Engineer" />
                </div>
                <div className="form-row">
                  <Input label="Company" value={form.company} onChange={e => updateField('company', e.target.value)} placeholder="e.g. Acme Corp" />
                  <Input label="Country" value={form.country} onChange={e => updateField('country', e.target.value)} placeholder="e.g. UAE" />
                  <Input label="City" value={form.city} onChange={e => updateField('city', e.target.value)} placeholder="e.g. Dubai" />
                </div>
                <Input label="Address" value={form.address} onChange={e => updateField('address', e.target.value)} placeholder="e.g. 123 Main St, Apt 4B" />
                <div className="form-row">
                  <Input label="Emergency Contact Name" value={form.emergencyContact} onChange={e => updateField('emergencyContact', e.target.value)} placeholder="e.g. Jane Doe" />
                  <Input label="Emergency Contact Phone" value={form.emergencyPhone} onChange={e => updateField('emergencyPhone', e.target.value)} placeholder="e.g. +971 50..." />
                  <Input label="Relationship" value={form.emergencyRelationship} onChange={e => updateField('emergencyRelationship', e.target.value)} placeholder="e.g. Spouse" />
                </div>
                <Input label="Notes" value={form.notes} onChange={e => updateField('notes', e.target.value)} placeholder="Additional notes..." />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSave}>Create Tenant</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Tenant"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />

      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          visible={toast.visible}
          onClose={() => setToast(prev => ({ ...prev, visible: false }))}
        />
      )}
    </>
  )
}
