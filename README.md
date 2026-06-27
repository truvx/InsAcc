# InsAcc — Intelligent Asset & Investment Accounting

Desktop financial management application for tracking investment portfolios and property assets. Built with Electron + React + TypeScript.

## Features

### Investment Portfolio Module
- **Dashboard** — KPI overview, portfolio allocation charts, asset performance, cash flow
- **Investments** — Create and manage investments across asset types (Gold, Shares, Real Estate, Crypto, Fixed Deposit, Bonds)
- **Transactions** — Record income, expenses, and journal entries with categories and payment modes
- **Bank Accounts** — Statement entries, running balance, reconciliation
- **Reports** — Portfolio summary, transaction reports, financial statements
- **Documents** — Upload and organize documents by type (PDF, Excel, Image, Word)
- **History** — Browse transaction history by year with summary cards
- **Purchase Ledger** — Track purchase items with running averages, organized by category
- **Settings** — User management, password, currency, date format, language, dark mode

### Property Management Module
- **Dashboard** — Property portfolio overview, occupancy metrics, rent collection status
- **Properties** — Manage categories (Building, Villa, Apartment) and buildings with unit tracking
- **Tenants** — Add/edit/remove tenants with contract file upload and download
- **Rent Income** — Record monthly rent payments per unit, edit/delete entries
- **Documents** — Unified document view including tenant contracts
- **Settings** — Property-specific user management and preferences

### Cross-Module
- Role-based access (Admin, Accounts)
- Light/dark mode
- Multi-language support (English, Arabic, French)
- Customizable currency, date format
- Data export via Electron IPC to system Downloads folder
- Toast notifications for all actions
- Modal dialogs with keyboard support
- Responsive layout (desktop-first, adapts to tablet/mobile)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Bundler | Vite 5 |
| Desktop | Electron 28 |
| Charts | Recharts |
| Styling | CSS custom properties (no framework) |
| Font | Inter (bundled as woff2, no external requests) |
| Persistence | localStorage via `usePersistedState` hook |
| Icons | Inline SVG components |

## Architecture

```
Login → Profile Selection → Module Selection
                                ├── Investment Portfolio (9 pages)
                                └── Property Management (6 pages)
```

All state is persisted to localStorage with keys prefixed `insacc_`. A version-bumping mechanism (`insacc_clear_version`) wipes stale data on schema changes.

### Design System
Reusable components in `src/renderer/components/design/DesignSystem.tsx`:
- Button (4 variants, 3 sizes, loading state)
- Input, Select (with label, error, hint)
- Badge (5 color variants)
- Card (with header + body)
- KpiCard (metric display with optional change indicator)
- Tabs (with aria roles)
- EmptyState (icon + title + text + action)
- Modal (portal-based, backdrop dismiss)
- 11 SVG icon components

CSS architecture: single `theme.css` with 80+ CSS custom properties, light/dark mode via `.dark-mode` class, consistent 4px spacing grid.

## Getting Started

```bash
npm install
npm run dev        # Vite dev server (port 5174) + Electron window
```

## Build

```bash
npm run build      # Vite build + electron-builder (Windows portable)
```

Output: `release/InsAcc-Setup-1.0.0-x64.exe`

See [BUILD_WINDOWS.md](./BUILD_WINDOWS.md) for Windows build details.

## Project Structure

```
src/
  main/             # Electron main process
    main.js         # App window, IPC handlers
    preload.js      # Context bridge for file save API
  renderer/         # React app
    App.tsx         # Root component, state management, routing
    usePersistedState.ts
    utils.ts        # formatDate(), t() translation
    components/
      design/       # DesignSystem.tsx — reusable UI components
      charts/       # Recharts chart components
      Login/ProfileSelection/ModuleSelection/
      Sidebar.tsx
      Dashboard/Investments/Transactions/BankAccounts/
      Reports/Documents/History/Settings/
      PurchaseLedger.tsx
      Property.tsx
      Modal.tsx / Toast.tsx
    styles/
      theme.css     # All styles, design tokens, light/dark mode
      fonts/        # Inter woff2 files
    data/
      sampleData.ts # Types, sample profiles, chart data
      purchaseData.ts
      propertyData.ts
docs/
  ux-overview.md    # UX plan and design principles
  ux-review.md      # Accessibility and consistency audit
resources/
  icon.svg          # App logo
  icon.png          # Windows icon (1024x1024)
```
