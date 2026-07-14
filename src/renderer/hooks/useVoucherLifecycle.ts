import { useState, useCallback } from 'react'
import type { Voucher, Account, FiscalYear, PostingResult } from '../accounting/types'
import type { AccountingEngine } from '../accounting/accountingEngine'
import { invalidateBalanceCache } from '../accounting/ledgerService'

/**
 * Immediately approve + post a freshly-created Draft voucher.
 * Call this right after accountingEngine.processAccountingEvent() returns a
 * Draft voucher so that no Draft state is ever stored in the UI.
 */
export function autoPostVoucher(
  accountingEngine: AccountingEngine,
  draftVoucher: Voucher,
  accounts: Account[],
): PostingResult {
  const approveResult = accountingEngine.approve(draftVoucher, 'user')
  if (!approveResult.success || !approveResult.voucher) {
    return approveResult
  }

  const postResult = accountingEngine.post(approveResult.voucher, 'user', accounts, [])
  if (!postResult.success || !postResult.voucher) {
    return postResult
  }

  invalidateBalanceCache()
  return { success: true, voucher: postResult.voucher, errors: [] }
}

interface ToastState {
  visible: boolean
  message: string
  type: 'success' | 'error'
}

export function useVoucherLifecycle(
  accountingEngine: AccountingEngine,
  accounts: Account[],
  setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>,
) {
  const [detailVoucher, setDetailVoucher] = useState<Voucher | null>(null)
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'success' })
  const [loading, setLoading] = useState(false)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type })
  }, [])

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }))
  }, [])

  const handlePost = useCallback((v: Voucher) => {
    setLoading(true)
    try {
      let current = v
      if (current.status === 'Draft' || current.status === 'Pending Approval') {
        const approveResult = accountingEngine.approve(current, 'user')
        if (!approveResult.success || !approveResult.voucher) {
          showToast(approveResult.errors.map(e => e.message).join(', '), 'error')
          return
        }
        current = approveResult.voucher
      }
      
      const postResult = accountingEngine.post(current, 'user', accounts, [])
      if (!postResult.success || !postResult.voucher) {
        showToast(postResult.errors.map(e => e.message).join(', '), 'error')
        return
      }

      setVouchers(prev => prev.map(item => item.id === v.id ? postResult.voucher! : item))
      invalidateBalanceCache()
      showToast(`Voucher ${postResult.voucher.number} posted successfully`, 'success')
      setDetailVoucher(null)
    } catch (err: any) {
      showToast(err.message || 'Failed to post voucher', 'error')
    } finally {
      setLoading(false)
    }
  }, [accountingEngine, accounts, setVouchers, showToast])

  const handleApprove = useCallback((v: Voucher) => {
    setLoading(true)
    try {
      const approveResult = accountingEngine.approve(v, 'user')
      if (!approveResult.success || !approveResult.voucher) {
        showToast(approveResult.errors.map(e => e.message).join(', '), 'error')
        return
      }
      setVouchers(prev => prev.map(item => item.id === v.id ? approveResult.voucher! : item))
      invalidateBalanceCache()
      showToast(`Voucher ${approveResult.voucher.number} approved`, 'success')
      setDetailVoucher(null)
    } catch (err: any) {
      showToast(err.message || 'Failed to approve voucher', 'error')
    } finally {
      setLoading(false)
    }
  }, [accountingEngine, setVouchers, showToast])

  const handleCancel = useCallback((v: Voucher) => {
    setLoading(true)
    try {
      const cancelResult = accountingEngine.cancel(v)
      if (!cancelResult.success || !cancelResult.voucher) {
        showToast(cancelResult.errors.map(e => e.message).join(', '), 'error')
        return
      }
      setVouchers(prev => prev.map(item => item.id === v.id ? cancelResult.voucher! : item))
      invalidateBalanceCache()
      showToast(`Voucher ${cancelResult.voucher.number} cancelled/voided`, 'success')
      setDetailVoucher(null)
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel voucher', 'error')
    } finally {
      setLoading(false)
    }
  }, [accountingEngine, setVouchers, showToast])

  const handleDiscard = useCallback((v: Voucher) => {
    setVouchers(prev => prev.filter(item => item.id !== v.id))
    invalidateBalanceCache()
    showToast('Draft voucher discarded', 'success')
    setDetailVoucher(null)
  }, [setVouchers, showToast])

  const handleReverse = useCallback((v: Voucher) => {
    setLoading(true)
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      const reverseResult = accountingEngine.reverse(v, todayStr, 'user', accounts, [])
      if (!reverseResult.success || !reverseResult.voucher) {
        showToast(reverseResult.errors.map(e => e.message).join(', '), 'error')
        return
      }
      setVouchers(prev => {
        const updated = prev.map(item => {
          if (item.id === v.id) {
            return { ...item, status: 'Reversed' as const, reversedVoucherId: reverseResult.voucher!.id }
          }
          return item
        })
        return [reverseResult.voucher!, ...updated]
      })
      invalidateBalanceCache()
      showToast(`Voucher ${v.number} reversed successfully`, 'success')
      setDetailVoucher(null)
    } catch (err: any) {
      showToast(err.message || 'Failed to reverse voucher', 'error')
    } finally {
      setLoading(false)
    }
  }, [accountingEngine, accounts, setVouchers, showToast])

  return {
    detailVoucher,
    setDetailVoucher,
    toast,
    showToast,
    hideToast,
    loading,
    handlePost,
    handleApprove,
    handleCancel,
    handleDiscard,
    handleReverse,
  }
}
