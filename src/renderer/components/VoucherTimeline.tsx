import React from 'react'
import type { Voucher } from '../accounting/types'

interface Props {
  voucher: Voucher
  dateFormat?: string
}

function fmtDateTime(isoStr?: string): string {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return isoStr
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`
}

function TimelineStep({
  label, date, user, active, isLast,
}: {
  label: string
  date?: string
  user?: string
  active: boolean
  isLast: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 20 }}>
        <div
          style={{
            width: 14, height: 14, borderRadius: '50%',
            background: active ? 'var(--primary)' : 'var(--border)',
            border: active ? '3px solid var(--primary-dim)' : '3px solid var(--bg-secondary)',
            flexShrink: 0,
          }}
        />
        {!isLast && <div style={{ width: 2, flex: 1, minHeight: 24, background: 'var(--border)' }} />}
      </div>
      <div style={{ paddingBottom: isLast ? 0 : 8 }}>
        <div className="text-xs fw-600" style={{ color: active ? 'var(--primary)' : 'var(--text-secondary)' }}>
          {label}
        </div>
        {date && (
          <div className="text-xs text-secondary" style={{ marginTop: 2 }}>
            {fmtDateTime(date)}
          </div>
        )}
        {user && (
          <div className="text-xs text-secondary">
            by {user}
          </div>
        )}
      </div>
    </div>
  )
}

export default function VoucherTimeline({ voucher }: Props) {
  return (
    <div style={{ padding: '8px 0' }}>
      <TimelineStep
        label="Created"
        date={voucher.createdAt}
        user={voucher.createdBy}
        active={true}
        isLast={false}
      />
      <TimelineStep
        label="Approved"
        date={voucher.approvedAt}
        user={voucher.approvedBy}
        active={voucher.status === 'Approved' || voucher.status === 'Posted'}
        isLast={false}
      />
      <TimelineStep
        label="Posted"
        date={voucher.postedAt}
        user={voucher.postedBy}
        active={voucher.status === 'Posted'}
        isLast={true}
      />
    </div>
  )
}
