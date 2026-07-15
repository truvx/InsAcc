import React, { useMemo, useState, memo } from 'react'
import type { Account, Voucher, BankMapping } from '../accounting/types'
import { getInvestmentDashboardProjection } from '../readModels/InvestmentDashboardReadModel'
import { getAllAccountBalances } from '../accounting/ledgerService'
import { getChildren } from '../accounting/chartOfAccountsService'
import { KpiCard } from './design/DesignSystem'
import { getAssetAllocationColor } from '../styles/ChartTheme'
import type { BankAccount } from '../data/banking'
import Toast from './Toast'
import { TreeView } from './TreeView'
import { formatPremiumCompact } from '../utils/reportFormatters'
import { motion } from 'framer-motion'
import LazyChart from './LazyChart'

const AssetAllocationPie = React.lazy(() => import('./charts/AssetAllocationPie'))
const InvestmentGrowthChart = React.lazy(() => import('./charts/InvestmentGrowthChart'))
const CashFlowChart = React.lazy(() => import('./charts/CashFlowChart'))
const IncomeExpenseChart = React.lazy(() => import('./charts/IncomeExpenseChart'))

interface Props {
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
  bankAccounts?: BankAccount[]
  bankMappings?: BankMapping[]
  onNavigate?: (page: string) => void
}

function fmt(n: number, sym = 'AED') {
  const { valueStr, suffix } = formatPremiumCompact(n);
  const sign = n < 0 ? '-' : '';
  return <>{sign}{sym} {valueStr}{suffix}</>;
}

interface InvestmentKpiCardProps {
  label: string
  value: number
  currency: string
  change?: { value: string; direction: 'up' | 'down' | 'neutral' }
  accentColor?: string
  isNetCash?: boolean
}

function InvestmentKpiCard({
  label,
  value,
  currency,
  change,
  accentColor,
  isNetCash = false
}: InvestmentKpiCardProps) {
  const { valueStr, suffix } = formatPremiumCompact(value)
  const sign = value < 0 ? '-' : ''

  let valueColor = 'var(--text-primary)'
  if (isNetCash) {
    valueColor = value >= 0 ? 'var(--kpi-green, #10B981)' : 'var(--kpi-red, #EF4444)'
  }

  return (
    <motion.div
      className="premium-kpi-card"
      style={accentColor ? { borderTopColor: accentColor } as React.CSSProperties : undefined}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
    >
      <div>
        <div className="premium-kpi-label">{label}</div>
        <div className="premium-kpi-value-container">
          <span className="premium-kpi-currency">{sign}{currency}</span>
          <span className="premium-kpi-amount" style={{ color: valueColor }}>{valueStr}{suffix}</span>
        </div>
      </div>

      <span className="premium-kpi-precision" style={{ display: 'none' }}>
        {value.toFixed(2)}
      </span>

      {change && (
        <div className="premium-kpi-change-row">
          <span className={`premium-kpi-change-tag ${change.direction}`}>
            {change.direction === 'up' && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}>
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            )}
            {change.direction === 'down' && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}>
                <line x1="7" y1="7" x2="17" y2="17"></line>
                <polyline points="17 7 17 17 7 17"></polyline>
              </svg>
            )}
            {change.value}
          </span>
        </div>
      )}
    </motion.div>
  )
}

interface TreeNode {
  id: string
  name: string
  value: number
  percentage: number
  color?: string
  children: TreeNode[]
}



function InvestmentDashboardInner({
  currency = 'AED', accounts, vouchers, bankAccounts = [], bankMappings = [], onNavigate = () => {},
}: Props) {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const data = useMemo(() => getInvestmentDashboardProjection(accounts, vouchers, bankAccounts, bankMappings), [accounts, vouchers, bankAccounts, bankMappings])
  const sym = currency

  const assetAllocationData = useMemo(() => {
    return data.allocation.map((a, i) => ({
      name: a.name,
      value: a.value,
      percentage: a.percentage,
      color: getAssetAllocationColor(a.name),
      accountId: a.accountId,
    }))
  }, [data.allocation])

  const topHoldingsTree = useMemo(() => {
    const allBals = getAllAccountBalances(vouchers, accounts)
    const totalPortfolioValue = data.portfolioValue || 1

    const acctMap = new Map(accounts.map(a => [a.id, a]))

    function buildTree(acctId: string, includeOnly: string[] | null): TreeNode | null {
      const acct = acctMap.get(acctId)
      if (!acct || !acct.isActive) return null

      const bal = allBals[acctId] || 0
      const children = getChildren(acctId, accounts)

      if (children.length === 0) {
        if (bal === 0) return null
        return {
          id: acct.id,
          name: acct.name,
          value: bal,
          percentage: 0,
          color: getAssetAllocationColor(acct.name),
          children: [],
        }
      }

      let childNodes: TreeNode[] = children
        .map(c => includeOnly && includeOnly.length > 0 && !includeOnly.includes(c.id)
          ? null
          : buildTree(c.id, null))
        .filter((n): n is TreeNode => n !== null)

      if (childNodes.length === 0 && bal === 0) return null

      const value = childNodes.length > 0
        ? childNodes.reduce((s, n) => s + n.value, 0)
        : bal

      return {
        id: acct.id,
        name: acct.name,
        value,
        percentage: 0,
        color: getAssetAllocationColor(acct.name),
        children: childNodes.sort((a, b) => b.value - a.value),
      }
    }

    const assetsAcct = acctMap.get('1000')
    if (!assetsAcct) {
      return { id: '1000', name: 'Assets', value: 0, percentage: 0, children: [] }
    }

    const invAccount = accounts.find(a => a.code === '1200')
    const fullTree = invAccount
      ? buildTree(assetsAcct.id, [invAccount.id])
      : buildTree(assetsAcct.id, null)

    if (!fullTree) {
      return { id: assetsAcct.id, name: assetsAcct.name, value: 0, percentage: 0, children: [] }
    }

    fullTree.children = fullTree.children.filter(c => {
      const ac = acctMap.get(c.id)
      return ac?.code?.startsWith('12')
    })

    function assignPct(node: TreeNode) {
      node.percentage = totalPortfolioValue > 0 ? (node.value / totalPortfolioValue) * 100 : 0
      for (const child of node.children) {
        assignPct(child)
      }
    }
    assignPct(fullTree)

    return fullTree
  }, [accounts, vouchers, data.portfolioValue])

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set(['1000', '1200']))

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const latestTransactions = useMemo(() => {
    const posted = vouchers
      .filter(v => v.status === 'Posted')
      .slice(-5)
      .reverse()
    return posted.map(v => ({
      date: v.date.substring(0, 10), number: v.number, desc: v.description,
      amount: v.lines.reduce((s, l) => s + (l.type === 'Debit' ? l.baseAmount : 0), 0),
    }))
  }, [vouchers])

  const recentPurchases = useMemo(() => {
    const purchaseVouchers = vouchers
      .filter(v => v.status === 'Posted' && v.type === 'Payment')
      .filter(v => v.lines.some(l => {
        const a = accounts.find(ac => ac.id === l.accountId)
        return l.type === 'Debit' && a && a.code.startsWith('12')
      }))
      .slice(-5)
      .reverse()

    return purchaseVouchers.map(v => {
      const assetLine = v.lines.find(l => {
        const a = accounts.find(ac => ac.id === l.accountId)
        return l.type === 'Debit' && a && a.code.startsWith('12')
      })
      const assetName = assetLine ? (accounts.find(a => a.id === assetLine.accountId)?.name || 'Unknown Asset') : 'Unknown Asset'
      const amount = assetLine ? assetLine.baseAmount : 0
      
      let buyer = '-'
      const match = v.description.match(/\(paid to (.*?)\)$/)
      if (match) buyer = match[1]
      else if (v.reference) buyer = v.reference

      return {
        date: v.date.substring(0, 10),
        number: v.number,
        asset: assetName,
        buyer,
        amount,
        status: v.status,
      }
    })
  }, [vouchers, accounts])

  const thisMonthNet = data.netCashFlow
  const thisMonthChange = useMemo(() => {
    const history = data.cashFlowHistory || []
    if (history.length >= 2) {
      const current = history[history.length - 1].net
      const previous = history[history.length - 2].net
      if (previous !== 0) {
        const pct = ((current - previous) / Math.abs(previous)) * 100
        const sign = pct > 0 ? '+' : ''
        return {
          value: `${sign}${pct.toFixed(1)}% vs last month`,
          direction: pct > 0 ? 'up' as const : (pct < 0 ? 'down' as const : 'neutral' as const)
        }
      }
    }
    if (thisMonthNet !== 0) {
      const formatted = formatPremiumCompact(thisMonthNet)
      const pctSign = thisMonthNet > 0 ? '+' : ''
      return {
        value: `${pctSign}${formatted.valueStr}${formatted.suffix} net`,
        direction: thisMonthNet > 0 ? 'up' as const : 'down' as const
      }
    }
    return { value: 'No change', direction: 'neutral' as const }
  }, [data.cashFlowHistory, thisMonthNet])

  const hasData = data.portfolioValue > 0 || data.currentBankBalance > 0 || data.totalIncome > 0 || data.totalExpenses > 0 || data.growthHistory.length > 0
  if (!hasData) {
    return (
      <>
        <div className="page-header">
          <div>
            <div className="page-title">Investment Dashboard</div>
            <div className="page-subtitle">Portfolio overview from the Accounting Engine</div>
          </div>
        </div>
        <div className="page-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              </div>
              <div className="empty-state-title">No Data Yet</div>
              <div className="empty-state-text">Post investment purchase vouchers from the accounting engine to see your portfolio dashboard.</div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />
      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Investment Dashboard</div>
            <div className="page-subtitle">Real-time portfolio overview from the Accounting Engine</div>
          </div>
        </div>
        <div className="page-header-right">
          <button className="btn btn-ghost btn-sm" onClick={() => setToast({ visible: true, message: 'No new notifications', type: 'success' })} aria-label="Notifications">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            Notifications
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setToast({ visible: true, message: 'InsAcc v1.0 — Intelligent Asset & Investment Accounting', type: 'success' })} aria-label="About">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            About
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="premium-kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <InvestmentKpiCard label="Portfolio Value" value={data.portfolioValue} currency={sym} accentColor="var(--gold)" />
          <InvestmentKpiCard label="Current Bank Balance" value={data.currentBankBalance} currency={sym} accentColor="var(--green)" />
          <InvestmentKpiCard label="Total Income" value={data.totalIncome} currency={sym} accentColor="var(--blue)" />
          <InvestmentKpiCard label="Total Expenses" value={data.totalExpenses} currency={sym} accentColor="var(--red)" />
          <InvestmentKpiCard label="Net Cash Flow" value={data.netCashFlow} currency={sym} change={thisMonthChange} accentColor={data.netCashFlow >= 0 ? 'var(--green)' : '#EF4444'} isNetCash={true} />
        </div>

        <div className="chart-grid mb-6">
          <React.Suspense fallback={<div style={{ height: 300 }} />}>
            <LazyChart><InvestmentGrowthChart dataByPeriod={data.investmentGrowthByPeriod} /></LazyChart>
          </React.Suspense>
          <React.Suspense fallback={<div style={{ height: 300 }} />}>
            <LazyChart><AssetAllocationPie data={assetAllocationData} /></LazyChart>
          </React.Suspense>
        </div>

        <div className="chart-grid mb-6">
          <React.Suspense fallback={<div style={{ height: 300 }} />}>
            <LazyChart><CashFlowChart dataByPeriod={data.cashFlowByPeriod} /></LazyChart>
          </React.Suspense>
          <React.Suspense fallback={<div style={{ height: 300 }} />}>
            <LazyChart><IncomeExpenseChart dataByPeriod={data.cashFlowByPeriod} /></LazyChart>
          </React.Suspense>
        </div>

        <div className="chart-grid mb-6">
          <div className="card card-table mb-0">
            <div className="card-header">
              <span className="card-title">Recent Transactions</span>
            </div>
            <div className="card-body">
              <div className="table-container">
                {latestTransactions.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: 'var(--text-muted)', fontSize: 13 }}>
                    No transactions
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Date</th>
                        <th style={{ textAlign: 'left' }}>Voucher</th>
                        <th className="numeric" style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestTransactions.map((t, i) => (
                        <tr key={i}>
                          <td className="text-secondary">{t.date}</td>
                          <td style={{ fontWeight: 600 }}>{t.number}</td>
                          <td className="numeric" style={{ fontWeight: 600, textAlign: 'right' }}>{fmt(t.amount, sym)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
          <div className="card card-table mb-0">
            <div className="card-header">
              <span className="card-title">Recent Purchases</span>
            </div>
            <div className="card-body">
              <div className="table-container">
                {recentPurchases.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: 'var(--text-muted)', fontSize: 13 }}>
                    No recent purchases
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Date</th>
                        <th style={{ textAlign: 'left' }}>Asset</th>
                        <th className="numeric" style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPurchases.map((p, i) => (
                        <tr key={i}>
                          <td className="text-secondary">{p.date}</td>
                          <td style={{ fontWeight: 600 }}>{p.asset}</td>
                          <td className="numeric" style={{ fontWeight: 600, textAlign: 'right' }}>{fmt(p.amount, sym)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card card-table mb-6">
          <div className="card-header">
            <span className="card-title">Top Holdings</span>
          </div>
          <div className="card-body">
            {(topHoldingsTree.children[0]?.children?.length ?? 0) === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: 'var(--text-muted)', fontSize: 13 }}>
                No holdings
              </div>
            ) : (
              <TreeView
                nodes={[topHoldingsTree]}
                expanded={expandedCategories}
                onToggle={toggleCategory}
                currency={currency}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default memo(InvestmentDashboardInner)
