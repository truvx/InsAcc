import React, { useMemo, useState } from 'react'
import { CurrencyText } from './design/CurrencyText'
import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { BankAccount } from '../data/banking'
import type { PurchaseRecord } from '../data/purchaseLedger'
import { getInvestmentHoldingsProjection } from '../readModels/InvestmentHoldingsReadModel'
import { getAssetWeightMultiplier } from '../services/purchaseLedgerService'
import { DataTable, type Column } from './design/Table'
import { KpiCard, Button, ChevronLeftIcon } from './design/DesignSystem'
import { exportTableData } from '../services/reportExportService'
import { Download } from 'lucide-react'

interface Props {
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
  purchaseRecords: PurchaseRecord[]
  bankAccounts?: BankAccount[]
  bankMappings?: BankMapping[]
  onNavigate?: (page: string) => void
}

interface PurityGroup {
  purity: string
  totalQuantity: number
  totalInvested: number
  weightedAveragePrice: number
  purityAveragePrice: number
  purchaseCount: number
}

interface AssetHoldingAverage {
  assetName: string
  assetType: string
  totalQuantity: number
  totalInvested: number
  weightedAveragePrice: number
  purityAveragePrice: number
}

export default function InvestmentTotalAverageHolding({
  currency = 'AED',
  accounts,
  vouchers,
  purchaseRecords,
  onNavigate = () => {},
}: Props) {
  const [showExportMenu, setShowExportMenu] = useState(false)
  // Filter active purchases
  const activePurchases = useMemo(
    () => purchaseRecords.filter((p) => p.status === 'active'),
    [purchaseRecords]
  )

  // 1. Calculate Purity-wise Total Averages
  const purityWiseData = useMemo((): PurityGroup[] => {
    const grouped = new Map<string, PurchaseRecord[]>()
    for (const p of activePurchases) {
      if (!grouped.has(p.assetType)) {
        grouped.set(p.assetType, [])
      }
      grouped.get(p.assetType)!.push(p)
    }

    const result: PurityGroup[] = []
    for (const [purity, group] of grouped) {
      const totalQuantity = group.reduce((s, p) => s + p.quantity * getAssetWeightMultiplier(p.assetName), 0)
      const totalInvested = group.reduce((s, p) => s + p.totalValue, 0)
      const purchaseCount = group.length
      const sumUnitPrice = group.reduce((s, p) => s + p.unitPrice, 0)

      const weightedAveragePrice = totalQuantity > 0 ? totalInvested / totalQuantity : 0
      const purityAveragePrice = purchaseCount > 0 ? sumUnitPrice / purchaseCount : 0

      result.push({
        purity,
        totalQuantity,
        totalInvested,
        weightedAveragePrice,
        purityAveragePrice,
        purchaseCount,
      })
    }

    return result.sort((a, b) => b.totalInvested - a.totalInvested)
  }, [activePurchases])

  // 2. Calculate Asset-wise Holdings with Weighted and Purity averages
  const holdingsProjection = useMemo(
    () => getInvestmentHoldingsProjection(purchaseRecords, vouchers, accounts),
    [purchaseRecords, vouchers, accounts]
  )

  const assetWiseData = useMemo((): AssetHoldingAverage[] => {
    return holdingsProjection.map((h) => {
      const multiplier = getAssetWeightMultiplier(h.assetName)
      const qtyInGrams = h.totalQuantity * multiplier
      const weightedAveragePrice = qtyInGrams > 0 ? h.totalInvested / qtyInGrams : 0
      return {
        assetName: h.assetName,
        assetType: h.assetType,
        totalQuantity: qtyInGrams,
        totalInvested: h.totalInvested,
        weightedAveragePrice,
        purityAveragePrice: h.simpleAvgPrice || 0,
      }
    })
  }, [holdingsProjection])

  // Summary KPIs
  const { goldQty, silverQty } = useMemo(() => {
    let gold = 0
    let silver = 0
    for (const p of purityWiseData) {
      const type = (p.purity || '').toLowerCase()
      if (type === 'gold') {
        gold += p.totalQuantity
      } else if (type === 'silver') {
        silver += p.totalQuantity
      }
    }
    return { goldQty: gold, silverQty: silver }
  }, [purityWiseData])

  const handleExport = (format: 'pdf' | 'csv' | 'xlsx') => {
    // Only exporting purity averages as a summary
    const exportColumns = ['Purity/Type', 'Purchases', 'Total Qty', 'Total Invested', 'Weighted Avg Price', 'Purity Avg Price']
    const rows = purityWiseData.map(p => [
      p.purity,
      p.purchaseCount,
      p.totalQuantity,
      parseFloat(p.totalInvested.toFixed(2)),
      parseFloat(p.weightedAveragePrice.toFixed(2)),
      parseFloat(p.purityAveragePrice.toFixed(2))
    ])

    exportTableData({
      format,
      title: 'Total Average Holding - Purity Summary',
      subtitle: `Exported on ${new Date().toISOString().split('T')[0]}`,
      filename: `Average_Holding_${new Date().toISOString().split('T')[0]}`,
      columns: exportColumns,
      rows,
      currency
    })
    setShowExportMenu(false)
  }

  const totalInvested = useMemo(
    () => purityWiseData.reduce((s, p) => s + p.totalInvested, 0),
    [purityWiseData]
  )

  // Columns for Purity-wise Table
  const purityColumns: Column<PurityGroup>[] = [
    {
      key: 'purity',
      header: 'Purity / Metal Group',
      sortable: true,
      render: (p) => <span className="fw-500 text-sm">{p.purity}</span>,
    },
    {
      key: 'totalQuantity',
      header: 'Total Quantity',
      sortable: true,
      numeric: true,
      render: (p) => <span className="text-xs">{p.totalQuantity.toLocaleString()} g</span>,
    },
    {
      key: 'purityAveragePrice',
      header: 'Purity Average (Simple)',
      sortable: true,
      numeric: true,
      render: (p) => {
        const val = p.purityAveragePrice
        const multiplier = getAssetWeightMultiplier(p.purity)
        if (multiplier > 1) {
          const weightLabel = multiplier >= 1000 ? `${multiplier / 1000}kg` : `${multiplier}g`
          const barPrice = val * multiplier
          return (
            <div style={{ textAlign: 'right' }}>
              <span className="text-xs"><CurrencyText value={val} currency={currency} />/g</span>
              <div className="text-xxs text-secondary" style={{ fontSize: '10px' }}>(<CurrencyText value={barPrice} currency={currency} />/{weightLabel})</div>
            </div>
          )
        }
        return <span className="text-xs"><CurrencyText value={val} currency={currency} /></span>
      },
    },
    {
      key: 'totalInvested',
      header: 'Total Invested',
      sortable: true,
      numeric: true,
      render: (p) => <span className="fw-600 text-xs"><CurrencyText value={p.totalInvested} currency={currency} /></span>,
    },
    {
      key: 'purchaseCount',
      header: 'Lots / Purchases',
      sortable: true,
      numeric: true,
      width: '120px',
      render: (p) => <span className="text-xs text-secondary">{p.purchaseCount}</span>,
    },
  ]

  // Columns for Asset-wise Table
  const assetColumns: Column<AssetHoldingAverage>[] = [
    {
      key: 'assetName',
      header: 'Asset',
      sortable: true,
      render: (a) => (
        <div>
          <span className="fw-500 text-sm">{a.assetName}</span>
          <div className="text-xs text-secondary">{a.assetType}</div>
        </div>
      ),
    },
    {
      key: 'totalQuantity',
      header: 'Quantity',
      sortable: true,
      numeric: true,
      render: (a) => <span className="text-xs">{a.totalQuantity.toLocaleString()} g</span>,
    },
    {
      key: 'purityAveragePrice',
      header: 'Purity Average (Simple)',
      sortable: true,
      numeric: true,
      render: (a) => {
        const val = a.purityAveragePrice
        const multiplier = getAssetWeightMultiplier(a.assetName)
        if (multiplier > 1) {
          const weightLabel = multiplier >= 1000 ? `${multiplier / 1000}kg` : `${multiplier}g`
          const barPrice = val * multiplier
          return (
            <div style={{ textAlign: 'right' }}>
              <span className="text-xs"><CurrencyText value={val} currency={currency} />/g</span>
              <div className="text-xxs text-secondary" style={{ fontSize: '10px' }}>(<CurrencyText value={barPrice} currency={currency} />/{weightLabel})</div>
            </div>
          )
        }
        return <span className="text-xs"><CurrencyText value={val} currency={currency} /></span>
      },
    },
    {
      key: 'totalInvested',
      header: 'Total Invested',
      sortable: true,
      numeric: true,
      render: (a) => <span className="fw-600 text-xs"><CurrencyText value={a.totalInvested} currency={currency} /></span>,
    },
  ]

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Total Average Holding</div>
          <div className="page-subtitle">Purity-wise and asset-wise weighted average and purity average price overview</div>
        </div>
        <div className="page-header-right">
          <div style={{ position: 'relative' }}>
            <Button variant="secondary" size="sm" onClick={() => setShowExportMenu(!showExportMenu)}>
              <Download size={14} style={{ marginRight: 6 }} /> Export <span style={{ display: 'inline-block', transform: showExportMenu ? 'rotate(90deg)' : 'rotate(-90deg)', width: 12, height: 12, marginLeft: 4 }}><ChevronLeftIcon /></span>
            </Button>
            {showExportMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, width: 140, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <button className="export-menu-item" onClick={() => handleExport('pdf')} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer' }}>PDF (.pdf)</button>
                <button className="export-menu-item" onClick={() => handleExport('xlsx')} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer' }}>Excel (.xlsx)</button>
                <button className="export-menu-item" onClick={() => handleExport('csv')} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer' }}>CSV (.csv)</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid">
          <KpiCard
            label="Total Gold Qty"
            value={`${goldQty.toLocaleString()} g`}
            accentColor="var(--warning)"
            delay={0}
          />
          <KpiCard
            label="Total Silver Qty"
            value={`${silverQty.toLocaleString()} g`}
            accentColor="var(--text-secondary)"
            delay={0.05}
          />
          <KpiCard
            label="Total Invested"
            value={<CurrencyText value={totalInvested} currency={currency} />}
            accentColor="var(--success)"
            delay={0.1}
          />
        </div>

        <div className="card mb-6">
          <div className="card-header">
            <span className="card-title">Purity-wise Total Average Holding</span>
          </div>
          <div className="card-body">
            {purityWiseData.length === 0 ? (
              <div className="text-center p-6 text-secondary">No active purchases found.</div>
            ) : (
              <DataTable data={purityWiseData} columns={purityColumns} keyExtractor={(p) => p.purity} />
            )}
          </div>
        </div>

        <div className="card mb-6">
          <div className="card-header">
            <span className="card-title">Asset-wise Holding Averages</span>
          </div>
          <div className="card-body">
            {assetWiseData.length === 0 ? (
              <div className="text-center p-6 text-secondary">No holdings found.</div>
            ) : (
              <DataTable data={assetWiseData} columns={assetColumns} keyExtractor={(a) => a.assetName} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
