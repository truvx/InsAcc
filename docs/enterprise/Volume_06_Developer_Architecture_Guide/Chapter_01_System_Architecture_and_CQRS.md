---
title: "Volume 06: Developer Architecture Guide - Chapter 01: System Architecture and CQRS"
document_id: "INSACC-DOC-V06-CH01"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 06: Developer Architecture & Technical Specification
## Chapter 01: System Architecture and CQRS

> **Single Source of Truth Reference**: All architectural patterns, CQRS segregations, and project folder structures defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Command Query Responsibility Segregation (CQRS) Architecture](#71-command-query-responsibility-segregation-cqrs-architecture)
  - [7.2 The Command Execution Pipeline (Write Operations)](#72-the-command-execution-pipeline-write-operations)
  - [7.3 The Query Projection Pipeline (Read Operations)](#73-the-query-projection-pipeline-read-operations)
  - [7.4 Codebase Directory Structure & Component Organization](#74-codebase-directory-structure--component-organization)
  - [7.5 React 18 Component Tree & Context Providers](#75-react-18-component-tree--context-providers)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter defines the software architecture, design patterns, Command Query Responsibility Segregation (CQRS) flow, and codebase organization of the InsAcc ERP platform.

---

## 2. Scope

This specification covers:
- Architectural segregation of write operations (Commands) from read operations (Queries).
- The Command pipeline (voucher creation, lease execution, PDC transitions).
- The Query projection pipeline (`useMemo`, `investmentReadModels.ts`, `reportService.ts`).
- Folder hierarchy under `src/main/` and `src/renderer/`.
- React 18 component tree structure and context providers (`MasterDataContext.tsx`).

Out of Scope:
- General Ledger double-entry validation algorithms (covered in [Volume 06 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_02_Double_Entry_Accounting_Engine.md)).
- CSS Tokens and design system implementation (covered in [Volume 06 Chapter 04](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_04_UI_Design_System_and_Tokens.md)).

---

## 3. Audience

This document is authored for:
- Senior Frontend Architects and Core Maintainers
- Full-Stack TypeScript Engineers
- Code Reviewers and Technical Leads

---

## 4. Prerequisites

Before reviewing architecture implementation:
1. Review the software architecture defined in [MASTER_ARCHITECTURE.md#2-software-architecture](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md#2-software-architecture).
2. Understand React 18 functional components, hooks, and TypeScript generics.

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **DIRECT STATE MUTATION PROHIBITION**: Modifying domain objects directly inside query projection functions causes side effects and breaks React memoization caches. Developers MUST keep query projections pure and perform state updates strictly through command hooks (`useVoucherLifecycle.ts`).

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Sub-Millisecond Read Projections**: By decoupling write-side domain mutations from read-side views via CQRS, InsAcc calculates complex financial statements (Trial Balance, P&L, Balance Sheet) in client memory with zero server round-trip latency.

---

## 7. Main Content

### 7.1 Command Query Responsibility Segregation (CQRS) Architecture

InsAcc decouples state modification (Commands) from view projections (Queries):

```
                               ┌─────────────────────────────────────────┐
                               │       User Interface Action / Form      │
                               └────────────────────┬────────────────────┘
                                                    │
                 ┌──────────────────────────────────┴──────────────────────────────────┐
                 │                                                                     │
                 ▼                                                                     ▼
   Command Pipeline (Write Side)                                         Query Pipeline (Read Side)
   - `voucherService.ts`                                                 - `investmentReadModels.ts`
   - `propertyPdcService.ts`                                             - `reportService.ts`
   - `postingRules.ts`                                                   - Memoized `useMemo` hooks
                 │                                                                     │
                 ▼                                                                     ▼
   State Mutation (`usePersistedState.ts`)                               View Rendering (`Reports.tsx`)
   Serializes updated JSON to `localStorage`                            Renders Recharts & Data Tables
```

---

### 7.2 The Command Execution Pipeline (Write Operations)

Commands encapsulate state-changing business logic:

1. **User Triggers Command**: (e.g., `postVoucher(voucherId)` in `VoucherLifecycleActions.tsx`).
2. **Posting Validator Execution**: `postingValidator.ts` asserts balance equality ($\sum D = \sum C$) and verifies period status is not locked.
3. **Domain Event Posting**: `ledgerService.ts` sets voucher status to `Posted` and appends an audit log (`auditService.ts`).
4. **State Serialization**: `usePersistedState.ts` writes the updated voucher array to `localStorage`.

---

### 7.3 The Query Projection Pipeline (Read Operations)

Queries transform raw persisted collections into read models without side effects:

```typescript
// Query Projection Example (InvestmentReadModels.ts)
export function getPortfolioValuation(investments: Investment[]): PortfolioValuation {
  return useMemo(() => {
    let totalCost = 0
    let totalMarketValue = 0

    for (const inv of investments) {
      totalCost += inv.purchaseValue
      totalMarketValue += inv.quantity * inv.currentPrice
    }

    const unrealizedGain = totalMarketValue - totalCost
    const returnPercentage = totalCost > 0 ? (unrealizedGain / totalCost) * 100 : 0

    return { totalCost, totalMarketValue, unrealizedGain, returnPercentage }
  }, [investments])
}
```

---

### 7.4 Codebase Directory Structure & Component Organization

The repository is structured into distinct functional layers:

```
InsAcc Codebase Structure
├── src/
│   ├── main/                       # Electron Main Process & Preload
│   │   ├── main.js                 # BrowserWindow setup & IPC handlers
│   │   └── preload.js              # Context bridge definitions (window.api)
│   │
│   └── renderer/                   # React 18 Application Subsystem
│       ├── accounting/             # Accounting Engine & Posting Rules
│       │   ├── accountingEngine.ts # Core engine coordinator
│       │   ├── postingRules.ts     # Domain event posting rules
│       │   ├── systemAccountRegistry.ts # Reserved account codes
│       │   └── types.ts            # Voucher & Account interfaces
│       ├── components/             # UI Views & Design Components
│       │   ├── design/             # Reusable design tokens & modals
│       │   ├── InvestmentDashboard.tsx
│       │   ├── PropertyRouter.tsx
│       │   └── Settings.tsx
│       ├── readModels/             # CQRS Query Projection Functions
│       ├── services/               # Domain Business Logic Services
│       └── usePersistedState.ts    # Storage Persistence Hook
```

---

### 7.5 React 18 Component Tree & Context Providers

```
<App>
  <MasterDataProvider>            <-- Central Context Provider (src/renderer/contexts/)
    <ThemeContainer>               <-- Applied .dark-mode CSS class
      <ProfileSelection>           <-- Renders Login / Profile / Module Screens
        <WorkspaceShell>           <-- Renders Sidebar & Header Navigation
          <ActiveModuleRouter />   <-- Renders Investment or Property Module Views
        </WorkspaceShell>
      </ProfileSelection>
    </ThemeContainer>
  </MasterDataProvider>
</App>
```

---

## 8. Summary

InsAcc uses a CQRS pattern to separate command operations from query read models. Combined with a modular React 18 directory structure and memoized projection functions, InsAcc ensures predictable state transitions and sub-millisecond view rendering.

---

## 9. Chapter Appendix

### Core Architecture Component Reference Matrix

| File Path | Architecture Role | Functional Responsibility |
|---|---|---|
| `src/main/main.js` | Main Process | Electron window creation & `save-file` IPC handler |
| `src/main/preload.js` | Preload Bridge | Secure `window.api` context bridge exposure |
| `src/renderer/accounting/postingRules.ts` | Command Pipeline | Maps domain events to debit/credit voucher lines |
| `src/renderer/readModels/` | Query Pipeline | Memoized read-model projection functions |
| `src/renderer/usePersistedState.ts` | State Persistence | Synchronous `localStorage` serialization hook |

---

## 10. Glossary

- **CQRS (Command Query Responsibility Segregation)**: An architectural pattern that separates read and update operations for a data store.
- **Memoization**: An optimization technique used primarily to speed up computer programs by storing the results of expensive function calls.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- Double Entry Engine Specs: [Volume 06 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_02_Double_Entry_Accounting_Engine.md)
- Read Models & Formatters: [Volume 06 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_03_Read_Models_and_Formatters.md)
- UI Design System: [Volume 06 Chapter 04](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_04_UI_Design_System_and_Tokens.md)
