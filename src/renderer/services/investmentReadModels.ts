import type { Account, Voucher, RunningBalanceEntry } from '../accounting/types'
import { getAccountBalance, getAllAccountBalances, getAccountTypeBalance, getAccountBalanceAtDate, getRunningBalance } from '../accounting/ledgerService'
import { getAccountByCode, getChildren } from '../accounting/chartOfAccountsService'

export interface InvestmentDashboardData {
  portfolioValue: number
  availableCash: number
  totalInvestments: number
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
  allocation: Array<{ name: string; value: number; percentage: number; accountId: string }>
  growthHistory: RunningBalanceEntry[]
  cashFlowHistory: { month: string; income: number; expense: number; net: number }[]
}

export function getInvestmentDashboardData(
  accounts: Account[],
  vouchers: Voucher[],
): InvestmentDashboardData {
  const allBals = getAllAccountBalances(vouchers, accounts)

  const investmentAccounts = accounts.filter(a => a.code.startsWith('12') && a.code.length >= 4 && a.isActive)
  const portfolioValue = investmentAccounts.reduce((s, a) => s + (allBals[a.id] || 0), 0)

  const cashId = accounts.find(a => a.code === '1110')?.id
  const cash = cashId ? (allBals[cashId] || 0) : 0
  const bankParent = accounts.find(a => a.code === '1120')
  const bankBalance = bankParent
    ? accounts.filter(a => a.parentId === bankParent.id && a.isActive).reduce((s, a) => s + (allBals[a.id] || 0), 0)
    : 0
  const availableCash = cash + bankBalance

  const totalInvestments = portfolioValue
  const totalRevenue = getAccountTypeBalance('revenue', vouchers, accounts)
  const totalExpenses = getAccountTypeBalance('expense', vouchers, accounts)
  const totalIncome = totalRevenue
  const netCashFlow = totalRevenue - totalExpenses

  const allocation = investmentAccounts.map(a => ({
    name: a.name,
    value: allBals[a.id] || 0,
    percentage: portfolioValue > 0 ? ((allBals[a.id] || 0) / portfolioValue) * 100 : 0,
    accountId: a.id,
  })).filter(a => a.value > 0).sort((a, b) => b.value - a.value)

  const investmentAccountIds = investmentAccounts.map(a => a.id)
  const allLines = vouchers
    .filter(v => v.status === 'Posted')
    .flatMap(v => v.lines.map(l => ({ line: l, voucher: v })))
    .filter(({ line }) => investmentAccountIds.includes(line.accountId))
    .sort((a, b) => a.voucher.date.localeCompare(b.voucher.date) || a.voucher.createdAt.localeCompare(b.voucher.createdAt))

  let runningValue = 0
  const growthHistory: RunningBalanceEntry[] = allLines.map(({ line, voucher }) => {
    const debit = line.type === 'Debit' ? line.baseAmount : 0
    const credit = line.type === 'Credit' ? line.baseAmount : 0
    runningValue += debit - credit
    return {
      date: voucher.date,
      voucherNumber: voucher.number,
      description: line.narration || voucher.description,
      debit,
      credit,
      balance: Math.round(runningValue * 100) / 100,
    }
  })

  const months = new Map<string, { income: number; expense: number }>()
  const postedVouchers = vouchers.filter(v => v.status === 'Posted')
  for (const v of postedVouchers) {
    const month = v.date.substring(0, 7)
    if (!months.has(month)) months.set(month, { income: 0, expense: 0 })
    const m = months.get(month)!
    for (const l of v.lines) {
      const acct = accounts.find(a => a.id === l.accountId)
      if (!acct) continue
      if (acct.type === 'revenue' && l.type === 'Credit') m.income += l.baseAmount
      if (acct.type === 'expense' && l.type === 'Debit') m.expense += l.baseAmount
    }
  }
  const cashFlowHistory = Array.from(months.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
      net: data.income - data.expense,
    }))

  return {
    portfolioValue,
    availableCash,
    totalInvestments,
    totalIncome,
    totalExpenses,
    netCashFlow,
    allocation,
    growthHistory,
    cashFlowHistory,
  }
}

export interface InvestmentFinancialOverviewData {
  cash: number
  bankBalance: number
  investments: number
  receivables: number
  revenue: number
  expenses: number
  netWorth: number
  netIncome: number
  totalAssets: number
  totalLiabilities: number
}

export function getInvestmentFinancialOverview(
  accounts: Account[],
  vouchers: Voucher[],
): InvestmentFinancialOverviewData {
  const allBals = getAllAccountBalances(vouchers, accounts)

  const cashId = accounts.find(a => a.code === '1110')?.id
  const cash = cashId ? (allBals[cashId] || 0) : 0

  const bankParent = accounts.find(a => a.code === '1120')
  const bankBalance = bankParent
    ? accounts.filter(a => a.parentId === bankParent.id && a.isActive).reduce((s, a) => s + (allBals[a.id] || 0), 0)
    : 0

  const investments = accounts
    .filter(a => a.code.startsWith('12') && a.code.length >= 4 && a.isActive)
    .reduce((s, a) => s + (allBals[a.id] || 0), 0)

  const receivablesParent = accounts.find(a => a.code === '13')
  const receivables = receivablesParent
    ? accounts.filter(a => a.parentId === receivablesParent.id && a.isActive).reduce((s, a) => s + (allBals[a.id] || 0), 0)
    : 0

  const totalRevenue = getAccountTypeBalance('revenue', vouchers, accounts)
  const totalExpenses = getAccountTypeBalance('expense', vouchers, accounts)
  const netIncome = totalRevenue - totalExpenses

  const totalAssets = cash + bankBalance + investments + receivables
  const totalLiabilities = getAccountTypeBalance('liability', vouchers, accounts)
  const netWorth = totalAssets - totalLiabilities

  return {
    cash,
    bankBalance,
    investments,
    receivables,
    revenue: totalRevenue,
    expenses: totalExpenses,
    netWorth,
    netIncome,
    totalAssets,
    totalLiabilities,
  }
}

export interface InvestmentHoldingData {
  accountId: string
  assetName: string
  assetCode: string
  purchaseValue: number
  currentValue: number
  unrealizedGain: number
  growthPercent: number
}

export function getInvestmentHoldings(
  accounts: Account[],
  vouchers: Voucher[],
): InvestmentHoldingData[] {
  const invAccounts = accounts.filter(a => a.code.startsWith('12') && a.code.length >= 4 && a.isActive)
  if (invAccounts.length === 0) return []
  const allBals = getAllAccountBalances(vouchers, accounts)

  return invAccounts.map(a => {
    const balance = allBals[a.id] || 0
    return {
      accountId: a.id,
      assetName: a.name,
      assetCode: a.code,
      purchaseValue: balance,
      currentValue: balance,
      unrealizedGain: 0,
      growthPercent: 0,
    }
  }).filter(h => h.purchaseValue > 0)
}
