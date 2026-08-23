import React, { useMemo, useState } from 'react'
import type { Account, Voucher } from '../accounting/types'
import { buildAccountTree } from '../accounting/chartOfAccountsService'
import { generateChartOfAccountsReadModel, generateTrialBalanceReadModel, generateProfitAndLossReadModel } from '../readModels/accountingReadModels'
import { EmptyState, Modal, Input, Select, Button } from './design/DesignSystem'
import AccountDrillDown from './AccountDrillDown'
import { exportSideBySidePdf } from '../services/reportExportService'
import Toast from './Toast'

import { TrendingUp, TrendingDown, Filter, Download } from 'lucide-react'
import { CurrencyText } from './design/CurrencyText'

import type { PropertyEntry, LeaseEntry } from '../data/propertyTypes'

interface Props {
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
  properties?: PropertyEntry[]
  leases?: LeaseEntry[]
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

export default function PropertyProfitLoss({ currency = 'AED', accounts, vouchers, properties = [], leases = [], loggedInUser }: Props) {
  const [drillAccountId, setDrillAccountId] = useState<string | null>(null)
  const [drillAccountName, setDrillAccountName] = useState<string>('')
  const [filterPropertyId, setFilterPropertyId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const filteredVouchers = useMemo(() => {
    let vList = vouchers
    if (dateFrom) vList = vList.filter(v => v.date >= dateFrom)
    if (dateTo) vList = vList.filter(v => v.date <= dateTo)

    if (!filterPropertyId) return vList
    
    const targetPropName = properties.find(p => p.id === filterPropertyId)?.name

    return vList.map(v => {
      const leaseByVoucherRef = v.reference ? leases.find(l => l.leaseNumber === v.reference) : undefined
      const isVoucherLinkedToProp = !!leaseByVoucherRef && leaseByVoucherRef.propertyId === filterPropertyId
      const isVoucherTaggedToProp = !!targetPropName && !!v.tags?.includes(targetPropName)

      if (isVoucherTaggedToProp) {
        return v
      }

      const filteredLines = v.lines.filter(l => {
        if (isVoucherLinkedToProp) return true
        if (l.referenceType === 'Property' && l.referenceId === filterPropertyId) return true
        if (l.referenceType === 'Lease' && l.referenceId) {
          const lease = leases.find(lease => lease.id === l.referenceId)
          if (lease?.propertyId === filterPropertyId) return true
        }
        return false
      })
      
      return { ...v, lines: filteredLines }
    }).filter(v => v.lines.length > 0)
  }, [vouchers, filterPropertyId, leases, properties, dateFrom, dateTo])

  const coaEntries = useMemo(() => generateChartOfAccountsReadModel(accounts, filteredVouchers, !!filterPropertyId), [accounts, filteredVouchers, filterPropertyId])
  
  const balances = useMemo(() => {
    const map: Record<string, number> = {}
    for (const entry of coaEntries) {
      map[entry.id] = entry.currentBalance
    }
    return map
  }, [coaEntries])

  const tbEntries = useMemo(() => generateTrialBalanceReadModel(coaEntries), [coaEntries])
  
  const plModel = useMemo(() => generateProfitAndLossReadModel(tbEntries, accounts), [tbEntries, accounts])

  const tree = useMemo(() => buildAccountTree(accounts) as unknown as TreeNode[], [accounts])

  const revenueRows = useMemo(() => {
    const rows = flatRowsFromTree(tree, balances, ['revenue']).filter(r => r.depth > 0).map(r => ({ ...r, depth: r.depth - 1 }))
    return filterPropertyId ? rows.filter(r => r.balance !== 0) : rows
  }, [tree, balances, filterPropertyId])
  
  const expenseRows = useMemo(() => {
    const rows = flatRowsFromTree(tree, balances, ['expense']).filter(r => r.depth > 0).map(r => ({ ...r, depth: r.depth - 1 }))
    return filterPropertyId ? rows.filter(r => r.balance !== 0) : rows
  }, [tree, balances, filterPropertyId])

  const totalRevenue = plModel.totalRevenue
  const totalExpenses = plModel.totalExpenses
  const netIncome = plModel.netProfit

  const hasAny = revenueRows.length > 0 || expenseRows.length > 0

  const renderTable = (
    title: string,
    rows: Array<{ account: Account; depth: number; balance: number }>,
    total: number,
    accentColor: string,
    totalColor: string,
  ) => (
    <div style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--divider)', background: 'var(--bg-tertiary)', position: 'sticky', top: 0 }}>Account</th>
            <th style={{ padding: '8px 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--divider)', background: 'var(--bg-tertiary)', position: 'sticky', top: 0, width: 160 }}>Amount ({currency})</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={2} style={{ padding: '24px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
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
  )



  const handleExportPdf = () => {
    const leftRows = revenueRows.map(r => [
      `${' '.repeat(r.depth * 2)}${r.account.name}`,
      r.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })
    ])
    
    const rightRows = expenseRows.map(r => [
      `${' '.repeat(r.depth * 2)}${r.account.name}`,
      r.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })
    ])

    try {
      exportSideBySidePdf({ generatedBy: loggedInUser,
        title: 'Profit & Loss Statement',
        subtitle: filterPropertyId ? `Property: ${properties.find(p => p.id === filterPropertyId)?.name}` : 'All Properties',
        periodLabel: dateFrom || dateTo ? `${dateFrom || 'Start'} to ${dateTo || 'End'}` : 'All Time',
        currency,
        filename: `Profit_Loss_${new Date().toISOString().split('T')[0]}`,
        leftCol: {
          title: 'Revenue',
          accentColor: '#059669', // emerald-600
          rows: leftRows,
          total: totalRevenue
        },
        rightCol: {
          title: 'Expenses',
          accentColor: '#dc2626', // red-600
          rows: rightRows,
          total: totalExpenses
        },
        footer: {
          label: 'Net Income',
          value: netIncome
        }
      }).then(() => {
        setToast({ visible: true, message: 'PDF Exported successfully', type: 'success' })
      }).catch(e => {
        setToast({ visible: true, message: 'Export failed: ' + e.message, type: 'error' })
      })
    } catch (err: any) {
      setToast({ visible: true, message: 'Export error: ' + (err.message || err), type: 'error' })
    }
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
            vouchers={filteredVouchers}
            currency={currency}
          />
        )}
      </Modal>

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="page-title">Profit & Loss</div>
              {filterPropertyId && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', background: 'var(--primary)', color: 'white', borderRadius: 12, lineHeight: 1, marginTop: 6 }}>
                  Filtered: {properties.find(p => p.id === filterPropertyId)?.name}
                </span>
              )}
            </div>
            <div className="page-subtitle">Revenue — Expenses = Net Income</div>
          </div>
        </div>
        <div className="page-header-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-tertiary)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--divider)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Period</span>
              <input
                type="date"
                className="data-table-search-input"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                style={{ padding: '4px 8px', fontSize: 13, background: 'transparent', border: 'none', width: 'auto' }}
              />
              <span style={{ color: 'var(--text-tertiary)' }}>→</span>
              <input
                type="date"
                className="data-table-search-input"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                style={{ padding: '4px 8px', fontSize: 13, background: 'transparent', border: 'none', width: 'auto' }}
              />
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo('') }}
                  className="btn-icon"
                  style={{ width: 24, height: 24, background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
                  title="Clear dates"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExportPdf}>
              Export PDF
            </Button>
            <div style={{ width: 16 }} />
            <Filter size={16} color="var(--text-secondary)" />
            <div style={{ width: 220 }}>
              <Select
                value={filterPropertyId}
                onChange={e => setFilterPropertyId(e.target.value)}
                options={[
                  { value: '', label: 'All Properties' },
                  ...properties.map(p => ({ value: p.id, label: p.name }))
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        {!hasAny ? (
          <div className="card">
            <div className="card-body">
              <EmptyState
                icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>}
                title="No profit & loss data"
                text="Post vouchers to see profit & loss data."
              />
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
              <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
                <div style={{
                  padding: '16px 20px', borderBottom: '1px solid var(--divider)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', color: '#059669' }}><TrendingUp size={16} strokeWidth={1.75} /></span>
                  <span style={{ fontWeight: 700, fontSize: 16, color: '#059669' }}>Revenue</span>
                  <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' }}>
                    {revenueRows.filter(r => r.depth === 0).length} sections
                  </span>
                </div>
                {renderTable('Revenue', revenueRows, totalRevenue, '#059669', '#059669')}
                <div style={{
                  padding: '14px 20px', borderTop: '1px solid var(--divider)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--bg-secondary)',
                }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#059669' }}>Total Revenue</span>
                  <CurrencyText value={totalRevenue} currency={currency} className="text-md fw-700" style={{ color: '#059669' }} />
                </div>
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
                <div style={{
                  padding: '16px 20px', borderBottom: '1px solid var(--divider)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', color: '#DC2626' }}><TrendingDown size={16} strokeWidth={1.75} /></span>
                  <span style={{ fontWeight: 700, fontSize: 16, color: '#DC2626' }}>Expenses</span>
                  <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' }}>
                    {expenseRows.filter(r => r.depth === 0).length} sections
                  </span>
                </div>
                {renderTable('Expenses', expenseRows, totalExpenses, '#DC2626', '#DC2626')}
                <div style={{
                  padding: '14px 20px', borderTop: '1px solid var(--divider)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--bg-secondary)',
                }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#DC2626' }}>Total Expenses</span>
                  <CurrencyText value={totalExpenses} currency={currency} className="text-md fw-700" style={{ color: '#DC2626' }} />
                </div>
              </div>
            </div>

            <div className="card" style={{
              padding: 0, overflow: 'hidden',
              borderTop: `3px solid ${netIncome >= 0 ? '#22C55E' : '#EF4444'}`,
            }}>
              <div style={{
                padding: '20px 24px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: netIncome >= 0 ? '#22C55E08' : '#EF444408',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#6B7280', marginBottom: 2 }}>Net Profit / Loss</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>Revenue — Expenses</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <CurrencyText
                    value={netIncome}
                    currency={currency}
                    className="text-lg fw-700"
                    style={{ color: netIncome >= 0 ? '#22C55E' : '#EF4444' }}
                  />
                  <div style={{
                    fontSize: 12, fontWeight: 500,
                    color: netIncome >= 0 ? '#22C55E' : '#EF4444',
                    marginTop: 2,
                  }}>
                    {netIncome >= 0 ? '▲ Profitable' : '▼ Loss'}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
