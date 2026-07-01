import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { BankAccount, BankTransaction } from '../data/banking'
import { getAllAccountBalances, getAccountStatement } from '../accounting/ledgerService'
import { getAccountByCode } from '../accounting/chartOfAccountsService'
import { deriveBalance } from '../services/bankingService'

export interface BankAccountProjection {
  account: BankAccount
  transactionBalance: number
  ledgerBalance: number
  recentTransactions: BankTransaction[]
  statement: Array<{
    date: string
    voucherNumber: string
    description: string
    debit: number
    credit: number
    balance: number
  }>
  monthlyFlow: {
    deposits: number
    withdrawals: number
    net: number
    transactionCount: number
  }
}

export interface BankDashboardProjection {
  totalTransactionBalance: number
  totalLedgerBankBalance: number
  activeAccounts: number
  thisMonthFlow: number
  accounts: BankAccountProjection[]
}

export function getBankDashboardProjection(
  bankAccounts: BankAccount[],
  bankTransactions: BankTransaction[],
  accounts: Account[],
  vouchers: Voucher[],
): BankDashboardProjection {
  const allAccountBalances = getAllAccountBalances(vouchers, accounts)
  const bankParent = accounts.find(a => a.code === '1120')
  const totalLedgerBankBalance = bankParent
    ? accounts.filter(a => a.parentId === bankParent.id && a.isActive).reduce((s, a) => s + (allAccountBalances[a.id] || 0), 0)
    : 0

  const monthStart = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)).toISOString().split('T')[0]
  const allCredits = bankTransactions.filter(t => t.date >= monthStart && (t.type === 'credit' || t.type === 'transfer_in'))
    .reduce((s, t) => s + t.amount, 0)
  const allDebits = bankTransactions.filter(t => t.date >= monthStart && (t.type === 'debit' || t.type === 'transfer_out'))
    .reduce((s, t) => s + t.amount, 0)

  const accountsProjection: BankAccountProjection[] = bankAccounts.map(acct => {
    const txns = bankTransactions.filter(t => t.accountId === acct.id)
    const sorted = [...txns].sort((a, b) => b.date.localeCompare(b.date) || b.id.localeCompare(a.id))
    const transactionBalance = deriveBalance(acct as any, bankTransactions as any)

    const deposits = txns.filter(t => t.type === 'credit' || t.type === 'transfer_in').reduce((s, t) => s + t.amount, 0)
    const withdrawals = txns.filter(t => t.type === 'debit' || t.type === 'transfer_out').reduce((s, t) => s + t.amount, 0)

    const bankCoaId = accounts.find(a => a.code === '1120')?.id
    const statement = bankCoaId
      ? getAccountStatement(bankCoaId, vouchers, accounts, '0000-01-01', '9999-12-31')
      : []

    return {
      account: acct,
      transactionBalance,
      ledgerBalance: transactionBalance,
      recentTransactions: sorted.slice(0, 20),
      statement,
      monthlyFlow: {
        deposits,
        withdrawals,
        net: deposits - withdrawals,
        transactionCount: txns.length,
      },
    }
  })

  return {
    totalTransactionBalance: accountsProjection.reduce((s, a) => s + a.transactionBalance, 0),
    totalLedgerBankBalance,
    activeAccounts: bankAccounts.filter(a => a.status === 'active').length,
    thisMonthFlow: allCredits - allDebits,
    accounts: accountsProjection,
  }
}

export function getAccountStatementProjection(
  accountId: string,
  bankAccounts: BankAccount[],
  bankTransactions: BankTransaction[],
  accounts: Account[],
  vouchers: Voucher[],
): {
  account: BankAccount | undefined
  transactions: BankTransaction[]
  runningBalances: Record<string, number>
  stats: { deposits: number; withdrawals: number; transfers: number }
} {
  const account = bankAccounts.find(a => a.id === accountId)
  if (!account) return { account: undefined, transactions: [], runningBalances: {} as Record<string, number>, stats: { deposits: 0, withdrawals: 0, transfers: 0 } }

  const txns = bankTransactions.filter(t => t.accountId === accountId)
  const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))

  let running = account.openingBalance
  const runningBalances: Record<string, number> = {}
  for (const txn of sorted) {
    if (txn.type === 'credit' || txn.type === 'transfer_in') running += txn.amount
    else running -= txn.amount
    runningBalances[txn.id] = running
  }

  const deposits = txns.filter(t => t.type === 'credit' || t.type === 'transfer_in').reduce((s, t) => s + t.amount, 0)
  const withdrawals = txns.filter(t => t.type === 'debit' || t.type === 'transfer_out').reduce((s, t) => s + t.amount, 0)
  const transfers = txns.filter(t => t.type === 'transfer_in' || t.type === 'transfer_out').length

  return {
    account,
    transactions: sorted,
    runningBalances,
    stats: { deposits, withdrawals, transfers },
  }
}
