import type { Investment } from '../components/Investments'
import type { Transaction } from '../components/Transactions'
import type { BankAccount, BankTransaction } from '../data/banking'
import type {
  FinancialSummary, CashFlowSummary, AssetAllocation, CategoryBreakdown,
  MonthlyTrend, RecentActivityItem, NetWorthSummary, AllocationItem,
} from '../data/reports'

function safePct(value: number, total: number): number {
  if (!total || total === 0) return 0
  return Number(((value / total) * 100).toFixed(1))
}

function safeSum(items: number[]): number {
  return items.reduce((s, v) => s + (v || 0), 0)
}

export function calculateTotalAssets(investments: Investment[]): number {
  return safeSum(investments.map(i => i.purchaseValue))
}

export function calculateTotalCash(bankAccounts: BankAccount[], bankTransactions: BankTransaction[]): number {
  // DEPRECATED: deriveBalance removed - this legacy service doesn't have ledger integration
  // Returns 0 to prevent incorrect calculations. Use ledger-based calculations instead.
  return 0
}

export function calculateIncome(transactions: Transaction[]): number {
  return safeSum(
    transactions.filter(t => t.type === 'Income').map(t => t.amount)
  )
}

export function calculateExpenses(transactions: Transaction[]): number {
  return safeSum(
    transactions.filter(t => t.type === 'Expense').map(t => t.amount)
  )
}

export function calculateNetCashFlow(transactions: Transaction[]): number {
  return calculateIncome(transactions) - calculateExpenses(transactions)
}

export function calculateNetWorth(investments: Investment[], bankAccounts: BankAccount[], bankTransactions: BankTransaction[]): number {
  // DEPRECATED: deriveBalance removed - this legacy service doesn't have ledger integration
  // Returns only assets to prevent incorrect calculations. Use ledger-based calculations instead.
  return calculateTotalAssets(investments)
}

export function calculateAssetAllocation(investments: Investment[]): AssetAllocation[] {
  const byType: Record<string, { value: number; count: number }> = {}
  for (const inv of investments) {
    if (!byType[inv.type]) byType[inv.type] = { value: 0, count: 0 }
    byType[inv.type].value += inv.purchaseValue
    byType[inv.type].count += 1
  }
  const total = Object.values(byType).reduce((s, g) => s + g.value, 0)
  return Object.entries(byType)
    .map(([type, group]) => ({
      type,
      totalValue: group.value,
      percentage: safePct(group.value, total),
      count: group.count,
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
}

export function calculateInvestmentAllocation(investments: Investment[]): AllocationItem[] {
  const total = calculateTotalAssets(investments)
  return investments
    .map(inv => ({
      name: inv.assetName,
      value: inv.purchaseValue,
      percentage: safePct(inv.purchaseValue, total),
      count: 1,
    }))
    .sort((a, b) => b.value - a.value)
}

export function calculateMonthlyIncome(transactions: Transaction[], year: number, month: number): number {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return safeSum(
    transactions
      .filter(t => t.type === 'Income' && t.date.startsWith(prefix))
      .map(t => t.amount)
  )
}

export function calculateMonthlyExpenses(transactions: Transaction[], year: number, month: number): number {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return safeSum(
    transactions
      .filter(t => t.type === 'Expense' && t.date.startsWith(prefix))
      .map(t => t.amount)
  )
}

export function calculateMonthlyCashFlow(transactions: Transaction[], months: number = 12): MonthlyTrend[] {
  const now = new Date()
  const result: MonthlyTrend[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const income = calculateMonthlyIncome(transactions, y, m)
    const expense = calculateMonthlyExpenses(transactions, y, m)
    const key = `${y}-${String(m).padStart(2, '0')}`
    result.push({ month: key, income, expense, net: income - expense })
  }
  return result
}

export function calculateTopExpenseCategories(transactions: Transaction[], limit: number = 5): CategoryBreakdown[] {
  const expenses = transactions.filter(t => t.type === 'Expense')
  const byCategory: Record<string, { amount: number; count: number }> = {}
  for (const t of expenses) {
    if (!byCategory[t.category]) byCategory[t.category] = { amount: 0, count: 0 }
    byCategory[t.category].amount += t.amount
    byCategory[t.category].count += 1
  }
  const total = Object.values(byCategory).reduce((s, g) => s + g.amount, 0)
  return Object.entries(byCategory)
    .map(([category, group]) => ({
      category,
      amount: group.amount,
      percentage: safePct(group.amount, total),
      count: group.count,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}

export function calculateTopIncomeCategories(transactions: Transaction[], limit: number = 5): CategoryBreakdown[] {
  const incomes = transactions.filter(t => t.type === 'Income')
  const byCategory: Record<string, { amount: number; count: number }> = {}
  for (const t of incomes) {
    if (!byCategory[t.category]) byCategory[t.category] = { amount: 0, count: 0 }
    byCategory[t.category].amount += t.amount
    byCategory[t.category].count += 1
  }
  const total = Object.values(byCategory).reduce((s, g) => s + g.amount, 0)
  return Object.entries(byCategory)
    .map(([category, group]) => ({
      category,
      amount: group.amount,
      percentage: safePct(group.amount, total),
      count: group.count,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}

export function calculateFinancialSummary(
  investments: Investment[],
  transactions: Transaction[],
  bankAccounts: BankAccount[],
  bankTransactions: BankTransaction[],
  currency: string = 'AED',
): FinancialSummary {
  const totalInvestments = calculateTotalAssets(investments)
  const totalCash = calculateTotalCash(bankAccounts, bankTransactions)
  const totalIncome = calculateIncome(transactions)
  const totalExpenses = calculateExpenses(transactions)
  return {
    totalPortfolioValue: totalInvestments,
    totalCash,
    totalAssets: totalInvestments + totalCash,
    totalInvestments,
    totalIncome,
    totalExpenses,
    netCashFlow: totalIncome - totalExpenses,
    netWorth: totalInvestments + totalCash,
    currency,
  }
}

export function calculateCashFlowSummary(
  transactions: Transaction[],
  periodStart: string,
  periodEnd: string,
): CashFlowSummary {
  const inRange = transactions.filter(t => t.date >= periodStart && t.date <= periodEnd)
  const income = inRange.filter(t => t.type === 'Income')
  const expense = inRange.filter(t => t.type === 'Expense')
  const totalIncome = safeSum(income.map(t => t.amount))
  const totalExpenses = safeSum(expense.map(t => t.amount))
  return {
    totalIncome,
    totalExpenses,
    netCashFlow: totalIncome - totalExpenses,
    incomeCount: income.length,
    expenseCount: expense.length,
    periodStart,
    periodEnd,
  }
}

export function calculateNetWorthSummary(
  investments: Investment[],
  bankAccounts: BankAccount[],
  bankTransactions: BankTransaction[],
  currency: string = 'AED',
): NetWorthSummary {
  const totalInvestments = calculateTotalAssets(investments)
  const totalCash = calculateTotalCash(bankAccounts, bankTransactions)
  const allocation = calculateAssetAllocation(investments)
  return {
    totalInvestments,
    totalCash,
    totalAssets: totalInvestments + totalCash,
    netWorth: totalInvestments + totalCash,
    currency,
    asOf: new Date().toISOString().split('T')[0],
    allocation,
  }
}

export function calculateRecentActivity(
  investments: Investment[],
  transactions: Transaction[],
  bankTransactions: BankTransaction[],
  limit: number = 10,
): RecentActivityItem[] {
  const items: RecentActivityItem[] = []

  for (const inv of investments) {
    items.push({
      id: inv.id,
      date: inv.date,
      source: 'investment',
      description: `${inv.type}: ${inv.assetName}`,
      amount: inv.purchaseValue,
    })
  }

  for (const txn of transactions) {
    items.push({
      id: txn.id,
      date: txn.date,
      source: 'transaction',
      description: `${txn.type}: ${txn.category}`,
      amount: txn.type === 'Income' ? txn.amount : -txn.amount,
      category: txn.category,
    })
  }

  for (const bt of bankTransactions) {
    const isCredit = bt.type === 'credit' || bt.type === 'transfer_in'
    items.push({
      id: bt.id,
      date: bt.date,
      source: 'bank_transaction',
      description: bt.description || bt.type,
      amount: isCredit ? bt.amount : -bt.amount,
      category: bt.category || bt.type,
    })
  }

  return items
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
    .slice(0, limit)
}
