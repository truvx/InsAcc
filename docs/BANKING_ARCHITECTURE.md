# InsAcc Banking Architecture — Target v2.0

> **Status:** Aspirational — not yet implemented
>
> This document defines the target banking architecture. See `src/renderer/components/BankAccounts.tsx` for the current implementation.

---

## Overview

### Purpose

The Banking module manages cash accounts within InsAcc. It stores account metadata, tracks deposits and withdrawals, maintains running balances, and provides the foundation for reconciliation, transfers, and cash reporting.

In the current implementation (`BankAccounts.tsx`), the module is a single-account ledger with a scalar balance and a flat list of statement entries. This document defines a multi-account architecture that preserves all existing functionality while enabling reconciliation, transfers, imports, and cash dashboards.

### How It Fits Into the Application

#### Dashboard
The Dashboard displays KPI cards (Portfolio Value, Active Investments, This Month Net, YTD Return) but currently has **no cash balance card**. Under this architecture, the Dashboard would consume an aggregated `totalCashBalance` derived from all active `BankAccount.currentBalance` values. The "This Month" card could optionally break out cash vs investment income. The Purchase Averages table is unrelated but lives on the same page.

#### Transactions
Transactions (`Transactions.tsx`) records Income, Expense, and Journal entries. There is **no link** between a Transaction and a Bank Account today. Under this architecture, a Transaction could optionally carry an `accountId` field to represent which account was credited (for Income) or debited (for Expense). This enables reconciliation — matching bank transaction lines to internal transaction records.

#### Purchase Ledger
The Purchase Ledger (`PurchaseLedger.tsx`) tracks purchases of physical assets (gold, silver, etc.) with running averages. Purchases are **cash outflows** but are not recorded as bank withdrawals. Under this architecture, recording a purchase could optionally generate a corresponding withdrawal entry in a designated cash account, keeping the bank balance in sync with the purchase ledger.

#### Investments
Investments (`Investments.tsx`) records investment purchases. Each investment has a `purchaseValue` that represents cash spent. Like purchases, investments are not linked to bank accounts today. Under this architecture, creating an investment could optionally deduct from a bank account balance.

#### Reports
Reports (`Reports.tsx`) currently has a "Banking Reports" category with sub-reports (Account Statement, Cash Flow) that are **not implemented** — they show placeholder content. This architecture would provide the data model to power those reports: account summaries, cash flow trends, reconciliation reports, and transaction histories filtered by account and date range.

---

## Immutable IDs

Every entity in the banking module uses **immutable unique identifiers**. IDs are assigned once at creation and must never be regenerated, reassigned, or recycled.

### Rules

- All IDs are strings. The recommended format is a UUID v4 or a timestamp-prefixed unique string (e.g., `ba-1719500000000`, `bt-1719500000000`).
- An ID identifies a single record for its entire lifetime.
- IDs are used as foreign keys (`accountId`, `createdBy`, `updatedBy`). Regenerating an ID would orphan all references.
- When an entity is deleted (soft or hard), its ID is **never reused** for another record.
- IDs are opaque to the user. They are never displayed in the UI or exposed as editable fields.
- Export files (CSV, Excel) may include IDs as a reference column for reconciliation and re-import deduplication.

---

## BankAccount Model

```typescript
interface BankAccount {
  id: string
  institution: string
  accountName: string
  accountNumber: string
  currency: string
  openingBalance: number
  accountType: 'checking' | 'savings' | 'cash' | 'credit'
  theme: string
  icon: string
  status: 'active' | 'archived' | 'closed' | 'hidden'
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}
```

### Field Explanations

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Immutable unique identifier (e.g., UUID or `ba-{timestamp}`). Used as a foreign key in `BankTransaction.accountId`. Never regenerated. |
| `institution` | `string` | Institution name (e.g., "Emirates Islamic Bank", "ADCB"). Supports banks, cash wallets, investment cash, petty cash, and future wallet providers. Displayed on the balance card and in account selectors. |
| `accountName` | `string` | User-facing label (e.g., "Primary Account", "Business Savings", "Petty Cash"). Distinguishes multiple accounts at the same institution. |
| `accountNumber` | `string` | Masked or full account number (e.g., "****1234"). Display-only; not used in calculations. Optional for cash and wallet accounts. |
| `currency` | `string` | ISO 4217 currency code (e.g., "AED", "USD", "EUR"). All transactions for this account use this currency. Cross-currency transfers require a future enhancement (exchange rates). |
| `openingBalance` | `number` | The account balance at the time it was added to InsAcc. Set once on creation. Never modified by transactions. Expressed as a positive number for debit-balance accounts (checking, savings, cash), negative for credit-balance accounts (credit cards). |
| `accountType` | `'checking' \| 'savings' \| 'cash' \| 'credit'` | Determines balance behavior. Checking/savings/cash are debit accounts (positive = money you own). Credit accounts invert the sign convention. |
| `theme` | `string` | Semantic theme name (e.g., "emerald", "blue", "gold", "slate"). The UI maps themes to actual CSS variable colors. **The data model never stores hex values.** The UI layer decides the visual representation. |
| `icon` | `string` | Icon name from the existing inline SVG set (e.g., "bank", "wallet", "credit-card"). Rendered beside the account name. |
| `status` | `'active' \| 'archived' \| 'closed' \| 'hidden'` | Controls account visibility and behavior. See Account Status below. |
| `createdAt` | `string` | ISO 8601 timestamp when the account was created in InsAcc. |
| `updatedAt` | `string` | ISO 8601 timestamp when the account was last modified (name change, status change, etc.). Not updated by bank transactions. |
| `createdBy` | `string` | User ID of the person who created the account. Enables audit trail. |
| `updatedBy` | `string` | User ID of the person who last modified the account metadata. Enables audit trail. |

### Account Status

| Status | Description |
|---|---|
| `active` | Normal operational state. Account is visible in all selectors, included in dashboard aggregates, and available for new transactions. |
| `archived` | Account is hidden from selectors and dashboards but its data is fully preserved for historical reporting. Can be unarchived (restored to `active`). No new transactions can be added. |
| `closed` | Account is permanently closed. Hidden from selectors and dashboards. No new transactions can be added. Cannot be reopened. Differs from `archived` in that a closed account represents a real-world closure (bank account closed, wallet discontinued). |
| `hidden` | Account is hidden from selectors and dashboards but remains fully functional. New transactions can still be added programmatically (e.g., via import or API). Useful for rarely-used accounts that should not clutter the UI. |

### Storage

Persisted as `insacc_bank_accounts` in localStorage — a `BankAccount[]` array. Default: one entry for the current hardcoded account (Emirates Islamic Bank, AED, opening balance 0).

---

## BankTransaction Model

The model is named `BankTransaction` rather than `StatementEntry` because it represents **every movement of money** in or out of an account — not only entries imported from a bank statement. Deposits, withdrawals, transfers, interest postings, fees, and corrections are all `BankTransaction` records.

```typescript
interface BankTransaction {
  id: string
  accountId: string
  date: string
  type: 'credit' | 'debit' | 'transfer_in' | 'transfer_out'
  amount: number
  description: string
  category: string
  status: 'imported' | 'pending' | 'cleared' | 'reconciled'
  reference: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}
```

### Field Explanations

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Immutable unique identifier (e.g., UUID or `bt-{timestamp}`). Stable reference for reconciliation, editing, and deletion. Never regenerated. |
| `accountId` | `string` | Immutable foreign key referencing `BankAccount.id`. Enables multi-account filtering. |
| `date` | `string` | ISO 8601 date (YYYY-MM-DD) of the transaction. Used for chronological sorting and date-range filtering. |
| `type` | `'credit' \| 'debit' \| 'transfer_in' \| 'transfer_out'` | Determines balance impact. `credit` increases balance (deposit, income deposited), `debit` decreases balance (withdrawal, payment). `transfer_in` and `transfer_out` are paired entries from inter-account transfers (see Transfer Model). |
| `amount` | `number` | **Numeric value (machine-parseable).** Expressed as a positive number regardless of type. The `type` field determines whether it adds to or subtracts from the balance. |
| `description` | `string` | Free-text memo (e.g., "Rent payment", "Salary deposit", "ATM withdrawal"). |
| `category` | `string` | Optional classification (e.g., "Income:Salary", "Expense:Rent", "Transfer"). Matches the Transaction category system for reconciliation. |
| `status` | `'imported' \| 'pending' \| 'cleared' \| 'reconciled'` | See Reconciliation Status below. |
| `reference` | `string` | External reference number (cheque number, transfer reference, transaction ID). Used for matching during reconciliation and deduplication on import. |
| `createdAt` | `string` | ISO 8601 timestamp when the entry was recorded in InsAcc. |
| `updatedAt` | `string` | ISO 8601 timestamp when the entry was last modified. Immutable for `reconciled` entries. |
| `createdBy` | `string` | User ID of the person who recorded the transaction. Enables audit trail. |
| `updatedBy` | `string` | User ID of the person who last modified the transaction. Enables audit trail. |

### Reconciliation Status

| Status | Description |
|---|---|
| `imported` | Entry was brought in from an external source (CSV, Excel, PDF, bank feed). Not yet reviewed by the user. Should be visually distinct (e.g., muted styling, pending badge). |
| `pending` | Entry was manually entered by the user or imported and reviewed. Represents a transaction that is expected to post but has not yet cleared the bank. |
| `cleared` | Entry has been confirmed by the bank statement. The bank has processed this transaction. This is the default status for manually-entered deposits and withdrawals. |
| `reconciled` | Entry has been matched to a corresponding `Transaction` record (from the Transactions module) during reconciliation. Once reconciled, the entry's `amount`, `date`, and `type` are locked. An explicit "un-reconcile" action must precede editing. |

### Why `amount` Must Be Numeric

The current implementation stores `amount` as a formatted display string (`"+AED 5,000"`). This is the single most constraining design flaw. A numeric `amount` enables:

- **Summation**: Compute total deposits, withdrawals, or net cash flow by period (`transactions.reduce((sum, t) => sum + t.amount, 0)`).
- **Balance derivation**: Current balance = opening balance + sum(credits) − sum(debits). Without numeric amounts, balance must remain a separate scalar that can drift out of sync.
- **Reconciliation**: Compare bank amounts with internal Transaction amounts. String comparison fails on formatting differences.
- **Export to structured formats**: CSV, Excel, QIF, OFX all require numeric amounts. Formatting should happen at the display layer only.
- **Multi-currency conversion**: Numeric amounts can be multiplied by exchange rates. Formatted strings cannot.
- **Reporting**: Charts (CashFlowChart), summaries, and aggregations all require numeric values.

### Comparison to Current Model

| Aspect | Current | Target |
|---|---|---|
| Model name | `StatementEntry` | `BankTransaction` |
| `amount` type | `string` (`"+AED 5,000"`) | `number` (e.g., `5000`) |
| Identification | Array index | Immutable `id` string (UUID) |
| Account binding | None (single account implicit) | `accountId` foreign key |
| Status | None | `imported \| pending \| cleared \| reconciled` |
| Reference | None | `reference` string |
| Category | None | `category` string |
| Audit trail | None | `createdAt`, `updatedAt`, `createdBy`, `updatedBy` |
| Sort strategy | Prepend on insert | Sort by `date` at read time |
| Formatting | Embedded in `amount` string | Applied at display layer (`currency + amount.toLocaleString()`) |

### Storage

Persisted as `insacc_bank_transactions` in localStorage — a `BankTransaction[]` array.

---

## Transfer Model

### How Transfers Work

A transfer moves money between two Bank Accounts. Unlike deposits or withdrawals, a transfer is **balance-neutral** at the portfolio level — it does not represent income or expense.

### Data Model

```typescript
interface Transfer {
  id: string
  fromAccountId: string
  toAccountId: string
  amount: number
  date: string
  description: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}
```

### Entry Generation

When a transfer is recorded, the system creates **two linked `BankTransaction` records**:

| Field | Debit Entry | Credit Entry |
|---|---|---|
| `accountId` | `fromAccountId` | `toAccountId` |
| `type` | `transfer_out` | `transfer_in` |
| `amount` | `amount` | `amount` |
| `description` | `"Transfer to {toAccountName}"` | `"Transfer from {fromAccountName}"` |
| `status` | `cleared` | `cleared` |

Both entries share a common `reference` value (the Transfer `id`) so they can be matched and reversed together.

### Balance Impact

```
Source account balance:  currentBalance -= amount
Destination account:     currentBalance += amount
Total portfolio cash:    unchanged
```

### UI Implications

A transfer requires selecting a source account, a destination account (different from source), an amount, and an optional description. The current "Transfer" quick action becomes a dialog with two account selectors instead of the current monolithic single-form approach.

---

## Balance Rules

### Formula

```
Current Balance = Opening Balance
                 + Sum of all credit entries
                 - Sum of all debit entries
                 + Sum of all transfer_in entries
                 - Sum of all transfer_out entries
```

Where:
- **Opening Balance**: Set once when the account is created. Never modified by transactions.
- **Deposits** (`type: 'credit'`, no linked transfer): Increase balance.
- **Withdrawals** (`type: 'debit'`, no linked transfer): Decrease balance.
- **Transfers In** (`type: 'transfer_in'`): Increase balance (cash moved from another account).
- **Transfers Out** (`type: 'transfer_out'`): Decrease balance (cash moved to another account).

### Derivation Rule

**`currentBalance` must always be derived from bank transactions, never stored as a separate scalar.**

The current implementation stores `balance` as an independent `usePersistedState<number>` that is manually incremented/decremented in `handleAction()`. This allows the balance to drift out of sync with the transaction entries. Under this architecture:

1. `BankAccount.currentBalance` is a **getter** — computed on read from `openingBalance + Σ(entry amounts by type)`.
2. Writing a bank transaction automatically updates the derived balance.
3. No `setBalance` call exists. No manual balance adjustment.
4. If a bank transaction is deleted, the balance self-corrects on the next read.

### Performance Consideration

For accounts with thousands of entries, the sum can be memoized (`useMemo`) or pre-computed on write. The initial implementation should compute on read; if performance becomes an issue (unlikely for localStorage volumes), a cached `cachedBalance` field can be updated atomically on each write.

---

## Source of Truth

The banking architecture establishes a strict data hierarchy. Each layer reads from the layer above it. No layer bypasses the chain.

```
BankTransaction
       ↓
Derived Account Balance
       ↓
Dashboard → Reports → Cash Flow → Analytics
```

### Rules

1. **`BankTransaction` is the single source of truth.** All movement of money is recorded as a `BankTransaction`. Every credit, debit, transfer, fee, interest posting, and correction is a transaction record.
2. **The Current Balance is derived from `BankTransaction` records.** It is computed as `openingBalance + Σ(credits) - Σ(debits)`. It is never stored as an independent value.
3. **Dashboard KPIs read from the derived balance.** The "Cash Balance" card, "This Month Net" breakdown, and any cash-related metric compute from `BankTransaction` data at read time.
4. **Reports query `BankTransaction` directly.** Account statements, cash flow reports, and reconciliation reports read the transaction list and derive their numbers. No intermediate cache is trusted.
5. **Cash Flow analytics derive from `BankTransaction` by date range.** Month-over-month, year-over-year, and trend calculations filter and aggregate `BankTransaction` records directly.
6. **Balances must never be edited manually.** There is no "set balance" operation. To correct a balance, the user adds a corrective `BankTransaction` entry with an appropriate description.

This hierarchy guarantees that every number in the system is auditable and reproducible. If two screens show a different balance, the root cause is always a query or filtering difference — never a stale or desynchronized scalar.

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────┐
│                  Bank Account                     │
│  (institution, accountName, currency, theme,     │
│   accountType, status, openingBalance)           │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│               Opening Balance                     │
│  Set once on account creation.                    │
│  Never modified by transactions.                  │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│              Bank Transactions                    │
│  Every credit, debit, transfer_in, transfer_out  │
│  Numeric amounts. Immutable IDs. Audited.        │
└───────────────┬─────────────────┬───────────────┘
                │                 │
                ▼                 ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│     Derived Balance      │  │   Transactions Module   │
│  openingBalance          │  │  (Income / Expense /    │
│  + Σ(credits)            │  │   Journal records)      │
│  - Σ(debits)             │  │                         │
│  = currentBalance        │  │    Reconciliation       │
│  (never persisted)       │  │    matches via          │
└──────────┬──────────────┘  │    reference + amount    │
           │                 └─────────────────────────┘
           ▼
┌──────────────────────────────────────────────────────┐
│                      Dashboard                        │
│  Cash Balance KPI    Cash Flow Chart    Per-Account   │
│  (aggregated)        (monthly trend)    mini-cards    │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│                      Reports                          │
│  Account Statement    Cash Flow Report                │
│  Reconciliation Rep.  Account Summary                 │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│            Investments & Purchase Ledger               │
│  Optional: create BankTransaction when recording      │
│  an investment purchase or ledger purchase            │
│  to keep cash balance in sync.                        │
└──────────────────────────────────────────────────────┘
```

---

## Business Rules

### Negative Balances

- **Checking and savings accounts**: Negative balances are allowed but should display a warning indicator. The system does not enforce a floor, as overdrafts are a real-world occurrence.
- **Cash accounts**: Balance must never go below zero. The system should prevent entries that would cause a negative cash balance.
- **Credit card accounts**: Negative balance is normal (represents debt). The balance display format should invert (positive balance = debt owed).

### Currency Handling

- Each `BankAccount` has a single `currency` field. All transactions for that account must use the same currency.
- Cross-currency transfers are out of scope for this architecture. If implemented later, they require exchange rate tables and a `convertedAmount` field on the entry.
- The application-level `currency` setting (from Settings) should be the default for new accounts but not override the per-account currency.

### Opening Balance

- Set once on account creation. Represents the actual bank balance at the time the account was added to InsAcc.
- Can be edited only if no bank transactions exist for that account. Once transactions exist, the opening balance is locked to prevent balance corruption.
- To correct an incorrect opening balance, users must add a corrective transaction (credit or debit) rather than editing the opening balance directly.

### Account Deletion

- Accounts are never hard-deleted. The `status` field controls visibility.
- To remove an account from active use, set `status: 'closed'` or `status: 'archived'`.
- If the last active account is set to a non-active status, the system should warn that no accounts will remain and prompt the user to create a new one or cancel.

### Archived Accounts

- An account with `status: 'archived'` is hidden from selectors and dashboards but its data is fully preserved.
- Archived accounts can be unarchived (restored to `status: 'active'`).
- No new transactions can be added to an archived account.
- Archived accounts appear in historical reports and reconciliation views.
- Archived accounts can be viewed in a separate "Archived Accounts" section if needed.

### Closed Accounts

- An account with `status: 'closed'` represents a real-world closure (bank account closed, wallet discontinued).
- Closed accounts cannot be reopened. They are permanently in read-only mode.
- All data is preserved. Transactions remain visible in historical reports.
- The status `closed` is a terminal state. There is no transition back to `active`.

### Hidden Accounts

- An account with `status: 'hidden'` is hidden from selectors and dashboards but remains fully functional.
- New transactions can be added programmatically (e.g., via import, API, or bank feed).
- Useful for accounts that receive infrequent transactions and should not clutter the default UI.
- Can be toggled back to `active` at any time.

### Transaction Deletion

- Deleting a `BankTransaction` removes it from the array. The derived balance adjusts automatically on next read.
- Deleted transactions are not recoverable. No soft-delete for transactions in this architecture (can be added later with an `isDeleted` flag if undo support is needed).
- Deleting one leg of a transfer (a `transfer_in` or `transfer_out` entry) should prompt the user to also delete the paired entry on the other account to prevent orphaned references.
- Transactions with `status: 'reconciled'` cannot be deleted. An explicit "un-reconcile" action must precede deletion.

### Editing Historical Entries

- `amount`, `date`, and `type` should be editable only within constraints:
  - Changing `type` from `credit` to `debit` inverts the balance impact.
  - Changing `amount` recalculates balance.
  - Changing `date` affects chronological ordering and date-range reports.
- `status` can be freely toggled between `imported`, `pending`, `cleared`, and `reconciled`.
- If a transaction has `status: 'reconciled'`, its `amount`, `date`, and `type` are **locked** to prevent reconciliation corruption. An explicit "un-reconcile" action must precede editing.
- `id`, `accountId`, `createdAt`, and `createdBy` are always immutable.
- `updatedAt` and `updatedBy` are updated automatically on every edit.

### Audit History

Every `BankAccount`, `BankTransaction`, and `Transfer` records who created it (`createdBy`) and who last modified it (`updatedBy`), along with timestamps. This audit trail is essential in financial software because:

- It provides accountability — every balance change is traceable to a user action.
- It supports compliance — auditors and regulators expect to see who recorded what and when.
- It enables rollback — if an erroneous entry is discovered, the audit trail shows who made it and when, enabling corrective action.
- It prevents disputes — users cannot claim they did not make a transaction if the audit trail attributes it to them.

---

## Future Features

### Multiple Bank Accounts

The `accountId` foreign key on `BankTransaction` and the `BankAccount[]` array enable unlimited accounts. The UI would add:
- An account selector (tabs or dropdown) to switch between accounts.
- An account management page (add/edit/archive/close accounts).
- An aggregate view showing all account balances in a single dashboard card.

The current `insacc_balance` scalar is replaced by a derived per-account balance. The `balance` prop and `setBalance` function are removed from `App.tsx`.

### Reconciliation

Reconciliation is the process of matching `BankTransaction` records (from the bank) to `Transaction` records (from InsAcc's Transactions module).

This architecture enables reconciliation through:
- **`status: 'reconciled'`** — marks a bank transaction as matched.
- **`reference` field** — stores the Transaction ID or external reference for the match.
- **`category` field** — enables automated matching by category (e.g., all entries with `category: 'Salary'` can be matched to Income transactions with the same category).
- **Reconciliation report** — compares `BankTransaction[]` with `Transaction[]` over a date range, showing matched, unmatched, and discrepant entries.

The reconciliation workflow:
1. User selects an account and a date range.
2. System shows bank transactions and internal transactions side by side.
3. User manually matches entries, or the system auto-matches by amount + date + reference.
4. Matched entries get `status: 'reconciled'` and store the Transaction `id` in `reference`.
5. Unmatched entries on either side are flagged for investigation.
6. A reconciliation report shows the final `clearedBalance` vs `bookBalance` and the difference.

### CSV Import

A CSV import feature would:
1. Accept a CSV file with columns: `Date, Description, Amount, Type, Reference`.
2. Parse the file and create `BankTransaction` records for the selected account.
3. Match imported entries to existing entries by `reference` or by amount+date to avoid duplicates.
4. Show a preview before confirming the import.
5. Imported entries start with `status: 'imported'` and require user review.

The numeric `amount` field makes CSV import trivially parsable. The current formatted-string `amount` would require brittle regex parsing per currency.

### Excel Import

Same as CSV import, but reads `.xlsx` files. The numeric `amount` field applies identically. Excel can be parsed on the Electron main process using a library like `xlsx` (oss) exposed via IPC, or in the renderer with a JS parser.

### PDF Statements

PDF statement import would:
1. Use an OCR or PDF text extraction library on the Electron main process.
2. Parse structured PDF bank statements into `BankTransaction[]`.
3. Handle bank-specific PDF formats with pluggable parsers.
4. Imported entries start with `status: 'imported'`.

This is a more complex feature but is enabled by the same data model. The numeric `amount` requirement is essential — PDF text extraction produces raw numbers, not formatted strings.

### Bank Feeds

Automated bank feed integration (via Plaid, Finicity, or direct API) is a future enhancement. The data model supports it:
- Entries from bank feeds would be created with `status: 'imported'`.
- On confirmation (manual or automatic), status changes to `cleared`.
- The `reference` field stores the bank's transaction ID for deduplication.

### Cash Dashboard

The Dashboard would gain:
- A **Cash Balance** KPI card showing sum of all active account balances.
- A **Cash Flow** section (separate from or combined with the existing Investment Cash Flow chart) showing account balance history over time.
- Per-account mini-cards in a "Bank Accounts" widget.
- Month-over-month cash change indicators.

The numeric `amount` model enables the `MonthlyCashFlow` data structure (currently used by `CashFlowChart.tsx`) to be derived from bank transactions, providing a complete cash picture alongside investment cash flow.

### Financial Reports

The existing Reports module would gain working sub-reports:
- **Account Statement**: Date range, all entries for an account, running balance column, totals.
- **Cash Flow Report**: Income vs expenses by period across all accounts.
- **Reconciliation Report**: Matched/unmatched entries between bank and book.
- **Account Summary**: Balances, activity, and trends per account.

All of these require numeric amounts, stable IDs, and the `accountId` relationship — exactly what this architecture provides.

---

## Final Rule

> ### Current Balance is a derived value.
>
> **It must never be persisted as the primary source of truth.**
>
> **It must never be manually edited.**
>
> The Current Balance is always computed from `Opening Balance + Σ(credits) − Σ(debits)` using the `BankTransaction` list. If the balance shown in the UI is incorrect, the fix is a corrective `BankTransaction` entry — never a direct balance override.

---

## Migration Plan

The migration must preserve all existing user data (current statement entries and balance) while transitioning to the new architecture.

### Step 1: Add `BankAccount[]` Storage

Create a new localStorage key `insacc_bank_accounts`. On first migration, if this key does not exist and `insacc_statement` has data, seed it with a single default account:

```typescript
[
  {
    id: 'ba-default',
    institution: 'Emirates Islamic Bank',
    accountName: 'Primary Account',
    accountNumber: '----',
    currency: 'AED',         // from user's current currency setting
    openingBalance: 0,
    accountType: 'checking',
    theme: 'emerald',
    icon: 'bank',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system-migration',
    updatedBy: 'system-migration',
  },
]
```

The existing `insacc_balance` value should become the derived balance for this default account. The `openingBalance` is set to `0` initially — the difference between `insacc_balance` and the sum of migrated transactions is a one-time corrective entry (see Step 3).

### Step 2: Migrate to `BankTransaction` Format

Current model:
```typescript
{ date: string, desc: string, amount: string, type: 'credit' | 'debit' }
```

Target model:
```typescript
{ id: string, accountId: string, date: string, type: 'credit' | 'debit', amount: number, description: string, category: string, status: 'cleared', reference: string, createdAt: string, updatedAt: string, createdBy: string, updatedBy: string }
```

Migration logic (run once):
```typescript
const migrated = oldStatement.map((entry, index) => ({
  id: `bt-${Date.now()}-${index}`,
  accountId: 'ba-default',
  date: entry.date,
  type: entry.type as 'credit' | 'debit',
  amount: parseAmount(entry.amount),  // extract numeric value from "+AED 5,000"
  description: entry.desc,
  category: '',
  status: 'cleared' as const,
  reference: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'system-migration',
  updatedBy: 'system-migration',
}))
```

New storage key: `insacc_bank_transactions`.

#### Parsing `parseAmount()`

The current `amount` format is `"{sign}{currency} {formattedNumber}"` (e.g., `"+AED 5,000"`, `"-AED 1,234"`). The parser:

1. Strip the sign character (`+` or `-`) — captured separately.
2. Strip the currency code and spaces — leaving `"5,000"` or `"1,234"`.
3. Remove commas (`,`).
4. Parse as float: `parseFloat("5000")`.
5. Apply sign: positive for `credit`, negative for `debit`. But since the model stores positive amounts with `type` determining sign, extract the absolute value.

```typescript
function parseAmount(formatted: string): number {
  const isDebit = formatted.startsWith('-')
  const cleaned = formatted.replace(/^[+-]\s*[A-Z]+\s*/, '').replace(/,/g, '')
  return Math.abs(parseFloat(cleaned))
}
```

This preserves the numeric value and discards the formatting.

### Step 3: Correct the Balance

The existing `insacc_balance` may not equal `openingBalance + Σ(transactions)`. The migration should:

1. Compute `derivedBalance` from the migrated transactions: `0 + Σ(credits) - Σ(debits)`.
2. Compare with the stored `insacc_balance`.
3. If they differ, insert a corrective transaction:
   ```typescript
   {
     id: `bt-correction-${Date.now()}`,
     accountId: 'ba-default',
     date: new Date().toISOString().split('T')[0],
     type: difference > 0 ? 'credit' : 'debit',
     amount: Math.abs(difference),
     description: 'Balance correction (migration)',
     category: '',
     status: 'cleared',
     reference: 'migration-v2',
     createdAt: new Date().toISOString(),
     updatedAt: new Date().toISOString(),
     createdBy: 'system-migration',
     updatedBy: 'system-migration',
   }
   ```
4. The derived balance now matches `insacc_balance`.
5. The old `insacc_balance` key is no longer read. It can be removed in a later schema version.

### Step 4: Remove Scalar Balance

After migration, `balance` and `setBalance` are no longer passed as props from `App.tsx`. `BankAccounts.tsx` computes `currentBalance` on render:

```typescript
const currentBalance = useMemo(() => {
  const account = accounts.find(a => a.id === selectedAccountId)
  if (!account) return 0
  const transactions = bankTransactions.filter(t => t.accountId === selectedAccountId)
  const credits = transactions.filter(t => t.type === 'credit' || t.type === 'transfer_in')
    .reduce((sum, t) => sum + t.amount, 0)
  const debits = transactions.filter(t => t.type === 'debit' || t.type === 'transfer_out')
    .reduce((sum, t) => sum + t.amount, 0)
  return account.openingBalance + credits - debits
}, [accounts, bankTransactions, selectedAccountId])
```

### Step 5: Migrate Local State

The local `useState` calls in `BankAccounts.tsx` remain unchanged (`action`, `formAmount`, `formDesc`, `toast`). The `handleAction` function is updated to:

1. Create a structured `BankTransaction` with `id`, `accountId`, numeric `amount`, audit fields, etc.
2. Call `setBankTransactions(prev => [newEntry, ...prev])`.
3. Remove the `setBalance` call entirely — balance is derived.

### Step 6: Backward Compatibility

The migration must be **non-destructive**:

- Old `insacc_balance` key is read but **not deleted** during migration. It can be removed in a later schema version bump.
- Old `insacc_statement` key is read, migrated in memory, and written to the new `insacc_bank_transactions` key. The old key is preserved but no longer read.
- Migration runs once when the app detects the schema version change. A new `CLEAR_VERSION` constant (from `v7` to `v8`) triggers the migration logic in `App.tsx`.
- If migration fails partway, the old data remains untouched. The migration should be transactional in nature — either all entries migrate, or none do.

### Schema Version Change

- Increment `CLEAR_VERSION` from `7` to `8` in `App.tsx`.
- Add a migration function `migrateV7toV8()` that runs before the existing version-check clear logic.
- The migration function reads old keys, transforms data, writes new keys, and sets the new version.
- If the migration succeeds, the version check passes and data loads normally.
- If the migration function is absent (e.g., old code), the version check clears data as before — no corruption.

---

## Summary

| Area | Current | Target |
|---|---|---|
| Accounts | Single hardcoded | Multi-account, user-managed |
| Balance | Scalar `usePersistedState<number>` | Derived from transactions + opening balance |
| Entry ID | Array index | Immutable UUID `id` |
| Amount | Formatted string (`"+AED 5,000"`) | Numeric (`5000`) |
| Account binding | Implicit (single account) | Explicit (`accountId` FK) |
| Status | None | `imported \| pending \| cleared \| reconciled` |
| Category | None | Category string for reconciliation |
| Audit trail | None | `createdAt`, `updatedAt`, `createdBy`, `updatedBy` |
| Transfers | Cosmetic (same as withdrawal) | Paired entries across two accounts |
| Export | Plain text (hardcoded format) | CSV / structured via export utility |
| Reconciliation | Impossible | Enabled by status + reference + category |
| Dashboard | No cash KPI | Aggregated cash + per-account cards |
| Reports | Placeholder content | Account statements, cash flow, reconciliation reports |
