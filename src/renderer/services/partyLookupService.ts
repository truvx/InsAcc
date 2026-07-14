import type { TenantEntry, LeaseEntry, PropertyEntry, UnitEntry } from '../data/propertyTypes'
import type { Vendor, MasterCustomer } from '../data/masterData'
import type { PurchaseRecord } from '../data/purchaseLedger'

export interface Party {
  id: string
  name: string
  type: string
  secondaryText: string
  phone?: string
  email?: string
  unitNumber?: string
  propertyName?: string
  code?: string
}

export class PartyLookupService {
  private tenants: TenantEntry[]
  private leases: LeaseEntry[]
  private properties: PropertyEntry[]
  private units: UnitEntry[]
  private vendors: Vendor[]
  private customers: MasterCustomer[]
  private purchaseRecords: PurchaseRecord[]

  constructor(data: {
    tenants?: TenantEntry[]
    leases?: LeaseEntry[]
    properties?: PropertyEntry[]
    units?: UnitEntry[]
    vendors?: Vendor[]
    customers?: MasterCustomer[]
    purchaseRecords?: PurchaseRecord[]
  }) {
    this.tenants = data.tenants || []
    this.leases = data.leases || []
    this.properties = data.properties || []
    this.units = data.units || []
    this.vendors = data.vendors || []
    this.customers = data.customers || []
    this.purchaseRecords = data.purchaseRecords || []
  }

  getTenants(): Party[] {
    const seen = new Set<string>()
    const parties: Party[] = []

    // 1. Get tenants with active/historical leases
    this.leases.forEach(lease => {
      const tenant = this.tenants.find(t => t.id === lease.tenantId)
      const unit = this.units.find(u => u.id === lease.unitId)
      const property = this.properties.find(p => p.id === lease.propertyId)

      const tenantName = tenant ? tenant.name : `Tenant (Lease ${lease.leaseNumber})`
      const unitNum = unit ? unit.unitNumber : 'Unknown Unit'
      const propName = property ? property.name : 'Unknown Property'

      if (tenantName && !seen.has(tenantName.toLowerCase())) {
        seen.add(tenantName.toLowerCase())
        parties.push({
          id: lease.tenantId,
          name: tenantName,
          type: lease.status === 'Active' ? 'Active Tenant' : 'Historical Tenant',
          secondaryText: `${unitNum} • ${propName}`,
          phone: tenant?.phone,
          email: tenant?.email,
          unitNumber: unitNum,
          propertyName: propName,
        })
      }
    })

    // 2. Get any other tenants from the tenants list
    this.tenants.forEach(t => {
      if (!seen.has(t.name.toLowerCase())) {
        seen.add(t.name.toLowerCase())
        parties.push({
          id: t.id,
          name: t.name,
          type: 'Tenant',
          secondaryText: 'Tenant',
          phone: t.phone,
          email: t.email,
        })
      }
    })

    return parties
  }

  getBuyers(): Party[] {
    const seen = new Set<string>()
    const parties: Party[] = []

    // Extract unique buyers from purchase records (where we bought/sold assets)
    this.purchaseRecords.forEach(p => {
      if (p.buyer && !seen.has(p.buyer.toLowerCase())) {
        seen.add(p.buyer.toLowerCase())
        parties.push({
          id: `buyer-pur-${p.buyer}`,
          name: p.buyer,
          type: 'Asset Buyer',
          secondaryText: 'From Purchase Ledger',
        })
      }
    })

    // Get buyers from master customers
    this.customers.forEach(c => {
      if (!seen.has(c.name.toLowerCase())) {
        seen.add(c.name.toLowerCase())
        parties.push({
          id: c.id,
          name: c.name,
          type: 'Buyer',
          secondaryText: c.code || 'Customer',
          phone: c.phone,
          email: c.email,
          code: c.code,
        })
      }
    })

    return parties
  }

  getSuppliers(): Party[] {
    const seen = new Set<string>()
    const parties: Party[] = []

    // Extract unique suppliers from purchase records (the counterparties/buyers from whom we purchased assets)
    this.purchaseRecords.forEach(p => {
      if (p.buyer && !seen.has(p.buyer.toLowerCase())) {
        seen.add(p.buyer.toLowerCase())
        parties.push({
          id: `supplier-pur-${p.buyer}`,
          name: p.buyer,
          type: 'Asset Supplier',
          secondaryText: 'From Purchase Ledger',
        })
      }
    })

    // Get suppliers from master vendors
    this.vendors.forEach(v => {
      if (!seen.has(v.name.toLowerCase())) {
        seen.add(v.name.toLowerCase())
        parties.push({
          id: v.id,
          name: v.name,
          type: 'Supplier',
          secondaryText: v.code || 'Vendor',
          phone: v.phone,
          email: v.email,
          code: v.code,
        })
      }
    })

    return parties
  }

  getVendors(): Party[] {
    return this.getSuppliers()
  }

  getReceiptParties(module: 'property' | 'investment'): Party[] {
    if (module === 'property') {
      const tenantParties = this.getTenants()
      const buyerParties = this.getBuyers().map(b => ({
        ...b,
        type: 'Buyer',
      }))
      return [...tenantParties, ...buyerParties]
    } else {
      const buyerParties = this.getBuyers().map(b => ({
        ...b,
        type: 'Buyer / Counterparty',
      }))
      return buyerParties
    }
  }

  getPaymentParties(module: 'property' | 'investment'): Party[] {
    if (module === 'property') {
      return this.getVendors().map(v => ({
        ...v,
        type: 'Vendor / Provider',
      }))
    } else {
      return this.getSuppliers().map(s => ({
        ...s,
        type: 'Supplier / Buyer',
      }))
    }
  }
}
