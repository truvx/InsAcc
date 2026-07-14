import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { AccountingEngine } from '../accounting/accountingEngine'
import { getAccountIdForBank } from '../accounting/bankAccountMapping'
import type { PurchaseRecord, CreatePurchaseInput, UpdatePurchaseInput, AdditionalCostLine } from '../data/purchaseLedger'
import { createPurchaseRecord } from './purchaseLedgerService'
import { findOrCreateAccount, linkVoucherToPurchase } from '../accounting/assetAccountMapping'

export interface PurchasedWithVoucher {
  purchase: PurchaseRecord
  voucher: Voucher
  additionalVouchers?: Voucher[]
  updatedAccounts: Account[]
}

export function purchaseAndCreateVoucher(
  input: CreatePurchaseInput,
  bankAccountId: string,
  accounts: Account[],
  existingVouchers: Voucher[],
  bankMappings: BankMapping[],
  accountingEngine: AccountingEngine,
  currency: string,
): { result: PurchasedWithVoucher | null; errors: string[] } {
  const errors: string[] = []

  const { account: assetAccount, updatedAccounts } = findOrCreateAccount(
    input.assetType,
    input.assetName,
    accounts,
  )

  const coaId = getAccountIdForBank(bankAccountId, bankMappings, updatedAccounts)
  if (!coaId) {
    errors.push('Bank account not mapped to chart of accounts')
    return { result: null, errors }
  }
  const bankCoaId = coaId

  const purchase = createPurchaseRecord(input)
  const purchaseRecordWithAcct = { ...purchase, accountCode: assetAccount.code, accountId: assetAccount.id }

  const eventResult = accountingEngine.processAccountingEvent(
    'ASSET_PURCHASE',
    {
      amount: purchaseRecordWithAcct.totalValue,
      date: purchaseRecordWithAcct.purchaseDate,
      description: `Purchase: ${purchaseRecordWithAcct.assetName} (${purchaseRecordWithAcct.assetType}) - ${purchaseRecordWithAcct.quantity} @ ${purchaseRecordWithAcct.unitPrice}`,
      currency,
      exchangeRate: 1,
      baseCurrency: 'AED',
      assetAccount: assetAccount.id,
      bankAccount: bankCoaId,
      referenceType: 'Purchase',
      referenceId: purchaseRecordWithAcct.id,
      createdBy: 'user',
    },
    updatedAccounts,
    existingVouchers,
  )

  if (!eventResult.success || !eventResult.voucher) {
    errors.push(...eventResult.errors.map(e => e.message))
    return { result: null, errors }
  }

  eventResult.voucher.paymentMode = input.paymentMode
  eventResult.voucher.paymentReference = input.paymentReference

  const approveResult = accountingEngine.approve(eventResult.voucher, 'user')
  const voucherToPost = approveResult.voucher || eventResult.voucher
  const postResult = accountingEngine.post(voucherToPost, 'user', updatedAccounts, [
    ...existingVouchers,
    eventResult.voucher,
  ])

  if (!postResult.success || !postResult.voucher) {
    errors.push(...postResult.errors.map(e => e.message))
    return { result: null, errors }
  }

  const linked = linkVoucherToPurchase(purchaseRecordWithAcct, postResult.voucher)
  const withFunding = { ...linked, fundingBankAccountId: bankAccountId }

  // Post vouchers for each additional cost line
  const additionalVouchers: Voucher[] = []
  const finalAdditionalCosts: AdditionalCostLine[] = []
  let currentAccounts = updatedAccounts
  let currentVouchers = [...existingVouchers, postResult.voucher]

  if (input.additionalCosts && input.additionalCosts.length > 0) {
    for (const costLine of input.additionalCosts) {
      if (costLine.amount <= 0) continue

      // Stable internal mapping for lookup without display names
      const cleanType = costLine.expenseType.toLowerCase().trim()
      const isVatExpense = 
        cleanType === 'exp_purchase_input_vat' ||
        cleanType === '5210' ||
        cleanType === 'purchase input vat expense' ||
        cleanType === 'commodity tax'

      const matchedAccount = currentAccounts.find(a => 
        a.module === 'investment' && 
        a.type === 'expense' && 
        (
          isVatExpense 
            ? (a.code === '5210' || a.id === '5210' || a.id === 'EXP_PURCHASE_INPUT_VAT')
            : (a.code === costLine.expenseType || a.id === costLine.expenseType || a.name.toLowerCase() === cleanType)
        )
      )

      if (!matchedAccount) {
        errors.push(`Expense account for '${costLine.expenseType}' not found in Chart of Accounts`)
        return { result: null, errors }
      }

      const expenseEventResult = accountingEngine.processAccountingEvent(
        'EXPENSE_PAID',
        {
          amount: costLine.amount,
          date: withFunding.purchaseDate,
          description: `Additional Cost: ${costLine.expenseType} - ${costLine.description || ''} for ${withFunding.assetName}`,
          currency,
          exchangeRate: 1,
          baseCurrency: 'AED',
          debitAccount: matchedAccount.id,
          bankAccount: bankCoaId,
          referenceType: 'Purchase',
          referenceId: withFunding.id,
          createdBy: 'user',
        },
        currentAccounts,
        currentVouchers,
      )

      if (!expenseEventResult.success || !expenseEventResult.voucher) {
        errors.push(...expenseEventResult.errors.map(e => e.message))
        return { result: null, errors }
      }

      expenseEventResult.voucher.paymentMode = input.paymentMode
      expenseEventResult.voucher.paymentReference = input.paymentReference

      const approvedCost = accountingEngine.approve(expenseEventResult.voucher, 'user')
      const costVoucherToPost = approvedCost.voucher || expenseEventResult.voucher
      
      const costPostResult = accountingEngine.post(costVoucherToPost, 'user', currentAccounts, [
        ...currentVouchers,
        expenseEventResult.voucher
      ])

      if (!costPostResult.success || !costPostResult.voucher) {
        errors.push(...costPostResult.errors.map(e => e.message))
        return { result: null, errors }
      }

      const postedVch = costPostResult.voucher
      additionalVouchers.push(postedVch)
      currentVouchers.push(postedVch)

      finalAdditionalCosts.push({
        ...costLine,
        voucherId: postedVch.id,
        voucherNumber: postedVch.number
      })
    }
  }

  withFunding.additionalCosts = finalAdditionalCosts

  return {
    result: {
      purchase: withFunding,
      voucher: postResult.voucher,
      additionalVouchers,
      updatedAccounts: currentAccounts,
    },
    errors,
  }
}

export function updatePurchaseVouchers(
  record: PurchaseRecord,
  changes: any,
  accounts: Account[],
  vouchers: Voucher[],
  bankMappings: BankMapping[],
  accountingEngine: AccountingEngine,
  currency: string,
): {
  success: boolean
  purchase: PurchaseRecord | null
  vouchers: Voucher[]
  accounts: Account[]
  errors: string[]
} {
  const errors: string[] = []
  let currentAccounts = [...accounts]
  let currentVouchers = [...vouchers]

  // 1. Get bank COA ID
  const fundingBankAccountId = changes.fundingBankAccountId ?? record.fundingBankAccountId
  const coaId = getAccountIdForBank(fundingBankAccountId || '', bankMappings, currentAccounts)
  if (!coaId) {
    return { success: false, purchase: null, vouchers: currentVouchers, accounts: currentAccounts, errors: ['Bank account not mapped to chart of accounts'] }
  }
  const bankCoaId = coaId

  // 2. Resolve/Find asset account
  const assetType = changes.assetType ?? record.assetType
  const assetName = changes.assetName ?? record.assetName
  const { account: assetAccount, updatedAccounts } = findOrCreateAccount(assetType, assetName, currentAccounts)
  currentAccounts = updatedAccounts

  // 3. Update main voucher if it exists
  const totalValue = changes.totalValue ?? record.totalValue
  const qty = changes.quantity ?? record.quantity
  const price = changes.unitPrice ?? record.unitPrice
  const purchaseDate = changes.purchaseDate ?? record.purchaseDate
  const paymentMode = changes.paymentMode ?? record.paymentMode
  const paymentReference = changes.paymentReference ?? record.paymentReference

  if (record.voucherId) {
    const oldVch = currentVouchers.find(v => v.id === record.voucherId)
    if (oldVch) {
      const updatedVch: Voucher = {
        ...oldVch,
        date: purchaseDate,
        description: `Purchase: ${assetName} (${assetType}) - ${qty} @ ${price}`,
        paymentMode: paymentMode as any,
        paymentReference: paymentReference || undefined,
        modifiedAt: new Date().toISOString(),
        modifiedBy: 'user',
        lines: oldVch.lines.map(line => {
          if (line.type === 'Debit') {
            return {
              ...line,
              accountId: assetAccount.id,
              amount: totalValue,
              baseAmount: totalValue,
              narration: `Asset Purchase: ${assetName} - Qty ${qty}`,
            }
          } else {
            return {
              ...line,
              accountId: bankCoaId,
              amount: totalValue,
              baseAmount: totalValue,
              narration: `Paid via: ${fundingBankAccountId}`,
            }
          }
        })
      }
      currentVouchers = currentVouchers.map(v => v.id === oldVch.id ? updatedVch : v)
    }
  }

  // 4. Handle additional costs update
  const oldCosts = record.additionalCosts || []
  const newCostsInput = changes.additionalCosts || []
  const finalAdditionalCosts: AdditionalCostLine[] = []

  // Check deleted costs: present in oldCosts but not in newCostsInput
  const newCostIds = new Set(newCostsInput.map((c: any) => c.id).filter(Boolean))
  for (const oldCost of oldCosts) {
    if (!newCostIds.has(oldCost.id) && oldCost.voucherId) {
      const vchToCancel = currentVouchers.find(v => v.id === oldCost.voucherId)
      if (vchToCancel && !vchToCancel.isDeleted) {
        currentVouchers = currentVouchers.map(v => v.id === vchToCancel.id ? {
          ...v,
          isDeleted: true,
          modifiedAt: new Date().toISOString(),
          modifiedBy: 'user'
        } : v)
      }
    }
  }

  // Process all lines in newCostsInput
  for (const costLine of newCostsInput) {
    if (costLine.amount <= 0) continue

    // Stable internal mapping for lookup without display names
    const cleanType = costLine.expenseType.toLowerCase().trim()
    const isVatExpense = 
      cleanType === 'exp_purchase_input_vat' ||
      cleanType === '5210' ||
      cleanType === 'purchase input vat expense' ||
      cleanType === 'commodity tax'

    const matchedAccount = currentAccounts.find(a => 
      a.module === 'investment' && 
      a.type === 'expense' && 
      (
        isVatExpense 
          ? (a.code === '5210' || a.id === '5210' || a.id === 'EXP_PURCHASE_INPUT_VAT')
          : (a.code === costLine.expenseType || a.id === costLine.expenseType || a.name.toLowerCase() === cleanType)
      )
    )

    if (!matchedAccount) {
      return { success: false, purchase: null, vouchers: currentVouchers, accounts: currentAccounts, errors: [`Expense account for '${costLine.expenseType}' not found in Chart of Accounts`] }
    }

    if (costLine.voucherId) {
      // Update existing cost line voucher
      const oldVch = currentVouchers.find(v => v.id === costLine.voucherId)
      if (oldVch) {
        const updatedVch: Voucher = {
          ...oldVch,
          date: purchaseDate,
          description: `Additional Cost: ${costLine.expenseType} - ${costLine.description || ''} for ${assetName}`,
          paymentMode: paymentMode as any,
          paymentReference: paymentReference || undefined,
          modifiedAt: new Date().toISOString(),
          modifiedBy: 'user',
          lines: oldVch.lines.map(line => {
            if (line.type === 'Debit') {
              return {
                ...line,
                accountId: matchedAccount.id,
                amount: costLine.amount,
                baseAmount: costLine.amount,
                narration: `Expense: ${costLine.expenseType}`,
              }
            } else {
              return {
                ...line,
                accountId: bankCoaId,
                amount: costLine.amount,
                baseAmount: costLine.amount,
                narration: `Paid via: ${fundingBankAccountId}`,
              }
            }
          })
        }
        currentVouchers = currentVouchers.map(v => v.id === oldVch.id ? updatedVch : v)
        finalAdditionalCosts.push(costLine)
      }
    } else {
      // Create and post new cost line voucher
      const expenseEventResult = accountingEngine.processAccountingEvent(
        'EXPENSE_PAID',
        {
          amount: costLine.amount,
          date: purchaseDate,
          description: `Additional Cost: ${costLine.expenseType} - ${costLine.description || ''} for ${assetName}`,
          currency,
          exchangeRate: 1,
          baseCurrency: 'AED',
          debitAccount: matchedAccount.id,
          bankAccount: bankCoaId,
          referenceType: 'Purchase',
          referenceId: record.id,
          createdBy: 'user',
        },
        currentAccounts,
        currentVouchers,
      )

      if (!expenseEventResult.success || !expenseEventResult.voucher) {
        errors.push(...expenseEventResult.errors.map(e => e.message))
        return { success: false, purchase: null, vouchers: currentVouchers, accounts: currentAccounts, errors }
      }

      expenseEventResult.voucher.paymentMode = paymentMode as any
      expenseEventResult.voucher.paymentReference = paymentReference

      const approvedCost = accountingEngine.approve(expenseEventResult.voucher, 'user')
      const costVoucherToPost = approvedCost.voucher || expenseEventResult.voucher
      
      const costPostResult = accountingEngine.post(costVoucherToPost, 'user', currentAccounts, [
        ...currentVouchers,
        expenseEventResult.voucher
      ])

      if (!costPostResult.success || !costPostResult.voucher) {
        errors.push(...costPostResult.errors.map(e => e.message))
        return { success: false, purchase: null, vouchers: currentVouchers, accounts: currentAccounts, errors }
      }

      const postedVch = costPostResult.voucher
      currentVouchers.push(postedVch)

      finalAdditionalCosts.push({
        ...costLine,
        voucherId: postedVch.id,
        voucherNumber: postedVch.number
      })
    }
  }

  // 5. Build updated Purchase record
  const updatedPurchaseRecord: PurchaseRecord = {
    ...record,
    ...changes,
    totalValue,
    additionalCosts: finalAdditionalCosts,
    updatedAt: new Date().toISOString(),
  }

  return {
    success: true,
    purchase: updatedPurchaseRecord,
    vouchers: currentVouchers,
    accounts: currentAccounts,
    errors,
  }
}
