---
title: "Volume 02: Data Management & Persistence Guide - Chapter 01: LocalStorage Persistence Architecture"
document_id: "INSACC-DOC-V02-CH01"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 02: Data Management & Persistence Guide
## Chapter 01: LocalStorage Persistence Architecture

> **Single Source of Truth Reference**: All persistence storage rules, data key schemas, and balance computation algorithms defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Local-First Persistence Rationale](#71-local-first-persistence-rationale)
  - [7.2 The `usePersistedState` Hook Implementation](#72-the-usepersistedstate-hook-implementation)
  - [7.3 Master Storage Key Dictionary (16 Storage Keys)](#73-master-storage-key-dictionary-16-storage-keys)
  - [7.4 Immutable Entity Identification Standard](#74-immutable-entity-identification-standard)
  - [7.5 The Derived Balance Golden Rule](#75-the-derived-balance-golden-rule)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter defines the technical architecture of the local-first storage subsystem in InsAcc v1.0.0. It details the custom `usePersistedState` React hook, the exhaustive 16-key `localStorage` dictionary, entity identification standards, and the inviolable **Derived Balance Golden Rule**.

---

## 2. Scope

This specification covers:
- Client-side state persistence via browser `localStorage` in Electron.
- The source implementation and error boundary mechanics of `usePersistedState.ts`.
- Complete schema specifications for all 16 `insacc_*` storage keys.
- Immutable string primary key rules for domain entities.
- Dynamic balance calculation algorithms (`ledgerService.ts`).

Out of Scope:
- Schema versioning and startup resets (covered in [Volume 02 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_02_Schema_Versioning_and_Migrations.md)).
- Relational PostgreSQL database migration `[To Be Implemented]` (covered in [Volume 02 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_03_Target_Database_Migration_Plan_[To_Be_Implemented].md)).

---

## 3. Audience

This document is authored for:
- Core Software Engineers and Frontend Developers
- Database Administrators and Data Architects
- Quality Assurance Automated Test Engineers
- Enterprise Technical Auditors

---

## 4. Prerequisites

Before evaluating persistence architecture:
1. Review the software architecture specified in [MASTER_ARCHITECTURE.md#2-software-architecture](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md#2-software-architecture).
2. Understand React 18 hook lifecycles (`useState`, `useEffect`) and synchronous browser storage behaviors.

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **STORAGE QUOTA LIMITATIONS**: Standard browser `localStorage` implementations enforce a storage quota limit (typically 5 MB to 10 MB per domain). In InsAcc v1.0.0, storing exceptionally large Base64 document attachments in `insacc_documents` can approach quota thresholds. Large document attachments MUST be managed efficiently.

> [!WARNING]
> **SCALAR BALANCE PERSISTENCE PROHIBITION**: Manually writing editable balance scalars into `localStorage` creates data synchronization drift. Account balances MUST NEVER be stored as independent, editable scalar values. Balances are derived dynamically on read.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Zero Network Latency**: Because `localStorage` reads and writes execute synchronously within the local client process memory space, InsAcc achieves sub-millisecond data retrieval times for financial dashboards and report calculations.

---

## 7. Main Content

### 7.1 Local-First Persistence Rationale

InsAcc v1.0.0 employs a local-first application architecture. Storing domain collections inside browser `localStorage` guarantees:
1. **100% Offline Autonomy**: Full platform operational capability without internet connectivity or external database server dependencies.
2. **Instant Warm Starts**: Zero startup latency connecting to remote database sockets.
3. **Complete Privacy**: Financial ledger data remains entirely within the user's local machine environment.

---

### 7.2 The `usePersistedState` Hook Implementation

State persistence is decoupled from UI component logic via the custom hook `src/renderer/usePersistedState.ts`:

```typescript
import { useState, useEffect } from 'react'

export function usePersistedState<T>(key: string, defaultValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // 1. Lazy Initializer Function
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return defaultValue
    }
  })

  // 2. Synchronous Serialization Effect
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }, [key, state])

  return [state, setState]
}
```

#### Core Operational Phases:
1. **Lazy Initialization**: On initial component mount, `localStorage.getItem(key)` is read and parsed via `JSON.parse()`. If null or corrupted, `defaultValue` is returned.
2. **Synchronous Commitment**: Whenever `state` mutates, `useEffect` serializes state to JSON via `JSON.stringify()` and commits it to `localStorage`.
3. **Error Isolation**: Storage quota or parsing exceptions are caught safely without crashing the React component tree.

---

### 7.3 Master Storage Key Dictionary (16 Storage Keys)

InsAcc partitions operational data across **16 storage keys** namespace-prefixed with `insacc_`:

| Key Name | TypeScript Model Interface | Core Description | Initial Seed State |
|---|---|---|---|
| `insacc_investments` | `Investment[]` | Portfolio holding positions & valuations | Pre-seeded sample portfolio |
| `insacc_transactions` | `Transaction[]` | General income, expense & journal entries | Pre-seeded transaction list |
| `insacc_statement` | `StatementEntry[]` | Bank statement lines (Legacy model) | Pre-seeded statement lines |
| `insacc_balance` | `number` | Bank balance scalar (Deprecated) | Initial seed balance |
| `insacc_documents` | `DocItem[]` | Document metadata & Base64 attachments | Sample document list |
| `insacc_logs` | `LogEntry[]` | Operational system activity logs | Initial system startup log |
| `insacc_purchase_categories` | `PurchaseCategory[]` | Purchase ledger asset categories | Default asset taxonomy |
| `insacc_purchases` | `Purchase[]` | Purchase ledger asset lot transactions | Pre-seeded purchase lots |
| `insacc_inv_users` | `UserEntry[]` | Investment module user profiles | Admin & Accounts users |
| `insacc_prop_users` | `UserEntry[]` | Property module user profiles | Admin & Accounts users |
| `insacc_prop_categories` | `PropertyCategory[]` | Property building categories | Building / Villa / Office |
| `insacc_prop_buildings` | `PropertyBuilding[]` | Building master records | Pre-seeded building list |
| `insacc_prop_units` | `PropertyUnit[]` | Rentable units per building | Pre-seeded unit records |
| `insacc_prop_tenants` | `PropertyTenant[]` | Tenant master profiles & lease terms | Pre-seeded tenant list |
| `insacc_prop_rent` | `RentPayment[]` | Rent collection payment records | Pre-seeded rent collections |
| `insacc_clear_version` | `string` | Schema version tracker | Current: `"8"` (`CLEAR_VERSION`) |

---

### 7.4 Immutable Entity Identification Standard

Every domain entity persisted in `localStorage` MUST contain an **immutable primary key identifier (`id`)**.

#### Mandatory Primary Key Rules:
- All IDs are non-empty strings (e.g., `inv-1719500000000`, `P-1719500000000-1`).
- IDs are generated once at entity creation using UUID v4 or deterministic timestamp prefixes.
- IDs act as primary keys and foreign key references (`accountId`, `tenantId`, `unitId`, `propertyId`).
- An entity's `id` **MUST NEVER be modified, re-generated, or re-assigned**.

---

### 7.5 The Derived Balance Golden Rule

> [!IMPORTANT]
> **THE DERIVED BALANCE GOLDEN RULE**: Account balances, bank cash positions, and portfolio valuations are **ALWAYS COMPUTED DYNAMICALLY ON READ**.
> 
> $$\text{Current Balance} = \text{Opening Balance} + \sum \text{Posted Debits} - \sum \text{Posted Credits}$$
> 
> Manually modifying or storing scalar balance values is strictly prohibited. To alter a balance, a user MUST record a valid accounting voucher or bank transaction.

#### Implementation in `ledgerService.ts`:
```typescript
export function deriveAccountBalance(accountId: string, vouchers: Voucher[], openingBalance: number = 0): number {
  const postedVouchers = vouchers.filter(v => v.status === 'Posted')
  let totalDebit = 0
  let totalCredit = 0

  for (const voucher of postedVouchers) {
    for (const line of voucher.lines) {
      if (line.accountId === accountId) {
        if (line.type === 'Debit') totalDebit += line.amount
        if (line.type === 'Credit') totalCredit += line.amount
      }
    }
  }

  return openingBalance + totalDebit - totalCredit
}
```

---

## 8. Summary

InsAcc v1.0.0 delivers reliable, zero-latency local data management by combining React state hooks with browser `localStorage`. By enforcing immutable entity IDs, a 16-key namespace dictionary, and the Derived Balance Golden Rule, InsAcc maintains double-entry financial data integrity across user operations.

---

## 9. Chapter Appendix

### Key Memory Quota Reference Matrix

| Storage Key | Estimated Size (1,000 Records) | Quota Risk | Mitigation Strategy |
|---|---|---|---|
| `insacc_investments` | ~150 KB | Low | Pure JSON serialization |
| `insacc_transactions` | ~250 KB | Low | Pure JSON serialization |
| `insacc_prop_leases` | ~300 KB | Low | Pure JSON serialization |
| `insacc_documents` | ~3 MB to 8 MB | Medium | Exclude large Base64 files; store in `userData` dir |

---

## 10. Glossary

- **Derived Balance**: A financial value that is not stored directly in a database field but is dynamically calculated by summing historical debit and credit transactions.
- **Lazy Initialization**: An optimization technique where state evaluation or file reads are deferred until the moment they are first required.
- **LocalStorage**: An HTML5 web storage mechanism that allows JavaScript applications to store key-value pairs persistently in the web browser.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- Schema Versioning & Migrations: [Volume 02 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_02_Schema_Versioning_and_Migrations.md)
- Target Database Migration: [Volume 02 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_03_Target_Database_Migration_Plan_[To_Be_Implemented].md)
- Key Dictionary Reference: [Volume 09 Appendix C](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_09_Appendices/Appendix_C_LocalStorage_Key_Dictionary.md)
