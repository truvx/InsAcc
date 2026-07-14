import React, { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { ChartColors, ChartConfig } from '../../styles/ChartTheme'
import SegmentedControl from '../design/SegmentedControl'
import { formatCurrency } from '../../utils/currencyHelpers'

interface Props {
  dataByPeriod?: Record<string, any[]>
}

export default function CashFlowChart({ dataByPeriod }: Props) {
  const [period, setPeriod] = useState('Monthly')

  const data = useMemo(() => {
    return dataByPeriod?.[period] || []
  }, [period, dataByPeriod])

  const cashFlowData = data
  console.table(cashFlowData)

  const firstItem = data[0]
  const xKey = firstItem && 'period' in firstItem ? 'period' : (period === 'Daily' ? 'date' : 'month')

  const subtitle = `Net cash flow over time`

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">Cash Flow</div>
          <div className="chart-subtitle">{subtitle}</div>
        </div>
        <SegmentedControl
          options={['Daily', 'Monthly', 'Yearly']}
          value={period}
          onChange={setPeriod}
        />
      </div>
      <div className="chart-container">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ChartConfig.grid} vertical={false} />
            <XAxis
              dataKey={xKey}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: ChartConfig.axis }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: ChartConfig.axis }}
              tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={ChartConfig.tooltip.contentStyle}
              itemStyle={ChartConfig.tooltip.itemStyle}
              formatter={(value: number) => [formatCurrency(value, 'AED'), 'Net Cash Flow']}
              cursor={ChartConfig.tooltip.cursor}
            />
            <Bar dataKey="net" radius={[4, 4, 4, 4]} barSize={24} fill={ChartColors.blue} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
