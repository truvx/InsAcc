import React, { useState, useMemo, useRef } from 'react'
import type { PropertyEntry, UnitEntry, TenantEntry, LeaseEntry, PropTransaction, PropAccount } from '../data/propertyTypes'
import type { Account, Voucher, TrialBalanceEntry } from '../accounting/types'
import type { AuditEvent } from '../data/auditTypes'
import { recordModuleEvent } from '../services/auditService'
import { formatCurrency, formatPercentage } from '../utils/reportFormatters'
import { KpiCard, ChartCard, Button, Badge, EmptyState, ChevronDownIcon, PortfolioIcon, ActivityIcon, TrendingUpIcon } from './design/DesignSystem'
import PeriodSelector, { type PeriodOption, getPeriodDates } from './PeriodSelector'
import { t } from '../utils'
import { getAccountBalance, getAccountTypeBalance, getTrialBalance, getAllAccountBalances } from '../accounting/ledgerService'
import { buildAccountTree } from '../accounting/chartOfAccountsService'
import { getNetIncome, getBalanceSheetTree, getProfitLossTree, flattenStatementRows } from '../services/propertyFinancialStatements'
import { formatDate } from '../utils'

function BuildingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><line x1="9" y1="6" x2="9" y2="6.01" /><line x1="15" y1="6" x2="15" y2="6.01" /><line x1="9" y1="10" x2="9" y2="10.01" /><line x1="15" y1="10" x2="15" y2="10.01" /><line x1="9" y1="14" x2="9" y2="14.01" /><line x1="15" y1="14" x2="15" y2="14.01" /><line x1="9" y1="18" x2="15" y2="18" />
    </svg>
  )
}

interface Props {
  properties: PropertyEntry[]
  units: UnitEntry[]
  tenants: TenantEntry[]
  leases: LeaseEntry[]
  propTransactions: PropTransaction[]
  propAccounts: PropAccount[]
  accounts: Account[]
  vouchers: Voucher[]
  currency?: string
  dateFormat?: string
  language?: string
  onAuditEvent?: (event: AuditEvent) => void
  onNavigate?: (page: string) => void
}

type ReportTab = 'overview' | 'balance-sheet' | 'profit-loss' | 'trial-balance' | 'rent-collection' | 'pdc-summary' | 'lease-expiry'

function getPropAccountBalance(account: PropAccount, transactions: PropTransaction[]): number {
  const txns = transactions.filter(t => t.accountId === account.id)
  return txns.reduce((bal, t) => {
    if (t.type === 'credit' || t.type === 'transfer_in') return bal + t.amount
    if (t.type === 'debit' || t.type === 'transfer_out') return bal - t.amount
    return bal
  }, account.openingBalance)
}

export default function PropertyReports({
  properties, units, tenants, leases, propTransactions, propAccounts,
  accounts, vouchers,
  currency = 'AED', dateFormat = 'DD/MM/YYYY', language = 'English', onAuditEvent,
  onNavigate,
}: Props) {
  const [period, setPeriod] = useState<PeriodOption>('this-month')
  const [customStart, setCustomStart] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().split('T')[0])
  const [exportOpen, setExportOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ReportTab>('overview')
  const exportRef = useRef<HTMLDivElement>(null)

  const periodDates = useMemo(() => getPeriodDates(period, customStart, customEnd), [period, customStart, customEnd])

  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'balance-sheet', label: 'Balance Sheet' },
    { id: 'profit-loss', label: 'Profit & Loss' },
    { id: 'trial-balance', label: 'Trial Balance' },
    { id: 'rent-collection', label: 'Rent Collection' },
    { id: 'pdc-summary', label: 'PDC Summary' },
    { id: 'lease-expiry', label: 'Lease Expiry' },
  ]

  const fmt = (n: number) => `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`

  // ── Accounting KPIs ──
  const accountingKpis = useMemo(() => {
    const allBals = getAllAccountBalances(vouchers, accounts)
    const cashId = accounts.find(a => a.code === '1110')?.id
    const bankParent = accounts.find(a => a.code === '1120')
    const pdcId = accounts.find(a => a.code === '1410')?.id
    const rentalId = accounts.find(a => a.code === '4120')?.id
    const totalAssets = getAccountTypeBalance('asset', vouchers, accounts)
    const totalLiabilities = getAccountTypeBalance('liability', vouchers, accounts)
    const totalEquity = getAccountTypeBalance('equity', vouchers, accounts)
    const totalRevenue = getAccountTypeBalance('revenue', vouchers, accounts)
    const totalExpenses = getAccountTypeBalance('expense', vouchers, accounts)

    return {
      cash: cashId ? (allBals[cashId] || 0) : 0,
      bankBalance: bankParent
        ? accounts.filter(a => a.parentId === bankParent.id && a.isActive).reduce((s, a) => s + (allBals[a.id] || 0), 0)
        : 0,
      pdc: pdcId ? (allBals[pdcId] || 0) : 0,
      rentalIncome: rentalId ? (allBals[rentalId] || 0) : 0,
      totalAssets, totalLiabilities, totalEquity, totalRevenue, totalExpenses,
      netIncome: totalRevenue - totalExpenses,
    }
  }, [accounts, vouchers])

  // ── Balance Sheet Tree ──
  const bsTree = useMemo(() => getBalanceSheetTree(accounts, vouchers), [accounts, vouchers])
  const bsRows = useMemo(() => flattenStatementRows(bsTree), [bsTree])

  // ── P&L Tree ──
  const plTree = useMemo(() => getProfitLossTree(accounts, vouchers), [accounts, vouchers])
  const plRows = useMemo(() => flattenStatementRows(plTree), [plTree])

  // ── Trial Balance ──
  const tbEntries = useMemo(() => getTrialBalance(vouchers, accounts), [accounts, vouchers])

  // ── Rent Collection ──
  const rentCollection = useMemo(() => {
    return leases.filter(l => l.status === 'Active').map(l => {
      const tenant = tenants.find(t => t.id === l.tenantId)
      const property = properties.find(p => p.id === l.propertyId)
      const unit = units.find(u => u.id === l.unitId)
      const refVouchers = vouchers.filter(v => (v.reference === l.leaseNumber || v.reference === l.id) && v.status === 'Posted')
      const collected = refVouchers.filter(v => v.type === 'Receipt').reduce((s, v) => {
        return s + v.lines.filter(l => l.type === 'Credit').reduce((ls, l) => ls + l.baseAmount, 0)
      }, 0)
      const annualRent = l.annualRent || l.monthlyRent * 12
      const outstanding = Math.max(0, annualRent - collected)
      return { lease: l, tenant: tenant?.name || 'Unknown', property: property?.name || 'Unknown', unit: unit?.unitNumber || 'Unknown', annualRent, collected, outstanding }
    })
  }, [leases, tenants, properties, units, vouchers])

  // ── PDC Summary ──
  const pdcSummary = useMemo(() => {
    const allBals = getAllAccountBalances(vouchers, accounts)
    const rentalId = accounts.find(a => a.code === '4120')?.id
    return {
      pending: '—',
      deposited: '—',
      cleared: '—',
      totalValue: accountingKpis.pdc,
      rentalIncome: rentalId ? (allBals[rentalId] || 0) : 0,
    }
  }, [accounts, vouchers, accountingKpis.pdc])

  // ── Lease Expiry ──
  const leaseExpiry = useMemo(() => {
    const now = new Date()
    const sixMonths = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
    return leases.filter(l => {
      if (l.status !== 'Active') return false
      const end = new Date(l.endDate)
      return end >= now && end <= sixMonths
    }).sort((a, b) => a.endDate.localeCompare(b.endDate))
  }, [leases])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--success)' }}>
                <div className="kpi-label">Cash</div>
                <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(accountingKpis.cash)}</div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--primary)' }}>
                <div className="kpi-label">Bank Balance</div>
                <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(accountingKpis.bankBalance)}</div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--accent)' }}>
                <div className="kpi-label">PDC</div>
                <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(accountingKpis.pdc)}</div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--success)' }}>
                <div className="kpi-label">Rental Income</div>
                <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(accountingKpis.rentalIncome)}</div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--danger)' }}>
                <div className="kpi-label">Expenses</div>
                <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(accountingKpis.totalExpenses)}</div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--primary-text)' }}>
                <div className="kpi-label">Net Income</div>
                <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(accountingKpis.netIncome)}</div>
              </div>
            </div>
            <div className="chart-grid">
              <ChartCard title="Balance Sheet Summary">
                <div className="chart-stat-row">
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '8px 0' }}>
                    <span className="text-sm">Total Assets</span>
                    <span className="text-sm fw-600">{fmt(accountingKpis.totalAssets)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '8px 0' }}>
                    <span className="text-sm">Total Liabilities</span>
                    <span className="text-sm fw-600">{fmt(accountingKpis.totalLiabilities)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                    <span className="text-sm fw-600">Total Equity</span>
                    <span className="text-sm fw-600 text-purple">{fmt(accountingKpis.totalEquity)}</span>
                  </div>
                </div>
              </ChartCard>
              <ChartCard title="Quick Links">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0' }}>
                  {[
                    { label: 'Balance Sheet', tab: 'balance-sheet' as ReportTab },
                    { label: 'Profit & Loss', tab: 'profit-loss' as ReportTab },
                    { label: 'Trial Balance', tab: 'trial-balance' as ReportTab },
                    { label: 'Rent Collection', tab: 'rent-collection' as ReportTab },
                    { label: 'PDC Summary', tab: 'pdc-summary' as ReportTab },
                    { label: 'Lease Expiry', tab: 'lease-expiry' as ReportTab },
                  ].map(link => (
                    <button
                      key={link.tab}
                      className="nav-item"
                      onClick={() => setActiveTab(link.tab)}
                      style={{ fontSize: 13, padding: '8px 12px' }}
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              </ChartCard>
            </div>
          </>
        )

      case 'balance-sheet':
        return (
          <div className="card card-table">
            <div className="card-body">
              {bsRows.length === 0 ? (
                <EmptyState title="No data" text="Post vouchers to see balance sheet." />
              ) : (
                <table className="property-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th style={{ textAlign: 'right', width: 150 }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bsRows.map(row => (
                      <tr key={row.accountId}>
                        <td style={{ paddingLeft: row.depth * 20 }}>
                          <span className={`text-sm ${row.isTotal ? 'fw-700' : row.depth <= 1 ? 'fw-600' : 'fw-400'}`}>
                            {row.accountName}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={`text-mono text-xs fw-600 ${row.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                            {fmt(row.balance)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )

      case 'profit-loss':
        return (
          <div className="card card-table">
            <div className="card-body">
              {plRows.length === 0 ? (
                <EmptyState title="No data" text="Post vouchers to see profit & loss." />
              ) : (
                <table className="property-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th style={{ textAlign: 'right', width: 150 }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plRows.map(row => (
                      <tr key={row.accountId}>
                        <td style={{ paddingLeft: row.depth * 20 }}>
                          <span className={`text-sm ${row.isTotal ? 'fw-700' : 'fw-500'}`}>{row.accountName}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={`text-mono text-xs fw-600 ${row.isTotal ? 'fw-700' : ''}`}>
                            {fmt(row.balance)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className="fw-700 text-sm" style={{ borderTop: '2px solid var(--border)', paddingTop: 12 }}>Net Income</td>
                      <td className="fw-700 text-sm" style={{ borderTop: '2px solid var(--border)', textAlign: 'right', paddingTop: 12 }}>
                        {fmt(accountingKpis.netIncome)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )

      case 'trial-balance':
        return (
          <div className="card card-table">
            <div className="card-body">
              {tbEntries.length === 0 ? (
                <EmptyState title="No data" text="Post vouchers to see trial balance." />
              ) : (
                <table className="property-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Account</th>
                      <th>Debit</th>
                      <th>Credit</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tbEntries.map(e => (
                      <tr key={e.accountId}>
                        <td className="text-mono text-xs">{e.accountCode}</td>
                        <td className="text-sm">{e.accountName}</td>
                        <td className="text-mono text-xs">{e.totalDebit > 0 ? fmt(e.totalDebit) : '—'}</td>
                        <td className="text-mono text-xs">{e.totalCredit > 0 ? fmt(e.totalCredit) : '—'}</td>
                        <td className={`text-mono text-xs fw-600 ${e.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                          {fmt(e.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )

      case 'rent-collection':
        return (
          <>
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--success)' }}>
                <div className="kpi-label">Active Leases</div>
                <div className="kpi-value" style={{ fontSize: 22 }}>{String(rentCollection.length)}</div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--success)' }}>
                <div className="kpi-label">Total Collected</div>
                <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(rentCollection.reduce((s, r) => s + r.collected, 0))}</div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--danger)' }}>
                <div className="kpi-label">Total Outstanding</div>
                <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(rentCollection.reduce((s, r) => s + r.outstanding, 0))}</div>
              </div>
            </div>
            <div className="card card-table">
              <div className="card-body">
                {rentCollection.length === 0 ? (
                  <EmptyState title="No active leases" text="Create leases to see rent collection data." />
                ) : (
                  <table className="property-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Tenant</th>
                        <th>Property</th>
                        <th>Unit</th>
                        <th>Annual Rent</th>
                        <th>Collected</th>
                        <th>Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rentCollection.map(r => (
                        <tr key={r.lease.id}>
                          <td className="text-sm fw-500">{r.tenant}</td>
                          <td className="text-xs text-secondary">{r.property}</td>
                          <td className="text-xs">{r.unit}</td>
                          <td className="text-mono text-xs fw-600">{fmt(r.annualRent)}</td>
                          <td className="text-mono text-xs text-success fw-600">{fmt(r.collected)}</td>
                          <td className={`text-mono text-xs fw-600 ${r.outstanding > 0 ? 'text-danger' : 'text-success'}`}>
                            {fmt(r.outstanding)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )

      case 'pdc-summary':
        return (
          <div className="card card-table">
            <div className="card-body">
              <div className="kpi-grid" style={{ marginBottom: 20 }}>
                <div className="kpi-card" style={{ borderTop: '2px solid var(--accent)' }}>
                  <div className="kpi-label">Total PDC Value</div>
                  <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(pdcSummary.totalValue)}</div>
                </div>
                <div className="kpi-card" style={{ borderTop: '2px solid var(--success)' }}>
                  <div className="kpi-label">Rental Income (Ledger)</div>
                  <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(pdcSummary.rentalIncome)}</div>
                </div>
              </div>
              <div className="text-sm text-secondary" style={{ padding: '24px 0', textAlign: 'center' }}>
                PDC summary report is powered by the Accounting Engine. Detailed PDC management is available in the{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); onNavigate?.('pdc-manager') }} style={{ color: 'var(--primary)' }}>PDC Manager</a>.
              </div>
            </div>
          </div>
        )

      case 'lease-expiry':
        return (
          <div className="card card-table">
            <div className="card-body">
              {leaseExpiry.length === 0 ? (
                <EmptyState title="No upcoming expiries" text="No leases expiring within the next 6 months." />
              ) : (
                <>
                  <div className="kpi-grid" style={{ marginBottom: 20 }}>
                    <div className="kpi-card" style={{ borderTop: '2px solid var(--warning)' }}>
                      <div className="kpi-label">Expiring Soon</div>
                      <div className="kpi-value" style={{ fontSize: 22 }}>{String(leaseExpiry.length)}</div>
                    </div>
                  </div>
                  <table className="property-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Lease</th>
                        <th>Tenant</th>
                        <th>Property</th>
                        <th>End Date</th>
                        <th>Monthly Rent</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaseExpiry.map(l => {
                        const tenant = tenants.find(t => t.id === l.tenantId)
                        const property = properties.find(p => p.id === l.propertyId)
                        return (
                          <tr key={l.id}>
                            <td className="text-mono text-xs fw-600">{l.leaseNumber}</td>
                            <td className="text-sm">{tenant?.name || 'Unknown'}</td>
                            <td className="text-xs text-secondary">{property?.name || 'Unknown'}</td>
                            <td className="text-xs">{formatDate(l.endDate, dateFormat)}</td>
                            <td className="text-mono text-xs">{fmt(l.monthlyRent)}</td>
                            <td><Badge variant="warning">Expiring</Badge></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        )
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">{t('reports', language)}</div>
            <div className="page-subtitle">Accounting-driven property reports</div>
          </div>
        </div>
        <div className="page-header-right">
          <PeriodSelector
            period={period}
            onPeriodChange={setPeriod}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />
        </div>
      </div>

      <div className="page-body">
        <div className="tabs" style={{ marginBottom: 20, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {renderTabContent()}
      </div>
    </>
  )
}
