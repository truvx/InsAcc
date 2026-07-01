import type { FiscalYear, PeriodLock, Voucher } from './types'
import { now } from '../../shared/utils/dateUtils'

function generateId(): string {
  return `period-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export function createFiscalYear(
  name: string,
  startDate: string,
  endDate: string,
  isDefault: boolean = false,
  existingYears: FiscalYear[],
): FiscalYear {
  return {
    id: generateId(),
    name,
    startDate,
    endDate,
    isClosed: false,
    isDefault,
    createdAt: now(),
  }
}

export function getCurrentFiscalYear(fiscalYears: FiscalYear[]): FiscalYear | undefined {
  const nowDate = new Date()
  const nowStr = nowDate.toISOString().split('T')[0]
  return fiscalYears.find(
    fy => fy.startDate <= nowStr && fy.endDate >= nowStr && !fy.isClosed,
  )
}

export function getDefaultFiscalYear(fiscalYears: FiscalYear[]): FiscalYear | undefined {
  return fiscalYears.find(fy => fy.isDefault && !fy.isClosed)
}

export function closeFiscalYear(
  fiscalYear: FiscalYear,
  fiscalYears: FiscalYear[],
): FiscalYear[] {
  return fiscalYears.map(fy =>
    fy.id === fiscalYear.id ? { ...fy, isClosed: true } : fy,
  )
}

export function getFiscalYearForDate(
  date: string,
  fiscalYears: FiscalYear[],
): FiscalYear | undefined {
  return fiscalYears.find(
    fy => fy.startDate <= date && fy.endDate >= date,
  )
}

export function periodKeyFromDate(date: string): string {
  return date.substring(0, 7)
}

export function getPeriodKey(voucher: Voucher): string {
  return periodKeyFromDate(voucher.date)
}

export function getLockedPeriods(periodLocks: PeriodLock[]): PeriodLock[] {
  return periodLocks.filter(p => p.locked)
}

export function isPeriodLocked(
  periodKey: string,
  periodLocks: PeriodLock[],
): boolean {
  return periodLocks.some(p => p.periodKey === periodKey && p.locked)
}

export function lockPeriod(
  periodKey: string,
  fiscalYearId: string,
  lockedBy: string,
  periodLocks: PeriodLock[],
): PeriodLock[] {
  const existing = periodLocks.find(p => p.periodKey === periodKey)
  if (existing) {
    return periodLocks.map(p =>
      p.periodKey === periodKey
        ? { ...p, locked: true, lockedAt: now(), lockedBy }
        : p,
    )
  }
  return [
    ...periodLocks,
    {
      id: generateId(),
      periodKey,
      locked: true,
      lockedAt: now(),
      lockedBy,
      fiscalYearId,
    },
  ]
}

export function unlockPeriod(
  periodKey: string,
  periodLocks: PeriodLock[],
): PeriodLock[] {
  return periodLocks.map(p =>
    p.periodKey === periodKey ? { ...p, locked: false } : p,
  )
}

export function validatePeriodNotLocked(
  voucherDate: string,
  periodLocks: PeriodLock[],
): { valid: boolean; message?: string } {
  const pk = periodKeyFromDate(voucherDate)
  if (isPeriodLocked(pk, periodLocks)) {
    return {
      valid: false,
      message: `Period ${pk} is locked. Cannot post vouchers in a locked period.`,
    }
  }
  return { valid: true }
}

export function getDefaultFiscalYears(): FiscalYear[] {
  const currentYear = new Date().getFullYear()
  return [
    {
      id: 'fy-default',
      name: `FY ${currentYear}`,
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-12-31`,
      isClosed: false,
      isDefault: true,
      createdAt: now(),
    },
  ]
}
