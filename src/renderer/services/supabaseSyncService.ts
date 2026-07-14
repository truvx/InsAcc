import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null
let currentUrl = ''
let currentKey = ''

export function getSupabaseClient(url: string, anonKey: string): SupabaseClient | null {
  if (!url || !anonKey) {
    supabaseInstance = null
    return null
  }
  if (supabaseInstance && url === currentUrl && anonKey === currentKey) {
    return supabaseInstance
  }
  try {
    supabaseInstance = createClient(url, anonKey, {
      auth: { persistSession: false }
    })
    currentUrl = url
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

export async function pushState(client: SupabaseClient, key: string, value: any): Promise<boolean> {
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
      return false
    }
    return true
  } catch (e) {
    console.error(`Exception pushing state for ${key}:`, e)
    return false
  }
}

export async function pullAllStates(client: SupabaseClient): Promise<SyncRecord[]> {
  try {
    const { data, error } = await client
      .from('app_sync_state')
      .select('*')
    
    if (error) {
      console.error('Error pulling all states:', error)
      return []
    }
    return data || []
  } catch (e) {
    console.error('Exception pulling all states:', e)
    return []
  }
}

export async function pushAllLocalData(url: string, anonKey: string): Promise<boolean> {
  const client = getSupabaseClient(url, anonKey)
  if (!client) return false

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (
        key &&
        key.startsWith('insacc_') &&
        key !== 'insacc_supabase_url' &&
        key !== 'insacc_supabase_key' &&
        key !== 'insacc_supabase_enabled'
      ) {
        const valStr = localStorage.getItem(key)
        if (valStr) {
          try {
            await pushState(client, key, JSON.parse(valStr))
          } catch (err) {
            console.error(`Failed to push single key ${key}:`, err)
          }
        }
      }
    }
    return true
  } catch (e) {
    console.error('Failed to push all local data:', e)
    return false
  }
}
