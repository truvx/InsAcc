import React from 'react'
import { Badge } from './DesignSystem'
import type { VoucherStatus } from '../../accounting/types'

interface Props {
  status: VoucherStatus
}

export default function VoucherStatusBadge({ status }: Props) {
  const getVariant = (s: VoucherStatus): 'success' | 'primary' | 'danger' | 'warning' | 'neutral' => {
    switch (s) {
      case 'Posted':
        return 'success'
      case 'Approved':
        return 'primary'
      case 'Cancelled':
      case 'Reversed':
        return 'danger'
      case 'Draft':
      case 'Pending Approval':
        return 'warning'
      default:
        return 'neutral'
    }
  }

  return <Badge variant={getVariant(status)}>{status}</Badge>
}
