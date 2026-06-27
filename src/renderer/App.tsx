import React, { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import Login from './components/Login'
import ModuleSelection from './components/ModuleSelection'
import ProfileSelection from './components/ProfileSelection'
import type { Profile } from './data/sampleData'
import Dashboard from './components/Dashboard'
import Investments, { type Investment, generateId } from './components/Investments'
import Transactions, { type Transaction } from './components/Transactions'
import BankAccounts, { type StatementEntry } from './components/BankAccounts'
import Reports from './components/Reports'
import Documents, { type DocItem } from './components/Documents'
import History from './components/History'
import Settings from './components/Settings'
import Sidebar from './components/Sidebar'
import PurchaseLedger from './components/PurchaseLedger'
import Property from './components/Property'
import PageTransition from './components/PageTransition'
import { getDefaultCategories } from './data/purchaseData'
import type { PurchaseCategory, Purchase } from './data/purchaseData'
import {
  DEFAULT_PROPERTY_CATEGORIES, DEFAULT_PROPERTY_BUILDINGS,
  DEFAULT_PROPERTY_UNITS, DEFAULT_PROPERTY_TENANTS, DEFAULT_RENT_PAYMENTS,
  type PropertyCategory, type PropertyBuilding, type PropertyUnit,
  type PropertyTenant, type RentPayment,
} from './data/propertyData'
import { usePersistedState } from './usePersistedState'

type Screen = 'profiles' | 'login' | 'module' | 'dashboard'
type Module = 'investment' | 'property'
type InvPage = 'dashboard' | 'investments' | 'transactions' | 'bank-accounts' | 'reports' | 'documents' | 'history' | 'settings' | 'purchase-ledger'
type PropPage = 'dashboard' | 'properties' | 'tenants' | 'income' | 'documents' | 'settings'

interface UserEntry {
  name: string
  role: string
  status: string
}

interface LogEntry {
  action: string
  user: string
  time: string
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const storedLoginProfiles: Profile[] = [
    { id: 1, name: 'Sameer Ishaq Harmoudi', role: 'Admin' as const, avatar: '', initials: 'SH', locked: false },
    { id: 2, name: 'Accounts', role: 'Accounts' as const, avatar: '', initials: 'AC', locked: false },
  ]
  const [activeModule, setActiveModule] = useState<Module>('investment')
  const [activePage, setActivePage] = useState<string>('dashboard')
  const [theme, setTheme] = useState('light')
  const [storedPassword, setStoredPassword] = useState('1234')
  const [currency, setCurrency] = useState('AED')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [language, setLanguage] = useState('English')
  const [autoLogout, setAutoLogout] = useState('15 minutes')
  const [investments, setInvestments, resetInvestments] = usePersistedState<Investment[]>('insacc_investments', [])
  const [transactions, setTransactions, resetTransactions] = usePersistedState<Transaction[]>('insacc_transactions', [])
  const [statement, setStatement, resetStatement] = usePersistedState<StatementEntry[]>('insacc_statement', [])
  const [balance, setBalance, resetBalance] = usePersistedState<number>('insacc_balance', 0)
  const [documents, setDocuments, resetDocuments] = usePersistedState<DocItem[]>('insacc_documents', [])
  const [storedLogs, setStoredLogs, resetLogs] = usePersistedState<LogEntry[]>('insacc_logs', [])
  const [purchaseCategories, setPurchaseCategories] = usePersistedState<PurchaseCategory[]>('insacc_purchase_categories', getDefaultCategories())
  const [purchases, setPurchases, resetPurchases] = usePersistedState<Purchase[]>('insacc_purchases', [])
  const [invUsers, setInvUsers] = usePersistedState<UserEntry[]>('insacc_inv_users', [
    { name: 'Owner', role: 'Admin', status: 'Active' },
    { name: 'Accounts', role: 'Accounts', status: 'Active' },
  ])
  const [propUsers, setPropUsers] = usePersistedState<UserEntry[]>('insacc_prop_users', [
    { name: 'Owner', role: 'Admin', status: 'Active' },
    { name: 'Accounts', role: 'Accounts', status: 'Active' },
  ])
  const [propCategories, setPropCategories] = usePersistedState<PropertyCategory[]>('insacc_prop_categories', DEFAULT_PROPERTY_CATEGORIES)
  const [propBuildings, setPropBuildings] = usePersistedState<PropertyBuilding[]>('insacc_prop_buildings', DEFAULT_PROPERTY_BUILDINGS)
  const [propUnits, setPropUnits] = usePersistedState<PropertyUnit[]>('insacc_prop_units', DEFAULT_PROPERTY_UNITS)
  const [propTenants, setPropTenants] = usePersistedState<PropertyTenant[]>('insacc_prop_tenants', DEFAULT_PROPERTY_TENANTS)
  const [propRentPayments, setPropRentPayments] = usePersistedState<RentPayment[]>('insacc_prop_rent', DEFAULT_RENT_PAYMENTS)

  const CLEAR_VERSION = 7

  useEffect(() => {
    const stored = localStorage.getItem('insacc_clear_version')
    if (stored !== String(CLEAR_VERSION)) {
      Object.keys(localStorage).filter(k => k.startsWith('insacc_')).forEach(k => localStorage.removeItem(k))
      localStorage.setItem('insacc_clear_version', String(CLEAR_VERSION))
      window.location.reload()
    }
  }, [])

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
  }, [theme])

  const handleLoginSuccess = () => {
    setScreen('profiles')
  }

  const handleProfileSelect = (profile: Profile) => {
    setSelectedProfile(profile)
    setScreen('module')
  }

  const handleModuleSelect = (mod: Module) => {
    setActiveModule(mod)
    setActivePage('dashboard')
    setScreen('dashboard')
  }

  const handleLogout = () => {
    setSelectedProfile(null)
    setScreen('login')
  }

  if (screen === 'login') {
    return <Login onSuccess={handleLoginSuccess} storedPassword={storedPassword} />
  }

  if (screen === 'profiles') {
    return <ProfileSelection profiles={storedLoginProfiles} onSelect={handleProfileSelect} />
  }

  if (screen === 'module') {
    return <ModuleSelection onSelect={handleModuleSelect} onBackToProfiles={() => setScreen('login')} />
  }

  if (screen === 'dashboard') {
    const renderPage = () => {
      if (activeModule === 'property') {
        if (activePage === 'settings') {
          return (
            <Settings
              currentTheme={theme} onThemeChange={setTheme}
              users={propUsers} onSetUsers={setPropUsers}
              logs={storedLogs} onSetLogs={setStoredLogs}
              storedPassword={storedPassword} onSetStoredPassword={setStoredPassword}
              currency={currency} onSetCurrency={setCurrency}
              dateFormat={dateFormat} onSetDateFormat={setDateFormat}
              language={language} onSetLanguage={setLanguage}
              autoLogout={autoLogout} onSetAutoLogout={setAutoLogout}
              moduleLabel="Property"
              onResetAllData={() => {}}
            />
          )
        }
        if (activePage === 'documents') {
          return (
            <Documents
              profile={{ name: 'Property Manager', role: 'Admin', id: 1, initials: 'PM', avatar: '', locked: false }}
              currency={currency} dateFormat={dateFormat} language={language}
              documents={documents} setDocuments={setDocuments}
              tenants={propTenants}
            />
          )
        }
        return (
          <Property
            profile={{ name: 'Property Manager', role: 'Admin', id: 1, initials: 'PM', avatar: '', locked: false }}
            currency={currency} dateFormat={dateFormat} language={language}
            categories={propCategories} setCategories={setPropCategories}
            buildings={propBuildings} setBuildings={setPropBuildings}
            units={propUnits} tenants={propTenants} rentPayments={propRentPayments}
            setUnits={setPropUnits} setTenants={setPropTenants} setRentPayments={setPropRentPayments}
            page={activePage} onNavigate={(p) => setActivePage(p)}
          />
        )
      }

      switch (activePage as InvPage) {
        case 'dashboard': return (
          <Dashboard
            profile={{ name: 'Investor', role: 'Admin', id: 1, initials: 'IN', avatar: '', locked: false }}
            currency={currency} dateFormat={dateFormat} language={language}
            purchaseCategories={purchaseCategories} purchases={purchases}
          />
        )
        case 'investments': return (
          <Investments
            profile={{ name: 'Investor', role: 'Admin', id: 1, initials: 'IN', avatar: '', locked: false }}
            currency={currency} dateFormat={dateFormat} language={language}
            investments={investments} setInvestments={setInvestments} generateId={generateId}
          />
        )
        case 'transactions': return (
          <Transactions
            profile={{ name: 'Investor', role: 'Admin', id: 1, initials: 'IN', avatar: '', locked: false }}
            currency={currency} dateFormat={dateFormat} language={language}
            transactions={transactions} setTransactions={setTransactions}
          />
        )
        case 'bank-accounts': return (
          <BankAccounts
            profile={{ name: 'Investor', role: 'Admin', id: 1, initials: 'IN', avatar: '', locked: false }}
            currency={currency} dateFormat={dateFormat} language={language}
            statement={statement} setStatement={setStatement} balance={balance} setBalance={setBalance}
          />
        )
        case 'reports': return <Reports profile={{ name: 'Investor', role: 'Admin', id: 1, initials: 'IN', avatar: '', locked: false }} language={language} />
        case 'documents': return (
          <Documents
            profile={{ name: 'Investor', role: 'Admin', id: 1, initials: 'IN', avatar: '', locked: false }}
            dateFormat={dateFormat} language={language}
            documents={documents} setDocuments={setDocuments}
          />
        )
        case 'purchase-ledger': return (
          <PurchaseLedger
            profile={{ name: 'Investor', role: 'Admin', id: 1, initials: 'IN', avatar: '', locked: false }}
            currency={currency} dateFormat={dateFormat} language={language}
            categories={purchaseCategories} purchases={purchases} setPurchases={setPurchases}
          />
        )
        case 'history': return (
          <History
            profile={{ name: 'Investor', role: 'Admin', id: 1, initials: 'IN', avatar: '', locked: false }}
            language={language}
            investments={investments} transactions={transactions}
          />
        )
        case 'settings': return (
          <Settings
            currentTheme={theme} onThemeChange={setTheme}
            users={invUsers} onSetUsers={setInvUsers}
            logs={storedLogs} onSetLogs={setStoredLogs}
            storedPassword={storedPassword} onSetStoredPassword={setStoredPassword}
            currency={currency} onSetCurrency={setCurrency}
            dateFormat={dateFormat} onSetDateFormat={setDateFormat}
            language={language} onSetLanguage={setLanguage}
            autoLogout={autoLogout} onSetAutoLogout={setAutoLogout}
            moduleLabel="Investment"
            onResetAllData={() => {}}
          />
        )
      }
    }

    return (
      <div className="app-shell">
        <Sidebar
          activeModule={activeModule}
          activePage={activePage}
          onNavigate={(page) => setActivePage(page)}
          onLogout={handleLogout}
          onModuleChange={(mod) => { setActiveModule(mod); setActivePage('dashboard') }}
          theme={theme as 'light' | 'dark'}
          profileName={selectedProfile?.name || 'User'}
          profileRole={selectedProfile?.role || 'Admin'}
        />
        <AnimatePresence mode="wait">
          <PageTransition pageKey={activePage + '-' + activeModule}>
            {renderPage()}
          </PageTransition>
        </AnimatePresence>
      </div>
    )
  }

  return null
}
