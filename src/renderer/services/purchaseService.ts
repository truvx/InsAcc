import type { PurchaseCategory, Purchase, ItemAverages } from '../data/purchaseData'

export function computeAverages(categories: PurchaseCategory[], purchases: Purchase[]): ItemAverages[] {
  const byItem: Record<string, Purchase[]> = {}
  purchases.forEach(p => {
    if (!byItem[p.itemId]) byItem[p.itemId] = []
    byItem[p.itemId].push(p)
  })

  return Object.entries(byItem).map(([itemId, pList]) => {
    const cat = categories.find(c => c.items.some(i => i.id === itemId))
    const item = cat?.items.find(i => i.id === itemId)
    const count = pList.length
    const totalQty = pList.reduce((s, p) => s + p.quantity, 0)
    const totalVal = pList.reduce((s, p) => s + p.totalValue, 0)
    const sumUnitPrice = pList.reduce((s, p) => s + p.unitPrice, 0)
    return {
      itemId,
      itemName: item?.name || itemId,
      categoryName: cat?.name || 'Unknown',
      purchaseCount: count,
      totalQuantity: totalQty,
      totalValue: totalVal,
      avgUnitPrice: count ? +(sumUnitPrice / count).toFixed(2) : 0,
      avgValue: count ? +(totalVal / count).toFixed(2) : 0,
      avgQuantity: count ? +(totalQty / count).toFixed(2) : 0,
    }
  })
}

let purchaseIdCounter = Date.now()

export function nextPurchaseId(): string {
  return `P-${++purchaseIdCounter}`
}
