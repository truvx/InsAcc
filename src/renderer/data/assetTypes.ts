export type AssetTransactionType = 'purchase' | 'sale' | 'transfer' | 'bonus' | 'split' | 'revaluation'

export interface AssetTransaction {
  id: string
  purchaseRecordId: string
  voucherId: string
  voucherNumber: string
  accountId: string
  accountCode: string
  type: AssetTransactionType
  assetType: string
  assetName: string
  date: string
  quantity: number
  unitPrice: number
  totalValue: number
  direction: 'increase' | 'decrease'
  createdAt: string
  description: string
}

export interface AssetHolding {
  accountId: string
  accountCode: string
  assetType: string
  assetName: string
  totalQuantity: number
  totalInvested: number
  avgPurchaseValue: number
  currentValue: number
  marketValue: number
  unrealizedGain: number
  realizedGain: number
  growthPercent: number
  portfolioPercentage: number
  transactionCount: number
  purchaseRecordIds: string[]
  voucherIds: string[]
  voucherNumbers: string[]
  simpleAvgPrice?: number
  simpleAvgValue?: number
  simpleAvgQty?: number
}
