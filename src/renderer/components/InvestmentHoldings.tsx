import React, { useMemo, useState, useCallback, useRef } from 'react'
import type { AssetHolding } from '../data/assetTypes'
import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { BankAccount, BankTransaction } from '../data/banking'
import type { PurchaseRecord } from '../data/purchaseLedger'
import { getInvestmentHoldingsProjection } from '../readModels/InvestmentHoldingsReadModel'
import { getLinesForAccount } from '../accounting/ledgerService'
import { formatCurrency } from '../utils/reportFormatters'
import { DataTable, type Column } from './design/Table'
import { Badge, EmptyState, Modal } from './design/DesignSystem'
import VoucherTimeline from './VoucherTimeline'
import BankAccountAvatar from './BankAccountAvatar'
import { deriveBalance } from '../services/bankingService'
import { maskAccountNumber } from '../utils'

interface Props {
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
  purchaseRecords: PurchaseRecord[]
  bankAccounts?: BankAccount[]
  bankTransactions?: BankTransaction[]
  bankMappings?: BankMapping[]
  onNavigate?: (page: string) => void
}

const fmtBalance = (n: number, sym: string) =>
  `${sym} ${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`

function Tooltip({
  bank,
  balance,
  style,
}: {
  bank: BankAccount
  balance: number
  style: React.CSSProperties
}) {
  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 9999,
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
        padding: '14px 18px',
        minWidth: 220,
        pointerEvents: 'none',
        ...style,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', marginBottom: 2 }}>
        {bank.institution}
      </div>
      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>
        {bank.accountName}
      </div>
      <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace', marginBottom: 8 }}>
        {maskAccountNumber(bank.accountNumber)}
      </div>
      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 8 }}>
        <div style={{ fontSize: 12, color: '#64748B' }}>Current Balance</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#16A34A' }}>
          {fmtBalance(balance, bank.currency || 'AED')}
        </div>
      </div>
    </div>
  )
}

export default function InvestmentHoldings({
  currency = 'AED', accounts, vouchers, purchaseRecords,
  bankAccounts = [], bankTransactions = [], bankMappings = [],
  onNavigate = () => {},
}: Props) {
  const [detailHolding, setDetailHolding] = useState<AssetHolding | null>(null)
  const [tooltipTarget, setTooltipTarget] = useState<{ bankAccountId: string; rect: DOMRect } | null>(null)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()

  const holdings = useMemo(
    () => getInvestmentHoldingsProjection(purchaseRecords, vouchers, accounts),
    [purchaseRecords, vouchers, accounts],
  )

  const bankByIdMap = useMemo(
    () => new Map(bankAccounts.map(ba => [ba.id, ba])),
    [bankAccounts],
  )

  const balanceMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const ba of bankAccounts) {
      map.set(ba.id, deriveBalance(ba, bankTransactions))
    }
    return map
  }, [bankAccounts, bankTransactions])

  const totalInvested = useMemo(
    () => holdings.reduce((s, h) => s + h.totalInvested, 0),
    [holdings],
  )

  const totalMarketValue = useMemo(
    () => holdings.reduce((s, h) => s + h.marketValue, 0),
    [holdings],
  )

  const totalHoldings = holdings.length

  const handleBankClick = useCallback((e: React.MouseEvent, _bankAccountId: string) => {
    e.stopPropagation()
    onNavigate('bank-accounts')
  }, [onNavigate])

  const showTooltip = useCallback((bankAccountId: string, rect: DOMRect) => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setTooltipTarget({ bankAccountId, rect })
    setTooltipVisible(true)
  }, [])

  const hideTooltip = useCallback(() => {
    hideTimer.current = setTimeout(() => {
      setTooltipVisible(false)
      setTooltipTarget(null)
    }, 120)
  }, [])

  const tooltipData = useMemo(() => {
    if (!tooltipTarget || !tooltipVisible) return null
    const bank = bankByIdMap.get(tooltipTarget.bankAccountId)
    if (!bank) return null
    return { bank, balance: balanceMap.get(bank.id) || 0 }
  }, [tooltipTarget, tooltipVisible, bankByIdMap, balanceMap])

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
      key: 'accountCode', header: 'Account',
      render: h => {
        const record = purchaseRecords.find(p => h.purchaseRecordIds.includes(p.id))
        const fundingBankAccountId = record?.fundingBankAccountId || ''
        const bank = fundingBankAccountId ? bankByIdMap.get(fundingBankAccountId) ?? null : null
        const isUnassigned = !fundingBankAccountId || !bank

        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: 6,
              transition: 'background 180ms ease',
            }}
            className="holdings-account-cell"
            tabIndex={0}
            role="button"
            aria-label={bank ? `Funding Bank: ${bank.institution}` : 'Unassigned'}
            onClick={e => fundingBankAccountId && handleBankClick(e, fundingBankAccountId)}
            onMouseEnter={e => fundingBankAccountId && showTooltip(fundingBankAccountId, e.currentTarget.getBoundingClientRect())}
            onMouseLeave={hideTooltip}
            onFocus={e => fundingBankAccountId && showTooltip(fundingBankAccountId, e.currentTarget.getBoundingClientRect())}
            onBlur={hideTooltip}
            onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && fundingBankAccountId) { e.preventDefault(); onNavigate('bank-accounts') } }}
          >
            <div
              className="holdings-avatar-wrapper"
              style={{
                transition: 'transform 180ms ease',
                flexShrink: 0,
                lineHeight: 0,
              }}
            >
              <BankAccountAvatar bank={bank} size={28} />
            </div>
            <div style={{ minWidth: 0 }}>
              {bank ? (
                <>
                  <div
                    className="holdings-bank-name"
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#1E293B',
                      transition: 'color 180ms ease',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {bank.institution}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 400,
                      color: '#64748B',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {bank.accountName}
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#1E293B',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    Unassigned
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 400,
                      color: '#64748B',
                    }}
                  >
                    No linked bank account
                  </div>
                </>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'totalQuantity', header: 'Qty', sortable: true, numeric: true, width: '70px',
      render: h => <span className="text-xs">{h.totalQuantity.toLocaleString()}</span>,
    },
    {
      key: 'averageCost', header: 'Avg Cost', sortable: true, numeric: true, width: '100px',
      render: h => <span className="text-xs">{currency} {h.averageCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>,
    },
    {
      key: 'totalInvested', header: 'Invested', sortable: true, numeric: true, width: '110px',
      render: h => <span className="fw-600 text-xs">{currency} {h.totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>,
    },
    {
      key: 'marketValue', header: 'Market Val', sortable: true, numeric: true, width: '110px',
      render: h => <span className="text-xs fw-600" style={{ color: 'var(--primary)' }}>{currency} {h.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>,
    },
    {
      key: 'unrealizedGain', header: 'Unrealized', sortable: true, numeric: true, width: '100px',
      render: h => (
        <span className={`text-xs fw-600 ${h.unrealizedGain >= 0 ? 'text-success' : 'text-danger'}`}>
          {h.unrealizedGain >= 0 ? '+' : ''}{currency} {h.unrealizedGain.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
      <style>{`
        .holdings-account-cell:hover .holdings-avatar-wrapper {
          transform: scale(1.02);
        }
        .holdings-account-cell:hover .holdings-bank-name {
          color: var(--primary) !important;
        }
        .holdings-account-cell:hover {
          background: rgba(59,165,73,0.06);
        }
        .holdings-account-cell:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }
      `}</style>

      {tooltipData && (
        <Tooltip
          bank={tooltipData.bank}
          balance={tooltipData.balance}
          style={{
            left: tooltipTarget!.rect.right + 12,
            top: tooltipTarget!.rect.top - 10,
          }}
        />
      )}

      <Modal open={detailHolding !== null} title={`Holding — ${detailHolding?.assetName || ''}`} onClose={() => setDetailHolding(null)}>
        {detailHolding && (
          <div style={{ minWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="kpi-grid" style={{ marginBottom: 0 }}>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--accent)', padding: 12 }}>
                <div className="kpi-label">Invested</div>
                <div className="kpi-value" style={{ fontSize: 18 }}>{currency} {detailHolding.totalInvested.toLocaleString()}</div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--success)', padding: 12 }}>
                <div className="kpi-label">Market Value</div>
                <div className="kpi-value" style={{ fontSize: 18, color: 'var(--primary)' }}>{currency} {detailHolding.marketValue.toLocaleString()}</div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--warning)', padding: 12 }}>
                <div className="kpi-label">Avg Cost</div>
                <div className="kpi-value" style={{ fontSize: 18 }}>{currency} {detailHolding.averageCost.toLocaleString()}</div>
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
                              <td className="text-xs text-mono">{currency} {p.unitPrice.toLocaleString()}</td>
                              <td className="text-xs text-mono fw-600">{currency} {p.totalValue.toLocaleString()}</td>
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
                            <td className="text-xs text-mono text-success">{line.type === 'Debit' ? formatCurrency(line.baseAmount, currency) : '—'}</td>
                            <td className="text-xs text-mono text-danger">{line.type === 'Credit' ? formatCurrency(line.baseAmount, currency) : '—'}</td>
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
            <div className="page-subtitle">{totalHoldings} holdings • {currency} {totalInvested.toLocaleString()} invested • Market: {currency} {totalMarketValue.toLocaleString()}</div>
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
