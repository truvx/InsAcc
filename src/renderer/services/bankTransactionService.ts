export interface DeleteTransactionResult<T> {
  success: boolean
  error?: string
  updatedTransactions: T[]
  auditDetails?: {
    action: 'Create' | 'Update' | 'Delete' | 'Import' | 'Export' | 'Upload' | 'Download' | 'Transfer' | 'Login' | 'Logout' | 'System'
    entityName: string
    entityId: string
    description: string
  }
}

export function deleteBankTransaction<T extends {
  id: string
  status: string
  accountId: string
  type: string
  amount: number
  description: string
}>(
  transactionId: string,
  transactions: T[],
  accounts: { id: string; institution: string }[],
  currency: string = 'AED'
): DeleteTransactionResult<T> {
  const transaction = transactions.find(t => t.id === transactionId)
  if (!transaction) {
    return {
      success: false,
      error: 'Transaction not found',
      updatedTransactions: transactions,
    }
  }

  // Enforce business rules
  if (transaction.status === 'reconciled') {
    return {
      success: false,
      error: 'Reconciled transactions cannot be deleted. Un-reconcile first.',
      updatedTransactions: transactions,
    }
  }

  const updated = transactions.filter(t => t.id !== transactionId)
  const account = accounts.find(a => a.id === transaction.accountId)
  const accountName = account?.institution || 'unknown'

  return {
    success: true,
    updatedTransactions: updated,
    auditDetails: {
      action: 'Delete',
      entityName: accountName,
      entityId: transaction.id,
      description: `Deleted ${transaction.type} transaction: ${transaction.description} ${currency}${transaction.amount.toLocaleString()}`,
    }
  }
}
