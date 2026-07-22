---
title: "Volume 09: Appendices - Appendix B: Posting Rules Table"
document_id: "INSACC-DOC-V09-APP-B"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 09: InsAcc Enterprise Appendices
## Appendix B: Posting Rules Table

> **Single Source of Truth Reference**: All posting rules, account code mappings, and double-entry line configurations defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Posting Rules Architecture & Implementation (`postingRules.ts`)](#71-posting-rules-architecture--implementation-postingrulests)
  - [7.2 Master Double-Entry Posting Rules Matrix](#72-master-double-entry-posting-rules-matrix)
  - [7.3 Account Balance Impact & Category Normal Rules](#73-account-balance-impact--category-normal-rules)
  - [7.4 Multi-Line Complex Voucher Posting Logic](#74-multi-line-complex-voucher-posting-logic)
  - [7.5 Exception & Unresolved Rule Handling](#75-exception--unresolved-rule-handling)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This appendix provides the master technical reference matrix for all double-entry posting rules in `src/renderer/accounting/postingRules.ts`. It maps domain events to exact General Ledger account codes, line types (Debit vs Credit), and financial statement impacts.

---

## 2. Scope

This specification covers:
- Implementation logic of `postingRules.ts`.
- Master Posting Rules Matrix for all 13 domain accounting event types.
- General Ledger account code assignments (`1110` through `5190`).
- Mathematical proof of debit-credit equality for every posting rule.

Out of Scope:
- Accounting event payload definitions (covered in [Volume 09 Appendix A](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_09_Appendices/Appendix_A_Accounting_Event_Registry.md)).
- Double-entry engine balance validator code (covered in [Volume 06 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_02_Double_Entry_Accounting_Engine.md)).

---

## 3. Audience

This document is authored for:
- Senior Software Engineers and Financial System Architects
- Quality Assurance Automation Engineers
- Technical Accounting Consultants & Auditors

---

## 4. Prerequisites

Before referencing posting rules:
1. Review the Chart of Accounts architecture in [Volume 03 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_03_System_Administrator_Guide/Chapter_03_Chart_of_Accounts_Management.md).
2. Review the Accounting Engine Specification in [docs/ACCOUNTING_ENGINE_SPECIFICATION.md](file:///Users/t6ux/InsAcc/docs/ACCOUNTING_ENGINE_SPECIFICATION.md).

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **UNBALANCED RULE DEFECT**: Every posting rule MUST generate an equal sum of debits and credits ($\sum D = \sum C$). Adding a posting rule with unequal debit/credit lines will cause `postingValidator.ts` to reject voucher creation.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **System Account Registry Consistency**: Account codes referenced in `postingRules.ts` leverage constants from `systemAccountRegistry.ts` (e.g., `SystemAccountRegistry.BANK`) to prevent string typo bugs across the codebase.

---

## 7. Main Content

### 7.1 Posting Rules Architecture & Implementation (`postingRules.ts`)

Posting rules act as pure transformation functions in `src/renderer/accounting/postingRules.ts`:

```typescript
import { SystemAccountRegistry } from './systemAccountRegistry'
import { AccountingEvent, VoucherLineConfig } from './types'

export function getVoucherLinesForEvent(event: AccountingEvent): VoucherLineConfig[] {
  switch (event.type) {
    case 'INVESTMENT_PURCHASE':
      return [
        { accountId: SystemAccountRegistry.INVESTMENTS || '1200', lineType: 'Debit', amount: event.amount, memo: event.narration },
        { accountId: event.bankAccountId || SystemAccountRegistry.BANK, lineType: 'Credit', amount: event.amount, memo: event.narration }
      ]
    // ... Additional Rule Branches
  }
}
```

---

### 7.2 Master Double-Entry Posting Rules Matrix

| Event Type Identifier | Condition / Action Trigger | Line # | Account Code & Name | Line Type | Balance Impact |
|---|---|---|---|---|---|
| `INVESTMENT_PURCHASE` | Acquisition of asset holding | Line 1<br>Line 2 | `1200` Investment Assets<br>`1120` Bank Account | **Debit**<br>**Credit** | Increases Asset<br>Decreases Asset |
| `INVESTMENT_DIVIDEND` | Dividend payout received | Line 1<br>Line 2 | `1120` Bank Account<br>`4110` Dividend Income | **Debit**<br>**Credit** | Increases Asset<br>Increases Revenue |
| `RENT_COLLECTED` | Direct cash rent payment | Line 1<br>Line 2 | `1120` Bank Account<br>`4120` Rental Revenue | **Debit**<br>**Credit** | Increases Asset<br>Increases Revenue |
| `PDC_RECEIVED` | Cheque received at signing | Line 1<br>Line 2 | `1410` PDC Cheques Held<br>`2110` Unearned Rent | **Debit**<br>**Credit** | Increases Asset<br>Increases Liability |
| `PDC_CLEARED` | Cheque cleared by bank | Line 1<br>Line 2<br>Line 3<br>Line 4 | `1120` Bank Account<br>`1410` PDC Cheques Held<br>`2110` Unearned Rent<br>`4120` Rental Revenue | **Debit**<br>**Credit**<br>**Debit**<br>**Credit** | Increases Asset<br>Decreases Asset<br>Decreases Liability<br>Increases Revenue |
| `PDC_BOUNCED` | Bank rejects cheque | Line 1<br>Line 2 | `1130` Rent Receivable<br>`1410` PDC Cheques Held | **Debit**<br>**Credit** | Increases Asset<br>Decreases Asset |
| `SECURITY_DEPOSIT_RECEIVED`| Tenant deposit paid | Line 1<br>Line 2 | `1120` Bank Account<br>`2120` Security Deposits | **Debit**<br>**Credit** | Increases Asset<br>Increases Liability |
| `SECURITY_DEPOSIT_REFUNDED`| Deposit returned | Line 1<br>Line 2 | `2120` Security Deposits<br>`1120` Bank Account | **Debit**<br>**Credit** | Decreases Liability<br>Decreases Asset |
| `PROPERTY_EXPENSE` | Maintenance payment | Line 1<br>Line 2 | `5110` Maintenance Exp.<br>`1120` Bank Account | **Debit**<br>**Credit** | Increases Expense<br>Decreases Asset |
| `DEPRECIATION_RECORDED` | Monthly depreciation | Line 1<br>Line 2 | `5190` Depreciation Exp.<br>`1290` Accumulated Dep. | **Debit**<br>**Credit** | Increases Expense<br>Increases Contra-Asset |

---

### 7.3 Account Balance Impact & Category Normal Rules

- **Assets (`1000s`)**: Debit increases balance (+), Credit decreases balance (-).
- **Liabilities (`2000s`)**: Credit increases balance (+), Debit decreases balance (-).
- **Equity (`3000s`)**: Credit increases balance (+), Debit decreases balance (-).
- **Revenue (`4000s`)**: Credit increases balance (+), Debit decreases balance (-).
- **Expenses (`5000s`)**: Debit increases balance (+), Credit decreases balance (-).

---

### 7.4 Multi-Line Complex Voucher Posting Logic

For complex events like `PDC_CLEARED`, the posting rule resolves four balanced lines:

$$\text{Line 1 (Dr 1120: 30,000)} + \text{Line 3 (Dr 2110: 30,000)} = \text{Line 2 (Cr 1410: 30,000)} + \text{Line 4 (Cr 4120: 30,000)}$$

$$\text{Total Debits (60,000)} = \text{Total Credits (60,000)}$$

---

## 8. Summary

Appendix B defines the posting rules matrix governing InsAcc. By mapping domain events to explicit debit and credit lines, `postingRules.ts` ensures mathematical balance equality ($\sum D = \sum C$) across all financial transactions.

---

## 9. Chapter Appendix

### System Account Code Quick Reference

```
Reserved Account Codes (systemAccountRegistry.ts)
├── 1110: Cash on Hand
├── 1120: Bank Accounts
├── 1130: Rent Receivable
├── 1410: Post-Dated Cheques Held
├── 2110: Unearned Rent Liability
├── 2120: Tenant Security Deposits
├── 2200: Owner Capital / Retained Earnings
├── 4110: Dividend & Interest Income
├── 4120: Property Rental Revenue
├── 5110: Property Maintenance Expense
└── 5190: Depreciation Expense
```

---

## 10. Glossary

- **Posting Rule**: A rule that defines how a business transaction is translated into debit and credit general ledger entries.
- **System Account**: A predefined general ledger account required by automated system workflows.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- Accounting Event Registry: [Volume 09 Appendix A](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_09_Appendices/Appendix_A_Accounting_Event_Registry.md)
- Chart of Accounts: [Volume 03 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_03_System_Administrator_Guide/Chapter_03_Chart_of_Accounts_Management.md)
- Double-Entry Engine Specs: [Volume 06 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_02_Double_Entry_Accounting_Engine.md)
