import React from 'react'
import { motion } from 'framer-motion'

interface Props {
  onSelect: (module: 'investment' | 'property') => void
  onBackToProfiles: () => void
}

export default function ModuleSelection({ onSelect, onBackToProfiles }: Props) {
  return (
    <div className="login-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ textAlign: 'center', marginBottom: 32 }}
      >
        <motion.div
          className="login-logo-icon"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{ margin: '0 auto 16px', width: 56, height: 56, fontSize: 26 }}
        >I</motion.div>
        <div className="login-title">Welcome to InsAcc</div>
        <div className="login-subtitle">Select a module to continue</div>
      </motion.div>

      <div className="module-grid">
        <motion.div
          className="module-card"
          onClick={() => onSelect('investment')}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onSelect('investment')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="module-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div className="module-name">Investment Portfolio</div>
          <div className="module-desc">Purchase tracking, portfolio management, and financial reports</div>
        </motion.div>

        <motion.div
          className="module-card"
          onClick={() => onSelect('property')}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onSelect('property')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="module-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div className="module-name">Property Management</div>
          <div className="module-desc">Rent collection, tenant management, and income tracking</div>
        </motion.div>
      </div>

      <motion.div
        style={{ textAlign: 'center', marginTop: 24 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <button className="btn btn-ghost" onClick={onBackToProfiles}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, verticalAlign: 'middle' }}>
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to profile selection
        </button>
      </motion.div>
    </div>
  )
}
