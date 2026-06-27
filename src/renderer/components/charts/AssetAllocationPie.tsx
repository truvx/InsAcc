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
      <div style={{ width: '100%', height: 300 }}>
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 'var(--space-2)' }}>
        {data.map((item, i) => (
          <div
            key={item.name}
            onClick={() => setActiveIndex(i)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 20,
              cursor: 'pointer',
              background: activeIndex === i ? 'var(--gold-light)' : 'transparent',
              border: activeIndex === i ? '1px solid var(--gold-border)' : '1px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
            <span style={{ fontSize: 12, color: activeIndex === i ? 'var(--gold)' : 'var(--text-secondary)', fontWeight: activeIndex === i ? 600 : 400 }}>
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
