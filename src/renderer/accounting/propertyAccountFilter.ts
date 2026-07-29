import type { Account } from './types'

/** Root/structural accounts shared across modules */
const SHARED_ROOT_CODES = new Set([
  '1000', // Assets root
  '2000', // Liabilities root
  '3000', // Owner Equity root
  '4000', // Revenue root
  '5000', // Expenses root
])

/** Property-specific asset code prefixes */
const PROPERTY_ASSET_PREFIXES = [
  '111', // Cash In Hand
  '112', // Bank Accounts
  '127', // Real Estate / Properties
  '141', // Post-dated Cheques Receivable
  '142', // Security Cheques Received
]

/** Property-specific liability code prefixes */
const PROPERTY_LIABILITY_PREFIXES = [
  '210', // Accounts Payable
  '211', // Deferred Revenue
  '212', // Security Deposits Held
]

/** Property-specific equity code prefixes */
const PROPERTY_EQUITY_PREFIXES = [
  '312', // Retained Earnings
  '320', // Current Year Earnings
]

/** Property-specific revenue code prefixes */
const PROPERTY_REVENUE_PREFIXES = [
  '412', // Building Rental Income
  '420', // Villa Rental Income
  '421', // Apartment Rental Income
]

/** Property-specific expense code prefixes */
const PROPERTY_EXPENSE_PREFIXES = [
  '510', // Repair Expense
  '511', // Management Fees
  '512', // Maintenance Expense
  '518', // Miscellaneous Property Expenses
  '521', // Purchase Input VAT Expense
]

/** All property-valid prefixes combined */
const ALL_PROPERTY_PREFIXES = [
  ...PROPERTY_ASSET_PREFIXES,
  ...PROPERTY_LIABILITY_PREFIXES,
  ...PROPERTY_EQUITY_PREFIXES,
  ...PROPERTY_REVENUE_PREFIXES,
  ...PROPERTY_EXPENSE_PREFIXES,
]

/** Explicitly known Investment-only codes to block in Property */
const INVESTMENT_ONLY_CODES = new Set([
  '1200', // Investments parent
  '1210', // Gold Holding
  '1220', // Silver Holding
  '1230', // Sukuk Holding
  '1240', // Bonds Holding
  '1250', // Mutual Funds Holding
  '1260', // Stocks & Shares Holding
  '1280', // Private Investment Holding
  '1290', // Fixed Deposit Holding
  '4110', // Dividend Income
  '4130', // Capital Gain
  '4140', // Interest Income
  '4150', // Sukuk Profit
  '4160', // Bond Coupon
  '4170', // Mutual Fund Distribution
  '4180', // Investment Sale Proceeds
  '4190', // Investment Refund
  '5130', // Brokerage Charges
  '5140', // Transfer Fees
  '5150', // Investment Bank Charges
  '5160', // Fund Management Charges
])

/**
 * Determines whether a single account belongs to the Property module.
 */
export function isPropertyAccount(account: Account): boolean {
  // 1. Module field takes priority when present
  if (account.module === 'property' || account.module === 'shared') {
    return true
  }

  // 2. Code-based classification — guards against cross-module mis-tagging
  //    (e.g. shared-code accounts tagged 'investment' by Investment init)
  if (INVESTMENT_ONLY_CODES.has(account.code)) {
    return false
  }

  if (SHARED_ROOT_CODES.has(account.code)) {
    return true
  }

  // Handle bank accounts under 112 (1120 and children) specially to avoid showing investment bank accounts
  if (account.code.startsWith('112') && account.code.length > 3) {
    if (account.name.toLowerCase().includes('investment')) {
      return false
    }
  }

  const matchesPropertyPrefix = ALL_PROPERTY_PREFIXES.some(prefix => account.code.startsWith(prefix))

  // Only check module after code prefix — shared-code accounts tagged 'investment'
  // by Investment init should still match Property when their code says so.
  if (account.module === 'investment') {
    return matchesPropertyPrefix
  }

  return matchesPropertyPrefix
}

/**
 * Filters an Account[] to return only accounts that belong to the Property module.
 */
export function filterPropertyAccounts(accounts: Account[]): Account[] {
  return accounts.filter(isPropertyAccount)
}

/**
 * Migrates an existing accounts array by tagging each account with the correct module.
 */
export function migrateAccountModules(accounts: Account[]): Account[] {
  return accounts.map(account => {
    if (account.module) return account // Already tagged

    if (SHARED_ROOT_CODES.has(account.code)) {
      return { ...account, module: 'shared' as const }
    }
    if (INVESTMENT_ONLY_CODES.has(account.code)) {
      return { ...account, module: 'investment' as const }
    }
    if (ALL_PROPERTY_PREFIXES.some(prefix => account.code.startsWith(prefix))) {
      return { ...account, module: 'property' as const }
    }

    // Default unrecognized to shared
    return { ...account, module: 'shared' as const }
  })
}
