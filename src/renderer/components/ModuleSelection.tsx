import React from 'react'
import { motion } from 'framer-motion'

interface Props {
  onSelect: (module: 'investment' | 'property') => void
  onBackToProfiles: () => void
}

function ShieldIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DE8DA9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function TrendingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DE8DA9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DE8DA9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

function PortfolioIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3BA549" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7C4DFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <line x1="8" y1="6" x2="10" y2="6" />
      <line x1="14" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="10" y2="10" />
      <line x1="14" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="10" y2="14" />
      <line x1="14" y1="14" x2="16" y2="14" />
    </svg>
  )
}

function ChevronRightIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

const features = [
  {
    icon: ShieldIcon,
    title: 'Secure & Private',
    desc: 'Bank-grade encryption keeps your financial data safe and private.',
  },
  {
    icon: TrendingIcon,
    title: 'Real-time Insights',
    desc: 'Get real-time visibility into your portfolio and financial performance.',
  },
  {
    icon: GridIcon,
    title: 'Smart Management',
    desc: 'Manage assets, investments and properties in one unified platform.',
  },
]

interface ModuleCardProps {
  icon: React.ReactNode
  title: string
  description: string
  accentColor: string
  accentBg: string
  arrowColor: string
  hoverBorderColor: string
  hoverShadow: string
  onClick: () => void
  delay: number
}

function ModuleCard({
  icon,
  title,
  description,
  accentBg,
  arrowColor,
  hoverBorderColor,
  hoverShadow,
  onClick,
  delay,
}: ModuleCardProps) {
  return (
    <motion.button
      className="ms-card"
      onClick={onClick}
      type="button"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      style={
        {
          '--ms-hover-border': hoverBorderColor,
          '--ms-hover-shadow': hoverShadow,
        } as React.CSSProperties
      }
    >
      <div className="ms-card-icon" style={{ background: accentBg }}>
        {icon}
      </div>
      <div className="ms-card-body">
        <div className="ms-card-title">{title}</div>
        <div className="ms-card-desc">{description}</div>
      </div>
      <div className="ms-card-arrow">
        <ChevronRightIcon color={arrowColor} />
      </div>
    </motion.button>
  )
}

export default function ModuleSelection({ onSelect, onBackToProfiles }: Props) {
  return (
    <div className="ms-screen">
      <motion.div
        className="ms-container"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className="ms-right">
          <div className="ms-right-content">
            <div className="ms-cards">
              <ModuleCard
                icon={<PortfolioIcon />}
                title="INVESTMENT PORTFOLIO"
                description="Purchase tracking, portfolio management, and comprehensive financial reports for all your investments."
                accentBg="#EDF9F0"
                accentColor="#3BA549"
                arrowColor="#3BA549"
                hoverBorderColor="#3BA549"
                hoverShadow="0 12px 30px rgba(59,165,73,.12)"
                onClick={() => onSelect('investment')}
                delay={0.2}
              />
              <ModuleCard
                icon={<BuildingIcon />}
                title="PROPERTIES MANAGEMENT"
                description="Rent collection, tenant management, maintenance tracking and income reporting for your properties."
                accentBg="#F5F2FF"
                accentColor="#7C4DFF"
                arrowColor="#7C4DFF"
                hoverBorderColor="#7C4DFF"
                hoverShadow="0 12px 30px rgba(124,77,255,.12)"
                onClick={() => onSelect('property')}
                delay={0.3}
              />
            </div>

          </div>
        </div>

        <div className="ms-left">
          <div className="ms-left-bg" />
          <div className="ms-left-content">
            <div className="ms-brand">
              <div className="ms-logo-mark">I</div>
              <div className="ms-logo-text">InsAcc</div>
            </div>
            <div className="ms-tagline">
              Premium Asset &amp; Investment<br />Accounting Platform
            </div>

            <div className="ms-features">
              {features.map((f, i) => {
                const Icon = f.icon
                return (
                  <motion.div
                    key={f.title}
                    className="ms-feature"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.08, duration: 0.3 }}
                  >
                    <div className="ms-feature-icon"><Icon /></div>
                    <div>
                      <div className="ms-feature-title">{f.title}</div>
                      <div className="ms-feature-desc">{f.desc}</div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <div className="ms-charts">
              <svg className="ms-chart-svg" viewBox="0 0 400 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="20" y="70" width="20" height="40" rx="3" fill="#2F54C8" opacity="0.08" />
                <rect x="50" y="45" width="20" height="65" rx="3" fill="#2F54C8" opacity="0.08" />
                <rect x="80" y="55" width="20" height="55" rx="3" fill="#2F54C8" opacity="0.08" />
                <rect x="110" y="30" width="20" height="80" rx="3" fill="#2F54C8" opacity="0.08" />
                <rect x="140" y="50" width="20" height="60" rx="3" fill="#2F54C8" opacity="0.08" />
                <rect x="170" y="25" width="20" height="85" rx="3" fill="#2F54C8" opacity="0.08" />
                <path d="M220 85 L260 65 L300 70 L340 45 L380 50" stroke="#DE8DA9" strokeWidth="2.5" opacity="0.1" vectorEffect="non-scaling-stroke" />
                <circle cx="260" cy="65" r="4" fill="#DE8DA9" opacity="0.12" />
                <circle cx="340" cy="45" r="4" fill="#DE8DA9" opacity="0.12" />
                <circle cx="380" cy="50" r="4" fill="#DE8DA9" opacity="0.12" />
              </svg>
            </div>

            <div className="ms-copyright">
              &copy; 2026 InsAcc ERP.<br />All rights reserved.
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
