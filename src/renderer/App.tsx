import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import Login from './components/Login'
import ModuleSelection from './components/ModuleSelection'
import ProfileSelection from './components/ProfileSelection'
import type { Profile } from './data/sampleData'
import type { UserEntry, LogEntry } from './data/types'
import type { BankAccount, BankTransaction } from './data/banking'
import type { AuditEvent } from './data/auditTypes'
import type { PropAccount, PropTransaction, PropertyEntry, UnitEntry, TenantEntry, LeaseEntry, PdcCheque, PropDocItem, MainCategory, PropProperty, IncomeCategory, Customer, SecurityDeposit, SecurityDepositGlMappings } from './data/propertyTypes'
import type { Investment } from './components/Investments'
import type { Transaction } from './components/Transactions'
import type { DocItem } from './components/Documents'
import Sidebar from './components/Sidebar'
import PropertyRouter from './components/PropertyRouter'
import InvestmentRouter from './components/InvestmentRouter'
import PageTransition from './components/PageTransition'
import { getDefaultCategories } from './data/purchaseData'
import type { PurchaseCategory, Purchase } from './data/purchaseData'
import type { PurchaseRecord } from './data/purchaseLedger'
import { syncAllInvestments } from './services/investmentAggregationService'
import { usePersistedState } from './usePersistedState'
import type { Account, Voucher, BankMapping, BankReconciliationRecord } from './accounting/types'
import { createAccountingEngine } from './accounting/accountingEngine'
import type { Currency, TaxCode, PaymentTerm, Vendor as MasterVendor, MasterCustomer, AssetType, FixedAsset } from './data/masterData'
import { getDefaultCurrencies, getDefaultTaxCodes, getDefaultPaymentTerms } from './services/masterDataService'
import { MasterDataProvider } from './contexts/MasterDataContext'
import type { MasterDataState } from './contexts/MasterDataContext'

type Screen = 'profiles' | 'login' | 'module' | 'dashboard'
type Module = 'investment' | 'property'

export default function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const storedLoginProfiles: Profile[] = [
    { id: 1, name: 'Sameer Ishaq Harmoudi', role: 'Admin' as const, avatar: '', initials: 'SH', locked: false },
    { id: 2, name: 'Accounts', role: 'Accounts' as const, avatar: '', initials: 'AC', locked: false },
  ]
  const [activeModule, setActiveModule] = useState<Module>('investment')
  const [activePage, setActivePage] = useState<string>('dashboard')
  const [theme, setTheme] = usePersistedState<string>('insacc_theme', 'light')
  const [storedPassword, setStoredPassword] = useState('1234')
  const [currency, setCurrency] = useState('AED')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [language, setLanguage] = useState('English')
  const [autoLogout, setAutoLogout] = useState('15 minutes')
  const [investments, setInvestments, resetInvestments] = usePersistedState<Investment[]>('insacc_investments', [])
  const [transactions, setTransactions, resetTransactions] = usePersistedState<Transaction[]>('insacc_transactions', [])
  const [bankAccounts, setBankAccounts, resetBankAccounts] = usePersistedState<BankAccount[]>('insacc_bank_accounts', [])
  const [bankTransactions, setBankTransactions, resetBankTransactions] = usePersistedState<BankTransaction[]>('insacc_bank_transactions', [])
  const [statement, setStatement, resetStatement] = usePersistedState<import('./components/BankAccounts').StatementEntry[]>('insacc_statement', [])
  const [balance, setBalance, resetBalance] = usePersistedState<number>('insacc_balance', 0)
  const [documents, setDocuments, resetDocuments] = usePersistedState<DocItem[]>('insacc_documents', [])
  const [storedLogs, setStoredLogs, resetLogs] = usePersistedState<LogEntry[]>('insacc_logs', [])
  const [purchaseCategories, setPurchaseCategories] = usePersistedState<PurchaseCategory[]>('insacc_purchase_categories', getDefaultCategories())
  const [purchases, setPurchases, resetPurchases] = usePersistedState<Purchase[]>('insacc_purchases', [])
  const [purchaseRecords, setPurchaseRecords] = usePersistedState<PurchaseRecord[]>('insacc_purchases_ledger', [])
  const [invUsers, setInvUsers] = usePersistedState<UserEntry[]>('insacc_inv_users', [])
  const [incomeCustomCategories, setIncomeCustomCategories] = usePersistedState<string[]>('insacc_income_custom_categories', [])
  const [expenseCustomCategories, setExpenseCustomCategories] = usePersistedState<string[]>('insacc_expense_custom_categories', [])
  const [auditEvents, setAuditEvents] = usePersistedState<AuditEvent[]>('insacc_audit_events', [])
  const [accounts, setAccounts] = usePersistedState<Account[]>('insacc_accounts', [])
  const [vouchers, setVouchers] = usePersistedState<Voucher[]>('insacc_vouchers', [])
  const [bankMappings, setBankMappings] = usePersistedState<BankMapping[]>('insacc_bank_mappings', [])
  const [propChartAccounts, setPropChartAccounts] = usePersistedState<Account[]>('insacc_prop_chart_accounts', [])
  const [propVouchers, setPropVouchers] = usePersistedState<Voucher[]>('insacc_prop_vouchers', [])
  const [propBankMappings, setPropBankMappings] = usePersistedState<BankMapping[]>('insacc_prop_bank_mappings', [])

  const [propAccounts, setPropAccounts] = usePersistedState<PropAccount[]>('insacc_prop_accounts', [])
  const [propTransactions, setPropTransactions] = usePersistedState<PropTransaction[]>('insacc_prop_transactions', [])
const [propProperties, setPropProperties] = usePersistedState<PropertyEntry[]>('insacc_prop_properties', [])
const [propUnits, setPropUnits] = usePersistedState<UnitEntry[]>('insacc_prop_units', [])
  const [propTenants, setPropTenants] = usePersistedState<TenantEntry[]>('insacc_prop_tenants', [])
  const [propLeases, setPropLeases] = usePersistedState<LeaseEntry[]>('insacc_prop_leases', [])
  const [pdcCheques, setPdcCheques] = usePersistedState<PdcCheque[]>('insacc_pdc_cheques', [])
  const [securityDeposits, setSecurityDeposits] = usePersistedState<SecurityDeposit[]>('insacc_security_deposits', [])
  const [depositMappings, setDepositMappings] = usePersistedState<SecurityDepositGlMappings>('insacc_security_deposit_mappings', {
    liabilityAccountId: '',
    forfeitureIncomeAccountId: '',
  })
  const [propDocuments, setPropDocuments] = usePersistedState<PropDocItem[]>('insacc_prop_documents', [])
  const [propAuditEvents, setPropAuditEvents] = usePersistedState<import('./data/auditTypes').AuditEvent[]>('insacc_prop_audit_events', [])

  const [mainCategories, setMainCategories] = usePersistedState<MainCategory[]>('insacc_main_categories', [])
  const [hierarchyProperties, setHierarchyProperties] = usePersistedState<PropProperty[]>('insacc_hierarchy_properties', [])
  const [incomeCategories, setIncomeCategories] = usePersistedState<IncomeCategory[]>('insacc_income_categories', [])
  const [customers, setCustomers] = usePersistedState<Customer[]>('insacc_customers', [])

  const [masterCurrencies, setMasterCurrencies] = usePersistedState<Currency[]>('insacc_master_currencies', [])
  const [masterTaxCodes, setMasterTaxCodes] = usePersistedState<TaxCode[]>('insacc_master_tax_codes', [])
  const [masterPaymentTerms, setMasterPaymentTerms] = usePersistedState<PaymentTerm[]>('insacc_master_payment_terms', [])
  const [masterVendors, setMasterVendors] = usePersistedState<MasterVendor[]>('insacc_master_vendors', [])
  const [masterCustomers, setMasterCustomers] = usePersistedState<MasterCustomer[]>('insacc_master_customers', [])
  const [masterAssetTypes, setMasterAssetTypes] = usePersistedState<AssetType[]>('insacc_master_asset_types', [])
  const [masterFixedAssets, setMasterFixedAssets] = usePersistedState<FixedAsset[]>('insacc_master_fixed_assets', [])
  const [bankReconciliations, setBankReconciliations] = usePersistedState<BankReconciliationRecord[]>('insacc_bank_reconciliations', [])

  const accountingEngine = useMemo(() => createAccountingEngine(), [])

  useEffect(() => {
    if (masterCurrencies.length === 0) {
      setMasterCurrencies(getDefaultCurrencies())
    }
    if (masterTaxCodes.length === 0) {
      setMasterTaxCodes(getDefaultTaxCodes())
    }
    if (masterPaymentTerms.length === 0) {
      setMasterPaymentTerms(getDefaultPaymentTerms())
    }
  }, [masterCurrencies, masterTaxCodes, masterPaymentTerms])

  const recordAuditEvent = useCallback((event: AuditEvent) => {
    setAuditEvents(prev => [event, ...prev])
  }, [])

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
  }, [theme])

  const derivedInvestments = useMemo(
    () => syncAllInvestments(purchaseRecords, investments),
    [purchaseRecords, investments]
  )

  const masterDataValue: MasterDataState = useMemo(() => ({
    currencies: masterCurrencies,
    setCurrencies: setMasterCurrencies,
    taxCodes: masterTaxCodes,
    setTaxCodes: setMasterTaxCodes,
    paymentTerms: masterPaymentTerms,
    setPaymentTerms: setMasterPaymentTerms,
    vendors: masterVendors,
    setVendors: setMasterVendors,
    customers: masterCustomers,
    setCustomers: setMasterCustomers,
    assetTypes: masterAssetTypes,
    setAssetTypes: setMasterAssetTypes,
    fixedAssets: masterFixedAssets,
    setFixedAssets: setMasterFixedAssets,
  }), [
    masterCurrencies, masterTaxCodes, masterPaymentTerms,
    masterVendors, masterCustomers, masterAssetTypes, masterFixedAssets,
  ])

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

  const handleBackToModule = () => {
    setScreen('module')
  }

  const handleChangeProfile = () => {
    setSelectedProfile(null)
    setScreen('profiles')
  }

  const handleLogout = () => {
    setSelectedProfile(null)
    setScreen('login')
  }

  const handleResetAllData = () => {
    resetInvestments()
    resetTransactions()
    resetBankAccounts()
    resetBankTransactions()
    resetStatement()
    resetBalance()
    resetDocuments()
    resetLogs()
    resetPurchases()
    setPurchaseCategories(getDefaultCategories())
    setPurchaseRecords([])
    setInvUsers([])
    setIncomeCustomCategories([])
    setExpenseCustomCategories([])
    setAuditEvents([])
    setAccounts([])
    setVouchers([])
    setBankMappings([])
    setPropChartAccounts([])
    setPropVouchers([])
    setPropBankMappings([])
    setMainCategories([])
    setHierarchyProperties([])
    setIncomeCategories([])
    setCustomers([])
    window.location.reload()
  }

  if (screen === 'login') {
    return <Login onSuccess={handleLoginSuccess} storedPassword={storedPassword} onBackToModule={selectedProfile ? handleBackToModule : undefined} />
  }

  if (screen === 'profiles') {
    return <ProfileSelection profiles={storedLoginProfiles} onSelect={handleProfileSelect} />
  }

  if (screen === 'module') {
    return <ModuleSelection onSelect={handleModuleSelect} onBackToProfiles={() => setScreen('profiles')} />
  }

  if (screen === 'dashboard') {
    const renderPage = () => {
      return (
        <MasterDataProvider value={masterDataValue}>
          {renderPageContent()}
        </MasterDataProvider>
      )
    }
    const renderPageContent = () => {
      if (activeModule === 'property') {
        return (
          <PropertyRouter
            activePage={activePage}
            onNavigate={setActivePage}
            currency={currency}
            dateFormat={dateFormat}
            language={language}
            accounts={propChartAccounts}
            vouchers={propVouchers}
            setVouchers={setPropVouchers}
            bankMappings={propBankMappings}
            propAccounts={propAccounts}
            setPropAccounts={setPropAccounts}
            propTransactions={propTransactions}
            setPropTransactions={setPropTransactions}
            propProperties={propProperties}
            setPropProperties={setPropProperties}
            propUnits={propUnits}
            setPropUnits={setPropUnits}
            propTenants={propTenants}
            setPropTenants={setPropTenants}
            propLeases={propLeases}
            setPropLeases={setPropLeases}
            pdcCheques={pdcCheques}
            setPdcCheques={setPdcCheques}
            propDocuments={propDocuments}
            setPropDocuments={setPropDocuments}
            propAuditEvents={propAuditEvents}
            setPropAuditEvents={setPropAuditEvents}
            accountingEngine={accountingEngine}
            mainCategories={mainCategories}
            setMainCategories={setMainCategories}
            hierarchyProperties={hierarchyProperties}
            setHierarchyProperties={setHierarchyProperties}
            incomeCategories={incomeCategories}
            setIncomeCategories={setIncomeCategories}
            customers={customers}
            setCustomers={setCustomers}
            bankReconciliations={bankReconciliations}
            setBankReconciliations={setBankReconciliations}
            securityDeposits={securityDeposits}
            setSecurityDeposits={setSecurityDeposits}
            depositMappings={depositMappings}
            setDepositMappings={setDepositMappings}
          />
        )
      }

      return (
        <InvestmentRouter
          activePage={activePage}
          onNavigate={setActivePage}
          currency={currency}
          dateFormat={dateFormat}
          language={language}
          accounts={accounts}
          vouchers={vouchers}
          setVouchers={setVouchers}
          bankMappings={bankMappings}
          bankAccounts={bankAccounts}
          setBankAccounts={setBankAccounts}
          bankTransactions={bankTransactions}
          setBankTransactions={setBankTransactions}
          investments={derivedInvestments}
          transactions={transactions}
          setTransactions={setTransactions}
          incomeCustomCategories={incomeCustomCategories}
          expenseCustomCategories={expenseCustomCategories}
          setIncomeCustomCategories={setIncomeCustomCategories}
          setExpenseCustomCategories={setExpenseCustomCategories}
          documents={documents}
          setDocuments={setDocuments}
          purchaseRecords={purchaseRecords}
          setPurchaseRecords={setPurchaseRecords}
          auditEvents={auditEvents}
          setAuditEvents={setAuditEvents}
          invUsers={invUsers}
          setInvUsers={setInvUsers}
          storedLogs={storedLogs}
          setStoredLogs={setStoredLogs}
          accountingEngine={accountingEngine}
          storedPassword={storedPassword}
          onSetStoredPassword={setStoredPassword}
          theme={theme}
          onThemeChange={setTheme}
          onResetAllData={handleResetAllData}
          recordAuditEvent={recordAuditEvent}
          setAccounts={setAccounts}
          bankReconciliations={bankReconciliations}
          setBankReconciliations={setBankReconciliations}
        />
      )
    }

    return (
      <div className="app-shell" data-module={activeModule}>
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '0 24px',
              height: 48,
              flexShrink: 0,
              background: 'var(--header-bg)',
              borderBottom: '1px solid var(--header-border)',
            }}
          >
            <button
              onClick={handleChangeProfile}
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
                transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#EDF9F0'
                e.currentTarget.style.color = '#3BA549'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#5C6A86'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Change Profile
            </button>
          </div>
          <AnimatePresence mode="wait">
            <PageTransition pageKey={activePage + '-' + activeModule} module={activeModule}>
              {renderPage()}
            </PageTransition>
          </AnimatePresence>
        </div>
      </div>
    )
  }

  return null
}
