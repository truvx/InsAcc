import type { Account, Voucher } from '../accounting/types'
import { getAllAccountBalances, getAccountTypeBalance } from '../accounting/ledgerService'

export interface FinancialOverviewProjection {
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

export function getFinancialOverviewProjection(
  accounts: Account[],
  vouchers: Voucher[],
): FinancialOverviewProjection {
  const allBals = getAllAccountBalances(vouchers, accounts)

  const cashId = accounts.find(a => a.code === '1110')?.id
  const cash = cashId ? (allBals[cashId] || 0) : 0

  const bankParent = accounts.find(a => a.code === '1120')
  const bankBalance = bankParent
    ? accounts.filter(a => a.parentId === bankParent.id && a.isActive).reduce((s, a) => s + (allBals[a.id] || 0), 0)
    : 0

  const investmentParent = accounts.find(a => a.code === '12')
  const investments = investmentParent
    ? accounts.filter(a => a.parentId === investmentParent.id && a.isActive).reduce((s, a) => s + (allBals[a.id] || 0), 0)
    : 0

  const receivablesParent = accounts.find(a => a.code === '13')
  const receivables = receivablesParent
    ? accounts.filter(a => a.parentId === receivablesParent.id && a.isActive).reduce((s, a) => s + (allBals[a.id] || 0), 0)
    : 0

  const totalRevenue = getAccountTypeBalance('revenue', vouchers, accounts)
  const totalExpenses = getAccountTypeBalance('expense', vouchers, accounts)
  const netIncome = totalRevenue - totalExpenses

  const allAssets = cash + bankBalance + investments + receivables
  const allLiabilities = getAccountTypeBalance('liability', vouchers, accounts)
  const netWorth = allAssets - allLiabilities

  return {
    cash,
    bankBalance,
    investments,
    receivables,
    revenue: totalRevenue,
    expenses: totalExpenses,
    netWorth,
    netIncome,
    totalAssets: allAssets,
    totalLiabilities: allLiabilities,
  }
}
