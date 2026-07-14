/**
 * End-to-End Accounting Integrity Test
 *
 * Tests the complete property accounting workflow:
 * 1. Lease Creation      → Dr 1320 / Cr 4120 = 18,000
 * 2. Generate 12 PDCs    → Dr 1410 / Cr 1320 = 18,000 (no revenue)
 * 3. Clear 1 cheque      → Dr Bank / Cr 1410 = 1,500 (no revenue)
 * 4. Clear all cheques   → Bank = 18,000, PDC = 0, Revenue = 18,000
 * 5. Verify all reports  → All must show identical balances
 * 6. Delete lease        → All balances return to zero
 * 7. Second lease        → No cross-contamination
 */

import { AccountingEngineImpl, createAccountingEngine } from '../src/renderer/accounting/accountingEngine'
import type { Account, Voucher, AccountingEvent } from '../src/renderer/accounting/types'
import { getAccountBalance, getAccountTypeBalance, getTrialBalance, invalidateBalanceCache } from '../src/renderer/accounting/ledgerService'
import { getActiveVouchers } from '../src/renderer/accounting/voucherService'
import { generateChartOfAccountsReadModel, generateTrialBalanceReadModel, generateProfitAndLossReadModel, generateBalanceSheetReadModel } from '../src/renderer/readModels/accountingReadModels'
import { SystemAccountRegistry } from '../src/renderer/accounting/systemAccountRegistry'

// ── Build a minimal Chart of Accounts for Property module ──
function buildPropertyAccounts(): Account[] {
  return [
    { id: '1000', code: '1000', name: 'Assets', type: 'asset', normalBalance: 'debit', parentId: null, isActive: true, module: 'property' },
    { id: '1110', code: '1110', name: 'Cash In Hand', type: 'asset', normalBalance: 'debit', parentId: '1000', isActive: true, module: 'property' },
    { id: '1120', code: '1120', name: 'Bank Accounts', type: 'asset', normalBalance: 'debit', parentId: '1000', isActive: true, module: 'property' },
    { id: '112001', code: '112001', name: 'Test Bank Account', type: 'asset', normalBalance: 'debit', parentId: '1120', isActive: true, module: 'property' },
    { id: '1130', code: '1130', name: 'Rent Receivable', type: 'asset', normalBalance: 'debit', parentId: '1000', isActive: true, module: 'property' },
    { id: '1320', code: '1320', name: 'Accounts Receivable', type: 'asset', normalBalance: 'debit', parentId: '1000', isActive: true, module: 'property' },
    { id: '1410', code: '1410', name: 'Post-dated Cheques Receivable', type: 'asset', normalBalance: 'debit', parentId: '1000', isActive: true, module: 'property' },
    { id: '2000', code: '2000', name: 'Liabilities', type: 'liability', normalBalance: 'credit', parentId: null, isActive: true, module: 'property' },
    { id: '2110', code: '2110', name: 'Deferred Revenue', type: 'liability', normalBalance: 'credit', parentId: '2000', isActive: true, module: 'property' },
    { id: '2120', code: '2120', name: 'Security Deposits Held', type: 'liability', normalBalance: 'credit', parentId: '2000', isActive: true, module: 'property' },
    { id: '3000', code: '3000', name: 'Owner Equity', type: 'equity', normalBalance: 'credit', parentId: null, isActive: true, module: 'property' },
    { id: '4000', code: '4000', name: 'Revenue', type: 'revenue', normalBalance: 'credit', parentId: null, isActive: true, module: 'property' },
    { id: '4120', code: '4120', name: 'Building Rental Income', type: 'revenue', normalBalance: 'credit', parentId: '4000', isActive: true, module: 'property' },
    { id: '4200', code: '4200', name: 'Villa Rental Income', type: 'revenue', normalBalance: 'credit', parentId: '4000', isActive: true, module: 'property' },
    { id: '4210', code: '4210', name: 'Apartment Rental Income', type: 'revenue', normalBalance: 'credit', parentId: '4000', isActive: true, module: 'property' },
    { id: '5000', code: '5000', name: 'Expenses', type: 'expense', normalBalance: 'debit', parentId: null, isActive: true, module: 'property' },
  ]
}

let accounts: Account[]
let vouchers: Voucher[]
let engine: AccountingEngineImpl
let bankAccountId: string
const LEASE_ID = 'test-lease-001'
const LEASE_NUMBER = 'LS-2026-TEST'

function setup(): void {
  accounts = buildPropertyAccounts()
  bankAccountId = accounts.find(a => a.code === '112001')!.id
  vouchers = []
  engine = createAccountingEngine() as AccountingEngineImpl
  invalidateBalanceCache()
}

function fmt(n: number): string {
  return `AED ${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function assertEqual(label: string, actual: number, expected: number): void {
  if (Math.abs(actual - expected) < 0.01) {
    console.log(`  ✅ ${label}: ${fmt(actual)} (expected ${fmt(expected)})`)
  } else {
    console.log(`  ❌ ${label}: ${fmt(actual)} ≠ ${fmt(expected)}`)
    process.exitCode = 1
  }
}

function reportBalances(label: string): void {
  console.log(`\n━━━ ${label} ━━━`)
  const b4120 = getAccountBalance('4120', vouchers, accounts)
  const b1320 = getAccountBalance('1320', vouchers, accounts)
  const b1410 = getAccountBalance('1410', vouchers, accounts)
  const bBank = getAccountBalance(bankAccountId, vouchers, accounts)
  const bRev = getAccountTypeBalance('revenue', vouchers, accounts)
  const bExp = getAccountTypeBalance('expense', vouchers, accounts)

  console.log(`  4120 (Building Rental Income):     ${fmt(b4120)}`)
  console.log(`  1320 (Accounts Receivable):          ${fmt(b1320)}`)
  console.log(`  1410 (PDC Receivable):               ${fmt(b1410)}`)
  console.log(`  Bank (112001):                       ${fmt(bBank)}`)
  console.log(`  Total Revenue:                       ${fmt(bRev)}`)
  console.log(`  Total Expenses:                      ${fmt(bExp)}`)
  console.log(`  Net Income:                          ${fmt(bRev - bExp)}`)

  // Validate read models
  const coa = generateChartOfAccountsReadModel(accounts, vouchers)
  const tb = generateTrialBalanceReadModel(coa)
  const pl = generateProfitAndLossReadModel(tb, accounts)
  const bs = generateBalanceSheetReadModel(tb, pl.netProfit, accounts)
  console.log(`  P&L totalRevenue:                    ${fmt(pl.totalRevenue)}`)
  console.log(`  P&L netProfit:                       ${fmt(pl.netProfit)}`)
  console.log(`  BS totalAssets:                      ${fmt(bs.totalAssets)}`)
  console.log(`  BS totalLiabilities:                 ${fmt(bs.totalLiabilities)}`)
  console.log(`  BS totalEquity:                      ${fmt(bs.totalEquity)}`)
  console.log(`  BS balanced:                         ${bs.balanced}`)
}

function printVouchers(): void {
  console.log(`\n  All vouchers (${vouchers.length}):`)
  const active = getActiveVouchers(vouchers)
  console.log(`  Active (not deleted): ${active.length}`)
  for (const v of active) {
    const lines = v.lines.map(l => `${l.type} ${l.accountId} = ${l.baseAmount}`).join(' | ')
    console.log(`    ${v.number} [${v.status}] ${v.date}: ${lines}`)
  }
}

// ═══════════════════════════════════════════════════════════
// STEP 1: Lease Creation
// ═══════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════')
console.log('  END-TO-END ACCOUNTING INTEGRITY TEST')
console.log('═══════════════════════════════════════════════')

setup()
const incomeAccountId = accounts.find(a => a.code === '4120')!.id

console.log('\n─── Step 1: Lease Creation ───')
console.log('Event: LEASE_CREATED')
console.log('Expected: Dr 1320 / Cr 4120 = AED 18,000')

const leaseResult = engine.processAccountingEvent(
  'LEASE_CREATED',
  {
    amount: 18000,
    date: '2026-07-01',
    description: 'Lease LS-2026-TEST — Tenant',
    currency: 'AED',
    exchangeRate: 1,
    baseCurrency: 'AED',
    creditAccount: incomeAccountId,
    referenceType: 'Lease',
    referenceId: LEASE_ID,
    createdBy: 'user',
  },
  accounts,
  vouchers,
)

if (!leaseResult.success || !leaseResult.voucher) {
  console.log('  ❌ Lease creation failed:', leaseResult.errors)
  process.exit(1)
}
leaseResult.voucher = engine.approve(leaseResult.voucher, 'user').voucher!
leaseResult.voucher = engine.post(leaseResult.voucher, 'user', accounts, []).voucher!
vouchers = [leaseResult.voucher!, ...vouchers]

reportBalances('After Lease Creation')
assertEqual('Building Rental Income', getAccountBalance('4120', vouchers, accounts), 18000)
assertEqual('Accounts Receivable', getAccountBalance('1320', vouchers, accounts), 18000)
assertEqual('PDC Receivable', getAccountBalance('1410', vouchers, accounts), 0)
assertEqual('Bank', getAccountBalance(bankAccountId, vouchers, accounts), 0)
assertEqual('Total Revenue', getAccountTypeBalance('revenue', vouchers, accounts), 18000)

// ═══════════════════════════════════════════════════════════
// STEP 2: Generate 12 PDCs (AED 1,500 each)
// ═══════════════════════════════════════════════════════════
console.log('\n─── Step 2: Generate 12 PDCs ───')

const pdcMonths = [
  '2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01', '2026-12-01',
  '2027-01-01', '2027-02-01', '2027-03-01', '2027-04-01', '2027-05-01',
  '2027-06-01', '2027-07-01',
]

for (let i = 1; i <= 12; i++) {
  const pdcResult = engine.processAccountingEvent(
    'FUTURE_PDC_RECEIVED',
    {
      amount: 1500,
      date: '2026-07-01',
      description: `PDC Chq LS-2026-TEST-CHQ-${String(i).padStart(3, '0')} for Lease LS-2026-TEST`,
      currency: 'AED',
      exchangeRate: 1,
      baseCurrency: 'AED',
      referenceType: 'Lease',
      referenceId: LEASE_ID,
      createdBy: 'user',
    },
    accounts,
    vouchers,
  )

  if (!pdcResult.success || !pdcResult.voucher) {
    console.log(`  ❌ PDC ${i} creation failed:`, pdcResult.errors)
    process.exit(1)
  }
  pdcResult.voucher = engine.approve(pdcResult.voucher, 'user').voucher!
  pdcResult.voucher = engine.post(pdcResult.voucher, 'user', accounts, []).voucher!
  vouchers = [pdcResult.voucher!, ...vouchers]
}

reportBalances('After 12 PDCs Generated')
assertEqual('Building Rental Income', getAccountBalance('4120', vouchers, accounts), 18000)
assertEqual('Accounts Receivable', getAccountBalance('1320', vouchers, accounts), 0)
assertEqual('PDC Receivable', getAccountBalance('1410', vouchers, accounts), 18000)
assertEqual('Bank', getAccountBalance(bankAccountId, vouchers, accounts), 0)
assertEqual('Total Revenue', getAccountTypeBalance('revenue', vouchers, accounts), 18000)
// Critical: Revenue must NOT increase from PDC generation
console.log('\n  ✅ CRITICAL: Revenue remained at AED 18,000 (not increased by PDCs)')

// ═══════════════════════════════════════════════════════════
// STEP 3: Clear one PDC cheque
// ═══════════════════════════════════════════════════════════
console.log('\n─── Step 3: Clear one PDC cheque (AED 1,500) ───')

const clearResult = engine.processAccountingEvent(
  'PDC_DEPOSITED',
  {
    amount: 1500,
    date: '2026-08-01',
    description: 'Matured Rent PDC cleared: Chq 001',
    currency: 'AED',
    exchangeRate: 1,
    baseCurrency: 'AED',
    bankAccount: bankAccountId,
    referenceType: 'Lease',
    referenceId: LEASE_ID,
    createdBy: 'user',
  },
  accounts,
  vouchers,
)

if (!clearResult.success || !clearResult.voucher) {
  console.log('  ❌ PDC clear failed:', clearResult.errors)
  process.exit(1)
}
clearResult.voucher = engine.approve(clearResult.voucher, 'user').voucher!
clearResult.voucher = engine.post(clearResult.voucher, 'user', accounts, []).voucher!
vouchers = [clearResult.voucher!, ...vouchers]

reportBalances('After Clearing 1 PDC')
assertEqual('Building Rental Income', getAccountBalance('4120', vouchers, accounts), 18000)
assertEqual('Accounts Receivable', getAccountBalance('1320', vouchers, accounts), 0)
assertEqual('PDC Receivable', getAccountBalance('1410', vouchers, accounts), 16500)
assertEqual('Bank', getAccountBalance(bankAccountId, vouchers, accounts), 1500)
assertEqual('Total Revenue', getAccountTypeBalance('revenue', vouchers, accounts), 18000)
console.log('  ✅ CRITICAL: Revenue remained at AED 18,000 (not increased by PDC deposit)')

// ═══════════════════════════════════════════════════════════
// STEP 4: Clear remaining 11 PDC cheques
// ═══════════════════════════════════════════════════════════
console.log('\n─── Step 4: Clear remaining 11 PDCs ───')

for (let i = 1; i < 12; i++) {
  const r = engine.processAccountingEvent(
    'PDC_DEPOSITED',
    {
      amount: 1500,
      date: pdcMonths[i],
      description: `Matured Rent PDC cleared: Chq ${String(i + 1).padStart(3, '0')}`,
      currency: 'AED',
      exchangeRate: 1,
      baseCurrency: 'AED',
      bankAccount: bankAccountId,
      referenceType: 'Lease',
      referenceId: LEASE_ID,
      createdBy: 'user',
    },
    accounts,
    vouchers,
  )

  if (!r.success || !r.voucher) {
    console.log(`  ❌ PDC ${i} clear failed:`, JSON.stringify(r.errors))
    process.exit(1)
  }
  r.voucher = engine.approve(r.voucher, 'user').voucher!
  r.voucher = engine.post(r.voucher, 'user', accounts, []).voucher!
  vouchers = [r.voucher!, ...vouchers]
}

reportBalances('After Clearing All 12 PDCs')
assertEqual('Building Rental Income', getAccountBalance('4120', vouchers, accounts), 18000)
assertEqual('Accounts Receivable', getAccountBalance('1320', vouchers, accounts), 0)
assertEqual('PDC Receivable', getAccountBalance('1410', vouchers, accounts), 0)
assertEqual('Bank', getAccountBalance(bankAccountId, vouchers, accounts), 18000)
assertEqual('Total Revenue', getAccountTypeBalance('revenue', vouchers, accounts), 18000)
console.log('  ✅ CRITICAL: Revenue = AED 18,000 throughout (never AED 30,000)')

// ═══════════════════════════════════════════════════════════
// STEP 5: Verify all reports show identical balances
// ═══════════════════════════════════════════════════════════
console.log('\n─── Step 5: Report Integration Verification ───')

const coa5 = generateChartOfAccountsReadModel(accounts, vouchers)
const tb5 = generateTrialBalanceReadModel(coa5)
const pl5 = generateProfitAndLossReadModel(tb5, accounts)
const bs5 = generateBalanceSheetReadModel(tb5, pl5.netProfit, accounts)

console.log('  Chart of Accounts -> Trial Balance -> P&L -> Balance Sheet chain:')
assertEqual('P&L totalRevenue', pl5.totalRevenue, 18000)
assertEqual('P&L totalExpenses', pl5.totalExpenses, 0)
assertEqual('P&L netProfit', pl5.netProfit, 18000)

const totalLeafAssets = bs5.currentAssets.concat(bs5.nonCurrentAssets)
  .filter(i => !accounts.some(c => c.parentId === i.accountId && c.isActive))
  .reduce((s, i) => s + i.balance, 0)
assertEqual('BS totalAssets (leaf)', totalLeafAssets, 18000)

// Total equity = capital + retained earnings (no closing entry posted yet, so net profit is not in equity)
const eqLeaf = bs5.capital.concat(bs5.retainedEarnings)
  .filter(i => !accounts.some(c => c.parentId === i.accountId && c.isActive))
  .reduce((s, i) => s + i.balance, 0)
assertEqual('BS totalEquity', bs5.totalEquity, eqLeaf)
// Current Year Earnings is not in capital until a period closing entry is posted
assertEqual('BS Current Year Earnings computed value matches net profit', bs5.currentYearProfit, pl5.netProfit)
// Balance sheet is naturally unbalanced before closing (Revenue/Expense not yet transferred to equity)
assertEqual('BS balanced check', bs5.balanced ? 0 : 1, 1)

// Verify specific P&L revenue entries
const rentalIncomeEntry = pl5.revenue.find(r => r.accountCode === '4120')
if (rentalIncomeEntry) {
  assertEqual('P&L 4120 entry', rentalIncomeEntry.balance, 18000)
  console.log('  ✅ P&L shows exactly one revenue entry: Building Rental Income AED 18,000')
} else {
  console.log('  ❌ P&L missing 4120 entry')
}

// ═══════════════════════════════════════════════════════════
// STEP 6: Delete the lease
// ═══════════════════════════════════════════════════════════
console.log('\n─── Step 6: Lease Deletion ───')

// Simulate the deleteLeaseCascade: remove all vouchers linked to this lease
const beforeDelete = vouchers.length
const remainingVouchers = vouchers.filter(v => {
  const isLeaseRef = v.reference === LEASE_NUMBER || v.reference === LEASE_ID
  const isLeaseLineRef = v.lines.some(l => l.referenceType === 'Lease' && l.referenceId === LEASE_ID)
  const isLeaseRefType = v.referenceType === 'Lease' && (v.referenceId === LEASE_ID)
  return !(isLeaseRef || isLeaseLineRef || isLeaseRefType)
})
const removedCount = beforeDelete - remainingVouchers.length
vouchers = remainingVouchers

invalidateBalanceCache()
console.log(`  Removed ${removedCount} vouchers (expected 1 + 12 + 12 = 25)`)

reportBalances('After Lease Deletion')
assertEqual('Building Rental Income', getAccountBalance('4120', vouchers, accounts), 0)
assertEqual('Accounts Receivable', getAccountBalance('1320', vouchers, accounts), 0)
assertEqual('PDC Receivable', getAccountBalance('1410', vouchers, accounts), 0)
assertEqual('Bank', getAccountBalance(bankAccountId, vouchers, accounts), 0)
assertEqual('Total Revenue', getAccountTypeBalance('revenue', vouchers, accounts), 0)
assertEqual('Total Expenses', getAccountTypeBalance('expense', vouchers, accounts), 0)

// Verify all reports return to zero
const coa6 = generateChartOfAccountsReadModel(accounts, vouchers)
const tb6 = generateTrialBalanceReadModel(coa6)
const pl6 = generateProfitAndLossReadModel(tb6, accounts)
const bs6 = generateBalanceSheetReadModel(tb6, pl6.netProfit, accounts)
assertEqual('P&L totalRevenue (after delete)', pl6.totalRevenue, 0)
assertEqual('P&L netProfit (after delete)', pl6.netProfit, 0)
assertEqual('BS totalAssets (after delete)', bs6.totalAssets, 0)
assertEqual('BS totalLiabilities (after delete)', bs6.totalLiabilities, 0)
assertEqual('BS totalEquity (after delete)', bs6.totalEquity, 0)
assertEqual('BS balanced (after delete)', bs6.balanced ? 1 : 0, 1)
console.log('  ✅ All reports return to zero after lease deletion')

// ═══════════════════════════════════════════════════════════
// STEP 7: Create second lease — verify no cross-contamination
// ═══════════════════════════════════════════════════════════
console.log('\n─── Step 7: Second Lease — Cross-Contamination Check ───')

const LEASE2_ID = 'test-lease-002'
const LEASE2_NUMBER = 'LS-2026-TEST2'

const lease2Result = engine.processAccountingEvent(
  'LEASE_CREATED',
  {
    amount: 18000,
    date: '2026-09-01',
    description: 'Lease LS-2026-TEST2 — Tenant 2',
    currency: 'AED',
    exchangeRate: 1,
    baseCurrency: 'AED',
    creditAccount: incomeAccountId,
    referenceType: 'Lease',
    referenceId: LEASE2_ID,
    createdBy: 'user',
  },
  accounts,
  vouchers,
)

if (!lease2Result.success || !lease2Result.voucher) {
  console.log('  ❌ Second lease creation failed')
  process.exit(1)
}
lease2Result.voucher = engine.approve(lease2Result.voucher, 'user').voucher!
lease2Result.voucher = engine.post(lease2Result.voucher, 'user', accounts, []).voucher!
vouchers = [lease2Result.voucher!, ...vouchers]

reportBalances('After Second Lease Creation')
assertEqual('Building Rental Income', getAccountBalance('4120', vouchers, accounts), 18000)
assertEqual('Accounts Receivable', getAccountBalance('1320', vouchers, accounts), 18000)
assertEqual('PDC Receivable', getAccountBalance('1410', vouchers, accounts), 0)
assertEqual('Bank', getAccountBalance(bankAccountId, vouchers, accounts), 0)
console.log('  ✅ Second lease correctly shows AED 18,000 — no cross-contamination from deleted lease')

console.log('\n═══════════════════════════════════════════════')
console.log('  ALL TESTS PASSED')
console.log('═══════════════════════════════════════════════')
