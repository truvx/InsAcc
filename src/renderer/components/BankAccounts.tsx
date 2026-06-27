import React, { useState } from 'react'
import type { Profile } from '../data/sampleData'
import { Button } from './design/DesignSystem'
import Toast from './Toast'
import { formatDate, t } from '../utils'

interface Props {
  profile: Profile
  currency?: string
  dateFormat?: string
  language?: string
  statement: StatementEntry[]
  setStatement: React.Dispatch<React.SetStateAction<StatementEntry[]>>
  balance: number
  setBalance: React.Dispatch<React.SetStateAction<number>>
}

export interface StatementEntry {
  date: string
  desc: string
  amount: string
  type: 'credit' | 'debit'
}

export default function BankAccounts({ currency = 'AED', dateFormat = 'DD/MM/YYYY', language = 'English', statement, setStatement, balance, setBalance }: Props) {
  const [action, setAction] = useState<'deposit' | 'withdrawal' | 'transfer' | null>(null)
  const [formAmount, setFormAmount] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const today = () => new Date().toISOString().split('T')[0]

  const handleAction = () => {
    if (!formAmount) { setToast({ visible: true, message: 'Enter an amount', type: 'error' }); return }
    const amount = Number(formAmount)
    if (action === 'deposit') {
      setBalance(prev => prev + amount)
      setStatement(prev => [{ date: today(), desc: formDesc || 'Deposit', amount: `+${currency} ${amount.toLocaleString()}`, type: 'credit' }, ...prev])
      setToast({ visible: true, message: 'Deposit recorded', type: 'success' })
    } else {
      setBalance(prev => prev - amount)
      setStatement(prev => [{ date: today(), desc: formDesc || (action === 'withdrawal' ? 'Withdrawal' : 'Fund Transfer'), amount: `-${currency} ${amount.toLocaleString()}`, type: 'debit' }, ...prev])
      setToast({ visible: true, message: `${action === 'withdrawal' ? 'Withdrawal' : 'Transfer'} recorded`, type: 'success' })
    }
    setAction(null); setFormAmount(''); setFormDesc('')
  }

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">{t('bank-accounts', language)}</div>
            <div className="page-subtitle">{t('manageAccounts', language)}</div>
          </div>
        </div>
        <div className="page-header-right">
          <Button variant="secondary" size="sm" onClick={() => setAction('deposit')}>Deposit</Button>
          <Button variant="secondary" size="sm" onClick={() => setAction('withdrawal')}>Withdraw</Button>
          <Button variant="secondary" size="sm" onClick={() => setAction('transfer')}>Transfer</Button>
        </div>
      </div>
      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <div className="card">
            <div className="card-body">
              <div className="card-title" style={{ marginBottom: 16 }}>Emirates Islamic Bank</div>
              <div className="text-secondary" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 20 }}>Primary Account</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.02em' }}>{currency} {balance.toLocaleString()}</div>
              <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Current Balance</div>
              <div style={{ display: 'flex', gap: 32, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div>
                  <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>Opening Balance</div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-md)' }}>{currency} 0</div>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>Account No.</div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-md)' }}>----</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Quick Actions</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button variant="secondary" onClick={() => setAction('deposit')} style={{ justifyContent: 'flex-start' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Record Deposit
              </Button>
              <Button variant="secondary" onClick={() => setAction('withdrawal')} style={{ justifyContent: 'flex-start' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Record Withdrawal
              </Button>
              <Button variant="secondary" onClick={() => setAction('transfer')} style={{ justifyContent: 'flex-start' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                Transfer Funds
              </Button>
              <Button variant="secondary" onClick={async () => {
                const api = (window as any).api
                if (api?.saveFile) {
                  const content = `Bank Statement - Emirates Islamic Bank\nAccount: ----\nDate: ${new Date().toLocaleDateString()}\n\nBalance: AED ${balance.toLocaleString()}\n\nTransactions:\n${statement.map(s => `${s.date} | ${s.desc} | ${s.amount}`).join('\n')}\n`
                  await api.saveFile(`Bank_Statement_${new Date().toISOString().split('T')[0]}.txt`, content)
                  setToast({ visible: true, message: 'Statement saved to Downloads', type: 'success' })
                } else {
                  setToast({ visible: true, message: 'Download available in desktop app', type: 'error' })
                }
              }} style={{ justifyContent: 'flex-start' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Statement
              </Button>
            </div>

            {action && (
              <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
                <div className="form-row" style={{ marginTop: 16 }}>
                  <div className="form-group">
                    <label className="form-label">{action.charAt(0).toUpperCase() + action.slice(1)} Amount</label>
                    <input className="input" type="number" placeholder="0" value={formAmount} onChange={e => setFormAmount(e.target.value)} autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <input className="input" placeholder="Optional note" value={formDesc} onChange={e => setFormDesc(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <Button variant="secondary" onClick={() => { setAction(null); setFormAmount(''); setFormDesc('') }} style={{ flex: 1 }}>Cancel</Button>
                  <Button variant="primary" onClick={handleAction} style={{ flex: 1 }}>Confirm</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Account Statement</span></div>
          <div className="card-body" style={{ padding: 0 }}>
            {statement.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">No transactions yet</div>
                <div className="empty-state-text">Use the Quick Actions to record deposits, withdrawals, or transfers.</div>
              </div>
            ) : (
              <div style={{ padding: '0' }}>
                {statement.map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: i < statement.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{row.desc}</div>
                      <div className="text-secondary" style={{ fontSize: 'var(--font-size-xs)' }}>{formatDate(row.date, dateFormat)}</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-size-md)', color: row.type === 'credit' ? 'var(--success)' : 'var(--text-muted)', marginRight: 12 }}>
                      {row.amount}
                    </div>
                    <button onClick={() => { setStatement(prev => prev.filter((_, idx) => idx !== i)); setToast({ visible: true, message: 'Entry removed', type: 'success' }) }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex' }} aria-label="Remove entry">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
