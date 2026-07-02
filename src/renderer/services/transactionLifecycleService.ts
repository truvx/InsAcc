export type TransactionType = 'BankTransaction' | 'Purchase' | 'Voucher' | 'PdcCheque' | 'SecurityDeposit'

export const TransactionLifecycleService = {
  canEdit(type: TransactionType, entity: any): boolean {
    if (!entity) return false
    switch (type) {
      case 'BankTransaction':
        return entity.status !== 'reconciled'
      case 'Purchase':
        return !entity.voucherId
      case 'Voucher':
        return entity.status === 'Draft'
      case 'PdcCheque':
        return entity.status !== 'Cleared' && entity.status !== 'Cancelled'
      case 'SecurityDeposit':
        return entity.status !== 'Closed'
      default:
        return false
    }
  },

  canDelete(type: TransactionType, entity: any): boolean {
    if (!entity) return false
    switch (type) {
      case 'BankTransaction':
        return entity.status !== 'reconciled'
      case 'Purchase':
        return !entity.voucherId
      case 'Voucher':
        return entity.status === 'Draft'
      case 'PdcCheque':
        return false // Managed through lease lifecycle, no direct deletion
      case 'SecurityDeposit':
        return false // Managed through lease ledger, no direct deletion
      default:
        return false
    }
  }
}
