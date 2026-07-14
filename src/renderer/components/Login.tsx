import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import type { LoginEntry } from '../App'

interface Props {
  onSuccess: () => void
  storedPassword?: string
  onBackToModule?: () => void
  loginEntries?: LoginEntry[]
}

type LoginTab = 'email' | 'passcode'

function MailIcon({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2,4 12,13 22,4" />
    </svg>
  )
}

function LockIcon({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function MailSmallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2,4 12,13 22,4" />
    </svg>
  )
}

function LockSmallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function TrendingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function BriefcaseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

export default function Login({ onSuccess, storedPassword = '1234', onBackToModule, loginEntries = [] }: Props) {
  const [activeTab, setActiveTab] = useState<LoginTab>('email')
  const [emailValue, setEmailValue] = useState('')
  const [passwordValue, setPasswordValue] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [remember, setRemember] = useState(false)
  const pinRef = useRef(pin)
  pinRef.current = pin

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailValue) { setError('Enter your email'); return }
    if (!passwordValue) { setError('Enter your password'); return }
    
    const normalizedEmail = emailValue.trim().toLowerCase()
    
    // Default admin fallback
    const isDefaultAdmin = normalizedEmail === 'admin@insacc.com' && passwordValue === storedPassword

    const match = loginEntries.find(
      entry => entry.email.trim().toLowerCase() === normalizedEmail && entry.password === passwordValue
    )
    
    if (match || isDefaultAdmin) {
      onSuccess()
    } else {
      setError('Invalid email or password')
    }
  }

  const handleNumpadClick = (digit: string) => {
    if (pinRef.current.length < 4) {
      setPin(prev => prev + digit)
      setError('')
    }
  }

  const handleBackspace = () => setPin(prev => prev.slice(0, -1))
  const handleClear = () => { setPin(''); setError('') }

  const handlePinSubmit = () => {
    const currentPin = pinRef.current
    if (currentPin.length === 4) {
      if (currentPin === storedPassword) {
        onSuccess()
      } else {
        setError('Invalid PIN. Please try again.')
        setPin('')
      }
    } else {
      setError('Please enter a 4-digit PIN')
    }
  }

  useEffect(() => {
    if (activeTab !== 'passcode') return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleNumpadClick(e.key)
      else if (e.key === 'Enter') handlePinSubmit()
      else if (e.key === 'Backspace') handleBackspace()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeTab])

  useEffect(() => {
    setError('')
  }, [activeTab])

  const features = [
    {
      icon: ShieldIcon,
      title: 'Secure & Private',
      desc: 'Bank-grade encryption keeps your financial data safe.',
    },
    {
      icon: TrendingIcon,
      title: 'Real-time Insights',
      desc: 'Get real-time visibility into your portfolio.',
    },
    {
      icon: BriefcaseIcon,
      title: 'Smart Management',
      desc: 'Manage assets and property in one platform.',
    },
  ]

  const tabs: { id: LoginTab; label: string; icon: React.FC<{ color?: string }> }[] = [
    { id: 'email', label: 'Email & Password', icon: MailIcon },
    { id: 'passcode', label: 'Passcode Login', icon: LockIcon },
  ]

  return (
    <div className="login-screen">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className="login-left">
          <div className="login-left-bg" />
          <div className="login-left-content">
            <div className="login-logo">InsAcc</div>
            <div className="login-tagline">Premium Asset &amp; Investment<br />Accounting Platform</div>

            <div className="login-features">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  className="login-feature"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.3 }}
                >
                  <div className="login-feature-icon">{f.icon()}</div>
                  <div>
                    <div className="login-feature-title">{f.title}</div>
                    <div className="login-feature-desc">{f.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="login-charts">
              <svg className="login-chart-svg" viewBox="0 0 300 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="16" y="55" width="14" height="35" rx="2" fill="#2E7D32" opacity="0.08" />
                <rect x="38" y="38" width="14" height="52" rx="2" fill="#2E7D32" opacity="0.08" />
                <rect x="60" y="45" width="14" height="45" rx="2" fill="#2E7D32" opacity="0.08" />
                <rect x="82" y="28" width="14" height="62" rx="2" fill="#2E7D32" opacity="0.08" />
                <path d="M120 70 L155 55 L190 60 L225 40 L260 45 L295 30" stroke="#43A047" strokeWidth="2" opacity="0.12" vectorEffect="non-scaling-stroke" />
                <circle cx="155" cy="55" r="3" fill="#43A047" opacity="0.15" />
                <circle cx="225" cy="40" r="3" fill="#43A047" opacity="0.15" />
                <circle cx="295" cy="30" r="3" fill="#43A047" opacity="0.15" />
              </svg>
            </div>

            <div className="login-copyright">© 2026 InsAcc ERP.<br />All rights reserved.</div>
          </div>
        </div>

        <div className="login-right">
          <div className="login-right-content">
            {onBackToModule && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                style={{ marginBottom: 12 }}
              >
                <button
                  onClick={onBackToModule}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 15,
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 500,
                    color: '#5C6A86',
                    transition: 'color 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#2E7D32' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#5C6A86' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  Back
                </button>
              </motion.div>
            )}
            <div className="login-heading">Welcome Back</div>
            <div className="login-subheading">Sign in to access your InsAcc ERP account</div>

            <div className="login-tabs">
              {tabs.map(tab => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    className={`login-tab${isActive ? ' active' : ''}`}
                    onClick={() => { setActiveTab(tab.id); if (tab.id !== 'passcode') setPin('') }}
                    type="button"
                  >
                    <Icon color={isActive ? '#2E7D32' : 'currentColor'} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'email' && (
                <motion.div
                  key="email"
                  className="login-form-section"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  {error && <div className="login-form-error">{error}</div>}

                  <form className="login-form" onSubmit={handleEmailSubmit} noValidate>
                    <div className="login-field">
                      <label className="login-label">Email</label>
                      <div className="login-input-wrapper">
                        <span className="login-input-icon"><MailSmallIcon /></span>
                        <input
                          type="email"
                          placeholder="you@company.com"
                          value={emailValue}
                          onChange={e => { setEmailValue(e.target.value); setError('') }}
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="login-field">
                      <label className="login-label">Password</label>
                      <div className="login-input-wrapper">
                        <span className="login-input-icon"><LockSmallIcon /></span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={passwordValue}
                          onChange={e => { setPasswordValue(e.target.value); setError('') }}
                        />
                        <button
                          type="button"
                          className="login-pw-toggle"
                          onClick={() => setShowPassword(prev => !prev)}
                          tabIndex={-1}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                    </div>

                    <div className="login-remember-row">
                      <label className="login-checkbox-label">
                        <input
                          type="checkbox"
                          className="login-checkbox"
                          checked={remember}
                          onChange={e => setRemember(e.target.checked)}
                        />
                        <span className="login-checkbox-mark" />
                        <span>Remember me</span>
                      </label>
                    </div>

                    <button type="submit" className="login-signin-btn">
                      Sign In
                    </button>
                  </form>
                </motion.div>
              )}

              {activeTab === 'passcode' && (
                <motion.div
                  key="passcode"
                  className="login-passcode-section"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  {error && <div className="login-form-error">{error}</div>}

                  <div className="login-pin-dots">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className={`login-pin-dot${pin.length > i ? ' filled' : ''}`}>
                        {pin.length > i && <div className="login-pin-dot-fill" />}
                      </div>
                    ))}
                  </div>

                  <div className="login-numpad">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                      <button
                        key={d}
                        type="button"
                        className="login-numpad-btn"
                        onClick={() => handleNumpadClick(String(d))}
                      >
                        {d}
                      </button>
                    ))}
                    <button type="button" className="login-numpad-btn login-numpad-util" onClick={handleClear}>
                      Clear
                    </button>
                    <button type="button" className="login-numpad-btn" onClick={() => handleNumpadClick('0')}>
                      0
                    </button>
                    <button type="button" className="login-numpad-btn login-numpad-enter" onClick={handlePinSubmit}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="5 12 9 16 19 8" />
                      </svg>
                    </button>
                  </div>

                  <div className="login-help-back">
                    <button type="button" className="login-contact" onClick={() => setActiveTab('email')}>
                      ← Back to email login
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
