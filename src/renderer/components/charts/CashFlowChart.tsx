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
import type { MonthlyCashFlow } from '../../data/sampleData'

interface Props {
  dataByPeriod?: Record<string, MonthlyCashFlow[]>
}

export default function CashFlowChart({ dataByPeriod }: Props) {
  const [period, setPeriod] = useState('Monthly')

  const data = useMemo(() => {
    return dataByPeriod?.[period] || []
  }, [period, dataByPeriod])

  const subtitle = `${period} income vs expenses`

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">Cash Flow</div>
          <div className="chart-subtitle">{subtitle}</div>
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
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
            />
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--green)' }}
              tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
              tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`}
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
              formatter={(value: number, name: string) => [`AED ${value.toLocaleString()}`, name]}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              yAxisId="left"
              dataKey="income"
              name="Income"
              fill="var(--green)"
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
            <Bar
              yAxisId="right"
              dataKey="expense"
              name="Expenses"
              fill="var(--text-muted)"
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
