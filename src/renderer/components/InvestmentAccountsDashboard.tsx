import React, { useMemo, useState } from 'react'
import type { Account, Voucher } from '../accounting/types'
import type { BankAccount } from '../data/banking'
import { Modal } from './design/DesignSystem'
import AccountDrillDown from './AccountDrillDown'
import { getFinancialOverviewProjection } from '../readModels/InvestmentFinancialOverviewReadModel'

interface Props {
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
  bankAccounts: BankAccount[]
}

function CashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function BankIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 2 9 22 9 22 7 12 2" /><rect x="4" y="9" width="16" height="11" /><line x1="9" y1="14" x2="9" y2="18" /><line x1="15" y1="14" x2="15" y2="18" />
    </svg>
  )
}

function InvestmentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function ReceivableIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function RevenueIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function IconWrapper({ children, color }: { children: React.ReactNode; color: string }) {
  return <div className="kpi-card-icon" style={{ background: `${color}18`, color }}>{children}</div>
}

const fmt = (n: number, sym: string) => `${sym} ${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function InvestmentAccountsDashboard({ currency = 'AED', accounts, vouchers, bankAccounts }: Props) {
  const [drillAccountId, setDrillAccountId] = useState<string | null>(null)
  const [drillAccountName, setDrillAccountName] = useState<string>('')

  const metrics = useMemo(
    () => getFinancialOverviewProjection(accounts, vouchers),
    [accounts, vouchers],
  )

  const getDrillAccountId = (label: string): { id: string; name: string } | null => {
    switch (label) {
      case 'Cash': return { id: accounts.find(a => a.code === '1110')?.id || '', name: 'Cash' }
      case 'Bank Balance': {
        const bankParent = accounts.find(a => a.code === '1120')
        if (bankParent) {
          const childIds = accounts.filter(a => a.parentId === bankParent.id && a.isActive)
          return childIds.length === 1 ? { id: childIds[0].id, name: childIds[0].name } :
            { id: bankParent.id, name: 'Bank Accounts' }
        }
        return null
      }
      case 'Investments': {
        const invParent = accounts.find(a => a.code === '12')
        return invParent ? { id: invParent.id, name: 'Investments' } : null
      }
      case 'Receivables': return { id: accounts.find(a => a.code === '1310')?.id || '', name: 'Accounts Receivable' }
      case 'Revenue': return { id: accounts.find(a => a.code === '4')?.id || '', name: 'Revenue' }
      case 'Expenses': {
        const expenseParent = accounts.find(a => a.type === 'expense' && !a.parentId)
        return expenseParent ? { id: expenseParent.id, name: 'Expenses' } : null
      }
      case 'Total Assets': {
        const assetParent = accounts.find(a => a.type === 'asset' && !a.parentId)
        return assetParent ? { id: assetParent.id, name: 'Assets' } : null
      }
      case 'Total Liabilities': {
        const liabilityParent = accounts.find(a => a.type === 'liability' && !a.parentId)
        return liabilityParent ? { id: liabilityParent.id, name: 'Liabilities' } : null
      }
      default: return null
    }
  }

  const handleDrill = (label: string) => {
    const info = getDrillAccountId(label)
    if (info && info.id) {
      setDrillAccountId(info.id)
      setDrillAccountName(info.name)
    }
  }

  const kpiCards = useMemo(() => [
    { label: 'Cash', value: metrics.cash, icon: <CashIcon />, color: 'var(--success)' },
    { label: 'Bank Balance', value: metrics.bankBalance, icon: <BankIcon />, color: 'var(--primary)' },
    { label: 'Investments', value: metrics.investments, icon: <InvestmentIcon />, color: 'var(--accent)' },
    { label: 'Receivables', value: metrics.receivables, icon: <ReceivableIcon />, color: 'var(--warning)' },
    { label: 'Revenue', value: metrics.revenue, icon: <RevenueIcon />, color: 'var(--success)' },
    { label: 'Expenses', value: metrics.expenses, icon: <ReceivableIcon />, color: 'var(--danger)' },
    { label: 'Total Assets', value: metrics.totalAssets, icon: <BankIcon />, color: 'var(--primary-text)' },
    { label: 'Total Liabilities', value: metrics.totalLiabilities, icon: <ReceivableIcon />, color: metrics.totalLiabilities > 0 ? 'var(--danger)' : 'var(--success)' },
  ], [metrics])

  return (
    <>
      <Modal open={drillAccountId !== null} title={`Account Drill Down — ${drillAccountName}`} onClose={() => setDrillAccountId(null)}>
        {drillAccountId && (
          <AccountDrillDown
            accountId={drillAccountId}
            accountName={drillAccountName}
            accounts={accounts}
            vouchers={vouchers}
            currency={currency}
          />
        )}
      </Modal>

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Financial Overview</div>
            <div className="page-subtitle">{accounts.filter(a => a.isActive).length} active accounts</div>
          </div>
        </div>
      </div>
      <div className="page-body">
        <div className="kpi-grid">
          {kpiCards.map((k) => (
            <div
              key={k.label}
              className="kpi-card hover-lift"
              style={{ borderTop: `2px solid ${k.color}`, cursor: 'pointer' }}
              onClick={() => handleDrill(k.label)}
            >
              <IconWrapper color={k.color}>{k.icon}</IconWrapper>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ fontSize: 22 }}>
                {fmt(k.value, currency)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
