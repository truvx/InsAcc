# Reports UI Architecture — Sprint 5 Phase B

> **Derived from:** Sprint 5 Phase A (Reports Engine), Phase A.5 (Formatting Layer & Architecture Polish)
>
> **Do not implement until architectural review is complete.**

---

## 1. Architecture Layers

```
┌────────────────────────────────────────────────────────────┐
│                    Reports.tsx (UI)                         │
│  useMemo → reportService (raw numbers)                     │
│  useMemo → reportFormatters (formatted strings)            │
│  Pure presentation — no calculations, no formatting         │
├────────────────────────────────────────────────────────────┤
│              reportFormatters (formatting)                  │
│  formatCurrency | formatCompactCurrency                     │
│  formatPercentage | formatCompactNumber                     │
│  formatTrend | formatMonth | formatDateRange                │
│  Pure functions — no React, no localStorage, no calculations│
├────────────────────────────────────────────────────────────┤
│              reportService (calculations)                   │
│  18 pure functions — raw numbers only                       │
│  No formatting, no React, no localStorage                   │
├────────────────────────────────────────────────────────────┤
│              bankingService | data types                    │
│  deriveBalance() | Investment | Transaction | BankAccount    │
└────────────────────────────────────────────────────────────┘
```

### Architecture Rules

| Rule | Enforced By |
|------|-------------|
| No formatting in reportService | `reportService` returns only `number`, `AssetAllocation[]`, etc. |
| No calculations in formatters | `reportFormatters` only string transforms |
| No React in data/services | `reportService` and `reportFormatters` have zero React imports |
| No localStorage access | Data passed as parameters |
| No serialized formatting | `formatCurrency` called at render time, never stored |

---

## 2. Files

| File | Purpose | Status |
|------|---------|--------|
| `src/renderer/data/reports.ts` | Typed interfaces for all report outputs | ✅ Done (Phase A) |
| `src/renderer/services/reportService.ts` | 18 pure calculation functions | ✅ Done (Phase A) |
| `src/renderer/utils/reportFormatters.ts` | 8 pure formatting functions | ✅ Done (Phase A.5) |
| `src/renderer/components/Reports.tsx` | UI page — full rewrite needed | ❌ Phase B |
| `src/renderer/components/charts/NetWorthTrendChart.tsx` | REMOVED — not applicable | ❌ Not needed |
| `src/renderer/components/charts/IncomeExpenseChart.tsx` | REMOVED — duplicates Cash Flow + Savings | ❌ Not needed |
| `src/renderer/components/charts/CategoryBreakdownChart.tsx` | Horizontal bar for category data | ❌ Phase B |

---

## 3. Data Flow

```
App.tsx (usePersistedState)
  │
  ▼
Reports.tsx (props: investments, transactions, bankAccounts, bankTransactions, currency, dateFormat, language)
  │
  ├── useMemo → reportService.calculateFinancialSummary(...)
  ├── useMemo → reportService.calculateCashFlowSummary(...)
  ├── useMemo → reportService.calculateMonthlyCashFlow(...)
  ├── useMemo → reportService.calculateAssetAllocation(...)
  ├── useMemo → reportService.calculateTopExpenseCategories(...)
  ├── useMemo → reportService.calculateTopIncomeCategories(...)
  ├── useMemo → reportService.calculateRecentActivity(...)
  │
  ├── useMemo → reportFormatters.formatCurrency(value, currency)
  ├── useMemo → reportFormatters.formatCompactCurrency(value, currency)
  ├── useMemo → reportFormatters.formatPercentage(value)
  ├── useMemo → reportFormatters.formatTrend(value, previousValue)
  ├── useMemo → reportFormatters.formatMonth(monthKey)
  │
  ▼
  KpiCard / ChartCard / ActivityTimeline (pure presentation)
```

### Props Required (Phase B App.tsx change)

Current (Phase A): `<Reports profile={...} language={...} />`

Target (Phase B):
```tsx
<Reports
  investments={investments}
  transactions={transactions}
  bankAccounts={bankAccounts}
  bankTransactions={bankTransactions}
  currency={currency}
  dateFormat={dateFormat}
  language={language}
/>
```

---

## 4. Formatting Layer

**File:** `src/renderer/utils/reportFormatters.ts`

### Function Signatures

```typescript
formatCurrency(value: number, currency?: string): string
  // "AED 5,000" | "- AED 1,234"

formatCompactCurrency(value: number, currency?: string): string
  // "AED 5K" | "AED 1.5M" | "AED 2B"

formatPercentage(value: number): string
  // "12.5%"

formatCompactNumber(value: number): string
  // "5K" | "1.5M" | "2B" | "500"

formatTrend(value: number, previousValue?: number): { value: string; direction: 'up' | 'down' | 'neutral' }
  // { value: "+12.5%", direction: "up" }
  // { value: "-5.0%", direction: "down" }

formatMonth(monthKey: string): string
  // "2024-01" → "January 2024"

formatDateRange(start: string, end: string): string
  // "Jan 1, 2024 — Dec 31, 2024"
```

### Rules
- All functions are pure — same input always produces same output
- No React hooks, no JSX, no localStorage
- No data calculations — only string/map transforms
- `formatCurrency` respects sign convention (negative prefix `"- "`)
- `formatTrend` computes period-over-period percentage change when `previousValue` is provided
- `formatPercentage` handles arbitrary precision (input determines output precision via `toFixed(1)`)

---

## 5. KPI Row — Final Set (6 Cards)

| KPI | reportService Function | Value | Trend Source |
|-----|----------------------|-------|-------------|
| **Net Worth** | `calculateNetWorth()` | Format `formatCurrency(value, currency)` | vs previous period (via `formatTrend`) |
| **Cash** | `calculateTotalCash()` | Format `formatCurrency(value, currency)` | vs previous period |
| **Investments** | `calculateTotalAssets()` | Format `formatCurrency(value, currency)` | vs previous period |
| **Income** | `calculateIncome()` | Format `formatCurrency(value, currency)` | vs previous period |
| **Expenses** | `calculateExpenses()` | Format `formatCurrency(value, currency)` | vs previous period |
| **Savings** | `calculateNetCashFlow()` | Format `formatCurrency(value, currency)` | vs previous period |

### Notes

- **"Savings"** replaces "Net Cash Flow" — matches common financial terminology
- Period-over-period trend compares current filter period to same-length prior period
- No trend for point-in-time KPIs (Net Worth, Cash, Investments) when period filter is "All Time"
- KPI card accent colors: Net Worth (purple), Cash (green), Investments (blue), Income (green), Expenses (red), Savings (gold)
- Icons reuse existing SVG set from DesignSystem

### Layout

```
Desktop ≥1200px:   3 columns × 2 rows (kpi-grid auto-fits)
Laptop 1024-1199:  3 columns × 2 rows
Small 768-1023:    2 columns × 3 rows
Tablet <768px:     1 column (stacked)
```

---

## 6. Charts — Final Set

### Row 1 (Full Width)

**Investment Growth**

| Property | Value |
|----------|-------|
| Type | AreaChart (reuse `InvestmentGrowthChart.tsx`) |
| Source | `investments[]` → aggregate `InvestmentHistory` by Monthly |
| Purpose | Shows cumulative portfolio value over time |
| Period toggles | Monthly (default), Yearly |
| Empty state | "Add investments to see your portfolio growth" |
| Empty action | Navigate to Investments page |

**Why Investment Growth instead of Net Worth Trend:**
- Current data model contains purchase values, not historical market valuations
- Cannot fabricate historical net worth — would be misleading
- Investment Growth uses available cumulative purchase value data

### Row 2 (2 Columns)

**Left: Asset Allocation**

| Property | Value |
|----------|-------|
| Type | Pie / Donut (reuse `AssetAllocationPie.tsx`) |
| Source | `calculateAssetAllocation()` |
| Purpose | Diversification — how investments split by type |
| Empty state | "Add investments to see your asset allocation" |
| Empty action | Navigate to Investments page |

**Right: Cash Flow**

| Property | Value |
|----------|-------|
| Type | Grouped Bar (reuse `CashFlowChart.tsx`) |
| Source | `calculateMonthlyCashFlow(transactions, 12)` |
| Purpose | Monthly income vs expenses over trailing 12 months |
| Empty state | "Add income and expense transactions to see cash flow" |
| Empty action | Navigate to Transactions page |

### Row 3 (2 Columns)

**Left: Cash Distribution**

| Property | Value |
|----------|-------|
| Type | Horizontal Bar |
| Source | Bank accounts → `deriveBalance()` per account |
| Purpose | Shows cash split across accounts (e.g., checking vs savings) |
| Empty state | "Add bank accounts to see your cash distribution" |
| Empty action | Navigate to Bank Accounts page |

**Right: Top Expense Categories**

| Property | Value |
|----------|-------|
| Type | Horizontal Bar |
| Source | `calculateTopExpenseCategories(transactions, 5)` |
| Purpose | Where money is spent — top 5 expense categories |
| Empty state | "Add expense transactions to see category breakdown" |
| Empty action | Navigate to Transactions page |

### Row 4 (Full Width)

**Top Income Categories**

| Property | Value |
|----------|-------|
| Type | Horizontal Bar |
| Source | `calculateTopIncomeCategories(transactions, 5)` |
| Purpose | Where money comes from — top 5 income categories |
| Empty state | "Add income transactions to see category breakdown" |
| Empty action | Navigate to Transactions page |

### Excluded Charts

| Chart | Reason |
|-------|--------|
| Net Worth Trend | Cannot fabricate historical valuations from purchase-only data |
| Income vs Expense | Redundant — Cash Flow chart + Savings KPI already cover this |

---

## 7. Filters

### Architecture

Single **Period** selector, not multiple independent filters.

### Options

| Option | Behavior |
|--------|----------|
| **This Month** | Filters to current month (affects Income, Expenses, Savings, Cash Flow, Categories) |
| **Last 3 Months** | Trailing 3 calendar months |
| **Last 6 Months** | Trailing 6 calendar months |
| **This Year** | Current year-to-date |
| **Custom Range** | Date inputs (From / To) |

### Which KPIs/Charts Are Affected

| Section | Filtered by Period? |
|---------|-------------------|
| Net Worth KPI | ❌ (point-in-time) |
| Cash KPI | ❌ (point-in-time) |
| Investments KPI | ❌ (point-in-time) |
| Income KPI | ✅ |
| Expenses KPI | ✅ |
| Savings KPI | ✅ |
| Investment Growth | ❌ (cumulative) |
| Asset Allocation | ❌ (point-in-time) |
| Cash Flow | ✅ |
| Cash Distribution | ❌ (point-in-time) |
| Top Expense Categories | ✅ |
| Top Income Categories | ✅ |
| Recent Activity | ✅ (respects period) |

### Implementation Notes

- Default: **This Month**
- Period selector sits between page header and KPI row
- Custom Range mode appears as a dropdown option that reveals date inputs
- No year/month/day granularity — period presets cover common reporting needs
- "Custom Range" is the escape hatch for fiscal quarters, tax years, etc.

---

## 8. Recent Activity — Timeline, Not Table

### Decision

Reuse **`ActivityTimeline`** (from `ActivityTimeline.tsx`) instead of `DataTable`.

### Why

- `ActivityTimeline` is already used by Dashboard — consistent UX
- Timeline is more scannable for recent activity than a table
- Avoids duplicating timeline implementations

### Data Mapping

```typescript
// RecentActivityItem (from reportService) → ActivityEntry (for ActivityTimeline)
{
  source: 'investment'     → type: 'investment'
  source: 'transaction'    → type: amount > 0 ? 'income' : 'expense'
  source: 'bank_transaction' → type: 'deposit' | 'withdrawal' | 'transfer'
}
```

This mapping is the **Reports UI's responsibility** — NOT in reportService or reportFormatters.

### Empty State

- Message: "No recent activity. Start by adding investments, transactions, or bank accounts."
- Action: Multiple buttons or a dropdown: [+ Add Investment], [+ Add Transaction]

---

## 9. Empty States — Full Coverage

| Section | Condition | Title | Action | Destination |
|---------|-----------|-------|--------|-------------|
| All KPIs (no data at all) | No investments AND no transactions AND no bank accounts | "No financial data yet" | [+ Add Investment] | Investments |
| Investment Growth | No investments | "No investments yet" | [+ Add Investment] | Investments |
| Asset Allocation | No investments | "No investments yet" | [+ Add Investment] | Investments |
| Cash Flow | No transactions | "No transactions yet" | [+ Add Transaction] | Transactions |
| Cash Distribution | No bank accounts | "No bank accounts yet" | [+ Add Bank Account] | Bank Accounts |
| Top Expense Categories | No expense transactions | "No expenses yet" | [+ Add Transaction] | Transactions |
| Top Income Categories | No income transactions | "No income yet" | [+ Add Transaction] | Transactions |
| Recent Activity | No data in any source | "No recent activity" | [+ Add Investment] | Investments |

### Implementation

- Use `EmptyState` component from DesignSystem for full-page empty
- Use `ChartCard`'s `isEmpty` + `emptyMessage` for per-chart empty states
- Action buttons use `Button` with `variant="primary"` and `onClick` navigating to the relevant page via a callback prop

---

## 10. Export Architecture

### Button

Single **Export ▼** button in the page header (right side).

### Dropdown Options

| Option | Status |
|--------|--------|
| PDF | ❌ Future |
| CSV | ❌ Future |
| Excel | ❌ Future |

### Implementation Notes

- The Export button is reserved in the layout now (Phase A.5)
- It sits in the `.page-header-right` area alongside the page title
- In Phase B, the Export button is **disabled** or **hidden** — added in Phase C
- Phase C will implement the export logic using `window.api.saveFile()` (existing IPC channel)
- CSV export serializes reportService raw data via a CSV serializer
- PDF export requires a new dependency or an HTML-to-PDF approach

---

## 11. Responsive Layout

| Breakpoint | KPI Row | Chart Grid | Activity Timeline |
|------------|---------|------------|-------------------|
| ≥1200px (Desktop) | 3×2 (kpi-grid auto-fit) | 2-column; Row 1 full-width | Full-width card |
| 1024–1199px (Laptop) | 3×2 | 2-column; same layout | Full-width card |
| 768–1023px (Small) | 2×3 | Single column (stacked) | Full-width card |
| <768px (Tablet) | 1 column | Single column | Full-width card |

### Implementation

- Use existing CSS classes: `kpi-grid`, `chart-grid`, `page-body`, `page-header`
- Chart grid uses `grid-template-columns: repeat(2, 1fr)` on desktop → `1fr` on tablet
- Existing breakpoints in `theme.css` handle the switch (1024px, 768px)
- No new CSS needed — all layout classes already exist
- Recharts `ResponsiveContainer` handles chart sizing at each breakpoint

---

## 12. Future Expansion Slots

| Feature | Slot | What Changes |
|---------|------|-------------|
| **PDF Export** | Export ▼ dropdown | Just adds an option to existing button |
| **CSV Export** | Export ▼ dropdown | Just adds an option to existing button |
| **Excel Export** | Export ▼ dropdown | Just adds an option to existing button |
| **Scheduled Reports** | Page header → "Schedule" button | Modal dialog; no layout change |
| **Tax Reports** | Tab bar below page title | Only if requested; KPI/chart grid untouched |
| **Forecasting** | New section after Activity Timeline | Full-width section; page scrolls naturally |
| **Reconciliation Report** | Tab bar | Not planned for current sprint |

### Tab Architecture (if needed later)

```
[ Overview | Tax Reports | Forecasting ]
```
- Tab bar fits between page header and KPI row
- Each tab swaps the entire content area below the tab bar
- KPI row and page header remain stable
- Not planned for Sprint 5 — only documented for forward compatibility

---

## 13. Reusable Components

| Component | Usage | Source |
|-----------|-------|--------|
| **KpiCard** | 6 KPI cards | `DesignSystem.tsx` — `label`, `value`, `change`, `icon`, `accentColor` |
| **ChartCard** | Chart containers | `DesignSystem.tsx` — `title`, `isEmpty`, `emptyMessage`, `children` |
| **InvestmentGrowthChart** | Investment Growth chart | Reuse as-is from `charts/InvestmentGrowthChart.tsx` |
| **AssetAllocationPie** | Asset Allocation chart | Reuse as-is from `charts/AssetAllocationPie.tsx` |
| **CashFlowChart** | Cash Flow chart | Reuse as-is from `charts/CashFlowChart.tsx` |
| **ActivityTimeline** | Recent Activity | Reuse as-is from `ActivityTimeline.tsx` |
| **EmptyState** | Full-page + section empty states | `DesignSystem.tsx` — `icon`, `title`, `text`, `action` |
| **Button** | Actions, export | `DesignSystem.tsx` — `variant`, `size`, `onClick` |
| **Select** | Period selector | `DesignSystem.tsx` — `options`, `value`, `onChange` |
| **Input** | Custom date range inputs | `DesignSystem.tsx` — `type="date"` |

### New Components Needed (Phase B)

| Component | Type | Purpose |
|-----------|------|---------|
| `CashDistributionChart.tsx` | Horizontal BarChart | Cash split across bank accounts |
| `CategoryBreakdownChart.tsx` | Horizontal BarChart | Top expense / income categories |
| `PeriodSelector.tsx` | Select + conditional date inputs | Period filter UI (preset dropdown + custom range) |

These follow existing chart patterns (`ResponsiveContainer`, 280px height, CSS variable colors). Not reusable outside Reports.

---

## 14. Implementation Order (Phase B)

| Step | What | Depends On |
|------|------|------------|
| 1 | Update `App.tsx` — pass data props to Reports | ✅ Props identified |
| 2 | Update `Reports.tsx` — new layout skeleton (header, KPI grid, chart grid, timeline) | Step 1 |
| 3 | Wire 6 KPI cards with `useMemo` → reportService → reportFormatters | Step 2 |
| 4 | Implement PeriodSelector component | Step 2 |
| 5 | Wire InvestmentGrowthChart (reuse existing) | Step 2 |
| 6 | Wire AssetAllocationPie (reuse existing) | Step 2 |
| 7 | Wire CashFlowChart (reuse existing) | Step 2 |
| 8 | Create CashDistributionChart | Step 2 |
| 9 | Create CategoryBreakdownChart (shared by expense + income) | Step 2 |
| 10 | Wire ActivityTimeline (reuse existing, map data) | Step 2 |
| 11 | Empty states for every section | Steps 3–10 |
| 12 | Responsive testing | Steps 3–11 |
| 13 | Delete old Reports code | Step 12 |

---

## 15. TypeScript & Risk Assessment

### Dependencies

| Dependency | Status |
|-----------|--------|
| Recharts | ✅ Already installed |
| framer-motion | ✅ Already installed |
| `AssetAllocationPie.tsx` | ✅ Already exists |
| `CashFlowChart.tsx` | ✅ Already exists |
| `InvestmentGrowthChart.tsx` | ✅ Already exists |
| `ActivityTimeline.tsx` | ✅ Already exists |
| `KpiCard`, `ChartCard`, `EmptyState` | ✅ Already exist in DesignSystem |
| `reportService` 18 functions | ✅ Already built (Phase A) |
| `reportFormatters` 8 functions | ✅ Already built (Phase A.5) |

### New Code Estimate

| File | Estimated Lines |
|------|----------------|
| `Reports.tsx` (rewrite) | ~300 |
| `CashDistributionChart.tsx` | ~60 |
| `CategoryBreakdownChart.tsx` | ~70 |
| `PeriodSelector.tsx` | ~50 |
| CSS (minor additions) | ~20 |
| App.tsx prop changes | ~5 |
| **Total** | **~505** |

### Pre-existing TypeScript Errors (Not Blocking)

| File | Error | Severity |
|------|-------|----------|
| `App.tsx:152` | `currency` prop on Documents | Low — unrelated |
| `DesignSystem.tsx:17,34` | framer-motion `onAnimationStart` | Low — type version mismatch |
| `History.tsx:134` | Array not valid ReactNode | Low — unrelated |

All 4 errors pre-date Phase A and are unrelated to Reports.

---

## 16. Phase A.5 Deliverables Summary

### Files Created

| File | Purpose |
|------|---------|
| `src/renderer/utils/reportFormatters.ts` | 8 pure formatting functions |

### Files Modified

None — Phase A.5 is architecture-only.

### Formatting Utilities Added

| Function | Input | Output |
|----------|-------|--------|
| `formatCurrency` | `(5000, 'AED')` | `"AED 5,000"` |
| `formatCompactCurrency` | `(1500000, 'AED')` | `"AED 1.5M"` |
| `formatPercentage` | `(12.5)` | `"12.5%"` |
| `formatCompactNumber` | `(1500000)` | `"1.5M"` |
| `formatTrend` | `(5000, 4000)` | `{ value: "+25.0%", direction: "up" }` |
| `formatMonth` | `"2024-01"` | `"January 2024"` |
| `formatDateRange` | `("2024-01-01", "2024-12-31")` | `"Jan 1, 2024 — Dec 31, 2024"` |

### Architecture Decisions

| Area | Decision |
|------|----------|
| **Net Worth Trend chart** | ❌ Removed — cannot fabricate historical market valuations |
| **Income vs Expense chart** | ❌ Removed — duplicates Cash Flow + Savings KPI |
| **KPI "Net Cash Flow"** | Renamed to **"Savings"** |
| **Recent Activity** | Use `ActivityTimeline` (reuse), not `DataTable` |
| **Filters** | Single **Period** selector (presets + custom range) |
| **Export** | Single **Export ▼** button — placeholder until Phase C |
| **Empty states** | Every section has title + action + destination page |

### Technical Debt Removed

None found — `reportService` was already clean:
- All functions are pure
- No duplicated calculations within any single call path
- Helper functions (`safeSum`, `safePct`) reused across all appropriate callers
- No formatting in calculations
- No React dependencies
- No localStorage access
- `deriveBalance()` reused from `bankingService` — single source of truth

### Validation

| Check | Result |
|-------|--------|
| `reportService` remains pure | ✅ No changes |
| Formatting completely separated | ✅ `reportFormatters.ts` — zero calculations |
| No React in data/services | ✅ Both files import zero React |
| No localStorage access | ✅ Data passed as parameters |
| No duplicated formatting logic | ✅ 8 distinct formatters, no overlap |
| No duplicated calculations | ✅ All 18 service functions audited |
| `npx tsc --noEmit` | ✅ 0 new errors (4 pre-existing) |
