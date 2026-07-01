import React, { useState, useMemo, useEffect, useRef } from 'react'
import type { Investment } from './Investments'
import type { Transaction } from './Transactions'
import type { BankAccount, BankTransaction } from '../data/banking'
import type { AuditEvent } from '../data/auditTypes'
import { recordModuleEvent } from '../services/auditService'
import { deriveBalance } from '../services/bankingService'
import {
  calculateNetWorth, calculateTotalAssets, calculateTotalCash,
  calculateIncome, calculateExpenses, calculateNetCashFlow,
  calculateMonthlyCashFlow, calculateAssetAllocation,
  calculateTopExpenseCategories, calculateTopIncomeCategories,
  calculateRecentActivity,
} from '../services/reportService'
import {
  formatCurrency, formatPercentage, formatTrend, formatDateRange,
} from '../utils/reportFormatters'
import { exportReport } from '../services/reportExportService'
import { KpiCard, ChartCard, Button, EmptyState, ChevronDownIcon, PortfolioIcon, ActivityIcon, TrendingUpIcon } from './design/DesignSystem'
import InvestmentGrowthChart from './charts/InvestmentGrowthChart'
import AssetAllocationPie from './charts/AssetAllocationPie'
import CashFlowChart from './charts/CashFlowChart'
import CashDistributionChart from './charts/CashDistributionChart'
import CategoryBreakdownChart from './charts/CategoryBreakdownChart'
import ActivityTimeline, { type ActivityEntry } from './ActivityTimeline'
import PeriodSelector, { type PeriodOption, getPeriodDates } from './PeriodSelector'
import { t } from '../utils'

import { ASSET_TYPE_COLORS as TYPE_COLORS } from '../styles/palette'

interface Props {
  investments: Investment[]
  transactions: Transaction[]
  bankAccounts: BankAccount[]
  bankTransactions: BankTransaction[]
  currency?: string
  dateFormat?: string
  language?: string
  onNavigate?: (page: string) => void
  onAuditEvent?: (event: AuditEvent) => void
}

export default function Reports({ investments, transactions, bankAccounts, bankTransactions, currency = 'AED', language = 'English', onNavigate, onAuditEvent }: Props) {
  const [period, setPeriod] = useState<PeriodOption>('this-month')
  const [customStart, setCustomStart] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().split('T')[0])
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!exportOpen) return
    const handleClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [exportOpen])

  const periodDates = useMemo(() => getPeriodDates(period, customStart, customEnd), [period, customStart, customEnd])

  const filteredTxns = useMemo(() => transactions.filter(t => t.date >= periodDates.start && t.date <= periodDates.end), [transactions, periodDates])

  const prevPeriodDates = useMemo(() => {
    const start = periodDates.start
    const end = periodDates.end
    const startMs = new Date(start).getTime()
    const endMs = new Date(end).getTime()
    const duration = endMs - startMs
    const prevEndMs = startMs - 86400000
    const prevStartMs = prevEndMs - duration
    return {
      start: new Date(prevStartMs).toISOString().split('T')[0],
      end: new Date(prevEndMs).toISOString().split('T')[0],
    }
  }, [periodDates])

  const prevFilteredTxns = useMemo(() => transactions.filter(t => t.date >= prevPeriodDates.start && t.date <= prevPeriodDates.end), [transactions, prevPeriodDates])

  const netWorth = useMemo(() => calculateNetWorth(investments, bankAccounts, bankTransactions), [investments, bankAccounts, bankTransactions])
  const totalCash = useMemo(() => calculateTotalCash(bankAccounts, bankTransactions), [bankAccounts, bankTransactions])
  const totalInvestments = useMemo(() => calculateTotalAssets(investments), [investments])

  const income = useMemo(() => calculateIncome(filteredTxns), [filteredTxns])
  const expenses = useMemo(() => calculateExpenses(filteredTxns), [filteredTxns])
  const savings = useMemo(() => calculateNetCashFlow(filteredTxns), [filteredTxns])

  const prevIncome = useMemo(() => calculateIncome(prevFilteredTxns), [prevFilteredTxns])
  const prevExpenses = useMemo(() => calculateExpenses(prevFilteredTxns), [prevFilteredTxns])
  const prevSavings = useMemo(() => calculateNetCashFlow(prevFilteredTxns), [prevFilteredTxns])

  const monthlyCashFlow = useMemo(() => calculateMonthlyCashFlow(transactions, 12), [transactions])
  const assetAllocation = useMemo(() => calculateAssetAllocation(investments), [investments])
  const topExpenses = useMemo(() => calculateTopExpenseCategories(filteredTxns, 5), [filteredTxns])
  const topIncomes = useMemo(() => calculateTopIncomeCategories(filteredTxns, 5), [filteredTxns])

  const cashDistribution = useMemo(() => {
    return bankAccounts
      .filter(a => a.status === 'active')
      .map(a => ({ name: `${a.institution} - ${a.accountName}`, value: deriveBalance(a, bankTransactions) }))
      .sort((a, b) => b.value - a.value)
  }, [bankAccounts, bankTransactions])

  const investmentGrowthData = useMemo(() => {
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
    return { Daily: aggregate(10), Monthly: aggregate(7), Yearly: aggregate(4) }
  }, [investments])

  const assetAllocationChartData = useMemo(() => assetAllocation.map(a => ({
    name: a.type,
    value: a.totalValue,
    percentage: a.percentage,
    color: TYPE_COLORS[a.type] || '#6B5B95',
  })), [assetAllocation])

  const cashFlowData = useMemo(() => ({ Monthly: monthlyCashFlow }), [monthlyCashFlow])

  const timelineActivities = useMemo(() => {
    const items = calculateRecentActivity(investments, transactions, bankTransactions, 15)
    return items.map(item => {
      let type: ActivityEntry['type']
      if (item.source === 'investment') type = 'investment'
      else if (item.source === 'transaction') type = item.amount >= 0 ? 'income' : 'expense'
      else type = item.amount >= 0 ? 'deposit' : 'withdrawal'
      return {
        id: item.id,
        type,
        title: item.description,
        amount: formatCurrency(item.amount, currency),
        date: item.date,
        description: item.category,
      }
    })
  }, [investments, transactions, bankTransactions, currency])

  const hasInvestments = investments.length > 0
  const hasTransactions = transactions.length > 0
  const hasBankAccounts = bankAccounts.filter(a => a.status === 'active').length > 0
  const hasAnyData = hasInvestments || hasTransactions || hasBankAccounts

  const kpiCards = useMemo(() => [
    { label: 'Net Worth', value: formatCurrency(netWorth, currency), icon: <PortfolioIcon />, accentColor: 'var(--accent)' },
    { label: 'Cash', value: formatCurrency(totalCash, currency), icon: <ActivityIcon />, accentColor: 'var(--success)' },
    { label: 'Investments', value: formatCurrency(totalInvestments, currency), icon: <TrendingUpIcon />, accentColor: 'var(--primary-text)' },
    { label: 'Income', value: formatCurrency(income, currency), change: formatTrend(income, prevIncome), icon: <TrendingUpIcon />, accentColor: 'var(--success)' },
    { label: 'Expenses', value: formatCurrency(expenses, currency), change: formatTrend(expenses, prevExpenses), icon: <ActivityIcon />, accentColor: 'var(--danger)' },
    { label: 'Savings', value: formatCurrency(savings, currency), change: formatTrend(savings, prevSavings), icon: <PortfolioIcon />, accentColor: 'var(--accent)' },
  ], [netWorth, totalCash, totalInvestments, income, expenses, savings, prevIncome, prevExpenses, prevSavings, currency])

  const emptyActionInvest = <Button variant="primary" size="sm" onClick={() => onNavigate?.('investments')}>Add Investment</Button>
  const emptyActionBank = <Button variant="primary" size="sm" onClick={() => onNavigate?.('bank-accounts')}>Add Bank Account</Button>

  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    setExportOpen(false)
    try {
      const result = await exportReport(format, {
        currency,
        periodLabel: formatDateRange(periodDates.start, periodDates.end),
        kpis: kpiCards,
        income,
        expenses,
        netCashFlow: savings,
        prevIncome,
        prevExpenses,
        prevSavings,
        netWorth,
        totalCash,
        totalInvestments,
        monthlyCashFlow,
        assetAllocation,
        cashDistribution,
        topExpenses,
        topIncomes,
        activityEntries: timelineActivities.map(a => ({
          date: a.date,
          description: a.title,
          amount: a.amount,
        })),
      })
      if (!result) {
        console.warn('Export cancelled or Electron API unavailable')
      } else {
        onAuditEvent?.(recordModuleEvent('Reports', 'Export', `Report (${format})`, '', `Exported report as ${format.toUpperCase()} for ${formatDateRange(periodDates.start, periodDates.end)}`))
      }
    } catch (e) {
      const msg = (e as Error).message
      console.error('Export failed:', msg)
      alert(`Export failed: ${msg}`)
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">{t('reports', language)}</div>
            <div className="page-subtitle">Financial summary and analysis</div>
          </div>
        </div>
        <div className="page-header-right">
          <PeriodSelector
            period={period}
            onPeriodChange={setPeriod}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />
          <div className="account-detail-actions-wrap" ref={exportRef}>
            <Button variant="secondary" icon={<ChevronDownIcon />} onClick={() => setExportOpen(o => !o)}>
              Export
            </Button>
            {exportOpen && (
              <div className="new-txn-dropdown">
                {(['PDF', 'CSV', 'Excel'] as const).map(format => (
                  <button key={format} className="new-txn-dropdown-item" onClick={() => handleExport(format.toLowerCase() as 'pdf' | 'csv' | 'excel')}>
                    <span>{format}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid">
          {kpiCards.map((k, i) => (
            <KpiCard key={k.label} label={k.label} value={k.value} change={k.change} icon={k.icon} accentColor={k.accentColor} delay={i * 0.05} />
          ))}
        </div>

        {!hasAnyData ? (
          <div className="mt-8">
            <EmptyState
              icon={
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              }
              title="No financial data yet"
              text="Add investments, transactions, or bank accounts to see your financial reports."
              action={emptyActionInvest}
            />
          </div>
        ) : (
          <>
            <div className="mb-6">
              {investmentGrowthData.Monthly.length > 0 ? (
                <InvestmentGrowthChart dataByPeriod={investmentGrowthData} />
              ) : (
                <ChartCard title="Investment Growth">
                  <EmptyState
                    icon={<TrendingUpIcon />}
                    title="No investments yet"
                    text="Add your first investment to track portfolio growth over time."
                    action={emptyActionInvest}
                  />
                </ChartCard>
              )}
            </div>

            <div className="chart-grid">
              {assetAllocationChartData.length > 0 ? (
                <AssetAllocationPie data={assetAllocationChartData} />
              ) : (
                <ChartCard title="Asset Allocation">
                  <EmptyState
                    icon={<PortfolioIcon />}
                    title="No investments yet"
                    text="Add investments to see how your portfolio is allocated across asset types."
                    action={emptyActionInvest}
                  />
                </ChartCard>
              )}
              {monthlyCashFlow.length > 0 ? (
                <CashFlowChart dataByPeriod={cashFlowData} />
              ) : (
                <ChartCard title="Cash Flow">
                  <EmptyState
                    icon={<ActivityIcon />}
                    title="No transactions yet"
                    text="Cash flow analytics will appear automatically after transactions are recorded in the Transactions module."
                  />
                </ChartCard>
              )}
            </div>

            <div className="chart-grid">
              {cashDistribution.length > 0 ? (
                <ChartCard title="Cash Distribution" subtitle="Balance across accounts">
                  <CashDistributionChart data={cashDistribution} />
                </ChartCard>
              ) : (
                <ChartCard title="Cash Distribution">
                  <EmptyState
                    icon={
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <line x1="12" y1="11" x2="12" y2="17" />
                        <polyline points="9 14 12 11 15 14" />
                      </svg>
                    }
                    title="No bank accounts yet"
                    text="Add bank accounts to see how your cash is distributed."
                    action={emptyActionBank}
                  />
                </ChartCard>
              )}
              {topExpenses.length > 0 ? (
                <ChartCard title="Top Expense Categories">
                  <CategoryBreakdownChart data={topExpenses} currency={currency} />
                </ChartCard>
              ) : (
                <ChartCard title="Top Expense Categories">
                  {hasTransactions ? (
                    <EmptyState
                      icon={<ActivityIcon />}
                      title="No expense transactions for the selected period."
                    />
                  ) : (
                    <EmptyState
                      icon={<ActivityIcon />}
                      title="No expense transactions available"
                      text="Expense analytics will appear automatically after expense transactions are recorded in the Transactions module."
                    />
                  )}
                </ChartCard>
              )}
            </div>

            {topIncomes.length > 0 ? (
              <ChartCard title="Top Income Categories" className="mb-6">
                <CategoryBreakdownChart data={topIncomes} currency={currency} />
              </ChartCard>
            ) : (
              <ChartCard title="Top Income Categories" className="mb-6">
                {hasTransactions ? (
                  <EmptyState
                    icon={<TrendingUpIcon />}
                    title="No income transactions for the selected period."
                  />
                ) : (
                  <EmptyState
                    icon={<TrendingUpIcon />}
                    title="No income transactions available"
                    text="Income analytics will appear automatically after income transactions are recorded in the Transactions module."
                  />
                )}
              </ChartCard>
            )}

            <ActivityTimeline activities={timelineActivities} />
          </>
        )}
      </div>
    </>
  )
}
