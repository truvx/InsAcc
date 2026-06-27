# InsAcc Architecture

## Project Overview

InsAcc (Intelligent Asset & Investment Accounting) is a desktop financial management application for tracking investment portfolios and property assets. It serves professional services firms, asset managers, and financial operations teams.

### Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | React 18 + TypeScript | UI rendering and application logic |
| Bundler | Vite 5 | Development server and production builds |
| Desktop | Electron 28 | Cross-platform desktop packaging |
| Charts | Recharts 2.x | Data visualization (area, bar, pie, donut) |
| Animation | Framer Motion 11 | Page transitions and component animations |
| Styling | CSS Custom Properties | Theming with light/dark mode via `.dark-mode` class |
| Font | Inter | Bundled as woff2 (8 weights), zero external requests |
| Persistence | localStorage | All data stored via `usePersistedState` hook |
| Icons | Inline SVG Components | 11 icon components in DesignSystem |

### Electron Architecture

```
main.js (Main Process)
  └── Creates BrowserWindow (1400x900, min 1200x800)
  └── nodeIntegration: false, contextIsolation: true
  └── Loads preload.js for IPC bridge
  └── Registers IPC handler: 'save-file'
  └── Dev: http://localhost:5174
  └── Prod: dist/index.html (menu hidden)
         │
preload.js (Context Bridge)
  └── Exposes window.api.saveFile(filename, content)
         │
renderer (React App)
  └── Calls window.api.saveFile() for document/report exports
```

### React Architecture

```
index.tsx
  └── <StrictMode><App /></StrictMode>
         │
App.tsx — Root component
  ├── Screen routing (login → profiles → module → dashboard)
  ├── All persisted state via usePersistedState (16 localStorage keys)
  ├── All non-persisted state (theme, language, currency, etc.)
  └── Module/page switching (investment | property)
```

### Vite Configuration

- `base: './'` for Electron `file://` protocol
- `root: '.'` at project root
- Build output to `dist/`
- Dev server on port 5174
- `allowedHosts: true` for Vercel preview compatibility

---

## Folder Structure

```
InsAcc/
├── index.html                          # Vite entry HTML
├── package.json                        # Dependencies, scripts, electron-builder config
├── vite.config.ts                      # Vite bundler configuration
├── tsconfig.json                       # TypeScript configuration
├── src/
│   ├── main/
│   │   ├── main.js                     # Electron main process
│   │   └── preload.js                  # IPC context bridge
│   └── renderer/
│       ├── index.tsx                   # React mount point
│       ├── App.tsx                     # Root component, routing, state
│       ├── usePersistedState.ts        # localStorage persistence hook
│       ├── utils.ts                    # t() translation, formatDate()
│       ├── styles/
│       │   ├── theme.css               # Full design system (1534 lines)
│       │   └── fonts/                  # Inter woff2 files (8 weights)
│       ├── data/
│       │   ├── sampleData.ts           # Profile, chart data types + empty defaults
│       │   ├── purchaseData.ts         # Purchase, PurchaseCategory, ItemAverages types
│       │   └── propertyData.ts         # PropertyCategory, Building, Unit, Tenant, RentPayment types
│       └── components/
│           ├── design/
│           │   └── DesignSystem.tsx     # Reusable UI components + SVG icons
│           ├── charts/
│           │   ├── AssetAllocationPie.tsx
│           │   ├── AssetPerformanceChart.tsx
│           │   ├── CashFlowChart.tsx
│           │   └── InvestmentGrowthChart.tsx
│           ├── Login.tsx
│           ├── ProfileSelection.tsx
│           ├── ModuleSelection.tsx
│           ├── Sidebar.tsx
│           ├── Dashboard.tsx
│           ├── Investments.tsx
│           ├── Transactions.tsx
│           ├── BankAccounts.tsx
│           ├── Reports.tsx
│           ├── Documents.tsx
│           ├── History.tsx
│           ├── Settings.tsx
│           ├── PurchaseLedger.tsx
│           ├── Property.tsx
│           ├── SummaryCards.tsx
│           ├── PageTransition.tsx
│           ├── Modal.tsx
│           └── Toast.tsx
├── resources/                          # App icons (SVG, PNG, ICO)
├── scripts/
│   └── generate-icons.js               # Icon generation from SVG
├── docs/
│   ├── ux-overview.md
│   ├── ux-review.md
│   ├── DESIGN_SYSTEM.md
│   └── AI_RULES.md
├── dist/                               # Vite build output (gitignored)
└── release/                            # electron-builder output (gitignored)
```

---

## Application Layers

### UI Layer
- CSS Custom Properties in `theme.css` drive all visual styling
- Light/dark mode via `.dark-mode` class switching CSS variables
- Responsive at 1024px, 768px, 480px breakpoints
- Inter font loaded locally via `@font-face`

### Components
- **Design System** (`components/design/DesignSystem.tsx`): Button, Input, Select, Badge, Card, KpiCard, Tabs, EmptyState, Modal, Spinner, 11 SVG icons
- **Layout**: Sidebar, PageTransition, Modal, Toast
- **Screens**: Login, ProfileSelection, ModuleSelection, Dashboard, Investments, Transactions, BankAccounts, Reports, Documents, History, Settings, PurchaseLedger, Property
- **Charts**: AssetAllocationPie, AssetPerformanceChart, CashFlowChart, InvestmentGrowthChart

### Business Logic
All business logic lives inside page components:
- Investment CRUD: `Investments.tsx`
- Transaction recording: `Transactions.tsx`
- Bank reconciliation: `BankAccounts.tsx`
- Purchase averaging: `PurchaseLedger.tsx`, `Dashboard.tsx`
- Property management: `Property.tsx`

### Data Layer
- `usePersistedState` hook wraps `useState` with `localStorage` read/write
- 16 localStorage keys with automatic persistence
- Schema versioning via `insacc_clear_version` (currently version 7)
- No backend server or API — fully client-side

### Utilities
- `t(key, lang)` — translation utility (English, Arabic, French, 33 keys each)
- `formatDate(dateStr, format)` — ISO date to display format

---

## Routing

No React Router. Routing is implemented via conditional rendering in `App.tsx`:

```
Screen flow (screen state):
  'login' → <Login>
  'profiles' → <ProfileSelection>
  'module' → <ModuleSelection>
  'dashboard' → <Sidebar> + <AnimatePresence> + <PageTransition> + <renderPage()>
```

Within the dashboard screen, page routing is controlled by `activePage`:

```
activeModule === 'investment'  →  9 pages (InvPage)
activeModule === 'property'    →  6 pages (PropPage)
```

Page transitions use `PageTransition.tsx` (framer-motion spring animation) wrapped in `AnimatePresence` for enter/exit animations.

---

## State Management

### Global State (App.tsx)

All state lives in `App.tsx`. Two categories:

**Persisted (localStorage via usePersistedState)**:
- investments, transactions, statement, balance, documents, logs
- purchaseCategories, purchases
- invUsers, propUsers
- propCategories, propBuildings, propUnits, propTenants, propRentPayments
- clear_version (schema version key)

**Non-persisted (useState)**:
- screen, selectedProfile, activeModule, activePage
- theme, storedPassword, currency, dateFormat, language, autoLogout

### Local State (Component-level)
Each page component manages its own UI state:
- Form visibility, editing state, toast notifications
- Filter/selections, form field values
- Modal open/close

### Data Flow
```
User action → Component handler → setState in App.tsx (via props)
                                → usePersistedState writes to localStorage
                                → Re-render propagates new data
```

---

## Database

No external database. Storage is entirely `localStorage` in the browser/Electron renderer process.

### Storage Keys (16 total)

| Key | Type | Content |
|---|---|---|
| `insacc_investments` | `Investment[]` | Investment records with asset type, value, quantity |
| `insacc_transactions` | `Transaction[]` | Income/Expense/Journal entries |
| `insacc_statement` | `StatementEntry[]` | Bank statement lines |
| `insacc_balance` | `number` | Current bank balance |
| `insacc_documents` | `DocItem[]` | Uploaded document metadata |
| `insacc_logs` | `LogEntry[]` | Activity audit trail |
| `insacc_purchase_categories` | `PurchaseCategory[]` | Purchase ledger categories with items |
| `insacc_purchases` | `Purchase[]` | Purchase records |
| `insacc_inv_users` | `UserEntry[]` | Investment module user permissions |
| `insacc_prop_users` | `UserEntry[]` | Property module user permissions |
| `insacc_prop_categories` | `PropertyCategory[]` | Property categories (Building/Villa/Apartment) |
| `insacc_prop_buildings` | `PropertyBuilding[]` | Building records per category |
| `insacc_prop_units` | `PropertyUnit[]` | Individual units within buildings |
| `insacc_prop_tenants` | `PropertyTenant[]` | Tenant records with contracts |
| `insacc_prop_rent` | `RentPayment[]` | Rent payment records |
| `insacc_clear_version` | `string` | Schema version for data migration |

### Schema Versioning
- `CLEAR_VERSION = 7` in App.tsx
- On startup, if stored version mismatches, all `insacc_*` keys are cleared and page reloads

---

## API Layer

No external API calls. The only IPC communication is:

### IPC Channel: `save-file`
- **Direction**: Renderer → Main (invoke)
- **Purpose**: Write text content to the user's Downloads folder
- **Exposed as**: `window.api.saveFile(filename, content) → Promise<string>`
- **Used by**: Reports.tsx (PDF/CSV/Excel export), BankAccounts.tsx (statement download), Documents.tsx (document download)

---

## Component Architecture

### Shared Components (`components/design/DesignSystem.tsx`)
- `Button` — 4 variants (primary/secondary/ghost/danger), 3 sizes (sm/md/lg), loading state
- `IconButton` — Square icon button with aria-label
- `Input` — With label, error, hint, forwarded ref
- `Select` — With label, error, options array
- `Badge` — 5 variants (primary/success/warning/danger/neutral)
- `Card` — With optional title and actions
- `KpiCard` — Metric display with label, value, optional change indicator
- `Tabs` — Tab bar with aria roles
- `EmptyState` — Centered empty state with icon, title, text, optional action
- `Modal` — Portal-based dialog with header/body/footer, backdrop
- `Spinner` — SVG loading spinner
- SVG Icons — Close, ChevronDown, Plus, Search, Trash, Edit, Download, Upload, Filter, Refresh, ChevronLeft

### Feature Components
Each page in `components/` is a self-contained feature with its own state, rendering, and business logic.

### Layout Components
- `Sidebar` — Fixed left navigation (240px expanded, 56px collapsed)
- `PageTransition` — Framer Motion wrapper for page animations
- `Toast` — Fixed-position notification container

### Charts
- 3 Recharts components: PieChart (AssetAllocationPie), AreaChart (InvestmentGrowthChart), BarChart (CashFlowChart)
- 1 custom ranking list (AssetPerformanceChart)
- All use empty default data (user populates via the app)

---

## Naming Conventions

### Components
- PascalCase filenames matching the exported function name
- `Login.tsx`, `ProfileSelection.tsx`, `Sidebar.tsx`, etc.

### Hooks
- `usePersistedState` — camelCase with `use` prefix

### Utilities
- `t()` — short name for translation
- `formatDate()` — descriptive camelCase

### Types
- PascalCase interfaces and type aliases
- `Investment`, `Transaction`, `Profile`, `PropertyCategory`, etc.

### Files
- `.tsx` for React components
- `.ts` for data/types and utilities
- `.css` for styles

### Folders
- `components/` — React components
- `components/design/` — Design system components
- `components/charts/` — Chart components
- `data/` — TypeScript types and data definitions
- `styles/` — CSS files and font assets
- `main/` — Electron main process

---

## Coding Standards

### TypeScript Conventions
- Strict mode enabled in `tsconfig.json`
- Explicit interface definitions for all props
- Type exports from component files for shared types (e.g., `Investment`, `Transaction`)

### React Best Practices
- Functional components with hooks
- Props destructured at component definition
- `usePersistedState` for persistent data
- `useState` for ephemeral UI state
- `useMemo` for computed values (e.g., averages in Dashboard, PurchaseLedger)
- `useRef` for DOM access and callback stability (e.g., pinRef in Login)

### Error Handling
- Toast notifications for success/error feedback
- Form validation with inline error messages
- No global error boundary

### Performance
- `useMemo` for expensive computations (purchase averages)
- CSS animations via `@keyframes` and `transition` properties
- Framer Motion for component animations (spring physics, not JS-driven layout)

---

## Dependency List

| Package | Purpose |
|---|---|
| `react` / `react-dom` | UI framework |
| `framer-motion` | Page transitions and component animations |
| `recharts` | Data visualization (pie, area, bar charts) |
| `vite` | Development server and build tool |
| `@vitejs/plugin-react` | React JSX transform and Fast Refresh |
| `electron` | Desktop application wrapper |
| `electron-builder` | Cross-platform packaging and distribution |
| `concurrently` | Run Vite + Electron in parallel during development |
| `wait-on` | Wait for Vite dev server before launching Electron |
| `sharp` | Image processing for icon generation |
| `typescript` | Type checking |

---

## Future Development Guidelines

1. **Adding a new page**: Create a new component in `components/`, add the page type to `InvPage` or `PropPage` in `App.tsx`, add the nav item in `Sidebar.tsx`, add the render case in `App.tsx`
2. **Adding a new data entity**: Create types in the appropriate `data/` file, add a `usePersistedState` call in `App.tsx`, wire props through to the component
3. **New features**: Keep business logic inside the page component. Extract shared logic into utilities in `utils.ts` or custom hooks
4. **Styling changes**: Modify CSS variables in `theme.css`. Never add inline styles. Use the existing class system and spacing grid
5. **Component reuse**: Check `DesignSystem.tsx` before building new UI elements. Extend existing components with props rather than creating alternatives
6. **Data migrations**: Increment `CLEAR_VERSION` in `App.tsx` when schema changes. The version check clears stale data automatically
7. **Electron changes**: Only modify `src/main/main.js` or `src/main/preload.js` for native OS functionality. Keep the preload surface minimal
