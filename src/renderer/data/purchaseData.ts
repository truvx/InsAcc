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

const DEFAULT_CATEGORIES: PurchaseCategory[] = [
  {
    id: 'gold', name: 'Gold', isCustom: false,
    items: [
      { id: 'gold-24k-bar', name: '24K Bar (999.9)' },
      { id: 'gold-23k-bar', name: '23K Bar (958)' },
      { id: 'gold-22k-bar', name: '22K Bar (916)' },
      { id: 'gold-21k-bar', name: '21K Bar (875)' },
      { id: 'gold-22k-jewelry', name: '22K Jewelry' },
      { id: 'gold-23k-jewelry', name: '23K Jewelry' },
    ],
  },
  {
    id: 'silver', name: 'Silver', isCustom: false,
    items: [
      { id: 'silver-bar-1kg', name: 'Silver Bar 1kg (999.9)' },
      { id: 'silver-bar-500g', name: 'Silver Bar 500g' },
      { id: 'silver-bar-100g', name: 'Silver Bar 100g' },
      { id: 'silver-coin-1oz', name: 'Silver Coin 1oz' },
      { id: 'silver-round-1oz', name: 'Silver Round 1oz' },
      { id: 'silver-etf', name: 'Silver ETF' },
    ],
  },
  {
    id: 'bonds', name: 'Bonds', isCustom: false,
    items: [
      { id: 'bond-gov-10yr', name: 'Government Bond 10yr' },
      { id: 'bond-gov-5yr', name: 'Government Bond 5yr' },
      { id: 'bond-corp-aaa', name: 'Corporate Bond AAA' },
      { id: 'bond-corp-aa', name: 'Corporate Bond AA' },
      { id: 'bond-sukuk', name: 'Sukuk (Islamic Bond)' },
      { id: 'bond-tbill', name: 'Treasury Bill' },
    ],
  },
  {
    id: 'mutual-funds', name: 'Mutual Funds', isCustom: false,
    items: [
      { id: 'mf-equity', name: 'Equity Fund' },
      { id: 'mf-balanced', name: 'Balanced Fund' },
      { id: 'mf-fixed-income', name: 'Fixed Income Fund' },
      { id: 'mf-money-market', name: 'Money Market Fund' },
      { id: 'mf-index', name: 'Index Fund' },
      { id: 'mf-sharia', name: 'Sharia-Compliant Fund' },
    ],
  },
  {
    id: 'stocks', name: 'Stocks', isCustom: false,
    items: [
      { id: 'stock-bluechip', name: 'Blue Chip Stock' },
      { id: 'stock-growth', name: 'Growth Stock' },
      { id: 'stock-dividend', name: 'Dividend Stock' },
      { id: 'stock-penny', name: 'Penny Stock' },
      { id: 'stock-etf', name: 'ETF (Exchange Traded Fund)' },
    ],
  },
  {
    id: 'shares', name: 'Shares', isCustom: false,
    items: [
      { id: 'share-common', name: 'Common Shares' },
      { id: 'share-preferred', name: 'Preferred Shares' },
      { id: 'share-listed', name: 'Listed Shares' },
      { id: 'share-unlisted', name: 'Unlisted Shares' },
      { id: 'share-private-equity', name: 'Private Equity Shares' },
    ],
  },
  {
    id: 'custom-7', name: 'Category 7', isCustom: true,
    items: [],
  },
  {
    id: 'custom-8', name: 'Category 8', isCustom: true,
    items: [],
  },
  {
    id: 'custom-9', name: 'Category 9', isCustom: true,
    items: [],
  },
  {
    id: 'custom-10', name: 'Category 10', isCustom: true,
    items: [],
  },
]

export function getDefaultCategories(): PurchaseCategory[] {
  return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES))
}
