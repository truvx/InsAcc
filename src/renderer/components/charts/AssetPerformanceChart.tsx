import React, { useMemo } from 'react'
import type { AssetPerformance } from '../../data/sampleData'
import { ASSET_TYPE_COLORS } from '../../styles/palette'

interface Props {
  data: AssetPerformance[]
}

export default function AssetPerformanceChart({ data }: Props) {
  const sorted = useMemo(() => [...data].sort((a, b) => b.roi - a.roi), [data])

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">Asset Performance</div>
          <div className="chart-subtitle">ROI by asset class</div>
        </div>
      </div>
      <div className="performance-list">
        {sorted.map((asset, index) => (
          <div key={asset.name} className="performance-item">
            <div
              className="performance-rank"
              style={{
                background: ASSET_TYPE_COLORS[asset.name] || 'var(--text-muted)',
                boxShadow: ASSET_TYPE_COLORS[asset.name]
                  ? `0 2px 8px ${ASSET_TYPE_COLORS[asset.name]}40`
                  : '0 2px 8px transparent',
              }}
            >
              {index + 1}
            </div>
            <div className="performance-info">
              <div className="performance-name">{asset.name}</div>
              <div className="performance-value">
                AED {asset.value.toLocaleString()}
              </div>
            </div>
            <div className={`performance-roi ${asset.roi >= 0 ? 'positive' : 'negative'}`}>
              {asset.roi >= 0 ? '+' : ''}{asset.roi}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
