import React, { useMemo, useState } from 'react'
import type { Account, Voucher } from '../accounting/types'
import { buildAccountTree } from '../accounting/chartOfAccountsService'
import { getAccountBalance } from '../accounting/ledgerService'
import { EmptyState, Modal } from './design/DesignSystem'
import AccountDrillDown from './AccountDrillDown'

interface Props {
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
}

interface TreeNode {
  account: Account
  children: TreeNode[]
  depth: number
}

function flatRowsFromTree(
  nodes: TreeNode[],
  balances: Record<string, number>,
  allowedTypes: string[],
): Array<{ account: Account; depth: number; balance: number }> {
  const rows: Array<{ account: Account; depth: number; balance: number }> = []
  for (const node of nodes) {
    if (!allowedTypes.includes(node.account.type)) continue
    rows.push({ account: node.account, depth: node.depth, balance: balances[node.account.id] || 0 })
    if (node.children.length > 0) {
      rows.push(...flatRowsFromTree(node.children, balances, allowedTypes))
    }
  }
  return rows
}

function computeTotal(
  nodes: TreeNode[],
  balances: Record<string, number>,
  allowedTypes: string[],
): number {
  return nodes.reduce((sum, node) => {
    if (!allowedTypes.includes(node.account.type)) return sum
    const own = balances[node.account.id] || 0
    const childrenTotal = node.children.length > 0
      ? computeTotal(node.children, balances, allowedTypes)
      : own
    return sum + childrenTotal
  }, 0)
}

const TYPE_ICONS: Record<string, string> = {
  asset: '🏦',
  liability: '📋',
}

export default function InvestmentBalanceSheet({ currency = 'AED', accounts, vouchers }: Props) {
  const [drillAccountId, setDrillAccountId] = useState<string | null>(null)
  const [drillAccountName, setDrillAccountName] = useState<string>('')

  const balances = useMemo(() => {
    const map: Record<string, number> = {}
    for (const acct of accounts) {
      if (acct.isActive) {
        map[acct.id] = getAccountBalance(acct.id, vouchers, accounts)
      }
    }
    const totalRevenue = accounts.filter(a => a.type === 'revenue' && a.isActive).reduce((s, a) => s + (map[a.id] || 0), 0)
    const totalExpenses = accounts.filter(a => a.type === 'expense' && a.isActive).reduce((s, a) => s + (map[a.id] || 0), 0)
    const netIncome = totalRevenue - totalExpenses
    if (netIncome !== 0) {
      const equityParent = accounts.find(a => a.code === '31')
      if (equityParent) {
        map[equityParent.id] = (map[equityParent.id] || 0) + netIncome
      }
    }
    return map
  }, [accounts, vouchers])

  const tree = useMemo(() => buildAccountTree(accounts) as unknown as TreeNode[], [accounts])

  const assetRows = useMemo(() => flatRowsFromTree(tree, balances, ['asset']), [tree, balances])
  const liabilityRows = useMemo(() => flatRowsFromTree(tree, balances, ['liability']), [tree, balances])

  const totalAssets = useMemo(() => computeTotal(tree, balances, ['asset']), [tree, balances])
  const totalLiabilities = useMemo(() => computeTotal(tree, balances, ['liability']), [tree, balances])
  const totalEquity = useMemo(() => computeTotal(tree, balances, ['equity']), [tree, balances])
  const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01

  const renderSection = (
    title: string,
    icon: string,
    rows: Array<{ account: Account; depth: number; balance: number }>,
    total: number,
    accentColor: string,
  ) => (
    <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--divider)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 16, color: accentColor }}>{title}</span>
        <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' }}>
          {rows.filter(r => r.depth === 0).length} sections
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--divider)', background: '#FAF8F4', position: 'sticky', top: 0 }}>Account</th>
              <th style={{ padding: '8px 20px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--divider)', background: '#FAF8F4', position: 'sticky', top: 0, width: 160 }}>Balance ({currency})</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ padding: '24px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                  No {title.toLowerCase()} data
                </td>
              </tr>
            ) : (
              rows.map(row => {
                const isGroup = row.depth === 0
                const isSubGroup = row.depth === 1
                return (
                  <tr
                    key={row.account.id}
                    onClick={() => {
                      setDrillAccountId(row.account.id)
                      setDrillAccountName(row.account.name)
                    }}
                    style={{
                      cursor: 'pointer',
                      background: isGroup ? `${accentColor}06` : 'transparent',
                    }}
                  >
                    <td style={{ padding: isGroup ? '10px 20px' : '8px 20px', borderBottom: '1px solid #F9FAFB' }}>
                      <div style={{ paddingLeft: isGroup ? 0 : isSubGroup ? 20 : 36 }}>
                        {isGroup && <span style={{ fontWeight: 700, fontSize: 14, color: accentColor }}>{row.account.name}</span>}
                        {!isGroup && (
                          <>
                            <span style={{ fontWeight: isSubGroup ? 600 : 400, fontSize: 13 }}>{row.account.name}</span>
                            <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', marginLeft: 8 }}>{row.account.code}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: isGroup ? '10px 20px' : '8px 20px', textAlign: 'right', borderBottom: '1px solid #F9FAFB' }}>
                      <span style={{
                        fontFamily: 'monospace', fontSize: isGroup ? 14 : 13,
                        fontWeight: isGroup ? 700 : 600,
                        color: isGroup ? accentColor : row.balance >= 0 ? '#1F2937' : '#EF4444',
                      }}>
                        {currency} {Math.abs(row.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <div style={{
        padding: '12px 20px', borderTop: '2px solid var(--divider)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: `${accentColor}08`,
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: accentColor }}>Total {title}</span>
        <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: accentColor }}>
          {currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  )

  return (
    <>
      <Modal open={drillAccountId !== null} title={`Account Drill Down — ${drillAccountName}`} onClose={() => setDrillAccountId(null)}>
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

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Balance Sheet</div>
            <div className="page-subtitle">Financial position at a glance</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
          {renderSection('Assets', '🏦', assetRows, totalAssets, '#0A0A6F')}
          {renderSection('Liabilities', '📋', liabilityRows, totalLiabilities, '#D97706')}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div className="card" style={{ padding: '16px 20px', borderTop: '3px solid #0A0A6F' }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Total Assets</div>
            <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: '#0A0A6F' }}>
              {currency} {totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="card" style={{ padding: '16px 20px', borderTop: '3px solid #D97706' }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Total Liabilities</div>
            <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: '#D97706' }}>
              {currency} {totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="card" style={{ padding: '16px 20px', borderTop: `3px solid ${isBalanced ? '#22C55E' : '#EF4444'}` }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Balance Check</div>
            <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: isBalanced ? '#22C55E' : '#EF4444' }}>
              {isBalanced ? '✓ Balanced' : '✗ Out of Balance'}
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
              Assets = Liabilities + Equity
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
