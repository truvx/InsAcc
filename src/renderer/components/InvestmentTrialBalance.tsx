import React, { useMemo } from 'react'
import type { Account, Voucher } from '../accounting/types'
import { generateChartOfAccountsReadModel, generateTrialBalanceReadModel } from '../readModels/accountingReadModels'
import TrialBalanceTree from './TrialBalanceTree'

interface Props {
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
}

export default function InvestmentTrialBalance({ currency = 'AED', accounts, vouchers }: Props) {
  const { entries, totals } = useMemo(() => {
    const coa = generateChartOfAccountsReadModel(accounts, vouchers)
    const e = generateTrialBalanceReadModel(coa)
    const leafEntries = e.filter(entry => {
      const acct = accounts.find(a => a.id === entry.accountId)
      const isParent = acct ? accounts.some(child => child.parentId === acct.id && child.isActive) : false
      return !isParent
    })
    const totalDebit = leafEntries.reduce((s, entry) => s + entry.totalDebit, 0)
    const totalCredit = leafEntries.reduce((s, entry) => s + entry.totalCredit, 0)
    return { entries: e, totals: { totalDebit, totalCredit } }
  }, [accounts, vouchers])

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Trial Balance</div>
            <div className="page-subtitle">{entries.length} accounts</div>
          </div>
        </div>
      </div>
      <TrialBalanceTree
        currency={currency}
        accounts={accounts}
        vouchers={vouchers}
        entries={entries}
        totals={totals}
      />
    </>
  )
}
