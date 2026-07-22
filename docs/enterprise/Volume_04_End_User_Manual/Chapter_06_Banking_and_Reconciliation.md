---
title: "Volume 04: End-User Manual - Chapter 06: Banking and Reconciliation"
document_id: "INSACC-DOC-V04-CH06"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 04: InsAcc End-User Operations Manual
## Chapter 06: Banking and Reconciliation

> **Single Source of Truth Reference**: All bank account structures, inter-account transfer rules, and reconciliation matching algorithms defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Bank Accounts Dashboard Overview (`BankReconciliationDashboard.tsx`)](#71-bank-accounts-dashboard-overview-bankreconciliationdashboardtsex)
  - [7.2 Inter-Account Transfers & Contra Vouchers (`bankTransactionService.ts`)](#72-inter-account-transfers--contra-vouchers-banktransactionservicets)
  - [7.3 Bank Statement Import File Formats (CSV / Excel)](#73-bank-statement-import-file-formats-csv--excel)
  - [7.4 Automated Statement Reconciliation Matching Algorithm](#74-automated-statement-reconciliation-matching-algorithm)
  - [7.5 Unreconciled Items Resolution & Bank Reconciliation Summary](#75-unreconciled-items-resolution--bank-reconciliation-summary)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter provides operational procedures for managing bank accounts, processing inter-account fund transfers via Contra Vouchers (`CV`), importing bank statement files, executing automated statement reconciliation matching, and resolving unreconciled items in InsAcc.

---

## 2. Scope

This specification covers:
- Bank accounts dashboard and account setup (`BankReconciliationDashboard.tsx`).
- Inter-account fund transfers via Contra Vouchers (`bankTransactionService.ts`).
- Importing electronic bank statements (CSV / Excel).
- Automated transaction matching rules (date tolerance, exact amount, check number).
- Unreconciled transaction resolution and Bank Reconciliation Summary reports.

Out of Scope:
- General voucher entry for non-banking accounts (covered in [Volume 04 Chapter 07](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_07_Double_Entry_Voucher_Operations.md)).
- REST API open banking integrations `[To Be Implemented]` (covered in [Volume 05 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_05_Interface_and_Integration_Spec/Chapter_03_Target_REST_API_[To_Be_Implemented].md)).

---

## 3. Audience

This document is authored for:
- Treasury Officers and Cash Management Technicians
- Financial Accountants and Bookkeepers
- Internal Audit Specialists

---

## 4. Prerequisites

Before performing bank reconciliation:
1. Log in to InsAcc with `Admin` or `Accounts` role privileges.
2. Download an electronic bank statement file (`.csv` or `.xlsx`) from your online banking portal.

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **UNMATCHED BANK TRANSACTION DRIFT**: Failing to reconcile bank statement lines on a monthly basis allows bank service fees, unrecorded interest deposits, or unauthorized withdrawals to accumulate as unreconciled variance. Cash accounts MUST be reconciled prior to fiscal period closing.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Contra Voucher Restriction**: Inter-account bank transfers execute via Contra Vouchers (`CV`). The double-entry engine validates that BOTH debit and credit lines belong strictly to `1110 Cash` or `1120 Bank` sub-accounts (`postingValidator.ts`).

---

## 7. Main Content

### 7.1 Bank Accounts Dashboard Overview (`BankReconciliationDashboard.tsx`)

The **Banking** console lists all configured corporate bank accounts:

```
Bank Accounts Summary Console
┌──────────────────────────────┬──────────────────┬──────────────────┬─────────────────┐
│ Bank Account Title           │ Account Number   │ GL Account Code  │ Ledger Balance  │
├──────────────────────────────┼──────────────────┼──────────────────┼─────────────────┤
│ Emirates Islamic Bank        │ 123-456789-01    │ 1120.001         │ AED 850,000.00  │
│ ADCB Operations Account      │ 987-654321-02    │ 1120.002         │ AED 320,000.00  │
│ Petty Cash Vault             │ N/A              │ 1110.001         │ AED 15,000.00   │
└──────────────────────────────┴──────────────────┴──────────────────┴─────────────────┘
```

---

### 7.2 Inter-Account Transfers & Contra Vouchers (`bankTransactionService.ts`)

To transfer funds between bank accounts (e.g., from ADCB to Emirates Islamic):

```
Open Banking Console ──► Click [Transfer Funds] ──► Select Source & Destination ──► Submit CV
```

1. Navigate to **Banking** $\rightarrow$ click **Transfer Funds**.
2. Select **Source Account** (e.g., `1120.002 ADCB Account`).
3. Select **Destination Account** (e.g., `1120.001 Emirates Islamic Bank`).
4. Enter **Transfer Amount** (e.g., `50,000 AED`) and **Transfer Date**.
5. Click **Execute Transfer**.

#### Double-Entry Journal Posted:
- $\text{Debit: 1120.001 Emirates Islamic Bank (Asset)} = \text{AED 50,000}$
- $\text{Credit: 1120.002 ADCB Operations Account (Asset)} = \text{AED 50,000}$

---

### 7.3 Bank Statement Import File Formats (CSV / Excel)

InsAcc imports electronic bank statement files matching the standard 4-column structure:

| Date (`YYYY-MM-DD`) | Description / Reference | Cheque / Ref # | Amount (`+` Credit / `-` Debit) |
|---|---|---|---|
| `2026-06-15` | Rent Payment Unit 101 | `CHQ-1001` | `+30000.00` |
| `2026-06-18` | Maintenance Payment | `FT-2026-88` | `-3500.00` |
| `2026-06-20` | Monthly Bank Service Charge | `FEE-99` | `-150.00` |

---

### 7.4 Automated Statement Reconciliation Matching Algorithm

Upon uploading a bank statement file, the reconciliation engine (`bankTransactionService.ts`) compares imported statement lines against posted General Ledger vouchers:

```
Imported Statement Line ──► Matching Engine Rule Check ──► Status Assignment
                             ├── Rule 1: Exact Date + Exact Amount + Ref # Match ──► [Matched Auto]
                             ├── Rule 2: Date ± 3 Days + Exact Amount Match      ──► [Suggested Match]
                             └── Rule 3: No Ledger Match Found                    ──► [Unreconciled]
```

---

### 7.5 Unreconciled Items Resolution & Bank Reconciliation Summary

For items marked `Unreconciled`:
1. **Unrecorded Bank Fee / Charge**: Click **Create Payment Voucher (`PV`)** directly from the statement line to record the expense (e.g., `5110 Bank Fees`).
2. **Unrecorded Deposit / Interest**: Click **Create Receipt Voucher (`RV`)** to record incoming interest or deposit.
3. **Timing Difference**: Outstandings cheques or deposits in transit remain open until clearing in the subsequent statement period.

#### Bank Reconciliation Summary Report:
$$\text{Ending Bank Statement Balance} + \text{Deposits in Transit} - \text{Outstanding Cheques} = \text{GL Ledger Balance}$$

---

## 8. Summary

The Banking and Reconciliation Module simplifies cash management through inter-account Contra Transfers and automated bank statement matching algorithms. By resolving timing differences and recording bank charges directly, InsAcc ensures general ledger cash balances match physical bank statements.

---

## 9. Chapter Appendix

### Standard Bank Reconciliation Summary Template

| Line Item Description | Amount (AED) | Reconciliation Status |
|---|---|---|
| **Ending Balance per Bank Statement (as of 2026-06-30)** | **AED 845,150.00** | Verified Statement |
| *Add:* Deposits in Transit (PDC Cleared on 30th, posted on 1st) | + AED 30,000.00 | Timing Difference |
| *Less:* Outstanding Cheques (Uncashed Vendor Payment Vouchers) | - AED 25,150.00 | Timing Difference |
| **Adjusted Bank Balance** | **AED 850,000.00** | Reconciled |
| **General Ledger Account Balance (`1120.001`)** | **AED 850,000.00** | **✓ Fully Balanced** |

---

## 10. Glossary

- **Bank Reconciliation**: The process of matching the balances in an entity's accounting records for a cash account to the corresponding information on a bank statement.
- **Contra Voucher (CV)**: A journal entry recording an internal transfer of money between two cash or bank accounts.
- **Deposits in Transit**: Cash or cheques received and recorded by an entity, but not yet recorded by the bank.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- PDC and Rent Collection: [Volume 04 Chapter 05](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_05_PDC_and_Rent_Collection.md)
- Double-Entry Voucher Operations: [Volume 04 Chapter 07](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_07_Double_Entry_Voucher_Operations.md)
- Financial Reports: [Volume 04 Chapter 08](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_08_Financial_Reporting_and_Exports.md)
