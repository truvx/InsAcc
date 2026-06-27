import React, { useState, useMemo } from 'react'
import type { Profile } from '../data/sampleData'
import type { PurchaseCategory, Purchase, ItemAverages } from '../data/purchaseData'
import {
  SUMMARY_CARDS,
  ASSET_ALLOCATION,
  ASSET_PERFORMANCES,
} from '../data/sampleData'
import AssetAllocationPie from './charts/AssetAllocationPie'
import InvestmentGrowthChart from './charts/InvestmentGrowthChart'
import CashFlowChart from './charts/CashFlowChart'
import AssetPerformanceChart from './charts/AssetPerformanceChart'
import { KpiCard } from './design/DesignSystem'
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

function computeAverages(categories: PurchaseCategory[], purchases: Purchase[]): ItemAverages[] {
  const byItem: Record<string, Purchase[]> = {}
  purchases.forEach(p => {
    if (!byItem[p.itemId]) byItem[p.itemId] = []
    byItem[p.itemId].push(p)
  })
  return Object.entries(byItem).map(([itemId, pList]) => {
    const cat = categories.find(c => c.items.some(i => i.id === itemId))
    const item = cat?.items.find(i => i.id === itemId)
    const count = pList.length
    const totalQty = pList.reduce((s, p) => s + p.quantity, 0)
    const totalVal = pList.reduce((s, p) => s + p.totalValue, 0)
    const sumUnitPrice = pList.reduce((s, p) => s + p.unitPrice, 0)
    return {
      itemId,
      itemName: item?.name || itemId,
      categoryName: cat?.name || 'Unknown',
      purchaseCount: count,
      totalQuantity: totalQty,
      totalValue: totalVal,
      avgUnitPrice: count ? +(sumUnitPrice / count).toFixed(2) : 0,
      avgValue: count ? +(totalVal / count).toFixed(2) : 0,
      avgQuantity: count ? +(totalQty / count).toFixed(2) : 0,
    }
  })
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
          <button className="btn btn-ghost btn-sm" onClick={() => setToast({ visible: true, message: 'No new notifications', type: 'success' })} aria-label="Notifications">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            Notifications
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setToast({ visible: true, message: 'InsAcc v1.0 — Intelligent Asset & Investment Accounting', type: 'success' })} aria-label="About">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            About
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid">
          <KpiCard label="Total Portfolio Value" value={`${sym} 0`} delay={0} />
          <KpiCard label="Active Investments" value="0" delay={0.05} />
          <KpiCard label="This Month" value={`${sym} 0`} change={{ value: 'No change', direction: 'neutral' }} delay={0.1} />
          <KpiCard label="YTD Return" value="0%" change={{ value: 'No data', direction: 'neutral' }} delay={0.15} />
        </div>

        {totalPurchaseCount > 0 && (
          <>
            <div className="kpi-grid">
              <KpiCard label="Total Invested (Ledger)" value={`${sym} ${totalInvestedInPurchases.toLocaleString()}`} delay={0} />
              <KpiCard label="Total Purchases" value={String(totalPurchaseCount)} delay={0.05} />
              <KpiCard label="Items Tracked" value={String(totalItemsWithPurchases)} delay={0.1} />
              <KpiCard label="Avg Unit Price" value={`${sym} ${avgUnitPriceAcross.toLocaleString()}`} delay={0.15} />
            </div>

            <div className="card card-table mb-6">
              <div className="card-header">
                <span className="card-title">Purchase Averages</span>
              </div>
              <div className="card-body">
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
              </div>
            </div>
          </>
        )}

        <div className="chart-grid">
          <div className="chart-container">
            <AssetAllocationPie data={ASSET_ALLOCATION} />
          </div>
          <div className="chart-container">
            <AssetPerformanceChart data={ASSET_PERFORMANCES} />
          </div>
        </div>

        <div className="chart-grid mb-0">
          <div className="chart-container">
            <InvestmentGrowthChart />
          </div>
          <div className="chart-container">
            <CashFlowChart />
          </div>
        </div>
      </div>
    </>
  )
}
