# InsAcc Project Architecture

**Generated:** 2026-07-06  
**Purpose:** Comprehensive architectural documentation of the InsAcc accounting system

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Application Structure](#application-structure)
4. [Module Architecture](#module-architecture)
5. [Data Flow](#data-flow)
6. [Key Design Patterns](#key-design-patterns)

---

## 1. System Overview

### Purpose
InsAcc is a desktop accounting application designed for managing two distinct business domains:
- **Investment Module**: Portfolio management, asset purchases, dividend tracking
- **Property Module**: Rental property management, tenant leases, PDC management, security deposits

### Core Capabilities
- Double-entry bookkeeping system
- Multi-module accounting with isolated Chart of Accounts
- Bank account management with reconciliation
- Voucher lifecycle management (Draft → Approved → Posted)
- Financial reporting (Trial Balance, Balance Sheet, P&L)
- Security deposit and PDC (Post-Dated Cheque) tracking
- Purchase ledger for asset acquisitions
- Audit trail and event logging

---

## 2. Technology Stack

### Frontend Framework
- **React 18** with TypeScript (TSX)
- **Framer Motion** for animations and page transitions
- **Custom hook patterns** (usePersistedState for localStorage integration)
- No external state management library (React useState/useContext only)

### Desktop Platform
- **Electron** for native desktop packaging (macOS, Windows, Linux support)
- **Main process** (src/main/): Window management, IPC
- **Renderer process** (src/renderer/): Full React application

### Data Persistence
- **LocalStorage** for all application state
- Serialized JSON for complex objects
- No external database (embedded, file-based persistence)
- Migration system with versioned keys (e.g., `insacc_all_datasets_cleared_v3`)

### Build & Development
- **Webpack** for bundling
- **Electron Builder** for packaging
- **Playwright** for E2E testing
- **TypeScript** for type safety

---

## 3. Application Structure

### Directory Layout
```
src/
├── main/                      # Electron main process
│   ├── main.js               # Application entry point
│   └── preload.js            # Bridge between main and renderer
├── renderer/                  # React application
│   ├── index.tsx             # React entry point
│   ├── App.tsx               # Root component with state management
│   ├── accounting/           # Core accounting engine
│   │   ├── accountingEngine.ts
│   │   ├── postingRules.ts   # Business rule definitions
│   │   ├── voucherService.ts
│   │   ├── ledgerService.ts  # Balance calculations
│   │   └── types.ts
│   ├── components/           # UI components
│   │   ├── design/           # Reusable design system components
│   │   ├── charts/           # Data visualization
│   │   ├── Investment*.tsx   # Investment module screens
│   │   └── Property*.tsx     # Property module screens
│   ├── services/             # Business logic layer
│   ├── readModels/           # Data projection layer (CQRS pattern)
│   ├── data/                 # Type definitions and seed data
│   ├── contexts/             # React context providers
│   ├── hooks/                # Custom React hooks
│   └── utils/                # Utility functions
└── shared/                    # Shared utilities
```


### Component Count
- **Total TypeScript/TSX files**: 156
- **React components with hooks**: 58
- **Services**: 23
- **Accounting modules**: 15
- **Read models**: 6

---

## 4. Module Architecture

### 4.1 Investment Module

**Purpose**: Manage investment portfolio including precious metals, stocks, and financial assets

**Key Features**:
- Asset purchase recording via Purchase Ledger
- Dividend income tracking
- Bank account management (Emirates Islamic Bank)
- Voucher processing (Receipt, Payment, Journal)
- Financial statements (Trial Balance, Balance Sheet, P&L)
- Investment Holdings view

**Account Structure**:
- Assets: `1110-inv` (Cash), `1120` (Bank), `1200-1260` (Investment types)
- Liabilities: `2200-inv` (Owner Account)
- Revenue: `4110` (Dividend), `4130` (Capital Gains)
- Expenses: `5xxx` series

**Key Files**:
- `InvestmentRouter.tsx` - Main routing component
- `InvestmentDashboardReadModel.ts` - Dashboard calculations
- `investmentAccountingService.ts` - Investment-specific accounting logic
- `investmentAccountFilter.ts` - Module isolation filter

### 4.2 Property Module

**Purpose**: Manage rental properties, tenants, leases, and associated financial transactions

**Key Features**:
- Property and unit management
- Tenant and lease tracking
- PDC (Post-Dated Cheque) management with lifecycle
- Security deposit tracking with transactions
- Rent receivable management
- Property-specific Chart of Accounts
- Deferred revenue recognition

**Account Structure**:
- Assets: `1110-prop` (Cash), `1120` (Bank), `1130` (Rent Receivable), `1270` (Real Estate), `1410` (PDC Receivable)
- Liabilities: `2110` (Deferred Revenue), `2120` (Security Deposits), `2200-prop` (Owner Account)
- Revenue: `4120` (Rental Income), `4150` (Late Fees), `4200` (Property Income)
- Expenses: `5100-5140` (Property expenses)

**Key Files**:
- `PropertyRouter.tsx` - Main routing component
- `propertyAccountingService.ts` - Property-specific accounting
- `propertyPdcService.ts` - PDC lifecycle management
- `propertyDepositService.ts` - Security deposit transactions
- `propertyAccountFilter.ts` - Module isolation filter


### 4.3 Accounting Engine

**Core Component**: `accountingEngine.ts`

**Responsibilities**:
1. Process accounting events and generate vouchers
2. Apply posting rules (double-entry logic)
3. Manage voucher lifecycle (Draft → Approved → Posted → Reversed)
4. Publish events for state synchronization
5. Validate transactions before posting

**Event-Driven Architecture**:
```
User Action → Accounting Event → Posting Rule → Voucher Creation → State Update
```

**Key Functions**:
- `processAccountingEvent()`: Converts business events to vouchers
- `approve()`: Transition voucher from Draft to Approved
- `post()`: Finalize voucher and commit to ledger
- `reverse()`: Create reversing entry for posted voucher
- `cancel()`: Cancel draft/pending vouchers

**Posting Rules** (`postingRules.ts`):
- 40+ pre-defined accounting events
- Maps events to debit/credit entries
- Supports dynamic account resolution via SystemAccountRegistry
- Examples: `RENT_RECEIVED`, `PDC_DEPOSITED`, `ASSET_PURCHASE`, `SECURITY_DEPOSIT_RECEIVED`

### 4.4 Ledger Service

**Core Component**: `ledgerService.ts`

**Responsibilities**:
1. Calculate account balances from posted vouchers
2. Generate trial balance
3. Produce account statements with running balances
4. Compute financial statement aggregations
5. Cache balance calculations for performance

**Key Algorithms**:
- **Balance Calculation**: Sum of opening balance + posted debits - posted credits (respecting normal balance)
- **Hierarchical Rollup**: Parent accounts aggregate child account balances
- **Date Range Queries**: Filter vouchers by date for period-specific balances
- **Cache Invalidation**: Version-based cache with invalidation on voucher changes

**Functions**:
- `getAccountBalance()`: Get current balance for an account
- `getTrialBalance()`: Generate trial balance report
- `getAccountStatement()`: Detailed transaction listing with running balance
- `verifyLedgerIntegrity()`: Ensure debit/credit balance across all vouchers


### 4.5 Voucher Service

**Core Component**: `voucherService.ts`

**Responsibilities**:
1. Create voucher records from inputs
2. Generate voucher numbers (PV, RV, JV, CV)
3. Validate voucher balance (debits = credits)
4. Manage voucher status transitions
5. Calculate foreign currency conversions

**Voucher Types**:
- **Payment (PV)**: Money out transactions
- **Receipt (RV)**: Money in transactions
- **Journal (JV)**: Non-cash adjustments
- **Contra (CV)**: Inter-account transfers

**Voucher Lifecycle**:
```
Draft → Pending Approval → Approved → Posted → [Reversed/Cancelled]
```

**Validation Rules**:
- Minimum 2 lines (debit + credit)
- Balanced entries (total debit = total credit within 0.001 tolerance)
- Valid account references
- Proper status transitions

### 4.6 Chart of Accounts Service

**Core Component**: `chartOfAccountsService.ts`

**Responsibilities**:
1. Initialize default Chart of Accounts
2. Create and manage account hierarchy
3. Generate child account codes
4. Validate account references
5. Support multi-country account structures (UAE, India, UK)

**Account Hierarchy**:
```
1000 Assets
  ├── 1100 Current Assets
  │   ├── 1110 Cash In Hand
  │   ├── 1120 Bank Accounts
  │   │   └── 1120.001, 1120.002 (individual banks)
  │   ├── 1130 Rent Receivable (Property only)
  │   └── 1410 PDC Receivable (Property only)
  ├── 1200 Investments (Investment only)
  │   ├── 1210 Gold Holding
  │   ├── 1220 Silver Holding
  │   └── etc.
  └── 1270 Real Estate (Property only)

2000 Liabilities
  ├── 2100 Accounts Payable
  ├── 2110 Deferred Revenue (Property only)
  ├── 2120 Security Deposits (Property only)
  └── 2200 Owner Account (separate for each module)

4000 Revenue
  ├── 4110 Dividend Income
  ├── 4120 Rental Income (Property only)
  └── etc.

5000 Expenses
  └── Various expense accounts
```


---

## 5. Data Flow

### 5.1 User Action to State Update

```
1. User interacts with UI component
   ↓
2. Component calls service function
   ↓
3. Service validates and processes business logic
   ↓
4. Service may call accounting engine for voucher creation
   ↓
5. Accounting engine applies posting rules
   ↓
6. Voucher created and validated
   ↓
7. Component updates React state via setState
   ↓
8. usePersistedState hook saves to localStorage
   ↓
9. React re-renders affected components
   ↓
10. Read models recompute projections from updated state
```

### 5.2 State Management Pattern

**No Redux/MobX**: All state lives in App.tsx and flows down via props

**Key State Containers**:
- `accounts` / `propChartAccounts`: Chart of Accounts
- `vouchers` / `propVouchers`: All accounting vouchers
- `bankAccounts` / `propAccounts`: Bank account master data
- `bankMappings` / `propBankMappings`: Bank-to-GL account links
- `purchaseRecords`: Investment purchase ledger
- `propLeases`: Property lease contracts
- `pdcCheques`: Post-dated cheques
- `securityDeposits`: Security deposit tracking

**Persistence Hook**:
```typescript
const [state, setState, resetState] = usePersistedState<Type>(
  'localStorage_key',
  defaultValue
)
```

### 5.3 Read Model Pattern (CQRS-inspired)

**Concept**: Separate data writes from data reads. Components never query raw state directly for complex calculations.

**Implementation**:
- **Read Models** live in `src/renderer/readModels/`
- Pure functions that project state into UI-ready data structures
- Examples:
  - `InvestmentDashboardReadModel.ts`: Computes portfolio value, allocation, growth history
  - `InvestmentBankReadModel.ts`: Bank balance projections
  - `InvestmentReportsReadModel.ts`: Report data aggregation

**Benefits**:
- Separation of concerns
- Reusable calculations
- Testable without UI
- Performance optimization opportunities


---

## 6. Key Design Patterns

### 6.1 Service Layer Pattern
All business logic extracted from UI into service files:
- `investmentAccountingService.ts`
- `propertyAccountingService.ts`
- `purchaseLedgerService.ts`
- `propertyPdcService.ts`
- `propertyDepositService.ts`
- `bankReconciliationService.ts`

### 6.2 Event Sourcing (Partial)
Vouchers act as immutable events. Once posted, they cannot be edited—only reversed.

### 6.3 Factory Pattern
- `createAccountingEngine()`: Factory for accounting engine instance
- `createVoucher()`: Factory for voucher creation
- `generateVoucherNumber()`: Centralized number generation

### 6.4 Registry Pattern
`SystemAccountRegistry`: Central registry for resolving system accounts by business name

### 6.5 Filter Pattern
Module isolation via filters:
- `filterInvestmentAccounts()`: Returns only investment-module accounts
- `filterPropertyAccounts()`: Returns only property-module accounts

### 6.6 Repository Pattern (Implicit)
Services act as repositories:
- All data access goes through service functions
- Components never directly manipulate state structure

### 6.7 Observer Pattern
AccountingEngine publishes events:
```typescript
engine.onEvent((event) => {
  // React to voucher lifecycle events
})
```

### 6.8 Strategy Pattern
Posting rules act as strategies for different accounting events

---

## 7. Module Isolation

### Problem
Two distinct business domains (Investment & Property) share a single codebase but require separate accounting books.

### Solution
1. **Separate Chart of Accounts**: `accounts` (Investment) vs `propChartAccounts` (Property)
2. **Separate Vouchers**: `vouchers` (Investment) vs `propVouchers` (Property)
3. **Module-specific account IDs**: `1110-inv` vs `1110-prop`
4. **Account filters**: Enforce module boundaries in all views and calculations
5. **Distinct routers**: `InvestmentRouter.tsx` vs `PropertyRouter.tsx`

### Shared Components
- Accounting engine
- Ledger service
- Voucher service
- Design system components
- Bank reconciliation logic

