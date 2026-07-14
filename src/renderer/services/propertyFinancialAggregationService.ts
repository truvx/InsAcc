import type { Account, Voucher, TrialBalanceEntry, BankMapping } from '../accounting/types'
import type { PropAccount } from '../data/propertyTypes'
import { getAccountBalance, getAccountTypeBalance, getTrialBalance } from '../accounting/ledgerService'
import {
  generateChartOfAccountsReadModel,
  generateTrialBalanceReadModel,
  generateProfitAndLossReadModel,
  generateBalanceSheetReadModel,
  type ChartOfAccountsReadModelEntry,
  type ProfitAndLossReadModel,
  type BalanceSheetReadModel,
} from '../readModels/accountingReadModels'

export interface PropertyFinancialSummary {
  cash: number
  bankBalance: number
  pdc: number
  rentalIncome: number
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  coa: ChartOfAccountsReadModelEntry[]
  tb: TrialBalanceEntry[]
  pl: ProfitAndLossReadModel
  bs: BalanceSheetReadModel
}

export function getPropertyFinancialSummary(
  accounts: Account[],
  vouchers: Voucher[],
  _propAccounts: PropAccount[],
  _bankMappings: BankMapping[],
): PropertyFinancialSummary {
  const coa = generateChartOfAccountsReadModel(accounts, vouchers)
  const tb = generateTrialBalanceReadModel(coa)
  const pl = generateProfitAndLossReadModel(tb, accounts)
  const bs = generateBalanceSheetReadModel(tb, pl.netProfit, accounts)

  const cash = bs.currentAssets
    .filter(i => i.accountCode.startsWith('1110'))
    .reduce((s, i) => s + i.balance, 0)

  // Bank balance from ledger — sum all 1120 leaf account balances
  const bankBalance = bs.currentAssets
    .filter(i => i.accountCode.startsWith('1120') || i.accountCode.startsWith('112'))
    .reduce((s, i) => s + i.balance, 0)

  const pdc = bs.currentAssets
    .filter(i => i.accountCode.startsWith('1410'))
    .reduce((s, i) => s + i.balance, 0)

  const rentalIncome = pl.revenue
    .filter(i => i.accountCode.startsWith('4120') || i.accountCode.startsWith('4200') || i.accountCode.startsWith('4210'))
    .reduce((s, i) => s + i.balance, 0)

  return {
    cash,
    bankBalance,
    pdc,
    rentalIncome,
    totalRevenue: pl.totalRevenue,
    totalExpenses: pl.totalExpenses,
    netIncome: pl.netProfit,
    totalAssets: bs.totalAssets,
    totalLiabilities: bs.totalLiabilities,
    totalEquity: bs.totalEquity,
    coa,
    tb,
    pl,
    bs,
  }
}
