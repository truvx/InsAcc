import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { BankAccount } from '../data/banking'
import type { PurchaseRecord } from '../data/purchaseLedger'
import { getAllAccountBalances, getAccountTypeBalance } from '../accounting/ledgerService'

export interface AssetBreakdownItem {
  label: string
  value: number
  color: string
}

export interface FinancialDistributionItem {
  label: string
  value: number
  percentage: number
  color: string
}

export interface RecentActivityEntry {
  id: string
  date: string
  number: string
  type: string
  description: string
  amount: number
}

export interface QuickSummaryData {
  initialCapital: number
  currentAssets: number
  revenue: number
  expenses: number
  growth: number
}

export interface FinancialOverviewProjection {
  cash: number
  bankBalance: number
  investments: number
  totalAssets: number
  assetBreakdown: AssetBreakdownItem[]
  financialDistribution: FinancialDistributionItem[]
  recentReceipts: RecentActivityEntry[]
  recentPayments: RecentActivityEntry[]
  recentJournals: RecentActivityEntry[]
  recentPurchases: RecentActivityEntry[]
  quickSummary: QuickSummaryData
}

const INVESTMENT_COLOR = '#8B5CF6'

function getRecentVouchers(
  vouchers: Voucher[],
  type: string,
  count: number,
): RecentActivityEntry[] {
  return vouchers
    .filter(v =>
      v.status === 'Posted' &&
      v.type === type &&
      !isOpeningBalanceEntry(v),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, count)
    .map(v => ({
      id: v.id,
      date: v.date,
      number: v.number,
      type: v.type,
      description: v.description,
      amount: v.lines
        .filter(l => l.type === 'Debit')
        .reduce((s, l) => s + l.baseAmount, 0),
    }))
}

function isOpeningBalanceEntry(v: Voucher): boolean {
  if (v.reference?.startsWith?.('OB-')) return true
  const desc = (v.description || '').toLowerCase()
  const ref = (v.reference || '').toLowerCase()
  const text = `${desc} ${ref}`
  return /opening\s*balance/.test(text)
}

export function getFinancialOverviewProjection(
  accounts: Account[],
  vouchers: Voucher[],
  bankAccounts: BankAccount[],
  bankMappings: BankMapping[],
  purchaseRecords: PurchaseRecord[],
  filterBankId?: string,
): FinancialOverviewProjection {
  const allBals = getAllAccountBalances(vouchers, accounts)

  const cashId = accounts.find(a => a.code === '1110')?.id
  const cash = cashId ? (allBals[cashId] || 0) : 0

  const activeBanks = filterBankId
    ? bankAccounts.filter(ba => ba.status === 'active' && ba.id === filterBankId)
    : bankAccounts.filter(ba => ba.status === 'active')

  const bankBalance = activeBanks
    .reduce((sum, ba) => {
      const mapping = bankMappings.find(m => m.bankAccountId === ba.id)
      const coaId = mapping?.accountId
      return sum + (coaId ? (allBals[coaId] || 0) : 0)
    }, 0)

  const filteredPurchaseRecords = filterBankId
    ? purchaseRecords.filter(r => r.fundingBankAccountId === filterBankId)
    : purchaseRecords

  const investments = filteredPurchaseRecords
    .filter(r => r.status === 'active')
    .reduce((s, r) => s + r.totalValue, 0)

  const totalRevenue = getAccountTypeBalance('revenue', vouchers, accounts)
  const totalExpenses = getAccountTypeBalance('expense', vouchers, accounts)

  const totalAssets = investments

  const assetBreakdown: AssetBreakdownItem[] = [
    { label: 'Investments', value: investments, color: INVESTMENT_COLOR },
  ]

  const financialDistribution: FinancialDistributionItem[] = [
    { label: 'Investments', value: investments, color: INVESTMENT_COLOR, percentage: 100 },
  ]

  const recentReceipts = getRecentVouchers(vouchers, 'Receipt', 5)
  const recentPayments = getRecentVouchers(vouchers, 'Payment', 5)
  const recentJournals = getRecentVouchers(vouchers, 'Journal', 5)

  const recentPurchases = filteredPurchaseRecords
    .filter(r => r.status === 'active')
    .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map(r => ({
      id: r.id,
      date: r.purchaseDate,
      number: r.voucherNumber || r.id.substring(0, 8),
      type: 'Purchase',
      description: `${r.assetName} (${r.assetType})`,
      amount: r.totalValue,
    }))

  const equityId = accounts.find(a => a.code === '3000')?.id
  const initialCapital = equityId ? (allBals[equityId] || 0) : 0

  const currentAssets = totalAssets
  const growth = initialCapital > 0 ? ((currentAssets - initialCapital) / initialCapital) * 100 : 0

  const quickSummary: QuickSummaryData = {
    initialCapital,
    currentAssets,
    revenue: totalRevenue,
    expenses: totalExpenses,
    growth,
  }

  return {
    cash,
    bankBalance,
    investments,
    totalAssets,
    assetBreakdown,
    financialDistribution,
    recentReceipts,
    recentPayments,
    recentJournals,
    recentPurchases,
    quickSummary,
  }
}
