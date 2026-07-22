# InsAcc Enterprise Master Architecture Specification

**Document ID:** MASTER_ARCHITECTURE.md  
**Version:** 1.0.0  
**Status:** Single Source of Truth for Platform Architecture  
**Release Date:** 2026-07-22  
**Target Software:** InsAcc Enterprise Asset & Investment Accounting Platform v1.0.0  

---

> [!IMPORTANT]
> **GOVERNANCE DIRECTIVE**: This document is the **single source of truth** for all architectural, operational, data modeling, and engineering standards for the InsAcc platform. All technical documentation, developer guides, user manuals, and specifications MUST reference this file. Do not duplicate information across documents — link back to `MASTER_ARCHITECTURE.md`.

---

## Table of Contents

1. [Business Overview](#1-business-overview)
2. [Software Architecture](#2-software-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Deployment Models](#4-deployment-models)
5. [Electron Architecture](#5-electron-architecture)
6. [Backend Architecture](#6-backend-architecture)
7. [PostgreSQL Architecture](#7-postgresql-architecture)
8. [Security Architecture](#8-security-architecture)
9. [Authentication Architecture](#9-authentication-architecture)
10. [Accounting Architecture](#10-accounting-architecture)
11. [Folder Structure](#11-folder-structure)
12. [Coding Standards](#12-coding-standards)
13. [Database & Persistence Standards](#13-database--persistence-standards)
14. [UI & Design System Standards](#14-ui--design-system-standards)
15. [Documentation Standards](#15-documentation-standards)

---

## 1. Business Overview

### 1.1 Purpose
**InsAcc** (Intelligent Asset & Investment Accounting) is an enterprise financial management application designed for tracking physical asset portfolios, financial investments, and property real estate operations with integrated double-entry accounting.

### 1.2 Target Audience & Use Cases
- **Asset Managers & Family Offices**: Track precious metals (gold, silver), equities, bonds, mutual funds, and custom asset classes.
- **Property Operations Teams**: Manage property hierarchies (Categories → Buildings → Units), tenant leases, rent collections, and Post-Dated Cheque (PDC) lifecycles.
- **Financial Operations & Accounting Departments**: Record financial events through double-entry vouchers (Receipt, Payment, Journal), generate trial balances, profit & loss statements, balance sheets, and cash flow reports.

### 1.3 Core Modules
1. **Investment Portfolio Module**: Holdings, purchase ledger, income/expense/journal transactions, bank accounts, and asset performance analytics.
2. **Property Management Module**: Property units, tenant leases, rent collection, security deposit tracking, and PDC cheque lifecycle management.
3. **General Ledger & Accounting Core**: Shared event-driven accounting engine enforcing double-entry integrity, chart of accounts management, and financial statement generation.

---

## 2. Software Architecture

InsAcc v1.0.0 uses a **CQRS-inspired (Command Query Responsibility Segregation), local-first desktop application architecture**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UI Presentation Layer                             │
│       React 18 Components + Framer Motion + Recharts + DesignSystem          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
                    ▼                                     ▼
┌───────────────────────────────────────┐   ┌─────────────────────────────────┐
│           Command Handler             │   │       Read Model Services       │
│  (Voucher Entry / Asset Purchase /    │   │ (investmentReadModels,          │
│   PDC Transition / Lease Creation)    │   │  reportService, ledgerService)  │
└───────────────────┬───────────────────┘   └─────────────────┬───────────────┘
                    │                                         │
                    ▼                                         │
┌───────────────────────────────────────┐                     │
│    Event-Driven Accounting Engine     │                     │
│ (AccountingEvent → PostingRule →      │                     │
│  PostingValidator → Voucher → Ledger) │                     │
└───────────────────┬───────────────────┘                     │
                    │                                         │
                    ▼                                         │
┌─────────────────────────────────────────────────────────────▼───────────────┐
│                          Persistence Storage Layer                          │
│               localStorage Hook (`usePersistedState.ts`)                    │
│            16 Storage Keys + Schema Versioning (`CLEAR_VERSION = 8`)        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Write Path (Command Pipeline)
1. User actions dispatch a business command or `AccountingEvent`.
2. The `AccountingEngine` resolves the corresponding `PostingRule` from `postingRules.ts`.
3. A draft `Voucher` is generated and validated by `PostingValidator`.
4. Upon approval and posting, `VoucherService` updates state and invalidates `LedgerService` balance caches.
5. `usePersistedState` serializes updated state to `localStorage`.

### 2.2 Read Path (Query Pipeline)
1. Screen components invoke pure read-model functions (e.g., `calculateAssetAllocation`, `calculateNetWorth`).
2. Read-models query state and calculate projections dynamically using `useMemo`.
3. Formatted display values are produced at render time via `reportFormatters.ts`.

---

## 3. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Core Framework** | React | 18.3.1 | Component-based user interface |
| **Language** | TypeScript | 5.3.3 | Strict static typing across all modules |
| **Bundler** | Vite | 5.x | Dev server (port 5174) & HMR production bundler |
| **Desktop Wrapper** | Electron | 28.x | Native cross-platform desktop shell |
| **Packaging** | Electron Builder | 23.6.0 | Distributable packaging (NSIS, DMG, AppImage) |
| **Charts** | Recharts | 2.x | Responsive data visualization |
| **Animations** | Framer Motion | 11.x | Screen transitions & micro-interactions |
| **Styling** | Vanilla CSS / CSS Custom Properties | Custom | Design tokens & themes (`src/renderer/styles/theme.css`) |
| **Typography** | Inter | woff2 | Locally bundled typography (8 font weights) |
| **Persistence** | Browser `localStorage` | HTML5 | Local state persistence via `usePersistedState` hook |
| **Testing** | Playwright | 1.x | End-to-end integration test suite |

---

## 4. Deployment Models

### 4.1 Current Production Model (v1.0.0)
- **Local Desktop Standalone Application**: Executable packaged via Electron Builder.
- **Client OS**: Windows 10/11 (x64), macOS 12+ (Apple Silicon / Intel), Linux (x64).
- **Infrastructure**: Zero server requirements. Runs 100% locally on user machine.

### 4.2 Target Enterprise Model `[To Be Implemented]`
- **Architecture**: Client-Server / Multi-tenant Deployment.
- **Backend API**: Node.js / Express REST API microservice cluster.
- **Database**: Dedicated PostgreSQL 17 relational database server.
- **Reverse Proxy**: Nginx with SSL/TLS termination.

---

## 5. Electron Architecture

The application runs in Electron's isolated two-process model:

```
src/main/main.js (Main Process)
  ├── Creates BrowserWindow (1400x900, min 1200x800)
  ├── Security Configuration:
  │     ├── nodeIntegration: false
  │     ├── contextIsolation: true
  │     └── sandbox: false
  ├── Registers IPC Handlers: 'save-file'
  └── Preload Bridge Execution: src/main/preload.js
         │
         ▼
window.api Context Bridge (`src/main/preload.js`)
  └── Exposes: window.api.saveFile(filename, content) → Promise<string>
         │
         ▼
src/renderer/ (Renderer Process - React App)
  └── Single Page Application built by Vite
```

---

## 6. Backend Architecture

### 6.1 Current Implementation (v1.0.0)
InsAcc v1.0.0 has **no server-side backend process**. All business services, data transformations, accounting rules, and reporting engines execute entirely inside the renderer process.

### 6.2 Target Server Backend `[To Be Implemented]`
- **Framework**: Node.js / Express REST API.
- **ORM / Query Builder**: Prisma or Kysely.
- **API Endpoints**: `/api/v1/investments`, `/api/v1/properties`, `/api/v1/accounting/vouchers`, `/api/v1/reports`.

---

## 7. PostgreSQL Architecture

### 7.1 Current Implementation (v1.0.0)
No SQL database is included in v1.0.0. Persistence is handled via browser `localStorage` using 16 key-value stores.

### 7.2 Target Relational Database Schema `[To Be Implemented]`
The target PostgreSQL database will comprise three main schemas:
1. `accounting_*`: Accounts, Vouchers, Voucher Lines, Posting Rules, Fiscal Periods.
2. `investment_*`: Investments, Purchase Records, Holdings, Transactions.
3. `property_*`: Categories, Buildings, Units, Tenants, Leases, Rent Payments, PDC Cheques, Security Deposits.

---

## 8. Security Architecture

### 8.1 Client-Side Security Controls
- **Context Isolation**: Enabled (`contextIsolation: true`). Node integration disabled (`nodeIntegration: false`).
- **Font & Asset Security**: Zero external web requests. Fonts (Inter woff2) and resources are 100% bundled locally.
- **IPC Surface**: Restricted to single `save-file` channel in `preload.js`.

### 8.2 Current Limitations & Hardening Plan
- **Password Storage**: Currently stored in plaintext in `localStorage` (`storedPassword`).  
  *Roadmap:* Replace with Argon2 / bcrypt hashing via Web Crypto API `[To Be Implemented]`.
- **Data at Rest**: Unencrypted `localStorage`.  
  *Roadmap:* Migrate persistence to encrypted SQLCipher / SQLite database `[To Be Implemented]`.

---

## 9. Authentication Architecture

### 9.1 Current Profile Selection & Authorization (v1.0.0)
- **Profiles**: Pre-configured profiles (`Investor`, `Property Manager`).
- **Role-Based Access Control (RBAC)**:
  - `Admin`: Full permissions (create, edit, delete, reset data, manage users).
  - `Accounts`: Operational permissions (record transactions, vouchers, view reports).
- **Auth Flow**: Screen state transition (`login` → `profiles` → `module` → `dashboard`).

### 9.2 Target JWT Authentication `[To Be Implemented]`
- Bearer token authentication, refresh tokens, role claims, and session expiry timers.

---

## 10. Accounting Architecture

InsAcc contains a fully featured, rule-governed **Double-Entry Accounting Engine**.

### 10.1 Key Accounting Principles
1. **Double-Entry Mandate**: Every voucher must balance exactly: $\sum \text{Debits} = \sum \text{Credits}$.
2. **Voucher State Machine**:
   ```
   Draft ──► Approved ──► Posted
     │         │
     ▼         ▼
  Cancelled  Reversed
   ```
3. **Immutability of Posted Vouchers**: Once a voucher transitions to `Posted`, its accounting lines cannot be edited. Corrections require an explicit Reversal Voucher (`reverseVoucher()`).

### 10.2 Core Accounting Domain Files (`src/renderer/accounting/`)
- `accountingEngine.ts`: Core event processor dispatching commands.
- `postingRules.ts`: Event-to-posting-rule resolution engine.
- `postingValidator.ts`: Balance and line validation rules.
- `voucherService.ts`: Voucher creation, state transition, and numbering.
- `ledgerService.ts`: Account balance calculation and memoized balance caching.
- `chartOfAccountsService.ts`: System Chart of Accounts management and hierarchy.
- `systemAccountRegistry.ts`: Pre-defined standard account code registry.

### 10.3 Primary System Account Codes

| Account Code | Account Name | Type | Normal Balance |
|---|---|---|---|
| `1110` | Cash on Hand | Asset | Debit |
| `1120` | Bank Accounts | Asset | Debit |
| `1130` | Rent Receivable | Asset | Debit |
| `1410` | PDC Cheques Held | Asset | Debit |
| `2110` | Unearned / Deferred Rent | Liability | Credit |
| `2120` | Tenant Security Deposits | Liability | Credit |
| `2200` | Owner's Capital / Equity | Equity | Credit |
| `4110` | Dividend & Interest Income | Revenue | Credit |
| `4120` | Rental Revenue | Revenue | Credit |
| `5110` | Property Maintenance Expense | Expense | Debit |

---

## 11. Folder Structure

```
InsAcc/
├── index.html                          # Vite entry HTML
├── package.json                        # Dependencies, scripts, electron-builder config
├── vite.config.ts                      # Vite bundler configuration
├── tsconfig.json                       # TypeScript compiler configuration
├── docs/                               # Platform documentation
│   ├── MASTER_ARCHITECTURE.md          # SINGLE SOURCE OF TRUTH (this file)
│   ├── PRD.md                          # Product Requirements Document
│   ├── ACCOUNTING_ARCHITECTURE.md      # Accounting Engine Deep Dive
│   ├── BANKING_ARCHITECTURE.md         # Banking & Reconciliation Architecture
│   ├── PURCHASE_LEDGER_ARCHITECTURE.md # Purchase Ledger Specification
│   └── REPORTS_ARCHITECTURE.md          # Financial Reports Specification
├── src/
│   ├── main/
│   │   ├── main.js                     # Electron main process
│   │   └── preload.js                  # IPC context bridge
│   └── renderer/
│       ├── index.tsx                   # React application entry point
│       ├── App.tsx                     # Root component, routing, top-level state
│       ├── usePersistedState.ts        # localStorage persistence hook
│       ├── utils.ts                    # Utility functions and translation helper t()
│       ├── accounting/                 # Double-entry accounting engine core
│       ├── components/                 # React UI screens & components
│       │   ├── charts/                 # Recharts data visualization wrappers
│       │   └── design/                 # Reusable Design System components
│       ├── data/                       # Domain data types and default datasets
│       ├── readModels/                 # CQRS read-side projection services
│       ├── services/                   # Business domain services
│       └── styles/                     # CSS custom properties & local fonts
└── release/                            # Packaged desktop executables (gitignored)
```

---

## 12. Coding Standards

1. **TypeScript Strictness**: `tsconfig.json` has `strict: true`. No implicit `any`. All props and service responses must have explicit interfaces.
2. **React Patterns**:
   - Functional components only.
   - Use `useMemo` for derived dataset queries and aggregations.
   - Component state for ephemeral UI toggles; `usePersistedState` for persistent application data.
3. **No Inline Styling**: All visual styling MUST use CSS classes defined in `theme.css` or CSS Custom Properties. Never pass inline `style={{ ... }}` objects except for dynamic layout measurements.
4. **Pure Service Layer**: Service files in `services/` and `accounting/` must remain pure functions with zero React imports or DOM references.

---

## 13. Database & Persistence Standards

### 13.1 Entity Identification
- Every entity ID is an **immutable string**. Format: UUID v4 or timestamp-prefixed non-colliding string (e.g., `ba-1719500000000`, `P-1719500000000-1`).
- IDs are primary keys and foreign keys (`accountId`, `tenantId`, `propertyId`). Re-generating an ID is strictly forbidden.

### 13.2 Derived Balance Rule
> **GOLDEN RULE**: Account balances and bank balances are ALWAYS DERIVED values.
> 
> $\text{Current Balance} = \text{Opening Balance} + \sum \text{Debits} - \sum \text{Credits}$
> 
> Balances MUST NEVER be persisted as independent, manually editable scalar values. To correct a balance mismatch, a user MUST enter a corrective accounting voucher or bank transaction.

### 13.3 Storage Key Schema (16 Keys)
All application data is persisted under the `insacc_*` namespace in `localStorage`. Schema versioning is governed by `insacc_clear_version` (`CLEAR_VERSION = 8`).

---

## 14. UI & Design System Standards

- **Theme Palette**: Premium Navy + Gold branding palette in Dark Mode (`#0C0C0D` background, `#1C1C1F` surface, `#6366F1` primary, `#F59E0B` gold accents). Light mode supported via `.dark-mode` class toggle.
- **Typography**: Inter woff2 font. 8-weight hierarchy (400 regular, 500 medium, 600 semi-bold, 700 bold).
- **Spacing Grid**: Strict 4-point spacing scale (`--space-1`: 4px to `--space-16`: 64px).
- **Border Radius**: Buttons/Inputs `10px` (`--radius`), Cards `16px` (`--radius-lg`), Dialogs `20px` (`--radius-xl`).
- **Icons**: Inline SVG components in `src/renderer/components/design/DesignSystem.tsx`. Zero third-party icon packages.

---

## 15. Documentation Standards

1. **Reference Mandate**: Every technical document, architectural RFC, or manual created in the InsAcc codebase MUST link back to `docs/MASTER_ARCHITECTURE.md` as its primary reference.
2. **Zero Fabrication**: Features not yet present in the codebase MUST be marked `[To Be Implemented]`.
3. **Diagram Standard**: Visual workflows must use valid Mermaid.js code blocks embedded directly in Markdown files.
4. **Maintenance**: Any PR or commit altering system architecture, account rules, or persistence keys MUST update `MASTER_ARCHITECTURE.md` concurrently.

---

*End of Master Architecture Specification.*
