import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { AccountingEngine } from '../accounting/accountingEngine'
import { getAccountIdForBank } from '../accounting/bankAccountMapping'
import type { PurchaseRecord, CreatePurchaseInput } from '../data/purchaseLedger'
import { createPurchaseRecord } from './purchaseLedgerService'
import { findOrCreateAccount, linkVoucherToPurchase } from '../accounting/assetAccountMapping'

export interface PurchasedWithVoucher {
  purchase: PurchaseRecord
  voucher: Voucher
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

  const bankCoaId = getAccountIdForBank(bankAccountId, bankMappings)
  if (!bankCoaId) {
    errors.push('Bank account not mapped to chart of accounts')
    return { result: null, errors }
  }

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
  return {
    result: {
      purchase: withFunding,
      voucher: postResult.voucher,
      updatedAccounts,
    },
    errors,
  }
}
