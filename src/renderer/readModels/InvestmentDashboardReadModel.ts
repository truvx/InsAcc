import type { Account, Voucher, RunningBalanceEntry } from '../accounting/types'
import { getAccountBalance, getAllAccountBalances, getAccountTypeBalance } from '../accounting/ledgerService'
import { getAccountByCode } from '../accounting/chartOfAccountsService'

export interface DashboardAllocation {
  name: string
  value: number
  percentage: number
  accountId: string
}

export interface DashCashFlowMonth {
  month: string
  income: number
  expense: number
  net: number
}

export interface InvestmentDashboardProjection {
  portfolioValue: number
  availableCash: number
  totalInvestments: number
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
  allocation: DashboardAllocation[]
  growthHistory: RunningBalanceEntry[]
  cashFlowHistory: DashCashFlowMonth[]
}

export function getInvestmentDashboardProjection(
  accounts: Account[],
  vouchers: Voucher[],
): InvestmentDashboardProjection {
  const allBals = getAllAccountBalances(vouchers, accounts)

  const investmentParent = accounts.find(a => a.code === '12')
  const investmentAccounts = investmentParent
    ? accounts.filter(a => a.parentId === investmentParent.id && a.isActive)
    : []
  const portfolioValue = investmentAccounts.reduce((s, a) => s + (allBals[a.id] || 0), 0)

  const cashId = accounts.find(a => a.code === '1110')?.id
  const cash = cashId ? (allBals[cashId] || 0) : 0
  const bankParent = accounts.find(a => a.code === '1120')
  const bankBalance = bankParent
    ? accounts.filter(a => a.parentId === bankParent.id && a.isActive).reduce((s, a) => s + (allBals[a.id] || 0), 0)
    : 0
  const availableCash = cash + bankBalance

  const totalRevenue = getAccountTypeBalance('revenue', vouchers, accounts)
  const totalExpenses = getAccountTypeBalance('expense', vouchers, accounts)
  const netCashFlow = totalRevenue - totalExpenses

  const allocation = investmentAccounts.map(a => ({
    name: a.name,
    value: allBals[a.id] || 0,
    percentage: portfolioValue > 0 ? ((allBals[a.id] || 0) / portfolioValue) * 100 : 0,
    accountId: a.id,
  })).filter(a => a.value > 0).sort((a, b) => b.value - a.value)

  const investmentAccountIds = new Set(investmentAccounts.map(a => a.id))
  const allLines = vouchers
    .filter(v => v.status === 'Posted')
    .flatMap(v => v.lines.map(l => ({ line: l, voucher: v })))
    .filter(({ line }) => investmentAccountIds.has(line.accountId))
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
  for (const v of vouchers.filter(v => v.status === 'Posted')) {
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
    .map(([month, data]) => ({ month, income: data.income, expense: data.expense, net: data.income - data.expense }))

  return {
    portfolioValue,
    availableCash,
    totalInvestments: portfolioValue,
    totalIncome: totalRevenue,
    totalExpenses,
    netCashFlow,
    allocation,
    growthHistory,
    cashFlowHistory,
  }
}
