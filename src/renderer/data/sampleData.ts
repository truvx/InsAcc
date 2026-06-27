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
