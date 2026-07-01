export const INVESTMENT_CHART_COLORS = [
  '#3BA549', '#0A0A6F', '#059669', '#D97706', '#DC2626', '#EC4899', '#06B6D4', '#8B5CF6',
]

export const PROPERTY_CHART_COLORS = [
  '#DE8DA9', '#000064', '#059669', '#D97706', '#DC2626', '#EC4899', '#06B6D4', '#8B5CF6',
]

export const ALLOCATION_COLORS = [
  '#3BA549', '#059669', '#0A0A6F', '#DC2626', '#EC4899', '#14B8A6', '#D97706',
]

export const PROPERTY_ALLOCATION_COLORS = [
  '#DE8DA9', '#059669', '#000064', '#DC2626', '#EC4899', '#14B8A6', '#D97706',
]

export const ASSET_TYPE_COLORS: Record<string, string> = {
  Gold: '#D4AF37',
  Silver: '#9CA3AF',
  Bonds: '#0A0A6F',
  Sukuk: '#059669',
  'Mutual Funds': '#3BA549',
  ETF: '#DE8DA9',
  'Real Estate': '#8B5CF6',
  Shares: '#B06D8A',
  'Private Investment': '#06B6D4',
  'Business Investment': '#D97706',
  'Fixed Deposit': '#EC4899',
  Others: '#6B5B95',
}

export const REPORT_ACCENT_COLORS = [
  '#3BA549', '#059669', '#0A0A6F', '#D97706', '#DE8DA9', '#DC2626',
]

export function getModuleChartColors(module: string): string[] {
  return module === 'property' ? PROPERTY_CHART_COLORS : INVESTMENT_CHART_COLORS
}

export function getModuleAllocationColors(module: string): string[] {
  return module === 'property' ? PROPERTY_ALLOCATION_COLORS : ALLOCATION_COLORS
}
