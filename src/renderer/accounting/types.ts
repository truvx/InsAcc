export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'

export type NormalBalance = 'debit' | 'credit'

export type VoucherType = 'Payment' | 'Receipt' | 'Journal' | 'Contra'

export type VoucherStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Posted' | 'Cancelled' | 'Reversed'

export type LineType = 'Debit' | 'Credit'

export type ReferenceType =
  | 'Investment'
  | 'Purchase'
  | 'Property'
  | 'Tenant'
  | 'Lease'
  | 'Maintenance'
  | 'Bank'
  | 'Document'

export type AccountClassification =
  | 'current'
  | 'non-current'
  | 'operating'
  | 'non-operating'

export type AccountingEvent =
  | 'ASSET_PURCHASE'
  | 'ASSET_SALE'
  | 'ASSET_DISPOSAL'
  | 'DIVIDEND_RECEIVED'
  | 'DIVIDEND_PAID'
  | 'RENTAL_INCOME'
  | 'MAINTENANCE_PAID'
  | 'BANK_TRANSFER'
  | 'BANK_DEPOSIT'
  | 'BANK_WITHDRAWAL'
  | 'EXPENSE_PAID'
  | 'INCOME_RECEIVED'
  | 'OPENING_BALANCE'
  | 'PROPERTY_ACQUISITION'
  | 'RENT_RECEIVED'
  | 'FUTURE_PDC_RECEIVED'
  | 'PDC_DEPOSITED'
  | 'PDC_BOUNCED'
  | 'PDC_BOUNCE_FEE'
  | 'PDC_PENALTY'
  | 'SECURITY_DEPOSIT_RECEIVED'
  | 'SECURITY_DEPOSIT_REFUNDED'
  | 'SECURITY_DEPOSIT_FORFEITED'
  | 'INTEREST_INCOME'
  | 'INTEREST_EXPENSE'
  | 'TAX_PAID'
  | 'LOAN_DISBURSEMENT'
  | 'LOAN_REPAYMENT'
  | 'DEPRECIATION'
  | 'ACCRUED_INCOME'
  | 'ACCRUED_EXPENSE'
  | 'CONTRA_ENTRY'
  | 'CAPITAL_CONTRIBUTION'
  | 'CAPITAL_WITHDRAWAL'
  | 'UTILITY_RECOVERY'
  | 'LATE_FEE'
  | 'DEPOSIT_REFUND'
  | 'PREPAID_EXPENSE'
  | 'DEFERRED_REVENUE'
  | 'REALIZED_GAIN'
  | 'REALIZED_LOSS'
  | 'UNREALIZED_GAIN'
  | 'UNREALIZED_LOSS'
  | 'GOODS_PURCHASE'
  | 'GOODS_SALE'
  | 'SALARY_PAID'
  | 'SERVICE_INCOME'
  | 'PURCHASE_RETURN'
  | 'SALES_RETURN'

export interface Account {
  id: string
  code: string
  name: string
  type: AccountType
  normalBalance: NormalBalance
  parentId: string | null
  isActive: boolean
  description: string
  currency: string
  createdAt: string
  updatedAt: string
  classification?: AccountClassification
  contraAccountId?: string
  openingBalance?: number
  openingBalanceDate?: string
  isCashEquivalent?: boolean
}

export interface VoucherLine {
  id: string
  accountId: string
  type: LineType
  amount: number
  baseAmount: number
  currency: string
  narration?: string
  referenceType?: ReferenceType
  referenceId?: string
}

export interface CreateVoucherInput {
  date: string
  type: VoucherType
  reference?: string
  description: string
  currency?: string
  exchangeRate?: number
  baseCurrency?: string
  createdBy: string
  lines: CreateVoucherLineInput[]
}

export interface CreateVoucherLineInput {
  accountId: string
  type: LineType
  amount: number
  currency?: string
  narration?: string
  referenceType?: ReferenceType
  referenceId?: string
}

export interface PostingRuleEntry {
  account: string | RuleResolver
  narration?: string
}

export interface PostingRule {
  event: AccountingEvent
  description: string
  voucherType: VoucherType
  debit: PostingRuleEntry[]
  credit: PostingRuleEntry[]
}

export type RuleResolver = (context: RuleContext) => string

export interface RuleContext {
  assetAccount?: string
  bankAccount?: string
  debitAccount?: string
  creditAccount?: string
  amount: number
  date: string
  description: string
  currency: string
  exchangeRate: number
  baseCurrency: string
  referenceType?: ReferenceType
  referenceId?: string
  createdBy?: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export interface ValidationError {
  code: string
  field?: string
  message: string
}

export interface TrialBalanceEntry {
  accountId: string
  accountCode: string
  accountName: string
  type: AccountType
  totalDebit: number
  totalCredit: number
  balance: number
}

export interface RunningBalanceEntry {
  date: string
  voucherNumber: string
  description: string
  debit: number
  credit: number
  balance: number
}

export interface AccountStatementEntry {
  date: string
  voucherNumber: string
  voucherType: VoucherType
  description: string
  reference: string
  debit: number
  credit: number
  balance: number
}

export interface Voucher {
  id: string
  number: string
  date: string
  type: VoucherType
  reference: string
  description: string
  status: VoucherStatus
  currency: string
  exchangeRate: number
  baseCurrency: string
  createdBy: string
  createdAt: string
  updatedAt: string
  approvedBy?: string
  approvedAt?: string
  postedBy?: string
  postedAt?: string
  lines: VoucherLine[]
  reversedVoucherId?: string
  reversalOfVoucherId?: string
  periodId?: string
  fiscalYearId?: string
}

export interface PeriodLock {
  id: string
  periodKey: string
  locked: boolean
  lockedAt?: string
  lockedBy?: string
  fiscalYearId: string
}

export interface FiscalYear {
  id: string
  name: string
  startDate: string
  endDate: string
  isClosed: boolean
  isDefault: boolean
  createdAt: string
}

export interface BankReconciliation {
  id: string
  bankAccountId: string
  statementDate: string
  statementBalance: number
  ledgerBalance: number
  difference: number
  status: 'in_progress' | 'reconciled' | 'difference'
  matchedTransactions: string[]
  unmatchedTransactions: string[]
  createdAt: string
  updatedAt: string
  reconciledAt?: string
}

export interface BankStatementLine {
  id: string
  date: string
  amount: number        // Positive for credit/deposits, negative for debit/withdrawals
  description: string
  reference?: string
  matchedVoucherLineId?: string
  matchedVoucherLineIds?: string[]
  allocations?: { voucherLineId: string; amount: number }[]
  matchConfidence: 'High' | 'Medium' | 'None'
  status: 'Unmatched' | 'Matched' | 'Adjusted'
}

export interface BankReconciliationRecord {
  id: string
  bankAccountId: string
  statementStartDate: string
  statementEndDate: string
  statementOpeningBalance: number
  statementClosingBalance: number
  reconciledBalance: number
  status: 'Draft' | 'Reconciled'
  statementLines: BankStatementLine[]
  createdAt: string
  updatedAt: string
}

export interface AccountNode {
  account: Account
  children: AccountNode[]
  depth: number
}

export interface AssetHolding {
  id: string
  assetType: string
  assetName: string
  accountId: string
  purchasedQuantity: number
  soldQuantity: number
  currentQuantity: number
  totalCostBasis: number
  averageCost: number
  createdAt: string
  updatedAt: string
}

export type AssetTransactionType = 'Purchase' | 'Sale' | 'Bonus' | 'Split' | 'Transfer' | 'Revaluation'

export interface AssetTransaction {
  id: string
  assetHoldingId: string
  type: AssetTransactionType
  date: string
  quantity: number
  unitPrice: number
  totalValue: number
  voucherId: string
  description: string
  notes: string
  createdAt: string
}

export interface AssetPriceHistory {
  id: string
  assetHoldingId: string
  date: string
  price: number
  currency: string
  source: 'manual' | 'market' | 'revaluation'
  notes?: string
  createdAt: string
}

export interface PostingResult {
  success: boolean
  voucher?: Voucher
  errors: ValidationError[]
}

export type VoucherEventType = 'VOUCHER_CREATED' | 'VOUCHER_APPROVED' | 'VOUCHER_POSTED' | 'VOUCHER_CANCELLED' | 'VOUCHER_REVERSED'

export interface VoucherEvent {
  type: VoucherEventType
  voucher: Voucher
  timestamp: string
}

export type VoucherEventCallback = (event: VoucherEvent) => void

export interface BankMapping {
  bankAccountId: string
  accountId: string
  accountCode: string
  accountName: string
}
