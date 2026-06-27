import React from 'react'
import { t } from '../utils'

interface NavItem {
  id: string
  label: string
}

const INV_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'investments', label: 'Investments' },
  { id: 'transactions', label: 'Transactions' },
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
  { id: 'income', label: 'Rent Income' },
  { id: 'documents', label: 'Documents' },
  { id: 'settings', label: 'Settings' },
]

function NavIcon({ id }: { id: string }) {
  const icons: Record<string, React.ReactNode> = {
    dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>,
    investments: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    transactions: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
    'bank-accounts': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 2 9 22 9 22 7 12 2" /><rect x="4" y="9" width="16" height="11" /><line x1="9" y1="14" x2="9" y2="18" /><line x1="15" y1="14" x2="15" y2="18" /></svg>,
    reports: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
    documents: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
    history: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    'purchase-ledger': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>,
    settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
    properties: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
    tenants: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    income: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
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
  const navItems = activeModule === 'investment' ? INV_NAV : PROP_NAV

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">I</div>
        <span className="sidebar-brand">InsAcc</span>
      </div>

      <div className="sidebar-user">
        <div className="sidebar-avatar" style={{ background: profileRole === 'Admin' ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : '#64748B' }}>
          {profileName.charAt(0)}
        </div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{profileName}</div>
          <div className="sidebar-user-role">{profileRole}</div>
        </div>
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-section">{activeModule === 'investment' ? 'Investment' : 'Property'}</div>
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
      </div>

      <div className="sidebar-footer">
        <button
          className="nav-item"
          onClick={() => onModuleChange(activeModule === 'investment' ? 'property' : 'investment')}
          aria-label="Switch module"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          <span>{activeModule === 'investment' ? 'Switch to Property' : 'Switch to Investment'}</span>
        </button>
        <button className="nav-item" onClick={onLogout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}
