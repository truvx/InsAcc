# InsAcc Refactoring Recommendations

**Generated:** 2026-07-06  
**Purpose:** Actionable refactoring plan to improve code quality, maintainability, and scalability

## Table of Contents

1. [Refactoring Strategy](#refactoring-strategy)
2. [Phase 1: Foundation](#phase-1-foundation)
3. [Phase 2: State Management](#phase-2-state-management)
4. [Phase 3: Code Consolidation](#phase-3-code-consolidation)
5. [Phase 4: Architecture Improvements](#phase-4-architecture-improvements)
6. [Phase 5: Performance Optimization](#phase-5-performance-optimization)

---

## 1. Refactoring Strategy

### Guiding Principles

1. **No Functionality Changes**: Refactoring should not change behavior
2. **Incremental Approach**: Small, testable changes
3. **Safety First**: Add tests before refactoring
4. **Measure Twice, Cut Once**: Plan before executing
5. **Backwards Compatibility**: Support old data during transitions

### Success Metrics

- Test coverage >80% for business logic
- Reduced file sizes (<500 lines per file)
- Eliminated code duplication (DRY metric improved)
- Faster load times (<2 seconds)
- Reduced localStorage usage (<2MB)

---

## 2. Phase 1: Foundation

**Goal**: Establish testing and extract constants  
**Duration**: 2-3 weeks  
**Risk**: LOW

### 2.1 Add Testing Infrastructure

**Tasks**:
1. Install Vitest / Jest
2. Configure test environment
3. Add test scripts to package.json
4. Create test utilities and mocks

**Files to Create**:
```
tests/
├── setup.ts
├── mocks/
│   ├── accounts.mock.ts
│   ├── vouchers.mock.ts
│   └── banking.mock.ts
└── utils/
    └── testHelpers.ts
```

**Acceptance Criteria**:
- Tests can run via `npm test`
- Mock data available for all core types
- Test coverage reporting configured


### 2.2 Extract Constants

**Task**: Replace hardcoded values with named constants

**Step 1 - Create Constants File**:
```typescript
// src/renderer/constants/accountCodes.ts
export const ACCOUNT_CODES = {
  // Assets
  CASH: '1110',
  BANK: '1120',
  RENT_RECEIVABLE: '1130',
  INVESTMENTS: '1200',
  REAL_ESTATE: '1270',
  ACCOUNTS_RECEIVABLE: '1320',
  PDC_RECEIVABLE: '1410',
  
  // Liabilities
  DEFERRED_REVENUE: '2110',
  SECURITY_DEPOSITS: '2120',
  OWNER_ACCOUNT: '2200',
  
  // Revenue
  DIVIDEND_INCOME: '4110',
  RENTAL_INCOME: '4120',
  CAPITAL_GAINS: '4130',
  
  // Expenses
  MAINTENANCE: '5120',
  BANK_CHARGES: '5120',
} as const

export const CURRENCY_CODES = {
  AED: 'AED',
  INR: 'INR',
  GBP: 'GBP',
  USD: 'USD',
} as const

export const TOLERANCE = {
  BALANCE_ROUNDING: 0.001,
  CURRENCY_DECIMALS: 2,
} as const
```

**Step 2 - Replace Usage**:
```typescript
// Before
const account = accounts.find(a => a.code === '1120')

// After
import { ACCOUNT_CODES } from '@/constants/accountCodes'
const account = accounts.find(a => a.code === ACCOUNT_CODES.BANK)
```

**Acceptance Criteria**:
- All magic account codes replaced
- All magic numbers extracted
- Constants file has JSDoc comments
- No hardcoded account codes in business logic

---

## 3. Phase 2: State Management

**Goal**: Fix root component bloat  
**Duration**: 3-4 weeks  
**Risk**: MEDIUM

### 3.1 Extract Migration Service

**Task**: Move migration logic out of App.tsx

**Structure**:
```typescript
// src/renderer/services/migrations/types.ts
export interface Migration {
  version: string
  description: string
  run: () => void
}

// src/renderer/services/migrations/registry.ts
export const MIGRATIONS: Migration[] = [
  v3_clearAllDatasets,
  v4_zeroOpeningBalances,
  v5_deactivateSecurityDepositCategory,
  v6_splitMixedModuleData,
]

// src/renderer/services/migrations/index.ts
export function runMigrations(): void {
  for (const migration of MIGRATIONS) {
    const key = `insacc_migration_${migration.version}`
    if (!localStorage.getItem(key)) {
      try {
        migration.run()
        localStorage.setItem(key, 'true')
      } catch (error) {
        console.error(`Migration ${migration.version} failed:`, error)
      }
    }
  }
}
```

**Usage in App**:
```typescript
// src/renderer/index.tsx (before React renders)
import { runMigrations } from './services/migrations'
runMigrations()

// Then render React
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
```

**Acceptance Criteria**:
- All migrations extracted from App.tsx
- Migrations run before React renders
- Migration errors logged
- App.tsx reduced by ~300 lines


### 3.2 Create State Contexts

**Task**: Split App state into domain-specific contexts

**Investment State Context**:
```typescript
// src/renderer/contexts/InvestmentStateContext.tsx
interface InvestmentState {
  accounts: Account[]
  vouchers: Voucher[]
  bankAccounts: BankAccount[]
  bankMappings: BankMapping[]
  purchaseRecords: PurchaseRecord[]
  // ... other investment state
}

export const InvestmentStateContext = createContext<InvestmentState | null>(null)

export function InvestmentStateProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = usePersistedState<Account[]>('insacc_accounts', [])
  const [vouchers, setVouchers] = usePersistedState<Voucher[]>('insacc_vouchers', [])
  // ... other state
  
  const value = useMemo(() => ({
    accounts, setAccounts,
    vouchers, setVouchers,
    // ... all investment state
  }), [accounts, vouchers, /* ... */])
  
  return (
    <InvestmentStateContext.Provider value={value}>
      {children}
    </InvestmentStateContext.Provider>
  )
}

export function useInvestmentState() {
  const context = useContext(InvestmentStateContext)
  if (!context) throw new Error('useInvestmentState must be used within InvestmentStateProvider')
  return context
}
```

**Property State Context** (similar pattern):
```typescript
// src/renderer/contexts/PropertyStateContext.tsx
export function PropertyStateProvider({ children }) { /* ... */ }
export function usePropertyState() { /* ... */ }
```

**App Settings Context**:
```typescript
// src/renderer/contexts/AppSettingsContext.tsx
interface AppSettings {
  theme: string
  currency: string
  dateFormat: string
  language: string
  // ... other settings
}
export function AppSettingsProvider({ children }) { /* ... */ }
export function useAppSettings() { /* ... */ }
```

**App.tsx After Refactor**:
```typescript
export default function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [activeModule, setActiveModule] = useState<Module>('investment')
  
  // All state now in contexts
  
  return (
    <AppSettingsProvider>
      <InvestmentStateProvider>
        <PropertyStateProvider>
          <MasterDataProvider>
            {/* App UI */}
          </MasterDataProvider>
        </PropertyStateProvider>
      </InvestmentStateProvider>
    </AppSettingsProvider>
  )
}
```

**Benefits**:
- App.tsx reduced from 40+ state variables to ~5
- Components access state via hooks, not props
- No more prop drilling
- Easier to test individual contexts

**Acceptance Criteria**:
- All investment state in InvestmentStateContext
- All property state in PropertyStateContext
- App.tsx under 300 lines
- All components migrated to use hooks instead of props


---

## 4. Phase 3: Code Consolidation

**Goal**: Eliminate duplication  
**Duration**: 4-5 weeks  
**Risk**: MEDIUM

### 4.1 Generic Voucher Form Component

**Task**: Consolidate 6 voucher forms into 1 generic form

**New Structure**:
```typescript
// src/renderer/components/GenericVoucherForm.tsx
interface Props {
  module: 'investment' | 'property'
  voucherType: VoucherType
  // ... other props
}

export function GenericVoucherForm({ module, voucherType, ... }: Props) {
  // Shared form logic
  
  // Type-specific sections
  const renderTypeSpecificFields = () => {
    if (voucherType === 'Payment') {
      return <PaymentFields />
    }
    if (voucherType === 'Receipt') {
      return <ReceiptFields />
    }
    return <JournalFields />
  }
  
  return (
    <form>
      {/* Common fields */}
      {renderTypeSpecificFields()}
      {/* Common line items table */}
    </form>
  )
}
```

**Usage**:
```typescript
// InvestmentReceiptVoucher.tsx
export default function InvestmentReceiptVoucher(props) {
  return <GenericVoucherForm module="investment" voucherType="Receipt" {...props} />
}
```

**Acceptance Criteria**:
- Single generic form component
- All 6 specific forms reduced to thin wrappers
- No duplicate validation logic
- All tests passing

### 4.2 Generic Dashboard Component

**Task**: Consolidate investment and property dashboards

**Approach**:
```typescript
// src/renderer/components/GenericDashboard.tsx
interface DashboardConfig {
  module: 'investment' | 'property'
  getMetrics: (accounts: Account[], vouchers: Voucher[]) => DashboardMetrics
  getChartData: (accounts: Account[], vouchers: Voucher[]) => ChartData
  widgets: WidgetConfig[]
}

export function GenericDashboard({ config }: { config: DashboardConfig }) {
  const metrics = useMemo(
    () => config.getMetrics(accounts, vouchers),
    [accounts, vouchers]
  )
  
  return (
    <DashboardLayout>
      <MetricsRow metrics={metrics} />
      <ChartsRow data={config.getChartData(accounts, vouchers)} />
      <WidgetsRow widgets={config.widgets} />
    </DashboardLayout>
  )
}
```

**Configuration Files**:
```typescript
// src/renderer/config/investmentDashboard.config.ts
export const investmentDashboardConfig: DashboardConfig = {
  module: 'investment',
  getMetrics: InvestmentDashboardReadModel.getMetrics,
  getChartData: InvestmentDashboardReadModel.getChartData,
  widgets: [/* ... */]
}

// src/renderer/config/propertyDashboard.config.ts
export const propertyDashboardConfig: DashboardConfig = { /* ... */ }
```

**Acceptance Criteria**:
- Single dashboard component
- Module-specific logic in config files
- Both modules using same component
- Reduced code by ~800 lines


### 4.3 Extract Common Utilities

**Task**: Create shared utility libraries

**Balance Utilities**:
```typescript
// src/renderer/utils/balanceUtils.ts

/**
 * Round currency value to 2 decimal places
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Filter vouchers to only Posted status
 */
export function getPostedVouchers(vouchers: Voucher[]): Voucher[] {
  return vouchers.filter(v => v.status === 'Posted')
}

/**
 * Calculate sum of voucher line amounts by type
 */
export function sumLineAmounts(
  lines: VoucherLine[],
  type?: LineType
): number {
  const filtered = type ? lines.filter(l => l.type === type) : lines
  const sum = filtered.reduce((acc, line) => acc + line.amount, 0)
  return roundCurrency(sum)
}

/**
 * Check if debits equal credits within tolerance
 */
export function isBalanced(
  debits: number,
  credits: number,
  tolerance = 0.001
): boolean {
  return Math.abs(debits - credits) < tolerance
}
```

**Date Utilities**:
```typescript
// src/renderer/utils/dateUtils.ts

export function formatDate(date: string, format: string): string { /* ... */ }
export function parseDate(dateStr: string): Date { /* ... */ }
export function isDateInRange(date: string, from: string, to: string): boolean { /* ... */ }
export function getFinancialYear(date: string): string { /* ... */ }
```

**Acceptance Criteria**:
- All duplicate utility logic extracted
- 100+ callsites updated to use utilities
- All utilities have JSDoc comments
- All utilities have unit tests

---

## 5. Phase 4: Architecture Improvements

**Goal**: Better separation of concerns  
**Duration**: 4-6 weeks  
**Risk**: HIGH

### 5.1 Implement Repository Pattern

**Task**: Abstract data access behind repositories

**Structure**:
```typescript
// src/renderer/repositories/AccountRepository.ts
export class AccountRepository {
  constructor(
    private storageKey: string,
    private storage: Storage = localStorage
  ) {}
  
  getAll(): Account[] {
    const data = this.storage.getItem(this.storageKey)
    return data ? JSON.parse(data) : []
  }
  
  getById(id: string): Account | undefined {
    return this.getAll().find(a => a.id === id)
  }
  
  save(accounts: Account[]): void {
    this.storage.setItem(this.storageKey, JSON.stringify(accounts))
  }
  
  add(account: Account): void {
    const accounts = this.getAll()
    accounts.push(account)
    this.save(accounts)
  }
  
  update(id: string, changes: Partial<Account>): void {
    const accounts = this.getAll()
    const index = accounts.findIndex(a => a.id === id)
    if (index >= 0) {
      accounts[index] = { ...accounts[index], ...changes }
      this.save(accounts)
    }
  }
}
```

**Benefits**:
- Single source of truth for data access
- Easy to swap storage backend (localStorage → IndexedDB)
- Easier to mock in tests
- Enforced data validation


### 5.2 Add Error Handling Layer

**Task**: Implement consistent error handling

**Error Service**:
```typescript
// src/renderer/services/errorService.ts
export class ErrorService {
  private listeners: Array<(error: AppError) => void> = []
  
  handleError(error: unknown, context: string): void {
    const appError = this.normalizeError(error, context)
    this.logError(appError)
    this.notifyListeners(appError)
  }
  
  private normalizeError(error: unknown, context: string): AppError {
    if (error instanceof AppError) return error
    
    return new AppError({
      message: error instanceof Error ? error.message : 'Unknown error',
      context,
      severity: 'error',
      originalError: error,
    })
  }
  
  private logError(error: AppError): void {
    console.error('[ErrorService]', error)
    // Could also send to external logging service
  }
  
  onError(callback: (error: AppError) => void): () => void {
    this.listeners.push(callback)
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index >= 0) this.listeners.splice(index, 1)
    }
  }
}

export const errorService = new ErrorService()
```

**React Error Boundary**:
```typescript
// src/renderer/components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    errorService.handleError(error, 'React Component Error')
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }
    return this.props.children
  }
}
```

**Usage in App**:
```typescript
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### 5.3 Migrate to IndexedDB

**Task**: Replace localStorage with IndexedDB for large datasets

**Why**:
- No 5-10MB size limit
- Async operations (non-blocking)
- Better query performance
- Supports transactions

**Implementation**:
```typescript
// src/renderer/services/storage/IndexedDBAdapter.ts
export class IndexedDBAdapter {
  private db: IDBDatabase | null = null
  
  async init(): Promise<void> {
    this.db = await this.openDatabase()
  }
  
  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    // IndexedDB get implementation
  }
  
  async set<T>(storeName: string, key: string, value: T): Promise<void> {
    // IndexedDB set implementation
  }
  
  async getAll<T>(storeName: string): Promise<T[]> {
    // IndexedDB getAll implementation
  }
}
```

**Migration Strategy**:
1. Add IndexedDB adapter alongside localStorage
2. Dual-write to both for 1-2 releases
3. Migrate users: read from localStorage, write to IndexedDB
4. Remove localStorage after migration complete

**Acceptance Criteria**:
- All data in IndexedDB
- localStorage only for small settings
- App loads faster
- No size limit issues

---

## 6. Phase 5: Performance Optimization

**Goal**: Faster, smoother UX  
**Duration**: 2-3 weeks  
**Risk**: LOW

### 6.1 Optimize Balance Caching

**Task**: Implement granular cache invalidation

**Current Problem**: Cache cleared on any voucher change

**New Implementation**:
```typescript
// src/renderer/services/balanceCacheService.ts
class BalanceCacheService {
  private cache = new Map<string, Map<string, number>>()
  // Key structure: accountId -> voucherHash -> balance
  
  getBalance(accountId: string, vouchers: Voucher[]): number {
    const voucherHash = this.hashVouchers(vouchers)
    const accountCache = this.cache.get(accountId)
    
    if (accountCache?.has(voucherHash)) {
      return accountCache.get(voucherHash)!
    }
    
    const balance = this.computeBalance(accountId, vouchers)
    this.cacheBalance(accountId, voucherHash, balance)
    return balance
  }
  
  invalidateAccount(accountId: string): void {
    this.cache.delete(accountId)
  }
  
  private hashVouchers(vouchers: Voucher[]): string {
    // Simple hash of voucher IDs and update timestamps
    return vouchers
      .map(v => `${v.id}:${v.updatedAt}`)
      .join('|')
  }
}
```

**Benefits**:
- Only recompute affected accounts
- Cache persists across unrelated changes
- Significant performance improvement


### 6.2 Debounce State Persistence

**Task**: Reduce localStorage writes

**Implementation**:
```typescript
// src/renderer/hooks/usePersistedState.ts (enhanced)
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  debounceMs = 500
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const [state, setState] = useState<T>(() => {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  })
  
  // Debounced save to localStorage
  const debouncedSave = useMemo(
    () => debounce((value: T) => {
      localStorage.setItem(key, JSON.stringify(value))
    }, debounceMs),
    [key, debounceMs]
  )
  
  useEffect(() => {
    debouncedSave(state)
  }, [state, debouncedSave])
  
  const reset = useCallback(() => {
    setState(defaultValue)
    localStorage.removeItem(key)
  }, [key, defaultValue])
  
  return [state, setState, reset]
}
```

**Benefits**:
- Reduced localStorage write operations
- Smoother UI (no blocking I/O)
- Battery savings

### 6.3 Add React.memo to Expensive Components

**Task**: Optimize render performance

**Candidates**:
- Chart components
- Large tables (Trial Balance, Account Statement)
- Dashboard cards
- Voucher line item rows

**Example**:
```typescript
// Before
export default function AccountStatement(props: Props) { /* ... */ }

// After
export default React.memo(AccountStatement, (prevProps, nextProps) => {
  // Custom comparison for optimization
  return (
    prevProps.accountId === nextProps.accountId &&
    prevProps.vouchers === nextProps.vouchers
  )
})
```

**Use useCallback for Functions**:
```typescript
// Before
<Button onClick={() => handleSave(data)} />

// After
const handleSaveCallback = useCallback(() => {
  handleSave(data)
}, [data])

<Button onClick={handleSaveCallback} />
```

---

## Refactoring Roadmap Summary

| Phase | Duration | Risk | LOC Reduction |
|-------|----------|------|---------------|
| 1. Foundation | 2-3 weeks | LOW | +500 (tests) |
| 2. State Management | 3-4 weeks | MEDIUM | -800 |
| 3. Code Consolidation | 4-5 weeks | MEDIUM | -2000 |
| 4. Architecture | 4-6 weeks | HIGH | +300, -500 |
| 5. Performance | 2-3 weeks | LOW | -200 |
| **Total** | **15-21 weeks** | - | **Net -2700** |

## Success Metrics

**Before Refactoring**:
- App.tsx: 850 lines
- Total codebase: ~50,000 lines
- Test coverage: 0%
- Duplicate code: ~6,000 lines
- Load time: 3-4 seconds

**After Refactoring**:
- App.tsx: <300 lines
- Total codebase: ~47,000 lines
- Test coverage: >80%
- Duplicate code: <1,000 lines
- Load time: <2 seconds

