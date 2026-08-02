import type {
  Voucher,
  VoucherLine,
  Account,
  TrialBalanceEntry,
  RunningBalanceEntry,
  AccountStatementEntry,
  ReferenceType,
  NormalBalance,
} from './types'
import { getActiveVouchers, calculateBaseTotals } from './voucherService'
import { getAccountById, getAccountsByType, getLeafAccounts } from './chartOfAccountsService'

export interface LineWithVoucher {
  line: VoucherLine
  voucher: Voucher
}

interface BalanceCacheEntry {
  balance: number
  version: number
}

let _balanceCache = new Map<string, BalanceCacheEntry>()
let _cacheVersion = 0
const CACHE_ENABLED = true

export function invalidateBalanceCache(): void {
  _cacheVersion++
  if (_cacheVersion > 1000000) _cacheVersion = 0
}

export function getCacheVersion(): number {
  return _cacheVersion
}

export function clearBalanceCache(): void {
  _balanceCache.clear()
}

function getCachedBalance(accountId: string, version: number): number | undefined {
  if (!CACHE_ENABLED) return undefined
  const entry = _balanceCache.get(accountId)
  if (entry && entry.version === version) return entry.balance
  return undefined
}

function setCachedBalance(accountId: string, balance: number, version: number): void {
  if (!CACHE_ENABLED) return
  _balanceCache.set(accountId, { balance, version })
}

function getModuleFromAccounts(accounts: Account[]): 'property' | 'investment' {
  for (const acc of accounts) {
    if (acc.module === 'property' || acc.id.endsWith('-prop')) return 'property'
    if (acc.module === 'investment' || acc.id.endsWith('-inv')) return 'investment'
  }
  return 'investment'
}

function getCacheKey(accountId: string, accounts: Account[], date?: string): string {
  const mod = getModuleFromAccounts(accounts)
  return date ? `${mod}_${accountId}@${date}` : `${mod}_${accountId}`
}


function getAllLines(vouchers: Voucher[]): LineWithVoucher[] {
  const result: LineWithVoucher[] = []
  for (const voucher of getActiveVouchers(vouchers)) {
    for (const line of voucher.lines) {
      result.push({ line, voucher })
    }
  }
  return result
}

function sortByDate(a: LineWithVoucher, b: LineWithVoucher): number {
  const dateCmp = a.voucher.date.localeCompare(b.voucher.date)
  if (dateCmp !== 0) return dateCmp
  return a.voucher.createdAt.localeCompare(b.voucher.createdAt)
}

export function getLinesForAccount(
  accountId: string,
  vouchers: Voucher[],
): LineWithVoucher[] {
  return getAllLines(vouchers)
    .filter(({ line }) => line.accountId === accountId)
    .sort(sortByDate)
}

export function getLinesForAccounts(
  accountIds: string[],
  vouchers: Voucher[],
): LineWithVoucher[] {
  const idSet = new Set(accountIds)
  return getAllLines(vouchers)
    .filter(({ line }) => idSet.has(line.accountId))
    .sort(sortByDate)
}

export function getLinesByDateRange(
  vouchers: Voucher[],
  from: string,
  to: string,
): LineWithVoucher[] {
  return getAllLines(vouchers)
    .filter(({ voucher }) => voucher.date >= from && voucher.date <= to)
    .sort(sortByDate)
}

export function getLinesForAccountByDateRange(
  accountId: string,
  vouchers: Voucher[],
  from: string,
  to: string,
): LineWithVoucher[] {
  return getLinesForAccount(accountId, vouchers)
    .filter(({ voucher }) => voucher.date >= from && voucher.date <= to)
}

export function getLinesByReference(
  referenceType: ReferenceType,
  referenceId: string,
  vouchers: Voucher[],
): LineWithVoucher[] {
  return getAllLines(vouchers)
    .filter(
      ({ line }) =>
        line.referenceType === referenceType && line.referenceId === referenceId,
    )
    .sort(sortByDate)
}

function getAccountDirectBalance(
  accountId: string,
  vouchers: Voucher[],
  accounts: Account[],
): number {
  const account = getAccountById(accountId, accounts)
  if (!account) return 0

  const entries = getLinesForAccount(accountId, vouchers)
  const totalDebit = entries.reduce(
    (s, { line }) => s + (line.type === 'Debit' ? line.baseAmount : 0),
    0,
  )
  const totalCredit = entries.reduce(
    (s, { line }) => s + (line.type === 'Credit' ? line.baseAmount : 0),
    0,
  )

  if (account.normalBalance === 'debit') {
    return Math.round((totalDebit - totalCredit) * 100) / 100
  }
  return Math.round((totalCredit - totalDebit) * 100) / 100
}

export function getAccountBalance(
  accountId: string,
  vouchers: Voucher[],
  accounts: Account[],
  ignoreCache: boolean = false
): number {
  const account = getAccountById(accountId, accounts)
  if (!account) return 0

  const cacheKey = getCacheKey(accountId, accounts)

  if (!ignoreCache) {
    const cached = getCachedBalance(cacheKey, _cacheVersion)
    if (cached !== undefined) return cached
  }

  // Recursive check for active direct children
  const children = accounts.filter(a => a.parentId === account.id && a.isActive)
  let balance: number

  if (children.length === 0) {
    balance = getAccountDirectBalance(accountId, vouchers, accounts)
  } else {
    let total = 0
    for (const child of children) {
      const childBal = getAccountBalance(child.id, vouchers, accounts, ignoreCache)
      if (child.normalBalance === account.normalBalance) {
        total += childBal
      } else {
        total -= childBal
      }
    }
    balance = Math.round(total * 100) / 100
  }

  if (!ignoreCache) {
    setCachedBalance(cacheKey, balance, _cacheVersion)
  }
  return balance
}

function getAccountDirectBalanceAtDate(
  accountId: string,
  vouchers: Voucher[],
  accounts: Account[],
  date: string,
): number {
  const filtered = getLinesForAccountByDateRange(accountId, vouchers, '0000-01-01', date)
  const account = getAccountById(accountId, accounts)
  if (!account) return 0

  const totalDebit = filtered.reduce(
    (s, { line }) => s + (line.type === 'Debit' ? line.baseAmount : 0),
    0,
  )
  const totalCredit = filtered.reduce(
    (s, { line }) => s + (line.type === 'Credit' ? line.baseAmount : 0),
    0,
  )

  if (account.normalBalance === 'debit') {
    return Math.round((totalDebit - totalCredit) * 100) / 100
  }
  return Math.round((totalCredit - totalDebit) * 100) / 100
}

export function getAccountBalanceAtDate(
  accountId: string,
  vouchers: Voucher[],
  accounts: Account[],
  date: string,
): number {
  const account = getAccountById(accountId, accounts)
  if (!account) return 0

  const cacheKey = getCacheKey(accountId, accounts, date)

  const cached = getCachedBalance(cacheKey, _cacheVersion)
  if (cached !== undefined) return cached

  // Recursive check for active direct children
  const children = accounts.filter(a => a.parentId === account.id && a.isActive)
  let balance: number

  if (children.length === 0) {
    balance = getAccountDirectBalanceAtDate(accountId, vouchers, accounts, date)
  } else {
    let total = 0
    for (const child of children) {
      const childBal = getAccountBalanceAtDate(child.id, vouchers, accounts, date)
      if (child.normalBalance === account.normalBalance) {
        total += childBal
      } else {
        total -= childBal
      }
    }
    balance = Math.round(total * 100) / 100
  }

  setCachedBalance(cacheKey, balance, _cacheVersion)
  return balance
}

export function getBalances(
  accountIds: string[],
  vouchers: Voucher[],
  accounts: Account[],
): Map<string, number> {
  const balances = new Map<string, number>()
  for (const id of accountIds) {
    balances.set(id, getAccountBalance(id, vouchers, accounts))
  }
  return balances
}

export function getTrialBalance(
  vouchers: Voucher[],
  accounts: Account[],
): TrialBalanceEntry[] {
  const activeAccounts = accounts.filter(a => a.isActive)
  const entries: TrialBalanceEntry[] = []

  for (const account of activeAccounts) {
    const isParent = accounts.some(child => child.parentId === account.id && child.isActive)
    if (isParent) continue

    const lines = getLinesForAccount(account.id, vouchers)
    if (lines.length === 0) continue

    const totalDebit = lines.reduce(
      (s, { line }) => s + (line.type === 'Debit' ? line.baseAmount : 0),
      0,
    )
    const totalCredit = lines.reduce(
      (s, { line }) => s + (line.type === 'Credit' ? line.baseAmount : 0),
      0,
    )

    const roundedDebit = Math.round(totalDebit * 100) / 100
    const roundedCredit = Math.round(totalCredit * 100) / 100
    const balance = account.normalBalance === 'debit'
      ? roundedDebit - roundedCredit
      : roundedCredit - roundedDebit

    entries.push({
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      type: account.type,
      totalDebit: roundedDebit,
      totalCredit: roundedCredit,
      balance,
    })
  }

  entries.sort((a, b) => a.accountCode.localeCompare(b.accountCode))
  return entries
}

export function validateLedgerBalance(vouchers: Voucher[], accounts: Account[]): {
  isBalanced: boolean
  totalDebit: number
  totalCredit: number
  difference: number
} {
  const tbEntries = getTrialBalance(vouchers, accounts)
  const totalDebit = tbEntries.reduce((s, e) => s + e.totalDebit, 0)
  const totalCredit = tbEntries.reduce((s, e) => s + e.totalCredit, 0)
  const difference = Math.abs(totalDebit - totalCredit)
  return {
    isBalanced: difference < 0.01,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    difference: Math.round(difference * 100) / 100,
  }
}

export function getRunningBalance(
  accountId: string,
  vouchers: Voucher[],
  accounts: Account[],
): RunningBalanceEntry[] {
  const account = getAccountById(accountId, accounts)
  if (!account) return []

  const lines = getLinesForAccount(accountId, vouchers)
  const result: RunningBalanceEntry[] = []
  let runningBalance = 0

  for (const { line, voucher } of lines) {
    const debit = line.type === 'Debit' ? line.baseAmount : 0
    const credit = line.type === 'Credit' ? line.baseAmount : 0

    if (account.normalBalance === 'debit') {
      runningBalance += debit - credit
    } else {
      runningBalance += credit - debit
    }

    result.push({
      date: voucher.date,
      voucherNumber: voucher.number,
      description: voucher.description || line.narration || '',
      debit,
      credit,
      balance: Math.round(runningBalance * 100) / 100,
    })
  }

  return result
}

export function getAccountStatement(
  accountId: string,
  vouchers: Voucher[],
  accounts: Account[],
  from: string,
  to: string,
): AccountStatementEntry[] {
  const account = getAccountById(accountId, accounts)
  if (!account) return []

  const lines = getLinesForAccountByDateRange(accountId, vouchers, from, to)
  const result: AccountStatementEntry[] = []
  let runningBalance = getAccountBalanceAtDate(accountId, vouchers, accounts, from)

  for (const { line, voucher } of lines) {
    const debit = line.type === 'Debit' ? line.baseAmount : 0
    const credit = line.type === 'Credit' ? line.baseAmount : 0

    if (account.normalBalance === 'debit') {
      runningBalance += debit - credit
    } else {
      runningBalance += credit - debit
    }

    result.push({
      date: voucher.date,
      voucherNumber: voucher.number,
      voucherType: voucher.type,
      description: voucher.description || line.narration || '',
      reference: voucher.reference,
      debit,
      credit,
      balance: Math.round(runningBalance * 100) / 100,
    })
  }

  return result
}

export function getAllAccountBalances(
  vouchers: Voucher[],
  accounts: Account[],
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const account of accounts) {
    if (!account.isActive) continue
    result[account.id] = getAccountBalance(account.id, vouchers, accounts)
  }
  return result
}

export function verifyLedgerIntegrity(vouchers: Voucher[]): {
  totalVouchers: number
  postedVouchers: number
  totalLines: number
  totalDebit: number
  totalCredit: number
  balanced: boolean
} {
  const posted = getActiveVouchers(vouchers)
  const allLines = posted.flatMap(v => v.lines)
  const { totalDebit, totalCredit } = calculateBaseTotals(allLines)

  return {
    totalVouchers: vouchers.length,
    postedVouchers: posted.length,
    totalLines: allLines.length,
    totalDebit,
    totalCredit,
    balanced: Math.abs(totalDebit - totalCredit) < 0.001,
  }
}

export function getAccountTypeBalance(
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense',
  vouchers: Voucher[],
  accounts: Account[],
): number {
  const leafAccounts = accounts.filter(
    a => a.type === type && a.isActive && !accounts.some(child => child.parentId === a.id && child.isActive)
  )
  return leafAccounts.reduce(
    (sum, a) => sum + getAccountBalance(a.id, vouchers, accounts),
    0,
  )
}

export function getAccountTypeBalanceAtDate(
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense',
  vouchers: Voucher[],
  accounts: Account[],
  date: string,
): number {
  const leafAccounts = accounts.filter(
    a => a.type === type && a.isActive && !accounts.some(child => child.parentId === a.id && child.isActive)
  )
  return leafAccounts.reduce(
    (sum, a) => sum + getAccountBalanceAtDate(a.id, vouchers, accounts, date),
    0,
  )
}

export function getOpeningBalance(
  _accountId: string,
  _accounts: Account[],
): number {
  return 0
}

export function getClosingBalance(
  accountId: string,
  vouchers: Voucher[],
  accounts: Account[],
  periodEnd: string,
): number {
  return getAccountBalanceAtDate(accountId, vouchers, accounts, periodEnd)
}

export function getAllAccountBalancesAtDate(
  vouchers: Voucher[],
  accounts: Account[],
  date: string,
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const account of accounts) {
    if (!account.isActive) continue
    result[account.id] = getAccountBalanceAtDate(account.id, vouchers, accounts, date)
  }
  return result
}

export function getTrialBalanceAtDate(
  vouchers: Voucher[],
  accounts: Account[],
  date: string,
): TrialBalanceEntry[] {
  const activeAccounts = accounts.filter(a => a.isActive)
  const entries: TrialBalanceEntry[] = []

  for (const account of activeAccounts) {
    const isParent = accounts.some(child => child.parentId === account.id && child.isActive)
    if (isParent) continue

    const lines = getLinesForAccountByDateRange(account.id, vouchers, '0000-01-01', date)
    if (lines.length === 0) continue

    const totalDebit = lines.reduce(
      (s, { line }) => s + (line.type === 'Debit' ? line.baseAmount : 0),
      0,
    )
    const totalCredit = lines.reduce(
      (s, { line }) => s + (line.type === 'Credit' ? line.baseAmount : 0),
      0,
    )

    const roundedDebit = Math.round(totalDebit * 100) / 100
    const roundedCredit = Math.round(totalCredit * 100) / 100
    const balance = account.normalBalance === 'debit'
      ? roundedDebit - roundedCredit
      : roundedCredit - roundedDebit

    entries.push({
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      type: account.type,
      totalDebit: roundedDebit,
      totalCredit: roundedCredit,
      balance,
    })
  }

  entries.sort((a, b) => a.accountCode.localeCompare(b.accountCode))
  return entries
}

export function getTrialBalanceTotals(entries: TrialBalanceEntry[]): {
  totalDebit: number
  totalCredit: number
  balanced: boolean
} {
  const totalDebit = entries.reduce((s, e) => s + e.totalDebit, 0)
  const totalCredit = entries.reduce((s, e) => s + e.totalCredit, 0)
  return {
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    balanced: Math.abs(totalDebit - totalCredit) < 0.001,
  }
}

export function getAccountBalanceSummary(
  accountId: string,
  vouchers: Voucher[],
  accounts: Account[],
  from: string,
  to: string,
): {
  openingBalance: number
  periodDebit: number
  periodCredit: number
  closingBalance: number
} {
  const account = getAccountById(accountId, accounts)
  if (!account) return { openingBalance: 0, periodDebit: 0, periodCredit: 0, closingBalance: 0 }

  const allLines = getLinesForAccount(accountId, vouchers)

  const prePeriodLines = allLines.filter(({ voucher }) => voucher.date < from)
  const preDebit = prePeriodLines.reduce((s, { line }) => s + (line.type === 'Debit' ? line.baseAmount : 0), 0)
  const preCredit = prePeriodLines.reduce((s, { line }) => s + (line.type === 'Credit' ? line.baseAmount : 0), 0)
  const openingBalance = account.normalBalance === 'debit'
    ? Math.round((preDebit - preCredit) * 100) / 100
    : Math.round((preCredit - preDebit) * 100) / 100

  const periodLines = allLines.filter(({ voucher }) => voucher.date >= from && voucher.date <= to)

  const periodDebit = periodLines.reduce(
    (s, { line }) => s + (line.type === 'Debit' ? line.baseAmount : 0),
    0,
  )
  const periodCredit = periodLines.reduce(
    (s, { line }) => s + (line.type === 'Credit' ? line.baseAmount : 0),
    0,
  )

  const netChange = account.normalBalance === 'debit'
    ? periodDebit - periodCredit
    : periodCredit - periodDebit

  return {
    openingBalance,
    periodDebit: Math.round(periodDebit * 100) / 100,
    periodCredit: Math.round(periodCredit * 100) / 100,
    closingBalance: Math.round((openingBalance + netChange) * 100) / 100,
  }
}
