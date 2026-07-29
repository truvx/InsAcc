import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { BankAccount, BankTransaction } from '../data/banking'
import { getAccountBalance, getAccountStatement } from '../accounting/ledgerService'
import { getAccountByCode } from '../accounting/chartOfAccountsService'

export interface BankAccountProjection {
  account: BankAccount
  transactionBalance: number
  ledgerBalance: number
  recentTransactions: Array<{
    id: string
    date: string
    amount: number
    description: string
    type: 'credit' | 'debit' | 'transfer_in' | 'transfer_out'
  }>
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
  bankMappings: BankMapping[],
  accounts: Account[],
  vouchers: Voucher[],
): BankDashboardProjection {
  let totalLedgerBankBalance = 0

  const monthStart = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)).toISOString().split('T')[0]
  let flowTotal = 0

  const accountsProjection: BankAccountProjection[] = bankAccounts.map(acct => {
    const mapping = bankMappings.find(m => m.bankAccountId === acct.id)
    let bankCoaId = acct.chartAccountId || mapping?.accountId || ''
    
    // Auto-heal if missing or pointing to a parent account (like 1120)
    if (!bankCoaId || bankCoaId === '1120' || accounts.some(a => a.id === bankCoaId && accounts.some(child => child.parentId === a.id))) {
      const parent1120 = accounts.find(a => a.code === '1120')
      if (parent1120) {
        const matchingLedgerAcct = accounts.find(a => a.parentId === parent1120.id && a.isActive && (a.name.toLowerCase().includes(acct.institution.toLowerCase()) || acct.institution.toLowerCase().includes(a.name.toLowerCase())))
        if (matchingLedgerAcct) {
          bankCoaId = matchingLedgerAcct.id
        }
      }
    }

    
    // Bank balance must come ONLY from the ledger — same single source of truth
    // as Trial Balance / Balance Sheet. Uses getAccountBalance directly to avoid
    // getAllAccountBalances which skips inactive accounts.
    const ledgerBalance = bankCoaId ? getAccountBalance(bankCoaId, vouchers, accounts) : 0
    totalLedgerBankBalance += ledgerBalance

    const statement = bankCoaId
      ? getAccountStatement(bankCoaId, vouchers, accounts, monthStart, '9999-12-31')
      : []

    const thisMonthDeposits = statement.reduce((s, line) => s + line.debit, 0)
    const thisMonthWithdrawals = statement.reduce((s, line) => s + line.credit, 0)
    const thisMonthNet = thisMonthDeposits - thisMonthWithdrawals
    flowTotal += thisMonthNet

    const recentTxns = statement.map((line, idx) => ({
      id: `txn-${idx}`,
      date: line.date,
      amount: line.debit > 0 ? line.debit : line.credit,
      description: line.description,
      type: (line.debit > 0 ? 'credit' : 'debit') as 'credit' | 'debit' | 'transfer_in' | 'transfer_out'
    })).reverse()

    const allTimeStatement = bankCoaId
      ? getAccountStatement(bankCoaId, vouchers, accounts, '0000-01-01', '9999-12-31')
      : []

    const deposits = allTimeStatement.reduce((s, line) => s + line.debit, 0)
    const withdrawals = allTimeStatement.reduce((s, line) => s + line.credit, 0)

    return {
      account: acct,
      transactionBalance: ledgerBalance,
      ledgerBalance,
      recentTransactions: recentTxns.slice(0, 20),
      statement: allTimeStatement,
      monthlyFlow: {
        deposits,
        withdrawals,
        net: deposits - withdrawals,
        transactionCount: allTimeStatement.length,
      },
    }
  })

  return {
    totalTransactionBalance: accountsProjection.reduce((s, a) => s + a.transactionBalance, 0),
    totalLedgerBankBalance,
    activeAccounts: bankAccounts.filter(a => a.status === 'active').length,
    thisMonthFlow: flowTotal,
    accounts: accountsProjection,
  }
}

export function getAccountStatementProjection(
  accountId: string,
  bankAccounts: BankAccount[],
  bankMappings: BankMapping[],
  accounts: Account[],
  vouchers: Voucher[],
): {
  account: BankAccount | undefined
  statement: Array<{
    date: string
    voucherNumber: string
    description: string
    debit: number
    credit: number
    balance: number
  }>
  stats: { deposits: number; withdrawals: number; transfers: number }
} {
  const account = bankAccounts.find(a => a.id === accountId)
  if (!account) return { account: undefined, statement: [], stats: { deposits: 0, withdrawals: 0, transfers: 0 } }

  const mapping = bankMappings.find(m => m.bankAccountId === accountId)
  let bankCoaId = (account as any).chartAccountId || mapping?.accountId || ''

  // Auto-heal if missing or pointing to a parent account (like 1120)
  if (!bankCoaId || bankCoaId === '1120' || accounts.some(a => a.id === bankCoaId && accounts.some(child => child.parentId === a.id))) {
    const parent1120 = accounts.find(a => a.code === '1120')
    if (parent1120) {
      const matchingLedgerAcct = accounts.find(a => a.parentId === parent1120.id && a.isActive && (a.name.toLowerCase().includes(account.institution.toLowerCase()) || account.institution.toLowerCase().includes(a.name.toLowerCase())))
      if (matchingLedgerAcct) {
        bankCoaId = matchingLedgerAcct.id
      }
    }
  }

  console.log('[BankStatement] accountId=', accountId, 'chartAccountId=', (account as any).chartAccountId, 'mapping=', mapping?.accountId, 'resolved bankCoaId=', bankCoaId)
  console.log('[BankStatement] accounts count=', accounts.length, 'coaFound=', accounts.some(a => a.id === bankCoaId), 'vouchers count=', vouchers.length)
  const matchingLines = vouchers.flatMap(v => v.lines).filter(l => l.accountId === bankCoaId)
  console.log('[BankStatement] voucher lines matching bankCoaId=', matchingLines.length, matchingLines)

  const statement = bankCoaId
    ? getAccountStatement(bankCoaId, vouchers, accounts, '0000-01-01', '9999-12-31')
    : []
  console.log('[BankStatement] statement entries=', statement.length, statement)

  const deposits = statement.reduce((s, line) => s + line.debit, 0)
  const withdrawals = statement.reduce((s, line) => s + line.credit, 0)
  const transfers = 0

  return {
    account,
    statement,
    stats: { deposits, withdrawals, transfers },
  }
}
