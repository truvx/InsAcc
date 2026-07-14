/**
 * Investment Account Filter
 *
 * Provides a reusable filter function that ensures only investment-related
 * accounts are visible in the Investment module.
 *
 * Uses the Account.module field when available (new data), and falls back
 * to code-prefix whitelisting for backwards-compatibility with existing
 * persisted data that lacks the module field.
 */
import type { Account } from './types'

// ── Account code prefixes that belong to the Investment module ───────────────

/** Root/structural accounts shared across modules */
const SHARED_ROOT_CODES = new Set([
  '1000', // Assets root
  '2000', // Liabilities root
  '3000', // Owner Equity root
  '4000', // Revenue root
  '5000', // Expenses root
])

/** Investment-specific asset code prefixes (startsWith match) */
const INVESTMENT_ASSET_PREFIXES = [
  '1110', // Cash In Hand
  '1120', // Bank Accounts (parent + children)
  '1200', // Investments (parent)
  '121',  // Gold Holding
  '122',  // Silver Holding
  '123',  // Sukuk Holding
  '124',  // Bonds Holding
  '125',  // Mutual Funds Holding
  '126',  // Stocks & Shares Holding
  '128',  // Private Investment Holding
  '129',  // Fixed Deposit Holding
  '1320', // Accounts Receivable (generic)
]

/** Investment-specific liability code prefixes */
const INVESTMENT_LIABILITY_PREFIXES = [
  '2100', // Accounts Payable
]

/** Investment-specific equity code prefixes */
const INVESTMENT_EQUITY_PREFIXES = [
  '3120', // Retained Earnings
  '3200', // Current Year Earnings
]

/** Investment-specific revenue code prefixes */
const INVESTMENT_REVENUE_PREFIXES = [
  '4110', // Dividend Income
  '4130', // Capital Gain
  '4140', // Interest Income
  '4150', // Sukuk Profit
  '4160', // Bond Coupon
  '4170', // Mutual Fund Distribution
  '4180', // Investment Sale Proceeds
  '4190', // Investment Refund
  '4200', // Investment Income (parent)
]

/** Investment-specific expense code prefixes */
const INVESTMENT_EXPENSE_PREFIXES = [
  '5130', // Brokerage Fees
  '5140', // Transfer Fees
  '5150', // Bank Charges
  '5160', // Fund Management Charges
  '5180', // Other Expenses
  '5210', // Purchase Input VAT Expense
  '5220', // Transportation
  '5230', // Insurance
  '5240', // Documentation
]

/** All investment-valid prefixes combined */
const ALL_INVESTMENT_PREFIXES = [
  ...INVESTMENT_ASSET_PREFIXES,
  ...INVESTMENT_LIABILITY_PREFIXES,
  ...INVESTMENT_EQUITY_PREFIXES,
  ...INVESTMENT_REVENUE_PREFIXES,
  ...INVESTMENT_EXPENSE_PREFIXES,
]

// ── Property-specific codes that must NEVER appear in Investment ─────────────
const PROPERTY_ONLY_CODES = new Set([
  '1130', // Rent Receivable
  '1270', // Real Estate
  '1410', // Post-dated Cheques Receivable
  '2110', // Deferred Revenue
  '2120', // Security Deposits Held
  '4120', // Building Rental Income
  '4210', // Apartment Rental Income
  '5100', // Repair Expense (parent)
  '5110', // Management Fees
  '5120', // Maintenance
])

/**
 * Determines whether a single account belongs to the Investment module.
 *
 * Priority:
 * 1. If account.module is set, use it directly.
 * 2. If account has no module field (legacy data), use code-prefix matching.
 */
export function isInvestmentAccount(account: Account): boolean {
  // 1. Module field takes priority when present
  if (account.module === 'investment' || account.module === 'shared') {
    return true
  }

  // 2. Code-based classification — guards against cross-module mis-tagging
  //    (e.g. shared-code accounts tagged 'property' by Property init)
  // Explicitly blocked property codes
  if (PROPERTY_ONLY_CODES.has(account.code)) {
    return false
  }

  // Shared root accounts are always visible
  if (SHARED_ROOT_CODES.has(account.code)) {
    return true
  }

  if (account.module === 'property') {
    return ALL_INVESTMENT_PREFIXES.some(prefix => account.code.startsWith(prefix))
  }

  // Check against investment prefixes
  return ALL_INVESTMENT_PREFIXES.some(prefix => account.code.startsWith(prefix))
}

/**
 * Filters an Account[] to return only accounts that belong to the Investment module.
 * This is the primary function to use in all Investment UI components and read models.
 */
export function filterInvestmentAccounts(accounts: Account[]): Account[] {
  return accounts.filter(isInvestmentAccount)
}

/**
 * Tags an account with the given module. Used during initialization and migration.
 */
export function tagAccountModule(
  account: Account,
  module: 'investment' | 'property' | 'shared',
): Account {
  return { ...account, module }
}

/**
 * Migrates an existing accounts array by tagging each account with the correct module.
 * Used for one-time migration of persisted data.
 */
export function migrateAccountModules(accounts: Account[]): Account[] {
  return accounts.map(account => {
    if (account.module) return account // Already tagged

    if (SHARED_ROOT_CODES.has(account.code)) {
      return { ...account, module: 'shared' as const }
    }
    if (PROPERTY_ONLY_CODES.has(account.code)) {
      return { ...account, module: 'property' as const }
    }
    if (ALL_INVESTMENT_PREFIXES.some(prefix => account.code.startsWith(prefix))) {
      return { ...account, module: 'investment' as const }
    }

    // Default unrecognized to shared
    return { ...account, module: 'shared' as const }
  })
}
