import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { PropertyEntry, UnitEntry, LeaseEntry, PropTransaction, PropAccount } from '../data/propertyTypes'
import type { Account, Voucher } from '../accounting/types'
import { getAllAccountBalances, getAccountTypeBalance } from '../accounting/ledgerService'
import { EmptyState } from './design/DesignSystem'

interface Props {
  currency?: string
  dateFormat?: string
  language?: string
  properties: PropertyEntry[]
  units: UnitEntry[]
  leases: LeaseEntry[]
  transactions: PropTransaction[]
  accounts: PropAccount[]
  chartAccounts?: Account[]
  chartVouchers?: Voucher[]
  onNavigate?: (page: string) => void
}

function fmt(n: number, sym = 'AED') {
  if (Math.abs(n) >= 1_000_000_000)
    return `${sym} ${(n / 1_000_000_000).toFixed(1)}B`
  if (Math.abs(n) >= 1_000_000)
    return `${sym} ${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000)
    return `${sym} ${(n / 1_000).toFixed(1)}K`
  return `${sym} ${Math.round(n).toLocaleString()}`
}

const primaryColor = '#DE8DA9'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
      padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      fontSize: 13,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: '#1F2937' }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: 24 }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{typeof p.value === 'number' ? fmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

function KpiCard({ label, value, icon, color, onClick }: { label: string; value: string; icon: React.ReactNode; color: string; onClick?: () => void }) {
  return (
    <motion.div
      className="kpi-card"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="kpi-label">{label}</div>
        <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}14`, color }}>{icon}</div>
      </div>
      <div className="kpi-value">{value}</div>
    </motion.div>
  )
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: 0, overflow: 'hidden' }}
    >
      <div className="card-header">
        <div>
          <div className="card-title">{title}</div>
          {subtitle && <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>
      <div className="card-body">{children}</div>
    </motion.div>
  )
}

export default function PropertyDashboard({
  currency = 'AED', properties, units, leases, transactions, accounts,
  chartAccounts = [], chartVouchers = [],
  onNavigate = () => {},
}: Props) {
  const sym = currency

  const occupiedUnits = useMemo(() => units.filter(u => u.status === 'Occupied'), [units])
  const vacancyRate = useMemo(() => units.length > 0 ? Math.round(((units.length - occupiedUnits.length) / units.length) * 100) : 0, [units, occupiedUnits])
  const occupancyRate = useMemo(() => 100 - vacancyRate, [vacancyRate])
  const monthlyRent = useMemo(() => occupiedUnits.reduce((s, u) => s + u.rentAmount, 0), [occupiedUnits])

  const accountingMetrics = useMemo(() => {
    const allBals = getAllAccountBalances(chartVouchers, chartAccounts)
    const cashId = chartAccounts.find(a => a.code === '1110')?.id
    const cash = cashId ? (allBals[cashId] || 0) : 0
    const bankParent = chartAccounts.find(a => a.code === '1120')
    const bankBalance = bankParent
      ? chartAccounts.filter(a => a.parentId === bankParent.id && a.isActive).reduce((s, a) => s + (allBals[a.id] || 0), 0)
      : 0
    const pdcId = chartAccounts.find(a => a.code === '1410')?.id
    const pdc = pdcId ? (allBals[pdcId] || 0) : 0
    const totalExpenses = getAccountTypeBalance('expense', chartVouchers, chartAccounts)
    const totalRevenue = getAccountTypeBalance('revenue', chartVouchers, chartAccounts)
    const netIncome = totalRevenue - totalExpenses
    return { cash, bankBalance, pdc, totalExpenses, totalRevenue, netIncome }
  }, [chartAccounts, chartVouchers])

  const incomeVsExpenseData = useMemo(() => {
    const months: Record<string, { income: number; expense: number }> = {}
    const posted = chartVouchers.filter(v => v.status === 'Posted')
    for (const v of posted) {
      const month = v.date.substring(0, 7)
      if (!months[month]) months[month] = { income: 0, expense: 0 }
      for (const l of v.lines) {
        const acct = chartAccounts.find(a => a.id === l.accountId)
        if (!acct) continue
        if (acct.type === 'revenue' && l.type === 'Credit') months[month].income += l.baseAmount
        if (acct.type === 'expense' && l.type === 'Debit') months[month].expense += l.baseAmount
      }
    }
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([month, d]) => ({
      month: month.substring(5),
      Income: d.income,
      Expenses: d.expense,
    }))
  }, [chartVouchers, chartAccounts])

  const topPropertiesData = useMemo(() => {
    return properties.slice(0, 6).map(p => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
      value: p.currentValue || p.purchaseValue,
    })).sort((a, b) => b.value - a.value)
  }, [properties])

  const cashFlowData = useMemo(() => {
    return incomeVsExpenseData.map(d => ({
      month: d.month,
      Income: d.Income,
      Expenses: d.Expenses,
      Net: d.Income - d.Expenses,
    }))
  }, [incomeVsExpenseData])

  const leaseExpiryData = useMemo(() => {
    const now = new Date()
    return leases
      .filter(l => l.status === 'Active')
      .map(l => {
        const end = new Date(l.endDate)
        const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const monthsLeft = Math.max(0, Math.round(daysLeft / 30))
        return {
          name: l.leaseNumber || l.id.substring(0, 8),
          monthsLeft,
          rent: l.monthlyRent,
          endDate: l.endDate,
        }
      })
      .sort((a, b) => a.monthsLeft - b.monthsLeft)
      .slice(0, 8)
  }, [leases])

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Property Dashboard</div>
          <div className="page-subtitle">Portfolio overview &amp; accounting summary</div>
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <KpiCard label="Monthly Rent" value={fmt(monthlyRent, sym)} color={primaryColor} onClick={() => onNavigate('leases')} icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          } />
          <KpiCard label="Cash" value={fmt(accountingMetrics.cash, sym)} color="#5C63A6" onClick={() => onNavigate('accounts-dashboard')} icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 2 9 22 9 22 7 12 2"/><rect x="4" y="9" width="16" height="11"/><line x1="9" y1="14" x2="9" y2="18"/><line x1="15" y1="14" x2="15" y2="18"/></svg>
          } />
          <KpiCard label="Bank Balance" value={fmt(accountingMetrics.bankBalance, sym)} color="#F59E0B" onClick={() => onNavigate('accounts-dashboard')} icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 2 9 22 9 22 7 12 2"/><rect x="4" y="9" width="16" height="11"/><line x1="9" y1="14" x2="9" y2="18"/><line x1="15" y1="14" x2="15" y2="18"/></svg>
          } />
          <KpiCard label="PDC" value={fmt(accountingMetrics.pdc, sym)} color="#8B5CF6" onClick={() => onNavigate('pdc-manager')} icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          } />
          <KpiCard label="Expenses" value={fmt(accountingMetrics.totalExpenses, sym)} color="#EF4444" onClick={() => onNavigate('accounts-dashboard')} icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
          } />
        </div>

        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <KpiCard label="Net Property Income" value={fmt(accountingMetrics.netIncome, sym)} color={accountingMetrics.netIncome >= 0 ? primaryColor : '#EF4444'} onClick={() => onNavigate('profit-loss')} icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          } />
          <KpiCard label="Properties" value={String(properties.length)} color={primaryColor} onClick={() => onNavigate('properties')} icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          } />
          <KpiCard label="Occupancy" value={`${occupancyRate}%`} color="#22C55E" onClick={() => onNavigate('leases')} icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          } />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <ChartCard title="Occupancy Rate" subtitle={`${occupiedUnits.length}/${units.length} units occupied`}>
            {units.length === 0 ? (
              <div style={{ padding: '24px 0' }}>
                <EmptyState
                  title="No Units Registered"
                  text="Configure properties and units on the Properties page to begin tracking portfolio occupancy."
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: 240, justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={[{ name: 'Occupied', value: occupiedUnits.length }, { name: 'Vacant', value: units.length - occupiedUnits.length }]}
                      cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                      <Cell fill={primaryColor} />
                      <Cell fill="#F3F4F6" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1F2937' }}>{occupancyRate}%</div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>Occupancy Rate</div>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Income vs Expenses" subtitle="Monthly comparison">
            {incomeVsExpenseData.length === 0 ? (
              <div style={{ padding: '24px 0' }}>
                <EmptyState
                  title="No Transactions Recorded"
                  text="Record Receipt, Payment, or Journal vouchers in the Accounts sub-menu to display financial charts."
                />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={incomeVsExpenseData.slice(-6)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="Income" fill={primaryColor} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <ChartCard title="Top Properties by Value" subtitle="Highest valued">
            {properties.length === 0 ? (
              <div style={{ padding: '24px 0' }}>
                <EmptyState
                  title="No Properties Registered"
                  text="Register properties on the Properties page to visualize asset valuation breakdowns."
                />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topPropertiesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill={primaryColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Lease Expiry Timeline" subtitle="Months remaining">
            {leaseExpiryData.length === 0 ? (
              <div style={{ padding: '24px 0' }}>
                <EmptyState
                  title="No Active Leases"
                  text="Add active tenant leases on the Leases page to track contract expiries."
                />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={leaseExpiryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={40} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} label={{ value: 'Months', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#9CA3AF' } }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="monthsLeft" name="Months Remaining" radius={[4, 4, 0, 0]}>
                    {leaseExpiryData.map((l) => (
                      <Cell key={l.name} fill={l.monthsLeft <= 3 ? '#EF4444' : l.monthsLeft <= 6 ? '#F59E0B' : primaryColor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
          <ChartCard title="Cash Flow" subtitle="Income, Expenses & Net over time">
            {cashFlowData.length === 0 ? (
              <div style={{ padding: '24px 0' }}>
                <EmptyState
                  title="No Cash Flow History"
                  text="Cash flow tracking will populate automatically once vouchers are posted and reconciled."
                />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Income" stroke={primaryColor} fill={`${primaryColor}20`} strokeWidth={2} />
                  <Area type="monotone" dataKey="Expenses" stroke="#EF4444" fill="#EF444420" strokeWidth={2} />
                  <Area type="monotone" dataKey="Net" stroke="#5C63A6" fill="#5C63A620" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </div>
    </>
  )
}
