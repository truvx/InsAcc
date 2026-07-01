import React, { useMemo } from 'react'
import type { Profile } from '../data/sampleData'
import { Badge, Select } from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
import { formatDate, t } from '../utils'

interface Props {
  profile: Profile
  currency?: string
  dateFormat?: string
  language?: string
  investments: Investment[]
}

export interface Investment {
  id: string
  date: string
  assetName: string
  type: string
  purchaseValue: number
  quantity: number
  unitPrice: number
  broker: string
}

export function generateId(type: string, index: number): string {
  const shortForms: Record<string, string> = {
    'Gold': 'GLD', 'Silver': 'SLV', 'Bonds': 'BND', 'Sukuk': 'SUK',
    'Mutual Funds': 'MUF', 'ETF': 'ETF', 'Real Estate': 'RST',
    'Shares': 'SHR', 'Private Investment': 'PRI', 'Business Investment': 'BSN',
    'Fixed Deposit': 'FXD', 'Others': 'OTH',
  }
  const prefix = shortForms[type] || type.substring(0, 3).toUpperCase()
  return `${prefix}-${String(index).padStart(3, '0')}`
}

const ASSET_TYPES: string[] = []

export default function Investments({ currency = 'AED', dateFormat = 'DD/MM/YYYY', language = 'English', investments }: Props) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState('')

  const fmt = (n: number) => `${currency} ${n.toLocaleString()}`

  const filtered = useMemo(() => {
    let result = investments
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(inv =>
        inv.id.toLowerCase().includes(q) ||
        inv.assetName.toLowerCase().includes(q) ||
        inv.type.toLowerCase().includes(q) ||
        inv.broker.toLowerCase().includes(q)
      )
    }
    if (typeFilter) {
      result = result.filter(inv => inv.type === typeFilter)
    }
    return result
  }, [investments, searchQuery, typeFilter])

  const summary = useMemo(() => {
    const totalValue = investments.reduce((s, i) => s + i.purchaseValue, 0)
    const totalQty = investments.reduce((s, i) => s + i.quantity, 0)
    const types = new Set(investments.map(i => i.type))
    return { totalValue, totalQty, uniqueTypes: types.size, count: investments.length }
  }, [investments])

  const typeOptions = [
    { value: '', label: 'All Types' },
    ...ASSET_TYPES.map(t => ({ value: t, label: t })),
  ]

  const columns: Column<Investment>[] = [
    {
      key: 'id', header: 'ID', sortable: true, width: '110px',
      render: inv => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--font-size-xs)' }}>{inv.id}</span>,
    },
    {
      key: 'date', header: 'Date', sortable: true, width: '120px',
      render: inv => <span className="text-secondary">{formatDate(inv.date, dateFormat)}</span>,
    },
    {
      key: 'assetName', header: 'Asset Name', sortable: true,
      render: inv => <span style={{ fontWeight: 500 }}>{inv.assetName}</span>,
    },
    {
      key: 'type', header: 'Type', sortable: true, width: '140px',
      render: inv => <Badge variant="primary">{inv.type}</Badge>,
    },
    {
      key: 'purchaseValue', header: 'Purchase Value', sortable: true, numeric: true, width: '140px',
      render: inv => <span style={{ fontWeight: 600 }}>{fmt(inv.purchaseValue)}</span>,
    },
    {
      key: 'quantity', header: 'Qty', sortable: true, numeric: true, width: '90px',
      render: inv => <span className="text-secondary">{inv.quantity.toLocaleString()}</span>,
    },
    {
      key: 'unitPrice', header: 'Unit Price', sortable: true, numeric: true, width: '120px',
      render: inv => <span className="text-secondary">{fmt(inv.unitPrice)}</span>,
    },
    {
      key: 'broker', header: 'Broker', sortable: true, width: '130px',
      render: inv => <span className="text-secondary">{inv.broker}</span>,
    },
  ]

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">{t('investments', language)}</div>
            <div className="page-subtitle">{t('managePortfolio', language)}</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        {investments.length > 0 && (
          <div className="invest-summary-grid">
            <div className="invest-summary-card">
              <span className="invest-summary-label">Total Portfolio Value</span>
              <span className="invest-summary-value">{fmt(summary.totalValue)}</span>
              <span className="invest-summary-sub">{summary.count} investment{summary.count !== 1 ? 's' : ''}</span>
            </div>
            <div className="invest-summary-card">
              <span className="invest-summary-label">Total Quantity</span>
              <span className="invest-summary-value">{summary.totalQty.toLocaleString()}</span>
            </div>
            <div className="invest-summary-card">
              <span className="invest-summary-label">Asset Types</span>
              <span className="invest-summary-value">{summary.uniqueTypes}</span>
              <span className="invest-summary-sub">of {ASSET_TYPES.length} available</span>
            </div>
            <div className="invest-summary-card">
              <span className="invest-summary-label">Avg Investment</span>
              <span className="invest-summary-value">{summary.count ? fmt(Math.round(summary.totalValue / summary.count)) : `${currency} 0`}</span>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={inv => inv.id}
          pageSize={10}
          searchable
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by ID, name, type or broker..."
          filterBar={
            <div className="invest-filter-bar">
              <Select
                options={typeOptions}
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
              />
            </div>
          }
          emptyState={
            <div className="empty-state" style={{ padding: '64px 24px' }}>
              <div className="empty-state-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>
              <div className="empty-state-title">{investments.length === 0 ? 'No investments yet' : 'No matching investments'}</div>
              <div className="empty-state-text">
                {investments.length === 0
                  ? 'Add purchases in Purchase Ledger to build your portfolio.'
                  : 'Try adjusting your search or filters.'}
              </div>
            </div>
          }
        />
      </div>

    </>
  )
}
