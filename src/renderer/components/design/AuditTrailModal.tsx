import React from 'react'
import { Modal } from './DesignSystem'
import { formatModifiedDateTime } from '../../utils'
import type { Voucher } from '../../accounting/types'
import type { AuditEvent } from '../../data/auditTypes'

interface Props {
  open: boolean
  voucher: Voucher | null
  auditEvents: AuditEvent[]
  onClose: () => void
}

export default function AuditTrailModal({ open, voucher, auditEvents, onClose }: Props) {
  if (!voucher) return null

  // Find all audit events for this specific voucher
  const voucherEvents = auditEvents
    .filter(e => e.entityId === voucher.id)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  return (
    <Modal
      open={open}
      title={`Audit Trail - ${voucher.number}`}
      onClose={onClose}
    >
      <div style={{ minWidth: 460, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Creation Info */}
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 600 }}>Created By</div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>{voucher.createdBy || 'system'}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 600 }}>Created On</div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>{formatModifiedDateTime(voucher.createdAt)}</div>
            </div>
          </div>
        </div>

        {/* Modification Info */}
        {voucher.modifiedAt && (
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 600 }}>Last Modified By</div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{voucher.modifiedBy || 'user'}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 600 }}>Last Modified On</div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{formatModifiedDateTime(voucher.modifiedAt)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Change History timeline */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', marginBottom: 8 }}>Change History</div>
          {voucherEvents.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#6B7280', textAlign: 'center', padding: '16px 0' }}>
              No audit logs recorded for this voucher.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {voucherEvents.map((evt, i) => (
                <div key={evt.id || i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6', marginTop: 4, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{evt.description}</div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: 2 }}>
                      By {evt.user || 'system'} on {formatModifiedDateTime(evt.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
