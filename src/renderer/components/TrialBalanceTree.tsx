import React, { useMemo, useState, useCallback } from 'react'
import type { Account, Voucher, TrialBalanceEntry } from '../accounting/types'
import { CurrencyText } from './design/CurrencyText'

import { EmptyState, Modal } from './design/DesignSystem'
import AccountDrillDown from './AccountDrillDown'
import { ChevronRight } from 'lucide-react'

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

const TYPE_COLORS: Record<string, string> = {
  asset: '#3BA549',
  liability: '#DE8DA9',
  equity: '#5C63A6',
  revenue: '#22C55E',
  expense: '#EF4444',
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

  const tree = useMemo(() => buildTree(accounts, entries), [accounts, entries])

  const sectionTotals = useMemo(() => {
    const leafEntries = entries.filter(e => {
      const acct = accounts.find(a => a.id === e.accountId)
      const isParent = acct ? accounts.some(child => child.parentId === acct.id && child.isActive) : false
      return !isParent
    })
    const result: Record<string, { debit: number; credit: number }> = {}
    for (const type of ['asset', 'liability', 'equity', 'revenue', 'expense'] as const) {
      const typeLeaves = leafEntries.filter(e => e.type === type)
      result[type] = {
        debit: typeLeaves.reduce((s, e) => s + e.totalDebit, 0),
        credit: typeLeaves.reduce((s, e) => s + e.totalCredit, 0),
      }
    }
    return result
  }, [entries, accounts])

  const toggle = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

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

  return (
    <>
      <style>{`
        .tb-table { width: 100%; border-collapse: collapse; border-spacing: 0; }
        .tb-table th {
          position: relative !important;
          top: auto !important;
        }
        /* Header styling intentionally NOT overridden here — the Trial Balance
           reuses the shared canonical table-header style (theme.css thead/th:
           --bg-tertiary background, border, sticky, uppercase typography, 48px
           height) so it matches Chart of Accounts, Balance Sheet, P&L, General
           Ledger and every voucher table. Numeric header alignment is applied via
           inline textAlign on the th elements below. */
        .tb-section-header td {
          padding: 8px 16px;
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          border-bottom: 1px solid var(--border, #E5E7EB);
          border-top: 1px solid var(--border, #E5E7EB);
        }
        .tb-row { transition: background 0.1s; }
        .tb-row:hover { background: var(--bg-tertiary, #F9FAFB); }
        .tb-row td {
          padding: 7px 16px;
          vertical-align: middle;
          border-bottom: 1px solid var(--border-light, #F3F4F6);
        }
        .tb-connector-cell {
          display: flex;
          align-items: center;
          gap: 0;
        }
        .tb-connector-seg {
          width: 24px;
          height: 24px;
          position: relative;
          flex-shrink: 0;
        }
        .tb-line-v {
          position: absolute;
          left: 11px;
          top: 0;
          bottom: 0;
          width: 1px;
          background: var(--border, #E5E7EB);
        }
        .tb-line-v.half { bottom: 50%; }
        .tb-line-h {
          position: absolute;
          left: 11px;
          top: 50%;
          width: 13px;
          height: 1px;
          background: var(--border, #E5E7EB);
        }
        .tb-toggle {
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 4px;
          color: var(--text-secondary, #6B7280);
          cursor: pointer;
          transition: background 0.1s;
          margin-right: 2px;
          background: none;
          border: none;
          padding: 0;
        }
        .tb-toggle:hover {
          background: var(--border-light, #F3F4F6);
          color: var(--text-primary);
        }
        .tb-toggle-placeholder { width: 24px; flex-shrink: 0; }
        .tb-code {
          font-size: 11px;
          color: var(--text-muted, #9CA3AF);
          font-family: monospace;
          flex-shrink: 0;
        }
        .tb-name {
          font-size: 13px;
          color: var(--text-primary, #1F2937);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tb-name.parent { font-weight: 600; }
        .tb-cell-right {
          text-align: right;
          font-size: 13px;
          font-variant-numeric: tabular-nums;
        }
        .tb-balance { cursor: pointer; transition: opacity 0.1s; }
        .tb-balance:hover { opacity: 0.7; }
        .tb-summary {
          padding: 12px 16px;
          display: flex;
          gap: 24px;
          align-items: center;
          border-top: 1px solid var(--border, #E5E7EB);
          background: var(--bg-tertiary, #F9FAFB);
        }
        .tb-summary-item {
          font-size: 12px;
          font-weight: 600;
          font-family: monospace;
          color: var(--text-primary, #1F2937);
        }
      `}</style>

      <div className="page-body">
        <div className="card card-table">
          <div className="card-body" style={{ padding: 0 }}>
            <table className="tb-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Account</th>
                  <th style={{ textAlign: 'right', width: '140px' }}>Debit</th>
                  <th style={{ textAlign: 'right', width: '140px' }}>Credit</th>
                  <th style={{ textAlign: 'right', width: '160px' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(([type, nodes]) => (
                  <TreeSection
                    key={type}
                    type={type}
                    nodes={nodes}
                    expanded={expanded}
                    onToggle={toggle}
                    onBalanceClick={handleBalanceClick}
                    currency={currency}
                  />
                ))}
              </tbody>
            </table>
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

function TreeSection({
  type,
  nodes,
  expanded,
  onToggle,
  onBalanceClick,
  currency,
}: {
  type: string
  nodes: TreeNode[]
  expanded: Set<string>
  onToggle: (id: string) => void
  onBalanceClick: (id: string, name: string) => void
  currency: string
}) {
  const label = TYPE_LABELS[type] || type

  return (
    <>
      <tr className="tb-section-header">
        <td colSpan={4} style={{ color: TYPE_COLORS[type] || 'var(--text-primary)' }}>
          {label}
        </td>
      </tr>
      {nodes.map((node, i) => (
        <TreeRow
          key={node.id}
          node={node}
          expanded={expanded}
          onToggle={onToggle}
          onBalanceClick={onBalanceClick}
          currency={currency}
          depth={0}
          ancestorIsLast={[]}
          isLast={i === nodes.length - 1}
        />
      ))}
    </>
  )
}

function TreeRow({
  node,
  expanded,
  onToggle,
  onBalanceClick,
  currency,
  depth,
  ancestorIsLast,
  isLast,
}: {
  node: TreeNode
  expanded: Set<string>
  onToggle: (id: string) => void
  onBalanceClick: (id: string, name: string) => void
  currency: string
  depth: number
  ancestorIsLast: boolean[]
  isLast: boolean
}) {
  const isExpanded = expanded.has(node.id)

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (node.isParent) onToggle(node.id)
  }

  return (
    <>
      <tr className="tb-row" onClick={handleToggle} style={{ cursor: node.isParent ? 'pointer' : 'default' }}>
        <td>
          <div className="tb-connector-cell" style={{ paddingLeft: depth * 24 }}>
            {[...Array(depth)].map((_, i) => (
              <div key={i} className="tb-connector-seg">
                {!ancestorIsLast[i] && <div className="tb-line-v" />}
              </div>
            ))}
            <div className="tb-connector-seg">
              <div className={`tb-line-v${isLast && depth > 0 ? ' half' : ''}`} />
              <div className="tb-line-h" />
            </div>
            {node.isParent ? (
              <button className="tb-toggle" onClick={handleToggle} title={isExpanded ? 'Collapse' : 'Expand'}>
                <ChevronRight
                  size={14}
                  style={{
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s',
                  }}
                />
              </button>
            ) : (
              <div className="tb-toggle-placeholder" />
            )}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
              {!node.isParent && <span className="tb-code">{node.code}</span>}
              <span className={`tb-name${node.isParent ? ' parent' : ''}`}>{node.name}</span>
            </div>
          </div>
        </td>
        {/*
          Group/parent accounts are grouping-only nodes: leave Debit/Credit/Balance
          blank to reduce visual clutter. isParent is derived dynamically from the
          chart-of-accounts hierarchy (children.length > 0), never from hardcoded codes.
          Only leaf accounts render actual values. This is presentation-only —
          read models still compute every balance normally.
        */}
        {node.isParent ? (
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
            <td className="tb-cell-right">
              <span
                className="tb-balance"
                onClick={e => {
                  e.stopPropagation()
                  onBalanceClick(node.id, node.name)
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
      {node.isParent && isExpanded && (
        <TreeChildren
          nodes={node.children}
          expanded={expanded}
          onToggle={onToggle}
          onBalanceClick={onBalanceClick}
          currency={currency}
          depth={depth + 1}
          ancestorIsLast={[...ancestorIsLast, isLast]}
        />
      )}
    </>
  )
}

function TreeChildren({
  nodes,
  expanded,
  onToggle,
  onBalanceClick,
  currency,
  depth,
  ancestorIsLast,
}: {
  nodes: TreeNode[]
  expanded: Set<string>
  onToggle: (id: string) => void
  onBalanceClick: (id: string, name: string) => void
  currency: string
  depth: number
  ancestorIsLast: boolean[]
}) {
  return (
    <>
      {nodes.map((node, i) => (
        <TreeRow
          key={node.id}
          node={node}
          expanded={expanded}
          onToggle={onToggle}
          onBalanceClick={onBalanceClick}
          currency={currency}
          depth={depth}
          ancestorIsLast={ancestorIsLast}
          isLast={i === nodes.length - 1}
        />
      ))}
    </>
  )
}
