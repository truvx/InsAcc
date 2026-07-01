export interface PropAccount {
  id: string
  institution: string
  accountName: string
  accountNumber: string
  currency: string
  openingBalance: number
  accountType: 'checking' | 'savings' | 'cash' | 'credit'
  theme: string
  icon: string
  status: 'active' | 'archived' | 'closed' | 'hidden'
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

export interface PropTransaction {
  id: string
  accountId: string
  date: string
  type: 'credit' | 'debit' | 'transfer_in' | 'transfer_out'
  amount: number
  description: string
  category: string
  status: 'imported' | 'pending' | 'cleared' | 'reconciled'
  reference: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

export interface PropertyEntry {
  id: string
  name: string
  type: 'Building' | 'Villa' | 'Apartment' | 'Commercial' | 'Land'
  location: string
  purchaseDate: string
  purchaseValue: number
  currentValue: number
  status: 'Active' | 'Under Maintenance' | 'Sold'
  owner: string
  description: string
  images: string[]
  createdAt: string
  updatedAt: string
}

export interface UnitEntry {
  id: string
  propertyId: string
  unitNumber: string
  floor: string
  area: number
  bedrooms: number
  bathrooms: number
  parking: number
  status: 'Vacant' | 'Occupied' | 'Under Maintenance'
  rentAmount: number
  securityDeposit: number
  maintenanceCharge: number
  tenantId: string | null
  leaseId: string | null
  createdAt: string
  updatedAt: string
}

export interface TenantEntry {
  id: string
  name: string
  phone: string
  email: string
  nationality: string
  idNumber: string
  documents: string[]
  emergencyContact: string
  emergencyPhone: string
  notes: string
  unitId: string | null
  createdAt: string
  updatedAt: string
}

export interface LeaseEntry {
  id: string
  leaseNumber: string
  tenantId: string
  propertyId: string
  unitId: string
  startDate: string
  endDate: string
  monthlyRent: number
  annualRent: number
  deposit: number
  securityChequeNumber: string
  securityChequeDate: string
  paymentFrequency: number
  pdcCount: number
  paymentDueDay: number
  status: 'Active' | 'Expired' | 'Terminated' | 'Draft'
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface PdcCheque {
  id: string
  leaseId: string
  slotIndex: number
  chequeNumber: string
  chequeDate: string
  dueDate: string
  amount: number
  status: 'Pending' | 'Deposited' | 'Cleared' | 'Bounced' | 'Replaced' | 'Cancelled'
  depositedAt: string | null
  clearedAt: string | null
  bouncedAt: string | null
  replacedByChequeId: string | null
  voucherId: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface PropDocItem {
  id: string
  name: string
  type: string
  data: string
  docType: 'Lease' | 'Tenant ID' | 'Property Image' | 'Maintenance Invoice' | 'Utility Bill' | 'Insurance' | 'Contract'
  linkedPropertyId?: string
  linkedTenantId?: string
  linkedLeaseId?: string
  size: number
  createdAt: string
}

export interface MainCategory {
  id: string
  name: string
}

export interface PropProperty {
  id: string
  mainCategoryId: string
  name: string
}

export interface IncomeCategory {
  id: string
  propertyId: string
  name: string
}

export interface Customer {
  id: string
  incomeCategoryId: string
  name: string
}

export const PROP_TRANSACTION_CATEGORIES: { income: string[]; expense: string[] } = {
  income: [],
  expense: [],
}

export const LEASE_STATUS_OPTIONS: { value: string; label: string }[] = []

export const PAYMENT_FREQUENCY_OPTIONS: { value: number; label: string }[] = []
