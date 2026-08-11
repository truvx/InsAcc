import React, { useMemo } from 'react'
import type { Account, Voucher, BankMapping, FiscalYear } from '../accounting/types'
import type { LoginEntry } from '../App'
import type { AccountingEngine } from '../accounting/accountingEngine'
import type { BankAccount, BankTransaction } from '../data/banking'
import type { DocItem } from './Documents'
import type { PurchaseRecord } from '../data/purchaseLedger'
import type { PurchaseCategory, Purchase } from '../data/purchaseData'
import type { AuditEvent } from '../data/auditTypes'
import type { UserEntry, LogEntry } from '../data/types'
import type { BankReconciliationRecord } from '../accounting/types'
import type { InvestmentCategory, InvestmentAsset } from '../data/investmentMasterData'
import { filterInvestmentAccounts } from '../accounting/investmentAccountFilter'
import InvestmentDashboard from './InvestmentDashboard'
import InvestmentAccountsDashboard from './InvestmentAccountsDashboard'
import InvestmentChartOfAccounts from './InvestmentChartOfAccounts'
import InvestmentTrialBalance from './InvestmentTrialBalance'
import InvestmentBalanceSheet from './InvestmentBalanceSheet'
import InvestmentProfitLoss from './InvestmentProfitLoss'
import InvestmentReceiptVoucher from './InvestmentReceiptVoucher'
import InvestmentPaymentVoucher from './InvestmentPaymentVoucher'
import InvestmentJournalVoucher from './InvestmentJournalVoucher'
import InvestmentReports from './InvestmentReports'
import InvestmentBankAccounts from './InvestmentBankAccounts'

import Documents from './Documents'
import History from './History'
import Settings from './Settings'
import PurchaseLedger from './PurchaseLedger'
import InvestmentHoldings from './InvestmentHoldings'
import InvestmentTotalAverageHolding from './InvestmentTotalAverageHolding'
import PeriodClosingWizard from './PeriodClosingWizard'

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
  setBankMappings: React.Dispatch<React.SetStateAction<BankMapping[]>>
  bankAccounts: BankAccount[]
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>
  incomeCustomCategories: string[]
  expenseCustomCategories: string[]
  setIncomeCustomCategories: React.Dispatch<React.SetStateAction<string[]>>
  setExpenseCustomCategories: React.Dispatch<React.SetStateAction<string[]>>
  documents: DocItem[]
  setDocuments: React.Dispatch<React.SetStateAction<DocItem[]>>
  purchaseRecords: PurchaseRecord[]
  setPurchaseRecords: React.Dispatch<React.SetStateAction<PurchaseRecord[]>>
  auditEvents: AuditEvent[]
  setAuditEvents: React.Dispatch<React.SetStateAction<AuditEvent[]>>
  invUsers: UserEntry[]
  setInvUsers: React.Dispatch<React.SetStateAction<UserEntry[]>>
  storedLogs: LogEntry[]
  setStoredLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>
  accountingEngine: AccountingEngine
  storedPassword: string
  onSetStoredPassword: (pw: string) => void
  theme: string
  onThemeChange: (t: string) => void
  onClearTransactions?: () => void
  onResetAllData?: () => void
  onDeleteEvent?: (id: string) => void
  loggedInUser?: string
  recordAuditEvent: (event: AuditEvent) => void
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>
  bankReconciliations: BankReconciliationRecord[]
  setBankReconciliations: React.Dispatch<React.SetStateAction<BankReconciliationRecord[]>>
  investmentCategories: InvestmentCategory[]
  setInvestmentCategories: React.Dispatch<React.SetStateAction<InvestmentCategory[]>>
  investmentAssets: InvestmentAsset[]
  setInvestmentAssets: React.Dispatch<React.SetStateAction<InvestmentAsset[]>>
  fiscalYears: FiscalYear[]
  setFiscalYears: React.Dispatch<React.SetStateAction<FiscalYear[]>>

  supabaseUrl?: string
  setSupabaseUrl?: React.Dispatch<React.SetStateAction<string>>
  supabaseKey?: string
  setSupabaseKey?: React.Dispatch<React.SetStateAction<string>>
  supabaseEnabled?: boolean
  setSupabaseEnabled?: React.Dispatch<React.SetStateAction<boolean>>

  loginEntries?: LoginEntry[]
  setLoginEntries?: React.Dispatch<React.SetStateAction<LoginEntry[]>>
}

export default function InvestmentRouter(props: Props) {
  const {
    activePage, onNavigate, currency, dateFormat, language,
    accounts, setAccounts, vouchers, setVouchers, bankMappings, setBankMappings,
    bankAccounts, setBankAccounts,
    incomeCustomCategories, expenseCustomCategories,
    setIncomeCustomCategories, setExpenseCustomCategories,
    documents, setDocuments,
    purchaseRecords, setPurchaseRecords,
    auditEvents, setAuditEvents,
    invUsers, setInvUsers,
    storedLogs, setStoredLogs,
    accountingEngine,
    storedPassword, onSetStoredPassword,
    theme, onThemeChange,
    onResetAllData, recordAuditEvent,
    bankReconciliations, setBankReconciliations,
    investmentCategories, setInvestmentCategories,
    investmentAssets, setInvestmentAssets,
    fiscalYears,
    setFiscalYears,
  } = props

  // Filter accounts to investment-only — single enforcement point for the entire module
  const investmentAccounts = useMemo(() => filterInvestmentAccounts(accounts), [accounts])

  switch (activePage) {
    case 'dashboard':
      return (
        <InvestmentDashboard
          currency={currency}
          accounts={investmentAccounts}
          vouchers={vouchers}
          bankAccounts={bankAccounts}
          bankMappings={bankMappings}
          onNavigate={onNavigate}
          loggedInUser={props.loggedInUser || 'Admin'}
        />
      )
    case 'accounts-dashboard':
      return (
        <InvestmentAccountsDashboard
          currency={currency}
          accounts={investmentAccounts}
          vouchers={vouchers}
          bankAccounts={bankAccounts}
          bankMappings={bankMappings}
          purchaseRecords={purchaseRecords}
        />
      )
    case 'chart-of-accounts':
      return (
        <InvestmentChartOfAccounts
          currency={currency}
          accounts={investmentAccounts}
          vouchers={vouchers}
          setAccounts={setAccounts}
        />
      )
    case 'trial-balance':
      return (
        <InvestmentTrialBalance
          currency={currency}
          accounts={investmentAccounts}
          vouchers={vouchers}
        />
      )
    case 'balance-sheet':
      return (
        <InvestmentBalanceSheet
          currency={currency}
          accounts={investmentAccounts}
          vouchers={vouchers}
        />
      )
    case 'profit-loss':
      return (
        <InvestmentProfitLoss
          currency={currency}
          accounts={investmentAccounts}
          vouchers={vouchers}
        />
      )
    case 'receipt-voucher':
      return (
        <InvestmentReceiptVoucher
          currency={currency} dateFormat={dateFormat}
          accounts={investmentAccounts} vouchers={vouchers} setVouchers={setVouchers}
          bankAccounts={bankAccounts} bankMappings={bankMappings}
          accountingEngine={accountingEngine}
          purchaseRecords={purchaseRecords}
          onAuditEvent={recordAuditEvent}
          auditEvents={auditEvents}
        />
      )
    case 'payment-voucher':
      return (
        <InvestmentPaymentVoucher
          currency={currency} dateFormat={dateFormat}
          accounts={investmentAccounts} vouchers={vouchers} setVouchers={setVouchers}
          bankAccounts={bankAccounts} bankMappings={bankMappings}
          accountingEngine={accountingEngine}
          purchaseRecords={purchaseRecords}
          onAuditEvent={recordAuditEvent}
          auditEvents={auditEvents}
        />
      )
    case 'journal-voucher':
      return (
        <InvestmentJournalVoucher
          currency={currency} dateFormat={dateFormat}
          accounts={investmentAccounts} vouchers={vouchers} setVouchers={setVouchers}
          accountingEngine={accountingEngine}
          onAuditEvent={recordAuditEvent}
          auditEvents={auditEvents}
          purchaseRecords={purchaseRecords}
        />
      )
    case 'reports':
      return (
        <InvestmentReports
          currency={currency}
          accounts={investmentAccounts}
          vouchers={vouchers}
          purchaseRecords={purchaseRecords}
          bankAccounts={bankAccounts}
          bankMappings={bankMappings}
          loggedInUser={props.loggedInUser || 'Admin'}
        />
      )
    case 'bank-accounts':
      return (
        <InvestmentBankAccounts
          currency={currency} dateFormat={dateFormat} language={language}
          accounts={investmentAccounts} 
          setAccounts={setAccounts}
          vouchers={vouchers} setVouchers={setVouchers}
          bankAccounts={bankAccounts} setBankAccounts={setBankAccounts}
          bankMappings={bankMappings}
          setBankMappings={setBankMappings}
          accountingEngine={accountingEngine}
          onAuditEvent={recordAuditEvent}
          bankReconciliations={bankReconciliations}
          setBankReconciliations={setBankReconciliations}
          purchaseRecords={purchaseRecords}
        />
      )
    case 'history':
      return (
        <History
          auditEvents={auditEvents}
          language={language}
          onClearHistory={props.onClearTransactions}
          onDeleteEvent={props.onDeleteEvent}
        />
      )
    case 'holdings':
      return (
        <InvestmentHoldings
          currency={currency}
          accounts={investmentAccounts}
          vouchers={vouchers}
          purchaseRecords={purchaseRecords}
          bankAccounts={bankAccounts}
          bankMappings={bankMappings}
          onNavigate={onNavigate}
        />
      )
    case 'total-average-holding':
      return (
        <InvestmentTotalAverageHolding
          currency={currency}
          accounts={investmentAccounts}
          vouchers={vouchers}
          purchaseRecords={purchaseRecords}
          bankAccounts={bankAccounts}
          bankMappings={bankMappings}
          onNavigate={onNavigate}
        />
      )
    case 'documents':
      return (
        <Documents
          profile={{ name: 'Investor', role: 'Admin', id: 1, initials: 'IN', avatar: '', locked: false }}
          currency={currency} dateFormat={dateFormat} language={language}
          documents={documents} setDocuments={setDocuments}
          investments={[]} transactions={[]}
          purchaseRecords={purchaseRecords} bankAccounts={bankAccounts}
          onAuditEvent={recordAuditEvent}
        />
      )
    case 'purchase-ledger':
      return (
        <PurchaseLedger
          currency={currency} dateFormat={dateFormat} language={language}
          purchaseRecords={purchaseRecords}
          setPurchaseRecords={setPurchaseRecords}
          onAuditEvent={recordAuditEvent}
          accounts={investmentAccounts}
          vouchers={vouchers}
          setVouchers={setVouchers}
          bankAccounts={bankAccounts}
          bankMappings={bankMappings}
          setAccounts={setAccounts}
          accountingEngine={accountingEngine}
          documents={documents}
          onNavigate={onNavigate}
          investmentCategories={investmentCategories}
          setInvestmentCategories={setInvestmentCategories}
          investmentAssets={investmentAssets}
          setInvestmentAssets={setInvestmentAssets}
        />
      )
    case 'settings':
      return (
        <Settings
          currentTheme={theme} onThemeChange={onThemeChange}
          users={invUsers} onSetUsers={setInvUsers}
          logs={storedLogs} onSetLogs={setStoredLogs}
          storedPassword={storedPassword} onSetStoredPassword={onSetStoredPassword}
          currency={currency} onSetCurrency={() => {}}
          dateFormat={dateFormat} onSetDateFormat={() => {}}
          language={language} onSetLanguage={() => {}}
          autoLogout="15 minutes" onSetAutoLogout={() => {}}
          moduleLabel="Investment Portfolio"
          onResetAllData={onResetAllData}
          onAuditEvent={recordAuditEvent}
          investmentCategories={investmentCategories}
          setInvestmentCategories={setInvestmentCategories}
          investmentAssets={investmentAssets}
          setInvestmentAssets={setInvestmentAssets}
          supabaseUrl={props.supabaseUrl}
          onSetSupabaseUrl={props.setSupabaseUrl}
          supabaseKey={props.supabaseKey}
          onSetSupabaseKey={props.setSupabaseKey}
          supabaseEnabled={props.supabaseEnabled}
          onSetSupabaseEnabled={props.setSupabaseEnabled}
          loginEntries={props.loginEntries}
          setLoginEntries={props.setLoginEntries}
        />
      )
    default:
      return (
        <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          <div style={{ textAlign: 'center' }}>
            <div className="text-lg fw-700" style={{ marginBottom: 8 }}>Page not found</div>
            <div className="text-sm text-secondary">The page "{activePage}" does not exist.</div>
          </div>
        </div>
      )
  }
}
