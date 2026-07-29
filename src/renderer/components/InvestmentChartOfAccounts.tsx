import React, { useMemo, useState } from 'react'
import type { Account, Voucher, AccountType } from '../accounting/types'

import { EmptyState, SearchIcon, CloseIcon, Select, Modal, Button, IconButton, PlusIcon, TrashIcon, EditIcon } from './design/DesignSystem'
import { buildAccountTree, getNormalBalance } from '../accounting/chartOfAccountsService'
import { Landmark, ListChecks, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'

interface Props {
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>
}

const TYPE_LABELS: Record<string, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  revenue: 'Revenue',
  expense: 'Expenses',
  equity: 'Equity',
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  asset: <Landmark size={14} strokeWidth={1.75} />,
  liability: <ListChecks size={14} strokeWidth={1.75} />,
  revenue: <TrendingUp size={14} strokeWidth={1.75} />,
  expense: <TrendingDown size={14} strokeWidth={1.75} />,
  equity: <Landmark size={14} strokeWidth={1.75} />,
}

const SYSTEM_ROOT_CODES = ['1000', '2000', '3000', '4000', '5000']

type SegmentedTab = 'all' | 'asset' | 'liability' | 'revenue' | 'expense' | 'equity'

function detectCircularRelationship(accountId: string, newParentId: string | null, accounts: Account[]): boolean {
  if (!newParentId) return false
  if (accountId === newParentId) return true
  let currentId: string | null = newParentId
  const visited = new Set<string>()
  while (currentId) {
    if (currentId === accountId) return true
    if (visited.has(currentId)) return true
    visited.add(currentId)
    const parentAcct = accounts.find(a => a.id === currentId)
    currentId = parentAcct ? parentAcct.parentId : null
  }
  return false
}

/**
 * Derive account type automatically:
 * 1. If a parent is selected, inherit the parent's type.
 * 2. Otherwise infer from the GL code prefix (1=asset, 2=liability, 3=equity, 4=revenue, 5=expense).
 */
function inferTypeFromParentOrCode(
  parentId: string | null,
  code: string,
  accounts: Account[]
): AccountType {
  if (parentId) {
    const parent = accounts.find(a => a.id === parentId)
    if (parent) return parent.type
  }
  const prefix = code.trim().charAt(0)
  switch (prefix) {
    case '1': return 'asset'
    case '2': return 'liability'
    case '3': return 'equity'
    case '4': return 'revenue'
    case '5': return 'expense'
    default:  return 'asset'
  }
}

export default function InvestmentChartOfAccounts({ currency = 'AED', accounts, vouchers, setAccounts }: Props) {
  const moduleName = 'investment'
  const [activeTab, setActiveTab] = useState<SegmentedTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({
    asset: true, liability: true, revenue: true, expense: true, equity: true,
  })
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({})

  // Modal Dialog States
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formParentId, setFormParentId] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [validationError, setValidationError] = useState('')

  const tree = useMemo(() => buildAccountTree(accounts), [accounts])

  const hasPostings = (accountId: string) => vouchers.some(v => v.lines.some(l => l.accountId === accountId))

  const toggleType = (type: string) => {
    setExpandedTypes(prev => ({ ...prev, [type]: !prev[type] }))
  }

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const visibleTypes = useMemo(() => {
    if (activeTab === 'all') return ['asset', 'liability', 'revenue', 'expense', 'equity']
    return [activeTab]
  }, [activeTab])

  const tabs: { id: SegmentedTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'asset', label: 'Assets' },
    { id: 'liability', label: 'Liabilities' },
    { id: 'equity', label: 'Equity' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'expense', label: 'Expenses' },
  ]

  const handleAddNew = () => {
    setSelectedAccount(null)
    setFormCode('')
    setFormName('')
    setFormParentId('')
    setFormActive(true)
    setValidationError('')
    setModalMode('add')
  }

  const handleAddChild = (parent: Account) => {
    setSelectedAccount(null)
    setFormCode('')
    setFormName('')
    setFormParentId(parent.id)
    setFormActive(true)
    setValidationError('')
    setModalMode('add')
  }

  const handleEdit = (account: Account) => {
    setSelectedAccount(account)
    setFormCode(account.code)
    setFormName(account.name)
    setFormParentId(account.parentId || '')
    setFormActive(account.isActive)
    setValidationError('')
    setModalMode('edit')
  }

  const handleDelete = (account: Account) => {
    if (SYSTEM_ROOT_CODES.includes(account.code)) {
      alert('Cannot delete a system root account.')
      return
    }
    const children = accounts.filter(a => a.parentId === account.id)
    if (children.length > 0) {
      alert(`Cannot delete account because it has active child accounts: ${children.map(c => c.name).join(', ')}`)
      return
    }
    if (hasPostings(account.id)) {
      alert('Cannot delete account because transactions are already posted to it.')
      return
    }
    if (confirm(`Are you sure you want to delete the account "${account.code} — ${account.name}"?`)) {
      setAccounts(prev => prev.filter(a => a.id !== account.id))
    }
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedAccount(null)
  }

  const handleSave = () => {
    if (!formCode.trim()) {
      setValidationError('GL Code is required.')
      return
    }
    if (!formName.trim()) {
      setValidationError('Account Name is required.')
      return
    }

    const code = formCode.trim()
    const name = formName.trim()
    const parentId = formParentId || null

    // 1. Duplicate GL Code Check
    const duplicate = accounts.find(a => a.code === code && (modalMode === 'add' || a.id !== selectedAccount?.id))
    if (duplicate) {
      setValidationError(`GL Code "${code}" is already in use by account "${duplicate.name}".`)
      return
    }

    // 2. Circular Relationship Check
    if (modalMode === 'edit' && selectedAccount) {
      if (detectCircularRelationship(selectedAccount.id, parentId, accounts)) {
        setValidationError('Circular parent relationship detected. An account cannot be a descendant of itself.')
        return
      }
    }

    // 3. Renumbered: Invalid Parent Account — can't be child of itself
    if (parentId && selectedAccount && parentId === selectedAccount.id) {
      setValidationError('An account cannot be its own parent.')
      return
    }

    // 4. Deactivating check (no active child accounts)
    if (!formActive && modalMode === 'edit' && selectedAccount) {
      const activeChildren = accounts.filter(a => a.parentId === selectedAccount.id && a.isActive)
      if (activeChildren.length > 0) {
        setValidationError(`Cannot deactivate account because it has active child accounts: ${activeChildren.map(c => c.name).join(', ')}`)
        return
      }
    }

    // Auto-derive type: in edit mode keep existing type; in add mode infer from parent/code
    const inferredType: AccountType = modalMode === 'edit' && selectedAccount
      ? selectedAccount.type
      : inferTypeFromParentOrCode(parentId, code, accounts)
    const normalBalance = getNormalBalance(inferredType)

    if (modalMode === 'add') {
      const n = new Date().toISOString()
      const newAccount: Account = {
        id: code,
        code,
        name,
        type: inferredType,
        normalBalance,
        parentId,
        isActive: formActive,
        description: `Custom ${inferredType} account`,
        currency: currency || 'AED',
        createdAt: n,
        updatedAt: n,
        module: moduleName,
      }
      setAccounts(prev => [...prev, newAccount])
    } else if (modalMode === 'edit' && selectedAccount) {
      setAccounts(prev => prev.map(a => {
        if (a.id === selectedAccount.id) {
          return {
            ...a,
            code,
            name,
            type: inferredType,
            normalBalance,
            parentId,
            isActive: formActive,
            updatedAt: new Date().toISOString(),
          }
        }
        return a
      }))
    }

    closeModal()
  }

  const renderTree = (
    nodes: Array<{ account: Account; children: Array<any>; depth: number }>,
    depth = 0,
  ): React.ReactNode => {
    return nodes.map(node => {
      if (!visibleTypes.includes(node.account.type)) return null
      if (statusFilter === 'active' && !node.account.isActive) return null
      if (statusFilter === 'inactive' && node.account.isActive) return null
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const match = node.account.name.toLowerCase().includes(q) ||
          node.account.code.includes(q)
        if (!match && node.children.length === 0) return null
        if (!match && node.children.length > 0) {
          const childMatch = node.children.some((c: any) =>
            c.account.name.toLowerCase().includes(q) ||
            c.account.code.includes(q)
          )
          if (!childMatch) return null
        }
      }

      const hasChildren = node.children.length > 0
      const isExpanded = expandedNodes[node.account.id] !== false
      const isGroup = node.depth === 0

      return (
        <React.Fragment key={node.account.id}>
          {isGroup ? (
            <tr
              className={`coa-row coa-group ${node.account.type}`}
              onClick={() => toggleType(node.account.type)}
              style={{ cursor: 'pointer' }}
            >
              <td>
                <span className="coa-code"></span>
              </td>
              <td>
                <div className="coa-namecell">
                  <button
                    className={`coa-chevron${expandedTypes[node.account.type] ? ' open' : ''}`}
                    aria-label={expandedTypes[node.account.type] ? 'Collapse' : 'Expand'}
                    aria-expanded={expandedTypes[node.account.type]}
                    onClick={e => { e.stopPropagation(); toggleType(node.account.type) }}
                  >
                    <ChevronRight size={16} strokeWidth={2} />
                  </button>
                  <span className="coa-typeicon">{TYPE_ICONS[node.account.type]}</span>
                  <span className="coa-name">{node.account.name}</span>
                  <span className="coa-count">{node.children.length} accounts</span>
                </div>
              </td>
              <td />
              <td style={{ textAlign: 'right' }}>
                <div className="coa-actions" onClick={e => e.stopPropagation()}>
                  <IconButton
                    icon={<PlusIcon />}
                    label="Add Child Account"
                    onClick={() => handleAddChild(node.account)}
                  />
                </div>
              </td>
            </tr>
          ) : (
            <tr
              className={`coa-row ${hasChildren ? 'coa-parent' : 'coa-leaf'} ${node.account.type}`}
              style={{ cursor: hasChildren ? 'pointer' : 'default' }}
              onClick={() => hasChildren && toggleNode(node.account.id)}
            >
              <td>
                {!hasChildren && <span className="coa-code">{node.account.code}</span>}
              </td>
              <td>
                <div className="coa-namecell" style={{ paddingLeft: depth * 20 }}>
                  {hasChildren ? (
                    <button
                      className={`coa-chevron${isExpanded ? ' open' : ''}`}
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      aria-expanded={isExpanded}
                      onClick={e => { e.stopPropagation(); toggleNode(node.account.id) }}
                    >
                      <ChevronRight size={16} strokeWidth={2} />
                    </button>
                  ) : (
                    <span className="coa-chevron-placeholder" />
                  )}
                  {hasChildren && <span className="coa-typeicon">{TYPE_ICONS[node.account.type]}</span>}
                  <span className="coa-name">{node.account.name}</span>
                </div>
              </td>
              <td>
                <span className={`badge ${node.account.isActive ? 'badge-success' : 'badge-neutral'}`}>
                  {node.account.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <div className="coa-actions" onClick={e => e.stopPropagation()}>
                  <IconButton
                    icon={<PlusIcon />}
                    label="Add Child Account"
                    onClick={() => handleAddChild(node.account)}
                  />
                  <IconButton
                    icon={<EditIcon />}
                    label="Edit Account"
                    onClick={() => handleEdit(node.account)}
                    disabled={SYSTEM_ROOT_CODES.includes(node.account.code)}
                  />
                  <span className="coa-action-sep" />
                  <IconButton
                    className="coa-del"
                    icon={<TrashIcon />}
                    label="Delete Account"
                    onClick={() => handleDelete(node.account)}
                    disabled={SYSTEM_ROOT_CODES.includes(node.account.code)}
                  />
                </div>
              </td>
            </tr>
          )}
          {hasChildren && isGroup && expandedTypes[node.account.type] && renderTree(node.children, depth + 1)}
          {hasChildren && !isGroup && isExpanded && renderTree(node.children, depth + 1)}
        </React.Fragment>
      )
    })
  }

  const activeAccounts = accounts.filter(a => a.isActive).length

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Chart of Accounts</div>
            <div className="page-subtitle">{activeAccounts} active accounts</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="data-table-toolbar">
          <div className="data-table-filters">
            <div className="segmented-control">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`segmented-control-btn${activeTab === tab.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="table-actions">
            <div className="data-table-search">
              <SearchIcon />
              <input
                type="text"
                className="data-table-search-input"
                placeholder="Search by name or code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="data-table-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear">
                  <CloseIcon />
                </button>
              )}
            </div>
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              style={{
                margin: 0,
                minWidth: '120px'
              }}
            />
            <Button
              variant="secondary"
              onClick={() => {
                const csv = [
                  ['Code', 'Account Name', 'Type', 'Status'],
                  ...(tree as any[]).flatMap((n: any) => {
                    const rows: string[][] = []
                    const walk = (nodes: any[], depth: number) => {
                      for (const node of nodes) {
                        rows.push([node.account.code, node.account.name, node.account.type, node.account.isActive ? 'Active' : 'Inactive'])
                        if (node.children.length > 0) walk(node.children, depth + 1)
                      }
                    }
                    walk([n], 0)
                    return rows
                  }),
                ]
                const blob = new Blob([csv.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' })
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.download = 'chart-of-accounts.csv'
                link.click()
              }}
            >
              Export
            </Button>
            <Button variant="primary" icon={<PlusIcon />} onClick={handleAddNew}>
              Add Account
            </Button>
          </div>
        </div>

        <div className="card card-table">
          <div className="card-body" style={{ padding: 0 }}>
            {(tree as any[]).length === 0 ? (
              <EmptyState
                icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>}
                title="No accounts found"
                text="Try adjusting your search or filters."
              />
            ) : (
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 110 }}>Code</th>
                      <th>Account Name</th>
                      <th style={{ width: 110 }}>Status</th>
                      <th style={{ width: 140, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderTree(tree as any[])}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={modalMode !== null}
        title={modalMode === 'add' ? 'Add New Account' : 'Edit Account'}
        onClose={closeModal}
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button onClick={closeModal}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={!!validationError}>
              {modalMode === 'add' ? 'Create' : 'Save'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 4px' }}>
          {validationError && (
            <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 6, color: '#DC2626', fontSize: 13 }}>
              {validationError}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>GL Code</label>
            <input
              type="text"
              value={formCode}
              onChange={e => {
                setFormCode(e.target.value)
                setValidationError('')
              }}
              disabled={modalMode === 'edit' && SYSTEM_ROOT_CODES.includes(selectedAccount?.code || '')}
              placeholder="e.g. 112001"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Account Name</label>
            <input
              type="text"
              value={formName}
              onChange={e => {
                setFormName(e.target.value)
                setValidationError('')
              }}
              disabled={modalMode === 'edit' && SYSTEM_ROOT_CODES.includes(selectedAccount?.code || '')}
              placeholder="e.g. Operating Bank Account"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
            />
          </div>

          <div>
            <Select
              label="Parent Account"
              value={formParentId}
              onChange={e => {
                setFormParentId(e.target.value)
                setValidationError('')
              }}
              disabled={modalMode === 'edit' && SYSTEM_ROOT_CODES.includes(selectedAccount?.code || '')}
              options={[
                { value: '', label: 'None (Root Level)' },
                ...accounts
                  .filter(a => !selectedAccount || a.id !== selectedAccount.id)
                  .map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))
              ]}
              style={{ margin: 0, width: '100%' }}
            />
          </div>

          <div>
            <Select
              label="Status"
              value={formActive ? 'active' : 'inactive'}
              onChange={e => {
                setFormActive(e.target.value === 'active')
                setValidationError('')
              }}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              style={{ margin: 0, width: '100%' }}
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
