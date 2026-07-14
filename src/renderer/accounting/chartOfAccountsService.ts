import type { Account, AccountNode, AccountType, NormalBalance, AccountClassification } from './types'
import { now } from '../../shared/utils/dateUtils'

export function getAccountById(id: string, accounts: Account[]): Account | undefined {
  return accounts.find(a => a.id === id)
}

export function getAccountsByIds(ids: string[], accounts: Account[]): Account[] {
  const idSet = new Set(ids)
  return accounts.filter(a => idSet.has(a.id))
}

export function getNormalBalance(type: AccountType): NormalBalance {
  switch (type) {
    case 'asset':
    case 'expense':
      return 'debit'
    case 'liability':
    case 'equity':
    case 'revenue':
      return 'credit'
  }
}

export function isContraAccount(account: Account): boolean {
  return account.contraAccountId !== undefined && account.contraAccountId !== null
}

export function getContraAccount(account: Account, accounts: Account[]): Account | undefined {
  if (!account.contraAccountId) return undefined
  return accounts.find(a => a.id === account.contraAccountId && a.isActive)
}

export function getAccountsByClassification(
  classification: AccountClassification,
  accounts: Account[],
): Account[] {
  return accounts.filter(a => a.classification === classification && a.isActive)
}

export function getClassifiedAccounts(accounts: Account[]): {
  current: Account[]
  nonCurrent: Account[]
  operating: Account[]
  nonOperating: Account[]
  unclassified: Account[]
} {
  const current: Account[] = []
  const nonCurrent: Account[] = []
  const operating: Account[] = []
  const nonOperating: Account[] = []
  const unclassified: Account[] = []
  for (const a of accounts) {
    if (!a.isActive) continue
    if (a.classification === 'current') current.push(a)
    else if (a.classification === 'non-current') nonCurrent.push(a)
    else if (a.classification === 'operating') operating.push(a)
    else if (a.classification === 'non-operating') nonOperating.push(a)
    else unclassified.push(a)
  }
  return { current, nonCurrent, operating, nonOperating, unclassified }
}

export function getLeafAccounts(accounts: Account[]): Account[] {
  return accounts.filter(a => a.isActive && !accounts.some(c => c.parentId === a.id && c.isActive))
}

export function getParentAccount(account: Account, accounts: Account[]): Account | undefined {
  if (!account.parentId) return undefined
  return accounts.find(a => a.id === account.parentId)
}

export function getAccountByCode(code: string, accounts: Account[]): Account | undefined {
  return accounts.find(a => a.code === code)
}

export function getAccountsByType(type: AccountType, accounts: Account[]): Account[] {
  return accounts.filter(a => a.type === type && a.isActive)
}

export function getActiveAccounts(accounts: Account[]): Account[] {
  return accounts.filter(a => a.isActive)
}

export function getChildren(parentId: string, accounts: Account[]): Account[] {
  return accounts.filter(a => a.parentId === parentId && a.isActive)
}

export function getDescendants(parentId: string, accounts: Account[]): Account[] {
  const result: Account[] = []
  const direct = getChildren(parentId, accounts)
  for (const child of direct) {
    result.push(child)
    result.push(...getDescendants(child.id, accounts))
  }
  return result
}

export function isBankAccount(account: Account): boolean {
  return account.code.startsWith('1120') && account.code.length >= 6
}

export function isAssetAccount(account: Account): boolean {
  return account.code.startsWith('1')
}

export function isInvestmentAccount(account: Account): boolean {
  return account.code.startsWith('12')
}

export function isParentAccount(account: Account, accounts: Account[]): boolean {
  return accounts.some(a => a.parentId === account.id)
}

export function generateChildCode(parentCode: string, accounts: Account[]): string {
  const prefix = parentCode
  const children = accounts
    .filter(a => a.code.startsWith(prefix) && a.code.length > prefix.length)
    .map(a => a.code)
    .sort()

  if (children.length === 0) {
    return `${prefix}01`
  }

  const lastCode = children[children.length - 1]
  const lastSeq = lastCode.slice(prefix.length)
  const nextSeq = String(Number(lastSeq) + 1).padStart(lastSeq.length, '0')
  return `${prefix}${nextSeq}`
}

export function createChildAccount(
  parentCode: string,
  name: string,
  accounts: Account[],
  options?: Partial<Pick<Account, 'description' | 'currency'>>,
): { account: Account; updatedAccounts: Account[] } {
  const parent = getAccountByCode(parentCode, accounts)
  if (!parent) {
    throw new Error(`Parent account with code "${parentCode}" not found`)
  }

  const code = generateChildCode(parentCode, accounts)
  const n = now()
  const account: Account = {
    id: code,
    code,
    name,
    type: parent.type,
    normalBalance: parent.normalBalance,
    parentId: parent.id,
    isActive: true,
    description: options?.description ?? `Auto-created ${name}`,
    currency: options?.currency ?? parent.currency ?? 'AED',
    createdAt: n,
    updatedAt: n,
  }

  return {
    account,
    updatedAccounts: [...accounts, account],
  }
}

export function deactivateAccount(id: string, accounts: Account[]): Account[] {
  return accounts.map(a =>
    a.id === id ? { ...a, isActive: false, updatedAt: now() } : a,
  )
}

export function reactivateAccount(id: string, accounts: Account[]): Account[] {
  return accounts.map(a =>
    a.id === id ? { ...a, isActive: true, updatedAt: now() } : a,
  )
}

export function updateAccount(
  id: string,
  changes: Partial<Pick<Account, 'name' | 'description' | 'currency'>>,
  accounts: Account[],
): Account | undefined {
  const account = getAccountById(id, accounts)
  if (!account) return undefined
  return {
    ...account,
    ...changes,
    updatedAt: now(),
  }
}

export function buildAccountTree(accounts: Account[]): AccountNode[] {
  const active = getActiveAccounts(accounts)
  const roots = active.filter(a => a.parentId === null)

  function buildNode(account: Account, depth: number): AccountNode {
    const children = getChildren(account.id, active).map(c => buildNode(c, depth + 1))
    return { account, children, depth }
  }

  return roots.map(r => buildNode(r, 0))
}

export function getAllLeafAccounts(accounts: Account[]): Account[] {
  return accounts.filter(a => a.isActive && !accounts.some(c => c.parentId === a.id && c.isActive))
}

export function findAccountCodeByName(name: string, accounts: Account[], type?: AccountType): string | undefined {
  const candidates = accounts.filter(a =>
    a.name.toLowerCase() === name.toLowerCase() &&
    a.isActive &&
    (type === undefined || a.type === type),
  )
  return candidates[0]?.code
}

export function initializeDefaultChartOfAccounts(country: string = 'UAE', module: 'investment' | 'property' = 'investment'): Account[] {
  const isUae = country === 'UAE'
  const isIndia = country === 'India'
  const isUk = country === 'UK'
  const cur = isUae ? 'AED' : isIndia ? 'INR' : isUk ? 'GBP' : 'USD'
  const ts = new Date().toISOString()

  const mkAcct = (id: string, code: string, name: string, type: AccountType, normalBalance: NormalBalance, parentId: string | null, description: string, mod: 'investment' | 'property' | 'shared'): Account => ({
    id, code, name, type, normalBalance, parentId, isActive: true, createdAt: ts, updatedAt: ts, description, currency: cur, module: mod,
  })

  // Shared structural roots
  const shared: Account[] = [
    mkAcct('1000', '1000', 'Assets', 'asset', 'debit', null, 'Root Asset Account', 'shared'),
    mkAcct('1120', '1120', isUk ? 'Cash and Bank' : 'Bank Accounts', 'asset', 'debit', '1000', 'Bank Accounts', 'shared'),
    mkAcct('2000', '2000', 'Liabilities', 'liability', 'credit', null, 'Root Liabilities Account', 'shared'),
    mkAcct('2100', '2100', 'Accounts Payable', 'liability', 'credit', '2000', 'Vendor Payables', 'shared'),
    mkAcct('3000', '3000', 'Owner Equity', 'equity', 'credit', null, 'Owner Capital', 'shared'),
    mkAcct('3120', '3120', 'Retained Earnings', 'equity', 'credit', '3000', 'Retained Earnings', 'shared'),
    mkAcct('3200', '3200', 'Current Year Earnings', 'equity', 'credit', '3120', 'Current Year Earnings', 'shared'),
    mkAcct('4000', '4000', 'Revenue', 'revenue', 'credit', null, 'Root Revenue Account', 'shared'),
    mkAcct('5000', '5000', 'Expenses', 'expense', 'debit', null, 'Root Expenses Account', 'shared'),
  ]

  if (module === 'investment') {
    return [
      ...shared,
      // Investment Assets
      mkAcct('1110-inv', '1110', 'Cash In Hand', 'asset', 'debit', '1000', 'Cash', 'investment'),
      mkAcct('1200', '1200', 'Investments', 'asset', 'debit', '1000', 'Precious Metals & Funds', 'investment'),
      mkAcct('1210', '1210', 'Gold Holding', 'asset', 'debit', '1200', 'Gold Bullion', 'investment'),
      mkAcct('1220', '1220', 'Silver Holding', 'asset', 'debit', '1200', 'Silver Bullion', 'investment'),
      mkAcct('1230', '1230', 'Sukuk Holding', 'asset', 'debit', '1200', 'Sukuk investments', 'investment'),
      mkAcct('1240', '1240', 'Bonds Holding', 'asset', 'debit', '1200', 'Fixed income bonds', 'investment'),
      mkAcct('1250', '1250', 'Mutual Funds Holding', 'asset', 'debit', '1200', 'Mutual fund holdings', 'investment'),
      mkAcct('1260', '1260', 'Stocks & Shares Holding', 'asset', 'debit', '1200', 'Equity holdings', 'investment'),
      mkAcct('1280', '1280', 'Private Investment Holding', 'asset', 'debit', '1200', 'Private investments', 'investment'),
      mkAcct('1290', '1290', 'Fixed Deposit Holding', 'asset', 'debit', '1200', 'Fixed deposit certificates', 'investment'),
      mkAcct('1320', '1320', 'Accounts Receivable', 'asset', 'debit', '1000', 'Client Receivables', 'investment'),
      // Investment Revenue
      mkAcct('4110', '4110', 'Dividend Income', 'revenue', 'credit', '4000', 'Dividend Income', 'investment'),
      mkAcct('4130', '4130', 'Capital Gain', 'revenue', 'credit', '4000', 'Capital Gains', 'investment'),
      mkAcct('4140', '4140', 'Interest Income', 'revenue', 'credit', '4000', 'Interest Income', 'investment'),
      mkAcct('4150', '4150', 'Sukuk Profit', 'revenue', 'credit', '4000', 'Sukuk Profit', 'investment'),
      mkAcct('4160', '4160', 'Bond Coupon', 'revenue', 'credit', '4000', 'Bond Coupon Income', 'investment'),
      mkAcct('4170', '4170', 'Mutual Fund Distribution', 'revenue', 'credit', '4000', 'Mutual Fund Distribution', 'investment'),
      mkAcct('4180', '4180', 'Investment Sale Proceeds', 'revenue', 'credit', '4000', 'Investment Sale Proceeds', 'investment'),
      mkAcct('4190', '4190', 'Investment Refund', 'revenue', 'credit', '4000', 'Investment Refund', 'investment'),
      mkAcct('4200', '4200', 'Investment Income', 'revenue', 'credit', '4000', 'Dividends & Capital Gains', 'investment'),
      // Investment Expenses
      mkAcct('5130', '5130', 'Brokerage Fees', 'expense', 'debit', '5000', 'Brokerage Fees', 'investment'),
      mkAcct('5140', '5140', 'Transfer Fees', 'expense', 'debit', '5000', 'Transfer Fees', 'investment'),
      mkAcct('5150', '5150', 'Bank Charges', 'expense', 'debit', '5000', 'Bank Charges', 'investment'),
      mkAcct('5160', '5160', 'Fund Management Charges', 'expense', 'debit', '5000', 'Fund Management Charges', 'investment'),
      mkAcct('5180', '5180', 'Other Expenses', 'expense', 'debit', '5000', 'Other Expenses', 'investment'),
      mkAcct('5210', '5210', 'Purchase Input VAT Expense', 'expense', 'debit', '5000', 'Purchase Input VAT Expense', 'investment'),
      mkAcct('5220', '5220', 'Transportation', 'expense', 'debit', '5000', 'Transportation', 'investment'),
      mkAcct('5230', '5230', 'Insurance', 'expense', 'debit', '5000', 'Insurance', 'investment'),
      mkAcct('5240', '5240', 'Documentation', 'expense', 'debit', '5000', 'Documentation', 'investment'),
      mkAcct('2200-inv', '2200', 'Owner Account', 'liability', 'credit', '2000', 'Investment Owner Account', 'investment'),
    ]
  }

  // Property module
  return [
    ...shared,
    mkAcct('1110-prop', '1110', 'Cash In Hand', 'asset', 'debit', '1000', 'Cash', 'property'),
    // Bank child accounts are NOT created here — they are added by
    // initializeApplication() with canonical IDs (acc-dib-current etc.)
    // to avoid duplicate accounts with the same code.
    mkAcct('1130', '1130', 'Rent Receivable', 'asset', 'debit', '1000', 'Rent Receivable', 'property'),
    mkAcct('1270', '1270', 'Real Estate', 'asset', 'debit', '1000', 'Property Assets', 'property'),
    mkAcct('1320', '1320', 'Accounts Receivable', 'asset', 'debit', '1000', 'Client Receivables', 'property'),
    mkAcct('1410', '1410', isIndia ? 'PDC Receivables' : 'Post-dated Cheques Receivable', 'asset', 'debit', '1000', 'PDC Receivables Pool', 'property'),
    mkAcct('2110', '2110', 'Deferred Revenue', 'liability', 'credit', '2000', 'Deferred Revenue', 'property'),
    mkAcct('2120', '2120', 'Security Deposits Held', 'liability', 'credit', '2000', 'Tenant Security Deposits Trust', 'property'),
    mkAcct('2200-prop', '2200', 'Owner Account', 'equity', 'credit', '3000', 'Property Owner Account', 'property'),
    mkAcct('4120', '4120', 'Building Rental Income', 'revenue', 'credit', '4000', 'Building Rental Income', 'property'),
    mkAcct('4200', '4200', 'Villa Rental Income', 'revenue', 'credit', '4000', 'Villa Rental Income', 'property'),
    mkAcct('4210', '4210', 'Apartment Rental Income', 'revenue', 'credit', '4000', 'Apartment Rental Income', 'property'),
    mkAcct('5100', '5100', 'Repair Expense', 'expense', 'debit', '5000', 'Repair Expense', 'property'),
    mkAcct('5110', '5110', 'Management Fees', 'expense', 'debit', '5000', 'Property Management Fees', 'property'),
    mkAcct('5120', '5120', 'Maintenance Expense', 'expense', 'debit', '5000', 'Maintenance Expense', 'property'),
    mkAcct('5180', '5180', 'Miscellaneous Expense', 'expense', 'debit', '5000', 'Miscellaneous', 'property'),
    mkAcct('5210', '5210', 'Purchase Input VAT Expense', 'expense', 'debit', '5000', 'Purchase Input VAT Expense', 'property'),
    mkAcct('4160', '4160', 'Damage Recovery Income', 'revenue', 'credit', '4000', 'Security deposit forfeiture & damage recovery income', 'property'),
  ]
}

export function resolveAccount(
  identifier: string,
  accounts: Account[],
  type?: AccountType,
): Account | undefined {
  if (!identifier) return undefined
  let cleanId = identifier.replace(/^acc-/, '')
  
  if (cleanId === 'EXP_PURCHASE_INPUT_VAT' || identifier === 'EXP_PURCHASE_INPUT_VAT') {
    cleanId = '5210'
  }

  // 1. Try ID (both clean and original)
  let acct = accounts.find(a => a.id === cleanId && a.isActive)
  if (acct) return acct
  acct = accounts.find(a => a.id === identifier && a.isActive)
  if (acct) return acct

  // 2. Try Code (both clean and original)
  acct = accounts.find(a => a.code === cleanId && a.isActive)
  if (acct) return acct
  acct = accounts.find(a => a.code === identifier && a.isActive)
  if (acct) return acct

  // 3. Try Name (exact, case insensitive)
  acct = accounts.find(
    a => a.name.toLowerCase() === identifier.toLowerCase() &&
    a.isActive &&
    (type === undefined || a.type === type),
  )
  if (acct) return acct

  // 4. Try Name (starts-with/partial, case-insensitive)
  acct = accounts.find(
    a => a.name.toLowerCase().includes(identifier.toLowerCase()) &&
    a.isActive &&
    (type === undefined || a.type === type),
  )
  if (acct) return acct

  // 5. Try Type (first active account of matching type)
  if (type !== undefined || ['asset', 'liability', 'equity', 'revenue', 'expense'].includes(identifier.toLowerCase())) {
    const targetType = type || (identifier.toLowerCase() as AccountType)
    acct = accounts.find(a => a.type === targetType && a.isActive)
    if (acct) return acct
  }

  return undefined
}

export function verifyAndCreateSystemAccounts(accounts: Account[], baseCurrency: string = 'AED', module: 'investment' | 'property' = 'investment'): Account[] {
  const updatedAccounts = [...accounts]

  function ensureAccount(
    id: string,
    code: string,
    name: string,
    type: AccountType,
    normalBalance: NormalBalance,
    parentId: string | null,
    description: string,
    mod: 'investment' | 'property' | 'shared' = 'shared',
  ) {
    const existingIndex = updatedAccounts.findIndex(a => a.code === code || a.id === id)
    if (existingIndex === -1) {
      const n = new Date().toISOString()
      updatedAccounts.push({
        id,
        code,
        name,
        type,
        normalBalance,
        parentId,
        isActive: true,
        description,
        currency: baseCurrency,
        createdAt: n,
        updatedAt: n,
        module: mod,
      })
    } else {
      updatedAccounts[existingIndex] = {
        ...updatedAccounts[existingIndex],
        id,
        name,
        parentId,
        module: mod
      }
    }
  }

  // Shared root accounts — always present in both modules
  ensureAccount('1000', '1000', 'Assets', 'asset', 'debit', null, 'Root Asset Account', 'shared')
  ensureAccount('2000', '2000', 'Liabilities', 'liability', 'credit', null, 'Root Liabilities Account', 'shared')
  ensureAccount('3000', '3000', 'Owner Equity', 'equity', 'credit', null, 'Owner Capital', 'shared')
  ensureAccount('4000', '4000', 'Revenue', 'revenue', 'credit', null, 'Root Revenue Account', 'shared')
  ensureAccount('5000', '5000', 'Expenses', 'expense', 'debit', null, 'Root Expenses Account', 'shared')
  ensureAccount('1120', '1120', 'Bank Accounts', 'asset', 'debit', '1000', 'Bank', 'shared')
  ensureAccount('2100', '2100', 'Accounts Payable', 'liability', 'credit', '2000', 'Accounts Payable', 'shared')
  ensureAccount('3120', '3120', 'Retained Earnings', 'equity', 'credit', '3000', 'Retained Earnings', 'shared')
  ensureAccount('3200', '3200', 'Current Year Earnings', 'equity', 'credit', '3120', 'Current Year Earnings', 'shared')

  if (module === 'investment') {
    // Investment-specific accounts only
    ensureAccount('1110-inv', '1110', 'Cash In Hand', 'asset', 'debit', '1000', 'Cash', 'investment')
    ensureAccount('1200', '1200', 'Investments', 'asset', 'debit', '1000', 'Investment Assets', 'investment')
    ensureAccount('1320', '1320', 'Accounts Receivable', 'asset', 'debit', '1000', 'Accounts Receivable', 'investment')
    ensureAccount('4200', '4200', 'Investment Income', 'revenue', 'credit', '4000', 'Investment Income', 'investment')
    // Investment holdings
    ensureAccount('1210', '1210', 'Gold Holding', 'asset', 'debit', '1200', 'Gold Holding', 'investment')
    ensureAccount('1220', '1220', 'Silver Holding', 'asset', 'debit', '1200', 'Silver Holding', 'investment')
    ensureAccount('1230', '1230', 'Sukuk Holding', 'asset', 'debit', '1200', 'Sukuk Holding', 'investment')
    ensureAccount('1240', '1240', 'Bonds Holding', 'asset', 'debit', '1200', 'Bonds Holding', 'investment')
    ensureAccount('1250', '1250', 'Mutual Funds Holding', 'asset', 'debit', '1200', 'Mutual Funds Holding', 'investment')
    ensureAccount('1260', '1260', 'Stocks & Shares Holding', 'asset', 'debit', '1200', 'Stocks and Shares Holding', 'investment')
    ensureAccount('1280', '1280', 'Private Investment Holding', 'asset', 'debit', '1200', 'Private Investment', 'investment')
    ensureAccount('1290', '1290', 'Fixed Deposit Holding', 'asset', 'debit', '1200', 'Fixed Deposit', 'investment')
    // Investment revenue
    ensureAccount('4110', '4110', 'Dividend Income', 'revenue', 'credit', '4000', 'Dividend Income', 'investment')
    ensureAccount('4130', '4130', 'Capital Gain', 'revenue', 'credit', '4000', 'Capital Gains', 'investment')
    ensureAccount('4140', '4140', 'Interest Income', 'revenue', 'credit', '4000', 'Interest Income', 'investment')
    // Investment expenses
    ensureAccount('5130', '5130', 'Brokerage Fees', 'expense', 'debit', '5000', 'Brokerage Fees', 'investment')
    ensureAccount('5140', '5140', 'Transfer Fees', 'expense', 'debit', '5000', 'Transfer Fees', 'investment')
    ensureAccount('5150', '5150', 'Bank Charges', 'expense', 'debit', '5000', 'Bank Charges', 'investment')
    ensureAccount('5160', '5160', 'Fund Management Charges', 'expense', 'debit', '5000', 'Fund Management Charges', 'investment')
    ensureAccount('5180', '5180', 'Other Expenses', 'expense', 'debit', '5000', 'Other Expenses', 'investment')
    ensureAccount('5210', '5210', 'Purchase Input VAT Expense', 'expense', 'debit', '5000', 'Purchase Input VAT Expense', 'investment')
    ensureAccount('5220', '5220', 'Transportation', 'expense', 'debit', '5000', 'Transportation', 'investment')
    ensureAccount('5230', '5230', 'Insurance', 'expense', 'debit', '5000', 'Insurance', 'investment')
    ensureAccount('5240', '5240', 'Documentation', 'expense', 'debit', '5000', 'Documentation', 'investment')
    ensureAccount('2200-inv', '2200', 'Owner Account', 'liability', 'credit', '2000', 'Investment Owner Account', 'investment')
  } else {
    // Property-specific accounts only
    ensureAccount('1110-prop', '1110', 'Cash In Hand', 'asset', 'debit', '1000', 'Cash', 'property')
    ensureAccount('1270', '1270', 'Real Estate', 'asset', 'debit', '1000', 'Property Assets', 'property')
    ensureAccount('1320', '1320', 'Accounts Receivable', 'asset', 'debit', '1000', 'Accounts Receivable', 'property')
    ensureAccount('1130', '1130', 'Rent Receivable', 'asset', 'debit', '1000', 'Rent Receivable', 'property')
    ensureAccount('1410', '1410', 'Post-dated Cheques Receivable', 'asset', 'debit', '1000', 'PDC Receivables Pool', 'property')
    ensureAccount('2110', '2110', 'Deferred Revenue', 'liability', 'credit', '2000', 'Deferred Revenue', 'property')
    ensureAccount('2120', '2120', 'Security Deposits Held', 'liability', 'credit', '2000', 'Security Deposit Liability', 'property')
    ensureAccount('2200-prop', '2200', 'Owner Account', 'equity', 'credit', '3000', 'Property Owner Account', 'property')
    ensureAccount('4120', '4120', 'Building Rental Income', 'revenue', 'credit', '4000', 'Building Rental Income', 'property')
    ensureAccount('4200', '4200', 'Villa Rental Income', 'revenue', 'credit', '4000', 'Villa Rental Income', 'property')
    ensureAccount('4210', '4210', 'Apartment Rental Income', 'revenue', 'credit', '4000', 'Apartment Rental Income', 'property')
    ensureAccount('5110', '5110', 'Management Fees', 'expense', 'debit', '5000', 'Management Fees', 'property')
    ensureAccount('5120', '5120', 'Maintenance Expense', 'expense', 'debit', '5000', 'Maintenance Expense', 'property')
    ensureAccount('5210', '5210', 'Purchase Input VAT Expense', 'expense', 'debit', '5000', 'Purchase Input VAT Expense', 'property')
    ensureAccount('4160', '4160', 'Damage Recovery Income', 'revenue', 'credit', '4000', 'Security deposit forfeiture & damage recovery income', 'property')
  }

  return updatedAccounts
}
