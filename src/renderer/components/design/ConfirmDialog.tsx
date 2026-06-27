import React from 'react'
import { Modal, Button } from './DesignSystem'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger', onConfirm, onCancel }: Props) {
  return (
    <Modal open={open} onClose={onCancel} title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={variant} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{message}</p>
    </Modal>
  )
}
