import React, { useMemo } from 'react'
import type { Account, Voucher, VoucherLine } from '../accounting/types'
import { getLinesForAccount, getLinesForAccounts } from '../accounting/ledgerService'
import { formatDate } from '../utils'

interface Props {
  accountId: string
  accountIds?: string[]
  accountName?: string
  accounts: Account[]
  vouchers: Voucher[]
  currency?: string
  dateFormat?: string
}

function fmt(n: number, sym: string) {
  return `${sym} ${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
}

type LineWithVoucher = {
  line: VoucherLine
  voucher: Voucher
}

export default function AccountDrillDown({
  accountId, accountIds,
  accountName,
  accounts, vouchers,
  currency = 'AED', dateFormat = 'DD/MM/YYYY',
}: Props) {
  const lines = useMemo<LineWithVoucher[]>(() => {
    if (accountIds && accountIds.length > 0) {
      return getLinesForAccounts(accountIds, vouchers)
    }
    const acct = accounts.find(a => a.id === accountId)
    if (acct) {
      const children = accounts.filter(a => a.parentId === acct.id && a.isActive)
      if (children.length > 0) {
        return getLinesForAccounts([accountId, ...children.map(c => c.id)], vouchers)
      }
    }
    return getLinesForAccount(accountId, vouchers)
  }, [accountId, accountIds, vouchers, accounts])

  const total = useMemo(() => {
    return lines.reduce((s, { line }) => {
      return line.type === 'Debit' ? s + line.baseAmount : s - line.baseAmount
    }, 0)
  }, [lines])

  const parentAcct = accounts.find(a => a.id === accountId)
  const acctName = accountName || parentAcct?.name || accountId

  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts])
  const getBankName = (lineAccountId: string): string => {
    const acct = accountMap.get(lineAccountId)
    if (!acct) return 'Unknown Bank'
    if (!acct.code.startsWith('1120') || acct.code.length < 6) return '—'
    return acct.name
  }

  if (lines.length === 0) {
    return (
      <div style={{ minWidth: 400, padding: '20px 0' }}>
        <div className="text-center text-secondary text-sm">
          No transactions for this account.
        </div>
      </div>
    )
  }

  return (
    <div style={{ minWidth: 450, maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="card-accent-purple" style={{ padding: '12px 16px', borderRadius: 8 }}>
        <div className="text-sm fw-600" style={{ color: 'var(--primary)' }}>{acctName}</div>
        <div className="text-xs text-secondary">Balance: <span className={`fw-600 ${total >= 0 ? 'text-success' : 'text-danger'}`}>{fmt(total, currency)}</span></div>
      </div>
      <div>
        <div className="text-xs fw-600 mb-1" style={{ color: 'var(--primary)' }}>Contributing Vouchers ({lines.length} entries)</div>
        <div style={{ maxHeight: 350, overflowY: 'auto' }}>
          <table className="property-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th className="text-xs">Voucher</th>
                <th className="text-xs">Date</th>
                <th className="text-xs">Narration</th>
                <th className="text-xs">Debit</th>
                <th className="text-xs">Credit</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(({ line, voucher }) => (
                <tr key={`${voucher.id}-${line.id}`}>
                  <td className="text-xs text-mono fw-500">{voucher.number}</td>
                  <td className="text-xs text-secondary">{formatDate(voucher.date, dateFormat)}</td>
                  <td className="text-xs text-secondary" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {line.narration || voucher.description}
                  </td>
                  <td className="text-xs text-mono">{line.type === 'Debit' ? fmt(line.baseAmount, currency) : '—'}</td>
                  <td className="text-xs text-mono">{line.type === 'Credit' ? fmt(line.baseAmount, currency) : getBankName(line.accountId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
