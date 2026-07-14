import React from 'react'
import { Modal, Badge } from './DesignSystem'
import VoucherStatusBadge from './VoucherStatusBadge'
import VoucherLifecycleActions from './VoucherLifecycleActions'
import VoucherTimeline from '../VoucherTimeline'
import { formatDate } from '../../utils'
import type { Voucher, Account } from '../../accounting/types'
import { CurrencyText } from './CurrencyText'

interface Props {
  open: boolean
  voucher: Voucher | null
  accounts: Account[]
  currency?: string
  dateFormat?: string
  loading?: boolean
  onClose: () => void
  onPost: (v: Voucher) => void
  onApprove: (v: Voucher) => void
  onCancel: (v: Voucher) => void
  onDiscard: (v: Voucher) => void
  onReverse: (v: Voucher) => void
}

export default function VoucherDetailsModal({
  open,
  voucher,
  accounts,
  currency = 'AED',
  dateFormat = 'DD/MM/YYYY',
  loading = false,
  onClose,
  onPost,
  onApprove,
  onCancel,
  onDiscard,
  onReverse,
}: Props) {
  if (!voucher) return null

  return (
    <Modal
      open={open}
      title="Voucher Details"
      onClose={onClose}
      footer={
        <VoucherLifecycleActions
          voucher={voucher}
          loading={loading}
          onPost={onPost}
          onApprove={onApprove}
          onCancel={onCancel}
          onDiscard={onDiscard}
          onReverse={onReverse}
          onClose={onClose}
        />
      }
    >
      <div style={{ minWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="grid-2" style={{ gap: 8 }}>
          <div className="settings-field" style={{ margin: 0 }}>
            <div className="settings-field-label">Voucher #</div>
            <div className="text-mono text-xs fw-600">{voucher.number}</div>
          </div>
          <div className="settings-field" style={{ margin: 0 }}>
            <div className="settings-field-label">Date</div>
            <div className="text-xs">{formatDate(voucher.date, dateFormat)}</div>
          </div>
          <div className="settings-field" style={{ margin: 0 }}>
            <div className="settings-field-label">Status</div>
            <VoucherStatusBadge status={voucher.status} />
          </div>
          <div className="settings-field" style={{ margin: 0 }}>
            <div className="settings-field-label">Type</div>
            <Badge variant="neutral">{voucher.type}</Badge>
          </div>
        </div>

        {voucher.type !== 'Journal' && (
          <div className={voucher.type === 'Payment' ? 'grid-2' : 'grid-3'} style={{ gap: 8 }}>
            <div className="settings-field" style={{ margin: 0 }}>
              <div className="settings-field-label">Payment Mode</div>
              <div className="text-xs fw-500">{voucher.paymentMode || 'Unknown'}</div>
            </div>
            {voucher.type !== 'Payment' && (
              <div className="settings-field" style={{ margin: 0 }}>
                <div className="settings-field-label">Payment Channel</div>
                <div className="text-xs fw-500">{voucher.paymentChannel || 'Unknown'}</div>
              </div>
            )}
            <div className="settings-field" style={{ margin: 0 }}>
              <div className="settings-field-label">Payment Reference</div>
              <div className="text-mono text-xs">{voucher.paymentReference || '—'}</div>
            </div>
          </div>
        )}

        <div>
          <div className="text-sm fw-600 mb-1" style={{ color: 'var(--primary)' }}>Voucher Timeline</div>
          <div className="card-accent-purple" style={{ padding: '8px 12px', borderRadius: 8 }}>
            <VoucherTimeline voucher={voucher} dateFormat={dateFormat} />
          </div>
        </div>

        <div>
          <div className="text-sm fw-600 mb-1" style={{ color: 'var(--primary)' }}>Ledger Entries</div>
          <table className="property-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th className="text-xs">Account</th>
                <th className="text-xs">Debit</th>
                <th className="text-xs">Credit</th>
                <th className="text-xs">Narration</th>
              </tr>
            </thead>
            <tbody>
              {voucher.lines.map((line, i) => {
                const acct = accounts.find(a => a.id === line.accountId)
                return (
                  <tr key={i}>
                    <td className="text-xs fw-500">{acct?.name || line.accountId}</td>
                    <td className="text-xs text-mono">{line.type === 'Debit' ? <CurrencyText value={line.baseAmount} currency={currency} /> : '—'}</td>
                    <td className="text-xs text-mono">{line.type === 'Credit' ? <CurrencyText value={line.baseAmount} currency={currency} /> : '—'}</td>
                    <td className="text-xs text-secondary">{line.narration || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {voucher.reference && (
          <div className="settings-field" style={{ margin: 0 }}>
            <div className="settings-field-label">Reference</div>
            <div className="text-xs">{voucher.reference}</div>
          </div>
        )}

        <div className="settings-field" style={{ margin: 0 }}>
          <div className="settings-field-label">Description</div>
          <div className="text-sm">{voucher.description}</div>
        </div>
      </div>
    </Modal>
  )
}
