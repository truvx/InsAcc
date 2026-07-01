import type { PdcCheque, LeaseEntry } from '../data/propertyTypes'

let _counter = 0

function generateId(): string {
  _counter++
  const ts = Date.now().toString(36)
  return `pdc-${ts}-${_counter}`
}

export function generateChequeNumber(leaseNumber: string, slotIndex: number): string {
  return `${leaseNumber}-CHQ-${String(slotIndex + 1).padStart(3, '0')}`
}

export function generatePdcSlots(lease: LeaseEntry, startMonth: number, startYear: number): PdcCheque[] {
  const slots: PdcCheque[] = []
  const count = lease.pdcCount || lease.paymentFrequency || 12
  const monthlyAmount = Math.round((lease.annualRent || lease.monthlyRent * 12) / count * 100) / 100
  const now = new Date().toISOString()

  for (let i = 0; i < count; i++) {
    const monthOffset = Math.floor(i * 12 / count)
    const dueMonth = ((startMonth - 1 + monthOffset) % 12) + 1
    const dueYear = startYear + Math.floor((startMonth - 1 + monthOffset) / 12)
    const dueDateStr = `${dueYear}-${String(dueMonth).padStart(2, '0')}-01`
    const chequeDate = new Date(dueYear, dueMonth - 1, 1).toISOString().split('T')[0]

    slots.push({
      id: generateId(),
      leaseId: lease.id,
      slotIndex: i,
      chequeNumber: generateChequeNumber(lease.leaseNumber, i),
      chequeDate: chequeDate,
      dueDate: dueDateStr,
      amount: monthlyAmount,
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

export function updatePdcStatus(
  cheques: PdcCheque[],
  chequeId: string,
  status: PdcCheque['status'],
): PdcCheque[] {
  const now = new Date().toISOString()
  return cheques.map(chq => {
    if (chq.id !== chequeId) return chq
    const update: Partial<PdcCheque> = { status, updatedAt: now }
    if (status === 'Deposited') update.depositedAt = now
    if (status === 'Cleared') update.clearedAt = now
    if (status === 'Bounced') update.bouncedAt = now
    return { ...chq, ...update }
  })
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
