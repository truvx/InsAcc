import React, { useState, useMemo, useEffect, useRef } from 'react'
import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { BankAccount, BankTransaction } from '../data/banking'
import type { PurchaseRecord } from '../data/purchaseLedger'
import type { AuditEvent } from '../data/auditTypes'
import type { AccountingEngine } from '../accounting/accountingEngine'
import { recordModuleEvent } from '../services/auditService'
import {
  Badge, Button, KpiCard, EmptyState, PlusIcon, TrashIcon,
  Input, Select, Modal
} from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
import EntityForm from './design/EntityForm'
import ConfirmDialog from './design/ConfirmDialog'
import Toast from './Toast'
import { formatDate, t } from '../utils'
import type { BankReconciliationRecord, BankStatementLine } from '../accounting/types'
import BankImportModal from './BankImportModal'
import BankAccountActionsMenu from './design/BankAccountActionsMenu'
import { invalidateBalanceCache, getAccountBalance } from '../accounting/ledgerService'
import { generateChildCode } from '../accounting/chartOfAccountsService'
import { CurrencyText } from './design/CurrencyText'
import BankReconciliationDashboard from './BankReconciliationDashboard'
import { getBankDashboardProjection, getAccountStatementProjection } from '../readModels/InvestmentBankReadModel'
import BankAccountAvatar from './BankAccountAvatar'
import { deleteBankTransaction } from '../services/bankTransactionService'
import { TransactionLifecycleService } from '../services/transactionLifecycleService'

interface Props {
  currency?: string
  dateFormat?: string
  language?: string
  accounts: Account[]
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>
  vouchers: Voucher[]
  setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>
  bankAccounts: BankAccount[]
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>
  bankTransactions?: BankTransaction[]
  setBankTransactions?: React.Dispatch<React.SetStateAction<BankTransaction[]>>
  bankMappings: BankMapping[]
  setBankMappings: React.Dispatch<React.SetStateAction<BankMapping[]>>
  accountingEngine: AccountingEngine
  bankReconciliations: BankReconciliationRecord[]
  setBankReconciliations: React.Dispatch<React.SetStateAction<BankReconciliationRecord[]>>
  purchaseRecords?: PurchaseRecord[]
  onAuditEvent?: (event: AuditEvent) => void
}

type DialogType = 'addAccount' | 'editAccount' | 'deposit' | 'withdraw' | 'transfer' | null

export default function InvestmentBankAccounts({
  currency = 'AED', dateFormat = 'DD/MM/YYYY', language = 'English',
  accounts, setAccounts, vouchers, setVouchers,
  bankAccounts, setBankAccounts,
  bankTransactions = [], setBankTransactions = () => {},
  bankMappings, setBankMappings, accountingEngine, onAuditEvent,
  bankReconciliations, setBankReconciliations,
  purchaseRecords = [],
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ type: DialogType; accountId?: string }>({ type: null })
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteAccountTarget, setDeleteAccountTarget] = useState<BankAccount | null>(null)
  const [activeMenuAccountId, setActiveMenuAccountId] = useState<string | null>(null)
  const [formIban, setFormIban] = useState('')
  const [formSwift, setFormSwift] = useState('')
  const [formBranch, setFormBranch] = useState('')
  const [formStatus, setFormStatus] = useState<'active' | 'archived' | 'closed' | 'hidden'>('active')
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [searchQuery, setSearchQuery] = useState('')
  const [txnFilter, setTxnFilter] = useState<'all' | 'deposits' | 'transfers'>('all')
  const [importOpen, setImportOpen] = useState(false)
  const [selectedHistoryRec, setSelectedHistoryRec] = useState<BankReconciliationRecord | null>(null)
  const [selectedReconRec, setSelectedReconRec] = useState<BankReconciliationRecord | null>(null)

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.card-action-menu-wrap')) {
        setActiveMenuAccountId(null)
      }
    }
    document.addEventListener('click', handleDocumentClick)
    return () => {
      document.removeEventListener('click', handleDocumentClick)
    }
  }, [])

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

  const selectedBankAccount = useMemo(() => bankAccounts.find(a => a.id === selectedId) || null, [bankAccounts, selectedId])

  const selectedAccountReconciliations = useMemo(() => {
    return bankReconciliations.filter(r => r.bankAccountId === selectedId)
  }, [bankReconciliations, selectedId])

  const bankProjection = useMemo(
    () => getBankDashboardProjection(bankAccounts, bankMappings, accounts, vouchers),
    [bankAccounts, bankMappings, accounts, vouchers],
  )

  const accountStatement = useMemo(() => {
    if (!selectedId) return { statement: [], stats: { deposits: 0, withdrawals: 0, transfers: 0 } }
    return getAccountStatementProjection(selectedId, bankAccounts, bankMappings, accounts, vouchers)
  }, [selectedId, bankAccounts, bankMappings, accounts, vouchers])

  const accountTransactions = useMemo(() => {
    return (accountStatement.statement || []).map((t, idx) => ({
      id: `${t.voucherNumber}-${idx}`,
      date: t.date,
      description: t.description,
      amount: t.debit > 0 ? t.debit : t.credit,
      type: t.debit > 0 ? ('credit' as const) : ('debit' as const),
      status: 'cleared' as const,
      balanceAfter: t.balance,
      debit: t.debit,
      credit: t.credit,
      voucherNumber: t.voucherNumber,
    }))
  }, [accountStatement.statement])

  const accountStats = accountStatement.stats

  const filteredTransactions = useMemo(() => {
    let result = accountTransactions
    if (txnFilter === 'deposits') result = result.filter(t => t.type === 'credit')
    else if (txnFilter === 'transfers') result = result.filter(t => t.type === 'debit')
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.date.includes(q)
      )
    }
    return result
  }, [accountTransactions, txnFilter, searchQuery])

  const tableData = useMemo(() => {
    return filteredTransactions
  }, [filteredTransactions])

  const formatAmount = (txn: typeof tableData[0]) => {
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
      const dest = bankAccounts.find(a => a.status === 'active' && a.id !== (accountId || selectedId))
      if (dest) setFormToAccount(dest.id)
    }
    setDialog({ type, accountId })
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
    const newAccount: BankAccount = {
      id: `ba-${Date.now()}`,
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user',
      updatedBy: 'user',
    }
    setBankAccounts(prev => [...prev, newAccount])

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
      openingBalance: 0, // Set to 0 to prevent raw injection, balanced JV is used instead
      module: 'investment' as const,
    }
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
          creditAccount: '2200-inv',
          referenceType: 'Investment',
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
    onAuditEvent?.(recordModuleEvent('Bank Accounts', 'Create', accDesc, newAccount.id, `Added account: ${accDesc}`))
    setDialog({ type: null })
    setToast({ visible: true, message: 'Account added', type: 'success' })
    resetForm()
  }

  const openEditDialog = (acct: BankAccount) => {
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

    setBankAccounts(prev => prev.map(a => {
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
             debitAccount: isIncrease ? mapping.accountId : '2200-inv',
             creditAccount: isIncrease ? '2200-inv' : mapping.accountId,
             referenceType: 'Investment',
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
    onAuditEvent?.(recordModuleEvent('Bank Accounts', 'Update', accDesc, dialog.accountId, `Updated account: ${accDesc}`))
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
    setBankAccounts(prev => prev.filter(a => a.id !== acctId))

    const mapping = bankMappings.find(m => m.bankAccountId === acctId)
    if (mapping) {
      setBankMappings(prev => prev.filter(m => m.bankAccountId !== acctId))
    }

    // Safely remove the child account representing the bank from the Chart of Accounts.
    // Never remove the root parent account ('1120' or '1120-prop').
    setAccounts(prev => prev.filter(acct => {
      if (acct.id === '1120' || acct.code === '1120') return true
      if (mapping && acct.id === mapping.accountId) return false
      
      const isChild = acct.parentId === '1120' || acct.parentId === '1120-prop' || (acct.code && acct.code.startsWith('1120') && acct.code !== '1120')
      if (isChild) {
        const cleanAcctName = acct.name.toLowerCase()
        const cleanInst = deleteAccountTarget.institution.toLowerCase()
        if (cleanAcctName.includes(cleanInst) || (deleteAccountTarget.accountNumber && cleanAcctName.includes(deleteAccountTarget.accountNumber.toLowerCase()))) {
          return false
        }
      }
      return true
    }))

    setBankReconciliations(prev => prev.filter(r => r.bankAccountId !== acctId))
    
    // Remove the opening balance JV voucher
    setVouchers(prev => prev.filter(v => v.reference !== `OB-${acctId}`))

    invalidateBalanceCache()

    if (selectedId === acctId) {
      setSelectedId(null)
    }

    const accDesc = deleteAccountTarget.institution;
    onAuditEvent?.(recordModuleEvent('Bank Accounts', 'Delete', accDesc, deleteAccountTarget.id, `Deleted account: ${accDesc}`))

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
      invalidateBalanceCache()
      onAuditEvent?.(recordModuleEvent('Bank Accounts', 'Update', dialog.accountId || 'account', '', `Deposited ${currency}${amt.toLocaleString()}`))
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
      invalidateBalanceCache()
      onAuditEvent?.(recordModuleEvent('Bank Accounts', 'Update', dialog.accountId || 'account', '', `Withdrew ${currency}${amt.toLocaleString()}`))
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
    if (!fromId || !formToAccount) {
      setToast({ visible: true, message: 'Select source and destination', type: 'error' })
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
      invalidateBalanceCache()
      onAuditEvent?.(recordModuleEvent('Bank Accounts', 'Update', 'Transfer', '', `Transferred ${currency}${amt.toLocaleString()}`))
      setDialog({ type: null })
      setToast({ visible: true, message: 'Transfer completed', type: 'success' })
    } catch (e: any) {
      setToast({ visible: true, message: e.message || 'Failed to record transfer', type: 'error' })
    }
    resetForm()
  }

  const handleDeleteTransaction = () => {
    if (!deleteTarget) return
    // TODO: Implement via accounting engine
    setDeleteTarget(null)
    setToast({ visible: true, message: 'Transaction deleted', type: 'success' })
  }

  const getStatusBadge = (status: string) => {
    const v = status === 'cleared' ? 'success' : status === 'pending' ? 'warning' : 'neutral'
    return <Badge variant={v as any}>{status}</Badge>
  }

  const getTypeBadge = (txn: typeof tableData[0]) => {
    if (txn.type === 'credit') return <Badge variant="success">deposit</Badge>
    if (txn.type === 'debit') return <Badge variant="danger">withdrawal</Badge>
    return <Badge variant="primary">Transfer</Badge>
  }

  const columns: Column<typeof tableData[0]>[] = useMemo(() => [
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
      width: '110px',
      render: txn => (
        <span className={txn.type === 'credit' ? 'text-success' : 'text-danger'}>
          {txn.type === 'credit' ? '+' : '-'}
          <CurrencyText value={txn.amount} currency={currency} className="fw-600" />
        </span>
      ),
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

  const themeOptions = [
    { value: 'emerald', label: 'Emerald Green' },
    { value: 'blue', label: 'Blue' },
    { value: 'purple', label: 'Purple' },
    { value: 'amber', label: 'Amber' },
    { value: 'rose', label: 'Rose' },
    { value: 'indigo', label: 'Indigo' },
    { value: 'teal', label: 'Teal' },
  ]


  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'closed', label: 'Closed' },
    { value: 'hidden', label: 'Hidden' },
  ]

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction?"
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
            <Input label="SWIFT Code" value={formSwift} onChange={e => setFormSwift(e.target.value)} placeholder="e.g. EIBKAEADXXX" />
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
            <Input label="Description" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="e.g. Asset purchase" />
            <Input label="Date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
          </div>
        )}
        {dialog.type === 'transfer' && (
          <div className="form-row">
            <Select
              label="From Account"
              value={dialog.accountId || selectedId || ''}
              disabled
              options={bankAccounts.filter(a => a.status === 'active').map(a => ({ value: a.id, label: a.institution }))}
            />
            <Select
              label="To Account"
              value={formToAccount}
              onChange={e => setFormToAccount(e.target.value)}
              options={bankAccounts.filter(a => a.status === 'active' && a.id !== (dialog.accountId || selectedId)).map(a => ({ value: a.id, label: a.institution }))}
            />
            <Input label={`Amount (${currency})`} type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0" autoFocus />
            <Input label="Description" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Optional" />
            <Input label="Date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
          </div>
        )}
      </EntityForm>

      <div className="page-header">
        <div className="page-header-left">
          <div>
            <div className="page-title">Bank Accounts</div>
            <div className="page-subtitle">
              {bankAccounts.length > 0
                ? `${bankAccounts.length} account${bankAccounts.length !== 1 ? 's' : ''} tracked`
                : 'Manage your bank accounts'}
            </div>
          </div>
        </div>
        <div className="page-header-right">
          <Button variant="primary" size="sm" onClick={() => openDialog('addAccount')}><PlusIcon /> Add Account</Button>
        </div>
      </div>

      <div className="page-body">
        {bankAccounts.length === 0 ? (
          <EmptyState
            icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>}
            title="No bank accounts yet"
            text="Add your first bank account to start tracking balances."
            action={<Button variant="primary" onClick={() => openDialog('addAccount')}><PlusIcon /> Add Account</Button>}
          />
        ) : (
          <>
            <div className="kpi-grid">
              <KpiCard label="Total Balance" value={<CurrencyText value={bankProjection.totalTransactionBalance} currency={currency} />} accentColor="var(--success)" />
              <KpiCard label="Active Accounts" value={String(bankProjection.activeAccounts)} accentColor="var(--primary)" />
              <KpiCard label="This Month Flow" value={<span>{bankProjection.thisMonthFlow >= 0 ? '+' : '-'}<CurrencyText value={Math.abs(bankProjection.thisMonthFlow)} currency={currency} /></span>} accentColor={bankProjection.thisMonthFlow >= 0 ? 'var(--success)' : 'var(--danger)'} />
              <KpiCard label="Ledger Bank Balance" value={<CurrencyText value={bankProjection.totalLedgerBankBalance} currency={currency} />} accentColor="var(--accent)" />
            </div>

            {/* Reconciliation Summary */}
            <div className="card card-table" style={{ marginBottom: 20 }}>
              <div className="card-body">
                <div className="text-sm fw-600 mb-2">Bank Reconciliation Summary</div>
                <table className="property-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th className="text-xs">Account</th>
                      <th className="text-xs" style={{ textAlign: 'right' }}>Ledger Balance</th>
                      <th className="text-xs" style={{ textAlign: 'right' }}>Statement Balance</th>
                      <th className="text-xs" style={{ textAlign: 'right' }}>Difference</th>
                      <th className="text-xs">Last Reconciled</th>
                      <th className="text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankProjection.accounts.map(({ account: acct, transactionBalance: bal, ledgerBalance }) => {
                      const diff = ledgerBalance - bal
                      const lastReconciled = bankReconciliations
                          .filter(r => r.bankAccountId === acct.id)
                          .sort((a, b) => b.statementEndDate.localeCompare(a.statementEndDate))[0]?.statementEndDate || 'Never'
                      const statusLabel = Math.abs(diff) < 0.01 ? 'Reconciled' : 'Unreconciled'
                      const statusVariant = Math.abs(diff) < 0.01 ? 'success' : 'danger'
                      return (
                        <tr key={acct.id}>
                          <td className="text-xs fw-500">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <BankAccountAvatar bank={acct} size={24} />
                              <span>{acct.institution}</span>
                            </div>
                          </td>
                          <td className="text-mono text-xs" style={{ textAlign: 'right' }}><CurrencyText value={ledgerBalance} currency={currency} /></td>
                          <td className="text-mono text-xs" style={{ textAlign: 'right' }}><CurrencyText value={bal} currency={currency} /></td>
                          <td className="text-mono text-xs" style={{ textAlign: 'right' }}>
                            {Math.abs(diff) < 0.01 ? '—' : <CurrencyText value={Math.abs(diff)} currency={currency} className={diff > 0 ? 'text-success' : 'text-danger'} />}
                          </td>
                          <td className="text-xs text-secondary">{lastReconciled === 'Never' ? 'Never' : formatDate(lastReconciled, dateFormat)}</td>
                          <td><Badge variant={statusVariant}>{statusLabel}</Badge></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="account-cards-grid" style={{ marginBottom: 20 }}>
              {bankProjection.accounts.map(({ account: acct, transactionBalance: bal }) => (
                <div
                  key={acct.id}
                  className={`account-card compact prop-theme-${acct.theme}${selectedId === acct.id ? ' account-card-selected' : ''}${acct.status !== 'active' ? ' account-card-inactive' : ''}`}
                  onClick={() => setSelectedId(acct.id)}
                  style={{ cursor: 'pointer', position: 'relative' }}
                >
                  <div className="account-card-theme" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0 0 0 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <BankAccountAvatar bank={acct} />
                      <div className="account-card-institution" style={{ flex: 1, paddingRight: 24 }}>{acct.institution}</div>
                    </div>
                    <BankAccountActionsMenu
                      onView={() => setSelectedId(acct.id)}
                      onEdit={() => openEditDialog(acct)}
                      onDelete={() => setDeleteAccountTarget(acct)}
                      triggerStyle={{ padding: '2px 4px', height: 'auto', background: 'transparent', minWidth: 'auto', position: 'relative', zIndex: 10 }}
                    />
                  </div>
                  <div className="account-card-name">&nbsp;</div>
                  <div className="account-card-balance"><CurrencyText value={bal} currency={currency} /></div>
                </div>
              ))}
            </div>

            {selectedBankAccount && accountStats && (
              <>
                <div className="card card-table">
                <div className="card-header">
                  <span className="card-title">
                    {selectedBankAccount.institution}
                    {' — Transactions'}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>Import Statement</Button>
                    <Button variant="primary" size="sm" onClick={() => openDialog('deposit', selectedId!)}>Deposit</Button>
                    <Button variant="secondary" size="sm" onClick={() => openDialog('withdraw', selectedId!)}>Withdraw</Button>
                    {bankAccounts.length > 1 && (
                      <Button variant="secondary" size="sm" onClick={() => openDialog('transfer', selectedId!)}>Transfer</Button>
                    )}
                  </div>
                </div>
                <div className="card-body">
                  <DataTable
                    columns={columns}
                    data={tableData}
                    keyExtractor={t => t.id}
                    pageSize={10}
                    emptyState={
                      <EmptyState
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>}
                        title="No transactions"
                        text="Use the buttons above to add transactions."
                      />
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
                        <td style={{ padding: 8 }}>{line.date}</td>
                        <td style={{ padding: 8, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.description}</td>
                        <td style={{ padding: 8 }}>{line.reference ?? '-'}</td>
                        <td style={{ padding: 8, textAlign: 'right', color: line.amount >= 0 ? '#10B981' : '#EF4444', fontWeight: 500 }}>
                          {line.amount >= 0 ? '+' : '-'}
                          <CurrencyText value={Math.abs(line.amount)} currency={currency} />
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
