import React, { useState, useCallback } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts'
import type { AssetAllocation } from '../../data/sampleData'

interface Props {
  data: AssetAllocation[]
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="var(--text-primary)" fontSize={18} fontWeight={700}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text-secondary)" fontSize={13}>
        AED {value.toLocaleString()}
      </text>
      <text x={cx} y={cy + 32} textAnchor="middle" fill="var(--gold)" fontSize={13} fontWeight={600}>
        {(percent * 100).toFixed(1)}%
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={6}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 8}
        outerRadius={outerRadius + 12}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.3}
        cornerRadius={4}
      />
    </g>
  )
}

export default function AssetAllocationPie({ data }: Props) {
  const [activeIndex, setActiveIndex] = useState(-1)

  const onPieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index)
  }, [])

  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">Asset Allocation</div>
          <div className="chart-subtitle">Total: AED {total.toLocaleString()}</div>
        </div>
      </div>
      <div className="chart-container-lg">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={100}
              dataKey="value"
              paddingAngle={3}
              cornerRadius={6}
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={onPieEnter}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} stroke="none" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        {data.map((item, i) => (
          <div
            key={item.name}
            className={`chart-legend-item${activeIndex === i ? ' active' : ''}`}
            onClick={() => setActiveIndex(i)}
          >
            <div className="chart-legend-dot" style={{ background: item.color }} />
            <span className="chart-legend-label">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
