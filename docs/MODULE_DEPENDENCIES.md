# InsAcc Module Dependencies Analysis

**Generated:** 2026-07-06  
**Purpose:** Document module relationships, coupling points, and dependency graph

## Table of Contents

1. [Dependency Overview](#dependency-overview)
2. [Core Module Dependencies](#core-module-dependencies)
3. [Investment Module Dependencies](#investment-module-dependencies)
4. [Property Module Dependencies](#property-module-dependencies)
5. [Shared Dependencies](#shared-dependencies)
6. [Coupling Analysis](#coupling-analysis)
7. [Decoupling Recommendations](#decoupling-recommendations)

---

## 1. Dependency Overview

### Module Structure

```
InsAcc Application
├── Core Accounting Engine (Shared)
├── Investment Module
├── Property Module
└── Shared Utilities
```

### Dependency Levels

**Level 1 - Core/Foundation** (No dependencies):
- `accounting/types.ts`
- `data/types.ts`
- `utils/` utilities
- `constants/` (after refactor)

**Level 2 - Services** (Depends on Level 1):
- `accounting/ledgerService.ts`
- `accounting/voucherService.ts`
- `accounting/chartOfAccountsService.ts`

**Level 3 - Business Logic** (Depends on Levels 1-2):
- `accounting/accountingEngine.ts`
- `services/*` (all domain services)

**Level 4 - UI/Presentation** (Depends on Levels 1-3):
- `components/*`
- `readModels/*`

**Level 5 - Application** (Depends on all):
- `App.tsx`
- Router components

---

## 2. Core Module Dependencies

### Accounting Engine

**File**: `src/renderer/accounting/accountingEngine.ts`

**Direct Dependencies**:
```typescript
import { getRule, resolveRule } from './postingRules'
import { validateNewVoucher, validateExistingVoucher } from './postingValidator'
import { createVoucher, approveVoucher, postVoucher, cancelVoucher, reverseVoucher, markAsReversed } from './voucherService'
import { invalidateBalanceCache } from './ledgerService'
import { now } from '../../shared/utils/dateUtils'
import type { AccountingEvent, Account, Voucher, /* ... */ } from './types'
```

**Dependency Count**: 6 internal modules

**Coupling**: MODERATE
- Tightly coupled to voucherService (high cohesion - acceptable)
- Loosely coupled to ledgerService (only cache invalidation)
- Medium coupling to postingRules


### Posting Rules

**File**: `src/renderer/accounting/postingRules.ts`

**Direct Dependencies**:
```typescript
import type { PostingRule, PostingRuleEntry, RuleContext, AccountingEvent, Account } from './types'
import { resolveAccount } from './chartOfAccountsService'
import { SystemAccountRegistry } from './systemAccountRegistry'
```

**Dependency Count**: 2 internal modules

**Coupling**: LOW
- Pure business rules
- Minimal dependencies
- Could be extracted to JSON configuration

### Ledger Service

**File**: `src/renderer/accounting/ledgerService.ts`

**Direct Dependencies**:
```typescript
import type { Account, Voucher, VoucherLine, LineType, /* ... */ } from './types'
```

**Dependency Count**: 1 (types only)

**Coupling**: VERY LOW
- Pure computational logic
- No external dependencies
- Excellent candidate for testing

### Voucher Service

**File**: `src/renderer/accounting/voucherService.ts`

**Direct Dependencies**:
```typescript
import type { Voucher, VoucherLine, VoucherType, /* ... */ } from './types'
import { now } from '../../shared/utils/dateUtils'
import { VoucherNumberService } from '../services/voucherNumberService'
```

**Dependency Count**: 2 modules + types

**Coupling**: LOW
- Depends on number generation service
- Otherwise self-contained

---

## 3. Investment Module Dependencies

### Investment Router

**File**: `src/renderer/components/InvestmentRouter.tsx`

**Direct Dependencies**:
```typescript
import type { Account, Voucher, BankMapping } from '../accounting/types'
import type { AccountingEngine } from '../accounting/accountingEngine'
import type { BankAccount, BankTransaction } from '../data/banking'
import type { DocItem } from './Documents'
import type { PurchaseRecord } from '../data/purchaseLedger'
import type { AuditEvent } from '../data/auditTypes'
// ... 20+ component imports
```

**Dependency Count**: 25+ modules

**Coupling**: HIGH
- Central routing component
- Depends on all Investment screens
- Props drilling to children

### Investment Dashboard

**File**: `src/renderer/components/InvestmentDashboard.tsx`

**Dependencies**:
- Accounting types
- InvestmentDashboardReadModel
- Chart components (7+)
- Banking types

**Coupling**: MEDIUM - Reasonable for a dashboard

### Investment Holdings

**File**: `src/renderer/components/InvestmentHoldings.tsx`

**Dependencies**:
- Purchase ledger types
- Investment types
- Table components

**Coupling**: LOW - Focused component


---

## 4. Property Module Dependencies

### Property Router

**File**: `src/renderer/components/PropertyRouter.tsx`

**Direct Dependencies**:
```typescript
import type { Account, Voucher, BankMapping, BankReconciliationRecord } from '../accounting/types'
import type { PropAccount, PropTransaction, PropertyEntry, /* ...15+ property types */ } from '../data/propertyTypes'
import type { AuditEvent } from '../data/auditTypes'
import type { AccountingEngine } from '../accounting/accountingEngine'
import { filterPropertyAccounts } from '../accounting/propertyAccountFilter'
// ... 18+ component imports
```

**Dependency Count**: 30+ modules

**Coupling**: VERY HIGH
- Similar to InvestmentRouter
- Additional complexity with property-specific types
- Data mapping logic embedded (getFloorFromUnitName)

### Property PDC Manager

**File**: `src/renderer/components/PropertyPdcManager.tsx`

**Dependencies**:
- Property types (PdcCheque, LeaseEntry, TenantEntry)
- propertyPdcService
- Accounting engine
- Design system components

**Coupling**: MEDIUM
- Domain-focused component
- Depends on PDC service (good separation)

### Property Deposit Manager

**File**: `src/renderer/components/PropertyDepositManager.tsx`

**Dependencies**:
- Property types (SecurityDeposit, LeaseEntry, TenantEntry)
- propertyDepositService
- Accounting engine
- Design system components

**Coupling**: MEDIUM
- Similar to PDC Manager
- Well-separated business logic

---

## 5. Shared Dependencies

### Design System Components

**Location**: `src/renderer/components/design/`

**Components**: 14 reusable components
- Table, DatePicker, ConfirmDialog, ActionsMenu, etc.

**Dependencies**: Minimal
- React, Framer Motion
- Internal types (minimal)

**Coupling**: VERY LOW - Excellent isolation

**Used By**: 40+ components across both modules

### Chart Components

**Location**: `src/renderer/components/charts/`

**Components**: 7 chart types

**Dependencies**:
- Recharts library
- ChartTheme configuration

**Coupling**: LOW

**Used By**: Investment Dashboard, Property Dashboard, Reports

### Utilities

**Location**: `src/renderer/utils/`

**Files**:
- `pdfVoucherHelper.ts`
- `printVoucherHelper.ts`
- `reportFormatters.ts`

**Dependencies**: Minimal

**Coupling**: VERY LOW

**Used By**: Multiple components across modules


---

## 6. Coupling Analysis

### Tight Coupling Points

#### 1. App.tsx ↔ Everything
**Problem**: Root component depends on all state and passes to all routes

**Impact**:
- Changes ripple throughout
- Hard to test
- Poor encapsulation

**Severity**: HIGH

#### 2. Router Components ↔ All Child Screens
**Problem**: Routers import and render 15-20 screen components each

**Impact**:
- Large bundle size
- Can't lazy load screens
- Recompile entire module for small changes

**Severity**: MEDIUM

#### 3. Investment Module ↔ Property Module (Account Codes)
**Problem**: Both modules use same account code namespace

**Example**:
- Both use `1120` for bank accounts
- Requires filters everywhere: `filterInvestmentAccounts()`, `filterPropertyAccounts()`

**Impact**:
- Runtime filtering overhead
- Easy to leak accounts between modules
- Brittle isolation

**Severity**: MEDIUM

#### 4. Components ↔ Multiple Services
**Problem**: Many components directly import 3-5+ services

**Example**:
```typescript
// PropertyPdcManager.tsx
import { transitionPdcCheque } from '../services/propertyPdcService'
import { createAccountingEngine } from '../accounting/accountingEngine'
import { invalidateBalanceCache } from '../accounting/ledgerService'
```

**Impact**:
- Hard to mock for testing
- Changes to service APIs break many components

**Severity**: LOW-MEDIUM

### Loose Coupling Points (Good)

#### 1. Accounting Engine ↔ Posting Rules
- Clean interface via `getRule()` function
- Rules are data, not code (mostly)
- Could be external configuration

#### 2. Read Models ↔ Components
- Pure functions
- No side effects
- Easy to test

#### 3. Design System ↔ Feature Components
- Props-based interface
- No business logic in design system
- Reusable across modules

---

## 7. Decoupling Recommendations

### 7.1 Introduce Module Plugin Architecture

**Goal**: True module isolation

**Proposed Structure**:
```
src/renderer/
├── core/               # Core accounting engine
│   ├── accounting/
│   ├── services/
│   └── types/
├── modules/
│   ├── investment/
│   │   ├── types.ts
│   │   ├── services/
│   │   ├── components/
│   │   ├── readModels/
│   │   └── config.ts   # Module registration
│   └── property/
│       ├── types.ts
│       ├── services/
│       ├── components/
│       ├── readModels/
│       └── config.ts
└── app/
    ├── App.tsx
    └── ModuleLoader.ts
```

**Benefits**:
- Each module self-contained
- Can enable/disable modules
- Easy to add new modules
- Clear boundaries


### 7.2 Implement Dependency Injection

**Goal**: Invert dependencies, improve testability

**Example**:
```typescript
// Before (tight coupling)
import { createAccountingEngine } from '../accounting/accountingEngine'
const engine = createAccountingEngine()

// After (dependency injection)
interface Props {
  accountingEngine: AccountingEngine
}

function Component({ accountingEngine }: Props) {
  // Use injected engine
}

// In parent/context
<Component accountingEngine={sharedEngine} />
```

**Benefits**:
- Easy to mock in tests
- Shared instances
- Configurable dependencies

### 7.3 Use Facade Pattern for Complex Subsystems

**Goal**: Simplify complex service interactions

**Example - Voucher Facade**:
```typescript
// src/renderer/facades/VoucherFacade.ts
export class VoucherFacade {
  constructor(
    private accountingEngine: AccountingEngine,
    private accounts: Account[],
    private vouchers: Voucher[],
    private auditService: AuditService
  ) {}
  
  async createAndPostVoucher(input: CreateVoucherInput): Promise<Voucher> {
    // Step 1: Create
    const result = this.accountingEngine.processAccountingEvent(/* ... */)
    if (!result.success) throw new Error(result.errors[0].message)
    
    // Step 2: Approve
    const approved = await this.accountingEngine.approve(result.voucher, 'user')
    
    // Step 3: Post
    const posted = await this.accountingEngine.post(approved.voucher, 'user', this.accounts, this.vouchers)
    
    // Step 4: Audit
    await this.auditService.logVoucherPosted(posted.voucher)
    
    return posted.voucher
  }
}
```

**Usage**:
```typescript
// Components use simple facade, not complex engine
const voucher = await voucherFacade.createAndPostVoucher(input)
```

### 7.4 Event Bus for Module Communication

**Goal**: Decouple modules via events instead of direct calls

**Implementation**:
```typescript
// src/renderer/services/EventBus.ts
type EventCallback<T = any> = (data: T) => void

export class EventBus {
  private events = new Map<string, EventCallback[]>()
  
  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(callback)
    
    return () => this.off(event, callback)
  }
  
  emit<T>(event: string, data: T): void {
    const callbacks = this.events.get(event) || []
    callbacks.forEach(cb => cb(data))
  }
  
  off<T>(event: string, callback: EventCallback<T>): void {
    const callbacks = this.events.get(event) || []
    const index = callbacks.indexOf(callback)
    if (index >= 0) callbacks.splice(index, 1)
  }
}

export const eventBus = new EventBus()
```

**Usage**:
```typescript
// Investment module emits event
eventBus.emit('asset:purchased', { assetId, amount })

// Property module listens (if needed)
eventBus.on('asset:purchased', (data) => {
  // React to purchase
})

// Accounting module listens
eventBus.on('asset:purchased', (data) => {
  // Create voucher
})
```

**Benefits**:
- Modules don't know about each other
- Easy to add new listeners
- Testable in isolation

---

## Dependency Graph Visualization

```
┌─────────────────────────────────────────────┐
│             App.tsx (Root)                  │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼─────────┐   ┌───────▼──────────┐
│ InvestmentRouter│   │ PropertyRouter   │
└───────┬─────────┘   └───────┬──────────┘
        │                     │
   ┌────┴────┐           ┌────┴────┐
   │         │           │         │
┌──▼──┐ ┌───▼───┐   ┌───▼──┐ ┌───▼───┐
│Dash │ │Receipt│   │Dash  │ │PDC Mgr│
│board│ │Voucher│   │board │ │       │
└──┬──┘ └───┬───┘   └───┬──┘ └───┬───┘
   │        │           │        │
   └────┬───┴───────────┴────────┘
        │
        │ (All depend on)
        ▼
┌─────────────────────────────────┐
│   Accounting Engine (Core)      │
├─────────────────────────────────┤
│ - postingRules                  │
│ - voucherService                │
│ - ledgerService                 │
│ - chartOfAccountsService        │
└─────────────────────────────────┘
```

## Summary

**Current Coupling Score**: 6/10 (Moderate)

**Strengths**:
- Core accounting engine well-isolated
- Design system properly decoupled
- Services follow single responsibility

**Weaknesses**:
- App.tsx god component
- Module isolation via filtering, not architecture
- Router components too large
- No dependency injection

**Recommended Priority**:
1. Extract App.tsx state to contexts (reduces coupling by 40%)
2. Implement module plugin architecture (future-proofs for scale)
3. Add dependency injection (improves testability)
4. Create facade for complex workflows (simplifies component code)

