import React, { useMemo, useState } from 'react'
import { CurrencyText } from './design/CurrencyText'
import type { AssetHolding } from '../data/assetTypes'
import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { BankAccount } from '../data/banking'
import type { PurchaseRecord } from '../data/purchaseLedger'
import { getInvestmentHoldingsProjection } from '../readModels/InvestmentHoldingsReadModel'
import { getAssetWeightMultiplier } from '../services/purchaseLedgerService'
import { getLinesForAccount } from '../accounting/ledgerService'
import { formatCurrency } from '../utils/reportFormatters'
import { DataTable, type Column } from './design/Table'
import { exportTableData } from '../services/reportExportService'
import { Badge, EmptyState, Modal, ChevronLeftIcon, Button } from './design/DesignSystem'
import VoucherTimeline from './VoucherTimeline'
import BankAccountAvatar from './BankAccountAvatar'
import { Download } from 'lucide-react'

interface Props {
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
  purchaseRecords: PurchaseRecord[]
  bankAccounts?: BankAccount[]
  bankMappings?: BankMapping[]
  onNavigate?: (page: string) => void
  loggedInUser?: string
}

export default function InvestmentHoldings({
  currency = 'AED', accounts, vouchers, purchaseRecords,
  bankAccounts = [], bankMappings = [],
  onNavigate = () => {},
  loggedInUser,
}: Props) {
  const [detailHolding, setDetailHolding] = useState<AssetHolding | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const holdings = useMemo(
    () => getInvestmentHoldingsProjection(purchaseRecords, vouchers, accounts),
    [purchaseRecords, vouchers, accounts],
  )

  const bankByIdMap = useMemo(
    () => new Map(bankAccounts.map(ba => [ba.id, ba])),
    [bankAccounts],
  )

  const totalInvested = useMemo(
    () => holdings.reduce((s, h) => s + h.totalInvested, 0),
    [holdings],
  )

  const totalMarketValue = useMemo(
    () => holdings.reduce((s, h) => s + h.marketValue, 0),
    [holdings],
  )

  const totalHoldings = holdings.length

  const handleExport = (format: 'pdf' | 'csv' | 'xlsx') => {
    const exportColumns = ['Asset', 'Type', 'Paid From', 'Qty', 'Invested Amount', 'Avg Price']
    const rows = holdings.map(h => {
      const record = purchaseRecords.find(p => h.purchaseRecordIds.includes(p.id))
      const bank = record && record.fundingBankAccountId ? bankByIdMap.get(record.fundingBankAccountId) : null
      
      return [
        h.assetName,
        h.assetType,
        bank?.institution || '—',
        h.totalQuantity,
        parseFloat(h.totalInvested.toFixed(2)),
        parseFloat(h.avgPurchaseValue.toFixed(2))
      ]
    })

    exportTableData({
      moduleName: 'Investment Portfolio',
      format,
      title: 'Investment Holdings',
      subtitle: `Exported on ${new Date().toISOString().split('T')[0]}`,
      filename: `Investment_Holdings_${new Date().toISOString().split('T')[0]}`,
      columns: exportColumns,
      rows,
      currency,
      generatedBy: loggedInUser
    })
    setShowExportMenu(false)
  }

  const columns: Column<AssetHolding>[] = [
    {
      key: 'assetName', header: 'Asset', sortable: true,
      render: h => (
        <div>
          <span className="fw-500 text-sm">{h.assetName}</span>
          <div className="text-xs text-secondary">{h.assetType}</div>
        </div>
      ),
    },
    {
      key: 'accountCode', header: 'Paid From',
      render: h => {
        const record = purchaseRecords.find(p => h.purchaseRecordIds.includes(p.id))
        if (!record) return <span className="text-xs text-secondary">—</span>
        const bank = record.fundingBankAccountId ? bankByIdMap.get(record.fundingBankAccountId) ?? null : null
        return (
          <span className="text-sm">{bank?.institution || '—'}</span>
        )
      },
    },
    {
      key: 'totalQuantity', header: 'Qty', sortable: true, numeric: true, width: '70px',
      render: h => <span className="text-xs">{h.totalQuantity.toLocaleString()}</span>,
    },
    {
      key: 'avgPurchaseValue', header: 'Average Unit Price', sortable: true, numeric: true, width: '180px',
      render: h => {
        const multiplier = getAssetWeightMultiplier(h.assetName)
        if (multiplier > 1) {
          const weightLabel = multiplier >= 1000 ? `${multiplier / 1000}kg` : `${multiplier}g`
          const barPrice = h.avgPurchaseValue * multiplier
          return (
            <div style={{ textAlign: 'right' }}>
              <span className="text-xs"><CurrencyText value={h.avgPurchaseValue} currency={currency} />/g</span>
              <div className="text-xxs text-secondary" style={{ fontSize: '10px' }}>(<CurrencyText value={barPrice} currency={currency} />/{weightLabel})</div>
            </div>
          )
        }
        return <span className="text-xs"><CurrencyText value={h.avgPurchaseValue} currency={currency} /></span>
      },
    },
    {
      key: 'totalInvested', header: 'Invested', sortable: true, numeric: true, width: '110px',
      render: h => <span className="fw-600 text-xs"><CurrencyText value={h.totalInvested} currency={currency} /></span>,
    },
    {
      key: 'unrealizedGain', header: 'Unrealized', sortable: true, numeric: true, width: '110px',
      render: h => (
        <span className={`text-xs fw-600 ${h.unrealizedGain >= 0 ? 'text-success' : 'text-danger'}`}>
          {h.unrealizedGain >= 0 ? '+' : ''}<CurrencyText value={h.unrealizedGain} currency={currency} />
        </span>
      ),
    },
    {
      key: 'growthPercent', header: 'Growth', sortable: true, numeric: true, width: '75px',
      render: h => (
        <Badge variant={h.growthPercent >= 0 ? 'success' : 'danger'}>
          {h.growthPercent >= 0 ? '+' : ''}{h.growthPercent.toFixed(1)}%
        </Badge>
      ),
    },
    {
      key: 'portfolioPercentage', header: 'Port %', sortable: true, numeric: true, width: '70px',
      render: h => <span className="text-xs text-secondary">{h.portfolioPercentage.toFixed(1)}%</span>,
    },
    {
      key: 'transactionCount', header: 'Lots', width: '50px',
      render: h => <span className="text-xs text-secondary">{h.transactionCount}</span>,
    },
    {
      key: 'actions', header: '', width: '50px',
      render: h => (
        <button
          className="text-xs fw-500"
          style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => setDetailHolding(h)}
        >
          View
        </button>
      ),
    },
  ]

  const holdingRelatedVouchers = useMemo(() => {
    if (!detailHolding) return []
    return vouchers.filter(v => detailHolding.voucherIds.includes(v.id))
  }, [detailHolding, vouchers])

  const holdingRelatedPurchases = useMemo(() => {
    if (!detailHolding) return []
    return purchaseRecords.filter(p => detailHolding.purchaseRecordIds.includes(p.id))
  }, [detailHolding, purchaseRecords])

  return (
    <>
      <Modal open={detailHolding !== null} title={`Holding — ${detailHolding?.assetName || ''}`} onClose={() => setDetailHolding(null)}>
        {detailHolding && (
          <div style={{ minWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="kpi-grid" style={{ marginBottom: 0 }}>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--accent)', padding: 12 }}>
                <div className="kpi-label">Invested</div>
                <div className="kpi-value" style={{ fontSize: 18 }}><CurrencyText value={detailHolding.totalInvested} currency={currency} /></div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--success)', padding: 12 }}>
                <div className="kpi-label">Market Value</div>
                <div className="kpi-value" style={{ fontSize: 18, color: 'var(--primary)' }}><CurrencyText value={detailHolding.marketValue} currency={currency} /></div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--warning)', padding: 12 }}>
                <div className="kpi-label">Average Unit Price</div>
                <div className="kpi-value" style={{ fontSize: 18 }}><CurrencyText value={detailHolding.avgPurchaseValue} currency={currency} /></div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--primary-text)', padding: 12 }}>
                <div className="kpi-label">Portfolio</div>
                <div className="kpi-value" style={{ fontSize: 18 }}>{detailHolding.portfolioPercentage.toFixed(1)}%</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge variant="neutral">{detailHolding.accountCode} — {detailHolding.assetName}</Badge>
              <Badge variant={detailHolding.growthPercent >= 0 ? 'success' : 'danger'}>
                {detailHolding.growthPercent >= 0 ? '+' : ''}{detailHolding.growthPercent.toFixed(1)}% growth
              </Badge>
              <Badge variant="neutral">Qty: {detailHolding.totalQuantity.toLocaleString()}</Badge>
            </div>

            <div>
              <div className="text-sm fw-600 mb-1">Linked Purchases ({detailHolding.transactionCount})</div>
              {holdingRelatedPurchases.length === 0 ? (
                <div className="text-xs text-secondary">No purchases linked</div>
              ) : (
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                    <table className="property-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th className="text-xs">Date</th>
                          <th className="text-xs">Qty</th>
                          <th className="text-xs">Price</th>
                          <th className="text-xs">Total</th>
                          <th className="text-xs">Paid From</th>
                          <th className="text-xs">Lot</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holdingRelatedPurchases.map(p => {
                          const fundingBank = p.fundingBankAccountId ? bankByIdMap.get(p.fundingBankAccountId) ?? null : null
                          return (
                            <tr key={p.id}>
                              <td className="text-xs text-secondary">{p.purchaseDate.substring(0, 10)}</td>
                              <td className="text-xs">{p.quantity.toLocaleString()}</td>
                              <td className="text-xs text-mono">
                                <CurrencyText value={p.unitPrice} currency={currency} />/g
                                {(() => {
                                  const mult = getAssetWeightMultiplier(p.assetName)
                                  if (mult > 1) {
                                    const label = mult >= 1000 ? `${mult / 1000}kg` : `${mult}g`
                                    return <div className="text-xxs text-secondary" style={{ fontSize: '10px' }}>(<CurrencyText value={p.unitPrice * mult} currency={currency} />/{label})</div>
                                  }
                                  return null
                                })()}
                              </td>
                              <td className="text-xs text-mono fw-600"><CurrencyText value={p.totalValue} currency={currency} /></td>
                              <td className="text-xs text-secondary" style={{ whiteSpace: 'nowrap' }}>
                                {fundingBank ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <BankAccountAvatar bank={fundingBank} size={18} />
                                    <span>{fundingBank.institution}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-secondary">—</span>
                                )}
                              </td>
                              <td className="text-xs text-mono">{p.lotId}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                </div>
              )}
            </div>

            <div>
              <div className="text-sm fw-600 mb-1">Linked Vouchers ({detailHolding.voucherNumbers.length})</div>
              {holdingRelatedVouchers.length === 0 ? (
                <div className="text-xs text-secondary">No vouchers linked</div>
              ) : (
                holdingRelatedVouchers.map(v => (
                  <div key={v.id} className="card-accent-purple" style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 8 }}>
                    <div className="text-xs fw-600">{v.number} — {v.description}</div>
                    <VoucherTimeline voucher={v} dateFormat="DD/MM/YYYY" />
                  </div>
                ))
              )}
            </div>

            {detailHolding.accountId && (() => {
              const lines = getLinesForAccount(detailHolding.accountId, vouchers)
              if (lines.length === 0) return null
              return (
                <div>
                  <div className="text-sm fw-600 mb-1">Ledger Entries ({lines.length})</div>
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    <table className="property-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th className="text-xs">Voucher</th>
                          <th className="text-xs">Date</th>
                          <th className="text-xs">Debit</th>
                          <th className="text-xs">Credit</th>
                          <th className="text-xs">Narration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map(({ line, voucher: v }) => (
                          <tr key={`${v.id}-${line.id}`}>
                            <td className="text-xs text-mono fw-500">{v.number}</td>
                            <td className="text-xs text-secondary">{v.date.substring(0, 10)}</td>
                            <td className="text-xs text-mono text-success">{line.type === 'Debit' ? <CurrencyText value={line.baseAmount} currency={currency} /> : '—'}</td>
                            <td className="text-xs text-mono text-danger">{line.type === 'Credit' ? <CurrencyText value={line.baseAmount} currency={currency} /> : '—'}</td>
                            <td className="text-xs text-secondary" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {line.narration || v.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </Modal>

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Investment Holdings</div>
            <div className="page-subtitle">{totalHoldings} holdings • <CurrencyText value={totalInvested} currency={currency} /> invested</div>
          </div>
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
        {holdings.length === 0 ? (
          <EmptyState
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>}
            title="No holdings yet"
            text="Record purchases in the Purchase Ledger to build your holdings."
          />
        ) : (
          <div className="card card-table">
            <div className="card-body">
              <DataTable
                columns={columns}
                data={holdings}
                keyExtractor={h => h.accountId || h.assetName}
                pageSize={50}
                emptyState={
                  <EmptyState
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>}
                    title="No holdings"
                    text="Record purchases to see holdings."
                  />
                }
              />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
