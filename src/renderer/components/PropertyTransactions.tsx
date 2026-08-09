import React, { useState, useMemo, useCallback } from 'react'
import type { PropTransaction, PropertyEntry, TenantEntry, PropertyTransactionCategory, PropAccount, PdcCheque, SecurityDeposit, PropertyExpense, LeaseEntry } from '../data/propertyTypes'
import type { AuditEvent } from '../data/auditTypes'
import { recordModuleEvent } from '../services/auditService'
import { Badge, Button, EditIcon, TrashIcon, PlusIcon, KpiCard, EmptyState, SearchIcon, CloseIcon, Select, Modal, Input } from './design/DesignSystem'
import { DataTable, type Column } from './design/Table'
import ConfirmDialog from './design/ConfirmDialog'
import EntityForm from './design/EntityForm'
import Toast from './Toast'
import { formatDate } from '../utils'
import type { Account, Voucher, VoucherLine, VoucherType, BankMapping } from '../accounting/types'
import { VoucherNumberService } from '../services/voucherNumberService'
import { invalidateBalanceCache } from '../accounting/ledgerService'
import { CurrencyText } from './design/CurrencyText'
import { exportTableData } from '../services/reportExportService'

interface Props {
  currency?: string
  dateFormat?: string
  language?: string
  onAuditEvent?: (event: AuditEvent) => void
  propTransactions?: PropTransaction[]
  setPropTransactions?: React.Dispatch<React.SetStateAction<PropTransaction[]>>
  propertyTransactionCategories?: PropertyTransactionCategory[]
  setPropertyTransactionCategories?: React.Dispatch<React.SetStateAction<PropertyTransactionCategory[]>>
  properties?: PropertyEntry[]
  tenants?: TenantEntry[]
  accounts?: Account[]
  setAccounts?: React.Dispatch<React.SetStateAction<Account[]>>
  vouchers?: Voucher[]
  setVouchers?: React.Dispatch<React.SetStateAction<Voucher[]>>
  propAccounts?: PropAccount[]
  bankMappings?: BankMapping[]
  pdcCheques?: PdcCheque[]
  securityDeposits?: SecurityDeposit[]
  propExpenses?: PropertyExpense[]
  setPropExpenses?: React.Dispatch<React.SetStateAction<PropertyExpense[]>>
  leases?: LeaseEntry[]
}

const typeFilterOptions = ['All', 'Income', 'Expense'] as const

export default function PropertyTransactions({
  currency = 'AED',
  dateFormat = 'DD/MM/YYYY',
  language = 'English',
  onAuditEvent,
  propTransactions = [],
  setPropTransactions,
  propertyTransactionCategories = [],
  setPropertyTransactionCategories,
  properties = [],
  tenants = [],
  accounts = [],
  setAccounts,
  vouchers = [],
  setVouchers,
  propAccounts = [],
  bankMappings = [],
  pdcCheques = [],
  securityDeposits = [],
  propExpenses = [],
  setPropExpenses,
  leases = []
}: Props) {
  const [typeFilter, setTypeFilter] = useState<'All' | 'Income' | 'Expense'>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const [formType, setFormType] = useState<'credit' | 'debit'>('credit')
  const [formCategory, setFormCategory] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formDescription, setFormDescription] = useState('')
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [selectedTenantId, setSelectedTenantId] = useState('')

  const [formPaymentMode, setFormPaymentMode] = useState<string>('Bank Transfer')
  const [formPaymentChannel, setFormPaymentChannel] = useState<'Bank Account' | 'Cash In Hand'>('Bank Account')
  const [formTags, setFormTags] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [formBankAccount, setFormBankAccount] = useState('')

  const handlePaymentModeChange = (mode: string) => {
    setFormPaymentMode(mode)
    if (mode === 'Cash') {
      setFormPaymentChannel('Cash In Hand')
    } else if (['Bank Transfer', 'Cheque', 'Post Dated Cheque (PDC)', 'Online Transfer', 'Card'].includes(mode)) {
      setFormPaymentChannel('Bank Account')
    }
  }

  const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [customCategoryName, setCustomCategoryName] = useState('')
  const [customCategoryType, setCustomCategoryType] = useState<'credit' | 'debit'>('credit')
  const [customCategoryError, setCustomCategoryError] = useState('')

  const displayType = formType === 'credit' ? 'Income' : 'Expense'

  const getBankOrCashAccountId = useCallback((): string => {
    if (formPaymentChannel === 'Cash In Hand') {
      const cashAcct = accounts.find(a => (a.id === '1110-prop' || a.code === '1110') && a.isActive)
      if (cashAcct) return cashAcct.id
      return '1110-prop'
    } else {
      const mappedId = bankMappings.find(m => m.bankAccountId === formBankAccount)?.accountId
      if (mappedId) return mappedId
      const bankAcct = accounts.find(a => a.parentId === '1120' && a.isActive)
      if (bankAcct) return bankAcct.id
      return accounts.find(a => a.type === 'asset' && a.isActive)?.id || '1110-prop'
    }
  }, [accounts, formPaymentChannel, formBankAccount, bankMappings])

  const ensureCategoryAccount = useCallback((categoryName: string, type: 'credit' | 'debit'): string => {
    const isIncome = type === 'credit'
    const parentCode = isIncome ? '4000' : '5000'
    const accountType = isIncome ? 'revenue' : 'expense'
    const normalBalance = isIncome ? 'credit' : 'debit'

    const existing = accounts.find(
      a => a.name.toLowerCase() === categoryName.toLowerCase() && a.type === accountType && a.isActive
    )
    if (existing) return existing.id

    const parent = accounts.find(a => a.code === parentCode)
    if (!parent) return parentCode

    const prefix = parentCode
    const children = accounts
      .filter(a => a.parentId === parent.id && a.code.startsWith(prefix))
      .map(a => parseInt(a.code.replace(prefix, ''), 10))
      .filter(num => !isNaN(num))

    const nextNum = children.length > 0 ? Math.max(...children) + 1 : 1
    const nextCode = `${prefix}${nextNum.toString().padStart(2, '0')}`

    const newAccount = {
      id: `acct-${Date.now()}`,
      code: nextCode,
      name: categoryName,
      type: accountType as any,
      normalBalance: normalBalance as any,
      classification: 'current' as const,
      currency: 'AED',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user',
      parentId: parent.id,
      description: `${categoryName} Category Account`,
      openingBalance: 0,
      module: 'property' as const,
    }

    if (setAccounts) {
      setAccounts(prev => [...prev, newAccount])
    }
    return newAccount.id
  }, [accounts, setAccounts])

  const categoryOptions = useMemo(() => {
    let cats = propertyTransactionCategories
      .filter(c => c.type === formType && c.isActive)
      .filter(c => c.name !== 'Security Deposit Received')
      .map(c => c.name)


    const propertySpecific = ['Security Deposit Refund', 'Rent Refund', 'Vacancy Expense', 'Fit-out Expense', 'Renovation']

    if (!selectedPropertyId && !selectedTenantId) {
      cats = cats.filter(c => !propertySpecific.includes(c))
    }

    return [
      { value: '', label: 'Select Category' },
      ...cats.map(c => ({ value: c, label: c })),
      { value: '__custom__', label: '+ Add Custom Category' }
    ]
  }, [formType, propertyTransactionCategories, selectedPropertyId, selectedTenantId])

  const resetForm = () => {
    setFormType('credit')
    setFormCategory('')
    setFormAmount('')
    setFormDate(new Date().toISOString().split('T')[0])
    setFormDescription('')
    setSelectedPropertyId('')
    setSelectedTenantId('')
    setFormPaymentMode('Bank Transfer')
    setFormPaymentChannel('Bank Account')
    setFormTags('')
    setFormBankAccount('')
  }

  const validate = () => {
    if (!formCategory) {
      setToast({ visible: true, message: 'Category is mandatory', type: 'error' })
      return false
    }
    if (!formDate) {
      setToast({ visible: true, message: 'Please enter a valid date', type: 'error' })
      return false
    }
    const amt = Number(formAmount)
    if (!formAmount || amt <= 0) {
      setToast({ visible: true, message: 'Amount must be greater than zero', type: 'error' })
      return false
    }
    if (formPaymentChannel === 'Bank Account' && !formBankAccount) {
      setToast({ visible: true, message: 'Bank Account is mandatory', type: 'error' })
      return false
    }
    return true
  }

  const generateId = () => `PTXN-${Date.now()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`

  const handleAdd = () => {
    if (!validate()) return
    const nowStr = new Date().toISOString()
    const newTxnId = generateId()
    const newTxn: PropTransaction = {
      id: newTxnId,
      accountId: 'property-income',
      date: formDate,
      type: formType,
      amount: Number(formAmount),
      description: formDescription,
      category: formCategory,
      status: 'cleared',
      reference: '',
      createdAt: nowStr,
      updatedAt: nowStr,
      createdBy: 'user',
      updatedBy: 'user',
      propertyId: selectedPropertyId || undefined,
      tenantId: selectedTenantId || undefined,
      paymentMode: formPaymentMode as any,
      paymentChannel: formPaymentChannel,
      tags: formTags.split(',').map(t => t.trim()).filter(Boolean)
    } as any

    if (setPropTransactions) {
      setPropTransactions(prev => [newTxn, ...prev])
    }

    // --- GL Voucher Posting ---
    let categoryAccountId = ensureCategoryAccount(formCategory, formType)
    if (formCategory === 'Security Deposit Refund') {

      categoryAccountId = '2120'
    }
    const bankOrCashAccountId = getBankOrCashAccountId()
    const vchType: VoucherType = formType === 'credit' ? 'Receipt' : 'Payment'
    const nextVchNumber = VoucherNumberService.generateNextNumber(vchType, formDate, vouchers)
    const voucherId = `vch-${newTxnId}`

    const lines: VoucherLine[] = [
      {
        id: `${voucherId}-l1`,
        accountId: formType === 'credit' ? bankOrCashAccountId : categoryAccountId,
        type: 'Debit',
        amount: Number(formAmount),
        baseAmount: Number(formAmount),
        currency: 'AED',
        narration: formDescription || `${formCategory} transaction`,
        referenceType: 'Property',
        referenceId: selectedPropertyId || undefined,
      },
      {
        id: `${voucherId}-l2`,
        accountId: formType === 'credit' ? categoryAccountId : bankOrCashAccountId,
        type: 'Credit',
        amount: Number(formAmount),
        baseAmount: Number(formAmount),
        currency: 'AED',
        narration: formDescription || `${formCategory} transaction`,
        referenceType: 'Property',
        referenceId: selectedPropertyId || undefined,
      }
    ]

    const newVoucher: Voucher = {
      id: voucherId,
      number: nextVchNumber,
      date: formDate,
      type: vchType,
      reference: newTxnId,
      description: formDescription || `${formCategory} transaction`,
      status: 'Posted',
      currency: 'AED',
      exchangeRate: 1,
      baseCurrency: 'AED',
      createdBy: 'user',
      createdAt: nowStr,
      updatedAt: nowStr,
      lines,
      paymentMode: formPaymentMode as any,
      paymentChannel: formPaymentChannel,
      tags: formTags.split(',').map(t => t.trim()).filter(Boolean)
    }

    if (setVouchers) {
      setVouchers(prev => [...prev, newVoucher])
    }
    invalidateBalanceCache()
    // --------------------------

    onAuditEvent?.(recordModuleEvent('Property Transactions', 'Create', `${displayType} - ${formCategory}`, newTxn.id, `${displayType} transaction: ${formCategory} ${currency}${Number(formAmount).toLocaleString()}`))
    setShowForm(false)
    setToast({ visible: true, message: 'Transaction recorded', type: 'success' })
    resetForm()
  }

  const handleEdit = (txn: PropTransaction) => {
    setFormType(txn.type === 'credit' ? 'credit' : 'debit')
    setFormCategory(txn.category)
    setFormAmount(String(txn.amount))
    setFormDate(txn.date)
    setFormDescription(txn.description)
    setSelectedPropertyId((txn as any).propertyId || '')
    setSelectedTenantId((txn as any).tenantId || '')
    setFormPaymentMode(txn.paymentMode || 'Bank Transfer')
    setFormPaymentChannel(txn.paymentChannel || 'Bank Account')
    setFormTags(txn.tags?.join(', ') || '')
    
    // Find the mapped bank account ID from the voucher line
    const v = vouchers.find(vc => vc.reference === txn.id)
    const debitLine = v?.lines.find(l => l.type === 'Debit')
    const creditLine = v?.lines.find(l => l.type === 'Credit')
    const activeLine = txn.type === 'credit' ? debitLine : creditLine
    const mapping = bankMappings.find(m => m.accountId === activeLine?.accountId)
    setFormBankAccount(mapping ? mapping.bankAccountId : '')

    setEditingId(txn.id)
    setShowForm(true)
  }

  const handleUpdate = () => {
    if (!validate()) return

    const isManual = propTransactions.some(t => t.id === editingId)
    const isVoucher = (vouchers || []).some(v => v.id === editingId)
    const isExpense = (propExpenses || []).some(e => e.id === editingId)

    if (isManual) {
      const prevTxn = propTransactions.find(t => t.id === editingId)
      if (setPropTransactions) {
        setPropTransactions(prev => prev.map(t =>
          t.id === editingId ? {
            ...t,
            date: formDate,
            type: formType,
            category: formCategory,
            amount: Number(formAmount),
            description: formDescription,
            propertyId: selectedPropertyId || undefined,
            tenantId: selectedTenantId || undefined,
            paymentMode: formPaymentMode as any,
            paymentChannel: formPaymentChannel,
            tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
            updatedAt: new Date().toISOString(),
            updatedBy: 'user',
          } : t
        ))
      }

      // --- GL Voucher Updating ---
      let categoryAccountId = ensureCategoryAccount(formCategory, formType)
      if (formCategory === 'Security Deposit Refund') {
        categoryAccountId = '2120'
      }
      const bankOrCashAccountId = getBankOrCashAccountId()
      const voucherId = `vch-${editingId}`
      const vchType: VoucherType = formType === 'credit' ? 'Receipt' : 'Payment'

      const existingVoucher = vouchers.find(v => v.id === voucherId)
      const vchNumber = existingVoucher ? existingVoucher.number : VoucherNumberService.generateNextNumber(vchType, formDate, vouchers)

      const lines: VoucherLine[] = [
        {
          id: `${voucherId}-l1`,
          accountId: formType === 'credit' ? bankOrCashAccountId : categoryAccountId,
          type: 'Debit',
          amount: Number(formAmount),
          baseAmount: Number(formAmount),
          currency: 'AED',
          narration: formDescription || `${formCategory} transaction`,
          referenceType: 'Property',
          referenceId: selectedPropertyId || undefined,
        },
        {
          id: `${voucherId}-l2`,
          accountId: formType === 'credit' ? categoryAccountId : bankOrCashAccountId,
          type: 'Credit',
          amount: Number(formAmount),
          baseAmount: Number(formAmount),
          currency: 'AED',
          narration: formDescription || `${formCategory} transaction`,
          referenceType: 'Property',
          referenceId: selectedPropertyId || undefined,
        }
      ]

      const updatedVoucher: Voucher = {
        id: voucherId,
        number: vchNumber,
        date: formDate,
        type: vchType,
        reference: editingId!,
        description: formDescription || `${formCategory} transaction`,
        status: 'Posted',
        currency: 'AED',
        exchangeRate: 1,
        baseCurrency: 'AED',
        createdBy: 'user',
        createdAt: existingVoucher ? existingVoucher.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lines,
        paymentMode: formPaymentMode as any,
        paymentChannel: formPaymentChannel,
        tags: formTags.split(',').map(t => t.trim()).filter(Boolean)
      }

      if (setVouchers) {
        setVouchers(prev => {
          const filtered = prev.filter(v => v.id !== voucherId)
          return [...filtered, updatedVoucher]
        })
      }
      invalidateBalanceCache()
      
      if (prevTxn) {
        onAuditEvent?.(recordModuleEvent('Property Transactions', 'Update', `${displayType} - ${formCategory}`, editingId!, `Updated ${displayType} transaction: ${formCategory} ${currency}${Number(formAmount).toLocaleString()}`, 'Info', prevTxn as any, { date: formDate, type: formType, category: formCategory, amount: Number(formAmount), description: formDescription }))
      }
    } else if (isVoucher) {
      if (setVouchers) {
        setVouchers(prev => prev.map(v => v.id === editingId ? {
          ...v,
          date: formDate,
          description: formDescription,
          paymentMode: formPaymentMode as any,
          paymentChannel: formPaymentChannel,
          tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
          updatedAt: new Date().toISOString()
        } : v))
      }
    } else if (isExpense) {
      if (setPropExpenses) {
        setPropExpenses(prev => prev.map(e => e.id === editingId ? {
          ...e,
          date: formDate,
          description: formDescription,
          paymentMode: formPaymentMode as any,
          paymentChannel: formPaymentChannel,
          updatedAt: new Date().toISOString()
        } : e))
      }
      const expVoucherId = `vch-exp-${editingId}`
      if (setVouchers) {
        setVouchers(prev => prev.map(v => v.id === expVoucherId ? {
          ...v,
          date: formDate,
          description: formDescription,
          paymentMode: formPaymentMode as any,
          paymentChannel: formPaymentChannel,
          tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
          updatedAt: new Date().toISOString()
        } : v))
      }
    } else {
      setToast({ visible: true, message: 'This automated transaction must be edited from its source module.', type: 'error' })
      return
    }

    setEditingId(null)
    setShowForm(false)
    setToast({ visible: true, message: 'Transaction updated', type: 'success' })
    resetForm()
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    const isManual = propTransactions.some(t => t.id === deleteTarget)
    const deleted = propTransactions.find(t => t.id === deleteTarget)

    if (isManual && setPropTransactions) {
      setPropTransactions(prev => prev.filter(t => t.id !== deleteTarget))
      // Also remove its GL voucher
      const voucherId = `vch-${deleteTarget}`
      if (setVouchers) {
        setVouchers(prev => prev.filter(v => v.id !== voucherId))
      }
    }

    // Delete voucher-based transaction (Receipt/Payment voucher)
    const isVoucher = (vouchers || []).some(v => v.id === deleteTarget)
    if (isVoucher && setVouchers) {
      setVouchers(prev => prev.filter(v => v.id !== deleteTarget))
    }

    // Delete expense-based transaction
    const isExpense = (propExpenses || []).some(e => e.id === deleteTarget)
    if (isExpense && setPropExpenses) {
      setPropExpenses(prev => prev.filter(e => e.id !== deleteTarget))
    }

    invalidateBalanceCache()
    setDeleteTarget(null)

    const txnType = deleted?.type === 'credit' ? 'Income' : 'Expense'
    const txnCategory = deleted?.category || (isVoucher ? 'Voucher' : 'Transaction')
    onAuditEvent?.(recordModuleEvent('Property Transactions', 'Delete', `${txnType} - ${txnCategory}`, deleteTarget, `Deleted transaction ${deleteTarget}`))
    setToast({ visible: true, message: 'Transaction deleted', type: 'success' })
  }

  const handleSaveCustomCategory = () => {
    if (!customCategoryName.trim()) {
      setCustomCategoryError('Category name is required')
      return
    }

    const lowerName = customCategoryName.trim().toLowerCase()
    const duplicate = propertyTransactionCategories.find(c => c.name.toLowerCase() === lowerName)
    if (duplicate) {
      setCustomCategoryError('Category already exists')
      return
    }

    const newCategory: PropertyTransactionCategory = {
      id: `ptcat-cust-${Date.now()}`,
      name: customCategoryName.trim(),
      type: customCategoryType,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCustom: true
    }

    if (setPropertyTransactionCategories) {
      setPropertyTransactionCategories(prev => [...prev, newCategory])
    }

    setFormCategory(newCategory.name)
    setFormType(customCategoryType)
    setShowCustomCategoryModal(false)
    setToast({ visible: true, message: 'Custom category created', type: 'success' })
  }

  const fmt = useCallback((n: number) => <CurrencyText value={n} currency={currency} />, [currency])

  const getTransactionBankName = useCallback((txn: PropTransaction) => {
    const bankId = (txn as any).bankAccountId
    if (bankId) {
      const bankAcc = propAccounts.find(ba => ba.id === bankId)
      if (bankAcc) return bankAcc.institution
    }
    const v = vouchers.find(vc => vc.reference === txn.id)
    if (!v) return 'Bank Account'
    const isIncome = txn.type === 'credit'
    const bankLine = v.lines.find(l => l.type === (isIncome ? 'Debit' : 'Credit'))
    if (!bankLine) return 'Bank Account'
    const acct = accounts.find(a => a.id === bankLine.accountId)
    return acct?.name || 'Bank Account'
  }, [vouchers, accounts, propAccounts])

  const allTransactions = useMemo(() => {
    const manualTxns = propTransactions.map(t => ({
      ...t,
      bankAccountId: (t as any).bankAccountId || null
    }))

    const pdcTxns = (pdcCheques || []).map(c => {
      const lease = leases.find(l => l.id === c.leaseId)
      const tenant = lease ? tenants.find(t => t.id === lease.tenantId) : null
      const tenantName = tenant ? tenant.name : ''
      return {
        id: c.id,
        accountId: '',
        date: c.clearedAt || c.chequeDate,
        type: 'credit' as const,
        amount: c.amount,
        description: `PDC Cheque Rent Receipt - Cheque #${c.chequeNumber}${tenantName ? ` (${tenantName})` : ''}`,
        category: 'Rental Income',
        status: c.status === 'Cleared' ? 'cleared' as const : c.status === 'Bounced' ? 'void' as const : 'pending' as const,
        reference: c.leaseId,
        paymentMode: 'Post Dated Cheque (PDC)' as const,
        paymentChannel: 'Bank Account' as const,
        paymentReference: c.chequeNumber,
        bankAccountId: c.bankAccountId || null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        createdBy: c.createdBy,
        updatedBy: c.createdBy
      }
    })

    const depositTxns = (securityDeposits || []).flatMap(sd => {
      const tenant = tenants.find(t => t.id === sd.tenantId)
      const tenantName = tenant ? tenant.name : ''
      return (sd.transactions || [])
        .filter(t => {
          const typeStr = String(t.type).toLowerCase()
          return typeStr === 'receipt'
        })
        .map(t => {
          const typeStr = String(t.type).toLowerCase()
          const label = 'Receipt'
          return {
            id: t.id,
            accountId: '',
            date: t.date,
            type: 'credit' as const,
            amount: t.amount,
            description: `Security Deposit ${label}${tenantName ? ` (${tenantName})` : ''}`,
            category: 'Security Deposit',
            status: t.status === 'Posted' ? 'cleared' as const : 'pending' as const,
            reference: sd.leaseId,
            paymentMode: t.paymentMode || 'Bank Transfer',
            paymentChannel: t.paymentChannel || 'Bank Account',
            paymentReference: t.paymentReference,
            tags: t.tags || [],
            bankAccountId: t.bankAccountId || null,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            createdBy: t.createdBy,
            updatedBy: t.createdBy
          }
        })
    })

    const expenseTxns = (propExpenses || []).map(e => {
      return {
        id: e.id,
        accountId: '',
        date: e.date,
        type: 'debit' as const,
        amount: e.amount,
        description: e.description || `Expense: ${e.category} to ${e.paidTo}`,
        category: e.category,
        status: e.status === 'Paid' ? 'cleared' as const : 'pending' as const,
        reference: e.expenseNo,
        paymentMode: e.paymentMode || e.paymentMethod || 'Bank Transfer',
        paymentChannel: e.paymentChannel || 'Bank Account',
        paymentReference: e.paymentReference || e.referenceNumber,
        tags: e.tags || [],
        bankAccountId: e.bankAccountId || null,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        createdBy: 'user',
        updatedBy: 'user'
      }
    })

    const knownRefs = new Set([
      ...manualTxns.map(t => t.id),
      ...pdcTxns.map(t => t.id),
      ...depositTxns.map(t => t.id),
      ...expenseTxns.map(t => t.id)
    ])

    const voucherTxns = (vouchers || [])
      .filter(v => {
        if (v.isDeleted) return false
        if (v.reference && knownRefs.has(v.reference)) return false
        if (v.id.startsWith('vch-exp-') && knownRefs.has(v.id.replace('vch-exp-', ''))) return false
        if (v.id.startsWith('vch-') && knownRefs.has(v.id.replace('vch-', ''))) return false
        return true
      })
      .map(v => {
      const typeStr = v.type === 'Receipt' ? 'credit' : 'debit'
      const amount = v.lines.reduce((sum, l) => sum + (l.type === 'Debit' ? l.amount : 0), 0)
      return {
        id: v.id,
        accountId: '',
        date: v.date,
        type: typeStr as any,
        amount: amount,
        description: v.description || `${v.type} Voucher ${v.number}`,
        category: v.type === 'Receipt' ? 'Receipt Voucher' : (v.type === 'Payment' ? 'Payment Voucher' : 'Journal Voucher'),
        status: v.status === 'Posted' ? 'cleared' as const : (v.status === 'Cancelled' || v.status === 'Reversed') ? 'void' as any : 'pending' as const,
        reference: v.number,
        paymentMode: v.paymentMode || 'Bank Transfer',
        paymentChannel: v.paymentChannel || 'Bank Account',
        paymentReference: v.paymentReference,
        tags: v.tags || [],
        bankAccountId: null,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        createdBy: v.createdBy,
        updatedBy: v.createdBy || 'user'
      }
    })

    const uniqueTxns = new Map<string, any>()
    manualTxns.forEach(t => uniqueTxns.set(t.id, t))
    pdcTxns.forEach(t => uniqueTxns.set(t.id, t))
    depositTxns.forEach(t => uniqueTxns.set(t.id, t))
    expenseTxns.forEach(t => uniqueTxns.set(t.id, t))
    voucherTxns.forEach(t => uniqueTxns.set(t.id, t))

    return Array.from(uniqueTxns.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [propTransactions, pdcCheques, securityDeposits, propExpenses, tenants, leases, vouchers])

  const totalIncome = useMemo(() =>
    allTransactions.filter(t => t.type === 'credit' && t.category !== 'Security Deposit').reduce((s, t) => s + t.amount, 0),
    [allTransactions]
  )
  const totalExpense = useMemo(() =>
    allTransactions.filter(t => t.type === 'debit' && t.category !== 'Security Deposit Refund').reduce((s, t) => s + t.amount, 0),
    [allTransactions]
  )
  const netIncome = totalIncome - totalExpense

  const filtered = useMemo(() => {
    let list = allTransactions
    if (typeFilter === 'Income') list = list.filter(t => t.type === 'credit')
    if (typeFilter === 'Expense') list = list.filter(t => t.type === 'debit')
    
    if (dateFrom) list = list.filter(t => t.date >= dateFrom)
    if (dateTo) list = list.filter(t => t.date <= dateTo)

    if (tagFilter) {
      const q = tagFilter.toLowerCase()
      list = list.filter(t => t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(t =>
        t.description.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.paymentMode && t.paymentMode.toLowerCase().includes(q)) ||
        (t.reference && t.reference.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
      )
    }

    return list
  }, [allTransactions, typeFilter, searchQuery, dateFrom, dateTo, tagFilter])

  const columns: Column<PropTransaction>[] = useMemo(() => [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: txn => <span className="text-secondary">{formatDate(txn.date, dateFormat)}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      render: txn => <span style={{ fontWeight: 500 }}>{txn.description || '—'}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      render: txn => <Badge variant="neutral">{txn.category}</Badge>,
    },
    {
      key: 'paymentMode',
      header: 'Payment Mode',
      render: txn => <span className="text-sm">{txn.paymentMode || 'Unknown'}</span>,
    },
    {
      key: 'tags',
      header: 'Tags',
      render: txn => <span className="text-xs text-secondary">{txn.tags?.length ? txn.tags.join(', ') : '—'}</span>,
    },
    {
      key: 'paymentChannel',
      header: 'Payment Voucher',
      render: txn => {
        if (txn.paymentChannel === 'Cash In Hand') return <span className="text-xs text-secondary">Cash In Hand</span>
        if (txn.paymentChannel === 'Bank Account') return <span className="text-xs text-secondary">{getTransactionBankName(txn)}</span>
        return <span className="text-xs text-secondary">Unknown</span>
      },
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: txn => {
        const isLiability = txn.category === 'Security Deposit' || txn.category === 'Security Deposit Refund'
        if (isLiability) {
          return <Badge variant="neutral">Liability</Badge>
        }
        if (txn.category === 'Journal Voucher') {
          return (
            <Badge variant={txn.status === 'cleared' ? 'success' : (txn.status === 'pending' ? 'warning' : 'neutral')}>
              JV
            </Badge>
          )
        }
        return (
          <Badge variant={txn.status === 'cleared' ? 'success' : (txn.status === 'pending' ? 'warning' : 'neutral')}>
            {txn.type === 'credit' ? 'Income' : 'Expense'}
          </Badge>
        )
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      numeric: true,
      render: txn => {
        const isLiability = txn.category === 'Security Deposit' || txn.category === 'Security Deposit Refund'
        if (isLiability) {
          return (
            <span style={{ fontWeight: 600, color: 'var(--text-secondary, #6B7280)' }}>
              {fmt(txn.amount)}
            </span>
          )
        }
        const isIncome = txn.type === 'credit'
        return (
          <span style={{ fontWeight: 600, color: isIncome ? 'var(--success)' : 'var(--danger)' }}>
            {isIncome ? '+' : '-'}{fmt(txn.amount)}
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: '',
      render: txn => {
        return (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <Button variant="ghost" size="sm" onClick={() => handleEdit(txn)} aria-label="Edit">
              <EditIcon />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(txn.id)} aria-label="Delete">
              <TrashIcon />
            </Button>
          </div>
        )
      },
    },
  ], [dateFormat, fmt, getTransactionBankName, propTransactions])

  const empty = (
    <EmptyState
      icon={
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      }
      title={typeFilter !== 'All' || searchQuery ? 'No transactions found' : 'No property transactions yet'}
      text={typeFilter !== 'All' || searchQuery ? 'Try adjusting your search or filters' : 'Add your first income or expense transaction to get started'}
    />
  )

  const handleExport = (format: 'pdf' | 'csv' | 'xlsx') => {
    // Allow exporting empty list to generate a template/blank report

    const columns = ['Date', 'Description', 'Category', 'Payment Mode', 'Payment Voucher', 'Type', 'Amount', 'Tags']
    const rows = filtered.map(t => [
      formatDate(t.date, dateFormat),
      t.description || '—',
      t.category || '—',
      t.paymentMode || '—',
      t.reference || t.paymentReference || '—',
      t.type === 'credit' ? 'Income' : 'Expense',
      t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      t.tags?.length ? t.tags.join(', ') : '—'
    ])

    exportTableData({
      moduleName: 'Properties Management',
      format,
      title: 'Property Transactions',
      subtitle: 'Track income and expenses for your property investments',
      filename: `Property_Transactions_${new Date().toISOString().split('T')[0]}`,
      columns,
      rows,
      currency
    })

    onAuditEvent?.(
      recordModuleEvent(
        'Property Transactions',
        'Export',
        'Transactions List',
        'bulk',
        `Exported ${filtered.length} transactions to ${format.toUpperCase()}`
      )
    )

    setToast({ visible: true, message: 'Export completed successfully.', type: 'success' })
    setShowExportMenu(false)
  }

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <EntityForm
        open={showForm}
        title={editingId ? 'Edit Transaction' : 'New Transaction'}
        submitLabel={editingId ? 'Update' : 'Add'}
        onCancel={() => { setShowForm(false); setEditingId(null); resetForm() }}
        onSubmit={editingId ? handleUpdate : handleAdd}
      >
        <div className="form-row">
          <Select
            label="Type"
            value={formType}
            onChange={e => {
              const val = e.target.value as 'credit' | 'debit'
              setFormType(val)
              setFormCategory('')
            }}
            options={[
              { value: 'credit', label: 'Income' },
              { value: 'debit', label: 'Expense' }
            ]}
          />
          <Select
            label="Category"
            value={formCategory}
            onChange={e => {
              const val = e.target.value
              if (val === '__custom__') {
                setCustomCategoryName('')
                setCustomCategoryType(formType)
                setCustomCategoryError('')
                setShowCustomCategoryModal(true)
                setFormCategory('')
                return
              }
              setFormCategory(val)
            }}
            options={categoryOptions}
          />
        </div>
        <div className="form-row">
          <Select
            label="Property (Optional)"
            value={selectedPropertyId}
            onChange={e => setSelectedPropertyId(e.target.value)}
            options={properties.length === 0 ? [{ value: '', label: 'No properties found' }] : [{ value: '', label: 'Select Property' }, ...properties.map(p => ({ value: p.id, label: p.name }))]}
          />
          <Select
            label="Tenant (Optional)"
            value={selectedTenantId}
            onChange={e => setSelectedTenantId(e.target.value)}
            options={[{ value: '', label: 'Select Tenant' }, ...tenants.map(t => ({ value: t.id, label: t.name }))]}
          />
        </div>
        <div className="form-row">
          <Input 
            label={`Amount (${currency})`} 
            type="number" 
            value={formAmount} 
            onChange={e => setFormAmount(e.target.value)} 
            placeholder="0" 
            disabled={editingId !== null && !propTransactions.some(t => t.id === editingId)}
          />
          <Input 
            label="Date" 
            type="date" 
            value={formDate} 
            onChange={e => setFormDate(e.target.value)} 
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <input className="input" type="text" placeholder="Enter description..." value={formDescription} onChange={e => setFormDescription(e.target.value)} />
          </div>
        </div>
        
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 12, marginTop: 12 }}>
          Payment Details
        </div>
        <div className="form-row">
          <Select
            label="Payment Mode"
            value={formPaymentMode}
            onChange={e => handlePaymentModeChange(e.target.value)}
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'Bank Transfer', label: 'Bank Transfer' },
              { value: 'Cheque', label: 'Cheque' },
              { value: 'Post Dated Cheque (PDC)', label: 'Post Dated Cheque (PDC)' },
              { value: 'Online Transfer', label: 'Online Transfer' },
              { value: 'Card', label: 'Card' },
              { value: 'Other', label: 'Other' }
            ]}
          />
        </div>
        <div className="form-row">
          {formPaymentChannel === 'Bank Account' && (
            <Select
              label="Bank Account"
              value={formBankAccount}
              onChange={e => setFormBankAccount(e.target.value)}
              disabled={editingId !== null && !propTransactions.some(t => t.id === editingId)}
              options={[{ value: '', label: 'Select Bank Account' }, ...propAccounts.map(ba => ({
                value: ba.id,
                label: ba.institution,
              }))]}
            />
          )}
          <Input 
            label="Tags" 
            value={formTags} 
            onChange={e => setFormTags(e.target.value)} 
            placeholder="Comma-separated tags" 
          />
        </div>
      </EntityForm>

      <Modal open={showCustomCategoryModal} title="Add Custom Category" onClose={() => setShowCustomCategoryModal(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 320 }}>
          <Input
            label="Category Name *"
            placeholder="Enter category name"
            value={customCategoryName}
            onChange={e => setCustomCategoryName(e.target.value)}
            error={customCategoryError}
          />
          <Select
            label="Type"
            value={customCategoryType}
            onChange={e => setCustomCategoryType(e.target.value as 'credit' | 'debit')}
            options={[
              { value: 'credit', label: 'Income' },
              { value: 'debit', label: 'Expense' }
            ]}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="secondary" onClick={() => setShowCustomCategoryModal(false)}>Cancel</Button>
            <Button onClick={handleSaveCustomCategory} variant="primary">Save</Button>
          </div>
        </div>
      </Modal>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-header-left">
          <div>
            <div className="page-title">Property Transactions</div>
            <div className="page-subtitle">Track income and expenses for your property investments</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Button variant="secondary" size="sm" onClick={() => setShowExportMenu(!showExportMenu)}>
              Export <span style={{ marginLeft: 6 }}>▼</span>
            </Button>
            {showExportMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, width: 140, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <button className="export-menu-item" onClick={() => handleExport('pdf')} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer' }}>PDF (.pdf)</button>
                <button className="export-menu-item" onClick={() => handleExport('xlsx')} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer' }}>Excel (.xlsx)</button>
                <button className="export-menu-item" onClick={() => handleExport('csv')} style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer' }}>CSV (.csv)</button>
              </div>
            )}
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
            Add Transaction
          </Button>
        </div>
      </div>

      <div className="page-body">
        <div className="kpi-grid">
          <KpiCard label="Total Income" value={fmt(totalIncome)} accentColor="var(--success)" />
          <KpiCard label="Total Expenses" value={fmt(totalExpense)} accentColor="var(--danger)" />
          <KpiCard
            label="Net Income"
            value={fmt(netIncome)}
            accentColor={netIncome >= 0 ? 'var(--success)' : 'var(--danger)'}
          />
        </div>

        <div className="data-table-toolbar">
          <div className="data-table-filters" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="filter-bar" style={{ padding: 0 }}>
              {typeFilterOptions.map(f => (
                <Button key={f} variant={typeFilter === f ? 'primary' : 'secondary'} size="sm" onClick={() => setTypeFilter(f)}>
                  {f}
                </Button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '12px' }}>
              <div className="data-table-search" style={{ maxWidth: 'none', width: 'auto', flex: '0 0 auto', padding: '0 12px' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 8 }}>From</span>
                <input type="date" className="data-table-search-input" style={{ width: 110 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="data-table-search" style={{ maxWidth: 'none', width: 'auto', flex: '0 0 auto', padding: '0 12px' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 8 }}>To</span>
                <input type="date" className="data-table-search-input" style={{ width: 110 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="data-table-search" style={{ maxWidth: 180, width: '100%', padding: '0 12px' }}>
              <input
                type="text"
                className="data-table-search-input"
                placeholder="Filter by tag..."
                value={tagFilter}
                onChange={e => setTagFilter(e.target.value)}
              />
              {tagFilter && (
                <button className="data-table-search-clear" onClick={() => setTagFilter('')} aria-label="Clear filter">
                  <CloseIcon />
                </button>
              )}
            </div>
          </div>
          <div className="data-table-search">
            <SearchIcon />
            <input
              type="text"
              className="data-table-search-input"
              placeholder="Search by category, description, tags, or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="data-table-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">
                <CloseIcon />
              </button>
            )}
          </div>
          <Button variant="primary" size="sm" onClick={() => { setShowForm(true); setEditingId(null); resetForm() }}>
            <PlusIcon />
            Add Transaction
          </Button>
        </div>

        <DataTable<PropTransaction>
          columns={columns}
          data={filtered}
          keyExtractor={txn => txn.id}
          emptyState={empty}
          pageSize={10}
        />
      </div>
    </>
  )
}
