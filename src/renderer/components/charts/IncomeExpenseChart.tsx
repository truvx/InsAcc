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
import { ChartColors, ChartConfig } from '../../styles/ChartTheme'
import SegmentedControl from '../design/SegmentedControl'
import { formatCurrency } from '../../utils/currencyHelpers'
interface Props {
  dataByPeriod?: Record<string, any[]>
}

export default function IncomeExpenseChart({ dataByPeriod }: Props) {
  const [period, setPeriod] = useState('Monthly')

  const data = useMemo(() => {
    return dataByPeriod?.[period] || []
  }, [period, dataByPeriod])

  const incomeExpenseData = data
  console.table(incomeExpenseData)

  const firstItem = data[0]
  const xKey = firstItem && 'period' in firstItem ? 'period' : (period === 'Daily' ? 'date' : 'month')

  const subtitle = `${period} income vs expenses`

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">Income vs Expenses</div>
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
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: ChartColors.green }}
              tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: ChartColors.red }}
              tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={ChartConfig.tooltip.contentStyle}
              itemStyle={ChartConfig.tooltip.itemStyle}
              cursor={ChartConfig.tooltip.cursor}
              formatter={(value: number, name: string) => [formatCurrency(value, 'AED'), name]}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', color: ChartConfig.labels }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              yAxisId="left"
              dataKey="income"
              name="Income"
              fill={ChartColors.green}
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
            <Bar
              yAxisId="right"
              dataKey="expense"
              name="Expenses"
              fill={ChartColors.red}
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
