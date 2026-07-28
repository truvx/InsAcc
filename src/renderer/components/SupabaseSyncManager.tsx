import React, { useEffect, useState } from 'react'
import { getSupabaseClient, pullAllStates, pushAllLocalData } from '../services/supabaseSyncService'
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
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div className="spinner" style={{
          width: 40,
          height: 40,
          border: '4px solid rgba(255,255,255,0.1)',
          borderTop: '4px solid #00f2fe',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: 16
        }} />
        <div style={{ fontSize: 16, fontWeight: 500 }}>Syncing database...</div>
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 8, marginBottom: 20 }}>Fetching latest records from your cloud server</div>
        
        {showSkip && (
          <button
            onClick={handleSkip}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 6,
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
          >
            Skip & Continue to App
          </button>
        )}

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
