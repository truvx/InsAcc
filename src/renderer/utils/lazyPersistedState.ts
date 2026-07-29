import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabaseClient, pushState } from '../services/supabaseSyncService'

const cache = new Map<string, string | null>()
let cacheLoaded = false

function loadCache() {
  if (cacheLoaded) return
  cacheLoaded = true
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) cache.set(key, localStorage.getItem(key))
    }
  } catch {}
}

export function clearPersistedCache() {
  cache.clear()
  cacheLoaded = false
}

function readCache(key: string): string | null {
  loadCache()
  return cache.has(key) ? cache.get(key)! : null
}

export function useLazyPersistedState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = readCache(key)
      if (stored !== null) return JSON.parse(stored) as T
    } catch {}
    return defaultValue
  })

  const isFirstRender = useRef(true)
  const isRemoteUpdate = useRef(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      const stateStr = JSON.stringify(state)

      if (isFirstRender.current) {
        isFirstRender.current = false
        if (stored !== null && stored !== stateStr) {
          const parsed = JSON.parse(stored) as T
          setState(parsed)
          return
        }
      }

      localStorage.setItem(key, stateStr)
      cache.set(key, stateStr)

      // Skip pushing to Supabase if this state update came from remote sync or while pulling
      if (isRemoteUpdate.current) {
        isRemoteUpdate.current = false
        return
      }

      if ((window as any).isSupabasePulling) {
        return
      }

      // Sync to Supabase if enabled and initialized
      if (key !== 'insacc_supabase_url' && key !== 'insacc_supabase_key' && key !== 'insacc_supabase_enabled') {
        const enabledVal = localStorage.getItem('insacc_supabase_enabled')
        const enabled = enabledVal ? JSON.parse(enabledVal) === true : false
        
        const rawUrl = localStorage.getItem('insacc_supabase_url')
        const url = rawUrl ? JSON.parse(rawUrl) : ''
        
        const rawKey = localStorage.getItem('insacc_supabase_key')
        const anonKey = rawKey ? JSON.parse(rawKey) : ''
        
        if (enabled && url && anonKey && (window as any).supabaseSyncInitialized) {
          const client = getSupabaseClient(url, anonKey)
          if (client) {
            pushState(client, key, state).catch(err => console.error('Push failed:', err))
          }
        }
      }
    } catch {}
  }, [state, key])

  // Listen to storage events & custom remote sync events
  useEffect(() => {
    const handleStorageChange = (e: any) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue) as T
          isRemoteUpdate.current = true
          cache.set(key, e.newValue)
          setState(parsed)
        } catch {}
      }
    }

    const handleRemoteSync = (e: CustomEvent<{ key: string; value: any }>) => {
      if (e.detail && e.detail.key === key) {
        try {
          const valStr = JSON.stringify(e.detail.value)
          isRemoteUpdate.current = true
          cache.set(key, valStr)
          setState(e.detail.value)
        } catch {}
      }
    }

    window.addEventListener('storage' as any, handleStorageChange)
    window.addEventListener('insacc-remote-sync' as any, handleRemoteSync)
    return () => {
      window.removeEventListener('storage' as any, handleStorageChange)
      window.removeEventListener('insacc-remote-sync' as any, handleRemoteSync)
    }
  }, [key])

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(key)
      cache.delete(key)
    } catch {}
    setState(defaultValue)
  }, [key, defaultValue])

  return [state, setState, reset]
}
