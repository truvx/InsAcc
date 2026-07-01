import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { INVESTMENT_CHART_COLORS } from '../../styles/palette'

interface CashItem {
  name: string
  value: number
}

interface Props {
  data: CashItem[]
}

export default function CashDistributionChart({ data }: Props) {
  return (
    <div className="chart-container">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 10, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
          <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} width={180} />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-md)',
              fontSize: '13px',
            }}
            formatter={(value: number) => [`AED ${value.toLocaleString()}`, 'Balance']}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
            {data.map((_, index) => (
              <Cell key={index} fill={INVESTMENT_CHART_COLORS[index % INVESTMENT_CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
