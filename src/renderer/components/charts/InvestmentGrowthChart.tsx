import React, { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  INVESTMENT_GROWTH_DAILY,
  INVESTMENT_GROWTH_MONTHLY,
  INVESTMENT_GROWTH_YEARLY,
} from '../../data/sampleData'

export default function InvestmentGrowthChart() {
  const [period, setPeriod] = useState('Monthly')

  const data = useMemo(() => {
    switch (period) {
      case 'Daily': return INVESTMENT_GROWTH_DAILY
      case 'Yearly': return INVESTMENT_GROWTH_YEARLY
      default: return INVESTMENT_GROWTH_MONTHLY
    }
  }, [period])

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">Investment Growth</div>
          <div className="chart-subtitle">Portfolio value over time</div>
        </div>
        <div className="chart-periods">
          {['Daily', 'Monthly', 'Yearly'].map((p) => (
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
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
              tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
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
              formatter={(value: number) => [`AED ${value.toLocaleString()}`, 'Portfolio Value']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#D4AF37"
              strokeWidth={2.5}
              fill="url(#growthGradient)"
              dot={false}
              activeDot={{ r: 5, fill: '#D4AF37', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
