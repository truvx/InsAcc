import type { PostingRule, PostingRuleEntry, RuleContext, AccountingEvent, Account } from './types'
import { resolveAccount } from './chartOfAccountsService'
import { SystemAccountRegistry } from './systemAccountRegistry'

export const POSTING_RULES: PostingRule[] = [
  {
    event: 'LEASE_CREATED',
    description: 'Lease contract activated — recognize total rental income',
    voucherType: 'Journal',
    debit: [
      { account: '1410', narration: 'Rent receivable' },
    ],
    credit: [
      { account: ctx => ctx.creditAccount!, narration: 'Rental income' },
    ],
  },

  {
    event: 'RENT_RECEIVED',
    description: 'Rent collected — reduces accounts receivable',
    voucherType: 'Receipt',
    debit: [
      { account: ctx => ctx.bankAccount!, narration: 'Rent deposited to bank' },
    ],
    credit: [
      { account: '1410', narration: 'Accounts receivable reduced' },
    ],
  },

  {
    event: 'FUTURE_PDC_RECEIVED',
    description: 'Future-dated PDC received from tenant',
    voucherType: 'Journal',
    debit: [
      { account: '1410', narration: 'Post-dated cheque received' },
    ],
    credit: [
      { account: '1410', narration: 'PDC receivable from tenant' },
    ],
  },

  {
    event: 'PDC_DEPOSITED',
    description: 'PDC deposited to bank account upon maturity',
    voucherType: 'Receipt',
    debit: [
      { account: ctx => ctx.bankAccount!, narration: 'PDC deposited to bank' },
    ],
    credit: [
      { account: '1410', narration: 'PDC matured' },
    ],
  },

  {
    event: 'PDC_BOUNCED',
    description: 'Bounced post-dated cheque reverses clearing',
    voucherType: 'Journal',
    debit: [
      { account: '1410', narration: 'Bounced cheque tenant receivable restored' },
    ],
    credit: [
      { account: ctx => ctx.bankAccount!, narration: 'Bounced cheque bank withdrawal' },
    ],
  },

  {
    event: 'PDC_BOUNCE_FEE',
    description: 'Bank charge expense for bounced cheque',
    voucherType: 'Payment',
    debit: [
      { account: '5120', narration: 'Bank bounced cheque charge' },
    ],
    credit: [
      { account: ctx => ctx.bankAccount!, narration: 'Bank charge payment' },
    ],
  },

  {
    event: 'PDC_PENALTY',
    description: 'Penalty charged to tenant for bounced cheque',
    voucherType: 'Journal',
    debit: [
      { account: '1410', narration: 'Bounced cheque penalty receivable' },
    ],
    credit: [
      { account: '4150', narration: 'Late fee income' },
    ],
  },

  {
    event: 'PDC_CANCELLED',
    description: 'Cancellation of future-dated PDC — reverses initial receipt entry',
    voucherType: 'Journal',
    debit: [
      { account: '1410', narration: 'PDC cancelled — receivable reinstated' },
    ],
    credit: [
      { account: '1410', narration: 'PDC cancelled — removed from PDC receivable' },
    ],
  },

  {
    event: 'SECURITY_DEPOSIT_RECEIVED',
    description: 'Security deposit received from tenant',
    voucherType: 'Receipt',
    debit: [
      { account: ctx => ctx.bankAccount!, narration: 'Security deposit received' },
    ],
    credit: [
      { account: ctx => ctx.creditAccount!, narration: 'Security deposit liability' },
    ],
  },

  {
    event: 'SECURITY_DEPOSIT_PDC_RECEIVED',
    description: 'Security deposit PDC cheque received from tenant',
    voucherType: 'Journal',
    debit: [
      { account: '1420', narration: 'Security deposit PDC receivable' },
    ],
    credit: [
      { account: ctx => ctx.creditAccount!, narration: 'Security deposit liability' },
    ],
  },

  {
    event: 'SECURITY_DEPOSIT_PDC_DEPOSITED',
    description: 'Security deposit PDC cheque deposited to bank and cleared',
    voucherType: 'Receipt',
    debit: [
      { account: ctx => ctx.bankAccount!, narration: 'Security deposit cheque deposit' },
    ],
    credit: [
      { account: '1420', narration: 'Security deposit cheque cleared' },
    ],
  },

  {
    event: 'SECURITY_DEPOSIT_REFUNDED',
    description: 'Security deposit refunded to tenant',
    voucherType: 'Payment',
    debit: [
      { account: ctx => ctx.debitAccount!, narration: 'Security deposit liability settlement' },
    ],
    credit: [
      { account: ctx => ctx.bankAccount!, narration: 'Deposit refund payment' },
    ],
  },

  {
    event: 'SECURITY_DEPOSIT_FORFEITED',
    description: 'Security deposit forfeited to landlord',
    voucherType: 'Journal',
    debit: [
      { account: ctx => ctx.debitAccount!, narration: 'Security deposit liability forfeiture' },
    ],
    credit: [
      { account: ctx => ctx.creditAccount!, narration: 'Forfeiture income recognition' },
    ],
  },

  {
    event: 'SECURITY_DEPOSIT_PARTIAL_REFUND',
    description: 'Partial refund of security deposit with retained portion recognized as income',
    voucherType: 'Journal',
    debit: [
      { account: ctx => ctx.debitAccount!, narration: 'Security deposit liability settlement' },
    ],
    credit: [
      { account: ctx => ctx.bankAccount!, narration: 'Deposit refund payment', amount: ctx => ctx.refundAmount ?? 0 },
      { account: '4160', narration: 'Damage recovery income' },
    ],
  },

  {
    event: 'ASSET_PURCHASE',
    description: 'Purchase of an asset funded from a bank account',
    voucherType: 'Payment',
    debit: [
      { account: ctx => ctx.assetAccount!, narration: 'Asset purchase' },
    ],
    credit: [
      { account: ctx => ctx.bankAccount!, narration: 'Payment for asset' },
    ],
  },

  {
    event: 'ASSET_SALE',
    description: 'Sale of an asset with proceeds deposited to bank',
    voucherType: 'Receipt',
    debit: [
      { account: ctx => ctx.bankAccount!, narration: 'Sale proceeds received' },
    ],
    credit: [
      { account: ctx => ctx.assetAccount!, narration: 'Asset disposal' },
    ],
  },

  {
    event: 'DIVIDEND_RECEIVED',
    description: 'Dividend income received into a bank account',
    voucherType: 'Receipt',
    debit: [
      { account: ctx => ctx.bankAccount!, narration: 'Dividend received' },
    ],
    credit: [
      { account: '4110', narration: 'Dividend income' },
    ],
  },

  {
    event: 'MAINTENANCE_PAID',
    description: 'Maintenance expense paid from a bank account',
    voucherType: 'Payment',
    debit: [
      { account: '5120', narration: 'Maintenance expense' },
    ],
    credit: [
      { account: ctx => ctx.bankAccount!, narration: 'Maintenance payment' },
    ],
  },

  {
    event: 'BANK_TRANSFER',
    description: 'Transfer between two bank accounts',
    voucherType: 'Journal',
    debit: [
      { account: ctx => ctx.creditAccount!, narration: 'Transfer received' },
    ],
    credit: [
      { account: ctx => ctx.debitAccount!, narration: 'Transfer sent' },
    ],
  },

  {
    event: 'BANK_DEPOSIT',
    description: 'Cash deposit into a bank account',
    voucherType: 'Receipt',
    debit: [
      { account: ctx => ctx.bankAccount!, narration: 'Deposit to bank' },
    ],
    credit: [
      { account: '1110', narration: 'Cash deposit' },
    ],
  },

  {
    event: 'BANK_WITHDRAWAL',
    description: 'Cash withdrawal from a bank account',
    voucherType: 'Payment',
    debit: [
      { account: '1110', narration: 'Cash withdrawal' },
    ],
    credit: [
      { account: ctx => ctx.bankAccount!, narration: 'Withdrawal from bank' },
    ],
  },

  {
    event: 'EXPENSE_PAID',
    description: 'Expense paid from a bank account',
    voucherType: 'Payment',
    debit: [
      { account: ctx => ctx.debitAccount!, narration: 'Expense' },
    ],
    credit: [
      { account: ctx => ctx.bankAccount!, narration: 'Expense payment' },
    ],
  },

  {
    event: 'INCOME_RECEIVED',
    description: 'Income received into a bank account',
    voucherType: 'Receipt',
    debit: [
      { account: ctx => ctx.bankAccount!, narration: 'Income received' },
    ],
    credit: [
      { account: ctx => ctx.creditAccount!, narration: 'Income' },
    ],
  },

  {
    event: 'OPENING_BALANCE',
    description: 'Opening balance journal entry',
    voucherType: 'Journal',
    debit: [
      { account: ctx => ctx.debitAccount!, narration: 'Opening balance debit' },
    ],
    credit: [
      { account: ctx => ctx.creditAccount!, narration: 'Opening balance credit' },
    ],
  },

  {
    event: 'PROPERTY_ACQUISITION',
    description: 'Property acquisition funded from a bank account',
    voucherType: 'Payment',
    debit: [
      { account: ctx => ctx.assetAccount!, narration: 'Property acquisition' },
    ],
    credit: [
      { account: ctx => ctx.bankAccount!, narration: 'Payment for property' },
    ],
  },

  {
    event: 'ASSET_DISPOSAL',
    description: 'Disposal of an asset with gain/loss recognition',
    voucherType: 'Journal',
    debit: [
      { account: ctx => ctx.bankAccount!, narration: 'Asset disposal proceeds' },
    ],
    credit: [
      { account: ctx => ctx.assetAccount!, narration: 'Asset cost removal' },
    ],
  },

  {
    event: 'INTEREST_INCOME',
    description: 'Interest income received into bank account',
    voucherType: 'Receipt',
    debit: [
      { account: ctx => ctx.bankAccount!, narration: 'Interest income received' },
    ],
    credit: [
      { account: '4140', narration: 'Interest income' },
    ],
  },

  {
    event: 'INTEREST_EXPENSE',
    description: 'Interest expense paid from bank account',
    voucherType: 'Payment',
    debit: [
      { account: '5170', narration: 'Interest expense' },
    ],
    credit: [
      { account: ctx => ctx.bankAccount!, narration: 'Interest payment' },
    ],
  },

  {
    event: 'TAX_PAID',
    description: 'Tax payment from bank account',
    voucherType: 'Payment',
    debit: [
      { account: '5180', narration: 'Tax expense' },
    ],
    credit: [
      { account: ctx => ctx.bankAccount!, narration: 'Tax payment' },
    ],
  },

  {
    event: 'LOAN_DISBURSEMENT',
    description: 'Loan disbursement received into bank account',
    voucherType: 'Receipt',
    debit: [
      { account: ctx => ctx.bankAccount!, narration: 'Loan proceeds received' },
    ],
    credit: [
      { account: '2210', narration: 'Loan payable' },
    ],
  },

  {
    event: 'LOAN_REPAYMENT',
    description: 'Loan repayment from bank account',
    voucherType: 'Payment',
    debit: [
      { account: '2210', narration: 'Loan repayment' },
    ],
    credit: [
      { account: ctx => ctx.bankAccount!, narration: 'Loan payment' },
    ],
  },

  {
    event: 'DEPRECIATION',
    description: 'Depreciation expense entry',
    voucherType: 'Journal',
    debit: [
      { account: '5190', narration: 'Depreciation expense' },
    ],
    credit: [
      { account: ctx => ctx.assetAccount!, narration: 'Accumulated depreciation' },
    ],
  },

  {
    event: 'ACCRUED_INCOME',
    description: 'Accrued income recognition',
    voucherType: 'Journal',
    debit: [
      { account: '1310', narration: 'Accrued income receivable' },
    ],
    credit: [
      { account: ctx => ctx.creditAccount!, narration: 'Accrued income' },
    ],
  },

  {
    event: 'ACCRUED_EXPENSE',
    description: 'Accrued expense recognition',
    voucherType: 'Journal',
    debit: [
      { account: ctx => ctx.debitAccount!, narration: 'Accrued expense' },
    ],
    credit: [
      { account: '2130', narration: 'Accrued expense payable' },
    ],
  },

  {
    event: 'CONTRA_ENTRY',
    description: 'Contra entry between accounts',
    voucherType: 'Contra',
    debit: [
      { account: ctx => ctx.debitAccount!, narration: 'Contra debit' },
    ],
    credit: [
      { account: ctx => ctx.creditAccount!, narration: 'Contra credit' },
    ],
  },

  {
    event: 'CAPITAL_CONTRIBUTION',
    description: 'Capital contribution into the business',
    voucherType: 'Receipt',
    debit: [
      { account: ctx => ctx.bankAccount!, narration: 'Capital contribution received' },
    ],
    credit: [
      { account: '3110', narration: 'Owner capital contribution' },
    ],
  },

  {
    event: 'CAPITAL_WITHDRAWAL',
    description: 'Capital withdrawal from the business',
    voucherType: 'Payment',
    debit: [
      { account: '3130', narration: 'Owner drawings' },
    ],
    credit: [
      { account: ctx => ctx.bankAccount!, narration: 'Capital withdrawal' },
    ],
  },

  {
    event: 'DIVIDEND_PAID',
    description: 'Dividend payment from bank account',
    voucherType: 'Payment',
    debit: [
      { account: '3140', narration: 'Dividends paid' },
    ],
    credit: [
      { account: ctx => ctx.bankAccount!, narration: 'Dividend payment' },
    ],
  },

  {
    event: 'UTILITY_RECOVERY',
    description: 'Utility recovery from tenant',
    voucherType: 'Receipt',
    debit: [
      { account: ctx => ctx.bankAccount!, narration: 'Utility recovery received' },
    ],
    credit: [
      { account: '5140', narration: 'Utility recovery (expense reduction)' },
    ],
  },

  {
    event: 'LATE_FEE',
    description: 'Late fee charged to tenant',
    voucherType: 'Receipt',
    debit: [
      { account: ctx => ctx.bankAccount!, narration: 'Late fee received' },
    ],
    credit: [
      { account: '4150', narration: 'Late fee income' },
    ],
  },

  {
    event: 'DEPOSIT_REFUND',
    description: 'Security deposit refund to tenant',
    voucherType: 'Payment',
    debit: [
      { account: '2120', narration: 'Security deposit liability settlement' },
    ],
    credit: [
      { account: ctx => ctx.bankAccount!, narration: 'Deposit refund payment' },
    ],
  },

  {
    event: 'PREPAID_EXPENSE',
    description: 'Prepaid expense recorded',
    voucherType: 'Payment',
    debit: [
      { account: '1510', narration: 'Prepaid expense' },
    ],
    credit: [
      { account: ctx => ctx.bankAccount!, narration: 'Prepaid payment' },
    ],
  },

  {
    event: 'DEFERRED_REVENUE',
    description: 'Deferred revenue recorded',
    voucherType: 'Receipt',
    debit: [
      { account: ctx => ctx.bankAccount!, narration: 'Deferred revenue received' },
    ],
    credit: [
      { account: '2310', narration: 'Deferred revenue liability' },
    ],
  },

  {
    event: 'REALIZED_GAIN',
    description: 'Realized gain on asset sale',
    voucherType: 'Journal',
    debit: [
      { account: ctx => ctx.assetAccount!, narration: 'Gain realization adjustment' },
    ],
    credit: [
      { account: '4130', narration: 'Realized capital gain' },
    ],
  },

  {
    event: 'REALIZED_LOSS',
    description: 'Realized loss on asset sale',
    voucherType: 'Journal',
    debit: [
      { account: '5210', narration: 'Realized capital loss' },
    ],
    credit: [
      { account: ctx => ctx.assetAccount!, narration: 'Loss realization adjustment' },
    ],
  },

  {
    event: 'UNREALIZED_GAIN',
    description: 'Unrealized gain on investment revaluation',
    voucherType: 'Journal',
    debit: [
      { account: ctx => ctx.assetAccount!, narration: 'Unrealized gain increase' },
    ],
    credit: [
      { account: '4160', narration: 'Unrealized gain on investments' },
    ],
  },

  {
    event: 'UNREALIZED_LOSS',
    description: 'Unrealized loss on investment revaluation',
    voucherType: 'Journal',
    debit: [
      { account: '5220', narration: 'Unrealized loss on investments' },
    ],
    credit: [
      { account: ctx => ctx.assetAccount!, narration: 'Unrealized loss decrease' },
    ],
  },

  {
    event: 'GOODS_PURCHASE',
    description: 'Purchase of goods on credit or cash',
    voucherType: 'Payment',
    debit: [
      { account: ctx => ctx.debitAccount!, narration: 'Goods purchase' },
    ],
    credit: [
      { account: ctx => ctx.bankAccount!, narration: 'Payment for goods' },
    ],
  },

  {
    event: 'GOODS_SALE',
    description: 'Sale of goods for cash or credit',
    voucherType: 'Receipt',
    debit: [
      { account: ctx => ctx.bankAccount!, narration: 'Sale proceeds' },
    ],
    credit: [
      { account: ctx => ctx.creditAccount!, narration: 'Sales revenue' },
    ],
  },

  {
    event: 'SALARY_PAID',
    description: 'Salary payment to employees',
    voucherType: 'Payment',
    debit: [
      { account: '5230', narration: 'Salary expense' },
    ],
    credit: [
      { account: ctx => ctx.bankAccount!, narration: 'Salary payment' },
    ],
  },

  {
    event: 'SERVICE_INCOME',
    description: 'Service income received',
    voucherType: 'Receipt',
    debit: [
      { account: ctx => ctx.bankAccount!, narration: 'Service income received' },
    ],
    credit: [
      { account: ctx => ctx.creditAccount!, narration: 'Service revenue' },
    ],
  },

  {
    event: 'PURCHASE_RETURN',
    description: 'Return of goods to supplier',
    voucherType: 'Journal',
    debit: [
      { account: ctx => ctx.bankAccount!, narration: 'Purchase return refund' },
    ],
    credit: [
      { account: ctx => ctx.debitAccount!, narration: 'Purchase return' },
    ],
  },

  {
    event: 'SALES_RETURN',
    description: 'Customer returns goods',
    voucherType: 'Journal',
    debit: [
      { account: ctx => ctx.creditAccount!, narration: 'Sales return' },
    ],
    credit: [
      { account: ctx => ctx.bankAccount!, narration: 'Sales return refund' },
    ],
  },
]

export function getRule(event: AccountingEvent): PostingRule | undefined {
  return POSTING_RULES.find(r => r.event === event)
}

function resolveEntry(
  entry: PostingRuleEntry,
  context: RuleContext,
  accounts: Account[],
): { accountId: string; narration?: string; amount?: number } {
  let resolvedId = ''
  if (typeof entry.account === 'function') {
    resolvedId = entry.account(context)
  } else {
    resolvedId = entry.account
  }

  let resolvedAmount: number | undefined
  if (typeof entry.amount === 'function') {
    resolvedAmount = entry.amount(context)
  } else {
    resolvedAmount = entry.amount
  }

  let acct: Account | undefined

  const key = resolvedId.toLowerCase()
  if (key === '1200' || key === 'investment assets' || key === 'investments') {
    acct = SystemAccountRegistry.getInvestmentAssetAccount(accounts)
  } else if (key === '1270' || key === 'property assets' || key === 'real estate') {
    acct = SystemAccountRegistry.getPropertyAssetAccount(accounts)
  } else if (key === '1110' || key === '1110-inv' || key === '1110-prop' || key === 'cash' || key === 'cash in hand' || key === 'cash on hand') {
    acct = SystemAccountRegistry.getCashAccount(accounts)
  } else if (key === '1120' || key === 'bank' || key === 'bank accounts' || key === 'cash and bank accounts') {
    acct = SystemAccountRegistry.getBankAccount(accounts)
  } else if (key === '4120' || key === 'rental income' || key === 'building rental income') {
    acct = SystemAccountRegistry.getBuildingRentalIncomeAccount(accounts)
  } else if (key === '4200' || key === 'villa rental income') {
    acct = SystemAccountRegistry.getVillaRentalIncomeAccount(accounts)
  } else if (key === '4210' || key === 'apartment rental income') {
    acct = SystemAccountRegistry.getApartmentRentalIncomeAccount(accounts)
  } else if (key === 'investment income') {
    acct = SystemAccountRegistry.getInvestmentIncomeAccount(accounts)
  } else if (key === '2120' || key === 'security deposit liability' || key === 'security deposits held') {
    acct = SystemAccountRegistry.getSecurityDepositLiability(accounts)
  } else if (key === '1320' || key === 'accounts receivable') {
    acct = SystemAccountRegistry.getAccountsReceivable(accounts)
  } else if (key === '2100' || key === 'accounts payable') {
    acct = SystemAccountRegistry.getAccountsPayable(accounts)
  } else if (key === '5000' || key === 'expenses') {
    acct = SystemAccountRegistry.getExpenseAccount(accounts)
  } else if (key === '1410' || key === 'pdc receivables' || key === 'post-dated cheques receivable') {
    acct = SystemAccountRegistry.getPdcReceivablesAccount(accounts)
  } else if (key === '4110' || key === 'dividend income') {
    acct = SystemAccountRegistry.getDividendIncomeAccount(accounts)
  } else if (key === '4140' || key === 'interest income') {
    acct = SystemAccountRegistry.getInterestIncomeAccount(accounts)
  } else if (key === '4150' || key === 'late fee income') {
    acct = SystemAccountRegistry.getLateFeeIncomeAccount(accounts)
  } else if (key === '4160' || key === 'damage recovery income') {
    acct = SystemAccountRegistry.getDamageRecoveryIncomeAccount(accounts)
  } else if (key === '5120' || key === 'maintenance expense') {
    acct = SystemAccountRegistry.getMaintenanceExpenseAccount(accounts)
  } else if (key === '5170' || key === 'interest expense') {
    acct = SystemAccountRegistry.getInterestExpenseAccount(accounts)
  } else if (key === '5180' || key === 'tax expense') {
    acct = SystemAccountRegistry.getTaxExpenseAccount(accounts)
  }

  if (!acct) {
    acct = resolveAccount(resolvedId, accounts)
  }

  return { accountId: acct ? acct.id : resolvedId, narration: entry.narration, amount: resolvedAmount }
}

export function resolveRule(
  rule: PostingRule,
  context: RuleContext,
  accounts: Account[],
): {
  debit: Array<{ accountId: string; narration?: string; amount?: number }>
  credit: Array<{ accountId: string; narration?: string; amount?: number }>
} {
  return {
    debit: rule.debit.map(e => resolveEntry(e, context, accounts)),
    credit: rule.credit.map(e => resolveEntry(e, context, accounts)),
  }
}

export function isKnownEvent(event: string): event is AccountingEvent {
  return POSTING_RULES.some(r => r.event === event)
}
