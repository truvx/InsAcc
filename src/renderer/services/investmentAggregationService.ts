import type { PurchaseRecord } from '../data/purchaseLedger'
import type { Investment } from '../components/Investments'

const SHORT_FORMS: Record<string, string> = {
  'Gold': 'GLD',
  'Silver': 'SLV',
  'Bonds': 'BND',
  'Sukuk': 'SUK',
  'Mutual Funds': 'MUF',
  'ETF': 'ETF',
  'Real Estate': 'RST',
  'Shares': 'SHR',
  'Private Investment': 'PRI',
  'Business Investment': 'BSN',
  'Fixed Deposit': 'FXD',
  'Others': 'OTH',
}

function deriveInvestmentId(assetType: string, assetName: string): string {
  const prefix = SHORT_FORMS[assetType] || assetType.slice(0, 3).toUpperCase()
  const key = `${assetType}\x00${assetName}`
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  const suffix = Math.abs(hash).toString(36).slice(0, 4).toUpperCase()
  return `${prefix}-${suffix}`
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function computeAggregate(purchases: PurchaseRecord[]): {
  quantity: number
  purchaseValue: number
  unitPrice: number
  latest: PurchaseRecord
} {
  const quantity = purchases.reduce((s, p) => s + p.quantity, 0)
  const purchaseValue = purchases.reduce((s, p) => s + p.totalValue, 0)
  const totalCost = purchases.reduce((s, p) => s + p.unitPrice * p.quantity, 0)
  const unitPrice = quantity > 0 ? totalCost / quantity : 0
  const latest = purchases.reduce((a, b) =>
    a.purchaseDate > b.purchaseDate ? a : b
  )

  return { quantity, purchaseValue: round2(purchaseValue), unitPrice: round2(unitPrice), latest }
}

function groupByAsset(purchases: PurchaseRecord[]): Map<string, PurchaseRecord[]> {
  const groups = new Map<string, PurchaseRecord[]>()
  for (const p of purchases) {
    const id = deriveInvestmentId(p.assetType, p.assetName)
    if (!groups.has(id)) groups.set(id, [])
    groups.get(id)!.push(p)
  }
  return groups
}

export function aggregatePurchases(purchases: PurchaseRecord[]): Map<string, PurchaseRecord[]> {
  return groupByAsset(purchases)
}

export function buildInvestment(purchases: PurchaseRecord[]): Investment {
  if (purchases.length === 0) throw new Error('Cannot build investment from empty purchases')

  const first = purchases[0]
  const { quantity, purchaseValue, unitPrice, latest } = computeAggregate(purchases)

  return {
    id: deriveInvestmentId(first.assetType, first.assetName),
    date: latest.purchaseDate,
    assetName: first.assetName,
    type: first.assetType,
    purchaseValue,
    quantity,
    unitPrice,
    buyer: latest.buyer || latest.broker || '',
  }
}

export function recomputeInvestment(investment: Investment, purchases: PurchaseRecord[]): Investment {
  if (purchases.length === 0) return investment

  const { quantity, purchaseValue, unitPrice, latest } = computeAggregate(purchases)

  return {
    id: investment.id,
    date: latest.purchaseDate,
    assetName: latest.assetName,
    type: latest.assetType,
    purchaseValue,
    quantity,
    unitPrice,
    buyer: latest.buyer || latest.broker || '',
  }
}

export function syncInvestment(
  investmentId: string,
  purchases: PurchaseRecord[],
  investments: Investment[],
): Investment[] {
  const related = purchases.filter(p =>
    deriveInvestmentId(p.assetType, p.assetName) === investmentId
  )

  if (related.length === 0) {
    return investments.filter(i => i.id !== investmentId)
  }

  const match = investments.find(i => i.id === investmentId)
  if (match) {
    return investments.map(i =>
      i.id === investmentId ? recomputeInvestment(match, related) : i
    )
  }

  return [...investments, buildInvestment(related)]
}

export function syncAllInvestments(
  purchases: PurchaseRecord[],
  existingInvestments: Investment[],
): Investment[] {
  const groups = groupByAsset(purchases)
  const derived: Investment[] = []
  const consumedIds = new Set<string>()

  for (const [, group] of groups) {
    const fresh = buildInvestment(group)

    const byId = existingInvestments.find(e => e.id === fresh.id)
    if (byId) {
      derived.push(recomputeInvestment(byId, group))
      consumedIds.add(byId.id)
      continue
    }

    const byKey = existingInvestments.find(e =>
      !consumedIds.has(e.id) &&
      e.type === fresh.type &&
      e.assetName === fresh.assetName
    )
    if (byKey) {
      derived.push({ ...recomputeInvestment(byKey, group), id: fresh.id })
      consumedIds.add(byKey.id)
      continue
    }

    derived.push(fresh)
  }

  for (const existing of existingInvestments) {
    if (!consumedIds.has(existing.id)) {
      derived.push(existing)
    }
  }

  return derived
}
