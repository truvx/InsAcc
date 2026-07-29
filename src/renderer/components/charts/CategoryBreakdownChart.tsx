import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { CategoryBreakdown } from '../../data/reports'
import { INVESTMENT_CHART_COLORS, ChartConfig } from '../../styles/ChartTheme'
import { formatCurrency } from '../../utils/currencyHelpers'

interface Props {
  data: CategoryBreakdown[]
  currency?: string
}

export default function CategoryBreakdownChart({ data, currency = 'AED' }: Props) {
  return (
    <div className="chart-container">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 10, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ChartConfig.grid} horizontal={false} />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: ChartConfig.axis }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`} />
          <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: ChartConfig.labels }} width={140} />
          <Tooltip
            contentStyle={ChartConfig.tooltip.contentStyle}
            itemStyle={ChartConfig.tooltip.itemStyle}
            cursor={ChartConfig.tooltip.cursor}
            formatter={(value: number, name: string, props: any) => [`$<CurrencyText value={value} currency={currency} /> (${props.payload.percentage}%)`, props.payload.category]}
          />
          <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={20}>
            {data.map((_, index) => (
              <Cell key={index} fill={INVESTMENT_CHART_COLORS[index % INVESTMENT_CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
