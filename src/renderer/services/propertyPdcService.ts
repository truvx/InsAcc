import type { PdcCheque, LeaseEntry } from '../data/propertyTypes'
import { getPaymentFrequencyCount } from '../data/propertyTypes'

let _counter = 0

function generateId(): string {
  _counter++
  const ts = Date.now().toString(36)
  return `pdc-${ts}-${_counter}`
}

export function generateChequeNumber(leaseNumber: string, slotIndex: number): string {
  return `${leaseNumber}-CHQ-${String(slotIndex + 1).padStart(3, '0')}`
}

export function generatePdcSlots(lease: LeaseEntry, startMonth: number, startYear: number, pdcStartDay: number = 1): PdcCheque[] {
  const slots: PdcCheque[] = []
  const count = lease.pdcCount || getPaymentFrequencyCount(lease.paymentFrequency)

  const s = new Date(lease.startDate + 'T00:00:00')
  const e = new Date(lease.endDate + 'T00:00:00')
  const rawMonths = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
  const leaseMonths = e.getDate() >= s.getDate() ? rawMonths + 1 : rawMonths

  const totalRent = lease.annualRent || (lease.monthlyRent * leaseMonths)
  const standardAmount = Math.round((totalRent / count) * 100) / 100
  const lastChequeAmount = Math.round((totalRent - (standardAmount * (count - 1))) * 100) / 100
  console.log('[PDC AMOUNT TRACE] generatePdcSlots |', JSON.stringify({ startDate: lease.startDate, endDate: lease.endDate, monthlyRent: lease.monthlyRent, annualRent: lease.annualRent, startMonth, startYear, pdcStartDay, count, rawMonths, leaseMonths, totalRent, standardAmount, lastChequeAmount }))
  const now = new Date().toISOString()
  const day = pdcStartDay

  const formatDateLocal = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const getChequeDateForIndex = (idx: number) => {
    const monthOffset = Math.floor(idx * leaseMonths / count)
    const dueMonth = ((startMonth - 1 + monthOffset) % 12) + 1
    const dueYear = startYear + Math.floor((startMonth - 1 + monthOffset) / 12)
    const maxDays = new Date(dueYear, dueMonth, 0).getDate()
    const targetDay = Math.min(day, maxDays)
    return new Date(dueYear, dueMonth - 1, targetDay)
  }

  for (let i = 0; i < count; i++) {
    const currentChequeDate = getChequeDateForIndex(i)
    const nextChequeDate = getChequeDateForIndex(i + 1)
    
    const chequeDateStr = formatDateLocal(currentChequeDate)
    const dueDateStr = chequeDateStr

    const amount = i === count - 1 ? lastChequeAmount : standardAmount

    slots.push({
      id: generateId(),
      leaseId: lease.id,
      slotIndex: i,
      chequeNumber: generateChequeNumber(lease.leaseNumber, i),
      chequeDate: chequeDateStr,
      dueDate: dueDateStr,
      amount: amount,
      status: 'Pending',
      depositedAt: null,
      clearedAt: null,
      bouncedAt: null,
      replacedByChequeId: null,
      voucherId: null,
      createdBy: 'system',
      createdAt: now,
      updatedAt: now,
    })
  }

  return slots
}

export function validatePdcTransition(from: PdcCheque['status'], to: PdcCheque['status']): boolean {
  if (from === to) return true
  switch (from) {
    case 'Pending':
      return to === 'Deposited' || to === 'Cleared' || to === 'Cancelled' || to === 'Replaced' || to === 'Bounced'
    case 'Deposited':
      return to === 'Cleared' || to === 'Bounced' || to === 'Cancelled' || to === 'Replaced'
    case 'Cleared':
      return to === 'Bounced'
    case 'Bounced':
      return to === 'Deposited' || to === 'Cancelled' || to === 'Replaced'
    default:
      return false
  }
}

export function transitionPdcCheque(
  cheques: PdcCheque[],
  chequeId: string,
  newStatus: PdcCheque['status'],
  params: {
    bankAccountId?: string | null
    bounceReason?: string | null
    bounceFee?: number | null
    penaltyAmount?: number | null
    user?: string
    timestamp?: string
    depositedVoucherId?: string | null
    clearedVoucherId?: string | null
    bouncedVoucherId?: string | null
    feeVoucherId?: string | null
    penaltyVoucherId?: string | null
    clearedVia?: 'Cash' | 'Cheque' | 'Bank Transfer' | null
  } = {}
): PdcCheque[] {
  const now = params.timestamp || new Date().toISOString()
  const user = params.user || 'system'

  return cheques.map(chq => {
    if (chq.id !== chequeId) return chq

    if (!validatePdcTransition(chq.status, newStatus)) {
      throw new Error(`Invalid PDC transition from ${chq.status} to ${newStatus}`)
    }

    const previousStatus = chq.status
    const auditEntry = {
      timestamp: now,
      previousState: previousStatus,
      newState: newStatus,
      user,
      reason: params.bounceReason || undefined,
      voucherId: params.clearedVoucherId || params.bouncedVoucherId || null
    }

    const updatedHistory = [...(chq.auditHistory || []), auditEntry]

    const update: Partial<PdcCheque> = {
      status: newStatus,
      updatedAt: now,
      auditHistory: updatedHistory,
      bankAccountId: params.bankAccountId !== undefined ? params.bankAccountId : chq.bankAccountId,
      bounceReason: params.bounceReason !== undefined ? params.bounceReason : chq.bounceReason,
      bounceFee: params.bounceFee !== undefined ? params.bounceFee : chq.bounceFee,
      penaltyAmount: params.penaltyAmount !== undefined ? params.penaltyAmount : chq.penaltyAmount,
      depositedVoucherId: params.depositedVoucherId !== undefined ? params.depositedVoucherId : chq.depositedVoucherId,
      clearedVoucherId: params.clearedVoucherId !== undefined ? params.clearedVoucherId : chq.clearedVoucherId,
      bouncedVoucherId: params.bouncedVoucherId !== undefined ? params.bouncedVoucherId : chq.bouncedVoucherId,
      feeVoucherId: params.feeVoucherId !== undefined ? params.feeVoucherId : chq.feeVoucherId,
      penaltyVoucherId: params.penaltyVoucherId !== undefined ? params.penaltyVoucherId : chq.penaltyVoucherId,
      clearedVia: params.clearedVia !== undefined ? params.clearedVia : chq.clearedVia,
    }

    if (newStatus === 'Deposited') update.depositedAt = now
    if (newStatus === 'Cleared') update.clearedAt = now
    if (newStatus === 'Bounced') update.bouncedAt = now

    return { ...chq, ...update }
  })
}

export function updatePdcStatus(
  cheques: PdcCheque[],
  chequeId: string,
  status: PdcCheque['status'],
): PdcCheque[] {
  try {
    return transitionPdcCheque(cheques, chequeId, status)
  } catch (e) {
    console.error(e)
    return cheques
  }
}

export function replaceCheque(
  cheques: PdcCheque[],
  oldChequeId: string,
  newChequeNumber: string,
  newChequeDate: string,
): PdcCheque[] {
  const oldCheque = cheques.find(c => c.id === oldChequeId)
  if (!oldCheque) return cheques

  const now = new Date().toISOString()
  const replacement: PdcCheque = {
    ...oldCheque,
    id: generateId(),
    chequeNumber: newChequeNumber,
    chequeDate: newChequeDate,
    status: 'Pending',
    replacedByChequeId: null,
    voucherId: null,
    depositedAt: null,
    clearedAt: null,
    bouncedAt: null,
    createdAt: now,
    updatedAt: now,
  }

  return [
    ...cheques.map(chq =>
      chq.id === oldChequeId
        ? { ...chq, status: 'Replaced' as const, replacedByChequeId: replacement.id, updatedAt: now }
        : chq,
    ),
    replacement,
  ]
}

export function getChequesByLease(cheques: PdcCheque[], leaseId: string): PdcCheque[] {
  return cheques.filter(c => c.leaseId === leaseId).sort((a, b) => a.slotIndex - b.slotIndex)
}

export function getPendingCheques(cheques: PdcCheque[]): PdcCheque[] {
  return cheques.filter(c => c.status === 'Pending')
}

export function getDepositableCheques(cheques: PdcCheque[]): PdcCheque[] {
  const now = new Date()
  return cheques.filter(c => {
    if (c.status !== 'Pending') return false
    const dueDate = new Date(c.dueDate)
    return dueDate <= now
  })
}

export function isCurrentMonthCheque(cheque: PdcCheque): boolean {
  const now = new Date()
  const chequeDate = new Date(cheque.dueDate)
  return (
    chequeDate.getMonth() === now.getMonth() &&
    chequeDate.getFullYear() === now.getFullYear()
  )
}
