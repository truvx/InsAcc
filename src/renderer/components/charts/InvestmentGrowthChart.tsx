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
import { ChartColors, ChartConfig } from '../../styles/ChartTheme'
import SegmentedControl from '../design/SegmentedControl'
import { formatCurrency } from '../../utils/currencyHelpers'

interface Props {
  dataByPeriod?: Record<string, any[]>
}

export default function InvestmentGrowthChart({ dataByPeriod }: Props) {
  const [period, setPeriod] = useState('Monthly')

  const data = useMemo(() => {
    return dataByPeriod?.[period] || []
  }, [period, dataByPeriod])

  const investmentGrowthData = data
  console.table(investmentGrowthData)

  const firstItem = data[0]
  const xKey = firstItem && 'period' in firstItem ? 'period' : 'date'
  const yKey = firstItem && 'portfolioValue' in firstItem ? 'portfolioValue' : 'value'

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">Investment Growth</div>
          <div className="chart-subtitle">Portfolio value over time</div>
        </div>
        <SegmentedControl
          options={['Daily', 'Monthly', 'Yearly']}
          value={period}
          onChange={setPeriod}
        />
      </div>
      <div className="chart-container">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ChartColors.investmentGold} stopOpacity={0.3} />
                <stop offset="95%" stopColor={ChartColors.investmentGold} stopOpacity={0} />
              </linearGradient>
            </defs>
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
              tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
            />
            <Tooltip
              contentStyle={ChartConfig.tooltip.contentStyle}
              itemStyle={ChartConfig.tooltip.itemStyle}
              cursor={ChartConfig.tooltip.cursor}
              formatter={(value: number) => [formatCurrency(value, 'AED'), 'Portfolio Value']}
            />
            <Area
              type="monotone"
              dataKey={yKey}
              stroke={ChartColors.investmentGold}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#growthGradient)"
              activeDot={{ r: 6, fill: ChartColors.investmentGoldLight, stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
