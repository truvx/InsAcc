import type { LeaseEntry, PdcCheque, SecurityDeposit, SecurityDepositTransaction, UnitEntry } from '../data/propertyTypes'
import type { Account, Voucher } from '../accounting/types'
import { clearBalanceCache, invalidateBalanceCache } from '../accounting/ledgerService'
import { isVoucherActive } from '../accounting/voucherService'

// ── Collect all voucher IDs linked to a lease ──────────────────────────────

function collectLeaseVoucherIds(
  leaseId: string,
  pdcCheques: PdcCheque[],
  securityDeposits: SecurityDeposit[],
): Set<string> {
  const ids = new Set<string>()

  for (const pdc of pdcCheques) {
    if (pdc.leaseId !== leaseId) continue
    if (pdc.voucherId) ids.add(pdc.voucherId)
    if (pdc.clearedVoucherId) ids.add(pdc.clearedVoucherId)
    if (pdc.bouncedVoucherId) ids.add(pdc.bouncedVoucherId)
    if (pdc.feeVoucherId) ids.add(pdc.feeVoucherId)
    if (pdc.penaltyVoucherId) ids.add(pdc.penaltyVoucherId)
  }

  for (const sd of securityDeposits) {
    if (sd.leaseId !== leaseId) continue
    for (const tx of sd.transactions) {
      if (tx.voucherId) ids.add(tx.voucherId)
    }
  }

  return ids
}

// ── Find vouchers whose lines reference a lease ────────────────────────────

function findVouchersByLeaseRef(
  leaseId: string,
  leaseNumber: string,
  vouchers: Voucher[],
): Voucher[] {
  return vouchers.filter(v => {
    // Backward compat: voucher-level reference field (lease number)
    if (v.reference === leaseNumber) return true

    // Primary: line-level referenceType/referenceId
    return v.lines.some(l =>
      l.referenceType === 'Lease' &&
      (l.referenceId === leaseId || l.referenceId === leaseNumber),
    )
  })
}

// ── Cascade Delete a Lease ─────────────────────────────────────────────────

export interface DeleteLeaseCascadeInput {
  lease: LeaseEntry
  leases: LeaseEntry[]
  pdcCheques: PdcCheque[]
  securityDeposits: SecurityDeposit[]
  units: UnitEntry[]
  vouchers: Voucher[]
  accounts: Account[]
}

export interface DeleteLeaseCascadeResult {
  leases: LeaseEntry[]
  pdcCheques: PdcCheque[]
  securityDeposits: SecurityDeposit[]
  units: UnitEntry[]
  vouchers: Voucher[]
  removedPdcCount: number
  removedDepositCount: number
  clearedUnitCount: number
  cancelledVoucherCount: number
}

export function deleteLeaseCascade(input: DeleteLeaseCascadeInput): DeleteLeaseCascadeResult {
  const { lease, leases, pdcCheques, securityDeposits, units, vouchers } = input
  const leaseId = lease.id
  const leaseNumber = lease.leaseNumber

  // Guard: lease must still exist in state (prevents double-deletion)
  const stillExists = leases.some(l => l.id === leaseId)
  if (!stillExists) {
    return {
      leases,
      pdcCheques,
      securityDeposits,
      units,
      vouchers,
      removedPdcCount: 0,
      removedDepositCount: 0,
      clearedUnitCount: 0,
      cancelledVoucherCount: 0,
    }
  }

  // 1. Collect voucher IDs from PDC cheques and security deposits
  const voucherIdsFromLease = collectLeaseVoucherIds(leaseId, pdcCheques, securityDeposits)

  // 2. Find vouchers by line-level lease reference
  const vouchersByRef = findVouchersByLeaseRef(leaseId, leaseNumber, vouchers)
  for (const v of vouchersByRef) {
    voucherIdsFromLease.add(v.id)
  }

  // 3. Mark all linked vouchers as deleted + cancelled
  let cancelledVoucherCount = 0
  const remainingVouchers: Voucher[] = []
  for (const v of vouchers) {
    if (voucherIdsFromLease.has(v.id)) {
      cancelledVoucherCount++
    } else {
      remainingVouchers.push(v)
    }
  }

  // 4. Remove PDC cheques linked to this lease
  const remainingPdc = pdcCheques.filter(c => c.leaseId !== leaseId)
  const removedPdcCount = pdcCheques.length - remainingPdc.length

  // 5. Remove security deposits linked to this lease
  const remainingDeposits = securityDeposits.filter(d => d.leaseId !== leaseId)
  const removedDepositCount = securityDeposits.length - remainingDeposits.length

  // 6. Clear leaseId on units that reference this lease
  let clearedUnitCount = 0
  const updatedUnits = units.map(u => {
    if (u.leaseId === leaseId) {
      clearedUnitCount++
      return { ...u, leaseId: null, status: 'Vacant' as const, tenantId: null as unknown as string }
    }
    return u
  })

  // 7. Remove the lease
  const remainingLeases = leases.filter(l => l.id !== leaseId)

  // 8. Force full recalculation
  clearBalanceCache()
  invalidateBalanceCache()

  return {
    leases: remainingLeases,
    pdcCheques: remainingPdc,
    securityDeposits: remainingDeposits,
    units: updatedUnits,
    vouchers: remainingVouchers,
    removedPdcCount,
    removedDepositCount,
    clearedUnitCount,
    cancelledVoucherCount,
  }
}

// ── Orphaned Record Audit ──────────────────────────────────────────────────

export interface OrphanedRecordReport {
  orphanedPdcCheques: number
  orphanedSecurityDeposits: number
  orphanedVouchers: Voucher[]
  orphanedUnits: UnitEntry[]
  actions: string[]
}

export function auditOrphanedRecords(
  leases: LeaseEntry[],
  pdcCheques: PdcCheque[],
  securityDeposits: SecurityDeposit[],
  units: UnitEntry[],
  vouchers: Voucher[],
): OrphanedRecordReport {
  const activeLeaseIds = new Set(leases.map(l => l.id))
  const activeLeaseNumbers = new Set(leases.map(l => l.leaseNumber))
  const actions: string[] = []

  // PDC cheques with leaseId pointing to non-existent lease
  const orphanedPdcCheques = pdcCheques.filter(c => !activeLeaseIds.has(c.leaseId))
  if (orphanedPdcCheques.length > 0) {
    actions.push(`Found ${orphanedPdcCheques.length} orphaned PDC cheques`)
  }

  // Security deposits with leaseId pointing to non-existent lease
  const orphanedDeposits = securityDeposits.filter(d => !activeLeaseIds.has(d.leaseId))
  if (orphanedDeposits.length > 0) {
    actions.push(`Found ${orphanedDeposits.length} orphaned security deposits`)
  }

  // Vouchers with lines referencing non-existent leases
  const orphanedVouchers = vouchers.filter(v => {
    if (!isVoucherActive(v) || v.status !== 'Posted') return false
    return v.lines.some(l => {
      if (l.referenceType !== 'Lease') return false
      return !activeLeaseIds.has(l.referenceId || '') && !activeLeaseNumbers.has(l.referenceId || '')
    })
  })
  if (orphanedVouchers.length > 0) {
    actions.push(`Found ${orphanedVouchers.length} vouchers referencing deleted leases`)
  }

  // Units with leaseId pointing to non-existent lease
  const orphanedUnits = units.filter(u => {
    if (!u.leaseId) return false
    return !activeLeaseIds.has(u.leaseId)
  })
  if (orphanedUnits.length > 0) {
    actions.push(`Found ${orphanedUnits.length} units referencing deleted leases`)
  }

  return {
    orphanedPdcCheques: orphanedPdcCheques.length,
    orphanedSecurityDeposits: orphanedDeposits.length,
    orphanedVouchers,
    orphanedUnits,
    actions,
  }
}

// ── Clean Orphaned Records ─────────────────────────────────────────────────

export interface CleanOrphansInput {
  leases: LeaseEntry[]
  pdcCheques: PdcCheque[]
  securityDeposits: SecurityDeposit[]
  units: UnitEntry[]
  vouchers: Voucher[]
}

export interface CleanOrphansResult {
  pdcCheques: PdcCheque[]
  securityDeposits: SecurityDeposit[]
  units: UnitEntry[]
  vouchers: Voucher[]
  actions: string[]
}

export function cleanOrphanedRecords(input: CleanOrphansInput): CleanOrphansResult {
  const { leases, pdcCheques, securityDeposits, units, vouchers } = input
  const report = auditOrphanedRecords(leases, pdcCheques, securityDeposits, units, vouchers)
  const actions: string[] = [...report.actions]

  // Remove orphaned PDC cheques
  const activeLeaseIds = new Set(leases.map(l => l.id))
  const cleanedPdc = pdcCheques.filter(c => activeLeaseIds.has(c.leaseId))
  const removedPdc = pdcCheques.length - cleanedPdc.length
  if (removedPdc > 0) actions.push(`Removed ${removedPdc} orphaned PDC cheques`)

  // Remove orphaned security deposits
  const cleanedDeposits = securityDeposits.filter(d => activeLeaseIds.has(d.leaseId))
  const removedDeposits = securityDeposits.length - cleanedDeposits.length
  if (removedDeposits > 0) actions.push(`Removed ${removedDeposits} orphaned security deposits`)

  // Mark orphaned vouchers as deleted
  const orphanedVoucherIds = new Set(report.orphanedVouchers.map(v => v.id))
  const cleanedVouchers = vouchers.filter(v => !orphanedVoucherIds.has(v.id))
  const removedVouchers = vouchers.length - cleanedVouchers.length
  if (removedVouchers > 0) actions.push(`Removed ${removedVouchers} orphaned vouchers`)

  // Clear leaseId on orphaned units
  const cleanedUnits = units.map(u => {
    if (u.leaseId && !activeLeaseIds.has(u.leaseId)) {
      return { ...u, leaseId: null, status: 'Vacant' as const, tenantId: null as unknown as string }
    }
    return u
  })
  const clearedUnits = units.filter(u => u.leaseId && !activeLeaseIds.has(u.leaseId)).length
  if (clearedUnits > 0) actions.push(`Cleared leaseId on ${clearedUnits} orphaned units`)

  clearBalanceCache()
  invalidateBalanceCache()

  return {
    pdcCheques: cleanedPdc,
    securityDeposits: cleanedDeposits,
    units: cleanedUnits,
    vouchers: cleanedVouchers,
    actions,
  }
}

// ── Recalculate All Financial Summaries ────────────────────────────────────

export function recalculateAll(): void {
  clearBalanceCache()
  invalidateBalanceCache()
}
