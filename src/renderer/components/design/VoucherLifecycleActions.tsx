import React from 'react'
import { Button } from './DesignSystem'
import type { Voucher } from '../../accounting/types'

interface Props {
  voucher: Voucher
  loading?: boolean
  onPost: (v: Voucher) => void
  onApprove: (v: Voucher) => void
  onCancel: (v: Voucher) => void
  onDiscard: (v: Voucher) => void
  onReverse: (v: Voucher) => void
  onClose: () => void
}

export default function VoucherLifecycleActions({
  voucher,
  loading = false,
  onPost,
  onApprove,
  onCancel,
  onDiscard,
  onReverse,
  onClose,
}: Props) {
  const s = voucher.status

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
      {s === 'Draft' && (
        <>
          <Button variant="danger" size="sm" onClick={() => onDiscard(voucher)} disabled={loading}>
            Discard Draft
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onCancel(voucher)} disabled={loading}>
            Void Draft
          </Button>
          <Button variant="primary" size="sm" onClick={() => onPost(voucher)} disabled={loading}>
            Post Voucher
          </Button>
        </>
      )}

      {s === 'Pending Approval' && (
        <>
          <Button variant="danger" size="sm" onClick={() => onCancel(voucher)} disabled={loading}>
            Reject
          </Button>
          <Button variant="primary" size="sm" onClick={() => onApprove(voucher)} disabled={loading}>
            Approve
          </Button>
        </>
      )}

      {s === 'Approved' && (
        <Button variant="primary" size="sm" onClick={() => onPost(voucher)} disabled={loading}>
          Post Voucher
        </Button>
      )}

      {s === 'Posted' && (
        <Button variant="danger" size="sm" onClick={() => onReverse(voucher)} disabled={loading}>
          Reverse Voucher
        </Button>
      )}

      <Button variant="secondary" size="sm" onClick={onClose}>
        Close
      </Button>
    </div>
  )
}
