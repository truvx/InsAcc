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
          className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-gray-700/50 backdrop-blur-md"
        >
          {syncingKeys.size > 0 && (
            <>
              <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-sm font-medium tracking-wide">Syncing to cloud...</span>
            </>
          )}
          {syncingKeys.size === 0 && lastSyncStatus === 'success' && (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium tracking-wide">Saved to cloud</span>
            </>
          )}
          {syncingKeys.size === 0 && lastSyncStatus === 'error' && (
            <>
              <CloudOff className="w-5 h-5 text-rose-400" />
              <span className="text-sm font-medium tracking-wide">Sync failed</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
