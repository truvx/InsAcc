import type { LeaseEntry, TenantEntry, PdcCheque } from '../data/propertyTypes'
import type { Voucher } from '../accounting/types'

export interface SettlementResult {
  success: boolean
  error?: string
  updatedLease?: LeaseEntry
  updatedCheques?: PdcCheque[]
}

function getLeaseTotalRent(lease: LeaseEntry): number {
  if (lease.annualRent) return lease.annualRent
  const s = new Date(lease.startDate + 'T00:00:00')
  const e = new Date(lease.endDate + 'T00:00:00')
  const rawMonths = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
  const leaseMonths = e.getDate() >= s.getDate() ? rawMonths + 1 : rawMonths
  return lease.monthlyRent * leaseMonths
}

export function findLeaseForReceipt(
  receivedFrom: string,
  tenants: TenantEntry[],
  leases: LeaseEntry[],
): LeaseEntry | null {
  if (!receivedFrom) return null

  const tenant = tenants.find(
    t => t.name.toLowerCase() === receivedFrom.toLowerCase(),
  )
  if (!tenant) return null

  return leases.find(
    l => l.tenantId === tenant.id && l.status === 'Active',
  ) || null
}

export function calculateRemainingRent(lease: LeaseEntry, vouchers: Voucher[]): number {
  const totalRent = getLeaseTotalRent(lease)
  const amountReceived = lease.amountReceived ?? getTotalReceivedForLease(lease, vouchers)
  return Math.max(0, totalRent - amountReceived)
}

function getTotalReceivedForLease(lease: LeaseEntry, vouchers: Voucher[]): number {
  return vouchers
    .filter(v =>
      v.type === 'Receipt' &&
      !v.isDeleted &&
      v.status === 'Posted' &&
      (v.reference === lease.id || v.reference === lease.leaseNumber),
    )
    .reduce((sum, v) => {
      const debitLine = v.lines.find(l => l.type === 'Debit')
      return sum + (debitLine?.amount || 0)
    }, 0)
}

export function validateReceiptAmount(
  lease: LeaseEntry,
  amount: number,
  vouchers: Voucher[],
): string | null {
  const remainingRent = calculateRemainingRent(lease, vouchers)
  if (amount > remainingRent) {
    return 'Receipt amount exceeds the remaining rent balance.'
  }
  return null
}

export function settleRent(
  lease: LeaseEntry,
  amount: number,
  vouchers: Voucher[],
  allCheques: PdcCheque[],
): { updatedLease: LeaseEntry; updatedCheques: PdcCheque[] } {
  const totalRent = getLeaseTotalRent(lease)
  const currentReceived = lease.amountReceived ?? getTotalReceivedForLease(lease, vouchers)
  const newReceived = currentReceived + amount

  let paymentStatus: 'Pending' | 'Partially Paid' | 'Paid in Full' = 'Partially Paid'
  if (newReceived <= 0) {
    paymentStatus = 'Pending'
  } else if (newReceived >= totalRent) {
    paymentStatus = 'Paid in Full'
  }

  const updatedLease: LeaseEntry = {
    ...lease,
    amountReceived: newReceived,
    paymentStatus,
    updatedAt: new Date().toISOString(),
  }

  const updatedCheques: PdcCheque[] = applyReceiptToPdcSchedule(
    lease.id,
    amount,
    allCheques,
  )

  return { updatedLease, updatedCheques }
}

function applyReceiptToPdcSchedule(
  leaseId: string,
  amount: number,
  allCheques: PdcCheque[],
): PdcCheque[] {
  const leaseCheques = allCheques
    .filter(c => c.leaseId === leaseId && c.status === 'Pending')
    .sort((a, b) => a.slotIndex - b.slotIndex)

  if (leaseCheques.length === 0) return []

  let remainingAmount = amount
  const updates: PdcCheque[] = []

  for (const cheque of leaseCheques) {
    if (remainingAmount <= 0) break

    if (remainingAmount < cheque.amount) {
      return []
    }

    updates.push({
      ...cheque,
      status: 'Cleared',
      clearedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    remainingAmount -= cheque.amount
  }

  return updates.map(u => ({
    ...u,
    auditHistory: [
      ...(u.auditHistory || []),
      {
        timestamp: new Date().toISOString(),
        previousState: 'Pending',
        newState: 'Cleared',
        user: 'system',
        reason: 'Rent settlement via receipt voucher',
      },
    ],
  }))
}
