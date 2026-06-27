import React, { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  CASH_FLOW_MONTHLY,
  CASH_FLOW_QUARTERLY,
  CASH_FLOW_YEARLY,
} from '../../data/sampleData'

export default function CashFlowChart() {
  const [period, setPeriod] = useState('Monthly')

  const data = useMemo(() => {
    switch (period) {
      case 'Quarterly': return CASH_FLOW_QUARTERLY
      case 'Yearly': return CASH_FLOW_YEARLY
      default: return CASH_FLOW_MONTHLY
    }
  }, [period])

  const subtitle = `${period} income vs expenses`

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">Cash Flow</div>
          <div className="chart-subtitle">{subtitle}</div>
        </div>
        <div className="chart-periods">
          {['Monthly', 'Quarterly', 'Yearly'].map((p) => (
            <button
              key={p}
              className={`chart-period ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
              tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                fontSize: '13px',
              }}
              formatter={(value: number) => [`AED ${value.toLocaleString()}`, '']}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', color: '#6B7280' }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              dataKey="income"
              name="Income"
              fill="#2E8B57"
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
            <Bar
              dataKey="expense"
              name="Expenses"
              fill="#9CA3AF"
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
