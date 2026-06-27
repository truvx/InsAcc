import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  onSuccess: () => void
  storedPassword?: string
}

export default function Login({ onSuccess, storedPassword = '1234' }: Props) {
  const [mode, setMode] = useState<'email' | 'pin'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const pinRef = useRef(pin)
  pinRef.current = pin

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Enter your email'); return }
    if (!password) { setError('Enter your password'); return }
    if (password === storedPassword) {
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
    if (mode !== 'pin') return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleNumpadClick(e.key)
      else if (e.key === 'Enter') handlePinSubmit()
      else if (e.key === 'Backspace') handleBackspace()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode])

  return (
    <div className="login-screen">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="login-logo">
          <motion.div
            className="login-logo-icon"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
          >I</motion.div>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'email' ? (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="login-title">Sign In</div>
              <div className="login-subtitle">Enter your credentials to continue</div>

              {error && <div className="form-error" style={{ textAlign: 'center', marginBottom: 16 }}>{error}</div>}

              <form className="login-form" onSubmit={handleEmailSubmit}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  Sign In
                </button>
              </form>

              <div className="login-footer">
                <span className="login-link" onClick={() => { setMode('pin'); setError(''); setPin('') }}>
                  Forgot password? Use passcode instead
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="pin"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="login-title">Passcode Login</div>
              <div className="login-subtitle">Enter your 4-digit PIN</div>

              {error && <div className="form-error" style={{ textAlign: 'center', marginBottom: 16 }}>{error}</div>}

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
                {[0, 1, 2, 3].map(i => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: pin.length > i ? 1 : pin.length === i ? [1, 1.05, 1] : 1,
                      backgroundColor: pin.length > i ? 'var(--primary)' : 'var(--surface)',
                      borderColor: pin.length > i ? 'var(--primary)' : pin.length === i ? 'var(--primary)' : 'var(--border)',
                    }}
                    transition={{ duration: 0.15 }}
                    style={{
                      width: 48, height: 48, borderRadius: 8, border: '2px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, color: pin.length > i ? '#fff' : 'transparent'
                    }}
                  >
                    {pin.length > i ? '●' : ''}
                  </motion.div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                  <motion.button
                    key={d}
                    className="btn btn-secondary"
                    onClick={() => handleNumpadClick(String(d))}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{ height: 48, fontSize: 18 }}
                  >{d}</motion.button>
                ))}
                <button className="btn btn-ghost" onClick={handleClear} style={{ height: 48, fontSize: 13 }}>Clear</button>
                <motion.button
                  className="btn btn-secondary"
                  onClick={() => handleNumpadClick('0')}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ height: 48, fontSize: 18 }}
                >0</motion.button>
                <motion.button
                  className="btn btn-primary"
                  onClick={handlePinSubmit}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ height: 48, fontSize: 18 }}
                >↵</motion.button>
              </div>

              <div className="login-footer">
                <span className="login-link" onClick={() => { setMode('email'); setError('') }}>
                  ← Back to email login
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
