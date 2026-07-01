# InsAcc ERP Architecture Overview

## Process Architecture

InsAcc is a multi-process Electron desktop application:

- **Main Process** (`src/main/main.js`): Window lifecycle, native dialogs, IPC handlers.
- **Preload Bridge** (`src/main/preload.js`): Exposes `window.api` via context isolation.
- **Renderer Process** (`src/renderer/`): React 18 application with Vite bundler.

## Directory Structure

```
src/
├── main/                           # Electron main process
│   ├── main.js
│   └── preload.js
├── shared/                         # Cross-process shared utilities
│   └── utils/
│       └── dateUtils.ts            # Centralized timestamp helper
└── renderer/                       # React application
    ├── App.tsx                     # Root component, global state, routers
    ├── usePersistedState.ts        # localStorage sync hook
    ├── accounting/                 # Double-entry accounting engine
    │   ├── types.ts                # Core accounting interfaces
    │   ├── accountingEngine.ts     # Event-to-voucher processor
    │   ├── postingRules.ts         # Debit/credit mapping rules
    │   ├── postingValidator.ts     # Voucher validation pipeline
    │   ├── voucherService.ts       # Voucher lifecycle management
    │   ├── ledgerService.ts        # Balance calculations
    │   ├── chartOfAccountsService.ts
    │   └── periodService.ts        # Fiscal year/period locks
    ├── components/                 # UI screens
    │   ├── design/                 # Reusable design system
    │   │   ├── DesignSystem.tsx
    │   │   └── Table.tsx
    │   ├── charts/                 # Recharts wrappers
    │   ├── InvestmentRouter.tsx
    │   └── PropertyRouter.tsx
    ├── contexts/                   # React context providers
    │   └── MasterDataContext.tsx   # Enterprise master data context
    ├── data/                       # Type definitions and seed data
    │   ├── masterData.ts           # Enterprise master data interfaces
    │   ├── propertyTypes.ts
    │   └── ...
    ├── readModels/                 # CQRS-style read projections
    ├── services/                   # Business logic services
    │   ├── masterDataService.ts    # Master data factories
    │   └── ...
    └── styles/
        └── theme.css               # CSS custom properties
```

## Master Data Architecture

Enterprise master data entities are defined in `src/renderer/data/masterData.ts`:

| Entity | Purpose | GL Link |
|---|---|---|
| Currency | Exchange rate configuration | — |
| TaxCode | VAT/tax rate definitions | Tax Liability account |
| PaymentTerm | Net 30, Due on Receipt, etc. | — |
| Vendor | Supplier master records | Accounts Payable |
| MasterCustomer | Customer master records | Accounts Receivable |
| AssetType | Asset class definitions | Cost, Depreciation, Expense accounts |
| FixedAsset | Individual capitalized assets | Cost, Accumulated Depreciation accounts |

All master data is accessible via `MasterDataContext` (`src/renderer/contexts/MasterDataContext.tsx`).

## Shared Utilities

The `src/shared/utils/dateUtils.ts` module centralizes the `now()` timestamp helper previously duplicated across 5 service files.

## State Management

- Global state is managed via `usePersistedState` hooks in `App.tsx`.
- Master data state is exposed through `MasterDataProvider` context for future component consumption.
- The accounting engine remains the single source of truth for all financial calculations.
