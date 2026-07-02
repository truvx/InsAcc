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

export interface PdcAuditEntry {
  timestamp: string
  previousState: string
  newState: string
  user: string
  reason?: string
  voucherId?: string | null
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
  bankAccountId?: string | null
  bounceReason?: string | null
  bounceFee?: number | null
  penaltyAmount?: number | null
  clearedVoucherId?: string | null
  bouncedVoucherId?: string | null
  feeVoucherId?: string | null
  penaltyVoucherId?: string | null
  auditHistory?: PdcAuditEntry[]
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

export type SecurityDepositStatus =
  | 'Expected'
  | 'Received'
  | 'Held'
  | 'Partially Refunded'
  | 'Fully Refunded'
  | 'Partially Forfeited'
  | 'Fully Forfeited'
  | 'Closed'

export type SecurityDepositTxType =
  | 'Charge'      // Expected amount (initial or top-up)
  | 'Receipt'     // Collected payment
  | 'Refund'      // Returned to tenant
  | 'Forfeit'     // Transferred to other income
  | 'Adjustment'  // Manual correction/transfer

export interface SecurityDepositTransaction {
  id: string
  depositId: string
  type: SecurityDepositTxType
  amount: number
  date: string
  bankAccountId?: string | null     // bank account for receipts/refunds
  voucherId?: string | null         // linked GL voucher
  notes?: string
  status: 'Draft' | 'Posted' | 'Cancelled'
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface SecurityDepositAuditEntry {
  timestamp: string
  previousStatus: SecurityDepositStatus
  newStatus: SecurityDepositStatus
  user: string
  amount?: number
  notes?: string
  voucherId?: string | null
}

export interface SecurityDeposit {
  id: string
  leaseId: string
  tenantId: string
  status: SecurityDepositStatus
  createdBy: string
  createdAt: string
  updatedAt: string
  transactions: SecurityDepositTransaction[]
  auditHistory: SecurityDepositAuditEntry[]
}

export interface SecurityDepositGlMappings {
  liabilityAccountId: string        // GL account for Dr/Cr Security Deposit Liability
  forfeitureIncomeAccountId: string // GL account for Cr Deposit Forfeiture Income
}

