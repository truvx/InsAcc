import type { TenantEntry } from '../data/propertyTypes'

export function createTenant(
  setTenants: React.Dispatch<React.SetStateAction<TenantEntry[]>>,
  data: Omit<TenantEntry, 'id' | 'createdAt' | 'updatedAt'>
): TenantEntry {
  const now = new Date().toISOString()
  const tenant: TenantEntry = {
    ...data,
    id: `ten-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  }
  setTenants(prev => [...prev, tenant])
  return tenant
}

export function updateTenant(
  setTenants: React.Dispatch<React.SetStateAction<TenantEntry[]>>,
  id: string,
  data: Partial<Omit<TenantEntry, 'id' | 'createdAt'>>
): TenantEntry | undefined {
  const now = new Date().toISOString()
  let updated: TenantEntry | undefined
  setTenants(prev => {
    const next = prev.map(t => {
      if (t.id === id) {
        updated = { ...t, ...data, updatedAt: now }
        return updated
      }
      return t
    })
    return next
  })
  return updated
}

export function deleteTenant(
  setTenants: React.Dispatch<React.SetStateAction<TenantEntry[]>>,
  id: string
): void {
  setTenants(prev => prev.filter(t => t.id !== id))
}

export function getTenant(
  tenants: TenantEntry[],
  id: string
): TenantEntry | undefined {
  return tenants.find(t => t.id === id)
}

export function searchTenants(
  tenants: TenantEntry[],
  query: string
): TenantEntry[] {
  if (!query.trim()) return tenants
  const q = query.toLowerCase()
  return tenants.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.phone.toLowerCase().includes(q) ||
    t.email.toLowerCase().includes(q) ||
    (t.passportNumber || '').toLowerCase().includes(q) ||
    (t.emiratesId || '').toLowerCase().includes(q) ||
    (t.company || '').toLowerCase().includes(q) ||
    (t.nationality || '').toLowerCase().includes(q)
  )
}
