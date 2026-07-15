import type { Account, Voucher, TrialBalanceEntry } from '../accounting/types'
import {
  getAccountBalance,
  getTrialBalance,
  getLinesForAccount
} from '../accounting/ledgerService'

// 1. General Ledger Read Model
export interface GeneralLedgerRow {
  accountCode: string
  accountName: string
  openingBalance: number
  debitTotal: number
  creditTotal: number
  closingBalance: number
}

export function generateGeneralLedgerReadModel(
  accounts: Account[],
  vouchers: Voucher[]
): GeneralLedgerRow[] {
  return accounts
    .filter(a => a.isActive)
    .map(a => {
      const lines = getLinesForAccount(a.id, vouchers)
      const totalDebit = lines.reduce((s, { line }) => s + (line.type === 'Debit' ? line.baseAmount : 0), 0)
      const totalCredit = lines.reduce((s, { line }) => s + (line.type === 'Credit' ? line.baseAmount : 0), 0)
      const balance = getAccountBalance(a.id, vouchers, accounts)
      return {
        accountCode: a.code,
        accountName: a.name,
        openingBalance: 0,
        debitTotal: Math.round(totalDebit * 100) / 100,
        creditTotal: Math.round(totalCredit * 100) / 100,
        closingBalance: Math.round(balance * 100) / 100,
      }
    })
    .filter(r => r.debitTotal !== 0 || r.creditTotal !== 0 || r.closingBalance !== 0 || r.openingBalance !== 0)
}

// 2. Chart of Accounts Read Model
export interface ChartOfAccountsReadModelEntry {
  id: string
  code: string
  name: string
  currentBalance: number
  totalDebit: number
  totalCredit: number
  parentId: string | null
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  normalBalance: 'debit' | 'credit'
  isActive: boolean
}

export function generateChartOfAccountsReadModel(
  accounts: Account[],
  vouchers: Voucher[]
): ChartOfAccountsReadModelEntry[] {
  const result = accounts.map(a => {
    const isParent = accounts.some(child => child.parentId === a.id && child.isActive)
    let currentBalance = Math.round(getAccountBalance(a.id, vouchers, accounts) * 100) / 100
    if (Math.abs(currentBalance) < 0.10) {
      currentBalance = 0
    }
    let totalDebit = 0
    let totalCredit = 0

    if (!isParent && a.isActive) {
      const lines = getLinesForAccount(a.id, vouchers)
      totalDebit = lines.reduce((s, { line }) => s + (line.type === 'Debit' ? line.baseAmount : 0), 0)
      totalCredit = lines.reduce((s, { line }) => s + (line.type === 'Credit' ? line.baseAmount : 0), 0)
    }

    return {
      id: a.id,
      code: a.code,
      name: a.name,
      currentBalance,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      parentId: a.parentId,
      type: a.type,
      normalBalance: a.normalBalance,
      isActive: a.isActive
    }
  })

  return result
}

// 3. Trial Balance Read Model
export function generateTrialBalanceReadModel(
  coaEntries: ChartOfAccountsReadModelEntry[]
): TrialBalanceEntry[] {
  const entries: TrialBalanceEntry[] = []
  
  for (const coa of coaEntries) {
    if (!coa.isActive) continue

    const isParent = coaEntries.some(child => child.parentId === coa.id && child.isActive)
    if (isParent) continue

    entries.push({
      accountId: coa.id,
      accountCode: coa.code,
      accountName: coa.name,
      type: coa.type,
      totalDebit: Math.round(coa.totalDebit * 100) / 100,
      totalCredit: Math.round(coa.totalCredit * 100) / 100,
      balance: coa.currentBalance
    })
  }

  return entries.sort((a, b) => a.accountCode.localeCompare(b.accountCode))
}

// 4. Profit & Loss Read Model
export interface ProfitAndLossReadModel {
  revenue: { accountCode: string; accountName: string; balance: number }[]
  expenses: { accountCode: string; accountName: string; balance: number }[]
  totalRevenue: number
  totalExpenses: number
  netProfit: number
}

export function generateProfitAndLossReadModel(
  tbEntries: TrialBalanceEntry[],
  accounts: Account[]
): ProfitAndLossReadModel {
  const revenueEntries = tbEntries
    .filter(e => {
      const acct = accounts.find(a => a.id === e.accountId)
      const isParent = acct ? accounts.some(child => child.parentId === acct.id && child.isActive) : false
      return e.type === 'revenue' && !isParent
    })
    .map(e => ({
      accountCode: e.accountCode,
      accountName: e.accountName,
      balance: e.balance
    }))

  const expenseEntries = tbEntries
    .filter(e => {
      const acct = accounts.find(a => a.id === e.accountId)
      const isParent = acct ? accounts.some(child => child.parentId === acct.id && child.isActive) : false
      return e.type === 'expense' && !isParent
    })
    .map(e => ({
      accountCode: e.accountCode,
      accountName: e.accountName,
      balance: e.balance
    }))

  // Sum only leaf accounts to avoid double-counting parent + children
  const totalRevenue = tbEntries
    .filter(e => {
      const acct = accounts.find(a => a.id === e.accountId)
      const isParent = acct ? accounts.some(child => child.parentId === acct.id && child.isActive) : false
      return e.type === 'revenue' && !isParent
    })
    .reduce((s, r) => s + r.balance, 0)

  const totalExpenses = tbEntries
    .filter(e => {
      const acct = accounts.find(a => a.id === e.accountId)
      const isParent = acct ? accounts.some(child => child.parentId === acct.id && child.isActive) : false
      return e.type === 'expense' && !isParent
    })
    .reduce((s, e) => s + e.balance, 0)

  const netProfit = totalRevenue - totalExpenses

  return {
    revenue: revenueEntries,
    expenses: expenseEntries,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100
  }
}

// 5. Balance Sheet Read Model
export interface BalanceSheetItem {
  accountId: string
  accountCode: string
  accountName: string
  balance: number
  parentId: string | null
}

export interface BalanceSheetReadModel {
  currentAssets: BalanceSheetItem[]
  nonCurrentAssets: BalanceSheetItem[]
  currentLiabilities: BalanceSheetItem[]
  longTermLiabilities: BalanceSheetItem[]
  capital: BalanceSheetItem[]
  retainedEarnings: BalanceSheetItem[]
  currentYearProfit: number
  
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  
  balanced: boolean
  difference: number
}

export function generateBalanceSheetReadModel(
  tbEntries: TrialBalanceEntry[],
  netProfit: number,
  accounts: Account[]
): BalanceSheetReadModel {
  const currentAssets: BalanceSheetItem[] = []
  const nonCurrentAssets: BalanceSheetItem[] = []
  const currentLiabilities: BalanceSheetItem[] = []
  const longTermLiabilities: BalanceSheetItem[] = []
  const capital: BalanceSheetItem[] = []
  const retainedEarnings: BalanceSheetItem[] = []

  for (const e of tbEntries) {
    if (e.type === 'asset') {
      // 11xx = Cash/Bank, 12xx = Short-term investments, 13xx = Receivables, 14xx = PDC/Prepayments
      const isCurrent = e.accountCode.startsWith('11')
        || e.accountCode.startsWith('12')
        || e.accountCode.startsWith('13')
        || e.accountCode.startsWith('14')
      const item = {
        accountId: e.accountId,
        accountCode: e.accountCode,
        accountName: e.accountName,
        balance: e.balance,
        parentId: accounts.find(a => a.id === e.accountId)?.parentId ?? null
      }
      if (isCurrent) {
        currentAssets.push(item)
      } else {
        nonCurrentAssets.push(item)
      }
    } else if (e.type === 'liability') {
      // Handle existing data where 2200-prop was incorrectly typed as 'liability'
      // Investment 2200-inv is correctly typed as liability and must stay in liabilities
      if (e.accountCode === '2200' && e.accountId !== '2200-inv') {
        capital.push({
          accountId: e.accountId,
          accountCode: e.accountCode,
          accountName: e.accountName,
          balance: e.balance,
          parentId: accounts.find(a => a.id === e.accountId)?.parentId ?? null
        })
        continue
      }
      // 22xx+ = Long-term liabilities; 20xx, 21xx = current (payables, deferred revenue, deposits)
      const isLongTerm = e.accountCode.startsWith('23')
        || e.accountCode.startsWith('24')
        || e.accountCode.startsWith('25')
        || (e.accountCode.startsWith('22') && !e.accountCode.startsWith('210'))
      const item = {
        accountId: e.accountId,
        accountCode: e.accountCode,
        accountName: e.accountName,
        balance: e.balance,
        parentId: accounts.find(a => a.id === e.accountId)?.parentId ?? null
      }
      if (isLongTerm) {
        longTermLiabilities.push(item)
      } else {
        currentLiabilities.push(item)
      }
    } else if (e.type === 'equity') {
      const item = {
        accountId: e.accountId,
        accountCode: e.accountCode,
        accountName: e.accountName,
        balance: e.balance,
        parentId: accounts.find(a => a.id === e.accountId)?.parentId ?? null
      }
      const acct = accounts.find(a => a.id === e.accountId)
      const parentIsRetained = acct ? accounts.some(a => a.id === acct.parentId && a.code === '3120') : false
      if (e.accountCode.startsWith('3120') || parentIsRetained || e.accountCode === '3200') {
        retainedEarnings.push(item)
      } else {
        capital.push(item)
      }
    }
  }


  // Sum only leaf accounts to avoid double-counting parent + children
  const allLeafAssets = currentAssets.concat(nonCurrentAssets).filter(i => {
    return !accounts.some(child => child.parentId === i.accountId && child.isActive)
  })
  const totalAssets = allLeafAssets.reduce((s, i) => s + i.balance, 0)

  const allLeafLiabilities = currentLiabilities.concat(longTermLiabilities).filter(i => {
    return !accounts.some(child => child.parentId === i.accountId && child.isActive)
  })
  const totalLiabilities = allLeafLiabilities.reduce((s, i) => s + i.balance, 0)

  const allLeafCapital = capital.filter(i => {
    return !accounts.some(child => child.parentId === i.accountId && child.isActive)
  })
  const allLeafRetained = retainedEarnings.filter(i => {
    return !accounts.some(child => child.parentId === i.accountId && child.isActive)
  })
  const totalCapital = allLeafCapital.reduce((s, i) => s + i.balance, 0)
  const totalRetainedEarnings = allLeafRetained.reduce((s, i) => s + i.balance, 0)
  const totalEquity = totalCapital + totalRetainedEarnings + netProfit

  const diff = totalAssets - (totalLiabilities + totalEquity)
  const balanced = Math.abs(diff) < 0.01

  return {
    currentAssets,
    nonCurrentAssets,
    currentLiabilities,
    longTermLiabilities,
    capital,
    retainedEarnings,
    currentYearProfit: Math.round(netProfit * 100) / 100,
    totalAssets: Math.round(totalAssets * 100) / 100,
    totalLiabilities: Math.round(totalLiabilities * 100) / 100,
    totalEquity: Math.round(totalEquity * 100) / 100,
    balanced,
    difference: Math.round(diff * 100) / 100
  }
}
