import { useState, useEffect, useCallback, useRef } from 'react'

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

      // Sync to Supabase if enabled and initialized
      if (key !== 'insacc_supabase_url' && key !== 'insacc_supabase_key' && key !== 'insacc_supabase_enabled') {
        const enabled = localStorage.getItem('insacc_supabase_enabled') === 'true'
        const url = localStorage.getItem('insacc_supabase_url') || ''
        const anonKey = localStorage.getItem('insacc_supabase_key') || ''
        if (enabled && url && anonKey && (window as any).supabaseSyncInitialized) {
          import('../services/supabaseSyncService').then(({ getSupabaseClient, pushState }) => {
            const client = getSupabaseClient(url, anonKey)
            if (client) {
              pushState(client, key, state)
            }
          })
        }
      }
    } catch {}
  }, [state, key])

  // Listen to storage events (triggered by Supabase realtime listener or other tabs)
  useEffect(() => {
    const handleStorageChange = (e: any) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue) as T
          setState(parsed)
        } catch {}
      }
    }
    window.addEventListener('storage' as any, handleStorageChange)
    return () => window.removeEventListener('storage' as any, handleStorageChange)
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
