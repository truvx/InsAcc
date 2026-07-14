# InsAcc Technical Debt Analysis

**Generated:** 2026-07-06  
**Purpose:** Identify technical debt, code smells, and areas requiring improvement

## Table of Contents

1. [Critical Issues](#critical-issues)
2. [Code Duplication](#code-duplication)
3. [Hardcoded Values](#hardcoded-values)
4. [Architecture Issues](#architecture-issues)
5. [Performance Concerns](#performance-concerns)
6. [Maintainability Issues](#maintainability-issues)
7. [Missing Functionality](#missing-functionality)

---

## 1. Critical Issues

### 1.1 Migration Logic in Component Code

**Issue**: App.tsx contains ~300 lines of migration logic in useEffect hooks

**Impact**: 
- Difficult to test
- Mixed concerns (UI + data migration)
- Hard to maintain migration history
- Potential bugs if migrations run in wrong order

**Location**: `/src/renderer/App.tsx` lines 40-300+

**Recommendation**:
- Extract migrations to dedicated service
- Create migration registry
- Run migrations before React renders
- Example structure:
  ```typescript
  // src/renderer/services/migrations/
  // - index.ts
  // - v3_clear_datasets.ts
  // - v4_zero_opening_balances.ts
  // - v5_deactivate_security_deposit_category.ts
  ```

**Priority**: HIGH - Affects data integrity and maintainability


### 1.2 Massive Root Component

**Issue**: App.tsx has 40+ state variables, 850+ lines

**Impact**:
- Hard to understand and maintain
- Performance issues (entire app re-renders on any state change)
- Prop drilling nightmare (10-20 props passed to child components)
- Testing is nearly impossible

**Current Structure**:
```typescript
function App() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  // ... 37 more state variables
  
  // ... 15+ useEffect hooks
  
  // ... 300+ lines of migration logic
  
  // ... render logic
}
```

**Recommendation**:
- Split into context providers
- Move module state to respective routers
- Use composition instead of prop drilling
- Create AppStateProvider, InvestmentStateProvider, PropertyStateProvider

**Priority**: HIGH - Major architecture smell

### 1.3 No Centralized Error Handling

**Issue**: Errors are handled inconsistently across components

**Impact**:
- Silent failures
- Poor user experience
- Difficult debugging
- Data corruption potential

**Examples**:
- LocalStorage failures not caught
- Validation errors shown via console.log
- No error boundaries for React crashes

**Recommendation**:
- Implement React Error Boundaries
- Create centralized error service
- Add error logging/reporting
- Show user-friendly error messages

**Priority**: MEDIUM - Affects reliability


### 1.4 LocalStorage as Database

**Issue**: All data stored in localStorage as serialized JSON

**Impact**:
- Size limits (5-10MB depending on browser)
- No transactions (atomic operations)
- No data integrity guarantees
- Synchronous I/O blocks UI
- No querying capabilities
- No indexing

**Current Scale**:
- ~40 localStorage keys
- Potentially thousands of records per key
- Could hit size limits with heavy usage

**Recommendation**:
- Migrate to IndexedDB for larger datasets
- Use SQLite via Electron's native capabilities
- Implement proper data layer abstraction
- Add database migration system

**Priority**: MEDIUM - Will become critical with scale

---

## 2. Code Duplication

### 2.1 Duplicate Balance Calculation Logic

**Issue**: Balance calculations repeated across multiple files

**Locations**:
- `ledgerService.ts` - Main implementation
- `InvestmentDashboardReadModel.ts` - Dashboard-specific calculations
- `InvestmentBankReadModel.ts` - Bank balance calculations
- Individual components doing manual sums

**Pattern**:
```typescript
// Appears 20+ times across codebase
Math.round(value * 100) / 100
```

```typescript
// Appears 15+ times
vouchers.filter(v => v.status === 'Posted')
```

```typescript
// Appears 10+ times
lines.reduce((sum, line) => {
  return line.type === 'Debit' ? sum + line.amount : sum - line.amount
}, 0)
```

**Recommendation**:
- Extract to shared utility functions
- Create `balanceUtils.ts` with:
  - `roundCurrency(value: number): number`
  - `getPostedVouchers(vouchers: Voucher[]): Voucher[]`
  - `sumLinesAmount(lines: VoucherLine[], type?: LineType): number`

**Priority**: LOW - Functional but inelegant


### 2.2 Duplicate Module Patterns

**Issue**: Investment and Property modules have parallel implementations

**Examples**:
- `InvestmentRouter.tsx` vs `PropertyRouter.tsx` - 80% similar code
- `InvestmentDashboard.tsx` vs `PropertyDashboard.tsx` - Similar structure
- `InvestmentChartOfAccounts.tsx` vs `PropertyChartOfAccounts.tsx` - Nearly identical
- `InvestmentBankAccounts.tsx` vs `PropertyBankAccounts.tsx` - Same component logic

**Impact**:
- Bug fixes must be applied twice
- Features added to one module often missing in other
- Inconsistent UX between modules

**Recommendation**:
- Create generic components with module parameter
- Extract shared logic to hooks
- Use composition over duplication
- Example:
  ```typescript
  <GenericDashboard 
    module="investment"
    accounts={investmentAccounts}
    vouchers={investmentVouchers}
  />
  ```

**Priority**: MEDIUM - Maintenance burden

### 2.3 Redundant Voucher Forms

**Issue**: Three separate voucher forms per module (Receipt, Payment, Journal) with 70% overlapping code

**Files**:
- `InvestmentReceiptVoucher.tsx` (~600 lines)
- `InvestmentPaymentVoucher.tsx` (~600 lines)
- `InvestmentJournalVoucher.tsx` (~500 lines)
- Property equivalents

**Duplicate Logic**:
- Form state management
- Validation
- Voucher submission
- UI layout
- Line item management

**Recommendation**:
- Create `GenericVoucherForm` component
- Pass voucher type as prop
- Conditionally render type-specific fields
- Reduce 6 files (~3,000 lines) to 1 file (~800 lines)

**Priority**: HIGH - High duplication cost


---

## 3. Hardcoded Values

### 3.1 Magic Account Codes

**Issue**: Account codes hardcoded across 50+ files

**Examples**:
```typescript
// Appears in 15+ files
const rentReceivable = accounts.find(a => a.code === '1130')

// Appears in 20+ files
const bankParent = accounts.find(a => a.code === '1120')

// Appears in 10+ files
const depositLiability = accounts.find(a => a.code === '2120')
```

**Full List of Hardcoded Codes**:
- `1110` (Cash) - 25+ occurrences
- `1120` (Bank) - 30+ occurrences
- `1130` (Rent Receivable) - 15+ occurrences
- `1210-1260` (Investment types) - 10+ occurrences each
- `1270` (Real Estate) - 12+ occurrences
- `1320` (Accounts Receivable) - 8+ occurrences
- `1410` (PDC) - 10+ occurrences
- `2110` (Deferred Revenue) - 6+ occurrences
- `2120` (Security Deposits) - 20+ occurrences
- `2200` (Owner Account) - 8+ occurrences
- `4110` (Dividend Income) - 5+ occurrences
- `4120` (Rental Income) - 15+ occurrences
- `5120` (Maintenance) - 8+ occurrences

**Impact**:
- Impossible to customize Chart of Accounts
- Hard to support multiple countries/regions
- Brittle code (breaks if codes change)

**Recommendation**:
- Create `AccountCodeRegistry.ts`:
  ```typescript
  export const ACCOUNT_CODES = {
    CASH: '1110',
    BANK: '1120',
    RENT_RECEIVABLE: '1130',
    SECURITY_DEPOSITS: '2120',
    // ... etc
  } as const
  ```
- Use SystemAccountRegistry for lookups
- Make codes configurable per country

**Priority**: HIGH - Flexibility blocker

### 3.2 Hardcoded Currencies

**Issue**: Currency codes hardcoded in logic

**Examples**:
```typescript
currency === 'AED' ? ... : currency === 'INR' ? ... : currency === 'GBP' ? ...
```

**Occurrences**: 50+ instances across codebase

**Impact**:
- Limited to 3 currencies
- Hard to add new currencies
- Currency logic scattered

**Recommendation**:
- Use master data table for currencies
- Currency service for formatting
- Remove hardcoded currency checks

**Priority**: MEDIUM - Feature limitation


### 3.3 Magic Numbers

**Issue**: Unexplained numeric constants

**Examples**:
```typescript
// What is 500000?
if (Number(ba.openingBalance) === 500000) { /* ... */ }

// Why 0.001?
Math.abs(totalDebit - totalCredit) < 0.001

// Why 100?
Math.round(value * 100) / 100

// Why 2000?
limit: 2000  // lines to read
```

**Recommendation**:
- Extract to named constants:
  ```typescript
  const LEGACY_SEED_BALANCE = 500000
  const ROUNDING_TOLERANCE = 0.001
  const CURRENCY_DECIMAL_PLACES = 2
  const DEFAULT_PAGE_SIZE = 2000
  ```

**Priority**: LOW - Readability improvement

---

## 4. Architecture Issues

### 4.1 Business Logic in UI Components

**Issue**: Components contain complex business logic instead of delegating to services

**Examples**:
- PropertyRouter.tsx has data mapping logic (~100 lines)
- Dashboard components compute metrics inline
- Voucher forms validate and process data directly

**Impact**:
- Logic not reusable
- Hard to test
- Violates separation of concerns

**Recommendation**:
- Move all business logic to services
- Components should only render and call services
- Use custom hooks for complex component logic

**Priority**: MEDIUM - Architecture smell

### 4.2 Tight Coupling Between Modules

**Issue**: Investment and Property modules share same codebase but need isolation

**Current Issues**:
- Account code overlap (e.g., `1120` used by both)
- Shared services with module-specific branches
- Filter functions needed everywhere to enforce isolation

**Example of Coupling**:
```typescript
// This pattern appears everywhere
const filteredAccounts = useMemo(
  () => filterInvestmentAccounts(accounts),
  [accounts]
)
```

**Recommendation**:
- True module isolation at architecture level
- Separate state containers per module
- Plugin architecture for modules
- Shared core with module extensions

**Priority**: MEDIUM - Scalability concern


### 4.3 God Object Anti-pattern

**Issue**: Account and Voucher types do too much

**Account Interface**:
- 15+ fields
- Optional fields that are sometimes required
- Mixed concerns (accounting + UI metadata)

**Voucher Interface**:
- 20+ fields
- Lifecycle state mixed with data
- Reference tracking, audit info, all in one object

**Impact**:
- Hard to evolve types
- Validation complexity
- Difficult to understand requirements

**Recommendation**:
- Split into smaller, focused types
- Use composition over inheritance
- Separate read models from write models

**Priority**: LOW - Functional but not ideal

---

## 5. Performance Concerns

### 5.1 Inefficient Balance Caching

**Issue**: Balance cache implementation is naive

**Current Implementation**:
```typescript
const balanceCache = new Map<string, BalanceCacheEntry>()
let cacheVersion = 1
```

**Problems**:
- Cache cleared on ANY voucher change (even unrelated)
- No granular invalidation
- Cache not persisted (recalculates on every page load)
- No cache warming strategy

**Impact**:
- Reports recalculate all balances on every render
- Slow performance with large datasets
- Unnecessary CPU usage

**Recommendation**:
- Implement granular cache invalidation
- Cache per account instead of global
- Use IndexedDB for persistent cache
- Implement cache warming on app load

**Priority**: MEDIUM - Will hurt at scale

### 5.2 Unoptimized Renders

**Issue**: Components re-render unnecessarily

**Causes**:
- 40+ state variables in root component
- Props passed as new objects every render
- Missing React.memo on expensive components
- Inline function definitions passed as props

**Example**:
```typescript
// Creates new function on every render
<Component onChange={(value) => setState(value)} />
```

**Recommendation**:
- Use React.memo for expensive components
- useCallback for function props
- useMemo for expensive computations
- Consider React Context to reduce prop drilling

**Priority**: LOW - Not critical yet


### 5.3 Synchronous LocalStorage Operations

**Issue**: Every state change writes to localStorage synchronously

**Impact**:
- Blocks UI thread
- Slow with large state objects
- Janky user experience
- Battery drain on mobile

**Recommendation**:
- Debounce localStorage writes
- Use async storage API where available
- Batch multiple state changes
- Consider background worker for persistence

**Priority**: MEDIUM - UX impact

---

## 6. Maintainability Issues

### 6.1 Inconsistent Naming Conventions

**Issue**: Mixed naming patterns throughout codebase

**Examples**:
```typescript
// Some use "prop" prefix
propAccounts, propVouchers, propTransactions

// Others use "property" prefix
propertyAccounts (but this is a different variable)

// Some use module suffix
accounts (investment), chartAccounts (could be either)

// Inconsistent component naming
InvestmentChartOfAccounts vs PropertyChartOfAccounts
InvestmentBankAccounts vs PropertyBankAccounts
```

**Recommendation**:
- Establish naming guide
- Use consistent prefixes: `inv*` and `prop*`
- Document naming conventions

**Priority**: LOW - Cosmetic but important

### 6.2 Lack of Code Documentation

**Issue**: Minimal code comments and documentation

**Current State**:
- No JSDoc comments on functions
- No README in src/renderer folders
- Complex algorithms undocumented
- Business rule comments missing

**Example**:
```typescript
// What does this do? Why 3? What's the format?
const code = parent ? `${parent.code}.${String(childCount + 1).padStart(3, '0')}` : baseCode
```

**Recommendation**:
- Add JSDoc to all exported functions
- Document complex algorithms
- Add module-level README files
- Document business rules inline

**Priority**: MEDIUM - Onboarding and maintenance


### 6.3 No Unit Tests

**Issue**: Zero unit tests in codebase

**Impact**:
- No safety net for refactoring
- Manual testing burden
- Regression risks
- Difficult to verify business rules

**What Should Be Tested**:
- Accounting engine (voucher creation, posting)
- Ledger service (balance calculations)
- Posting rules (all 40+ events)
- Voucher service (validation, lifecycle)
- PDC service (state transitions)
- Security deposit service (balance computation)
- Purchase ledger (cost basis, weighted average)

**Recommendation**:
- Add Jest/Vitest
- Start with core services (accounting engine, ledger)
- Aim for 80% coverage on business logic
- Add tests before refactoring

**Priority**: HIGH - Risk mitigation

### 6.4 Dead Code

**Issue**: Unused code scattered throughout

**Examples Found**:
- `PropertyTransactionsDemo.tsx` and `PropertyReportsDemo.tsx` - Demo components still in codebase
- Multiple unused type definitions
- Commented-out code blocks
- Obsolete migration logic (never removed)

**Recommendation**:
- Use tree-shaking analysis tools
- Remove demo components
- Delete commented code
- Clean up obsolete migrations

**Priority**: LOW - Code bloat

---

## 7. Missing Functionality

### 7.1 No Data Export/Backup

**Issue**: Users cannot export or backup their data

**Impact**:
- Data loss risk
- No migration path to other systems
- Cannot share data with accountants

**Recommendation**:
- Add JSON export functionality
- CSV export for reports
- Full database backup/restore
- Excel export for statements

**Priority**: HIGH - User request

### 7.2 No Multi-User Support

**Issue**: Single-user application with hardcoded user references

**Impact**:
- Cannot support teams
- No proper audit trail with user identity
- Limited scalability

**Recommendation**:
- Add proper user management
- Implement authentication
- User permissions system
- Multi-user audit trail

**Priority**: LOW - Feature enhancement


### 7.3 Limited Reporting

**Issue**: Reports are basic and inflexible

**Current Reports**:
- Trial Balance
- Balance Sheet
- Profit & Loss Statement
- Account Statement

**Missing Reports**:
- Cash Flow Statement
- Aging Reports (Receivables/Payables)
- Tax Reports
- Custom Date Range Reports
- Comparative Period Reports
- Drill-down Reports

**Recommendation**:
- Build flexible reporting engine
- Add report parameters (date ranges, filters)
- Enable custom report building
- Add export to PDF/Excel

**Priority**: MEDIUM - User value

### 7.4 No Data Validation on Load

**Issue**: LocalStorage data loaded without validation

**Impact**:
- Corrupted data can crash app
- No migration validation
- Type mismatches possible

**Recommendation**:
- Add schema validation (Zod, Yup, or similar)
- Validate on load
- Graceful degradation for invalid data
- Data repair utilities

**Priority**: MEDIUM - Data integrity

---

## Priority Summary

### HIGH Priority (Do First)
1. Extract migration logic from component code
2. Refactor App.tsx - split into contexts
3. Consolidate duplicate voucher forms
4. Extract hardcoded account codes to constants
5. Add unit tests for core services
6. Implement data export/backup

### MEDIUM Priority (Do Next)
1. Optimize balance caching strategy
2. Add comprehensive error handling
3. Improve code documentation
4. Refactor duplicate module patterns
5. Add more flexible reporting
6. Consider IndexedDB migration

### LOW Priority (Nice to Have)
1. Extract duplicate utility functions
2. Clean up magic numbers
3. Remove dead code
4. Improve naming consistency
5. Optimize React renders

