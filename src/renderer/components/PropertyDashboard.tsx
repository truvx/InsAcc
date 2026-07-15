import React, { useMemo, memo } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { PropertyEntry, UnitEntry, LeaseEntry, PropTransaction, PropAccount, PdcCheque } from '../data/propertyTypes'
import type { Account, Voucher } from '../accounting/types'
import { getActiveVouchers } from '../accounting/voucherService'
import { getPropertyFinancialSummary } from '../services/propertyFinancialAggregationService'
import { EmptyState } from './design/DesignSystem'
import { ChartColors, ChartConfig, PropertyPalette } from '../styles/ChartTheme'

interface Props {
  currency?: string
  dateFormat?: string
  language?: string
  properties: PropertyEntry[]
  units: UnitEntry[]
  leases: LeaseEntry[]
  accounts: PropAccount[]
  chartAccounts: Account[]
  chartVouchers: Voucher[]
  bankMappings: any[]
  pdcCheques?: PdcCheque[]
  onNavigate?: (page: string) => void
}

import { formatPremiumCompact } from '../utils/reportFormatters'

function fmt(n: number, sym = 'AED', accentColor?: string) {
  const { valueStr, suffix } = formatPremiumCompact(n);
  const sign = n < 0 ? '-' : '';
  return (
    <span className="kpi-value-inner">
      <span className="kpi-currency">{sign}{sym}</span>
      <span className="kpi-compact-amount" style={accentColor ? { color: accentColor } : undefined}>{valueStr}{suffix}</span>
    </span>
  );
}

function fmtTick(n: number) {
  if (Math.abs(n) >= 1000000) {
    return `${(n / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(n) >= 1000) {
    return `${(n / 1000).toFixed(0)}K`;
  }
  return String(n);
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

function KpiCard({ label, value, icon, color, onClick }: { label: string; value: React.ReactNode; icon: React.ReactNode; color: string; onClick?: () => void }) {
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
      <div className="kpi-value" style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>{value}</div>
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

function PropertyDashboardInner({
  currency = 'AED', properties, units, leases, accounts = [], chartAccounts, chartVouchers, bankMappings = [],
  pdcCheques = [],
  onNavigate = () => {},
}: Props) {
  const sym = currency

  const occupiedUnits = useMemo(() => units.filter(u => u.status === 'Occupied'), [units])
  const vacancyRate = useMemo(() => units.length > 0 ? Math.round(((units.length - occupiedUnits.length) / units.length) * 100) : 0, [units, occupiedUnits])
  const occupancyRate = useMemo(() => 100 - vacancyRate, [vacancyRate])
  const monthlyRent = useMemo(() => occupiedUnits.reduce((s, u) => s + u.rentAmount, 0), [occupiedUnits])

  const todayFormatted = useMemo(() => {
    const d = new Date()
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${d.getDate().toString().padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`
  }, [])

  const pdcStats = useMemo(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(today.getDate() + 7)
    const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0]
    
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(today.getDate() + 30)
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0]
    
    const activePdcs = pdcCheques.filter(c => c.status === 'Pending')
    
    const dueToday = activePdcs.filter(c => c.dueDate === todayStr)
    const dueTodayCount = dueToday.length
    const dueTodayAmount = dueToday.reduce((s, c) => s + c.amount, 0)
    
    const next7Days = activePdcs.filter(c => c.dueDate >= todayStr && c.dueDate <= sevenDaysStr)
    const next7DaysCount = next7Days.length
    const next7DaysAmount = next7Days.reduce((s, c) => s + c.amount, 0)
    
    const next30Days = activePdcs.filter(c => c.dueDate >= todayStr && c.dueDate <= thirtyDaysStr)
    const next30DaysCount = next30Days.length
    const next30DaysAmount = next30Days.reduce((s, c) => s + c.amount, 0)
    
    const bouncedCheques = pdcCheques.filter(c => c.status === 'Bounced')
    
    return {
      dueToday,
      dueTodayCount,
      dueTodayAmount,
      next7DaysCount,
      next7DaysAmount,
      next30DaysCount,
      next30DaysAmount,
      bouncedCheques: bouncedCheques.slice(0, 5)
    }
  }, [pdcCheques])

  const accountingMetrics = useMemo(() => {
    const summary = getPropertyFinancialSummary(chartAccounts, chartVouchers, accounts, bankMappings)
    return {
      cash: summary.cash,
      bankBalance: summary.bankBalance,
      pdc: summary.pdc,
      totalExpenses: summary.totalExpenses,
      totalRevenue: summary.totalRevenue,
      netIncome: summary.netIncome,
    }
  }, [chartAccounts, chartVouchers, accounts, bankMappings])

  const incomeVsExpenseData = useMemo(() => {
    const months: Record<string, { income: number; expense: number }> = {}
    const posted = getActiveVouchers(chartVouchers)
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
          <KpiCard label="Bank Balance" value={fmt(accountingMetrics.bankBalance, sym)} color="#F59E0B" onClick={() => onNavigate('bank-accounts')} icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 2 9 22 9 22 7 12 2"/><rect x="4" y="9" width="16" height="11"/><line x1="9" y1="14" x2="9" y2="18"/><line x1="15" y1="14" x2="15" y2="18"/></svg>
          } />
          <KpiCard label="PDC" value={fmt(accountingMetrics.pdc, sym)} color="#8B5CF6" onClick={() => onNavigate('pdc-manager')} icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          } />
          <KpiCard label="Expenses" value={fmt(accountingMetrics.totalExpenses, sym)} color="#EF4444" onClick={() => onNavigate('expenses')} icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
          } />
        </div>

        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <KpiCard label="Net Property Income" value={fmt(accountingMetrics.netIncome, sym, accountingMetrics.netIncome >= 0 ? undefined : '#EF4444')} color={accountingMetrics.netIncome >= 0 ? primaryColor : '#EF4444'} onClick={() => onNavigate('profit-loss')} icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          } />
          <KpiCard label="Properties" value={String(properties.length)} color={primaryColor} onClick={() => onNavigate('properties')} icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          } />
          <KpiCard label="Occupancy" value={`${occupancyRate}%`} color="#22C55E" onClick={() => onNavigate('leases')} icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          } />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2.1fr 0.9fr', gap: 20, alignItems: 'start', marginBottom: 24 }}>
          {/* Main Charts Area (Left) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
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
                      <CartesianGrid strokeDasharray="3 3" stroke={ChartConfig.grid} vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: ChartConfig.axis }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: ChartConfig.axis }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtTick(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar dataKey="Income" fill={ChartColors.green} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Expenses" fill={ChartColors.red} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
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
                      <CartesianGrid strokeDasharray="3 3" stroke={ChartConfig.grid} vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: ChartConfig.axis }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: ChartConfig.axis }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtTick(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill={PropertyPalette.properties} radius={[4, 4, 0, 0]} />
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
                      <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtTick(v)} />
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

          {/* PDC & Cheques Alerts Sidebar (Right) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Cheques Due Today */}
            <div style={{
              background: pdcStats.dueTodayCount > 0 ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-secondary, #F9FAFB)',
              border: pdcStats.dueTodayCount > 0 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border)',
              borderRadius: 12,
              padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, color: pdcStats.dueTodayCount > 0 ? '#EF4444' : '#5C63A6' }}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span style={{ fontWeight: 600, fontSize: 14, color: pdcStats.dueTodayCount > 0 ? '#991B1B' : '#374151' }}>Cheques Due Today ({todayFormatted})</span>
              </div>
              {pdcStats.dueTodayCount > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#991B1B' }}>{pdcStats.dueTodayCount} Cheques</div>
                  <div style={{ fontSize: 13, color: '#991B1B', fontWeight: 500 }}>Total Amount: {sym} {pdcStats.dueTodayAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
              ) : (
                <span style={{ fontSize: 13, color: '#6B7280' }}>No cheques due today.</span>
              )}
            </div>

            {/* Upcoming PDC Alerts */}
            <div style={{
              background: 'var(--bg-secondary, #FFFFFF)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, color: '#3B82F6' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#374151' }}>Upcoming PDC Alerts</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ paddingLeft: 12, borderLeft: '3px solid #3B82F6' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#3B82F6', marginBottom: 4 }}>Within Next 7 Days</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>{pdcStats.next7DaysCount} Cheques</div>
                  <div style={{ fontSize: 12, color: '#4B5563', marginTop: 2 }}>Total Amount: {sym} {pdcStats.next7DaysAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>

                <div style={{ paddingLeft: 12, borderLeft: '3px solid #3B82F6' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#3B82F6', marginBottom: 4 }}>Within Next 30 Days</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>{pdcStats.next30DaysCount} Cheques</div>
                  <div style={{ fontSize: 12, color: '#4B5563', marginTop: 2 }}>Total Amount: {sym} {pdcStats.next30DaysAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            </div>

            {/* Recent Bounced Cheques */}
            <div style={{
              background: 'var(--bg-secondary, #FFFFFF)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, color: '#EF4444' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#374151' }}>Recent Bounced Cheques</span>
              </div>
              {pdcStats.bouncedCheques.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pdcStats.bouncedCheques.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, paddingBottom: 6, borderBottom: '1px solid #F3F4F6' }}>
                      <div>
                        <span style={{ fontWeight: 500, color: '#374151' }}>{c.chequeNumber}</span>
                        <div style={{ color: '#9CA3AF', fontSize: 10 }}>{c.dueDate}</div>
                      </div>
                      <span style={{ fontWeight: 600, color: '#EF4444' }}>{sym} {c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: 13, color: '#6B7280' }}>No recently bounced cheques.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default memo(PropertyDashboardInner)
