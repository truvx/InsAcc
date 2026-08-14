/** Maps ISO currency codes to their display symbols for exports. Falls back to the code itself. */
export function getCurrencySymbol(currency: string): string {
  const map: Record<string, string> = {
    AED: 'AED',
    USD: '$',
    EUR: '€',
    GBP: '£',
    SAR: 'SAR',
    INR: '₹',
    JPY: '¥',
    CNY: '¥',
  }
  return map[(currency || 'AED').toUpperCase()] ?? (currency || 'AED').toUpperCase()
}

export function formatCurrency(value: number, currency: string = 'AED'): string {
  const symbol = getCurrencySymbol(currency)
  const isNegative = value < 0
  const sign = isNegative ? '-' : ''
  const absValue = Math.abs(value)
  const formattedNumber = absValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return `${symbol} ${sign}${formattedNumber}`
}

export function formatCompactCurrency(value: number, currency: string = 'AED'): string {
  const symbol = getCurrencySymbol(currency)
  const sign = value < 0 ? '- ' : ''
  return `${sign}${symbol} ${formatCompactNumber(Math.abs(value))}`
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatPremiumCompact(n: number): { valueStr: string; suffix: string } {
  const absoluteVal = Math.abs(n);
  if (absoluteVal >= 1_000_000) {
    const valInM = absoluteVal / 1_000_000;
    const decimals = valInM < 10 ? 2 : 1;
    return {
      valueStr: valInM.toFixed(decimals),
      suffix: 'M'
    };
  } else if (absoluteVal >= 1_000) {
    const valInK = absoluteVal / 1_000;
    return {
      valueStr: valInK.toFixed(1),
      suffix: 'K'
    };
  } else {
    return {
      valueStr: absoluteVal.toFixed(2),
      suffix: ''
    };
  }
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
