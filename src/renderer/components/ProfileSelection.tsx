import React from 'react'
import { motion } from 'framer-motion'
import type { Profile } from '../data/sampleData'

interface Props {
  profiles: Profile[]
  onSelect: (profile: Profile) => void
  onBackToLogin: () => void
}

const ROLE_STYLE: Record<string, { gradient: string; color: string }> = {
  Admin: {
    gradient: 'linear-gradient(135deg, #DE8DA9, #C85C8E)',
    color: '#DE8DA9',
  },
  Accounts: {
    gradient: 'linear-gradient(135deg, #4F7BFF, #3557D6)',
    color: '#4F7BFF',
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, delay: 0.1 + i * 0.12, ease: 'easeOut' },
  }),
}

export default function ProfileSelection({ profiles, onSelect, onBackToLogin }: Props) {
  return (
    <div className="ps-page">
      <div className="ps-layout">
        <div className="ps-left">
          <div className="ps-brand" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={onBackToLogin}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: 6,
                fontSize: 14,
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 500,
                color: '#5C6A86',
                marginRight: 8,
                transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(92, 106, 134, 0.08)'
                e.currentTarget.style.color = '#1E293B'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#5C6A86'
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back
            </button>
            <div className="ps-logo">I</div>
            <div>
              <div className="ps-brand-name">InsAcc</div>
              <div className="ps-brand-suite">ERP Suite</div>
            </div>
          </div>

          <div className="ps-heading-section">
            <h1 className="ps-heading">Who is using?</h1>
            <p className="ps-subtitle">Select your profile to continue</p>
          </div>

          <div className="ps-security">
            <div className="ps-security-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <div className="ps-security-title">Secure access to your account</div>
              <div className="ps-security-desc">Your data is protected and encrypted</div>
            </div>
          </div>
        </div>

        <div className="ps-right">
          <div className="ps-cards-container">
            {profiles.length === 0 ? (
              <div className="ps-empty">
                <div className="ps-empty-icon">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <p className="ps-empty-text">No profiles found</p>
                <button className="btn btn-primary">Create Profile</button>
              </div>
            ) : (
              <div className="ps-cards">
                {profiles.map((profile, i) => {
                  const style = ROLE_STYLE[profile.role] ?? ROLE_STYLE.Admin
                  return (
                    <motion.button
                      key={profile.id}
                      className="ps-card"
                      onClick={() => onSelect(profile)}
                      variants={cardVariants}
                      custom={i}
                      initial="hidden"
                      animate="visible"
                      whileHover={{ y: -3, scale: 1.03, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="ps-avatar" style={{ background: style.gradient }}>
                        {profile.avatar ? (
                          <img src={profile.avatar} alt={profile.name} className="ps-avatar-img" />
                        ) : (
                          <span>{profile.initials}</span>
                        )}
                      </div>
                      <div className="ps-card-name">{profile.name}</div>
                    </motion.button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
