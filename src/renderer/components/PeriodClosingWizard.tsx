import React, { useMemo, useState } from 'react'
import type { Account, Voucher, FiscalYear } from '../accounting/types'
import { generateChartOfAccountsReadModel, generateTrialBalanceReadModel, generateProfitAndLossReadModel } from '../readModels/accountingReadModels'
import { closeAccountingPeriod } from '../accounting/periodCloser'
import { Button, Modal } from './design/DesignSystem'
import { CurrencyText } from './design/CurrencyText'
import { Landmark, Lock, Unlock, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react'

interface Props {
  currency?: string
  accounts: Account[]
  vouchers: Voucher[]
  setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>
  fiscalYears: FiscalYear[]
  setFiscalYears: React.Dispatch<React.SetStateAction<FiscalYear[]>>
}

export default function PeriodClosingWizard({ currency = 'AED', accounts, vouchers, setVouchers, fiscalYears, setFiscalYears }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reopenConfirmOpen, setReopenConfirmOpen] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; netProfit?: number } | null>(null)
  const [closing, setClosing] = useState(false)

  const currentFiscalYear = useMemo(() => {
    const now = new Date()
    const nowStr = now.toISOString().split('T')[0]
    return fiscalYears.find(fy => fy.startDate <= nowStr && fy.endDate >= nowStr)
  }, [fiscalYears])

  const fy = currentFiscalYear
  const isClosed = fy?.isClosed ?? false
  const fiscalPeriodLabel = fy?.name ?? `FY ${new Date().getFullYear()}`

  const closingVoucher = useMemo(() => {
    if (!isClosed) return undefined
    return vouchers.find(v => v.description === `Period Close - ${fiscalPeriodLabel}` && v.status === 'Posted')
  }, [isClosed, vouchers, fiscalPeriodLabel])

  const coaEntries = useMemo(() => generateChartOfAccountsReadModel(accounts, vouchers), [accounts, vouchers])
  const tbEntries = useMemo(() => generateTrialBalanceReadModel(coaEntries), [coaEntries])
  const plModel = useMemo(() => generateProfitAndLossReadModel(tbEntries, accounts), [tbEntries, accounts])

  const handleClose = async () => {
    if (!fy) return
    setClosing(true)
    setResult(null)
    try {
      const res = closeAccountingPeriod(fiscalPeriodLabel, accounts, vouchers, fy.endDate)
      if (res.success && res.closingVoucher) {
        setVouchers(prev => [res.closingVoucher!, ...prev])
        setFiscalYears(prev => prev.map(f =>
          f.id === fy.id ? { ...f, isClosed: true } : f,
        ))
        setResult({
          success: true,
          message: `Period closed successfully. Net profit of ${res.netProfit?.toLocaleString(undefined, { minimumFractionDigits: 2 })} transferred to Current Year Earnings.`,
          netProfit: res.netProfit,
        })
      } else {
        setResult({ success: false, message: res.errors?.join(', ') || 'Close period failed.' })
      }
    } catch (err) {
      setResult({ success: false, message: `Unexpected error: ${err}` })
    } finally {
      setClosing(false)
      setConfirmOpen(false)
    }
  }

  const handleReopen = () => {
    if (!fy) return
    setFiscalYears(prev => prev.map(f =>
      f.id === fy.id ? { ...f, isClosed: false } : f,
    ))
    setResult({ success: true, message: `Period ${fiscalPeriodLabel} reopened. You can now post adjusting entries and close again.` })
    setReopenConfirmOpen(false)
  }

  if (!fy) {
    return (
      <div className="page-body">
        <div className="card" style={{ padding: 24, maxWidth: 600 }}>
          <div className="text-sm text-secondary">No active fiscal year found for the current date.</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Period Closing</div>
            <div className="page-subtitle">Close the current accounting period</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        {result && (
          <div className={`card ${result.success ? 'card-success' : 'card-danger'}`} style={{ padding: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {result.success ? <CheckCircle size={18} color="var(--success)" /> : <AlertTriangle size={18} color="var(--danger)" />}
              <span className="text-sm" style={{ color: result.success ? 'var(--success)' : 'var(--danger)' }}>{result.message}</span>
            </div>
          </div>
        )}

        <div className="card" style={{ maxWidth: 600 }}>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <Landmark size={24} style={{ color: 'var(--primary)' }} />
              <div>
                <div className="fw-700" style={{ fontSize: 18 }}>Fiscal Period Status</div>
                <div className="text-secondary text-sm">Current accounting period overview</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                <span className="text-secondary text-sm">Period</span>
                <span className="fw-600 text-sm">{fy.name} ({fy.startDate} to {fy.endDate})</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                <span className="text-secondary text-sm">Status</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isClosed ? (
                    <><Lock size={14} color="var(--warning)" /><span className="fw-600 text-sm" style={{ color: 'var(--warning)' }}>Closed</span></>
                  ) : (
                    <><Unlock size={14} color="var(--success)" /><span className="fw-600 text-sm" style={{ color: 'var(--success)' }}>Open</span></>
                  )}
                </span>
              </div>

              {closingVoucher && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                  <span className="text-secondary text-sm">Closing Voucher</span>
                  <span className="fw-600 text-sm">{closingVoucher.number}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--divider)', padding: 24 }}>
            <div className="fw-700 text-sm" style={{ marginBottom: 16 }}>Profit & Loss Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-sm text-secondary">Total Revenue</span>
                <CurrencyText value={plModel.totalRevenue} currency={currency} className="text-sm fw-600" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-sm text-secondary">Total Expenses</span>
                <CurrencyText value={plModel.totalExpenses} currency={currency} className="text-sm fw-600" />
              </div>
              <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-700 text-sm">Net Profit</span>
                <CurrencyText value={plModel.netProfit} currency={currency} className="fw-700" style={{ color: plModel.netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }} />
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--divider)', padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {isClosed ? (
              <>
                <div className="text-sm text-secondary" style={{ textAlign: 'center', padding: '4px 0 12px' }}>
                  This period is closed. No new vouchers, edits, approvals, or postings are allowed.
                </div>
                <Button
                  variant="secondary"
                  size="lg"
                  icon={<RotateCcw size={16} />}
                  onClick={() => setReopenConfirmOpen(true)}
                  style={{ width: '100%' }}
                >
                  Reopen Period (Administrator)
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  loading={closing}
                  onClick={() => setConfirmOpen(true)}
                  disabled={plModel.totalRevenue === 0 && plModel.totalExpenses === 0}
                  style={{ width: '100%' }}
                >
                  Close Period
                </Button>
                {plModel.totalRevenue === 0 && plModel.totalExpenses === 0 && (
                  <div className="text-xs text-secondary" style={{ textAlign: 'center' }}>
                    No revenue or expense activity to close.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm Period Close"
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleClose} loading={closing}>Close Period</Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="text-sm" style={{ lineHeight: 1.6 }}>
              This will create a closing journal entry that:
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
              <li className="text-sm">Close all Revenue accounts (Dr {plModel.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency})</li>
              <li className="text-sm">Close all Expense accounts (Cr {plModel.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency})</li>
              <li className="text-sm">Transfer Net {plModel.netProfit >= 0 ? 'Profit' : 'Loss'} of {Math.abs(plModel.netProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency} to Current Year Earnings</li>
            </ul>
            <div className="text-sm text-secondary" style={{ marginTop: 8 }}>
              This action cannot be undone via Close Period. Revenue and expense accounts will be zeroed and the period locked.
            </div>
          </div>
        </Modal>

        <Modal open={reopenConfirmOpen} onClose={() => setReopenConfirmOpen(false)} title="Reopen Period"
          footer={
            <>
              <Button variant="secondary" onClick={() => setReopenConfirmOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleReopen}>Reopen Period</Button>
            </>
          }
        >
          <div className="text-sm" style={{ lineHeight: 1.6 }}>
            Reopening <strong>{fy.name}</strong> will allow new vouchers, edits, approvals, and postings in this period.
            Ensure any adjustments are properly documented.
          </div>
        </Modal>
      </div>
    </>
  )
}
