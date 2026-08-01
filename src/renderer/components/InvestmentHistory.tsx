import React, { useMemo, useState } from 'react'
import type { Voucher } from '../accounting/types'
import type { AuditEvent } from '../data/auditTypes'
import { getHistoryProjection, filterHistory, type HistoryFilter } from '../readModels/InvestmentHistoryReadModel'
import { TrashIcon, Button } from './design/DesignSystem'

interface Props {
  vouchers: Voucher[]
  auditEvents: AuditEvent[]
  language?: string
  onClearHistory?: () => void
  onDeleteEvent?: (eventId: string) => void
}

export default function InvestmentHistory({
  vouchers, auditEvents, language = 'English', onClearHistory, onDeleteEvent
}: Props) {
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const projection = useMemo(
    () => getHistoryProjection(vouchers, auditEvents),
    [vouchers, auditEvents],
  )

  const grouped = useMemo(
    () => filterHistory(projection, filter, searchQuery),
    [projection, filter, searchQuery],
  )

  const fmtDateTime = (isoStr: string) => {
    const d = new Date(isoStr)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'voucher_posted': return '#059669'
      case 'voucher_approved': return '#0A0A6F'
      case 'voucher_created': return '#3BA549'
      case 'audit_event': return '#D97706'
      default: return '#6B6D7A'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'voucher_posted': return 'Posted'
      case 'voucher_approved': return 'Approved'
      case 'voucher_created': return 'Created'
      case 'audit_event': return 'Audit'
      default: return type
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Activity Log</div>
            <div className="page-subtitle">{filtered.length} total event{filtered.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        {onClearHistory && (
          <div className="page-header-right">
            <Button
              variant="secondary"
              style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}
              onClick={() => {
                if (confirm('Are you sure you want to clear all transaction history? This will reset the Trial Balance.')) {
                  onClearHistory()
                }
              }}
            >
              Clear Activity Log
            </Button>
          </div>
        )}
      </div>

      <div className="page-body">
        <div className="data-table-toolbar">
          <div className="data-table-filters">
            <div className="filter-bar" style={{ padding: 0 }}>
              {[
                { value: 'all', label: 'All' },
                { value: 'vouchers', label: 'Vouchers' },
                { value: 'audit', label: 'Audit Events' },
              ].map(f => (
                <button
                  key={f.value}
                  className={`filter-btn${filter === f.value ? ' active' : ''}`}
                  onClick={() => setFilter(f.value as HistoryFilter)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12 }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="data-table-search">
            <input
              type="text"
              className="data-table-search-input"
              placeholder="Search history..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {grouped.length === 0 ? (
          <div className="card card-table">
            <div className="card-body">
              <div className="text-center text-secondary text-sm" style={{ padding: '40px 0' }}>
                No history entries yet.
              </div>
            </div>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.date} className="card card-table" style={{ marginBottom: 12 }}>
              <div className="card-header">
                <span className="card-title text-sm">{group.date}</span>
                <span className="text-xs text-secondary">{group.entries.length} events</span>
              </div>
              <div className="card-body" style={{ padding: '8px 16px' }}>
                {group.entries.map(item => (
                  <div key={item.id} className="activity-item" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: getTypeColor(item.type), flexShrink: 0 }} />
                    <div className="activity-item-content" style={{ flex: 1 }}>
                      <div className="text-sm">{item.description}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                        <span className="text-xs fw-500" style={{ color: getTypeColor(item.type) }}>{getTypeLabel(item.type)}</span>
                        <span className="text-xs text-secondary">{item.user}</span>
                        {item.voucherNumber && <span className="text-xs text-mono text-secondary">{item.voucherNumber}</span>}
                        {item.amount > 0 && <span className="text-xs text-mono fw-600">AED {item.amount.toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className="text-xs text-secondary" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {fmtDateTime(item.date)}
                      {onDeleteEvent && item.type === 'audit_event' && (
                        <button
                          className="btn btn-ghost activity-item-delete-btn"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this event from history?')) {
                              onDeleteEvent(item.id)
                            }
                          }}
                          style={{ padding: 4, height: 24, width: 24, opacity: 0.5, border: 'none', background: 'transparent', cursor: 'pointer' }}
                          title="Delete event"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
