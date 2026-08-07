import React, { useMemo, useState } from 'react'
import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { LeaseEntry, TenantEntry, PropertyEntry } from '../data/propertyTypes'
import type { PropAccount } from '../data/propertyTypes'
import { getPropertyFinancialSummary } from '../services/propertyFinancialAggregationService'
import { getAccountBalance } from '../accounting/ledgerService'
import { Modal } from './design/DesignSystem'
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
import { CurrencyText } from './design/CurrencyText'
import { UaeDirhamIcon } from './design/UaeDirhamIcon'

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

const PAGE_BG = '#FFFFFF'
const CHART_BG = '#FFFFFF'

const KPI_VALUE_STYLE: React.CSSProperties = {
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 600,
  fontSize: 32,
  letterSpacing: '-0.03em',
  lineHeight: 1.15,
  color: '#1F2937',
}

const KPI_LABEL_STYLE: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontWeight: 500,
  fontSize: 12,
  color: '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

function fmtFull(n: number, sym: string) {
  const isNegative = n < 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {isNegative ? '-' : ''}{sym === 'AED' ? <UaeDirhamIcon /> : sym} {Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}

function fmtCompact(n: number, sym: string): string {
  const isNegative = n < 0;
  return `${isNegative ? '-' : ''}${sym} ${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function FormatCompact({ value, currency }: { value: number; currency: string }) {
  return <>{fmtFull(value, currency)}</>
}

function getVoucherBadge(type: string) {
  switch (type) {
    case 'Receipt':
      return { bg: '#DCFCE7', color: '#166534' }
    case 'Payment':
      return { bg: '#FEE2E2', color: '#991B1B' }
    case 'Purchase':
      return { bg: '#EDE9FE', color: '#5B21B6' }
    default:
      return { bg: '#FEF3C7', color: '#92400E' }
  }
}

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

  const allRecentActivity = useMemo(() => {
    const activeVouchers = vouchers.filter(v => (v.status === 'Posted' || v.status === 'Approved') && !v.isDeleted)
    return activeVouchers.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map(v => {
      let amount = 0
      v.lines.forEach(l => {
        if (l.type === 'Credit') amount += l.baseAmount
      })
      return {
        date: v.date,
        number: v.number,
        type: v.type,
        description: v.description || '',
        amount
      }
    })
  }, [vouchers])

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
    { label: 'Cash', value: metrics.cash, kpiLabel: 'Cash' },
    { label: 'Bank Balance', value: metrics.bankBalance, kpiLabel: 'Bank Balance' },
    { label: 'Rental Income', value: metrics.rentalIncome, kpiLabel: 'Rental Income' },
    { label: 'Deposits Held', value: metrics.depositsHeld, kpiLabel: 'Deposits Held' },
    { label: 'Total Revenue', value: metrics.totalRevenue, kpiLabel: 'Total Revenue' },
  ], [metrics])

  const CustomTooltip = ({ active, payload, label: tooltipLabel }: any) => {
    if (!active || !payload || payload.length === 0) return null
    return (
      <div className="recharts-custom-tooltip" style={ChartConfig.tooltip.contentStyle}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: ChartConfig.labels }}>{tooltipLabel}</div>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} style={{ color: entry.color, fontSize: 13, fontWeight: 500 }}>
            {entry.name}: <CurrencyText value={entry.value} currency={currency} />
          </div>
        ))}
      </div>
    )
  }

  const sectionGap = 28
  const cardBorder = '1px solid #E5E7EB'
  const cardShadow = '0 1px 3px rgba(0,0,0,0.05)'

  return (
    <div style={{ background: PAGE_BG, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
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
                      <td className="text-xs text-mono">{fmtFull(l.monthlyRent, currency)}</td>
                      <td className="text-xs text-mono">{fmtFull(l.annualRent || l.monthlyRent * getLeaseMonths(l.startDate, l.endDate), currency)}</td>
                      <td className="text-xs">{l.status}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Modal>

      <div className="page-header" style={{ background: PAGE_BG, borderBottom: '1px solid #E5E7EB' }}>
        <div className="page-header-left">
          <div className="page-title">Financial Overview</div>
          <div className="page-subtitle">Real-time financial position derived from the accounting book.</div>
        </div>
      </div>

      <div className="page-body" style={{ background: PAGE_BG, padding: '28px 32px' }}>
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 24, marginBottom: sectionGap }}>
          {kpiCards.map(k => (
            <div
              key={k.label}
              style={{
                border: cardBorder, borderRadius: 16, boxShadow: cardShadow,
                background: '#fff', cursor: 'pointer',
                padding: '20px 20px', height: 120,
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                gap: 8, transition: 'box-shadow 0.15s',
              }}
              onClick={() => handleDrill(k.label)}
            >
              <div style={KPI_LABEL_STYLE}>{k.kpiLabel}</div>
              <div style={KPI_VALUE_STYLE}>
                <FormatCompact value={k.value} currency={currency} />
              </div>
            </div>
          ))}
        </div>

        <div className="financial-charts-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: sectionGap }}>
          <div style={{
            background: CHART_BG, borderRadius: 16, border: cardBorder,
            boxShadow: cardShadow, overflow: 'hidden',
          }}>
            <div className="card-header" style={{ padding: '20px 24px 0' }}>
              <div className="card-title" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 16, fontWeight: 600, color: '#1F2937' }}>
                Cash Flow Trend
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#6B7280', marginTop: 4 }}>Last 12 months — income, expenses, and net cash flow</div>
            </div>
            <div style={{ padding: '16px 24px' }}>
              {!hasChartData ? (
                <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#9CA3AF' }}>
                  No cash flow data available.
                </div>
              ) : (
                <div className="chart-container" style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height={340}>
                    <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
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
                        tick={{ fontSize: 10, fill: ChartConfig.axis }}
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
              )}
            </div>
          </div>

          <div style={{
            background: CHART_BG, borderRadius: 16, border: cardBorder,
            boxShadow: cardShadow, overflow: 'hidden',
          }}>
            <div className="card-header" style={{ padding: '20px 24px 0' }}>
              <div className="card-title" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 16, fontWeight: 600, color: '#1F2937' }}>
                Income vs Expenses
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#6B7280', marginTop: 4 }}>Last 12 months</div>
            </div>
            <div style={{ padding: '16px 24px' }}>
              {!hasChartData ? (
                <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#9CA3AF' }}>
                  No income/expense data available.
                </div>
              ) : (
                <div className="chart-container" style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }} barCategoryGap="25%">
                      <CartesianGrid strokeDasharray="3 3" stroke={ChartConfig.grid} vertical={false} />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: ChartConfig.axis }}
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
                      />
                      <Bar
                        dataKey="expense"
                        name="Expenses"
                        fill={ChartColors.red}
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{
          background: CHART_BG, borderRadius: 16, border: cardBorder,
          boxShadow: cardShadow, overflow: 'hidden',
        }}>
          <div className="card-header" style={{ padding: '20px 24px 0' }}>
            <div className="card-title" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 16, fontWeight: 600, color: '#1F2937' }}>
              Recent Accounting Activity
            </div>
          </div>
          <div style={{ padding: '16px 24px 20px' }}>
            {allRecentActivity.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#9CA3AF' }}>
                No recent accounting activity recorded.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Inter', sans-serif" }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {allRecentActivity.map((row, i) => {
                    const badge = getVoucherBadge(row.type)
                    return (
                      <tr key={`${row.type}-${row.number}-${i}`} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '12px 10px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap', height: 52 }}>{row.date}</td>
                        <td style={{ padding: '12px 10px', fontSize: 12, color: '#374151', fontWeight: 500, whiteSpace: 'nowrap' }}>{row.number}</td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
                            background: badge.bg, color: badge.color,
                          }}>
                            {row.type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description}</td>
                        <td style={{ padding: '12px 10px', fontSize: 12, color: '#1F2937', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmtCompact(row.amount, currency)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
