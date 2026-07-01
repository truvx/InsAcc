import React from 'react'
import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { AccountingEngine } from '../accounting/accountingEngine'
import type { BankAccount, BankTransaction } from '../data/banking'
import type { Investment } from './Investments'
import type { Transaction } from './Transactions'
import type { DocItem } from './Documents'
import type { PurchaseRecord } from '../data/purchaseLedger'
import type { PurchaseCategory, Purchase } from '../data/purchaseData'
import type { AuditEvent } from '../data/auditTypes'
import type { UserEntry, LogEntry } from '../data/types'
import type { BankReconciliationRecord } from '../accounting/types'
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
import InvestmentHistory from './InvestmentHistory'
import Investments from './Investments'
import Transactions from './Transactions'
import Documents from './Documents'
import History from './History'
import Settings from './Settings'
import PurchaseLedger from './PurchaseLedger'
import InvestmentHoldings from './InvestmentHoldings'

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
  bankAccounts: BankAccount[]
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>
  bankTransactions: BankTransaction[]
  setBankTransactions: React.Dispatch<React.SetStateAction<BankTransaction[]>>
  investments: Investment[]
  transactions: Transaction[]
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>
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
  onResetAllData: () => void
  recordAuditEvent: (event: AuditEvent) => void
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>
  bankReconciliations: BankReconciliationRecord[]
  setBankReconciliations: React.Dispatch<React.SetStateAction<BankReconciliationRecord[]>>
}

export default function InvestmentRouter(props: Props) {
  const {
    activePage, onNavigate, currency, dateFormat, language,
    accounts, vouchers, setVouchers, bankMappings,
    bankAccounts, setBankAccounts, bankTransactions, setBankTransactions,
    investments, transactions, setTransactions,
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
    onResetAllData, recordAuditEvent, setAccounts,
    bankReconciliations, setBankReconciliations,
  } = props

  switch (activePage) {
    case 'dashboard':
      return (
        <InvestmentDashboard
          currency={currency}
          accounts={accounts}
          vouchers={vouchers}
          onNavigate={onNavigate}
        />
      )
    case 'accounts-dashboard':
      return (
        <InvestmentAccountsDashboard
          currency={currency}
          accounts={accounts}
          vouchers={vouchers}
          bankAccounts={bankAccounts}
        />
      )
    case 'chart-of-accounts':
      return (
        <InvestmentChartOfAccounts
          currency={currency}
          accounts={accounts}
          vouchers={vouchers}
        />
      )
    case 'trial-balance':
      return (
        <InvestmentTrialBalance
          currency={currency}
          accounts={accounts}
          vouchers={vouchers}
        />
      )
    case 'balance-sheet':
      return (
        <InvestmentBalanceSheet
          currency={currency}
          accounts={accounts}
          vouchers={vouchers}
        />
      )
    case 'profit-loss':
      return (
        <InvestmentProfitLoss
          currency={currency}
          accounts={accounts}
          vouchers={vouchers}
        />
      )
    case 'receipt-voucher':
      return (
        <InvestmentReceiptVoucher
          currency={currency} dateFormat={dateFormat}
          accounts={accounts} vouchers={vouchers} setVouchers={setVouchers}
          bankAccounts={bankAccounts} bankMappings={bankMappings}
          accountingEngine={accountingEngine}
        />
      )
    case 'payment-voucher':
      return (
        <InvestmentPaymentVoucher
          currency={currency} dateFormat={dateFormat}
          accounts={accounts} vouchers={vouchers} setVouchers={setVouchers}
          bankAccounts={bankAccounts} bankMappings={bankMappings}
          accountingEngine={accountingEngine}
        />
      )
    case 'journal-voucher':
      return (
        <InvestmentJournalVoucher
          currency={currency} dateFormat={dateFormat}
          accounts={accounts} vouchers={vouchers} setVouchers={setVouchers}
          accountingEngine={accountingEngine}
        />
      )
    case 'reports':
      return (
        <InvestmentReports
          currency={currency}
          accounts={accounts}
          vouchers={vouchers}
          purchaseRecords={purchaseRecords}
          bankAccounts={bankAccounts}
          bankTransactions={bankTransactions}
          bankMappings={bankMappings}
        />
      )
    case 'bank-accounts':
      return (
        <InvestmentBankAccounts
          currency={currency} dateFormat={dateFormat} language={language}
          accounts={accounts} vouchers={vouchers} setVouchers={setVouchers}
          bankAccounts={bankAccounts} setBankAccounts={setBankAccounts}
          bankTransactions={bankTransactions} setBankTransactions={setBankTransactions}
          bankMappings={bankMappings}
          accountingEngine={accountingEngine}
          onAuditEvent={recordAuditEvent}
          bankReconciliations={bankReconciliations}
          setBankReconciliations={setBankReconciliations}
        />
      )
    case 'history':
      return (
        <InvestmentHistory
          vouchers={vouchers}
          auditEvents={auditEvents}
          language={language}
        />
      )
    case 'holdings':
      return (
        <InvestmentHoldings
          currency={currency}
          accounts={accounts}
          vouchers={vouchers}
          purchaseRecords={purchaseRecords}
          bankAccounts={bankAccounts}
          bankTransactions={bankTransactions}
          bankMappings={bankMappings}
          onNavigate={onNavigate}
        />
      )
    case 'investments':
      return (
        <Investments
          profile={{ name: 'Investor', role: 'Admin', id: 1, initials: 'IN', avatar: '', locked: false }}
          currency={currency} dateFormat={dateFormat} language={language}
          investments={investments}
        />
      )
    case 'transactions':
      return (
        <Transactions
          profile={{ name: 'Investor', role: 'Admin', id: 1, initials: 'IN', avatar: '', locked: false }}
          currency={currency} dateFormat={dateFormat} language={language}
          transactions={transactions} setTransactions={setTransactions}
          incomeCustomCategories={incomeCustomCategories}
          expenseCustomCategories={expenseCustomCategories}
          setIncomeCustomCategories={setIncomeCustomCategories}
          setExpenseCustomCategories={setExpenseCustomCategories}
          onAuditEvent={recordAuditEvent}
        />
      )
    case 'documents':
      return (
        <Documents
          profile={{ name: 'Investor', role: 'Admin', id: 1, initials: 'IN', avatar: '', locked: false }}
          currency={currency} dateFormat={dateFormat} language={language}
          documents={documents} setDocuments={setDocuments}
          investments={[]} transactions={transactions}
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
          accounts={accounts}
          vouchers={vouchers}
          setVouchers={setVouchers}
          bankAccounts={bankAccounts}
          bankMappings={bankMappings}
          setAccounts={setAccounts}
          accountingEngine={accountingEngine}
          documents={documents}
          onNavigate={onNavigate}
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
          moduleLabel="Investment"
          onResetAllData={onResetAllData}
          onAuditEvent={recordAuditEvent}
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
