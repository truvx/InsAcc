import React, { useState, useMemo, useCallback } from 'react'
import type { PropertyExpense, PropertyEntry, UnitEntry, PropAccount, VendorEntry } from '../data/propertyTypes'
import type { Account, Voucher, VoucherLine, VoucherType, BankMapping } from '../accounting/types'
import type { AuditEvent } from '../data/auditTypes'
import { recordModuleEvent } from '../services/auditService'
import { Badge, Button, EditIcon, TrashIcon, PlusIcon, KpiCard, EmptyState, SearchIcon, CloseIcon, Select, Modal, Input } from './design/DesignSystem'
import ConfirmDialog from './design/ConfirmDialog'
import EntityForm from './design/EntityForm'
import ActionsMenu from './design/ActionsMenu'
import Toast from './Toast'
import { formatDate } from '../utils'
import { VoucherNumberService } from '../services/voucherNumberService'
import { getAccountTypeBalance, invalidateBalanceCache } from '../accounting/ledgerService'
import { Trash2, Printer, Eye, MoreVertical, Download } from 'lucide-react'
import * as XLSX from 'xlsx-js-style'
import { CurrencyText } from './design/CurrencyText'
import { formatCurrency } from '../utils/currencyHelpers'
import { getPropertyBankAccountId } from '../services/propertyAccountingService'

interface Props {
  currency?: string
  dateFormat?: string
  language?: string
  expenses: PropertyExpense[]
  setExpenses?: React.Dispatch<React.SetStateAction<PropertyExpense[]>>
  properties: PropertyEntry[]
  units: UnitEntry[]
  propAccounts: PropAccount[]
  accounts: Account[]
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>
  vouchers: Voucher[]
  setVouchers?: React.Dispatch<React.SetStateAction<Voucher[]>>
  bankMappings?: BankMapping[]
  vendors?: VendorEntry[]
  onAuditEvent?: (event: AuditEvent) => void
}

const DEFAULT_CATEGORIES = [
  'Repair Expense',
  'Electrical Repairs',
  'Plumbing',
  'Cleaning',
  'Security',
  'Landscaping',
  'Utilities',
  'Water',
  'Electricity',
  'Internet',
  'Municipality Fees',
  'Property Insurance',
  'Legal Fees',
  'Management Fees',
  'Advertising',
  'Office Expenses',
  'Staff Salary',
  'Equipment Purchase',
  'Renovation',
  'Miscellaneous'
]

export default function PropertyExpenses({
  currency = 'AED',
  dateFormat = 'DD/MM/YYYY',
  language = 'English',
  expenses = [],
  setExpenses,
  properties = [],
  units = [],
  propAccounts = [],
  accounts = [],
  setAccounts,
  vouchers = [],
  setVouchers,
  bankMappings = [],
  vendors = [],
  onAuditEvent
}: Props) {
  const fmt = (n: number) => <CurrencyText value={n} currency={currency} />
  const [searchQuery, setSearchQuery] = useState('')
  const [propertyFilter, setPropertyFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingExpense, setViewingExpense] = useState<PropertyExpense | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  // Custom Categories
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [newCustomCategory, setNewCustomCategory] = useState('')

  // Form Fields
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formCategory, setFormCategory] = useState('')
  const [formPropertyId, setFormPropertyId] = useState('')
  const [formUnitId, setFormUnitId] = useState('')
  const [formVendorId, setFormVendorId] = useState('')
  const [formPaidTo, setFormPaidTo] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formTax, setFormTax] = useState('')
  const [formPaymentMethod, setFormPaymentMethod] = useState<'Cash In Hand' | 'Bank Transfer' | 'Cheque'>('Cash In Hand')

  const [formPaymentMode, setFormPaymentMode] = useState<string>('Bank Transfer')
  const [formBankAccountId, setFormBankAccountId] = useState<string>('')

  React.useEffect(() => {
    if (!setVouchers || !Array.isArray(vouchers)) return
    let updated = false
    const newVouchers = vouchers.map(v => {
      if (v && typeof v.id === 'string' && v.id.startsWith('vch-exp-') && Array.isArray(v.lines)) {
        const expenseId = v.id.replace('vch-exp-', '')
        const exp = expenses && expenses.find(e => e.id === expenseId)
        if (exp && exp.paymentMode !== 'Cash') {
          const creditLine = v.lines.find(l => l && l.type === 'Credit')
          const cashInHandAcctId = accounts && accounts.find(a => a && (a.id === '1110-prop' || a.code === '1110'))?.id || '1110-prop'
          if (creditLine && creditLine.accountId === cashInHandAcctId) {
            const bankAccountId = exp.bankAccountId || (propAccounts && propAccounts[0]?.id)
            const coaBankAccountId = bankAccountId ? getPropertyBankAccountId(bankAccountId, propAccounts, bankMappings) : undefined
            const correctBankAcctId = coaBankAccountId || (accounts && accounts.find(a => a && (a.id === '1120-prop' || a.code === '1120'))?.id) || '1120-prop'
            if (correctBankAcctId && correctBankAcctId !== creditLine.accountId) {
              updated = true
              return {
                ...v,
                lines: v.lines.map(l => l && l.type === 'Credit' ? { ...l, accountId: correctBankAcctId } : l)
              }
            }
          }
        }
      }
      return v
    })
    if (updated) {
      setVouchers(newVouchers)
    }
  }, [vouchers, expenses, propAccounts, bankMappings, accounts, setVouchers])

  const categories = useMemo(() => {
    return [...DEFAULT_CATEGORIES, ...customCategories]
  }, [customCategories])

  const filteredUnits = useMemo(() => {
    return units.filter(u => u.propertyId === formPropertyId)
  }, [units, formPropertyId])

  const totalAmountValue = useMemo(() => {
    const amt = parseFloat(formAmount) || 0
    const tx = parseFloat(formTax) || 0
    return amt + tx
  }, [formAmount, formTax])

  const ensureCategoryAccount = useCallback((categoryName: string): string => {
    const parentCode = '5000'
    const accountType = 'expense'
    const normalBalance = 'debit'

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

    const newAccount: Account = {
      id: `acct-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      code: nextCode,
      name: categoryName,
      type: accountType,
      normalBalance,
      parentId: parent.id,
      isActive: true,
      description: `Property expense category: ${categoryName}`,
      currency: 'AED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      module: 'property'
    }

    setAccounts(prev => [...prev, newAccount])
    return newAccount.id
  }, [accounts, setAccounts])

  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0])
    setEditingId(null)
    setFormPropertyId('')
    setFormUnitId('')
    setFormVendorId('')
    setFormPaidTo('')
    setFormDescription('')
    setFormAmount('')
    setFormTax('')
    setFormPaymentMethod('Cash In Hand')
    setFormPaymentMode('Bank Transfer')
    setFormBankAccountId('')
  }

  const handleOpenAdd = () => {
    resetForm()
    setShowForm(true)
  }

  const handleOpenEdit = (exp: PropertyExpense) => {
    setEditingId(exp.id)
    setFormDate(exp.date.split('T')[0])
    setFormCategory(exp.category)
    setFormPropertyId(exp.propertyId)
    setFormUnitId(exp.unitId || '')
    setFormVendorId(exp.vendorId || '')
    setFormPaidTo(exp.paidTo)
    setFormDescription(exp.description)
    setFormAmount(String(exp.amount))
    setFormTax(String(exp.tax || ''))
    setFormPaymentMethod(exp.paymentMethod)
    setFormPaymentMode(exp.paymentMode || 'Bank Transfer')
    setFormBankAccountId(exp.bankAccountId || '')
    setShowForm(true)
  }

  const handleSaveExpense = () => {
    if (!formPropertyId || !formCategory || !formAmount || !formPaidTo || !formPaymentMode) {
      setToast({ visible: true, message: 'Please fill in all required fields.', type: 'error' })
      return
    }
    if (formPaymentMode !== 'Cash' && !formBankAccountId) {
      setToast({ visible: true, message: 'Please select a bank account.', type: 'error' })
      return
    }

    const expenseAmount = parseFloat(formAmount) || 0
    const taxAmount = parseFloat(formTax) || 0
    const totalAmount = expenseAmount + taxAmount

    const expenseId = editingId || `exp-${Date.now()}`
    const existing = expenses.find(e => e.id === expenseId)
    const expenseNo = existing ? existing.expenseNo : `EXP-${String(expenses.length + 1).padStart(4, '0')}`

    const oldVoucherId = existing?.voucherId || `vch-exp-${expenseId}`

    const updatedExpense: PropertyExpense = {
      id: expenseId,
      expenseNo,
      date: new Date(formDate).toISOString(),
      propertyId: formPropertyId,
      unitId: formUnitId || null,
      category: formCategory,
      vendorId: formVendorId || null,
      paidTo: formPaidTo,
      description: formDescription,
      amount: expenseAmount,
      tax: taxAmount,
      totalAmount,
      paymentMethod: formPaymentMethod,
      bankAccountId: formPaymentMode === 'Cash' ? null : formBankAccountId || null,
      paymentMode: formPaymentMode as any,
      paymentChannel: formPaymentMode === 'Cash' ? 'Cash In Hand' as const : 'Bank Account' as const,
      status: 'Paid',
      voucherId: oldVoucherId,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Dynamic posting rules
    const expenseAccountId = ensureCategoryAccount(formCategory)
    const derivedPaymentChannel = formPaymentMode === 'Cash' ? 'Cash In Hand' : 'Bank Account'
    const offsetAccountId = derivedPaymentChannel === 'Cash In Hand'
      ? (accounts.find(a => a.id === '1110-prop' || a.code === '1110')?.id || '1110-prop')
      : (getPropertyBankAccountId(formBankAccountId, propAccounts, bankMappings) || accounts.find(a => a.id === '1120-prop' || a.code === '1120')?.id || '1120-prop')

    const vchType: VoucherType = 'Payment'
    const existingVoucher = vouchers.find(v => v.id === oldVoucherId)
    const vchNumber = existingVoucher ? existingVoucher.number : VoucherNumberService.generateNextNumber(vchType, formDate, vouchers)

    const lines: VoucherLine[] = [
      {
        id: `vch-exp-${expenseId}-l1`,
        accountId: expenseAccountId,
        type: 'Debit',
        amount: totalAmount,
        baseAmount: totalAmount,
        currency: 'AED',
        narration: formDescription || `Expense ${formCategory}: Paid to ${formPaidTo}`,
        referenceType: 'Property',
        referenceId: formPropertyId
      },
      {
        id: `vch-exp-${expenseId}-l2`,
        accountId: offsetAccountId,
        type: 'Credit',
        amount: totalAmount,
        baseAmount: totalAmount,
        currency: 'AED',
        narration: `Paid via ${formPaymentMode}`,
        referenceType: 'Property',
        referenceId: formPropertyId
      }
    ]

    const updatedVoucher: Voucher = {
      id: oldVoucherId,
      number: vchNumber,
      date: formDate,
      type: vchType,
      reference: expenseId,
      description: `Expense: ${expenseNo} - ${formCategory} for ${formPaidTo}`,
      status: 'Posted',
      currency: 'AED',
      exchangeRate: 1,
      baseCurrency: 'AED',
      createdBy: 'user',
      createdAt: existingVoucher ? existingVoucher.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lines,
      paymentMode: formPaymentMode as any,
      paymentChannel: formPaymentMode === 'Cash' ? 'Cash In Hand' as const : 'Bank Account' as const
    }

    // Save Expense
    setExpenses?.(prev => {
      const filtered = prev.filter(e => e.id !== expenseId)
      return [updatedExpense, ...filtered]
    })

    // Save Voucher
    setVouchers?.(prev => {
      const filtered = prev.filter(v => v.id !== oldVoucherId)
      return [updatedVoucher, ...filtered]
    })

    invalidateBalanceCache()

    if (!editingId) {
      onAuditEvent?.(
        recordModuleEvent(
          'Property Transactions',
          'Create',
          expenseNo,
          expenseId,
          `Recorded property expense ${expenseNo} (${formCategory}) paid to ${formPaidTo} for AED ${totalAmount.toLocaleString()}`
        )
      )
    }

    setShowForm(false)
    resetForm()
  }

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return
    const target = expenses.find(e => e.id === deleteTarget)
    if (!target) return

    setExpenses?.(prev => prev.filter(e => e.id !== deleteTarget))
    setVouchers?.(prev => {
      const filtered = prev.filter(v => v.id !== `vch-exp-${deleteTarget}`)
      
      // Cleanup orphaned category account if it has no other vouchers
      const categoryAcctId = target.category ? (accounts.find(a => a.name.toLowerCase() === target.category.toLowerCase() && a.type === 'expense' && a.isActive)?.id) : null
      if (categoryAcctId && setAccounts) {
        const hasOtherVouchers = filtered.some(v => v.lines.some(l => l.accountId === categoryAcctId))
        if (!hasOtherVouchers) {
          setAccounts(accts => accts.map(a => a.id === categoryAcctId ? { ...a, isActive: false, updatedAt: new Date().toISOString() } : a))
        }
      }
      
      return filtered
    })

    invalidateBalanceCache()

    onAuditEvent?.(
      recordModuleEvent(
        'Property Transactions',
        'Delete',
        target.expenseNo,
        target.id,
        `Deleted property expense ${target.expenseNo} paid to ${target.paidTo} of AED ${target.totalAmount.toLocaleString()}`
      )
    )

    setToast({ visible: true, message: `Expense ${target.expenseNo} deleted and ledger reversed.`, type: 'success' })
    setDeleteTarget(null)
  }

  const handleDuplicate = (exp: PropertyExpense) => {
    const newId = `exp-${Date.now()}`
    const maxNo = expenses.reduce((max, e) => {
      const match = e.expenseNo.match(/\d+/)
      return match ? Math.max(max, parseInt(match[0])) : max
    }, 0)
    const newExpenseNo = `EXP-${String(maxNo + 1).padStart(4, '0')}`

    const duplicatedExpense: PropertyExpense = {
      ...exp,
      id: newId,
      expenseNo: newExpenseNo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      voucherId: exp.status === 'Paid' ? `vch-exp-${newId}` : undefined,
    }

    if (exp.status === 'Paid') {
      const existingVoucher = vouchers.find(v => v.id === `vch-exp-${exp.id}`)
      if (existingVoucher) {
        const vchType = existingVoucher.type
        const vchNumber = VoucherNumberService.generateNextNumber(vchType, exp.date, vouchers)
        const duplicatedVoucher: Voucher = {
          ...existingVoucher,
          id: `vch-exp-${newId}`,
          number: vchNumber,
          reference: newId,
          description: `Expense: ${newExpenseNo} - ${exp.category} for ${exp.paidTo} (Duplicate)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lines: existingVoucher.lines.map(line => ({
            ...line,
            id: line.id.replace(exp.id, newId),
          }))
        }
        setVouchers?.(prev => [duplicatedVoucher, ...prev])
      }
    }

    setExpenses?.(prev => [duplicatedExpense, ...prev])

    onAuditEvent?.(
      recordModuleEvent(
        'Property Transactions',
        'Create',
        newExpenseNo,
        newId,
        `Duplicated property expense ${exp.expenseNo} as ${newExpenseNo}`
      )
    )

    setToast({ visible: true, message: `Expense ${exp.expenseNo} duplicated as ${newExpenseNo}.`, type: 'success' })
  }

  const handleMarkAsPaid = (exp: PropertyExpense) => {
    const expenseAccountId = ensureCategoryAccount(exp.category)
    const offsetAccountId = exp.paymentChannel === 'Cash In Hand'
      ? (accounts.find(a => a.id === '1110-prop' || a.code === '1110')?.id || '1110-prop')
      : (getPropertyBankAccountId(exp.bankAccountId || '', propAccounts, bankMappings) || accounts.find(a => a.id === '1120-prop' || a.code === '1120')?.id || '1120-prop')

    const vchType: VoucherType = 'Payment'
    const vchNumber = VoucherNumberService.generateNextNumber(vchType, exp.date, vouchers)

    const lines: VoucherLine[] = [
      {
        id: `vch-exp-${exp.id}-l1`,
        accountId: expenseAccountId,
        type: 'Debit',
        amount: exp.totalAmount,
        baseAmount: exp.totalAmount,
        currency: 'AED',
        narration: exp.description || `Expense ${exp.category}: Paid to ${exp.paidTo}`,
        referenceType: 'Property',
        referenceId: exp.propertyId
      },
      {
        id: `vch-exp-${exp.id}-l2`,
        accountId: offsetAccountId,
        type: 'Credit',
        amount: exp.totalAmount,
        baseAmount: exp.totalAmount,
        currency: 'AED',
        narration: `Paid via ${exp.paymentMode || 'Bank Transfer'} ${exp.paymentReference || ''}`,
        referenceType: 'Property',
        referenceId: exp.propertyId
      }
    ]

    const updatedVoucher: Voucher = {
      id: `vch-exp-${exp.id}`,
      number: vchNumber,
      date: exp.date,
      type: vchType,
      reference: exp.id,
      description: `Expense: ${exp.expenseNo} - ${exp.category} for ${exp.paidTo}`,
      status: 'Posted',
      currency: 'AED',
      exchangeRate: 1,
      baseCurrency: 'AED',
      createdBy: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lines,
      paymentMode: exp.paymentMode as any,
      paymentChannel: exp.paymentChannel,
      paymentReference: exp.paymentReference || undefined
    }

    setExpenses?.(prev => prev.map(e => e.id === exp.id ? { ...e, status: 'Paid', voucherId: `vch-exp-${exp.id}`, updatedAt: new Date().toISOString() } : e))

    setVouchers?.(prev => {
      const filtered = prev.filter(v => v.id !== `vch-exp-${exp.id}`)
      return [updatedVoucher, ...filtered]
    })
    
    invalidateBalanceCache()

    onAuditEvent?.(
      recordModuleEvent(
        'Property Transactions',
        'Update',
        exp.expenseNo,
        exp.id,
        `Marked operational expense ${exp.expenseNo} as Paid and posted voucher ${vchNumber}`
      )
    )

    setToast({ visible: true, message: `Expense ${exp.expenseNo} marked as Paid successfully.`, type: 'success' })
  }

  const handleAddCustomCategory = () => {
    if (!newCustomCategory.trim()) return
    const cat = newCustomCategory.trim()
    if (categories.some(c => c.toLowerCase() === cat.toLowerCase())) {
      setToast({ visible: true, message: 'Category already exists.', type: 'error' })
      return
    }
    setCustomCategories(prev => [...prev, cat])
    setFormCategory(cat)
    setNewCustomCategory('')
    setShowCustomModal(false)
  }

  const handlePrint = (exp: PropertyExpense) => {
    const propName = properties.find(p => p.id === exp.propertyId)?.name || 'Unknown Property'
    const unitNo = units.find(u => u.id === exp.unitId)?.unitNumber || '—'
    const targetBa = propAccounts.find(ba => ba.id === exp.bankAccountId)
    const bankName = targetBa ? targetBa.institution : 'Cash In Hand'

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Expense Voucher - ${exp.expenseNo}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #1f2937; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
              .title { font-size: 24px; font-weight: bold; }
              .meta { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              .row { margin-bottom: 8px; }
              .label { font-weight: 600; color: #4b5563; }
              .table { width: 100%; border-collapse: collapse; margin-top: 40px; }
              .table th, .table td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
              .table th { background: #f9fafb; }
              .footer { margin-top: 80px; display: flex; justify-content: space-between; font-size: 14px; }
              .signature { border-top: 1px solid #9ca3af; width: 200px; text-align: center; padding-top: 8px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="title">INSACC PROPERTIES</div>
                <div>Property Expense Voucher</div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: bold; font-size: 18px;">${exp.expenseNo}</div>
                <div>Date: ${formatDate(exp.date, dateFormat)}</div>
              </div>
            </div>
            <div class="meta">
              <div>
                <div class="row"><span class="label">Property:</span> ${propName}</div>
                <div class="row"><span class="label">Unit:</span> ${unitNo}</div>
                <div class="row"><span class="label">Paid To:</span> ${exp.paidTo}</div>
              </div>
              <div>
                <div class="row"><span class="label">Payment Method:</span> ${exp.paymentMethod}</div>
                <div class="row"><span class="label">Paid From:</span> ${bankName}</div>
                <div class="row"><span class="label">Reference No:</span> ${exp.referenceNumber || '—'}</div>
              </div>
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th style="text-align: right;">Amount</th>
                  <th style="text-align: right;">Tax</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${exp.category}</td>
                  <td>${exp.description || '—'}</td>
                   <td style="text-align: right;">$<CurrencyText value={exp.amount} currency={currency} /></td>
                   <td style="text-align: right;">$<CurrencyText value={exp.tax || 0} currency={currency} /></td>
                   <td style="text-align: right; font-weight: bold;">$<CurrencyText value={exp.totalAmount} currency={currency} /></td>
                </tr>
              </tbody>
            </table>
            <div class="footer">
              <div class="signature">Prepared By</div>
              <div class="signature">Authorized Signatory</div>
            </div>
            <script>window.print();</script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  // Filtered List
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (propertyFilter && e.propertyId !== propertyFilter) return false
      if (categoryFilter && e.category !== categoryFilter) return false
      if (paymentMethodFilter && e.paymentMethod !== paymentMethodFilter) return false
      if (statusFilter && e.status !== statusFilter) return false
      if (dateStart && e.date < dateStart) return false
      if (dateEnd && e.date > dateEnd) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const prop = properties.find(p => p.id === e.propertyId)?.name.toLowerCase() || ''
        return (
          e.expenseNo.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.paidTo.toLowerCase().includes(q) ||
          prop.includes(q) ||
          String(e.totalAmount).includes(q)
        )
      }
      return true
    })
  }, [expenses, propertyFilter, categoryFilter, paymentMethodFilter, statusFilter, dateStart, dateEnd, searchQuery, properties])

  // KPIs
  const totalExpensesLedger = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.totalAmount, 0)
  }, [expenses])

  const thisMonthExpensesLedger = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const currentMonthPrefix = `${year}-${month}`
    
    return expenses
      .filter(e => e.date.startsWith(currentMonthPrefix))
      .reduce((sum, e) => sum + e.totalAmount, 0)
  }, [expenses])

  const pendingApprovalExpenses = useMemo(() => {
    return expenses
      .filter(e => e.status === 'Pending')
      .reduce((sum, e) => sum + e.totalAmount, 0)
  }, [expenses])

  const paidThisMonthExpenses = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const currentMonthPrefix = `${year}-${month}`
    return expenses
      .filter(e => e.date.startsWith(currentMonthPrefix) && e.status === 'Paid')
      .reduce((sum, e) => sum + e.totalAmount, 0)
  }, [expenses])

  // Export to Excel handler
  const handleExport = () => {
    if (filteredExpenses.length === 0) {
      setToast({ visible: true, message: 'No records to export.', type: 'error' })
      return
    }

    const wsData = filteredExpenses.map(e => {
      const propName = properties.find(p => p.id === e.propertyId)?.name || 'Unknown'
      const unitNumber = units.find(u => u.id === e.unitId)?.unitNumber || '—'
      const bankName = e.paymentChannel === 'Cash In Hand' 
        ? 'Cash In Hand' 
        : (() => {
            const targetBa = propAccounts.find(ba => ba.id === e.bankAccountId)
            return targetBa ? targetBa.institution : 'Bank Account'
          })()
      
      return {
        'Expense No.': e.expenseNo,
        'Date': e.date,
        'Property': propName,
        'Unit': unitNumber,
        'Category': e.category,
        'Vendor / Paid To': e.paidTo,
        'Payment Mode': e.paymentMode || e.paymentMethod || 'Unknown',
        'Channel': e.paymentChannel || 'Unknown',
        'Payment Reference': e.paymentReference || e.referenceNumber || '—',
        'Bank Account / Cash In Hand': bankName,
        'Amount': e.totalAmount,
        'Status': e.status,
        'Notes': e.notes || ''
      }
    })

    const ws = XLSX.utils.json_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Property Expenses')
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `property_expenses_${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    onAuditEvent?.(
      recordModuleEvent(
        'Property Transactions',
        'Export',
        'Expenses List',
        'bulk',
        `Exported ${filteredExpenses.length} property expenses to Excel`
      )
    )

    setToast({ visible: true, message: 'Excel export completed successfully.', type: 'success' })
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="page-title">Expenses</div>
          <div className="page-subtitle">Record and manage property operating expenses</div>
        </div>
        <Button onClick={handleOpenAdd} icon={<PlusIcon />}>
          Add Expense
        </Button>
      </div>

      <div className="page-body">
        {/* KPI Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <KpiCard label="Total Expenses" value={fmt(totalExpensesLedger)} accentColor="#EF4444" />
          <KpiCard label="This Month" value={fmt(thisMonthExpensesLedger)} accentColor="#3B82F6" />
          <KpiCard label="Pending Approval" value={fmt(pendingApprovalExpenses)} accentColor="#F59E0B" />
          <KpiCard label="Paid This Month" value={fmt(paidThisMonthExpenses)} accentColor="#10B981" />
        </div>

        {/* Toolbar */}
        <div className="data-table-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div className="data-table-search">
            <SearchIcon />
            <input
              type="text"
              className="data-table-search-input"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="data-table-search-clear" onClick={() => setSearchQuery('')}>
                <CloseIcon />
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} style={{ margin: 0, width: 140 }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>to</span>
            <Input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} style={{ margin: 0, width: 140 }} />
          </div>

          <Select
            value={propertyFilter}
            onChange={e => setPropertyFilter(e.target.value)}
            options={[{ value: '', label: 'All Properties' }, ...properties.map(p => ({ value: p.id, label: p.name }))]}
            style={{ margin: 0, minWidth: 160 }}
          />
          <Select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            options={[{ value: '', label: 'All Categories' }, ...categories.map(c => ({ value: c, label: c }))]}
            style={{ margin: 0, minWidth: 160 }}
          />
          <Select
            value={paymentMethodFilter}
            onChange={e => setPaymentMethodFilter(e.target.value)}
            options={[
              { value: '', label: 'All Payment Methods' },
              { value: 'Cash In Hand', label: 'Cash In Hand' },
              { value: 'Bank Transfer', label: 'Bank Transfer' },
              { value: 'Cheque', label: 'Cheque' }
            ]}
            style={{ margin: 0, minWidth: 160 }}
          />

          <Button variant="secondary" onClick={handleExport} icon={<Download size={14} />}>
            Export
          </Button>
        </div>

        {/* Expenses List */}
        <div className="card card-table">
          <div className="card-body" style={{ padding: 0 }}>
            {filteredExpenses.length === 0 ? (
              <EmptyState title="No expenses found" text="Try adjusting your filters or create a new operational expense transaction." />
            ) : (
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Expense No.</th>
                      <th>Date</th>
                      <th>Property</th>
                      <th>Unit</th>
                      <th>Category</th>
                      <th>Vendor / Paid To</th>
                      <th>Payment Mode</th>
                      <th>Channel</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th>Status</th>
                      <th style={{ width: 80 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map(exp => {
                      const propName = properties.find(p => p.id === exp.propertyId)?.name || 'Unknown'
                      const unitNumber = units.find(u => u.id === exp.unitId)?.unitNumber || '—'
                      
                      const actualPaymentMode = exp.paymentMode || exp.paymentMethod || 'Unknown'
                      let channelName = 'Unknown'
                      if (exp.paymentChannel === 'Cash In Hand') {
                        channelName = 'Cash In Hand'
                      } else if (exp.paymentChannel === 'Bank Account') {
                        const targetBa = propAccounts.find(ba => ba.id === exp.bankAccountId)
                          channelName = targetBa ? targetBa.institution : 'Bank Account'
                      } else {
                        // Fallback to legacy
                        if (exp.paymentMethod === 'Cash In Hand') {
                          channelName = 'Cash In Hand'
                        } else if (exp.paymentMethod) {
                          const targetBa = propAccounts.find(ba => ba.id === exp.bankAccountId)
                        channelName = targetBa ? targetBa.institution : 'Bank Account'
                        }
                      }

                      return (
                        <tr key={exp.id}>
                          <td className="text-mono text-xs fw-600">{exp.expenseNo}</td>
                          <td className="text-xs text-secondary">{formatDate(exp.date, dateFormat)}</td>
                          <td className="text-sm fw-500">{propName}</td>
                          <td className="text-xs">{unitNumber}</td>
                          <td>
                            <Badge variant="neutral">{exp.category}</Badge>
                          </td>
                          <td className="text-sm">{exp.paidTo}</td>
                          <td className="text-xs text-secondary">{actualPaymentMode}</td>
                          <td className="text-sm fw-500">{channelName}</td>
                          <td className="text-mono text-xs fw-600" style={{ textAlign: 'right' }}>
                            <CurrencyText value={exp.totalAmount} currency={currency} />
                          </td>
                          <td>
                            <Badge variant={exp.status === 'Paid' ? 'success' : 'warning'}>{exp.status}</Badge>
                          </td>
                          <td>
                            <ActionsMenu
                              onView={() => setViewingExpense(exp)}
                              onEdit={() => handleOpenEdit(exp)}
                              onDelete={() => setDeleteTarget(exp.id)}
                              onPrint={() => handlePrint(exp)}
                              onDuplicate={() => handleDuplicate(exp)}
                              canDelete={true}
                              extraActions={exp.status !== 'Paid' ? [
                                {
                                  label: 'Mark as Paid',
                                  icon: (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  ),
                                  onClick: () => handleMarkAsPaid(exp)
                                }
                              ] : []}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Details Modal */}
      {viewingExpense && (
        <Modal
          open={!!viewingExpense}
          title={`Expense details: ${viewingExpense.expenseNo}`}
          onClose={() => setViewingExpense(null)}
        >
          <div style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 2 }}>Expense No.</div>
                <div style={{ fontWeight: 600 }}>{viewingExpense.expenseNo}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 2 }}>Date</div>
                <div style={{ fontWeight: 600 }}>{formatDate(viewingExpense.date, dateFormat)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 2 }}>Property</div>
                <div style={{ fontWeight: 600 }}>
                  {properties.find(p => p.id === viewingExpense.propertyId)?.name || 'Unknown'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 2 }}>Unit</div>
                <div style={{ fontWeight: 600 }}>
                  {units.find(u => u.id === viewingExpense.unitId)?.unitNumber || '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 2 }}>Category</div>
                <div style={{ fontWeight: 600 }}>{viewingExpense.category}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 2 }}>Paid To</div>
                <div style={{ fontWeight: 600 }}>{viewingExpense.paidTo}</div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: 16, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Subtotal</span>
                <span>{fmt(viewingExpense.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Tax</span>
                <span>{fmt(viewingExpense.tax || 0)}</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
                <span>Total Amount</span>
                <span style={{ color: 'var(--danger)' }}>{fmt(viewingExpense.totalAmount)}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 2 }}>Payment Method</div>
                <div style={{ fontWeight: 600 }}>{viewingExpense.paymentMethod}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 2 }}>Bank Account / Cash In Hand</div>
                <div style={{ fontWeight: 600 }}>
                  {viewingExpense.paymentMethod === 'Cash In Hand'
                    ? 'Cash In Hand'
                    : (() => {
                        const targetBa = propAccounts.find(ba => ba.id === viewingExpense.bankAccountId)
                        return targetBa ? targetBa.institution : 'Bank Account'
                      })()}
                </div>
              </div>
            </div>

            {viewingExpense.notes && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 2 }}>Notes</div>
                <p style={{ margin: 0, fontSize: 13, color: '#4B5563', lineHeight: 1.4 }}>{viewingExpense.notes}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <Button variant="secondary" onClick={() => setViewingExpense(null)}>Close</Button>
              <Button onClick={() => handlePrint(viewingExpense)} icon={<Printer size={14} />}>Print</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Form Dialog */}
      <EntityForm
        open={showForm}
        title={editingId ? 'Edit Property Expense' : 'Add Property Expense'}
        submitLabel={editingId ? 'Save Changes' : 'Record Expense'}
        onCancel={() => { setShowForm(false); resetForm() }}
        onSubmit={handleSaveExpense}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 12 }}>
          General Details
        </div>
        <div className="form-row" style={{ marginBottom: 16 }}>
          <Input label="Expense Date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
          <Select
            label="Property (Required)"
            value={formPropertyId}
            onChange={e => { setFormPropertyId(e.target.value); setFormUnitId('') }}
            options={[{ value: '', label: 'Select Property' }, ...properties.map(p => ({ value: p.id, label: p.name }))]}
          />
          <Select
            label="Unit (Optional)"
            value={formUnitId}
            onChange={e => setFormUnitId(e.target.value)}
            options={[{ value: '', label: 'All Units' }, ...filteredUnits.map(u => ({ value: u.id, label: u.unitNumber }))]}
            disabled={!formPropertyId}
          />
          <Select
            label="Category (Required)"
            value={formCategory}
            onChange={e => {
              if (e.target.value === '__custom__') {
                setShowCustomModal(true)
              } else {
                setFormCategory(e.target.value)
              }
            }}
            options={[
              { value: '', label: 'Select Category' },
              ...categories.map(c => ({ value: c, label: c })),
              { value: '__custom__', label: '+ Add Custom Category' }
            ]}
          />
          {vendors.length > 0 && (
            <Select
              label="Select Vendor (Optional)"
              value={formVendorId}
              onChange={e => {
                const vid = e.target.value
                setFormVendorId(vid)
                if (vid) {
                  const v = vendors.find(v => v.id === vid)
                  if (v) setFormPaidTo(v.name)
                }
              }}
              options={[
                { value: '', label: 'No Vendor (Manual Paid To)' },
                ...vendors.map(v => ({ value: v?.id || '', label: v?.name || 'Unnamed Vendor' }))
              ]}
            />
          )}
          <Input label="Vendor / Paid To" value={formPaidTo} onChange={e => setFormPaidTo(e.target.value)} placeholder="e.g. Al Futtaim Services" />
          <Input label="Description / Narration" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="e.g. AC maintenance works" />
          <Input label="Amount" type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0.00" />
          <Input label="Tax Amount (Optional)" type="number" value={formTax} onChange={e => setFormTax(e.target.value)} placeholder="0.00" />
          <Input label="Total Amount (AED)" type="number" value={String(totalAmountValue)} disabled placeholder="0.00" />
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 12 }}>
          Payment Mode
        </div>
        <div style={{ marginBottom: 16 }}>
          <Select
            label="Payment Mode (Required)"
            value={formPaymentMode}
            onChange={e => setFormPaymentMode(e.target.value)}
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'Bank Transfer', label: 'Bank Transfer' },
              { value: 'Cheque', label: 'Cheque' },
              { value: 'Post Dated Cheque (PDC)', label: 'PDC' },
              { value: 'Online Transfer', label: 'Online Transfer' },
              { value: 'Card', label: 'Card' },
              { value: 'Other', label: 'Other' }
            ]}
          />
        </div>
        {formPaymentMode !== 'Cash' && (
          <div style={{ marginBottom: 16 }}>
            <Select
              label="Paid From Bank Account (Required)"
              value={formBankAccountId}
              onChange={e => setFormBankAccountId(e.target.value)}
              options={[
                { value: '', label: 'Select Bank Account' },
                ...propAccounts.map(ba => ({
                  value: ba.id,
                  label: ba.institution || (ba as any).name || 'Bank Account'
                }))
              ]}
            />
          </div>
        )}
      </EntityForm>

      {/* Add Custom Category Modal */}
      {showCustomModal && (
        <Modal
          open={showCustomModal}
          title="Add Custom Category"
          onClose={() => setShowCustomModal(false)}
        >
          <div style={{ padding: 16 }}>
            <Input
              label="Category Name"
              value={newCustomCategory}
              onChange={e => setNewCustomCategory(e.target.value)}
              placeholder="e.g. Office Stationery"
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
              <Button variant="secondary" onClick={() => setShowCustomModal(false)}>Cancel</Button>
              <Button onClick={handleAddCustomCategory}>Save Category</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Confirm Deletion"
        message="Are you sure you want to delete this operational expense? The general ledger postings will be reversed and this cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Toast notifications */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </>
  )
}
