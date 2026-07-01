export function formatCurrency(value: number, currency: string = 'AED'): string {
  const sign = value < 0 ? '- ' : ''
  return `${sign}${currency} ${Math.abs(value).toLocaleString()}`
}

export function formatCompactCurrency(value: number, currency: string = 'AED'): string {
  const sign = value < 0 ? '- ' : ''
  return `${sign}${currency} ${formatCompactNumber(Math.abs(value))}`
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatCompactNumber(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

export function formatTrend(
  value: number,
  previousValue?: number,
): { value: string; direction: 'up' | 'down' | 'neutral' } {
  if (previousValue === undefined || previousValue === 0) {
    return {
      value: formatCompactNumber(value),
      direction: value > 0 ? 'up' : value < 0 ? 'down' : 'neutral',
    }
  }
  const pct = ((value - previousValue) / Math.abs(previousValue)) * 100
  return {
    value: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
    direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral',
  }
}

export function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1, 1)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

export function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  return `${startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} — ${endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`
}
