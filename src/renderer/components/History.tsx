import React, { useState, useMemo } from 'react'
import type { Profile } from '../data/sampleData'
import type { Investment } from './Investments'
import type { Transaction } from './Transactions'
import { t } from '../utils'

interface Props {
  profile: Profile
  language?: string
  investments: Investment[]
  transactions: Transaction[]
}

export default function History({ profile, language = 'English', investments, transactions }: Props) {
  const currentYear = new Date().getFullYear()
  const years = useMemo(() => {
    const arr: string[] = []
    for (let y = 2015; y <= currentYear; y++) arr.push(String(y))
    return arr.reverse()
  }, [currentYear])

  const [selectedYear, setSelectedYear] = useState(String(currentYear))
  const [selectedDate, setSelectedDate] = useState('')

  const yearInvestments = useMemo(() => {
    return investments.filter(inv => inv.date?.startsWith(selectedYear))
  }, [investments, selectedYear])

  const yearTransactions = useMemo(() => {
    return transactions.filter(tx => tx.date?.startsWith(selectedYear))
  }, [transactions, selectedYear])

  const totalValue = yearInvestments.reduce((sum, inv) => sum + (inv.purchaseValue || 0), 0)
  const investmentsCount = yearInvestments.length

  const topAsset = useMemo(() => {
    if (yearInvestments.length === 0) return 'N/A'
    const byType: Record<string, number> = {}
    yearInvestments.forEach(inv => {
      byType[inv.type] = (byType[inv.type] || 0) + (inv.purchaseValue || 0)
    })
    return Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
  }, [yearInvestments])

  const dayEvents = useMemo(() => {
    if (!selectedDate) return []
    return [
      ...investments.filter(inv => inv.date === selectedDate).map(inv => ({
        date: inv.date,
        event: `${inv.type} - ${inv.assetName || ''}`,
        value: `AED ${(inv.purchaseValue || 0).toLocaleString()}`,
        type: 'buy' as const,
      })),
      ...transactions.filter(tx => tx.date === selectedDate).map(tx => ({
        date: tx.date,
        event: `${tx.type} - ${tx.category || ''}`,
        value: `AED ${(tx.amount || 0).toLocaleString()}`,
        type: (tx.type === 'Income' ? 'income' : 'buy') as 'income' | 'buy',
      })),
    ].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  }, [selectedDate, investments, transactions])

  return (
    <div className="main-content">
      <div className="main-header">
        <div>
          <h1>{t('history', language)}</h1>
          <p>{t('viewHistory', language)}</p>
        </div>
      </div>

      <div className="scroll-content">
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {years.map(year => (
              <button
                key={year}
                className={`chart-period ${selectedYear === year ? 'active' : ''}`}
                onClick={() => { setSelectedYear(year); setSelectedDate('') }}
                style={{ fontSize: 14, padding: '6px 18px' }}
              >
                {year}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Calendar:</label>
            <input
              type="date"
              className="settings-input"
              style={{ width: 180 }}
              value={selectedDate}
              onChange={e => { setSelectedDate(e.target.value); if (e.target.value) setSelectedYear(e.target.value.slice(0, 4)) }}
            />
            {selectedDate && (
              <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setSelectedDate('')}>
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="dashboard-grid" style={{ marginBottom: 24 }}>
          {[
            { label: 'Total Investments', value: `AED ${totalValue.toLocaleString()}`, icon: 'investment', color: 'var(--gold)' },
            { label: 'Investments Made', value: `${investmentsCount}`, icon: 'chart', color: 'var(--blue)' },
            { label: 'Profit Generated', value: 'AED 0', icon: 'trophy', color: 'var(--green)' },
            { label: 'Top Performing Asset', value: topAsset, icon: 'star', color: '#D4AF37' },
          ].map((card, i) => (
            <div key={i} className="chart-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'rgba(212,175,55,0.1)', color: card.color, flexShrink: 0 }}>
                {card.icon === 'investment' ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> :
                 card.icon === 'chart' ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> :
                 card.icon === 'trophy' ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg> :
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
              </span>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{card.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: card.color }}>{card.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">
              {selectedDate ? `Events on ${selectedDate}` : `Timeline - ${selectedYear}`}
            </div>
            <div className="chart-subtitle">Key investment events</div>
          </div>
          <div style={{ position: 'relative', paddingLeft: 24 }}>
            <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
            {(selectedDate ? dayEvents : [...yearTransactions.map(tx => ({
              date: tx.date,
              event: `${tx.type} - ${tx.category || ''}`,
              value: `AED ${tx.amount.toLocaleString()}`,
              type: (tx.type === 'Income' ? 'income' : 'buy') as 'income' | 'buy',
            })), ...yearInvestments.map(inv => ({
              date: inv.date,
              event: `${inv.type} - ${inv.assetName || ''}`,
              value: `AED ${(inv.purchaseValue || 0).toLocaleString()}`,
              type: 'buy' as const,
            }))].sort((a, b) => (a.date || '').localeCompare(b.date || '')).map((item, i) => (
              <div key={i} style={{ position: 'relative', padding: '0 0 20px 24px' }}>
                <div style={{
                  position: 'absolute', left: -20, top: 4, width: 12, height: 12, borderRadius: '50%',
                  background: item.type === 'income' ? 'var(--green)' : item.type === 'buy' ? 'var(--blue)' : 'var(--gold)',
                  border: '2px solid var(--bg)',
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.event}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{item.date}</div>
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: item.type === 'income' ? 'var(--green)' : item.type === 'buy' ? 'var(--blue)' : 'var(--gold)',
                  }}>{item.value}</div>
                </div>
              </div>
            )))}
            {(selectedDate ? dayEvents.length === 0 : yearTransactions.length === 0 && yearInvestments.length === 0) && (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                No events found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
