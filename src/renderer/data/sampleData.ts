export interface Profile {
  id: number
  name: string
  role: 'Admin' | 'Accounts'
  avatar: string
  initials: string
  locked: boolean
}

export interface AssetAllocation {
  name: string
  value: number
  percentage: number
  color: string
}

export interface MonthlyCashFlow {
  month: string
  income: number
  expense: number
}

export interface InvestmentHistory {
  date: string
  value: number
}

export interface AssetPerformance {
  name: string
  roi: number
  isBest: boolean
  isWorst: boolean
  value: number
}

export interface SummaryCard {
  label: string
  value: string
  change: string
  isPositive: boolean
  icon: string
}

export const PROFILES: Profile[] = [
  {
    id: 1,
    name: 'Sameer Ishaq Harmoudi',
    role: 'Admin',
    avatar: '',
    initials: 'SA',
    locked: false,
  },
  {
    id: 2,
    name: 'Accounts',
    role: 'Accounts',
    avatar: '',
    initials: 'AC',
    locked: false,
  },
]

export const SUMMARY_CARDS: SummaryCard[] = [
  { label: 'Total Wealth', value: 'AED 0', change: '0%', isPositive: true, icon: 'wealth' },
  { label: 'Total Invested', value: 'AED 0', change: '0%', isPositive: true, icon: 'invested' },
  { label: 'Bank Balance', value: 'AED 0', change: '0%', isPositive: true, icon: 'bank' },
  { label: 'Total Profit', value: 'AED 0', change: '0%', isPositive: true, icon: 'profit' },
  { label: 'Capital', value: 'AED 0', change: '0%', isPositive: true, icon: 'capital' },
  { label: 'Monthly Income', value: 'AED 0', change: '0%', isPositive: true, icon: 'income' },
  { label: 'Monthly Expense', value: 'AED 0', change: '0%', isPositive: false, icon: 'expense' },
]

export const ASSET_ALLOCATION: AssetAllocation[] = []

export const INVESTMENT_GROWTH_DAILY: InvestmentHistory[] = []

export const INVESTMENT_GROWTH_MONTHLY: InvestmentHistory[] = []

export const INVESTMENT_GROWTH_YEARLY: InvestmentHistory[] = []

export const CASH_FLOW_MONTHLY: MonthlyCashFlow[] = []

export const CASH_FLOW_QUARTERLY: MonthlyCashFlow[] = []

export const CASH_FLOW_YEARLY: MonthlyCashFlow[] = []

export const ASSET_PERFORMANCES: AssetPerformance[] = []
