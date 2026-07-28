import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AuditEvent, AuditModule, AuditAction, AuditSeverity } from '../data/auditTypes'
import { Badge, Button, EmptyState, CloseIcon, SearchIcon, Select, TrashIcon } from './design/DesignSystem'
import { formatDate, t } from '../utils'

interface Props {
  auditEvents: AuditEvent[]
  language?: string
  onClearHistory?: () => void
  onDeleteEvent?: (eventId: string) => void
}

const MODULE_COLORS: Record<string, string> = {
  Investments: '#0A0A6F',
  Property: '#5C63A6',
  'Property Reports': '#DE8DA9',
  'Property Transactions': '#059669',
  'Property Bank Accounts': '#06B6D4',
  'Property Documents': '#D97706',
  'Property Settings': 'var(--text-muted)',
  'Purchase Ledger': '#3BA549',
  Transactions: '#059669',
  Accounting: '#0A0A6F',
  'Bank Accounts': '#06B6D4',
  Documents: '#D97706',
  Reports: '#DE8DA9',
  Settings: 'var(--text-muted)',
}

const SEVERITY_VARIANTS: Record<string, 'primary' | 'warning' | 'danger'> = {
  Info: 'primary',
  Warning: 'warning',
  Critical: 'danger',
}

function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function getGroupLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (eventDate.getTime() === today.getTime()) return 'Today'
  if (eventDate.getTime() === yesterday.getTime()) return 'Yesterday'

  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(monday.getDate() - ((dayOfWeek + 6) % 7))

  if (eventDate >= monday) return 'This Week'

  if (eventDate.getMonth() === today.getMonth() && eventDate.getFullYear() === today.getFullYear()) return 'This Month'

  return 'Older'
}

type GroupKey = 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Older'

const GROUP_ORDER: GroupKey[] = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older']

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Actions' },
  { value: 'Create', label: 'Create' },
  { value: 'Update', label: 'Update' },
  { value: 'Delete', label: 'Delete' },
  { value: 'Export', label: 'Export' },
  { value: 'Upload', label: 'Upload' },
  { value: 'Download', label: 'Download' },
  { value: 'Transfer', label: 'Transfer' },
  { value: 'System', label: 'System' },
]

const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Severities' },
  { value: 'Info', label: 'Info' },
  { value: 'Warning', label: 'Warning' },
  { value: 'Critical', label: 'Critical' },
]

function ModuleIcon({ module }: { module: string }) {
  const color = MODULE_COLORS[module] || '#6B7280'
  let letter = module[0]
  if (module === 'Purchase Ledger') letter = 'PL'
  else if (module === 'Bank Accounts') letter = 'BA'
  else if (module === 'Property Transactions') letter = 'PT'
  else if (module === 'Property Bank Accounts') letter = 'PBA'
  else if (module === 'Property Expenses') letter = 'PE'
  else if (module === 'Property Documents') letter = 'PD'
  else if (module === 'Property Reports') letter = 'PR'
  return (
    <div className="module-icon" style={{ background: color }}>
      {letter}
    </div>
  )
}

const itemVariants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
}

export default function History({ auditEvents, language = 'English', onClearHistory, onDeleteEvent }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterModule, setFilterModule] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [filterDateStart, setFilterDateStart] = useState('')
  const [filterDateEnd, setFilterDateEnd] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(GROUP_ORDER))

  const moduleOptions = useMemo(() => {
    const modules = new Set(auditEvents.map(e => e.module))
    return [
      { value: '', label: 'All Sections' },
      ...Array.from(modules).sort().map(m => ({ value: m, label: m })),
    ]
  }, [auditEvents])

  const toggleGroup = useCallback((group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }, [])

  const filtered = useMemo(() => {
    let result = auditEvents
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(e =>
        e.entityName.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.module.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q)
      )
    }
    if (filterModule) result = result.filter(e => e.module === filterModule)
    if (filterAction) result = result.filter(e => e.action === filterAction)
    if (filterSeverity) result = result.filter(e => e.severity === filterSeverity)
    if (filterDateStart) result = result.filter(e => e.timestamp >= filterDateStart)
    if (filterDateEnd) result = result.filter(e => e.timestamp <= filterDateEnd + 'T23:59:59.999Z')
    return result
  }, [auditEvents, searchQuery, filterModule, filterAction, filterSeverity, filterDateStart, filterDateEnd])

  const grouped = useMemo(() => {
    const groups = new Map<string, AuditEvent[]>()
    filtered.forEach(event => {
      const label = getGroupLabel(new Date(event.timestamp))
      if (!groups.has(label)) groups.set(label, [])
      groups.get(label)!.push(event)
    })
    return GROUP_ORDER
      .filter(g => groups.has(g))
      .map(g => ({ group: g, events: groups.get(g)!.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) }))
  }, [filtered])

  const hasFilters = filterModule || filterAction || filterSeverity || filterDateStart || filterDateEnd

  const clearFilters = () => {
    setFilterModule('')
    setFilterAction('')
    setFilterSeverity('')
    setFilterDateStart('')
    setFilterDateEnd('')
  }

  return (
    <motion.div
      className="main-content"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">{t('history', language)}</div>
            <div className="page-subtitle">{auditEvents.length} total event{auditEvents.length !== 1 ? 's' : ''}</div>
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
              Clear History
            </Button>
          </div>
        )}
      </div>

      <div className="page-body">
        <div className="data-table-toolbar">
          <div className="data-table-filters">
            <div className="filter-bar">
              <Select
                value={filterModule}
                onChange={e => setFilterModule(e.target.value)}
                options={moduleOptions}
                style={{ margin: 0, minWidth: '150px' }}
              />
              <Select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                options={ACTION_OPTIONS}
                style={{ margin: 0, minWidth: '150px' }}
              />
              <Select
                value={filterSeverity}
                onChange={e => setFilterSeverity(e.target.value)}
                options={SEVERITY_OPTIONS}
                style={{ margin: 0, minWidth: '150px' }}
              />
              <input
                type="date"
                className="input"
                value={filterDateStart}
                onChange={e => setFilterDateStart(e.target.value)}
              />
              <input
                type="date"
                className="input"
                value={filterDateEnd}
                onChange={e => setFilterDateEnd(e.target.value)}
              />
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>
          <div className="data-table-search">
            <SearchIcon />
            <input
              type="text"
              className="data-table-search-input"
              placeholder="Search by section, entity, action, description..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="data-table-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">
                <CloseIcon />
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
            title="No events found"
            text="Events from all sections will appear here automatically"
          />
        ) : (
          <div className="history-layout">
            <div className="history-timeline">
              {grouped.map(({ group, events }) => {
                const isExpanded = expandedGroups.has(group)
                return (
                  <div key={group} className="history-group">
                    <div className="history-group-header" onClick={() => toggleGroup(group)}>
                      <span className="history-group-toggle">{isExpanded ? '▼' : '▶'}</span>
                      <span className="history-group-label">{group}</span>
                      <span className="history-group-count">{events.length} event{events.length !== 1 ? 's' : ''}</span>
                    </div>
                    {isExpanded && (
                      <div className="history-group-body">
                        {events.map((event, i) => {
                          const sevVariant = SEVERITY_VARIANTS[event.severity] || 'primary'
                          const isSelected = selectedEvent?.id === event.id
                          return (
                            <motion.div
                              key={event.id}
                              className={`activity-item${isSelected ? ' selected' : ''}`}
                              variants={itemVariants}
                              initial="initial"
                              animate="animate"
                              transition={{ duration: 0.2, delay: i * 0.02 }}
                              onClick={() => setSelectedEvent(event)}
                            >
                              <div className="activity-item-line" />
                              <ModuleIcon module={event.module} />
                              <div className="activity-item-content">
                                <div className="activity-item-title">
                                  {event.entityName || event.action}
                                  <span style={{ marginLeft: 8, fontWeight: 400 }}>
                                    <Badge variant={sevVariant}>{event.action}</Badge>
                                  </span>
                                </div>
                                <div className="activity-item-desc">{event.description}</div>
                              </div>
                              <div className="activity-item-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="activity-item-date">{formatTime(event.timestamp)}</div>
                                {onDeleteEvent && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="activity-item-delete-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm('Are you sure you want to delete this event from history?')) {
                                        onDeleteEvent(event.id);
                                        if (selectedEvent?.id === event.id) {
                                          setSelectedEvent(null);
                                        }
                                      }
                                    }}
                                    style={{ padding: '4px', minWidth: '24px', height: '24px', opacity: 0.5 }}
                                    title="Delete event"
                                  >
                                    <TrashIcon />
                                  </Button>
                                )}
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <AnimatePresence>
              {selectedEvent && (
                <>
                  <motion.div
                    className="history-detail-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => setSelectedEvent(null)}
                  />
                  <motion.div
                    className="history-detail-drawer"
                    initial={{ x: 420 }}
                    animate={{ x: 0 }}
                    exit={{ x: 420 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    <div className="history-drawer-header">
                      <div className="history-drawer-title">Event Details</div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}>
                        <CloseIcon />
                      </Button>
                    </div>
                    <div className="history-drawer-body">
                      <div className="history-detail-section">
                        <div className="history-detail-section-title">Overview</div>
                        <div className="history-detail-row">
                          <span className="history-detail-label">Section</span>
                          <span className="history-detail-value">
                            <Badge variant="primary">{selectedEvent.module}</Badge>
                          </span>
                        </div>
                        <div className="history-detail-row">
                          <span className="history-detail-label">Action</span>
                          <span className="history-detail-value">
                            <Badge variant={SEVERITY_VARIANTS[selectedEvent.severity] || 'primary'}>{selectedEvent.action}</Badge>
                          </span>
                        </div>
                        <div className="history-detail-row">
                          <span className="history-detail-label">Severity</span>
                          <span className="history-detail-value">
                            <Badge variant={SEVERITY_VARIANTS[selectedEvent.severity] || 'primary'}>{selectedEvent.severity}</Badge>
                          </span>
                        </div>
                        <div className="history-detail-row">
                          <span className="history-detail-label">Date</span>
                          <span className="history-detail-value">
                            {formatDate(selectedEvent.timestamp.split('T')[0], language === 'Arabic' ? 'DD/MM/YYYY' : 'DD/MM/YYYY')}
                          </span>
                        </div>
                        <div className="history-detail-row">
                          <span className="history-detail-label">Time</span>
                          <span className="history-detail-value">{formatTime(selectedEvent.timestamp)}</span>
                        </div>
                      </div>

                      <div className="history-detail-section">
                        <div className="history-detail-section-title">Entity</div>
                        <div className="history-detail-row">
                          <span className="history-detail-label">Name</span>
                          <span className="history-detail-value">{selectedEvent.entityName || '—'}</span>
                        </div>
                        <div className="history-detail-row">
                          <span className="history-detail-label">ID</span>
                          <span className="history-detail-value">{selectedEvent.entityId || '—'}</span>
                        </div>
                        <div className="history-detail-row">
                          <span className="history-detail-label">Event ID</span>
                          <span className="history-detail-value" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{selectedEvent.id}</span>
                        </div>
                      </div>

                      <div className="history-detail-section">
                        <div className="history-detail-section-title">Description</div>
                        <div className="history-detail-desc">{selectedEvent.description}</div>
                      </div>

                      {selectedEvent.before && Object.keys(selectedEvent.before).length > 0 && (
                        <div className="history-detail-section">
                          <div className="history-detail-section-title">Changed Fields</div>
                          {Object.entries(selectedEvent.before).map(([key, value]) => {
                            const afterVal = selectedEvent.after?.[key]
                            return (
                              <div key={key} style={{ marginBottom: 12 }}>
                                <div className="history-detail-changed-label">{key}</div>
                                <div className="history-detail-before">
                                  <div className="history-detail-changed-row">
                                    <span className="history-detail-changed-key">Before</span>
                                    <span className="history-detail-changed-value">{String(value)}</span>
                                  </div>
                                </div>
                                {afterVal !== undefined && (
                                  <div className="history-detail-after">
                                    <div className="history-detail-changed-row">
                                      <span className="history-detail-changed-key">After</span>
                                      <span className="history-detail-changed-value">{String(afterVal)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {(!selectedEvent.before || Object.keys(selectedEvent.before).length === 0) && selectedEvent.after && Object.keys(selectedEvent.after).length > 0 && (
                        <div className="history-detail-section">
                          <div className="history-detail-section-title">Details</div>
                          {Object.entries(selectedEvent.after).map(([key, value]) => (
                            <div key={key} className="history-detail-row">
                              <span className="history-detail-label">{key}</span>
                              <span className="history-detail-value">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  )
}
