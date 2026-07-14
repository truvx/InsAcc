import type { Account, BankMapping } from '../accounting/types'
import type { Currency, TaxCode, PaymentTerm } from '../data/masterData'
import type { BankAccount } from '../data/banking'
import type { PropAccount } from '../data/propertyTypes'
import { initializeDefaultChartOfAccounts, verifyAndCreateSystemAccounts } from '../accounting/chartOfAccountsService'
import { initializeMasterData } from './masterDataService'
import { ensureBankAccountMappings } from '../accounting/bankAccountMapping'

export interface InitializationOptions {
  companyId?: string
  country?: 'UAE' | 'India' | 'UK' | 'Generic'
}

export interface AppInitializationResult {
  accounts: Account[]
  propChartAccounts: Account[]
  currencies: Currency[]
  taxCodes: TaxCode[]
  paymentTerms: PaymentTerm[]
  bankMappings: BankMapping[]
  propBankMappings: BankMapping[]
  propAccounts: PropAccount[]
  bankAccounts: BankAccount[]
}

export function initializeApplication(options: InitializationOptions = {}): AppInitializationResult {
  const country = options.country ?? 'UAE'
  const isUae = country === 'UAE'
  const isIndia = country === 'India'
  const isUk = country === 'UK'
  const baseCurrency = isUae ? 'AED' : isIndia ? 'INR' : isUk ? 'GBP' : 'USD'

  // 1. Initialize SEPARATE Chart of Accounts for each module
  const investmentCoa = initializeDefaultChartOfAccounts(country, 'investment')
  const propertyCoa = initializeDefaultChartOfAccounts(country, 'property')

  // 2. Initialize country-specific Master Data
  const masterData = initializeMasterData(country)

  const dibCoaId = 'acc-dib-current'
  const fabCoaId = 'acc-fab-current'

  const propAccounts: PropAccount[] = [
    {
      id: 'pt-dib-current',
      institution: 'Dubai Islamic Bank',
      accountNumber: 'DIB-CURR-1234',
      currency: baseCurrency,
      openingBalance: 0,
      theme: 'emerald',
      icon: 'bank',
      status: 'active',
      chartAccountId: dibCoaId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      updatedBy: 'system'
    },
    {
      id: 'pt-fab-current',
      institution: 'First Abu Dhabi Bank (FAB)',
      accountNumber: 'FAB-CURR-9999',
      currency: baseCurrency,
      openingBalance: 0,
      theme: 'blue',
      icon: 'bank',
      status: 'active',
      chartAccountId: fabCoaId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      updatedBy: 'system'
    }
  ]

  // 4. Create Default Investment Bank Accounts
  // NOTE: openingBalance is intentionally 0. Ledger balance is computed
  // exclusively from posted GL vouchers — no hardcoded seed balance.
  const bankAccounts: BankAccount[] = [
    {
      id: 'ba-eib-invest',
      institution: 'Emirates Islamic Bank',
      accountNumber: 'EIB-INV-7777',
      currency: baseCurrency,
      openingBalance: 0,
      theme: 'emerald',
      icon: 'bank',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      updatedBy: 'system'
    }
  ]

  // 5. Verify system accounts per module and create bank mappings
  const investmentCoaVerified = verifyAndCreateSystemAccounts(investmentCoa, baseCurrency, 'investment')
  const propertyCoaVerified = verifyAndCreateSystemAccounts(propertyCoa, baseCurrency, 'property')

  // 6. Create bank account ledger mappings per module
  const bankParent1120 = propertyCoaVerified.find(a => a.code === '1120')
  const nowStr = new Date().toISOString()
  
  const dibCoaAccount: Account = {
    id: dibCoaId,
    code: '112001',
    name: 'Dubai Islamic Bank',
    type: 'asset',
    normalBalance: 'debit',
    classification: 'current',
    currency: baseCurrency,
    isActive: true,
    createdAt: nowStr,
    updatedAt: nowStr,
    description: 'Dubai Islamic Bank Current Account',
    parentId: bankParent1120?.id || '1120',
    module: 'property',
    openingBalance: 0
  }

  const fabCoaAccount: Account = {
    id: fabCoaId,
    code: '112002',
    name: 'First Abu Dhabi Bank (FAB)',
    type: 'asset',
    normalBalance: 'debit',
    classification: 'current',
    currency: baseCurrency,
    isActive: true,
    createdAt: nowStr,
    updatedAt: nowStr,
    description: 'First Abu Dhabi Bank (FAB) Current Account',
    parentId: bankParent1120?.id || '1120',
    module: 'property',
    openingBalance: 0
  }

  if (!propertyCoaVerified.some(a => a.id === dibCoaAccount.id || a.code === dibCoaAccount.code)) {
    propertyCoaVerified.push(dibCoaAccount)
  }
  if (!propertyCoaVerified.some(a => a.id === fabCoaAccount.id || a.code === fabCoaAccount.code)) {
    propertyCoaVerified.push(fabCoaAccount)
  }

  const propMappings: BankMapping[] = [
    {
      bankAccountId: 'pt-dib-current',
      accountId: 'acc-dib-current',
      accountCode: '112001',
      accountName: 'Dubai Islamic Bank'
    },
    {
      bankAccountId: 'pt-fab-current',
      accountId: 'acc-fab-current',
      accountCode: '112002',
      accountName: 'First Abu Dhabi Bank (FAB)'
    }
  ]

  const invResult = ensureBankAccountMappings(
    bankAccounts,
    investmentCoaVerified,
    [],
  )

  return {
    accounts: invResult.accounts,
    propChartAccounts: propertyCoaVerified,
    currencies: masterData.currencies,
    taxCodes: masterData.taxCodes,
    paymentTerms: masterData.paymentTerms,
    bankMappings: invResult.mappings,
    propBankMappings: propMappings,
    propAccounts,
    bankAccounts,
  }
}
