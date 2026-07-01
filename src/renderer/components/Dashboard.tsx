import React, { useState, useMemo } from 'react'
import type { AssetAllocation, AssetPerformance, InvestmentHistory, MonthlyCashFlow } from '../data/sampleData'
import type { PurchaseCategory, Purchase } from '../data/purchaseData'
import type { Investment } from './Investments'
import type { Transaction } from './Transactions'
import type { StatementEntry } from './BankAccounts'
import { computeAverages } from '../services/purchaseService'
import ActivityTimeline, { type ActivityEntry } from './ActivityTimeline'

import { ASSET_TYPE_COLORS as TYPE_COLORS } from '../styles/palette'
import AssetAllocationPie from './charts/AssetAllocationPie'
import InvestmentGrowthChart from './charts/InvestmentGrowthChart'
import CashFlowChart from './charts/CashFlowChart'
import AssetPerformanceChart from './charts/AssetPerformanceChart'
import {
  KpiCard, ChartCard, IconButton,
  PortfolioIcon, ActivityIcon, CalendarIcon, TrendingUpIcon,
} from './design/DesignSystem'
import Toast from './Toast'
import { t } from '../utils'

interface Props {
  currency?: string
  dateFormat?: string
  language?: string
  purchaseCategories?: PurchaseCategory[]
  purchases?: Purchase[]
  investments?: Investment[]
  transactions?: Transaction[]
  statement?: StatementEntry[]
}

function ChartCardWrapper({ title, isEmpty, emptyMessage, children }: { title: string; isEmpty: boolean; emptyMessage: string; children: React.ReactNode }) {
  if (!isEmpty) return <>{children}</>
  return (
    <div className="chart-card chart-card-empty">
      <div className="chart-header">
        <div className="chart-title">{title}</div>
      </div>
      <div className="chart-empty-state">
        <div className="chart-empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
            <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
          </svg>
        </div>
        <div className="chart-empty-text">{emptyMessage}</div>
      </div>
    </div>
  )
}

export default function Dashboard({ currency, dateFormat, language = 'English', purchaseCategories = [], purchases = [], investments = [], transactions = [], statement = [] }: Props) {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const averages = useMemo(() => computeAverages(purchaseCategories, purchases), [purchaseCategories, purchases])

  const totalPurchaseCount = purchases.length

  const today = new Date()
  const totalPortfolioValue = investments.reduce((s, inv) => s + inv.purchaseValue, 0)
  const activeInvestments = investments.length

  const thisMonthIncomes = transactions.filter(tx => {
    const d = new Date(tx.date)
    return tx.type === 'Income' && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  })
  const thisMonthExpenses = transactions.filter(tx => {
    const d = new Date(tx.date)
    return tx.type === 'Expense' && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  })
  const thisMonthIncome = thisMonthIncomes.reduce((s, tx) => s + tx.amount, 0)
  const thisMonthExpense = thisMonthExpenses.reduce((s, tx) => s + tx.amount, 0)
  const thisMonthNet = thisMonthIncome - thisMonthExpense
  let dateStr: string
  if (dateFormat === 'MM/DD/YYYY') {
    dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  } else if (dateFormat === 'YYYY-MM-DD') {
    dateStr = today.toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  } else {
    dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  const sym = currency || 'AED'

  const thisMonthChange = thisMonthNet > 0
    ? { value: `+${sym} ${thisMonthNet.toLocaleString()}`, direction: 'up' as const }
    : thisMonthNet < 0
      ? { value: `-${sym} ${Math.abs(thisMonthNet).toLocaleString()}`, direction: 'down' as const }
      : transactions.length === 0
        ? { value: 'No change', direction: 'neutral' as const }
        : { value: 'Net zero', direction: 'neutral' as const }

  const hasPurchaseData = totalPurchaseCount > 0

  const assetAllocationData: AssetAllocation[] = useMemo(() => {
    if (investments.length === 0) return []
    const byType: Record<string, number> = {}
    investments.forEach(inv => {
      byType[inv.type] = (byType[inv.type] || 0) + inv.purchaseValue
    })
    const total = Object.values(byType).reduce((s, v) => s + v, 0)
    return Object.entries(byType).map(([name, value]) => ({
      name,
      value,
      percentage: total ? +((value / total) * 100).toFixed(1) : 0,
      color: TYPE_COLORS[name] || '#6B5B95',
    }))
  }, [investments])

  const assetPerformanceData: AssetPerformance[] = useMemo(() => {
    if (investments.length === 0) return []
    const byType: Record<string, { totalValue: number; count: number }> = {}
    investments.forEach(inv => {
      if (!byType[inv.type]) byType[inv.type] = { totalValue: 0, count: 0 }
      byType[inv.type].totalValue += inv.purchaseValue
      byType[inv.type].count++
    })
    const entries = Object.entries(byType).map(([name, data]) => ({
      name,
      roi: 0,
      isBest: false,
      isWorst: false,
      value: data.totalValue,
    })).sort((a, b) => b.value - a.value)
    if (entries.length > 0) {
      entries[0].isBest = true
      entries[entries.length - 1].isWorst = true
    }
    return entries
  }, [investments])

  const investmentGrowthByPeriod: Record<string, InvestmentHistory[]> = useMemo(() => {
    if (investments.length === 0) return { Daily: [], Monthly: [], Yearly: [] }
    const sorted = [...investments].sort((a, b) => a.date.localeCompare(b.date))
    const aggregate = (keyLen: number) => {
      const groups: Record<string, number> = {}
      sorted.forEach(inv => {
        const k = inv.date.substring(0, keyLen)
        groups[k] = (groups[k] || 0) + inv.purchaseValue
      })
      let cumulative = 0
      return Object.entries(groups).map(([date, value]) => {
        cumulative += value
        return { date, value: cumulative }
      })
    }
    return {
      Daily: aggregate(10),
      Monthly: aggregate(7),
      Yearly: aggregate(4),
    }
  }, [investments])

  const cashFlowByPeriod: Record<string, MonthlyCashFlow[]> = useMemo(() => {
    if (transactions.length === 0) return { Daily: [], Monthly: [], Yearly: [] }
    const aggregate = (keyLen: number) => {
      const groups: Record<string, { income: number; expense: number }> = {}
      transactions.forEach(tx => {
        const k = tx.date.substring(0, keyLen)
        if (!groups[k]) groups[k] = { income: 0, expense: 0 }
        if (tx.type === 'Income') groups[k].income += tx.amount
        else if (tx.type === 'Expense') groups[k].expense += tx.amount
      })
      return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([month, vals]) => ({
        month,
        income: vals.income,
        expense: vals.expense,
      }))
    }
    return {
      Daily: aggregate(10),
      Monthly: aggregate(7),
      Yearly: aggregate(4),
    }
  }, [transactions])

  const recentActivities: ActivityEntry[] = useMemo(() => {
    const entries: ActivityEntry[] = []

    investments.forEach(inv => {
      entries.push({
        id: `inv-${inv.id}`,
        type: 'investment',
        title: `Invested in ${inv.assetName}`,
        amount: `${sym} ${inv.purchaseValue.toLocaleString()}`,
        date: inv.date,
        description: `${inv.type} — ${inv.broker}`,
      })
    })

    transactions.forEach(tx => {
      if (tx.type === 'Income') {
        entries.push({
          id: `inc-${tx.id}`,
          type: 'income',
          title: tx.category,
          amount: `+${sym} ${tx.amount.toLocaleString()}`,
          date: tx.date,
          description: 'Income',
        })
      } else if (tx.type === 'Expense') {
        entries.push({
          id: `exp-${tx.id}`,
          type: 'expense',
          title: tx.category,
          amount: `-${sym} ${tx.amount.toLocaleString()}`,
          date: tx.date,
          description: 'Expense',
        })
      }
    })

    statement.forEach((st, i) => {
      if (st.type === 'credit') {
        entries.push({
          id: `dep-${i}`,
          type: 'deposit',
          title: st.desc || 'Bank Deposit',
          amount: st.amount,
          date: st.date,
          description: 'Bank deposit',
        })
      } else {
        entries.push({
          id: `wth-${i}`,
          type: 'withdrawal',
          title: st.desc || 'Bank Withdrawal',
          amount: st.amount,
          date: st.date,
          description: 'Bank withdrawal',
        })
      }
    })

    return entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6)
  }, [investments, transactions, statement, sym])

  const showNotification = () => {
    setToast({ visible: true, message: 'No new notifications', type: 'success' })
  }

  const showAbout = () => {
    setToast({ visible: true, message: 'InsAcc v1.0 — Intelligent Asset & Investment Accounting', type: 'success' })
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
            <div className="page-title">{t('dashboard', language)}</div>
            <div className="page-subtitle">{dateStr}</div>
          </div>
        </div>
        <div className="page-header-right">
          <IconButton
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            }
            label="Notifications"
            onClick={showNotification}
          />
          <IconButton
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            }
            label="About"
            onClick={showAbout}
          />
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid">
          <KpiCard
            label="Total Portfolio Value"
            value={`${sym} ${totalPortfolioValue.toLocaleString()}`}
            icon={<PortfolioIcon />}
            accentColor="var(--primary)"
            delay={0}
          />
          <KpiCard
            label="Active Investments"
            value={String(activeInvestments)}
            icon={<ActivityIcon />}
            accentColor="var(--info)"
            delay={0.05}
          />
          <KpiCard
            label="This Month"
            value={`${sym} ${thisMonthNet.toLocaleString()}`}
            icon={<CalendarIcon />}
            change={thisMonthChange}
            accentColor="var(--success)"
            delay={0.1}
          />
          <KpiCard
            label="YTD Return"
            value="0%"
            icon={<TrendingUpIcon />}
            change={{ value: 'No data', direction: 'neutral' }}
            accentColor="var(--warning)"
            delay={0.15}
          />
        </div>

        <div className="chart-grid">
          <ChartCardWrapper
            title="Asset Allocation"
            isEmpty={assetAllocationData.length === 0}
            emptyMessage="Add investments to see your asset allocation"
          >
            <AssetAllocationPie data={assetAllocationData} />
          </ChartCardWrapper>

          <ChartCardWrapper
            title="Performance"
            isEmpty={assetPerformanceData.length === 0}
            emptyMessage="Asset performance data will appear here"
          >
            <AssetPerformanceChart data={assetPerformanceData} />
          </ChartCardWrapper>
        </div>

        <div className="chart-grid mb-0">
          <ChartCardWrapper
            title="Investment Growth"
            isEmpty={investmentGrowthByPeriod['Monthly']?.length === 0}
            emptyMessage="Add investments to see growth over time"
          >
            <InvestmentGrowthChart dataByPeriod={investmentGrowthByPeriod} />
          </ChartCardWrapper>

          <ChartCardWrapper
            title="Cash Flow"
            isEmpty={cashFlowByPeriod['Monthly']?.length === 0}
            emptyMessage="Add income and expense transactions to see cash flow"
          >
            <CashFlowChart dataByPeriod={cashFlowByPeriod} />
          </ChartCardWrapper>
        </div>

        <ActivityTimeline activities={recentActivities} />

        {hasPurchaseData && (
          <ChartCard title="Purchase Averages" className="mb-6">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Item</th>
                    <th className="numeric">Purchases</th>
                    <th className="numeric">Quantity</th>
                    <th className="numeric">Avg Price</th>
                    <th className="numeric">Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {averages.map(avg => (
                    <tr key={avg.itemId}>
                      <td className="text-secondary">{avg.categoryName}</td>
                      <td style={{ fontWeight: 500 }}>{avg.itemName}</td>
                      <td className="numeric">{avg.purchaseCount}</td>
                      <td className="numeric">{avg.totalQuantity}</td>
                      <td className="numeric">{sym} {avg.avgUnitPrice.toLocaleString()}</td>
                      <td className="numeric">{sym} {avg.totalValue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        )}
      </div>
    </>
  )
}
