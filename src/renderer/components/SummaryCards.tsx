import React from 'react'
import type { SummaryCard } from '../data/sampleData'
import { t } from '../utils'

interface Props {
  cards: SummaryCard[]
  currencySymbol?: string
  language?: string
}

const CARD_ICONS: Record<string, string> = {
  wealth: '💰',
  invested: '📈',
  bank: '🏦',
  profit: '🏆',
  capital: '💎',
  income: '📥',
  expense: '📤',
}

function formatValue(val: string): { currency: string; number: string } {
  const match = val.match(/^(AED\s*)?([\d,]+)$/)
  if (match) {
    return { currency: match[1] || '', number: match[2] }
  }
  return { currency: '', number: val }
}

const LABEL_MAP: Record<string, string> = {
  'Total Wealth': 'totalWealth',
  'Total Invested': 'totalInvested',
  'Bank Balance': 'bankBalance',
  'Total Profit': 'totalProfit',
  Capital: 'capital',
  'Monthly Income': 'monthlyIncome',
  'Monthly Expense': 'monthlyExpense',
}

export default function SummaryCards({ cards, currencySymbol, language = 'English' }: Props) {
  return (
    <div className="dashboard-grid fade-in">
      {cards.map((card, index) => {
        const { number } = formatValue(card.value)
        const sym = currencySymbol || 'AED'
        return (
          <div
            key={card.label}
            className="summary-card"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className={`summary-card-icon ${card.icon}`}>
              {CARD_ICONS[card.icon] || '📊'}
            </div>
            <div className="summary-card-body">
              <div className="summary-card-label">{t(LABEL_MAP[card.label] || card.label, language)}</div>
              <div className="summary-card-value">
                <span className="aed-suffix">{sym} </span>
                {number}
              </div>
              <div className={`summary-card-change ${card.isPositive ? 'positive' : 'negative'}`}>
                {card.change} {t('vsLastMonth', language)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
