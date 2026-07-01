import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { Account, Voucher } from '../accounting/types'
import { getInvestmentDashboardProjection } from '../readModels/InvestmentDashboardReadModel'

interface Props {
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
  onNavigate?: (page: string) => void
}

function fmt(n: number, sym = 'AED') {
  if (Math.abs(n) >= 1_000_000_000) return `${sym} ${(n / 1_000_000_000).toFixed(1)}B`
  if (Math.abs(n) >= 1_000_000) return `${sym} ${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${sym} ${(n / 1_000).toFixed(1)}K`
  return `${sym} ${Math.round(n).toLocaleString()}`
}

const primaryColor = '#3BA549'
const colors = ['#3BA549', '#5C63A6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
      padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13,
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
    <motion.div className="kpi-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
      onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}
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
    <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ padding: 0, overflow: 'hidden' }}>
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

export default function InvestmentDashboard({
  currency = 'AED', accounts, vouchers, onNavigate = () => {},
}: Props) {
  const data = useMemo(() => getInvestmentDashboardProjection(accounts, vouchers), [accounts, vouchers])
  const sym = currency

  const growthData = useMemo(() => {
    if (data.growthHistory.length === 0) return []
    const step = Math.max(1, Math.floor(data.growthHistory.length / 12))
    return data.growthHistory
      .filter((_, i) => i % step === 0 || i === data.growthHistory.length - 1)
      .map(h => ({ date: h.date.substring(0, 10), value: h.balance }))
  }, [data.growthHistory])

  const cashFlowData = useMemo(() => {
    return data.cashFlowHistory.map(m => ({ month: m.month, Income: m.income, Expenses: m.expense, Net: m.net }))
  }, [data.cashFlowHistory])

  const allocationData = useMemo(() => {
    return data.allocation.map(a => ({ name: a.name, value: a.value }))
  }, [data.allocation])

  const incomeVsExpenseData = useMemo(() => {
    return data.cashFlowHistory.slice(-6).map(m => ({ month: m.month.substring(5), Income: m.income, Expenses: m.expense }))
  }, [data.cashFlowHistory])

  const monthlyActivityData = useMemo(() => {
    const byMonth: Record<string, number> = {}
    for (const v of vouchers.filter(v => v.status === 'Posted')) {
      const month = v.date.substring(0, 7)
      const investLines = v.lines.filter(l => {
        const acct = accounts.find(a => a.id === l.accountId)
        return acct && acct.type === 'asset' && l.type === 'Debit'
      })
      const total = investLines.reduce((s, l) => s + l.baseAmount, 0)
      if (total > 0) byMonth[month] = (byMonth[month] || 0) + total
    }
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, value]) => ({ month: month.substring(5), value }))
  }, [vouchers, accounts])

  const latestTransactions = useMemo(() => {
    const posted = vouchers.filter(v => v.status === 'Posted').slice(-5).reverse()
    return posted.map(v => ({
      date: v.date.substring(0, 10), number: v.number, desc: v.description,
      amount: v.lines.reduce((s, l) => s + l.baseAmount, 0),
    }))
  }, [vouchers])

  const totalPortfolioValue = data.portfolioValue

  if (data.growthHistory.length === 0) {
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
              <div className="empty-state-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
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
      <div className="page-header">
        <div>
          <div className="page-title">Investment Dashboard</div>
          <div className="page-subtitle">Real-time portfolio overview from the Accounting Engine</div>
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <KpiCard label="Portfolio Value" value={fmt(data.portfolioValue, sym)} color={primaryColor} onClick={() => onNavigate('accounts-dashboard')} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>} />
          <KpiCard label="Available Cash" value={fmt(data.availableCash, sym)} color="#5C63A6" onClick={() => onNavigate('accounts-dashboard')} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} />
          <KpiCard label="Total Income" value={fmt(data.totalIncome, sym)} color="#F59E0B" onClick={() => onNavigate('profit-loss')} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>} />
          <KpiCard label="Total Expenses" value={fmt(data.totalExpenses, sym)} color="#EF4444" onClick={() => onNavigate('profit-loss')} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>} />
          <KpiCard label="Net Cash Flow" value={fmt(data.netCashFlow, sym)} color={data.netCashFlow >= 0 ? primaryColor : '#EF4444'} onClick={() => onNavigate('profit-loss')} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '7fr 3fr', gap: 20, marginBottom: 24 }}>
          <ChartCard title="Portfolio Growth" subtitle="12-month portfolio value trend">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="value" name="Portfolio Value" stroke={primaryColor} strokeWidth={2.5} dot={{ r: 4, fill: primaryColor, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Asset Allocation" subtitle="Portfolio breakdown">
            {allocationData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#9CA3AF', fontSize: 13 }}>No allocation data</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: 300, justifyContent: 'center', position: 'relative' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={allocationData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {allocationData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: 70, fontSize: 16, fontWeight: 700, color: '#1F2937', textAlign: 'center', pointerEvents: 'none' }}>
                  {fmt(totalPortfolioValue)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '0 8px' }}>
                  {allocationData.slice(0, 6).map((a, i) => (
                    <div key={a.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i % colors.length] }} />
                        <span style={{ color: '#6B7280' }}>{a.name}</span>
                      </div>
                      <span style={{ fontWeight: 600, color: '#1F2937' }}>{fmt(a.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
          <ChartCard title="Cash Flow" subtitle="Income vs Expenses over time">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area type="monotone" dataKey="Income" stroke={primaryColor} fill={`${primaryColor}20`} strokeWidth={2} name="Income" />
                <Area type="monotone" dataKey="Expenses" stroke="#EF4444" fill="#EF444420" strokeWidth={2} name="Expenses" />
                <Area type="monotone" dataKey="Net" stroke="#5C63A6" fill="#5C63A620" strokeWidth={2} name="Net" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Asset Performance" subtitle="By investment category">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={allocationData.slice(0, 7)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {allocationData.slice(0, 7).map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Income vs Expenses" subtitle="Monthly comparison">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={incomeVsExpenseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="Income" fill={primaryColor} radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <ChartCard title="Bank Balance Trend" subtitle="Account balance over time">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="value" stroke="#5C63A6" strokeWidth={2} dot={false} name="Balance" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Monthly Investment Activity" subtitle="Purchases by month">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill={primaryColor} radius={[4, 4, 0, 0]} name="Invested" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="Recent Transactions" subtitle="Last 5 posted vouchers">
          <div style={{ margin: '-8px 0' }}>
            {latestTransactions.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: '#9CA3AF', fontSize: 13 }}>No transactions</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 4px', color: '#9CA3AF', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #F3F4F6' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '8px 4px', color: '#9CA3AF', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #F3F4F6' }}>Voucher</th>
                    <th style={{ textAlign: 'left', padding: '8px 4px', color: '#9CA3AF', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #F3F4F6' }}>Description</th>
                    <th style={{ textAlign: 'right', padding: '8px 4px', color: '#9CA3AF', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #F3F4F6' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {latestTransactions.map((t, i) => (
                    <tr key={i}>
                      <td style={{ padding: '10px 4px', borderBottom: '1px solid #F9FAFB', color: '#6B7280' }}>{t.date}</td>
                      <td style={{ padding: '10px 4px', borderBottom: '1px solid #F9FAFB', fontWeight: 600, fontSize: 12 }}>{t.number}</td>
                      <td style={{ padding: '10px 4px', borderBottom: '1px solid #F9FAFB', color: '#6B7280', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.desc}</td>
                      <td style={{ padding: '10px 4px', borderBottom: '1px solid #F9FAFB', textAlign: 'right', fontWeight: 600 }}>{fmt(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </ChartCard>
      </div>
    </>
  )
}
