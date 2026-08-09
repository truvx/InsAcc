import React, { useState, useMemo, useRef } from 'react'
import type { PropertyEntry, UnitEntry, TenantEntry, LeaseEntry, PropTransaction, PropAccount, PropertyExpense } from '../data/propertyTypes'
import type { Account, Voucher, TrialBalanceEntry, BankMapping } from '../accounting/types'
import { SystemAccountRegistry } from '../accounting/systemAccountRegistry'
import type { AuditEvent } from '../data/auditTypes'
import { recordModuleEvent } from '../services/auditService'
import { validateLedgerBalance } from '../accounting/ledgerService'
import { formatCurrency, formatPercentage } from '../utils/reportFormatters'
import { UaeDirhamIcon } from './design/UaeDirhamIcon'
import { KpiCard, ChartCard, Button, Badge, EmptyState, ChevronDownIcon, PortfolioIcon, ActivityIcon, TrendingUpIcon } from './design/DesignSystem'
import PeriodSelector, { type PeriodOption, getPeriodDates } from './PeriodSelector'
import { t } from '../utils'
import { getPropertyFinancialSummary } from '../services/propertyFinancialAggregationService'
import { getBalanceSheetTree, getProfitLossTree, flattenStatementRows } from '../services/propertyFinancialStatements'
import { formatDate } from '../utils'
import { exportAccountingExcel, exportAccountingCsv, exportAccountingPdf, exportTableData, exportSideBySidePdf } from '../services/reportExportService'
import ExportReportModal from './design/ExportReportModal'

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
  propAccounts: PropAccount[]
  accounts: Account[]
  vouchers: Voucher[]
  bankMappings: BankMapping[]
  currency?: string
  dateFormat?: string
  language?: string
  onAuditEvent?: (event: AuditEvent) => void
  onNavigate?: (page: string) => void
  expenses?: PropertyExpense[]
}

type ReportTab = 'overview' | 'balance-sheet' | 'profit-loss' | 'trial-balance' | 'rent-collection' | 'pdc-summary' | 'lease-expiry' | 'expense-report'

function getPropAccountBalance(account: PropAccount, transactions: PropTransaction[]): number {
  const txns = transactions.filter(t => t.accountId === account.id)
  return txns.reduce((bal, t) => {
    if (t.type === 'credit' || t.type === 'transfer_in') return bal + t.amount
    if (t.type === 'debit' || t.type === 'transfer_out') return bal - t.amount
    return bal
  }, 0)
}

export default function PropertyReports({
  properties, units, tenants, leases, propAccounts,
  accounts, vouchers, bankMappings,
  currency = 'AED', dateFormat = 'DD/MM/YYYY', language = 'English', onAuditEvent,
  onNavigate,
  expenses = [],
}: Props) {
  const [period, setPeriod] = useState<PeriodOption>('this-month')
  const [customStart, setCustomStart] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().split('T')[0])
  const [exportOpen, setExportOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ReportTab>('overview')
  const exportRef = useRef<HTMLDivElement>(null)

  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [filterStart, setFilterStart] = useState('2026-01-01')
  const [filterEnd, setFilterEnd] = useState('2026-12-31')
  const [filterVType, setFilterVType] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterBank, setFilterBank] = useState('All')
  const [filterAccount, setFilterAccount] = useState('All')
  const [filterBuilding, setFilterBuilding] = useState('All')
  const [filterTenant, setFilterTenant] = useState('All')

  // handleReportExport is now moved below to access all tab data.

  const periodDates = useMemo(() => getPeriodDates(period, customStart, customEnd), [period, customStart, customEnd])

  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'balance-sheet', label: 'Balance Sheet' },
    { id: 'profit-loss', label: 'Profit & Loss' },
    { id: 'trial-balance', label: 'Trial Balance' },
    { id: 'rent-collection', label: 'Rent Collection' },
    { id: 'pdc-summary', label: 'PDC Summary' },
    { id: 'lease-expiry', label: 'Lease Expiry' },
    { id: 'expense-report', label: 'Expense Report' },
  ]

  const fmt = (n: number) => (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {currency === 'AED' ? <UaeDirhamIcon /> : currency} {n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );

  // ── Accounting KPIs ──
  const accountingKpis = useMemo(() => {
    const summary = getPropertyFinancialSummary(accounts, vouchers, propAccounts, bankMappings)
    return {
      cash: summary.cash,
      bankBalance: summary.bankBalance,
      pdc: summary.pdc,
      rentalIncome: summary.rentalIncome,
      totalAssets: summary.totalAssets,
      totalLiabilities: summary.totalLiabilities,
      totalEquity: summary.totalEquity,
      totalRevenue: summary.totalRevenue,
      totalExpenses: summary.totalExpenses,
      netIncome: summary.netIncome,
    }
  }, [accounts, vouchers, propAccounts, bankMappings])

  // ── Balance Sheet Tree ──
  const bsTree = useMemo(() => getBalanceSheetTree(accounts, vouchers), [accounts, vouchers])
  const bsRows = useMemo(() => flattenStatementRows(bsTree), [bsTree])

  // ── P&L Tree ──
  const plTree = useMemo(() => getProfitLossTree(accounts, vouchers), [accounts, vouchers])
  const plRows = useMemo(() => flattenStatementRows(plTree), [plTree])

  // ── Trial Balance ──
  const tbEntries = useMemo(() => {
    const summary = getPropertyFinancialSummary(accounts, vouchers, propAccounts, bankMappings)
    return summary.tb
  }, [accounts, vouchers, propAccounts, bankMappings])

  // ── Accounting Integrity Validation ──
  const ledgerValidation = useMemo(() => validateLedgerBalance(vouchers, accounts), [vouchers, accounts])

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
    return {
      pending: '—',
      deposited: '—',
      cleared: '—',
      totalValue: accountingKpis.pdc,
      rentalIncome: accountingKpis.rentalIncome,
    }
  }, [accountingKpis.pdc, accountingKpis.rentalIncome])

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

  const handleReportExport = async (format: 'xlsx' | 'csv' | 'pdf', reportType: string = 'Standard', advanced: any = {}) => {
    setIsExportModalOpen(false)
    try {
      if (activeTab === 'overview' || activeTab === 'general-journal' || activeTab === 'general-ledger' || reportType !== 'Standard') {
        let dynamicTitle = 'Transaction Report';
        if (reportType === 'LedgerBreakup') dynamicTitle = 'Ledger-wise Breakup Report';
        else if (reportType === 'PropertyBreakup') dynamicTitle = 'Property-wise Breakup Report';
        else if (reportType === 'SupplierBreakup') dynamicTitle = 'Supplier-wise Breakup Report';
        else if (reportType === 'TenantBreakup') dynamicTitle = 'Tenant-wise Breakup Report';
        else if (activeTab === 'general-ledger') dynamicTitle = 'General Ledger Report';
        else if (activeTab === 'general-journal') dynamicTitle = 'General Journal Report';
        else if (activeTab === 'overview') dynamicTitle = 'Overview Report';

        const p = {
          companyName: 'INSACC',
          reportTitle: dynamicTitle.toUpperCase(),
          module: 'Property' as const,
          periodLabel: `${filterStart} - ${filterEnd}`,
          generatedBy: 'User',
          currency,
          accounts,
          vouchers,
          filters: {
            dateRange: { start: filterStart, end: filterEnd },
            bankAccountId: filterBank,
            accountId: filterAccount,
            buildingName: filterBuilding,
            tenantName: filterTenant,
            voucherType: filterVType,
            status: filterStatus,
          },
          properties,
          units,
          tenants,
          leases,
          reportType: reportType as 'Standard' | 'LedgerBreakup' | 'PropertyBreakup' | 'SupplierBreakup' | 'TenantBreakup',
          advancedOptions: advanced
        }
        
        if (format === 'xlsx') await exportAccountingExcel(p)
        else if (format === 'csv') await exportAccountingCsv(p)
        else if (format === 'pdf') await exportAccountingPdf(p)
        return
      }

      let title = ''
      let columns: string[] = []
      let rows: (string | number)[][] = []

      if (activeTab === 'balance-sheet') {
        title = 'Balance Sheet'
        columns = ['Account', 'Balance']
        rows = bsRows.map(r => [
          r.accountName,
          r.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })
        ])
      } else if (activeTab === 'profit-loss') {
        const revTree = plTree.filter(n => {
          const acc = accounts.find(a => a.id === n.accountId)
          return acc?.type === 'revenue'
        })
        const expTree = plTree.filter(n => {
          const acc = accounts.find(a => a.id === n.accountId)
          return acc?.type === 'expense'
        })
        
        const revRows = flattenStatementRows(revTree)
        const expRows = flattenStatementRows(expTree)

        const totRev = revRows.filter(r => r.depth === 0).reduce((sum, r) => sum + Math.abs(r.balance), 0)
        const totExp = expRows.filter(r => r.depth === 0).reduce((sum, r) => sum + Math.abs(r.balance), 0)
        const netInc = totRev - totExp

        if (format === 'pdf') {
          await exportSideBySidePdf({
            title: 'Profit & Loss',
            subtitle: 'Revenue - Expenses = Net Income',
            filename: `Property_Profit_Loss_${new Date().toISOString().slice(0, 10)}`,
            periodLabel: `${filterStart} - ${filterEnd}`,
            currency: currency,
            leftCol: {
              title: 'Revenue',
              accentColor: '#22A45D',
              total: totRev,
              rows: revRows.map(r => [
                { content: r.accountName, styles: { paddingLeft: r.depth * 10 + 4, fontStyle: r.depth === 0 ? 'bold' : 'normal' } },
                { content: Math.abs(r.balance).toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: r.depth === 0 ? 'bold' : 'normal' } }
              ])
            },
            rightCol: {
              title: 'Expenses',
              accentColor: '#EF4444',
              total: totExp,
              rows: expRows.map(r => [
                { content: r.accountName, styles: { paddingLeft: r.depth * 10 + 4, fontStyle: r.depth === 0 ? 'bold' : 'normal' } },
                { content: Math.abs(r.balance).toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: r.depth === 0 ? 'bold' : 'normal' } }
              ])
            },
            footer: {
              label: 'Net Income',
              value: netInc
            }
          })
          return
        }

        title = 'Profit & Loss'
        columns = ['Account', 'Amount']
        rows = plRows.map(r => [
          r.accountName,
          r.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })
        ])
      } else if (activeTab === 'trial-balance') {
        title = 'Trial Balance'
        columns = ['Code', 'Account', 'Debit', 'Credit', 'Balance']
        rows = tbEntries.map(r => [
          r.accountCode,
          r.accountName,
          r.totalDebit > 0 ? r.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '',
          r.totalCredit > 0 ? r.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '',
          r.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })
        ])
      } else if (activeTab === 'rent-collection') {
        title = 'Rent Collection'
        columns = ['Tenant', 'Property', 'Unit', 'Annual Rent', 'Collected', 'Outstanding']
        rows = rentCollection.map(r => [
          r.tenant,
          r.property,
          r.unit,
          r.annualRent.toLocaleString(undefined, { minimumFractionDigits: 2 }),
          r.collected.toLocaleString(undefined, { minimumFractionDigits: 2 }),
          r.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })
        ])
      } else if (activeTab === 'pdc-summary') {
        title = 'PDC Summary'
        columns = ['Metric', 'Value']
        rows = [
          ['Total PDC Value', pdcSummary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })],
          ['Rental Income (Ledger)', pdcSummary.rentalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })]
        ]
      } else if (activeTab === 'lease-expiry') {
        title = 'Lease Expiry (Next 6 Months)'
        columns = ['Lease #', 'Tenant', 'End Date', 'Monthly Rent']
        rows = leaseExpiry.map(l => {
          const tenant = tenants.find(t => t.id === l.tenantId)?.name || 'Unknown'
          return [l.leaseNumber, tenant, formatDate(l.endDate, dateFormat), l.monthlyRent.toLocaleString(undefined, { minimumFractionDigits: 2 })]
        })
      } else if (activeTab === 'expense-report') {
        title = 'Property Expenses'
        columns = ['Expense No.', 'Date', 'Property', 'Category', 'Paid To', 'Method', 'Amount']
        const periodExpenses = expenses.filter(e => e.date >= periodDates.start && e.date <= periodDates.end)
        rows = periodExpenses.map(e => {
          const propName = properties.find(p => p.id === e.propertyId)?.name || 'Unknown'
          return [
            e.expenseNo,
            formatDate(e.date, dateFormat),
            propName,
            e.category,
            e.paidTo,
            e.paymentMethod,
            e.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })
          ]
        })
      }

      await exportTableData({
      moduleName: 'Properties Management',
        format,
        title,
        subtitle: `Properties Management`,
        periodLabel: `${filterStart} - ${filterEnd}`,
        currency: currency,
        filename: `Property_${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}`,
        columns,
        rows
      })
    } catch (e) {
      console.error(e)
    }
  }

  const renderTabContent = () => {
    // Accounting Integrity Check - show error if ledger is unbalanced
    if (!ledgerValidation.isBalanced) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{
            maxWidth: 500,
            margin: '0 auto',
            padding: '24px',
            backgroundColor: 'var(--danger-bg, #FEF2F2)',
            border: '1px solid var(--danger, #EF4444)',
            borderRadius: 8,
          }}>
            <h3 style={{ color: 'var(--danger, #EF4444)', marginBottom: 12, marginTop: 0 }}>Accounting Integrity Error</h3>
            <p style={{ color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.5 }}>
              The ledger is not balanced. Trial Balance validation failed:
            </p>
            <div style={{ backgroundColor: 'white', padding: 16, borderRadius: 6, marginBottom: 16, fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
              <div>Total Debit: {ledgerValidation.totalDebit}</div>
              <div>Total Credit: {ledgerValidation.totalCredit}</div>
              <div style={{ color: 'var(--danger, #EF4444)', fontWeight: 600, marginTop: 8 }}>
                Difference: {ledgerValidation.difference}
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 0 }}>
              Financial reports cannot be displayed until the ledger is balanced. Please review journal vouchers for errors.
            </p>
          </div>
        </div>
      )
    }

    switch (activeTab) {
      case 'overview':
        return (
          <>
            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--success)', padding: '12px 14px' }}>
                <div className="kpi-label" style={{ fontSize: 12, fontWeight: 600, color: '#4B5563', textTransform: 'capitalize', letterSpacing: 'normal' }}>Cash</div>
                <div className="kpi-value" style={{ fontSize: 16, fontWeight: 700 }}>{fmt(accountingKpis.cash)}</div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--primary)', padding: '12px 14px' }}>
                <div className="kpi-label" style={{ fontSize: 12, fontWeight: 600, color: '#4B5563', textTransform: 'capitalize', letterSpacing: 'normal' }}>Bank Balance</div>
                <div className="kpi-value" style={{ fontSize: 16, fontWeight: 700 }}>{fmt(accountingKpis.bankBalance)}</div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--accent)', padding: '12px 14px' }}>
                <div className="kpi-label" style={{ fontSize: 12, fontWeight: 600, color: '#4B5563', textTransform: 'capitalize', letterSpacing: 'normal' }}>PDC</div>
                <div className="kpi-value" style={{ fontSize: 16, fontWeight: 700 }}>{fmt(accountingKpis.pdc)}</div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--success)', padding: '12px 14px' }}>
                <div className="kpi-label" style={{ fontSize: 12, fontWeight: 600, color: '#4B5563', textTransform: 'capitalize', letterSpacing: 'normal' }}>Rental Income</div>
                <div className="kpi-value" style={{ fontSize: 16, fontWeight: 700 }}>{fmt(accountingKpis.rentalIncome)}</div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--danger)', padding: '12px 14px' }}>
                <div className="kpi-label" style={{ fontSize: 12, fontWeight: 600, color: '#4B5563', textTransform: 'capitalize', letterSpacing: 'normal' }}>Expenses</div>
                <div className="kpi-value" style={{ fontSize: 16, fontWeight: 700 }}>{fmt(accountingKpis.totalExpenses)}</div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--primary-text)', padding: '12px 14px' }}>
                <div className="kpi-label" style={{ fontSize: 12, fontWeight: 600, color: '#4B5563', textTransform: 'capitalize', letterSpacing: 'normal' }}>Net Income</div>
                <div className="kpi-value" style={{ fontSize: 16, fontWeight: 700 }}>{fmt(accountingKpis.netIncome)}</div>
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
      case 'expense-report': {
        const periodExpenses = expenses.filter(e => {
          return e.date >= periodDates.start && e.date <= periodDates.end
        })
        const totalExp = periodExpenses.reduce((s, e) => s + e.totalAmount, 0)
        const maintenanceExp = periodExpenses.filter(e => e.category.toLowerCase().includes('repairs') || e.category.toLowerCase().includes('maintenance') || e.category.toLowerCase().includes('plumbing') || e.category.toLowerCase().includes('cleaning')).reduce((s, e) => s + e.totalAmount, 0)
        const utilityExp = periodExpenses.filter(e => e.category.toLowerCase().includes('utility') || e.category.toLowerCase().includes('water') || e.category.toLowerCase().includes('electricity') || e.category.toLowerCase().includes('internet')).reduce((s, e) => s + e.totalAmount, 0)
        
        return (
          <div className="card card-table">
            <div className="card-body">
              <div className="kpi-grid" style={{ marginBottom: 20, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="kpi-card" style={{ borderTop: '2px solid var(--danger)' }}>
                  <div className="kpi-label">Total Expenses</div>
                  <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(totalExp)}</div>
                </div>
                <div className="kpi-card" style={{ borderTop: '2px solid var(--accent)' }}>
                  <div className="kpi-label">Maintenance Expenses</div>
                  <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(maintenanceExp)}</div>
                </div>
                <div className="kpi-card" style={{ borderTop: '2px solid var(--warning)' }}>
                  <div className="kpi-label">Utility Expenses</div>
                  <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(utilityExp)}</div>
                </div>
              </div>
              
              {periodExpenses.length === 0 ? (
                <EmptyState title="No expenses recorded" text="There are no expenses in the selected date range." />
              ) : (
                <table className="property-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Expense No.</th>
                      <th>Date</th>
                      <th>Property</th>
                      <th>Category</th>
                      <th>Paid To</th>
                      <th>Method</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodExpenses.map(e => {
                      const propName = properties.find(p => p.id === e.propertyId)?.name || 'Unknown'
                      return (
                        <tr key={e.id}>
                          <td className="text-mono text-xs fw-600">{e.expenseNo}</td>
                          <td className="text-xs text-secondary">{formatDate(e.date, dateFormat)}</td>
                          <td className="text-sm">{propName}</td>
                          <td>
                            <Badge variant="neutral">{e.category}</Badge>
                          </td>
                          <td className="text-sm">{e.paidTo}</td>
                          <td className="text-xs">{e.paymentMethod}</td>
                          <td className="text-mono text-xs fw-600" style={{ textAlign: 'right' }}>{fmt(e.totalAmount)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )
      }
    }
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-header-left">
          <div>
            <div className="page-title">{t('reports', language)}</div>
            <div className="page-subtitle">Accounting-driven property reports</div>
          </div>
        </div>
        <div className="page-header-right" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <PeriodSelector
            period={period}
            onPeriodChange={setPeriod}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />
          <button
            onClick={() => setIsExportModalOpen(true)}
            style={{
              backgroundColor: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
              height: 38
            }}
          >
            Export
          </button>
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

      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleReportExport}
        module="Property"
        accounts={accounts}
        filters={{
          filterStart,
          filterEnd,
          filterVType,
          filterStatus,
          filterBank,
          filterAccount,
          filterBuilding,
          filterTenant,
        }}
        onFiltersChange={(partial) => {
          if (partial.filterStart !== undefined) setFilterStart(partial.filterStart)
          if (partial.filterEnd !== undefined) setFilterEnd(partial.filterEnd)
          if (partial.filterVType !== undefined) setFilterVType(partial.filterVType)
          if (partial.filterStatus !== undefined) setFilterStatus(partial.filterStatus)
          if (partial.filterBank !== undefined) setFilterBank(partial.filterBank)
          if (partial.filterAccount !== undefined) setFilterAccount(partial.filterAccount)
          if (partial.filterBuilding !== undefined) setFilterBuilding(partial.filterBuilding)
          if (partial.filterTenant !== undefined) setFilterTenant(partial.filterTenant)
        }}
        properties={properties}
        tenants={tenants}
      />
    </>
  )
}
