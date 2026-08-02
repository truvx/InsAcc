import React, { useMemo, useState } from 'react'
import type { Account, Voucher } from '../accounting/types'
import { buildAccountTree } from '../accounting/chartOfAccountsService'
import { generateChartOfAccountsReadModel, generateTrialBalanceReadModel, generateProfitAndLossReadModel, generateBalanceSheetReadModel } from '../readModels/accountingReadModels'
import { EmptyState, Modal, Input, Select, Button } from './design/DesignSystem'
import AccountDrillDown from './AccountDrillDown'
import { exportSideBySidePdf } from '../services/reportExportService'
import Toast from './Toast'

import { Landmark, ListChecks, Filter, Download } from 'lucide-react'
import { CurrencyText } from './design/CurrencyText'

import type { PropertyEntry, LeaseEntry } from '../data/propertyTypes'

interface Props {
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
  properties?: PropertyEntry[]
  leases?: LeaseEntry[]
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

export default function PropertyBalanceSheet({ currency = 'AED', accounts, vouchers, properties = [], leases = [] }: Props) {
  const [drillAccountId, setDrillAccountId] = useState<string | null>(null)
  const [drillAccountName, setDrillAccountName] = useState<string>('')
  const [filterPropertyId, setFilterPropertyId] = useState('')
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const filteredVouchers = useMemo(() => {
    if (!filterPropertyId) return vouchers
    
    return vouchers.map(v => {
      const leaseByVoucherRef = v.reference ? leases.find(l => l.leaseNumber === v.reference) : undefined
      const isVoucherLinkedToProp = !!leaseByVoucherRef && leaseByVoucherRef.propertyId === filterPropertyId

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
  }, [vouchers, filterPropertyId, leases])

  const coaEntries = useMemo(() => generateChartOfAccountsReadModel(accounts, filteredVouchers, !!filterPropertyId), [accounts, filteredVouchers, filterPropertyId])
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

  const assetRows = useMemo(() => {
    const rows = flatRowsFromTree(tree, balances, ['asset']).filter(r => r.account.code !== '1130' && r.depth > 0).map(r => ({ ...r, depth: r.depth - 1 }))
    return filterPropertyId ? rows.filter(r => r.balance !== 0) : rows
  }, [tree, balances, filterPropertyId])
  
  const liabilityRows = useMemo(() => {
    const rows = flatRowsFromTree(tree, balances, ['liability']).filter(r => r.depth > 0).map(r => ({ ...r, depth: r.depth - 1 }))
    return filterPropertyId ? rows.filter(r => r.balance !== 0) : rows
  }, [tree, balances, filterPropertyId])
  
  const rawEquityRows = useMemo(() => {
    const rows = flatRowsFromTree(tree, balances, ['equity']).filter(r => r.account.code !== '3200' && r.depth > 0).map(r => ({ ...r, depth: r.depth - 1 }))
    return filterPropertyId ? rows.filter(r => r.balance !== 0) : rows
  }, [tree, balances, filterPropertyId])

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
    <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--divider)',
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', color: accentColor }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 16, color: accentColor }}>{title}</span>
        <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' }}>
          {rows.filter(r => r.depth === 0).length} sections
        </span>
      </div>
      <div style={{ overflow: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th style={{ padding: '8px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--divider)', background: 'var(--bg-tertiary)' }}>Account</th>
              <th style={{ padding: '8px 20px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--divider)', background: 'var(--bg-tertiary)', width: 160 }}>Balance ({currency})</th>
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


  const handleExportPdf = () => {
    const leftRows = assetRows.map(r => [
      `${' '.repeat(r.depth * 2)}${r.account.name}`,
      r.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })
    ])
    const liabilityRowsMapped = liabilityRows.map(r => [
      `${' '.repeat(r.depth * 2)}${r.account.name}`,
      r.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })
    ])
    const equityRowsMapped = equityRows.map(r => [
      `${' '.repeat(r.depth * 2)}${r.account.name}`,
      r.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })
    ])
    
    // Merge Liabilities and Equity for the right column
    const rightRows = [
      ['--- LIABILITIES ---', ''],
      ...liabilityRowsMapped,
      ['--- EQUITY ---', ''],
      ...equityRowsMapped
    ]

    try {
      exportSideBySidePdf({
        title: 'Balance Sheet',
        subtitle: filterPropertyId ? `Property: ${properties.find(p => p.id === filterPropertyId)?.name}` : 'All Properties',
        currency,
        filename: `Balance_Sheet_${new Date().toISOString().split('T')[0]}`,
        leftCol: {
          title: 'Assets',
          accentColor: '#312e81',
          rows: leftRows,
          total: totalAssets
        },
        rightCol: {
          title: 'Liabilities & Equity',
          accentColor: '#7c2d12',
          rows: rightRows,
          total: totalLiabilities + totalEquity
        },
        footer: {
          label: isBalanced ? 'Balanced (Assets = Liabilities + Equity)' : 'Unbalanced',
          value: totalAssets
        }
      }).then(() => {
        setToast({ visible: true, message: 'PDF Exported successfully', type: 'success' })
      }).catch(e => {
        setToast({ visible: true, message: 'Export failed: ' + (e.message || e), type: 'error' })
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
              <div className="page-title">Balance Sheet</div>
              {filterPropertyId && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', background: 'var(--primary)', color: 'white', borderRadius: 12, lineHeight: 1, marginTop: 6 }}>
                  Filtered: {properties.find(p => p.id === filterPropertyId)?.name}
                </span>
              )}
            </div>
            <div className="page-subtitle">Financial position at a glance</div>
          </div>
        </div>
        <div className="page-header-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
        <div style={{ display: 'flex', gap: 20, marginBottom: 24, height: '620px' }}>
          {renderSection('Assets', <Landmark size={15} strokeWidth={1.75} />, assetRows, totalAssets, '#0A0A6F')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, height: '100%' }}>
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
