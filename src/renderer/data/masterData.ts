export interface Currency {
  id: string
  code: string          // e.g. "AED", "USD"
  symbol: string        // e.g. "د.إ", "$"
  exchangeRate: number  // base rate (default 1)
  isBase: boolean
}

export interface TaxCode {
  id: string
  code: string          // e.g. "VAT-5", "VAT-ZERO", "EXEMPT"
  name: string
  rate: number          // e.g. 0.05
  ledgerAccountId?: string // Mapped GL account ID (e.g. Sales Tax Liability)
}

export interface PaymentTerm {
  id: string
  name: string          // e.g. "Net 30", "Due on Receipt"
  dueDays: number       // e.g. 30
}

export interface Vendor {
  id: string
  name: string
  code: string          // e.g. "VEN-001"
  email?: string
  phone?: string
  taxRegistrationNumber?: string // VAT TRN
  taxCodeId?: string    // default tax code
  paymentTermId?: string // default terms
  payablesAccountId?: string // Accounts Payable GL code (2100)
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface MasterCustomer {
  id: string
  name: string
  code: string          // e.g. "CUST-001"
  email?: string
  phone?: string
  taxRegistrationNumber?: string
  taxCodeId?: string
  paymentTermId?: string
  receivablesAccountId?: string // Accounts Receivable GL code (1320)
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AssetType {
  id: string
  name: string          // e.g. "Precious Metals", "Real Estate"
  depreciationMethod: 'StraightLine' | 'DecliningBalance' | 'None'
  usefulLifeMonths: number
  costAccountId?: string // Asset Cost GL account
  accumulatedDepreciationAccountId?: string // Contra Asset GL account
  depreciationExpenseAccountId?: string // Depreciation Expense GL account
}

export interface FixedAsset {
  id: string
  name: string
  code: string          // e.g. "AST-001"
  assetTypeId: string
  purchaseDate: string
  purchaseCost: number
  residualValue: number
  usefulLifeMonths: number
  depreciationStartDate?: string
  costAccountId?: string
  accumulatedDepreciationAccountId?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}
