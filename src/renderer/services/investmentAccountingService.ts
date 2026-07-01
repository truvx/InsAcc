import type { Account, BankMapping } from '../accounting/types'
import type { BankAccount } from '../data/banking'
import { createChildAccount, getAccountByCode } from '../accounting/chartOfAccountsService'

const BANK_PARENT_CODE = '1120'
export const INVESTMENT_ACCOUNT_CODES = ['1210', '1220', '1230', '1240', '1250', '1260', '1270'] as const

export function getInvestmentBankAccountId(
  bankAccountId: string,
  bankAccounts: BankAccount[],
  mappings: BankMapping[],
): string | undefined {
  const bankAcct = bankAccounts.find(a => a.id === bankAccountId)
  if (!bankAcct) return undefined
  const mapping = mappings.find(m => m.bankAccountId === bankAcct.id)
  return mapping?.accountId
}

export function ensureInvestmentBankMappings(
  bankAccounts: BankAccount[],
  accounts: Account[],
  existingMappings: BankMapping[],
): { accounts: Account[]; mappings: BankMapping[] } {
  let updatedAccounts = [...accounts]
  const mappings = [...existingMappings]
  const mappedBankIds = new Set(mappings.map(m => m.bankAccountId))

  for (const bank of bankAccounts) {
    if (mappedBankIds.has(bank.id)) continue
    const parent = getAccountByCode(BANK_PARENT_CODE, updatedAccounts)
    if (!parent) continue
    const sanitized = bank.accountName.replace(/[^a-zA-Z0-9 ]/g, '').trim()
    const childName = `Investment - ${bank.institution} - ${sanitized}`
    const { account, updatedAccounts: nextAccounts } = createChildAccount(
      BANK_PARENT_CODE,
      childName,
      updatedAccounts,
      { description: `Investment bank account: ${bank.id}`, currency: bank.currency },
    )
    updatedAccounts = nextAccounts
    mappings.push({
      bankAccountId: bank.id,
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
    })
  }

  return { accounts: updatedAccounts, mappings }
}

export function getInvestmentAssetAccountIds(accounts: Account[]): string[] {
  return accounts
    .filter(a => a.code.startsWith('12') && a.code.length >= 4 && a.isActive)
    .map(a => a.id)
}

export function getInvestmentTypeAccountIds(accounts: Account[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const code of INVESTMENT_ACCOUNT_CODES) {
    const acct = accounts.find(a => a.code === code && a.isActive)
    if (acct) result[code] = acct.id
  }
  return result
}
