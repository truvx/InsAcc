# InsAcc Codebase Analysis

**Generated:** 2026-07-06  
**Purpose:** Deep technical analysis of code organization, patterns, and implementation details

## Table of Contents

1. [Code Metrics](#code-metrics)
2. [File Organization](#file-organization)
3. [Component Analysis](#component-analysis)
4. [Service Layer Analysis](#service-layer-analysis)
5. [State Management](#state-management)
6. [Type Safety](#type-safety)

---

## 1. Code Metrics

### Overall Statistics
- **Total Files**: 156 TypeScript/TSX files
- **Lines of Code**: Approximately 50,000+ lines
- **React Components**: 58 components using hooks
- **Services**: 23 service modules
- **Accounting Modules**: 15 specialized accounting files
- **Read Models**: 6 projection modules
- **Type Definition Files**: Multiple `types.ts` files per domain

### Complexity Indicators
- **Longest File**: `App.tsx` (~850 lines with migrations)
- **Most Complex Service**: `ledgerService.ts` (600+ lines, 30+ functions)
- **Largest Posting Rules**: `postingRules.ts` (673 lines, 40+ rules)

---

## 2. File Organization

### Directory Structure Analysis

#### `/src/renderer/accounting/` - Core Accounting Engine
**Purpose**: Double-entry bookkeeping system  
**Files**: 15 files, ~4,000 lines

| File | Lines | Purpose |
|------|-------|---------|
| `accountingEngine.ts` | 200 | Event processing, voucher lifecycle |
| `postingRules.ts` | 673 | Business rule definitions (40+ events) |
| `voucherService.ts` | 200 | Voucher CRUD operations |
| `ledgerService.ts` | 600+ | Balance calculations, trial balance |
| `chartOfAccountsService.ts` | 350 | CoA management and initialization |
| `postingValidator.ts` | 150 | Validation rules |
| `periodService.ts` | 100 | Fiscal period management |

| `assetAccountMapping.ts` | 80 | Asset-to-account mapping |
| `bankAccountMapping.ts` | 100 | Bank-to-GL account mapping |
| `investmentAccountFilter.ts` | 150 | Module isolation (Investment) |
| `propertyAccountFilter.ts` | 100 | Module isolation (Property) |
| `propertyAccountingService.ts` | 150 | Property-specific logic |
| `dataIntegrityService.ts` | 200 | Data validation and cleanup |
| `systemAccountRegistry.ts` | 250 | System account resolution |
| `types.ts` | 300 | Core type definitions |

**Quality**: Well-organized, clear separation of concerns

#### `/src/renderer/services/` - Business Logic Layer
**Purpose**: Domain services and business operations  
**Files**: 23 services, ~8,000 lines

Key Services:
- `investmentAccountingService.ts` - Investment-specific accounting (100 lines)
- `propertyAccountingService.ts` - Property voucher processing (150 lines)
- `purchaseLedgerService.ts` - Purchase tracking and valuation (350 lines)
- `propertyPdcService.ts` - PDC lifecycle management (200 lines)
- `propertyDepositService.ts` - Security deposit transactions (200 lines)
- `bankReconciliationService.ts` - Bank reconciliation logic (250 lines)
- `reportService.ts` - Report generation (300 lines)
- `exportService.ts` - Data export functionality (200 lines)
- `auditService.ts` - Audit trail management (150 lines)

**Quality**: Good separation, some opportunities for consolidation

#### `/src/renderer/components/` - UI Layer
**Purpose**: React components for user interface  
**Files**: 60+ components, ~15,000 lines

Component Categories:
1. **Module Routers**: `InvestmentRouter.tsx`, `PropertyRouter.tsx`
2. **Dashboard Views**: `InvestmentDashboard.tsx`, `PropertyDashboard.tsx`
3. **Voucher Forms**: `*ReceiptVoucher.tsx`, `*PaymentVoucher.tsx`, `*JournalVoucher.tsx`
4. **Financial Reports**: `*TrialBalance.tsx`, `*BalanceSheet.tsx`, `*ProfitLoss.tsx`
5. **Master Data**: `*ChartOfAccounts.tsx`, `*BankAccounts.tsx`
6. **Property Specific**: `PropertyLeases.tsx`, `PropertyPdcManager.tsx`, `PropertyDepositManager.tsx`
7. **Design System**: `/design/` subfolder with reusable components

**Naming Convention**: Module prefix + Feature name (e.g., `InvestmentHoldings.tsx`, `PropertyTenants.tsx`)


#### `/src/renderer/readModels/` - Data Projections
**Purpose**: CQRS-style read-side projections  
**Files**: 6 files, ~2,500 lines

| File | Purpose | Complexity |
|------|---------|-----------|
| `InvestmentDashboardReadModel.ts` | Portfolio metrics, growth charts | High |
| `InvestmentBankReadModel.ts` | Bank balance projections | Medium |
| `InvestmentReportsReadModel.ts` | Report aggregations | High |
| `InvestmentHoldingsReadModel.ts` | Asset holdings summary | Medium |
| `InvestmentHistoryReadModel.ts` | Transaction history | Low |
| `InvestmentFinancialOverviewReadModel.ts` | Financial overview | Medium |

**Quality**: Excellent pattern - pure functions, testable, reusable

#### `/src/renderer/data/` - Type Definitions & Seed Data
**Purpose**: TypeScript types and default data  
**Files**: 12 files, ~3,000 lines

Key Files:
- `types.ts` - Core domain types
- `banking.ts` - Bank account types
- `propertyTypes.ts` - Property/lease/tenant types (500+ lines)
- `masterData.ts` - Master data types (currencies, tax codes, vendors)
- `investmentMasterData.ts` - Investment categories and assets
- `purchaseData.ts` - Purchase category types
- `purchaseLedger.ts` - Purchase ledger types
- `auditTypes.ts` - Audit event types
- `sampleData.ts` - Default seed data

**Quality**: Comprehensive type coverage, good documentation

---

## 3. Component Analysis

### Component Categories

#### Large Components (500+ lines)
Potential refactoring candidates:
- `PropertyRouter.tsx` - Route switching + data mapping logic
- `InvestmentRouter.tsx` - Similar pattern to PropertyRouter
- `PropertyPdcManager.tsx` - Complex PDC lifecycle UI
- `PropertyDepositManager.tsx` - Security deposit management UI
- `InvestmentHoldings.tsx` - Holdings table with multiple views

#### Medium Components (200-500 lines)
Well-sized, single responsibility:
- Most voucher forms
- Dashboard components
- Financial statement components
- Bank account management


#### Small Components (<200 lines)
Ideal size:
- Design system components (Table, DatePicker, ConfirmDialog, etc.)
- Chart components
- Utility components (PeriodSelector, Toast, etc.)

### Component Patterns

#### Props Drilling Pattern
Components receive 10-20+ props from parent routers:
```typescript
interface Props {
  currency: string
  dateFormat: string
  accounts: Account[]
  setAccounts: Dispatch<SetStateAction<Account[]>>
  vouchers: Voucher[]
  setVouchers: Dispatch<SetStateAction<Voucher[]>>
  // ... 10-15 more props
}
```

**Analysis**: This is verbose but explicit. Could benefit from context API for common props.

#### State Setter Pattern
Components receive both state and setState for direct mutation:
```typescript
const [vouchers, setVouchers] = useState<Voucher[]>([])
<Component vouchers={vouchers} setVouchers={setVouchers} />
```

**Analysis**: Simple and effective for small apps. Lacks centralized state management benefits.

#### useMemo for Expensive Calculations
Components use useMemo extensively for derived state:
```typescript
const filteredAccounts = useMemo(
  () => filterInvestmentAccounts(accounts),
  [accounts]
)
```

**Quality**: Good performance optimization

---

## 4. Service Layer Analysis

### Service Responsibilities

#### Accounting Services
- **investmentAccountingService.ts**: Bank mappings, asset account lookups
- **propertyAccountingService.ts**: Lease accounting, security deposits, PDC accounting
- **purchaseLedgerService.ts**: Purchase validation, cost basis, weighted average

**Pattern**: Services are stateless pure functions that accept state and return transformations

#### Lifecycle Services
- **propertyPdcService.ts**: PDC status transitions, validation, replacement
- **propertyDepositService.ts**: Deposit balance computation, transaction recording
- **transactionLifecycleService.ts**: Generic transaction workflows

**Pattern**: State machines with validation rules


#### Aggregation Services
- **investmentAggregationService.ts**: Sync purchase records to investment holdings
- **reportService.ts**: Generate complex reports from vouchers
- **bankTransactionService.ts**: Aggregate bank transactions

**Pattern**: Read-heavy services that transform and aggregate data

### Service Quality Metrics

**Strengths**:
- Pure functions (no side effects)
- Type-safe with TypeScript
- Unit-testable
- Clear naming conventions

**Weaknesses**:
- Some duplication between Investment and Property services
- No dependency injection (direct imports)
- Some services are growing large (reportService ~300 lines)

---

## 5. State Management

### State Architecture

#### Root State (App.tsx)
All application state lives in `App.tsx` as individual useState/usePersistedState hooks:

**Investment State** (15+ state variables):
- `accounts`, `vouchers`, `bankMappings`
- `bankAccounts`, `bankTransactions`
- `investments`, `transactions`, `documents`
- `purchaseRecords`, `purchaseCategories`
- `investmentCategories`, `investmentAssets`
- `auditEvents`, `invUsers`, `storedLogs`

**Property State** (15+ state variables):
- `propChartAccounts`, `propVouchers`, `propBankMappings`
- `propAccounts`, `propTransactions`
- `propProperties`, `propUnits`, `propTenants`, `propLeases`
- `pdcCheques`, `securityDeposits`, `depositMappings`
- `propDocuments`, `propAuditEvents`, `propExpenses`

**Settings State** (10+ variables):
- `theme`, `currency`, `dateFormat`, `language`
- `storedPassword`, `autoLogout`
- `selectedProfile`, `activeModule`, `activePage`

**Total State Variables**: 40+ in App.tsx

### usePersistedState Hook

Custom hook pattern:
```typescript
const [state, setState, resetState] = usePersistedState<T>(
  'localStorage_key',
  defaultValue
)
```

**Implementation**: Wraps useState and syncs to localStorage on every setState call

**Strengths**:
- Simple API
- Automatic persistence
- Reset functionality

**Weaknesses**:
- localStorage write on every state change (could be debounced)
- No migration strategy in hook (migrations live in App.tsx)
- Serialization errors not handled


### Data Migration Pattern

App.tsx contains extensive migration logic in useEffect hooks:

**Migration Versions**:
- `insacc_all_datasets_cleared_v3` - Full data reset
- `insacc_inv_bank_ob_zeroed_v4` - Zero opening balances
- `insacc_leases_cleared_v1` - Clear lease data
- `insacc_ptcat_sd_removed_v5` - Deactivate security deposit category
- `insacc_mixed_data_split_v6` - Split mixed module data

**Pattern**:
1. Check if migration key exists in localStorage
2. If not, perform migration logic
3. Set migration key to prevent re-running

**Quality**: Functional but fragile. Migrations embedded in component code.

---

## 6. Type Safety

### TypeScript Coverage

**Type Definition Quality**: Excellent

Key Type Files:
- `accounting/types.ts` - Account, Voucher, VoucherLine, PostingRule, etc.
- `data/types.ts` - User, Transaction, Document, etc.
- `data/banking.ts` - BankAccount, BankTransaction
- `data/propertyTypes.ts` - 20+ property-related types
- `data/masterData.ts` - Currency, TaxCode, Vendor, etc.

### Type Patterns

#### Discriminated Unions
```typescript
type VoucherType = 'Payment' | 'Receipt' | 'Journal' | 'Contra'
type VoucherStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Posted' | 'Cancelled' | 'Reversed'
type LineType = 'Debit' | 'Credit'
```

#### Generic Types
```typescript
interface PostingRuleEntry {
  account: string | ((ctx: RuleContext) => string)
  narration?: string
}
```

#### Extensive Interfaces
Property types exceed 500 lines, covering:
- Properties, Units, Tenants, Leases
- PDC Cheques with full lifecycle
- Security Deposits with transactions
- Property hierarchies
- Income categories

### Type Safety Issues

**Implicit `any`**: Minimal occurrences, mostly in legacy migration code

**Type Assertions**: Used sparingly, mainly for localStorage deserialization

**Optional Chaining**: Heavy use of `?.` operator, indicating potential null/undefined issues

