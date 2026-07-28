import React, { useEffect, useState } from 'react'
import { getSupabaseClient, pullAllStates, pushAllLocalData } from '../services/supabaseSyncService'
import { invalidateBalanceCache } from '../accounting/ledgerService'
import { clearPersistedCache } from '../utils/lazyPersistedState'

export default function SupabaseSyncManager() {
  const [status, setStatus] = useState<'disconnected' | 'connected' | 'syncing' | 'error'>('disconnected')
  const [loading, setLoading] = useState(false)
  const [showSkip, setShowSkip] = useState(false)

  useEffect(() => {
    let active = true
    let channel: any = null
    let skipTimer: any = null

    // Set window variable default so lazyPersistedState works
    if (typeof (window as any).supabaseSyncInitialized === 'undefined') {
      (window as any).supabaseSyncInitialized = false
    }

    const initSync = async () => {
      const enabledVal = localStorage.getItem('insacc_supabase_enabled')
      const enabled = enabledVal ? JSON.parse(enabledVal) === true : false

      const rawUrl = localStorage.getItem('insacc_supabase_url')
      const url = rawUrl ? JSON.parse(rawUrl) : ''

      const rawKey = localStorage.getItem('insacc_supabase_key')
      const anonKey = rawKey ? JSON.parse(rawKey) : ''

      if (!enabled || !url || !anonKey) {
        (window as any).supabaseSyncInitialized = true
        (window as any).isSupabasePulling = false
        setStatus('disconnected')
        localStorage.setItem('insacc_supabase_status', 'disconnected')
        setLoading(false)
        return
      }

      setStatus('syncing')
      localStorage.setItem('insacc_supabase_status', 'syncing')
      setLoading(true)

      // Show skip button after 3 seconds if it's still loading (Supabase cold starts can take 10s+)
      skipTimer = setTimeout(() => {
        if (active) setShowSkip(true)
      }, 3000)

      // Ultimate failsafe: hide the loader after 15 seconds no matter what.
      setTimeout(() => {
        if (active) {
          setLoading(false)
          ;(window as any).supabaseSyncInitialized = true
        }
      }, 15000)

      const client = getSupabaseClient(url, anonKey)
      if (!client) {
        (window as any).supabaseSyncInitialized = true
        (window as any).isSupabasePulling = false
        setStatus('error')
        localStorage.setItem('insacc_supabase_status', 'error')
        setLoading(false)
        if (skipTimer) clearTimeout(skipTimer)
        return
      }

      try {
        // Initial Pull Phase
        if (!(window as any).supabaseSyncInitialized) {
          (window as any).isSupabasePulling = true
          
          // Await pull without timeout so we don't accidentally wipe a slow cold-started DB!
          const records = await pullAllStates(client)

          if (active && records === null) {
            // ERROR OCCURRED (e.g. table does not exist, RLS blocked, network error). DO NOT PUSH!
            (window as any).isSupabasePulling = false
            (window as any).supabaseSyncInitialized = true
            setStatus('error')
            localStorage.setItem('insacc_supabase_status', 'error')
            setLoading(false)
            if (skipTimer) clearTimeout(skipTimer)
            return
          } else if (active && records && records.length === 0) {
            // DB successfully queried and is EMPTY. Safe to push local data.
            pushAllLocalData(url, anonKey).catch(err => console.error('Background push error:', err))
          } else if (active && records && records.length > 0) {
            // DB has records — populate local storage & React state
            clearPersistedCache()
            for (const record of records) {
              if (
                record.key &&
                record.key !== 'insacc_supabase_url' &&
                record.key !== 'insacc_supabase_key' &&
                record.key !== 'insacc_supabase_enabled'
              ) {
                const stateStr = JSON.stringify(record.value)
                localStorage.setItem(record.key, stateStr)
                window.dispatchEvent(new CustomEvent('insacc-remote-sync', { detail: { key: record.key, value: record.value } }))
                invalidateBalanceCache()
              }
            }
          }
        }

        if (active) {
          (window as any).isSupabasePulling = false
          (window as any).supabaseSyncInitialized = true
          setStatus('connected')
          localStorage.setItem('insacc_supabase_status', 'connected')
          setLoading(false)
          if (skipTimer) clearTimeout(skipTimer)
        }

        // Setup Realtime listener for live updates
        channel = client
          .channel('schema-db-changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'app_sync_state' },
            (payload) => {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const record = payload.new as { key: string; value: any }
                if (
                  record &&
                  record.key &&
                  record.key !== 'insacc_supabase_url' &&
                  record.key !== 'insacc_supabase_key' &&
                  record.key !== 'insacc_supabase_enabled'
                ) {
                  const stateStr = JSON.stringify(record.value)
                  if (localStorage.getItem(record.key) !== stateStr) {
                    localStorage.setItem(record.key, stateStr)
                    window.dispatchEvent(new CustomEvent('insacc-remote-sync', { detail: { key: record.key, value: record.value } }))
                    invalidateBalanceCache()
                  }
                }
              }
            }
          )
          .subscribe()
      } catch (err) {
        console.error('Failed to initialize Supabase Realtime channel:', err)
        if (active) {
          (window as any).isSupabasePulling = false
          (window as any).supabaseSyncInitialized = true
          setStatus('error')
          localStorage.setItem('insacc_supabase_status', 'error')
          setLoading(false)
          if (skipTimer) clearTimeout(skipTimer)
        }
      }
    }

    initSync()

    // Listen for manual settings changes that toggle cloud sync
    const handleSettingsSyncToggle = (e: StorageEvent) => {
      if (
        e.key === 'insacc_supabase_enabled' ||
        e.key === 'insacc_supabase_url' ||
        e.key === 'insacc_supabase_key'
      ) {
        if (channel) {
          channel.unsubscribe()
        }
        (window as any).supabaseSyncInitialized = false
        initSync()
      }
    }
    window.addEventListener('storage', handleSettingsSyncToggle)

    return () => {
      active = false
      if (skipTimer) clearTimeout(skipTimer)
      window.removeEventListener('storage', handleSettingsSyncToggle)
      if (channel) {
        channel.unsubscribe()
      }
    }
  }, [])

  const handleSkip = () => {
    (window as any).isSupabasePulling = false
    (window as any).supabaseSyncInitialized = true
    setLoading(false)
  }

  if (loading && !(window as any).supabaseSyncInitialized) {
    return (
      <div style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        background: '#1e293b',
        border: '1px solid #334155',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderRadius: 8,
        color: '#fff',
        fontFamily: 'Inter, sans-serif',
        pointerEvents: 'none' // Don't block clicks underneath!
      }}>
        <div className="spinner" style={{
          width: 16,
          height: 16,
          border: '2px solid rgba(255,255,255,0.1)',
          borderTop: '2px solid #00f2fe',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginRight: 12
        }} />
        <div style={{ fontSize: 13, fontWeight: 500 }}>Syncing cloud database...</div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return null
}
