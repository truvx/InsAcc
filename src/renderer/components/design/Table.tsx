import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Button, Spinner, ChevronDownIcon, ChevronLeftIcon, SearchIcon } from './DesignSystem'

export interface Column<T> {
  key: string
  header: string
  render: (item: T) => React.ReactNode
  sortable?: boolean
  numeric?: boolean
  width?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  emptyState?: React.ReactNode
  loading?: boolean
  pageSize?: number
  searchable?: boolean
  searchPlaceholder?: string
  searchQuery?: string
  onSearchChange?: (query: string) => void
  filterBar?: React.ReactNode
}

function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
  if (!direction) return null
  return (
    <span className={`sort-icon ${direction}`}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {direction === 'asc' ? (
          <polyline points="18 15 12 9 6 15" />
        ) : (
          <polyline points="6 9 12 15 18 9" />
        )}
      </svg>
    </span>
  )
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="data-table-search">
      <SearchIcon />
      <input
        type="text"
        className="data-table-search-input"
        placeholder={placeholder || 'Search...'}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button className="data-table-search-clear" onClick={() => onChange('')} aria-label="Clear search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}

export function DataTable<T>({
  columns, data, keyExtractor, emptyState, loading, pageSize = 10,
  searchable, searchPlaceholder, searchQuery, onSearchChange, filterBar,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)
  const [page, setPage] = useState(0)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') { setSortDir('desc') }
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null) }
      else { setSortDir('asc') }
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return data
    return [...data].sort((a, b) => {
      const col = columns.find(c => c.key === sortKey)
      if (!col) return 0
      const aVal = (a as any)[sortKey]
      const bVal = (b as any)[sortKey]
      if (aVal == null || bVal == null) return 0
      let cmp = 0
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal
      } else {
        cmp = String(aVal).localeCompare(String(bVal))
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir, columns])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize)

  const startItem = sorted.length === 0 ? 0 : page * pageSize + 1
  const endItem = Math.min((page + 1) * pageSize, sorted.length)

  React.useEffect(() => { setPage(0) }, [searchQuery])

  if (loading) {
    return (
      <div className="data-table">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key} className={col.numeric ? 'numeric' : ''} style={col.width ? { width: col.width } : undefined}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col.key} className={col.numeric ? 'numeric' : ''}>
                      <div className="skeleton skeleton-row" style={{ height: 20, width: '80%' }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="data-table">
      {(searchable || filterBar) && (
        <div className="data-table-toolbar">
          {filterBar && <div className="data-table-filters">{filterBar}</div>}
          {searchable && (
            <SearchInput
              value={searchQuery || ''}
              onChange={onSearchChange || (() => {})}
              placeholder={searchPlaceholder}
            />
          )}
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`${col.numeric ? 'numeric' : ''}${col.sortable ? ' sortable' : ''}${sortKey === col.key ? ' sorted' : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  {col.header}
                  {col.sortable && <SortIcon direction={sortKey === col.key ? sortDir : null} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 0 }}>
                  {emptyState || (
                    <div className="empty-state" style={{ padding: '48px 24px' }}>
                      <div className="empty-state-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                        </svg>
                      </div>
                      <div className="empty-state-title">No data found</div>
                      <div className="empty-state-text">Try adjusting your search or filters</div>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              paged.map(item => (
                <motion.tr
                  key={keyExtractor(item)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {columns.map(col => (
                    <td key={col.key} className={col.numeric ? 'numeric' : ''}>
                      {col.render(item)}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > pageSize && (
        <div className="data-table-pagination">
          <span className="data-table-pagination-info">
            {startItem}–{endItem} of {sorted.length}
          </span>
          <div className="data-table-pagination-actions">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
            >
              <ChevronLeftIcon />
            </Button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                className={`data-table-page-btn${i === page ? ' active' : ''}`}
                onClick={() => setPage(i)}
              >
                {i + 1}
              </button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            >
              <div style={{ transform: 'rotate(180deg)' }}><ChevronLeftIcon /></div>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
