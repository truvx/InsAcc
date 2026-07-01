import type { Account, Voucher } from '../accounting/types'
import type { AuditEvent } from '../data/auditTypes'

export type HistoryFilter = 'all' | 'vouchers' | 'audit'

export interface HistoryEntry {
  id: string
  date: string
  type: 'voucher_created' | 'voucher_approved' | 'voucher_posted' | 'audit_event'
  description: string
  source: string
  amount: number
  user: string
  voucherNumber: string
}

export interface HistoryGroup {
  date: string
  entries: HistoryEntry[]
}

export interface HistoryProjection {
  allEntries: HistoryEntry[]
  groupedByDate: HistoryGroup[]
  voucherCount: number
  auditCount: number
  postedVoucherCount: number
}

export function getHistoryProjection(
  vouchers: Voucher[],
  auditEvents: AuditEvent[],
): HistoryProjection {
  const voucherEntries: HistoryEntry[] = []

  for (const v of vouchers.filter(v => v.status === 'Posted')) {
    voucherEntries.push({
      id: `${v.id}-created`,
      date: v.createdAt,
      type: 'voucher_created',
      description: `Voucher ${v.number} created: ${v.description}`,
      source: v.type,
      amount: v.lines.reduce((s, l) => s + l.baseAmount, 0) / 2,
      user: v.createdBy,
      voucherNumber: v.number,
    })

    if (v.approvedAt) {
      voucherEntries.push({
        id: `${v.id}-approved`,
        date: v.approvedAt,
        type: 'voucher_approved',
        description: `Voucher ${v.number} approved`,
        source: v.type,
        amount: 0,
        user: v.approvedBy || 'system',
        voucherNumber: v.number,
      })
    }

    if (v.postedAt) {
      voucherEntries.push({
        id: `${v.id}-posted`,
        date: v.postedAt,
        type: 'voucher_posted',
        description: `Voucher ${v.number} posted to ledger`,
        source: v.type,
        amount: v.lines.reduce((s, l) => s + l.baseAmount, 0) / 2,
        user: v.postedBy || 'system',
        voucherNumber: v.number,
      })
    }
  }

  const auditEntries: HistoryEntry[] = auditEvents.map(e => ({
    id: e.id,
    date: e.timestamp,
    type: 'audit_event' as const,
    description: `${e.action}: ${e.description}`,
    source: e.module,
    amount: 0,
    user: e.user || 'system',
    voucherNumber: '',
  }))

  const allEntries = [...voucherEntries, ...auditEntries]
    .sort((a, b) => b.date.localeCompare(a.date))

  const groupMap = new Map<string, HistoryEntry[]>()
  for (const entry of allEntries) {
    const dateKey = entry.date.substring(0, 10)
    if (!groupMap.has(dateKey)) groupMap.set(dateKey, [])
    groupMap.get(dateKey)!.push(entry)
  }
  const groupedByDate = Array.from(groupMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, entries]) => ({ date, entries }))

  return {
    allEntries,
    groupedByDate,
    voucherCount: voucherEntries.length,
    auditCount: auditEntries.length,
    postedVoucherCount: vouchers.filter(v => v.status === 'Posted').length,
  }
}

export function filterHistory(
  projection: HistoryProjection,
  filter: 'all' | 'vouchers' | 'audit',
  searchQuery: string,
): HistoryGroup[] {
  let filtered = projection.allEntries

  if (filter === 'vouchers') {
    filtered = filtered.filter(e => e.type !== 'audit_event')
  } else if (filter === 'audit') {
    filtered = filtered.filter(e => e.type === 'audit_event')
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter(e =>
      e.description.toLowerCase().includes(q) ||
      e.source.toLowerCase().includes(q) ||
      e.voucherNumber.toLowerCase().includes(q)
    )
  }

  const groupMap = new Map<string, HistoryEntry[]>()
  for (const entry of filtered) {
    const dateKey = entry.date.substring(0, 10)
    if (!groupMap.has(dateKey)) groupMap.set(dateKey, [])
    groupMap.get(dateKey)!.push(entry)
  }
  return Array.from(groupMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, entries]) => ({ date, entries }))
}
