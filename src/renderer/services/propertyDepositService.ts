import type { LeaseEntry, SecurityDeposit, SecurityDepositTransaction, SecurityDepositStatus, SecurityDepositAuditEntry } from '../data/propertyTypes'

let _txCounter = 0

function generateTxId(): string {
  _txCounter++
  const ts = Date.now().toString(36)
  return `sd-tx-${ts}-${_txCounter}`
}

export function computeDepositBalances(deposit: SecurityDeposit) {
  let expectedAmount = 0
  let receivedAmount = 0
  let refundedAmount = 0
  let forfeitedAmount = 0

  for (const tx of deposit.transactions) {
    if (tx.status === 'Cancelled') continue

    if (tx.type === 'Charge') {
      expectedAmount += tx.amount
    } else if (tx.type === 'Receipt') {
      if (tx.status === 'Posted') {
        receivedAmount += tx.amount
      }
    } else if (tx.type === 'Refund') {
      if (tx.status === 'Posted') {
        refundedAmount += tx.amount
      }
    } else if (tx.type === 'Forfeit') {
      if (tx.status === 'Posted') {
        forfeitedAmount += tx.amount
      }
    } else if (tx.type === 'Adjustment') {
      // Positive adjustment adds to held, negative reduces it.
      // For adjustments, we offset the receivedAmount directly.
      if (tx.status === 'Posted') {
        receivedAmount += tx.amount
      }
    }
  }

  const currentBalance = receivedAmount - refundedAmount - forfeitedAmount
  const outstandingAmount = Math.max(0, expectedAmount - receivedAmount)

  return {
    expectedAmount,
    receivedAmount,
    refundedAmount,
    forfeitedAmount,
    currentBalance,
    outstandingAmount,
  }
}

export function deriveDepositStatus(deposit: SecurityDeposit): SecurityDepositStatus {
  // If the status is manually closed and has 0 balance, respect the Closed state
  if (deposit.status === 'Closed') {
    const { currentBalance } = computeDepositBalances(deposit)
    if (currentBalance === 0) return 'Closed'
  }

  const { expectedAmount, receivedAmount, refundedAmount, forfeitedAmount, currentBalance } = computeDepositBalances(deposit)

  if (receivedAmount === 0) {
    return 'Expected'
  }

  if (currentBalance === 0) {
    if (forfeitedAmount > 0 && refundedAmount === 0) {
      return 'Fully Forfeited'
    }
    if (refundedAmount > 0 && forfeitedAmount === 0) {
      return 'Fully Refunded'
    }
    return 'Closed'
  }

  // There is a held balance
  if (refundedAmount > 0 && forfeitedAmount === 0) {
    return 'Partially Refunded'
  }
  if (forfeitedAmount > 0 && refundedAmount === 0) {
    return 'Partially Forfeited'
  }
  if (refundedAmount > 0 && forfeitedAmount > 0) {
    // If both exist, show Held or Partially Refunded/Forfeited based on presence
    return 'Held'
  }

  return 'Held'
}

export function createInitialDeposit(lease: LeaseEntry, user: string): SecurityDeposit {
  const depositId = `sd-${lease.id}`
  const now = new Date().toISOString()
  
  const initialCharge: SecurityDepositTransaction = {
    id: generateTxId(),
    depositId,
    type: 'Charge',
    amount: lease.deposit || 0,
    date: lease.startDate || now.split('T')[0],
    status: 'Posted',
    createdBy: user,
    createdAt: now,
    updatedAt: now,
  }

  const initialDeposit: SecurityDeposit = {
    id: depositId,
    leaseId: lease.id,
    tenantId: lease.tenantId,
    status: 'Expected',
    createdBy: user,
    createdAt: now,
    updatedAt: now,
    transactions: [initialCharge],
    auditHistory: [
      {
        timestamp: now,
        previousStatus: 'Expected',
        newStatus: 'Expected',
        user,
        amount: lease.deposit,
        notes: `Initial security deposit expected charge created from lease: ${lease.leaseNumber}`,
      }
    ]
  }

  // Correctly set initial derived status
  initialDeposit.status = deriveDepositStatus(initialDeposit)
  return initialDeposit
}

export function addDepositTransaction(
  deposit: SecurityDeposit,
  txParams: Omit<SecurityDepositTransaction, 'id' | 'depositId' | 'createdAt' | 'updatedAt'>,
  user: string
): SecurityDeposit {
  const now = new Date().toISOString()
  const tx: SecurityDepositTransaction = {
    ...txParams,
    id: generateTxId(),
    depositId: deposit.id,
    createdAt: now,
    updatedAt: now,
  }

  // Pre-validate transaction parameters
  const testDeposit = {
    ...deposit,
    transactions: [...deposit.transactions, tx]
  }
  
  const balances = computeDepositBalances(testDeposit)
  if (balances.currentBalance < 0) {
    throw new Error('Transaction rejected: Held balance cannot be negative.')
  }
  if (balances.refundedAmount < 0 || balances.forfeitedAmount < 0) {
    throw new Error('Transaction rejected: Cumulative refund or forfeit amounts cannot be negative.')
  }

  const prevStatus = deposit.status
  const updatedDeposit: SecurityDeposit = {
    ...deposit,
    transactions: [...deposit.transactions, tx],
    updatedAt: now,
  }

  const nextStatus = deriveDepositStatus(updatedDeposit)
  updatedDeposit.status = nextStatus

  const auditEntry: SecurityDepositAuditEntry = {
    timestamp: now,
    previousStatus: prevStatus,
    newStatus: nextStatus,
    user,
    amount: tx.amount,
    notes: tx.notes || `${tx.type} transaction recorded.`,
    voucherId: tx.voucherId,
  }

  updatedDeposit.auditHistory = [...updatedDeposit.auditHistory, auditEntry]
  return updatedDeposit
}

export function closeDeposit(deposit: SecurityDeposit, user: string, notes?: string): SecurityDeposit {
  const balances = computeDepositBalances(deposit)
  if (balances.currentBalance > 0) {
    throw new Error('Cannot close deposit: Remaining held balance must be zero.')
  }

  const now = new Date().toISOString()
  const prevStatus = deposit.status
  const updatedDeposit: SecurityDeposit = {
    ...deposit,
    status: 'Closed',
    updatedAt: now,
    auditHistory: [
      ...deposit.auditHistory,
      {
        timestamp: now,
        previousStatus: prevStatus,
        newStatus: 'Closed',
        user,
        notes: notes || 'Deposit record closed manually.',
      }
    ]
  }

  return updatedDeposit
}
