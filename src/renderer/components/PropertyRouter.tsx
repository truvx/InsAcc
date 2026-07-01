import React from 'react'
import type { Account, Voucher, BankMapping, BankReconciliationRecord } from '../accounting/types'
import type { PropAccount, PropTransaction, PropertyEntry, UnitEntry, TenantEntry, LeaseEntry, PdcCheque, MainCategory, PropProperty, IncomeCategory, Customer } from '../data/propertyTypes'
import type { AuditEvent } from '../data/auditTypes'
import type { AccountingEngine } from '../accounting/accountingEngine'
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
import PropertyReports from './PropertyReports'
import PropertyDocuments from './PropertyDocuments'
import PropertySettings from './PropertySettings'
import History from './History'

interface Props {
  activePage: string
  onNavigate: (page: string) => void
  currency: string
  dateFormat: string
  language: string
  accounts: Account[]
  vouchers: Voucher[]
  setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>
  bankMappings: BankMapping[]
  propAccounts: PropAccount[]
  setPropAccounts: React.Dispatch<React.SetStateAction<PropAccount[]>>
  propTransactions: PropTransaction[]
  setPropTransactions: React.Dispatch<React.SetStateAction<PropTransaction[]>>
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
}

export default function PropertyRouter(props: Props) {
  const {
    activePage, onNavigate, currency, dateFormat, language,
    accounts, vouchers, setVouchers, bankMappings,
    propAccounts, setPropAccounts, propTransactions, setPropTransactions,
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
  } = props

  switch (activePage) {
    case 'dashboard':
      return <PropertyDashboard
        currency={currency} dateFormat={dateFormat} language={language}
        properties={propProperties} units={propUnits} leases={propLeases}
        transactions={propTransactions} accounts={propAccounts}
        chartAccounts={accounts} chartVouchers={vouchers}
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
      return <PropertyTenants currency={currency} />
    case 'leases':
      return <PropertyLeases
        currency={currency} dateFormat={dateFormat} language={language}
        leases={propLeases} setLeases={setPropLeases}
        tenants={propTenants} properties={propProperties} units={propUnits}
        setUnits={setPropUnits}
        pdcCheques={pdcCheques} setPdcCheques={setPdcCheques}
        accounts={accounts} vouchers={vouchers}
      />
    case 'transactions':
      return <PropertyTransactions
        currency={currency} dateFormat={dateFormat} language={language}
        propTransactions={propTransactions} setPropTransactions={setPropTransactions}
      />
    case 'bank-accounts':
      return <PropertyBankAccounts
        currency={currency} dateFormat={dateFormat} language={language}
        propAccounts={propAccounts} setPropAccounts={setPropAccounts}
        propTransactions={propTransactions} setPropTransactions={setPropTransactions}
        bankReconciliations={bankReconciliations}
        setBankReconciliations={setBankReconciliations}
      />
    case 'receipt-voucher':
      return <PropertyReceiptVoucher
        currency={currency} dateFormat={dateFormat} language={language}
        accounts={accounts} vouchers={vouchers} setVouchers={setVouchers}
        propAccounts={propAccounts} bankMappings={bankMappings}
        accountingEngine={accountingEngine}
        leases={propLeases} tenants={propTenants}
      />
    case 'payment-voucher':
      return <PropertyPaymentVoucher
        currency={currency} dateFormat={dateFormat} language={language}
        accounts={accounts} vouchers={vouchers} setVouchers={setVouchers}
        propAccounts={propAccounts} bankMappings={bankMappings}
        accountingEngine={accountingEngine}
        properties={propProperties}
      />
    case 'journal-voucher':
      return <PropertyJournalVoucher
        currency={currency} dateFormat={dateFormat} language={language}
        accounts={accounts} vouchers={vouchers} setVouchers={setVouchers}
        accountingEngine={accountingEngine}
      />
    case 'chart-of-accounts':
      return <PropertyChartOfAccounts
        currency={currency} accounts={accounts} vouchers={vouchers}
      />
    case 'accounts-dashboard':
      return <PropertyAccountsDashboard
        currency={currency} accounts={accounts} vouchers={vouchers}
      />
    case 'trial-balance':
      return <PropertyTrialBalance
        currency={currency} accounts={accounts} vouchers={vouchers}
      />
    case 'balance-sheet':
      return <PropertyBalanceSheet
        currency={currency} accounts={accounts} vouchers={vouchers}
      />
    case 'profit-loss':
      return <PropertyProfitLoss
        currency={currency} accounts={accounts} vouchers={vouchers}
      />
    case 'pdc-manager':
      return <PropertyPdcManager
        pdcCheques={pdcCheques} setPdcCheques={setPdcCheques}
        leases={propLeases} tenants={propTenants}
        dateFormat={dateFormat} currency={currency}
      />
    case 'reports':
      return <PropertyReports
        currency={currency} dateFormat={dateFormat} language={language}
        properties={propProperties} units={propUnits} tenants={propTenants}
        leases={propLeases} propTransactions={propTransactions}
        propAccounts={propAccounts}
        accounts={accounts} vouchers={vouchers}
        onNavigate={onNavigate}
      />
    case 'documents':
      return <PropertyDocuments propDocuments={propDocuments} dateFormat={dateFormat} />
    case 'history':
      return <History auditEvents={propAuditEvents} language={language} />
    case 'settings':
      return <PropertySettings
        currentTheme="light" onThemeChange={() => {}}
        currency={currency} onSetCurrency={() => {}}
        dateFormat={dateFormat} onSetDateFormat={() => {}}
        language={language} onSetLanguage={() => {}}
      />
    default:
      return <PropertyDashboard
        currency={currency} dateFormat={dateFormat} language={language}
        properties={propProperties} units={propUnits} leases={propLeases}
        transactions={propTransactions} accounts={propAccounts}
        chartAccounts={accounts} chartVouchers={vouchers}
      />
  }
}
