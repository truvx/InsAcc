---
title: "Volume 09: Appendices - Appendix C: Storage Key Dictionary"
document_id: "INSACC-DOC-V09-APP-C"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 09: InsAcc Enterprise Appendices
## Appendix C: Storage Key Dictionary

> **Single Source of Truth Reference**: All storage key identifiers, JSON structure schemas, and initial seed states defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 LocalStorage Namespace Governance (`insacc_*`)](#71-localstorage-namespace-governance-insacc_)
  - [7.2 Master 16 Storage Key Dictionary Specification](#72-master-16-storage-key-dictionary-specification)
  - [7.3 Detailed Key JSON Schema Specifications](#73-detailed-key-json-schema-specifications)
  - [7.4 Storage Size Allocation & Quota Reference](#74-storage-size-allocation--quota-reference)
  - [7.5 Key Deprecation & Migration Directives](#75-key-deprecation--migration-directives)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This appendix serves as the definitive reference manual for all 16 browser `localStorage` keys used in InsAcc v1.0.0. It documents key naming conventions, TypeScript data interfaces, initial seed values, and storage quota management.

---

## 2. Scope

This specification covers:
- The 16 storage keys namespace-prefixed with `insacc_`.
- Key model interfaces (`Investment`, `Transaction`, `PropertyBuilding`, `PropertyUnit`, etc.).
- Sample JSON payloads and initial factory seed values.
- Key deprecation metadata (`insacc_balance`, `insacc_statement`).

Out of Scope:
- React state hook implementation (`usePersistedState.ts`) (covered in [Volume 02 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_01_LocalStorage_Persistence_Architecture.md)).
- Schema versioning resets (`CLEAR_VERSION = '8'`) (covered in [Volume 02 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_02_Schema_Versioning_and_Migrations.md)).

---

## 3. Audience

This document is authored for:
- Frontend Software Engineers and Core Maintainers
- Database Administrators and Migration Engineers
- Quality Assurance Automation Engineers

---

## 4. Prerequisites

Before referencing storage key schemas:
1. Review the persistence architecture defined in [Volume 02 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_01_LocalStorage_Persistence_Architecture.md).
2. Review the storage key dictionary in [MASTER_ARCHITECTURE.md#63-master-storage-key-dictionary-16-keys](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md#63-master-storage-key-dictionary-16-keys).

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **KEY RENAMING HAZARD**: Modifying a storage key string (e.g., changing `insacc_investments` to `insacc_holdings`) will cause `usePersistedState` to fail to find existing data, triggering default initialization and data loss. Storage key string constants MUST remain immutable.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Strict Namespace Isolation**: All InsAcc keys strictly enforce the `insacc_` prefix. This allows the application initialization pipeline (`App.tsx`) to purge stale application data during schema upgrades without affecting third-party browser storage.

---

## 7. Main Content

### 7.1 LocalStorage Namespace Governance (`insacc_*`)

InsAcc partitions operational data across **16 storage keys**:

```
localStorage Namespace: `insacc_*`
├── Wealth & Investment Domain Keys (4 Keys)
├── Property Real Estate Domain Keys (6 Keys)
├── Shared Accounting & User Keys (4 Keys)
└── Meta Version & System Log Keys (2 Keys)
```

---

### 7.2 Master 16 Storage Key Dictionary Specification

| # | Storage Key Identifier | Target TypeScript Model Interface | Key Status | Description & Domain Scope |
|---|---|---|---|---|
| 1 | `insacc_investments` | `Investment[]` | Active | Asset holding positions & current valuations |
| 2 | `insacc_transactions` | `Transaction[]` | Active | General ledger income/expense transactions |
| 3 | `insacc_statement` | `StatementEntry[]` | Deprecated | Bank statement line items (Legacy model) |
| 4 | `insacc_balance` | `number` | Deprecated | Bank cash balance scalar (Deprecated) |
| 5 | `insacc_documents` | `DocItem[]` | Active | Document metadata & Base64 attachments |
| 6 | `insacc_logs` | `LogEntry[]` | Active | System activity audit log entries |
| 7 | `insacc_purchase_categories` | `PurchaseCategory[]` | Active | Purchase ledger asset categories |
| 8 | `insacc_purchases` | `PurchaseRecord[]` | Active | Physical asset acquisition purchase lots |
| 9 | `insacc_inv_users` | `UserEntry[]` | Active | Investment module user profiles |
| 10 | `insacc_prop_users` | `UserEntry[]` | Active | Property module user profiles |
| 11 | `insacc_prop_categories` | `PropertyCategory[]` | Active | Real estate building categories |
| 12 | `insacc_prop_buildings` | `PropertyBuilding[]` | Active | Building master records |
| 13 | `insacc_prop_units` | `PropertyUnit[]` | Active | Rentable property units |
| 14 | `insacc_prop_tenants` | `PropertyTenant[]` | Active | Tenant master profiles & KYC data |
| 15 | `insacc_prop_rent` | `RentPayment[]` | Active | Tenant rent collection & PDC records |
| 16 | `insacc_clear_version` | `string` | Active | Schema version tracker (Active: `"8"`) |

---

### 7.3 Detailed Key JSON Schema Specifications

#### Key 12: `insacc_prop_buildings`
```json
[
  {
    "id": "bld-101",
    "name": "Al Riyan Tower",
    "categoryId": "cat-res",
    "address": "Plot 402, Business Bay, Dubai, UAE",
    "totalUnits": 24,
    "notes": "Primary residential luxury tower"
  }
]
```

#### Key 15: `insacc_prop_rent`
```json
[
  {
    "id": "rent-1001",
    "tenantId": "ten-1001",
    "unitId": "unit-101",
    "amount": 30000.00,
    "dueDate": "2026-07-01",
    "status": "Received",
    "chequeNumber": "CHQ-884001",
    "bankName": "Emirates NBD"
  }
]
```

---

### 7.4 Storage Size Allocation & Quota Reference

| Storage Key Group | Typical Entry Count | Estimated Size Range | Storage Quota Status |
|---|---|---|---|
| **Property Domain (`prop_*`)** | 50–500 Records | ~150 KB – 500 KB | Normal |
| **Investment Domain (`investments`)** | 10–100 Records | ~20 KB – 100 KB | Normal |
| **Documents (`insacc_documents`)** | 5–20 Attachments | ~2 MB – 8 MB | High (Approach Quota) |
| **Total `localStorage` Usage** | Cumulative System | **~2.5 MB – 8.5 MB** | **Within 10MB Quota** |

---

### 7.5 Key Deprecation & Migration Directives

1. **`insacc_balance` (Deprecated)**:
   - **Reason**: Violates the **Derived Balance Golden Rule**. Bank balances are derived dynamically from posted vouchers.
2. **`insacc_statement` (Deprecated)**:
   - **Reason**: Replaced by dynamic bank statement matching in `BankReconciliationDashboard.tsx`.

---

## 8. Summary

Appendix C provides a complete reference dictionary for all 16 `insacc_*` browser storage keys. By documenting JSON structures, TypeScript interfaces, and key deprecation directives, developers maintain data consistency across the platform.

---

## 9. Chapter Appendix

### Storage Key Access Method Reference

```typescript
// Reading a Key
const rawData = localStorage.getItem('insacc_investments')
const investments: Investment[] = rawData ? JSON.parse(rawData) : []

// Writing a Key
localStorage.setItem('insacc_investments', JSON.stringify(investments))
```

---

## 10. Glossary

- **Key-Value Store**: A simple database paradigm that uses a associative array as the fundamental data model, where a key is associated with a specific value.
- **Schema Version**: A version string or number that tracks the structure format of database entries.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- LocalStorage Persistence: [Volume 02 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_01_LocalStorage_Persistence_Architecture.md)
- Schema Versioning: [Volume 02 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_02_Schema_Versioning_and_Migrations.md)
- Database Design Spec: [docs/DATABASE_DESIGN_SPECIFICATION.md](file:///Users/t6ux/InsAcc/docs/DATABASE_DESIGN_SPECIFICATION.md)
