# InsAcc — Product Requirements Document

**Version:** 1.0
**Status:** Implemented

---

## Product Overview

### Purpose
InsAcc (Intelligent Asset & Investment Accounting) is a desktop financial management application for tracking investment portfolios and property assets. It provides a unified interface for recording investments, transactions, bank statements, purchase ledgers, property units, tenant records, and rent payments — all with role-based access and multi-language support.

### Target Users
- Portfolio managers tracking investments across asset types
- Operations staff recording purchases and bank transactions
- Property managers handling tenants, units, and rent collection
- Accountants reconciling financial records
- Executives reviewing dashboard KPIs and reports

### Core Objectives
1. Provide a single source of truth for investment and property financial data
2. Enable quick recording of transactions, investments, and purchases
3. Support multi-module workflows (investment portfolio + property management)
4. Maintain auditable history with activity logs
5. Offer role-based access control (Admin, Accounts)

### Value Proposition
InsAcc replaces spreadsheets with a structured, persistent desktop application that works offline, supports multiple users per machine, and provides real-time calculations (averages, totals, KPIs) without an internet connection or server infrastructure.

---

## User Roles

### Admin
- Full access to all modules and features
- Can create/remove users
- Can change passwords
- Can reset all data
- Can access security settings
- **Existing profiles:** Sameer Ishaq Harmoudi, Owner

### Accounts
- Read/write access to data entry features
- Cannot manage users or access security settings
- Cannot reset data
- **Existing profile:** Accounts

---

## Functional Requirements

### 1. Authentication

**Purpose:** Control access to the application.

**Implemented features:**
- Email/password login (password validated against stored value, default `1234`)
- PIN numpad login (4-digit PIN, same as password) with keyboard support
- Toggle between email and PIN modes
- Error messages for invalid credentials

**Inputs:** Email string, password string, or 4-digit PIN via numpad
**Outputs:** Successful login transitions to profile selection
**Workflow:** Launch app → Enter credentials → Select profile → Select module

### 2. Profile Selection

**Purpose:** Allow multiple users to share the same application installation.

**Implemented features:**
- Two hardcoded profiles: Sameer Ishaq Harmoudi (Admin), Accounts (Accounts)
- Avatar with initials and color-coded role indicator
- Visual distinction for Admin profile (highlighted border)

**Workflow:** Login → Select profile → Proceed to module selection

### 3. Module Selection

**Purpose:** Route users to the appropriate functional area.

**Implemented features:**
- Two modules: Investment Portfolio, Property Management
- Module cards with SVG icons and descriptions
- Back button to return to profile selection

### 4. Dashboard (Investment Module)

**Purpose:** Provide a high-level overview of portfolio health.

**Implemented features:**
- KPI cards: Total Portfolio Value, Active Investments, This Month, YTD Return
- Purchase averages table (conditional on data existing)
- Four chart panels:
  - Asset Allocation Pie Chart (Recharts PieChart)
  - Asset Performance ranking list
  - Investment Growth Area Chart (Recharts AreaChart)
  - Cash Flow Bar Chart (Recharts BarChart)
- Date display formatted per user settings

**Inputs:** Purchase data (from Purchase Ledger), sample chart data (currently empty defaults)
**Outputs:** KPI metrics, interactive charts, purchase averages table

### 5. Investments

**Purpose:** Record and manage investment holdings.

**Implemented features:**
- Table listing: ID, Date, Asset Name, Type, Purchase Value, Quantity, Unit Price, Buyer
- Add investment form with fields: type (12 asset types), asset name, purchase value, quantity, unit price, buyer, date
- Edit existing investments (gold accent edit button)
- Delete investments (red trash button with confirmation)
- Auto-generated investment IDs (prefix + serial, e.g., GLD-001)
- Status badges for asset types

**Inputs:** Investment form fields
**Outputs:** Persisted investment records in `insacc_investments`

### 6. Transactions

**Purpose:** Record financial transactions across categories.

**Implemented features:**
- Three transaction types: Income, Expense, Journal
- Category selection filtered by transaction type (e.g., income categories for Income type)
- Filter bar: All / Income / Expense / Journal tabs
- Table: Date, Type (badge), Category, Amount, Status
- Add/edit/delete transactions
- Running totals displayed per filter

**Inputs:** Transaction form (type, category, amount, date, status)
**Outputs:** Persisted transaction records in `insacc_transactions`

### 7. Bank Accounts

**Purpose:** Track bank balance and statement entries.

**Implemented features:**
- Balance display card with account info
- Quick actions: Deposit, Withdrawal, Transfer
- Statement entry list with date, description, amount, type (credit/debit)
- Remove individual statement entries
- Running balance calculation
- Export statement to file via Electron IPC

**Inputs:** Action type, amount, description
**Outputs:** Updated balance, statement entries in `insacc_statement`

### 8. Reports

**Purpose:** Generate and export financial reports.

**Implemented features:**
- Report categories: Asset Reports, Banking Reports, Financial Reports
- Sub-reports per category (e.g., Portfolio Summary, Transaction Report)
- Export formats: PDF, Excel, CSV
- Date range selection
- Preview panel showing report preview
- File save via Electron IPC to system Downloads folder

**Outputs:** Exported report file on disk

### 9. Documents

**Purpose:** Upload and organize supporting documents.

**Implemented features:**
- Document upload (drag-and-drop or file picker)
- Grouped by type: PDF, Excel, Image, Word, Other, Contract
- Collapsible sections per type with type-specific colors
- Preview panel for selected document
- Download via IPC file save
- Merges tenant contract files from Property module
- Base64 storage for uploaded files

**Inputs:** File selection, document metadata
**Outputs:** Persisted documents in `insacc_documents`

### 10. History

**Purpose:** Browse historical investments and transactions.

**Implemented features:**
- Year selector (dynamically generated from 2015 to current year)
- Summary cards: Total Investments, Investments Made, Profit Generated, Transactions
- Timeline view with color-coded entries (income green, buy blue, others gold)
- Date drill-down for specific day view
- Reads from actual `investments` and `transactions` data

**Inputs:** Year selection, optional date click
**Outputs:** Filtered timeline and summary metrics

### 11. Purchase Ledger

**Purpose:** Track purchases with running averages.

**Implemented features:**
- 6 default categories (Gold, Silver, Bonds, Mutual Funds, Stocks, Shares) + 4 custom slots
- Category and item selection via cascading dropdowns
- Purchase form: date, quantity, unit price (auto-calculates total value)
- Current item statistics card (dark gradient header): purchase count, avg unit price, avg value, avg qty, total qty, total value
- Purchase history list per item with remove
- All items overview with averages across categories
- Top 4 averages KPI cards
- Formatted currency display

**Inputs:** Category, item, date, quantity, unit price
**Outputs:** Persisted purchases in `insacc_purchases`, computed averages

### 12. Property Management

**Purpose:** Manage property portfolio, tenants, and rent collection.

**Implemented features:**

**Dashboard:**
- Total Properties count, Occupied, Vacant, Tenants
- Rent summary: Total Collected, Payment Count, Cash/Cheque totals
- Dark gradient stat cards

**Properties (tab):**
- Category management: Add/delete categories (Building, Villa, Apartment)
- Building management: Add buildings per category
- Unit management: Per-building unit list with monthly rent
- Unit status (vacant/occupied) with color coding
- Edit unit rent inline

**Tenants (tab):**
- Add tenant form: name, phone, email, unit assignment, lease dates, contract amount, payment mode
- Contract file upload (PDF/doc/image, stored as base64)
- Contract file download
- Edit/delete tenants with confirmation
- Payment status and invoice generation flags

**Rent Income (tab):**
- Record rent payments per unit per month with date, amount, payment mode
- Status: paid/pending/overdue with color badges
- Credited to: cash or cheque
- Edit/delete rent payments with confirmation
- Security cheque and PDC cheque tracking

**Inputs:** Property categories, buildings, units, tenant details, rent payments
**Outputs:** Persisted records in `insacc_prop_*` keys

### 13. Settings

**Purpose:** Configure application preferences and manage users.

**Implemented features:**

**General tab:**
- Theme toggle (light/dark mode) with SVG sun/moon icons
- Currency selection (USD, EUR, GBP, AED, SAR, KWD, BHD, QAR, OMR)
- Date format (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
- Language (English, Arabic, French) — affects `t()` translations
- Auto-logout timeout (15/30/60 minutes, Never)

**User Management tab:**
- User list with name, role, status
- Add user form (name, role selection)
- Role badge display
- Per-module user lists (Investment, Property)

**Security tab:**
- Password change form (current, new, confirm)
- Activity log with action/user/time entries
- Reset All Data button (Admin only, double confirmation, Danger Zone)

**Notifications tab:**
- Toggle toggles for various notification types

### 14. Sidebar Navigation

**Purpose:** Provide persistent navigation across all pages.

**Implemented features:**
- Module-aware navigation items (9 for Investment, 6 for Property)
- Active page highlighting with primary color
- SVG icons per navigation item via `NavIcon` component
- Module switch button at bottom
- Sign Out button
- User info display (name, role) with avatar
- Responsive collapse to icon-only at 768px
- `aria-current="page"` for active items

---

## Business Rules

1. **Login validation**: Password/PIN is compared against `storedPassword` (default `1234`). Any email is accepted as long as the password matches
2. **Investment ID generation**: Format is `{PREFIX}-{SERIAL}` where prefix comes from `ASSET_TYPES` short-form and serial is zero-padded to 3 digits
3. **Purchase averages**: Computed on-the-fly from purchase records — avg unit price = sum of unit prices / count; avg value = sum of total values / count
4. **Bank balance**: Updated immediately on deposit/withdrawal/transfer actions, manually adjustable
5. **Schema versioning**: `CLEAR_VERSION = 7` — data wiped when version changes
6. **Admin gating**: User management, password change, and data reset are restricted to Admin role
7. **Rent status**: Rent payments have three states — paid/pending/overdue — displayed with color-coded badges
8. **Translation**: UI strings mapped through `t()` with English/Arabic/French dictionaries (33 keys each)

---

## Data Model Overview

### Core Entities

```
Profile (hardcoded)
  ├── id: number
  ├── name: string
  ├── role: 'Admin' | 'Accounts'
  ├── initials: string
  └── locked: boolean

Investment
  ├── id: string (auto-generated: "{prefix}-{serial}")
  ├── date: string
  ├── assetName: string
  ├── type: string
  ├── purchaseValue: number
  ├── quantity: number
  ├── unitPrice: number
  └── buyer: string

Transaction
  ├── id: string
  ├── date: string
  ├── type: 'Income' | 'Expense' | 'Journal'
  ├── category: string
  ├── amount: number
  └── status: string

PurchaseCategory
  ├── id: string
  ├── name: string
  ├── isCustom: boolean
  └── items: PurchaseItem[]

Purchase
  ├── id: string
  ├── date: string
  ├── itemId: string
  ├── quantity: number
  ├── unitPrice: number
  └── totalValue: number

PropertyCategory → PropertyBuilding → PropertyUnit
PropertyTenant (references unitId)
RentPayment (references unitId, tenantId)
```

### Entity Relationships
- `PurchaseCategory` has many `PurchaseItem` → each generates `Purchase` records
- `PropertyCategory` has many `PropertyBuilding` → each has many `PropertyUnit`
- `PropertyTenant` belongs to one `PropertyUnit`
- `RentPayment` belongs to one `PropertyUnit` and one `PropertyTenant`

---

## User Flows

### Portfolio Management Flow
1. Login → Select profile → Select "Investment Portfolio" module
2. Dashboard reviews KPI overview and charts
3. Add investments via Investments page
4. Record transactions via Transactions page
5. Track purchases via Purchase Ledger
6. View history and generate reports

### Property Management Flow
1. Login → Select profile → Select "Property Management" module
2. Dashboard shows property occupancy overview
3. Set up categories and buildings in Properties tab
4. Add units with rent amounts
5. Add tenants with contract uploads
6. Record rent payments in Rent Income tab
7. View contracts in Documents page

### Reporting Flow
1. Navigate to Reports page
2. Select report category and specific report
3. Set date range
4. Preview report
5. Export as PDF/Excel/CSV to Downloads folder

---

## Non-Functional Requirements

### Performance
- All data stored client-side in localStorage — no network latency
- Purchase averages computed in-memory via `useMemo`
- Charts render with Recharts (SVG-based, performant for typical portfolio sizes)
- CSS animations via GPU-composited properties (opacity, transform)

### Security
- `contextIsolation: true`, `nodeIntegration: false` in Electron
- Password stored in plaintext in localStorage (current limitation)
- Role-based UI gating (Admin vs Accounts)
- Admin-only access to user management and data reset

### Reliability
- All data persists to localStorage on every change via `useEffect`
- Schema versioning prevents stale data corruption
- No external service dependencies — works fully offline

### Accessibility
- `aria-label` on icon-only buttons
- `aria-current="page"` on active nav items
- `aria-selected` on tab components
- `aria-modal="true"` on dialogs
- `:focus-visible` outlines on all interactive elements
- Keyboard navigation supported (Tab, Enter, Escape)

### Responsiveness
- Desktop-first design
- Sidebar collapses at 768px
- Grids collapse at 1024px
- KPI grid adapts from 4 → 2 → 1 columns
- Forms and filter bars stack vertically on small screens

### Maintainability
- Single CSS file with custom properties
- Centralized design system components in `DesignSystem.tsx`
- All state managed in `App.tsx` with clear prop drilling
- TypeScript interfaces defined per data domain

---

## Current Limitations

1. **No real authentication**: Password is stored in plaintext in localStorage; any email is accepted
2. **No backend/database**: All data is client-side localStorage — no sync, no server, single-machine only
3. **No real user creation**: Profiles are hardcoded in `App.tsx`, not persisted
4. **Chart data is empty**: Asset allocation, cash flow, and investment growth data are defined as empty const arrays — charts render with no data until user adds records
5. **No pagination or search**: Investment and transaction tables render all records at once
6. **Notification system is placeholder**: Notification settings exist but produce only toast messages; no push, email, or scheduling
7. **No export for all data**: Only Reports and Bank Accounts have file export; no full data export/backup
8. **Purchase ledger logic duplication**: `computeAverages()` exists in both `Dashboard.tsx` and `PurchaseLedger.tsx`
9. **No dark mode toggle persistence**: Theme state resets on app restart (non-persisted `useState` in App.tsx)
10. **Language translations incomplete**: Only 33 keys translated across 3 languages — many UI strings are English-only
11. **No unit/integration tests**: No test framework configured
12. **Contract file storage**: Files stored as base64 in localStorage — large files will exceed storage quotas
13. **Autologout not implemented**: Setting exists in UI but no actual timeout logic

---

## Future Roadmap

*The following are recommendations not yet implemented in the codebase.*

### High Priority
- Persistent theme setting (save to localStorage)
- Real pagination and search for tables
- Full data export/backup (JSON export of all `insacc_*` keys)
- Proper password hashing (even for localStorage)
- Dark mode toggle persistence

### Medium Priority
- Automated lease expiry alerts
- Rent reminder notifications
- File storage via Electron `userData` directory instead of base64 localStorage
- Consolidate `computeAverages()` into a shared utility
- Add unit tests (Jest/Vitest + React Testing Library)

### Lower Priority
- Multi-user sync via backend (optional cloud sync)
- Dashboard customization (user-configurable KPI cards)
- Recurring transaction templates
- Email reports
- Bulk import from CSV/XLSX
- Electron auto-updater
- Print-friendly report layouts

---

## Change Log

| Date | Version | Changes |
|---|---|---|
| 2026-06-27 | 1.0 | Initial PRD — documents all implemented features based on codebase analysis |

This document must be updated whenever significant features, workflows, or data models change. Every PR or feature branch should review this document for accuracy.
