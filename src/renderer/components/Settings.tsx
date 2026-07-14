import React, { useState } from 'react'
import type { UserEntry, LogEntry } from '../data/types'
import type { AuditEvent } from '../data/auditTypes'
import { recordModuleEvent } from '../services/auditService'
import type { InvestmentCategory, InvestmentAsset } from '../data/investmentMasterData'
import { getActiveCategories, getAssetsForCategory } from '../data/investmentMasterData'
import {
  isBuiltInCategory,
  renameCategory as svcRenameCategory,
  deleteCategory as svcDeleteCategory,
  createAsset as svcCreateAsset,
  deleteAsset as svcDeleteAsset,
} from '../services/assetCategoryService'
import Toast from './Toast'
import { Select } from './design/DesignSystem'
import { Plus } from 'lucide-react'

interface Props {
  currentTheme: string
  onThemeChange: (theme: string) => void
  users: UserEntry[]
  onSetUsers: (users: UserEntry[]) => void
  logs: LogEntry[]
  onSetLogs: (logs: LogEntry[]) => void
  storedPassword: string
  onSetStoredPassword: (pw: string) => void
  currency: string
  onSetCurrency: (c: string) => void
  dateFormat: string
  onSetDateFormat: (d: string) => void
  language: string
  onSetLanguage: (l: string) => void
  autoLogout: string
  onSetAutoLogout: (a: string) => void
  moduleLabel: string
  onResetAllData: () => void
  onAuditEvent?: (event: AuditEvent) => void
  investmentCategories?: InvestmentCategory[]
  setInvestmentCategories?: React.Dispatch<React.SetStateAction<InvestmentCategory[]>>
  investmentAssets?: InvestmentAsset[]
  setInvestmentAssets?: React.Dispatch<React.SetStateAction<InvestmentAsset[]>>

  supabaseUrl?: string
  onSetSupabaseUrl?: (url: string) => void
  supabaseKey?: string
  onSetSupabaseKey?: (key: string) => void
  supabaseEnabled?: boolean
  onSetSupabaseEnabled?: (enabled: boolean) => void

  onClearTransactions?: () => void
}

export default function Settings({
  currentTheme, onThemeChange,
  users, onSetUsers, logs, onSetLogs,
  storedPassword, onSetStoredPassword,
  currency, onSetCurrency, dateFormat, onSetDateFormat,
  language, onSetLanguage, autoLogout, onSetAutoLogout,
  moduleLabel, onResetAllData, onAuditEvent,
  investmentCategories = [],
  setInvestmentCategories,
  investmentAssets = [],
  setInvestmentAssets,
  supabaseUrl = '',
  onSetSupabaseUrl,
  supabaseKey = '',
  onSetSupabaseKey,
  supabaseEnabled = false,
  onSetSupabaseEnabled,
  onClearTransactions,
}: Props) {
  const [activeTab, setActiveTab] = useState('general')
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserRole, setNewUserRole] = useState('Accounts')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  // ── Asset Categories Tab State ──────────────────────────────────────────────
  const activeCategories = getActiveCategories(investmentCategories)
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null)

  // Rename category modal
  const [renameCatId, setRenameCatId] = useState<string | null>(null)
  const [renameCatValue, setRenameCatValue] = useState('')
  const [renameCatError, setRenameCatError] = useState('')

  // Add asset modal
  const [addAssetCatId, setAddAssetCatId] = useState<string | null>(null)
  const [newAssetName, setNewAssetName] = useState('')
  const [addAssetError, setAddAssetError] = useState('')

  const handleRenameCategory = () => {
    if (!renameCatId) return
    const result = svcRenameCategory(renameCatId, renameCatValue, investmentCategories)
    if (!result.ok || !result.data) {
      setRenameCatError(result.error || 'Invalid')
      return
    }
    setInvestmentCategories?.(prev => prev.map(c => c.id === renameCatId ? result.data! : c))
    setRenameCatId(null)
    setRenameCatValue('')
    setRenameCatError('')
    setToast({ visible: true, message: 'Category renamed.', type: 'success' })
  }

  const handleDeleteCategory = (categoryId: string) => {
    const result = svcDeleteCategory(categoryId, investmentCategories, investmentAssets, [])
    if (!result.ok) {
      setToast({ visible: true, message: result.error || 'Cannot delete', type: 'error' })
      return
    }
    setInvestmentCategories?.(prev => prev.filter(c => c.id !== categoryId))
    setToast({ visible: true, message: 'Category deleted.', type: 'success' })
  }

  const handleAddAsset = () => {
    if (!addAssetCatId) return
    const result = svcCreateAsset(addAssetCatId, newAssetName, investmentAssets)
    if (!result.ok || !result.data) {
      setAddAssetError(result.error || 'Invalid')
      return
    }
    setInvestmentAssets?.(prev => [...prev, result.data!])
    setNewAssetName('')
    setAddAssetError('')
    setAddAssetCatId(null)
    setToast({ visible: true, message: 'Asset added.', type: 'success' })
  }

  const handleDeleteAsset = (assetId: string) => {
    const result = svcDeleteAsset(assetId, investmentAssets, [])
    if (!result.ok) {
      setToast({ visible: true, message: result.error || 'Cannot delete', type: 'error' })
      return
    }
    setInvestmentAssets?.(prev => prev.filter(a => a.id !== assetId))
    setToast({ visible: true, message: 'Asset deleted.', type: 'success' })
  }

  const [notifications, setNotifications] = useState([
    { label: 'Bond Maturity Alerts', desc: 'Get notified when bonds are about to mature', enabled: true },
    { label: 'Investment Due Dates', desc: 'Reminders for upcoming investment deadlines', enabled: true },
    { label: 'Deposit Maturity', desc: 'Alerts for fixed deposit maturity dates', enabled: false },
    { label: 'Monthly Reports', desc: 'Receive monthly portfolio summary', enabled: true },
  ])

  const handleAddUser = () => {
    if (!newUserName) return
    const newUser: UserEntry = {
      name: newUserName,
      role: newUserRole,
      status: 'Active',
    }
    onSetUsers([...users, newUser])
    onSetLogs([{ action: 'User Created', user: 'Admin', time: 'Just now' }, ...logs])
    setShowAddUser(false)
    setNewUserName('')
    setNewUserRole('Accounts')
  }

  const handleRemoveUser = (index: number) => {
    if (!confirm('Remove this user?')) return
    onSetUsers(users.filter((_, i) => i !== index))
    onSetLogs([{ action: 'User Removed', user: 'Admin', time: 'Just now' }, ...logs])
    setToast({ visible: true, message: 'User removed', type: 'success' })
  }

  const handlePasswordChange = () => {
    if (!currentPassword) { setToast({ visible: true, message: 'Enter current password', type: 'error' }); return }
    if (currentPassword !== storedPassword) { setToast({ visible: true, message: 'Current password is incorrect', type: 'error' }); return }
    if (!newPassword) { setToast({ visible: true, message: 'Enter new password', type: 'error' }); return }
    if (newPassword !== confirmPassword) { setToast({ visible: true, message: 'Passwords do not match', type: 'error' }); return }
    if (newPassword.length < 4) { setToast({ visible: true, message: 'Password must be at least 4 characters', type: 'error' }); return }
    onSetStoredPassword(newPassword)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    onSetLogs([{ action: 'Password Changed', user: 'Admin', time: 'Just now' }, ...logs])
    setToast({ visible: true, message: 'Password updated successfully', type: 'success' })
  }

  const toggleNotification = (index: number) => {
    setNotifications(notifications.map((n, i) => i === index ? { ...n, enabled: !n.enabled } : n))
  }

  return (
    <div className="main-content">
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />
      <div className="main-header">
        <div>
          <h1>{moduleLabel} Settings</h1>
          <p>System configuration and preferences</p>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[
            { id: 'general', label: 'General' },
            { id: 'users', label: 'User Management' },
            { id: 'security', label: 'Security' },
            { id: 'notifications', label: 'Notifications' },
            { id: 'asset-categories', label: 'Asset Categories' },
            { id: 'cloud-sync', label: 'Cloud Sync' },
          ].map(tab => (
            <button key={tab.id} className={`chart-period ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'general' && (
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">General Settings</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Application Theme</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Current: {currentTheme === 'dark' ? 'Dark Mode' : 'Light Turquoise'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className={`chart-period ${currentTheme === 'light' ? 'active' : ''}`} onClick={() => { onThemeChange('light'); onAuditEvent?.(recordModuleEvent('Settings', 'Update', 'Theme', '', `Theme changed to Light`)) }} style={{ padding: '8px 20px', fontSize: 13 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: 'middle' }}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                    Light
                  </button>
                  <button className={`chart-period ${currentTheme === 'dark' ? 'active' : ''}`} onClick={() => { onThemeChange('dark'); onAuditEvent?.(recordModuleEvent('Settings', 'Update', 'Theme', '', `Theme changed to Dark`)) }} style={{ padding: '8px 20px', fontSize: 13 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: 'middle' }}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                    Dark
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Default Currency</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Current: {currency}</div>
                </div>
                <Select
                  value={currency}
                  onChange={e => { onSetCurrency(e.target.value); onAuditEvent?.(recordModuleEvent('Settings', 'Update', 'Currency', '', `Currency changed to ${e.target.value}`)) }}
                  options={[
                    { value: 'AED', label: 'AED - UAE Dirham' },
                    { value: 'USD', label: 'USD - US Dollar' },
                    { value: 'EUR', label: 'EUR - Euro' },
                    { value: 'GBP', label: 'GBP - British Pound' }
                  ]}
                  style={{ margin: 0, minWidth: '220px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Date Format</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Current: {dateFormat}</div>
                </div>
                <Select
                  value={dateFormat}
                  onChange={e => { onSetDateFormat(e.target.value); onAuditEvent?.(recordModuleEvent('Settings', 'Update', 'Date Format', '', `Date format changed to ${e.target.value}`)) }}
                  options={[
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
                  ]}
                  style={{ margin: 0, minWidth: '220px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Language</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Current: {language}</div>
                </div>
                <Select
                  value={language}
                  onChange={e => { onSetLanguage(e.target.value); onAuditEvent?.(recordModuleEvent('Settings', 'Update', 'Language', '', `Language changed to ${e.target.value}`)) }}
                  options={[
                    { value: 'English', label: 'English' },
                    { value: 'Arabic', label: 'Arabic' },
                    { value: 'French', label: 'French' }
                  ]}
                  style={{ margin: 0, minWidth: '220px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Auto Logout</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Session timeout: {autoLogout}</div>
                </div>
                <Select
                  value={autoLogout}
                  onChange={e => { onSetAutoLogout(e.target.value); onAuditEvent?.(recordModuleEvent('Settings', 'Update', 'Auto Logout', '', `Auto logout changed to ${e.target.value}`)) }}
                  options={[
                    { value: '5 minutes', label: '5 minutes' },
                    { value: '15 minutes', label: '15 minutes' },
                    { value: '30 minutes', label: '30 minutes' },
                    { value: '1 hour', label: '1 hour' },
                    { value: 'Never', label: 'Never' }
                  ]}
                  style={{ margin: 0, minWidth: '220px' }}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">{moduleLabel} Users</div>
              <div className="chart-subtitle">{users.length} active user{users.length !== 1 ? 's' : ''}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {users.map((u, i) => (
                <div key={i} className="performance-item">
                  <div className="sidebar-avatar" style={{ background: 'var(--accent)' }}>{u.name[0]}</div>
                  <div className="performance-info">
                    <div className="performance-name">{u.name}</div>
                    <div className="performance-value">{u.role} · {u.status}</div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '4px 12px', fontSize: 12, border: '1px solid var(--danger)', color: 'var(--danger)', background: 'transparent' }}
                    onClick={() => handleRemoveUser(i)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div style={{ marginTop: 16 }}>
                <button className="btn btn-secondary" onClick={() => setShowAddUser(!showAddUser)} style={{ width: '100%' }}>
                  {showAddUser ? 'Cancel' : '+ Add New User'}
                </button>
              </div>
              {showAddUser && (
                <div style={{ marginTop: 12, padding: 16, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="form-label">Full Name</label>
                      <input className="input" placeholder="e.g. Accounts 2" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
                    </div>
                    <Select
                      label="Role"
                      value={newUserRole}
                      onChange={e => setNewUserRole(e.target.value)}
                      options={[
                        { value: 'Accounts', label: 'Accounts' },
                        { value: 'Admin', label: 'Admin' }
                      ]}
                      style={{ margin: 0 }}
                    />
                    <button className="btn btn-primary" style={{ height: 46, padding: '0 24px' }} onClick={handleAddUser}>Create</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">Security & Activity Logs</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input className="input" type="password" placeholder="Enter current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input className="input" type="password" placeholder="Enter new password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input className="input" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handlePasswordChange}>Update Password</button>
              <div style={{ fontSize: 12, color: 'var(--text-light)', textAlign: 'center' }}>Default password: 1234</div>
            </div>
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <div className="chart-title" style={{ marginBottom: 12 }}>Activity Log</div>
              {logs.map((log, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{log.action}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>by {log.user}</span>
                  </div>
                  <span style={{ color: 'var(--text-light)', fontSize: 12 }}>{log.time}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <div className="chart-title" style={{ marginBottom: 8, color: 'var(--danger)' }}>Danger Zone</div>
              
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Clear all transaction history (Vouchers and Audit Logs). This will reset the Trial Balance to zero but keep your properties, tenants, leases, and chart of accounts.
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', border: '1px solid var(--warning)', color: 'var(--warning)' }}
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all transactions and history? This will reset the Trial Balance.')) {
                      onClearTransactions?.()
                      setToast({ visible: true, message: 'Transaction history and Trial Balance have been cleared', type: 'success' })
                    }
                  }}
                >
                  Clear History & Trial Balance
                </button>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Reset all {moduleLabel} data to defaults. This cannot be undone.
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', border: '1px solid var(--danger)', color: 'var(--danger)' }}
                  onClick={() => {
                    if (confirm('Are you sure? This will delete all data.')) {
                      if (confirm('This cannot be undone. Continue?')) {
                        onResetAllData()
                        setToast({ visible: true, message: 'All data has been reset', type: 'success' })
                      }
                    }
                  }}
                >
                  Reset All Data
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">Notification Preferences</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {notifications.map((notif, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{notif.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{notif.desc}</div>
                  </div>
                  <div
                    onClick={() => toggleNotification(i)}
                    style={{
                      width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                      background: notif.enabled ? 'var(--green)' : 'var(--border)',
                      position: 'relative', transition: 'all 0.3s',
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 2, transition: 'all 0.3s',
                      left: notif.enabled ? 22 : 2, boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'asset-categories' && (
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">Asset Categories</div>
              <div className="chart-subtitle">{activeCategories.length} categories &middot; Built-in categories are locked</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeCategories.map(cat => {
                const isBuiltIn = isBuiltInCategory(cat.id)
                const catAssets = getAssetsForCategory(investmentAssets, cat.id)
                const expanded = expandedCategoryId === cat.id
                return (
                  <div key={cat.id} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 16px', cursor: 'pointer',
                        background: expanded ? 'var(--bg-secondary)' : 'transparent',
                      }}
                      onClick={() => setExpandedCategoryId(expanded ? null : cat.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{cat.name}</span>
                        {isBuiltIn && (
                          <span style={{ fontSize: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px', color: 'var(--text-secondary)' }}>Built-in</span>
                        )}
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{catAssets.length} assets</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        {!isBuiltIn && (
                          <>
                            <button
                              className="btn btn-secondary"
                              style={{ fontSize: 11, padding: '3px 10px' }}
                              onClick={() => { setRenameCatId(cat.id); setRenameCatValue(cat.name); setRenameCatError('') }}
                            >Rename</button>
                            <button
                              className="btn btn-secondary"
                              style={{ fontSize: 11, padding: '3px 10px', border: '1px solid var(--danger)', color: 'var(--danger)' }}
                              onClick={() => { if (confirm(`Delete "${cat.name}"?`)) handleDeleteCategory(cat.id) }}
                            >Delete</button>
                          </>
                        )}
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '3px 6px' }}>{expanded ? '▲' : '▼'}</span>
                      </div>
                    </div>
                    {expanded && (
                      <div style={{ padding: '8px 16px 12px', borderTop: '1px solid var(--border)' }}>
                        {catAssets.length === 0 ? (
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>No assets yet.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                            {catAssets.map(asset => (
                              <div key={asset.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ fontSize: 13 }}>{asset.name}</span>
                                <button
                                  className="btn btn-secondary"
                                  style={{ fontSize: 11, padding: '2px 8px', border: '1px solid var(--danger)', color: 'var(--danger)' }}
                                  onClick={() => { if (confirm(`Delete asset "${asset.name}"?`)) handleDeleteAsset(asset.id) }}
                                >Delete</button>
                              </div>
                            ))}
                          </div>
                        )}
                        {addAssetCatId === cat.id ? (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 4 }}>
                            <div style={{ flex: 1 }}>
                              <input
                                className="input"
                                placeholder="Asset name"
                                value={newAssetName}
                                maxLength={50}
                                onChange={e => { setNewAssetName(e.target.value); setAddAssetError('') }}
                                onKeyDown={e => { if (e.key === 'Enter') handleAddAsset(); if (e.key === 'Escape') { setAddAssetCatId(null); setNewAssetName('') } }}
                                autoFocus
                                style={{ marginBottom: 0 }}
                              />
                              {addAssetError && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>{addAssetError}</div>}
                            </div>
                            <button className="btn btn-primary" style={{ fontSize: 12, padding: '10px 16px', flexShrink: 0 }} onClick={handleAddAsset}>Add</button>
                            <button className="btn btn-secondary" style={{ fontSize: 12, padding: '10px 12px', flexShrink: 0 }} onClick={() => { setAddAssetCatId(null); setNewAssetName('') }}>Cancel</button>
                          </div>
                        ) : (
                          <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 14px' }} onClick={() => { setAddAssetCatId(cat.id); setNewAssetName(''); setAddAssetError('') }}>
                            <Plus size={12} strokeWidth={2} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Add Asset
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Rename Category Modal */}
            {renameCatId && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 24, minWidth: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Rename Category</div>
                  <div className="form-group">
                    <label className="form-label">Category Name</label>
                    <input
                      className="input"
                      value={renameCatValue}
                      maxLength={50}
                      onChange={e => { setRenameCatValue(e.target.value); setRenameCatError('') }}
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameCategory() }}
                      autoFocus
                    />
                    {renameCatError && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{renameCatError}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                    <button className="btn btn-secondary" onClick={() => { setRenameCatId(null); setRenameCatError('') }}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleRenameCategory}>Save</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cloud-sync' && (
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">Cloud Database Sync (Supabase)</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Connect your database to Supabase to enable real-time sync across your devices (laptop, mobile phone, tablet).
              </p>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="form-label">Supabase URL</label>
                <input
                  className="input"
                  value={supabaseUrl}
                  onChange={e => onSetSupabaseUrl?.(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                />
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="form-label">Supabase Anon Key</label>
                <input
                  className="input"
                  type="password"
                  value={supabaseKey}
                  onChange={e => onSetSupabaseKey?.(e.target.value)}
                  placeholder="eyJhbGciOi..."
                />
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 8, padding: '12px 0', borderTop: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Enable Cloud Sync</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Sync status: <strong style={{ color: supabaseEnabled ? '#10b981' : '#ef4444' }}>
                      {localStorage.getItem('insacc_supabase_status') || 'disconnected'}
                    </strong>
                  </div>
                </div>
                <div>
                  <button
                    className={`btn ${supabaseEnabled ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
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
                  </button>
                </div>
              </div>

              {supabaseEnabled && (
                <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', padding: '12px' }}
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
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
