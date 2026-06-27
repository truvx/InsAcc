import React from 'react'
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
      {...props}
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
      {...props}
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

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <select className={`input${error ? ' input-error' : ''}${className ? ' ' + className : ''}`} {...props}>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
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
  value: string
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
