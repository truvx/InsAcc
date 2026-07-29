import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { PdcCheque, PropAccount } from '../data/propertyTypes'
import { getAccountIdForBank } from '../accounting/bankAccountMapping'
import { createChildAccount } from '../accounting/chartOfAccountsService'

const PDC_ACCOUNT_CODE = '1410'
const RENTAL_RECEIVABLE_CODE = '1320'
const RENTAL_INCOME_CODE = '4120' // Building Rental Income
const VILLA_RENTAL_INCOME_CODE = '4200' // Villa Rental Income
const APARTMENT_RENTAL_INCOME_CODE = '4210' // Apartment Rental Income
const SECURITY_DEPOSIT_LIABILITY_CODE = '2120'

export function getPdcAccountId(accounts: Account[]): string | undefined {
  return accounts.find(a => a.code === PDC_ACCOUNT_CODE)?.id
}

export function getRentalReceivableAccountId(accounts: Account[]): string | undefined {
  return accounts.find(a => a.code === RENTAL_RECEIVABLE_CODE)?.id
}

export function getRentalIncomeAccountId(accounts: Account[]): string | undefined {
  return accounts.find(a => a.code === RENTAL_INCOME_CODE)?.id
}

export function getVillaRentalIncomeAccountId(accounts: Account[]): string | undefined {
  return accounts.find(a => a.code === VILLA_RENTAL_INCOME_CODE && a.module === 'property')?.id
}

export function getApartmentRentalIncomeAccountId(accounts: Account[]): string | undefined {
  return accounts.find(a => a.code === APARTMENT_RENTAL_INCOME_CODE)?.id
}

export function getAllRentalIncomeAccountIds(accounts: Account[]): string[] {
  return [
    getRentalIncomeAccountId(accounts),
    getVillaRentalIncomeAccountId(accounts),
    getApartmentRentalIncomeAccountId(accounts),
  ].filter((id): id is string => Boolean(id))
}

export function getSecurityDepositLiabilityAccountId(accounts: Account[]): string | undefined {
  return accounts.find(a => a.code === SECURITY_DEPOSIT_LIABILITY_CODE)?.id
}

export function findAccountByCode(accounts: Account[], code: string): Account | undefined {
  return accounts.find(a => a.code === code)
}

export function findAccountByName(accounts: Account[], name: string, type?: string): Account | undefined {
  return accounts.find(a =>
    a.name.toLowerCase() === name.toLowerCase() &&
    (type === undefined || a.type === type) &&
    a.isActive,
  )
}

export function getPropertyBankAccountId(
  propAccountId: string,
  propAccounts: PropAccount[],
  mappings: BankMapping[],
): string | undefined {
  const propAcct = propAccounts.find(a => a.id === propAccountId)
  if (!propAcct) return undefined
  if (propAcct.chartAccountId) return propAcct.chartAccountId
  const mapping = mappings.find(m => m.bankAccountId === propAcct.id)
  return mapping?.accountId
}

export function validateBankChartLink(
  propAccountId: string,
  propAccounts: PropAccount[],
  mappings: BankMapping[],
): { valid: boolean; chartAccountId?: string; error?: string } {
  const propAcct = propAccounts.find(a => a.id === propAccountId)
  if (!propAcct) return { valid: false, error: 'Bank account not found.' }

  const coaId = propAcct.chartAccountId || mappings.find(m => m.bankAccountId === propAcct.id)?.accountId
  if (!coaId) {
    return { valid: false, error: 'This bank account is not linked to a Chart of Accounts account.' }
  }
  return { valid: true, chartAccountId: coaId }
}

export function ensurePropertyBankMappings(
  propAccounts: PropAccount[],
  accounts: Account[],
  existingMappings: BankMapping[],
): { accounts: Account[]; mappings: BankMapping[]; propAccounts: PropAccount[] } {
  let updatedAccounts = [...accounts]
  const mappings = [...existingMappings]
  const mappedBankIds = new Set(mappings.map(m => m.bankAccountId))
  const updatedPropAccounts = propAccounts.map(bank => {
    if (bank.chartAccountId) return bank
    const mapping = mappings.find(m => m.bankAccountId === bank.id)
    if (mapping) return { ...bank, chartAccountId: mapping.accountId }
    return bank
  })

  for (const bank of updatedPropAccounts) {
    if (mappedBankIds.has(bank.id) || bank.chartAccountId) continue
    const childName = bank.accountNumber ? `${bank.institution} - ${bank.accountNumber}` : bank.institution
    const { account, updatedAccounts: nextAccounts } = createChildAccount(
      '1120',
      childName,
      updatedAccounts,
      { description: `Bank account: ${bank.id}`, currency: bank.currency, module: 'property' },
    )
    updatedAccounts = nextAccounts
    const mapping: BankMapping = {
      bankAccountId: bank.id,
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
    }
    mappings.push(mapping)
    const idx = updatedPropAccounts.indexOf(bank)
    if (idx >= 0) updatedPropAccounts[idx] = { ...bank, chartAccountId: account.id }
  }

  return { accounts: updatedAccounts, mappings, propAccounts: updatedPropAccounts }
}

export function createPropertyVoucherContext(
  amount: number,
  date: string,
  description: string,
  bankAccountId?: string,
  referenceId?: string,
  createdBy?: string,
) {
  return {
    amount,
    date,
    description,
    currency: 'AED',
    exchangeRate: 1,
    baseCurrency: 'AED',
    bankAccount: bankAccountId,
    referenceType: 'Property' as const,
    referenceId,
    createdBy,
  }
}
