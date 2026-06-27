import React from 'react'
import { Modal, Button } from './DesignSystem'

interface Props {
  open: boolean
  title: string
  submitLabel?: string
  cancelLabel?: string
  onCancel: () => void
  onSubmit: () => void
  children: React.ReactNode
}

export default function EntityForm({ open, title, submitLabel = 'Save', cancelLabel = 'Cancel', onCancel, onSubmit, children }: Props) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant="primary" onClick={onSubmit}>{submitLabel}</Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}
