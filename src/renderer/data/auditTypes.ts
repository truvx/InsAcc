export type AuditModule =
  | 'Investments'
  | 'Property'
  | 'Property Reports'
  | 'Property Transactions'
  | 'Property Bank Accounts'
  | 'Property Documents'
  | 'Property Settings'
  | 'Property Hierarchy'
  | 'Lease Management'
  | 'PDC Manager'
  | 'Tenant Management'
  | 'Purchase Ledger'
  | 'Transactions'
  | 'Accounting'
  | 'Bank Accounts'
  | 'Documents'
  | 'Reports'
  | 'Settings'

export type AuditAction =
  | 'Create'
  | 'Update'
  | 'Delete'
  | 'Import'
  | 'Export'
  | 'Upload'
  | 'Download'
  | 'Transfer'
  | 'Login'
  | 'Logout'
  | 'System'

export type AuditSeverity = 'Info' | 'Warning' | 'Critical'

export interface AuditEvent {
  id: string
  timestamp: string
  module: AuditModule
  action: AuditAction
  entityName: string
  entityId: string
  description: string
  user: string
  icon: string
  severity: AuditSeverity
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}
