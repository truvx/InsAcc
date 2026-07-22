---
title: "Volume 03: System Administrator Guide - Chapter 03: Chart of Accounts Management"
document_id: "INSACC-DOC-V03-CH03"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 03: InsAcc System Administrator Guide
## Chapter 03: Chart of Accounts Management

> **Single Source of Truth Reference**: All account taxonomy, reserved account codes, and double-entry rules defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

---

## Revision History

| Version | Release Date | Primary Author | Summary of Changes | Approved By |
|---|---|---|---|---|
| 1.0.0 | 2026-07-22 | Lead Enterprise Documentation Architect | Initial publication-grade enterprise release | Chief Architecture Review Board |

---

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Scope](#2-scope)
- [3. Audience](#3-audience)
- [4. Prerequisites](#4-prerequisites)
- [5. Warnings & Operational Hazards](#5-warnings--operational-hazards)
- [6. Notes & Architecture Context](#6-notes--architecture-context)
- [7. Main Content](#7-main-content)
  - [7.1 The Five Primary Account Categories & Normal Balances](#71-the-five-primary-account-categories--normal-balances)
  - [7.2 The System Reserved Account Registry (`systemAccountRegistry.ts`)](#72-the-system-reserved-account-registry-systemaccountregistryts)
  - [7.3 Hierarchical Account Tree Structure (`TrialBalanceTree.tsx`)](#73-hierarchical-account-tree-structure-trialbalancetreetsex)
  - [7.4 Adding and Editing Custom General Ledger Accounts](#74-adding-and-editing-custom-general-ledger-accounts)
  - [7.5 Account Deactivation & Archival Rules](#75-account-deactivation--archival-rules)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter provides system administrators with detailed rules and operational procedures for managing the Chart of Accounts (COA) in InsAcc. It details the five primary account categories, reserved system account codes, hierarchical tree nodes, and rules for creating custom general ledger accounts.

---

## 2. Scope

This specification covers:
- Account category taxonomy (`1000` Assets, `2000` Liabilities, `3000` Equity, `4000` Revenue, `5000` Expenses).
- Reserved account codes registered in `systemAccountRegistry.ts`.
- Hierarchical account tree rendering (`TrialBalanceTree.tsx` & `TreeView.tsx`).
- Parent header nodes vs child posting nodes.
- Account management service functions in `chartOfAccountsService.ts`.

Out of Scope:
- Double-entry voucher posting mechanics (covered in [Volume 04 Chapter 07](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_07_Double_Entry_Voucher_Operations.md)).
- Double-entry engine posting validator rules (covered in [Volume 06 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_02_Double_Entry_Accounting_Engine.md)).

---

## 3. Audience

This document is authored for:
- Chief Accountants and System Administrators
- Financial Controllers and General Ledger Managers
- ERP Implementation Consultants

---

## 4. Prerequisites

Before modifying the Chart of Accounts:
1. Log in to InsAcc with `Admin` privileges.
2. Understand normal account balances specified in [MASTER_ARCHITECTURE.md#103-primary-system-account-codes](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md#103-primary-system-account-codes).

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **RESERVED SYSTEM ACCOUNT CODE MODIFICATION**: System account codes registered in `systemAccountRegistry.ts` (e.g., `1110`, `1120`, `1130`, `1410`, `2110`, `2120`, `4120`) are hard-coded into automated posting rules (`postingRules.ts`). Deleting or re-numbering reserved system accounts will cause automated voucher generation to fail.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Parent Header vs Posting Nodes**: Parent header accounts (e.g., `1100 Current Assets`, `1120 Bank Accounts`) act strictly as structural aggregation nodes. Users CANNOT post vouchers directly to parent header accounts. Vouchers MUST target child posting accounts (e.g., `1120.001 Emirates Islamic Bank`).

---

## 7. Main Content

### 7.1 The Five Primary Account Categories & Normal Balances

Every account in InsAcc belongs to one of five primary financial categories:

```
                                 System Chart of Accounts
                                            │
     ┌──────────────┬──────────────┬────────┴─────┬──────────────┐
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
1000 Assets    2000 Liab.     3000 Equity    4000 Revenue   5000 Expenses
(Debit Norm)  (Credit Norm)  (Credit Norm)  (Credit Norm)   (Debit Norm)
```

| Category Code Range | Category Name | Normal Balance | Increases With | Decreases With | Financial Statement Assignment |
|---|---|---|---|---|---|
| **1000 – 1999** | **Assets** | Debit ($D$) | Debit | Credit | Balance Sheet (Assets) |
| **2000 – 2999** | **Liabilities** | Credit ($C$) | Credit | Debit | Balance Sheet (Liabilities) |
| **3000 – 3999** | **Equity** | Credit ($C$) | Credit | Debit | Balance Sheet (Equity) |
| **4000 – 4999** | **Revenue** | Credit ($C$) | Credit | Debit | Profit & Loss (Income) |
| **5000 – 5999** | **Expenses** | Debit ($D$) | Debit | Credit | Profit & Loss (Expenses) |

---

### 7.2 The System Reserved Account Registry (`systemAccountRegistry.ts`)

Reserved system account codes are registered in `systemAccountRegistry.ts`:

```typescript
export const SystemAccountRegistry = {
  CASH: '1110',               // Cash on Hand
  BANK: '1120',               // Bank Accounts (Parent Group)
  RENT_RECEIVABLE: '1130',    // Tenant Rent Receivable
  PDC_HELD: '1410',           // Post-Dated Cheques Held
  UNEARNED_RENT: '2110',      // Unearned / Deferred Rental Income
  SECURITY_DEPOSITS: '2120',  // Tenant Security Deposit Liability
  OWNER_CAPITAL: '2200',     // Owner Equity / Retained Earnings
  DIVIDEND_INCOME: '4110',    // Investment Dividend Income
  RENTAL_REVENUE: '4120',     // Property Rental Revenue
  PROPERTY_EXPENSE: '5110',   // Property Maintenance Expense
  DEPRECIATION_EXP: '5190',   // Asset Depreciation Expense
  ACCUMULATED_DEP: '1290',    // Accumulated Depreciation (Contra-Asset)
} as const
```

---

### 7.3 Hierarchical Account Tree Structure (`TrialBalanceTree.tsx`)

Accounts are rendered as a collapsible tree in `TrialBalanceTree.tsx`:

```
1000 Assets (Category Group Header)
  ├── 1100 Current Assets (Parent Header Node)
  │     ├── 1110 Cash on Hand (Posting Node)
  │     ├── 1120 Bank Accounts (Parent Group Header)
  │     │     ├── 1120.001 Emirates Islamic Bank (Posting Node)
  │     │     └── 1120.002 ADCB Operations Bank (Posting Node)
  │     ├── 1130 Rent Receivable (Posting Node)
  │     └── 1410 PDC Cheques Held (Posting Node)
  └── 1200 Fixed & Investment Assets (Parent Header Node)
        ├── 1210 Real Estate Property (Posting Node)
        └── 1290 Accumulated Depreciation (Contra-Asset Posting Node)
```

---

### 7.4 Adding and Editing Custom General Ledger Accounts

Administrators add custom posting sub-accounts via **Chart of Accounts**:

```
Open COA View ──► Select Parent Node ──► Click [+ Add Sub-Account] ──► Save Node
```

1. Navigate to **Chart of Accounts**.
2. Select the target parent group (e.g., `5100 Operating Expenses`).
3. Click **+ Add Sub-Account**.
4. Enter account details:
   - **Account Code**: Must follow parent code prefixing (e.g., `5100.005`).
   - **Account Name**: Descriptive title (e.g., `Elevator Maintenance`).
   - **Account Type**: Inherits parent type (`Expense`).
5. Click **Save Account**. `chartOfAccountsService.ts` validates code uniqueness and attaches the node to the account tree.

---

### 7.5 Account Deactivation & Archival Rules

- Accounts with **active transactions or non-zero balances** CANNOT be deleted.
- An account with zero balance can be set to `is_active = false`. Deactivated accounts are hidden from voucher selection drop-downs while maintaining historical report integrity.

---

## 8. Summary

The Chart of Accounts organizes InsAcc financial accounting into a 5-category tree structure. By combining reserved system account codes for automated event posting with customizable sub-accounts for business granularity, InsAcc ensures financial integrity and reporting precision.

---

## 9. Chapter Appendix

### Standard System Chart of Accounts Registry Table

| Account Code | Account Name | Category | Node Type | Normal Balance |
|---|---|---|---|---|
| `1110` | Cash on Hand | Asset | Posting | Debit |
| `1120` | Bank Accounts | Asset | Parent Header | Debit |
| `1120.001` | Emirates Islamic Bank | Asset | Posting | Debit |
| `1130` | Rent Receivable | Asset | Posting | Debit |
| `1410` | PDC Cheques Held | Asset | Posting | Debit |
| `2110` | Unearned Rent Liability | Liability | Posting | Credit |
| `2120` | Tenant Security Deposits | Liability | Posting | Credit |
| `2200` | Owner's Capital / Equity | Equity | Posting | Credit |
| `4110` | Dividend & Interest Income | Revenue | Posting | Credit |
| `4120` | Property Rental Revenue | Revenue | Posting | Credit |
| `5110` | Property Maintenance Expense| Expense | Posting | Debit |

---

## 10. Glossary

- **Chart of Accounts (COA)**: An index of all financial accounts in the general ledger of a company.
- **Contra-Asset Account**: An asset account with a credit balance that offsets the balance of a paired asset account (e.g., Accumulated Depreciation `1290`).
- **Normal Balance**: The expected debit or credit balance classification for a given account category.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- User Access Control: [Volume 03 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_03_System_Administrator_Guide/Chapter_02_User_Profiles_and_Access_Control.md)
- Period Closing Operations: [Volume 03 Chapter 04](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_03_System_Administrator_Guide/Chapter_04_Period_Closing_Operations.md)
- Double-Entry Engine Specs: [Volume 06 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_02_Double_Entry_Accounting_Engine.md)
