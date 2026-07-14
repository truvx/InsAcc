import type {
  PurchaseRecord,
  CreatePurchaseInput,
  UpdatePurchaseInput,
  ValidationError,
  LotInfo,
  CostBasisInfo,
  GroupKey,
} from '../data/purchaseLedger'
import {
  generatePurchaseId,
  generateLotId,
  computeTotalValue,
  isAssetType,
  VALID_ASSET_TYPES,
} from '../data/purchaseLedger'
import type { PurchaseCategory, Purchase } from '../data/purchaseData'

// ─── Validation ────────────────────────────────────────────────────────

const VALID_STATUSES: ReadonlySet<string> = new Set(['active', 'sold', 'partially_sold'])

function validateQuantity(qty: number): ValidationError | null {
  if (!Number.isFinite(qty)) return { field: 'quantity', code: 'NOT_FINITE', message: 'Quantity must be a finite number' }
  if (qty <= 0) return { field: 'quantity', code: 'NOT_POSITIVE', message: 'Quantity must be greater than 0' }
  if (qty > Number.MAX_SAFE_INTEGER) return { field: 'quantity', code: 'TOO_LARGE', message: 'Quantity exceeds maximum safe value' }
  return null
}

function validateUnitPrice(price: number): ValidationError | null {
  if (!Number.isFinite(price)) return { field: 'unitPrice', code: 'NOT_FINITE', message: 'Unit price must be a finite number' }
  if (price < 0) return { field: 'unitPrice', code: 'NEGATIVE', message: 'Unit price cannot be negative' }
  if (price > Number.MAX_SAFE_INTEGER) return { field: 'unitPrice', code: 'TOO_LARGE', message: 'Unit price exceeds maximum safe value' }
  return null
}

function validatePurchaseDate(date: string): ValidationError | null {
  if (!date) return { field: 'purchaseDate', code: 'REQUIRED', message: 'Purchase date is required' }
  const d = new Date(date)
  if (isNaN(d.getTime())) return { field: 'purchaseDate', code: 'INVALID_DATE', message: 'Purchase date is not a valid date' }
  if (d.getFullYear() < 1900 || d.getFullYear() > 2100) return { field: 'purchaseDate', code: 'OUT_OF_RANGE', message: 'Purchase date year must be between 1900 and 2100' }
  return null
}

function validateTotalValue(qty: number, price: number, stored: number): ValidationError | null {
  const expected = computeTotalValue(qty, price)
  if (Math.abs(stored - expected) > 0.01) {
    return { field: 'totalValue', code: 'MISMATCH', message: `Total value ${stored} does not match quantity × unitPrice (${expected})` }
  }
  return null
}

function validateAssetType(type: string): ValidationError | null {
  if (!type || !type.trim()) return { field: 'assetType', code: 'REQUIRED', message: 'Asset type is required' }
  if (!isAssetType(type)) {
    return { field: 'assetType', code: 'INVALID_TYPE', message: `Asset type must be one of: ${VALID_ASSET_TYPES.join(', ')}` }
  }
  return null
}

function validateAssetName(name: string): ValidationError | null {
  if (!name || !name.trim()) return { field: 'assetName', code: 'REQUIRED', message: 'Asset name is required' }
  return null
}

function validateStatus(status: string): ValidationError | null {
  if (!VALID_STATUSES.has(status)) {
    return { field: 'status', code: 'INVALID_STATUS', message: `Status must be one of: active, sold, partially_sold` }
  }
  return null
}

export function validateCreatePurchase(input: CreatePurchaseInput): ValidationError[] {
  const errors: ValidationError[] = []
  const qtyErr = validateQuantity(input.quantity)
  if (qtyErr) errors.push(qtyErr)
  const priceErr = validateUnitPrice(input.unitPrice)
  if (priceErr) errors.push(priceErr)
  const dateErr = validatePurchaseDate(input.purchaseDate)
  if (dateErr) errors.push(dateErr)
  const typeErr = validateAssetType(input.assetType)
  if (typeErr) errors.push(typeErr)
  const nameErr = validateAssetName(input.assetName)
  if (nameErr) errors.push(nameErr)
  return errors
}

export function validateUpdatePurchase(record: PurchaseRecord, changes: UpdatePurchaseInput): ValidationError[] {
  const errors: ValidationError[] = []
  if (changes.quantity !== undefined) {
    const err = validateQuantity(changes.quantity)
    if (err) errors.push(err)
  }
  if (changes.unitPrice !== undefined) {
    const err = validateUnitPrice(changes.unitPrice)
    if (err) errors.push(err)
  }
  if (changes.purchaseDate !== undefined) {
    const err = validatePurchaseDate(changes.purchaseDate)
    if (err) errors.push(err)
  }
  if (changes.status !== undefined) {
    const err = validateStatus(changes.status)
    if (err) errors.push(err)
  }
  if (changes.assetName !== undefined) {
    const err = validateAssetName(changes.assetName)
    if (err) errors.push(err)
  }
  return errors
}

export function validatePurchaseRecord(record: PurchaseRecord): ValidationError[] {
  const errors: ValidationError[] = []
  const qtyErr = validateQuantity(record.quantity)
  if (qtyErr) errors.push(qtyErr)
  const priceErr = validateUnitPrice(record.unitPrice)
  if (priceErr) errors.push(priceErr)
  const dateErr = validatePurchaseDate(record.purchaseDate)
  if (dateErr) errors.push(dateErr)
  const typeErr = validateAssetType(record.assetType)
  if (typeErr) errors.push(typeErr)
  const nameErr = validateAssetName(record.assetName)
  if (nameErr) errors.push(nameErr)
  const statusErr = validateStatus(record.status)
  if (statusErr) errors.push(statusErr)
  const totalErr = validateTotalValue(record.quantity, record.unitPrice, record.totalValue)
  if (totalErr) errors.push(totalErr)
  return errors
}

export function getAssetWeightMultiplier(assetName: string): number {
  const lowerName = assetName.toLowerCase()
  const kgMatch = lowerName.match(/(\d+(?:\.\d+)?)\s*kg/)
  if (kgMatch) {
    const val = parseFloat(kgMatch[1])
    if (!isNaN(val)) return val * 1000
  }
  const gMatch = lowerName.match(/(\d+(?:\.\d+)?)\s*g/)
  if (gMatch) {
    const val = parseFloat(gMatch[1])
    if (!isNaN(val)) return val
  }
  return 1
}

// ─── Factory ───────────────────────────────────────────────────────────

export function createPurchaseRecord(input: CreatePurchaseInput): PurchaseRecord {
  const now = new Date().toISOString()
  const multiplier = getAssetWeightMultiplier(input.assetName)
  return {
    id: generatePurchaseId(),
    investmentId: input.investmentId ?? null,
    lotId: generateLotId(),
    assetType: input.assetType,
    assetName: input.assetName.trim(),
    purchaseDate: input.purchaseDate,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    totalValue: computeTotalValue(input.quantity, input.unitPrice) * multiplier,
    broker: input.broker ?? input.buyer ?? '',
    buyer: input.buyer ?? '',
    notes: input.notes ?? '',
    attachments: [],
    tags: input.tags ?? [],
    status: 'active',
    accountCode: '',
    accountId: '',
    voucherId: '',
    voucherNumber: '',
    fundingBankAccountId: input.fundingBankAccountId ?? '',
    paymentMode: input.paymentMode,
    paymentReference: input.paymentReference,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy ?? 'user',
    updatedBy: input.createdBy ?? 'user',
  }
}

export function updatePurchaseRecord(record: PurchaseRecord, changes: UpdatePurchaseInput): PurchaseRecord {
  const now = new Date().toISOString()
  const qty = changes.quantity ?? record.quantity
  const price = changes.unitPrice ?? record.unitPrice
  const assetName = changes.assetName ?? record.assetName
  const multiplier = getAssetWeightMultiplier(assetName)
  return {
    ...record,
    ...changes,
    totalValue: (changes.quantity !== undefined || changes.unitPrice !== undefined || changes.assetName !== undefined)
      ? computeTotalValue(qty, price) * multiplier
      : record.totalValue,
    updatedAt: now,
    updatedBy: changes.updatedBy,
  }
}

// ─── Calculations ──────────────────────────────────────────────────────

export function calculateTotalQuantity(records: PurchaseRecord[]): number {
  return records.reduce((s, r) => s + r.quantity, 0)
}

export function calculateTotalInvested(records: PurchaseRecord[]): number {
  return records.reduce((s, r) => s + r.totalValue, 0)
}

export function calculateCostBasis(records: PurchaseRecord[]): CostBasisInfo {
  const active = records.filter(r => r.status === 'active')
  return {
    totalQuantity: calculateTotalQuantity(active),
    totalInvested: calculateTotalInvested(active),
    purchaseCount: active.length,
  }
}

export function calculateLots(records: PurchaseRecord[]): LotInfo[] {
  const sorted = [...records].sort((a, b) => {
    const dateCmp = a.purchaseDate.localeCompare(b.purchaseDate)
    if (dateCmp !== 0) return dateCmp
    return a.createdAt.localeCompare(b.createdAt)
  })
  return sorted.map(r => ({
    lotId: r.lotId,
    purchaseId: r.id,
    assetType: r.assetType,
    assetName: r.assetName,
    purchaseDate: r.purchaseDate,
    quantity: r.quantity,
    unitPrice: r.unitPrice,
    totalValue: r.totalValue,
    remainingQuantity: r.status === 'active' ? r.quantity : r.status === 'partially_sold' ? r.quantity : 0,
    status: r.status,
  }))
}

export function groupPurchases(
  records: PurchaseRecord[],
  by: 'assetType' | 'assetName' | GroupKey,
): Record<string, PurchaseRecord[]> {
  const groups: Record<string, PurchaseRecord[]> = {}
  const keyFn = (r: PurchaseRecord): string => {
    if (by === 'assetType') return r.assetType
    if (by === 'assetName') return r.assetName
    const gk = by as GroupKey
    if (gk.assetType && gk.assetName) return `${r.assetType}::${r.assetName}`
    if (gk.assetType) return r.assetType
    if (gk.assetName) return r.assetName
    return r.assetType
  }
  for (const r of records) {
    const key = keyFn(r)
    if (!groups[key]) groups[key] = []
    groups[key].push(r)
  }
  return groups
}

export function calculateAverages(records: PurchaseRecord[]): Array<{
  assetType: string
  assetName: string
  purchaseCount: number
  totalQuantity: number
  totalInvested: number
}> {
  const grouped = groupPurchases(records, { assetType: true, assetName: true })
  return Object.entries(grouped).map(([key, group]) => {
    const [assetType, assetName] = key.includes('::') ? key.split('::') : [key, key]
    const basis = calculateCostBasis(group)
    return {
      assetType,
      assetName,
      purchaseCount: basis.purchaseCount,
      totalQuantity: basis.totalQuantity,
      totalInvested: basis.totalInvested,
    }
  })
}

// ─── Filtering ─────────────────────────────────────────────────────────

export function filterByAssetType(records: PurchaseRecord[], assetType: string): PurchaseRecord[] {
  return records.filter(r => r.assetType === assetType)
}

export function filterByAssetName(records: PurchaseRecord[], assetName: string): PurchaseRecord[] {
  return records.filter(r => r.assetName === assetName)
}

export function filterByDateRange(records: PurchaseRecord[], from: string, to: string): PurchaseRecord[] {
  return records.filter(r => r.purchaseDate >= from && r.purchaseDate <= to)
}

export function filterByStatus(records: PurchaseRecord[], status: 'active' | 'sold' | 'partially_sold'): PurchaseRecord[] {
  return records.filter(r => r.status === status)
}

export function filterByTag(records: PurchaseRecord[], tag: string): PurchaseRecord[] {
  return records.filter(r => r.tags.includes(tag))
}

export function searchPurchases(records: PurchaseRecord[], query: string): PurchaseRecord[] {
  const q = query.toLowerCase().trim()
  if (!q) return records
  return records.filter(r =>
    r.assetName.toLowerCase().includes(q) ||
    r.assetType.toLowerCase().includes(q) ||
    (r.buyer || '').toLowerCase().includes(q) ||
    r.notes.toLowerCase().includes(q) ||
    r.id.toLowerCase().includes(q) ||
    r.tags.some(t => t.toLowerCase().includes(q))
  )
}

// ─── Sorting ───────────────────────────────────────────────────────────

export type SortField = 'purchaseDate' | 'totalValue' | 'quantity' | 'unitPrice' | 'assetType' | 'assetName' | 'createdAt'
export type SortOrder = 'asc' | 'desc'

export function sortPurchases(
  records: PurchaseRecord[],
  field: SortField = 'purchaseDate',
  order: SortOrder = 'desc',
): PurchaseRecord[] {
  return [...records].sort((a, b) => {
    const aVal = a[field]
    const bVal = b[field]
    const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal as string) : (aVal as number) - (bVal as number)
    return order === 'asc' ? cmp : -cmp
  })
}

// ─── Migration from legacy schema ──────────────────────────────────────

const CATEGORY_TO_ASSET_TYPE: Record<string, string> = {
  'gold': 'Gold',
  'silver': 'Silver',
  'bonds': 'Bonds',
  'mutual-funds': 'Mutual Funds',
  'shares': 'Shares',
  'stocks': 'Stocks',
  'sukuk': 'Sukuk',
}

export function resolveAssetTypeFromItemId(
  itemId: string,
  categories: PurchaseCategory[],
): string {
  for (const cat of categories) {
    if (cat.items.some(i => i.id === itemId)) {
      return CATEGORY_TO_ASSET_TYPE[cat.id] ?? 'Others'
    }
  }
  return 'Others'
}

export function resolveAssetNameFromItemId(
  itemId: string,
  categories: PurchaseCategory[],
): string {
  for (const cat of categories) {
    const item = cat.items.find(i => i.id === itemId)
    if (item) return item.name
  }
  return itemId
}
