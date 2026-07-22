---
title: "Volume 02: Data Management & Persistence Guide - Chapter 02: Schema Versioning and Migrations"
document_id: "INSACC-DOC-V02-CH02"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 02: Data Management & Persistence Guide
## Chapter 02: Schema Versioning and Migrations

> **Single Source of Truth Reference**: All schema version constants, startup migration pipelines, and versioning rules defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Schema Version Governance (`CLEAR_VERSION = '8'`)](#71-schema-version-governance-clear_version--8)
  - [7.2 Application Launch Version Check & Storage Sanitization](#72-application-launch-version-check--storage-sanitization)
  - [7.3 Non-Destructive In-Memory Migration Services](#73-non-destructive-in-memory-migration-services)
  - [7.4 Administrative System Data Reset Workflow](#74-administrative-system-data-reset-workflow)
  - [7.5 Storage Migration Diagnostics & Logs](#75-storage-migration-diagnostics--logs)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter defines the technical architecture governing schema versioning, startup migration verification, and dataset initialization in InsAcc v1.0.0. It details the global version constant (`CLEAR_VERSION = '8'`), version check pipelines, data sanitization rules, and in-memory domain migration services.

---

## 2. Scope

This specification covers:
- The global schema version tracker (`insacc_clear_version`).
- Application launch version validation in `App.tsx`.
- Automated storage key sanitization logic on schema mismatch.
- Domain migration services (`initializationService.ts`, `bankTransactionService.ts`, `purchaseAccountingService.ts`).
- Administrative factory data reset procedures.

Out of Scope:
- Core `localStorage` key specifications (covered in [Volume 02 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_01_LocalStorage_Persistence_Architecture.md)).
- Target PostgreSQL relational database DDL `[To Be Implemented]` (covered in [Volume 02 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_03_Target_Database_Migration_Plan_[To_Be_Implemented].md)).

---

## 3. Audience

This document is authored for:
- Frontend Software Engineers and Core Maintainers
- Database Administrators & Data Governance Officers
- Quality Assurance Automation Engineers
- Systems Support Technicians

---

## 4. Prerequisites

Before evaluating schema versioning:
1. Review the storage key dictionary in [Volume 02 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_01_LocalStorage_Persistence_Architecture.md).
2. Understand application initialization hooks in `src/renderer/App.tsx`.

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **AUTOMATED DATA RESET ON VERSION MISMATCH**: Incrementing `CLEAR_VERSION` in `App.tsx` (e.g., from `'8'` to `'9'`) causes the startup pipeline to clear all existing `insacc_*` keys in `localStorage` and reload factory seed datasets. Developers MUST NOT increment `CLEAR_VERSION` without providing non-destructive migration scripts for operational users.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Version Isolation**: The version check isolates InsAcc application keys by enforcing the `insacc_` prefix check (`key.startsWith('insacc_')`). Other browser storage keys unrelated to InsAcc remain untouched.

---

## 7. Main Content

### 7.1 Schema Version Governance (`CLEAR_VERSION = '8'`)

Schema versioning is controlled by a global constant in `src/renderer/App.tsx`:

```typescript
const CLEAR_VERSION = '8'
```

#### Version Tracker Specifications:
- **Storage Key**: `insacc_clear_version`
- **Active Version Identifier**: `"8"` (InsAcc v1.0.0 Enterprise Release)
- **Role**: Validates that data persisted in browser `localStorage` matches the active code schema version.

---

### 7.2 Application Launch Version Check & Storage Sanitization

During application startup (`App.tsx` initialization `useEffect`), InsAcc executes a version verification check:

```
Application Launch
        │
        ▼
Read `insacc_clear_version` from localStorage
        │
        ├─────── Equals CLEAR_VERSION ('8')? ────────► [PASS] Load state normally
        │
        └─────── Mismatch or Missing? ────────────────► [TRIGGER RESET PIPELINE]
                                                        1. Filter keys matching `insacc_*`
                                                        2. Purge stale storage keys
                                                        3. Set `insacc_clear_version` = '8'
                                                        4. Seed default domain datasets
                                                        5. Reload application window
```

#### Implementation in `src/renderer/App.tsx`:
```typescript
useEffect(() => {
  const currentVersion = localStorage.getItem('insacc_clear_version')
  if (currentVersion !== CLEAR_VERSION) {
    console.log(`Schema version mismatch detected (found "${currentVersion}", expected "${CLEAR_VERSION}"). Resetting storage...`)
    
    // Purge legacy insacc keys
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('insacc_')) {
        localStorage.removeItem(key)
      }
    })
    
    // Store active version string
    localStorage.setItem('insacc_clear_version', CLEAR_VERSION)
    window.location.reload()
  }
}, [])
```

---

### 7.3 Non-Destructive In-Memory Migration Services

For incremental updates that do not require purging storage, InsAcc uses domain migration services:

1. **`initializationService.ts`**: Checks domain collections on mount. If pre-seeded buildings, categories, or default accounts are missing, it injects defaults into state without overwriting existing user data.
2. **`bankTransactionService.ts`**: Converts formatted string values (e.g., `"+AED 5,000"`) into numeric floats (`5000`) during dataset upgrades.
3. **`purchaseAccountingService.ts`**: Maps purchase ledger entries to corresponding double-entry accounting vouchers.

---

### 7.4 Administrative System Data Reset Workflow

System administrators with `Admin` role permissions can manually invoke factory resets via **Settings** $\rightarrow$ **Data Management**:

1. Navigate to **Settings** $\rightarrow$ **Reset Data**.
2. Click **Reset System Data**.
3. Confirm the modal prompt (`"This action will permanently wipe all local data and restore factory seed datasets."`).
4. The system clears all `insacc_*` keys, sets `insacc_clear_version = '8'`, and reloads the window.

---

## 8. Summary

InsAcc guarantees client schema integrity through a dual versioning strategy: automatic version checking (`CLEAR_VERSION = '8'`) on launch to handle breaking schema changes, combined with non-destructive in-memory migration services (`initializationService.ts`) for incremental updates.

---

## 9. Chapter Appendix

### Version History Table

| Version Identifier | Release Date | Target App Version | Core Schema Changes |
|---|---|---|---|
| `"6"` | 2026-05-15 | v0.8.0-beta | Initial double-entry voucher schema |
| `"7"` | 2026-06-20 | v0.9.5-rc | Added property hierarchy and PDC manager keys |
| `"8"` | 2026-07-22 | v1.0.0 | Consolidated 16-key dictionary and derived balance rule |

---

## 10. Glossary

- **Factory Reset**: The process of wiping user modifications and restoring a software system to its initial out-of-the-box state.
- **Migration**: The process of transforming data structures from an older schema format to a newer format without losing data integrity.
- **Sanitization**: Cleaning or removing invalid, stale, or corrupted entries from a storage database.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- LocalStorage Persistence Architecture: [Volume 02 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_01_LocalStorage_Persistence_Architecture.md)
- Target Database Migration: [Volume 02 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_03_Target_Database_Migration_Plan_[To_Be_Implemented].md)
