import React, { useState } from 'react'
import { t } from '../utils'

interface NavItem {
  id: string
  label: string
}

interface NavGroup {
  label: string
  children: NavItem[]
}

const INV_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'holdings', label: 'Holdings' },
  { id: 'total-average-holding', label: 'Total Average Holding' },
  { id: 'bank-accounts', label: 'Bank Accounts' },
  { id: 'reports', label: 'Reports' },
  { id: 'documents', label: 'Documents' },
  { id: 'history', label: 'History' },
  { id: 'purchase-ledger', label: 'Purchase Ledger' },
  { id: 'settings', label: 'Settings' },
]

const PROP_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'properties', label: 'Properties' },
  { id: 'tenants', label: 'Tenants' },
  { id: 'leases', label: 'Lease Management' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'bank-accounts', label: 'Bank Accounts' },
  { id: 'reports', label: 'Reports' },
  { id: 'documents', label: 'Documents' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' },
]

const PROP_ACCOUNTS_GROUP: NavGroup = {
  label: 'Accounts',
  children: [
    { id: 'accounts-dashboard', label: 'Financial Overview' },
    { id: 'receipt-voucher', label: 'Receipt Voucher' },
    { id: 'payment-voucher', label: 'Payment Voucher' },
    { id: 'journal-voucher', label: 'Journal Voucher' },
    { id: 'chart-of-accounts', label: 'Chart of Accounts' },
    { id: 'trial-balance', label: 'Trial Balance' },
    { id: 'balance-sheet', label: 'Balance Sheet' },
    { id: 'profit-loss', label: 'Profit & Loss' },
    { id: 'pdc-manager', label: 'PDC Manager' },
    { id: 'deposit-manager', label: 'Security Deposits' },
  ],
}

const INV_ACCOUNTS_GROUP: NavGroup = {
  label: 'Accounts',
  children: [
    { id: 'accounts-dashboard', label: 'Financial Overview' },
    { id: 'receipt-voucher', label: 'Receipt Voucher' },
    { id: 'payment-voucher', label: 'Payment Voucher' },
    { id: 'journal-voucher', label: 'Journal Voucher' },
    { id: 'chart-of-accounts', label: 'Chart of Accounts' },
    { id: 'trial-balance', label: 'Trial Balance' },
    { id: 'balance-sheet', label: 'Balance Sheet' },
    { id: 'profit-loss', label: 'Profit & Loss' },
  ],
}

function NavIcon({ id }: { id: string }) {
  const icons: Record<string, React.ReactNode> = {
    dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>,
    investments: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    holdings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><rect x="9" y="8" width="6" height="8" rx="1" /></svg>,
    'total-average-holding': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20v-6M6 20V10M18 20V4M3 20h18" /></svg>,
    transactions: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
    'bank-accounts': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 2 9 22 9 22 7 12 2" /><rect x="4" y="9" width="16" height="11" /><line x1="9" y1="14" x2="9" y2="18" /><line x1="15" y1="14" x2="15" y2="18" /></svg>,
    reports: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
    documents: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
    history: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    'purchase-ledger': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>,
    settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
    properties: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
    units: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><line x1="12" y1="11" x2="12" y2="15" /></svg>,
    tenants: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    leases: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2" ry="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>,
    expenses: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>,
    income: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
    'receipt-voucher': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
    'payment-voucher': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M6 5h7.5a3.5 3.5 0 0 1 0 7H6" /></svg>,
    'journal-voucher': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2" ry="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>,
    'chart-of-accounts': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
    'accounts-dashboard': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>,
    'trial-balance': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
    'balance-sheet': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>,
    'profit-loss': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    'pdc-manager': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>,
    'deposit-manager': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M12 2L3 7v4c0 5.25 3.84 10.14 9 11 5.16-.86 9-5.75 9-11V7l-9-5z" /></svg>,
    'period-close': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /><circle cx="12" cy="16" r="1" /></svg>,
  }
  return <>{icons[id] || null}</>
}

interface SidebarProps {
  activeModule: 'investment' | 'property'
  activePage: string
  onNavigate: (page: string) => void
  onLogout: () => void
  onModuleChange: (module: 'investment' | 'property') => void
  theme: 'light' | 'dark'
  profileName: string
  profileRole: string
}

export default function Sidebar({ activeModule, activePage, onNavigate, onLogout, onModuleChange, profileName, profileRole }: SidebarProps) {
  const [accountsOpen, setAccountsOpen] = useState(
    (activeModule === 'property' && PROP_ACCOUNTS_GROUP.children.some(c => c.id === activePage)) ||
    (activeModule === 'investment' && INV_ACCOUNTS_GROUP.children.some(c => c.id === activePage))
  )

  const navItems = activeModule === 'investment' ? INV_NAV : PROP_NAV
  const accountsGroup = activeModule === 'investment' ? INV_ACCOUNTS_GROUP : PROP_ACCOUNTS_GROUP

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">IA</div>
        <span className="sidebar-brand">InsAcc</span>
      </div>

      <div className="sidebar-user">
        <div className="sidebar-avatar">{profileName.charAt(0)}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{profileName}</div>
          <div className="sidebar-user-role">{profileRole}</div>
        </div>
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-section">{activeModule === 'investment' ? 'Investment Portfolio' : 'Properties Management'}</div>
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item${activePage === item.id ? ' active' : ''}`}
            onClick={() => onNavigate(item.id)}
            aria-current={activePage === item.id ? 'page' : undefined}
          >
            <NavIcon id={item.id} />
            <span>{item.label}</span>
          </button>
        ))}
        <div className="sidebar-section">Accounts</div>
          <button
            className={`nav-item${accountsOpen ? ' active' : ''}`}
            onClick={() => setAccountsOpen(!accountsOpen)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"
              style={{ transform: accountsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span>Accounts</span>
          </button>
        {accountsOpen && accountsGroup.children.map(child => (
          <button
            key={child.id}
            className={`nav-item${activePage === child.id ? ' active' : ''}`}
            onClick={() => onNavigate(child.id)}
            aria-current={activePage === child.id ? 'page' : undefined}
          >
            <NavIcon id={child.id} />
            <span>{child.label}</span>
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="btn btn-secondary" onClick={() => onModuleChange(activeModule === 'investment' ? 'property' : 'investment')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          {activeModule === 'investment' ? 'Switch to Properties Management' : 'Switch to Investment Portfolio'}
        </button>
        <button className="btn btn-ghost" onClick={onLogout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  )
}