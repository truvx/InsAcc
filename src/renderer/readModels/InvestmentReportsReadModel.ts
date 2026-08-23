import type { Account, Voucher, TrialBalanceEntry, BankMapping } from '../accounting/types'
import { getAllAccountBalances, getAccountTypeBalance, getTrialBalance, getAccountBalance, getLinesForAccount, getAccountBalanceAtDate, getAllAccountBalancesAtDate, getAccountBalanceSummary, getTrialBalanceAtDate, getTrialBalanceTotals, invalidateBalanceCache } from '../accounting/ledgerService'
import { getLeafAccounts } from '../accounting/chartOfAccountsService'
import type { PurchaseRecord } from '../data/purchaseLedger'
import type { BankAccount, BankTransaction } from '../data/banking'
import { formatDate } from '../utils'

export interface BalanceSheetSection {
  accountId: string
  accountCode: string
  accountName: string
  balance: number
  isParent: boolean
  parentId: string | null
  depth: number
}

export interface CashPositionReport {
  cashOnHand: number
  bankBalance: number
  totalLiquid: number
  investments: number
  receivables: number
  totalAssets: number
}

export interface InvestmentPositionRow {
  assetType: string
  assetName: string
  accountCode: string
  costBasis: number
  currentValue: number
  unrealizedGain: number
  growthPercent: number
}

export interface PurchaseReportRow {
  id: string
  date: string
  assetType: string
  assetName: string
  quantity: number
  unitPrice: number
  totalValue: number
  accountCode: string
  voucherNumber: string
  status: string
}

export interface BankPositionRow {
  bankName: string
  ledgerBalance: number
  bankBalance: number
  difference: number
}

export interface CashFlowCategory {
  category: string
  type: 'Operating' | 'Investing' | 'Financing'
  amount: number
}

export interface CashFlowReport {
  operating: CashFlowCategory[]
  totalOperating: number
  investing: CashFlowCategory[]
  totalInvesting: number
  financing: CashFlowCategory[]
  totalFinancing: number
  netCashFlow: number
}

export interface JournalLineEntry {
  accountCode: string
  accountName: string
  debit: number
  credit: number
  narration: string
}

export interface GeneralJournalEntry {
  voucherNumber: string
  date: string
  voucherType: string
  description: string
  status: string
  lines: JournalLineEntry[]
  totalDebit: number
  totalCredit: number
}

export interface GeneralLedgerRow {
  accountCode: string
  accountName: string
  openingBalance: number
  debitTotal: number
  creditTotal: number
  closingBalance: number
}

export interface ReportsProjection {
  financialOverview: {
    netWorth: number
    cash: number
    investments: number
    bankBalance: number
    revenue: number
    expenses: number
    totalAssets: number
    totalLiabilities: number
    netIncome: number
  }
  trialBalance: TrialBalanceEntry[]
  balanceSheet: {
    assets: BalanceSheetSection[]
    liabilities: BalanceSheetSection[]
    equity: BalanceSheetSection[]
    totalAssets: number
    totalLiabilities: number
    totalEquity: number
  }
  profitLoss: {
    revenue: TrialBalanceEntry[]
    expenses: TrialBalanceEntry[]
    totalRevenue: number
    totalExpenses: number
    netIncome: number
  }
  cashPosition: CashPositionReport
  investmentPosition: InvestmentPositionRow[]
  purchaseReport: PurchaseReportRow[]
  bankPosition: BankPositionRow[]
  cashFlow: CashFlowReport
  generalJournal: GeneralJournalEntry[]
  generalLedger: GeneralLedgerRow[]
}

function buildBalanceSheetSections(
  accounts: Account[],
  allBals: Record<string, number>,
  type: 'asset' | 'liability' | 'equity',
): { sections: BalanceSheetSection[]; total: number } {
  const typeAccounts = accounts.filter(a => a.type === type && a.isActive).sort((a, b) => a.code.localeCompare(b.code))
  const sections: BalanceSheetSection[] = typeAccounts.map(a => ({
    accountId: a.id,
    accountCode: a.code,
    accountName: a.name,
    balance: allBals[a.id] || 0,
    isParent: !a.parentId,
    parentId: a.parentId,
    depth: a.parentId ? 1 : 0,
  }))

  const leafIds = new Set(
    accounts.filter(a => a.isActive && !accounts.some(c => c.parentId === a.id && c.isActive)).map(a => a.id)
  )
  const total = sections.filter(s => leafIds.has(s.accountId)).reduce((s, a) => s + a.balance, 0)
  return { sections, total }
}

export function getReportsProjection(
  accounts: Account[],
  vouchers: Voucher[],
  purchaseRecords: PurchaseRecord[] = [],
  bankAccounts: BankAccount[] = [],
  bankTransactions: BankTransaction[] = [],
  bankMappings: BankMapping[] = [],
  filterStart?: string,
  filterEnd?: string,
): ReportsProjection {
  const periodVouchers = vouchers.filter(v => {
    if (filterStart && v.date < filterStart) return false
    if (filterEnd && v.date > filterEnd) return false
    return true
  })
  
  const cumulativeVouchers = vouchers.filter(v => {
    if (filterEnd && v.date > filterEnd) return false
    return true
  })

  const periodPurchases = purchaseRecords.filter(r => {
    if (filterStart && r.purchaseDate < filterStart) return false
    if (filterEnd && r.purchaseDate > filterEnd) return false
    return true
  })

  const cumulativePurchases = purchaseRecords.filter(r => {
    if (filterEnd && r.purchaseDate > filterEnd) return false
    return true
  })

  // Balance Sheet / Snapshots use cumulative, P&L / Activity use period
  const allBals = getAllAccountBalances(cumulativeVouchers, accounts)
  const leafAccounts = getLeafAccounts(accounts)

  const cashAccounts = leafAccounts.filter(a => a.parentId === '1110' || a.parentId === '1120')
  const cash = cashAccounts.reduce((s, a) => s + (allBals[a.id] || 0), 0)

  const bankAccountsList = leafAccounts.filter(a => a.parentId === '1120')
  const bankBalance = bankAccountsList.reduce((s, a) => s + (allBals[a.id] || 0), 0)

  const investments = leafAccounts
    .filter(a => a.code.startsWith('12'))
    .reduce((s, a) => s + (allBals[a.id] || 0), 0)

  const totalRevenue = getAccountTypeBalance('revenue', periodVouchers, accounts)
  const totalExpenses = getAccountTypeBalance('expense', periodVouchers, accounts)
  const netIncome = totalRevenue - totalExpenses

  const receivablesParent = accounts.find(a => a.code === '13')
  const receivables = receivablesParent
    ? accounts.filter(a => a.parentId === receivablesParent.id && a.isActive).reduce((s, a) => s + (allBals[a.id] || 0), 0)
    : 0

  const totalAssets = cash + bankBalance + investments + receivables
  const totalLiabilitiesFromTypes = getAccountTypeBalance('liability', cumulativeVouchers, accounts)

  const tbEntries = getTrialBalance(cumulativeVouchers, accounts)
  const { sections: assets, total: totalAssetsVal } = buildBalanceSheetSections(accounts, allBals, 'asset')
  const { sections: liabilities, total: totalLiabilitiesVal } = buildBalanceSheetSections(accounts, allBals, 'liability')
  const { sections: equityItems, total: totalEquityFromLedger } = buildBalanceSheetSections(accounts, allBals, 'equity')

  const periodTbEntries = getTrialBalance(periodVouchers, accounts)
  const revenueEntries = periodTbEntries.filter(e => e.type === 'revenue')
  const expenseEntries = periodTbEntries.filter(e => e.type === 'expense')

  // Investment Position — asset-by-asset cost basis vs current value
  const investmentPosition: InvestmentPositionRow[] = []
  const invChildIds = new Set(
    leafAccounts.filter(a => a.code.startsWith('12')).map(a => a.id),
  )
  if (invChildIds.size > 0) {
    const byAccount = new Map<string, PurchaseRecord[]>()
    for (const p of cumulativePurchases.filter(p => p.status === 'active' && p.accountId && invChildIds.has(p.accountId))) {
      if (!byAccount.has(p.accountId)) byAccount.set(p.accountId, [])
      byAccount.get(p.accountId)!.push(p)
    }
    for (const [acctId, purchases] of byAccount) {
      const acct = accounts.find(a => a.id === acctId)
      if (!acct) continue
      const costBasis = purchases.reduce((s, p) => s + p.totalValue, 0)
      const currentValue = allBals[acctId] || 0
      const unrealizedGain = currentValue - costBasis
      const growthPercent = costBasis > 0 ? (unrealizedGain / costBasis) * 100 : 0
      investmentPosition.push({
        assetType: purchases[0]?.assetType || acct.type,
        assetName: acct.name,
        accountCode: acct.code,
        costBasis: Math.round(costBasis * 100) / 100,
        currentValue: Math.round(currentValue * 100) / 100,
        unrealizedGain: Math.round(unrealizedGain * 100) / 100,
        growthPercent: Math.round(growthPercent * 10) / 10,
      })
    }
  }

  // Purchase Report (Period)
  const purchaseReport: PurchaseReportRow[] = periodPurchases
    .filter(p => p.status === 'active')
    .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))
    .map(p => ({
      id: p.id,
      date: formatDate(p.purchaseDate),
      assetType: p.assetType,
      assetName: p.assetName,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      totalValue: p.totalValue,
      accountCode: p.accountCode || '—',
      voucherNumber: p.voucherNumber || '—',
      status: p.status,
    }))

  // Bank Position — ledger balance vs bank account balance
  const bankPosition: BankPositionRow[] = bankAccounts.map(ba => {
    const mapping = bankMappings.find(m => m.bankAccountId === ba.id)
    let ledgerBalance = mapping ? (allBals[mapping.accountId] || 0) : 0
    if (mapping?.accountId) {
      const bankBal = cumulativeVouchers.reduce((s, v) => {
        let amt = 0
        v.lines.forEach(l => {
          if (l.accountId === mapping.accountId) {
            amt += l.type === 'Debit' ? l.baseAmount : -l.baseAmount
          }
        })
        return s + amt
      }, 0)
      ledgerBalance = Math.round(bankBal * 100) / 100
    }
    return {
      bankName: ba.institution + (ba.accountNumber ? ` - ${ba.accountNumber.slice(-4)}` : ''),
      ledgerBalance,
      bankBalance: ba.openingBalance,
      difference: Math.round((ba.openingBalance - ledgerBalance) * 100) / 100,
    }
  })

  // Cash Flow (Period)
  const operating: CashFlowCategory[] = []
  const investing: CashFlowCategory[] = []
  const financing: CashFlowCategory[] = []

  const postedPeriodVouchers = periodVouchers.filter(v => v.status === 'Posted')
  const cashAndBankCodes = new Set<string>(
    leafAccounts.filter(a => a.code.startsWith('11')).map(a => a.id)
  )

  const isCashOrBank = (acctId: string): boolean => cashAndBankCodes.has(acctId)
  const isInvestment = (acct: Account): boolean => acct.code.startsWith('12')
  const isLoan = (acct: Account): boolean => acct.code.startsWith('22')
  const isEquity = (acct: Account): boolean => acct.type === 'equity'

  for (const v of postedPeriodVouchers) {
    for (const l of v.lines) {
      const acct = accounts.find(a => a.id === l.accountId)
      if (!acct) continue
      if (isCashOrBank(acct.id)) continue

      const amount = l.type === 'Debit' ? l.baseAmount : -l.baseAmount
      const sign = l.type === 'Debit' ? -1 : 1

      if (acct.type === 'revenue' || acct.type === 'expense') {
        const opAmount = acct.type === 'revenue' ? l.baseAmount : -l.baseAmount
        operating.push({ category: acct.name, type: 'Operating', amount: opAmount })
      } else if (isInvestment(acct)) {
        investing.push({ category: acct.name, type: 'Investing', amount: sign * l.baseAmount })
      } else if (isLoan(acct)) {
        financing.push({ category: acct.name, type: 'Financing', amount: sign * l.baseAmount })
      } else if (isEquity(acct)) {
        financing.push({ category: acct.name, type: 'Financing', amount: sign * l.baseAmount })
      } else if (acct.code.startsWith('21') || acct.code.startsWith('23')) {
        operating.push({ category: acct.name, type: 'Operating', amount: sign * l.baseAmount })
      } else if (acct.code.startsWith('13') || acct.code.startsWith('14') || acct.code.startsWith('15')) {
        operating.push({ category: acct.name, type: 'Operating', amount: sign * l.baseAmount })
      }
    }
  }
  const totalOperating = operating.reduce((s, c) => s + c.amount, 0)
  const totalInvesting = investing.reduce((s, c) => s + c.amount, 0)
  const totalFinancing = financing.reduce((s, c) => s + c.amount, 0)
  const cashFlow: CashFlowReport = {
    operating: groupCashFlow(operating),
    totalOperating: Math.round(totalOperating * 100) / 100,
    investing: groupCashFlow(investing),
    totalInvesting: Math.round(totalInvesting * 100) / 100,
    financing: groupCashFlow(financing),
    totalFinancing: Math.round(totalFinancing * 100) / 100,
    netCashFlow: Math.round((totalOperating + totalInvesting + totalFinancing) * 100) / 100,
  }

  // General Journal — all period vouchers with line items
  const generalJournal: GeneralJournalEntry[] = postedPeriodVouchers
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    .map(v => {
      const lines = v.lines.map(l => {
        const acct = accounts.find(a => a.id === l.accountId)
        return {
          accountCode: acct?.code || '',
          accountName: acct?.name || 'Unknown',
          debit: l.type === 'Debit' ? l.baseAmount : 0,
          credit: l.type === 'Credit' ? l.baseAmount : 0,
          narration: l.narration || '',
        }
      })
      return {
        voucherNumber: v.number,
        date: formatDate(v.date),
        voucherType: v.type,
        description: v.description,
        status: v.status,
        lines,
        totalDebit: lines.reduce((s, l) => s + l.debit, 0),
        totalCredit: lines.reduce((s, l) => s + l.credit, 0),
      }
    })

  // General Ledger — account-by-account ledger with opening balances
  const generalLedger: GeneralLedgerRow[] = accounts
    .filter(a => a.isActive)
    .map(a => {
      // Net activity for the period
      const lines = getLinesForAccount(a.id, periodVouchers)
      const totalDebit = lines.reduce((s, { line }) => s + (line.type === 'Debit' ? line.baseAmount : 0), 0)
      const totalCredit = lines.reduce((s, { line }) => s + (line.type === 'Credit' ? line.baseAmount : 0), 0)
      
      // Closing balance up to filterEnd
      const closingBalance = allBals[a.id] || 0
      
      const netActivity = a.normalBalance === 'debit' ? totalDebit - totalCredit : totalCredit - totalDebit
      
      // Derived opening balance is just closing minus net activity
      const derivedOpening = closingBalance - netActivity
      return {
        accountCode: a.code,
        accountName: a.name,
        openingBalance: Math.round(derivedOpening * 100) / 100,
        debitTotal: Math.round(totalDebit * 100) / 100,
        creditTotal: Math.round(totalCredit * 100) / 100,
        closingBalance: Math.round(closingBalance * 100) / 100,
      }
    })
    .filter(r => r.debitTotal !== 0 || r.creditTotal !== 0 || r.closingBalance !== 0 || r.openingBalance !== 0)

  return {
    financialOverview: {
      netWorth: totalAssets - totalLiabilitiesVal,
      cash,
      investments,
      bankBalance,
      revenue: totalRevenue,
      expenses: totalExpenses,
      totalAssets: totalAssetsVal,
      totalLiabilities: totalLiabilitiesVal,
      netIncome,
    },
    trialBalance: tbEntries,
    balanceSheet: {
      assets,
      liabilities,
      equity: equityItems,
      totalAssets: totalAssetsVal,
      totalLiabilities: totalLiabilitiesVal,
      totalEquity: equityItems.reduce((s, i) => s + i.balance, 0),
    },
    profitLoss: {
      revenue: revenueEntries,
      expenses: expenseEntries,
      totalRevenue,
      totalExpenses,
      netIncome,
    },
    cashPosition: {
      cashOnHand: cash,
      bankBalance,
      totalLiquid: cash + bankBalance,
      investments,
      receivables,
      totalAssets: totalAssetsVal,
    },
    investmentPosition,
    purchaseReport,
    bankPosition,
    cashFlow,
    generalJournal,
    generalLedger,
  }
}

function groupCashFlow(items: CashFlowCategory[]): CashFlowCategory[] {
  const grouped = new Map<string, CashFlowCategory>()
  for (const item of items) {
    const existing = grouped.get(item.category)
    if (existing) {
      existing.amount += item.amount
    } else {
      grouped.set(item.category, { ...item })
    }
  }
  return Array.from(grouped.values())
    .map(c => ({ ...c, amount: Math.round(c.amount * 100) / 100 }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
}
