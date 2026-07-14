import type { Account, Voucher } from './types'
import { createVoucher, approveVoucher, postVoucher } from './voucherService'
import { getAccountBalance, invalidateBalanceCache } from './ledgerService'

export interface ClosePeriodResult {
  success: boolean
  closingVoucher?: Voucher
  errors?: string[]
  netProfit?: number
  totalRevenue?: number
  totalExpenses?: number
}

export function getClosePeriodStatus(
  fiscalYearLabel: string,
  vouchers: Voucher[],
): { isClosed: boolean; closingVoucher?: Voucher } {
  const closingVoucher = vouchers.find(
    v => v.description === `Period Close - ${fiscalYearLabel}` && v.status === 'Posted',
  )
  return {
    isClosed: !!closingVoucher,
    closingVoucher,
  }
}

export function closeAccountingPeriod(
  fiscalYearLabel: string,
  accounts: Account[],
  vouchers: Voucher[],
  fiscalYearEndDate?: string,
): ClosePeriodResult {
  const { isClosed } = getClosePeriodStatus(fiscalYearLabel, vouchers)
  if (isClosed) {
    return {
      success: false,
      errors: [`Fiscal period "${fiscalYearLabel}" has already been closed.`],
    }
  }

  const leafAccounts = accounts.filter(
    a => a.isActive && !accounts.some(child => child.parentId === a.id && child.isActive),
  )
  const revenueAccounts = leafAccounts.filter(a => a.type === 'revenue')
  const expenseAccounts = leafAccounts.filter(a => a.type === 'expense')

  const cyeAccount = accounts.find(a => a.code === '3200')
  if (!cyeAccount) {
    return { success: false, errors: ['Current Year Earnings account (3200) not found.'] }
  }

  const closingLines: Array<{
    accountId: string
    type: 'Debit' | 'Credit'
    amount: number
    narration?: string
  }> = []
  let totalRevenueBalance = 0
  let totalExpenseBalance = 0

  for (const rev of revenueAccounts) {
    const balance = getAccountBalance(rev.id, vouchers, accounts)
    if (Math.abs(balance) < 0.01) continue
    closingLines.push({
      accountId: rev.id,
      type: 'Debit',
      amount: Math.abs(balance),
      narration: `Closing balance: ${rev.name}`,
    })
    totalRevenueBalance += Math.abs(balance)
  }

  for (const exp of expenseAccounts) {
    const balance = getAccountBalance(exp.id, vouchers, accounts)
    if (Math.abs(balance) < 0.01) continue
    closingLines.push({
      accountId: exp.id,
      type: 'Credit',
      amount: Math.abs(balance),
      narration: `Closing balance: ${exp.name}`,
    })
    totalExpenseBalance += Math.abs(balance)
  }

  if (closingLines.length === 0) {
    return {
      success: false,
      errors: ['No revenue or expense accounts with non-zero balances to close.'],
    }
  }

  const netProfit = totalRevenueBalance - totalExpenseBalance

  if (netProfit > 0) {
    closingLines.push({
      accountId: cyeAccount.id,
      type: 'Credit',
      amount: netProfit,
      narration: 'Net profit transferred to Current Year Earnings',
    })
  } else if (netProfit < 0) {
    closingLines.push({
      accountId: cyeAccount.id,
      type: 'Debit',
      amount: Math.abs(netProfit),
      narration: 'Net loss transferred to Current Year Earnings',
    })
  }

  const effectiveDate = fiscalYearEndDate ?? new Date().toISOString().split('T')[0]
  const input = {
    date: effectiveDate,
    type: 'Journal' as const,
    reference: '',
    description: `Period Close - ${fiscalYearLabel}`,
    currency: 'AED',
    baseCurrency: 'AED',
    createdBy: 'system',
    lines: closingLines,
  }

  const draftVoucher = createVoucher(input, vouchers)
  const approvedVoucher = approveVoucher(draftVoucher, 'system')
  const postedVoucher = postVoucher(approvedVoucher, 'system')

  invalidateBalanceCache()

  return {
    success: true,
    closingVoucher: postedVoucher,
    netProfit,
    totalRevenue: totalRevenueBalance,
    totalExpenses: totalExpenseBalance,
  }
}
