import type { Account, Voucher, PostingResult } from './types'
import type { PurchaseRecord } from '../data/purchaseLedger'
import { getAccountByCode, createChildAccount } from './chartOfAccountsService'

const ASSET_TYPE_TO_PARENT_CODE: Record<string, string> = {
  Gold: '1210',
  Silver: '1220',
  Sukuk: '1230',
  Bonds: '1240',
  'Mutual Funds': '1250',
  Shares: '1260',
  Stocks: '1260',
  ETF: '1260',
  'Real Estate': '1270',
  'Private Investment': '1280',
  'Business Investment': '1280',
  'Fixed Deposit': '1290',
}

const DEFAULT_INVESTMENT_PARENT = '12'

export function getAccountCodeForAssetType(assetType: string): string {
  return ASSET_TYPE_TO_PARENT_CODE[assetType] || DEFAULT_INVESTMENT_PARENT
}

export function findOrCreateAccount(
  assetType: string,
  assetName: string,
  accounts: Account[],
): { account: Account; updatedAccounts: Account[] } {
  const parentCode = getAccountCodeForAssetType(assetType)
  const existing = getAccountByCode(parentCode, accounts)
  if (!existing) {
    throw new Error(`Parent account with code ${parentCode} not found for asset type ${assetType}`)
  }

  const exactMatch = accounts.find(
    a => a.parentId === existing.id && a.name.toLowerCase() === assetName.toLowerCase() && a.isActive,
  )
  if (exactMatch) {
    return { account: exactMatch, updatedAccounts: accounts }
  }

  let name = assetName
  if (parentCode === DEFAULT_INVESTMENT_PARENT) {
    name = `${assetType} - ${assetName}`
  }

  return createChildAccount(parentCode, name, accounts, {
    description: `Auto-created for purchase: ${assetName}`,
  })
}

export function addAssetTypeAccountCode(
  record: PurchaseRecord,
  account: Account,
): PurchaseRecord {
  return { ...record, accountCode: account.code, accountId: account.id }
}

export function linkVoucherToPurchase(
  record: PurchaseRecord,
  voucher: Voucher,
): PurchaseRecord {
  return {
    ...record,
    voucherId: voucher.id,
    voucherNumber: voucher.number,
  }
}
