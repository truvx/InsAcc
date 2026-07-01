import type { Account, Voucher, BankMapping } from './types'
import { getAccountById, getActiveAccounts } from './chartOfAccountsService'
import { calculateBaseTotals } from './voucherService'
import { getActiveVouchers } from './voucherService'

export interface IntegrityIssue {
  severity: 'error' | 'warning' | 'info'
  category: string
  code: string
  message: string
  affectedIds: string[]
}

export function checkAccountIntegrity(accounts: Account[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = []

  for (const account of accounts) {
    if (!account.code) {
      issues.push({
        severity: 'error',
        category: 'account',
        code: 'MISSING_CODE',
        message: `Account "${account.name}" (${account.id}) has no code`,
        affectedIds: [account.id],
      })
    }

    if (!account.type) {
      issues.push({
        severity: 'error',
        category: 'account',
        code: 'MISSING_TYPE',
        message: `Account "${account.name}" (${account.code}) has no type`,
        affectedIds: [account.id],
      })
    }

    if (account.parentId && !getAccountById(account.parentId, accounts)) {
      issues.push({
        severity: 'error',
        category: 'account',
        code: 'ORPHAN_PARENT',
        message: `Account "${account.name}" (${account.code}) references non-existent parent "${account.parentId}"`,
        affectedIds: [account.id],
      })
    }

    if (!account.isActive && accounts.some(a => a.parentId === account.id && a.isActive)) {
      issues.push({
        severity: 'warning',
        category: 'account',
        code: 'INACTIVE_WITH_ACTIVE_CHILDREN',
        message: `Account "${account.name}" (${account.code}) is inactive but has active child accounts`,
        affectedIds: [account.id],
      })
    }
  }

  const codes = new Map<string, string>()
  for (const account of accounts) {
    if (!account.code) continue
    const existing = codes.get(account.code)
    if (existing) {
      issues.push({
        severity: 'error',
        category: 'account',
        code: 'DUPLICATE_CODE',
        message: `Duplicate account code "${account.code}" used by "${account.name}" and "${existing}"`,
        affectedIds: [account.id, accounts.find(a => a.id === existing)?.id ?? ''].filter(Boolean),
      })
    } else {
      codes.set(account.code, account.name)
    }
  }

  return issues
}

export function checkVoucherIntegrity(vouchers: Voucher[], accounts: Account[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = []
  const activeVouchers = getActiveVouchers(vouchers)

  for (const voucher of activeVouchers) {
    const { totalDebit, totalCredit } = calculateBaseTotals(voucher.lines)
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      issues.push({
        severity: 'error',
        category: 'voucher',
        code: 'UNBALANCED',
        message: `Voucher ${voucher.number} (${voucher.id}) is unbalanced: Debit ${totalDebit} vs Credit ${totalCredit}`,
        affectedIds: [voucher.id],
      })
    }

    if (voucher.status === 'Posted' && !voucher.postedAt) {
      issues.push({
        severity: 'warning',
        category: 'voucher',
        code: 'POSTED_NO_TIMESTAMP',
        message: `Voucher ${voucher.number} is Posted but has no posted timestamp`,
        affectedIds: [voucher.id],
      })
    }

    if (voucher.reversalOfVoucherId) {
      const original = vouchers.find(v => v.id === voucher.reversalOfVoucherId)
      if (!original) {
        issues.push({
          severity: 'error',
          category: 'voucher',
          code: 'ORPHAN_REVERSAL',
          message: `Voucher ${voucher.number} reverses non-existent voucher "${voucher.reversalOfVoucherId}"`,
          affectedIds: [voucher.id],
        })
      }
    }

    for (const line of voucher.lines) {
      if (!line.accountId) {
        issues.push({
          severity: 'error',
          category: 'voucher_line',
          code: 'LINE_NO_ACCOUNT',
          message: `Line in voucher ${voucher.number} has no account reference`,
          affectedIds: [voucher.id],
        })
        continue
      }

      const account = getAccountById(line.accountId, accounts)
      if (!account) {
        issues.push({
          severity: 'error',
          category: 'voucher_line',
          code: 'LINE_ORPHAN_ACCOUNT',
          message: `Line in voucher ${voucher.number} references non-existent account "${line.accountId}"`,
          affectedIds: [voucher.id],
        })
      }

      if (account && !account.isActive) {
        issues.push({
          severity: 'warning',
          category: 'voucher_line',
          code: 'LINE_INACTIVE_ACCOUNT',
          message: `Line in voucher ${voucher.number} references inactive account "${account.name}"`,
          affectedIds: [voucher.id],
        })
      }
    }
  }

  return issues
}

export function checkMappingIntegrity(
  bankMappings: BankMapping[],
  accounts: Account[],
): IntegrityIssue[] {
  const issues: IntegrityIssue[] = []

  for (const mapping of bankMappings) {
    const account = getAccountById(mapping.accountId, accounts)
    if (!account) {
      issues.push({
        severity: 'error',
        category: 'mapping',
        code: 'ORPHAN_MAPPING',
        message: `Bank mapping for "${mapping.bankAccountId}" references non-existent account "${mapping.accountId}"`,
        affectedIds: [mapping.bankAccountId],
      })
    }
  }

  return issues
}

export function runFullIntegrityCheck(
  accounts: Account[],
  vouchers: Voucher[],
  bankMappings: BankMapping[],
): IntegrityIssue[] {
  return [
    ...checkAccountIntegrity(accounts),
    ...checkVoucherIntegrity(vouchers, accounts),
    ...checkMappingIntegrity(bankMappings, accounts),
  ]
}

export function getIntegritySummary(issues: IntegrityIssue[]): {
  errors: number
  warnings: number
  info: number
  total: number
} {
  return {
    errors: issues.filter(i => i.severity === 'error').length,
    warnings: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
    total: issues.length,
  }
}
