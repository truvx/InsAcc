import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Eye, Pencil, Trash2 } from 'lucide-react'

interface Props {
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  triggerStyle?: React.CSSProperties
}

export default function BankAccountActionsMenu({
  onView,
  onEdit,
  onDelete,
  triggerStyle,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const menuWidth = 160
      const menuHeight = 120 // Estimated height of menu
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // Determine top positioning relative to viewport
      let top = rect.bottom + 4
      if (top + menuHeight > viewportHeight) {
        // Place above the button if it overflows the bottom
        top = Math.max(4, rect.top - menuHeight - 4)
      }

      // Determine left positioning relative to viewport (aligned to right edge of button)
      let left = rect.right - menuWidth
      if (left < 4) {
        left = 4
      } else if (left + menuWidth > viewportWidth - 4) {
        left = viewportWidth - menuWidth - 4
      }

      setCoords({ top, left })
    }
  }

  useEffect(() => {
    if (isOpen) {
      updateCoords()

      const handleScrollOrResize = () => {
        setIsOpen(false)
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false)
        }
      }

      window.addEventListener('scroll', handleScrollOrResize, true)
      window.addEventListener('resize', handleScrollOrResize)
      window.addEventListener('keydown', handleKeyDown)

      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true)
        window.removeEventListener('resize', handleScrollOrResize)
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        portalRef.current &&
        !portalRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation()
          updateCoords()
          setIsOpen(!isOpen)
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '6px',
          borderRadius: '4px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary, #6B7280)',
          outline: 'none',
          ...triggerStyle,
        }}
        aria-label="Actions"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {isOpen && createPortal(
        <div
          ref={portalRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            background: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border, #E5E7EB)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
            zIndex: 99999,
            minWidth: '160px',
            display: 'flex',
            flexDirection: 'column',
            padding: '4px 0',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onView(); setIsOpen(false) }}
            style={menuItemStyle}
          >
            <Eye size={14} strokeWidth={1.75} /> View
          </button>
          <button
            onClick={() => { onEdit(); setIsOpen(false) }}
            style={menuItemStyle}
          >
            <Pencil size={14} strokeWidth={1.75} /> Edit
          </button>
          <button
            onClick={() => { onDelete(); setIsOpen(false) }}
            style={{
              ...menuItemStyle,
              color: '#DC2626',
            }}
          >
            <Trash2 size={14} strokeWidth={1.75} /> Delete
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}

const menuItemStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '8px 16px',
  textAlign: 'left',
  width: '100%',
  cursor: 'pointer',
  fontSize: '13px',
  color: 'var(--text-primary, #1F2937)',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontFamily: 'inherit',
}
