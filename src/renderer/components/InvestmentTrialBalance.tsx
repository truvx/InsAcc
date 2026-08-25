import React, { useMemo, useState } from 'react'
import type { Account, Voucher } from '../accounting/types'
import { generateChartOfAccountsReadModel, generateTrialBalanceReadModel } from '../readModels/accountingReadModels'
import TrialBalanceTree from './TrialBalanceTree'

interface Props {
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
}

export default function InvestmentTrialBalance({ currency = 'AED', accounts, vouchers }: Props) {
  const [dateTo, setDateTo] = useState('')

  const filteredVouchers = useMemo(() => {
    let vList = vouchers
    if (dateTo) vList = vList.filter(v => v.date <= dateTo)
    return vList
  }, [vouchers, dateTo])

  const { entries, totals } = useMemo(() => {
    const coa = generateChartOfAccountsReadModel(accounts, filteredVouchers)
    const e = generateTrialBalanceReadModel(coa)
    const leafEntries = e.filter(entry => {
      const acct = accounts.find(a => a.id === entry.accountId)
      const isParent = acct ? accounts.some(child => child.parentId === acct.id && child.isActive) : false
      return !isParent
    })
    const totalDebit = leafEntries.reduce((s, entry) => s + entry.totalDebit, 0)
    const totalCredit = leafEntries.reduce((s, entry) => s + entry.totalCredit, 0)
    return { entries: e, totals: { totalDebit, totalCredit } }
  }, [accounts, filteredVouchers])

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Trial Balance</div>
            <div className="page-subtitle">{entries.length} accounts</div>
          </div>
        </div>
        <div className="page-header-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-tertiary)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--divider)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>As Of</span>
              <input
                type="date"
                className="data-table-search-input"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                style={{ padding: '4px 8px', fontSize: 13, background: 'transparent', border: 'none', width: 'auto' }}
              />
              {dateTo && (
                <button
                  onClick={() => setDateTo('')}
                  className="btn-icon"
                  style={{ width: 24, height: 24, background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
                  title="Clear date"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <TrialBalanceTree
        currency={currency}
        accounts={accounts}
        vouchers={filteredVouchers}
        entries={entries}
        totals={totals}
        moduleName="Investment"
      />
    </>
  )
}
