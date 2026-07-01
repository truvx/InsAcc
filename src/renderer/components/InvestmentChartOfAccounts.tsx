import React, { useMemo, useState } from 'react'
import type { Account, Voucher } from '../accounting/types'
import { EmptyState, SearchIcon, CloseIcon } from './design/DesignSystem'
import { getAccountBalance } from '../accounting/ledgerService'
import { buildAccountTree } from '../accounting/chartOfAccountsService'

interface Props {
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
}

const TYPE_LABELS: Record<string, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  revenue: 'Revenue',
  expense: 'Expenses',
}

const TYPE_ICONS: Record<string, string> = {
  asset: '🏦',
  liability: '📋',
  revenue: '📈',
  expense: '📉',
}

const TYPE_COLORS: Record<string, string> = {
  asset: '#0A0A6F',
  liability: '#D97706',
  revenue: '#059669',
  expense: '#DC2626',
}

type SegmentedTab = 'all' | 'asset' | 'liability' | 'revenue' | 'expense'

export default function InvestmentChartOfAccounts({ currency = 'AED', accounts, vouchers }: Props) {
  const [activeTab, setActiveTab] = useState<SegmentedTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({
    asset: true, liability: true, revenue: true, expense: true,
  })
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({})

  const balances = useMemo(() => {
    const map: Record<string, number> = {}
    for (const acct of accounts) {
      if (acct.isActive) {
        map[acct.id] = getAccountBalance(acct.id, vouchers, accounts)
      }
    }
    return map
  }, [accounts, vouchers])

  const tree = useMemo(() => buildAccountTree(accounts), [accounts])

  const toggleType = (type: string) => {
    setExpandedTypes(prev => ({ ...prev, [type]: !prev[type] }))
  }

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const getParentName = (parentId: string | null) => {
    if (!parentId) return '—'
    const parent = accounts.find(a => a.id === parentId)
    return parent ? `${parent.code} ${parent.name}` : '—'
  }

  const visibleTypes = useMemo(() => {
    if (activeTab === 'all') return ['asset', 'liability', 'revenue', 'expense']
    return [activeTab]
  }, [activeTab])

  const tabs: { id: SegmentedTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'asset', label: 'Assets' },
    { id: 'liability', label: 'Liabilities' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'expense', label: 'Expenses' },
  ]

  const renderTree = (
    nodes: Array<{ account: Account; children: Array<any>; depth: number }>,
    depth = 0,
  ): React.ReactNode => {
    return nodes.map(node => {
      const typeLabel = TYPE_LABELS[node.account.type] || node.account.type
      if (!visibleTypes.includes(node.account.type)) return null
      if (!expandedTypes[node.account.type] && node.depth === 0) return null
      if (statusFilter === 'active' && !node.account.isActive) return null
      if (statusFilter === 'inactive' && node.account.isActive) return null
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const match = node.account.name.toLowerCase().includes(q) ||
          node.account.code.includes(q) ||
          typeLabel.toLowerCase().includes(q)
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
      const balance = balances[node.account.id] || 0
      const isGroup = node.depth === 0

      return (
        <React.Fragment key={node.account.id}>
          {isGroup ? (
            <tr
              onClick={() => toggleType(node.account.type)}
              style={{ cursor: 'pointer', background: `${TYPE_COLORS[node.account.type]}06` }}
            >
              <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--divider)' }}>
                <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', paddingLeft: depth * 20 }}>{node.account.code}</span>
              </td>
              <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--divider)' }} colSpan={3}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: depth * 20 }}>
                  <span style={{ fontSize: 16 }}>{TYPE_ICONS[node.account.type]}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: TYPE_COLORS[node.account.type] }}>
                    {node.account.name}
                  </span>
                  <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>{node.account.code}</span>
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                    ({node.children.length} accounts)
                  </span>
                </div>
              </td>
              <td style={{ padding: '10px 16px', textAlign: 'right', borderBottom: '1px solid var(--divider)' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
                  {currency} {Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </td>
              <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--divider)' }}>
                <span style={{ color: expandedTypes[node.account.type] ? '#22C55E' : '#9CA3AF', fontSize: 11 }}>
                  {expandedTypes[node.account.type] ? '▾ Expanded' : '▸ Collapsed'}
                </span>
              </td>
            </tr>
          ) : (
            <tr
              style={{ cursor: hasChildren ? 'pointer' : 'default' }}
              onClick={() => hasChildren && toggleNode(node.account.id)}
            >
              <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--divider)' }}>
                <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', paddingLeft: depth * 20 }}>
                  {node.account.code}
                </span>
              </td>
              <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--divider)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: depth * 20 }}>
                  {hasChildren && (
                    <span style={{ fontSize: 10, color: '#9CA3AF', flexShrink: 0 }}>
                      {isExpanded ? '▾' : '▸'}
                    </span>
                  )}
                  <span style={{ fontWeight: depth === 1 ? 600 : 400, fontSize: 13 }}>
                    {node.account.name}
                  </span>
                  {depth > 0 && (
                    <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>{node.account.code}</span>
                  )}
                </div>
              </td>
              <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--divider)' }}>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11,
                  fontWeight: 500, color: TYPE_COLORS[node.account.type],
                  background: `${TYPE_COLORS[node.account.type]}12`,
                }}>
                  {typeLabel}
                </span>
              </td>
              <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--divider)' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6B7280' }}>
                  {node.account.normalBalance === 'debit' ? 'Dr' : 'Cr'}
                </span>
              </td>
              <td style={{ padding: '10px 16px', textAlign: 'right', borderBottom: '1px solid var(--divider)' }}>
                <span style={{
                  fontFamily: 'monospace', fontSize: 13, fontWeight: 600,
                  color: balance >= 0 ? '#1F2937' : '#EF4444',
                }}>
                  {currency} {Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </td>
              <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--divider)' }}>
                <span style={{
                  display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11,
                  fontWeight: 500,
                  background: node.account.isActive ? '#22C55E14' : '#F3F4F6',
                  color: node.account.isActive ? '#22C55E' : '#9CA3AF',
                }}>
                  {node.account.isActive ? 'Active' : 'Inactive'}
                </span>
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
            <div className="data-table-search" style={{ minWidth: 280 }}>
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
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
              style={{
                height: 36, borderRadius: 8, border: '1px solid var(--border)',
                background: '#fff', padding: '0 8px', fontSize: 12, color: '#1F2937',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              onClick={() => {
                const csv = [
                  ['Code', 'Account Name', 'Type', 'Normal', 'Balance', 'Status'],
                  ...(tree as any[]).flatMap((n: any) => {
                    const rows: string[][] = []
                    const walk = (nodes: any[], depth: number) => {
                      for (const node of nodes) {
                        const b = balances[node.account.id] || 0
                        rows.push([node.account.code, node.account.name, node.account.type, node.account.normalBalance, String(b), node.account.isActive ? 'Active' : 'Inactive'])
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
              style={{
                height: 36, borderRadius: 8, border: '1px solid var(--border)',
                background: '#fff', padding: '0 12px', fontSize: 12, fontWeight: 500,
                color: '#1F2937', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}
            >
              Export
            </button>
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
                      <th style={{ width: 100, padding: '12px 16px', position: 'sticky', top: 0, zIndex: 2, background: '#FAF8F4' }}>Code</th>
                      <th style={{ padding: '12px 16px', position: 'sticky', top: 0, zIndex: 2, background: '#FAF8F4' }}>Account Name</th>
                      <th style={{ width: 100, padding: '12px 16px', position: 'sticky', top: 0, zIndex: 2, background: '#FAF8F4' }}>Type</th>
                      <th style={{ width: 70, padding: '12px 16px', position: 'sticky', top: 0, zIndex: 2, background: '#FAF8F4' }}>Normal</th>
                      <th style={{ width: 150, padding: '12px 16px', textAlign: 'right', position: 'sticky', top: 0, zIndex: 2, background: '#FAF8F4' }}>Balance</th>
                      <th style={{ width: 80, padding: '12px 16px', position: 'sticky', top: 0, zIndex: 2, background: '#FAF8F4' }}>Status</th>
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
    </>
  )
}
