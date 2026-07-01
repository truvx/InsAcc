export type PurchaseStatus = 'active' | 'sold' | 'partially_sold'

export interface PurchaseRecord {
  id: string
  investmentId: string | null
  lotId: string
  assetType: string
  assetName: string
  purchaseDate: string
  quantity: number
  unitPrice: number
  totalValue: number
  broker: string
  notes: string
  attachments: string[]
  tags: string[]
  status: PurchaseStatus
  accountCode: string
  accountId: string
  voucherId: string
  voucherNumber: string
  fundingBankAccountId: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

export interface CreatePurchaseInput {
  assetType: string
  assetName: string
  purchaseDate: string
  quantity: number
  unitPrice: number
  broker?: string
  notes?: string
  tags?: string[]
  investmentId?: string | null
  fundingBankAccountId?: string
  createdBy?: string
}

export interface UpdatePurchaseInput {
  assetName?: string
  purchaseDate?: string
  quantity?: number
  unitPrice?: number
  broker?: string
  notes?: string
  tags?: string[]
  status?: PurchaseStatus
  updatedBy: string
}

export interface ValidationError {
  field: string
  code: string
  message: string
}

export interface LotInfo {
  lotId: string
  purchaseId: string
  assetType: string
  assetName: string
  purchaseDate: string
  quantity: number
  unitPrice: number
  totalValue: number
  remainingQuantity: number
  status: PurchaseStatus
}

export interface CostBasisInfo {
  totalQuantity: number
  totalInvested: number
  weightedAveragePrice: number
  purchaseCount: number
}

export interface GroupKey {
  assetType: boolean
  assetName: boolean
}

import { getAssetTypeNames, isValidAssetType as checkValidAssetType } from './assetTypeMaster'

export const VALID_ASSET_TYPES: readonly string[] = getAssetTypeNames()

export function isAssetType(value: string): value is string {
  return checkValidAssetType(value)
}

export function generatePurchaseId(): string {
  const ts = Date.now()
  const rand = Math.random().toString(36).slice(2, 6)
  return `PL-${ts}-${rand}`
}

export function generateLotId(): string {
  return generatePurchaseId()
}

export function computeTotalValue(qty: number, price: number): number {
  return Math.round(qty * price * 100) / 100
}
