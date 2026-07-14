# Purchase Ledger Architecture

## Purpose

The Purchase Ledger is the single source of truth for every asset purchase made by the client. It records *what* was bought, *when*, *how much*, and *at what price* — decoupled from portfolio presentation.

Every investment tracked in the Investments module should ultimately trace back to one or more Purchase Ledger entries. This separation enables cost-basis accounting, tax-lot tracking, realized/unrealized gain calculation, and audit-grade historical integrity.

---

## Current Architecture Assessment

### Current Data Model (`src/renderer/data/purchaseData.ts`)

```typescript
interface Purchase {
  id: string            // "P-{timestamp+counter}"
  date: string          // ISO date
  itemId: string        // references PurchaseItem.id
  quantity: number
  unitPrice: number
  totalValue: number    // computed client-side before storage
}

interface PurchaseItem {
  id: string
  name: string
}

interface PurchaseCategory {
  id: string
  name: string
  isCustom: boolean
  items: PurchaseItem[]
}

interface ItemAverages {     // computed, never stored
  itemId: string
  itemName: string
  categoryName: string
  purchaseCount: number
  totalQuantity: number
  totalValue: number
  avgUnitPrice: number
  avgValue: number
  avgQuantity: number
}
```

### Current Relationship with Investments

**There is no relationship.** The Purchase Ledger and Investments module are completely separate:

| Aspect | Purchase Ledger | Investments |
|--------|---------------|-------------|
| localStorage key | `insacc_purchases` | `insacc_investments` |
| UI page | `/purchase-ledger` | `/investments` |
| Data model | `Purchase` (itemId, qty, price) | `Investment` (assetName, type, purchaseValue) |
| ID scheme | `P-{counter}` | `{PREFIX}-{SERIAL}` |
| CRUD | Add / Delete only | Full CRUD with edit |
| Calculations | `computeAverages()` by item | `purchaseValue` summed across all |

The `Investment.purchaseValue` field is a scalar amount entered directly by the user. It does not reference any Purchase record. A user can create a "Gold" Investment with `purchaseValue: 500000` without ever recording a purchase in the Ledger.

### Current Service Layer (`src/renderer/services/purchaseService.ts`)

Two functions:
- `computeAverages(categories, purchases)` — groups purchases by `itemId`, returns average/aggregate stats
- `nextPurchaseId()` — module-level counter `Date.now()`+increment, resets on page reload

`computeAverages` is called identically in two places:
1. `Dashboard.tsx:60` — for the Purchase Averages table
2. `PurchaseLedger.tsx:35` — for per-item stats and All Items Overview

### Current UI (`src/renderer/components/PurchaseLedger.tsx`)

The Purchase Ledger page is 223 lines with:
- Top 4 averages cards (sorted by total value descending)
- Cascading category/item selectors
- Current Item Statistics card (dark gradient, 6 metrics)
- Inline Add Purchase form (date, quantity, unit price)
- Purchase History list per selected item
- All Items Overview (when no item selected)
- Toast notifications
- Native `confirm()` for delete

---

## Technical Debt Inventory

### Critical

| # | Issue | File(s) | Detail |
|---|-------|---------|--------|
| 1 | **No link between Purchase and Investment** | `purchaseData.ts`, `Investments.tsx` | Two separate records for the same economic event. Investment's `purchaseValue` is free-text, not derived from the ledger. |
| 2 | **Duplicate `computeAverages()` call** | `Dashboard.tsx:60`, `PurchaseLedger.tsx:35` | Same computation, same props, done twice on every render that shows both components. |
| 3 | **Inconsistent ID generation** | `purchaseService.ts:31-34` | Module-level `purchaseIdCounter = Date.now()` resets on page reload. Two purchases in different sessions can collide. |

### High

| # | Issue | File(s) | Detail |
|---|-------|---------|--------|
| 4 | **No edit capability** | `PurchaseLedger.tsx` | Purchases cannot be modified after creation. User must delete and re-create. |
| 5 | **Native `confirm()` dialog** | `PurchaseLedger.tsx:61` | Inconsistent with Modal-based confirmation in Investments, Transactions, Bank Accounts. |
| 6 | **All inline styles** | `PurchaseLedger.tsx` (entire file) | Contradicts ARCHITECTURE.md standard: "Never add inline styles. Use the existing class system." |
| 7 | **Unused `setPurchaseCategories`** | `App.tsx:60` | `purchaseCategories` state is persisted but the setter is never passed to any component. Categories are immutable post-initialization. |
| 8 | **Unused `profile` prop** | `PurchaseLedger.tsx:10` | The `profile` prop is destructured but never referenced in the component body. |
| 9 | **Unused `resetPurchases`** | `App.tsx:61` | Destructured but never passed to Settings or any reset handler. |

### Medium

| # | Issue | File(s) | Detail |
|---|-------|---------|--------|
| 10 | **No unit or integration tests** | — | Zero coverage for purchase CRUD, averages computation, or UI interaction. |
| 11 | **No search or filtering** | `PurchaseLedger.tsx` | Purchases are only filterable by selected item. No text search, date range, or global filter. |
| 12 | **No pagination** | `PurchaseLedger.tsx` | All purchases for a selected item render in a flat list. No limits on render. |
| 13 | **No loading states** | `PurchaseLedger.tsx` | The component has no loading indicator during persistence writes. |
| 14 | **No data validation on totalValue** | `PurchaseLedger.tsx:46-53` | `totalValue = qty * price` is computed without overflow guards or max-value validation. |
| 15 | **Category items are hardcoded** | `purchaseData.ts:34-115` | 6 preset categories + 4 empty custom slots. No UI to add custom categories or items. |

### Low

| # | Issue | File(s) | Detail |
|---|-------|---------|--------|
| 16 | **Documentation stale** | `docs/ARCHITECTURE.md` | References CLEAR_VERSION = 7, but App.tsx uses CLEAR_VERSION = 8. |
| 17 | **Category/Item taxonomy conflates asset types** | `purchaseData.ts` | "Shares" and "Stocks" are separate categories but semantically overlapping. ETF appears in both Stocks and Silver. |
| 18 | **`ItemAverages.avgUnitPrice` is arithmetic mean, not weighted** | `purchaseService.ts:24` | `sum(unitPrice) / count` — does not account for different quantities at different prices. A weighted average would be more meaningful. |
| 19 | **No `totalValue` rounding** | `purchaseService.ts:16` | `totalValue = qty * price` is not rounded. For fractional quantities with high precision prices, floating-point artifacts can appear. |

---

## Proposed Data Model

### PurchaseRecord (replaces current `Purchase`)

```typescript
interface PurchaseRecord {
  id: string                    // UUID or deterministic "PL-{timestamp}-{random}" — immutable, never reused
  investmentId: string | null   // FK to Investment.id — null until linked; set during migration or on create
  assetType: string             // Normalized asset type: "Gold" | "Silver" | "Bonds" | "Mutual Funds" | "ETFs" | "Stocks" | "Property" | (future)
  assetName: string             // Free-text name, e.g. "24K Gold Bar 1kg", "ADNOC Stock"
  purchaseDate: string          // ISO 8601 date (YYYY-MM-DD) — the economic date of the purchase
  quantity: number              // Positive number. 1 for indivisible assets (Property). Decimal for fractional (Gold, Mutual Funds).
  unitPrice: number             // Price per unit in the portfolio's currency. Positive number.
  totalValue: number            // Computed: quantity × unitPrice. Stored for query performance. Rounded to 2 decimals.
  buyer: string                 // Buyer/institution name. Free text. Optional.
  notes: string                 // Free-text notes. Optional.
  attachments: string[]         // Array of file paths or base64 URIs. Reserved for future use.
  tags: string[]                // User-defined tags for filtering. e.g. ["tax-free", "long-term"]
  status: 'active' | 'sold' | 'partially_sold'  // Tracks lifecycle. Default 'active'.
  createdAt: string             // ISO 8601 datetime — system timestamp of record creation
  updatedAt: string             // ISO 8601 datetime — system timestamp of last modification
  createdBy: string             // User identifier
  updatedBy: string             // User identifier
}
```

### Field Explanations

| Field | Why |
|-------|-----|
| `id` | Immutable primary key. Never reused after deletion. Enables audit trail and cross-referencing. |
| `investmentId` | Links this purchase to a portfolio investment record. `null` for purchases not yet associated with an investment (e.g., newly recorded but not yet mapped). |
| `assetType` | Enables filtering, grouping, and aggregation by asset class. Must match the Investment module's type taxonomy for cross-module consistency. |
| `assetName` | Human-readable name. This is what appears in reports, charts, and the investment portfolio. |
| `purchaseDate` | The economic date of the transaction. Distinct from `createdAt` (system date). Critical for FIFO/LIFO cost-basis calculations. |
| `quantity` | Supports fractional assets (0.5g gold, 0.123 BTC). Enforced strictly positive. |
| `unitPrice` | Enables cost-basis per-unit calculations. Stored as-is (no rounding) to preserve precision for weighted-average calculations. |
| `totalValue` | Derived field stored for query performance. `ROUND(qty * unitPrice, 2)`. Recomputable if ever lost. |
| `buyer` | Free-text for now. Future: could become a FK to a Buyer/Custodian table. |
| `notes` | Audit trail context: "Purchased during market dip", "Gift from father", etc. |
| `attachments` | Reserved. Future: buyer confirmations, invoices, statements. |
| `tags` | User-defined classification orthogonal to asset type. Enables custom reports and filtering. |
| `status` | Lifecycle tracking. An 'active' purchase contributes to current holdings. A 'sold' purchase is a disposed lot for realized gain calculation. |
| `createdAt` / `updatedAt` | System-managed timestamps for audit and sort-by-date queries. |
| `createdBy` / `updatedBy` | Multi-user support future-proofing. |

### Investment Model Changes (future, not implemented now)

The current `Investment` interface should eventually derive its financial fields from the Purchase Ledger:

```typescript
// Future Investment model — fields that would become derived
interface Investment {
  id: string
  assetType: string
  assetName: string
  // purchaseValue  → derived: sum of linked PurchaseRecord.totalValue where status = 'active'
  // quantity       → derived: sum of linked PurchaseRecord.quantity where status = 'active'
  // unitPrice      → derived: weighted average of linked PurchaseRecord.unitPrice
  // buyer          → derived: concatenated or most-recent
  currentPrice: number    // still manually entered or market-fetched
  totalValue: number      // derived: currentPrice × quantity
  profitLoss: number      // derived: totalValue - totalInvested
}
```

---

## Business Rules

### IDs

- **Immutable**: Once assigned, a PurchaseRecord `id` never changes.
- **No reuse**: After a record is deleted, its `id` is never reassigned.
- **Format**: UUID v4 or `PL-{timestamp_ms}-{random_4_digits}`. Must not collide across sessions or machines.
- **No sequential IDs**: Sequential IDs leak information and can collide on data import.

### Editing

- **Allowed fields**: `assetName`, `purchaseDate`, `quantity`, `unitPrice`, `buyer`, `notes`, `tags`, `status`.
- **Immutable fields**: `id`, `investmentId`, `assetType`, `createdAt`, `createdBy`.
- **Cascade**: Changing `quantity` or `unitPrice` recalculates `totalValue`. Changing `purchaseDate` reorders lot sequence for FIFO/LIFO.
- **Audit**: On every edit, `updatedAt` and `updatedBy` are updated. Previous values could be written to a changelog (future feature).

### Deletion

- **Soft delete preferred**: Set `status = 'sold'` rather than removing the record. This preserves cost basis for realized gain calculations.
- **Hard delete allowed only if**: No calculations depend on the record (i.e., it has no impact on any derived metric). The UI should warn: *"This will affect historical averages."*
- **Cascade**: Deleting a purchase must update derived calculations in the Dashboard and Reports.

### Historical Integrity

- Once a purchase is recorded, its `purchaseDate` establishes its position in the lot sequence.
- Editing the date of an existing purchase may change FIFO/LIFO ordering of lots. The UI must display a warning: *"Changing the date may affect gain calculations."*
- Deleted purchases leave a gap in the sequence. The system must handle gaps gracefully.

### Rounding

- `totalValue`: rounded to 2 decimal places via `Math.round(qty * unitPrice * 100) / 100`.
- `avgUnitPrice` (derived): compute at query time as `totalInvested / totalQuantity`. Round to 4 decimals for display.
- All display rounding uses `reportFormatters.formatCurrency()` for consistency with the rest of the app.

### Currency

- All monetary fields use the portfolio's base currency (from App currency state).
- No multi-currency support in this phase. Future: store `currency` field per purchase with FX rate at purchase date.

### Quantity Validation

- Must be a finite positive number: `isFinite(qty) && qty > 0`.
- Must not exceed `Number.MAX_SAFE_INTEGER`.
- For asset types that represent indivisible units (Property, Bonds), enforce integer: `Number.isInteger(qty)`.

### Price Validation

- Must be a finite positive number: `isFinite(price) && price >= 0`.
- Zero unit price allowed (gifted assets), but the UI should show a confirmation: *"Unit price is 0. Is this a gifted asset?"*
- Must not exceed `Number.MAX_SAFE_INTEGER`.

---

## Derived Calculations (Never Stored)

These are computed from PurchaseRecord data at query time. Storing them would create synchronization risk.

| Calculation | Formula | Where Used |
|-------------|---------|------------|
| Average purchase price (simple) | `SUM(totalValue) / SUM(quantity)` per `(assetType, assetName)` | Dashboard averages, Investment unit price |
| Average purchase price (weighted) | `SUM(unitPrice × quantity) / SUM(quantity)` per lot sequence | Cost basis, realized gains |
| Total invested (by asset) | `SUM(totalValue) WHERE status = 'active'` | Portfolio cost basis |
| Total invested (by portfolio) | `SUM(totalValue) WHERE status = 'active'` (all assets) | Net Worth, Reports |
| Purchase count | `COUNT(id)` per grouping | Dashboard, Purchase Ledger stats |
| Lot sequence | `ORDER BY purchaseDate ASC, createdAt ASC` per asset | FIFO/LIFO cost-basis matching |
| Realized gain (future) | `SUM(sellPrice × sellQuantity) - SUM(purchasePrice × allocatedQuantity)` | Tax reports, P&L |
| Unrealized gain (future) | `SUM(currentPrice × activeQuantity) - SUM(purchasePrice × activeQuantity)` | Portfolio performance |

---

## Data Flow

### Current Flow (simplified)

```
User Action → PurchaseLedger.tsx handler → setPurchases() → localStorage (insacc_purchases)
                                          → computeAverages() → Dashboard / PurchaseLedger UI

User Action → Investments.tsx handler → setInvestments() → localStorage (insacc_investments)
                                       → Dashboard KPIs / Reports
```

**Problem**: Two parallel, independent data stores for the same economic reality.

### Proposed Flow (phase B implementation)

```
User Action (Record Purchase) → PurchaseLedger.tsx
  → Creates PurchaseRecord (insacc_purchases_ledger)
  → Creates/updates Investment record (insacc_investments) with derived fields
  → Triggers recalculation of Dashboard averages, Reports aggregates

User Action (Sell/Lot Close) → PurchaseLedger.tsx
  → Sets PurchaseRecord.status = 'sold'
  → Updates Investment derived fields
  → (Future) Records realized gain

Read Path:
  Dashboard:   computeAverages(ledger, { status: 'active' })
  Investments: buildInvestments(ledger)  → grouped by assetType+assetName
  Reports:     reportService(ledger)     → cost basis, cash flow, etc.
```

### Phase A (this sprint) — Architecture Only

No changes to data flow. Phase A produces the specification. Phase B implements:

1. Create the new `PurchaseRecord` interface and migration
2. Rewrite the Purchase Ledger UI using the Design System (KpiCard, ChartCard, DataTable, Modal, Badge, Button)
3. Add edit capability
4. Link purchases to investments
5. Replace `computeAverages()` with a service that operates on the new model
6. Remove duplicate `computeAverages()` call via shared hook or lifted state

---

## Future Features (Architecture Reserved)

These are not implemented now. The data model reserves fields and patterns for them.

### Attachments

- `attachments: string[]` field on PurchaseRecord
- Future: file picker in the form, storage as base64 or Electron IPC to filesystem
- Display as thumbnail list in the purchase detail view

### Invoices & Buyer Statements

- Future entity: `PurchaseDocument` (id, purchaseId, type: 'invoice'|'statement'|'confirmation', fileRef, uploadedAt)
- Not part of the PurchaseRecord itself — a related table/array
- The `attachments` field on PurchaseRecord is a lightweight reference list

### Tax Lots

A tax lot is a subset of a PurchaseRecord that has been disposed of.

```
TaxLot {
  purchaseId: string       // FK to PurchaseRecord
  quantitySold: number     // portion of original PurchaseRecord.quantity
  saleDate: string
  salePrice: number
  realizedGain: number     // derived
}
```

The `status` field on PurchaseRecord supports the lifecycle:
- `active`: full lot held
- `partially_sold`: some quantity disposed of via one or more TaxLots
- `sold`: fully disposed

### FIFO/LIFO

FIFO and LIFO are matching algorithms, not stored data. They operate on the lot sequence:

```
FIFO: MATCH sale → PurchaseRecords ORDER BY purchaseDate ASC, createdAt ASC
LIFO: MATCH sale → PurchaseRecords ORDER BY purchaseDate DESC, createdAt DESC
```

The lot sequence is determined by `purchaseDate` (tiebreaker: `createdAt`). No additional storage is needed.

### Realized Gains

```
realizedGain = SUM(TaxLot.salePrice × TaxLot.quantitySold)
             - SUM(matched PurchaseRecord.unitPrice × TaxLot.quantitySold)
```

### Unrealized Gains

```
unrealizedGain = (currentPrice - avgPurchasePrice) × activeQuantity
```

---

## Migration Strategy

### Step 0: No migration (Phase A)

Phase A is architecture-only. No code changes. This document serves as the specification.

### Step 1: Create new data model (Phase B, first commit)

- Add `PurchaseRecord` interface to a new file `src/renderer/data/purchaseTypes.ts`
- Keep old `Purchase` interface until migration is complete
- Both data stores coexist during migration

### Step 2: Rewrite the service layer

- New functions in `src/renderer/services/purchaseLedgerService.ts`:
  - `createPurchase(input)` — validates, generates ID, writes PurchaseRecord
  - `updatePurchase(id, changes)` — validates allowed fields, recalculates totalValue, sets updatedAt
  - `deletePurchase(id)` — soft-delete (sets status = 'sold')
  - `getAverages(records)` — replaces `computeAverages()` with weighted-average logic
  - `getPortfolioCostBasis(records)` — total invested by asset type
- Old `purchaseService.ts` remains for Dashboard compatibility

### Step 3: Migrate existing data

```
On first load after upgrade:
  1. Read insacc_purchases (old format)
  2. Map each Purchase → PurchaseRecord:
     - id: "PL-" + old id
     - investmentId: null (no link exists)
     - assetType: resolved from PurchaseCategory tree (look up itemId → category)
     - assetName: resolved from PurchaseItem.name
     - purchaseDate: old date
     - quantity: old quantity
     - unitPrice: old unitPrice
     - totalValue: old totalValue
     - buyer: "" (not in old model)
     - notes: "" (not in old model)
     - attachments: [] (not in old model)
     - tags: [] (not in old model)
     - status: 'active'
     - createdAt: new Date().toISOString() (approximate)
     - updatedAt: same as createdAt
     - createdBy: "system-migration"
     - updatedBy: "system-migration"
  3. Write to insacc_purchases_ledger
  4. Set migration flag: insacc_purchase_ledger_migrated = "true"
  5. Old data remains in insacc_purchases for rollback
```

### Step 4: Link to Investments (Phase B or C)

- For each Investment in `insacc_investments`:
  - Try to match by (type, assetName) to one or more PurchaseRecords
  - Set `investmentId` on matching PurchaseRecords
  - If no match found, create a synthetic PurchaseRecord to represent the investment
- This is a one-time migration. After linking, Investment `purchaseValue` becomes derived.

### Step 5: Phase out old model (Phase B or C, final commit)

- Remove `purchaseData.ts` (or gut to re-export from new types)
- Remove `purchaseService.ts` (or gut to re-export from new service)
- Rewrite `PurchaseLedger.tsx` with new data model and Design System components
- Update `Dashboard.tsx` to use new service
- Add Playwright tests for Purchase Ledger CRUD
- After 30 days (or one release cycle), the migration code in Step 3 can be removed

### Rollback

- Old data remains in `insacc_purchases` untouched during migration
- If migration fails, set `insacc_purchase_ledger_migrated = "false"` and delete `insacc_purchases_ledger`
- The app falls back to reading `insacc_purchases` with the old code path

---

## Appendix: Comparison Table

| Capability | Current | Proposed |
|------------|---------|----------|
| Data model fields | 5 (id, date, itemId, qty, price, totalValue) | 17 (full audit trail) |
| Asset classification | 2-level (category → item) | Flat `assetType` + free-text `assetName` |
| Edit purchases | ✗ | ✓ (with audit) |
| Delete purchases | Hard delete only | Soft-delete via `status` |
| Link to investments | ✗ | `investmentId` FK |
| Cost basis calculation | Arithmetic mean only | Weighted average + FIFO/LIFO ready |
| Realized gains | ✗ | TaxLot model reserved |
| UI framework | Inline styles | Design System (KpiCard, ChartCard, DataTable, Modal) |
| ID generation | Counter resets on reload | UUID / deterministic non-colliding |
| Tests | 0 | Required in Phase B |
| Attachments | ✗ | Field reserved |
| Multi-currency | ✗ | `currency` field reserved |
