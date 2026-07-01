# InsAcc v1.0.0 — Release Notes

**Release Date:** 2026-06-30
**Product:** InsAcc — Intelligent Asset & Investment Accounting System
**Version:** 1.0.0

---

## Overview

InsAcc is a desktop financial management application for tracking investment portfolios, property assets, and double-entry accounting. It provides a unified interface for recording investments, transactions, bank accounts, purchase ledgers, property units, tenants, rent payments, and financial reports — all running locally on a single machine without backend infrastructure.

---

## New Features

### Investment Portfolio Management
- **Dashboard**: Real-time KPIs (portfolio value, active investments, monthly return, YTD return), asset allocation pie chart, investment growth area chart, cash flow bar chart
- **Purchase Ledger**: Full lifecycle management with KPI cards, asset type filtering, search, multi-column sorting, purchase validation
- **Investment Holdings**: Grouped view by asset type with cost basis, market value, unrealised gain/loss, portfolio percentage
- **Transactions**: Income/Expense/Journal recording with type-specific categories, search, sort, pagination, and filter combinations
- **Bank Accounts**: Multi-bank management with deposit/withdrawal/transfer, running balance, statement export
- **History**: Multi-year timeline with summary cards
- **Documents**: Drag-and-drop upload, type-based grouping, preview and download

### Property Management
- **Dashboard**: Property/unit/tenant KPIs, occupancy rates, rent collection summaries, allocation and expense charts
- **Properties**: Category, building, and unit management with rent and occupancy tracking
- **Tenants & Leases**: Full lifecycle with contract uploads, lease dates, payment modes, PDC cheque management
- **Rent Collection**: Per-unit monthly rent payments with paid/pending/overdue status
- **PDC Manager**: Post-dated cheque tracking through deposit, clear, bounce, replace, cancel lifecycle
- **Reports**: Rent collection, PDC summary, lease expiry reporting

### Double-Entry Accounting
- Complete chart of accounts (assets, liabilities, equity, revenue, expenses)
- Receipt, payment, and journal vouchers with Draft → Approved → Posted lifecycle
- Trial balance, balance sheet, and profit & loss statements with hierarchical drill-down
- Ledger queries: account balances, running balance, account statements
- Posting validation and automatic account creation
- Investment and property accounting event processing

### Reports & Export
- 12 report views: overview, balance sheet, profit & loss, trial balance, holdings, cash position, investment position, purchase report, bank position, cash flow, general journal, general ledger
- 7 property report views: overview, balance sheet, profit & loss, trial balance, rent collection, PDC summary, lease expiry
- CSV export for all report views

### User Experience
- Premium navy + gold branding throughout
- Light and dark mode with full theme support
- Responsive layout with sidebar collapse at 768px
- Multiple currency and date format options
- Multi-language support (English, Arabic, French)
- Framer Motion micro-interactions on all components
- Role-based access control (Admin, Accounts)

### Data Management
- All data persisted to localStorage with schema versioning
- Comprehensive seed data for immediate demo readiness
- Offline-first — no server or internet required
- Reset all data capability (Admin only)

---

## Installation

### System Requirements
- **OS:** Windows 10+, macOS 12+, or Linux (x64)
- **RAM:** 512 MB minimum
- **Storage:** 200 MB
- **Display:** 1024x768 minimum resolution

### Download
Pre-built binaries are available in the `release/` directory:
- **Windows:** `InsAcc-Setup-1.0.0-x64.exe` (portable)
- **macOS:** `InsAcc-1.0.0.dmg` or `InsAcc-1.0.0-mac.zip`
- **Linux:** Build from source (see `BUILD_WINDOWS.md` for guidance)

### Build from Source
```bash
git clone <repository-url>
cd InsAcc
npm install
npm run dev          # Development mode
npm run build:mac    # Package for macOS
npm run build        # Package for Windows
npm run build:linux  # Package for Linux
```

---

## Validation Results

### TypeScript Check
```
npx tsc --noEmit
--- No errors ---
```

### Production Build
```
npm run build
vite v5.x.x building for production...
✓ built in 740ms
```

### End-to-End Tests (Playwright)
All 76 tests pass across 3 test suites:

| Suite | Tests | Status |
|-------|-------|--------|
| Purchase Ledger UI | 14 | ✓ Pass |
| Reports Visual QA | 14 | ✓ Pass |
| Transactions Final QA | 48 | ✓ Pass |
| **Total** | **76** | **✓ All Pass** |

The test suite validates:
- Login, profile selection, and module navigation
- Purchase CRUD, KPI accuracy, filtering, sorting, validation, and error handling
- Report rendering across 4 viewport sizes in light and dark modes
- Transaction CRUD, dashboard integration, filter combinations, sorting, validation, performance (up to 1000 records), and data persistence

---

## Known Issues

See `KNOWN_ISSUES.md` for a complete list. Notable items:

1. **No real authentication**: Password stored in plaintext in localStorage
2. **No backend/database**: All data is client-side only, single-machine
3. **Profiles are hardcoded**: Not persisted or user-customisable
4. **Language translations incomplete**: Only 33 keys translated across 3 languages
5. **Auto-logout not implemented**: Setting exists but no timeout logic
6. **Large file storage limitations**: Files stored as base64 in localStorage
7. **No data export/backup**: No full JSON export mechanism

---

## What's Next

The `docs/PRD.md` Future Roadmap section outlines planned improvements:
- Persistent theme setting
- Real pagination and search for tables
- Full data export/backup
- Proper password hashing
- Lease expiry and rent reminder alerts
- File storage via Electron userData directory
- Unit tests (Jest/Vitest)
- Multi-user sync via optional backend
- Dashboard customization
- Recurring transaction templates
- Bulk CSV/XLSX import
- Electron auto-updater
- Print-friendly report layouts

---

## Documentation

All documentation is in the `docs/` directory:

| Document | Description |
|----------|-------------|
| `PRD.md` | Product Requirements Document |
| `ARCHITECTURE.md` | Full application architecture |
| `ACCOUNTING_ARCHITECTURE.md` | Double-entry accounting engine design |
| `BANKING_ARCHITECTURE.md` | Banking module architecture |
| `CURRENT_DESIGN_SYSTEM.md` | Current design system v1.0 specification |
| `TARGET_DESIGN_SYSTEM.md` | Target design system v2.0 (aspirational) |
| `MIGRATION_PLAN.md` | Migration plan from v1.0 to v2.0 |
| `PURCHASE_LEDGER_ARCHITECTURE.md` | Purchase ledger data model and future design |
| `REPORTS_ARCHITECTURE.md` | Reports UI architecture |
| `ux-overview.md` | UX overview and design principles |
| `ux-review.md` | UX accessibility and consistency audit |

---

*© 2024 InsAcc. All rights reserved.*
