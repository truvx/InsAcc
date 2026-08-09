export interface PropAccount {
  id: string
  institution: string
  accountNumber?: string
  currency: string
  openingBalance: number
  theme: string
  icon: string
  status: 'active' | 'archived' | 'closed' | 'hidden'
  iban?: string
  swift?: string
  branch?: string
  chartAccountId?: string
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
  paymentMode?: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Post Dated Cheque (PDC)' | 'Online Transfer' | 'Card' | 'Other'
  paymentChannel?: 'Bank Account' | 'Cash In Hand'
  paymentReference?: string
  tags?: string[]
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
  nationality?: string
  passportNumber?: string
  emiratesId?: string
  dateOfBirth?: string
  occupation?: string
  company?: string
  documents: string[]
  emiratesIdDoc?: string
  passportDoc?: string
  visaDoc?: string
  drivingLicenseDoc?: string
  otherDocuments?: string[]
  emergencyContact: string
  emergencyPhone: string
  emergencyRelationship?: string
  country?: string
  city?: string
  address?: string
  notes: string
  status?: 'Active' | 'Inactive'
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
  /** @deprecated Use modeOfPayment. Kept for backward compatibility with stored leases. */
  paymentFrequency?: string | number
  modeOfPayment?: string
  pdcCount: number
  paymentDueDay: number
  status: 'Active' | 'Expired' | 'Terminated' | 'Draft'
  createdBy: string
  createdAt: string
  updatedAt: string
  buyer?: string
  notes?: string
  tags?: string[]
  amountReceived?: number
  paymentStatus?: 'Pending' | 'Partially Paid' | 'Paid in Full'
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
  depositedVoucherId?: string | null
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

export interface PropertyDocument {
  id: string
  propertyId: string
  fileName: string
  originalFileName: string
  fileExtension: string
  mimeType: string
  fileSize: number
  uploadDate: string
  uploadedBy: string
  notes: string
  storagePath: string
}

export interface MainCategory {
  id: string
  name: string
}

export const DEFAULT_MAIN_CATEGORIES: MainCategory[] = [
  { id: 'mc-building',  name: 'Building'   },
  { id: 'mc-villa',     name: 'Villa'      },
  { id: 'mc-apartment', name: 'Apartment'  },
]

export function getDefaultMainCategories(): MainCategory[] {
  return DEFAULT_MAIN_CATEGORIES.map(c => ({ ...c }))
}

export interface PropProperty {
  id: string
  mainCategoryId: string
  name: string
}

export function getDefaultHierarchyProperties(): PropProperty[] {
  return [
    { id: 'prop-fatma', mainCategoryId: 'mc-building', name: 'Fatma Ibrahim Moosa - Ajman' },
    { id: 'prop-b2', mainCategoryId: 'mc-building', name: 'Building 2' },
    { id: 'prop-b3', mainCategoryId: 'mc-building', name: 'Building 3' },
    { id: 'prop-b4', mainCategoryId: 'mc-building', name: 'Building 4' },
    { id: 'prop-b5', mainCategoryId: 'mc-building', name: 'Building 5' },
  ]
}

export interface IncomeCategory {
  id: string
  propertyId: string
  name: string
}

export function getDefaultIncomeCategories(): IncomeCategory[] {
  return [
    // Fatma Ibrahim Moosa - Ajman
    { id: 'ic-unit-rent-prop-fatma', propertyId: 'prop-fatma', name: 'Unit Rent' },
    { id: 'ic-shop-rent-prop-fatma', propertyId: 'prop-fatma', name: 'Shop Rent' },
    { id: 'ic-parking-rent-prop-fatma', propertyId: 'prop-fatma', name: 'Parking and Rent Contract' },
    { id: 'ic-oasis-rent-prop-fatma', propertyId: 'prop-fatma', name: 'Oasis Ajman Store' },
    // Building 2
    { id: 'ic-unit-rent-prop-b2', propertyId: 'prop-b2', name: 'Unit Rent' },
    { id: 'ic-shop-rent-prop-b2', propertyId: 'prop-b2', name: 'Shop Rent' },
    { id: 'ic-parking-rent-prop-b2', propertyId: 'prop-b2', name: 'Parking Unit Rent' },
    // Building 3
    { id: 'ic-unit-rent-prop-b3', propertyId: 'prop-b3', name: 'Unit Rent' },
    { id: 'ic-shop-rent-prop-b3', propertyId: 'prop-b3', name: 'Shop Rent' },
    { id: 'ic-parking-rent-prop-b3', propertyId: 'prop-b3', name: 'Parking Unit Rent' },
    // Building 4
    { id: 'ic-unit-rent-prop-b4', propertyId: 'prop-b4', name: 'Unit Rent' },
    { id: 'ic-shop-rent-prop-b4', propertyId: 'prop-b4', name: 'Shop Rent' },
    { id: 'ic-parking-rent-prop-b4', propertyId: 'prop-b4', name: 'Parking Unit Rent' },
    // Building 5
    { id: 'ic-unit-rent-prop-b5', propertyId: 'prop-b5', name: 'Unit Rent' },
    { id: 'ic-shop-rent-prop-b5', propertyId: 'prop-b5', name: 'Shop Rent' },
    { id: 'ic-parking-rent-prop-b5', propertyId: 'prop-b5', name: 'Parking Unit Rent' },
  ]
}

export interface Customer {
  id: string
  incomeCategoryId: string
  name: string
}

export function getDefaultCustomers(): Customer[] {
  const list: Customer[] = []
  
  // Under Fatma Ibrahim Moosa - Ajman -> Unit Rent
  for (let floor = 1; floor <= 5; floor++) {
    for (let room = 1; room <= 10; room++) {
      const roomStr = String(room).padStart(2, '0')
      const num = `${floor}${roomStr}`
      list.push({
        id: `cust-fatma-u${num}`,
        incomeCategoryId: 'ic-unit-rent-prop-fatma',
        name: `Unit ${num} Ajman`
      })
    }
  }

  // Under Fatma Ibrahim Moosa - Ajman -> Parking and Rent Contract
  for (let p = 1; p <= 12; p++) {
    list.push({
      id: `cust-fatma-parking-${p}`,
      incomeCategoryId: 'ic-parking-rent-prop-fatma',
      name: `Parking ${p}`
    })
  }

  // Under Fatma Ibrahim Moosa - Ajman -> Shop Rent
  for (let shop = 1; shop <= 5; shop++) {
    list.push({
      id: `cust-fatma-shop-${shop}`,
      incomeCategoryId: 'ic-shop-rent-prop-fatma',
      name: `Shop ${shop} Ajman`
    })
  }

  return list
}

export const PROP_TRANSACTION_CATEGORIES: { income: string[]; expense: string[] } = {
  income: [],
  expense: [],
}

export const LEASE_STATUS_OPTIONS: { value: string; label: string }[] = []

export const PAYMENT_FREQUENCY_OPTIONS = [
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Every 4 Months', label: 'Every 4 Months' },
  { value: 'Semi-Annual', label: 'Semi-Annual' },
  { value: 'Annual', label: 'Annual' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Bi-Weekly', label: 'Bi-Weekly' },
  { value: 'Custom', label: 'Custom' }
]

/** Payment modes for Mode of Payment field in Lease Management */
export const MODE_OF_PAYMENT_OPTIONS = [
  { value: 'Post-Dated Cheques (PDC)', label: 'Post-Dated Cheques (PDC)' },
  { value: 'Cheque',                   label: 'Cheque' },
  { value: 'Bank Transfer',            label: 'Bank Transfer' },
  { value: 'Cash',                     label: 'Cash' },
]

export const PDC_MODE = 'Post-Dated Cheques (PDC)'

export function getPaymentFrequencyCount(freq: string | number | undefined): number {
  if (!freq) return 12
  if (typeof freq === 'number') return freq
  const f = freq.toLowerCase().trim()
  if (f === 'monthly') return 12
  if (f === 'quarterly') return 4
  if (f === 'every 4 months') return 3
  if (f === 'semi-annual') return 2
  if (f === 'annual') return 1
  if (f === 'weekly') return 52
  if (f === 'bi-weekly') return 26
  const num = parseInt(freq, 10)
  if (!isNaN(num)) return num
  return 12
}

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
  paymentMode?: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Post Dated Cheque (PDC)' | 'Online Transfer' | 'Card' | 'Other'
  paymentChannel?: 'Bank Account' | 'Cash In Hand'
  paymentReference?: string
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

export interface PropertyTransactionCategory {
  id: string
  name: string
  type: 'credit' | 'debit' // credit = Income, debit = Expense
  isActive: boolean
  createdAt: string
  updatedAt: string
  isCustom: boolean
}

export function getDefaultPropertyTransactionCategories(): PropertyTransactionCategory[] {
  const incomes = [
    'Building Rental Income', 'Villa Rental Income', 'Apartment Rental Income', 'Advance Rent', 'Lease Renewal Income',
    'Parking Rent', 'Maintenance Recovery', 'Service Charges', 'Late Payment Charges',
    'Utility Recovery', 'Common Area Charges', 'Advertisement Income', 'Commission Income',
    'Interest Income', 'Miscellaneous Income', 'Other Income'
  ]
  const expenses = [
    'Repair Expense', 'Property Repairs', 'Electrical Works', 'Plumbing',
    'HVAC Maintenance', 'Cleaning Services', 'Security Services', 'Landscaping',
    'Utility Bills', 'Water Bills', 'Electricity Bills', 'Internet', 'Insurance',
    'Municipality Fees', 'Property Tax', 'Management Fees', 'Staff Salary',
    'Office Expenses', 'Marketing', 'Legal Expenses', 'Bank Charges', 'Refund to Tenant',
    'Miscellaneous Expense',
    // Property specific:
    'Security Deposit Refund', 'Rent Refund', 'Vacancy Expense', 'Fit-out Expense', 'Renovation'
  ]
  
  const nowStr = new Date().toISOString()
  const result: PropertyTransactionCategory[] = []
  
  incomes.forEach((name, idx) => {
    result.push({
      id: `ptcat-in-${idx}`,
      name,
      type: 'credit',
      isActive: true,
      createdAt: nowStr,
      updatedAt: nowStr,
      isCustom: false
    })
  })
  
  expenses.forEach((name, idx) => {
    result.push({
      id: `ptcat-ex-${idx}`,
      name,
      type: 'debit',
      isActive: true,
      createdAt: nowStr,
      updatedAt: nowStr,
      isCustom: false
    })
  })
  
  return result
}

export interface PropertyExpense {
  id: string
  expenseNo: string
  date: string
  propertyId: string
  unitId?: string | null
  category: string
  paidTo: string
  description: string
  amount: number
  tax?: number
  totalAmount: number
  paymentMethod: 'Cash In Hand' | 'Bank Transfer' | 'Cheque'
  bankAccountId?: string | null
  referenceNumber?: string
  notes?: string
  paymentMode?: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Post Dated Cheque (PDC)' | 'Online Transfer' | 'Card' | 'Other'
  paymentChannel?: 'Bank Account' | 'Cash In Hand'
  paymentReference?: string
  status: 'Paid' | 'Pending'
  voucherId?: string | null
  vendorId?: string | null
  createdAt: string
  updatedAt: string
}

export interface VendorEntry {
  id: string
  name: string
  category: string
  contactPerson?: string
  phone?: string
  email?: string
  trn?: string
  address?: string
  bankDetails?: string
  notes?: string
  status: 'Active' | 'Inactive'
  createdAt: string
  updatedAt: string
}

export const DEFAULT_VENDOR_CATEGORIES = [
  'Engineering Consultant',
  'Government Agency',
  'Utility Provider',
  'Maintenance Contractor',
  'Legal Service',
  'Insurance Provider',
  'Building Material Supplier',
  'Cleaning Service',
  'Security Service',
  'IT / Telecom',
  'Interior Design',
  'Plumbing',
  'Electrical',
  'HVAC',
  'Other',
]
