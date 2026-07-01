import React from 'react'
import type { BankAccount } from '../data/banking'

interface Props {
  bank: BankAccount | null | undefined
  size?: number
}

const BANK_BUILDING_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const FALLBACK_BG = 'rgba(59, 165, 73, 0.15)'
const FALLBACK_COLOR = '#3BA549'

export function resolveBankForVoucher(
  voucherId: string | undefined,
  vouchers: { id: string; lines: Array<{ type: string; accountId: string }> }[],
  bankMappings: Array<{ accountId: string; bankAccountId: string }>,
  bankAccounts: BankAccount[],
): BankAccount | null {
  if (!voucherId) return null
  const voucher = vouchers.find(v => v.id === voucherId)
  if (!voucher) return null
  const creditLine = voucher.lines.find(l => l.type === 'Credit')
  if (!creditLine) return null
  const mapping = bankMappings.find(m => m.accountId === creditLine.accountId)
  if (!mapping) return null
  return bankAccounts.find(ba => ba.id === mapping.bankAccountId) || null
}

export function buildVoucherBankMap(
  purchaseRecords: { id: string; voucherId: string }[],
  vouchers: { id: string; lines: Array<{ type: string; accountId: string }> }[],
  bankMappings: Array<{ accountId: string; bankAccountId: string }>,
  bankAccounts: BankAccount[],
): Map<string, BankAccount | null> {
  const map = new Map<string, BankAccount | null>()
  for (const p of purchaseRecords) {
    if (map.has(p.voucherId)) continue
    map.set(p.voucherId, resolveBankForVoucher(p.voucherId, vouchers, bankMappings, bankAccounts))
  }
  return map
}

export default function BankAccountAvatar({ bank, size = 36 }: Props) {
  if (!bank) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #E5E7EB',
          background: '#FFFFFF',
          flexShrink: 0,
          color: '#9CA3AF',
        }}
        aria-label="Unassigned"
      >
        {BANK_BUILDING_ICON}
      </div>
    )
  }

  if (bank.icon.startsWith('http')) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #E5E7EB',
          background: '#FFFFFF',
          flexShrink: 0,
          overflow: 'hidden',
        }}
        aria-label={`${bank.institution} logo`}
      >
        <img src={bank.icon} alt={`${bank.institution}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
      </div>
    )
  }

  const initial = bank.institution.charAt(0).toUpperCase()

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #E5E7EB',
        background: FALLBACK_BG,
        flexShrink: 0,
        fontSize: size >= 28 ? 13 : 11,
        fontWeight: 600,
        fontFamily: 'Inter, sans-serif',
        color: FALLBACK_COLOR,
      }}
      aria-label={`Funding Bank: ${bank.institution}`}
    >
      {initial}
    </div>
  )
}
