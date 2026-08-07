import React, { useMemo, useState, useCallback } from 'react'
import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { BankAccount } from '../data/banking'
import type { PurchaseRecord } from '../data/purchaseLedger'
import { Modal } from './design/DesignSystem'
import AccountDrillDown from './AccountDrillDown'
import { getFinancialOverviewProjection } from '../readModels/InvestmentFinancialOverviewReadModel'
import { Download, ChevronLeft as ChevronLeftIcon } from 'lucide-react'
import { exportFinancialOverviewPdf } from '../services/reportExportService'

interface Props {
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
  bankAccounts: BankAccount[]
  bankMappings: BankMapping[]
  purchaseRecords: PurchaseRecord[]
}

const PAGE_BG = '#FFFFFF'
const CHART_BG = '#FFFFFF'

const KPI_VALUE_STYLE: React.CSSProperties = {
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 600,
  fontSize: 32,
  letterSpacing: '-0.03em',
  lineHeight: 1.15,
  color: '#1F2937',
}

const KPI_LABEL_STYLE: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontWeight: 500,
  fontSize: 12,
  color: '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

import { UaeDirhamIcon } from './design/UaeDirhamIcon'

function fmtFull(n: number, sym: string) {
  const isNegative = n < 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {isNegative ? '-' : ''}{sym === 'AED' ? <UaeDirhamIcon /> : sym} {Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}

function fmtCompact(n: number, sym: string): string {
  const isNegative = n < 0;
  return `${isNegative ? '-' : ''}${sym} ${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function FormatCompact({ value, currency }: { value: number; currency: string }) {
  return <>{fmtFull(value, currency)}</>
}

function getVoucherBadge(type: string) {
  switch (type) {
    case 'Receipt':
      return { bg: '#DCFCE7', color: '#166534' }
    case 'Payment':
      return { bg: '#FEE2E2', color: '#991B1B' }
    case 'Purchase':
      return { bg: '#EDE9FE', color: '#5B21B6' }
    default:
      return { bg: '#FEF3C7', color: '#92400E' }
  }
}


export default function InvestmentAccountsDashboard({
  currency = 'AED', accounts, vouchers, bankAccounts, bankMappings, purchaseRecords,
}: Props) {
  const [drillAccountId, setDrillAccountId] = useState<string | null>(null)
  const [drillAccountName, setDrillAccountName] = useState<string>('')
  const [selectedBankId, setSelectedBankId] = useState<string>('')

  const projection = useMemo(
    () => getFinancialOverviewProjection(accounts, vouchers, bankAccounts, bankMappings, purchaseRecords, selectedBankId || undefined),
    [accounts, vouchers, bankAccounts, bankMappings, purchaseRecords, selectedBankId],
  )

  const handleDrill = useCallback((accountId: string, name: string) => {
    if (accountId) {
      setDrillAccountId(accountId)
      setDrillAccountName(name)
    }
  }, [])

  const getDrillForLabel = useCallback((label: string): { id: string; name: string } | null => {
    switch (label) {
      case 'Cash': return { id: accounts.find(a => a.code === '1110')?.id || '', name: 'Cash' }
      case 'Bank Balance': {
        const bankParent = accounts.find(a => a.code === '1120')
        if (!bankParent) return null
        const children = accounts.filter(a => a.parentId === bankParent.id && a.isActive)
        if (children.length === 1) return { id: children[0].id, name: children[0].name }
        return { id: bankParent.id, name: 'Bank Accounts' }
      }
      case 'Investments': {
        const inv = accounts.find(a => a.code === '1200')
        return inv ? { id: inv.id, name: 'Investments' } : null
      }
      case 'Expenses': {
        const expenseParent = accounts.find(a => a.type === 'expense' && !a.parentId)
        return expenseParent ? { id: expenseParent.id, name: 'Expenses' } : null
      }
      default: return null
    }
  }, [accounts])

  const [showExportMenu, setShowExportMenu] = useState(false)

  const allRecentActivity = useMemo(() => {
    const items: Array<{ date: string; number: string; type: string; description: string; amount: number }> = []
    const push = (arr: typeof items) => items.push(...arr)
    push(projection.recentPurchases.map(r => ({ ...r, type: 'Purchase' })))
    push(projection.recentReceipts.map(r => ({ ...r, type: 'Receipt' })))
    push(projection.recentPayments.map(r => ({ ...r, type: 'Payment' })))
    push(projection.recentJournals.map(r => ({ ...r, type: 'Journal' })))
    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)
  }, [projection])

  const handleExport = useCallback((format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      const rows = [
        ['Metric', 'Value (AED)'],
        ['Cash', projection.cash],
        ['Bank Balance', projection.bankBalance],
        ['Investment Assets', projection.investments],
        ['Revenue', projection.quickSummary.revenue],
        ['Expenses', projection.quickSummary.expenses],
        ['Initial Capital', projection.quickSummary.initialCapital],
        ['Growth %', projection.quickSummary.growth],
      ]
      const csv = rows.map(r => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `financial-overview-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else if (format === 'pdf') {
      const tableRows = allRecentActivity.map(r => [
        r.date, r.number, r.type, r.description, `${currency} ${r.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`
      ])
      exportFinancialOverviewPdf({
        title: 'Financial Overview',
        subtitle: 'Real-time financial position derived from the accounting book.',
        filename: `financial-overview-${new Date().toISOString().split('T')[0]}`,
        currency,
        kpis: [
          { label: 'Cash', value: projection.cash, color: '#3BA549' },
          { label: 'Bank Balance', value: projection.bankBalance, color: '#0A0A6F' },
          { label: 'Investment Assets', value: projection.investments, color: '#1B65A6' },
          { label: 'Expenses', value: projection.quickSummary.expenses, color: '#EF4444' }
        ],
        summary: projection.quickSummary,
        recentActivity: tableRows
      })
    }
    setShowExportMenu(false)
  }, [projection, allRecentActivity, currency])

  const kpiCards = useMemo(() => [
    {
      label: 'Cash', value: projection.cash, kpiLabel: 'Cash',
      color: '#3BA549', accent: 'drill',
    },
    {
      label: 'Bank Balance', value: projection.bankBalance, kpiLabel: 'Bank Balance',
      color: '#0A0A6F', accent: 'drill',
    },
    {
      label: 'Investment Assets', value: projection.investments, kpiLabel: 'Investment Assets',
      color: '#8B5CF6', accent: 'drill',
    },
    {
      label: 'Expenses', value: projection.quickSummary.expenses, kpiLabel: 'Expenses',
      color: '#EF4444', accent: 'drill',
    },
  ], [projection])

  const emptyRows = useMemo(() =>
    projection.recentReceipts.length === 0 &&
    projection.recentPayments.length === 0 &&
    projection.recentJournals.length === 0 &&
    projection.recentPurchases.length === 0,
  [projection])

  const sectionGap = 28
  const cardBorder = '1px solid #E5E7EB'
  const cardShadow = '0 1px 3px rgba(0,0,0,0.05)'

  return (
    <div style={{ background: PAGE_BG, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <Modal open={drillAccountId !== null} title={`Account Drill Down — ${drillAccountName}`} onClose={() => setDrillAccountId(null)}>
        {drillAccountId && (
          <AccountDrillDown
            accountId={drillAccountId}
            accountName={drillAccountName}
            accounts={accounts}
            vouchers={vouchers}
            currency={currency}
          />
        )}
      </Modal>

      <div className="page-header" style={{ background: PAGE_BG, borderBottom: '1px solid #E5E7EB' }}>
        <div className="page-header-left">
          <div className="page-title">Financial Overview</div>
          <div className="page-subtitle">Real-time financial position derived from the accounting book.</div>
        </div>
        <div className="page-header-right">
          <select
            value={selectedBankId}
            onChange={e => setSelectedBankId(e.target.value)}
            style={{
              padding: '8px 14px', borderRadius: 8, border: '1px solid #ECECEC',
              fontSize: 13, fontFamily: "'Inter', sans-serif", background: '#fff',
              cursor: 'pointer', outline: 'none', color: '#374151',
            }}
          >
            <option value="">All Bank Accounts</option>
            {bankAccounts.filter(ba => ba.status === 'active').map(ba => (
              <option key={ba.id} value={ba.id}>{ba.institution}</option>
            ))}
          </select>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid #ECECEC',
                fontSize: 13, fontFamily: "'Inter', sans-serif", background: '#fff',
                cursor: 'pointer', fontWeight: 500, color: '#374151',
                boxShadow: cardShadow, display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <Download size={16} /> Export
              <span style={{ display: 'inline-block', transform: showExportMenu ? 'rotate(90deg)' : 'rotate(-90deg)', width: 12, height: 12 }}>
                <ChevronLeftIcon size={12} />
              </span>
            </button>
            {showExportMenu && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                zIndex: 50, display: 'flex', flexDirection: 'column', minWidth: 140, overflow: 'hidden'
              }}>
                <button
                  onClick={() => handleExport('pdf')}
                  style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', color: '#374151' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  PDF (.pdf)
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', color: '#374151' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  CSV (.csv)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-body" style={{ background: PAGE_BG, padding: '28px 32px' }}>
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: sectionGap }}>
          {kpiCards.map(k => (
            <div
              key={k.label}
              style={{
                border: cardBorder, borderRadius: 16, boxShadow: cardShadow,
                background: '#fff', cursor: k.accent === 'drill' ? 'pointer' : 'default',
                padding: '20px 20px', height: 120,
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                gap: 8, transition: 'box-shadow 0.15s',
              }}
              onClick={() => {
                if (k.accent === 'drill') {
                  const info = getDrillForLabel(k.label)
                  if (info) handleDrill(info.id, info.name)
                }
              }}
            >
              <div style={KPI_LABEL_STYLE}>{k.kpiLabel}</div>
              <div style={KPI_VALUE_STYLE}>
                <FormatCompact value={k.value} currency={currency} />
              </div>
            </div>
          ))}
        </div>

        <div style={{
          background: CHART_BG, borderRadius: 16, border: cardBorder,
          boxShadow: cardShadow, overflow: 'hidden',
        }}>
          <div className="card-header" style={{ padding: '20px 24px 0' }}>
            <div className="card-title" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 16, fontWeight: 600, color: '#1F2937' }}>
              Quick Financial Summary
            </div>
          </div>
          <div style={{ padding: '14px 20px 16px' }}>
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden' }}>
              {[
                { label: 'Initial Capital', value: projection.quickSummary.initialCapital, color: '#1F2937' },
                { label: 'Current Assets', value: projection.quickSummary.currentAssets, color: '#0A0A6F' },
                { label: 'Revenue', value: projection.quickSummary.revenue, color: '#3BA549' },
                { label: 'Expenses', value: projection.quickSummary.expenses, color: '#EF4444' },
              ].map((item, i) => (
                <div key={item.label} style={{
                  flex: 1, padding: '10px 14px',
                  display: 'flex', flexDirection: 'column', gap: 3,
                  borderRight: i < 4 ? '1px solid #ECECEC' : 'none',
                }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                  <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 18, fontWeight: 600, color: item.color }}>
                    <FormatCompact value={item.value} currency={currency} />
                  </span>
                </div>
              ))}
              <div style={{
                flex: 1, padding: '10px 14px',
                display: 'flex', flexDirection: 'column', gap: 3,
              }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                  Growth
                </span>
                <span style={{
                  fontFamily: "'Montserrat', sans-serif", fontSize: 18, fontWeight: 600,
                  color: projection.quickSummary.growth >= 0 ? '#3BA549' : '#EF4444',
                }}>
                  {projection.quickSummary.growth >= 0 ? '+' : ''}{projection.quickSummary.growth.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: CHART_BG, borderRadius: 16, border: cardBorder,
          boxShadow: cardShadow, overflow: 'hidden',
        }}>
          <div className="card-header" style={{ padding: '20px 24px 0' }}>
            <div className="card-title" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 16, fontWeight: 600, color: '#1F2937' }}>
              Recent Accounting Activity
            </div>
          </div>
          <div style={{ padding: '16px 24px 20px' }}>
            {emptyRows ? (
              <div style={{ padding: '24px 0', textAlign: 'center', fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#9CA3AF' }}>
                No recent accounting activity recorded.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Inter', sans-serif" }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {allRecentActivity.map((row, i) => {
                    const badge = getVoucherBadge(row.type)
                    return (
                      <tr key={`${row.type}-${row.number}-${i}`} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '12px 10px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap', height: 52 }}>{row.date}</td>
                        <td style={{ padding: '12px 10px', fontSize: 12, color: '#374151', fontWeight: 500, whiteSpace: 'nowrap' }}>{row.number}</td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
                            background: badge.bg, color: badge.color,
                          }}>
                            {row.type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description}</td>
                        <td style={{ padding: '12px 10px', fontSize: 12, color: '#1F2937', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmtCompact(row.amount, currency)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
