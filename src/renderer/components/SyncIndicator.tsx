import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CloudOff, CheckCircle2, RefreshCw } from 'lucide-react'

export default function SyncIndicator() {
  const [syncingKeys, setSyncingKeys] = useState<Set<string>>(new Set())
  const [lastSyncStatus, setLastSyncStatus] = useState<'success' | 'error' | null>(null)
  const [showStatus, setShowStatus] = useState(false)

  useEffect(() => {
    let timeout: any

    const handleStart = (e: any) => {
      const { key } = e.detail
      setSyncingKeys(prev => {
        const next = new Set(prev)
        next.add(key)
        return next
      })
      setShowStatus(true)
      if (timeout) clearTimeout(timeout)
    }

    const handleEnd = (e: any) => {
      const { key, success } = e.detail
      setSyncingKeys(prev => {
        const next = new Set(prev)
        next.delete(key)
        if (next.size === 0) {
          setLastSyncStatus(success ? 'success' : 'error')
          // Hide after 3 seconds
          if (timeout) clearTimeout(timeout)
          timeout = setTimeout(() => {
            setShowStatus(false)
            setLastSyncStatus(null)
          }, 3000)
        }
        return next
      })
    }

    window.addEventListener('insacc-sync-start', handleStart)
    window.addEventListener('insacc-sync-end', handleEnd)

    return () => {
      window.removeEventListener('insacc-sync-start', handleStart)
      window.removeEventListener('insacc-sync-end', handleEnd)
      if (timeout) clearTimeout(timeout)
    }
  }, [])

  if (!showStatus) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: '#FFFFFF',
        color: '#1F2937',
        padding: '12px 20px',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        border: '1px solid #E5E7EB',
        transition: 'all 0.3s ease',
        transform: showStatus ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        opacity: showStatus ? 1 : 0,
        pointerEvents: showStatus ? 'auto' : 'none'
      }}
    >
      {syncingKeys.size > 0 && (
        <>
          <RefreshCw size={20} style={{ color: '#5C63A6', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.02em' }}>Saving to cloud...</span>
        </>
      )}
      {syncingKeys.size === 0 && lastSyncStatus === 'success' && (
        <>
          <CheckCircle2 size={20} style={{ color: '#22C55E' }} />
          <span style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.02em' }}>Saved</span>
        </>
      )}
      {syncingKeys.size === 0 && lastSyncStatus === 'error' && (
        <>
          <CloudOff size={20} style={{ color: '#EF4444' }} />
          <span style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.02em' }}>Sync failed</span>
        </>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  )
}
