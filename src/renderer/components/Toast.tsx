import React, { useEffect, useState } from 'react'

interface Props {
  message: string
  type: 'success' | 'error'
  visible: boolean
  onClose: () => void
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function Toast({ message, type, visible, onClose }: Props) {
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (visible) {
      setClosing(false)
      const timer = setTimeout(() => {
        setClosing(true)
        setTimeout(onClose, 300)
      }, 2200)
      return () => clearTimeout(timer)
    }
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div className="toast-container">
      <div className={`toast toast-${type}${closing ? ' toast-out' : ''}`}>
        <span className="toast-icon">{type === 'success' ? <CheckIcon /> : <XIcon />}</span>
        <span className="toast-message">{message}</span>
      </div>
    </div>
  )
}
