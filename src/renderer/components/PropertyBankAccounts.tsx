import React, { useState, useMemo, useRef, useEffect } from 'react'
import type { PropAccount, PropTransaction, PdcCheque, SecurityDeposit } from '../data/propertyTypes'
import type { PurchaseRecord } from '../data/purchaseLedger'
import type { AuditEvent } from '../data/auditTypes'
import { recordModuleEvent } from '../services/auditService'
import { deriveBalance } from '../services/bankingService'
import { deleteBankTransaction } from '../services/bankTransactionService'
import { TransactionLifecycleService } from '../services/transactionLifecycleService'
import {
  Badge, Button, KpiCard, EmptyState, PlusIcon, TrashIcon, EditIcon,
  PortfolioIcon, TrendingUpIcon, ActivityIcon,
  Input, Select, Modal
} from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
import EntityForm from './design/EntityForm'
import ConfirmDialog from './design/ConfirmDialog'
import Toast from './Toast'
import { formatDate, t } from '../utils'
import { getBankDashboardProjection, getAccountStatementProjection } from '../readModels/InvestmentBankReadModel'
import type { BankReconciliationRecord, BankStatementLine } from '../accounting/types'
import BankImportModal from './BankImportModal'
import BankAccountActionsMenu from './design/BankAccountActionsMenu'
import { invalidateBalanceCache, getAccountBalance } from '../accounting/ledgerService'
import { generateChildCode } from '../accounting/chartOfAccountsService'
import { CurrencyText } from './design/CurrencyText'
import { formatCurrency } from '../utils/currencyHelpers'

export interface StatementEntry {
  date: string
  desc: string
  amount: string
  type: 'credit' | 'debit'
}

const themeOptions = [
  { value: 'emerald', label: 'Emerald Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'purple', label: 'Purple' },
  { value: 'amber', label: 'Amber' },
  { value: 'rose', label: 'Rose' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'teal', label: 'Teal' },
]


const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
  { value: 'hidden', label: 'Hidden' },
]

type DialogType = 'addAccount' | 'editAccount' | 'deposit' | 'withdraw' | 'transfer' | null
type TxnFilter = 'all' | 'deposits' | 'transfers'

import type { AccountingEngine } from '../accounting/accountingEngine'
import type { Account, Voucher, BankMapping } from '../accounting/types'
import BankReconciliationDashboard from './BankReconciliationDashboard'

interface Props {
  currency?: string
  dateFormat?: string
  language?: string
  propAccounts: PropAccount[]
  setPropAccounts: React.Dispatch<React.SetStateAction<PropAccount[]>>
  propTransactions?: PropTransaction[]
  setPropTransactions?: React.Dispatch<React.SetStateAction<PropTransaction[]>>
  onAuditEvent?: (event: AuditEvent) => void
  bankReconciliations: BankReconciliationRecord[]
  setBankReconciliations: React.Dispatch<React.SetStateAction<BankReconciliationRecord[]>>
  accounts: Account[]
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>
  vouchers: Voucher[]
  setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>
  bankMappings: BankMapping[]
  setBankMappings: React.Dispatch<React.SetStateAction<BankMapping[]>>
  accountingEngine: AccountingEngine
  purchaseRecords?: PurchaseRecord[]
  pdcCheques?: PdcCheque[]
  securityDeposits?: SecurityDeposit[]
}

export default function PropertyBankAccounts({ currency = 'AED', dateFormat = 'DD/MM/YYYY', language = 'English', propAccounts, setPropAccounts, propTransactions = [], setPropTransactions = () => {}, onAuditEvent, bankReconciliations, setBankReconciliations, accounts, setAccounts, vouchers, setVouchers, bankMappings, setBankMappings, accountingEngine, purchaseRecords = [], pdcCheques = [], securityDeposits = [] }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ type: DialogType; accountId?: string }>({ type: null })
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteAccountTarget, setDeleteAccountTarget] = useState<PropAccount | null>(null)
  const [activeMenuAccountId, setActiveMenuAccountId] = useState<string | null>(null)
  const [newTxnOpen, setNewTxnOpen] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [searchQuery, setSearchQuery] = useState('')
  const [txnFilter, setTxnFilter] = useState<TxnFilter>('all')
  const [importOpen, setImportOpen] = useState(false)
  const [selectedHistoryRec, setSelectedHistoryRec] = useState<BankReconciliationRecord | null>(null)
  const [selectedReconRec, setSelectedReconRec] = useState<BankReconciliationRecord | null>(null)

  const handleImportStatement = (lines: Omit<BankStatementLine, 'matchedVoucherLineId' | 'matchConfidence' | 'status'>[]) => {
    if (lines.length === 0) return
    const dates = lines.map(l => new Date(l.date).getTime())
    const minDate = new Date(Math.min(...dates)).toISOString().split('T')[0]
    const maxDate = new Date(Math.max(...dates)).toISOString().split('T')[0]
    
    const newRecord: BankReconciliationRecord = {
      id: `recon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      bankAccountId: selectedId!,
      statementStartDate: minDate,
      statementEndDate: maxDate,
      statementOpeningBalance: 0,
      statementClosingBalance: 0,
      reconciledBalance: 0,
      status: 'Draft',
      statementLines: lines.map(l => ({
        ...l,
        matchConfidence: 'None',
        status: 'Unmatched'
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    setBankReconciliations(prev => [newRecord, ...prev])
    setToast({ visible: true, message: 'Bank statement imported successfully', type: 'success' })
  }

  const [formInstitution, setFormInstitution] = useState('')
  const [formAccountNumber, setFormAccountNumber] = useState('')
  const [formOpeningBalance, setFormOpeningBalance] = useState('')
  const [formTheme, setFormTheme] = useState('emerald')
  const [formAmount, setFormAmount] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formToAccount, setFormToAccount] = useState('')
  const [formIban, setFormIban] = useState('')
  const [formSwift, setFormSwift] = useState('')
  const [formBranch, setFormBranch] = useState('')
  const [formStatus, setFormStatus] = useState<'active' | 'archived' | 'closed' | 'hidden'>('active')

  const newTxnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newTxnRef.current && !newTxnRef.current.contains(e.target as Node)) {
        setNewTxnOpen(false)
      }
    }
    const handleDocumentClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.card-action-menu-wrap')) {
        setActiveMenuAccountId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('click', handleDocumentClick)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('click', handleDocumentClick)
    }
  }, [])

  const selectedAccount = useMemo(() => propAccounts.find(a => a.id === selectedId) || null, [propAccounts, selectedId])

  const selectedAccountReconciliations = useMemo(() => {
    return bankReconciliations.filter(r => r.bankAccountId === selectedId)
  }, [bankReconciliations, selectedId])

  useEffect(() => {
    if (propAccounts.length > 0 && !selectedId) {
      setSelectedId((propAccounts.find(a => a.status === 'active') || propAccounts[0]).id)
    }
  }, [propAccounts])

  const dashboard = useMemo(
    () => getBankDashboardProjection(propAccounts, bankMappings, accounts, vouchers),
    [propAccounts, bankMappings, accounts, vouchers],
  )

  const accountStatement = useMemo(() => {
    if (!selectedId) return { statement: [], stats: { deposits: 0, withdrawals: 0, transfers: 0 } }
    return getAccountStatementProjection(selectedId, propAccounts, bankMappings, accounts, vouchers)
  }, [selectedId, propAccounts, bankMappings, accounts, vouchers])

  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {}
    for (const proj of dashboard.accounts) {
      balances[proj.account.id] = proj.ledgerBalance
    }
    return balances
  }, [dashboard.accounts])

  const lastActivityMap = useMemo(() => {
    const activity: Record<string, string> = {}
    for (const proj of dashboard.accounts) {
      const lastTx = proj.recentTransactions[0]
      activity[proj.account.id] = lastTx ? lastTx.date : 'No activity'
    }
    return activity
  }, [dashboard.accounts])

  const totalCash = dashboard.totalLedgerBankBalance
  const activeCount = dashboard.activeAccounts
  const thisMonthFlow = dashboard.thisMonthFlow

  const accountTransactions = useMemo(() => {
    return (accountStatement.statement || []).map((t, idx) => ({
      id: `${t.voucherNumber}-${idx}`,
      date: t.date,
      description: t.description,
      amount: t.debit > 0 ? t.debit : t.credit,
      type: (t.debit > 0 ? 'credit' : 'debit') as 'debit' | 'credit' | 'transfer_in' | 'transfer_out',
      status: 'cleared' as const,
      balanceAfter: t.balance,
      debit: t.debit,
      credit: t.credit,
      voucherNumber: t.voucherNumber,
      category: '',
      reference: '',
      createdAt: '',
      updatedAt: '',
      createdBy: '',
      updatedBy: '',
      accountId: selectedId || '',
    }))
  }, [accountStatement, selectedId])

  const accountStats = accountStatement.stats

  const filteredTransactions = useMemo(() => {
    let result = accountTransactions
    if (txnFilter === 'deposits') result = result.filter(t => t.type === 'credit')
    else if (txnFilter === 'transfers') result = result.filter(t => t.type === 'debit')
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.date.includes(q) ||
        t.type.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      )
    }
    return result
  }, [accountTransactions, txnFilter, searchQuery])

  const tableData = useMemo(() => {
    return filteredTransactions as any[]
  }, [filteredTransactions])

  const formatAmount = (txn: any) => {
    const sign = txn.type === 'credit' ? '+' : '-'
    return `${sign}${currency} ${txn.amount.toLocaleString()}`
  }

  const resetForm = () => {
    setFormInstitution('')
    setFormAccountNumber('')
    setFormOpeningBalance('')
    setFormTheme('emerald')
    setFormAmount('')
    setFormDesc('')
    setFormDate(new Date().toISOString().split('T')[0])
    setFormToAccount('')
    setFormIban('')
    setFormSwift('')
    setFormBranch('')
    setFormStatus('active')
  }

  const openDialog = (type: DialogType, accountId?: string) => {
    resetForm()
    if (type === 'transfer') {
      const dest = propAccounts.find(a => a.status === 'active' && a.id !== (accountId || selectedId))
      if (dest) setFormToAccount(dest.id)
    }
    setDialog({ type, accountId })
    setNewTxnOpen(false)
  }

  const handleAddAccount = () => {
    if (!formInstitution) {
      setToast({ visible: true, message: 'Bank is required', type: 'error' })
      return
    }
    if (formOpeningBalance !== '' && isNaN(Number(formOpeningBalance))) {
      setToast({ visible: true, message: 'Current balance must be a valid number', type: 'error' })
      return
    }
    const ledgerAcct = {
      id: `acct-${Date.now()}`,
      code: generateChildCode('1120', accounts),
      name: formInstitution,
      type: 'asset' as any,
      normalBalance: 'debit' as any,
      classification: 'current' as any,
      currency,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user',
      parentId: '1120',
      description: 'Bank Account',
      openingBalance: 0,
      module: 'property' as const,
    }
    const newAccount: PropAccount = {
      id: `pt-${Date.now()}`,
      institution: formInstitution,
      accountNumber: formAccountNumber || '----',
      currency,
      openingBalance: 0,
      theme: formTheme,
      icon: 'bank',
      status: 'active',
      iban: formIban,
      swift: formSwift,
      branch: formBranch,
      chartAccountId: ledgerAcct.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user',
      updatedBy: 'user',
    }
    setPropAccounts(prev => [...prev, newAccount])
    setAccounts(prev => [...prev, ledgerAcct])
    setBankMappings(prev => [...prev, { bankAccountId: newAccount.id, accountId: ledgerAcct.id, accountCode: ledgerAcct.code, accountName: ledgerAcct.name }])

    // Automatically generate opening balance journal voucher from Current Balance
    const initialBal = Number(formOpeningBalance) || 0
    if (initialBal > 0) {
      const ref = `OB-${newAccount.id}`
      const result = accountingEngine.processAccountingEvent(
        'OPENING_BALANCE',
        {
          amount: initialBal,
          date: new Date().toISOString().split('T')[0],
          description: `Opening balance for ${newAccount.institution}`,
          currency,
          exchangeRate: 1,
          baseCurrency: 'AED',
          debitAccount: ledgerAcct.id,
          creditAccount: '2200-prop',
          referenceType: 'Property',
          referenceId: newAccount.id,
          createdBy: 'user',
        },
        [...accounts, ledgerAcct],
        vouchers,
      )

      if (result.success && result.voucher) {
        const approveResult = accountingEngine.approve(result.voucher, 'user')
        if (approveResult.success && approveResult.voucher) {
          const postResult = accountingEngine.post(approveResult.voucher, 'user', [...accounts, ledgerAcct], [])
          if (postResult.success && postResult.voucher) {
            const finalVoucher: Voucher = {
              ...postResult.voucher,
              reference: ref,
            }
            setVouchers(prev => [finalVoucher, ...prev])
          }
        }
      }
    }

    const accDesc = newAccount.institution;
    onAuditEvent?.(recordModuleEvent('Property Bank Accounts', 'Create', accDesc, newAccount.id, `Added account: ${accDesc}`))
    setDialog({ type: null })
    setToast({ visible: true, message: 'Account added', type: 'success' })
    resetForm()
  }

  const openEditDialog = (acct: PropAccount) => {
    resetForm()
    setFormInstitution(acct.institution)
    setFormAccountNumber(acct.accountNumber && acct.accountNumber !== '----' ? acct.accountNumber : '')
    // Pre-fill with current ledger balance
    const mapping = bankMappings.find(m => m.bankAccountId === acct.id)
    const currentLedgerBal = mapping ? getAccountBalance(mapping.accountId, vouchers, accounts) : 0
    setFormOpeningBalance(String(currentLedgerBal))
    setFormTheme(acct.theme)
    setFormIban(acct.iban || '')
    setFormSwift(acct.swift || '')
    setFormBranch(acct.branch || '')
    setFormStatus(acct.status || 'active')
    setDialog({ type: 'editAccount', accountId: acct.id })
  }

  const handleEditAccount = () => {
    if (!dialog.accountId) return
    if (!formInstitution) {
      setToast({ visible: true, message: 'Bank is required', type: 'error' })
      return
    }
    if (formOpeningBalance !== '' && isNaN(Number(formOpeningBalance))) {
      setToast({ visible: true, message: 'Current balance must be a valid number', type: 'error' })
      return
    }

    const targetBalance = Number(formOpeningBalance) || 0

    setPropAccounts(prev => prev.map(a => {
      if (a.id === dialog.accountId) {
        return {
          ...a,
          institution: formInstitution,
          accountNumber: formAccountNumber || '----',
          theme: formTheme,
          openingBalance: 0,
          iban: formIban,
          swift: formSwift,
          branch: formBranch,
          status: formStatus,
          updatedAt: new Date().toISOString(),
          updatedBy: 'user'
        }
      }
      return a
    }))

    const mapping = bankMappings.find(m => m.bankAccountId === dialog.accountId)
    if (mapping) {
      const updatedName = formInstitution
      setAccounts(prev => prev.map(acct => {
        if (acct.id === mapping.accountId) {
          return {
            ...acct,
            name: updatedName,
            description: 'Bank Account',
            openingBalance: 0,
            updatedAt: new Date().toISOString()
          }
        }
        return acct
      }))
      setBankMappings(prev => prev.map(m => {
        if (m.bankAccountId === dialog.accountId) {
          return {
            ...m,
            accountName: updatedName
          }
        }
        return m
      }))

      // Compute adjustment amount: target - current ledger balance
      const currentLedgerBal = getAccountBalance(mapping.accountId, vouchers, accounts)
      const adjustment = Math.round((targetBalance - currentLedgerBal) * 100) / 100

      if (Math.abs(adjustment) > 0.001) {
        const adjustmentDate = new Date().toISOString().split('T')[0]
        const isIncrease = adjustment > 0
        const result = accountingEngine.processAccountingEvent(
          'OPENING_BALANCE',
          {
            amount: Math.abs(adjustment),
            date: adjustmentDate,
            description: `Balance adjustment: ${formInstitution} (${isIncrease ? '+' : ''}${adjustment})`,
            currency,
            exchangeRate: 1,
            baseCurrency: 'AED',
            debitAccount: isIncrease ? mapping.accountId : '2200-prop',
            creditAccount: isIncrease ? '2200-prop' : mapping.accountId,
            referenceType: 'Property',
            referenceId: dialog.accountId,
            createdBy: 'user',
          },
          accounts,
          vouchers,
        )

        if (result.success && result.voucher) {
          const approveResult = accountingEngine.approve(result.voucher, 'user')
          if (approveResult.success && approveResult.voucher) {
            const postResult = accountingEngine.post(approveResult.voucher, 'user', accounts, [])
              if (postResult.success && postResult.voucher) {
                const adjVoucher: Voucher = { ...postResult.voucher, reference: `ADJ-${dialog.accountId}-${Date.now()}` }
                setVouchers(prev => [adjVoucher, ...prev])
              }
          }
        }
      }
    }

    invalidateBalanceCache()

    const accDesc = formInstitution;
    onAuditEvent?.(recordModuleEvent('Property Bank Accounts', 'Update', accDesc, dialog.accountId, `Updated account: ${accDesc}`))
    setDialog({ type: null })
    setToast({ visible: true, message: 'Account updated', type: 'success' })
    resetForm()
  }

  const checkIsBankReferenced = (acctId: string): { referenced: boolean; count: number; reason?: string } => {
    const mapping = bankMappings.find(m => m.bankAccountId === acctId)
    const glAccountId = mapping?.accountId
    let count = 0

    if (glAccountId) {
      count += vouchers.filter(v => v.reference !== `OB-${acctId}` && v.lines.some(l => l.accountId === glAccountId)).length
    }

    if (pdcCheques) {
      count += pdcCheques.filter(cheque => cheque.bankAccountId === acctId).length
    }

    if (securityDeposits) {
      count += securityDeposits.filter(sd => 
        sd.transactions && sd.transactions.some(tx => tx.bankAccountId === acctId)
      ).length
    }

    if (purchaseRecords) {
      count += purchaseRecords.filter(pr => pr.fundingBankAccountId === acctId).length
    }

    if (bankReconciliations) {
      count += bankReconciliations.filter(r => r.bankAccountId === acctId).length
    }

    if (count > 0) {
      return {
        referenced: true,
        count,
        reason: `This bank account cannot be deleted because it is referenced by ${count} accounting records. Please transfer the transactions to another account.`
      }
    }

    return { referenced: false, count: 0 }
  }

  const handleDeleteAccountConfirm = () => {
    if (!deleteAccountTarget) return

    const refCheck = checkIsBankReferenced(deleteAccountTarget.id)
    if (refCheck.referenced) {
      setToast({
        visible: true,
        message: refCheck.reason || 'This bank account is already used in accounting records and cannot be deleted.',
        type: 'error'
      })
      setDeleteAccountTarget(null)
      return
    }

    const acctId = deleteAccountTarget.id
    setPropAccounts(prev => prev.filter(a => a.id !== acctId))

    const mapping = bankMappings.find(m => m.bankAccountId === acctId)
    if (mapping) {
      setBankMappings(prev => prev.filter(m => m.bankAccountId !== acctId))
    }

    // Safely remove the child account representing the bank from the Chart of Accounts.
    // Use the mapping ID as the authoritative lookup — never rely on name matching.
    // Never remove the root parent account ('1120').
    setAccounts(prev => prev.filter(acct => {
      if (acct.id === '1120' || acct.code === '1120') return true
      if (mapping && acct.id === mapping.accountId) return false
      return true
    }))

    setBankReconciliations(prev => prev.filter(r => r.bankAccountId !== acctId))
    
    // Remove the opening balance JV voucher
    setVouchers(prev => prev.filter(v => v.reference !== `OB-${acctId}`))

    invalidateBalanceCache()

    if (selectedId === acctId) {
      const remaining = propAccounts.filter(a => a.id !== acctId)
      if (remaining.length > 0) {
        setSelectedId((remaining.find(a => a.status === 'active') || remaining[0]).id)
      } else {
        setSelectedId(null)
      }
    }

    const accDesc = deleteAccountTarget.institution;
    onAuditEvent?.(recordModuleEvent('Property Bank Accounts', 'Delete', accDesc, deleteAccountTarget.id, `Deleted account: ${accDesc}`))

    setDeleteAccountTarget(null)
    setToast({ visible: true, message: 'Bank account deleted successfully', type: 'success' })
  }

  const handleDeposit = () => {
    const amt = Number(formAmount)
    if (!formAmount || amt <= 0) {
      setToast({ visible: true, message: 'Amount must be greater than zero', type: 'error' })
      return
    }
    const targetId = dialog.accountId || selectedId
    if (!targetId) {
      setToast({ visible: true, message: 'No account selected', type: 'error' })
      return
    }
    
    const mapping = bankMappings.find(m => m.bankAccountId === targetId)
    if (!mapping) {
      setToast({ visible: true, message: 'Bank account is not mapped to the ledger.', type: 'error' })
      return
    }

    try {
      const draftResult = accountingEngine.processAccountingEvent(
        'BANK_DEPOSIT',
        {
          amount: amt,
          date: formDate,
          description: formDesc || 'Deposit',
          currency,
          bankAccount: mapping.accountId,
        },
        accounts,
        vouchers
      )
      if (!draftResult.success || !draftResult.voucher) throw new Error(draftResult.errors.map(e => e.message).join(', '))
      
      const approveResult = accountingEngine.approve(draftResult.voucher, 'system')
      if (!approveResult.success || !approveResult.voucher) throw new Error(approveResult.errors.map(e => e.message).join(', '))
      
      const postResult = accountingEngine.post(approveResult.voucher, 'system', accounts, vouchers)
      if (!postResult.success || !postResult.voucher) throw new Error(postResult.errors.map(e => e.message).join(', '))
      
      setVouchers(prev => [...prev, postResult.voucher!])
      onAuditEvent?.(recordModuleEvent('Property Bank Accounts', 'Update', dialog.accountId || 'account', '', `Deposited ${currency}${amt.toLocaleString()}`))
      setDialog({ type: null })
      setToast({ visible: true, message: 'Deposit recorded', type: 'success' })
    } catch (e: any) {
      setToast({ visible: true, message: e.message || 'Failed to record deposit', type: 'error' })
    }
    resetForm()
  }

  const handleWithdraw = () => {
    const amt = Number(formAmount)
    if (!formAmount || amt <= 0) {
      setToast({ visible: true, message: 'Amount must be greater than zero', type: 'error' })
      return
    }
    const targetId = dialog.accountId || selectedId
    if (!targetId) {
      setToast({ visible: true, message: 'No account selected', type: 'error' })
      return
    }
    const mapping = bankMappings.find(m => m.bankAccountId === targetId)
    if (!mapping) {
      setToast({ visible: true, message: 'Bank account is not mapped to the ledger.', type: 'error' })
      return
    }

    try {
      const draftResult = accountingEngine.processAccountingEvent(
        'BANK_WITHDRAWAL',
        {
          amount: amt,
          date: formDate,
          description: formDesc || 'Withdrawal',
          currency,
          bankAccount: mapping.accountId,
        },
        accounts,
        vouchers
      )
      if (!draftResult.success || !draftResult.voucher) throw new Error(draftResult.errors.map(e => e.message).join(', '))
      
      const approveResult = accountingEngine.approve(draftResult.voucher, 'system')
      if (!approveResult.success || !approveResult.voucher) throw new Error(approveResult.errors.map(e => e.message).join(', '))
      
      const postResult = accountingEngine.post(approveResult.voucher, 'system', accounts, vouchers)
      if (!postResult.success || !postResult.voucher) throw new Error(postResult.errors.map(e => e.message).join(', '))
      
      setVouchers(prev => [...prev, postResult.voucher!])
      onAuditEvent?.(recordModuleEvent('Property Bank Accounts', 'Update', dialog.accountId || 'account', '', `Withdrew ${currency}${amt.toLocaleString()}`))
      setDialog({ type: null })
      setToast({ visible: true, message: 'Withdrawal recorded', type: 'success' })
    } catch (e: any) {
      setToast({ visible: true, message: e.message || 'Failed to record withdrawal', type: 'error' })
    }
    resetForm()
  }

  const handleTransfer = () => {
    const amt = Number(formAmount)
    if (!formAmount || amt <= 0) {
      setToast({ visible: true, message: 'Amount must be greater than zero', type: 'error' })
      return
    }
    const fromId = dialog.accountId || selectedId
    if (!fromId) {
      setToast({ visible: true, message: 'No source account selected', type: 'error' })
      return
    }
    if (!formToAccount) {
      setToast({ visible: true, message: 'Select a destination account', type: 'error' })
      return
    }
    if (formToAccount === fromId) {
      setToast({ visible: true, message: 'Source and destination must be different', type: 'error' })
      return
    }

    const srcBalance = accountBalances[fromId]
    if (srcBalance !== undefined && amt > srcBalance) {
      setToast({ visible: true, message: `Insufficient funds — available balance is ${currency} ${srcBalance.toLocaleString()}`, type: 'error' })
      return
    }

    const fromMapping = bankMappings.find(m => m.bankAccountId === fromId)
    const toMapping = bankMappings.find(m => m.bankAccountId === formToAccount)

    if (!fromMapping || !toMapping) {
      setToast({ visible: true, message: 'Both bank accounts must be mapped to the ledger.', type: 'error' })
      return
    }

    try {
      const draftResult = accountingEngine.processAccountingEvent(
        'BANK_TRANSFER',
        {
          amount: amt,
          date: formDate,
          description: formDesc || 'Bank Transfer',
          currency,
          debitAccount: fromMapping.accountId, // from
          creditAccount: toMapping.accountId,  // to
        },
        accounts,
        vouchers
      )
      if (!draftResult.success || !draftResult.voucher) throw new Error(draftResult.errors.map(e => e.message).join(', '))
      
      const approveResult = accountingEngine.approve(draftResult.voucher, 'system')
      if (!approveResult.success || !approveResult.voucher) throw new Error(approveResult.errors.map(e => e.message).join(', '))
      
      const postResult = accountingEngine.post(approveResult.voucher, 'system', accounts, vouchers)
      if (!postResult.success || !postResult.voucher) throw new Error(postResult.errors.map(e => e.message).join(', '))
      
      setVouchers(prev => [...prev, postResult.voucher!])
      onAuditEvent?.(recordModuleEvent('Property Bank Accounts', 'Update', 'Transfer', '', `Transferred ${currency}${amt.toLocaleString()}`))
      setDialog({ type: null })
      setToast({ visible: true, message: 'Transfer completed', type: 'success' })
    } catch (e: any) {
      setToast({ visible: true, message: e.message || 'Failed to record transfer', type: 'error' })
    }
    resetForm()
  }

  const handleDeleteTransaction = () => {
    if (!deleteTarget) return
    const result = deleteBankTransaction(deleteTarget, propTransactions, propAccounts, currency)
    if (!result.success) {
      setToast({ visible: true, message: result.error!, type: 'error' })
      setDeleteTarget(null)
      return
    }
    setPropTransactions(result.updatedTransactions)
    setDeleteTarget(null)
    if (result.auditDetails) {
      onAuditEvent?.(recordModuleEvent('Property Bank Accounts', result.auditDetails.action, result.auditDetails.entityName, result.auditDetails.entityId, result.auditDetails.description))
    }
    setToast({ visible: true, message: 'Transaction deleted', type: 'success' })
  }

  const getStatusBadge = (status: string) => {
    const v = status === 'cleared' ? 'success' : status === 'pending' ? 'warning' : status === 'reconciled' ? 'primary' : 'neutral'
    return <Badge variant={v as any}>{status}</Badge>
  }

  const getTypeBadge = (txn: PropTransaction) => {
    if (txn.type === 'credit') return <Badge variant="success">deposit</Badge>
    if (txn.type === 'debit') return <Badge variant="danger">withdrawal</Badge>
    return <Badge variant="primary">Transfer</Badge>
  }

  const getTypeLabel = (type: string) => {
    if (type === 'credit') return 'Deposit'
    if (type === 'debit') return 'Withdrawal'
    if (type === 'transfer_in') return 'Transfer In'
    return 'Transfer Out'
  }

  const columns: Column<PropTransaction & { balanceAfter: number }>[] = useMemo(() => [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      width: '110px',
      render: txn => <span className="text-secondary text-mono text-xs">{formatDate(txn.date, dateFormat)}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      render: txn => <span className="fw-500 text-sm">{txn.description}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      width: '100px',
      render: txn => txn.category ? <span className="text-secondary text-xs">{txn.category}</span> : <span className="text-muted text-xs">—</span>,
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      width: '110px',
      render: txn => getTypeBadge(txn),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      numeric: true,
      render: txn => {
        const isPositive = txn.type === 'credit' || txn.type === 'transfer_in'
        return (
          <span className={isPositive ? 'text-success' : 'text-danger'}>
            {isPositive ? '+' : '-'}
            <CurrencyText value={txn.amount} currency={currency} className="fw-600" />
          </span>
        )
      },
    },
    {
      key: 'balanceAfter',
      header: 'Balance',
      sortable: true,
      numeric: true,
      width: '110px',
      render: txn => (
        <CurrencyText value={txn.balanceAfter} currency={currency} className="text-secondary" />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '100px',
      render: txn => getStatusBadge(txn.status),
    },
    {
      key: 'actions' as any,
      header: '',
      width: '50px',
      render: txn => (
        <Button variant="ghost" size="sm" disabled={!TransactionLifecycleService.canDelete('BankTransaction', txn)} onClick={() => setDeleteTarget(txn.id)} aria-label="Delete transaction">
          <TrashIcon />
        </Button>
      ),
    },
  ], [dateFormat])

  const transactionsEmpty = (
    <EmptyState
      icon={
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      }
      title={searchQuery || txnFilter !== 'all' ? 'No transactions found' : 'No transactions yet'}
      text={searchQuery ? 'Try adjusting your search' : txnFilter !== 'all' ? 'Try changing the filter' : 'Use + New Transaction to add one.'}
    />
  )

  const noAccountsState = (
    <EmptyState
      icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      }
      title="No property accounts yet"
      text="Add your first property account to start tracking balances."
      action={<Button variant="primary" onClick={() => openDialog('addAccount')}><PlusIcon /> Add Account</Button>}
    />
  )

  const getDialogTitle = () => {
    if (dialog.type === 'addAccount') return 'Add Bank Account'
    if (dialog.type === 'editAccount') return 'Edit Bank Account'
    if (dialog.type === 'deposit') return 'Record Deposit'
    if (dialog.type === 'withdraw') return 'Record Withdrawal'
    if (dialog.type === 'transfer') return 'Transfer Funds'
    return ''
  }

  const handleDialogSubmit = () => {
    if (dialog.type === 'addAccount') handleAddAccount()
    else if (dialog.type === 'editAccount') handleEditAccount()
    else if (dialog.type === 'deposit') handleDeposit()
    else if (dialog.type === 'withdraw') handleWithdraw()
    else if (dialog.type === 'transfer') handleTransfer()
  }

  const flowLabel = (
    <span>
      {thisMonthFlow >= 0 ? '+' : '-'}
      <CurrencyText value={Math.abs(thisMonthFlow)} currency={currency} />
    </span>
  )

  const filterOptions: { value: TxnFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'deposits', label: 'Deposits' },
    { value: 'transfers', label: 'Transfers' },
  ]

  const remainingAccounts = useMemo(() => propAccounts.filter(a => a.id !== selectedId), [propAccounts, selectedId])

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteTransaction}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={deleteAccountTarget !== null}
        title="Delete Bank Account?"
        message={
          deleteAccountTarget ? (
            <div>
              <div style={{ marginBottom: 12 }}>
                <strong>Bank:</strong><br />
                {deleteAccountTarget.institution}
              </div>
              <p style={{ margin: 0 }}>This action cannot be undone.</p>
            </div>
          ) : ''
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteAccountConfirm}
        onCancel={() => setDeleteAccountTarget(null)}
      />

      <EntityForm
        open={dialog.type !== null}
        title={getDialogTitle()}
        submitLabel={dialog.type === 'addAccount' ? 'Add Account' : dialog.type === 'editAccount' ? 'Save Changes' : 'Record'}
        onCancel={() => { setDialog({ type: null }); resetForm() }}
        onSubmit={handleDialogSubmit}
      >
        {(dialog.type === 'addAccount' || dialog.type === 'editAccount') && (
          <div className="form-row">
            <Input label="Bank" value={formInstitution} onChange={e => setFormInstitution(e.target.value)} placeholder="e.g. Primary Bank" autoFocus />
            <Input label="IBAN" value={formIban} onChange={e => setFormIban(e.target.value)} placeholder="e.g. AE83024000..." />
            <Input label="SWIFT Code" value={formSwift} onChange={e => setFormSwift(e.target.value)} placeholder="e.g. DIBKAEADXXX" />
            <Input label="Branch" value={formBranch} onChange={e => setFormBranch(e.target.value)} placeholder="e.g. Sheikh Zayed Road Branch" />
            <Input label="Initial Amount (AED)" type="number" value={formOpeningBalance} onChange={e => setFormOpeningBalance(e.target.value)} placeholder="0" />
            <Select label="Theme Color" value={formTheme} onChange={e => setFormTheme(e.target.value)} options={themeOptions} />
            {dialog.type === 'editAccount' && (
              <Select label="Status" value={formStatus} onChange={e => setFormStatus(e.target.value as any)} options={statusOptions} />
            )}
          </div>
        )}
        {dialog.type === 'deposit' && (
          <div className="form-row">
            <Input label="Amount (AED)" type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0" autoFocus />
            <Input label="Description" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="e.g. Dividend payment" />
            <Input label="Date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
          </div>
        )}
        {dialog.type === 'withdraw' && (
          <div className="form-row">
            <Input label="Amount (AED)" type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0" autoFocus />
            <Input label="Description" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="e.g. ATM withdrawal" />
            <Input label="Date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
          </div>
        )}
        {dialog.type === 'transfer' && (
          <div className="form-row">
            <Select
              label="From Account"
              value={dialog.accountId || selectedId || ''}
              disabled
              options={propAccounts.filter(a => a.status === 'active').map(a => ({ value: a.id, label: a.institution }))}
            />
            <div className="text-xs text-secondary" style={{ marginTop: -12, marginBottom: 8 }}>
              Balance: {currency} {(accountBalances[dialog.accountId || selectedId || ''] ?? 0).toLocaleString()}
            </div>
            <Select
              label="To Account"
              value={formToAccount}
              onChange={e => setFormToAccount(e.target.value)}
              options={propAccounts.filter(a => a.status === 'active' && a.id !== (dialog.accountId || selectedId)).map(a => ({ value: a.id, label: a.institution }))}
            />
            <Input label={`Amount (${currency})`} type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0" autoFocus />
            <Input label="Description" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Optional note" />
            <Input label="Date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
          </div>
        )}
      </EntityForm>

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">{t('bank-accounts', language)}</div>
            <div className="page-subtitle">
              {propAccounts.length > 0
                ? `${propAccounts.length} account${propAccounts.length !== 1 ? 's' : ''} tracked`
                : 'Manage your property bank accounts and balances'}
            </div>
          </div>
        </div>
        <div className="page-header-right">
          <Button variant="primary" size="sm" onClick={() => openDialog('addAccount')}><PlusIcon /> Add Account</Button>
        </div>
      </div>

      <div className="page-body">
        {propAccounts.length === 0 ? noAccountsState : (
          <>
            {selectedAccount && (
              <div className={`featured-account-card prop-theme-${selectedAccount.theme}`}>
                <div className="featured-account-card-inner">
                  <div className="featured-account-card-top" style={{ position: 'relative' }}>
                    <div className="featured-account-card-bank">
                      <div className="featured-account-card-icon">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </div>
                      <span className="featured-account-card-bank-name">{selectedAccount.institution}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, zIndex: 10 }}>
                      <div className="featured-account-card-badges">
                        <Badge variant={selectedAccount.status === 'active' ? 'success' : 'neutral'}>
                          {selectedAccount.status}
                        </Badge>
                      </div>
                      
                      <BankAccountActionsMenu
                        onView={() => setSelectedId(selectedAccount.id)}
                        onEdit={() => openEditDialog(selectedAccount)}
                        onDelete={() => setDeleteAccountTarget(selectedAccount)}
                        triggerStyle={{ color: 'white', padding: 4, height: 'auto', background: 'rgba(255,255,255,0.15)', borderRadius: '50%', minWidth: 'auto' }}
                      />
                    </div>
                  </div>

                  <div className="featured-account-card-balance">
                    <CurrencyText value={accountBalances[selectedAccount.id] ?? 0} currency={currency} />
                  </div>

                  <div className="featured-account-card-bottom">
                    <span className="featured-account-card-bottom-value"></span>
                  </div>
                </div>
              </div>
            )}

            <div className="kpi-grid">
              <KpiCard
                label="Total Money in Bank"
                value={<CurrencyText value={totalCash} currency={currency} />}
                icon={<PortfolioIcon />}
                accentColor="var(--success)"
              />
              <KpiCard
                label="Active Accounts"
                value={String(activeCount)}
                icon={<ActivityIcon />}
                accentColor="var(--primary)"
              />
              <KpiCard
                label="This Month Net Flow"
                value={flowLabel}
                change={{
                  value: formatCurrency(Math.abs(thisMonthFlow), currency),
                  direction: thisMonthFlow >= 0 ? 'up' : thisMonthFlow < 0 ? 'down' : 'neutral',
                }}
                icon={<TrendingUpIcon />}
                accentColor={thisMonthFlow >= 0 ? 'var(--success)' : 'var(--danger)'}
              />
            </div>

            {selectedAccount && accountStats && (
              <>
                <div className="account-detail">
                <div className="account-detail-header">
                  <div className="account-detail-info">
                                        <div className="text-lg fw-600">{selectedAccount.institution}</div>
                    
                  </div>
                  <div className="account-detail-actions" ref={newTxnRef}>
                    <div className="account-detail-actions-wrap" style={{ display: 'flex', gap: 8 }}>
                      <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
                        Import Statement
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => setNewTxnOpen(prev => !prev)}>
                        <PlusIcon /> New Transaction
                      </Button>
                      {newTxnOpen && (
                        <div className="new-txn-dropdown">
                          <button className="new-txn-dropdown-item" onClick={() => openDialog('deposit', selectedAccount.id)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Deposit
                          </button>
                          <button className="new-txn-dropdown-item" onClick={() => openDialog('withdraw', selectedAccount.id)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Withdraw
                          </button>
                          <button className="new-txn-dropdown-item" onClick={() => openDialog('transfer', selectedAccount.id)} disabled={propAccounts.length < 2}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                            Transfer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="account-stats-grid">
                  <div className="account-stat">
                    <span className="account-stat-label">Total Deposits</span>
                    <span className="account-stat-value text-success"><CurrencyText value={accountStats.deposits} currency={currency} /></span>
                  </div>
                  <div className="account-stat">
                    <span className="account-stat-label">Total Transfers</span>
                    <span className="account-stat-value text-danger"><CurrencyText value={accountStats.withdrawals} currency={currency} /></span>
                  </div>
                  <div className="account-stat">
                    <span className="account-stat-label">Status</span>
                    <span className="account-stat-value capitalize">{selectedAccount.status}</span>
                  </div>
                  <div className="account-stat">
                    <span className="account-stat-label">Created</span>
                    <span className="account-stat-value">{formatDate(selectedAccount.createdAt.split('T')[0], dateFormat)}</span>
                  </div>
                  <div className="account-stat">
                    <span className="account-stat-label">Current Balance</span>
                    <span className="account-stat-value fw-700 text-md"><CurrencyText value={accountBalances[selectedAccount.id] ?? 0} currency={currency} /></span>
                  </div>
                </div>

                <div className="card card-table mt-4">
                  <div className="card-header">
                    <span className="card-title">Transactions ({accountTransactions.length})</span>
                  </div>
                  <div className="card-body">
                    <DataTable
                      columns={columns}
                      data={tableData}
                      keyExtractor={t => t.id}
                      emptyState={transactionsEmpty}
                      searchable
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      searchPlaceholder="Search transactions..."
                      pageSize={10}
                      filterBar={
                        <div className="filter-bar">
                          {filterOptions.map(fo => (
                            <Button key={fo.value} variant={txnFilter === fo.value ? 'primary' : 'secondary'} size="sm" onClick={() => setTxnFilter(fo.value)}>
                              {fo.label}
                            </Button>
                          ))}
                        </div>
                      }
                    />
                  </div>
                </div>

                {/* Statement Import History Card */}
                <div className="card mt-4">
                  <div className="card-header">
                    <span className="card-title">Statement Import History ({selectedAccountReconciliations.length})</span>
                  </div>
                  <div className="card-body">
                    {selectedAccountReconciliations.length === 0 ? (
                      <div style={{ color: '#8A99AD', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                        No statements imported for this bank account yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {selectedAccountReconciliations.map(rec => (
                          <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid #E4EBF4', borderRadius: 6, background: '#F8FAFC' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: '#334155' }}>
                                Statement: {rec.statementStartDate} to {rec.statementEndDate}
                              </div>
                              <div style={{ color: '#64748B', fontSize: 12 }}>
                                Imported: {new Date(rec.createdAt).toLocaleDateString()} · {rec.statementLines.length} lines
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <Badge variant={rec.status === 'Reconciled' ? 'success' : 'neutral'}>
                                {rec.status}
                              </Badge>
                              {rec.status === 'Draft' ? (
                                <Button size="sm" variant="primary" onClick={() => setSelectedReconRec(rec)}>
                                  Reconcile
                                </Button>
                              ) : (
                                <Button size="sm" variant="secondary" onClick={() => setSelectedHistoryRec(rec)}>
                                  View Summary
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {remainingAccounts.length > 0 && (
                  <div className="mt-6">
                    <div className="text-md fw-600 mb-4">Other Accounts</div>
                    <div className="account-cards-grid">
                      {remainingAccounts.map(acct => {
                        const bal = accountBalances[acct.id] ?? 0
                        const lastDate = lastActivityMap[acct.id]
                        return (
                          <div
                            key={acct.id}
                            className={`account-card compact prop-theme-${acct.theme}${acct.status !== 'active' ? ' account-card-inactive' : ''}`}
                            onClick={() => setSelectedId(acct.id)}
                            style={{ position: 'relative' }}
                          >
                            <div className="account-card-theme" />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div className="account-card-institution" style={{ flex: 1, paddingRight: 24 }}>{acct.institution}</div>
                              <BankAccountActionsMenu
                                onView={() => setSelectedId(acct.id)}
                                onEdit={() => openEditDialog(acct)}
                                onDelete={() => setDeleteAccountTarget(acct)}
                                triggerStyle={{ padding: '2px 4px', height: 'auto', background: 'transparent', minWidth: 'auto' }}
                              />
                            </div>
                            <div className="account-card-name">&nbsp;</div>
                            <div className="account-card-balance">{currency} {bal.toLocaleString()}</div>
                            <div className="account-card-footer">
                              <span className="text-muted text-xs">
                                {lastDate ? formatDate(lastDate, dateFormat) : '—'}
                              </span>
                            </div>
                            {acct.status !== 'active' && (
                              <div className="mt-1">
                                <Badge variant="neutral">{acct.status}</Badge>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Statement Import Modal */}
      {importOpen && (
        <BankImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImport={handleImportStatement}
        />
      )}

      {/* Read-Only Import Summary Modal */}
      {selectedHistoryRec && (
        <Modal
          open={!!selectedHistoryRec}
          onClose={() => setSelectedHistoryRec(null)}
          title="Import Summary"
          footer={<Button variant="primary" onClick={() => setSelectedHistoryRec(null)}>Close</Button>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <span className="text-secondary text-xs block" style={{ color: '#64748B' }}>Date Range</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  {selectedHistoryRec.statementStartDate} to {selectedHistoryRec.statementEndDate}
                </span>
              </div>
              <div>
                <span className="text-secondary text-xs block" style={{ color: '#64748B' }}>Total Transactions</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  {selectedHistoryRec.statementLines.length} lines
                </span>
              </div>
              <div>
                <span className="text-secondary text-xs block" style={{ color: '#64748B' }}>Reconciliation Status</span>
                <Badge variant={selectedHistoryRec.status === 'Reconciled' ? 'success' : 'neutral'}>
                  {selectedHistoryRec.status}
                </Badge>
              </div>
              <div>
                <span className="text-secondary text-xs block" style={{ color: '#64748B' }}>Imported At</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  {new Date(selectedHistoryRec.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Transactions List</label>
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #E4EBF4', borderRadius: 6 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E4EBF4', textAlign: 'left' }}>
                      <th style={{ padding: 8 }}>Date</th>
                      <th style={{ padding: 8 }}>Description</th>
                      <th style={{ padding: 8 }}>Reference</th>
                      <th style={{ padding: 8, textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedHistoryRec.statementLines.map((line, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #E4EBF4' }}>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            line.amount >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {line.amount >= 0 ? 'Deposit' : 'Withdrawal'}
                          </span>
                        </td>
                        <td style={{ padding: 8 }}>{line.date}</td>
                        <td style={{ padding: 8, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.description}</td>
                        <td style={{ padding: 8 }}>{line.reference ?? '-'}</td>
                        <td className="p-3 text-right">
                          <div className={`font-medium ${line.amount >= 0 ? 'text-green-500' : 'text-slate-300'}`}>
                            {line.amount >= 0 ? '+' : '-'} <CurrencyText value={Math.abs(line.amount)} currency={currency} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}
      {selectedReconRec && (
        <BankReconciliationDashboard
          open={!!selectedReconRec}
          onClose={() => setSelectedReconRec(null)}
          reconciliationRecord={selectedReconRec}
          onSave={(updated) => {
            setBankReconciliations(prev => prev.map(rec => rec.id === updated.id ? updated : rec))
          }}
          accounts={accounts}
          vouchers={vouchers}
          setVouchers={setVouchers}
          accountingEngine={accountingEngine}
          bankMappings={bankMappings}
          currency={currency}
          dateFormat={dateFormat}
          onAuditEvent={onAuditEvent}
        />
      )}
    </>
  )
}
