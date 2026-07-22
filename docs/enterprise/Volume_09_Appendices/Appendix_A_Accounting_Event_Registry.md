---
title: "Volume 09: Appendices - Appendix A: Accounting Event Registry"
document_id: "INSACC-DOC-V09-APP-A"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 09: InsAcc Enterprise Appendices
## Appendix A: Accounting Event Registry

> **Single Source of Truth Reference**: All accounting event types, payload schemas, and posting triggers defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Accounting Event System Architecture](#71-accounting-event-system-architecture)
  - [7.2 Domain Event Type Registry](#72-domain-event-type-registry)
  - [7.3 Detailed Event Payload Schemas](#73-detailed-event-payload-schemas)
  - [7.4 Accounting Event to Voucher Line Resolution Matrix](#74-accounting-event-to-voucher-line-resolution-matrix)
  - [7.5 Event Validation & Error Handling Rules](#75-event-validation--error-handling-rules)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This appendix serves as the definitive technical registry of all operational accounting events in the InsAcc platform. It specifies event type identifiers, TypeScript payload schemas, triggering UI components, and double-entry voucher line mappings.

---

## 2. Scope

This specification covers:
- Complete catalog of domain accounting event types (`AccountingEventType`).
- Event payload interface definitions (`src/renderer/accounting/types.ts`).
- Triggering UI components and service handlers.
- Debit and credit general ledger line resolution rules (`postingRules.ts`).

Out of Scope:
- Core `localStorage` persistence hooks (covered in [Volume 02 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_01_LocalStorage_Persistence_Architecture.md)).
- Complete Posting Rules Matrix (covered in [Volume 09 Appendix B](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_09_Appendices/Appendix_B_Posting_Rules_Table.md)).

---

## 3. Audience

This document is authored for:
- Core Software Engineers and Integration Developers
- General Ledger & ERP System Architects
- Financial QA Automation Engineers

---

## 4. Prerequisites

Before referencing event schemas:
1. Review the accounting architecture defined in [MASTER_ARCHITECTURE.md#10-accounting-architecture](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md#10-accounting-architecture).
2. Review the Accounting Engine Specification in [docs/ACCOUNTING_ENGINE_SPECIFICATION.md](file:///Users/t6ux/InsAcc/docs/ACCOUNTING_ENGINE_SPECIFICATION.md).

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **EVENT TYPE REFACTORING HAZARD**: Renaming or modifying existing `AccountingEventType` strings will invalidate historical audit event logs stored in `insacc_logs`. Event type identifier strings MUST remain immutable across application versions.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Event-Driven Isolation**: Domain events decouple user interactions from general ledger posting mechanics. UI components emit high-level accounting events; the engine (`postingRules.ts`) resolves them into double-entry voucher lines independently.

---

## 7. Main Content

### 7.1 Accounting Event System Architecture

```
┌──────────────────────────────┐
│ Operational UI Component     │ (e.g., PropertyPdcManager.tsx)
└──────────────┬───────────────┘
               │ Emits AccountingEvent
               ▼
┌──────────────────────────────┐
│ Posting Rules Engine         │ (`postingRules.ts`)
└──────────────┬───────────────┘
               │ Generates Double-Entry Voucher Lines
               ▼
┌──────────────────────────────┐
│ General Ledger Processor     │ (`ledgerService.ts`)
└──────────────────────────────┘
```

---

### 7.2 Domain Event Type Registry

```typescript
export type AccountingEventType =
  | 'INVESTMENT_PURCHASE'       // Acquisition of investment position or physical asset lot
  | 'INVESTMENT_SALE'           // Disposition of asset position with realized gain/loss
  | 'INVESTMENT_DIVIDEND'       // Dividend payout or coupon interest deposit
  | 'RENT_COLLECTED'            // Direct cash / cheque rent collection
  | 'PDC_RECEIVED'              // Receipt of post-dated cheque at lease signing
  | 'PDC_DEPOSITED'             // Submission of cheque to bank for collection
  | 'PDC_CLEARED'               // Bank confirmation of cheque clearance & revenue recognition
  | 'PDC_BOUNCED'               // Bank rejection of deposited cheque
  | 'SECURITY_DEPOSIT_RECEIVED' // Receipt of tenant security deposit liability
  | 'SECURITY_DEPOSIT_REFUNDED' // Refund of security deposit upon lease exit
  | 'PROPERTY_EXPENSE'          // Payment for property maintenance or repairs
  | 'DEPRECIATION_RECORDED'     // Monthly fixed asset depreciation posting
  | 'PERIOD_CLOSING'            // Fiscal period closing retained earnings transfer
```

---

### 7.3 Detailed Event Payload Schemas

Every accounting event extends the base `AccountingEvent` interface:

```typescript
export interface BaseAccountingEvent {
  id: string                  // Unique event instance ID (e.g. "evt-1719500000000")
  type: AccountingEventType   // Event type identifier
  timestamp: string           // ISO 8601 UTC timestamp
  amount: number              // Monetary transaction value (AED)
  narration: string           // Human-readable transaction memo
  userId: string              // User ID executing the event
}

// Specific Event Extension Example:
export interface PdcClearedEvent extends BaseAccountingEvent {
  type: 'PDC_CLEARED'
  chequeId: string
  leaseId: string
  bankAccountId: string       // Target receiving bank account ID (e.g. "1120.001")
}
```

---

### 7.4 Accounting Event to Voucher Line Resolution Matrix

| Event Type Identifier | Triggering UI Component | Primary Debit Account | Primary Credit Account |
|---|---|---|---|
| `INVESTMENT_PURCHASE` | `InvestmentHoldings.tsx` | `1200` Investment Assets | `1120` Bank Account |
| `INVESTMENT_DIVIDEND` | `InvestmentHoldings.tsx` | `1120` Bank Account | `4110` Dividend Revenue |
| `RENT_COLLECTED` | `PropertyRent.tsx` | `1120` Bank Account | `4120` Rental Revenue |
| `PDC_RECEIVED` | `PropertyLeases.tsx` | `1410` PDC Cheques Held | `2110` Unearned Rent |
| `PDC_CLEARED` | `PropertyPdcManager.tsx` | `1120` Bank & `2110` Unearned | `1410` PDC & `4120` Revenue |
| `PDC_BOUNCED` | `PropertyPdcManager.tsx` | `1130` Rent Receivable | `1410` PDC Cheques Held |
| `SECURITY_DEPOSIT_RECEIVED`| `PropertyLeases.tsx` | `1120` Bank Account | `2120` Tenant Security Deposit |
| `PROPERTY_EXPENSE` | `PropertyExpenses.tsx` | `5110` Property Maintenance | `1120` Bank Account |
| `DEPRECIATION_RECORDED` | `FixedAssets.tsx` | `5190` Depreciation Exp. | `1290` Accumulated Dep. |
| `PERIOD_CLOSING` | `PeriodClosingWizard.tsx` | `4000s` Revenue Accounts | `5000s` Expense & `2200` Equity |

---

### 7.5 Event Validation & Error Handling Rules

- **Positive Amount Rule**: `event.amount` MUST be a finite number $> 0.00$.
- **Account Existence Rule**: Referenced `bankAccountId` or `accountId` MUST exist in the active Chart of Accounts.
- **Date Locking Check**: `event.timestamp` MUST NOT fall within a locked fiscal period.

---

## 8. Summary

Appendix A provides the master registry of all domain accounting events in InsAcc. By enforcing strict event payload interfaces and mapping rules, InsAcc decouples user interface triggers from double-entry general ledger mechanics.

---

## 9. Chapter Appendix

### Event System Diagnostic Reference

```typescript
// Diagnostic Event Logger Helper (auditService.ts)
export function logAccountingEvent(event: BaseAccountingEvent): void {
  console.log(`[EVENT LOG] ${event.timestamp} | ${event.type} | AED ${event.amount} | User: ${event.userId}`)
}
```

---

## 10. Glossary

- **Event-Driven Architecture**: A software architecture pattern in which decoupled components communicate through the production and consumption of events.
- **Payload**: The essential data carried within a data structure or event transmission.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- Accounting Engine Spec: [docs/ACCOUNTING_ENGINE_SPECIFICATION.md](file:///Users/t6ux/InsAcc/docs/ACCOUNTING_ENGINE_SPECIFICATION.md)
- Posting Rules Table: [Volume 09 Appendix B](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_09_Appendices/Appendix_B_Posting_Rules_Table.md)
- Double-Entry Engine Specs: [Volume 06 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_02_Double_Entry_Accounting_Engine.md)
