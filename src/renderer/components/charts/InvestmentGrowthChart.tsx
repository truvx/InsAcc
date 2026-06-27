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
import type { InvestmentHistory } from '../../data/sampleData'

interface Props {
  dataByPeriod?: Record<string, InvestmentHistory[]>
}

export default function InvestmentGrowthChart({ dataByPeriod }: Props) {
  const [period, setPeriod] = useState('Monthly')

  const data = useMemo(() => {
    return dataByPeriod?.[period] || []
  }, [period, dataByPeriod])

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
                <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--gold)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
              tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--surface)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-md)',
                fontSize: '13px',
              }}
              formatter={(value: number) => [`AED ${value.toLocaleString()}`, 'Portfolio Value']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--gold)"
              strokeWidth={2.5}
              fill="url(#growthGradient)"
              dot={false}
              activeDot={{ r: 5, fill: 'var(--gold)', stroke: 'var(--text-inverse)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
