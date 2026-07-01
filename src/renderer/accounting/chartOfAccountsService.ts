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
    id: `acc-${code}`,
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
