import React from 'react'

export interface ActivityEntry {
  id: string
  type: 'investment' | 'income' | 'expense' | 'deposit' | 'withdrawal' | 'transfer'
  title: string
  amount: string
  date: string
  description?: string
}

interface Props {
  activities: ActivityEntry[]
}

const TYPE_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  investment: {
    color: 'var(--blue)',
    bg: 'var(--blue-light)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  income: {
    color: 'var(--success)',
    bg: 'var(--success-light)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <polyline points="19 12 12 19 5 12" />
      </svg>
    ),
  },
  expense: {
    color: 'var(--danger)',
    bg: 'var(--danger-light)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </svg>
    ),
  },
  deposit: {
    color: 'var(--success)',
    bg: 'var(--success-light)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <polyline points="19 12 12 19 5 12" />
      </svg>
    ),
  },
  withdrawal: {
    color: 'var(--danger)',
    bg: 'var(--danger-light)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="19 12 12 5 5 12" />
      </svg>
    ),
  },
  transfer: {
    color: 'var(--info)',
    bg: 'var(--info-light)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
    ),
  },
}

export default function ActivityTimeline({ activities }: Props) {
  if (activities.length === 0) {
    return (
      <div className="chart-card chart-card-empty">
        <div className="chart-header">
          <div className="chart-title">Recent Activity</div>
        </div>
        <div className="chart-empty-state">
          <div className="chart-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="chart-empty-text">No recent activity</div>
        </div>
      </div>
    )
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">Recent Activity</div>
          <div className="chart-subtitle">Latest transactions and updates</div>
        </div>
      </div>
      <div className="activity-timeline">
        {activities.map((item) => {
          const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.investment
          return (
            <div key={item.id} className="activity-item">
              <div className="activity-item-line" />
              <div
                className="activity-item-icon"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {cfg.icon}
              </div>
              <div className="activity-item-content">
                <div className="activity-item-title">{item.title}</div>
                {item.description && (
                  <div className="activity-item-desc">{item.description}</div>
                )}
              </div>
              <div className="activity-item-right">
                <div className="activity-item-amount">{item.amount}</div>
                <div className="activity-item-date">{item.date}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
