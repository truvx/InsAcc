import React from 'react'
import { Input, Select, Button } from './design/DesignSystem'
import Toast from './Toast'
import { useState } from 'react'
import type { LoginEntry } from '../App'

interface Props {
  currentTheme: string
  onThemeChange: (theme: string) => void
  currency: string
  onSetCurrency: (currency: string) => void
  dateFormat: string
  onSetDateFormat: (format: string) => void
  language: string
  onSetLanguage: (language: string) => void

  // Supabase Sync Props
  supabaseUrl?: string
  onSetSupabaseUrl?: (url: string) => void
  supabaseKey?: string
  onSetSupabaseKey?: (key: string) => void
  supabaseEnabled?: boolean
  onSetSupabaseEnabled?: (enabled: boolean) => void

  onClearTransactions?: () => void
  onResetAllData?: () => void
  loginEntries?: LoginEntry[]
  setLoginEntries?: React.Dispatch<React.SetStateAction<LoginEntry[]>>
}

const CURRENCY_OPTIONS = [
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
]

const DATE_FORMAT_OPTIONS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
]

const LANGUAGE_OPTIONS = [
  { value: 'English', label: 'English' },
  { value: 'Arabic', label: 'العربية' },
  { value: 'French', label: 'Français' },
]

export default function PropertySettings({
  currentTheme, onThemeChange, currency, onSetCurrency,
  dateFormat, onSetDateFormat, language, onSetLanguage,
  supabaseUrl = '', onSetSupabaseUrl,
  supabaseKey = '', onSetSupabaseKey,
  supabaseEnabled = false, onSetSupabaseEnabled,
  onClearTransactions, onResetAllData,
  loginEntries = [], setLoginEntries,
}: Props) {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [showAddLogin, setShowAddLogin] = useState(false)
  const [newLoginName, setNewLoginName] = useState('')
  const [newLoginEmail, setNewLoginEmail] = useState('')
  const [newLoginPassword, setNewLoginPassword] = useState('')
  const [newLoginRole, setNewLoginRole] = useState<'Admin' | 'Accounts'>('Admin')

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Settings</div>
            <div className="page-subtitle">Properties Management preferences</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="card-header">
            <span className="card-title">General Settings</span>
          </div>
          <div className="card-body">
            <div className="form-row">
              <Select
                label="Currency"
                value={currency}
                onChange={e => { onSetCurrency(e.target.value); setToast({ visible: true, message: 'Currency updated', type: 'success' }) }}
                options={CURRENCY_OPTIONS}
              />
              <Select
                label="Date Format"
                value={dateFormat}
                onChange={e => { onSetDateFormat(e.target.value); setToast({ visible: true, message: 'Date format updated', type: 'success' }) }}
                options={DATE_FORMAT_OPTIONS}
              />
            </div>
            <div className="form-row">
              <Select
                label="Language"
                value={language}
                onChange={e => { onSetLanguage(e.target.value); setToast({ visible: true, message: 'Language updated', type: 'success' }) }}
                options={LANGUAGE_OPTIONS}
              />

            </div>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 600, marginTop: 24 }}>
          <div className="card-header">
            <span className="card-title">Cloud Database Sync (Supabase)</span>
          </div>
          <div className="card-body">
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              Connect your database to Supabase to enable real-time sync across your devices (laptop, mobile phone, tablet).
            </p>

            <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', marginBottom: 8 }}>Required: Run this SQL in your Supabase SQL Editor first!</div>
              <pre style={{ fontSize: 11, background: 'var(--bg-primary)', padding: 8, borderRadius: 4, overflowX: 'auto', border: '1px solid var(--border)', userSelect: 'all' }}>
{`CREATE TABLE IF NOT EXISTS public.app_sync_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_sync_state;`}
              </pre>
            </div>

            <div className="form-group">
              <Input
                label="Supabase URL"
                value={supabaseUrl}
                onChange={e => onSetSupabaseUrl?.(e.target.value)}
                placeholder="https://your-project.supabase.co"
              />
            </div>
            <div className="form-group">
              <Input
                label="Supabase Anon Key"
                type="password"
                value={supabaseKey}
                onChange={e => onSetSupabaseKey?.(e.target.value)}
                placeholder="eyJhbGciOi..."
              />
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 16 }}>
              <div style={{ flex: 1 }}>
                <span className="form-label" style={{ display: 'block', marginBottom: 4 }}>Enable Cloud Sync</span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  Sync status: <strong style={{ color: supabaseEnabled ? '#10b981' : '#ef4444' }}>
                    {localStorage.getItem('insacc_supabase_status') || 'disconnected'}
                  </strong>
                </span>
              </div>
              <div>
                <Button
                  variant={supabaseEnabled ? 'primary' : 'secondary'}
                  onClick={async () => {
                    const newEnabled = !supabaseEnabled
                    onSetSupabaseEnabled?.(newEnabled)
                    setToast({
                      visible: true,
                      message: newEnabled ? 'Cloud Sync Enabled. Syncing...' : 'Cloud Sync Disabled.',
                      type: 'success'
                    })
                  }}
                >
                  {supabaseEnabled ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </div>
            {supabaseEnabled && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <Button
                  variant="secondary"
                  style={{ width: '100%' }}
                  onClick={async () => {
                    if (supabaseUrl && supabaseKey) {
                      setToast({ visible: true, message: 'Uploading local database to Supabase...', type: 'success' })
                      const { pushAllLocalData } = await import('../services/supabaseSyncService')
                      const success = await pushAllLocalData(supabaseUrl, supabaseKey)
                      if (success) {
                        setToast({ visible: true, message: 'All local data pushed successfully!', type: 'success' })
                      } else {
                        setToast({ visible: true, message: 'Failed to push local data.', type: 'error' })
                      }
                    }
                  }}
                >
                  Push Local Data to Database
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ maxWidth: 600, marginTop: 24 }}>
          <div className="card-header">
            <span className="card-title">Email & Password Logins</span>
          </div>
          <div className="card-body">
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              Manage credentials used to log in via the "Email & Password" login tab.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loginEntries.map((entry, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{entry.name} <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 8 }}>({entry.role})</span></div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{entry.email}</div>
                  </div>
                  <Button
                    variant="secondary"
                    style={{ padding: '4px 12px', fontSize: 12, borderColor: 'var(--danger)', color: 'var(--danger)', background: 'transparent' }}
                    onClick={() => {
                      if (loginEntries.length <= 1) {
                        alert('Cannot delete the last login entry. You must have at least one account to log in.')
                        return
                      }
                      if (confirm(`Are you sure you want to remove the login entry for ${entry.email}?`)) {
                        setLoginEntries?.(prev => prev.filter((_, i) => i !== idx))
                        setToast({ visible: true, message: 'Login entry removed successfully.', type: 'success' })
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              <Button variant="secondary" style={{ width: '100%' }} onClick={() => setShowAddLogin(!showAddLogin)}>
                {showAddLogin ? 'Cancel' : '+ Add Login Account'}
              </Button>
            </div>

            {showAddLogin && (
              <div style={{ marginTop: 12, padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Full Name</label>
                    <input className="input" placeholder="e.g. Sameer" value={newLoginName} onChange={e => setNewLoginName(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Role</label>
                    <Select
                      value={newLoginRole}
                      onChange={e => setNewLoginRole(e.target.value as any)}
                      options={[
                        { value: 'Admin', label: 'Admin' },
                        { value: 'Accounts', label: 'Accounts' }
                      ]}
                      style={{ margin: 0 }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Email Address</label>
                    <input className="input" type="email" placeholder="email@company.com" value={newLoginEmail} onChange={e => setNewLoginEmail(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Password</label>
                    <input className="input" type="password" placeholder="••••••••" value={newLoginPassword} onChange={e => setNewLoginPassword(e.target.value)} />
                  </div>
                </div>
                <Button
                  variant="primary"
                  style={{ width: '100%', marginTop: 8 }}
                  onClick={() => {
                    if (!newLoginName || !newLoginEmail || !newLoginPassword) {
                      alert('Please fill out all fields.')
                      return
                    }
                    if (loginEntries.some(e => e.email.toLowerCase() === newLoginEmail.toLowerCase())) {
                      alert('An account with this email address already exists.')
                      return
                    }
                    setLoginEntries?.(prev => [...prev, {
                      name: newLoginName,
                      email: newLoginEmail,
                      password: newLoginPassword,
                      role: newLoginRole as any
                    }])
                    setNewLoginName('')
                    setNewLoginEmail('')
                    setNewLoginPassword('')
                    setNewLoginRole('Admin')
                    setShowAddLogin(false)
                    setToast({ visible: true, message: 'New login account created successfully.', type: 'success' })
                  }}
                >
                  Create Account
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ maxWidth: 600, marginTop: 24, border: '1px solid var(--danger)' }}>
          <div className="card-header" style={{ borderBottom: '1px solid var(--danger)' }}>
            <span className="card-title" style={{ color: 'var(--danger)' }}>Danger Zone</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Clear all transaction history (vouchers, payments, receipts, and audit logs). This will reset the Trial Balance to zero but keep your properties, tenants, leases, and chart of accounts.
              </p>
              <Button
                variant="secondary"
                style={{ width: '100%', borderColor: 'var(--warning)', color: 'var(--warning)' }}
                onClick={() => {
                  if (confirm('Are you sure you want to clear all transactions and history? This will reset the Trial Balance.')) {
                    onClearTransactions?.()
                    setToast({ visible: true, message: 'Transaction history and Trial Balance have been cleared', type: 'success' })
                  }
                }}
              >
                Clear History & Trial Balance
              </Button>
            </div>

            <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Reset all Properties Management data to defaults. This will permanently delete all properties, leases, tenants, accounts, and transactions.
              </p>
              <Button
                variant="secondary"
                style={{ width: '100%', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                onClick={() => {
                  if (confirm('Are you sure? This will delete all data.')) {
                    if (confirm('This cannot be undone. Continue?')) {
                      onResetAllData?.()
                      setToast({ visible: true, message: 'All data has been reset', type: 'success' })
                    }
                  }
                }}
              >
                Reset All Data
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
