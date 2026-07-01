export interface FinancialSummary {
  totalPortfolioValue: number
  totalCash: number
  totalAssets: number
  totalInvestments: number
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
  netWorth: number
  currency: string
}

export interface CashFlowSummary {
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
  incomeCount: number
  expenseCount: number
  periodStart: string
  periodEnd: string
}

export interface AllocationItem {
  name: string
  value: number
  percentage: number
  count: number
}

export interface AssetAllocation {
  type: string
  totalValue: number
  percentage: number
  count: number
}

export interface CategoryBreakdown {
  category: string
  amount: number
  percentage: number
  count: number
}

export interface MonthlyTrend {
  month: string
  income: number
  expense: number
  net: number
}

export interface RecentActivityItem {
  id: string
  date: string
  source: 'investment' | 'transaction' | 'bank_transaction'
  description: string
  amount: number
  category?: string
}

export interface NetWorthSummary {
  totalInvestments: number
  totalCash: number
  totalAssets: number
  netWorth: number
  currency: string
  asOf: string
  allocation: AssetAllocation[]
}
