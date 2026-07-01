import type { BankAccount, BankTransaction } from '../data/banking'

export function parseAmount(formatted: string): number {
  const cleaned = formatted.replace(/^[+-]\s*[A-Z]+\s*/, '').replace(/,/g, '')
  return Math.abs(parseFloat(cleaned))
}

export function deriveBalance(account: BankAccount, transactions: BankTransaction[]): number {
  const accountTxns = transactions.filter(t => t.accountId === account.id)
  const credits = accountTxns
    .filter(t => t.type === 'credit' || t.type === 'transfer_in')
    .reduce((sum, t) => sum + t.amount, 0)
  const debits = accountTxns
    .filter(t => t.type === 'debit' || t.type === 'transfer_out')
    .reduce((sum, t) => sum + t.amount, 0)
  return account.openingBalance + credits - debits
}


