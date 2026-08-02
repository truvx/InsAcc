import React, { useState, useMemo, useEffect, useRef } from 'react'
import type { MainCategory, PropProperty, IncomeCategory, Customer } from '../data/propertyTypes'
import { Modal, PlusIcon, EditIcon, TrashIcon } from './design/DesignSystem'
import { FolderTree, ChevronRight, ChevronDown, Plus, Pencil, Trash2, Eye, EyeOff, Search } from 'lucide-react'

import type { AuditEvent } from '../data/auditTypes'
import { recordModuleEvent } from '../services/auditService'
import { exportTableData } from '../services/reportExportService'
import Toast from './Toast'

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
  onAuditEvent?: (event: AuditEvent) => void
}

interface TreeNode {
  id: string
  parentId: string | null
  type: 'main-category' | 'property' | 'income-category' | 'customer'
  name: string
  children: TreeNode[]
}

function pluralizeCategoryName(name: string, count: number): string {
  if (count === 1) return name;
  if (name.toLowerCase().endsWith('s')) return name;
  if (name.endsWith('y')) return name.slice(0, -1) + 'ies';
  if (name.endsWith('Y')) return name.slice(0, -1) + 'IES';
  return name + 's';
}

function Arrow({ open }: { open: boolean }) {
  return open ? <ChevronDown size={14} className="tree-arrow-icon" /> : <ChevronRight size={14} className="tree-arrow-icon" />
}

function HighlightedText({ text, search }: { text: string; search: string }) {
  if (!search.trim()) return <span>{text}</span>
  const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="tree-search-highlight">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  )
}

function ConfirmDialog({ open, message, onConfirm, onCancel }: { open: boolean; message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal open={open} onClose={onCancel} title="Confirm Deletion">
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, fontSize: 14 }}>{message}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
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
        <label className="form-label">Name *</label>
        <input className="input" placeholder={placeholder || 'Enter name'} value={value} onChange={e => setValue(e.target.value)} autoFocus />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={onSave}>Save</button>
      </div>
    </Modal>
  )
}

function buildHierarchyTree(
  mainCategories: MainCategory[],
  propProperties: PropProperty[],
  incomeCategories: IncomeCategory[],
  customers: Customer[],
): TreeNode[] {
  return mainCategories.map(mc => {
    const propertyNodes: TreeNode[] = propProperties
      .filter(p => p.mainCategoryId === mc.id)
      .map(p => {
        const incomeNodes: TreeNode[] = incomeCategories
          .filter(ic => ic.propertyId === p.id)
          .map(ic => {
            const customerNodes: TreeNode[] = customers
              .filter(c => c.incomeCategoryId === ic.id)
              .map(c => ({
                id: c.id,
                parentId: ic.id,
                type: 'customer',
                name: c.name,
                children: []
              }))
            return {
              id: ic.id,
              parentId: p.id,
              type: 'income-category',
              name: ic.name,
              children: customerNodes
            }
          })
        return {
          id: p.id,
          parentId: mc.id,
          type: 'property',
          name: p.name,
          children: incomeNodes
        }
      })
    return {
      id: mc.id,
      parentId: null,
      type: 'main-category',
      name: mc.name,
      children: propertyNodes
    }
  })
}

export default function PropertyHierarchy({
  currency = 'AED',
  mainCategories, setMainCategories,
  propProperties, setPropProperties,
  incomeCategories, setIncomeCategories,
  customers, setCustomers,
  onAuditEvent,
}: Props) {
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' })
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Persist expanded states across page navigation
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('insacc_hierarchy_expanded_v2')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    localStorage.setItem('insacc_hierarchy_expanded_v2', JSON.stringify(Array.from(expandedNodeIds)))
  }, [expandedNodeIds])

  const [confirmMsg, setConfirmMsg] = useState('')
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null)

  const [modalTitle, setModalTitle] = useState('')
  const [modalValue, setModalValue] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const modalSaveRef = useRef<((val: string) => void) | null>(null)

  const openAddEdit = (title: string, initial: string, onSave: (val: string) => void) => {
    setModalTitle(title)
    setModalValue(initial)
    setModalOpen(true)
    modalSaveRef.current = onSave
  }

  const handleModalSave = () => {
    if (modalValue.trim() && modalSaveRef.current) {
      modalSaveRef.current(modalValue.trim())
      setModalOpen(false)
      setModalValue('')
      modalSaveRef.current = null
    }
  }

  const confirm = (msg: string, action: () => void) => {
    setConfirmMsg(msg)
    setConfirmAction(() => action)
  }

  const nextId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  const handleExport = (format: 'pdf' | 'csv' | 'xlsx') => {
    if (filteredTreeNodes.length === 0) {
      setToast({ visible: true, message: 'No records to export.', type: 'error' })
      setShowExportMenu(false)
      return
    }

    const rows: string[][] = []
    const flatten = (nodes: TreeNode[], depth = 0) => {
      nodes.forEach(n => {
        const typeStr = n.type === 'main-category' ? 'Main Category' : n.type === 'property' ? 'Property' : n.type === 'income-category' ? 'Income Category' : 'Unit/Customer'
        const prefix = '  '.repeat(depth)
        rows.push([typeStr, prefix + n.name])
        flatten(n.children, depth + 1)
      })
    }
    flatten(filteredTreeNodes)

    try {
      exportTableData({
        format,
        title: 'Property Portfolio Hierarchy',
        subtitle: 'Structural layout of categories and properties',
        filename: `Property_Hierarchy_${new Date().toISOString().split('T')[0]}`,
        columns: ['Type', 'Name'],
        rows,
        currency
      }).then(() => {
        onAuditEvent?.(
          recordModuleEvent(
            'Property Hierarchy',
            'Export',
            'Hierarchy Tree',
            'bulk',
            `Exported hierarchy to ${format.toUpperCase()}`
          )
        )
        setToast({ visible: true, message: 'Export completed successfully.', type: 'success' })
      }).catch(err => {
        setToast({ visible: true, message: `Export failed: ${err.message || err}`, type: 'error' })
      }).finally(() => {
        setShowExportMenu(false)
      })
    } catch (err: any) {
      setToast({ visible: true, message: `Export error: ${err.message || err}`, type: 'error' })
      setShowExportMenu(false)
    }
  }

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  }

  // Builder Tree Node Root
  const treeNodes = useMemo(() => {
    return buildHierarchyTree(mainCategories, propProperties, incomeCategories, customers)
  }, [mainCategories, propProperties, incomeCategories, customers])

  // Search auto-expansion logic
  const searchExpandedIds = useMemo(() => {
    const ids = new Set<string>()
    if (!search.trim()) return ids

    const q = search.toLowerCase()
    const traverse = (node: TreeNode, path: string[]) => {
      const isMatch = node.name.toLowerCase().includes(q)
      if (isMatch) {
        path.forEach(id => ids.add(id))
      }
      node.children.forEach(child => {
        traverse(child, [...path, node.id])
      })
    }
    treeNodes.forEach(node => traverse(node, []))
    return ids
  }, [treeNodes, search])

  // Filter tree nodes for top-level search
  const filteredTreeNodes = useMemo(() => {
    if (!search.trim()) return treeNodes
    const q = search.toLowerCase()
    
    const filterNode = (node: TreeNode): TreeNode | null => {
      const isMatch = node.name.toLowerCase().includes(q)
      const filteredChildren = node.children
        .map(child => filterNode(child))
        .filter((child): child is TreeNode => child !== null)
      
      if (isMatch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren
        }
      }
      return null
    }

    return treeNodes
      .map(node => filterNode(node))
      .filter((node): node is TreeNode => node !== null)
  }, [treeNodes, search])

  // Action handlers
  const handleAddCategory = (name: string) => {
    const newId = nextId('mc')
    setMainCategories(prev => [...prev, { id: newId, name }])
    onAuditEvent?.(recordModuleEvent('Property', 'Create', name, newId, `Created main property category: ${name}`))
  }
  const handleEditCategory = (id: string, name: string) => {
    setMainCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c))
    onAuditEvent?.(recordModuleEvent('Property', 'Update', name, id, `Renamed main property category to: ${name}`))
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
    onAuditEvent?.(recordModuleEvent('Property', 'Delete', id, id, `Deleted main property category: ${id} and all its children`))
  }

  const handleAddProperty = (mainCategoryId: string, name: string) => {
    const newId = nextId('prop')
    setPropProperties(prev => [...prev, { id: newId, mainCategoryId, name }])
    setExpandedNodeIds(prev => new Set(prev).add(mainCategoryId))
    onAuditEvent?.(recordModuleEvent('Property', 'Create', name, newId, `Created property: ${name}`))
  }
  const handleEditProperty = (id: string, name: string) => {
    setPropProperties(prev => prev.map(p => p.id === id ? { ...p, name } : p))
    onAuditEvent?.(recordModuleEvent('Property', 'Update', name, id, `Renamed property to: ${name}`))
  }
  const handleDeleteProperty = (id: string) => {
    const icsToDel = incomeCategories.filter(ic => ic.propertyId === id)
    const icIds = icsToDel.map(ic => ic.id)
    setPropProperties(prev => prev.filter(p => p.id !== id))
    setIncomeCategories(prev => prev.filter(ic => ic.propertyId !== id))
    setCustomers(prev => prev.filter(c => !icIds.includes(c.incomeCategoryId)))
    onAuditEvent?.(recordModuleEvent('Property', 'Delete', id, id, `Deleted property: ${id}`))
  }

  const handleAddIncomeCategory = (propertyId: string, name: string) => {
    const newId = nextId('ic')
    setIncomeCategories(prev => [...prev, { id: newId, propertyId, name }])
    setExpandedNodeIds(prev => new Set(prev).add(propertyId))
    onAuditEvent?.(recordModuleEvent('Property', 'Create', name, newId, `Created unit: ${name}`))
  }
  const handleEditIncomeCategory = (id: string, name: string) => {
    setIncomeCategories(prev => prev.map(ic => ic.id === id ? { ...ic, name } : ic))
    onAuditEvent?.(recordModuleEvent('Property', 'Update', name, id, `Renamed unit to: ${name}`))
  }
  const handleDeleteIncomeCategory = (id: string) => {
    setIncomeCategories(prev => prev.filter(ic => ic.id !== id))
    setCustomers(prev => prev.filter(c => c.incomeCategoryId !== id))
    onAuditEvent?.(recordModuleEvent('Property', 'Delete', id, id, `Deleted unit: ${id}`))
  }

  const handleAddCustomer = (incomeCategoryId: string, name: string) => {
    const newId = nextId('cust')
    setCustomers(prev => [...prev, { id: newId, incomeCategoryId, name }])
    setExpandedNodeIds(prev => new Set(prev).add(incomeCategoryId))
    onAuditEvent?.(recordModuleEvent('Property', 'Create', name, newId, `Created tenant reference: ${name}`))
  }
  const handleEditCustomer = (id: string, name: string) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, name } : c))
    onAuditEvent?.(recordModuleEvent('Property', 'Update', name, id, `Renamed tenant reference to: ${name}`))
  }
  const handleDeleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id))
    onAuditEvent?.(recordModuleEvent('Property', 'Delete', id, id, `Deleted tenant reference: ${id}`))
  }

  // Expand / Collapse all helper utilities
  const expandAll = () => {
    const ids = new Set<string>()
    const traverse = (node: TreeNode) => {
      if (node.children.length > 0) {
        ids.add(node.id)
        node.children.forEach(traverse)
      }
    }
    treeNodes.forEach(traverse)
    setExpandedNodeIds(ids)
  }

  const collapseAll = () => {
    setExpandedNodeIds(new Set())
  }

  // Visual branch lines builder (explorer style)
  const renderTreeLines = (depth: number, parentHasNextSibling: boolean[], isLastChild: boolean) => {
    return Array.from({ length: depth }).map((_, i) => {
      const isCurrentLevel = i === depth - 1
      const hasNext = parentHasNextSibling[i]
      
      return (
        <div key={i} className="tree-connector-wrapper">
          {/* Vertical line segment */}
          {isCurrentLevel ? (
            <div className={`tree-line-vertical${isLastChild ? ' last-child' : ''}`} />
          ) : (
            hasNext && <div className="tree-line-vertical continue-line" />
          )}
          
          {/* Horizontal line segment */}
          {isCurrentLevel && <div className="tree-line-horizontal" />}
        </div>
      )
    })
  }

  // Recursive Node renderer
  const renderNode = (node: TreeNode, depth: number, parentHasNextSibling: boolean[], isLastChild: boolean) => {
    const isExpanded = expandedNodeIds.has(node.id) || searchExpandedIds.has(node.id)
    const isMatched = search.trim() !== '' && node.name.toLowerCase().includes(search.toLowerCase())

    return (
      <div key={node.id} className="tree-node-container">
        {/* Row element */}
        <div className={`tree-row level-${depth}${isMatched ? ' tree-row-matched' : ''}`}>
          {/* Visual Guides */}
          {renderTreeLines(depth, parentHasNextSibling, isLastChild)}

          {/* Toggle button */}
          {node.children.length > 0 ? (
            <button
              onClick={() => setExpandedNodeIds(prev => toggle(prev, node.id))}
              className="tree-toggle-btn"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              <Arrow open={isExpanded} />
            </button>
          ) : (
            <div className="tree-toggle-placeholder" />
          )}

          {/* Emoji Icon representing Real Estate entity */}
          <span className="tree-node-emoji">
            {node.type === 'main-category' && '🏢'}
            {node.type === 'property' && '🏠'}
            {node.type === 'income-category' && '💰'}
            {node.type === 'customer' && '👤'}
          </span>

          {/* Highlighted text representing node name */}
          <span className={`tree-node-name text-${node.type}`}>
            <HighlightedText text={node.name} search={search} />
          </span>

          {/* Dynamic properties / units counts */}
          {node.type !== 'customer' && node.children.length > 0 && (
            <span className="tree-node-count">
              {node.children.length} {
                node.type === 'main-category'
                  ? pluralizeCategoryName(node.name, node.children.length)
                  : node.type === 'property'
                    ? (node.children.length === 1 ? 'income category' : 'income categories')
                    : (node.children.length === 1 ? 'unit/customer' : 'units/customers')
              }
            </span>
          )}

          {/* Contextual actions */}
          <div className="tree-actions">
            {node.type === 'main-category' && (
              <button
                className="btn btn-icon btn-ghost"
                onClick={() => openAddEdit(`Add Property under ${node.name}`, '', (v) => handleAddProperty(node.id, v))}
                title="Add property"
              >
                <PlusIcon />
              </button>
            )}
            {node.type === 'property' && (
              <button
                className="btn btn-icon btn-ghost"
                onClick={() => openAddEdit(`Add Income Category under ${node.name}`, '', (v) => handleAddIncomeCategory(node.id, v))}
                title="Add income category"
              >
                <PlusIcon />
              </button>
            )}
            {node.type === 'income-category' && (
              <button
                className="btn btn-icon btn-ghost"
                onClick={() => openAddEdit(`Add Customer under ${node.name}`, '', (v) => handleAddCustomer(node.id, v))}
                title="Add customer"
              >
                <PlusIcon />
              </button>
            )}

            {/* Edit action */}
            <button
              className="btn btn-icon btn-ghost"
              onClick={() => openAddEdit(
                node.type === 'main-category' ? 'Edit Category' : node.type === 'property' ? 'Edit Property' : node.type === 'income-category' ? 'Edit Income Category' : 'Edit Customer',
                node.name,
                (v) => {
                  if (node.type === 'main-category') handleEditCategory(node.id, v)
                  else if (node.type === 'property') handleEditProperty(node.id, v)
                  else if (node.type === 'income-category') handleEditIncomeCategory(node.id, v)
                  else handleEditCustomer(node.id, v)
                }
              )}
              title="Edit"
            >
              <EditIcon />
            </button>

            {/* Delete action */}
            <button
              className="btn btn-icon btn-ghost delete-btn"
              onClick={() => confirm(
                node.type === 'main-category'
                  ? `Delete category "${node.name}"? All properties, income categories, and customers under it will also be removed.`
                  : node.type === 'property'
                    ? `Delete property "${node.name}"? All income categories and customers under it will also be removed.`
                    : node.type === 'income-category'
                      ? `Delete income category "${node.name}"? All customers under it will also be removed.`
                      : `Delete customer "${node.name}"?`,
                () => {
                  if (node.type === 'main-category') handleDeleteCategory(node.id)
                  else if (node.type === 'property') handleDeleteProperty(node.id)
                  else if (node.type === 'income-category') handleDeleteIncomeCategory(node.id)
                  else handleDeleteCustomer(node.id)
                }
              )}
              title="Delete"
            >
              <TrashIcon />
            </button>
          </div>
        </div>

        {/* Children node list (rendered recursively) */}
        {isExpanded && node.children.length > 0 && (
          <div className="tree-node-children">
            {node.children.map((child, idx) => {
              const isLast = idx === node.children.length - 1
              return renderNode(
                child,
                depth + 1,
                [...parentHasNextSibling, !isLastChild],
                isLast
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <style>{`
        .tree-container {
          padding: 24px;
          background: var(--card, #ffffff);
          border: 1px solid var(--border, #E5E7EB);
          border-radius: var(--radius-xl, 12px);
          box-shadow: var(--shadow-sm);
        }
        .tree-row {
          display: flex;
          align-items: center;
          height: 44px;
          padding-right: 16px;
          border-bottom: 1px solid var(--border-light, #F3F4F6);
          position: relative;
          transition: background-color 0.15s ease;
        }
        .tree-row:hover {
          background-color: var(--hover-bg, #F9FAFB) !important;
        }
        .tree-row-matched {
          background-color: rgba(253, 224, 71, 0.12) !important;
        }
        .tree-search-highlight {
          background: #FDE047;
          color: #000;
          border-radius: 2px;
          padding: 0 2px;
        }
        .tree-connector-wrapper {
          width: 28px;
          height: 100%;
          position: relative;
          display: inline-flex;
          flex-shrink: 0;
        }
        .tree-line-vertical {
          position: absolute;
          left: 14px;
          top: 0;
          bottom: 0;
          width: 1px;
          background: var(--border, #E5E7EB);
        }
        .tree-line-vertical.last-child {
          bottom: 50%;
        }
        .tree-line-vertical.continue-line {
          bottom: 0;
        }
        .tree-line-horizontal {
          position: absolute;
          left: 14px;
          top: 50%;
          width: 14px;
          height: 1px;
          background: var(--border, #E5E7EB);
        }
        .tree-toggle-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          margin-right: 4px;
          color: var(--text-secondary, #6B7280);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          z-index: 2;
          border-radius: 4px;
        }
        .tree-toggle-btn:hover {
          background-color: var(--border-light, #F3F4F6);
          color: var(--text-primary);
        }
        .tree-arrow-icon {
          transition: transform 0.15s ease;
        }
        .tree-toggle-placeholder {
          width: 22px;
          flex-shrink: 0;
        }
        .tree-node-emoji {
          font-size: 15px;
          margin-right: 8px;
          user-select: none;
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
        }
        .tree-node-name {
          flex: 1;
          font-size: 13px;
          color: var(--text-primary, #1F2937);
        }
        .tree-node-name.text-main-category {
          font-weight: 600;
          font-size: 14px;
          color: var(--primary, #2563EB);
        }
        .tree-node-name.text-property {
          font-weight: 500;
          color: var(--text-primary, #1F2937);
        }
        .tree-node-name.text-income-category {
          color: var(--text-secondary, #4B5563);
        }
        .tree-node-name.text-customer {
          color: var(--text-muted, #9CA3AF);
        }
        .tree-node-count {
          font-size: 11px;
          color: var(--text-muted, #9CA3AF);
          margin-right: 16px;
          background: var(--border-light, #F3F4F6);
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: 500;
          user-select: none;
        }
        .tree-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .tree-row:hover .tree-actions {
          opacity: 1;
        }
        .tree-actions .btn-ghost {
          padding: 4px;
          border-radius: 4px;
          color: var(--text-secondary);
        }
        .tree-actions .btn-ghost:hover {
          background-color: var(--border-light, #F3F4F6);
          color: var(--primary);
        }
        .tree-actions .delete-btn:hover {
          color: var(--danger, #DC2626) !important;
          background-color: rgba(220, 38, 38, 0.05) !important;
        }
      `}</style>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onClose={() => setToast(t => ({ ...t, visible: false }))} />

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Property Portfolio Hierarchy</div>
            <div className="page-subtitle">Manage structural layout: Main Category › Property › Income Category › Unit / Customer</div>
          </div>
        </div>
        <div className="page-header-right" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={expandAll} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
            <Eye size={14} /> Expand All
          </button>
          <button className="btn btn-secondary" onClick={collapseAll} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
            <EyeOff size={14} /> Collapse All
          </button>
          <div style={{ position: 'relative' }}>
            <button className="btn btn-secondary" onClick={() => setShowExportMenu(!showExportMenu)} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
              Export <ChevronDown size={14} />
            </button>
            {showExportMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, width: 140, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <button className="export-menu-item" onClick={() => handleExport('pdf')} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer' }}>PDF (.pdf)</button>
                <button className="export-menu-item" onClick={() => handleExport('xlsx')} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer' }}>Excel (.xlsx)</button>
                <button className="export-menu-item" onClick={() => handleExport('csv')} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer' }}>CSV (.csv)</button>
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={() => openAddEdit('Add Main Category', '', handleAddCategory)} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
            <PlusIcon /> Add Category
          </button>
        </div>
      </div>

      {/* Page Body */}
      <div className="page-body" style={{ padding: 32 }}>
        {/* Search Bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', pointerEvents: 'none' }}
            />
            <input
              className="input"
              placeholder="Search category, property, rent type, or unit..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 38, width: '100%', fontSize: 13 }}
            />
          </div>
        </div>

        {/* Tree Card Wrapper */}
        <div className="tree-container">
          {filteredTreeNodes.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
              {search ? 'No results matching search filters.' : 'No portfolio records found. Click "Add Category" to begin.'}
            </div>
          ) : (
            filteredTreeNodes.map((node, idx) => {
              const isLast = idx === filteredTreeNodes.length - 1
              return renderNode(node, 0, [], isLast)
            })
          )}
        </div>
      </div>

      <AddEditModal
        open={modalOpen}
        title={modalTitle}
        value={modalValue}
        setValue={setModalValue}
        onSave={handleModalSave}
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
