import type {
  Voucher,
  VoucherLine,
  CreateVoucherInput,
  Account,
  ValidationResult,
  ValidationError,
} from './types'
import { getAccountById } from './chartOfAccountsService'
import { calculateBaseTotals, hasMinimumLines, generateVoucherNumber } from './voucherService'

const VOUCHER_NUMBER_PATTERN = /^(PV|RV|JV|CV|PUR)-\d{4}-\d{3,6}$/

function err(code: string, message: string, field?: string): ValidationError {
  return { code, message, field }
}

export function validateRequired(input: CreateVoucherInput): ValidationError[] {
  const errors: ValidationError[] = []

  if (!input.date) {
    errors.push(err('DATE_REQUIRED', 'Voucher date is required', 'date'))
  } else {
    const d = new Date(input.date)
    if (isNaN(d.getTime())) {
      errors.push(err('INVALID_DATE', 'Voucher date is not valid', 'date'))
    }
  }

  if (!input.type) {
    errors.push(err('TYPE_REQUIRED', 'Voucher type is required', 'type'))
  } else if (!['Payment', 'Receipt', 'Journal'].includes(input.type)) {
    errors.push(err('INVALID_TYPE', 'Voucher type must be Payment, Receipt, or Journal', 'type'))
  }

  if (!input.description || !input.description.trim()) {
    errors.push(err('DESCRIPTION_REQUIRED', 'Voucher description is required', 'description'))
  }

  if (!input.createdBy || !input.createdBy.trim()) {
    errors.push(err('CREATED_BY_REQUIRED', 'Created by is required', 'createdBy'))
  }

  return errors
}

export function validateCurrency(input: CreateVoucherInput): ValidationError[] {
  const errors: ValidationError[] = []

  if (input.currency && input.currency.length === 0) {
    errors.push(err('CURRENCY_REQUIRED', 'Currency must not be empty', 'currency'))
  }

  if (input.exchangeRate !== undefined && input.exchangeRate <= 0) {
    errors.push(err('EXCHANGE_RATE_INVALID', 'Exchange rate must be greater than 0', 'exchangeRate'))
  }

  if (input.baseCurrency && input.baseCurrency.length === 0) {
    errors.push(err('BASE_CURRENCY_REQUIRED', 'Base currency must not be empty', 'baseCurrency'))
  }

  if (input.currency && input.baseCurrency && input.exchangeRate === undefined && input.currency !== input.baseCurrency) {
    errors.push(err('EXCHANGE_RATE_REQUIRED', 'Exchange rate is required when currencies differ', 'exchangeRate'))
  }

  return errors
}

export function validateLines(
  lines: Array<{ accountId: string; type: string; amount: number }>,
  accounts: Account[],
): ValidationError[] {
  const errors: ValidationError[] = []

  if (!hasMinimumLines(lines as VoucherLine[])) {
    errors.push(err('MIN_LINES', 'Voucher must have at least 2 lines', 'lines'))
    return errors
  }

  if (lines.length > 100) {
    errors.push(err('MAX_LINES', 'Voucher cannot exceed 100 lines', 'lines'))
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (!line.accountId) {
      errors.push(err('ACCOUNT_REQUIRED', `Line ${i + 1}: Account is required`, `lines[${i}].accountId`))
      continue
    }

    const account = getAccountById(line.accountId, accounts)
    if (!account) {
      errors.push(err('ACCOUNT_NOT_FOUND', `Line ${i + 1}: Account "${line.accountId}" not found`, `lines[${i}].accountId`))
    } else if (!account.isActive) {
      errors.push(err('ACCOUNT_INACTIVE', `Line ${i + 1}: Account "${account.name}" is inactive`, `lines[${i}].accountId`))
    } else {
      const isParent = accounts.some(child => child.parentId === account.id && child.isActive)
      if (isParent) {
        errors.push(err('PARENT_ACCOUNT_POSTING', `Line ${i + 1}: Account "${account.name}" is a parent account and cannot receive direct postings`, `lines[${i}].accountId`))
      }
    }

    if (!line.type || !['Debit', 'Credit'].includes(line.type)) {
      errors.push(err('LINE_TYPE_INVALID', `Line ${i + 1}: Type must be Debit or Credit`, `lines[${i}].type`))
    }

    if (line.amount === undefined || line.amount === null) {
      errors.push(err('AMOUNT_REQUIRED', `Line ${i + 1}: Amount is required`, `lines[${i}].amount`))
    } else if (line.amount <= 0) {
      errors.push(err('AMOUNT_POSITIVE', `Line ${i + 1}: Amount must be greater than zero`, `lines[${i}].amount`))
    } else if (!Number.isFinite(line.amount)) {
      errors.push(err('AMOUNT_INVALID', `Line ${i + 1}: Amount must be a finite number`, `lines[${i}].amount`))
    }
  }

  return errors
}

export function validateBalance(lines: Array<{ type: string; amount: number; baseAmount?: number }>): ValidationError | null {
  const asLines = lines as VoucherLine[]
  const { totalDebit, totalCredit } = calculateBaseTotals(asLines)
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    return err(
      'BALANCE_MISMATCH',
      `Debit (${totalDebit}) does not equal Credit (${totalCredit})`,
      'lines',
    )
  }
  return null
}

export function validateVoucherNumber(
  number: string,
  existingVouchers: Voucher[],
): ValidationError | null {
  if (!number) {
    return err('NUMBER_REQUIRED', 'Voucher number is required', 'number')
  }

  if (!VOUCHER_NUMBER_PATTERN.test(number)) {
    return err(
      'NUMBER_FORMAT_INVALID',
      'Voucher number must be in format PV/RV/JV/PUR-YEAR-000001',
      'number',
    )
  }

  if (existingVouchers.some(v => v.number === number)) {
    return err('NUMBER_DUPLICATE', `Voucher number "${number}" already exists`, 'number')
  }

  return null
}

export function validateReferences(
  lines: Array<{ referenceType?: string; referenceId?: string }>,
): ValidationError[] {
  const errors: ValidationError[] = []
  const VALID_TYPES = [
    'Investment', 'Purchase', 'Property', 'Tenant',
    'Lease', 'Maintenance', 'Bank', 'Document',
  ]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.referenceType && !VALID_TYPES.includes(line.referenceType)) {
      errors.push(
        err('INVALID_REF_TYPE', `Line ${i + 1}: Invalid reference type "${line.referenceType}"`, `lines[${i}].referenceType`),
      )
    }

    if (line.referenceType && !line.referenceId) {
      errors.push(
        err('REF_ID_REQUIRED', `Line ${i + 1}: Reference ID is required when reference type is set`, `lines[${i}].referenceId`),
      )
    }
  }

  return errors
}

export function validateAccountTypeForLine(
  account: Account,
  lineType: string,
): ValidationError | null {
  if (lineType === 'Debit' && account.normalBalance === 'credit' && account.type === 'liability') {
    return null
  }
  if (lineType === 'Credit' && account.normalBalance === 'debit' && account.type === 'asset') {
    return null
  }
  return null
}

export function validateNegativeBalance(
  accountId: string,
  amount: number,
  lineType: string,
  accounts: Account[],
): ValidationError | null {
  const account = getAccountById(accountId, accounts)
  if (!account) return null
  if (account.type === 'asset' && lineType === 'Credit' && account.normalBalance === 'debit') {
    return null
  }
  return null
}

export function validateDateRange(date: string): ValidationError | null {
  if (!date) return null
  const d = new Date(date)
  if (isNaN(d.getTime())) return null
  const year = d.getFullYear()
  if (year < 1900 || year > 2100) {
    return {
      code: 'DATE_OUT_OF_RANGE',
      field: 'date',
      message: 'Voucher date year must be between 1900 and 2100',
    }
  }
  const future = new Date()
  future.setFullYear(future.getFullYear() + 1)
  if (d > future) {
    return {
      code: 'DATE_TOO_FAR_IN_FUTURE',
      field: 'date',
      message: 'Voucher date cannot be more than 1 year in the future',
    }
  }
  return null
}

export function validateReferencesExist(
  voucher: Voucher,
  allVouchers: Voucher[],
  accounts: Account[],
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const line of voucher.lines) {
    if (line.referenceType && line.referenceId) {
      if (line.referenceType === 'Bank') {
        const refVoucher = allVouchers.find(v => v.id === line.referenceId)
        if (!refVoucher) {
          errors.push({
            code: 'REFERENCE_NOT_FOUND',
            field: `lines[${voucher.lines.indexOf(line)}].referenceId`,
            message: `Referenced voucher "${line.referenceId}" not found`,
          })
        }
      }
    }
  }

  return errors
}

export function validateNewVoucher(
  input: CreateVoucherInput,
  accounts: Account[],
  existingVouchers: Voucher[],
): ValidationResult {
  const errors: ValidationError[] = [
    ...validateRequired(input),
    ...validateCurrency(input),
    ...validateLines(input.lines, accounts),
    ...validateReferences(input.lines),
  ]

  const dateErr = validateDateRange(input.date)
  if (dateErr) errors.push(dateErr)

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  const balanceErr = validateBalance(input.lines)
  if (balanceErr) {
    return { valid: false, errors: [...errors, balanceErr] }
  }

  return { valid: true, errors: [] }
}

export function validateExistingVoucher(
  voucher: Voucher,
  accounts: Account[],
  existingVouchers: Voucher[],
): ValidationResult {
  const errors: ValidationError[] = []

  if (voucher.status === 'Posted') {
    errors.push({
      code: 'VOUCHER_POSTED',
      field: 'status',
      message: 'Cannot modify a posted voucher',
    })
    return { valid: false, errors }
  }

  errors.push(
    ...validateRequired({
      date: voucher.date,
      type: voucher.type,
      reference: voucher.reference,
      description: voucher.description,
      createdBy: voucher.createdBy,
      lines: voucher.lines.map(l => ({
        accountId: l.accountId,
        type: l.type,
        amount: l.amount,
        currency: l.currency,
        narration: l.narration,
        referenceType: l.referenceType,
        referenceId: l.referenceId,
      })),
      currency: voucher.currency,
      exchangeRate: voucher.exchangeRate,
      baseCurrency: voucher.baseCurrency,
    }),
    ...validateCurrency({
      date: voucher.date,
      type: voucher.type,
      description: voucher.description,
      createdBy: voucher.createdBy,
      lines: [],
      currency: voucher.currency,
      exchangeRate: voucher.exchangeRate,
      baseCurrency: voucher.baseCurrency,
    }),
    ...validateLines(voucher.lines, accounts),
    ...validateReferences(voucher.lines),
  )

  const numErr = validateVoucherNumber(voucher.number, existingVouchers.filter(v => v.id !== voucher.id))
  if (numErr) {
    errors.push(numErr)
  }

  const refsErr = validateReferencesExist(voucher, existingVouchers, accounts)
  errors.push(...refsErr)

  const dateErr = validateDateRange(voucher.date)
  if (dateErr) errors.push(dateErr)

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  const balanceErr = validateBalance(voucher.lines)
  if (balanceErr) {
    return { valid: false, errors: [...errors, balanceErr] }
  }

  return { valid: true, errors: [] }
}
