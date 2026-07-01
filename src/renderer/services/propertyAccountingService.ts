import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { PdcCheque, PropAccount } from '../data/propertyTypes'
import { getAccountIdForBank } from '../accounting/bankAccountMapping'

const PDC_ACCOUNT_CODE = '1410'
const RENTAL_RECEIVABLE_CODE = '1320'
const RENTAL_INCOME_CODE = '4120'
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
  const mapping = mappings.find(m => m.bankAccountId === propAcct.id)
  return mapping?.accountId
}

export function ensurePropertyBankMappings(
  propAccounts: PropAccount[],
  accounts: Account[],
  existingMappings: BankMapping[],
): { accounts: Account[]; mappings: BankMapping[] } {
  let updatedAccounts = [...accounts]
  const mappings = [...existingMappings]
  const mappedBankIds = new Set(mappings.map(m => m.bankAccountId))
  const bankParent = accounts.find(a => a.code === '1120')
  if (!bankParent) return { accounts, mappings }

  for (const bank of propAccounts) {
    if (mappedBankIds.has(bank.id)) continue
    const childCode = generateChildAccountCode('1120', updatedAccounts)
    const n = new Date().toISOString()
    const account: Account = {
      id: `acc-${childCode}`,
      code: childCode,
      name: `Property - ${bank.institution} - ${bank.accountName}`,
      type: 'asset',
      normalBalance: 'debit',
      parentId: bankParent.id,
      isActive: true,
      description: `Property bank account: ${bank.id}`,
      currency: bank.currency,
      createdAt: n,
      updatedAt: n,
    }
    updatedAccounts.push(account)
    mappings.push({
      bankAccountId: bank.id,
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
    })
  }

  return { accounts: updatedAccounts, mappings }
}

function generateChildAccountCode(parentCode: string, accounts: Account[]): string {
  const children = accounts
    .filter(a => a.code.startsWith(parentCode) && a.code.length > parentCode.length)
    .map(a => parseInt(a.code.slice(parentCode.length), 10))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b)
  const next = children.length > 0 ? children[children.length - 1] + 1 : 1
  return `${parentCode}${String(next).padStart(2, '0')}`
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
