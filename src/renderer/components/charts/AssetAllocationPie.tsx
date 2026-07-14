import React, { useState, useCallback, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts'
import { ChartColors, ChartConfig } from '../../styles/ChartTheme'
import type { AssetAllocation } from '../../data/sampleData'
import { CurrencyText } from '../design/CurrencyText'

interface Props {
  data: AssetAllocation[]
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
  return (
    <g>
      {/* Active Slice: remains visually connected, expands outer radius by 6px */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={6}
        style={{ transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
      {/* Outer Decorative Ring: follows selected slice perfectly */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 9}
        outerRadius={outerRadius + 12}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.25}
        cornerRadius={3}
        style={{ transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
    </g>
  )
}

export default function AssetAllocationPie({ data }: Props) {
  const [activeIndex, setActiveIndex] = useState(-1)

  const onPieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index)
  }, [])

  const onPieLeave = useCallback(() => {
    setActiveIndex(-1)
  }, [])

  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data])

  const activeItem = activeIndex >= 0 ? data[activeIndex] : null
  const centerTitle = activeItem ? activeItem.name : 'Total Portfolio'
  const centerValue = activeItem ? activeItem.value : total
  const centerPercent = activeItem ? (total > 0 ? (activeItem.value / total) * 100 : 0) : 100

  // Adjust font size dynamically to prevent clipping or overflowing of long titles
  const titleFontSize = useMemo(() => {
    if (centerTitle.length > 15) return '11px'
    if (centerTitle.length > 10) return '13px'
    return '15px'
  }, [centerTitle])

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">Asset Allocation</div>
          <div className="chart-subtitle">Total: <CurrencyText value={total} /></div>
        </div>
      </div>
      <div className="chart-container" style={{ position: 'relative' }}>
        {/* Perfectly centered center label container */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '120px',
          height: '120px',
          zIndex: 10,
        }}>
          <span style={{
            fontSize: titleFontSize,
            fontWeight: 600,
            color: 'var(--text-secondary, #64748B)',
            lineHeight: '1.2',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }}>
            {centerTitle}
          </span>
          <span style={{
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--text-primary, #1E293B)',
            marginTop: '4px',
            lineHeight: '1.1',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }}>
            <CurrencyText value={Math.round(centerValue)} />
          </span>
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: activeItem ? activeItem.color : 'var(--primary, #3BA549)',
            marginTop: '2px',
            lineHeight: '1',
          }}>
            {centerPercent.toFixed(1)}%
          </span>
        </div>

        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              dataKey="value"
              paddingAngle={3}
              cornerRadius={6}
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.color}
                  stroke="none"
                  style={{
                    transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                  }}
                />
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
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={onPieLeave}
            style={{ cursor: 'pointer' }}
          >
            <div className="chart-legend-dot" style={{ background: item.color }} />
            <span className="chart-legend-label">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
