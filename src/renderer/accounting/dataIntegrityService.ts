import type { Account, Voucher, BankMapping, TrialBalanceEntry } from './types'
import { getAccountById, getActiveAccounts } from './chartOfAccountsService'
import { calculateBaseTotals } from './voucherService'
import { getActiveVouchers } from './voucherService'
import {
  getTrialBalance,
  getTrialBalanceTotals,
  verifyLedgerIntegrity,
  invalidateBalanceCache,
  clearBalanceCache,
} from './ledgerService'

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

export interface ValidationReport {
  vouchersChecked: number
  accountsChecked: number
  allVouchersBalanced: boolean
  ledgerIntegrity: { totalDebit: number; totalCredit: number; balanced: boolean }
  trialBalance: { entries: TrialBalanceEntry[]; totals: { totalDebit: number; totalCredit: number; balanced: boolean } }
  integrityIssues: IntegrityIssue[]
  issuesSummary: { errors: number; warnings: number; info: number; total: number }
  orphanedReferences: { voucherId: string; voucherNumber: string; lineId: string; badAccountId: string }[]
  bankAccountCoAStatus: { mapped: number; orphanedMappings: number; missingAccounts: number }
}

export function generateValidationReport(
  accounts: Account[],
  vouchers: Voucher[],
  bankMappings: BankMapping[],
): ValidationReport {
  clearBalanceCache()

  const activeVouchers = getActiveVouchers(vouchers)
  const issues = runFullIntegrityCheck(accounts, vouchers, bankMappings)

  // Check every posted voucher is balanced
  let allBalanced = true
  for (const v of activeVouchers) {
    const { totalDebit, totalCredit } = calculateBaseTotals(v.lines)
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      allBalanced = false
    }
  }

  // Check for orphaned account references (BankAccount UUID used instead of CoA ID)
  const orphanedReferences: ValidationReport['orphanedReferences'] = []
  const bankCoaIds = new Set(bankMappings.map(m => m.accountId))
  const allAccountIds = new Set(accounts.filter(a => a.isActive).map(a => a.id))

  for (const v of activeVouchers) {
    for (const line of v.lines) {
      if (!allAccountIds.has(line.accountId)) {
        orphanedReferences.push({
          voucherId: v.id,
          voucherNumber: v.number,
          lineId: line.id,
          badAccountId: line.accountId,
        })
      }
    }
  }

  // Bank account CoA status
  const mappedCount = bankMappings.length
  const orphanedMappings = bankMappings.filter(m => !allAccountIds.has(m.accountId)).length
  const missingAccounts = bankMappings.filter(m => {
    const acct = accounts.find(a => a.id === m.accountId)
    return !acct || !acct.isActive
  }).length

  const ledgerIntegrity = verifyLedgerIntegrity(vouchers)
  const tbEntries = getTrialBalance(vouchers, accounts)
  const tbTotals = getTrialBalanceTotals(tbEntries)

  return {
    vouchersChecked: activeVouchers.length,
    accountsChecked: accounts.filter(a => a.isActive).length,
    allVouchersBalanced: allBalanced,
    ledgerIntegrity,
    trialBalance: { entries: tbEntries, totals: tbTotals },
    integrityIssues: issues,
    issuesSummary: getIntegritySummary(issues),
    orphanedReferences,
    bankAccountCoAStatus: {
      mapped: mappedCount,
      orphanedMappings,
      missingAccounts,
    },
  }
}

export function runValidation(
  accounts: Account[],
  vouchers: Voucher[],
  bankMappings: BankMapping[],
): { success: boolean; report: ValidationReport; message: string } {
  const report = generateValidationReport(accounts, vouchers, bankMappings)

  const hasCriticalErrors = report.integrityIssues.some(i => i.severity === 'error')
  const hasOrphanedRefs = report.orphanedReferences.length > 0
  const hasTbIssue = !report.trialBalance.totals.balanced
  const hasLedgerIssue = !report.ledgerIntegrity.balanced

  const success = !hasCriticalErrors && !hasOrphanedRefs && !hasTbIssue && !hasLedgerIssue

  let message = ''
  if (hasCriticalErrors) message += `${report.issuesSummary.errors} integrity error(s) found. `
  if (hasOrphanedRefs) message += `${report.orphanedReferences.length} orphaned account reference(s) found (bank reconciliation adjustments may have wrong account IDs). `
  if (hasTbIssue) message += 'Trial Balance is NOT balanced. '
  if (hasLedgerIssue) message += 'Ledger total debits != total credits. '
  if (success) message = 'All validations passed. Ledger is balanced and consistent.'

  return { success, report, message }
}

export function repairAndRecalculate(
  accounts: Account[],
  vouchers: Voucher[],
  bankMappings: BankMapping[],
): { success: boolean; report: ValidationReport; actions: string[] } {
  const actions: string[] = []

  // 1. Clear and invalidate balance cache
  clearBalanceCache()
  invalidateBalanceCache()
  actions.push('Balance cache cleared and invalidated')

  // 2. Generate validation report
  const report = generateValidationReport(accounts, vouchers, bankMappings)

  // 3. Report findings
  if (report.allVouchersBalanced) {
    actions.push('All posted vouchers are balanced (Total Debit = Total Credit)')
  } else {
    actions.push('WARNING: Found unbalanced vouchers — manual review required')
  }

  if (report.trialBalance.totals.balanced) {
    actions.push(`Trial Balance is balanced: Debits ${report.trialBalance.totals.totalDebit} = Credits ${report.trialBalance.totals.totalCredit}`)
  } else {
    actions.push(`WARNING: Trial Balance is NOT balanced: Debits ${report.trialBalance.totals.totalDebit} vs Credits ${report.trialBalance.totals.totalCredit}`)
  }

  if (report.ledgerIntegrity.balanced) {
    actions.push(`Ledger integrity verified: Total Debits ${report.ledgerIntegrity.totalDebit} = Total Credits ${report.ledgerIntegrity.totalCredit}`)
  }

  if (report.orphanedReferences.length > 0) {
    actions.push(`Found ${report.orphanedReferences.length} voucher line(s) referencing non-existent accounts — these may be from bank reconciliation adjustments with wrong account IDs`)
  }

  if (report.integrityIssues.length === 0) {
    actions.push('No integrity issues found')
  } else {
    actions.push(`Found ${report.issuesSummary.errors} errors, ${report.issuesSummary.warnings} warnings, ${report.issuesSummary.info} info`)
  }

  return {
    success: report.allVouchersBalanced && report.trialBalance.totals.balanced && report.ledgerIntegrity.balanced,
    report,
    actions,
  }
}

export function getBankAccountRepairSummary(
  accounts: Account[],
  vouchers: Voucher[],
  bankMappings: BankMapping[],
): string {
  const report = generateValidationReport(accounts, vouchers, bankMappings)

  const lines: string[] = []
  lines.push('=== Bank Account Posting Repair Summary ===')
  lines.push('')
  lines.push(`Vouchers checked: ${report.vouchersChecked}`)
  lines.push(`Accounts checked: ${report.accountsChecked}`)
  lines.push(`Bank mappings: ${report.bankAccountCoAStatus.mapped}`)
  lines.push(`All vouchers balanced: ${report.allVouchersBalanced ? 'YES' : 'NO'}`)
  lines.push(`Ledger balanced: ${report.ledgerIntegrity.balanced ? `YES (${report.ledgerIntegrity.totalDebit} = ${report.ledgerIntegrity.totalCredit})` : 'NO'}`)
  lines.push(`Trial Balance balanced: ${report.trialBalance.totals.balanced ? `YES (${report.trialBalance.totals.totalDebit} = ${report.trialBalance.totals.totalCredit})` : 'NO'}`)
  lines.push('')
  
  if (report.orphanedReferences.length > 0) {
    lines.push(`WARNING: ${report.orphanedReferences.length} voucher lines reference non-existent accounts:`)
    for (const ref of report.orphanedReferences.slice(0, 10)) {
      lines.push(`  - Voucher ${ref.voucherNumber}: line references "${ref.badAccountId}" which is not in Chart of Accounts`)
    }
    if (report.orphanedReferences.length > 10) {
      lines.push(`  ... and ${report.orphanedReferences.length - 10} more`)
    }
    lines.push('')
  }

  if (report.integrityIssues.length > 0) {
    lines.push(`Integrity issues: ${report.issuesSummary.total} (${report.issuesSummary.errors} errors, ${report.issuesSummary.warnings} warnings)`)
    for (const issue of report.integrityIssues) {
      lines.push(`  [${issue.severity.toUpperCase()}] ${issue.message}`)
    }
  }

  return lines.join('\n')
}
