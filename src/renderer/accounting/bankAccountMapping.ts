import type { Account, BankMapping } from './types'
import type { BankAccount } from '../data/banking'
import { createChildAccount, getAccountByCode, resolveAccount } from './chartOfAccountsService'

const BANK_PARENT_CODE = '1120'

export function getMappingKey(bankAccountId: string): string {
  return `bank-map:${bankAccountId}`
}

export function ensureBankAccountMappings(
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

    const suffix = bank.accountNumber ? bank.accountNumber.replace(/[^a-zA-Z0-9 ]/g, '').trim() : ''
    const childName = suffix ? `${bank.institution} - ${suffix}` : bank.institution
    const { account, updatedAccounts: nextAccounts } = createChildAccount(
      BANK_PARENT_CODE,
      childName,
      updatedAccounts,
      { description: `Bank account: ${bank.id}`, currency: bank.currency },
    )
    updatedAccounts = nextAccounts

    const mapping: BankMapping = {
      bankAccountId: bank.id,
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
    }
    mappings.push(mapping)
  }

  return { accounts: updatedAccounts, mappings }
}

export function getAccountIdForBank(
  bankAccountId: string,
  mappings: BankMapping[],
  accounts?: Account[],
): string | undefined {
  const mapping = mappings.find(m => m.bankAccountId === bankAccountId)
  if (!mapping) return undefined
  if (accounts) {
    const resolved = resolveAccount(mapping.accountId, accounts) ||
                     resolveAccount(mapping.accountCode, accounts)
    if (resolved) return resolved.id
  }
  return mapping.accountId
}

export function getAccountCodeForBank(
  bankAccountId: string,
  mappings: BankMapping[],
): string | undefined {
  return mappings.find(m => m.bankAccountId === bankAccountId)?.accountCode
}

export function getBankForAccountId(
  accountId: string,
  mappings: BankMapping[],
): BankMapping | undefined {
  return mappings.find(m => m.accountId === accountId)
}

export function getBankForAccountCode(
  accountCode: string,
  mappings: BankMapping[],
): BankMapping | undefined {
  return mappings.find(m => m.accountCode === accountCode)
}
