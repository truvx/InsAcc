import React, { useState, useEffect, useRef } from 'react'
import type { Account } from '../../accounting/types'
import { Select } from './DesignSystem'

import { Landmark, TrendingUp, Building2, FolderOpen, FileSpreadsheet, FileText, SlidersHorizontal, Settings } from 'lucide-react'

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
export interface ExportReportFilters {
  filterStart: string
  filterEnd: string
  filterVType: string
  filterStatus: string
  filterBank: string
  filterAccount: string
  filterAsset?: string
  filterBuilding?: string
  filterTenant?: string
}

interface AdvancedOptions {
  includeJournal: boolean
  includeAuditTrail: boolean
  includeNarration: boolean
  includeBankDetails: boolean
  includeLedgerDetails: boolean
  includeHidden: boolean
  freezeHeader: boolean
  autoFilter: boolean
  professionalFormatting: boolean
}

export interface ExportReportModalProps {
  isOpen: boolean
  onClose: () => void
  onExport: () => void
  module: 'Investment' | 'Property'
  accounts: Account[]
  filters: ExportReportFilters
  onFiltersChange: (f: Partial<ExportReportFilters>) => void
  // Investment-specific
  holdings?: Array<{ assetName: string }>
  // Property-specific
  properties?: Array<{ id: string; name: string }>
  tenants?: Array<{ id: string; name: string }>
}

/* ─────────────────────────────────────────────
   HELPER: format date label
───────────────────────────────────────────── */
function fmtDateLabel(d: string): string {
  if (!d) return '—'
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return d }
}

/* ─────────────────────────────────────────────
   ICONS
───────────────────────────────────────────── */
function IconExcel() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="3" y1="15" x2="21" y2="15"/>
      <line x1="9" y1="3" x2="9" y2="21"/>
      <line x1="15" y1="3" x2="15" y2="21"/>
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 220ms ease' }}
    >
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

/* ─────────────────────────────────────────────
   SECTION HEADER
───────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--text-secondary, #7B8A99)',
      marginBottom: 10,
      paddingBottom: 6,
      borderBottom: '1px solid var(--border, #E8ECF0)',
    }}>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────
   SHARED INPUT STYLE
───────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 42,
  padding: '0 12px',
  borderRadius: 8,
  border: '1.5px solid var(--border, #DDE3EA)',
  background: '#fff',
  fontSize: 13.5,
  fontFamily: 'inherit',
  color: 'var(--text-primary, #1A2230)',
  outline: 'none',
  transition: 'border-color 150ms',
  boxSizing: 'border-box',
  appearance: 'auto' as any,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-secondary, #7B8A99)',
  marginBottom: 5,
  letterSpacing: '0.01em',
}

/* ─────────────────────────────────────────────
   CHECKBOX ITEM
───────────────────────────────────────────── */
function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 13, color: 'var(--text-primary, #1A2230)',
      cursor: 'pointer', userSelect: 'none', padding: '3px 0'
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ width: 14, height: 14, accentColor: 'var(--primary, #22A45D)', cursor: 'pointer' }}
      />
      {label}
    </label>
  )
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function ExportReportModal({
  isOpen, onClose, onExport, module,
  accounts, filters, onFiltersChange,
  holdings = [], properties = [], tenants = [],
}: ExportReportModalProps) {
  const [advancedOpen, setAdvancedOpen] = useState(true)
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx')
  const [advanced, setAdvanced] = useState<AdvancedOptions>({
    includeJournal: true,
    includeAuditTrail: true,
    includeNarration: true,
    includeBankDetails: true,
    includeLedgerDetails: true,
    includeHidden: false,
    freezeHeader: true,
    autoFilter: true,
    professionalFormatting: true,
  })
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const bankParentAccount = accounts.find(a => a.code === '1120' && a.isActive)
  const bankChildAccounts = accounts.filter(a => bankParentAccount && a.parentId === bankParentAccount.id && a.isActive)

  const voucherCount = 'auto'

  const summaryItems = [
    { label: 'Date Range', value: `${fmtDateLabel(filters.filterStart)} – ${fmtDateLabel(filters.filterEnd)}` },
    { label: 'Voucher', value: filters.filterVType === 'All' ? 'All Types' : filters.filterVType },
    { label: 'Status', value: filters.filterStatus === 'All' ? 'All Statuses' : filters.filterStatus },
    { label: 'Bank', value: filters.filterBank === 'All' ? 'All Banks' : bankChildAccounts.find(a => a.id === filters.filterBank)?.name ?? filters.filterBank },
    ...(module === 'Investment' ? [
      { label: 'Asset', value: (filters.filterAsset ?? 'All') === 'All' ? 'All Assets' : (filters.filterAsset ?? 'All') },
    ] : [
      { label: 'Building', value: (filters.filterBuilding ?? 'All') === 'All' ? 'All Buildings' : (filters.filterBuilding ?? 'All') },
      { label: 'Tenant', value: (filters.filterTenant ?? 'All') === 'All' ? 'All Tenants' : (filters.filterTenant ?? 'All') },
    ]),
  ]

  function setAdv(key: keyof AdvancedOptions, val: boolean) {
    setAdvanced(prev => ({ ...prev, [key]: val }))
  }

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Export Professional Report"
        style={{
          width: '100%',
          maxWidth: 740,
          maxHeight: 'calc(100vh - 48px)',
          backgroundColor: '#fff',
          borderRadius: 18,
          boxShadow: '0 25px 60px rgba(15,23,42,0.18), 0 8px 20px rgba(15,23,42,0.09)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >

        {/* ── HEADER ── */}
        <div style={{
          padding: '22px 28px 18px',
          borderBottom: '1px solid #EAECF0',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: 'linear-gradient(135deg, #22A45D 0%, #179E54 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', flexShrink: 0,
              boxShadow: '0 4px 10px rgba(34,164,93,0.3)',
            }}>
              <IconExcel />
            </div>
            <div>
              <h2 style={{
                margin: 0, fontSize: 17, fontWeight: 700,
                color: 'var(--text-primary, #1A2230)',
                letterSpacing: '-0.01em', lineHeight: 1.3,
              }}>
                Export Professional Report
              </h2>
              <p style={{
                margin: '3px 0 0', fontSize: 13,
                color: 'var(--text-secondary, #7B8A99)', lineHeight: 1.4,
              }}>
                Generate an audit-ready Excel workbook with full transaction details · {module} Module
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'none', border: '1.5px solid #E5E9EF',
              borderRadius: 8, cursor: 'pointer',
              color: '#7B8A99', padding: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 140ms', flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F4F6F8'; (e.currentTarget as HTMLElement).style.color = '#1A2230' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#7B8A99' }}
          >
            <IconClose />
          </button>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* DATE RANGE */}
          <div>
            <SectionLabel><span style={{ marginRight: 6 }}>📅</span>Date Range</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label htmlFor="export-date-start" style={labelStyle}>Start Date</label>
                <input
                  id="export-date-start"
                  type="date"
                  value={filters.filterStart}
                  onChange={e => onFiltersChange({ filterStart: e.target.value })}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = '#22A45D')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border, #DDE3EA)')}
                />
              </div>
              <div>
                <label htmlFor="export-date-end" style={labelStyle}>End Date</label>
                <input
                  id="export-date-end"
                  type="date"
                  value={filters.filterEnd}
                  onChange={e => onFiltersChange({ filterEnd: e.target.value })}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = '#22A45D')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border, #DDE3EA)')}
                />
              </div>
            </div>
          </div>

          {/* TRANSACTION FILTERS */}
          <div>
            <SectionLabel><span style={{ marginRight: 6, display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}><SlidersHorizontal size={13} strokeWidth={1.75} /></span>Filters</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Select
                id="export-vtype"
                label="Voucher Type"
                value={filters.filterVType}
                onChange={e => onFiltersChange({ filterVType: e.target.value })}
                options={[
                  { value: 'All', label: 'All Voucher Types' },
                  { value: 'Payment', label: 'Payment' },
                  { value: 'Receipt', label: 'Receipt' },
                  { value: 'Journal', label: 'Journal' },
                  { value: 'Contra', label: 'Contra' }
                ]}
                style={{ margin: 0 }}
              />
              <Select
                id="export-status"
                label="Status"
                value={filters.filterStatus}
                onChange={e => onFiltersChange({ filterStatus: e.target.value })}
                options={[
                  { value: 'All', label: 'All Statuses' },
                  { value: 'Posted', label: 'Posted' },
                  { value: 'Draft', label: 'Draft' },
                  { value: 'Cancelled', label: 'Cancelled' },
                  { value: 'Reversed', label: 'Reversed' }
                ]}
                style={{ margin: 0 }}
              />
            </div>
          </div>

          {/* ACCOUNT FILTERS */}
          <div>
            <SectionLabel><span style={{ marginRight: 6, display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}><Landmark size={13} strokeWidth={1.75} /></span>Account Filters</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Select
                id="export-bank"
                label="Bank Account"
                value={filters.filterBank}
                onChange={e => onFiltersChange({ filterBank: e.target.value })}
                options={[
                  { value: 'All', label: 'All Banks' },
                  ...bankChildAccounts.map(a => ({ value: a.id, label: a.name }))
                ]}
                style={{ margin: 0 }}
              />
              <Select
                id="export-ledger"
                label="Ledger Account"
                value={filters.filterAccount}
                onChange={e => onFiltersChange({ filterAccount: e.target.value })}
                options={[
                  { value: 'All', label: 'All Accounts' },
                  ...accounts.filter(a => a.isActive).map(a => ({ value: a.id, label: `${a.code} – ${a.name}` }))
                ]}
                style={{ margin: 0 }}
              />
            </div>
          </div>

          {/* MODULE-SPECIFIC FILTERS */}
          {module === 'Investment' && holdings.length > 0 && (
            <div>
              <SectionLabel><span style={{ marginRight: 6, display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}><TrendingUp size={13} strokeWidth={1.75} /></span>Asset Filter</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Select
                  id="export-asset"
                  label="Asset"
                  value={filters.filterAsset ?? 'All'}
                  onChange={e => onFiltersChange({ filterAsset: e.target.value })}
                  options={[
                    { value: 'All', label: 'All Assets' },
                    ...holdings.map(h => ({ value: h.assetName, label: h.assetName }))
                  ]}
                  style={{ margin: 0 }}
                />
              </div>
            </div>
          )}

          {module === 'Property' && (
            <div>
              <SectionLabel><span style={{ marginRight: 6, display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}><Building2 size={13} strokeWidth={1.75} /></span>Property Filters</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Select
                  id="export-building"
                  label="Building / Property"
                  value={filters.filterBuilding ?? 'All'}
                  onChange={e => onFiltersChange({ filterBuilding: e.target.value })}
                  options={[
                    { value: 'All', label: 'All Buildings' },
                    ...properties.map(p => ({ value: p.name, label: p.name }))
                  ]}
                  style={{ margin: 0 }}
                />
                <Select
                  id="export-tenant"
                  label="Tenant"
                  value={filters.filterTenant ?? 'All'}
                  onChange={e => onFiltersChange({ filterTenant: e.target.value })}
                  options={[
                    { value: 'All', label: 'All Tenants' },
                    ...tenants.map(t => ({ value: t.name, label: t.name }))
                  ]}
                  style={{ margin: 0 }}
                />
              </div>
            </div>
          )}

          {/* EXPORT FORMAT */}
          <div>
            <SectionLabel><span style={{ marginRight: 6, display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}><FolderOpen size={13} strokeWidth={1.75} /></span>Export Format</SectionLabel>
            <div style={{ display: 'flex', gap: 12 }}>
              {([['xlsx', 'Excel (.xlsx)', <FileSpreadsheet size={15} strokeWidth={1.75} />], ['csv', 'CSV (.csv)', <FileText size={15} strokeWidth={1.75} />]] as const).map(([val, lbl, icon]) => (
                <label
                  key={val}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${exportFormat === val ? '#22A45D' : '#DDE3EA'}`,
                    background: exportFormat === val ? '#F0FAF4' : '#fff',
                    flex: 1, transition: 'all 150ms',
                    fontSize: 13.5, fontWeight: 500,
                    color: exportFormat === val ? '#1A7A47' : 'var(--text-primary, #1A2230)',
                  }}
                >
                  <input
                    type="radio"
                    name="export-format"
                    value={val}
                    checked={exportFormat === val}
                    onChange={() => setExportFormat(val as 'xlsx' | 'csv')}
                    style={{ accentColor: '#22A45D' }}
                  />
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>
                  {lbl}
                </label>
              ))}
            </div>
          </div>

          {/* LIVE SUMMARY */}
          <div style={{
            background: 'linear-gradient(135deg, #F8FBF9 0%, #F0FAF4 100%)',
            border: '1px solid #C8EAD5',
            borderRadius: 12, padding: '16px 18px',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
              textTransform: 'uppercase', color: '#1A7A47', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>✓</span> Export Summary
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px 16px',
            }}>
              {summaryItems.map(item => (
                <div key={item.label}>
                  <span style={{ fontSize: 11, color: '#5C8A6A', fontWeight: 600, display: 'block', marginBottom: 1 }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: 12.5, color: '#1A2230', fontWeight: 500, wordBreak: 'break-word' }}>
                    {item.value}
                  </span>
                </div>
              ))}
              <div>
                <span style={{ fontSize: 11, color: '#5C8A6A', fontWeight: 600, display: 'block', marginBottom: 1 }}>
                  Records
                </span>
                <span style={{ fontSize: 12.5, color: '#1A2230', fontWeight: 500 }}>
                  Auto-calculated
                </span>
              </div>
            </div>
          </div>

          {/* ADVANCED OPTIONS */}
          <div style={{
            border: '1px solid #E8ECF0', borderRadius: 12, overflow: 'hidden',
          }}>
            <button
              onClick={() => setAdvancedOpen(o => !o)}
              aria-expanded={advancedOpen}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 16px', background: '#F7F9FB', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #1A2230)',
                letterSpacing: '0.005em',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}><Settings size={14} strokeWidth={1.75} /></span>
                Advanced Options
              </span>
              <IconChevron open={advancedOpen} />
            </button>
            {advancedOpen && (
              <div style={{ padding: '16px', background: '#fff' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 20px' }}>
                  <CheckItem label="Journal Entries" checked={advanced.includeJournal} onChange={v => setAdv('includeJournal', v)} />
                  <CheckItem label="Audit Trail" checked={advanced.includeAuditTrail} onChange={v => setAdv('includeAuditTrail', v)} />
                  <CheckItem label="Voucher Narration" checked={advanced.includeNarration} onChange={v => setAdv('includeNarration', v)} />
                  <CheckItem label="Bank Details" checked={advanced.includeBankDetails} onChange={v => setAdv('includeBankDetails', v)} />
                  <CheckItem label="Ledger Details" checked={advanced.includeLedgerDetails} onChange={v => setAdv('includeLedgerDetails', v)} />
                  <CheckItem label="Hidden Columns" checked={advanced.includeHidden} onChange={v => setAdv('includeHidden', v)} />
                  <CheckItem label="Freeze Header Row" checked={advanced.freezeHeader} onChange={v => setAdv('freezeHeader', v)} />
                  <CheckItem label="Auto Filter" checked={advanced.autoFilter} onChange={v => setAdv('autoFilter', v)} />
                  <CheckItem label="Pro Formatting" checked={advanced.professionalFormatting} onChange={v => setAdv('professionalFormatting', v)} />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── FOOTER ── */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid #EAECF0',
          background: '#F8FAFC',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'linear-gradient(135deg, #22A45D 0%, #179E54 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1A2230', lineHeight: 1.2 }}>
                Professional Excel
              </div>
              <div style={{ fontSize: 11, color: '#7B8A99' }}>
                Compatible with Microsoft Excel &amp; LibreOffice
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={onClose}
              style={{
                padding: '9px 20px', borderRadius: 9, border: '1.5px solid #DDE3EA',
                background: '#fff', cursor: 'pointer', fontSize: 13.5, fontWeight: 500,
                color: '#5C6A7A', transition: 'all 140ms', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F4F6F8'; (e.currentTarget as HTMLElement).style.borderColor = '#C8D0D9' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = '#DDE3EA' }}
            >
              Cancel
            </button>
            <button
              onClick={onExport}
              style={{
                padding: '10px 22px', borderRadius: 9,
                background: 'linear-gradient(135deg, #22A45D 0%, #179E54 100%)',
                border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
                color: '#fff', display: 'flex', alignItems: 'center', gap: 7,
                boxShadow: '0 3px 10px rgba(34,164,93,0.35)', transition: 'all 150ms',
                fontFamily: 'inherit', letterSpacing: '0.005em',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 5px 16px rgba(34,164,93,0.45)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 10px rgba(34,164,93,0.35)'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export Excel
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
