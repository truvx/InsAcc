# InsAcc Double-Entry Accounting Engine Specification

**Document ID:** ACCOUNTING_ENGINE_SPECIFICATION.md  
**Version:** 1.0.0  
**Status:** Official Accounting Engine Specification  
**Release Date:** 2026-07-22  
**Target Software:** InsAcc Enterprise Asset & Investment Accounting Platform v1.0.0  
**Single Source of Truth Reference:** [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)

---

> [!IMPORTANT]
> **GOVERNANCE DIRECTIVE**: This document defines the exact accounting rules, journal entries, posting algorithms, voucher lifecycle states, and financial statement calculation rules implemented in the InsAcc codebase (`src/renderer/accounting/`). All developer code, tests, and user documentation MUST adhere strictly to this specification.

---

## Table of Contents

1. [Engine Architecture & Core Principles](#1-engine-architecture--core-principles)
2. [Chart of Accounts Architecture](#2-chart-of-accounts-architecture)
3. [Voucher State Machine & Rules](#3-voucher-state-machine--rules)
4. [Voucher Types Specification](#4-voucher-types-specification)
   - [4.1 Receipt Voucher (RV)](#41-receipt-voucher-rv)
   - [4.2 Payment Voucher (PV)](#42-payment-voucher-pv)
   - [4.3 Journal Voucher (JV)](#43-journal-voucher-jv)
   - [4.4 Contra Voucher (CV)](#44-contra-voucher-cv)
5. [Domain Event Accounting Rules](#5-domain-event-accounting-rules)
   - [5.1 PDC Cheque Lifecycle Workflow](#51-pdc-cheque-lifecycle-workflow)
   - [5.2 Property Lease & Security Deposit Accounting](#52-property-lease--security-deposit-accounting)
   - [5.3 Investment Portfolio Accounting](#53-investment-portfolio-accounting)
   - [5.4 Physical Asset & Purchase Ledger Accounting](#54-physical-asset--purchase-ledger-accounting)
   - [5.5 Asset Depreciation Accounting](#55-asset-depreciation-accounting)
6. [Financial Statement Calculation Engines](#6-financial-statement-calculation-engines)
   - [6.1 General Ledger & Sub-Ledger Projection Engine](#61-general-ledger--sub-ledger-projection-engine)
   - [6.2 Trial Balance Calculation Engine](#62-trial-balance-calculation-engine)
   - [6.3 Profit & Loss Statement Calculation Engine](#63-profit--loss-statement-calculation-engine)
   - [6.4 Balance Sheet Calculation Engine](#64-balance-sheet-calculation-engine)
7. [Opening Balances, Closing Entries & Year-End Closing](#7-opening-balances-closing-entries--year-end-closing)
8. [Audit Trail & Operational Log Requirements](#8-audit-trail--operational-log-requirements)

---

## 1. Engine Architecture & Core Principles

InsAcc operates an **event-driven, double-entry general ledger accounting engine**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Domain Accounting Event                            │
│ (INVESTMENT_PURCHASE / RENT_COLLECTED / PDC_CLEARED / PROPERTY_EXPENSE) │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 Posting Rules Resolver (`postingRules.ts`)               │
│               Resolves Debit Account and Credit Account Rules           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 Voucher Factory (`voucherService.ts`)                   │
│              Generates Draft Voucher (RV-2026-XXXX)                      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│             Posting Validator (`postingValidator.ts`)                   │
│             Asserts |Σ Debits - Σ Credits| < 0.001                      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               Ledger Service (`ledgerService.ts`)                       │
│    Posts Voucher to General Ledger & Invalidates Balance Caches         │
└─────────────────────────────────────────────────────────────────────────┘
```

### The Inviolable Core Principles
1. **Mathematical Balance Equality**: Every voucher posted to the General Ledger MUST satisfy:
   $$\sum \text{Debits} = \sum \text{Credits}$$
2. **Immutability of Posted Vouchers**: Once a voucher transitions to `Posted` status, its lines, amounts, dates, and account codes are permanently locked. Corrections MUST be executed via an explicit Reversal Voucher (`reverseVoucher()`).
3. **Derived Balance Rule**: Account balances are NEVER stored as independent, manually editable scalars. Balances are derived dynamically on read:
   $$\text{Current Balance} = \text{Opening Balance} + \sum \text{Debits} - \sum \text{Credits}$$

---

## 2. Chart of Accounts Architecture

The system Chart of Accounts (`src/renderer/accounting/chartOfAccountsService.ts`) organizes accounts into five standard categories:

| Category Range | Category Name | Account Type | Normal Balance | Increases With | Decreases With |
|---|---|---|---|---|---|
| **1000 – 1999** | **Assets** | Asset | Debit ($D$) | Debit | Credit |
| **2000 – 2999** | **Liabilities** | Liability | Credit ($C$) | Credit | Debit |
| **3000 – 3999** | **Equity** | Equity | Credit ($C$) | Credit | Debit |
| **4000 – 4999** | **Revenue** | Revenue | Credit ($C$) | Credit | Debit |
| **5000 – 5999** | **Expenses** | Expense | Debit ($D$) | Debit | Credit |

### System Reserved Account Registry (`systemAccountRegistry.ts`)
```typescript
export const SystemAccountRegistry = {
  CASH: '1110',               // Cash on Hand
  BANK: '1120',               // Bank Accounts (Parent Group)
  RENT_RECEIVABLE: '1130',    // Tenant Rent Receivable
  PDC_HELD: '1410',           // Post-Dated Cheques Held
  UNEARNED_RENT: '2110',      // Unearned / Deferred Rental Income
  SECURITY_DEPOSITS: '2120',  // Tenant Security Deposit Liability
  OWNER_CAPITAL: '2200',     // Owner Equity / Retained Earnings
  DIVIDEND_INCOME: '4110',    // Investment Dividends & Interest
  RENTAL_REVENUE: '4120',     // Earned Property Rental Revenue
  PROPERTY_EXPENSE: '5110',   // Property Maintenance Expense
  DEPRECIATION_EXP: '5190',   // Depreciation Expense
  ACCUMULATED_DEP: '1290',    // Accumulated Depreciation (Contra-Asset)
} as const
```

---

## 3. Voucher State Machine & Rules

Every voucher progresses through a formal 5-state lifecycle (`src/renderer/accounting/types.ts`):

```
              ┌──────────────┐
              │ Draft State  │
              └──────┬───────┘
                     │
         [ Action: Approve Voucher ]
                     │
                     ▼
              ┌──────────────┐
              │Approved State│
              └──────┬───────┘
                     │
          [ Action: Post Voucher ]
                     │
                     ▼
              ┌──────────────┐
              │ Posted State │ ──► (Immutable General Ledger Entry)
              └──────┬───────┘
                     │
         [ Action: Reverse Voucher ]
                     │
                     ▼
              ┌──────────────┐
              │Reversed State│ ──► (Generates Reversal Voucher)
              └──────────────┘
```

### State Definitions & Rules
1. **`Draft`**: Newly created voucher. Line amounts and accounts can be edited freely. Does NOT affect account balances.
2. **`Approved`**: Verified by supervisor. Pending ledger posting. Line items locked. Does NOT affect account balances.
3. **`Posted`**: Committed to General Ledger. Modifies derived account balances. Immutable.
4. **`Cancelled`**: Voided prior to posting. Preserved for audit sequence continuity.
5. **`Reversed`**: A posted voucher that has been offset by a corresponding Reversal Voucher.

---

## 4. Voucher Types Specification

### 4.1 Receipt Voucher (RV)
- **Purpose**: Record incoming money (cash deposits, bank receipts, tenant payments, dividend payouts).
- **Business Rule**: Must contain at least one Debit entry to Cash (`1110`) or Bank (`1120`), and one or more Credit entries to Revenue, Asset, or Liability accounts.
- **Journal Entry Pattern**:
  - $\text{Debit: Bank / Cash Account (1120 / 1110)}$ $\rightarrow$ $\$X$
  - $\text{Credit: Revenue / Asset / Liability Account}$ $\rightarrow$ $\$X$
- **Example**: Received AED 15,000 rent payment deposited into Emirates Islamic Bank.
  - $\text{Debit: 1120.001 Emirates Islamic Bank} = \text{AED 15,000}$
  - $\text{Credit: 2110 Unearned Rent Liability} = \text{AED 15,000}$
- **Validation**: `postingValidator.ts` verifies $\sum \text{Debits} = \sum \text{Credits}$ and asserts Bank/Cash debit presence.
- **Error Cases**: Unbalanced lines, selecting a closed account, negative line amounts.
- **Developer Notes**: Handled in UI via `InvestmentReceiptVoucher.tsx` and `PropertyReceiptVoucher.tsx`. Calls `voucherService.createVoucher()`.

---

### 4.2 Payment Voucher (PV)
- **Purpose**: Record outgoing money disbursements (vendor invoices, property repairs, asset purchases).
- **Business Rule**: Must contain at least one Credit entry to Cash (`1110`) or Bank (`1120`), and one or more Debit entries to Expense, Asset, or Liability accounts.
- **Journal Entry Pattern**:
  - $\text{Debit: Expense / Asset / Liability Account}$ $\rightarrow$ $\$X$
  - $\text{Credit: Bank / Cash Account (1120 / 1110)}$ $\rightarrow$ $\$X$
- **Example**: Paid AED 3,500 maintenance bill to Al Mas Plumbing from ADCB Bank.
  - $\text{Debit: 5110 Property Maintenance Expense} = \text{AED 3,500}$
  - $\text{Credit: 1120.002 ADCB Bank} = \text{AED 3,500}$
- **Validation**: Asserts $\sum D = \sum C > 0$ and presence of bank/cash credit line.
- **Error Cases**: Overdrawing non-overdraft accounts, missing expense sub-account.
- **Developer Notes**: Implemented in `InvestmentPaymentVoucher.tsx` and `PropertyPaymentVoucher.tsx`.

---

### 4.3 Journal Voucher (JV)
- **Purpose**: Record non-cash accounting adjustments, accruals, depreciation, PDC clearance, and period closing entries.
- **Business Rule**: Multi-line general journal entries allowing arbitrary accounts. Total debits must equal total credits.
- **Journal Entry Pattern**:
  - $\text{Debit: Account A}$ $\rightarrow$ $\$X$
  - $\text{Credit: Account B}$ $\rightarrow$ $\$X$
- **Example**: Recognize monthly earned rental revenue of AED 10,000 from deferred unearned rent.
  - $\text{Debit: 2110 Unearned Rent Liability} = \text{AED 10,000}$
  - $\text{Credit: 4120 Rental Revenue} = \text{AED 10,000}$
- **Validation**: Strict balance check ($\left| \sum D - \sum C \right| < 0.001$).
- **Error Cases**: Single-line entry, unbalanced debits/credits.
- **Developer Notes**: Managed via `InvestmentJournalVoucher.tsx` and `PropertyJournalVoucher.tsx`.

---

### 4.4 Contra Voucher (CV)
- **Purpose**: Record internal fund transfers between cash and bank accounts without affecting revenue or expense accounts.
- **Business Rule**: All debit and credit lines must be restricted to Asset accounts of type `Cash` (`1110`) or `Bank` (`1120`).
- **Journal Entry Pattern**:
  - $\text{Debit: Destination Bank / Cash Account}$ $\rightarrow$ $\$X$
  - $\text{Credit: Source Bank / Cash Account}$ $\rightarrow$ $\$X$
- **Example**: Transfer AED 50,000 cash from Petty Cash Vault to Emirates Islamic Bank.
  - $\text{Debit: 1120.001 Emirates Islamic Bank} = \text{AED 50,000}$
  - $\text{Credit: 1110 Petty Cash Vault} = \text{AED 50,000}$
- **Validation**: Asserts all line account codes belong to `1110` or `1120` series.
- **Error Cases**: Including revenue or expense accounts in a contra transfer.
- **Developer Notes**: Handled in `bankTransactionService.ts` inter-account transfer handlers.

---

## 5. Domain Event Accounting Rules

### 5.1 PDC Cheque Lifecycle Workflow

Post-Dated Cheques (PDC) progress through a strict 5-stage accounting lifecycle:

```
[ Received ] ──► [ Deposited ] ──┬──► [ Cleared ] (Revenue Recognized)
                                 │
                                 └──► [ Bounced ] ──┬──► [ Replaced ]
                                                    │
                                                    └──► [ Cancelled ]
```

#### Event 1: `PDC_RECEIVED` (Lease Signing)
- **Purpose**: Record receipt of post-dated cheque from tenant upon lease contract signing.
- **Business Rule**: Holds cheque in safe vault. Recognizes liability for unearned future rent.
- **Journal Entry**:
  - $\text{Debit: 1410 Post-Dated Cheques Held (Asset)} = \text{Face Value}$
  - $\text{Credit: 2110 Unearned Rent (Liability)} = \text{Face Value}$
- **Example**: Received 4 quarterly cheques of AED 30,000 each (Total AED 120,000).
  - $\text{Debit: 1410 PDC Held} = \text{AED 120,000}$
  - $\text{Credit: 2110 Unearned Rent} = \text{AED 120,000}$
- **Validation**: Maturity date must be in the future.
- **Developer Notes**: Executed in `propertyPdcService.ts` during lease creation.

#### Event 2: `PDC_DEPOSITED` (Maturity Date Reached)
- **Purpose**: Send cheque to bank for collection.
- **Business Rule**: Updates internal tracking status from `Received` to `Deposited`.
- **Journal Entry**: Memo status entry; no net balance change until cleared.
- **Developer Notes**: Managed via `PropertyPdcManager.tsx`.

#### Event 3: `PDC_CLEARED` (Funds Confirmed by Bank)
- **Purpose**: Recognize cleared cash and convert unearned rent to earned rental revenue.
- **Business Rule**: Bank balance increases; PDC held asset decreases. Unearned rent liability decreases; rental revenue increases.
- **Journal Entry**:
  - $\text{Debit: 1120 Bank Account (Asset)} = \text{Cheque Amount}$
  - $\text{Credit: 1410 PDC Held (Asset)} = \text{Cheque Amount}$
  - $\text{Debit: 2110 Unearned Rent (Liability)} = \text{Cheque Amount}$
  - $\text{Credit: 4120 Rental Revenue (Revenue)} = \text{Cheque Amount}$
- **Example**: Cheque 1 (AED 30,000) clears successfully.
  - $\text{Debit: 1120.001 Emirates Islamic Bank} = \text{AED 30,000}$
  - $\text{Credit: 1410 PDC Held} = \text{AED 30,000}$
  - $\text{Debit: 2110 Unearned Rent} = \text{AED 30,000}$
  - $\text{Credit: 4120 Rental Revenue} = \text{AED 30,000}$
- **Validation**: Cheque status must be `Deposited`.
- **Developer Notes**: Triggered via `transitionPdcCheque(chequeId, 'Cleared')`.

#### Event 4: `PDC_BOUNCED` (Cheque Rejected)
- **Purpose**: Record bank rejection of a deposited cheque (insufficient funds).
- **Business Rule**: Reverses deposit and transfers balance to tenant Rent Receivable (`1130`).
- **Journal Entry**:
  - $\text{Debit: 1130 Rent Receivable (Asset)} = \text{Cheque Amount}$
  - $\text{Credit: 1410 PDC Held (Asset)} = \text{Cheque Amount}$
- **Developer Notes**: Executed via `propertyPdcService.ts` bounced cheque handler.

---

### 5.2 Property Lease & Security Deposit Accounting

#### Event 1: `SECURITY_DEPOSIT_RECEIVED`
- **Purpose**: Record tenant security deposit payment.
- **Business Rule**: Security deposits are fiduciary liabilities owed back to the tenant upon lease termination.
- **Journal Entry**:
  - $\text{Debit: 1120 Bank Account (Asset)} = \text{Deposit Amount}$
  - $\text{Credit: 2120 Tenant Security Deposits (Liability)} = \text{Deposit Amount}$
- **Developer Notes**: Managed in `propertyDepositService.ts`.

#### Event 2: `SECURITY_DEPOSIT_REFUNDED`
- **Purpose**: Refund security deposit to tenant upon move-out inspection.
- **Business Rule**: Reduces deposit liability and bank balance. Deducts damages if applicable.
- **Journal Entry**:
  - $\text{Debit: 2120 Tenant Security Deposits (Liability)} = \text{Full Deposit}$
  - $\text{Credit: 1120 Bank Account (Asset)} = \text{Refund Amount}$
  - $\text{Credit: 5110 Maintenance Expense (Repair Offset)} = \text{Damage Deductions}$

---

### 5.3 Investment Portfolio Accounting

#### Event 1: `INVESTMENT_PURCHASE`
- **Purpose**: Record purchase of stocks, bonds, or mutual funds.
- **Business Rule**: Capitalizes purchase cost (quantity $\times$ price + fees) into Asset account.
- **Journal Entry**:
  - $\text{Debit: 1200 Investment Assets (Asset)} = \text{Total Cost Basis}$
  - $\text{Credit: 1120 Bank Account (Asset)} = \text{Total Cost Basis}$
- **Developer Notes**: Executed via `investmentAccountingService.ts`.

#### Event 2: `INVESTMENT_DIVIDEND`
- **Purpose**: Record dividend or coupon interest received.
- **Business Rule**: Recognizes investment revenue without reducing asset principal cost basis.
- **Journal Entry**:
  - $\text{Debit: 1120 Bank Account (Asset)} = \text{Dividend Amount}$
  - $\text{Credit: 4110 Dividend & Interest Income (Revenue)} = \text{Dividend Amount}$

---

### 5.4 Physical Asset & Purchase Ledger Accounting

- **Purpose**: Track physical bullion bars, gold coins, and physical commodities.
- **Business Rule**: Purchases are recorded in `insacc_purchases`. Weighted average cost per unit is calculated dynamically:
  $$\text{Weighted Avg Cost} = \frac{\sum (\text{Lot Qty}_i \times \text{Lot Price}_i)}{\sum \text{Lot Qty}_i}$$
- **Developer Notes**: Service functions in `purchaseAccountingService.ts` and `purchaseLedgerService.ts`.

---

### 5.5 Asset Depreciation Accounting

- **Purpose**: Record periodic depreciation of fixed physical assets or real estate improvements.
- **Business Rule**: Depreciates asset over useful life using straight-line method:
  $$\text{Monthly Depreciation} = \frac{\text{Historical Cost} - \text{Salvage Value}}{\text{Useful Life Months}}$$
- **Journal Entry**:
  - $\text{Debit: 5190 Depreciation Expense (Expense)} = \text{Monthly Depreciation}$
  - $\text{Credit: 1290 Accumulated Depreciation (Contra-Asset)} = \text{Monthly Depreciation}$

---

## 6. Financial Statement Calculation Engines

### 6.1 General Ledger & Sub-Ledger Projection Engine
- **Source**: `ledgerService.ts`
- **Function**: Queries all `Posted` vouchers and calculates chronological running balance for every account:
  $$\text{Running Balance}_t = \text{Running Balance}_{t-1} + \text{Debit}_t - \text{Credit}_t$$

### 6.2 Trial Balance Calculation Engine
- **Source**: `src/renderer/components/TrialBalanceTree.tsx` / `reportService.ts`
- **Function**: Sums closing debit and credit balances across all active accounts:
  $$\sum \text{Closing Debits} = \sum \text{Closing Credits}$$

### 6.3 Profit & Loss Statement Calculation Engine
- **Source**: `reportService.ts` (`calculateFinancialSummary()`)
- **Formulas**:
  - $\text{Total Revenue} = \sum \text{Account Balances (4000-4999)}$
  - $\text{Total Expense} = \sum \text{Account Balances (5000-5999)}$
  - $\text{Net Profit / (Loss)} = \text{Total Revenue} - \text{Total Expense}$

### 6.4 Balance Sheet Calculation Engine
- **Source**: `reportService.ts`
- **Fundamental Accounting Equation**:
  $$\text{Total Assets} = \text{Total Liabilities} + \text{Total Equity} + \text{Net Profit}$$
  Where:
  - $\text{Total Assets} = \sum \text{Account Balances (1000-1999)}$
  - $\text{Total Liabilities} = \sum \text{Account Balances (2000-2999)}$
  - $\text{Total Equity} = \sum \text{Account Balances (3000-3999)}$

---

## 7. Opening Balances, Closing Entries & Year-End Closing

### Year-End Fiscal Closing Pipeline (`periodCloser.ts` / `PeriodClosingWizard.tsx`)

At the close of a fiscal year, the system executes the following steps:

1. **Lock Fiscal Period**: Set period status to `Closed`. Prevent new voucher postings in period range.
2. **Generate Year-End Closing Journal Voucher**:
   - Zero out all Revenue accounts (`4000-4999`):
     - $\text{Debit: Revenue Accounts}$ $\rightarrow$ Full Balance
   - Zero out all Expense accounts (`5000-5999`):
     - $\text{Credit: Expense Accounts}$ $\rightarrow$ Full Balance
   - Net difference transferred to Owner Equity / Retained Earnings (`2200`):
     - $\text{Credit (if Profit) / Debit (if Loss): 2200 Retained Earnings}$
3. **Carry Forward Opening Balances**:
   - Asset, Liability, and Equity balances carry forward as Opening Balances for the new fiscal year.
   - Revenue and Expense opening balances reset to `0.00`.

---

## 8. Audit Trail & Operational Log Requirements

InsAcc mandates complete audit accountability for all financial events (`auditService.ts`):

```typescript
export interface LogEntry {
  id: string              // Unique log identifier
  timestamp: string       // ISO 8601 UTC timestamp
  user: string            // User ID / Name executing action
  action: string          // Operational action (e.g. "VOUCHER_POSTED")
  details: string         // Detailed description of change
}
```

### Immutable Audit Rules:
- Every voucher state change (`Draft` $\rightarrow$ `Approved` $\rightarrow$ `Posted` $\rightarrow$ `Reversed`) writes a non-deletable `LogEntry` to `insacc_logs`.
- Reversal vouchers preserve the original voucher ID in `reference` for audit tracing.
- Audit logs cannot be cleared or modified by non-admin users.

---

*End of Double-Entry Accounting Engine Specification.*
