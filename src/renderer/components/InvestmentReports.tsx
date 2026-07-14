import React, { useMemo, useCallback } from 'react'
import type { Account, Voucher, BankMapping } from '../accounting/types'
import { SystemAccountRegistry } from '../accounting/systemAccountRegistry'
import { getReportsProjection } from '../readModels/InvestmentReportsReadModel'
import type { PurchaseRecord } from '../data/purchaseLedger'
import type { BankAccount, BankTransaction } from '../data/banking'
import BankAccountAvatar from './BankAccountAvatar'
import { formatAssetType } from '../data/investmentMasterData'
import { exportAccountingExcel } from '../services/reportExportService'
import ExportReportModal from './design/ExportReportModal'
import { validateLedgerBalance } from '../accounting/ledgerService'


interface Props {
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
  purchaseRecords?: PurchaseRecord[]
  bankAccounts?: BankAccount[]
  bankTransactions?: BankTransaction[]
  bankMappings?: BankMapping[]
}

type ReportTab =
  | 'overview'
  | 'balance-sheet'
  | 'profit-loss'
  | 'trial-balance'
  | 'holdings'
  | 'cash-position'
  | 'investment-position'
  | 'purchase-report'
  | 'bank-position'
  | 'cash-flow'
  | 'general-journal'
  | 'general-ledger'

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

export default function InvestmentReports({
  currency = 'AED', accounts, vouchers,
  purchaseRecords = [], bankAccounts = [], bankTransactions = [], bankMappings = [],
}: Props) {
  const [activeTab, setActiveTab] = React.useState<ReportTab>('overview')
  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false)
  const [filterStart, setFilterStart] = React.useState('2026-01-01')
  const [filterEnd, setFilterEnd] = React.useState('2026-12-31')
  const [filterVType, setFilterVType] = React.useState('All')
  const [filterStatus, setFilterStatus] = React.useState('All')
  const [filterBank, setFilterBank] = React.useState('All')
  const [filterAccount, setFilterAccount] = React.useState('All')
  const [filterAsset, setFilterAsset] = React.useState('All')

  const handleExcelGeneration = async () => {
    setIsExportModalOpen(false)
    try {
      await exportAccountingExcel({
        companyName: 'INSACC',
        reportTitle: 'GENERAL LEDGER REPORT',
        module: 'Investment',
        periodLabel: `${filterStart} - ${filterEnd}`,
        generatedBy: 'User',
        currency,
        accounts,
        vouchers,
        filters: {
          dateRange: { start: filterStart, end: filterEnd },
          bankAccountId: filterBank,
          accountId: filterAccount,
          assetName: filterAsset,
          voucherType: filterVType,
          status: filterStatus
        },
        investments: holdings.map(h => ({
          name: h.assetName,
          type: formatAssetType(h.assetCode),
          quantity: 1,
          unitPrice: h.purchaseValue,
          purchaseValue: h.purchaseValue,
          currentValue: h.currentValue
        }))
      })
    } catch (e) {
      console.error(e)
    }
  }

  const fmt = (n: number) => `${currency} ${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtSimple = (n: number) => Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const projection = useMemo(
    () => getReportsProjection(accounts, vouchers, purchaseRecords, bankAccounts, bankTransactions, bankMappings),
    [accounts, vouchers, purchaseRecords, bankAccounts, bankTransactions, bankMappings],
  )

  // Accounting Integrity Validation
  const ledgerValidation = useMemo(() => validateLedgerBalance(vouchers, accounts), [vouchers, accounts])

  const financialOverview = projection.financialOverview
  const tbEntries = projection.trialBalance
  const holdings = projection.balanceSheet.assets.filter(a => a.accountCode.startsWith('12')).map(a => ({
    accountId: a.accountId,
    assetName: a.accountName,
    assetCode: a.accountCode,
    purchaseValue: a.balance,
    currentValue: a.balance,
    unrealizedGain: 0,
    growthPercent: 0,
  }))

  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'balance-sheet', label: 'Balance Sheet' },
    { id: 'profit-loss', label: 'Profit & Loss' },
    { id: 'trial-balance', label: 'Trial Balance' },
    { id: 'holdings', label: 'Investment Holdings' },
    { id: 'cash-position', label: 'Cash Position' },
    { id: 'investment-position', label: 'Investment Position' },
    { id: 'purchase-report', label: 'Purchase Report' },
    { id: 'bank-position', label: 'Bank Position' },
    { id: 'cash-flow', label: 'Cash Flow' },
    { id: 'general-journal', label: 'General Journal' },
    { id: 'general-ledger', label: 'General Ledger' },
  ]

  const handleExport = useCallback((tabId: string) => {
    switch (tabId) {
      case 'balance-sheet': {
        const rows = [
          ...projection.balanceSheet.assets.map(a => ['Asset', a.accountCode, a.accountName, fmtSimple(a.balance)]),
          ['', 'Total Assets', '', fmtSimple(projection.balanceSheet.totalAssets)],
          ...projection.balanceSheet.liabilities.map(a => ['Liability', a.accountCode, a.accountName, fmtSimple(a.balance)]),
          ['', 'Total Liabilities', '', fmtSimple(projection.balanceSheet.totalLiabilities)],
        ]
        downloadCSV('balance-sheet.csv', ['Type', 'Code', 'Account', 'Balance'], rows)
        break
      }
      case 'profit-loss': {
        const rows = [
          ...projection.profitLoss.revenue.map(e => ['Revenue', e.accountCode, e.accountName, fmtSimple(e.balance)]),
          ['', 'Total Revenue', '', fmtSimple(projection.profitLoss.totalRevenue)],
          ...projection.profitLoss.expenses.map(e => ['Expense', e.accountCode, e.accountName, fmtSimple(e.balance)]),
          ['', 'Total Expenses', '', fmtSimple(projection.profitLoss.totalExpenses)],
          ['', 'Net Income', '', fmtSimple(projection.profitLoss.netIncome)],
        ]
        downloadCSV('profit-loss.csv', ['Type', 'Code', 'Account', 'Amount'], rows)
        break
      }
      case 'trial-balance': {
        const rows = tbEntries.map(e => [e.accountCode, e.accountName, fmtSimple(e.totalDebit), fmtSimple(e.totalCredit), fmtSimple(e.balance)])
        downloadCSV('trial-balance.csv', ['Code', 'Account', 'Debit', 'Credit', 'Balance'], rows)
        break
      }
      case 'holdings': {
        const rows = holdings.map(h => [h.assetCode, h.assetName, fmtSimple(h.purchaseValue), fmtSimple(h.currentValue), fmtSimple(h.unrealizedGain), `${h.growthPercent.toFixed(1)}%`])
        downloadCSV('holdings.csv', ['Code', 'Asset', 'Purchase Value', 'Current Value', 'Unrealized Gain', 'Growth'], rows)
        break
      }
      case 'investment-position': {
        const rows = projection.investmentPosition.map(r => [formatAssetType(r.assetType), r.assetName, r.accountCode, fmtSimple(r.costBasis), fmtSimple(r.currentValue), fmtSimple(r.unrealizedGain), `${r.growthPercent.toFixed(1)}%`])
        downloadCSV('investment-position.csv', ['Type', 'Asset', 'Code', 'Cost Basis', 'Current Value', 'Unrealized Gain', 'Growth'], rows)
        break
      }
      case 'purchase-report': {
        const rows = projection.purchaseReport.map(r => [r.date, formatAssetType(r.assetType), r.assetName, String(r.quantity), fmtSimple(r.unitPrice), fmtSimple(r.totalValue), r.accountCode, r.voucherNumber])
        downloadCSV('purchase-report.csv', ['Date', 'Type', 'Asset', 'Qty', 'Unit Price', 'Total', 'Account', 'Voucher'], rows)
        break
      }
      case 'bank-position': {
        const rows = projection.bankPosition.map(r => [r.bankName, fmtSimple(r.ledgerBalance), fmtSimple(r.bankBalance), fmtSimple(r.difference)])
        downloadCSV('bank-position.csv', ['Bank', 'Ledger', 'Statement', 'Diff'], rows)
        break
      }
      case 'cash-flow': {
        const rows = [
          ...projection.cashFlow.operating.map(c => ['Operating', c.category, fmtSimple(c.amount)]),
          ['', 'Total Operating', fmtSimple(projection.cashFlow.totalOperating)],
          ...projection.cashFlow.investing.map(c => ['Investing', c.category, fmtSimple(c.amount)]),
          ['', 'Total Investing', fmtSimple(projection.cashFlow.totalInvesting)],
          ...projection.cashFlow.financing.map(c => ['Financing', c.category, fmtSimple(c.amount)]),
          ['', 'Total Financing', fmtSimple(projection.cashFlow.totalFinancing)],
          ['', 'Net Cash Flow', fmtSimple(projection.cashFlow.netCashFlow)],
        ]
        downloadCSV('cash-flow.csv', ['Type', 'Category', 'Amount'], rows)
        break
      }
    }
  }, [projection, tbEntries, holdings])

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
            <div style={{ backgroundColor: 'white', padding: 16, borderRadius: 6, marginBottom: 16, fontFamily: 'monospace', fontSize: 14 }}>
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
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--success)' }}>
                <div className="kpi-label">Net Worth</div>
                <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(financialOverview.netWorth)}</div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--primary)' }}>
                <div className="kpi-label">Cash</div>
                <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(financialOverview.cash)}</div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--accent)' }}>
                <div className="kpi-label">Investments</div>
                <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(financialOverview.investments)}</div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--warning)' }}>
                <div className="kpi-label">Bank Balance</div>
                <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(financialOverview.bankBalance)}</div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--success)' }}>
                <div className="kpi-label">Revenue</div>
                <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(financialOverview.revenue)}</div>
              </div>
              <div className="kpi-card" style={{ borderTop: '2px solid var(--danger)' }}>
                <div className="kpi-label">Expenses</div>
                <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(financialOverview.expenses)}</div>
              </div>
            </div>
            <div className="chart-grid">
              <div className="card card-table">
                <div className="card-body">
                  <div className="text-sm fw-600 mb-2">Balance Sheet Summary</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span className="text-sm">Total Assets</span>
                    <span className="text-sm fw-600">{fmt(financialOverview.totalAssets)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span className="text-sm">Total Liabilities</span>
                    <span className="text-sm fw-600">{fmt(financialOverview.totalLiabilities)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                    <span className="text-sm fw-600">Net Worth</span>
                    <span className="text-sm fw-600 text-purple">{fmt(financialOverview.netWorth)}</span>
                  </div>
                </div>
              </div>
              <div className="card card-table">
                <div className="card-body">
                  <div className="text-sm fw-600 mb-2">Quick Links</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tabs.filter(t => t.id !== 'overview').map(link => (
                      <button
                        key={link.id}
                        className="nav-item"
                        onClick={() => setActiveTab(link.id)}
                        style={{ fontSize: 13, padding: '8px 12px' }}
                      >
                        {link.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )

      case 'balance-sheet': {
        const renderRows = (sections: typeof projection.balanceSheet.assets) => sections.map(a => (
          <tr key={a.accountId}>
            <td style={{ paddingLeft: a.depth > 0 ? 20 : 0 }}>
              <span className={`text-sm ${!a.parentId ? 'fw-700' : 'fw-400'}`}>{a.accountName}</span>
              <span className="text-mono text-xs text-secondary ml-2">{a.accountCode}</span>
            </td>
            <td className="text-mono text-xs fw-600" style={{ textAlign: 'right' }}>
              {a.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </td>
          </tr>
        ))

        return (
          <div className="card card-table">
            <div className="card-header">
              <span className="card-title">Balance Sheet</span>
              <button className="text-xs fw-500" style={{ color: 'var(--primary)', background: 'none', border: '1px solid var(--primary)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }} onClick={() => handleExport('balance-sheet')}>Export CSV</button>
            </div>
            <div className="card-body">
              {projection.balanceSheet.assets.length === 0 && projection.balanceSheet.liabilities.length === 0 ? (
                <div className="text-center text-secondary text-sm" style={{ padding: '40px 0' }}>No balance sheet data. Post vouchers to see data.</div>
              ) : (
                <table className="property-table" style={{ width: '100%' }}>
                  <thead><tr><th>Account</th><th style={{ textAlign: 'right', width: 150 }}>Balance ({currency})</th></tr></thead>
                  <tbody>
                    <tr><td colSpan={2} className="fw-700 text-sm" style={{ color: 'var(--primary)', paddingTop: 8 }}>Assets</td></tr>
                    {renderRows(projection.balanceSheet.assets)}
                    <tr><td className="fw-700 text-sm" style={{ borderTop: '1px solid var(--border)' }}>Total Assets</td><td className="fw-700 text-sm text-success" style={{ textAlign: 'right', borderTop: '1px solid var(--border)' }}>{fmt(projection.balanceSheet.totalAssets)}</td></tr>
                    <tr><td colSpan={2} className="fw-700 text-sm" style={{ color: 'var(--warning)', paddingTop: 12 }}>Liabilities</td></tr>
                    {renderRows(projection.balanceSheet.liabilities)}
                    <tr><td className="fw-700 text-sm" style={{ borderTop: '1px solid var(--border)' }}>Total Liabilities</td><td className="fw-700 text-sm text-warning" style={{ textAlign: 'right', borderTop: '1px solid var(--border)' }}>{fmt(projection.balanceSheet.totalLiabilities)}</td></tr>
                    <tr><td colSpan={2} className="fw-700 text-sm" style={{ color: 'var(--success)', paddingTop: 12 }}>Equity</td></tr>
                    {renderRows(projection.balanceSheet.equity || [])}
                    <tr><td className="fw-700 text-sm" style={{ borderTop: '1px solid var(--border)' }}>Total Equity</td><td className="fw-700 text-sm text-success" style={{ textAlign: 'right', borderTop: '1px solid var(--border)' }}>{fmt(projection.balanceSheet.totalEquity)}</td></tr>
                    <tr><td className="fw-700 text-sm" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>Balance Check</td><td className="fw-700 text-sm" style={{ textAlign: 'right', borderTop: '1px solid var(--border)', paddingTop: 12, color: Math.abs(projection.balanceSheet.totalAssets - (projection.balanceSheet.totalLiabilities + projection.balanceSheet.totalEquity)) < 0.01 ? 'var(--success)' : 'var(--danger)' }}>
                      {Math.abs(projection.balanceSheet.totalAssets - (projection.balanceSheet.totalLiabilities + projection.balanceSheet.totalEquity)) < 0.01 ? '✓ Balanced' : '✗ Out of Balance'}
                    </td></tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )
      }

      case 'profit-loss':
        return (
          <div className="card card-table">
            <div className="card-header">
              <span className="card-title">Profit & Loss</span>
              <button className="text-xs fw-500" style={{ color: 'var(--primary)', background: 'none', border: '1px solid var(--primary)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }} onClick={() => handleExport('profit-loss')}>Export CSV</button>
            </div>
            <div className="card-body">
              {projection.profitLoss.revenue.length === 0 && projection.profitLoss.expenses.length === 0 ? (
                <div className="text-center text-secondary text-sm" style={{ padding: '40px 0' }}>No P&L data. Post vouchers to see data.</div>
              ) : (
                <table className="property-table" style={{ width: '100%' }}>
                  <thead><tr><th>Account</th><th style={{ textAlign: 'right', width: 150 }}>Amount ({currency})</th></tr></thead>
                  <tbody>
                    {projection.profitLoss.revenue.map(e => (
                      <tr key={e.accountId}>
                        <td className="text-sm">{e.accountName} <span className="text-mono text-xs text-secondary">{e.accountCode}</span></td>
                        <td className="text-mono text-xs fw-600 text-success" style={{ textAlign: 'right' }}>{fmt(e.balance)}</td>
                      </tr>
                    ))}
                    <tr><td className="fw-700 text-sm" style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>Total Revenue</td><td className="fw-700 text-sm text-success" style={{ textAlign: 'right', borderTop: '1px solid var(--border)', paddingTop: 8 }}>{fmt(projection.profitLoss.totalRevenue)}</td></tr>
                    {projection.profitLoss.expenses.map(e => (
                      <tr key={e.accountId}>
                        <td className="text-sm">{e.accountName} <span className="text-mono text-xs text-secondary">{e.accountCode}</span></td>
                        <td className="text-mono text-xs fw-600 text-danger" style={{ textAlign: 'right' }}>{fmt(e.balance)}</td>
                      </tr>
                    ))}
                    <tr><td className="fw-700 text-sm" style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>Total Expenses</td><td className="fw-700 text-sm text-danger" style={{ textAlign: 'right', borderTop: '1px solid var(--border)', paddingTop: 8 }}>{fmt(projection.profitLoss.totalExpenses)}</td></tr>
                    <tr><td className="fw-700 text-sm" style={{ borderTop: '2px solid var(--border)', paddingTop: 8 }}>Net Income</td><td className={`fw-700 text-sm ${projection.profitLoss.netIncome >= 0 ? 'text-success' : 'text-danger'}`} style={{ textAlign: 'right', borderTop: '2px solid var(--border)', paddingTop: 8 }}>{fmt(projection.profitLoss.netIncome)}</td></tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )

      case 'trial-balance':
        return (
          <div className="card card-table">
            <div className="card-header">
              <span className="card-title">Trial Balance</span>
              <button className="text-xs fw-500" style={{ color: 'var(--primary)', background: 'none', border: '1px solid var(--primary)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }} onClick={() => handleExport('trial-balance')}>Export CSV</button>
            </div>
            <div className="card-body">
              {tbEntries.length === 0 ? (
                <div className="text-center text-secondary text-sm" style={{ padding: '40px 0' }}>No trial balance data.</div>
              ) : (
                <table className="property-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Account</th>
                      <th style={{ textAlign: 'right' }}>Debit</th>
                      <th style={{ textAlign: 'right' }}>Credit</th>
                      <th style={{ textAlign: 'right' }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tbEntries.map(e => (
                      <tr key={e.accountId}>
                        <td className="text-mono text-xs">{e.accountCode}</td>
                        <td className="text-sm">{e.accountName}</td>
                        <td className="text-mono text-xs" style={{ textAlign: 'right' }}>{e.totalDebit > 0 ? fmt(e.totalDebit) : '—'}</td>
                        <td className="text-mono text-xs" style={{ textAlign: 'right' }}>{e.totalCredit > 0 ? fmt(e.totalCredit) : '—'}</td>
                        <td className={`text-mono text-xs fw-600 ${e.balance >= 0 ? 'text-success' : 'text-danger'}`} style={{ textAlign: 'right' }}>{fmt(e.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )

      case 'holdings':
        return (
          <div className="card card-table">
            <div className="card-header">
              <span className="card-title">Investment Holdings</span>
              <button className="text-xs fw-500" style={{ color: 'var(--primary)', background: 'none', border: '1px solid var(--primary)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }} onClick={() => handleExport('holdings')}>Export CSV</button>
            </div>
            <div className="card-body">
              {holdings.length === 0 ? (
                <div className="text-center text-secondary text-sm" style={{ padding: '40px 0' }}>No investment holdings yet.</div>
              ) : (
                <table className="property-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th style={{ textAlign: 'right' }}>Purchase Value</th>
                      <th style={{ textAlign: 'right' }}>Current Value</th>
                      <th style={{ textAlign: 'right' }}>Unrealized Gain</th>
                      <th style={{ textAlign: 'right' }}>Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map(h => (
                      <tr key={h.accountId}>
                        <td className="text-sm fw-500">{h.assetName} <span className="text-mono text-xs text-secondary">{h.assetCode}</span></td>
                        <td className="text-mono text-xs" style={{ textAlign: 'right' }}>{fmt(h.purchaseValue)}</td>
                        <td className="text-mono text-xs" style={{ textAlign: 'right' }}>{fmt(h.currentValue)}</td>
                        <td className={`text-mono text-xs fw-600 ${h.unrealizedGain >= 0 ? 'text-success' : 'text-danger'}`} style={{ textAlign: 'right' }}>{fmt(h.unrealizedGain)}</td>
                        <td className={`text-mono text-xs fw-600 ${h.growthPercent >= 0 ? 'text-success' : 'text-danger'}`} style={{ textAlign: 'right' }}>{h.growthPercent.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )

      case 'cash-position':
        return (
          <div className="card card-table">
            <div className="card-body">
              <table className="property-table" style={{ width: '100%' }}>
                <thead><tr><th>Position</th><th style={{ textAlign: 'right', width: 150 }}>Amount ({currency})</th></tr></thead>
                <tbody>
                  <tr>
                    <td className="text-sm">Cash In Hand</td>
                    <td className="text-mono text-xs fw-600 text-success" style={{ textAlign: 'right' }}>{fmt(projection.cashPosition.cashOnHand)}</td>
                  </tr>
                  <tr>
                    <td className="text-sm">Bank Accounts</td>
                    <td className="text-mono text-xs fw-600 text-success" style={{ textAlign: 'right' }}>{fmt(projection.cashPosition.bankBalance)}</td>
                  </tr>
                  <tr>
                    <td className="text-sm">Total Liquid Assets</td>
                    <td className="text-mono text-xs fw-600" style={{ textAlign: 'right', borderTop: '1px solid var(--border)' }}>{fmt(projection.cashPosition.totalLiquid)}</td>
                  </tr>
                  <tr>
                    <td className="text-sm">Investments</td>
                    <td className="text-mono text-xs fw-600 text-purple" style={{ textAlign: 'right' }}>{fmt(projection.cashPosition.investments)}</td>
                  </tr>
                  <tr>
                    <td className="text-sm">Receivables</td>
                    <td className="text-mono text-xs fw-600 text-warning" style={{ textAlign: 'right' }}>{fmt(projection.cashPosition.receivables)}</td>
                  </tr>
                  <tr>
                    <td className="text-sm fw-600" style={{ borderTop: '2px solid var(--border)' }}>Total Assets</td>
                    <td className="text-mono text-xs fw-700" style={{ textAlign: 'right', borderTop: '2px solid var(--border)' }}>{fmt(projection.cashPosition.totalAssets)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )

      case 'investment-position':
        return (
          <div className="card card-table">
            <div className="card-header">
              <span className="card-title">Investment Position</span>
              <button className="text-xs fw-500" style={{ color: 'var(--primary)', background: 'none', border: '1px solid var(--primary)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }} onClick={() => handleExport('investment-position')}>Export CSV</button>
            </div>
            <div className="card-body">
              {projection.investmentPosition.length === 0 ? (
                <div className="text-center text-secondary text-sm" style={{ padding: '40px 0' }}>No investment position data. Record purchases and post vouchers.</div>
              ) : (
                <table className="property-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Code</th>
                      <th style={{ textAlign: 'right' }}>Cost Basis</th>
                      <th style={{ textAlign: 'right' }}>Current Value</th>
                      <th style={{ textAlign: 'right' }}>Unrealized Gain</th>
                      <th style={{ textAlign: 'right' }}>Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projection.investmentPosition.map((r, i) => (
                      <tr key={r.accountCode + i}>
                        <td className="text-sm fw-500">{r.assetName} <span className="text-xs text-secondary">{formatAssetType(r.assetType)}</span></td>
                        <td className="text-mono text-xs">{r.accountCode}</td>
                        <td className="text-mono text-xs" style={{ textAlign: 'right' }}>{fmt(r.costBasis)}</td>
                        <td className="text-mono text-xs" style={{ textAlign: 'right' }}>{fmt(r.currentValue)}</td>
                        <td className={`text-mono text-xs fw-600 ${r.unrealizedGain >= 0 ? 'text-success' : 'text-danger'}`} style={{ textAlign: 'right' }}>{fmt(r.unrealizedGain)}</td>
                        <td className={`text-mono text-xs fw-600 ${r.growthPercent >= 0 ? 'text-success' : 'text-danger'}`} style={{ textAlign: 'right' }}>{r.growthPercent.toFixed(1)}%</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={2} className="fw-700 text-sm" style={{ borderTop: '1px solid var(--border)' }}>Total</td>
                      <td className="text-mono text-xs fw-600" style={{ textAlign: 'right', borderTop: '1px solid var(--border)' }}>{fmt(projection.investmentPosition.reduce((s, r) => s + r.costBasis, 0))}</td>
                      <td className="text-mono text-xs fw-600" style={{ textAlign: 'right', borderTop: '1px solid var(--border)' }}>{fmt(projection.investmentPosition.reduce((s, r) => s + r.currentValue, 0))}</td>
                      <td className="text-mono text-xs fw-600" style={{ textAlign: 'right', borderTop: '1px solid var(--border)' }}>{fmt(projection.investmentPosition.reduce((s, r) => s + r.unrealizedGain, 0))}</td>
                      <td style={{ borderTop: '1px solid var(--border)' }} />
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )

      case 'purchase-report':
        return (
          <div className="card card-table">
            <div className="card-header">
              <span className="card-title">Purchase Report</span>
              <button className="text-xs fw-500" style={{ color: 'var(--primary)', background: 'none', border: '1px solid var(--primary)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }} onClick={() => handleExport('purchase-report')}>Export CSV</button>
            </div>
            <div className="card-body">
              {projection.purchaseReport.length === 0 ? (
                <div className="text-center text-secondary text-sm" style={{ padding: '40px 0' }}>No purchase records yet.</div>
              ) : (
                <table className="property-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Asset</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th>Account</th>
                      <th>Voucher</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projection.purchaseReport.map(r => (
                      <tr key={r.id}>
                        <td className="text-xs text-secondary">{r.date}</td>
                        <td className="text-sm">{r.assetName} <span className="text-xs text-secondary">{formatAssetType(r.assetType)}</span></td>
                        <td className="text-mono text-xs" style={{ textAlign: 'right' }}>{r.quantity.toLocaleString()}</td>
                        <td className="text-mono text-xs" style={{ textAlign: 'right' }}>{fmt(r.unitPrice)}</td>
                        <td className="text-mono text-xs fw-600" style={{ textAlign: 'right' }}>{fmt(r.totalValue)}</td>
                        <td className="text-mono text-xs">{r.accountCode}</td>
                        <td className="text-mono text-xs">{r.voucherNumber}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={4} className="fw-700 text-sm" style={{ borderTop: '1px solid var(--border)' }}>Total</td>
                      <td className="text-mono text-xs fw-600" style={{ textAlign: 'right', borderTop: '1px solid var(--border)' }}>{fmt(projection.purchaseReport.reduce((s, r) => s + r.totalValue, 0))}</td>
                      <td colSpan={2} style={{ borderTop: '1px solid var(--border)' }} />
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )

      case 'bank-position':
        return (
          <div className="card card-table">
            <div className="card-header">
              <span className="card-title">Bank Position — Ledger vs Statement</span>
              <button className="text-xs fw-500" style={{ color: 'var(--primary)', background: 'none', border: '1px solid var(--primary)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }} onClick={() => handleExport('bank-position')}>Export CSV</button>
            </div>
            <div className="card-body">
              {projection.bankPosition.length === 0 ? (
                <div className="text-center text-secondary text-sm" style={{ padding: '40px 0' }}>No bank accounts set up. Add bank accounts and mappings.</div>
              ) : (
                <table className="property-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Bank Account</th>
                      <th style={{ textAlign: 'right' }}>Ledger Balance</th>
                      <th style={{ textAlign: 'right' }}>Statement Balance</th>
                      <th style={{ textAlign: 'right' }}>Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projection.bankPosition.map((r, i) => {
                      const ba = bankAccounts[i]
                      return (
                      <tr key={i}>
                        <td className="text-sm">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BankAccountAvatar bank={ba || null} size={24} />
                            <span>{r.bankName}</span>
                          </div>
                        </td>
                        <td className="text-mono text-xs" style={{ textAlign: 'right' }}>{fmt(r.ledgerBalance)}</td>
                        <td className="text-mono text-xs" style={{ textAlign: 'right' }}>{fmt(r.bankBalance)}</td>
                        <td className={`text-mono text-xs fw-600 ${r.difference >= 0 ? 'text-success' : 'danger'}`} style={{ textAlign: 'right' }}>{fmt(r.difference)}</td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
              {projection.bankPosition.length > 0 && (
                <div className="text-xs text-secondary mt-2">
                  Tip: Link bank accounts to chart of accounts via Bank Mappings for accurate ledger comparison.
                </div>
              )}
            </div>
          </div>
        )

      case 'cash-flow':
        return (
          <div className="card card-table">
            <div className="card-header">
              <span className="card-title">Statement of Cash Flows</span>
              <button className="text-xs fw-500" style={{ color: 'var(--primary)', background: 'none', border: '1px solid var(--primary)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }} onClick={() => handleExport('cash-flow')}>Export CSV</button>
            </div>
            <div className="card-body">
              <table className="property-table" style={{ width: '100%' }}>
                <thead><tr><th>Category</th><th style={{ textAlign: 'right', width: 150 }}>Amount ({currency})</th></tr></thead>
                <tbody>
                  <tr><td colSpan={2} className="fw-700 text-sm" style={{ color: 'var(--primary)', paddingTop: 8 }}>Operating Activities</td></tr>
                  {projection.cashFlow.operating.length === 0 ? (
                    <tr><td className="text-xs text-secondary" colSpan={2}>No operating activities</td></tr>
                  ) : projection.cashFlow.operating.map((c, i) => (
                    <tr key={`op-${i}`}>
                      <td className="text-sm">{c.category}</td>
                      <td className={`text-mono text-xs fw-600 ${c.amount >= 0 ? 'text-success' : 'text-danger'}`} style={{ textAlign: 'right' }}>{fmt(c.amount)}</td>
                    </tr>
                  ))}
                  <tr><td className="fw-700 text-sm" style={{ borderTop: '1px solid var(--border)' }}>Net Operating Cash Flow</td><td className={`fw-700 text-sm ${projection.cashFlow.totalOperating >= 0 ? 'text-success' : 'text-danger'}`} style={{ textAlign: 'right', borderTop: '1px solid var(--border)' }}>{fmt(projection.cashFlow.totalOperating)}</td></tr>
                  <tr><td colSpan={2} className="fw-700 text-sm" style={{ color: 'var(--accent)', paddingTop: 12 }}>Investing Activities</td></tr>
                  {projection.cashFlow.investing.length === 0 ? (
                    <tr><td className="text-xs text-secondary" colSpan={2}>No investing activities</td></tr>
                  ) : projection.cashFlow.investing.map((c, i) => (
                    <tr key={`inv-${i}`}>
                      <td className="text-sm">{c.category}</td>
                      <td className={`text-mono text-xs fw-600 ${c.amount >= 0 ? 'text-success' : 'text-danger'}`} style={{ textAlign: 'right' }}>{fmt(c.amount)}</td>
                    </tr>
                  ))}
                  <tr><td className="fw-700 text-sm" style={{ borderTop: '1px solid var(--border)' }}>Net Investing Cash Flow</td><td className={`fw-700 text-sm ${projection.cashFlow.totalInvesting >= 0 ? 'text-success' : 'text-danger'}`} style={{ textAlign: 'right', borderTop: '1px solid var(--border)' }}>{fmt(projection.cashFlow.totalInvesting)}</td></tr>
                  <tr><td colSpan={2} className="fw-700 text-sm" style={{ color: 'var(--warning)', paddingTop: 12 }}>Financing Activities</td></tr>
                  {projection.cashFlow.financing.length === 0 ? (
                    <tr><td className="text-xs text-secondary" colSpan={2}>No financing activities</td></tr>
                  ) : projection.cashFlow.financing.map((c, i) => (
                    <tr key={`fin-${i}`}>
                      <td className="text-sm">{c.category}</td>
                      <td className={`text-mono text-xs fw-600 ${c.amount >= 0 ? 'text-success' : 'text-danger'}`} style={{ textAlign: 'right' }}>{fmt(c.amount)}</td>
                    </tr>
                  ))}
                  <tr><td className="fw-700 text-sm" style={{ borderTop: '1px solid var(--border)' }}>Net Financing Cash Flow</td><td className={`fw-700 text-sm ${projection.cashFlow.totalFinancing >= 0 ? 'text-success' : 'text-danger'}`} style={{ textAlign: 'right', borderTop: '1px solid var(--border)' }}>{fmt(projection.cashFlow.totalFinancing)}</td></tr>
                  <tr><td className="fw-700 text-sm" style={{ borderTop: '2px solid var(--border)', paddingTop: 8 }}>Net Cash Flow</td><td className={`fw-700 text-sm ${projection.cashFlow.netCashFlow >= 0 ? 'text-success' : 'text-danger'}`} style={{ textAlign: 'right', borderTop: '2px solid var(--border)', paddingTop: 8 }}>{fmt(projection.cashFlow.netCashFlow)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )

      case 'general-journal':
        return (
          <div className="card card-table">
            <div className="card-header">
              <span className="card-title">General Journal — {projection.generalJournal.length} entries</span>
            </div>
            <div className="card-body">
              {projection.generalJournal.length === 0 ? (
                <div className="text-center text-secondary text-sm" style={{ padding: '40px 0' }}>No posted vouchers yet.</div>
              ) : (
                projection.generalJournal.map(entry => (
                  <div key={entry.voucherNumber} className="card-accent-purple" style={{ marginBottom: 12, padding: 12, borderRadius: 8 }}>
                    <div className="text-xs fw-600 mb-1">
                      {entry.voucherNumber} — {entry.date} — <span className="text-secondary">{entry.voucherType}</span>
                    </div>
                    <div className="text-xs text-secondary mb-2">{entry.description}</div>
                    <table className="property-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Account</th>
                          <th style={{ textAlign: 'right' }}>Debit</th>
                          <th style={{ textAlign: 'right' }}>Credit</th>
                          <th>Narration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.lines.map((l, i) => (
                          <tr key={i}>
                            <td className="text-mono text-xs">{l.accountCode}</td>
                            <td className="text-xs">{l.accountName}</td>
                            <td className="text-mono text-xs text-success" style={{ textAlign: 'right' }}>{l.debit > 0 ? fmt(l.debit) : '—'}</td>
                            <td className="text-mono text-xs text-danger" style={{ textAlign: 'right' }}>{l.credit > 0 ? fmt(l.credit) : '—'}</td>
                            <td className="text-xs text-secondary">{l.narration}</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={2} className="fw-600 text-xs" style={{ borderTop: '1px solid var(--border)' }}>Totals</td>
                          <td className="text-mono text-xs fw-600" style={{ textAlign: 'right', borderTop: '1px solid var(--border)' }}>{fmt(entry.totalDebit)}</td>
                          <td className="text-mono text-xs fw-600" style={{ textAlign: 'right', borderTop: '1px solid var(--border)' }}>{fmt(entry.totalCredit)}</td>
                          <td style={{ borderTop: '1px solid var(--border)' }} />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          </div>
        )

      case 'general-ledger':
        return (
          <div className="card card-table">
            <div className="card-header">
              <span className="card-title">General Ledger — {projection.generalLedger.length} accounts</span>
            </div>
            <div className="card-body">
              {projection.generalLedger.length === 0 ? (
                <div className="text-center text-secondary text-sm" style={{ padding: '40px 0' }}>No ledger activity yet.</div>
              ) : (
                <table className="property-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Account</th>
                      <th style={{ textAlign: 'right' }}>Opening</th>
                      <th style={{ textAlign: 'right' }}>Debit Total</th>
                      <th style={{ textAlign: 'right' }}>Credit Total</th>
                      <th style={{ textAlign: 'right' }}>Closing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projection.generalLedger.map(r => (
                      <tr key={r.accountCode}>
                        <td className="text-mono text-xs">{r.accountCode}</td>
                        <td className="text-sm">{r.accountName}</td>
                        <td className="text-mono text-xs" style={{ textAlign: 'right' }}>{fmt(r.openingBalance)}</td>
                        <td className="text-mono text-xs" style={{ textAlign: 'right' }}>{r.debitTotal > 0 ? fmt(r.debitTotal) : '—'}</td>
                        <td className="text-mono text-xs" style={{ textAlign: 'right' }}>{r.creditTotal > 0 ? fmt(r.creditTotal) : '—'}</td>
                        <td className={`text-mono text-xs fw-600 ${r.closingBalance >= 0 ? 'text-success' : 'text-danger'}`} style={{ textAlign: 'right' }}>{fmt(r.closingBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )
    }
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-header-left">
          <div>
            <div className="page-title">Reports</div>
            <div className="page-subtitle">Accounting-driven investment reports</div>
          </div>
        </div>
        <div className="page-header-right">
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
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            Export Excel (Professional)
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="tabs" style={{ marginBottom: 20, borderRadius: 'var(--radius)', overflow: 'hidden', flexWrap: 'wrap' }}>
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
        onExport={handleExcelGeneration}
        module="Investment"
        accounts={accounts}
        filters={{
          filterStart,
          filterEnd,
          filterVType,
          filterStatus,
          filterBank,
          filterAccount,
          filterAsset,
        }}
        onFiltersChange={(partial) => {
          if (partial.filterStart !== undefined) setFilterStart(partial.filterStart)
          if (partial.filterEnd !== undefined) setFilterEnd(partial.filterEnd)
          if (partial.filterVType !== undefined) setFilterVType(partial.filterVType)
          if (partial.filterStatus !== undefined) setFilterStatus(partial.filterStatus)
          if (partial.filterBank !== undefined) setFilterBank(partial.filterBank)
          if (partial.filterAccount !== undefined) setFilterAccount(partial.filterAccount)
          if (partial.filterAsset !== undefined) setFilterAsset(partial.filterAsset)
        }}
        holdings={holdings}
      />
    </>
  )
}
