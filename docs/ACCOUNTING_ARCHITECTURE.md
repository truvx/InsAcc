# Accounting Architecture

## Overview

The InsAcc Accounting Engine is a double-entry bookkeeping system implementing standard ERP accounting principles. It provides the financial backbone for the application, replacing the ad-hoc transaction tracking with a proper chart of accounts, voucher-based posting, and ledger-derived reporting.

---

## Chart of Accounts

### Structure

```
1  Assets                (debit normal)
├── 11  Current Assets
│   ├── 1110  Cash
│   └── 1120  Banks (child accounts for specific banks)
├── 12  Investments
│   ├── 1210  Gold
│   ├── 1220  Silver
│   ├── 1230  Sukuk
│   ├── 1240  Bonds
│   ├── 1250  Mutual Funds
│   ├── 1260  Stocks
│   └── 1270  Real Estate
└── 13  Receivables

2  Liabilities           (credit normal)
├── 21  Current Liabilities
│   ├── 2110  Accounts Payable
│   └── 2120  Security Deposits

3  Equity                (credit normal)
├── 31  Capital
│   ├── 3110  Owner Capital
│   └── 3120  Retained Earnings

4  Revenue               (credit normal)
├── 41  Investment Income
│   ├── 4110  Dividend Income
│   ├── 4120  Rental Income
│   ├── 4130  Capital Gain
│   └── 4140  Interest Income

5  Expenses              (debit normal)
├── 51  Operating Expenses
│   ├── 5110  Management Fees
│   ├── 5120  Maintenance
│   ├── 5130  Insurance
│   ├── 5140  Utilities
│   ├── 5150  Professional Fees
│   └── 5160  Future Property Expenses
```

### Principles

- **Generic parent accounts only**: The chart of accounts contains structural parent accounts (e.g., 1120 Banks, 1210 Gold). Child accounts for specific entities (e.g., "Emirates Islamic Bank - Savings Account") are auto-created at runtime by `bankAccountMapping.ts`.
- **Code-based hierarchy**: Account codes determine parent-child relationships. E.g., `1120` is a child of `11` which is a child of `1`.
- **Normal balance**: Each account type has a defined normal balance side (debit for assets/expenses, credit for liabilities/equity/revenue).

---

## Voucher Lifecycle

### Status Flow

```
Draft → Pending Approval → Approved → Posted
                                    ↘ Cancelled
                                    ↘ Reversed
```

1. **Draft**: Initial state when a voucher is created
2. **Pending Approval**: Awaiting authorization
3. **Approved**: Authorized for posting (sets `approvedBy`, `approvedAt`)
4. **Posted**: Posted to ledger (sets `postedBy`, `postedAt`) — affects account balances
5. **Cancelled**: Voided before posting
6. **Reversed**: Reversed after posting (creates a new reversing journal voucher)

### Voucher Numbering

Format: `{PV|RV|JV}-{YYYY}-{000001}`

| Prefix | Type | Example |
|--------|------|---------|
| PV | Payment Voucher | PV-2026-000001 |
| RV | Receipt Voucher | RV-2026-000001 |
| JV | Journal Voucher | JV-2026-000001 |

Sequences reset yearly.

---

## Posting Flow

Every accounting action follows this pipeline:

```
Business Event
    ↓
Accounting Engine (processAccountingEvent)
    ↓
Posting Rules (resolveRule → debit/credit account resolution)
    ↓
Posting Validator (validateNewVoucher)
    ↓
Voucher Creation (createVoucher → voucher + lines)
    ↓
Voucher Stored (in vouchers state)
    ↓
Event Published (VOUCHER_CREATED)
    ↓
Read Models (future — Phase 3)
```

No shortcuts bypass the posting rules or validator.

### Posting Rules

Defined in `postingRules.ts`. Each rule specifies:

- **Event**: e.g., `ASSET_PURCHASE`, `BANK_DEPOSIT`
- **Voucher type**: Payment, Receipt, or Journal
- **Debit entries**: Account code or dynamic resolver function
- **Credit entries**: Account code or dynamic resolver function

12 supported accounting events:

| Event | Voucher Type | Debit | Credit |
|-------|-------------|-------|--------|
| ASSET_PURCHASE | Payment | Asset account | Bank account |
| ASSET_SALE | Receipt | Bank account | Asset account |
| DIVIDEND_RECEIVED | Receipt | Bank account | 4110 Dividend Income |
| RENTAL_INCOME | Receipt | Bank account | 4120 Rental Income |
| MAINTENANCE_PAID | Payment | 5120 Maintenance | Bank account |
| BANK_TRANSFER | Journal | Destination bank | Source bank |
| BANK_DEPOSIT | Receipt | Bank account | 1110 Cash |
| BANK_WITHDRAWAL | Payment | 1110 Cash | Bank account |
| EXPENSE_PAID | Payment | Debit account (dynamic) | Bank account |
| INCOME_RECEIVED | Receipt | Bank account | Credit account (dynamic) |
| OPENING_BALANCE | Journal | Debit account (dynamic) | Credit account (dynamic) |
| PROPERTY_ACQUISITION | Payment | Asset account | Bank account |

### Rule Resolution

Rules can reference accounts by:
- **Static code**: e.g., `'4110'` — always debits/credits the same account
- **Dynamic resolver**: e.g., `ctx => ctx.bankAccount!` — resolves from runtime context

---

## Accounting Engine

`src/renderer/accounting/accountingEngine.ts`

### Responsibilities

- Accept business events with context
- Resolve posting rules into debit/credit entries
- Call Posting Validator for validation
- Generate vouchers with correctly formatted lines
- Publish events for downstream consumption
- Manage approval and posting workflows

### Responsibilities it does NOT have

- NEVER calculates balances (delegated to LedgerService)
- NEVER performs validation directly (delegated to PostingValidator)
- NEVER contains accounting rules (delegated to PostingRules)

### API

```typescript
const engine = createAccountingEngine()

// Process a business event → generates voucher
const result = engine.processAccountingEvent(event, context, accounts, vouchers)

// Approve a voucher
const approval = engine.approve(voucher, approvedBy)

// Post a voucher to ledger
const posting = engine.post(voucher, postedBy, accounts, allVouchers)

// Subscribe to voucher events
const unsubscribe = engine.onEvent((event) => {
  if (event.type === 'VOUCHER_POSTED') { ... }
})
```

---

## Voucher Statuses

| Status | Description | Can edit? | Affects ledger? |
|--------|-------------|-----------|-----------------|
| Draft | Initial state | Yes | No |
| Pending Approval | Awaiting authorization | No | No |
| Approved | Authorized | No | No |
| Posted | Posted to ledger | No | Yes |
| Cancelled | Voided before posting | No | No |
| Reversed | Reversed after posting | No | Yes (offsets original) |

---

## Approval Lifecycle

1. Voucher created in **Draft** status
2. Submitted for approval → **Pending Approval**
3. Approver calls `engine.approve(voucher, userId)` → sets `approvedBy`, `approvedAt`, status → **Approved**
4. Approver calls `engine.post(voucher, userId, accounts, vouchers)` → sets `postedBy`, `postedAt`, status → **Posted**
5. Posted vouchers affect ledger balances

Validation occurs at both approval and posting stages.

---

## Bank Integration

### Bank Account → Chart of Accounts Mapping

Every BankAccount in the banking module maps to a child account under code **1120** (Banks).

**How it works:**
- `bankAccountMapping.ts` provides `ensureBankAccountMappings(bankAccounts, accounts, existingMappings)`
- On app startup, each BankAccount without a mapping gets a new child account auto-created (e.g., `112001` for "Emirates Islamic Bank - Savings Account")
- `BankMapping` stores the linkage: `{ bankAccountId, accountId, accountCode, accountName }`
- The Bank module continues working exactly as before — no duplicate balance maintenance
- The Ledger becomes the accounting source of truth (used in Phase 2B+)

**Lookup functions:**
- `getAccountIdForBank(bankAccountId, mappings)` → chart-of-accounts account ID
- `getAccountCodeForBank(bankAccountId, mappings)` → chart-of-accounts code
- `getBankForAccountId(accountId, mappings)` → bank mapping

---

## Purchase Integration

The Purchase Ledger tracks asset purchases. Integration with accounting:

- Each purchase record will generate an `ASSET_PURCHASE` posting event
- Debit: the appropriate investment account (e.g., 1210 for Gold)
- Credit: the bank account used for payment
- This is wired in Phase 2B

---

## Future Investment Integration

Planned for Phase 2B:
- Asset Holding management (average cost tracking)
- Asset Transactions (purchase/sale/split/bonus)
- Cost basis calculation
- Capital gain/loss recognition on sale

---

## Future Property Integration

Planned for Phase 2B:
- Property acquisition posting
- Rental income recognition
- Maintenance expense recording
- Security deposit tracking
- Depreciation (Phase 3)

---

## Future Read Models

Planned for Phase 3:
- Dashboard read model (aggregates from ledger)
- Reports read model (P&L, Balance Sheet, Cash Flow)
- History read model (audit trail from vouchers)
- All read models derive from posted vouchers only

---

## File Reference

### Phase 1 — Foundation (FROZEN)

| File | Purpose |
|------|---------|
| `src/renderer/accounting/types.ts` | All type definitions |
| `src/renderer/accounting/defaultAccounts.ts` | Default chart of accounts (30 accounts) |
| `src/renderer/accounting/postingRules.ts` | 12 accounting event posting rules |
| `src/renderer/accounting/postingValidator.ts` | Isolated validation service |
| `src/renderer/accounting/chartOfAccountsService.ts` | Account CRUD, tree, code generation |
| `src/renderer/accounting/voucherService.ts` | Voucher CRUD, numbering, status transitions |
| `src/renderer/accounting/ledgerService.ts` | Ledger queries, trial balance, statements |

### Phase 2A — Integration

| File | Purpose |
|------|---------|
| `src/renderer/accounting/accountingEngine.ts` | Orchestrator: event → rule → validate → voucher → publish |
| `src/renderer/accounting/bankAccountMapping.ts` | BankAccount → Chart of Accounts mapping |

### Modified Files

| File | Change |
|------|--------|
| `src/renderer/accounting/types.ts` | Added approval/posting metadata to Voucher, PostingResult, VoucherEvent |
| `src/renderer/accounting/voucherService.ts` | approveVoucher/postVoucher now accept and store approver/poster |
| `src/renderer/App.tsx` | Added accounts, vouchers, bankMappings state; wired AccountingEngine |
| `src/renderer/components/Sidebar.tsx` | Renamed "Transactions" → "Accounting" |
| `src/renderer/components/Transactions.tsx` | Terminology change: Income→Payment Voucher, Expense→Receipt Voucher |
| `src/renderer/utils.ts` | Added 'accounting' and 'trackAccounting' translation keys |
| `src/renderer/data/auditTypes.ts` | Added 'Accounting' to AuditModule type |
