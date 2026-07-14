import React, { useMemo, useState } from 'react'
import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { LeaseEntry, TenantEntry, PropertyEntry } from '../data/propertyTypes'
import type { PropAccount } from '../data/propertyTypes'
import { getPropertyFinancialSummary } from '../services/propertyFinancialAggregationService'
import { getAccountBalance } from '../accounting/ledgerService'
import { Modal, ChartCard } from './design/DesignSystem'
import AccountDrillDown from './AccountDrillDown'
import { formatDate } from '../utils'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { ChartColors, ChartConfig } from '../styles/ChartTheme'
import { formatCurrency } from '../utils/currencyHelpers'

interface BankAccountLike {
  id: string
  institution: string
  status: string
}

interface Props {
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
  bankAccounts: BankAccountLike[]
  bankMappings: BankMapping[]
  properties: PropertyEntry[]
  leases: LeaseEntry[]
  tenants: TenantEntry[]
}

function CashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function BankIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 2 9 22 9 22 7 12 2" /><rect x="4" y="9" width="16" height="11" /><line x1="9" y1="14" x2="9" y2="18" /><line x1="15" y1="14" x2="15" y2="18" />
    </svg>
  )
}

function RevenueIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function IconWrapper({ children, color }: { children: React.ReactNode; color: string }) {
  return <div className="kpi-card-icon" style={{ background: `${color}18`, color }}>{children}</div>
}

const fmt = (n: number, sym: string) => `${sym} ${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function PropertyAccountsDashboard({ currency = 'AED', accounts, vouchers, bankAccounts, bankMappings, properties, leases = [], tenants = [] }: Props) {
  const [drillAccountId, setDrillAccountId] = useState<string | null>(null)
  const [drillAccountName, setDrillAccountName] = useState<string>('')
  const [drillLeases, setDrillLeases] = useState(false)

  const getLeaseMonths = (s: string, e: string): number => {
    const start = new Date(s + 'T00:00:00')
    const end = new Date(e + 'T00:00:00')
    if (end <= start) return 0
    const rawMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    return end.getDate() >= start.getDate() ? rawMonths + 1 : rawMonths
  }

  const activeLeases = useMemo(() => leases.filter(l => l.status === 'Active'), [leases])

  const metrics = useMemo(() => {
    const summary = getPropertyFinancialSummary(accounts, vouchers, (bankAccounts || []) as PropAccount[], bankMappings)
    const depositsHeld = getAccountBalance('2120', vouchers, accounts)

    return {
      cash: summary.cash,
      bankBalance: summary.bankBalance,
      totalRevenue: summary.totalRevenue,
      rentalIncome: summary.rentalIncome,
      depositsHeld,
    }
  }, [accounts, vouchers, bankAccounts, bankMappings])

  const monthlyData = useMemo(() => {
    const now = new Date()
    const months: { label: string; key: string }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      months.push({ label, key })
    }

    const accountMap = new Map(accounts.map(a => [a.id, a]))
    const buckets: Record<string, { income: number; expense: number }> = {}
    for (const m of months) {
      buckets[m.key] = { income: 0, expense: 0 }
    }

    const activeVouchers = vouchers.filter(v =>
      (v.status === 'Posted' || v.status === 'Approved') && !v.isDeleted
    )

    for (const voucher of activeVouchers) {
      const voucherMonth = voucher.date.substring(0, 7)
      if (!buckets[voucherMonth]) continue

      for (const line of voucher.lines) {
        const acct = accountMap.get(line.accountId)
        if (!acct) continue

        const baseAmount = line.baseAmount
        const isCredit = line.type === 'Credit'
        const isDebit = line.type === 'Debit'

        if (acct.code.startsWith('4')) {
          if (isCredit) buckets[voucherMonth].income += baseAmount
          else if (isDebit) buckets[voucherMonth].income -= baseAmount
        } else if (acct.code.startsWith('5')) {
          if (isDebit) buckets[voucherMonth].expense += baseAmount
          else if (isCredit) buckets[voucherMonth].expense -= baseAmount
        }
      }
    }

    return months.map(m => ({
      month: m.label,
      income: Math.round(buckets[m.key].income * 100) / 100,
      expense: Math.round(buckets[m.key].expense * 100) / 100,
      net: Math.round((buckets[m.key].income - buckets[m.key].expense) * 100) / 100,
    }))
  }, [accounts, vouchers])

  const hasChartData = useMemo(() =>
    monthlyData.some(d => d.income !== 0 || d.expense !== 0 || d.net !== 0),
  [monthlyData])

  const getDrillAccountId = (label: string): { id: string; name: string } | null => {
    switch (label) {
      case 'Cash': return { id: accounts.find(a => a.code === '1110')?.id || '', name: 'Cash' }
      case 'Bank Balance': {
        const bankParent = accounts.find(a => a.code === '1120')
        if (bankParent) {
          const childIds = accounts.filter(a => a.parentId === bankParent.id && a.isActive)
          return childIds.length === 1 ? { id: childIds[0].id, name: childIds[0].name } :
            { id: bankParent.id, name: 'Bank Accounts' }
        }
        return null
      }
      case 'Total Revenue': return { id: accounts.find(a => a.code === '4')?.id || '', name: 'Revenue' }
      case 'Rental Income': return { id: accounts.find(a => a.code === '4120')?.id || accounts.find(a => a.code === '4200')?.id || accounts.find(a => a.code === '4210')?.id || '', name: 'Rental Income' }
      case 'Deposits Held': return { id: accounts.find(a => a.code === '2120')?.id || '', name: 'Security Deposits Held' }
      default: return null
    }
  }

  const handleDrill = (label: string) => {
    if (label === 'Rental Income') {
      if (activeLeases.length > 0) {
        setDrillLeases(true)
      }
      return
    }
    const info = getDrillAccountId(label)
    if (info && info.id) {
      setDrillAccountId(info.id)
      setDrillAccountName(info.name)
    }
  }

  const kpiCards = useMemo(() => [
    { label: 'Cash', value: metrics.cash, icon: <CashIcon />, color: 'var(--success)' },
    { label: 'Bank Balance', value: metrics.bankBalance, icon: <BankIcon />, color: 'var(--primary)' },
    { label: 'Rental Income', value: metrics.rentalIncome, icon: <RevenueIcon />, color: 'var(--success)' },
    { label: 'Deposits Held', value: metrics.depositsHeld, icon: <ShieldIcon />, color: '#6B5B95' },
    { label: 'Total Revenue', value: metrics.totalRevenue, icon: <RevenueIcon />, color: '#22C55E' },
  ], [metrics])

  const CustomTooltip = ({ active, payload, label: tooltipLabel }: any) => {
    if (!active || !payload || payload.length === 0) return null
    return (
      <div className="recharts-custom-tooltip" style={ChartConfig.tooltip.contentStyle}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: ChartConfig.labels }}>{tooltipLabel}</div>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} style={{ color: entry.color, fontSize: 13, fontWeight: 500 }}>
            {entry.name}: {formatCurrency(entry.value, currency)}
          </div>
        ))}
      </div>
    )
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

      <Modal open={drillLeases} title="Rental Income — Active Leases" onClose={() => setDrillLeases(false)}>
        <div style={{ minWidth: 650, padding: '8px 0' }}>
          {activeLeases.length === 0 ? (
            <div className="text-center text-secondary text-sm" style={{ padding: '20px 0' }}>
              No active leases.
            </div>
          ) : (
            <table className="property-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th className="text-xs">Lease No.</th>
                  <th className="text-xs">Tenant</th>
                  <th className="text-xs">Property</th>
                  <th className="text-xs">Start Date</th>
                  <th className="text-xs">End Date</th>
                  <th className="text-xs">Monthly Rent</th>
                  <th className="text-xs">Annual Rent</th>
                  <th className="text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeLeases.map(l => {
                  const tenant = tenants.find(t => t.id === l.tenantId)
                  const prop = properties.find(p => p.id === l.propertyId)
                  return (
                    <tr key={l.id}>
                      <td className="text-xs text-mono fw-500">{l.leaseNumber}</td>
                      <td className="text-xs">{tenant?.name || 'Unknown'}</td>
                      <td className="text-xs">{prop?.name || 'Unknown'}</td>
                      <td className="text-xs">{formatDate(l.startDate, 'DD/MM/YYYY')}</td>
                      <td className="text-xs">{formatDate(l.endDate, 'DD/MM/YYYY')}</td>
                      <td className="text-xs text-mono">{fmt(l.monthlyRent, currency)}</td>
                      <td className="text-xs text-mono">{fmt(l.annualRent || l.monthlyRent * getLeaseMonths(l.startDate, l.endDate), currency)}</td>
                      <td className="text-xs">{l.status}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Modal>

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Financial Overview</div>
            <div className="page-subtitle">{accounts.filter(a => a.isActive).length} active accounts</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid">
          {kpiCards.map((k, i) => (
            <div
              key={k.label}
              className="kpi-card hover-lift"
              style={{ borderTop: `2px solid ${k.color}`, cursor: 'pointer' }}
              onClick={() => handleDrill(k.label)}
            >
              <IconWrapper color={k.color}>{k.icon}</IconWrapper>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ fontSize: 22 }}>
                {fmt(k.value, currency)}
              </div>
            </div>
          ))}
        </div>

        <div className="financial-charts-row">
          <div className="financial-chart-main">
            <ChartCard
              title="Cash Flow Trend"
              subtitle="Last 12 months — income, expenses, and net cash flow"
              isEmpty={!hasChartData}
              emptyMessage="No cash flow data available."
            >
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="flowIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={ChartColors.green} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={ChartColors.green} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="flowExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={ChartColors.red} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={ChartColors.red} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="flowNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={ChartColors.blue} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={ChartColors.blue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={ChartConfig.grid} vertical={false} />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: ChartConfig.axis }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: ChartConfig.axis }}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={ChartConfig.tooltip.cursor} />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', color: ChartConfig.labels, paddingTop: 8 }}
                      iconType="circle"
                      iconSize={8}
                      verticalAlign="bottom"
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      name="Income"
                      stroke={ChartColors.green}
                      strokeWidth={2}
                      fill="url(#flowIncome)"
                      activeDot={{ r: 5, fill: ChartColors.green, stroke: '#FFFFFF', strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      name="Expenses"
                      stroke={ChartColors.red}
                      strokeWidth={2}
                      fill="url(#flowExpense)"
                      activeDot={{ r: 5, fill: ChartColors.red, stroke: '#FFFFFF', strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="net"
                      name="Net Cash Flow"
                      stroke={ChartColors.blue}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      fill="url(#flowNet)"
                      activeDot={{ r: 5, fill: ChartColors.blue, stroke: '#FFFFFF', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="financial-chart-side">
            <ChartCard
              title="Income vs Expenses"
              subtitle="Last 12 months"
              isEmpty={!hasChartData}
              emptyMessage="No income/expense data available."
            >
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ChartConfig.grid} vertical={false} />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: ChartConfig.axis }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: ChartConfig.axis }}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={ChartConfig.tooltip.cursor} />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', color: ChartConfig.labels, paddingTop: 8 }}
                      iconType="circle"
                      iconSize={8}
                      verticalAlign="bottom"
                    />
                    <Bar
                      dataKey="income"
                      name="Income"
                      fill={ChartColors.green}
                      radius={[3, 3, 0, 0]}
                      barSize={14}
                    />
                    <Bar
                      dataKey="expense"
                      name="Expenses"
                      fill={ChartColors.red}
                      radius={[3, 3, 0, 0]}
                      barSize={14}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        </div>
      </div>
    </>
  )
}
