# Changelog

All notable changes to InsAcc are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.0] — 2026-06-30

### Added

#### Investment Module
- **Investment Dashboard**: KPI cards (portfolio value, active investments, monthly/YTD return), asset allocation pie chart, investment growth area chart, cash flow bar chart, purchase averages table
- **Transactions**: Full CRUD for Income/Expense/Journal entries with category filtering, type badges, running totals, search, sort, pagination, and filter combinations
- **Bank Accounts**: Multiple bank accounts with deposit/withdrawal/transfer operations, statement entries, running balance, search/filter, and export to file
- **Purchase Ledger**: Purchase tracking with asset type categories, auto-generated IDs, KPI cards (total invested, quantity, weighted average, active lots), filter by type, search, sort, validation, and status badges
- **Investment Holdings**: Group purchases by asset, cost basis, market value, unrealised gain/loss, portfolio percentage
- **Dashboard** (legacy): Net worth, total assets, cash, income/expense KPIs, allocation, growth, cash flow, and asset performance charts
- **Reports**: Overview, balance sheet, profit & loss, trial balance, holdings, cash position, investment position, purchase report, bank position, cash flow, general journal, general ledger — with CSV export
- **History**: Multi-year history viewer with timeline, summary cards (total investments, investments made, profit generated, transactions)
- **Documents**: Document upload with drag-and-drop, grouping by type (PDF/Excel/Image/Word/Contract), collapsible sections, preview, and download

#### Property Module
- **Property Dashboard**: Total properties, units, tenants, occupancy rate, monthly rent, bank balance KPIs, allocation and expense breakdown charts
- **Properties**: Category management (Building/Villa/Apartment), building management, unit management with rent and status
- **Tenants**: Tenant CRUD with name, phone, email, unit assignment, lease dates, contract amount, payment mode, contract file upload
- **Leases**: Lease management with rent details, security and PDC cheques
- **Rent Income**: Record rent payments per unit per month, status (paid/pending/overdue) with badges
- **PDC Manager**: Post-dated cheque tracking with status (pending/deposited/cleared/bounced/replaced/cancelled)
- **Bank Accounts**: Deposit, withdrawal, transfer, search/filter with audit logging
- **Transactions**: Income/Expense CRUD with category filtering
- **Reports**: Overview, balance sheet, profit & loss, trial balance, rent collection, PDC summary, lease expiry — with CSV export
- **Documents**: Document upload/delete grouped by type

#### Double-Entry Accounting Engine
- Complete chart of accounts (asset, liability, equity, revenue, expense)
- Voucher lifecycle: Draft → Approved → Posted
- Voucher types: Receipt, Payment, Journal
- Posting rules for all accounting events (asset purchase, rental income, bank deposit, bank withdrawal, bank transfer, dividend, interest, capital gain, management fee, maintenance expense, opening balance, security deposit, PDC issuance/clear/bounce/cancel)
- Trial balance, balance sheet, profit & loss statements
- Ledger queries: account balance, running balance, account statement, trial balance
- Posting validation (balanced lines, valid accounts, amounts, dates, status transitions)
- Auto-creation of asset and bank accounts on first use

#### Authentication & Profiles
- Login screen with email/password and PIN numpad modes
- Two profiles: Sameer Ishaq Harmoudi (Admin), Accounts
- Profile selection with avatar and role indicator
- Module selection (Investment Portfolio, Property Management)

#### Banking Module
- Multi-account management (checking, savings, cash)
- Deposit, withdrawal, and transfer operations
- Statement entries with running balance calculation
- Search and filter by date/type/description
- Export statement to file

#### Settings
- Theme toggle (light/dark mode)
- Currency selection (USD, EUR, GBP, AED, SAR, KWD, BHD, QAR, OMR)
- Date format (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
- Language (English, Arabic, French)
- Password change
- User management (add/remove users, role assignment)
- Activity log with action/user/time entries
- Auto-logout timeout (15/30/60 minutes, Never)
- Notification toggles
- Reset all data (Admin only, double confirmation)

#### Sidebar Navigation
- Module-aware navigation items with SVG icons
- Active page highlighting with gold accent
- Module switch button and sign-out
- Responsive collapse at 768px
- ARIA attributes for accessibility

#### Design System
- Reusable components: Button, IconButton, Input, Select, Badge, KpiCard, ChartCard, Card, EmptyState, Modal, ConfirmDialog, DatePicker, EntityForm, SegmentedControl, Table
- SVG icon library (PlusIcon, EditIcon, TrashIcon, SearchIcon, CloseIcon, UploadIcon, DownloadIcon, PortfolioIcon, ActivityIcon, CalendarIcon, etc.)
- Framer Motion micro-interactions on all components
- Table component with sorting, pagination, search, sticky headers, loading/empty states

#### Branding (Sprint 14)
- Navy (`#1A2744`) + Gold (`#C9A84C`) premium colour palette
- Dark navy sidebar (`#0F172A`) in light mode
- Dark mode with coordinated navy-toned greys
- Gold-accented active nav items and KPI hover tops
- Premium login screen with dark navy gradient and orbiting circles
- Shield brand icon with navy+gold gradient
- Design system CSS custom properties architecture
- Inter font family across 7 weights

#### Testing
- 76 Playwright end-to-end tests across 3 spec files
- Purchase Ledger UI tests (14 tests)
- Reports Visual QA tests (14 tests)
- Transactions Final QA tests (48 tests covering CRUD, dashboard integration, filter combinations, sorting, validation, performance, persistence)

#### Data
- Seed data for investment module: 3 bank accounts, 13 investment purchases, bank transactions, income/expense transactions, vouchers
- Seed data for property module: 3 bank accounts, 6 properties, 15 units, 11 tenants, 11 leases, PDC cheques
- Seed accounting vouchers: opening balance, asset purchases, dividend/interest/capital gain income, management fees, maintenance expenses
- All seed data internally consistent and cross-referencing
- Schema versioning with clear_version system

#### Build & Distribution
- Electron desktop packaging for Windows (portable), macOS (dmg/zip), Linux (AppImage/deb)
- Vite build pipeline with React plugin
- Electron-builder configuration
- Resource icons for all platforms
- Icon generation script

### Changed

- **Theme overhaul**: Replaced Zoho-like indigo/purple with Navy+Gold palette across all CSS variables, components, charts, badges, buttons, login, sidebar, and KPI cards
- **Login redesign**: Shield icon replacing generic lock icon, navy-toned background gradient, gold-accented brand identity
- **KPI cards**: Updated to gold gradient top border with dark gradient headers
- **Navigation**: Updated active states to gold accent, fixed icon display, removed duplicate key in Sidebar
- **Charts**: Updated colour arrays to use new brand palette
- **Testing infrastructure**: Fixed test KPI labels, navigation paths, locator precision for current component structure
- **vite.config.ts**: Set `allowedHosts: true` for cross-device previews

### Fixed

- `Sidebar.tsx`: Removed duplicate `account` key in icon map
- `qa-reports-visual.spec.ts`: Updated to match `InvestmentReports.tsx` component structure (KPI labels, tab interaction tests)
- `qa-transactions.spec.ts`: Fixed navigation path from `Accounting` to `Transactions`, adjusted KPI assertions for seeded data overlap, fixed Cash Flow chart locator, fixed Recent Activity locator, fixed deleted transactions KPI check
- `assetTransactionService.ts`: Added missing `marketValue` and `portfolioPercentage` fields to return type
- `Playwright` test stability: Increased timeouts, fixed filter combinatorics, ensured cleanup between test suites

### Security

- Role-based access control (Admin vs Accounts)
- Admin-only access: user management, password change, data reset
- Electron `contextIsolation: true`, `nodeIntegration: false`
- Session-based profile selection

---

## [0.2.0-foundation] — 2026-06-27

### Added
- Initial project structure with Electron + React + TypeScript + Vite
- Core design system with CSS custom properties
- Authentication flow (login, profile selection, module selection)
- Investment module foundation (dashboard, investments, transactions, bank accounts, reports, documents, history)
- Property module foundation (dashboard, properties, tenants, rent income, bank accounts, reports, documents, history)
- Leftover UI components (purchase ledger, documents, settings)
- Existing design system documentation (`CURRENT_DESIGN_SYSTEM.md`)
- Architecture documentation (`ARCHITECTURE.md`, `ACCOUNTING_ARCHITECTURE.md`, `BANKING_ARCHITECTURE.md`, etc.)
- PRD documenting all implemented features
- Build configurations for Windows, macOS, Linux
- Icon resources and generation scripts

---

## [0.1.0] — 2026-06-26

### Added
- Project inception
- Initial Vite + React scaffold
- TypeScript configuration
- README with project overview
- Basic folder structure
