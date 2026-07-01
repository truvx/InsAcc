import React, { useMemo, useState } from 'react'
import type { Account, Voucher } from '../accounting/types'
import { getTrialBalance } from '../accounting/ledgerService'
import { DataTable, type Column } from './design/Table'
import { Badge, EmptyState, Modal } from './design/DesignSystem'
import AccountDrillDown from './AccountDrillDown'

interface Props {
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
}

const TYPE_LABELS: Record<string, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  revenue: 'Revenue',
  expense: 'Expenses',
}

export default function InvestmentTrialBalance({ currency = 'AED', accounts, vouchers }: Props) {
  const [drillAccountId, setDrillAccountId] = useState<string | null>(null)
  const [drillAccountName, setDrillAccountName] = useState<string>('')

  const entries = useMemo(() => getTrialBalance(vouchers, accounts), [accounts, vouchers])

  const totals = useMemo(() => {
    const totalDebit = entries.reduce((s, e) => s + Math.max(0, e.totalDebit - e.totalCredit), 0)
    const totalCredit = entries.reduce((s, e) => s + Math.max(0, e.totalCredit - e.totalDebit), 0)
    return { totalDebit, totalCredit }
  }, [entries])

  const columns: Column<typeof entries[0]>[] = useMemo(() => [
    {
      key: 'accountCode',
      header: 'Code',
      width: '100px',
      render: row => <span className="text-mono text-xs">{row.accountCode}</span>,
    },
    {
      key: 'accountName',
      header: 'Account',
      sortable: true,
      render: row => (
        <div>
          <span className="text-sm fw-500">{row.accountName}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: '100px',
      render: row => <Badge variant="neutral">{TYPE_LABELS[row.type] || row.type}</Badge>,
    },
    {
      key: 'totalDebit',
      header: 'Debit',
      numeric: true,
      sortable: true,
      render: row => (
        <span className="text-mono text-xs">{currency} {row.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: 'totalCredit',
      header: 'Credit',
      numeric: true,
      sortable: true,
      render: row => (
        <span className="text-mono text-xs">{currency} {row.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      numeric: true,
      sortable: true,
      render: row => (
        <span
          className={`text-mono text-xs fw-600 ${row.balance >= 0 ? 'text-success' : 'text-danger'} hover-lift`}
          style={{ cursor: 'pointer' }}
          onClick={() => {
            setDrillAccountId(row.accountId)
            setDrillAccountName(row.accountName)
          }}
        >
          {currency} {Math.abs(row.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          {row.balance >= 0 ? ' Dr' : ' Cr'}
        </span>
      ),
    },
  ], [currency, accounts, vouchers])

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
            <div className="page-title">Trial Balance</div>
            <div className="page-subtitle">{entries.length} accounts with activity</div>
          </div>
        </div>
      </div>
      <div className="page-body">
        <div className="card card-table">
          <div className="card-body">
            <DataTable
              columns={columns}
              data={entries}
              keyExtractor={row => row.accountId}
              pageSize={50}
              emptyState={
                <EmptyState
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>}
                  title="No trial balance entries"
                  text="Post vouchers to see trial balance data."
                />
              }
            />
            <div className="data-table-footer">
              <div className="data-table-summary">
                <span className="text-mono text-xs fw-600">Total Debit: {currency} {totals.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-mono text-xs fw-600 ml-4">Total Credit: {currency} {totals.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-mono text-xs fw-600 ml-4" style={{ color: Math.abs(totals.totalDebit - totals.totalCredit) < 0.01 ? 'var(--success)' : 'var(--danger)' }}>
                  {Math.abs(totals.totalDebit - totals.totalCredit) < 0.01 ? 'Balanced' : 'Unbalanced'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
