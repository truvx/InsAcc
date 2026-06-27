export interface PropertyCategory {
  id: string
  name: string
}

export interface PropertyBuilding {
  id: string
  categoryId: string
  name: string
}

export type UnitType = 'unit-rent' | 'shop-rent' | 'parking-rent'

export interface PropertyUnit {
  id: string
  buildingId: string
  name: string
  type: UnitType
  monthlyRent: number
  customerId: string | null
  status: 'vacant' | 'occupied'
}

export interface PropertyTenant {
  id: string
  name: string
  phone: string
  email: string
  unitId: string
  leaseStart: string
  leaseEnd: string
  contractAmount: number
  paymentMode: 'cash' | 'cheque' | 'online'
  securityCheque?: string
  pdcCheque?: string
  isPaid: boolean
  invoiceGenerated: boolean
  contractFile?: { name: string; data: string; type: string }
}

export interface RentPayment {
  id: string
  unitId: string
  tenantId: string
  date: string
  amount: number
  month: string
  status: 'paid' | 'pending' | 'overdue'
  paymentMode: 'cash' | 'cheque' | 'online'
  creditedTo: 'cash' | 'cheque'
  securityCheque?: string
  pdcCheque?: string
  notes?: string
}

export const DEFAULT_PROPERTY_CATEGORIES: PropertyCategory[] = [
  { id: 'building', name: 'Building' },
  { id: 'villa', name: 'Villa' },
  { id: 'apartment', name: 'Apartment' },
]

export const DEFAULT_PROPERTY_BUILDINGS: PropertyBuilding[] = [
  { id: 'bldg-fatma', categoryId: 'building', name: 'Fatma Ibrahim Moosa - Ajman' },
  { id: 'bldg-2', categoryId: 'building', name: 'Building 2' },
  { id: 'bldg-3', categoryId: 'building', name: 'Building 3' },
  { id: 'bldg-4', categoryId: 'building', name: 'Building 4' },
  { id: 'bldg-5', categoryId: 'building', name: 'Building 5' },
  { id: 'villa-1', categoryId: 'villa', name: 'Villa 1' },
  { id: 'villa-2', categoryId: 'villa', name: 'Villa 2' },
  { id: 'villa-3', categoryId: 'villa', name: 'Villa 3' },
  { id: 'apt-1', categoryId: 'apartment', name: 'Apartment 1' },
  { id: 'apt-2', categoryId: 'apartment', name: 'Apartment 2' },
  { id: 'apt-3', categoryId: 'apartment', name: 'Apartment 3' },
]

function generateUnits(): PropertyUnit[] {
  const units: PropertyUnit[] = []

  for (let b = 2; b <= 5; b++) {
    units.push({
      id: `bldg-${b}-unit`,
      buildingId: `bldg-${b}`,
      name: `Unit A`,
      type: 'unit-rent',
      monthlyRent: 0,
      customerId: null,
      status: 'vacant',
    })
  }

  for (let v = 1; v <= 3; v++) {
    units.push({
      id: `villa-${v}-rent`,
      buildingId: `villa-${v}`,
      name: `Villa ${v}`,
      type: 'unit-rent',
      monthlyRent: 0,
      customerId: null,
      status: 'vacant',
    })
  }

  for (let a = 1; a <= 3; a++) {
    units.push({
      id: `apt-${a}-unit`,
      buildingId: `apt-${a}`,
      name: `Apartment ${a}`,
      type: 'unit-rent',
      monthlyRent: 0,
      customerId: null,
      status: 'vacant',
    })
  }

  return units
}

export const DEFAULT_PROPERTY_UNITS: PropertyUnit[] = generateUnits()
export const DEFAULT_PROPERTY_TENANTS: PropertyTenant[] = []
export const DEFAULT_RENT_PAYMENTS: RentPayment[] = []
