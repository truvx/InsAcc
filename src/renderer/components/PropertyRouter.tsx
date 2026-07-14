import React from 'react'
import type { Account, Voucher, BankMapping, BankReconciliationRecord, FiscalYear } from '../accounting/types'
import type { PropAccount, PropTransaction, PropertyEntry, UnitEntry, TenantEntry, LeaseEntry, PdcCheque, MainCategory, PropProperty, IncomeCategory, Customer, SecurityDeposit, SecurityDepositGlMappings, PropertyTransactionCategory, PropertyExpense } from '../data/propertyTypes'
import type { AuditEvent } from '../data/auditTypes'
import type { AccountingEngine } from '../accounting/accountingEngine'
import type { PurchaseRecord } from '../data/purchaseLedger'
import PropertyDashboard from './PropertyDashboard'
import PropertyProperties from './PropertyProperties'
import PropertyTenants from './PropertyTenants'
import PropertyLeases from './PropertyLeases'
import PropertyBankAccounts from './PropertyBankAccounts'
import PropertyTransactions from './PropertyTransactions'
import PropertyReceiptVoucher from './PropertyReceiptVoucher'
import PropertyPaymentVoucher from './PropertyPaymentVoucher'
import PropertyJournalVoucher from './PropertyJournalVoucher'
import PropertyChartOfAccounts from './PropertyChartOfAccounts'
import PropertyAccountsDashboard from './PropertyAccountsDashboard'
import PropertyTrialBalance from './PropertyTrialBalance'
import PropertyBalanceSheet from './PropertyBalanceSheet'
import PropertyProfitLoss from './PropertyProfitLoss'
import PropertyPdcManager from './PropertyPdcManager'
import PropertyDepositManager from './PropertyDepositManager'
import PropertyExpenses from './PropertyExpenses'
import PropertyReports from './PropertyReports'
import PropertyDocuments from './PropertyDocuments'
import PropertySettings from './PropertySettings'
import PeriodClosingWizard from './PeriodClosingWizard'
import History from './History'
import { filterPropertyAccounts } from '../accounting/propertyAccountFilter'

interface Props {
  activePage: string
  onNavigate: (page: string) => void
  currency: string
  dateFormat: string
  language: string
  accounts: Account[]
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>
  vouchers: Voucher[]
  setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>
  bankMappings: BankMapping[]
  setBankMappings: React.Dispatch<React.SetStateAction<BankMapping[]>>
  propAccounts: PropAccount[]
  setPropAccounts: React.Dispatch<React.SetStateAction<PropAccount[]>>
  propTransactions?: PropTransaction[]
  setPropTransactions?: React.Dispatch<React.SetStateAction<PropTransaction[]>>
  propProperties: PropertyEntry[]
  setPropProperties: React.Dispatch<React.SetStateAction<PropertyEntry[]>>
  propUnits: UnitEntry[]
  setPropUnits: React.Dispatch<React.SetStateAction<UnitEntry[]>>
  propTenants: TenantEntry[]
  setPropTenants: React.Dispatch<React.SetStateAction<TenantEntry[]>>
  propLeases: LeaseEntry[]
  setPropLeases: React.Dispatch<React.SetStateAction<LeaseEntry[]>>
  pdcCheques: PdcCheque[]
  setPdcCheques: React.Dispatch<React.SetStateAction<PdcCheque[]>>
  propDocuments: any[]
  setPropDocuments: React.Dispatch<React.SetStateAction<any[]>>
  propAuditEvents: AuditEvent[]
  setPropAuditEvents: React.Dispatch<React.SetStateAction<AuditEvent[]>>
  accountingEngine: AccountingEngine
  mainCategories: MainCategory[]
  setMainCategories: React.Dispatch<React.SetStateAction<MainCategory[]>>
  hierarchyProperties: PropProperty[]
  setHierarchyProperties: React.Dispatch<React.SetStateAction<PropProperty[]>>
  incomeCategories: IncomeCategory[]
  setIncomeCategories: React.Dispatch<React.SetStateAction<IncomeCategory[]>>
  customers: Customer[]
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>
  bankReconciliations: BankReconciliationRecord[]
  setBankReconciliations: React.Dispatch<React.SetStateAction<BankReconciliationRecord[]>>
  securityDeposits: SecurityDeposit[]
  setSecurityDeposits: React.Dispatch<React.SetStateAction<SecurityDeposit[]>>
  depositMappings: SecurityDepositGlMappings
  setDepositMappings: React.Dispatch<React.SetStateAction<SecurityDepositGlMappings>>
  purchaseRecords?: PurchaseRecord[]
  propertyTransactionCategories?: PropertyTransactionCategory[]
  setPropertyTransactionCategories?: React.Dispatch<React.SetStateAction<PropertyTransactionCategory[]>>
  propExpenses?: PropertyExpense[]
  setPropExpenses?: React.Dispatch<React.SetStateAction<PropertyExpense[]>>
  fiscalYears: FiscalYear[]
  setFiscalYears: React.Dispatch<React.SetStateAction<FiscalYear[]>>
  
  supabaseUrl?: string
  setSupabaseUrl?: React.Dispatch<React.SetStateAction<string>>
  supabaseKey?: string
  setSupabaseKey?: React.Dispatch<React.SetStateAction<string>>
  supabaseEnabled?: boolean
  setSupabaseEnabled?: React.Dispatch<React.SetStateAction<boolean>>
}

export default function PropertyRouter(props: Props) {
  const {
    activePage, onNavigate, currency, dateFormat, language,
    accounts, setAccounts, vouchers, setVouchers, bankMappings, setBankMappings,
    propAccounts, setPropAccounts,
    propTransactions, setPropTransactions,
    propProperties, setPropProperties, propUnits, setPropUnits,
    propTenants, setPropTenants,
    propLeases, setPropLeases, pdcCheques, setPdcCheques,
    propDocuments, setPropDocuments, propAuditEvents, setPropAuditEvents,
    accountingEngine,
    mainCategories, setMainCategories,
    hierarchyProperties, setHierarchyProperties,
    incomeCategories, setIncomeCategories,
    customers, setCustomers,
    bankReconciliations, setBankReconciliations,
    securityDeposits, setSecurityDeposits,
    depositMappings, setDepositMappings,
    purchaseRecords,
    propertyTransactionCategories = [],
    setPropertyTransactionCategories,
    propExpenses = [],
    setPropExpenses,
    fiscalYears,
    setFiscalYears,
  } = props

  const propertyAccounts = React.useMemo(() => filterPropertyAccounts(accounts), [accounts])

  // Helper to extract floor from unit name
  const getFloorFromUnitName = (name: string): string => {
    const lowercase = name.toLowerCase()
    const unitMatch = lowercase.match(/unit\s+(\d+)/)
    if (unitMatch) {
      const num = unitMatch[1]
      if (num.length >= 3) {
        return num.slice(0, num.length - 2)
      }
      return '1'
    }
    if (lowercase.includes('shop') || lowercase.includes('store') || lowercase.includes('ground') || lowercase.includes('g0')) {
      return 'G'
    }
    const anyNumMatch = lowercase.match(/\d+/)
    if (anyNumMatch) {
      const num = anyNumMatch[0]
      if (num.length >= 3) {
        return num.slice(0, num.length - 2)
      }
    }
    return '1'
  }

  const mappedProperties = React.useMemo(() => {
    return hierarchyProperties.map(hp => {
      const mc = mainCategories.find(c => c.id === hp.mainCategoryId)
      const type = mc ? (mc.name as any) : 'Building'
      return {
        id: hp.id,
        name: hp.name,
        type: (['Building', 'Villa', 'Apartment', 'Commercial', 'Land'].includes(type) ? type : 'Building') as any,
        location: 'Ajman',
        purchaseDate: '2026-01-01',
        purchaseValue: 0,
        currentValue: 0,
        status: 'Active' as const,
        owner: 'Fatma Ibrahim Moosa',
        description: '',
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    })
  }, [hierarchyProperties, mainCategories])

  const mappedUnits = React.useMemo(() => {
    return customers.map(c => {
      const ic = incomeCategories.find(cat => cat.id === c.incomeCategoryId)
      const propertyId = ic ? ic.propertyId : ''
      const floor = getFloorFromUnitName(c.name)
      const activeLease = propLeases.find(l => l.unitId === c.id && l.status === 'Active')
      return {
        id: c.id,
        propertyId,
        unitNumber: c.name,
        floor,
        area: 1200,
        bedrooms: 2,
        bathrooms: 2,
        parking: 1,
        status: activeLease ? 'Occupied' as const : 'Vacant' as const,
        rentAmount: activeLease ? activeLease.monthlyRent : 5000,
        securityDeposit: activeLease ? activeLease.deposit : 2000,
        maintenanceCharge: 0,
        tenantId: activeLease ? activeLease.tenantId : null,
        leaseId: activeLease ? activeLease.id : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    })
  }, [customers, incomeCategories, propLeases])

  switch (activePage) {
    case 'dashboard':
      return <PropertyDashboard
        currency={currency} dateFormat={dateFormat} language={language}
        properties={mappedProperties} units={mappedUnits} leases={propLeases}
        accounts={propAccounts}
        chartAccounts={propertyAccounts} chartVouchers={vouchers}
        bankMappings={bankMappings}
        onNavigate={onNavigate}
      />
    case 'properties':
      return <PropertyProperties
        currency={currency}
        mainCategories={mainCategories}
        setMainCategories={setMainCategories}
        propProperties={hierarchyProperties}
        setPropProperties={setHierarchyProperties}
        incomeCategories={incomeCategories}
        setIncomeCategories={setIncomeCategories}
        customers={customers}
        setCustomers={setCustomers}
      />
    case 'tenants':
      return <PropertyTenants
        currency={currency} dateFormat={dateFormat} language={language}
        tenants={propTenants} setTenants={setPropTenants}
        leases={propLeases} units={mappedUnits}
        onNavigate={onNavigate}
      />
    case 'leases':
      return <PropertyLeases
        currency={currency} dateFormat={dateFormat} language={language}
        leases={propLeases} setLeases={setPropLeases}
        tenants={propTenants}
        properties={mappedProperties} units={mappedUnits}
        setUnits={setPropUnits}
        pdcCheques={pdcCheques} setPdcCheques={setPdcCheques}
        accounts={propertyAccounts} vouchers={vouchers} setVouchers={setVouchers}
        securityDeposits={securityDeposits} setSecurityDeposits={setSecurityDeposits}
        accountingEngine={accountingEngine} propAccounts={propAccounts}
        bankMappings={bankMappings} depositMappings={depositMappings}
        onNavigate={onNavigate}
      />
    case 'expenses':
      return <PropertyExpenses
        currency={currency}
        dateFormat={dateFormat}
        language={language}
        expenses={propExpenses}
        setExpenses={setPropExpenses}
        properties={mappedProperties}
        units={mappedUnits}
        propAccounts={propAccounts}
        accounts={accounts}
        setAccounts={setAccounts}
        vouchers={vouchers}
        setVouchers={setVouchers}
        bankMappings={bankMappings}
        onAuditEvent={setPropAuditEvents ? (e => setPropAuditEvents(prev => [e, ...prev])) : undefined}
      />
    case 'transactions':
      return <PropertyTransactions
        currency={currency} dateFormat={dateFormat} language={language}
        propTransactions={propTransactions} setPropTransactions={setPropTransactions}
        propertyTransactionCategories={propertyTransactionCategories}
        setPropertyTransactionCategories={setPropertyTransactionCategories}
        properties={mappedProperties}
        tenants={propTenants}
        accounts={propertyAccounts}
        setAccounts={setAccounts}
        vouchers={vouchers}
        setVouchers={setVouchers}
        propAccounts={propAccounts}
        bankMappings={bankMappings}
        pdcCheques={pdcCheques}
        securityDeposits={securityDeposits}
        propExpenses={propExpenses}
        onAuditEvent={setPropAuditEvents ? (e => setPropAuditEvents(prev => [e, ...prev])) : undefined}
      />
    case 'bank-accounts':
      return <PropertyBankAccounts
        currency={currency} dateFormat={dateFormat} language={language}
        propAccounts={propAccounts} setPropAccounts={setPropAccounts}
        bankReconciliations={bankReconciliations}
        setBankReconciliations={setBankReconciliations}
        accounts={propertyAccounts}
        setAccounts={setAccounts}
        vouchers={vouchers}
        setVouchers={setVouchers}
        bankMappings={bankMappings}
        setBankMappings={setBankMappings}
        accountingEngine={accountingEngine}
        onAuditEvent={setPropAuditEvents ? (e => setPropAuditEvents(prev => [e, ...prev])) : undefined}
        purchaseRecords={purchaseRecords}
        pdcCheques={pdcCheques}
        securityDeposits={securityDeposits}
      />
    case 'receipt-voucher':
      return <PropertyReceiptVoucher
        currency={currency} dateFormat={dateFormat} language={language}
        accounts={propertyAccounts} vouchers={vouchers} setVouchers={setVouchers}
        propAccounts={propAccounts} bankMappings={bankMappings}
        accountingEngine={accountingEngine}
        leases={propLeases} setLeases={setPropLeases}
        tenants={propTenants}
        properties={mappedProperties} units={mappedUnits}
        purchaseRecords={purchaseRecords}
        pdcCheques={pdcCheques} setPdcCheques={setPdcCheques}
        onAuditEvent={setPropAuditEvents ? (e => setPropAuditEvents(prev => [e, ...prev])) : undefined}
        auditEvents={propAuditEvents}
      />
    case 'payment-voucher':
      return <PropertyPaymentVoucher
        currency={currency} dateFormat={dateFormat} language={language}
        accounts={propertyAccounts} vouchers={vouchers} setVouchers={setVouchers}
        propAccounts={propAccounts} bankMappings={bankMappings}
        accountingEngine={accountingEngine}
        properties={mappedProperties} units={mappedUnits}
        purchaseRecords={purchaseRecords}
        onAuditEvent={setPropAuditEvents ? (e => setPropAuditEvents(prev => [e, ...prev])) : undefined}
        auditEvents={propAuditEvents}
      />
    case 'journal-voucher':
      return <PropertyJournalVoucher
        currency={currency} dateFormat={dateFormat} language={language}
        accounts={propertyAccounts} vouchers={vouchers} setVouchers={setVouchers}
        accountingEngine={accountingEngine}
        onAuditEvent={setPropAuditEvents ? (e => setPropAuditEvents(prev => [e, ...prev])) : undefined}
        auditEvents={propAuditEvents}
      />
    case 'chart-of-accounts':
      return <PropertyChartOfAccounts
        currency={currency} accounts={propertyAccounts} vouchers={vouchers}
        setAccounts={setAccounts}
      />
    case 'accounts-dashboard':
      return <PropertyAccountsDashboard
        currency={currency}
        accounts={propertyAccounts}
        vouchers={vouchers}
        bankAccounts={propAccounts}
        bankMappings={bankMappings}
        properties={propProperties}
        leases={propLeases}
        tenants={propTenants}
      />
    case 'trial-balance':
      return <PropertyTrialBalance
        currency={currency} accounts={propertyAccounts} vouchers={vouchers}
      />
    case 'balance-sheet':
      return <PropertyBalanceSheet
        currency={currency} accounts={propertyAccounts} vouchers={vouchers}
      />
    case 'profit-loss':
      return <PropertyProfitLoss
        currency={currency} accounts={propertyAccounts} vouchers={vouchers}
      />
    case 'pdc-manager':
      return <PropertyPdcManager
        pdcCheques={pdcCheques} setPdcCheques={setPdcCheques}
        leases={propLeases} tenants={propTenants}
        properties={mappedProperties}
        dateFormat={dateFormat} currency={currency}
        accounts={propertyAccounts}
        vouchers={vouchers}
        setVouchers={setVouchers}
        accountingEngine={accountingEngine}
        propAccounts={propAccounts}
        bankMappings={bankMappings}
        onNavigate={onNavigate}
      />
    case 'deposit-manager':
      return <PropertyDepositManager
        leases={propLeases} tenants={propTenants}
        properties={mappedProperties}
        dateFormat={dateFormat} currency={currency}
        accounts={propertyAccounts}
        vouchers={vouchers}
        setVouchers={setVouchers}
        accountingEngine={accountingEngine}
        propAccounts={propAccounts}
        bankMappings={bankMappings}
        securityDeposits={securityDeposits}
        setSecurityDeposits={setSecurityDeposits}
        depositMappings={depositMappings}
        setDepositMappings={setDepositMappings}
      />
    case 'reports':
      return <PropertyReports
        currency={currency} dateFormat={dateFormat} language={language}
        properties={mappedProperties} units={mappedUnits} tenants={propTenants}
        leases={propLeases}
        propAccounts={propAccounts}
        accounts={propertyAccounts} vouchers={vouchers}
        bankMappings={bankMappings}
        onNavigate={onNavigate}
        expenses={propExpenses}
      />
    case 'documents':
      return <PropertyDocuments
        propDocuments={propDocuments}
        setPropDocuments={setPropDocuments}
        properties={mappedProperties}
        dateFormat={dateFormat}
        currentUser="User"
      />
    case 'period-close':
      return <PeriodClosingWizard
        currency={currency}
        accounts={propertyAccounts}
        vouchers={vouchers}
        setVouchers={setVouchers}
        fiscalYears={fiscalYears}
        setFiscalYears={setFiscalYears}
      />
    case 'history':
      return <History auditEvents={propAuditEvents} language={language} />
    case 'settings':
      return <PropertySettings
        currentTheme="light" onThemeChange={() => {}}
        currency={currency} onSetCurrency={() => {}}
        dateFormat={dateFormat} onSetDateFormat={() => {}}
        language={language} onSetLanguage={() => {}}
        supabaseUrl={props.supabaseUrl} onSetSupabaseUrl={props.setSupabaseUrl}
        supabaseKey={props.supabaseKey} onSetSupabaseKey={props.setSupabaseKey}
        supabaseEnabled={props.supabaseEnabled} onSetSupabaseEnabled={props.setSupabaseEnabled}
      />
    default:
      return <PropertyDashboard
        currency={currency} dateFormat={dateFormat} language={language}
        properties={mappedProperties} units={mappedUnits} leases={propLeases}
        accounts={propAccounts}
        chartAccounts={propertyAccounts} chartVouchers={vouchers}
        bankMappings={bankMappings}
      />
  }
}
