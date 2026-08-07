import type { Account, Voucher, RunningBalanceEntry, BankMapping } from '../accounting/types'
import { getAccountBalance, getAllAccountBalances, getAccountTypeBalance } from '../accounting/ledgerService'
import { getLeafAccounts } from '../accounting/chartOfAccountsService'
import type { BankAccount } from '../data/banking'
import { getBankDashboardProjection } from './InvestmentBankReadModel'

export interface DashboardAllocation {
  name: string
  value: number
  percentage: number
  accountId: string
}

export interface DashCashFlowMonth {
  month: string
  date: string
  income: number
  expense: number
  net: number
}

export interface ChartDataPoint {
  month?: string
  date?: string
  income?: number
  expense?: number
  net?: number
}

export interface GrowthDataPoint {
  period: string
  portfolioValue: number
}

export interface CashFlowDataPoint {
  period: string
  income: number
  expense: number
  net: number
}

export interface InvestmentDashboardProjection {
  portfolioValue: number
  currentBankBalance: number
  availableCash: number
  totalInvestments: number
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
  allocation: DashboardAllocation[]
  growthHistory: RunningBalanceEntry[]
  cashFlowHistory: Omit<DashCashFlowMonth, 'date'>[]
  investmentGrowthByPeriod: {
    Daily: GrowthDataPoint[]
    Monthly: GrowthDataPoint[]
    Yearly: GrowthDataPoint[]
  }
  cashFlowByPeriod: {
    Daily: CashFlowDataPoint[]
    Monthly: CashFlowDataPoint[]
    Yearly: CashFlowDataPoint[]
  }
}

export function getInvestmentDashboardProjection(
  accounts: Account[],
  vouchers: Voucher[],
  bankAccounts: BankAccount[] = [],
  bankMappings: BankMapping[] = [],
): InvestmentDashboardProjection {
  const allBals = getAllAccountBalances(vouchers, accounts)

  const leafAccounts = getLeafAccounts(accounts)
  const investmentAccounts = leafAccounts.filter(a => a.code.startsWith('12'))
  const portfolioValue = investmentAccounts.reduce((s, a) => s + (allBals[a.id] || 0), 0)

  // Consume the computed ledger balance returned by the Bank Accounts service
  const bankProj = getBankDashboardProjection(bankAccounts, bankMappings, accounts, vouchers)
  const currentBankBalance = bankProj.totalLedgerBankBalance

  // Cash and Bank accounts: sum of ledger balances of active leaf accounts with code starting with '11'
  const cashAndBankAccounts = leafAccounts.filter(
    a => a.code.startsWith('11')
  )
  const availableCash = cashAndBankAccounts.reduce((sum, a) => sum + (allBals[a.id] || 0), 0)

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

  // Helper to ensure at least 2 points for line/area chart rendering
  const getPreviousPeriod = (pStr: string, type: 'Daily' | 'Monthly' | 'Yearly'): string => {
    const parts = pStr.split('-')
    const year = Number(parts[0])
    const month = parts[1] ? Number(parts[1]) - 1 : 0
    const day = parts[2] ? Number(parts[2]) : 1
    const d = new Date(Date.UTC(year, month, day))
    if (type === 'Daily') {
      d.setUTCDate(d.getUTCDate() - 1)
    } else if (type === 'Monthly') {
      d.setUTCMonth(d.getUTCMonth() - 1)
    } else {
      d.setUTCFullYear(d.getUTCFullYear() - 1)
    }
    return d.toISOString().split('T')[0]
  }

  const formatPeriod = (dateStr: string, type: 'Daily' | 'Monthly' | 'Yearly'): string => {
    if (type === 'Daily') return dateStr.substring(0, 10)
    if (type === 'Monthly') return dateStr.substring(0, 7)
    return dateStr.substring(0, 4)
  }

  const ensureTwoPoints = (pts: GrowthDataPoint[], periodType: 'Daily' | 'Monthly' | 'Yearly', initialBal: number): GrowthDataPoint[] => {
    if (pts.length === 0) {
      const today = new Date().toISOString().split('T')[0]
      const prev = getPreviousPeriod(today, periodType)
      return [
        { period: formatPeriod(prev, periodType), portfolioValue: initialBal },
        { period: formatPeriod(today, periodType), portfolioValue: initialBal },
      ]
    }
    if (pts.length === 1) {
      const single = pts[0]
      const prev = getPreviousPeriod(single.period, periodType)
      return [
        { period: formatPeriod(prev, periodType), portfolioValue: initialBal },
        single,
      ]
    }
    return pts
  }

  const initialHoldingsBalance = 0

  // Group growth history by period
  const aggregateGrowth = (keyLen: number, periodType: 'Daily' | 'Monthly' | 'Yearly'): GrowthDataPoint[] => {
    const groups: Record<string, number> = {}
    growthHistory.forEach(h => {
      const k = h.date.substring(0, keyLen)
      groups[k] = h.balance
    })
    const sorted = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({
      period: date,
      portfolioValue: value,
    }))
    return ensureTwoPoints(sorted, periodType, initialHoldingsBalance)
  }

  const investmentGrowthByPeriod = {
    Daily: aggregateGrowth(10, 'Daily'),
    Monthly: aggregateGrowth(7, 'Monthly'),
    Yearly: aggregateGrowth(4, 'Yearly'),
  }

  // Income/Expense by period
  const aggregateIncomeExpense = (keyLen: number): CashFlowDataPoint[] => {
    const groups: Record<string, { income: number; expense: number }> = {}
    vouchers
      .filter(v => v.status === 'Posted')
      .forEach(v => {
        const k = v.date.substring(0, keyLen)
        if (!groups[k]) groups[k] = { income: 0, expense: 0 }
        const g = groups[k]
        v.lines.forEach(l => {
          const acct = accounts.find(a => a.id === l.accountId)
          if (!acct) return
          if (acct.type === 'revenue' && l.type === 'Credit') g.income += l.baseAmount
          if (acct.type === 'expense' && l.type === 'Debit') g.expense += l.baseAmount
        })
      })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([month, vals]) => ({
      period: month,
      income: Math.round(vals.income * 100) / 100,
      expense: Math.round(vals.expense * 100) / 100,
      net: Math.round((vals.income - vals.expense) * 100) / 100,
    }))
  }

  const incomeExpenseByPeriod = {
    Daily: aggregateIncomeExpense(10),
    Monthly: aggregateIncomeExpense(7),
    Yearly: aggregateIncomeExpense(4),
  }

  // Real Cash flow by period (Bank accounts)
  const aggregateCashFlow = (keyLen: number): CashFlowDataPoint[] => {
    const groups: Record<string, { cashIn: number; cashOut: number }> = {}
    vouchers
      .filter(v => v.status === 'Posted')
      .forEach(v => {
        const k = v.date.substring(0, keyLen)
        if (!groups[k]) groups[k] = { cashIn: 0, cashOut: 0 }
        const g = groups[k]
        v.lines.forEach(l => {
          const acct = accounts.find(a => a.id === l.accountId)
          if (!acct) return
          // Cash In = Debit to bank/cash
          if ((acct.type === 'bank' || acct.type === 'cash') && l.type === 'Debit') g.cashIn += l.baseAmount
          // Cash Out = Credit to bank/cash
          if ((acct.type === 'bank' || acct.type === 'cash') && l.type === 'Credit') g.cashOut += l.baseAmount
        })
      })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([month, vals]) => ({
      period: month,
      income: Math.round(vals.cashIn * 100) / 100, // Reusing income/expense keys for chart compatibility if needed
      expense: Math.round(vals.cashOut * 100) / 100,
      net: Math.round((vals.cashIn - vals.cashOut) * 100) / 100,
    }))
  }

  const cashFlowByPeriod = {
    Daily: aggregateCashFlow(10),
    Monthly: aggregateCashFlow(7),
    Yearly: aggregateCashFlow(4),
  }

  const months = new Map<string, { cashIn: number; cashOut: number }>()
  for (const v of vouchers.filter(v => v.status === 'Posted')) {
    const month = v.date.substring(0, 7)
    if (!months.has(month)) months.set(month, { cashIn: 0, cashOut: 0 })
    const m = months.get(month)!
    for (const l of v.lines) {
      const acct = accounts.find(a => a.id === l.accountId)
      if (!acct) continue
      if ((acct.type === 'bank' || acct.type === 'cash') && l.type === 'Debit') m.cashIn += l.baseAmount
      if ((acct.type === 'bank' || acct.type === 'cash') && l.type === 'Credit') m.cashOut += l.baseAmount
    }
  }
  const cashFlowHistory = Array.from(months.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, income: data.cashIn, expense: data.cashOut, net: data.cashIn - data.cashOut }))

  return {
    portfolioValue,
    currentBankBalance,
    availableCash,
    totalInvestments: portfolioValue,
    totalIncome: totalRevenue,
    totalExpenses,
    netCashFlow,
    allocation,
    growthHistory,
    cashFlowHistory,
    investmentGrowthByPeriod,
    cashFlowByPeriod,
    incomeExpenseByPeriod,
  }
}
