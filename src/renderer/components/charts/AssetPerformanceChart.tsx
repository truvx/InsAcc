import React from 'react'
import type { AssetPerformance } from '../../data/sampleData'

interface Props {
  data: AssetPerformance[]
}

const ASSET_COLORS: Record<string, string> = {
  Gold: '#D4AF37',
  Silver: '#9CA3AF',
  Bonds: '#1F4E79',
  'Mutual Funds': '#2E8B57',
  Shares: '#8B4513',
  Others: '#6B5B95',
}

export default function AssetPerformanceChart({ data }: Props) {
  const sorted = [...data].sort((a, b) => b.roi - a.roi)

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
                background: ASSET_COLORS[asset.name] || 'var(--text-light)',
                boxShadow: `0 2px 8px ${(ASSET_COLORS[asset.name] || 'var(--text-light)')}40`,
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
