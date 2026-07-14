export const ASSET_TYPE_MASTER: readonly string[] = [
  'Gold',
  'Silver',
  'Shares',
  'Stocks',
  'Sukuk',
  'Bonds',
  'Mutual Funds',
  'Fixed Deposit',
  'Crypto',
  'Commodities',
  'Other',
] as const

export function getAssetTypeNames(): readonly string[] {
  return ASSET_TYPE_MASTER
}

export function isValidAssetType(value: string): value is string {
  return ASSET_TYPE_MASTER.includes(value as any)
}

export function getDefaultAssetType(): string {
  return ASSET_TYPE_MASTER[0]
}