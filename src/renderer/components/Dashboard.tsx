import React, { useState, useMemo } from 'react'
import type { Profile } from '../data/sampleData'
import type { PurchaseCategory, Purchase } from '../data/purchaseData'
import {
  ASSET_ALLOCATION,
  ASSET_PERFORMANCES,
} from '../data/sampleData'
import { computeAverages } from '../services/purchaseService'
import AssetAllocationPie from './charts/AssetAllocationPie'
import InvestmentGrowthChart from './charts/InvestmentGrowthChart'
import CashFlowChart from './charts/CashFlowChart'
import AssetPerformanceChart from './charts/AssetPerformanceChart'
import {
  KpiCard, ChartCard, IconButton,
  PortfolioIcon, ActivityIcon, CalendarIcon, TrendingUpIcon,
} from './design/DesignSystem'
import Toast from './Toast'
import { t } from '../utils'

interface Props {
  profile: Profile
  currency?: string
  dateFormat?: string
  language?: string
  purchaseCategories?: PurchaseCategory[]
  purchases?: Purchase[]
}

export default function Dashboard({ profile, currency, dateFormat, language = 'English', purchaseCategories = [], purchases = [] }: Props) {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const averages = useMemo(() => computeAverages(purchaseCategories, purchases), [purchaseCategories, purchases])

  const totalInvestedInPurchases = purchases.reduce((s, p) => s + p.totalValue, 0)
  const totalPurchaseCount = purchases.length
  const totalItemsWithPurchases = averages.length
  const avgUnitPriceAcross = totalPurchaseCount ? +(purchases.reduce((s, p) => s + p.unitPrice, 0) / totalPurchaseCount).toFixed(2) : 0

  const today = new Date()
  let dateStr: string
  if (dateFormat === 'MM/DD/YYYY') {
    dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  } else if (dateFormat === 'YYYY-MM-DD') {
    dateStr = today.toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  } else {
    dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  const sym = currency || 'AED'

  const hasPurchaseData = totalPurchaseCount > 0

  const showNotification = () => {
    setToast({ visible: true, message: 'No new notifications', type: 'success' })
  }

  const showAbout = () => {
    setToast({ visible: true, message: 'InsAcc v1.0 — Intelligent Asset & Investment Accounting', type: 'success' })
  }

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />
      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">{t('dashboard', language)}</div>
            <div className="page-subtitle">{dateStr}</div>
          </div>
        </div>
        <div className="page-header-right">
          <IconButton
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            }
            label="Notifications"
            onClick={showNotification}
          />
          <IconButton
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            }
            label="About"
            onClick={showAbout}
          />
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid">
          <KpiCard
            label="Total Portfolio Value"
            value={`${sym} 0`}
            icon={<PortfolioIcon />}
            accentColor="var(--primary)"
            delay={0}
          />
          <KpiCard
            label="Active Investments"
            value="0"
            icon={<ActivityIcon />}
            accentColor="var(--info)"
            delay={0.05}
          />
          <KpiCard
            label="This Month"
            value={`${sym} 0`}
            icon={<CalendarIcon />}
            change={{ value: 'No change', direction: 'neutral' }}
            accentColor="var(--success)"
            delay={0.1}
          />
          <KpiCard
            label="YTD Return"
            value="0%"
            icon={<TrendingUpIcon />}
            change={{ value: 'No data', direction: 'neutral' }}
            accentColor="var(--warning)"
            delay={0.15}
          />
        </div>

        {hasPurchaseData && (
          <>
            <div className="dashboard-section-divider">
              <span className="dashboard-section-label">Purchase Overview</span>
            </div>

            <div className="kpi-grid">
              <KpiCard
                label="Total Invested (Ledger)"
                value={`${sym} ${totalInvestedInPurchases.toLocaleString()}`}
                delay={0}
              />
              <KpiCard
                label="Total Purchases"
                value={String(totalPurchaseCount)}
                delay={0.05}
              />
              <KpiCard
                label="Items Tracked"
                value={String(totalItemsWithPurchases)}
                delay={0.1}
              />
              <KpiCard
                label="Avg Unit Price"
                value={`${sym} ${avgUnitPriceAcross.toLocaleString()}`}
                delay={0.15}
              />
            </div>

            <ChartCard title="Purchase Averages" className="mb-6">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Item</th>
                      <th className="numeric">Purchases</th>
                      <th className="numeric">Quantity</th>
                      <th className="numeric">Avg Price</th>
                      <th className="numeric">Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {averages.map(avg => (
                      <tr key={avg.itemId}>
                        <td className="text-secondary">{avg.categoryName}</td>
                        <td style={{ fontWeight: 500 }}>{avg.itemName}</td>
                        <td className="numeric">{avg.purchaseCount}</td>
                        <td className="numeric">{avg.totalQuantity}</td>
                        <td className="numeric">{sym} {avg.avgUnitPrice.toLocaleString()}</td>
                        <td className="numeric">{sym} {avg.totalValue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </>
        )}

        <div className="chart-grid">
          <ChartCard
            title="Asset Allocation"
            subtitle={ASSET_ALLOCATION.length > 0 ? `Total: ${sym} ${ASSET_ALLOCATION.reduce((s, i) => s + i.value, 0).toLocaleString()}` : undefined}
            isEmpty={ASSET_ALLOCATION.length === 0}
            emptyMessage="Add investments to see your asset allocation"
          >
            <AssetAllocationPie data={ASSET_ALLOCATION} />
          </ChartCard>

          <ChartCard
            title="Performance"
            subtitle="Best & worst performing assets"
            isEmpty={ASSET_PERFORMANCES.length === 0}
            emptyMessage="Asset performance data will appear here"
          >
            <AssetPerformanceChart data={ASSET_PERFORMANCES} />
          </ChartCard>
        </div>

        <div className="chart-grid mb-0">
          <ChartCard
            title="Investment Growth"
            subtitle="Portfolio value over time"
            isEmpty={false}
          >
            <InvestmentGrowthChart />
          </ChartCard>

          <ChartCard
            title="Cash Flow"
            subtitle="Income vs expenses"
            isEmpty={false}
          >
            <CashFlowChart />
          </ChartCard>
        </div>
      </div>
    </>
  )
}
