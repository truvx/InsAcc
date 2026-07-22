---
title: "Volume 04: End-User Manual - Chapter 08: Financial Reporting and Exports"
document_id: "INSACC-DOC-V04-CH08"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 04: InsAcc End-User Operations Manual
## Chapter 08: Financial Reporting and Exports

> **Single Source of Truth Reference**: All report projection models, mathematical formulas, and export IPC bridges defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Financial Reporting Architecture & Catalog (19 Views)](#71-financial-reporting-architecture--catalog-19-views)
  - [7.2 Trial Balance Tree Projection (`TrialBalanceTree.tsx`)](#72-trial-balance-tree-projection-trialbalancetreetsex)
  - [7.3 Profit & Loss Statement Calculation Engine](#73-profit--loss-statement-calculation-engine)
  - [7.4 Balance Sheet Calculation Engine & Equality Proof](#74-balance-sheet-calculation-engine--equality-proof)
  - [7.5 Desktop File Export Workflows (CSV / PDF / Excel via `window.api.saveFile`)](#75-desktop-file-export-workflows-csv--pdf--excel-via-windowapisavefile)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter details the financial reporting engine in InsAcc. It provides instructions for generating Trial Balance trees, Profit & Loss statements, Balance Sheets, General Ledger sub-ledgers, and exporting reports to CSV, PDF, and Excel via the Electron IPC file bridge.

---

## 2. Scope

This specification covers:
- The catalog of 19 financial reporting views (`InvestmentReports.tsx`, `PropertyReports.tsx`, `reportService.ts`).
- Trial Balance calculation and tree rendering (`TrialBalanceTree.tsx`).
- Profit & Loss statement formulas ($\text{Net Profit} = \text{Revenue} - \text{Expenses}$).
- Balance Sheet equation proof ($\text{Assets} = \text{Liabilities} + \text{Equity} + \text{Net Profit}$).
- Exporting reports to filesystem files (`window.api.saveFile()`).

Out of Scope:
- Core `localStorage` read models (covered in [Volume 02 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_01_LocalStorage_Persistence_Architecture.md)).
- Developer projection model code architecture (covered in [Volume 06 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_03_Read_Models_and_Formatters.md)).

---

## 3. Audience

This document is authored for:
- Chief Financial Officers and Financial Controllers
- Senior Accounting Managers and Auditors
- Tax Consultants and Financial Analysts

---

## 4. Prerequisites

Before generating reports:
1. Log in to InsAcc with `Admin` or `Accounts` role access.
2. Verify that all current period vouchers have been posted ([Volume 04 Chapter 07](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_07_Double_Entry_Voucher_Operations.md)).

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **UNPOSTED VOUCHER EXCLUSION**: Financial reports project figures **ONLY from Posted vouchers** (`status === 'Posted'`). Vouchers in `Draft` or `Approved` status are excluded from Trial Balance, Profit & Loss, and Balance Sheet calculations.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Zero File Size Overhead**: Reports are generated dynamically in client memory. Exporting a report converts the rendered React data table into a formatted string (CSV or Base64 PDF) and transmits it to the desktop main process without storing temporary files in browser memory.

---

## 7. Main Content

### 7.1 Financial Reporting Architecture & Catalog (19 Views)

InsAcc features **19 specialized financial reporting views** accessible under **Reports**:

```
                               Financial Reporting Engine
                                   (reportService.ts)
                                           │
         ┌─────────────────────────────────┴─────────────────────────────────┐
         │                                                                   │
         ▼                                                                   ▼
Investment Module Reports (9 Views)                                Property Module Reports (10 Views)
- Trial Balance Tree                                               - Property Trial Balance Tree
- Profit & Loss Statement                                          - Property P&L Statement
- Balance Sheet                                                    - Property Balance Sheet
- General Ledger Detail                                            - Rental Revenue Ledger
- Purchase Cost Summary                                            - Occupancy & Rent Roll
- Dividend Income Report                                           - PDC Collection Summary
- Cash Flow Statement                                              - Tenant Security Deposits
- Investment Asset Register                                        - Property Expenses Ledger
- Portfolio Return Analysis                                        - Lease Expiry Schedule
                                                                   - Building Valuation Summary
```

---

### 7.2 Trial Balance Tree Projection (`TrialBalanceTree.tsx`)

The **Trial Balance** aggregates ending debit and credit balances across all active accounts:

$$\sum \text{Debit Balances} = \sum \text{Credit Balances}$$

#### Trial Balance Verification Check:
- **Debit Total**: `AED 1,275,000.00`
- **Credit Total**: `AED 1,275,000.00`
- **Variance**: `AED 0.00` (✓ **Balanced**)

---

### 7.3 Profit & Loss Statement Calculation Engine

The **Profit & Loss (P&L) Statement** summarizes operational performance over a target date range:

$$\text{Net Profit / (Loss)} = \sum \text{Revenue Accounts (4000-4999)} - \sum \text{Expense Accounts (5000-5999)}$$

#### Example P&L Summary Breakdown:
- **Property Rental Revenue (`4120`)**: `AED 150,000.00`
- **Dividend Income (`4110`)**: `AED 15,000.00`
- **Total Revenue**: **`AED 165,000.00`**
- *Less:* **Property Maintenance Expense (`5110`)**: `AED 35,000.00`
- *Less:* **Depreciation Expense (`5190`)**: `AED 10,000.00`
- **Total Expenses**: **`AED 45,000.00`**
- **Net Profit**: **`AED 120,000.00`**

---

### 7.4 Balance Sheet Calculation Engine & Equality Proof

The **Balance Sheet** projects financial standing as of a specific date, enforcing the fundamental accounting equation:

$$\text{Total Assets} = \text{Total Liabilities} + \text{Total Equity} + \text{Net Profit}$$

#### Example Balance Sheet Projection:
- **Total Assets (`1000-1999`)**: `AED 1,270,000.00`
  - Cash & Bank (`1110/1120`): `AED 850,000.00`
  - Fixed Assets & Investments (`1200`): `AED 420,000.00`
- **Total Liabilities (`2000-2999`)**: `AED 50,000.00`
  - Deferred Unearned Rent (`2110`): `AED 45,000.00`
  - Security Deposits (`2120`): `AED 5,000.00`
- **Total Equity (`3000-3999`)**: `AED 1,100,000.00`
  - Owner's Capital (`2200`): `AED 1,100,000.00`
- **Retained Net Profit**: `AED 120,000.00`
- **Liabilities + Equity + Net Profit**: `50,000 + 1,100,000 + 120,000 =` **`AED 1,270,000.00`** (✓ **Balanced**)

---

### 7.5 Desktop File Export Workflows (CSV / PDF / Excel via `window.api.saveFile`)

To export any report view to your local computer:

```
Open Target Report ──► Click [Export CSV] / [Export PDF] ──► Desktop OS Save Dialog
```

1. Open the target report (e.g., **Balance Sheet**).
2. Click **Export CSV**, **Export PDF**, or **Export Excel** on the top toolbar.
3. The renderer compiles the report table into a string payload and calls:
   ```typescript
   const filePath = await window.api.saveFile('Balance_Sheet_2026-06-30.csv', csvData)
   ```
4. Electron writes the file to your Downloads folder and returns the absolute disk filepath.

---

## 8. Summary

InsAcc provides 19 financial reporting views powered by dynamic read-model projections. By enforcing double-entry mathematical equality across Trial Balance, Profit & Loss, and Balance Sheet statements and providing desktop file export capability (`window.api.saveFile`), InsAcc delivers enterprise-grade financial transparency.

---

## 9. Chapter Appendix

### Financial Statement Export Format Support Matrix

| Report Title | Screen Render Component | CSV Export Support | PDF Export Support | Excel Export Support |
|---|---|---|---|---|
| **Trial Balance Tree** | `TrialBalanceTree.tsx` | ✓ Supported | ✓ Supported | ✓ Supported |
| **Profit & Loss** | `InvestmentReports.tsx` | ✓ Supported | ✓ Supported | ✓ Supported |
| **Balance Sheet** | `InvestmentReports.tsx` | ✓ Supported | ✓ Supported | ✓ Supported |
| **General Ledger** | `PropertyReports.tsx` | ✓ Supported | ✓ Supported | ✓ Supported |
| **Rent Roll Schedule**| `PropertyReports.tsx` | ✓ Supported | ✓ Supported | ✓ Supported |

---

## 10. Glossary

- **Balance Sheet**: A financial statement that summarizes a company's assets, liabilities, and shareholders' equity at a specific point in time.
- **Profit & Loss (P&L) Statement**: A financial statement that summarizes the revenues, costs, and expenses incurred during a specified period.
- **Trial Balance**: A bookkeeping worksheet in which the balances of all ledgers are compiled into debit and credit account column totals.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- Chart of Accounts: [Volume 03 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_03_System_Administrator_Guide/Chapter_03_Chart_of_Accounts_Management.md)
- Double-Entry Voucher Operations: [Volume 04 Chapter 07](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_07_Double_Entry_Voucher_Operations.md)
- Read Models & Formatters: [Volume 06 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_03_Read_Models_and_Formatters.md)
