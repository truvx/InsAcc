export interface Purchase {
  id: string
  date: string
  itemId: string
  quantity: number
  unitPrice: number
  totalValue: number
}

export interface PurchaseItem {
  id: string
  name: string
}

export interface PurchaseCategory {
  id: string
  name: string
  isCustom: boolean
  items: PurchaseItem[]
}

export interface ItemAverages {
  itemId: string
  itemName: string
  categoryName: string
  purchaseCount: number
  totalQuantity: number
  totalValue: number
  avgUnitPrice: number
  avgValue: number
  avgQuantity: number
}

export function getDefaultCategories(): PurchaseCategory[] {
  return []
}
