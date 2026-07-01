import type {
  Voucher,
  VoucherLine,
  VoucherType,
  VoucherStatus,
  LineType,
  CreateVoucherInput,
} from './types'
import { now } from '../../shared/utils/dateUtils'

let _idCounter = 0

function generateId(): string {
  _idCounter++
  const ts = Date.now().toString(36)
  const seq = _idCounter.toString(36).padStart(4, '0')
  return `v-${ts}-${seq}`
}

function generateLineId(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 6)
  return `l-${ts}-${rand}`
}

export function generateVoucherNumber(type: VoucherType, year: number, sequence: number): string {
  const prefix = type === 'Payment' ? 'PV' : type === 'Receipt' ? 'RV' : type === 'Contra' ? 'CV' : 'JV'
  return `${prefix}-${year}-${String(sequence).padStart(6, '0')}`
}

export function getNextSequence(vouchers: Voucher[], type: VoucherType, year: number): number {
  const prefix = type === 'Payment' ? 'PV' : type === 'Receipt' ? 'RV' : type === 'Contra' ? 'CV' : 'JV'
  const pattern = `${prefix}-${year}-`
  const maxSeq = vouchers.reduce((max, v) => {
    if (!v.number.startsWith(pattern)) return max
    const seq = parseInt(v.number.slice(pattern.length), 10)
    return isNaN(seq) ? max : Math.max(max, seq)
  }, 0)
  return maxSeq + 1
}

function isPostedStatus(status: VoucherStatus): boolean {
  return status === 'Posted' || status === 'Approved'
}

function calculateBaseAmount(amount: number, exchangeRate: number): number {
  return Math.round(amount * exchangeRate * 100) / 100
}

export function createVoucher(input: CreateVoucherInput, existingVouchers: Voucher[]): Voucher {
  const baseCurrency = input.baseCurrency ?? 'AED'
  const exchangeRate = input.exchangeRate ?? 1
  const lineCurrency = input.currency ?? baseCurrency
  const n = now()
  const year = new Date(input.date).getFullYear()
  const sequence = getNextSequence(existingVouchers, input.type, year)
  const id = generateId()

  const lines: VoucherLine[] = input.lines.map(l => ({
    id: generateLineId(),
    accountId: l.accountId,
    type: l.type,
    amount: l.amount,
    baseAmount: calculateBaseAmount(
      l.currency && l.currency !== baseCurrency ? l.amount : l.amount,
      l.currency && l.currency !== baseCurrency ? (input.exchangeRate ?? 1) : 1,
    ),
    currency: l.currency ?? lineCurrency,
    narration: l.narration,
    referenceType: l.referenceType,
    referenceId: l.referenceId,
  }))

  return {
    id,
    number: generateVoucherNumber(input.type, year, sequence),
    date: input.date,
    type: input.type,
    reference: input.reference ?? '',
    description: input.description,
    status: 'Draft',
    currency: lineCurrency,
    exchangeRate,
    baseCurrency,
    createdBy: input.createdBy,
    createdAt: n,
    updatedAt: n,
    lines,
  }
}

export function calculateTotals(lines: VoucherLine[]): {
  totalDebit: number
  totalCredit: number
  lineCount: number
} {
  let totalDebit = 0
  let totalCredit = 0
  for (const line of lines) {
    if (line.type === 'Debit') {
      totalDebit += line.amount
    } else {
      totalCredit += line.amount
    }
  }
  return {
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    lineCount: lines.length,
  }
}

export function calculateBaseTotals(lines: VoucherLine[]): {
  totalDebit: number
  totalCredit: number
} {
  let totalDebit = 0
  let totalCredit = 0
  for (const line of lines) {
    if (line.type === 'Debit') {
      totalDebit += line.baseAmount
    } else {
      totalCredit += line.baseAmount
    }
  }
  return {
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
  }
}

export function isBalanced(lines: VoucherLine[]): boolean {
  const { totalDebit, totalCredit } = calculateBaseTotals(lines)
  return Math.abs(totalDebit - totalCredit) < 0.001
}

export function hasMinimumLines(lines: VoucherLine[]): boolean {
  return lines.length >= 2
}

export function setStatus(voucher: Voucher, status: VoucherStatus): Voucher {
  return { ...voucher, status, updatedAt: now() }
}

export function approveVoucher(voucher: Voucher, approvedBy: string): Voucher {
  return {
    ...setStatus(voucher, 'Approved'),
    approvedBy,
    approvedAt: now(),
  }
}

export function postVoucher(voucher: Voucher, postedBy: string): Voucher {
  return {
    ...setStatus(voucher, 'Posted'),
    postedBy,
    postedAt: now(),
  }
}

export function cancelVoucher(voucher: Voucher): Voucher {
  return setStatus(voucher, 'Cancelled')
}

export function reverseVoucher(
  voucher: Voucher,
  reversalDate: string,
  createdBy: string,
  existingVouchers: Voucher[],
): Voucher {
  const reversedLines: CreateVoucherInput['lines'] = voucher.lines.map(l => ({
    accountId: l.accountId,
    type: l.type === 'Debit' ? 'Credit' as LineType : 'Debit' as LineType,
    amount: l.amount,
    currency: l.currency,
    narration: `Reversal of ${voucher.number}: ${l.narration ?? voucher.description}`,
    referenceType: l.referenceType,
    referenceId: l.referenceId,
  }))

  const reversal = createVoucher(
    {
      date: reversalDate,
      type: 'Journal',
      reference: `Reversal of ${voucher.number}`,
      description: `Reversal of voucher ${voucher.number}: ${voucher.description}`,
      currency: voucher.currency,
      exchangeRate: voucher.exchangeRate,
      baseCurrency: voucher.baseCurrency,
      createdBy,
      lines: reversedLines,
    },
    existingVouchers,
  )

  return {
    ...reversal,
    reversalOfVoucherId: voucher.id,
    periodId: voucher.periodId,
    fiscalYearId: voucher.fiscalYearId,
  }
}

export function markAsReversed(voucher: Voucher, reversalVoucherId: string): Voucher {
  return {
    ...voucher,
    status: 'Reversed',
    reversedVoucherId: reversalVoucherId,
    updatedAt: now(),
  }
}

export function updateVoucherLines(
  voucher: Voucher,
  lines: VoucherLine[],
): Voucher {
  return {
    ...voucher,
    lines,
    updatedAt: now(),
  }
}

export function isVoucherPosted(v: Voucher): boolean {
  return isPostedStatus(v.status)
}

export function isVoucherActive(v: Voucher): boolean {
  return v.status !== 'Cancelled' && v.status !== 'Reversed'
}

export function getPostedVouchers(vouchers: Voucher[]): Voucher[] {
  return vouchers.filter(isVoucherPosted)
}

export function getActiveVouchers(vouchers: Voucher[]): Voucher[] {
  return vouchers.filter(v => isVoucherActive(v) && isVoucherPosted(v))
}
