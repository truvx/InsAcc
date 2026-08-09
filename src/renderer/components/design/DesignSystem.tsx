import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
}

export function Button({ variant = 'secondary', size = 'md', loading, icon, children, className = '', disabled, ...props }: ButtonProps) {
  const cls = `btn btn-${variant}${size === 'sm' ? ' btn-sm' : ''}${size === 'lg' ? ' btn-lg' : ''}${loading ? ' btn-loading' : ''}${className ? ' ' + className : ''}`
  return (
    <motion.button
      className={cls}
      disabled={disabled || loading}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...(props as any)}
    >
      {loading ? <span className="btn-spinner" /> : icon ? icon : null}
      {children}
    </motion.button>
  )
}

export function IconButton({ variant = 'ghost', size = 'md', icon, label, className = '', ...props }: Omit<ButtonProps, 'children'> & { label: string }) {
  const cls = `btn btn-icon btn-${variant}${size === 'sm' ? ' btn-sm' : ''}${className ? ' ' + className : ''}`
  return (
    <motion.button
      className={cls}
      aria-label={label}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...(props as any)}
    >
      {icon}
    </motion.button>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  hint?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, label, hint, className = '', id, ...props }, ref) => {
    const inputId = id || props.name
    return (
      <div className="form-group">
        {label && <label className="form-label" htmlFor={inputId}>{label}</label>}
        <input
          ref={ref}
          id={inputId}
          className={`input${error ? ' input-error' : ''}${className ? ' ' + className : ''}`}
          {...props}
        />
        {error && <span className="form-error">{error}</span>}
        {hint && !error && <span className="form-hint">{hint}</span>}
      </div>
    )
  }
)

interface SelectProps {
  label?: string
  error?: string
  options: { value: string; label: string; deletable?: boolean }[]
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  disabled?: boolean
  className?: string
  name?: string
  placeholder?: string
  style?: React.CSSProperties
  required?: boolean
  onDeleteOption?: (val: string) => void
  searchable?: boolean
  [key: string]: any
}

export function Select({
  label,
  error,
  options,
  value = '',
  onChange,
  disabled,
  className = '',
  name,
  placeholder,
  style,
  onDeleteOption,
  searchable,
  ...props
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0, width: 0 })

  const safeOptions = options || []

  // Find active option label
  const selectedOption = safeOptions.find(o => String(o.value) === String(value))
  const displayLabel = selectedOption ? selectedOption.label : (placeholder || 'Select Option')

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const isInsideTrigger = containerRef.current && containerRef.current.contains(event.target as Node)
      const isInsideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target as Node)
      if (!isInsideTrigger && !isInsideDropdown) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Update overlay position dynamically
  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
  }

  useEffect(() => {
    if (isOpen) {
      updateCoords()
      window.addEventListener('resize', updateCoords)
      window.addEventListener('scroll', updateCoords, { capture: true })
    }
    return () => {
      window.removeEventListener('resize', updateCoords)
      window.removeEventListener('scroll', updateCoords, { capture: true })
    }
  }, [isOpen])

  // Reset highlight index when opening
  useEffect(() => {
    if (isOpen) {
      const idx = safeOptions.findIndex(o => String(o.value) === String(value))
      setHighlightedIndex(idx >= 0 ? idx : 0)
    }
  }, [isOpen, value, safeOptions])

  const handleSelect = (val: string) => {
    if (onChange) {
      onChange({
        target: { value: val, name: name || '' },
        currentTarget: { value: val, name: name || '' }
      } as any)
    }
    setIsOpen(false)
    setSearchQuery('')
  }

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery) return safeOptions
    const q = searchQuery.toLowerCase()
    return safeOptions.filter(o => String(o.label).toLowerCase().includes(q))
  }, [safeOptions, searchable, searchQuery])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
      } else if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex].value)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
      } else {
        const listLength = filteredOptions.length || 1
        setHighlightedIndex(prev => (prev + 1) % listLength)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
      } else {
        const listLength = filteredOptions.length || 1
        setHighlightedIndex(prev => (prev - 1 + listLength) % listLength)
      }
    }
  }

  return (
    <div
      className={`form-group custom-select-container ${disabled ? 'disabled' : ''} ${className}`}
      ref={containerRef}
      style={{ position: 'relative', ...style }}
    >
      {label && <label className="form-label">{label}</label>}
      
      <div
        ref={triggerRef}
        tabIndex={disabled ? -1 : 0}
        className={`input custom-select-trigger ${error ? 'input-error' : ''} ${isOpen ? 'active' : ''}`}
        onClick={() => { if (!disabled) setIsOpen(!isOpen) }}
        onKeyDown={handleKeyDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          paddingRight: '12px'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-secondary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform var(--transition-fast)',
            flexShrink: 0
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="custom-select-dropdown"
          style={{
            position: 'absolute',
            top: `${dropdownCoords.top}px`,
            left: `${dropdownCoords.left}px`,
            width: `${dropdownCoords.width}px`,
            maxHeight: '220px',
            overflowY: 'auto',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 99999
          }}
        >
          {searchable && (
            <div style={{ padding: '6px', borderBottom: '1px solid var(--border)' }}>
              <input
                type="text"
                autoFocus
                className="input"
                style={{ width: '100%', padding: '6px 10px', fontSize: '13px' }}
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter' && e.key !== 'Escape') {
                    e.stopPropagation()
                  }
                }}
              />
            </div>
          )}
          {filteredOptions.length === 0 && searchable && (
            <div style={{ padding: '10px var(--space-3)', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
              No results found
            </div>
          )}
          {filteredOptions.map((option, index) => {
            const isSelected = String(option.value) === String(value)
            const isHighlighted = index === highlightedIndex
            return (
              <div
                key={option.value}
                className={`custom-select-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(option.value) }}
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  padding: '10px var(--space-3)',
                  fontSize: 'var(--font-size-sm)',
                  cursor: 'pointer',
                  background: isSelected
                    ? 'var(--primary-light)'
                    : isHighlighted
                    ? 'var(--hover-bg)'
                    : 'transparent',
                  color: isSelected ? 'var(--primary-text)' : 'var(--text-primary)',
                  fontWeight: isSelected ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background var(--transition-fast)',
                }}
              >
                <span>{option.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {option.deletable && onDeleteOption && (
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        onDeleteOption(option.value)
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                      }}
                      title="Delete custom option"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>
            )
          })}
        </div>,
        document.body
      )}

      {error && <span className="form-error">{error}</span>}
    </div>
  )
}

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
}

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  return <span className={`badge badge-${variant}`}>{children}</span>
}

interface CardProps {
  title?: string
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
}

export function Card({ title, children, className = '', actions }: CardProps) {
  return (
    <motion.div
      className={`card${className ? ' ' + className : ''}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {title && (
        <div className="card-header">
          <span className="card-title">{title}</span>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </motion.div>
  )
}

interface KpiCardProps {
  label: string
  value: React.ReactNode
  change?: { value: string; direction: 'up' | 'down' | 'neutral' }
  delay?: number
  icon?: React.ReactNode
  accentColor?: string
  className?: string
}

export function KpiCard({ label, value, change, delay = 0, icon, accentColor, className = '' }: KpiCardProps) {
  return (
    <motion.div
      className={`kpi-card${accentColor ? ' kpi-card-accent' : ''}${className ? ' ' + className : ''}`}
      style={accentColor ? { borderTopColor: accentColor } as React.CSSProperties : undefined}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
    >
      {icon && <div className="kpi-card-icon">{icon}</div>}
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {change && (
        <span className={`kpi-change ${change.direction === 'up' ? 'positive' : change.direction === 'down' ? 'negative' : 'neutral'}`}>
          <span className={`kpi-arrow ${change.direction}`}>
            {change.direction === 'up' ? '↑' : change.direction === 'down' ? '↓' : '→'}
          </span>
          {change.value}
        </span>
      )}
    </motion.div>
  )
}

interface TabsProps {
  tabs: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab${tab.id === active ? ' active' : ''}`}
          onClick={() => onChange(tab.id)}
          role="tab"
          aria-selected={tab.id === active}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  text?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, text, action }: EmptyStateProps) {
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {icon && <div className="empty-state-icon">{icon}</div>}
      <div className="empty-state-title">{title}</div>
      {text && <div className="empty-state-text">{text}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </motion.div>
  )
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div
        className="modal-backdrop"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />
      <motion.div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <IconButton icon={<CloseIcon />} label="Close" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </motion.div>
    </div>
  )
}

export function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.6s linear infinite' }}>
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
  )
}

export function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

export function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

export function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

export function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

export function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

export function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}

export function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

export function PortfolioIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

export function ActivityIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

export function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export function TrendingUpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

export function ChartCard({ title, subtitle, children, isEmpty, emptyMessage, emptyAction, className = '' }: {
  title: string
  subtitle?: string
  children: React.ReactNode
  isEmpty?: boolean
  emptyMessage?: string
  emptyAction?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`chart-card${isEmpty ? ' chart-card-empty' : ''}${className ? ' ' + className : ''}`}>
      <div className="chart-header">
        <div>
          <div className="chart-title">{title}</div>
          {subtitle && <div className="chart-subtitle">{subtitle}</div>}
        </div>
        {emptyAction && <div className="chart-actions">{emptyAction}</div>}
      </div>
      {isEmpty ? (
        <div className="chart-empty-state">
          <div className="chart-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
              <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
            </svg>
          </div>
          <div className="chart-empty-text">{emptyMessage || 'No data available yet'}</div>
        </div>
      ) : children}
    </div>
  )
}

export const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

export const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
}

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
}
