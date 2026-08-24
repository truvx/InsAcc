import React, { useMemo, useState } from 'react'
import type { Account, Voucher } from '../accounting/types'
import { buildAccountTree } from '../accounting/chartOfAccountsService'
import { generateChartOfAccountsReadModel, generateTrialBalanceReadModel, generateProfitAndLossReadModel, generateBalanceSheetReadModel } from '../readModels/accountingReadModels'
import { EmptyState, Modal, Button, ChevronDownIcon } from './design/DesignSystem'
import AccountDrillDown from './AccountDrillDown'
import Toast from './Toast'

import { Landmark, ListChecks, Download } from 'lucide-react'
import { CurrencyText } from './design/CurrencyText'
import { exportSideBySideReport } from '../services/reportExportService'

interface Props {
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
  loggedInUser?: string
}

interface TreeNode {
  account: Account
  children: TreeNode[]
  depth: number
}

function flatRowsFromTree(
  nodes: TreeNode[],
  balances: Record<string, number>,
  allowedTypes: string[],
): Array<{ account: Account; depth: number; balance: number }> {
  const rows: Array<{ account: Account; depth: number; balance: number }> = []
  for (const node of nodes) {
    if (!allowedTypes.includes(node.account.type)) continue
    rows.push({ account: node.account, depth: node.depth, balance: balances[node.account.id] || 0 })
    if (node.children.length > 0) {
      rows.push(...flatRowsFromTree(node.children, balances, allowedTypes))
    }
  }
  return rows
}

export default function InvestmentBalanceSheet({ currency = 'AED', accounts, vouchers, loggedInUser }: Props) {
  const [drillAccountId, setDrillAccountId] = useState<string | null>(null)
  const [drillAccountName, setDrillAccountName] = useState<string>('')
  const [dateTo, setDateTo] = useState('')

  const filteredVouchers = useMemo(() => {
    let vList = vouchers
    if (dateTo) vList = vList.filter(v => v.date <= dateTo)
    return vList
  }, [vouchers, dateTo])

  const coaEntries = useMemo(() => generateChartOfAccountsReadModel(accounts, filteredVouchers), [accounts, filteredVouchers])
  const tbEntries = useMemo(() => generateTrialBalanceReadModel(coaEntries), [coaEntries])
  const plModel = useMemo(() => generateProfitAndLossReadModel(tbEntries, accounts), [tbEntries, accounts])
  const bsModel = useMemo(() => generateBalanceSheetReadModel(tbEntries, plModel.netProfit, accounts), [tbEntries, plModel.netProfit, accounts])

  const balances = useMemo(() => {
    const map: Record<string, number> = {}
    for (const entry of coaEntries) {
      map[entry.id] = entry.currentBalance
    }
    // Net profit/loss is already included in the ledger balances via the accounting read model
    // Do NOT manually inject it here - this would double-count
    return map
  }, [coaEntries])

  const tree = useMemo(() => buildAccountTree(accounts) as unknown as TreeNode[], [accounts])

  const assetRows = useMemo(() => flatRowsFromTree(tree, balances, ['asset']).filter(r => r.depth > 0).map(r => ({ ...r, depth: r.depth - 1 })), [tree, balances])
  const liabilityRows = useMemo(() => flatRowsFromTree(tree, balances, ['liability']).filter(r => r.depth > 0).map(r => ({ ...r, depth: r.depth - 1 })), [tree, balances])
  const rawEquityRows = useMemo(() => flatRowsFromTree(tree, balances, ['equity']).filter(r => r.account.code !== '3200' && r.depth > 0).map(r => ({ ...r, depth: r.depth - 1 })), [tree, balances])

  const equityRows = useMemo(() => {
    if (bsModel.currentYearProfit === 0) return rawEquityRows
    return rawEquityRows.concat({
      account: {
        id: '__currentYearEarnings__', code: 'CYE', name: 'Current Year Earnings',
        type: 'equity', normalBalance: 'credit', parentId: null, isActive: true,
        description: '', currency, createdAt: '', updatedAt: '',
      } as Account,
      depth: 0,
      balance: bsModel.currentYearProfit,
    })
  }, [rawEquityRows, bsModel.currentYearProfit, currency])

  const totalAssets = bsModel.totalAssets
  const totalLiabilities = bsModel.totalLiabilities
  const totalEquity = bsModel.totalEquity
  const isBalanced = bsModel.balanced

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    rows: Array<{ account: Account; depth: number; balance: number }>,
    total: number,
    accentColor: string,
  ) => (
    <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--divider)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', color: accentColor }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 16, color: accentColor }}>{title}</span>
        <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' }}>
          {rows.filter(r => r.depth === 0).length} sections
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--divider)', background: 'var(--bg-tertiary)', position: 'sticky', top: 0 }}>Account</th>
              <th style={{ padding: '8px 20px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--divider)', background: 'var(--bg-tertiary)', position: 'sticky', top: 0, width: 160 }}>Balance ({currency})</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                  No {title.toLowerCase()} data
                </td>
              </tr>
            ) : (
              rows.map(row => {
                const isGroup = row.depth === 0
                const isSubGroup = row.depth === 1
                return (
                  <tr
                    key={row.account.id}
                    onClick={() => {
                      setDrillAccountId(row.account.id)
                      setDrillAccountName(row.account.name)
                    }}
                    style={{
                      cursor: 'pointer',
                      background: 'transparent',
                    }}
                    className="hover-bg-secondary"
                  >
                    <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--divider)' }}>
                      <div style={{ paddingLeft: isGroup ? 0 : isSubGroup ? 16 : 32 }}>
                        {isGroup && <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{row.account.name}</span>}
                        {!isGroup && (
                          <>
                            <span style={{ fontWeight: isSubGroup ? 500 : 400, fontSize: 13, color: 'var(--text-secondary)' }}>{row.account.name}</span>
                            {!isSubGroup && <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>{row.account.code}</span>}
                          </>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', borderBottom: '1px solid var(--divider)' }}>
                      <CurrencyText
                        value={row.balance}
                        currency={currency}
                        className={isGroup ? 'fw-600' : 'fw-500'}
                        style={{ color: isGroup ? accentColor : undefined }}
                      />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <div style={{
        padding: '14px 20px', borderTop: '1px solid var(--divider)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'var(--bg-secondary)',
        flexShrink: 0
      }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: accentColor }}>Total {title}</span>
        <CurrencyText value={total} currency={currency} className="text-md fw-700" style={{ color: accentColor }} />
      </div>
    </div>
  )

  const [showExportMenu, setShowExportMenu] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const handleExport = (format: 'pdf' | 'xlsx' | 'csv') => {
    setShowExportMenu(false)
    exportSideBySideReport({ generatedBy: loggedInUser,
      format,
      title: 'Balance Sheet',
      subtitle: 'Financial position at a glance',
      periodLabel: dateTo ? `As of ${dateTo}` : 'All Time',
      currency: currency,
      filename: `Balance_Sheet_${new Date().toISOString().split('T')[0]}`,
      leftCol: {
        title: 'Assets',
        rows: assetRows.map(r => [
          { content: r.account.name, styles: { paddingLeft: 10 + r.depth * 5 } },
          { content: r.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { halign: 'right' } }
        ]),
        total: totalAssets,
        accentColor: '#0A0A6F'
      },
      rightCol: {
        title: 'Liabilities & Equity',
        rows: [
          [{ content: 'Liabilities', colSpan: 2, styles: { fillColor: [248, 251, 249], fontStyle: 'bold', textColor: '#D97706' } }],
          ...liabilityRows.map(r => [
            { content: r.account.name, styles: { paddingLeft: 10 + r.depth * 5 } },
            { content: r.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { halign: 'right' } }
          ]),
          [{ content: 'Equity', colSpan: 2, styles: { fillColor: [248, 251, 249], fontStyle: 'bold', textColor: '#059669' } }],
          ...equityRows.map(r => [
            { content: r.account.name, styles: { paddingLeft: 10 + r.depth * 5 } },
            { content: r.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { halign: 'right' } }
          ])
        ],
        total: totalLiabilities + totalEquity,
        accentColor: '#D97706'
      },
      footer: {
        label: 'Balance Difference',
        value: Math.abs(totalAssets - (totalLiabilities + totalEquity))
      }
    }).then(() => {
      setToast({ visible: true, message: 'Exported successfully', type: 'success' })
    }).catch(e => {
      setToast({ visible: true, message: 'Export failed: ' + (e.message || e), type: 'error' })
    })
  }

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
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

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Balance Sheet</div>
            <div className="page-subtitle">Financial position at a glance</div>
          </div>
        </div>
        <div className="page-header-right" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-tertiary)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--divider)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>As Of</span>
            <input
              type="date"
              className="data-table-search-input"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={{ padding: '4px 8px', fontSize: 13, background: 'transparent', border: 'none', width: 'auto' }}
            />
            {dateTo && (
              <button
                onClick={() => setDateTo('')}
                className="btn-icon"
                style={{ width: 24, height: 24, background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
                title="Clear date"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <Button variant="secondary" size="sm" onClick={() => setShowExportMenu(!showExportMenu)}>
              Export <ChevronDownIcon />
            </Button>
            {showExportMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, width: 140, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <button className="export-menu-item" onClick={() => handleExport('pdf')}>PDF (.pdf)</button>
                <button className="export-menu-item" onClick={() => handleExport('xlsx')}>Excel (.xlsx)</button>
                <button className="export-menu-item" onClick={() => handleExport('csv')}>CSV (.csv)</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
          {renderSection('Assets', <Landmark size={15} strokeWidth={1.75} />, assetRows, totalAssets, '#0A0A6F')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
            {renderSection('Liabilities', <ListChecks size={15} strokeWidth={1.75} />, liabilityRows, totalLiabilities, '#D97706')}
            {renderSection('Equity', <Landmark size={15} strokeWidth={1.75} />, equityRows, totalEquity, '#059669')}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div className="card" style={{ padding: '16px 20px', borderTop: '3px solid #0A0A6F' }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Total Assets</div>
            <CurrencyText value={totalAssets} currency={currency} className="text-md fw-700" style={{ color: '#0A0A6F' }} />
          </div>
          <div className="card" style={{ padding: '16px 20px', borderTop: '3px solid #D97706' }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Total Liabilities</div>
            <CurrencyText value={totalLiabilities} currency={currency} className="text-md fw-700" style={{ color: '#D97706' }} />
          </div>
          <div className="card" style={{ padding: '16px 20px', borderTop: '3px solid #059669' }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Total Equity</div>
            <CurrencyText value={totalEquity} currency={currency} className="text-md fw-700" style={{ color: '#059669' }} />
          </div>
          <div className="card" style={{ padding: '16px 20px', borderTop: `3px solid ${isBalanced ? '#22C55E' : '#EF4444'}` }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Balance Check</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: isBalanced ? '#22C55E' : '#EF4444' }}>
              {isBalanced ? '✓ Balanced' : '✗ Out of Balance'}
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
              Assets = Liabilities + Equity
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
