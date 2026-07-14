import React, { useEffect, useState } from 'react'
import { getSupabaseClient, pullAllStates } from '../services/supabaseSyncService'

export default function SupabaseSyncManager() {
  const [status, setStatus] = useState<'disconnected' | 'connected' | 'syncing' | 'error'>('disconnected')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    let channel: any = null

    // Set window variable default so lazyPersistedState works
    if (typeof (window as any).supabaseSyncInitialized === 'undefined') {
      (window as any).supabaseSyncInitialized = false
    }

    const initSync = async () => {
      const enabled = localStorage.getItem('insacc_supabase_enabled') === 'true'
      const url = localStorage.getItem('insacc_supabase_url') || ''
      const anonKey = localStorage.getItem('insacc_supabase_key') || ''

      if (!enabled || !url || !anonKey) {
        (window as any).supabaseSyncInitialized = true
        setStatus('disconnected')
        localStorage.setItem('insacc_supabase_status', 'disconnected')
        return
      }

      setStatus('syncing')
      localStorage.setItem('insacc_supabase_status', 'syncing')
      setLoading(true)

      const client = getSupabaseClient(url, anonKey)
      if (!client) {
        (window as any).supabaseSyncInitialized = true
        setStatus('error')
        localStorage.setItem('insacc_supabase_status', 'error')
        setLoading(false)
        return
      }

      try {
        // Initial Pull Phase
        if (!(window as any).supabaseSyncInitialized) {
          const records = await pullAllStates(client)
          if (active && records.length > 0) {
            for (const record of records) {
              if (
                record.key &&
                record.key !== 'insacc_supabase_url' &&
                record.key !== 'insacc_supabase_key' &&
                record.key !== 'insacc_supabase_enabled'
              ) {
                const stateStr = JSON.stringify(record.value)
                localStorage.setItem(record.key, stateStr)
                // Dispatch event so active useLazyPersistedState states update in real-time
                window.dispatchEvent(new StorageEvent('storage', { key: record.key, newValue: stateStr }))
              }
            }
          }
          (window as any).supabaseSyncInitialized = true
        }

        setStatus('connected')
        localStorage.setItem('insacc_supabase_status', 'connected')
        setLoading(false)

        // Setup Realtime listener
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
                    window.dispatchEvent(new StorageEvent('storage', { key: record.key, newValue: stateStr }))
                  }
                }
              }
            }
          )
          .subscribe()
      } catch (err) {
        console.error('Failed to initialize Supabase Realtime channel:', err)
        if (active) {
          (window as any).supabaseSyncInitialized = true
          setStatus('error')
          localStorage.setItem('insacc_supabase_status', 'error')
          setLoading(false)
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
      window.removeEventListener('storage', handleSettingsSyncToggle)
      if (channel) {
        channel.unsubscribe()
      }
    }
  }, [])

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
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>Fetching latest records from your cloud server</div>
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
