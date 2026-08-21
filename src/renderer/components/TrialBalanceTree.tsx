import React, { useMemo, useState, useCallback } from 'react'
import type { Account, Voucher, TrialBalanceEntry } from '../accounting/types'
import { CurrencyText } from './design/CurrencyText'

import { EmptyState, Modal } from './design/DesignSystem'
import AccountDrillDown from './AccountDrillDown'
import { ChevronRight, Landmark, ListChecks, TrendingUp, TrendingDown, Download } from 'lucide-react'
import { exportTableData } from '../services/reportExportService'
import { getLinesForAccount, getLinesForAccounts } from '../accounting/ledgerService'
import { formatDate } from '../utils'

interface TreeNode {
  id: string
  code: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  depth: number
  totalDebit: number
  totalCredit: number
  balance: number
  isParent: boolean
  children: TreeNode[]
}

interface Props {
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
  entries: TrialBalanceEntry[]
  totals: { totalDebit: number; totalCredit: number }
}

const TYPE_LABELS: Record<string, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses',
}

const TYPE_ORDER: Record<string, number> = {
  asset: 0,
  liability: 1,
  equity: 2,
  revenue: 3,
  expense: 4,
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  asset: <Landmark size={14} strokeWidth={1.75} />,
  liability: <ListChecks size={14} strokeWidth={1.75} />,
  revenue: <TrendingUp size={14} strokeWidth={1.75} />,
  expense: <TrendingDown size={14} strokeWidth={1.75} />,
  equity: <Landmark size={14} strokeWidth={1.75} />,
}

function buildTree(accounts: Account[], entries: TrialBalanceEntry[]): TreeNode[] {
  const entryMap = new Map(entries.map(e => [e.accountId, e]))

  function getChildren(parentId: string | null): TreeNode[] {
    return accounts
      .filter(a => a.parentId === parentId && a.isActive)
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(a => {
        const children = getChildren(a.id)
        const entry = entryMap.get(a.id)
        return {
          id: a.id,
          code: a.code,
          name: a.name,
          type: a.type,
          depth: 0,
          totalDebit: entry?.totalDebit ?? 0,
          totalCredit: entry?.totalCredit ?? 0,
          balance: entry?.balance ?? 0,
          isParent: children.length > 0,
          children,
        }
      })
  }

  return getChildren(null)
}

export default function TrialBalanceTree({ currency = 'AED', accounts, vouchers, entries, totals }: Props) {
  const [drillAccountId, setDrillAccountId] = useState<string | null>(null)
  const [drillAccountName, setDrillAccountName] = useState<string>('')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(accounts.map(a => a.id)))
  
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({
    asset: true, liability: true, revenue: true, expense: true, equity: true,
  })
  
  const [exportMenuOpenFor, setExportMenuOpenFor] = useState<string | null>(null)

  const tree = useMemo(() => buildTree(accounts, entries), [accounts, entries])

  const toggle = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  
  const toggleType = useCallback((type: string) => {
    setExpandedTypes(prev => ({ ...prev, [type]: !prev[type] }))
  }, [])

  const handleExportAccount = useCallback(async (accountId: string, accountName: string, accountCode: string, format: 'pdf' | 'xlsx' | 'csv') => {
    const acct = accounts.find(a => a.id === accountId)
    if (!acct) return
    
    let lines: any[] = []
    const children = accounts.filter(a => a.parentId === acct.id && a.isActive)
    if (children.length > 0) {
      lines = getLinesForAccounts([accountId, ...children.map(c => c.id)], vouchers)
    } else {
      lines = getLinesForAccount(accountId, vouchers)
    }

    if (lines.length === 0) {
      alert(`No transactions found for account: ${accountName}`)
      return
    }

    const rows = lines.map(({ line, voucher }: any) => [
      voucher.number,
      formatDate(voucher.date, 'DD/MM/YYYY'),
      line.narration || voucher.description || '',
      line.type === 'Debit' ? line.baseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '',
      line.type === 'Credit' ? line.baseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''
    ])

    const total = lines.reduce((s: number, { line }: any) => line.type === 'Debit' ? s + line.baseAmount : s - line.baseAmount, 0)
    const foot = [
      ['', '', 'Balance:', '', total.toLocaleString(undefined, { minimumFractionDigits: 2 })]
    ]

    await exportTableData({
      moduleName: 'Accounting',
      format,
      title: `Statement of Account`,
      subtitle: `${accountName} (${accountCode})`,
      periodLabel: 'All Time',
      filename: `SOA_${accountName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}`,
      columns: ['Voucher', 'Date', 'Narration', 'Debit', 'Credit'],
      rows,
      foot,
      currency,
      generatedBy: ''
    })
  }, [accounts, vouchers, currency])

  const handleBalanceClick = useCallback((id: string, name: string) => {
    setDrillAccountId(id)
    setDrillAccountName(name)
  }, [])

  const grouped = useMemo(() => {
    const byType: Record<string, TreeNode[]> = {}
    for (const node of tree) {
      if (!byType[node.type]) byType[node.type] = []
      byType[node.type].push(node)
    }
    return Object.entries(byType).sort(
      ([a], [b]) => (TYPE_ORDER[a] ?? 99) - (TYPE_ORDER[b] ?? 99)
    )
  }, [tree])

  if (entries.length === 0) {
    return (
      <div className="page-body">
        <div className="card card-table">
          <div className="card-body">
            <EmptyState
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              }
              title="No trial balance entries"
              text="Post vouchers to see trial balance data."
            />
          </div>
        </div>
      </div>
    )
  }

  const renderTree = (nodes: TreeNode[], depth = 0): React.ReactNode => {
    return nodes.map(node => {
      const isExpanded = expanded.has(node.id)
      const hasChildren = node.isParent
      return (
        <React.Fragment key={node.id}>
          <tr
            className={`coa-row ${hasChildren ? 'coa-parent' : 'coa-leaf'} ${node.type}`}
            style={{ cursor: hasChildren ? 'pointer' : 'default' }}
            onClick={() => hasChildren && toggle(node.id)}
          >
            <td>
              {!hasChildren && <span className="coa-code">{node.code}</span>}
            </td>
            <td>
              <div className="coa-namecell" style={{ paddingLeft: depth * 20 }}>
                {hasChildren ? (
                  <button
                    className={`coa-chevron${isExpanded ? ' open' : ''}`}
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    aria-expanded={isExpanded}
                    onClick={e => { e.stopPropagation(); toggle(node.id) }}
                  >
                    <ChevronRight size={16} strokeWidth={2} />
                  </button>
                ) : (
                  <span className="coa-chevron-placeholder" />
                )}
                {hasChildren && <span className="coa-typeicon">{TYPE_ICONS[node.type]}</span>}
                <span 
                  className="coa-name"
                  style={{ cursor: 'pointer' }}
                  onClick={e => {
                    e.stopPropagation()
                    setExportMenuOpenFor(exportMenuOpenFor === node.id ? null : node.id)
                  }}
                  title="Click to export Statement of Account"
                >
                  {node.name}
                </span>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    className="tb-export-btn"
                    title="Export Statement"
                    onClick={e => {
                      e.stopPropagation()
                      setExportMenuOpenFor(exportMenuOpenFor === node.id ? null : node.id)
                    }}
                  >
                    <Download size={12} strokeWidth={2.5} />
                  </button>
                  {exportMenuOpenFor === node.id && (
                    <div style={{ position: 'absolute', top: '100%', left: 6, marginTop: 4, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, width: 120, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <button className="export-menu-item" onClick={(e) => { e.stopPropagation(); setExportMenuOpenFor(null); handleExportAccount(node.id, node.name, node.code, 'pdf') }} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid var(--divider, #E5E7EB)' }}>PDF (.pdf)</button>
                      <button className="export-menu-item" onClick={(e) => { e.stopPropagation(); setExportMenuOpenFor(null); handleExportAccount(node.id, node.name, node.code, 'xlsx') }} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid var(--divider, #E5E7EB)' }}>Excel (.xlsx)</button>
                      <button className="export-menu-item" onClick={(e) => { e.stopPropagation(); setExportMenuOpenFor(null); handleExportAccount(node.id, node.name, node.code, 'csv') }} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer' }}>CSV (.csv)</button>
                    </div>
                  )}
                </div>
              </div>
            </td>
            {hasChildren ? (
              <>
                <td className="tb-cell-right" />
                <td className="tb-cell-right" />
                <td className="tb-cell-right" />
              </>
            ) : (
              <>
                <td className="tb-cell-right">
                  <CurrencyText value={node.totalDebit} currency={currency} />
                </td>
                <td className="tb-cell-right">
                  <CurrencyText value={node.totalCredit} currency={currency} />
                </td>
                <td className="tb-cell-right" style={{ paddingRight: 20 }}>
                  <span
                    className="tb-balance"
                    onClick={e => {
                      e.stopPropagation()
                      handleBalanceClick(node.id, node.name)
                    }}
                  >
                    <CurrencyText
                      value={Math.abs(node.balance)}
                      currency={currency}
                      className={node.balance >= 0 ? 'text-success' : 'text-danger'}
                    />
                  </span>
                </td>
              </>
            )}
          </tr>
          {hasChildren && isExpanded && renderTree(node.children, depth + 1)}
        </React.Fragment>
      )
    })
  }

  return (
    <>
      <style>{`
        .tb-cell-right {
          text-align: right;
          font-size: 13px;
          font-variant-numeric: tabular-nums;
        }
        .tb-balance { cursor: pointer; transition: opacity 0.1s; }
        .tb-balance:hover { opacity: 0.7; }
        .coa-name { transition: color 0.15s, opacity 0.15s; }
        .coa-name:hover { opacity: 0.7; }
        .tb-export-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 4px;
          border: none;
          background: transparent;
          color: var(--text-tertiary, #9CA3AF);
          cursor: pointer;
          margin-left: 6px;
          opacity: 0;
          transition: all 0.15s;
        }
        .coa-row:hover .tb-export-btn {
          opacity: 1;
        }
        .tb-export-btn:hover {
          background: var(--bg-tertiary, #F9FAFB);
          color: var(--primary, #6366F1);
        }
        .export-menu-item:hover {
          background-color: var(--bg-tertiary, #F9FAFB);
          color: var(--primary, #6366F1);
        }
        .tb-summary {
          padding: 12px 16px;
          display: flex;
          gap: 24px;
          align-items: center;
          border-top: 1px solid var(--divider, #E5E7EB);
          background: var(--bg-tertiary, #F9FAFB);
        }
        .tb-summary-item {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary, #1F2937);
        }
      `}</style>

      <div className="page-body">
        <div className="card card-table">
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 110, paddingLeft: 20 }}>Code</th>
                    <th>Account Name</th>
                    <th style={{ textAlign: 'right', width: '140px' }}>Debit</th>
                    <th style={{ textAlign: 'right', width: '140px' }}>Credit</th>
                    <th style={{ textAlign: 'right', width: '160px', paddingRight: 20 }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map(([type, nodes]) => {
                    const isGroupExpanded = expandedTypes[type] ?? true
                    const label = TYPE_LABELS[type] || type
                    
                    let count = 0
                    const countNodes = (ns: TreeNode[]) => {
                      for (const n of ns) {
                        count++
                        countNodes(n.children)
                      }
                    }
                    countNodes(nodes)

                    return (
                      <React.Fragment key={type}>
                        <tr
                          className={`coa-row coa-group ${type}`}
                          onClick={() => toggleType(type)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>
                            <span className="coa-code"></span>
                          </td>
                          <td>
                            <div className="coa-namecell">
                              <button
                                className={`coa-chevron${isGroupExpanded ? ' open' : ''}`}
                                onClick={e => { e.stopPropagation(); toggleType(type) }}
                              >
                                <ChevronRight size={16} strokeWidth={2} />
                              </button>
                              <span className="coa-typeicon">{TYPE_ICONS[type]}</span>
                              <span className="coa-name">{label}</span>
                              <span className="coa-count">{count} accounts</span>
                            </div>
                          </td>
                          <td />
                          <td />
                          <td />
                        </tr>
                        {isGroupExpanded && renderTree(nodes.flatMap(n => n.children))}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="tb-summary">
              <span className="tb-summary-item">
                Total Debit: <CurrencyText value={totals.totalDebit} currency={currency} />
              </span>
              <span className="tb-summary-item">
                Total Credit: <CurrencyText value={totals.totalCredit} currency={currency} />
              </span>
              <span
                className="tb-summary-item"
                style={{
                  color: Math.abs(totals.totalDebit - totals.totalCredit) < 0.01
                    ? 'var(--success, #22C55E)'
                    : 'var(--danger, #EF4444)',
                }}
              >
                {Math.abs(totals.totalDebit - totals.totalCredit) < 0.01 ? 'Balanced' : 'Unbalanced'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={drillAccountId !== null}
        title={`Account Drill Down — ${drillAccountName}`}
        onClose={() => setDrillAccountId(null)}
      >
        {drillAccountId && (
          <AccountDrillDown
            accountId={drillAccountId}
            accountName={drillAccountName}
            accounts={accounts}
            vouchers={vouchers}
            currency={currency}
          />
        )}
      </Modal>
    </>
  )
}
