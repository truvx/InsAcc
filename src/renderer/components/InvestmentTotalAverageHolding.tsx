import React, { useMemo } from 'react'
import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { BankAccount } from '../data/banking'
import type { PurchaseRecord } from '../data/purchaseLedger'
import { getInvestmentHoldingsProjection } from '../readModels/InvestmentHoldingsReadModel'
import { getAssetWeightMultiplier } from '../services/purchaseLedgerService'
import { DataTable, type Column } from './design/Table'
import { KpiCard } from './design/DesignSystem'

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
  const totalQuantity = useMemo(
    () => purityWiseData.reduce((s, p) => s + p.totalQuantity, 0),
    [purityWiseData]
  )

  const totalInvested = useMemo(
    () => purityWiseData.reduce((s, p) => s + p.totalInvested, 0),
    [purityWiseData]
  )

  const overallWeightedAvg = useMemo(
    () => (totalQuantity > 0 ? totalInvested / totalQuantity : 0),
    [totalQuantity, totalInvested]
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
              <span className="text-xs">{currency} {val.toLocaleString(undefined, { minimumFractionDigits: 2 })}/g</span>
              <div className="text-xxs text-secondary" style={{ fontSize: '10px' }}>({currency} {barPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}/{weightLabel})</div>
            </div>
          )
        }
        return <span className="text-xs">{currency} {val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      },
    },
    {
      key: 'totalInvested',
      header: 'Total Invested',
      sortable: true,
      numeric: true,
      render: (p) => <span className="fw-600 text-xs">{currency} {p.totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>,
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
              <span className="text-xs">{currency} {val.toLocaleString(undefined, { minimumFractionDigits: 2 })}/g</span>
              <div className="text-xxs text-secondary" style={{ fontSize: '10px' }}>({currency} {barPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}/{weightLabel})</div>
            </div>
          )
        }
        return <span className="text-xs">{currency} {val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      },
    },
    {
      key: 'totalInvested',
      header: 'Total Invested',
      sortable: true,
      numeric: true,
      render: (a) => <span className="fw-600 text-xs">{currency} {a.totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>,
    },
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Total Average Holding</div>
          <div className="page-subtitle">Purity-wise and asset-wise weighted average and purity average price overview</div>
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid">
          <KpiCard
            label="Total Quantity"
            value={`${totalQuantity.toLocaleString()} g`}
            accentColor="var(--primary)"
            delay={0}
          />
          <KpiCard
            label="Total Invested"
            value={`${currency} ${totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            accentColor="var(--success)"
            delay={0.05}
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
