export const ChartColors = {
  investmentGold: '#D4AF37',
  investmentGoldLight: '#F4D77B',
  investmentGoldGradient: 'rgba(212,175,55,0.30)',
  green: '#22C55E', // Income
  greenLight: '#86EFAC',
  red: '#EF4444', // Expense
  redLight: '#FCA5A5',
  blue: '#3B82F6',
  blueLight: '#93C5FD',
  purple: '#7C3AED',
  purpleLight: '#C4B5FD',
  orange: '#F59E0B',
  teal: '#14B8A6',
  slate: '#64748B',
  silver: '#94A3B8',
  emerald: '#10B981',
  amber: '#F59E0B', // Using orange hex for amber if not strictly defined, or maybe #F59E0B is amber and #F97316 is orange. Let's use #F59E0B for amber, #F97316 for orange.
  orangeReal: '#F97316',
}

export const ChartConfig = {
  background: 'transparent',
  grid: '#E8EDF3',
  axis: '#94A3B8',
  labels: '#475569',
  tooltip: {
    contentStyle: {
      background: '#FFFFFF',
      border: 'none',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      fontSize: '13px',
      color: '#1E293B',
      padding: '8px 12px',
    },
    itemStyle: {
      color: '#1E293B',
      fontWeight: 500,
    },
    cursor: { fill: '#F1F5F9', opacity: 0.5 },
  }
}

export const PropertyPalette = {
  properties: ChartColors.emerald,
  units: ChartColors.blue,
  leases: ChartColors.purple,
  rent: ChartColors.green,
  securityDeposits: ChartColors.amber,
  pdc: ChartColors.orangeReal,
  vacancy: ChartColors.red,
  maintenance: ChartColors.teal,
}

const AssetAllocationMap: Record<string, string> = {
  'Gold': ChartColors.investmentGold,
  'Silver': ChartColors.silver,
  'Stocks': ChartColors.blue,
  'Mutual Funds': ChartColors.teal,
  'Bonds': ChartColors.purple,
  'Sukuk': ChartColors.purple,
  'Real Estate': ChartColors.green,
  'Cash': ChartColors.orange,
  'Other': ChartColors.slate,
}

export function getAssetAllocationColor(assetName: string): string {
  // Try exact match first
  if (AssetAllocationMap[assetName]) return AssetAllocationMap[assetName]
  
  // Try partial match
  const lower = assetName.toLowerCase()
  if (lower.includes('gold')) return ChartColors.investmentGold
  if (lower.includes('silver')) return ChartColors.silver
  if (lower.includes('stock') || lower.includes('share') || lower.includes('equity')) return ChartColors.blue
  if (lower.includes('mutual fund') || lower.includes('fund')) return ChartColors.teal
  if (lower.includes('bond') || lower.includes('sukuk')) return ChartColors.purple
  if (lower.includes('real estate') || lower.includes('property')) return ChartColors.green
  if (lower.includes('cash') || lower.includes('bank') || lower.includes('deposit')) return ChartColors.orange
  
  return ChartColors.slate
}

// Default fallback colors if no specific mapping exists
export const STANDARD_CHART_COLORS = [
  ChartColors.blue,
  ChartColors.green,
  ChartColors.purple,
  ChartColors.orange,
  ChartColors.teal,
  ChartColors.red,
  ChartColors.investmentGold,
  ChartColors.slate,
]

// Expose legacy arrays mapped to new colors to prevent breaking other files temporarily
export const INVESTMENT_CHART_COLORS = STANDARD_CHART_COLORS
export const PROPERTY_CHART_COLORS = [
  PropertyPalette.properties,
  PropertyPalette.units,
  PropertyPalette.leases,
  PropertyPalette.rent,
  PropertyPalette.securityDeposits,
  PropertyPalette.pdc,
  PropertyPalette.vacancy,
  PropertyPalette.maintenance,
]
export const ALLOCATION_COLORS = STANDARD_CHART_COLORS
export const PROPERTY_ALLOCATION_COLORS = PROPERTY_CHART_COLORS
export const ASSET_TYPE_COLORS = AssetAllocationMap

export function getModuleChartColors(module: string): string[] {
  return module === 'property' ? PROPERTY_CHART_COLORS : INVESTMENT_CHART_COLORS
}

export function getModuleAllocationColors(module: string): string[] {
  return module === 'property' ? PROPERTY_ALLOCATION_COLORS : ALLOCATION_COLORS
}
