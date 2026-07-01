import type { PurchaseRecord } from '../data/purchaseLedger'
import type { Voucher, VoucherLine } from '../accounting/types'
import type { AssetTransaction, AssetHolding, AssetTransactionType } from '../data/assetTypes'

function generateId(): string {
  return `atx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export function createTransactionFromPurchase(
  purchase: PurchaseRecord,
  voucher: Voucher,
): AssetTransaction {
  const debitLine = voucher.lines.find(l => l.type === 'Debit')
  return {
    id: generateId(),
    purchaseRecordId: purchase.id,
    voucherId: voucher.id,
    voucherNumber: voucher.number,
    accountId: purchase.accountId,
    accountCode: purchase.accountCode,
    type: 'purchase',
    assetType: purchase.assetType,
    assetName: purchase.assetName,
    date: purchase.purchaseDate,
    quantity: purchase.quantity,
    unitPrice: purchase.unitPrice,
    totalValue: purchase.totalValue,
    direction: 'increase',
    createdAt: new Date().toISOString(),
    description: `Purchase ${purchase.quantity} ${purchase.assetName} @ ${purchase.unitPrice}`,
  }
}

export function buildAssetTransactions(
  purchases: PurchaseRecord[],
  vouchers: Voucher[],
): AssetTransaction[] {
  const txns: AssetTransaction[] = []
  const voucherMap = new Map(vouchers.map(v => [v.id, v]))

  for (const purchase of purchases) {
    if (!purchase.voucherId) continue
    const voucher = voucherMap.get(purchase.voucherId)
    if (!voucher) continue
    txns.push(createTransactionFromPurchase(purchase, voucher))
  }

  txns.sort((a, b) => a.date.localeCompare(b.date))
  return txns
}

export function buildAssetHoldings(
  purchases: PurchaseRecord[],
  vouchers: Voucher[],
  accounts: Array<{ id: string; code: string; name: string; type: string }>,
): AssetHolding[] {
  const activePurchases = purchases.filter(p => p.status === 'active')

  const grouped = new Map<string, PurchaseRecord[]>()
  for (const p of activePurchases) {
    const key = `${p.assetType}::${p.assetName}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(p)
  }

  const holdings: AssetHolding[] = []
  for (const [key, group] of grouped) {
    const [assetType, assetName] = key.split('::')
    const totalQty = group.reduce((s, p) => s + p.quantity, 0)
    const totalInvested = group.reduce((s, p) => s + p.totalValue, 0)
    const avgCost = totalQty > 0 ? totalInvested / totalQty : 0

    const account = group.find(p => p.accountId)
      ? accounts.find(a => a.id === group[0].accountId)
      : undefined

    holdings.push({
      accountId: account?.id || '',
      accountCode: account?.code || group[0]?.accountCode || '',
      assetType,
      assetName,
      totalQuantity: totalQty,
      totalInvested,
      averageCost: avgCost,
      currentValue: totalInvested,
      marketValue: totalInvested,
      unrealizedGain: 0,
      portfolioPercentage: 0,
      realizedGain: 0,
      growthPercent: 0,
      transactionCount: group.length,
      purchaseRecordIds: group.map(p => p.id),
      voucherIds: group.filter(p => p.voucherId).map(p => p.voucherId),
      voucherNumbers: group.filter(p => p.voucherNumber).map(p => p.voucherNumber),
    })
  }

  holdings.sort((a, b) => b.totalInvested - a.totalInvested)
  return holdings
}
