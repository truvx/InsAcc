import type { AuditEvent, AuditModule, AuditAction, AuditSeverity } from '../data/auditTypes'

let _auditCounter = 0

export function nextAuditId(): string {
  _auditCounter++
  return `AUD-${String(_auditCounter).padStart(4, '0')}`
}

export function createAuditEvent(
  module: AuditModule,
  action: AuditAction,
  entityName: string,
  entityId: string,
  description: string,
  severity: AuditSeverity = 'Info',
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
  user = 'Admin',
): AuditEvent {
  const iconMap: Record<string, string> = {
    Create: '➕',
    Update: '✏️',
    Delete: '🗑️',
    Import: '📥',
    Export: '📤',
    Upload: '⬆️',
    Download: '⬇️',
    Transfer: '🔄',
    Login: '🔑',
    Logout: '🚪',
    System: '⚙️',
  }

  return {
    id: nextAuditId(),
    timestamp: new Date().toISOString(),
    module,
    action,
    entityName,
    entityId,
    description,
    user,
    icon: iconMap[action] || '📋',
    severity,
    ...(before ? { before } : {}),
    ...(after ? { after } : {}),
  }
}

export function recordModuleEvent(
  module: AuditModule,
  action: AuditAction,
  entityName: string,
  entityId: string,
  description: string,
  severity?: AuditSeverity,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): AuditEvent {
  return createAuditEvent(module, action, entityName, entityId, description, severity, before, after)
}
