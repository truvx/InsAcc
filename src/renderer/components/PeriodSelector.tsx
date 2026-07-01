import React from 'react'
import { Select, Input, CalendarIcon } from './design/DesignSystem'

export type PeriodOption = 'this-month' | 'last-3-months' | 'last-6-months' | 'this-year' | 'custom'

export function getPeriodDates(period: PeriodOption, customStart?: string, customEnd?: string): { start: string; end: string } {
  const now = new Date()
  const end = now.toISOString().split('T')[0]

  switch (period) {
    case 'this-month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      return { start, end }
    }
    case 'last-3-months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0]
      return { start, end }
    }
    case 'last-6-months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0]
      return { start, end }
    }
    case 'this-year': {
      const start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
      return { start, end }
    }
    case 'custom':
      return { start: customStart || end, end: customEnd || end }
    default:
      return { start: end, end }
  }
}

const periodOptions = [
  { value: 'this-month', label: 'This Month' },
  { value: 'last-3-months', label: 'Last 3 Months' },
  { value: 'last-6-months', label: 'Last 6 Months' },
  { value: 'this-year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
]

interface Props {
  period: PeriodOption
  onPeriodChange: (period: PeriodOption) => void
  customStart: string
  customEnd: string
  onCustomStartChange: (date: string) => void
  onCustomEndChange: (date: string) => void
}

export default function PeriodSelector({ period, onPeriodChange, customStart, customEnd, onCustomStartChange, onCustomEndChange }: Props) {
  return (
    <div className="period-selector">
      <Select
        options={periodOptions}
        value={period}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onPeriodChange(e.target.value as PeriodOption)}
        style={{ minWidth: 160 }}
      />
      {period === 'custom' && (
        <>
          <Input type="date" value={customStart} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onCustomStartChange(e.target.value)} />
          <span className="period-selector-sep">—</span>
          <Input type="date" value={customEnd} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onCustomEndChange(e.target.value)} />
        </>
      )}
    </div>
  )
}
