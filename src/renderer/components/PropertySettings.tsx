import React from 'react'
import { Input, Select, Button } from './design/DesignSystem'
import Toast from './Toast'
import { useState } from 'react'

interface Props {
  currentTheme: string
  onThemeChange: (theme: string) => void
  currency: string
  onSetCurrency: (currency: string) => void
  dateFormat: string
  onSetDateFormat: (format: string) => void
  language: string
  onSetLanguage: (language: string) => void
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
}: Props) {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Settings</div>
            <div className="page-subtitle">Property module preferences</div>
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
              <div className="form-group">
                <label className="form-label">Theme</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <Button variant={currentTheme === 'light' ? 'primary' : 'secondary'} size="sm" onClick={() => onThemeChange('light')}>Light</Button>
                  <Button variant={currentTheme === 'dark' ? 'primary' : 'secondary'} size="sm" onClick={() => onThemeChange('dark')}>Dark</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
