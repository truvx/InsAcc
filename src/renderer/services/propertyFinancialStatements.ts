import type { Account, Voucher, TrialBalanceEntry } from '../accounting/types'
import {
  getTrialBalance,
  getAccountBalance,
  getAccountBalanceAtDate,
  getAccountTypeBalance,
} from '../accounting/ledgerService'
import { buildAccountTree, getChildren } from '../accounting/chartOfAccountsService'

export interface FinancialStatementRow {
  accountId: string
  accountCode: string
  accountName: string
  depth: number
  balance: number
  isTotal: boolean
  children: FinancialStatementRow[]
}

function buildHierarchy(
  accounts: Account[],
  parentId: string | null,
  depth: number,
  balances: Record<string, number>,
): FinancialStatementRow[] {
  const children = accounts
    .filter(a => a.parentId === parentId && a.isActive)
    .sort((a, b) => a.code.localeCompare(b.code))

  return children.map(account => {
    const childRows = buildHierarchy(accounts, account.id, depth + 1, balances)
    const ownBalance = balances[account.id] ?? 0
    const totalBalance = childRows.length > 0
      ? childRows.reduce((s, r) => s + r.balance, 0)
      : ownBalance

    return {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      depth,
      balance: totalBalance,
      isTotal: childRows.length > 0 || getChildren(account.id, accounts).length > 0,
      children: childRows,
    }
  })
}

export function getStatementBalances(
  accounts: Account[],
  vouchers: Voucher[],
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const account of accounts) {
    if (account.isActive) {
      result[account.id] = Math.round(getAccountBalance(account.id, vouchers, accounts) * 100) / 100
    }
  }
  return result
}

export function getStatementBalancesAtDate(
  accounts: Account[],
  vouchers: Voucher[],
  date: string,
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const account of accounts) {
    if (account.isActive) {
      result[account.id] = Math.round(getAccountBalanceAtDate(account.id, vouchers, accounts, date) * 100) / 100
    }
  }
  return result
}
export function getBalanceSheetTree(
  accounts: Account[],
  vouchers: Voucher[],
): FinancialStatementRow[] {
  const balances = getStatementBalances(accounts, vouchers)
  const tree = buildAccountTree(accounts)
  const roots = tree.filter(n => n.account.isActive)

  const plTree = getProfitLossTree(accounts, vouchers)
  const revenueTree = plTree.find(r => r.accountCode === '4000')
  const expenseTree = plTree.find(r => r.accountCode === '5000')
  const totalRevenue = revenueTree ? revenueTree.balance : 0
  const totalExpenses = expenseTree ? expenseTree.balance : 0
  const netProfit = totalRevenue - totalExpenses

  return roots.map(root => {
    const childRows = buildHierarchy(accounts, root.account.id, 1, balances).filter(r => r.accountCode !== '3200')

    if (root.account.type === 'equity' && netProfit !== 0) {
      childRows.push({
        accountId: '__currentYearEarnings__',
        accountCode: 'CYE',
        accountName: 'Current Year Earnings',
        depth: 1,
        balance: Math.round(netProfit * 100) / 100,
        isTotal: false,
        children: [],
      })
    }

    const totalBalance = childRows.reduce((s, r) => s + r.balance, 0)

    return {
      accountId: root.account.id,
      accountCode: root.account.code,
      accountName: root.account.name,
      depth: 0,
      balance: totalBalance,
      isTotal: true,
      children: childRows,
    }
  })
}

export function getProfitLossTree(
  accounts: Account[],
  vouchers: Voucher[],
): FinancialStatementRow[] {
  const balances = getStatementBalances(accounts, vouchers)
  const tree = buildAccountTree(accounts)

  const revRoot = tree.find(n => n.account.type === 'revenue' && !n.account.parentId)
  const expRoot = tree.find(n => n.account.type === 'expense' && !n.account.parentId)

  const rows: FinancialStatementRow[] = []

  if (revRoot) {
    const childRows = buildHierarchy(accounts, revRoot.account.id, 1, balances)
    const totalBalance = childRows.reduce((s, r) => s + r.balance, 0)
    rows.push({
      accountId: revRoot.account.id,
      accountCode: revRoot.account.code,
      accountName: revRoot.account.name,
      depth: 0,
      balance: totalBalance,
      isTotal: true,
      children: childRows,
    })
  }

  if (expRoot) {
    const childRows = buildHierarchy(accounts, expRoot.account.id, 1, balances)
    const totalBalance = childRows.reduce((s, r) => s + r.balance, 0)
    rows.push({
      accountId: expRoot.account.id,
      accountCode: expRoot.account.code,
      accountName: expRoot.account.name,
      depth: 0,
      balance: totalBalance,
      isTotal: true,
      children: childRows,
    })
  }

  return rows
}

export function getTrialBalanceRows(
  accounts: Account[],
  vouchers: Voucher[],
): TrialBalanceEntry[] {
  return getTrialBalance(vouchers, accounts)
}

export function flattenStatementRows(
  rows: FinancialStatementRow[],
): Array<{ accountId: string; accountCode: string; accountName: string; depth: number; balance: number; isTotal: boolean }> {
  const result: Array<{ accountId: string; accountCode: string; accountName: string; depth: number; balance: number; isTotal: boolean }> = []
  for (const row of rows) {
    result.push({
      accountId: row.accountId,
      accountCode: row.accountCode,
      accountName: row.accountName,
      depth: row.depth,
      balance: row.balance,
      isTotal: row.isTotal,
    })
    result.push(...flattenStatementRows(row.children))
  }
  return result
}
