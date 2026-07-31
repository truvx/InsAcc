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
        ;(window as any).supabaseSyncInitialized = true
        ;(window as any).isSupabasePulling = false
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
      const failsafeTimer = setTimeout(() => {
        if (active && !(window as any).supabaseSyncInitialized) {
          setLoading(false)
          // DO NOT set supabaseSyncInitialized to true on timeout!
          // We must not allow components to push data if we failed to pull.
          setStatus('error')
          localStorage.setItem('insacc_supabase_status', 'error')
        }
      }, 15000)

      const client = getSupabaseClient(url, anonKey)
      if (!client) {
        ;(window as any).isSupabasePulling = false
        setStatus('error')
        localStorage.setItem('insacc_supabase_status', 'error')
        setLoading(false)
        if (skipTimer) clearTimeout(skipTimer)
        clearTimeout(failsafeTimer)
        return
      }

      try {
        // Initial Pull Phase
        if (!(window as any).supabaseSyncInitialized) {
          ;(window as any).isSupabasePulling = true
          window.dispatchEvent(new CustomEvent('insacc-sync-start', { detail: { key: 'booting' } }))
          
          // Await pull without timeout so we don't accidentally wipe a slow cold-started DB!
          const records = await pullAllStates(client)

          if (active && records === null) {
            // ERROR OCCURRED (e.g. table does not exist, RLS blocked, network error). DO NOT PUSH!
            ;(window as any).isSupabasePulling = false
            ;(window as any).supabaseSyncInitialized = false
            setStatus('error')
            localStorage.setItem('insacc_supabase_status', 'error')
            setLoading(false)
            if (skipTimer) clearTimeout(skipTimer)
            window.dispatchEvent(new CustomEvent('insacc-sync-end', { detail: { key: 'booting', success: false } }))
            return
          } else if (active && records && records.length === 0) {
            // DB successfully queried and is EMPTY. We DO NOT push local data automatically.
            // If the user wants to push their local database to the cloud, they must click
            // the 'Push Local Data' button in Settings. This prevents empty phones from wiping 
            // a newly created (but seemingly empty due to latency or bugs) database.
            console.log('Supabase DB is empty. Awaiting manual push or future local changes.');
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
                // We ALWAYS overwrite local state with DB state on boot.
                // Reset any dirty flags since DB is source of truth on startup.
                localStorage.removeItem(`insacc_dirty_${record.key}`)
                
                const stateStr = JSON.stringify(record.value)
                localStorage.setItem(record.key, stateStr)
                window.dispatchEvent(new CustomEvent('insacc-remote-sync', { detail: { key: record.key, value: record.value } }))
                invalidateBalanceCache()
              }
            }
          }
        }

        if (active) {
          ;(window as any).isSupabasePulling = false
          ;(window as any).supabaseSyncInitialized = true
          setStatus('connected')
          localStorage.setItem('insacc_supabase_status', 'connected')
          setLoading(false)
          if (skipTimer) clearTimeout(skipTimer)
          window.dispatchEvent(new CustomEvent('insacc-sync-end', { detail: { key: 'booting', success: true } }))
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
                  if (localStorage.getItem(`insacc_dirty_${record.key}`)) {
                    return // Skip remote update because local has unpushed changes
                  }
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
          .subscribe((status, err) => {
            if (err) console.error('Realtime subscribe error:', err)
          })
      } catch (err) {
        console.error('Failed to initialize Supabase Realtime channel:', err)
        if (active) {
          ;(window as any).isSupabasePulling = false
          ;(window as any).supabaseSyncInitialized = true
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
        ;(window as any).supabaseSyncInitialized = false
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
    ;(window as any).isSupabasePulling = false
    ;(window as any).supabaseSyncInitialized = true
    setLoading(false)
  }

  if (loading && !(window as any).supabaseSyncInitialized) {
    // We are deliberately hiding the dark popup. The global SyncIndicator handles this now.
    return null
  }

  return null
}
