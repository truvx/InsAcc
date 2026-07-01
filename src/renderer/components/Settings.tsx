import React, { useState } from 'react'
import type { UserEntry, LogEntry } from '../data/types'
import type { AuditEvent } from '../data/auditTypes'
import { recordModuleEvent } from '../services/auditService'
import Toast from './Toast'

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
}

export default function Settings({
  currentTheme, onThemeChange,
  users, onSetUsers, logs, onSetLogs,
  storedPassword, onSetStoredPassword,
  currency, onSetCurrency, dateFormat, onSetDateFormat,
  language, onSetLanguage, autoLogout, onSetAutoLogout,
  moduleLabel, onResetAllData, onAuditEvent,
}: Props) {
  const [activeTab, setActiveTab] = useState('general')
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserRole, setNewUserRole] = useState('Accounts')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

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
          {[{ id: 'general', label: 'General' }, { id: 'users', label: 'User Management' }, { id: 'security', label: 'Security' }, { id: 'notifications', label: 'Notifications' }].map(tab => (
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
                <select className="input" value={currency} onChange={e => { onSetCurrency(e.target.value); onAuditEvent?.(recordModuleEvent('Settings', 'Update', 'Currency', '', `Currency changed to ${e.target.value}`)) }}>
                  <option value="AED">AED - UAE Dirham</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Date Format</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Current: {dateFormat}</div>
                </div>
                <select className="input" value={dateFormat} onChange={e => { onSetDateFormat(e.target.value); onAuditEvent?.(recordModuleEvent('Settings', 'Update', 'Date Format', '', `Date format changed to ${e.target.value}`)) }}>
                  <option>DD/MM/YYYY</option>
                  <option>MM/DD/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Language</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Current: {language}</div>
                </div>
                <select className="input" value={language} onChange={e => { onSetLanguage(e.target.value); onAuditEvent?.(recordModuleEvent('Settings', 'Update', 'Language', '', `Language changed to ${e.target.value}`)) }}>
                  <option value="English">English</option>
                  <option value="Arabic">Arabic</option>
                  <option value="French">French</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Auto Logout</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Session timeout: {autoLogout}</div>
                </div>
                <select className="input" value={autoLogout} onChange={e => { onSetAutoLogout(e.target.value); onAuditEvent?.(recordModuleEvent('Settings', 'Update', 'Auto Logout', '', `Auto logout changed to ${e.target.value}`)) }}>
                  <option>5 minutes</option>
                  <option>15 minutes</option>
                  <option>30 minutes</option>
                  <option>1 hour</option>
                  <option>Never</option>
                </select>
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
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="form-label">Role</label>
                      <select className="input" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                        <option value="Accounts">Accounts</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
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
      </div>
    </div>
  )
}
