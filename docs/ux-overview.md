# InsAcc UX Overview

## Application Purpose

InsAcc (Intelligent Asset & Investment Accounting) is a desktop financial management application for tracking investment portfolios and property assets. It serves professional services firms, asset managers, and financial operations teams.

## Target User Types

| User Type | Primary Needs | Frequency |
|-----------|---------------|-----------|
| Portfolio Manager | Asset allocation, performance tracking, transaction history | Daily |
| Operations Staff | Data entry, purchase ledger, bank reconciliation | Daily |
| Compliance / Audit | Activity history, reports, document trails | Weekly / Monthly |
| Account Manager | Client reporting, property income tracking, invoices | Weekly |
| Executive | Dashboard overview, summary KPIs, high-level trends | Daily / As-needed |

## Navigation Structure

```
Login
  └── Profile Selection
       └── Module Selection
            ├── Investment Portfolio
            │    ├── Dashboard (default)
            │    ├── Investments
            │    ├── Transactions
            │    ├── Bank Accounts
            │    ├── Reports
            │    ├── Documents
            │    ├── History
            │    ├── Purchase Ledger
            │    └── Settings
            └── Property Management
                 ├── Dashboard (default)
                 ├── Properties
                 ├── Tenants
                 ├── Rent Income
                 ├── Documents
                 └── Settings
```

## Page Hierarchy

1. **Primary screens** (daily use): Dashboard, Investments, Transactions, Property Dashboard, Tenants
2. **Secondary screens** (weekly use): Bank Accounts, Reports, Purchase Ledger, Rent Income
3. **Tertiary screens** (periodic use): Documents, History, Settings

## Design Principles

### Clarity Over Creativity
Financial professionals need to absorb information quickly. Every layout decision should prioritize scannability and comprehension. Decorative elements that do not convey information are eliminated.

### Data Density With Readability
Tables and lists should show substantial data per viewport while maintaining clear visual separation. Row height, font size, and color contrast are calibrated for extended daily use.

### Predictable Navigation
The sidebar provides constant orientation. Active sections are visually distinguished. Page transitions are instant. The user should never wonder "where am I?"

### Consistent Information Architecture
Related concepts share visual treatment. All list views use the same pattern. All form layouts follow the same grid. All detail panels share structure. This reduces cognitive load when moving between sections.

### Trust-Building Visuals
Clean alignment, precise spacing, restrained color, and professional typography communicate reliability. The interface looks like it was built by a team that cares about details — because financial data demands it.

## Main Workflows

### Portfolio Review
Dashboard → Review KPIs → View asset allocation → Drill into specific investments → Review performance

### Transaction Recording
Transactions page → Select type (Income/Expense/Journal) → Fill form → Submit → View updated list

### Property Management
Property dashboard → Review occupancy → Manage tenants → Record rent payments → Generate reports

### Reporting & Export
Reports page → Select report type → Configure parameters → Preview → Export to PDF/CSV/Excel

### Purchase Tracking
Purchase Ledger → Select category → Add purchase item → View running averages → Export ledgers

## Color System

- **Primary**: Indigo (#6366F1) — conveys trust, professionalism, financial stability
- **Success**: Green (#22C55E) — positive indicators, confirmations
- **Warning**: Amber (#F59E0B) — attention-required states
- **Danger**: Red (#EF4444) — errors, deletions, critical alerts
- **Neutral scale**: Zinc grays (#0C0C0D–#F4F4F5) — clean, unobtrusive backgrounds and borders

## Typography

- **Font**: Inter (bundled, no external dependencies)
- **Scale**: 12 / 13 / 14 / 15 / 16 / 18 / 20 / 24 / 30px
- **Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- **Usage**: UI text at 13-14px, headings at 16-20px, page titles at 24px

## Layout

- **Sidebar**: Fixed left, dark background, 240px wide (56px collapsed)
- **Content**: Fluid right area with dark background (#111113)
- **Page header**: Sticky top bar with title, actions, and breadcrumb context
- **Cards**: White surfaces with subtle border, used for KPIs and grouped content
- **Tables**: Full-width with sticky headers, horizontal scroll on overflow
