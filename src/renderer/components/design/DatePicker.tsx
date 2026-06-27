import React, { useRef } from 'react'

interface DatePickerProps {
  label: string
  value: string
  onChange: (v: string) => void
}

export function DatePicker({ label, value, onChange }: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="form-group" style={{ minWidth: 120 }}>
      <label className="form-label">{label}</label>
      <div
        onClick={() => inputRef.current?.showPicker?.() || inputRef.current?.click()}
        style={{
          position: 'relative', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '14px 16px', borderRadius: 8,
          border: '1.5px solid var(--border)',
          background: 'var(--bg)',
          fontSize: 14, color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          transition: 'var(--transition)',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>{value || 'Select date...'}</span>
      </div>
      <input ref={inputRef} type="date" value={value} onChange={e => onChange(e.target.value)} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
    </div>
  )
}

export function MonthPicker({ label, value, onChange }: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
      <label className="form-label">{label}</label>
      <div
        onClick={() => inputRef.current?.showPicker?.() || inputRef.current?.click()}
        style={{
          position: 'relative', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '14px 16px', borderRadius: 8,
          border: '1.5px solid var(--border)',
          background: 'var(--bg)',
          fontSize: 14, color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          transition: 'var(--transition)',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>{value || 'Select month...'}</span>
      </div>
      <input ref={inputRef} type="month" value={value} onChange={e => onChange(e.target.value)} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
    </div>
  )
}
