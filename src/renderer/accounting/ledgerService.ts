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

function getCacheKey(accountId: string, date?: string): string {
  return date ? `${accountId}@${date}` : accountId
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

export function getAccountBalance(
  accountId: string,
  vouchers: Voucher[],
  accounts: Account[],
): number {
  const account = getAccountById(accountId, accounts)
  if (!account) return 0

  const cacheKey = getCacheKey(accountId)
  const cached = getCachedBalance(cacheKey, _cacheVersion)
  if (cached !== undefined) return cached

  const entries = getLinesForAccount(accountId, vouchers)
  const totalDebit = entries.reduce(
    (s, { line }) => s + (line.type === 'Debit' ? line.baseAmount : 0),
    0,
  )
  const totalCredit = entries.reduce(
    (s, { line }) => s + (line.type === 'Credit' ? line.baseAmount : 0),
    0,
  )

  let balance: number
  if (account.normalBalance === 'debit') {
    balance = Math.round((totalDebit - totalCredit) * 100) / 100
  } else {
    balance = Math.round((totalCredit - totalDebit) * 100) / 100
  }

  const opening = account.openingBalance ?? 0
  balance = Math.round((balance + opening) * 100) / 100

  setCachedBalance(cacheKey, balance, _cacheVersion)
  return balance
}

export function getAccountBalanceAtDate(
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
    const lines = getLinesForAccount(account.id, vouchers)
    const totalDebit = lines.reduce(
      (s, { line }) => s + (line.type === 'Debit' ? line.baseAmount : 0),
      0,
    )
    const totalCredit = lines.reduce(
      (s, { line }) => s + (line.type === 'Credit' ? line.baseAmount : 0),
      0,
    )

    if (totalDebit === 0 && totalCredit === 0) continue

    const roundedDebit = Math.round(totalDebit * 100) / 100
    const roundedCredit = Math.round(totalCredit * 100) / 100
    const balance =
      account.normalBalance === 'debit'
        ? roundedDebit - roundedCredit
        : roundedCredit - roundedDebit

    entries.push({
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      type: account.type,
      totalDebit: roundedDebit,
      totalCredit: roundedCredit,
      balance: Math.round(balance * 100) / 100,
    })
  }

  entries.sort((a, b) => a.accountCode.localeCompare(b.accountCode))
  return entries
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
      description: line.narration ?? voucher.description,
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
      description: line.narration ?? voucher.description,
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
  const typeAccounts = accounts.filter(a => a.type === type && a.isActive)
  return typeAccounts.reduce(
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
  const typeAccounts = accounts.filter(a => a.type === type && a.isActive)
  return typeAccounts.reduce(
    (sum, a) => sum + getAccountBalanceAtDate(a.id, vouchers, accounts, date),
    0,
  )
}

export function getOpeningBalance(
  accountId: string,
  accounts: Account[],
): number {
  const account = getAccountById(accountId, accounts)
  return account?.openingBalance ?? 0
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
    const lines = getLinesForAccountByDateRange(account.id, vouchers, '0000-01-01', date)
    const totalDebit = lines.reduce(
      (s, { line }) => s + (line.type === 'Debit' ? line.baseAmount : 0),
      0,
    )
    const totalCredit = lines.reduce(
      (s, { line }) => s + (line.type === 'Credit' ? line.baseAmount : 0),
      0,
    )

    if (totalDebit === 0 && totalCredit === 0) continue

    const roundedDebit = Math.round(totalDebit * 100) / 100
    const roundedCredit = Math.round(totalCredit * 100) / 100

    const opening = account.openingBalance ?? 0
    const balance =
      account.normalBalance === 'debit'
        ? roundedDebit - roundedCredit + opening
        : roundedCredit - roundedDebit + opening

    entries.push({
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      type: account.type,
      totalDebit: roundedDebit,
      totalCredit: roundedCredit,
      balance: Math.round(balance * 100) / 100,
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

  const opening = account.openingBalance ?? 0
  const periodLines = getLinesForAccountByDateRange(accountId, vouchers, from, to)

  const periodDebit = periodLines.reduce(
    (s, { line }) => s + (line.type === 'Debit' ? line.baseAmount : 0),
    0,
  )
  const periodCredit = periodLines.reduce(
    (s, { line }) => s + (line.type === 'Credit' ? line.baseAmount : 0),
    0,
  )

  let closing: number
  if (account.normalBalance === 'debit') {
    closing = opening + periodDebit - periodCredit
  } else {
    closing = opening + periodCredit - periodDebit
  }

  return {
    openingBalance: Math.round(opening * 100) / 100,
    periodDebit: Math.round(periodDebit * 100) / 100,
    periodCredit: Math.round(periodCredit * 100) / 100,
    closingBalance: Math.round(closing * 100) / 100,
  }
}
