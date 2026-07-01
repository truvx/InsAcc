import type {
  AccountingEvent,
  Account,
  Voucher,
  CreateVoucherInput,
  LineType,
  PostingResult,
  VoucherEvent,
  VoucherEventType,
  VoucherEventCallback,
} from './types'
import { getRule, resolveRule } from './postingRules'
import { validateNewVoucher, validateExistingVoucher } from './postingValidator'
import { createVoucher, approveVoucher, postVoucher, cancelVoucher as cancelVoucherSvc, reverseVoucher as reverseVoucherSvc, markAsReversed } from './voucherService'
import { invalidateBalanceCache } from './ledgerService'
import { now } from '../../shared/utils/dateUtils'

const emptySuccess: PostingResult = { success: true, errors: [] }

function publishWithInvalidation(type: VoucherEventType, voucher: Voucher, publish: (type: VoucherEventType, voucher: Voucher) => void): void {
  invalidateBalanceCache()
  publish(type, voucher)
}

export function createAccountingEngine() {
  const listeners: VoucherEventCallback[] = []

  function publish(type: VoucherEventType, voucher: Voucher): void {
    const event: VoucherEvent = { type, voucher, timestamp: now() }
    for (const listener of listeners) {
      listener(event)
    }
  }

  function onEvent(callback: VoucherEventCallback): () => void {
    listeners.push(callback)
    return () => {
      const idx = listeners.indexOf(callback)
      if (idx >= 0) listeners.splice(idx, 1)
    }
  }

  function processAccountingEvent(
    event: AccountingEvent,
    context: {
      amount: number
      date: string
      description: string
      currency?: string
      exchangeRate?: number
      baseCurrency?: string
      assetAccount?: string
      bankAccount?: string
      debitAccount?: string
      creditAccount?: string
      referenceType?: string
      referenceId?: string
      createdBy?: string
      periodId?: string
      fiscalYearId?: string
    },
    accounts: Account[],
    existingVouchers: Voucher[],
  ): PostingResult {
    const rule = getRule(event)
    if (!rule) {
      return {
        success: false,
        errors: [{ code: 'RULE_NOT_FOUND', message: `No posting rule for event: ${event}` }],
      }
    }

    const resolved = resolveRule(rule, {
      assetAccount: context.assetAccount,
      bankAccount: context.bankAccount,
      debitAccount: context.debitAccount,
      creditAccount: context.creditAccount,
      amount: context.amount,
      date: context.date,
      description: context.description,
      currency: context.currency ?? 'AED',
      exchangeRate: context.exchangeRate ?? 1,
      baseCurrency: context.baseCurrency ?? 'AED',
      referenceType: context.referenceType as any,
      referenceId: context.referenceId,
      createdBy: context.createdBy,
    })

    const lines: CreateVoucherInput['lines'] = [
      ...resolved.debit.map(d => ({
        accountId: d.accountId,
        type: 'Debit' as LineType,
        amount: context.amount,
        narration: d.narration,
        referenceType: context.referenceType as any,
        referenceId: context.referenceId,
      })),
      ...resolved.credit.map(c => ({
        accountId: c.accountId,
        type: 'Credit' as LineType,
        amount: context.amount,
        narration: c.narration,
        referenceType: context.referenceType as any,
        referenceId: context.referenceId,
      })),
    ]

    const input: CreateVoucherInput = {
      date: context.date,
      type: rule.voucherType,
      description: context.description,
      currency: context.currency,
      exchangeRate: context.exchangeRate,
      baseCurrency: context.baseCurrency,
      createdBy: context.createdBy ?? 'system',
      lines,
    }

    const validation = validateNewVoucher(input, accounts, existingVouchers)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    const voucher = createVoucher(input, existingVouchers)

    const enhancedVoucher: Voucher = {
      ...voucher,
      periodId: context.periodId,
      fiscalYearId: context.fiscalYearId,
    }

    publishWithInvalidation('VOUCHER_CREATED', enhancedVoucher, publish)
    return { success: true, voucher: enhancedVoucher, errors: [] }
  }

  function approve(voucher: Voucher, approvedBy: string): PostingResult {
    if (voucher.status !== 'Draft' && voucher.status !== 'Pending Approval') {
      return {
        success: false,
        errors: [{ code: 'INVALID_STATUS', message: `Cannot approve voucher in status: ${voucher.status}` }],
      }
    }
    const updated = approveVoucher(voucher, approvedBy)
    publishWithInvalidation('VOUCHER_APPROVED', updated, publish)
    return { success: true, voucher: updated, errors: [] }
  }

  function post(voucher: Voucher, postedBy: string, accounts: Account[], allVouchers: Voucher[]): PostingResult {
    if (voucher.status !== 'Approved') {
      return {
        success: false,
        errors: [{ code: 'INVALID_STATUS', message: `Cannot post voucher in status: ${voucher.status}. Must be Approved.` }],
      }
    }

    const validation = validateExistingVoucher(voucher, accounts, allVouchers)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    const updated = postVoucher(voucher, postedBy)
    publishWithInvalidation('VOUCHER_POSTED', updated, publish)
    return { success: true, voucher: updated, errors: [] }
  }

  function cancel(voucher: Voucher): PostingResult {
    if (voucher.status === 'Posted' || voucher.status === 'Reversed') {
      return {
        success: false,
        errors: [{ code: 'INVALID_STATUS', message: `Cannot cancel voucher in status: ${voucher.status}` }],
      }
    }
    const updated = cancelVoucherSvc(voucher)
    publishWithInvalidation('VOUCHER_CANCELLED', updated, publish)
    return { success: true, voucher: updated, errors: [] }
  }

  function reverse(voucher: Voucher, reversalDate: string, createdBy: string, accounts: Account[], allVouchers: Voucher[]): PostingResult {
    if (voucher.status !== 'Posted') {
      return {
        success: false,
        errors: [{ code: 'INVALID_STATUS', message: `Cannot reverse voucher in status: ${voucher.status}. Must be Posted.` }],
      }
    }

    const reversalVoucher = reverseVoucherSvc(voucher, reversalDate, createdBy, allVouchers)

    const reversalValidation = validateNewVoucher(
      {
        date: reversalDate,
        type: 'Journal',
        description: reversalVoucher.description,
        createdBy,
        lines: reversalVoucher.lines.map(l => ({
          accountId: l.accountId,
          type: l.type,
          amount: l.amount,
          narration: l.narration,
        })),
      },
      accounts,
      allVouchers,
    )

    if (!reversalValidation.valid) {
      return { success: false, errors: reversalValidation.errors }
    }

    const updated = markAsReversed(voucher, reversalVoucher.id)
    publishWithInvalidation('VOUCHER_REVERSED', updated, publish)
    publishWithInvalidation('VOUCHER_CREATED', reversalVoucher, publish)

    return { success: true, voucher: reversalVoucher, errors: [] }
  }

  return {
    processAccountingEvent,
    approve,
    post,
    cancel,
    reverse,
    onEvent,
    publish,
  }
}

export type AccountingEngine = ReturnType<typeof createAccountingEngine>
