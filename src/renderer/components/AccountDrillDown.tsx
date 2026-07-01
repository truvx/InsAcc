import React, { useMemo } from 'react'
import type { Account, Voucher, VoucherLine } from '../accounting/types'
import { getLinesForAccount } from '../accounting/ledgerService'
import { formatDate } from '../utils'

interface Props {
  accountId: string
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
  accountId, accountName,
  accounts, vouchers,
  currency = 'AED', dateFormat = 'DD/MM/YYYY',
}: Props) {
  const lines = useMemo<LineWithVoucher[]>(() => {
    return getLinesForAccount(accountId, vouchers)
  }, [accountId, vouchers])

  const total = useMemo(() => {
    return lines.reduce((s, { line }) => {
      return line.type === 'Debit' ? s + line.baseAmount : s - line.baseAmount
    }, 0)
  }, [lines])

  const parentAcct = accounts.find(a => a.id === accountId)
  const acctName = accountName || parentAcct?.name || accountId

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
                  <td className="text-xs text-mono">{line.type === 'Credit' ? fmt(line.baseAmount, currency) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
