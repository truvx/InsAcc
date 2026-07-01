import React, { useState, useMemo } from 'react'
import type { PropDocItem } from '../data/propertyTypes'
import { Button, SearchIcon, CloseIcon, EmptyState, Badge } from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
import { formatDate } from '../utils'

interface Props {
  propDocuments?: PropDocItem[]
  dateFormat?: string
}

const DOC_TYPE_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'neutral'> = {
  'Lease': 'primary',
  'Insurance': 'success',
  'Contract': 'warning',
}

export default function PropertyDocuments({ propDocuments = [], dateFormat = 'DD/MM/YYYY' }: Props) {
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => {
    if (!searchQuery) return propDocuments
    const q = searchQuery.toLowerCase()
    return propDocuments.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.docType.toLowerCase().includes(q)
    )
  }, [propDocuments, searchQuery])

  const columns: Column<PropDocItem>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Document',
      sortable: true,
      render: d => <span className="fw-500 text-sm">{d.name}</span>,
    },
    {
      key: 'docType',
      header: 'Type',
      sortable: true,
      render: d => <Badge variant={DOC_TYPE_COLORS[d.docType] || 'neutral'}>{d.docType}</Badge>,
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: d => <span className="text-secondary text-xs">{formatDate(d.createdAt, dateFormat)}</span>,
    },
    {
      key: 'size',
      header: 'Size',
      numeric: true,
      render: d => {
        const kb = Math.round(d.size / 1000)
        return <span className="text-secondary text-xs">{kb > 1000 ? `${(kb / 1000).toFixed(1)} MB` : `${kb} KB`}</span>
      },
    },
  ], [dateFormat])

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Documents</div>
            <div className="page-subtitle">{propDocuments.length} documents on record</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="data-table-toolbar">
          <div className="data-table-filters" />
          <div className="data-table-search" style={{ minWidth: 260 }}>
            <SearchIcon />
            <input
              type="text"
              className="data-table-search-input"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="data-table-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear">
                <CloseIcon />
              </button>
            )}
          </div>
        </div>

        <div className="card card-table">
          <div className="card-body">
            <DataTable<PropDocItem>
              columns={columns}
              data={filtered}
              keyExtractor={d => d.id}
              pageSize={10}
              emptyState={
                <EmptyState
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
                  title="No documents"
                  text="Property documents will appear here once uploaded."
                />
              }
            />
          </div>
        </div>
      </div>
    </>
  )
}