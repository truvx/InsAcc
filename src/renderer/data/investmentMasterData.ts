// ─── Investment Master Data ───────────────────────────────────────────────────
// Single source of truth for investment categories and assets.
// The client can extend this at runtime; defaults ship with the app.

export interface InvestmentCategory {
  id: string
  name: string
  active: boolean
  displayOrder: number
}

export interface InvestmentAsset {
  id: string
  categoryId: string
  name: string
  symbol?: string
  unit?: string
  active: boolean
  displayOrder: number
}

// ─── Default Categories ───────────────────────────────────────────────────────

export const DEFAULT_INVESTMENT_CATEGORIES: InvestmentCategory[] = [
  { id: 'cat-gold',         name: 'Gold',         active: true,  displayOrder: 1 },
  { id: 'cat-silver',       name: 'Silver',       active: true,  displayOrder: 2 },
  { id: 'cat-bonds',        name: 'Bonds',        active: true,  displayOrder: 3 },
  { id: 'cat-mutual-funds', name: 'Mutual Funds', active: true,  displayOrder: 4 },
  { id: 'cat-stocks',       name: 'Stocks',       active: true,  displayOrder: 5 },
  { id: 'cat-shares',       name: 'Shares',       active: true,  displayOrder: 6 },
  { id: 'cat-sukuk',        name: 'Sukuk',        active: true,  displayOrder: 7 },
  { id: 'cat-other-1',      name: 'Other Category 1', active: true,  displayOrder: 8 },
  { id: 'cat-other-2',      name: 'Other Category 2', active: true,  displayOrder: 9 },
  { id: 'cat-other-3',      name: 'Other Category 3', active: true,  displayOrder: 10 },
  { id: 'cat-other-4',      name: 'Other Category 4', active: true,  displayOrder: 11 },
]

// ─── Default Assets ───────────────────────────────────────────────────────────

export const DEFAULT_INVESTMENT_ASSETS: InvestmentAsset[] = [
  // Gold
  { id: 'ast-gold-24k-1kg', categoryId: 'cat-gold', name: '24K Gold Bar 1kg', unit: 'gram', active: true, displayOrder: 1 },
  { id: 'ast-gold-24k-100g', categoryId: 'cat-gold', name: '24K Gold Bar 100g', unit: 'gram', active: true, displayOrder: 2 },
  { id: 'ast-gold-24k-50g', categoryId: 'cat-gold', name: '24K Gold Bar 50g', unit: 'gram', active: true, displayOrder: 3 },
  { id: 'ast-gold-24k-coin', categoryId: 'cat-gold', name: '24K Gold Coin', unit: 'pcs', active: true, displayOrder: 4 },
  { id: 'ast-gold-22k-coin', categoryId: 'cat-gold', name: '22K Gold Coin', unit: 'pcs', active: true, displayOrder: 5 },
  { id: 'ast-gold-biscuit-10g', categoryId: 'cat-gold', name: 'Gold Biscuit 10g', unit: 'pcs', active: true, displayOrder: 6 },
  { id: 'ast-gold-biscuit-100g', categoryId: 'cat-gold', name: 'Gold Biscuit 100g', unit: 'pcs', active: true, displayOrder: 7 },
  { id: 'ast-gold-jewellery', categoryId: 'cat-gold', name: 'Gold Jewellery', unit: 'gram', active: true, displayOrder: 8 },
  { id: 'ast-gold-etf', categoryId: 'cat-gold', name: 'Gold ETF', unit: 'unit', active: true, displayOrder: 9 },
  { id: 'ast-gold-cert', categoryId: 'cat-gold', name: 'Gold Savings Certificate', unit: 'unit', active: true, displayOrder: 10 },

  // Silver
  { id: 'ast-silver-999-bar', categoryId: 'cat-silver', name: '999 Silver Bar', unit: 'gram', active: true, displayOrder: 1 },
  { id: 'ast-silver-999-coin', categoryId: 'cat-silver', name: '999 Silver Coin', unit: 'pcs', active: true, displayOrder: 2 },
  { id: 'ast-silver-bullion-1kg', categoryId: 'cat-silver', name: 'Silver Bullion 1kg', unit: 'gram', active: true, displayOrder: 3 },
  { id: 'ast-silver-bullion-5kg', categoryId: 'cat-silver', name: 'Silver Bullion 5kg', unit: 'gram', active: true, displayOrder: 4 },
  { id: 'ast-silver-etf', categoryId: 'cat-silver', name: 'Silver ETF', unit: 'unit', active: true, displayOrder: 5 },
  { id: 'ast-silver-cert', categoryId: 'cat-silver', name: 'Silver Certificate', unit: 'unit', active: true, displayOrder: 6 },

  // Mutual Funds
  { id: 'ast-mf-fab-balanced', categoryId: 'cat-mutual-funds', name: 'Global Balanced Fund 1', unit: 'unit', active: true, displayOrder: 1 },
  { id: 'ast-mf-enbd-equity', categoryId: 'cat-mutual-funds', name: 'Global Equity Fund 2', unit: 'unit', active: true, displayOrder: 2 },
  { id: 'ast-mf-adcb-income', categoryId: 'cat-mutual-funds', name: 'Global Income Fund 1', unit: 'unit', active: true, displayOrder: 3 },
  { id: 'ast-mf-mashreq-global', categoryId: 'cat-mutual-funds', name: 'Global Growth Fund 1', unit: 'unit', active: true, displayOrder: 4 },
  { id: 'ast-mf-franklin-growth', categoryId: 'cat-mutual-funds', name: 'Franklin Templeton Growth Fund', unit: 'unit', active: true, displayOrder: 5 },
  { id: 'ast-mf-blackrock-global', categoryId: 'cat-mutual-funds', name: 'BlackRock Global Allocation Fund', unit: 'unit', active: true, displayOrder: 6 },
  { id: 'ast-mf-vanguard-spp', categoryId: 'cat-mutual-funds', name: 'Vanguard S&P 500 Index Fund', unit: 'unit', active: true, displayOrder: 7 },
  { id: 'ast-mf-fidelity-global', categoryId: 'cat-mutual-funds', name: 'Fidelity Global Fund', unit: 'unit', active: true, displayOrder: 8 },
  { id: 'ast-mf-hsbc-islamic', categoryId: 'cat-mutual-funds', name: 'Global Shariah Equity Fund', unit: 'unit', active: true, displayOrder: 9 },
  { id: 'ast-mf-dib-equity', categoryId: 'cat-mutual-funds', name: 'Shariah Growth Fund', unit: 'unit', active: true, displayOrder: 10 },

  // Stocks
  { id: 'ast-stk-emaar', categoryId: 'cat-stocks', name: 'Emaar Properties', unit: 'unit', active: true, displayOrder: 1 },
  { id: 'ast-stk-dib', categoryId: 'cat-stocks', name: 'Commercial Bank Stock 1', unit: 'unit', active: true, displayOrder: 2 },
  { id: 'ast-stk-enbd', categoryId: 'cat-stocks', name: 'Commercial Bank Stock 2', unit: 'unit', active: true, displayOrder: 3 },
  { id: 'ast-stk-fab', categoryId: 'cat-stocks', name: 'Commercial Bank Stock 3', unit: 'unit', active: true, displayOrder: 4 },
  { id: 'ast-stk-salik', categoryId: 'cat-stocks', name: 'Salik', unit: 'unit', active: true, displayOrder: 5 },
  { id: 'ast-stk-dewa', categoryId: 'cat-stocks', name: 'DEWA', unit: 'unit', active: true, displayOrder: 6 },
  { id: 'ast-stk-aldar', categoryId: 'cat-stocks', name: 'Aldar Properties', unit: 'unit', active: true, displayOrder: 7 },
  { id: 'ast-stk-adnoc', categoryId: 'cat-stocks', name: 'ADNOC Distribution', unit: 'unit', active: true, displayOrder: 8 },
  { id: 'ast-stk-dubinvest', categoryId: 'cat-stocks', name: 'Dubai Investments', unit: 'unit', active: true, displayOrder: 9 },
  { id: 'ast-stk-airarabia', categoryId: 'cat-stocks', name: 'Air Arabia', unit: 'unit', active: true, displayOrder: 10 },
  { id: 'ast-stk-etisalat', categoryId: 'cat-stocks', name: 'Etisalat by e&', unit: 'unit', active: true, displayOrder: 11 },
  { id: 'ast-stk-borouge', categoryId: 'cat-stocks', name: 'Borouge', unit: 'unit', active: true, displayOrder: 12 },

  // Shares
  { id: 'ast-shr-common', categoryId: 'cat-shares', name: 'Common Shares', unit: 'unit', active: true, displayOrder: 1 },
  { id: 'ast-shr-preferred', categoryId: 'cat-shares', name: 'Preferred Shares', unit: 'unit', active: true, displayOrder: 2 },
  { id: 'ast-shr-classa', categoryId: 'cat-shares', name: 'Class A Shares', unit: 'unit', active: true, displayOrder: 3 },
  { id: 'ast-shr-classb', categoryId: 'cat-shares', name: 'Class B Shares', unit: 'unit', active: true, displayOrder: 4 },
  { id: 'ast-shr-employee', categoryId: 'cat-shares', name: 'Employee Shares', unit: 'unit', active: true, displayOrder: 5 },
  { id: 'ast-shr-private', categoryId: 'cat-shares', name: 'Private Company Shares', unit: 'unit', active: true, displayOrder: 6 },
  { id: 'ast-shr-ipo', categoryId: 'cat-shares', name: 'IPO Shares', unit: 'unit', active: true, displayOrder: 7 },
  { id: 'ast-shr-bonus', categoryId: 'cat-shares', name: 'Bonus Shares', unit: 'unit', active: true, displayOrder: 8 },
  { id: 'ast-shr-rights', categoryId: 'cat-shares', name: 'Rights Issue Shares', unit: 'unit', active: true, displayOrder: 9 },
  { id: 'ast-shr-treasury', categoryId: 'cat-shares', name: 'Treasury Shares', unit: 'unit', active: true, displayOrder: 10 },

  // Sukuk
  { id: 'ast-sukuk-dib', categoryId: 'cat-sukuk', name: 'Shariah Sukuk 1', unit: 'unit', active: true, displayOrder: 1 },
  { id: 'ast-sukuk-uae-fed', categoryId: 'cat-sukuk', name: 'UAE Federal Sukuk', unit: 'unit', active: true, displayOrder: 2 },
  { id: 'ast-sukuk-gov-dub', categoryId: 'cat-sukuk', name: 'Government of Dubai Sukuk', unit: 'unit', active: true, displayOrder: 3 },
  { id: 'ast-sukuk-fab', categoryId: 'cat-sukuk', name: 'Corporate Sukuk 1', unit: 'unit', active: true, displayOrder: 4 },
  { id: 'ast-sukuk-eib', categoryId: 'cat-sukuk', name: 'Shariah Sukuk 2', unit: 'unit', active: true, displayOrder: 5 },
  { id: 'ast-sukuk-adib', categoryId: 'cat-sukuk', name: 'Shariah Sukuk 3', unit: 'unit', active: true, displayOrder: 6 },
  { id: 'ast-sukuk-emaar', categoryId: 'cat-sukuk', name: 'Emaar Sukuk', unit: 'unit', active: true, displayOrder: 7 },
  { id: 'ast-sukuk-nakheel', categoryId: 'cat-sukuk', name: 'Nakheel Sukuk', unit: 'unit', active: true, displayOrder: 8 },
  { id: 'ast-sukuk-saudi', categoryId: 'cat-sukuk', name: 'Saudi Sovereign Sukuk', unit: 'unit', active: true, displayOrder: 9 },
  { id: 'ast-sukuk-qatar', categoryId: 'cat-sukuk', name: 'Qatar Sukuk', unit: 'unit', active: true, displayOrder: 10 },
  { id: 'ast-sukuk-bahrain', categoryId: 'cat-sukuk', name: 'Bahrain Sovereign Sukuk', unit: 'unit', active: true, displayOrder: 11 },
  { id: 'ast-sukuk-malaysia', categoryId: 'cat-sukuk', name: 'Malaysia Government Sukuk', unit: 'unit', active: true, displayOrder: 12 },
  { id: 'ast-sukuk-corporate', categoryId: 'cat-sukuk', name: 'Corporate Sukuk', unit: 'unit', active: true, displayOrder: 13 },
  { id: 'ast-sukuk-green', categoryId: 'cat-sukuk', name: 'Green Sukuk', unit: 'unit', active: true, displayOrder: 14 },
  { id: 'ast-sukuk-short', categoryId: 'cat-sukuk', name: 'Short-Term Sukuk', unit: 'unit', active: true, displayOrder: 15 },
  { id: 'ast-sukuk-long', categoryId: 'cat-sukuk', name: 'Long-Term Sukuk', unit: 'unit', active: true, displayOrder: 16 },
]

// ─── Query Helpers ────────────────────────────────────────────────────────────

export function getDefaultInvestmentCategories(): InvestmentCategory[] {
  return DEFAULT_INVESTMENT_CATEGORIES.map(c => ({ ...c }))
}

export function getDefaultInvestmentAssets(): InvestmentAsset[] {
  return DEFAULT_INVESTMENT_ASSETS.map(a => ({ ...a }))
}

/** Returns active categories sorted by displayOrder */
export function getActiveCategories(categories: InvestmentCategory[]): InvestmentCategory[] {
  return categories.filter(c => c.active).sort((a, b) => a.displayOrder - b.displayOrder)
}

/** Returns active assets for a given categoryId, sorted by displayOrder */
export function getAssetsForCategory(assets: InvestmentAsset[], categoryId: string): InvestmentAsset[] {
  return assets
    .filter(a => a.categoryId === categoryId && a.active)
    .sort((a, b) => a.displayOrder - b.displayOrder)
}

/** Returns the category name for a given categoryId */
export function getCategoryName(categories: InvestmentCategory[], categoryId: string): string {
  return categories.find(c => c.id === categoryId)?.name ?? ''
}

/** Returns all active category names (for VALID_ASSET_TYPES compatibility) */
export function getActiveCategoryNames(categories: InvestmentCategory[]): string[] {
  return getActiveCategories(categories).map(c => c.name)
}

/** Find category by name */
export function findCategoryByName(categories: InvestmentCategory[], name: string): InvestmentCategory | undefined {
  return categories.find(c => c.name === name)
}

/** Formats asset types/categories to display 'Unknown Category' for old placeholders */
export function formatAssetType(type: string): string {
  if (/^Other\s*[1-4]$/i.test(type || '')) {
    return 'Unknown Category'
  }
  return type
}
