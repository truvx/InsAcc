import React, { useState, useMemo, useEffect, useRef } from 'react'
import type { Profile } from '../data/sampleData'
import type {
  PropertyCategory, PropertyBuilding, PropertyUnit,
  PropertyTenant, RentPayment,
} from '../data/propertyData'
import Toast from './Toast'
import { Modal } from './design/DesignSystem'
import { DatePicker, MonthPicker } from './design/DatePicker'
import { formatDate } from '../utils'


interface Props {
  profile: Profile
  currency?: string
  dateFormat?: string
  language?: string
  categories: PropertyCategory[]
  setCategories: React.Dispatch<React.SetStateAction<PropertyCategory[]>>
  buildings: PropertyBuilding[]
  setBuildings: React.Dispatch<React.SetStateAction<PropertyBuilding[]>>
  units: PropertyUnit[]
  tenants: PropertyTenant[]
  rentPayments: RentPayment[]
  setUnits: React.Dispatch<React.SetStateAction<PropertyUnit[]>>
  setTenants: React.Dispatch<React.SetStateAction<PropertyTenant[]>>
  setRentPayments: React.Dispatch<React.SetStateAction<RentPayment[]>>
  page?: string
  onNavigate?: (page: string) => void
}

export default function Property({
  profile, currency = 'AED', dateFormat = 'DD/MM/YYYY', language = 'English',
  categories, setCategories, buildings, setBuildings, units, tenants, rentPayments,
  setUnits, setTenants, setRentPayments,
  page, onNavigate,
}: Props) {
  const [activeTab, setActiveTab] = useState(page || 'dashboard')

  useEffect(() => {
    if (page && page !== activeTab) setActiveTab(page)
  }, [page])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    onNavigate?.(tab)
  }
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const [showTenantForm, setShowTenantForm] = useState(false)
  const [tenantName, setTenantName] = useState('')
  const [tenantPhone, setTenantPhone] = useState('')
  const [tenantEmail, setTenantEmail] = useState('')
  const [tenantUnit, setTenantUnit] = useState('')
  const [tenantLeaseStart, setTenantLeaseStart] = useState('')
  const [tenantLeaseEnd, setTenantLeaseEnd] = useState('')
  const [tenantContractAmount, setTenantContractAmount] = useState('')
  const [tenantPaymentMode, setTenantPaymentMode] = useState<'cash' | 'cheque' | 'online'>('cash')
  const [tenantSecurityCheque, setTenantSecurityCheque] = useState('')
  const [tenantPdcCheque, setTenantPdcCheque] = useState('')
  const [tenantIsPaid, setTenantIsPaid] = useState(false)
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null)

  const [editingRentId, setEditingRentId] = useState<string | null>(null)
  const [showRentForm, setShowRentForm] = useState(false)
  const [rentUnit, setRentUnit] = useState('')
  const [rentAmount, setRentAmount] = useState('')
  const [rentMonth, setRentMonth] = useState('')
  const [rentPaymentMode, setRentPaymentMode] = useState<'cash' | 'cheque' | 'online'>('cash')
  const [rentCreditedTo, setRentCreditedTo] = useState<'cash' | 'cheque'>('cash')
  const [rentSecurityCheque, setRentSecurityCheque] = useState('')
  const [rentPdcCheque, setRentPdcCheque] = useState('')

  const [activeCategory, setActiveCategory] = useState(categories[0]?.id || 'building')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingTenantId, setUploadingTenantId] = useState<string | null>(null)

  const handleContractUpload = (tenantId: string) => {
    setUploadingTenantId(tenantId)
    fileInputRef.current?.click()
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uploadingTenantId) return
    const reader = new FileReader()
    reader.onload = () => {
      const data = reader.result as string
      setTenants(prev => prev.map(t => t.id === uploadingTenantId ? { ...t, contractFile: { name: file.name, data, type: file.type } } : t))
      setUploadingTenantId(null)
      setToast({ visible: true, message: 'Contract uploaded', type: 'success' })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleDownloadContract = (tenant: PropertyTenant) => {
    if (!tenant.contractFile) return
    const a = document.createElement('a')
    a.href = tenant.contractFile.data
    a.download = tenant.contractFile.name
    a.click()
  }

  // Category & Building management
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showAddBuilding, setShowAddBuilding] = useState(false)
  const [newBuildingName, setNewBuildingName] = useState('')
  const [newBuildingCategory, setNewBuildingCategory] = useState(categories[0]?.id || 'building')



  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return
    const id = `cat-${Date.now()}`
    setCategories(prev => [...prev, { id, name: newCategoryName.trim() }])
    setNewCategoryName('')
    setShowAddCategory(false)
    setToast({ visible: true, message: 'Category added', type: 'success' })
  }

  const handleDeleteCategory = (catId: string) => {
    const cat = categories.find(c => c.id === catId)
    if (!cat) return
    const hasBuildings = buildings.some(b => b.categoryId === catId)
    if (hasBuildings && !confirm(`Delete category "${cat.name}"? All buildings under it will also be removed.`)) return
    setCategories(prev => prev.filter(c => c.id !== catId))
    setBuildings(prev => prev.filter(b => b.categoryId !== catId))
    setUnits(prev => prev.filter(u => !buildings.some(b => b.categoryId === catId && b.id === u.buildingId)))
    if (activeCategory === catId) setActiveCategory(categories[0]?.id || 'building')
    setToast({ visible: true, message: 'Category deleted', type: 'success' })
  }

  const handleAddBuilding = () => {
    if (!newBuildingName.trim()) return
    const id = `bldg-${Date.now()}`
    setBuildings(prev => [...prev, { id, categoryId: newBuildingCategory, name: newBuildingName.trim() }])
    setNewBuildingName('')
    setShowAddBuilding(false)
    setToast({ visible: true, message: 'Building added', type: 'success' })
  }

  const handleDeleteBuilding = (bldId: string) => {
    const bld = buildings.find(b => b.id === bldId)
    if (!bld) return
    if (!confirm(`Delete "${bld.name}"? All units under it will also be removed.`)) return
    setBuildings(prev => prev.filter(b => b.id !== bldId))
    setUnits(prev => prev.filter(u => u.buildingId !== bldId))
    setToast({ visible: true, message: 'Building deleted', type: 'success' })
  }

  const [editUnitId, setEditUnitId] = useState<string | null>(null)
  const [editRent, setEditRent] = useState('')

  const occupiedUnits = units.filter(u => u.status === 'occupied')
  const vacantUnits = units.filter(u => u.status === 'vacant')
  const totalMonthlyRent = occupiedUnits.reduce((s, u) => s + u.monthlyRent, 0)
  const totalCollected = rentPayments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)

  const collectedByMode = useMemo(() => {
    const paid = rentPayments.filter(p => p.status === 'paid')
    return {
      cash: paid.filter(p => p.paymentMode === 'cash').reduce((s, p) => s + p.amount, 0),
      cheque: paid.filter(p => p.paymentMode === 'cheque').reduce((s, p) => s + p.amount, 0),
      online: paid.filter(p => p.paymentMode === 'online').reduce((s, p) => s + p.amount, 0),
    }
  }, [rentPayments])

  const totalDue = rentPayments.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0)

  const nextId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  const resetTenantForm = () => {
    setEditingTenantId(null)
    setTenantName(''); setTenantPhone(''); setTenantEmail(''); setTenantUnit('')
    setTenantLeaseStart(''); setTenantLeaseEnd(''); setTenantContractAmount('')
    setTenantPaymentMode('cash'); setTenantSecurityCheque(''); setTenantPdcCheque(''); setTenantIsPaid(false)
  }

  const handleAddTenant = () => {
    if (!tenantName || !tenantUnit) {
      setToast({ visible: true, message: 'Enter tenant name and select a customer/unit', type: 'error' })
      return
    }
    if (editingTenantId) {
      if (!confirm('Update this tenant record?')) return
      const oldUnitId = tenants.find(t => t.id === editingTenantId)?.unitId
      setTenants(prev => prev.map(t => t.id === editingTenantId ? {
        ...t,
        name: tenantName, phone: tenantPhone, email: tenantEmail,
        unitId: tenantUnit, leaseStart: tenantLeaseStart, leaseEnd: tenantLeaseEnd,
        contractAmount: parseFloat(tenantContractAmount) || 0, paymentMode: tenantPaymentMode,
        securityCheque: tenantSecurityCheque, pdcCheque: tenantPdcCheque, isPaid: tenantIsPaid,
      } : t))
      if (oldUnitId && oldUnitId !== tenantUnit) {
        setUnits(prev => prev.map(u => u.id === oldUnitId ? { ...u, customerId: null, status: 'vacant' } : u))
        setUnits(prev => prev.map(u => u.id === tenantUnit ? { ...u, customerId: editingTenantId, status: 'occupied' } : u))
      }
      setEditingTenantId(null)
      setToast({ visible: true, message: 'Tenant updated', type: 'success' })
    } else {
      const tenant: PropertyTenant = {
        id: nextId('tnt'),
        name: tenantName,
        phone: tenantPhone,
        email: tenantEmail,
        unitId: tenantUnit,
        leaseStart: tenantLeaseStart,
        leaseEnd: tenantLeaseEnd,
        contractAmount: parseFloat(tenantContractAmount) || 0,
        paymentMode: tenantPaymentMode,
        securityCheque: tenantSecurityCheque,
        pdcCheque: tenantPdcCheque,
        isPaid: tenantIsPaid,
        invoiceGenerated: false,
      }
      setTenants(prev => [...prev, tenant])
      setUnits(prev => prev.map(u => u.id === tenantUnit ? { ...u, customerId: tenant.id, status: 'occupied' } : u))
      setToast({ visible: true, message: 'Tenant added', type: 'success' })
    }
    setShowTenantForm(false)
    setTenantName(''); setTenantPhone(''); setTenantEmail(''); setTenantUnit('')
    setTenantLeaseStart(''); setTenantLeaseEnd(''); setTenantContractAmount('')
    setTenantPaymentMode('cash'); setTenantSecurityCheque(''); setTenantPdcCheque(''); setTenantIsPaid(false)
  }

  const handleRemoveTenant = (tenant: PropertyTenant) => {
    if (!confirm(`Remove tenant ${tenant.name}? Customer/unit will become vacant.`)) return
    setTenants(prev => prev.filter(t => t.id !== tenant.id))
    setUnits(prev => prev.map(u => u.id === tenant.unitId ? { ...u, customerId: null, status: 'vacant' } : u))
    setToast({ visible: true, message: 'Tenant removed', type: 'success' })
  }

  const handleEditTenant = (tenant: PropertyTenant) => {
    setEditingTenantId(tenant.id)
    setTenantName(tenant.name)
    setTenantPhone(tenant.phone || '')
    setTenantEmail(tenant.email || '')
    setTenantUnit(tenant.unitId)
    setTenantLeaseStart(tenant.leaseStart || '')
    setTenantLeaseEnd(tenant.leaseEnd || '')
    setTenantContractAmount(String(tenant.contractAmount || ''))
    setTenantPaymentMode(tenant.paymentMode)
    setTenantSecurityCheque(tenant.securityCheque || '')
    setTenantPdcCheque(tenant.pdcCheque || '')
    setTenantIsPaid(!!tenant.isPaid)
    setShowTenantForm(true)
  }

  const handleEditRent = (payment: RentPayment) => {
    setEditingRentId(payment.id)
    setRentUnit(payment.unitId)
    setRentAmount(String(payment.amount))
    setRentMonth(payment.month)
    setRentPaymentMode(payment.paymentMode)
    setRentCreditedTo(payment.creditedTo || 'cash')
    setRentSecurityCheque(payment.securityCheque || '')
    setRentPdcCheque(payment.pdcCheque || '')
    setShowRentForm(true)
  }

  const handleRemoveRent = (id: string) => {
    if (!confirm('Remove this rent payment?')) return
    setRentPayments(prev => prev.filter(p => p.id !== id))
    setToast({ visible: true, message: 'Rent payment removed', type: 'success' })
  }

  const handleGenerateInvoice = (tenant: PropertyTenant) => {
    setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, invoiceGenerated: true } : t))
    setToast({ visible: true, message: `Invoice generated for ${tenant.name}`, type: 'success' })
  }

  const handleRecordRent = () => {
    if (!rentUnit || !rentAmount || !rentMonth) {
      setToast({ visible: true, message: 'Fill all fields', type: 'error' }); return
    }
    const tenant = tenants.find(t => t.unitId === rentUnit)
    if (editingRentId) {
      if (!confirm('Update this rent payment?')) return
      setRentPayments(prev => prev.map(p => p.id === editingRentId ? {
        ...p, unitId: rentUnit, tenantId: tenant?.id || '', amount: parseFloat(rentAmount),
        month: rentMonth, paymentMode: rentPaymentMode, creditedTo: rentCreditedTo,
        securityCheque: rentSecurityCheque, pdcCheque: rentPdcCheque,
      } : p))
      setEditingRentId(null)
      setToast({ visible: true, message: 'Rent updated', type: 'success' })
    } else {
      const payment: RentPayment = {
        id: nextId('rent'),
        unitId: rentUnit,
        tenantId: tenant?.id || '',
        date: new Date().toISOString().split('T')[0],
        amount: parseFloat(rentAmount),
        month: rentMonth,
        status: 'paid',
        paymentMode: rentPaymentMode,
        creditedTo: rentCreditedTo,
        securityCheque: rentSecurityCheque,
        pdcCheque: rentPdcCheque,
      }
      setRentPayments(prev => [payment, ...prev])
      setToast({ visible: true, message: 'Rent recorded', type: 'success' })
    }
    setShowRentForm(false)
    setRentUnit(''); setRentAmount(''); setRentMonth('')
    setRentPaymentMode('cash'); setRentCreditedTo('cash'); setRentSecurityCheque(''); setRentPdcCheque('')
  }

  const handleUpdateRent = (unitId: string) => {
    const val = parseFloat(editRent)
    if (isNaN(val) || val < 0) return
    setUnits(prev => prev.map(u => u.id === unitId ? { ...u, monthlyRent: val } : u))
    setEditUnitId(null)
    setToast({ visible: true, message: 'Rent updated', type: 'success' })
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'properties', label: 'Properties' },
    { id: 'tenants', label: 'Tenants' },
    { id: 'income', label: 'Rent Income' },
  ]

  return (
    <div className="main-content page-enter">
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg" style={{ display: 'none' }} onChange={handleFileSelected} />
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
      <div className="page-header">
        <div>
          <h1>Property Management</h1>
          <p>Manage buildings, customers, tenants, and rent collection</p>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button key={tab.id} className={`chart-period ${activeTab === tab.id ? 'active' : ''}`} onClick={() => handleTabChange(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <>
            <div className="dashboard-grid" style={{ marginBottom: 20 }}>
              <div className="chart-card" style={{ background: 'linear-gradient(135deg, #1F4E79, #15365A)', border: 'none' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>Total Properties</div>
                <div style={{ color: '#fff', fontSize: 26, fontWeight: 700 }}>{units.length}</div>
              </div>
              <div className="chart-card">
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Occupied</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)' }}>{occupiedUnits.length}</div>
              </div>
              <div className="chart-card">
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Vacant</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#EF4444' }}>{vacantUnits.length}</div>
              </div>
              <div className="chart-card">
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Tenants</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--gold)' }}>{tenants.length}</div>
              </div>
            </div>
            <div className="dashboard-grid" style={{ marginBottom: 20 }}>
              <div className="chart-card" style={{ background: 'linear-gradient(135deg, #2E8B57, #1a5c38)', border: 'none' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>Monthly Rent (Potential)</div>
                <div style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{currency} {totalMonthlyRent.toLocaleString()}</div>
              </div>
              <div className="chart-card">
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Collected (Total)</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>{currency} {totalCollected.toLocaleString()}</div>
              </div>
              <div className="chart-card">
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Overdue</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#EF4444' }}>{currency} {totalDue.toLocaleString()}</div>
              </div>
              <div className="chart-card">
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Total Payments</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>{rentPayments.length}</div>
              </div>
            </div>

            <div className="dashboard-grid" style={{ marginBottom: 20 }}>
              <div className="chart-card">
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Collected (Cash)</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>{currency} {collectedByMode.cash.toLocaleString()}</div>
              </div>
              <div className="chart-card">
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Collected (Cheque)</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>{currency} {collectedByMode.cheque.toLocaleString()}</div>
              </div>
              <div className="chart-card">
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Collected (Bank Transfer)</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1F4E79' }}>{currency} {collectedByMode.online.toLocaleString()}</div>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <div className="chart-title">Buildings Overview</div>
              </div>
              {buildings.map(bld => {
                const bldUnits = units.filter(u => u.buildingId === bld.id)
                const occ = bldUnits.filter(u => u.status === 'occupied').length
                return (
                  <div key={bld.id} className="performance-item" style={{ cursor: 'default' }}>
                    <div className="performance-info">
                      <div className="performance-name">{bld.name}</div>
                      <div className="performance-value">{bldUnits.length} items · {occ} occupied</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {activeTab === 'properties' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              {categories.map(cat => (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button className={`chart-period ${activeCategory === cat.id ? 'active' : ''}`} onClick={() => setActiveCategory(cat.id)}>
                    {cat.name}
                  </button>
                  <button
                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 14, padding: '2px', lineHeight: 1, opacity: 0.6 }}
                    onClick={() => handleDeleteCategory(cat.id)}
                    title="Delete category"
                  >×</button>
                </div>
              ))}
              <button
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: '2px dashed var(--text-light)',
                  background: 'none', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onClick={() => setShowAddCategory(true)}
                title="Add category"
              >+</button>
            </div>
            {categories.filter(cat => cat.id === activeCategory).map(cat => {
              const catBuildings = buildings.filter(b => b.categoryId === cat.id)
              if (catBuildings.length === 0) return null
              return (
                <div key={cat.id}>
                  {catBuildings.map(bld => {
                    const bldUnits = units.filter(u => u.buildingId === bld.id)
                    const bldTenants = tenants.filter(t => bldUnits.some(u => u.id === t.unitId))
                    return (
                      <div key={bld.id} className="chart-card" style={{ marginBottom: 12 }}>
                        <div className="chart-header">
                          <div className="chart-title">{bld.name}</div>
                          <div className="chart-subtitle">{bldUnits.length} items · {bldTenants.length} tenants</div>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                          Units: {bldUnits.filter(u => u.type === 'unit-rent').length} · Shops: {bldUnits.filter(u => u.type === 'shop-rent').length} · Parking: {bldUnits.filter(u => u.type === 'parking-rent').length}
                        </div>
                        {bldUnits.map(unit => {
                          const tnt = tenants.find(t => t.unitId === unit.id)
                          return (
                            <div key={unit.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                              <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: 500 }}>{unit.name}</span>
                                <span style={{ color: 'var(--text-light)', marginLeft: 8, fontSize: 11 }}>
                                  {unit.type === 'unit-rent' ? 'Unit Rent' : unit.type === 'shop-rent' ? 'Shop Rent' : 'Parking Rent'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {editUnitId === unit.id ? (
                                  <>
                                    <input className="settings-input" style={{ width: 80, fontSize: 11 }} type="number" value={editRent} onChange={e => setEditRent(e.target.value)} />
                                    <button className="btn btn-primary" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleUpdateRent(unit.id)}>Save</button>
                                    <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => setEditUnitId(null)}>X</button>
                                  </>
                                ) : (
                                  <span style={{ color: 'var(--gold)', fontWeight: 600, cursor: 'pointer' }} onClick={() => { setEditUnitId(unit.id); setEditRent(String(unit.monthlyRent)) }}>
                                    {currency} {unit.monthlyRent.toLocaleString()}
                                  </span>
                                )}
                                <span style={{
                                  padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600,
                                  background: unit.status === 'occupied' ? 'rgba(46,139,87,0.12)' : 'rgba(239,68,68,0.12)',
                                  color: unit.status === 'occupied' ? 'var(--green)' : '#EF4444',
                                }}>
                                  {unit.status}
                                </span>
                                {tnt && <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{tnt.name}</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )
            })}

<Modal open={showAddCategory} onClose={() => { setShowAddCategory(false); setNewCategoryName('') }} title="Add Category"
              footer={<div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" style={{ padding: '10px 24px' }} onClick={() => { setShowAddCategory(false); setNewCategoryName('') }}>Cancel</button>
                <button className="btn btn-primary" style={{ padding: '10px 24px' }} onClick={handleAddCategory}>Add Category</button>
              </div>}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Enter the name of the new category</div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Category Name</label>
                <input className="input" placeholder="e.g. Commercial" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} autoFocus />
              </div>
            </Modal>

            <div className="chart-card" style={{ marginTop: 12 }}>
              <div className="chart-header">
                <div className="chart-title">Manage Buildings</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                {buildings.filter(b => b.categoryId === activeCategory).map(bld => (
                  <div key={bld.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 8, fontSize: 13 }}>
                    <span style={{ flex: 1 }}>{bld.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-light)' }}>{categories.find(c => c.id === bld.categoryId)?.name}</span>
                    <button
                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}
                      onClick={() => handleDeleteBuilding(bld.id)}
                    >×</button>
                  </div>
                ))}
              </div>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowAddBuilding(true)}>+ Add Building</button>
            </div>

<Modal open={showAddBuilding} onClose={() => { setShowAddBuilding(false); setNewBuildingName('') }} title="Add Building"
              footer={<div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" style={{ padding: '10px 24px' }} onClick={() => { setShowAddBuilding(false); setNewBuildingName('') }}>Cancel</button>
                <button className="btn btn-primary" style={{ padding: '10px 24px' }} onClick={handleAddBuilding}>Add Building</button>
              </div>}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Enter the details of the new building</div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Building Name</label>
                <input className="input" placeholder="e.g. Tower A" value={newBuildingName} onChange={e => setNewBuildingName(e.target.value)} autoFocus />
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Category</label>
                <select className="input" style={{ width: '100%' }} value={newBuildingCategory} onChange={e => setNewBuildingCategory(e.target.value)}>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
            </Modal>
          </div>
        )}

        {activeTab === 'tenants' && (
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">Tenant Management</div>
              <div className="chart-subtitle">{tenants.length} tenants</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <button className="btn btn-secondary" onClick={() => {
                if (showTenantForm && editingTenantId) { setEditingTenantId(null); setShowTenantForm(false); resetTenantForm(); return }
                setShowTenantForm(!showTenantForm)
              }} style={{ width: '100%' }}>
                {showTenantForm ? (editingTenantId ? 'Cancel' : 'Cancel') : '+ Add Tenant'}
              </button>
            </div>
            {showTenantForm && (
              <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
                    <label className="form-label">Tenant Name</label>
                    <input className="input" placeholder="Tenant name" value={tenantName} onChange={e => setTenantName(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                    <label className="form-label">Phone</label>
                    <input className="input" type="tel" placeholder="Phone" value={tenantPhone} onChange={e => setTenantPhone(e.target.value.replace(/\D/g, ''))} />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
                    <label className="form-label">Email</label>
                    <input className="input" placeholder="Email" value={tenantEmail} onChange={e => setTenantEmail(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
                    <label className="form-label">Customer/Unit</label>
                    <select className="settings-field" value={tenantUnit} onChange={e => setTenantUnit(e.target.value)}>
                      <option value="">-- Select --</option>
                      {vacantUnits.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <DatePicker label="Lease Start" value={tenantLeaseStart} onChange={setTenantLeaseStart} />
                  <DatePicker label="Lease End" value={tenantLeaseEnd} onChange={setTenantLeaseEnd} />
                  <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                    <label className="form-label">Contract Amount</label>
                    <input className="input" type="number" placeholder="Amount" value={tenantContractAmount} onChange={e => setTenantContractAmount(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                    <label className="form-label">Payment Mode</label>
                    <select className="settings-field" value={tenantPaymentMode} onChange={e => setTenantPaymentMode(e.target.value as any)}>
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                      <option value="online">Bank Transfer</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                    <label className="form-label">PDC Cheque No.</label>
                    <input className="input" placeholder="PDC cheque" value={tenantPdcCheque} onChange={e => setTenantPdcCheque(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                    <label className="form-label">Security Cheque No.</label>
                    <input className="input" placeholder="Security cheque" value={tenantSecurityCheque} onChange={e => setTenantSecurityCheque(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" id="paidCheck" checked={tenantIsPaid} onChange={e => setTenantIsPaid(e.target.checked)} />
                    <label htmlFor="paidCheck" style={{ fontSize: 13 }}>Amount Paid</label>
                  </div>
                  <button className="btn btn-primary" onClick={handleAddTenant}>{editingTenantId ? 'Update' : 'Add'}</button>
                </div>
              </div>
            )}
            {tenants.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>No tenants yet</div>
            ) : (
              tenants.map(t => {
                const unit = units.find(u => u.id === t.unitId)
                const amount = t.contractAmount || 0
                const isPaid = !!t.isPaid
                const invGenerated = !!t.invoiceGenerated
                const pmode = t.paymentMode || 'cash'
                return (
                  <div key={t.id} className="performance-item">
                    <div className="sidebar-avatar" style={{ background: '#1F4E79' }}>{t.name.split(' ').map(w => w[0]).join('')}</div>
                    <div className="performance-info">
                      <div className="performance-name">{t.name}</div>
                      <div className="performance-value">
                        {unit?.name || t.unitId} · {t.phone} · {currency} {amount.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        Lease: {t.leaseStart || '-'} to {t.leaseEnd || '-'} · Mode: {pmode === 'online' ? 'Bank Transfer' : pmode.charAt(0).toUpperCase() + pmode.slice(1)}
                        {t.pdcCheque && ` · PDC: ${t.pdcCheque}`}
                        {t.securityCheque && ` · Security: ${t.securityCheque}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600,
                        background: isPaid ? 'rgba(46,139,87,0.12)' : 'rgba(239,68,68,0.12)',
                        color: isPaid ? 'var(--green)' : '#EF4444',
                      }}>
                        {isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                      {isPaid && !invGenerated && (
                        <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 10 }} onClick={() => handleGenerateInvoice(t)}>
                          Invoice
                        </button>
                      )}
                      {isPaid && invGenerated && (
                        <span style={{ fontSize: 10, color: 'var(--green)' }}>✓ Inv</span>
                      )}
                      {t.contractFile ? (
                        <button className="btn btn-secondary" style={{ padding: '4px 10px', border: '1px solid var(--blue)', background: 'rgba(31,78,121,0.12)' }} onClick={() => handleDownloadContract(t)} title="Download contract">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </button>
                      ) : (
                        <button className="btn btn-secondary" style={{ padding: '4px 10px', border: '1px solid var(--blue)', background: 'rgba(31,78,121,0.12)' }} onClick={() => handleContractUpload(t.id)} title="Upload contract">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                        </button>
                      )}
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary" style={{ padding: '4px 10px', border: '1px solid var(--gold)', background: 'rgba(212,175,55,0.12)' }} onClick={() => handleEditTenant(t)} title="Edit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '4px 10px', border: '1px solid #EF4444', background: 'rgba(239,68,68,0.12)' }} onClick={() => handleRemoveTenant(t)} title="Remove">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'income' && (
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">Rent Income</div>
              <div className="chart-subtitle">{rentPayments.length} payments recorded</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <button className="btn btn-secondary" onClick={() => {
                if (showRentForm && editingRentId) { setEditingRentId(null); setShowRentForm(false); setRentUnit(''); setRentAmount(''); setRentMonth(''); setRentPaymentMode('cash'); setRentCreditedTo('cash'); setRentSecurityCheque(''); setRentPdcCheque(''); return }
                setShowRentForm(!showRentForm)
              }} style={{ width: '100%' }}>
                {showRentForm ? 'Cancel' : '+ Record Rent Payment'}
              </button>
            </div>
            {showRentForm && (
              <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
                    <label className="form-label">Unit</label>
                    <select className="settings-field" value={rentUnit} onChange={e => setRentUnit(e.target.value)}>
                      <option value="">-- Select --</option>
                      {occupiedUnits.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({currency} {u.monthlyRent.toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 100 }}>
                    <label className="form-label">Amount</label>
                    <input className="input" type="number" placeholder="Amount" value={rentAmount} onChange={e => setRentAmount(e.target.value)} />
                  </div>
                  <MonthPicker label="Month" value={rentMonth} onChange={setRentMonth} />
                  <div className="form-group" style={{ flex: 1, minWidth: 100 }}>
                    <label className="form-label">Payment Mode</label>
                    <select className="settings-field" value={rentPaymentMode} onChange={e => setRentPaymentMode(e.target.value as any)}>
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                      <option value="online">Bank Transfer</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 100 }}>
                    <label className="form-label">Credited To</label>
                    <select className="settings-field" value={rentCreditedTo} onChange={e => setRentCreditedTo(e.target.value as any)}>
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                    <label className="form-label">PDC Cheque No.</label>
                    <input className="input" placeholder="PDC cheque" value={rentPdcCheque} onChange={e => setRentPdcCheque(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                    <label className="form-label">Security Cheque No.</label>
                    <input className="input" placeholder="Security cheque" value={rentSecurityCheque} onChange={e => setRentSecurityCheque(e.target.value)} />
                  </div>
                  <button className="btn btn-primary" onClick={handleRecordRent}>{editingRentId ? 'Update' : 'Record'}</button>
                </div>
              </div>
            )}
            {rentPayments.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>No payments recorded yet</div>
            ) : (
              <>
                <div style={{ padding: '8px 0', fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>
                  Collection Summary · Cash: {currency} {collectedByMode.cash.toLocaleString()} · Cheque: {currency} {collectedByMode.cheque.toLocaleString()} · Bank Transfer: {currency} {collectedByMode.online.toLocaleString()}
                </div>
                {rentPayments.map(p => {
                  const unit = units.find(u => u.id === p.unitId)
                  const tnt = tenants.find(t => t.id === p.tenantId)
                  const rentAmt = p.amount || 0
                  const invDone = tnt?.invoiceGenerated
                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{unit?.name || p.unitId}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {tnt?.name || 'Unknown'} · {p.month}
                          {p.paymentMode && ` · Mode: ${p.paymentMode === 'online' ? 'Bank Transfer' : p.paymentMode.charAt(0).toUpperCase() + p.paymentMode.slice(1)}`}
                          {p.creditedTo && ` · Credited: ${p.creditedTo === 'cash' ? 'Cash' : 'Cheque'}`}
                          {p.pdcCheque && ` · PDC: ${p.pdcCheque}`}
                          {p.securityCheque && ` · Security: ${p.securityCheque}`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontWeight: 700, color: 'var(--green)' }}>{currency} {rentAmt.toLocaleString()}</div>
                        <span style={{
                          padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600,
                          background: p.status === 'paid' ? 'rgba(46,139,87,0.12)' : 'rgba(239,68,68,0.12)',
                          color: p.status === 'paid' ? 'var(--green)' : '#EF4444',
                        }}>{p.status}</span>
                        {p.status === 'paid' && tnt && !invDone && (
                          <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 10 }} onClick={() => handleGenerateInvoice(tnt)}>
                            Invoice
                          </button>
                        )}
                        {p.status === 'paid' && tnt && invDone && (
                          <span style={{ fontSize: 10, color: 'var(--green)' }}>✓ Inv</span>
                        )}
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-secondary" style={{ padding: '2px 8px', border: '1px solid var(--gold)', background: 'rgba(212,175,55,0.12)' }} onClick={() => handleEditRent(p)} title="Edit">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '2px 8px', border: '1px solid #EF4444', background: 'rgba(239,68,68,0.12)' }} onClick={() => handleRemoveRent(p.id)} title="Remove">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
