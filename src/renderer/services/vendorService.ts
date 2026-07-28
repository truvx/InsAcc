import type { VendorEntry } from '../data/propertyTypes'

export function createVendor(
  setVendors: React.Dispatch<React.SetStateAction<VendorEntry[]>>,
  data: Omit<VendorEntry, 'id' | 'createdAt' | 'updatedAt'>
): VendorEntry {
  const now = new Date().toISOString()
  const vendor: VendorEntry = {
    ...data,
    id: `ven-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  }
  setVendors(prev => [...prev, vendor])
  return vendor
}

export function updateVendor(
  setVendors: React.Dispatch<React.SetStateAction<VendorEntry[]>>,
  id: string,
  data: Partial<Omit<VendorEntry, 'id' | 'createdAt'>>
): VendorEntry | undefined {
  const now = new Date().toISOString()
  let updated: VendorEntry | undefined
  setVendors(prev => {
    const next = prev.map(v => {
      if (v.id === id) {
        updated = { ...v, ...data, updatedAt: now }
        return updated
      }
      return v
    })
    return next
  })
  return updated
}

export function deleteVendor(
  setVendors: React.Dispatch<React.SetStateAction<VendorEntry[]>>,
  id: string
): void {
  setVendors(prev => prev.filter(v => v.id !== id))
}

export function getVendor(
  vendors: VendorEntry[],
  id: string
): VendorEntry | undefined {
  return vendors.find(v => v.id === id)
}

export function searchVendors(
  vendors: VendorEntry[],
  query: string
): VendorEntry[] {
  if (!query.trim()) return vendors
  const q = query.toLowerCase()
  return vendors.filter(v =>
    (v?.name || '').toLowerCase().includes(q) ||
    (v?.category || '').toLowerCase().includes(q) ||
    (v?.contactPerson || '').toLowerCase().includes(q) ||
    (v?.phone || '').toLowerCase().includes(q) ||
    (v?.email || '').toLowerCase().includes(q) ||
    (v?.trn || '').toLowerCase().includes(q) ||
    (v?.notes || '').toLowerCase().includes(q)
  )
}
