import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { Party } from '../../services/partyLookupService'

/* ─── Icon Components ──────────────────────────────────────────────── */

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22V12h6v10" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M16 10h.01" />
    </svg>
  )
}

function BriefcaseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function CoinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 6v12" /><path d="M15.5 9.5c-.6-.9-1.8-1.5-3.5-1.5s-3 .8-3 2 1.3 2 3 2 3 .8 3 2-1.3 2-3 2c-1.7 0-2.9-.6-3.5-1.5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function SearchEmptyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

/* ─── Type Mappings ────────────────────────────────────────────────── */

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; group: string; label: string }> = {
  'Buyer':                { icon: <UserIcon />,      color: '#3BA549', group: 'Buyers',                label: 'Buyer' },
  'Asset Buyer':          { icon: <CoinIcon />,      color: '#F59E0B', group: 'Investment Buyers',     label: 'Buyer' },
  'Asset Supplier':       { icon: <CoinIcon />,      color: '#F59E0B', group: 'Investment Suppliers',  label: 'Supplier' },
  'Buyer / Counterparty': { icon: <CoinIcon />,      color: '#F59E0B', group: 'Investment Buyers',     label: 'Buyer' },
  'Supplier / Buyer':    { icon: <BriefcaseIcon />, color: '#8B5CF6', group: 'Suppliers & Buyers',   label: 'Supplier' },
  'Vendor / Provider':    { icon: <BriefcaseIcon />, color: '#8B5CF6', group: 'Vendors',               label: 'Vendor' },
  'Supplier':             { icon: <BriefcaseIcon />, color: '#8B5CF6', group: 'Vendors',               label: 'Vendor' },
  'Active Tenant':        { icon: <HomeIcon />,      color: '#DE8DA9', group: 'Tenants',               label: 'Active Tenant' },
  'Historical Tenant':    { icon: <HomeIcon />,      color: '#9CA3AF', group: 'Tenants',               label: 'Past Tenant' },
  'Tenant':               { icon: <BuildingIcon />,  color: '#DE8DA9', group: 'Tenants',               label: 'Tenant' },
  'Customer':             { icon: <UsersIcon />,     color: '#06B6D4', group: 'Customers',             label: 'Customer' },
}

const DEFAULT_CONFIG = { icon: <UserIcon />, color: '#6B7280', group: 'Other', label: 'Contact' }

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || DEFAULT_CONFIG
}

/* ─── Component ────────────────────────────────────────────────────── */

interface SearchablePartySelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  parties: Party[]
  placeholder?: string
  error?: string
  customLabel?: string
}

export function SearchablePartySelect({
  label,
  value,
  onChange,
  parties,
  placeholder,
  error,
  customLabel
}: SearchablePartySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState(value)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSearchTerm(value)
  }, [value])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter parties based on search term
  const filteredParties = useMemo(() => {
    return parties.filter(party => {
      const q = searchTerm.toLowerCase().trim()
      if (!q) return true
      return (
        party.name.toLowerCase().includes(q) ||
        (party.phone && party.phone.toLowerCase().includes(q)) ||
        (party.email && party.email.toLowerCase().includes(q)) ||
        (party.unitNumber && party.unitNumber.toLowerCase().includes(q)) ||
        (party.propertyName && party.propertyName.toLowerCase().includes(q)) ||
        (party.code && party.code.toLowerCase().includes(q))
      )
    })
  }, [parties, searchTerm])

  // Group filtered parties
  const groups = useMemo(() => {
    const groupMap = new Map<string, Party[]>()
    filteredParties.forEach(party => {
      const config = getTypeConfig(party.type)
      const groupName = config.group
      if (!groupMap.has(groupName)) groupMap.set(groupName, [])
      groupMap.get(groupName)!.push(party)
    })
    return Array.from(groupMap.entries())
  }, [filteredParties])

  // Flat list for keyboard nav
  const flatList = useMemo(() => filteredParties, [filteredParties])

  // Reset highlight on filter change
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [searchTerm])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const item = dropdownRef.current.querySelector(`[data-party-index="${highlightedIndex}"]`) as HTMLElement
      if (item) item.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setSearchTerm(v)
    onChange(v)
    setIsOpen(true)
  }

  const handleSelect = useCallback((partyName: string) => {
    onChange(partyName)
    setSearchTerm(partyName)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setIsOpen(true)
        return
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => (prev < flatList.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : flatList.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < flatList.length) {
          handleSelect(flatList[highlightedIndex].name)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }, [isOpen, flatList, highlightedIndex, handleSelect])

  const isSelected = (partyName: string) => value && value.toLowerCase() === partyName.toLowerCase()

  // Build subtitle: "Label • source"
  const getSubtitle = (party: Party) => {
    const config = getTypeConfig(party.type)
    const parts: string[] = [config.label]
    // Add a contextual detail if available
    if (party.unitNumber && party.propertyName) {
      parts.push(`${party.unitNumber} • ${party.propertyName}`)
    } else if (party.code) {
      parts.push(party.code)
    }
    return parts.join(' • ')
  }

  let flatIndex = -1

  return (
    <div ref={containerRef} className="form-group" style={{ position: 'relative' }}>
      <label className="form-label">{label}</label>
      <input
        ref={inputRef}
        className={`input${error ? ' input-error' : ''}`}
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {error && <span className="form-error">{error}</span>}

      {isOpen && (
        <div
          ref={dropdownRef}
          className="party-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 9999,
            marginTop: 4,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            maxHeight: 320,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'partyDropdownIn 120ms ease-out',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '10px 14px 8px',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            {searchTerm.trim() ? 'Results' : 'Search Buyers & Counterparties'}
          </div>

          {/* Scrollable body */}
          <div className="party-dropdown-scroll" style={{
            overflowY: 'auto',
            flex: 1,
            padding: '4px',
          }}>
            {searchTerm.trim() && !parties.some(p => p.name.toLowerCase() === searchTerm.toLowerCase().trim()) && (
              <div
                onClick={() => handleSelect(searchTerm.trim())}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  marginBottom: 6,
                  cursor: 'pointer',
                  borderRadius: 'var(--radius)',
                  borderLeft: '3px solid var(--accent, #DE8DA9)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>{customLabel || 'Use custom name'}: "{searchTerm.trim()}"</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>Select this to use this custom entry</span>
                </div>
              </div>
            )}

            {filteredParties.length === 0 ? (
              (!searchTerm.trim() || parties.some(p => p.name.toLowerCase() === searchTerm.toLowerCase().trim())) && (
                /* Empty State */
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '28px 16px',
                  gap: 8,
                }}>
                  <SearchEmptyIcon />
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    No matching party found
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Try another keyword
                  </div>
                </div>
              )
            ) : (
              groups.map(([groupName, groupParties]) => (
                <div key={groupName}>
                  {/* Group header */}
                  <div style={{
                    padding: '8px 10px 4px',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                  }}>
                    {groupName}
                  </div>

                  {/* Group items */}
                  {groupParties.map((party) => {
                    flatIndex++
                    const idx = flatIndex
                    const config = getTypeConfig(party.type)
                    const selected = isSelected(party.name)
                    const highlighted = highlightedIndex === idx

                    return (
                      <div
                        key={party.id + '-' + idx}
                        data-party-index={idx}
                        onClick={() => handleSelect(party.name)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        role="option"
                        aria-selected={!!selected}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 10px',
                          marginBottom: 2,
                          cursor: 'pointer',
                          borderRadius: 'var(--radius)',
                          borderLeft: selected ? `3px solid var(--primary)` : '3px solid transparent',
                          background: selected
                            ? 'var(--primary-light)'
                            : highlighted
                              ? 'var(--hover-bg, #F3F4F6)'
                              : 'transparent',
                          transition: 'background 100ms ease, border-color 100ms ease',
                        }}
                      >
                        {/* Avatar */}
                        <div style={{
                          width: 34,
                          height: 34,
                          borderRadius: 'var(--radius)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: `${config.color}14`,
                          color: config.color,
                          flexShrink: 0,
                        }}>
                          {config.icon}
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {party.name}
                          </div>
                          <div style={{
                            fontSize: 12,
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: 1,
                          }}>
                            {getSubtitle(party)}
                          </div>
                        </div>

                        {/* Check icon */}
                        {selected && (
                          <div style={{ color: 'var(--primary)', flexShrink: 0 }}>
                            <CheckIcon />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
