import React from 'react'
import { motion } from 'framer-motion'
import type { Profile } from '../data/sampleData'

interface Props {
  profiles: Profile[]
  onSelect: (profile: Profile) => void
}

export default function ProfileSelection({ profiles, onSelect }: Props) {
  return (
    <div className="login-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ textAlign: 'center' }}
      >
        <motion.div
          className="login-logo-icon"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{ margin: '0 auto 16px', width: 48, height: 48, fontSize: 22 }}
        >I</motion.div>
        <div className="login-title">Who is using?</div>
        <div className="login-subtitle">Select your profile to continue</div>
      </motion.div>

      <div className="profile-grid">
        {profiles.map((profile, i) => (
          <motion.button
            key={profile.id}
            className={`profile-card${profile.role === 'Admin' ? ' admin' : ''}`}
            onClick={() => onSelect(profile)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="profile-avatar" style={{
              background: profile.role === 'Accounts' ? '#64748B' : 'linear-gradient(135deg, #6366F1, #8B5CF6)'
            }}>
              {profile.initials}
            </div>
            <div className="profile-name">{profile.name}</div>
            <div className="profile-role">{profile.role}</div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
