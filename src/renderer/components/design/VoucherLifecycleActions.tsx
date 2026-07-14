import React from 'react'
import { Button } from './DesignSystem'
import type { Voucher } from '../../accounting/types'

interface Props {
  voucher: Voucher
  loading?: boolean
  onPost?: (v: Voucher) => void
  onApprove?: (v: Voucher) => void
  onCancel: (v: Voucher) => void
  onDiscard?: (v: Voucher) => void
  onReverse: (v: Voucher) => void
  onClose: () => void
}

export default function VoucherLifecycleActions({
  voucher,
  loading = false,
  onCancel,
  onReverse,
  onClose,
}: Props) {
  const s = voucher.status

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
      {s === 'Posted' && (
        <Button variant="danger" size="sm" onClick={() => onReverse(voucher)} disabled={loading}>
          Reverse Voucher
        </Button>
      )}

      {s === 'Cancelled' && (
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>This voucher has been cancelled.</span>
      )}

      {s === 'Reversed' && (
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>This voucher has been reversed.</span>
      )}

      <Button variant="secondary" size="sm" onClick={onClose}>
        Close
      </Button>
    </div>
  )
}
