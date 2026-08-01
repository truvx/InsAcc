import React, { useState, useMemo, useCallback } from 'react'
import type { VendorEntry, PropertyExpense, PropertyEntry } from '../data/propertyTypes'
import { DEFAULT_VENDOR_CATEGORIES } from '../data/propertyTypes'
import { Badge, Button, PlusIcon, Input, Select, Modal, SearchIcon, CloseIcon, EditIcon, TrashIcon, EmptyState, KpiCard } from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
import { formatDate } from '../utils'
import { createVendor, updateVendor, deleteVendor, searchVendors } from '../services/vendorService'
import ConfirmDialog from './design/ConfirmDialog'
import Toast from './Toast'
import { CurrencyText } from './design/CurrencyText'
import { formatCurrency } from '../utils/currencyHelpers'
import type { AuditEvent } from '../data/auditTypes'
import { recordModuleEvent } from '../services/auditService'
import * as XLSX from 'xlsx-js-style'
import { Download, Eye, Printer, Trash2 } from 'lucide-react'
import { exportTableData } from '../services/reportExportService'

interface Props {
  currency?: string
  dateFormat?: string
  language?: string
  vendors: VendorEntry[]
  setVendors: React.Dispatch<React.SetStateAction<VendorEntry[]>>
  expenses: PropertyExpense[]
  properties: PropertyEntry[]
  onAuditEvent?: (event: AuditEvent) => void
}

interface VendorForm {
  name: string
  category: string
  customCategory?: string
  contactPerson: string
  phone: string
  email: string
  trn: string
  address: string
  bankDetails: string
  notes: string
  status: 'Active' | 'Inactive'
}

const emptyForm: VendorForm = {
  name: '',
  category: '',
  customCategory: '',
  contactPerson: '',
  phone: '',
  email: '',
  trn: '',
  address: '',
  bankDetails: '',
  notes: '',
  status: 'Active',
}

export default function PropertyVendors({
  currency = 'AED',
  dateFormat = 'DD/MM/YYYY',
  language = 'en',
  vendors = [],
  setVendors,
  expenses = [],
  properties = [],
  onAuditEvent,
}: Props) {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingVendor, setEditingVendor] = useState<VendorEntry | null>(null)
  const [form, setForm] = useState<VendorForm>({ ...emptyForm })
  const [deleteTarget, setDeleteTarget] = useState<VendorEntry | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [drawerVendor, setDrawerVendor] = useState<VendorEntry | null>(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)

  // ── Computed data ──
  const vendorPaymentTotals = useMemo(() => {
    const map: Record<string, number> = {}
    expenses.forEach(e => {
      if (e.vendorId) {
        map[e.vendorId] = (map[e.vendorId] || 0) + e.totalAmount
      }
    })
    return map
  }, [expenses])

  const vendorExpenseCounts = useMemo(() => {
    const map: Record<string, number> = {}
    expenses.forEach(e => {
      if (e.vendorId) {
        map[e.vendorId] = (map[e.vendorId] || 0) + 1
      }
    })
    return map
  }, [expenses])

  const totalPaidAllVendors = useMemo(() =>
    Object.values(vendorPaymentTotals).reduce((s, v) => s + v, 0),
    [vendorPaymentTotals]
  )

  const activeVendors = useMemo(() => vendors.filter(v => v?.status === 'Active').length, [vendors])

  // ── Filtered list ──
  const filtered = useMemo(() => {
    let list = searchVendors(vendors, search)
    if (filterCategory) list = list.filter(v => v.category === filterCategory)
    if (filterStatus) list = list.filter(v => v.status === filterStatus)
    return list
  }, [vendors, search, filterCategory, filterStatus])

  // ── Vendor ledger (expenses for drawer vendor) ──
  const vendorLedger = useMemo(() => {
    if (!drawerVendor) return []
    return expenses
      .filter(e => e.vendorId === drawerVendor.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [expenses, drawerVendor])

  const vendorLedgerTotal = useMemo(() =>
    vendorLedger.reduce((s, e) => s + e.totalAmount, 0),
    [vendorLedger]
  )

  // ── Handlers ──
  const openAddModal = useCallback(() => {
    setEditingVendor(null)
    setForm({ ...emptyForm })
    setShowModal(true)
  }, [])

  const openEditModal = useCallback((v: VendorEntry) => {
    setEditingVendor(v)
    setForm({
      name: v.name,
      category: v.category,
      customCategory: '',
      contactPerson: v.contactPerson || '',
      phone: v.phone || '',
      email: v.email || '',
      trn: v.trn || '',
      address: v.address || '',
      bankDetails: v.bankDetails || '',
      notes: v.notes || '',
      status: v.status,
    })
    setShowModal(true)
  }, [])

  const handleSave = useCallback(() => {
    if (!form.name.trim()) {
      setToast({ message: 'Vendor name is required', type: 'error' })
      return
    }
    
    let finalCategory = form.category
    if (finalCategory === 'custom') {
      if (!form.customCategory?.trim()) {
        setToast({ message: 'Custom category is required', type: 'error' })
        return
      }
      finalCategory = form.customCategory.trim()
    } else if (!finalCategory.trim()) {
      setToast({ message: 'Category is required', type: 'error' })
      return
    }

    if (editingVendor) {
      updateVendor(setVendors, editingVendor.id, {
        name: form.name.trim(),
        category: finalCategory,
        contactPerson: form.contactPerson.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        trn: form.trn.trim() || undefined,
        address: form.address.trim() || undefined,
        bankDetails: form.bankDetails.trim() || undefined,
        notes: form.notes.trim() || undefined,
        status: form.status,
      })
      if (onAuditEvent) {
        onAuditEvent(recordModuleEvent('Property', 'Update', form.name, editingVendor.id, `Updated vendor: ${form.name}`))
      }
      setToast({ message: 'Vendor updated successfully', type: 'success' })
    } else {
      const newVendor = createVendor(setVendors, {
        name: form.name.trim(),
        category: finalCategory,
        contactPerson: form.contactPerson.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        trn: form.trn.trim() || undefined,
        address: form.address.trim() || undefined,
        bankDetails: form.bankDetails.trim() || undefined,
        notes: form.notes.trim() || undefined,
        status: form.status,
      })
      if (onAuditEvent) {
        onAuditEvent(recordModuleEvent('Property', 'Create', form.name, newVendor.id, `Created vendor: ${form.name}`))
      }
      setToast({ message: 'Vendor created successfully', type: 'success' })
    }
    setShowModal(false)
  }, [form, editingVendor, setVendors, onAuditEvent])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    const linkedCount = vendorExpenseCounts[deleteTarget.id] || 0
    if (linkedCount > 0) {
      setToast({ message: `Cannot delete: ${linkedCount} expense(s) linked to this vendor`, type: 'error' })
      setDeleteTarget(null)
      return
    }
    deleteVendor(setVendors, deleteTarget.id)
    if (onAuditEvent) {
      onAuditEvent(recordModuleEvent('Property', 'Delete', deleteTarget.name, deleteTarget.id, `Deleted vendor: ${deleteTarget.name}`))
    }
    setToast({ message: 'Vendor deleted', type: 'success' })
    setDeleteTarget(null)
  }, [deleteTarget, setVendors, onAuditEvent, vendorExpenseCounts])

  const handleExport = useCallback((format: 'pdf' | 'xlsx') => {
    if (filtered.length === 0) {
      setToast({ message: 'No vendors to export', type: 'error' })
      return
    }
    
    const columns = [
      'Name', 'Category', 'Contact Person', 'Phone', 'Email', 'TRN', 'Total Paid', 'Payments', 'Status'
    ]

    const rows = filtered.map(v => [
      v.name,
      v.category,
      v.contactPerson || '',
      v.phone || '',
      v.email || '',
      v.trn || '',
      vendorPaymentTotals[v.id] || 0,
      vendorExpenseCounts[v.id] || 0,
      v.status
    ])

    exportTableData({
      format,
      title: 'Vendors & Suppliers',
      subtitle: 'List of all registered property vendors',
      filename: `Vendors_${new Date().toISOString().split('T')[0]}`,
      columns,
      rows,
      currency
    })

    setToast({ message: `Exported successfully`, type: 'success' })
    setShowExportMenu(false)
  }, [filtered, vendorPaymentTotals, vendorExpenseCounts, currency])

  const handlePrintLedger = useCallback(() => {
    if (!drawerVendor) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<html><head><title>Vendor Ledger – ${drawerVendor.name}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1a1a2e; }
        h2 { margin: 0 0 4px; } h4 { margin: 0 0 16px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 13px; }
        th { background: #f5f5f7; font-weight: 600; }
        .total { font-weight: 700; font-size: 14px; margin-top: 16px; }
      </style></head><body>
      <h2>Vendor Ledger</h2>
      <h4>${drawerVendor.name} – ${drawerVendor.category}</h4>
      <table>
        <thead><tr><th>Date</th><th>Expense #</th><th>Property</th><th>Category</th><th>Method</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          ${vendorLedger.map(e => {
            const prop = properties.find(p => p.id === e.propertyId)
            return `<tr>
              <td>${formatDate(e.date, dateFormat)}</td>
              <td>${e.expenseNo}</td>
              <td>${prop?.name || '–'}</td>
              <td>${e.category}</td>
              <td>${e.paymentMethod}</td>
              <td style="text-align:right">$<CurrencyText value={e.totalAmount} currency={currency} /></td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
      <p class="total">Total Paid: $<CurrencyText value={vendorLedgerTotal} currency={currency} /></p>
    </body></html>`)
    win.document.close()
    win.print()
  }, [drawerVendor, vendorLedger, vendorLedgerTotal, properties, currency, dateFormat])

  // ── Table columns ──
  const columns: Column<VendorEntry>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Vendor Name',
      sortable: true,
      render: (v: VendorEntry) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 14,
          }}>
            {v?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{v?.name || 'Unnamed Vendor'}</div>
            {v?.contactPerson && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v.contactPerson}</div>}
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', sortable: true, render: (v: VendorEntry) => v?.category || '–' },
    { key: 'phone', header: 'Phone', render: (v: VendorEntry) => v?.phone || '–' },
    {
      key: 'totalPaid',
      header: 'Total Paid',
      sortable: true,
      sortValue: (v: VendorEntry) => vendorPaymentTotals[v.id] || 0,
      render: (v: VendorEntry) => (
        <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
          <CurrencyText value={vendorPaymentTotals[v.id] || 0} currency={currency} />
        </span>
      ),
    },
    {
      key: 'payments',
      header: 'Payments',
      sortable: true,
      sortValue: (v: VendorEntry) => vendorExpenseCounts[v.id] || 0,
      render: (v: VendorEntry) => <Badge variant="neutral">{vendorExpenseCounts[v.id] || 0}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (v: VendorEntry) => (
        <Badge variant={v.status === 'Active' ? 'success' : 'warning'}>{v.status}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (v: VendorEntry) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setDrawerVendor(v) }} title="View Ledger">
            <Eye size={15} />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); openEditModal(v) }} title="Edit">
            <EditIcon />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setDeleteTarget(v) }} title="Delete">
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ], [currency, vendorPaymentTotals, vendorExpenseCounts, openEditModal])

  // ── Category options ──
  const usedCategories = useMemo(() => {
    const set = new Set(vendors.map(v => v?.category).filter(Boolean))
    DEFAULT_VENDOR_CATEGORIES.forEach(c => set.add(c))
    return Array.from(set).sort()
  }, [vendors])

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Total Vendors" value={String(vendors.length)} />
        <KpiCard label="Active Vendors" value={String(activeVendors)} />
        <KpiCard label="Total Paid to Vendors" value={<CurrencyText value={totalPaidAllVendors} currency={currency} />} />
        <KpiCard label="Linked Expenses" value={String(expenses.filter(e => e.vendorId).length)} />
      </div>

      {/* Toolbar */}
      <div className="data-table-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <div className="data-table-search">
          <SearchIcon />
          <input
            type="text"
            className="data-table-search-input"
            placeholder="Search vendors..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
          {search && (
            <button className="data-table-search-clear" onClick={() => setSearch('')}>
              <CloseIcon />
            </button>
          )}
        </div>
        <Select
          value={filterCategory}
          onChange={(e: any) => setFilterCategory(e.target.value)}
          style={{ minWidth: 160, margin: 0 }}
          options={[
            { value: '', label: 'All Categories' },
            ...usedCategories.map(c => ({ value: c, label: c }))
          ]}
        />
        <Select
          value={filterStatus}
          onChange={(e: any) => setFilterStatus(e.target.value)}
          style={{ minWidth: 120, margin: 0 }}
          options={[
            { value: '', label: 'All Status' },
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' }
          ]}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Button variant="secondary" onClick={() => setShowExportMenu(!showExportMenu)} icon={<Download size={15} />}>
              Export
            </Button>
            {showExportMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'white', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, minWidth: 160, overflow: 'hidden' }}>
                <button
                  onClick={() => handleExport('pdf')}
                  style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', fontSize: 13, cursor: 'pointer' }}
                  className="hover-bg-secondary"
                >
                  Export as PDF
                </button>
                <button
                  onClick={() => handleExport('xlsx')}
                  style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'transparent', border: 'none', fontSize: 13, cursor: 'pointer' }}
                  className="hover-bg-secondary"
                >
                  Export as Excel
                </button>
              </div>
            )}
          </div>
          <Button variant="primary" onClick={openAddModal} icon={<PlusIcon />}>Add Vendor</Button>
        </div>
      </div>

      {/* Vendor Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
          title="No Vendors"
          text="Add your first vendor or supplier to track payments."
          action={<Button variant="primary" onClick={openAddModal} icon={<PlusIcon />}>Add Vendor</Button>}
        />
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          keyExtractor={(v: VendorEntry) => v.id}
          pageSize={15}
        />
      )}

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <Modal open={true} title={editingVendor ? 'Edit Vendor' : 'Add Vendor'} onClose={() => setShowModal(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Vendor Name *</label>
              <Input placeholder="e.g., Al Jazeera Engineering" value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, name: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Category *</label>
              <Select
                value={form.category}
                onChange={(e: any) => setForm(f => ({ ...f, category: e.target.value }))}
                style={{ width: '100%' }}
                options={[
                  { value: '', label: 'Select category...' },
                  ...usedCategories.map(c => ({ value: c, label: c })),
                  { value: 'custom', label: '+ Custom Category' }
                ]}
              />
            </div>
            {form.category === 'custom' && (
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Custom Category Name *</label>
                <Input placeholder="Enter category" value={form.customCategory || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, customCategory: e.target.value }))} style={{ width: '100%' }} />
              </div>
            )}
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Contact Person</label>
              <Input placeholder="Contact name" value={form.contactPerson} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, contactPerson: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Phone</label>
              <Input placeholder="+971-XX-XXX-XXXX" value={form.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, phone: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Email</label>
              <Input placeholder="vendor@email.com" value={form.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, email: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>TRN (Tax Reg. No.)</label>
              <Input placeholder="Tax registration number" value={form.trn} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, trn: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Status</label>
              <Select
                value={form.status}
                onChange={(e: any) => setForm(f => ({ ...f, status: e.target.value as 'Active' | 'Inactive' }))}
                style={{ width: '100%' }}
                options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' }
                ]}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Address</label>
              <Input placeholder="Vendor address" value={form.address} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, address: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Bank Details</label>
              <Input placeholder="Bank name, account number, IBAN..." value={form.bankDetails} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, bankDetails: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Notes</label>
              <textarea
                placeholder="Any additional notes..."
                value={form.notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(f => ({ ...f, notes: e.target.value }))}
                style={{
                  width: '100%', minHeight: 72, padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)', resize: 'vertical', fontFamily: 'inherit', fontSize: 14,
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingVendor ? 'Update Vendor' : 'Add Vendor'}</Button>
          </div>
        </Modal>
      )}

      {/* ── Vendor Ledger Drawer ── */}
      {drawerVendor && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          display: 'flex', justifyContent: 'flex-end',
        }}>
          {/* Backdrop */}
          <div
            onClick={() => setDrawerVendor(null)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
          />
          {/* Drawer Panel */}
          <div style={{
            position: 'relative', width: '100%', maxWidth: 640,
            background: 'var(--surface)', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            animation: 'slideInRight 0.3s ease-out',
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid var(--border)',
              background: 'linear-gradient(135deg, rgba(102,126,234,0.08), rgba(118,75,162,0.08))',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{drawerVendor.name}</h3>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {drawerVendor.category}
                    {drawerVendor.contactPerson && ` · ${drawerVendor.contactPerson}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Button variant="ghost" size="sm" onClick={handlePrintLedger} title="Print Ledger"><Printer size={16} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setDrawerVendor(null)} title="Close"><CloseIcon /></Button>
                </div>
              </div>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
                <div style={{
                  padding: '12px 16px', borderRadius: 10,
                  background: 'var(--card)', border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Paid</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)', marginTop: 4 }}>
                    <CurrencyText value={vendorLedgerTotal} currency={currency} />
                  </div>
                </div>
                <div style={{
                  padding: '12px 16px', borderRadius: 10,
                  background: 'var(--card)', border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Payments</div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{vendorLedger.length}</div>
                </div>
                <div style={{
                  padding: '12px 16px', borderRadius: 10,
                  background: 'var(--card)', border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</div>
                  <div style={{ marginTop: 4 }}>
                    <Badge variant={drawerVendor.status === 'Active' ? 'success' : 'warning'}>{drawerVendor.status}</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Vendor Details */}
            {(drawerVendor.phone || drawerVendor.email || drawerVendor.trn || drawerVendor.address || drawerVendor.bankDetails) && (
              <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                  {drawerVendor.phone && <div><span style={{ color: 'var(--text-secondary)' }}>Phone:</span> {drawerVendor.phone}</div>}
                  {drawerVendor.email && <div><span style={{ color: 'var(--text-secondary)' }}>Email:</span> {drawerVendor.email}</div>}
                  {drawerVendor.trn && <div><span style={{ color: 'var(--text-secondary)' }}>TRN:</span> {drawerVendor.trn}</div>}
                  {drawerVendor.address && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-secondary)' }}>Address:</span> {drawerVendor.address}</div>}
                  {drawerVendor.bankDetails && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-secondary)' }}>Bank:</span> {drawerVendor.bankDetails}</div>}
                </div>
              </div>
            )}

            {/* Ledger Table */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Payment History</h4>
              {vendorLedger.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '40px 20px',
                  color: 'var(--text-secondary)', fontSize: 14,
                }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                  <div>No payments recorded for this vendor yet.</div>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Expense #</th>
                      <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Property</th>
                      <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Category</th>
                      <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorLedger.map((exp, i) => {
                      const prop = properties.find(p => p.id === exp.propertyId)
                      return (
                        <tr key={exp.id} style={{
                          borderBottom: '1px solid var(--border)',
                          background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
                          transition: 'background 0.15s',
                        }}>
                          <td style={{ padding: '10px', fontSize: 13 }}>{formatDate(exp.date, dateFormat)}</td>
                          <td style={{ padding: '10px', fontSize: 13, fontWeight: 700 }}>{exp.expenseNo}</td>
                          <td style={{ padding: '10px', fontSize: 13 }}>{prop?.name || '–'}</td>
                          <td style={{ padding: '10px', fontSize: 13 }}>{exp.category}</td>
                          <td style={{ padding: '10px', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>
                            <CurrencyText value={exp.totalAmount} currency={currency} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border)' }}>
                      <td colSpan={4} style={{ padding: '10px', fontSize: 14, fontWeight: 700 }}>Total</td>
                      <td style={{ padding: '10px', fontSize: 14, fontWeight: 700, textAlign: 'right', color: 'var(--accent)' }}>
                        <CurrencyText value={vendorLedgerTotal} currency={currency} />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          open={true}
          title="Delete Vendor"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          variant="danger"
        />
      )}

      {/* Toast */}
      {toast && <Toast visible={true} message={toast.message} type={toast.type as any} onClose={() => setToast(null)} />}

      {/* Slide animation keyframes */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
