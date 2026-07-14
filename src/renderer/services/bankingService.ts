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
  return credits - debits
}
interface HasBankName {
  id: string
  institution: string
}

export function getDefaultInvestmentBankAccount<T extends HasBankName>(bankAccounts: T[]): T | undefined {
  if (!bankAccounts || bankAccounts.length === 0) return undefined
  return bankAccounts[0]
}

export function getDefaultPropertyReceiptBankAccount<T extends HasBankName>(bankAccounts: T[]): T | undefined {
  if (!bankAccounts || bankAccounts.length === 0) return undefined
  return bankAccounts[0]
}

export function getDefaultPropertyPaymentBankAccount<T extends HasBankName>(bankAccounts: T[]): T | undefined {
  if (!bankAccounts || bankAccounts.length === 0) return undefined
  if (bankAccounts.length > 1) return bankAccounts[1]
  return bankAccounts[0]
}
