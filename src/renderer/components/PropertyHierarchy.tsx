import React, { useState, useMemo } from 'react'
import type { MainCategory, PropProperty, IncomeCategory, Customer } from '../data/propertyTypes'
import { Modal } from './design/DesignSystem'

interface Props {
  currency?: string
  mainCategories: MainCategory[]
  setMainCategories: React.Dispatch<React.SetStateAction<MainCategory[]>>
  propProperties: PropProperty[]
  setPropProperties: React.Dispatch<React.SetStateAction<PropProperty[]>>
  incomeCategories: IncomeCategory[]
  setIncomeCategories: React.Dispatch<React.SetStateAction<IncomeCategory[]>>
  customers: Customer[]
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>
}

function Arrow({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function TreeIcon({ level }: { level: 0 | 1 | 2 | 3 }) {
  const icons: Record<number, React.ReactNode> = {
    0: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    1: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
    2: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    3: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  }
  return <div style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)', flexShrink: 0 }}>{icons[level]}</div>
}

function ConfirmDialog({ open, message, onConfirm, onCancel }: { open: boolean; message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal open={open} onClose={onCancel} title="Confirm">
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{message}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
      </div>
    </Modal>
  )
}

function AddEditModal({ open, title, value, setValue, onSave, onCancel, placeholder }: {
  open: boolean; title: string; value: string; setValue: (v: string) => void; onSave: () => void; onCancel: () => void; placeholder?: string
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="form-group" style={{ marginBottom: 20 }}>
        <label className="form-label">Name</label>
        <input className="input" placeholder={placeholder || 'Enter name'} value={value} onChange={e => setValue(e.target.value)} autoFocus />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={onSave}>Save</button>
      </div>
    </Modal>
  )
}

const btnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4,
  display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5,
  color: 'var(--text-secondary)',
}
const iconBtnStyle = (hoverColor: string): React.CSSProperties => ({
  ...btnStyle,
  transition: 'opacity 0.15s',
})

export default function PropertyHierarchy({
  currency = 'AED',
  mainCategories, setMainCategories,
  propProperties, setPropProperties,
  incomeCategories, setIncomeCategories,
  customers, setCustomers,
}: Props) {
  const [search, setSearch] = useState('')
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const [expandedProps, setExpandedProps] = useState<Set<string>>(new Set())
  const [expandedIncomes, setExpandedIncomes] = useState<Set<string>>(new Set())

  const [confirmMsg, setConfirmMsg] = useState('')
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null)

  const [modalTitle, setModalTitle] = useState('')
  const [modalValue, setModalValue] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalSave, setModalSave] = useState<() => void>(() => {})

  const [hiddenCategoryIds, setHiddenCategoryIds] = useState<Set<string>>(new Set())

  const openAddEdit = (title: string, initial: string, onSave: (val: string) => void) => {
    setModalTitle(title)
    setModalValue(initial)
    setModalOpen(true)
    setModalSave(() => () => {
      if (modalValue.trim()) {
        onSave(modalValue.trim())
        setModalOpen(false)
        setModalValue('')
      }
    })
  }

  const confirm = (msg: string, action: () => void) => {
    setConfirmMsg(msg)
    setConfirmAction(() => action)
  }

  const nextId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  }

  const filteredMainCategories = useMemo(() => {
    if (!search.trim()) return mainCategories
    const q = search.toLowerCase()
    return mainCategories.filter(mc => {
      if (mc.name.toLowerCase().includes(q)) return true
      const props = propProperties.filter(p => p.mainCategoryId === mc.id)
      return props.some(p => {
        if (p.name.toLowerCase().includes(q)) return true
        const ics = incomeCategories.filter(ic => ic.propertyId === p.id)
        return ics.some(ic => {
          if (ic.name.toLowerCase().includes(q)) return true
          const custs = customers.filter(c => c.incomeCategoryId === ic.id)
          return custs.some(c => c.name.toLowerCase().includes(q))
        })
      })
    })
  }, [mainCategories, propProperties, incomeCategories, customers, search])

  const handleAddCategory = (name: string) => {
    setMainCategories(prev => [...prev, { id: nextId('mc'), name }])
  }
  const handleEditCategory = (id: string, name: string) => {
    setMainCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c))
  }
  const handleDeleteCategory = (id: string) => {
    const propsToDel = propProperties.filter(p => p.mainCategoryId === id)
    const propIds = propsToDel.map(p => p.id)
    const icsToDel = incomeCategories.filter(ic => propIds.includes(ic.propertyId))
    const icIds = icsToDel.map(ic => ic.id)
    setMainCategories(prev => prev.filter(c => c.id !== id))
    setPropProperties(prev => prev.filter(p => p.mainCategoryId !== id))
    setIncomeCategories(prev => prev.filter(ic => !propIds.includes(ic.propertyId)))
    setCustomers(prev => prev.filter(c => !icIds.includes(c.incomeCategoryId)))
  }

  const handleAddProperty = (mainCategoryId: string, name: string) => {
    setPropProperties(prev => [...prev, { id: nextId('prop'), mainCategoryId, name }])
    setExpandedCats(prev => new Set(prev).add(mainCategoryId))
  }
  const handleEditProperty = (id: string, name: string) => {
    setPropProperties(prev => prev.map(p => p.id === id ? { ...p, name } : p))
  }
  const handleDeleteProperty = (id: string) => {
    const icsToDel = incomeCategories.filter(ic => ic.propertyId === id)
    const icIds = icsToDel.map(ic => ic.id)
    setPropProperties(prev => prev.filter(p => p.id !== id))
    setIncomeCategories(prev => prev.filter(ic => ic.propertyId !== id))
    setCustomers(prev => prev.filter(c => !icIds.includes(c.incomeCategoryId)))
  }

  const handleAddIncomeCategory = (propertyId: string, name: string) => {
    setIncomeCategories(prev => [...prev, { id: nextId('ic'), propertyId, name }])
    setExpandedProps(prev => new Set(prev).add(propertyId))
  }
  const handleEditIncomeCategory = (id: string, name: string) => {
    setIncomeCategories(prev => prev.map(ic => ic.id === id ? { ...ic, name } : ic))
  }
  const handleDeleteIncomeCategory = (id: string) => {
    setIncomeCategories(prev => prev.filter(ic => ic.id !== id))
    setCustomers(prev => prev.filter(c => c.incomeCategoryId !== id))
  }

  const handleAddCustomer = (incomeCategoryId: string, name: string) => {
    setCustomers(prev => [...prev, { id: nextId('cust'), incomeCategoryId, name }])
    setExpandedIncomes(prev => new Set(prev).add(incomeCategoryId))
  }
  const handleEditCustomer = (id: string, name: string) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, name } : c))
  }
  const handleDeleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id))
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Properties</div>
          <div className="page-subtitle">Master data hierarchy · Main Category › Property › Income Category › Customer</div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', pointerEvents: 'none' }}
            ><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className="input" placeholder="Search categories, properties, income groups, customers..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36, width: '100%' }}
            />
          </div>
          <button className="btn btn-primary" onClick={() => openAddEdit('Add Main Category', '', handleAddCategory)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Category
          </button>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filteredMainCategories.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
              {search ? 'No results found' : 'No categories yet. Click "Add Category" to create one.'}
            </div>
          )}
          {filteredMainCategories.map(mc => {
            const props = propProperties.filter(p => p.mainCategoryId === mc.id)
            const catOpen = expandedCats.has(mc.id)
            return (
              <div key={mc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                    cursor: 'pointer', userSelect: 'none', background: catOpen ? 'var(--bg-secondary)' : 'transparent',
                  }}
                  onClick={() => setExpandedCats(prev => toggle(prev, mc.id))}
                >
                  <Arrow open={catOpen} />
                  <TreeIcon level={0} />
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{mc.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-light)', marginRight: 8 }}>{props.length} {props.length === 1 ? 'property' : 'properties'}</span>
                  <button
                    style={iconBtnStyle('#DE8DA9')}
                    onClick={e => { e.stopPropagation(); openAddEdit('Add Property under ' + mc.name, '', (v) => handleAddProperty(mc.id, v)) }}
                    title="Add property"
                  ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
                  <button
                    style={iconBtnStyle('#F59E0B')}
                    onClick={e => { e.stopPropagation(); openAddEdit('Edit Category', mc.name, (v) => handleEditCategory(mc.id, v)) }}
                    title="Edit category"
                  ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
                  <button
                    style={iconBtnStyle('#EF4444')}
                    onClick={e => { e.stopPropagation(); confirm(`Delete category "${mc.name}"? All properties, income categories, and customers under it will also be removed.`, () => handleDeleteCategory(mc.id)) }}
                    title="Delete category"
                  ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                </div>

                {catOpen && (
                  <div style={{ paddingLeft: 20 }}>
                    {props.length === 0 && (
                      <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-light)', fontStyle: 'italic' }}>No properties yet</div>
                    )}
                    {props.map(prop => {
                      const ics = incomeCategories.filter(ic => ic.propertyId === prop.id)
                      const propOpen = expandedProps.has(prop.id)
                      return (
                        <div key={prop.id}>
                          <div
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                              cursor: 'pointer', userSelect: 'none', background: propOpen ? 'var(--bg-secondary)' : 'transparent',
                              borderTop: '1px solid var(--border)',
                            }}
                            onClick={() => setExpandedProps(prev => toggle(prev, prop.id))}
                          >
                            <Arrow open={propOpen} />
                            <TreeIcon level={1} />
                            <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{prop.name}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-light)', marginRight: 8 }}>{ics.length} {ics.length === 1 ? 'income category' : 'income categories'}</span>
                            <button
                              style={iconBtnStyle('#DE8DA9')}
                              onClick={e => { e.stopPropagation(); openAddEdit('Add Income Category under ' + prop.name, '', (v) => handleAddIncomeCategory(prop.id, v)) }}
                              title="Add income category"
                            ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
                            <button
                              style={iconBtnStyle('#F59E0B')}
                              onClick={e => { e.stopPropagation(); openAddEdit('Edit Property', prop.name, (v) => handleEditProperty(prop.id, v)) }}
                              title="Edit property"
                            ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
                            <button
                              style={iconBtnStyle('#EF4444')}
                              onClick={e => { e.stopPropagation(); confirm(`Delete "${prop.name}"? All income categories and customers under it will also be removed.`, () => handleDeleteProperty(prop.id)) }}
                              title="Delete property"
                            ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                          </div>

                          {propOpen && (
                            <div style={{ paddingLeft: 20 }}>
                              {ics.length === 0 && (
                                <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-light)', fontStyle: 'italic' }}>No income categories yet</div>
                              )}
                              {ics.map(ic => {
                                const custs = customers.filter(c => c.incomeCategoryId === ic.id)
                                const icOpen = expandedIncomes.has(ic.id)
                                return (
                                  <div key={ic.id}>
                                    <div
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                                        cursor: 'pointer', userSelect: 'none', background: icOpen ? 'var(--bg-secondary)' : 'transparent',
                                        borderTop: '1px solid var(--border)',
                                      }}
                                      onClick={() => setExpandedIncomes(prev => toggle(prev, ic.id))}
                                    >
                                      <Arrow open={icOpen} />
                                      <TreeIcon level={2} />
                                      <span style={{ flex: 1, fontSize: 13 }}>{ic.name}</span>
                                      <span style={{ fontSize: 12, color: 'var(--text-light)', marginRight: 8 }}>{custs.length} {custs.length === 1 ? 'customer' : 'customers'}</span>
                                      <button
                                        style={iconBtnStyle('#DE8DA9')}
                                        onClick={e => { e.stopPropagation(); openAddEdit('Add Customer under ' + ic.name, '', (v) => handleAddCustomer(ic.id, v)) }}
                                        title="Add customer"
                                      ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
                                      <button
                                        style={iconBtnStyle('#F59E0B')}
                                        onClick={e => { e.stopPropagation(); openAddEdit('Edit Income Category', ic.name, (v) => handleEditIncomeCategory(ic.id, v)) }}
                                        title="Edit income category"
                                      ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
                                      <button
                                        style={iconBtnStyle('#EF4444')}
                                        onClick={e => { e.stopPropagation(); confirm(`Delete income category "${ic.name}"? All customers under it will also be removed.`, () => handleDeleteIncomeCategory(ic.id)) }}
                                        title="Delete income category"
                                      ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                                    </div>

                                    {icOpen && (
                                      <div style={{ paddingLeft: 20 }}>
                                        {custs.length === 0 && (
                                          <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-light)', fontStyle: 'italic' }}>No customers yet</div>
                                        )}
                                        {custs.map(cust => (
                                          <div
                                            key={cust.id}
                                            style={{
                                              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px',
                                              borderTop: '1px solid var(--border)',
                                            }}
                                          >
                                            <div style={{ width: 14 }} />
                                            <TreeIcon level={3} />
                                            <span style={{ flex: 1, fontSize: 13 }}>{cust.name}</span>
                                            <button
                                              style={iconBtnStyle('#F59E0B')}
                                              onClick={() => openAddEdit('Edit Customer', cust.name, (v) => handleEditCustomer(cust.id, v))}
                                              title="Edit customer"
                                            ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
                                            <button
                                              style={iconBtnStyle('#EF4444')}
                                              onClick={() => confirm(`Delete customer "${cust.name}"?`, () => handleDeleteCustomer(cust.id))}
                                              title="Delete customer"
                                            ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <AddEditModal
        open={modalOpen}
        title={modalTitle}
        value={modalValue}
        setValue={setModalValue}
        onSave={() => modalSave()}
        onCancel={() => { setModalOpen(false); setModalValue('') }}
        placeholder="Enter name"
      />

      <ConfirmDialog
        open={confirmAction !== null}
        message={confirmMsg}
        onConfirm={() => { confirmAction?.(); setConfirmAction(null); setConfirmMsg('') }}
        onCancel={() => { setConfirmAction(null); setConfirmMsg('') }}
      />
    </>
  )
}
