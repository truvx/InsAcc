import type { Account, Voucher } from '../accounting/types'
import type { PurchaseRecord } from '../data/purchaseLedger'
import type { AssetHolding } from '../data/assetTypes'
import { getAccountBalance, getLinesByReference, getLinesForAccount } from '../accounting/ledgerService'
import { getAccountById } from '../accounting/chartOfAccountsService'

export interface HoldingDetail extends AssetHolding {
  linkedLines: number
}

export function getInvestmentHoldingsProjection(
  purchases: PurchaseRecord[],
  vouchers: Voucher[],
  accounts: Array<{ id: string; code: string; name: string; type: string }>,
): HoldingDetail[] {
  const activePurchases = purchases.filter(p => p.status === 'active')

  // Calculate simple average price per purity/metal group (assetType)
  const purityAverages = new Map<string, number>()
  const groupedByType = new Map<string, number[]>()
  for (const p of activePurchases) {
    if (!groupedByType.has(p.assetType)) {
      groupedByType.set(p.assetType, [])
    }
    groupedByType.get(p.assetType)!.push(p.unitPrice)
  }
  for (const [type, prices] of groupedByType) {
    const sum = prices.reduce((s, pr) => s + pr, 0)
    const avg = prices.length > 0 ? sum / prices.length : 0
    purityAverages.set(type, avg)
  }

  const grouped = new Map<string, PurchaseRecord[]>()
  for (const p of activePurchases) {
    const key = `${p.assetType}::${p.assetName}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(p)
  }

  const holdings: HoldingDetail[] = []
  const grandTotalInvested = activePurchases.reduce((s, p) => s + p.totalValue, 0)

  for (const [key, group] of grouped) {
    const [assetType, assetName] = key.split('::')
    const totalQty = group.reduce((s, p) => s + p.quantity, 0)
    const totalInvested = group.reduce((s, p) => s + p.totalValue, 0)
    const purchaseCount = group.length
    const sumUnitPrice = group.reduce((s, p) => s + p.unitPrice, 0)
    const avgPurchaseValue = purchaseCount > 0 ? sumUnitPrice / purchaseCount : 0
    const portfolioPercentage = grandTotalInvested > 0 ? (totalInvested / grandTotalInvested) * 100 : 0

    const account = group.find(p => p.accountId)
      ? accounts.find(a => a.id === group[0].accountId)
      : undefined

    const accountId = account?.id || group[0]?.accountId || ''
    const currentBalance = accountId ? getAccountBalance(accountId, vouchers, accounts as Account[]) : 0

    const marketPrice = currentBalance
    const marketValue = Math.round(marketPrice * (assetType === 'Silver Bullion 999' ? totalQty : 1) * 100) / 100

    const unrealizedGain = marketValue - totalInvested
    const growthPercent = totalInvested > 0 ? (unrealizedGain / totalInvested) * 100 : 0

    const lines = accountId ? getLinesForAccount(accountId, vouchers) : []

    holdings.push({
      accountId,
      accountCode: account?.code || group[0]?.accountCode || '',
      assetType,
      assetName,
      totalQuantity: totalQty,
      totalInvested,
      avgPurchaseValue,
      simpleAvgPrice: purityAverages.get(assetType) || 0,
      currentValue: currentBalance,
      marketValue,
      unrealizedGain,
      realizedGain: 0,
      growthPercent,
      portfolioPercentage,
      transactionCount: group.length,
      purchaseRecordIds: group.map(p => p.id),
      voucherIds: group.filter(p => p.voucherId).map(p => p.voucherId),
      voucherNumbers: group.filter(p => p.voucherNumber).map(p => p.voucherNumber),
      linkedLines: lines.length,
    })
  }

  holdings.sort((a, b) => b.totalInvested - a.totalInvested)
  return holdings
}
