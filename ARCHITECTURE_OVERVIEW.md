# InsAcc Architecture Overview — v1.0.0

**Intelligent Asset & Investment Accounting System**

---

## 1. System Overview

InsAcc is a **desktop-only, offline-first** financial management application built with Electron + React + TypeScript. It uses the browser's `localStorage` for data persistence and implements a **CQRS-inspired pattern** with write-side double-entry accounting and read-side projection models.

### Architecture at a Glance

```
┌─────────────────────────────────────────────┐
│                Electron Shell                │
│  ┌─────────────────────────────────────────┐│
│  │         React Application (Vite)         ││
│  │  ┌──────┐ ┌──────────┐ ┌────────────┐  ││
│  │  │ UI   │ │ Read     │ │ Accounting  │  ││
│  │  │ Comp.│◄│ Models   │◄│ Engine      │  ││
│  │  │      │ │(useMemo) │ │(Write Side) │  ││
│  │  └──┬───┘ └──────────┘ └─────┬──────┘  ││
│  │     │                        │          ││
│  │  ┌──▼────────────────────────▼──────┐   ││
│  │  │       localStorage (Electron)     │   ││
│  │  │  keys: insacc_*                   │   ││
│  │  └───────────────────────────────────┘   ││
│  └─────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────┐│
│  │        Electron Main Process            ││
│  │  File dialogs, window management, IPC   ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Desktop Shell | Electron 28 | Cross-platform desktop wrapper |
| UI Framework | React 18 | Component-based UI |
| Language | TypeScript 5.3 | Type safety |
| Build | Vite 5 | Fast development and production builds |
| Animation | Framer Motion 11 | UI micro-interactions |
| Charts | Recharts 2 | SVG-based charts |
| PDF Export | jsPDF 4 + jspdf-autotable | PDF generation |
| XLSX Export | xlsx 0.18 | Excel export |
| Testing | Playwright 1.61 | End-to-end browser testing |

---

## 2. Directory Structure

```
InsAcc/
├── index.html                        # Entry HTML
├── package.json                      # Dependencies & scripts
├── tsconfig.json                     # TypeScript configuration
├── vite.config.ts                    # Vite build configuration
├── playwright.config.ts              # Playwright test configuration
│
├── src/
│   ├── main/
│   │   ├── main.js                   # Electron main process
│   │   └── preload.js                # Electron preload (context bridge)
│   │
│   └── renderer/
│       ├── index.tsx                 # React entry point
│       ├── App.tsx                   # Root component, routing, state
│       ├── types.d.ts                # Global type declarations
│       ├── utils.ts                  # Shared utilities
│       ├── usePersistedState.ts      # localStorage sync hook
│       │
│       ├── accounting/               # Double-entry accounting engine
│       │   ├── types.ts              # Core domain types
│       │   ├── accountingEngine.ts   # Event processor
│       │   ├── postingRules.ts       # Debit/credit rule definitions
│       │   ├── postingValidator.ts   # Voucher validation
│       │   ├── voucherService.ts     # Voucher lifecycle management
│       │   ├── ledgerService.ts      # Ledger query functions
│       │   ├── chartOfAccountsService.ts  # Account tree operations
│       │   ├── defaultAccounts.ts    # Default chart generation
│       │   ├── assetAccountMapping.ts     # Asset account auto-creation
│       │   └── bankAccountMapping.ts      # Bank account auto-creation
│       │
│       ├── components/               # UI components
│       │   ├── Sidebar.tsx           # Navigation sidebar
│       │   ├── Login.tsx             # Authentication screen
│       │   ├── ProfileSelection.tsx  # User profile picker
│       │   ├── ModuleSelection.tsx   # Module selection screen
│       │   ├── InvestmentDashboard.tsx, InvestmentRouter.tsx, ...
│       │   ├── PropertyDashboard.tsx, PropertyRouter.tsx, ...
│       │   ├── charts/               # Chart components
│       │   └── design/               # Design system components
│       │
│       ├── data/                     # Type definitions & seed data
│       │   ├── types.ts              # Shared types
│       │   ├── purchaseLedger.ts     # Purchase record types
│       │   ├── propertyTypes.ts      # Property module types
│       │   ├── banking.ts            # Banking types
│       │   ├── investmentSeedData.ts # Investment seed data
│       │   ├── propertySeedData.ts   # Property seed data
│       │   ├── seedVouchers.ts       # Accounting seed vouchers
│       │   └── ...
│       │
│       ├── readModels/               # CQRS read model projections
│       │   ├── InvestmentDashboardReadModel.ts
│       │   ├── InvestmentFinancialOverviewReadModel.ts
│       │   ├── InvestmentHistoryReadModel.ts
│       │   ├── InvestmentHoldingsReadModel.ts
│       │   ├── InvestmentReportsReadModel.ts
│       │   └── InvestmentBankReadModel.ts
│       │
│       ├── services/                 # Business logic services
│       │   ├── purchaseLedgerService.ts
│       │   ├── auditService.ts
│       │   ├── exportService.ts
│       │   ├── reportExportService.ts
│       │   ├── reportService.ts
│       │   ├── bankingService.ts
│       │   ├── propertyPdcService.ts
│       │   ├── propertyFinancialStatements.ts
│       │   └── ...
│       │
│       └── styles/
│           └── theme.css             # Complete design system (3455 lines)
│
├── docs/                             # Project documentation
│   ├── PRD.md                        # Product Requirements Document
│   ├── ARCHITECTURE.md               # Detailed architecture docs
│   ├── ACCOUNTING_ARCHITECTURE.md    # Accounting engine design
│   ├── BANKING_ARCHITECTURE.md       # Banking module design
│   ├── CURRENT_DESIGN_SYSTEM.md      # Design system v1.0
│   ├── TARGET_DESIGN_SYSTEM.md       # Design system v2.0 (aspirational)
│   └── ...
│
├── qa-*.spec.ts                      # Playwright test files (3 specs)
├── release/                          # Electron build output
├── resources/                        # App icons
└── scripts/                          # Build scripts
```

---

## 3. Core Architecture Patterns

### 3.1 State Management

InsAcc uses **no state management library**. Instead:
- **React `useState` / `useReducer`**: Local component state
- **`usePersistedState`**: Custom hook that syncs state changes to `localStorage`
- **Central state in `App.tsx`**: All major data arrays (investments, transactions, accounts, vouchers, property data) are managed in the root component and passed down via props

```typescript
// usePersistedState.ts pattern
function usePersistedState<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state))
  }, [key, state])

  return [state, setState]
}
```

### 3.2 CQRS-Inspired Pattern

The application follows a simplified CQRS (Command Query Responsibility Segregation) pattern:

**Write Side** (Commands):
- `accounting/` — Creates, approves, posts vouchers
- `services/` — Business logic for purchases, transactions, property operations
- All writes go through the accounting engine or service functions that update state and persist to `localStorage`

**Read Side** (Queries):
- `readModels/` — Pure projection functions that take raw state and compute derived data
- Components consume read models via `useMemo()` — they recompute only when source data changes
- No caching layer needed — computations are fast for typical data sizes

```typescript
// Read model pattern
function getInvestmentDashboardProjection(
  accounts: Account[],
  vouchers: Voucher[],
  purchases: PurchaseRecord[]
): InvestmentDashboardProjection {
  // Pure function — no side effects, no state mutation
  return {
    portfolioValue: computePortfolioValue(purchases),
    cashBalance: computeCashBalance(accounts, vouchers),
    incomeExpenses: computeIncomeExpenses(vouchers),
    allocation: computeAllocation(purchases),
    growthHistory: computeGrowthHistory(vouchers),
    cashFlowHistory: computeCashFlowHistory(vouchers),
  }
}

// Component usage — automatically reactive
function InvestmentDashboard({ accounts, vouchers, purchases }) {
  const projection = useMemo(
    () => getInvestmentDashboardProjection(accounts, vouchers, purchases),
    [accounts, vouchers, purchases]
  )
  return <DashboardView data={projection} />
}
```

### 3.3 Double-Entry Accounting Engine

The accounting engine (`src/renderer/accounting/`) is the most architecturally significant subsystem:

```
AccountingEvent (e.g., ASSET_PURCHASE, RENTAL_INCOME, BANK_DEPOSIT)
    │
    ▼
accountingEngine.ts
    │  ┌──────────────────────────────────────┐
    │  │  createAccountingEngine()             │
    │  │  1. Resolves posting rules            │
    │  │  2. Creates voucher with debit/credit │
    │  │  3. Publishes VoucherEvent            │
    │  └──────────────────────────────────────┘
    │
    ▼
postingRules.ts
    │  Maps AccountingEvent → { debits: AccountRef[], credits: AccountRef[] }
    │
    ▼
postingValidator.ts
    │  Validates: balanced lines, valid accounts, amounts > 0, allowed status transitions
    │
    ▼
voucherService.ts
    │  Voucher lifecycle: Draft → Approved → Posted
    │  Each state transition is validated and recorded
    │
    ▼
ledgerService.ts
    │  Query functions: getAccountBalance, getRunningBalance, getTrialBalance, etc.
    │  No mutation — pure computation over the write model
```

**Chart of Accounts Structure:**

| Code Range | Type | Examples |
|------------|------|----------|
| 1000-1999 | Asset | Cash at Bank (1120), Accounts Receivable (1200), Gold (1501) |
| 2000-2999 | Liability | Accounts Payable (2100), Security Deposits (2500) |
| 3000-3999 | Equity | Capital (3100), Retained Earnings (3200) |
| 4000-4999 | Revenue | Dividend Income (4100), Rental Income (4200) |
| 5000-5999 | Expense | Maintenance (5100), Utilities (5200), Management Fees (5300) |

---

## 4. Data Flow

### 4.1 Investment Purchase Flow

```
User clicks "Record Purchase"
    │
    ▼
PurchaseLedger component
    │  Validates form input
    │  Creates PurchaseRecord
    │  Updates localStorage (insacc_purchases)
    │
    ▼
purchaseAccountingService.ts
    │  Creates ASSET_PURCHASE AccountingEvent
    │
    ▼
accountingEngine.ts
    │  Resolves posting rule: Debit "Gold Account" / Credit "Cash at Bank"
    │  Creates voucher (status: Approved)
    │  Posts voucher (status: Posted)
    │  Updates localStorage (insacc_vouchers, insacc_accounts)
    │
    ▼
UI re-renders
    │  DashboardReadModel recomputes → KPIs & charts update
    │  HoldingsReadModel recomputes → holdings table updates
    │  ReportsReadModel recomputes → all report tabs update
    │  LedgerService recomputes → trial balance, balance sheet, P&L update
```

### 4.2 Property Lease Flow

```
User creates lease with PDC cheques
    │
    ▼
PropertyLeases component
    │  Creates lease record with tenant, unit, rent, cheques
    │  Updates localStorage
    │
    ▼
propertyPdcService.ts
    │  Generates PDC cheque slots based on lease configuration
    │
    ▼
PropertyPdcManager
    │  User deposits cheque → PDC status changes
    │  Creates BANK_DEPOSIT AccountingEvent → voucher created/posted
    │  Bank balance updates automatically
```

### 4.3 Bank Transaction Flow

```
User performs Deposit
    │
    ▼
InvestmentBankAccounts / PropertyBankAccounts
    │  Creates bank transaction record
    │  Creates BANK_DEPOSIT AccountingEvent
    │
    ▼
accountingEngine
    │  Debit "Cash at Bank" / Credit "Revenue" (for income)
    │  or Debit "Expense" / Credit "Cash at Bank" (for expense)
    │  Creates and posts voucher
    │
    ▼
Read models recompute
    │  Bank dashboard projection updates
    │  Financial overview projection updates
```

---

## 5. Component Architecture

### 5.1 Page Routing

Routing is handled by two router components:
- `InvestmentRouter.tsx` — Routes for Investment module pages
- `PropertyRouter.tsx` — Routes for Property module pages

Both use conditional rendering based on state rather than a router library:

```typescript
function InvestmentRouter({ page, ...props }) {
  switch (page) {
    case 'dashboard': return <InvestmentDashboard ... />
    case 'holdings': return <InvestmentHoldings ... />
    case 'transactions': return <Transactions ... />
    // ...
  }
}
```

### 5.2 Sidebar Navigation

The `Sidebar.tsx` component maintains two navigation configurations:

- **Investment Nav** (`INV_NAV`): Dashboard, Holdings, Investments, Transactions, Bank Accounts, Reports, Documents, History, Purchase Ledger, Settings + Accounts sub-group (Receipt/Payment/Journal Voucher, Chart of Accounts, Trial Balance, Balance Sheet, P&L)
- **Property Nav** (`PROP_NAV`): Dashboard, Properties, Tenants, Leases, Bank Accounts, Reports, Documents, History, Settings + Accounts sub-group (same accounting pages)

### 5.3 Design System

All reusable components are in `components/design/`:
- `DesignSystem.tsx` — Button, Input, Select, Badge, KpiCard, Card, Modal, EmptyState, SegmentedControl + SVG icon components
- `Table.tsx` — Data table with sorting, pagination, search, sticky headers, loading/empty states
- `EntityForm.tsx` — Modal form wrapper
- `ConfirmDialog.tsx` — Confirmation modal with danger/primary variants
- `DatePicker.tsx` — Date and month picker inputs

---

## 6. Data Storage

### 6.1 localStorage Schema

All data is stored in `localStorage` with the `insacc_` prefix:

| Key | Type | Description |
|-----|------|-------------|
| `insacc_clear_version` | number | Schema version (current: 9). Incrementing wipes all data. |
| `insacc_investments` | Investment[] | Investment purchase records |
| `insacc_transactions` | Transaction[] | Income/Expense/Journal entries |
| `insacc_bank_accounts` | BankAccount[] | Bank account definitions |
| `insacc_bank_transactions` | BankTransaction[] | Bank statement entries |
| `insacc_purchases` | PurchaseRecord[] | Purchase ledger records |
| `insacc_documents` | DocItem[] | Uploaded documents (base64) |
| `insacc_accounts` | Account[] | Chart of accounts |
| `insacc_vouchers` | Voucher[] | Accounting vouchers |
| `insacc_users` | UserEntry[] | User profiles |
| `insacc_activity_log` | LogEntry[] | Audit activity log |
| `insacc_prop_categories` | PropCategory[] | Property categories |
| `insacc_prop_buildings` | PropBuilding[] | Property buildings |
| `insacc_prop_units` | PropUnit[] | Property units |
| `insacc_prop_tenants` | PropTenant[] | Property tenants |
| `insacc_prop_leases` | PropLease[] | Property leases with rent and PDC |
| `insacc_prop_transactions` | PropTransaction[] | Property bank transactions |
| `insacc_prop_accounts` | PropAccount[] | Property bank accounts |
| `insacc_prop_docs` | PropDocItem[] | Property documents |
| `insacc_pdc_cheques` | PdcCheque[] | Post-dated cheques |
| `insacc_audit_events` | AuditEvent[] | Audit trail events |

### 6.2 Schema Versioning

On application start, `App.tsx` compares the stored `CLEAR_VERSION` with the current version. If they differ, all `insacc_*` keys are cleared and seed data is re-generated. This ensures data integrity across schema changes.

```typescript
const CLEAR_VERSION = 9
const storedVersion = localStorage.getItem('insacc_clear_version')

if (storedVersion !== String(CLEAR_VERSION)) {
  // Clear all insacc_* keys
  Object.keys(localStorage)
    .filter(k => k.startsWith('insacc_'))
    .forEach(k => localStorage.removeItem(k))
  localStorage.setItem('insacc_clear_version', String(CLEAR_VERSION))
  // Seed data will be generated by the seed useEffect
}
```

---

## 7. Authentication & Security Model

### 7.1 Login Flow

```
User enters credentials
    │
    ▼
Login.tsx
    │  Compares password against localStorage 'insacc_password'
    │  (default: '1234') — plaintext comparison
    │  Any email is accepted
    │
    ├── Success → ProfileSelection.tsx
    └── Failure → Error toast "Invalid credentials"
```

### 7.2 Role-Based Access

Two roles:
- **Admin**: Full access to all features including user management, password change, and data reset
- **Accounts**: Read/write access to data entry features; user management and data reset pages are hidden

Role is determined by the selected profile in `ProfileSelection.tsx`.

### 7.3 Security Constraints (Electron)

```javascript
// main.js
const win = new BrowserWindow({
  webPreferences: {
    contextIsolation: true,   // Renderer cannot access Node.js APIs
    nodeIntegration: false,   // No require() in renderer
    preload: path.join(__dirname, 'preload.js'),
  }
})
```

---

## 8. Build & Distribution

### Build Pipeline

```
npm run dev           # Vite dev server (port 5174) + Electron
npm run build         # Vite build + electron-builder (Windows)
npm run build:mac     # Vite build + electron-builder (macOS)
npm run build:linux   # Vite build + electron-builder (Linux)
npm run build:all     # All platforms
```

### Build Configuration

- **Vite**: Bundles React app into `dist/` with `./` base path for Electron file:// protocol
- **Electron-Builder**: Packages into platform-specific installers
- **Output**: Windows portable .exe, macOS .dmg/.zip, Linux AppImage/.deb

### Testing

Playwright tests run against the Vite dev server:
```
npx playwright test   # 76 tests, 3 spec files, ~1.7 min
```

---

## 9. Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| No state management library | `localStorage` + React state is sufficient for single-user desktop app; avoids added complexity |
| CQRS-inspired pattern | Separate read and write models prevent circular data flows and make data flow easy to trace |
| `useMemo` for read models | Pure functions that recompute only on data change — automatic reactivity without a store |
| CSS custom properties for theming | Single variable change propagates across 3455 lines of CSS; light/dark mode is one class toggle |
| No router library | Simple `switch` statements in router components suffice for ~20 pages across 2 modules |
| Plaintext password | Acceptable for a local-only desktop app; a real deployment would add hashing |
| `localStorage` for persistence | Works offline, requires no server, instant reads — ideal for single-machine use |
| No backend | Core requirement: offline-first, zero infrastructure, single machine |

---

## 10. Related Documentation

| Document | Location | Content |
|----------|----------|---------|
| Architecture (detailed) | `docs/ARCHITECTURE.md` | Full technical architecture with data flow diagrams |
| Accounting Architecture | `docs/ACCOUNTING_ARCHITECTURE.md` | Double-entry engine design, voucher lifecycle, posting rules |
| Banking Architecture | `docs/BANKING_ARCHITECTURE.md` | Multi-account banking design (includes target v2.0) |
| Design System v1.0 | `docs/CURRENT_DESIGN_SYSTEM.md` | CSS custom properties, component specs, spacing/typography scales |
| Design System v2.0 | `docs/TARGET_DESIGN_SYSTEM.md` | Aspirational redesign of the design system |
| Migration Plan | `docs/MIGRATION_PLAN.md` | Plan to evolve from v1.0 to v2.0 |
| Purchase Ledger | `docs/PURCHASE_LEDGER_ARCHITECTURE.md` | Purchase ledger data model and future redesign |
| Reports Architecture | `docs/REPORTS_ARCHITECTURE.md` | Reports UI architecture from Sprint 5 |
| PRD | `docs/PRD.md` | Product requirements with all feature specifications |
| UX Overview | `docs/ux-overview.md` | Design principles and UX approach |
| UX Review | `docs/ux-review.md` | Accessibility and consistency audit |
