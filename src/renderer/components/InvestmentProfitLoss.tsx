import React, { useMemo, useState } from 'react'
import type { Account, Voucher } from '../accounting/types'
import { buildAccountTree } from '../accounting/chartOfAccountsService'
import { generateChartOfAccountsReadModel, generateTrialBalanceReadModel, generateProfitAndLossReadModel } from '../readModels/accountingReadModels'
import { EmptyState, Modal } from './design/DesignSystem'
import AccountDrillDown from './AccountDrillDown'

import { TrendingUp, TrendingDown, Download } from 'lucide-react'
import { CurrencyText } from './design/CurrencyText'
import { exportSideBySidePdf } from '../services/reportExportService'

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

export default function InvestmentProfitLoss({ currency = 'AED', accounts, vouchers }: Props) {
  const [drillAccountId, setDrillAccountId] = useState<string | null>(null)
  const [drillAccountName, setDrillAccountName] = useState<string>('')

  const coaEntries = useMemo(() => generateChartOfAccountsReadModel(accounts, vouchers), [accounts, vouchers])
  
  const balances = useMemo(() => {
    const map: Record<string, number> = {}
    for (const entry of coaEntries) {
      map[entry.id] = entry.currentBalance
    }
    return map
  }, [coaEntries])

  const tbEntries = useMemo(() => generateTrialBalanceReadModel(coaEntries), [coaEntries])
  
  const plModel = useMemo(() => generateProfitAndLossReadModel(tbEntries, accounts), [tbEntries, accounts])

  const tree = useMemo(() => buildAccountTree(accounts) as unknown as TreeNode[], [accounts])

  const revenueRows = useMemo(() => flatRowsFromTree(tree, balances, ['revenue']).filter(r => r.depth > 0).map(r => ({ ...r, depth: r.depth - 1 })), [tree, balances])
  const expenseRows = useMemo(() => flatRowsFromTree(tree, balances, ['expense']).filter(r => r.depth > 0).map(r => ({ ...r, depth: r.depth - 1 })), [tree, balances])

  const totalRevenue = plModel.totalRevenue
  const totalExpenses = plModel.totalExpenses
  const netIncome = plModel.netProfit

  const hasAny = revenueRows.length > 0 || expenseRows.length > 0

  const renderTable = (
    title: string,
    rows: Array<{ account: Account; depth: number; balance: number }>,
    total: number,
    accentColor: string,
    totalColor: string,
  ) => (
    <div style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--divider)', background: 'var(--bg-tertiary)', position: 'sticky', top: 0 }}>Account</th>
            <th style={{ padding: '8px 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--divider)', background: 'var(--bg-tertiary)', position: 'sticky', top: 0, width: 160 }}>Amount ({currency})</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={2} style={{ padding: '24px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
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
                      background: 'transparent',
                    }}
                    className="hover-bg-secondary"
                  >
                    <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--divider)' }}>
                      <div style={{ paddingLeft: isGroup ? 0 : isSubGroup ? 16 : 32 }}>
                        {isGroup && <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{row.account.name}</span>}
                        {!isGroup && (
                          <>
                            <span style={{ fontWeight: isSubGroup ? 500 : 400, fontSize: 13, color: 'var(--text-secondary)' }}>{row.account.name}</span>
                            {!isSubGroup && <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>{row.account.code}</span>}
                          </>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', borderBottom: '1px solid var(--divider)' }}>
                      <CurrencyText
                        value={row.balance}
                        currency={currency}
                        className={isGroup ? 'fw-600' : 'fw-500'}
                        style={{ color: isGroup ? accentColor : undefined }}
                      />
                    </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )

  const handleExport = () => {
    exportSideBySidePdf({
      title: 'Profit & Loss',
      subtitle: 'Revenue — Expenses = Net Income',
      periodLabel: 'All Time',
      currency: currency,
      filename: `Profit_And_Loss_${new Date().toISOString().split('T')[0]}`,
      leftCol: {
        title: 'Revenue',
        rows: revenueRows.map(r => [
          { content: r.account.name, styles: { paddingLeft: 10 + r.depth * 5 } },
          { content: r.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { halign: 'right' } }
        ]),
        total: totalRevenue,
        accentColor: '#059669'
      },
      rightCol: {
        title: 'Expenses',
        rows: expenseRows.map(r => [
          { content: r.account.name, styles: { paddingLeft: 10 + r.depth * 5 } },
          { content: r.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { halign: 'right' } }
        ]),
        total: totalExpenses,
        accentColor: '#DC2626'
      },
      footer: {
        label: 'Net Profit / Loss',
        value: netIncome
      }
    })
  }

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
            <div className="page-title">Profit & Loss</div>
            <div className="page-subtitle">Revenue — Expenses = Net Income</div>
          </div>
        </div>
        <div className="page-header-right">
          <button
            onClick={handleExport}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid #E5E7EB',
              background: '#fff', cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6,
              color: '#374151', fontWeight: 500
            }}
          >
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      <div className="page-body">
        {!hasAny ? (
          <div className="card">
            <div className="card-body">
              <EmptyState
                icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>}
                title="No profit & loss data"
                text="Post vouchers to see profit & loss data."
              />
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
              <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
                <div style={{
                  padding: '16px 20px', borderBottom: '1px solid var(--divider)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', color: '#059669' }}><TrendingUp size={16} strokeWidth={1.75} /></span>
                  <span style={{ fontWeight: 700, fontSize: 16, color: '#059669' }}>Revenue</span>
                  <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' }}>
                    {revenueRows.filter(r => r.depth === 0).length} sections
                  </span>
                </div>
                {renderTable('Revenue', revenueRows, totalRevenue, '#059669', '#059669')}
                <div style={{
                  padding: '14px 20px', borderTop: '1px solid var(--divider)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--bg-secondary)',
                }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#059669' }}>Total Revenue</span>
                  <CurrencyText value={totalRevenue} currency={currency} className="text-md fw-700" style={{ color: '#059669' }} />
                </div>
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
                <div style={{
                  padding: '16px 20px', borderBottom: '1px solid var(--divider)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', color: '#DC2626' }}><TrendingDown size={16} strokeWidth={1.75} /></span>
                  <span style={{ fontWeight: 700, fontSize: 16, color: '#DC2626' }}>Expenses</span>
                  <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' }}>
                    {expenseRows.filter(r => r.depth === 0).length} sections
                  </span>
                </div>
                {renderTable('Expenses', expenseRows, totalExpenses, '#DC2626', '#DC2626')}
                <div style={{
                  padding: '14px 20px', borderTop: '1px solid var(--divider)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--bg-secondary)',
                }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#DC2626' }}>Total Expenses</span>
                  <CurrencyText value={totalExpenses} currency={currency} className="text-md fw-700" style={{ color: '#DC2626' }} />
                </div>
              </div>
            </div>

            <div className="card" style={{
              padding: 0, overflow: 'hidden',
              borderTop: `3px solid ${netIncome >= 0 ? '#22C55E' : '#EF4444'}`,
            }}>
              <div style={{
                padding: '20px 24px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: netIncome >= 0 ? '#22C55E08' : '#EF444408',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#6B7280', marginBottom: 2 }}>Net Profit / Loss</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>Revenue — Expenses</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <CurrencyText
                    value={netIncome}
                    currency={currency}
                    className="text-lg fw-700"
                    style={{ color: netIncome >= 0 ? '#22C55E' : '#EF4444' }}
                  />
                  <div style={{
                    fontSize: 12, fontWeight: 500,
                    color: netIncome >= 0 ? '#22C55E' : '#EF4444',
                    marginTop: 2,
                  }}>
                    {netIncome >= 0 ? '▲ Profitable' : '▼ Loss'}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
