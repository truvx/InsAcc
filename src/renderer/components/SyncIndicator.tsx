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

  return (
    <AnimatePresence>
      {showStatus && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="sync-indicator-container"
        >
          {syncingKeys.size > 0 && (
            <>
              <RefreshCw className="sync-icon-spin" size={20} />
              <span className="sync-text">Syncing to cloud...</span>
            </>
          )}
          {syncingKeys.size === 0 && lastSyncStatus === 'success' && (
            <>
              <CheckCircle2 className="sync-icon-success" size={20} />
              <span className="sync-text">Saved to cloud</span>
            </>
          )}
          {syncingKeys.size === 0 && lastSyncStatus === 'error' && (
            <>
              <CloudOff className="sync-icon-error" size={20} />
              <span className="sync-text">Sync failed</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
