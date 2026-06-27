import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
}

export default function Modal({ visible, onClose, children }: Props) {
  useEffect(() => {
    if (visible) {
      document.body.classList.add('modal-open')
    } else {
      document.body.classList.remove('modal-open')
    }
    return () => document.body.classList.remove('modal-open')
  }, [visible])

  if (!visible) return null

  return createPortal(
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true">
        {children}
      </div>
    </div>,
    document.body
  )
}
