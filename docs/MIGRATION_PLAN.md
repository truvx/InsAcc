# Migration Plan: Current → Target Design System

**Status:** Planning
**Risk Level:** Medium (primarily UI, preserves all business logic)

---

## 1. Components to Keep (as-is)

These components are clean, use DesignSystem components correctly, and follow current conventions:

| Component | Lines | Reason |
|---|---|---|
| `Investments.tsx` | 199 | Uses `Button`, `Badge` from DesignSystem; clean CSS classes; proper page-header/page-body structure |
| `Transactions.tsx` | 193 | Same pattern as Investments; uses `Button`, `Badge`; consistent |
| `Login.tsx` | 201 | Self-contained; screen-specific styling legitimate |
| `ProfileSelection.tsx` | 54 | Clean, simple, uses motion |
| `ModuleSelection.tsx` | 89 | Clean, simple, uses motion |
| `Sidebar.tsx` | 119 | Clean; `NavIcon` with inline SVGs is fine to keep |
| `Toast.tsx` | 51 | Self-contained notification; works correctly |
| `PageTransition.tsx` | 36 | Trivial Framer Motion wrapper |
| `usePersistedState.ts` | 26 | Core data persistence hook |
| `Chart components` (4 files) | 362 total | Recharts-based; self-contained |
| `DesignSystem.tsx` | 368 | Core design system — keep until shadcn/ui migration |

---

## 2. Components to Rewrite

These need significant refactoring to use DesignSystem components and CSS classes instead of inline styles.

| Component | Lines | Inline Styles | Issues |
|---|---|---|---|
| **Property.tsx** | **856** | **~50 blocks** | Heaviest offender. Uses nonexistent CSS classes (`chart-card`, `chart-header`, `chart-title`, `chart-period`), `login-*` classes, `numpad-btn`/`cancel-btn` classes, hardcoded gold/dark-blue colors, custom `DatePicker`/`MonthPicker` with inline styles, standalone `Modal` instead of DesignSystem Modal |
| **Settings.tsx** | 341 | ~25 blocks | Uses nonexistent classes (`chart-period`, `settings-input`), misuses `.settings-field` as select/input class, custom toggle switch with inline styles, `numpad-btn`/`cancel-btn` classes |
| **PurchaseLedger.tsx** | 255 | ~20 blocks | Uses nonexistent classes (`chart-card`, `dashboard-grid`, `performance-item`, `header-btn`, `login-*`), hardcoded gold colors, `numpad-btn`/`cancel-btn` classes |
| **BankAccounts.tsx** | 167 | ~10 blocks | Minor inline styles, `window.api` cast to `any` |
| **Dashboard.tsx** | 174 | ~5 blocks | Mostly clean; duplicate `computeAverages()` |

---

## 3. Components to Remove

| Component | Reason |
|---|---|
| **`SummaryCards.tsx`** | **Dead code** — exported but never imported anywhere in the codebase |
| **`Modal.tsx` (standalone)** | Duplicates `DesignSystem Modal` — Property.tsx imports `./Modal` instead of `./design/DesignSystem` |

---

## 4. Duplicate Logic

| Duplication | Files | Lines |
|---|---|---|
| **`computeAverages()` function** | `Dashboard.tsx:26-51` and `PurchaseLedger.tsx:17-43` | Identical 25-line function in both files |
| **`UserEntry` interface** | `App.tsx:34-38` and `Settings.tsx:4-8` | Same 4-field interface |
| **`LogEntry` interface** | `App.tsx:40-44` and `Settings.tsx:10-14` | Same 3-field interface |
| **Toast state pattern** | Every component (10+ files) | Same `{ visible, message, type }` + `useState` + callback pattern |
| **SVG calendar icon** | `Property.tsx:30` and `Property.tsx:57` | Same calendar SVG inlined twice (DatePicker + MonthPicker) |
| **`nextId()` utility** | `Property.tsx:225` | Date-based ID generator — should be shared |

---

## 5. Large Files That Should Be Split

| File | Lines | Suggested Split |
|---|---|---|
| **`Property.tsx`** | **856** | **4 files by tab**: `PropertyDashboard.tsx`, `PropertyCategories.tsx` (includes buildings/units), `PropertyTenants.tsx`, `PropertyRentIncome.tsx` + extract `DatePicker`/`MonthPicker` into `components/design/` |
| **`Settings.tsx`** | 341 | **4 files by tab**: `SettingsGeneral.tsx`, `SettingsUsers.tsx`, `SettingsSecurity.tsx`, `SettingsNotifications.tsx` |
| **`theme.css`** | 1534 | **3 files**: `tokens.css` (variables, resets), `layout.css` (sidebar, header, page), `components.css` (cards, tables, forms, buttons, modals, toasts, skeletons) |
| **`DesignSystem.tsx`** | 368 | **2 files**: `DesignSystem.tsx` (components), `Icons.tsx` (11 SVG icon components) |

---

## 6. Business Logic That Should Move Into Services

Create a `src/renderer/services/` directory:

| Service File | Logic to Extract | Source Files |
|---|---|---|
| **`services/purchaseService.ts`** | `computeAverages()`, purchase validation, `nextPurchaseId()` | `Dashboard.tsx`, `PurchaseLedger.tsx` |
| **`services/investmentService.ts`** | `generateId()`, investment validation | `Investments.tsx` |
| **`services/propertyService.ts`** | Tenant CRUD, rent payment CRUD, unit status management, `nextId()` | `Property.tsx` |
| **`services/authService.ts`** | Password validation, PIN validation | `Login.tsx`, `Settings.tsx` |

---

## 7. CSS Issues

### Missing CSS Classes (used by components but not defined in `theme.css`)

| Class | Used In | Should Be |
|---|---|---|
| `chart-card` | Property, PurchaseLedger, Settings | Replace with `.card` or add to theme.css |
| `chart-header` | Property, PurchaseLedger | Replace with `.card-header` |
| `chart-title` | Property, PurchaseLedger | Replace with `.card-title` |
| `chart-subtitle` | Property | Add as CSS class or replace |
| `chart-period` | Property, Settings | Custom tab style — add to theme.css |
| `dashboard-grid` | Property, PurchaseLedger | Replace with `.kpi-grid` |
| `performance-item` | Property, PurchaseLedger | Add to theme.css or replace with existing classes |
| `numpad-btn` | Property, PurchaseLedger, Settings, Login | Replace with `.btn` variants |
| `cancel-btn` | Property, PurchaseLedger | Replace with `.btn-secondary` |
| `header-btn` | PurchaseLedger | Replace with `.btn-ghost` |
| `main-header` | Property | Replace with `.page-header` |
| `scroll-content` | Property, PurchaseLedger, Settings | Replace with `.page-body` |
| `login-input-group` | Property, PurchaseLedger, Settings (Login also) | Rename to generic `.input-group` |
| `login-input` | Property, PurchaseLedger, Settings (Login also) | Replace with `.input` |
| `login-label` | Property, PurchaseLedger, Settings (Login also) | Replace with `.form-label` |
| `settings-input` | Settings | Replace with `.input` |
| `sidebar-user-avatar` | Property, Settings | Replace with `.sidebar-avatar` |

### Misused CSS Classes

| Class | CSS Defines | Used As | Fix |
|---|---|---|---|
| `.settings-field` | Flex row layout div | `<select>` and `<input>` className | Replace with `.input` for form controls |

### Hardcoded Colors That Should Be CSS Variables

| Hex Color | Used In | Suggested Variable |
|---|---|---|
| `#EF4444` (danger already exists) | Property, Settings, PurchaseLedger | Already `--danger` — use it |
| `#D4AF37` / `#D4AF37` | Property, PurchaseLedger | `--gold` alias exists (line 141 in theme.css: `--gold: #F59E0B`) |
| `#1F4E79` (navy) | Property, PurchaseLedger | Create `--navy` variable or use `--info` |
| `rgba(46,139,87,0.12)` (green bg) | Property | Already `--success-light` |
| `rgba(239,68,68,0.12)` (red bg) | Property | Already `--danger-light` |
| `rgba(212,175,55,0.12)` (gold bg) | Property, PurchaseLedger | Create `--gold-light` |
| `rgba(31,78,121,0.12)` (navy bg) | Property | Create `--navy-light` |

---

## 8. Pages with Inconsistent UI

| Page | Inconsistency |
|---|---|
| **Property.tsx** | Uses Login page CSS classes for forms (`login-input-group`, `login-input`, `login-label`). Uses nonexistent chart classes (`chart-card`). Standalone Modal instead of DesignSystem Modal. Heavy inline styles with hardcoded colors. Custom DatePicker/MonthPicker (no standard component). |
| **PurchaseLedger.tsx** | Mix of Login classes and custom inline styles. Uses `<div>` with inline styles for card layout instead of `.card`. Gold/blue hardcoded colors. |
| **Settings.tsx** | Misuses `.settings-field` as select/input class. Custom toggle switch with 6 inline style props. Mixed button conventions (`numpad-btn` + `chart-period`). |
| **BankAccounts.tsx** | Minor: card body uses `style={{ padding: 0 }}` instead of class. Statement list uses inline styles. |
| **Dashboard.tsx** | Minor: `style={{ color: 'var(--danger)' }}` on button instead of class. Some inline flex. |
| **Transactions.tsx** | Minor: `style={{ fontFamily: 'var(--font-mono)' }}` on table cells. |
| **Login.tsx, ProfileSelection.tsx, ModuleSelection.tsx** | Consistent with each other but use custom `login-*` classes that leak into other components. |

**Consistent pages** (follow current design system well): `Investments.tsx`, `Dashboard.tsx` (mostly), `Sidebar.tsx`

---

## 9. Technical Debt

| Issue | Severity | Location | Impact |
|---|---|---|---|
| **No error boundary** | High | App.tsx — `renderPage()` can throw | Entire app white-screens on any render error |
| **No skeleton/loading states** | Medium | All pages | Content flashes in from localStorage |
| **No dark mode persistence** | Medium | `App.tsx:56` — `useState('light')` | Theme resets on every app restart |
| **No auto-logout implementation** | Medium | `App.tsx:60` — setting exists but unused | Security theater |
| **Password in plaintext** | Medium | `App.tsx:56` — `storedPassword` in localStorage | Credential exposure |
| **Base64 file storage** | Medium | `Property.tsx:142` — FileReader readAsDataURL | localStorage quota exhaustion with large files |
| **`window.api` typed as `any`** | Low | `BankAccounts.tsx:100` | No type safety on IPC calls |
| **Profiles hardcoded** | Low | `App.tsx:49-52` | Cannot add/remove profiles dynamically |
| **Hardcoded `profile` objects** | Low | `App.tsx:137-241` — every component gets `{ name: 'Investor', role: 'Admin' }` | Doesn't use actual selected profile data |
| **Duplicate `CLEAR_VERSION = 7`** | Low | Version check wipes data on mismatch | No incremental migration |
| **No unit tests** | High | No test config | Cannot safely refactor |
| **Chart data is empty arrays** | Low | `sampleData.ts` — `ASSET_ALLOCATION`, `CASH_FLOW_DATA`, etc. are `[]` | Charts render empty with no data |
| **SummaryCards.tsx dead code** | Low | Not imported anywhere | Unnecessary maintenance |
| **Login CSS class names leak** | Low | `login-input-group` used in Property/Settings/Categories | Semantic confusion |

---

## 10. Priority Order for Implementation

### Phase 0 — Foundation (risk-free, preserves all behavior)

```
Week 1
```

1. **Add Error Boundary** — Wrap `<App />` in `src/renderer/index.tsx` with a React error boundary component. Catches all render errors and shows a fallback UI instead of white screen.

2. **Extract `computeAverages()` into `services/purchaseService.ts`** — Move the duplicated function from `Dashboard.tsx` and `PurchaseLedger.tsx` into a shared module. Import from both files. No behavior change.

3. **Extract shared TypeScript types** — Move `UserEntry` and `LogEntry` interfaces from `App.tsx` and `Settings.tsx` into `data/types.ts`. Import from both files.

4. **Remove dead code** — Delete `SummaryCards.tsx` (unused).

5. **Type `window.api` safely** — Add TypeScript declaration for `Window.api` in a `src/renderer/types.d.ts` or the existing preload types. Replace `(window as any).api` with typed access.

6. **Fix inconsistent CSS classes** — Replace `settings-input` with `.input`, `login-input` with `.input`, `login-label` with `.form-label`, `login-input-group` with `.form-group` across Property, PurchaseLedger, Settings. Keep Login component self-contained.

### Phase 1 — CSS and Component Standardization (UI only)

```
Week 2
```

7. **Audit and add missing CSS classes** — Add `.chart-period`, `.performance-item`, `.sidebar-user-avatar`, `.scroll-content` to `theme.css`. Or better: replace their usage with existing classes (`page-body`, `sidebar-avatar`, etc.).

8. **Replace hardcoded colors with CSS variables** — Replace `#1F4E79` → `--navy` (create), `rgba(212,175,55,...)` → `--gold-light` (create), and use existing `--success-light`/`--danger-light`. Do this across Property, PurchaseLedger, Settings.

9. **Replace inline styles with CSS classes** — Target files in order:
   - `BankAccounts.tsx` (~10 blocks, low-hanging fruit)
   - `Dashboard.tsx` (~5 blocks)
   - `Transactions.tsx` (2 blocks: font-mono cells)
   - `Settings.tsx` (~25 blocks)
   - `PurchaseLedger.tsx` (~20 blocks)
   - `Property.tsx` (~50 blocks — biggest effort)

10. **Standardize buttons** — Replace `numpad-btn` with `btn btn-primary`, `cancel-btn` with `btn btn-secondary` across all files. Update Login component to use consistent button styling.

11. **Replace standalone Modal with DesignSystem Modal** — Update Property.tsx to import `Modal` from `./design/DesignSystem` instead of `./Modal`. Delete standalone `Modal.tsx`.

### Phase 2 — Component Architecture (structural)

```
Week 3
```

12. **Split `Property.tsx` (856 → ~200 lines per file)**:
    - `PropertyDashboard.tsx` — KPI cards, buildings overview
    - `PropertyCategories.tsx` — Category/building/unit management
    - `PropertyTenants.tsx` — Tenant list, add/edit/remove form
    - `PropertyRentIncome.tsx` — Rent payments, record/edit/delete
    - `Property.tsx` becomes a thin shell with tab routing
    - Extract `DatePicker` and `MonthPicker` into `components/design/` as reusable inputs

13. **Split `Settings.tsx` (341 → ~80 lines per file)**:
    - `SettingsGeneral.tsx`, `SettingsUsers.tsx`, `SettingsSecurity.tsx`, `SettingsNotifications.tsx`
    - `Settings.tsx` becomes a thin shell with tab routing

14. **Split `theme.css` (1534 → ~500 lines per file)**:
    - `tokens.css` — CSS variables, @font-face, resets, scrollbar
    - `layout.css` — `.app-shell`, `.sidebar`, `.main-content`, `.page-header`, `.page-body`, `.kpi-grid`, `.chart-grid`, responsive
    - `components.css` — `.card`, `.table`, `.form-*`, `.btn`, `.badge`, `.input`, `.modal`, `.toast`, `.skeleton`, `.empty-state`, `.tabs`, `.login-*`, `.profile-*`, `.module-*`, `.settings-*`

15. **Split `DesignSystem.tsx`**:
    - Move 11 SVG icon components to `Icons.tsx`
    - Keep all component exports in `DesignSystem.tsx`

### Phase 3 — Design System Upgrade (target v2.0)

```
Week 4-5
```

16. **Install Tailwind CSS** — Integrate with Vite. Configure `tailwind.config.js` to use current CSS variable values as the theme. Set `darkMode: 'class'`.

17. **Install shadcn/ui** — Run `npx shadcn init`. Migrate DesignSystem components one-by-one:
    - `Button` → shadcn `Button`
    - `Input` → shadcn `Input`
    - `Select` → shadcn `Select`
    - `Badge` → shadcn `Badge`
    - `Card` / `KpiCard` → shadcn `Card`
    - `Tabs` → shadcn `Tabs`
    - `Modal` → shadcn `Dialog`

18. **Install Lucide React** — Replace all inline SVG icons with Lucide components. Target files:
    - `DesignSystem.tsx` — replace CloseIcon, ChevronDownIcon, PlusIcon, SearchIcon, TrashIcon, EditIcon, DownloadIcon, UploadIcon, FilterIcon, RefreshIcon, ChevronLeftIcon
    - `Sidebar.tsx` — replace NavIcon inline SVGs
    - Every `svg` inline element in page components

19. **Install TanStack Table** — Migrate tables in `Investments.tsx`, `Transactions.tsx`, `Dashboard.tsx` from plain HTML `<table>` to TanStack Table with sorting, filtering, and pagination.

20. **Install React Hook Form + Zod** — Migrate form validation in `Investments.tsx`, `Transactions.tsx`, `Property.tsx`, `Settings.tsx` from manual `useState` + inline checks to RHF + Zod schemas.

### Phase 4 — New Features (enhancements)

```
Week 6
```

21. **Add skeleton loading states** — Implement loading state in every page component. Use existing `.skeleton`, `.skeleton-kpi`, `.skeleton-text`, `.skeleton-row` CSS classes. Show skeletons on initial render before localStorage data is available.

22. **Add table search and filter** — Add search bar to Investments, Transactions, BankAccounts. Add column sorting to all tables.

23. **Add top navigation bar** — Add global search bar, notification bell, quick actions dropdown, profile menu to the page header area.

24. **Add command palette** — Implement `⌘K` command palette with search, navigation to all pages, and quick actions (Add Investment, Add Transaction, etc.).

25. **Persist dark mode preference** — Move `theme` from `useState` to `usePersistedState`.

26. **Implement auto-logout** — Add `setTimeout` based on `autoLogout` value. Clear on user activity (click, keypress). Redirect to login on expiry.

27. **Fix CSS variable values** — Update `theme.css` variables to match `TARGET_DESIGN_SYSTEM.md`:
    - `--bg`: `#0C0C0D` → `#09090B`
    - `--surface`: `#1C1C1F` → `#111113`
    - `--radius`: `10px` → `12px`
    - `--radius-lg`: `16px` → `18px`
    - `--shadow-sm`: → `0 8px 24px rgba(0,0,0,0.20)`
    - `--space-*`: migrate from 4px grid to 8px grid
    - `--sidebar-width`: `240px` → `280px`
    - Body font: `13px` → `16px`

---

## Migration Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Business logic regression during CSS refactor | Low | Phase 0 first — services extraction verifies logic is preserved |
| localStorage data corruption | Low | Phase 0 — `CLEAR_VERSION` check remains unchanged |
| Components break during split | Medium | Phased split — test each sub-component independently before deleting original |
| Design system upgrade breaks existing UI | Medium | Phase 2-3 — keep old CSS alongside new Tailwind config during transition |
| Test gap catches nothing | High | Manual smoke test of all 10 pages after each phase |

## Current Line Counts (Before)

| Category | Lines |
|---|---|
| All `.tsx` files | 4,828 |
| `theme.css` | 1,534 |
| All `.ts` files | 464 |
| **Total source** | **6,826** |

## Estimated Line Counts (After Phase 3)

| Category | Lines |
|---|---|
| Page components (refactored, split) | ~3,500 |
| Design system (shadcn/ui + Tailwind) | ~500 |
| Services + types | ~500 |
| CSS (reduced by Tailwind) | ~800 |
| **Total source** | **~5,300** |

Net reduction of ~1,500 lines while adding sorting, search, pagination, loading states, and proper form validation.
