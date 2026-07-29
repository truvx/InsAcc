import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null
let currentUrl = ''
let currentKey = ''

export function getSupabaseClient(url: string, anonKey: string): SupabaseClient | null {
  if (!url || !anonKey) {
    supabaseInstance = null
    return null
  }
  
  // Auto-clean URL by removing trailing REST paths if pasted directly
  const cleanUrl = url.trim().replace(/\/rest\/v1\/?$/, '')

  if (supabaseInstance && cleanUrl === currentUrl && anonKey === currentKey) {
    return supabaseInstance
  }
  try {
    supabaseInstance = createClient(cleanUrl, anonKey, {
      auth: { persistSession: false }
    })
    currentUrl = cleanUrl
    currentKey = anonKey
    return supabaseInstance
  } catch (e) {
    console.error('Failed to initialize Supabase client:', e)
    return null
  }
}

export function resetSupabaseClient() {
  supabaseInstance = null
  currentUrl = ''
  currentKey = ''
}

export interface SyncRecord {
  key: string
  value: any
  updated_at?: string
}

export async function pushState(client: SupabaseClient, key: string, value: any): Promise<{ success: boolean, error?: string }> {
  try {
    const { error } = await client
      .from('app_sync_state')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })

    if (error) {
      console.error(`Error pushing state for ${key}:`, error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (e: any) {
    console.error(`Exception pushing state for ${key}:`, e)
    return { success: false, error: e?.message || 'Unknown exception' }
  }
}

export async function pullAllStates(client: SupabaseClient): Promise<SyncRecord[] | null> {
  try {
    const pullPromise = client.from('app_sync_state').select('*')
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 30000))
    
    const result = await Promise.race([pullPromise, timeoutPromise])
    
    if (result === null) {
      console.error('Timeout pulling all states')
      return null
    }

    const { data, error } = result
    
    if (error) {
      console.error('Error pulling all states:', error)
      return null
    }
    return data || []
  } catch (e) {
    console.error('Exception pulling all states:', e)
    return null
  }
}

export async function pushAllLocalData(url: string, anonKey: string): Promise<{ success: boolean, error?: string }> {
  const client = getSupabaseClient(url, anonKey)
  if (!client) return { success: false, error: 'Failed to initialize Supabase client. Check URL and Key.' }

  try {
    let allSuccess = true
    let lastError = ''
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (
        key &&
        key.startsWith('insacc_') &&
        key !== 'insacc_supabase_url' &&
        key !== 'insacc_supabase_key' &&
        key !== 'insacc_supabase_enabled' &&
        key !== 'insacc_supabase_status'
      ) {
        const valStr = localStorage.getItem(key)
        if (valStr) {
          try {
            const parsedVal = JSON.parse(valStr)
            window.dispatchEvent(new CustomEvent('insacc-sync-start', { detail: { key } }))
            const result = await pushState(client, key, parsedVal)
            window.dispatchEvent(new CustomEvent('insacc-sync-end', { detail: { key, success: result.success } }))
            if (!result.success) {
              allSuccess = false
              lastError = result.error || 'Unknown error'
            } else {
              localStorage.removeItem(`insacc_dirty_${key}`)
            }
          } catch (err: any) {
            console.error(`Failed to push single key ${key}:`, err)
            window.dispatchEvent(new CustomEvent('insacc-sync-end', { detail: { key, success: false } }))
            allSuccess = false
            lastError = err?.message || 'Exception occurred'
          }
        }
      }
    }
    return { success: allSuccess, error: lastError }
  } catch (e: any) {
    console.error('Failed to push all local data:', e)
    return { success: false, error: e?.message || 'Fatal exception' }
  }
}
