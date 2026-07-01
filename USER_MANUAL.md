# InsAcc User Manual — v1.0.0

**Intelligent Asset & Investment Accounting System**

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Authentication](#2-authentication)
3. [Profile & Module Selection](#3-profile--module-selection)
4. [Interface Overview](#4-interface-overview)
5. [Investment Portfolio Module](#5-investment-portfolio-module)
   - [Dashboard](#51-dashboard)
   - [Purchase Ledger](#52-purchase-ledger)
   - [Holdings](#53-holdings)
   - [Transactions](#54-transactions)
   - [Bank Accounts](#55-bank-accounts)
   - [Accounts (Double-Entry)](#56-accounts-double-entry)
   - [Reports](#57-reports)
   - [History](#58-history)
   - [Documents](#59-documents)
6. [Property Management Module](#6-property-management-module)
   - [Dashboard](#61-dashboard)
   - [Properties](#62-properties)
   - [Tenants](#63-tenants)
   - [Leases](#64-leases)
   - [Accounts (Property)](#65-accounts-property)
   - [Reports (Property)](#66-reports-property)
   - [Documents (Property)](#67-documents-property)
7. [Settings](#7-settings)
8. [Export & Reporting](#8-export--reporting)
9. [Keyboard Navigation & Accessibility](#9-keyboard-navigation--accessibility)
10. [Troubleshooting](#10-troubleshooting)
11. [Data & Storage](#11-data--storage)

---

## 1. Getting Started

### System Requirements
- **Operating System:** Windows 10+, macOS 12+, or Linux (x64)
- **RAM:** 512 MB minimum
- **Storage:** 200 MB free space
- **Display:** 1024×768 minimum (1440×900 recommended)

### Installation
1. Download the installer for your platform
2. **Windows**: Run `InsAcc-Setup-1.0.0-x64.exe` and follow the installer prompts
3. **macOS**: Open `InsAcc-1.0.0.dmg` and drag InsAcc to your Applications folder
4. **Linux**: Run the AppImage or install the .deb package

### First Launch
On first launch, the application automatically seeds demo data including:
- 3 bank accounts
- 13 investment purchases
- 6 properties with 15 units
- 11 tenants with leases
- 30+ accounting vouchers
- Sample income/expense transactions

No configuration is required.

---

## 2. Authentication

### Login Screen
The login screen offers two modes:

**Email/Password Mode (default):**
1. Enter any email address (e.g., `admin@insacc.com`)
2. Enter the password: `1234`
3. Click **Sign In**

**PIN Mode:**
1. Click the key icon toggle to switch to PIN mode
2. Enter the 4-digit PIN: `1234` (use the on-screen numpad or keyboard)
3. Click **Sign In**

> **Note**: The default password is `1234` for all users. Change it via Settings → Password.

---

## 3. Profile & Module Selection

### Select Profile
After login, choose a profile:
- **Sameer Ishaq Harmoudi** — Admin role (full access to all features including user management and data reset)
- **Accounts** — Accounts role (read/write access to data entry, no user management or security settings)

### Select Module
Choose a functional area:
- **Investment Portfolio** — Track investments, purchases, transactions, bank accounts, and reports
- **Property Management** — Manage properties, tenants, leases, rent collection, and PDC cheques

You can switch modules at any time using the **Switch Module** button at the bottom of the sidebar.

---

## 4. Interface Overview

### Sidebar (Left Navigation)
- **User info**: Name, role, and avatar gradient at the top
- **Navigation items**: Page links with SVG icons; active page is highlighted with a gold left border
- **Switch Module**: Button at the bottom to switch between Investment and Property
- **Sign Out**: Button to return to the login screen
- **Responsive**: At browser widths below 768px, the sidebar collapses to show icons only

### Page Header
Each page has a title, optional subtitle, and action buttons (e.g., "Add Purchase", "Add Entry").

### KPI Cards
Key Performance Indicator cards at the top of dashboard pages. They show summary metrics and update automatically when data changes.

### Data Tables
Tables support:
- **Sorting**: Click any column header to sort ascending/descending
- **Search**: Type in the search box to filter rows
- **Pagination**: Page through results (when applicable)
- **Actions**: Edit (gold) and Delete (red) buttons on each row

### Toasts
Brief notification messages appear at the top-right corner and auto-dismiss after 2 seconds.

---

## 5. Investment Portfolio Module

### 5.1 Dashboard

Navigating: **Dashboard** → **Investment Dashboard**

The dashboard provides a high-level overview of your portfolio:

**KPI Cards:**
- **Portfolio Value**: Total market value of all investments
- **Active Investments**: Number of currently held investments
- **This Month**: Income - Expenses for the current month
- **YTD Return**: Year-to-date return on investments

**Charts:**
- **Asset Allocation**: Pie chart showing distribution across asset types
- **Asset Performance**: Horizontal bar chart ranking assets by return
- **Investment Growth**: Area chart showing portfolio value over time
- **Cash Flow**: Bar chart showing income vs expenses by month

**Purchase Averages Table:**
Shows average metrics per asset type. Click the **View Report** button to drill into the Purchase Ledger.

### 5.2 Purchase Ledger

Navigating: **Purchase Ledger**

Track investment purchases with detailed records:

**KPI Cards:**
- **Total Invested**: Sum of all purchase values
- **Total Quantity**: Sum of all quantities
- **Weighted Average**: Average unit price weighted by quantity
- **Active Lots**: Number of active purchase records

**Adding a Purchase:**
1. Click **Add Purchase**
2. Enter: Asset Name, Purchase Date, Quantity, Unit Price (Total Value auto-calculates)
3. Optionally select an asset type and broker
4. Click **Record**

**Managing Purchases:**
- **Edit**: Click the gold edit button on any row
- **Delete**: Click the red delete button, confirm in the dialog
- **Filter**: Use the asset type dropdown to filter by type
- **Search**: Type in the search box to find by asset name
- **Sort**: Click any column header (Asset Name, Date, Quantity, etc.)

**Asset Types:**
- Predefined: Gold, Silver, Bonds, Mutual Funds, Stocks, Shares
- Custom: Type any asset name manually

### 5.3 Holdings

Navigating: **Holdings**

Groups purchases by asset type and name to show your current holdings:

- **Asset Name**: The held asset
- **Quantity**: Total units held
- **Cost Basis**: Total purchase cost
- **Market Value**: Current estimated value
- **Unrealised Gain/Loss**: Market value - Cost basis
- **Return %**: Percentage return
- **Portfolio %**: Percentage of total portfolio

### 5.4 Transactions

Navigating: **Transactions**

Record income, expense, and journal entries:

**Transaction Types:**
- **Income**: Revenue from dividends, interest, rental income, capital gains, salary, etc.
- **Expense**: Costs like maintenance, utilities, insurance, management fees, etc.
- **Journal**: Adjustments, transfers, opening balance, corrections

**Adding a Transaction:**
1. Click **Add Entry**
2. Select **Type** (Income/Expense/Journal) — this filters available categories
3. Select **Category**
4. Enter **Amount** (must be greater than zero)
5. Optionally set a **Date**
6. Click **Add**

**Filtering Transactions:**
- **Type tabs**: All / Payment Voucher / Receipt Voucher / Journal Voucher
- **Date filters**: All / This Year / This Month / Custom range
- **Search**: Type to search by ID, category, or amount

**KPI Cards Update:**
Income KPI and Expense KPI update dynamically based on the active filter.

### 5.5 Bank Accounts

Navigating: **Bank Accounts**

Manage multiple bank accounts:

**Account Cards:**
Each account shows: institution name, account name, account number, current balance, currency.

**Operations:**
- **Deposit**: Add funds to the account
- **Withdrawal**: Remove funds (enter description and amount)
- **Transfer**: Move funds between accounts

**Statement Table:**
- Lists all transactions with date, description, amount, and type (credit/debit)
- Running balance shown for each entry
- Search by description
- Filter by transaction type

**Export:**
Click **Export** to save the bank statement as a file via your system's save dialog.

### 5.6 Accounts (Double-Entry)

The Accounts section provides full double-entry accounting functionality.

#### Receipt Voucher
Navigating: **Accounts** → **Receipt Voucher**

Records money received:
1. Select **Bank Account** (debit side)
2. Select **Revenue Account** (credit side — Dividend Income, Interest Income, Capital Gain, Rental Income)
3. Enter **Amount** and optional **Description**
4. Click **Record**

#### Payment Voucher
Navigating: **Accounts** → **Payment Voucher**

Records money paid out:
1. Select **Bank Account** (credit side)
2. Select **Expense Account** (debit side — Maintenance, Utilities, Insurance, etc.) or **Asset Account** (for asset purchases)
3. Enter **Amount** and optional **Description**
4. Click **Record**

#### Journal Voucher
Navigating: **Accounts** → **Journal Voucher**

Records compound journal entries with multiple lines:
1. Add debit lines (select account and enter amount)
2. Add credit lines (select account and enter amount)
3. Ensure **total debits = total credits**
4. Enter an optional **Description**
5. Click **Record**

Each voucher goes through a lifecycle: **Draft → Approved → Posted**. The Voucher Timeline shows the current status.

#### Chart of Accounts
Navigating: **Accounts** → **Chart of Accounts**

Shows the complete account hierarchy:
- **Assets** (1000-1999): Current assets, fixed assets, investments
- **Liabilities** (2000-2999): Current liabilities, long-term liabilities
- **Equity** (3000-3999): Capital, retained earnings
- **Revenue** (4000-4999): Income accounts
- **Expenses** (5000-5999): Expense accounts

Click any account to expand its sub-accounts. Use the search bar to find accounts by name or code.

#### Trial Balance
Navigating: **Accounts** → **Trial Balance**

Lists all accounts with their debit and credit balances:
- Total debits should equal total credits
- Click any account to view its detailed ledger entries

#### Balance Sheet
Navigating: **Accounts** → **Balance Sheet**

Shows the financial position:
- **Assets**: What the business owns
- **Liabilities**: What the business owes
- **Equity**: Owner's stake (Assets - Liabilities)
- **Net Income**: Current period earnings

Click any section to expand and see individual accounts. Click an account to drill down.

#### Profit & Loss
Navigating: **Accounts** → **Profit & Loss**

Shows financial performance:
- **Revenue**: All income accounts
- **Expenses**: All expense accounts
- **Net Income**: Revenue - Expenses

Click any account for drill-down detail.

### 5.7 Reports

Navigating: **Reports**

Generate and export financial reports. The reports page has multiple tabs:

| Tab | Content |
|-----|---------|
| Overview | Summary KPIs and key metrics |
| Balance Sheet | Financial position (assets, liabilities, equity) |
| Profit & Loss | Revenue vs expenses |
| Trial Balance | All account balances |
| Holdings | Portfolio breakdown by asset |
| Cash Position | Cash and bank account summary |
| Investment Position | Investment account summary |
| Purchase Report | Purchase history |
| Bank Position | Bank account balances |
| Cash Flow | Cash inflows/outflows |
| General Journal | All journal entries |
| General Ledger | All ledger entries |

**Exporting:**
Each report tab has an **Export CSV** button. Click it to save the report data as a CSV file.

### 5.8 History

Navigating: **History**

Browse historical financial activity:

- **Year Selector**: Choose a year (2015 to current)
- **Summary Cards**: Total Investments, Investments Made, Profit Generated, Transactions count
- **Timeline**: Colour-coded entries showing investment purchases, income, and other events
- **Date Drill-Down**: Click on a specific date to see all activity for that day

### 5.9 Documents

Navigating: **Documents**

Upload and organise supporting documents:

**Uploading:**
- Drag and drop files onto the upload area, or click to browse
- Supported types: PDF, Excel, Image, Word

**Organisation:**
Documents are grouped by type in collapsible sections:
- **PDF** (red)
- **Excel** (green)
- **Image** (blue)
- **Word** (purple)
- **Other** (grey)
- **Contracts** (orange) — includes tenant contract files from Property module

**Managing Documents:**
- **Preview**: Click a document to see a preview on the right panel
- **Download**: Click the download button to save to your computer
- **Delete**: Click the red delete button to remove a document

---

## 6. Property Management Module

Switch to Property Management using the **Switch Module** button in the sidebar.

### 6.1 Dashboard

Navigating: **Dashboard**

Key metrics for your property portfolio:
- **Total Properties**: Number of managed properties
- **Units**: Total rental units
- **Tenants**: Active tenants
- **Occupancy Rate**: Percentage of occupied units
- **Monthly Rent**: Total expected monthly rent
- **Bank Balance**: Total cash in property bank accounts

Charts show property allocation and expense breakdown.

### 6.2 Properties

Navigating: **Properties**

**Categories:**
Manage property categories: Building, Villa, Apartment
- Add new categories
- Delete unused categories

**Buildings:**
Within each category, manage buildings:
- Add buildings with name and details
- Expand to see units

**Units:**
Per building, manage individual units:
- Unit name/number
- Monthly rent amount (editable inline)
- Status: Vacant (green) / Occupied (blue)

### 6.3 Tenants

Navigating: **Tenants**

Manage tenant information:
- **Add Tenant**: Name, phone, email, unit assignment, ID number
- **Search**: Find tenants by name
- **Edit/Delete**: Update or remove tenant records

### 6.4 Leases

Navigating: **Leases**

Full lease lifecycle management:

**Adding a Lease:**
1. Select **Tenant**, **Property**, **Unit**
2. Set **Start Date** and **End Date**
3. Enter **Monthly Rent** amount
4. Set **Security Deposit** amount
5. Configure **PDC Cheques**: number of post-dated cheques and their start month
6. Optionally upload a **Contract File** (PDF or image)
7. Set payment mode (Cash/Cheque/Transfer)

**Rent Payments:**
Within each lease, record monthly rent payments:
- **Date**, **Amount**, **Payment Mode**
- Status: Paid (green), Pending (yellow), Overdue (red)
- Edit or delete existing payments

**Security Cheques:**
Track security deposit cheques.

**PDC Cheques:**
Post-dated cheques automatically generated based on lease configuration. Each cheque can have these statuses:
- **Pending**: Awaiting deposit
- **Deposited**: Submitted to bank
- **Cleared**: Successfully processed
- **Bounced**: Returned by bank
- **Replaced**: Replaced with a new cheque
- **Cancelled**: Cancelled by agreement

### 6.5 Accounts (Property)

The same double-entry accounting functionality is available for the property module:

- **Accounts Dashboard**: Financial overview (cash, bank, PDC, receivables, income, expenses, net income)
- **Receipt Voucher**: Record rental income received
- **Payment Voucher**: Record property expenses (maintenance, repairs, utilities, etc.)
- **Journal Voucher**: Compound entries
- **Chart of Accounts**: Property-specific account hierarchy
- **Trial Balance**: All account balances
- **Balance Sheet**: Assets, liabilities, equity
- **Profit & Loss**: Revenue and expenses
- **PDC Manager**: Post-dated cheque tracking dashboard

#### PDC Manager
Navigating: **Accounts** → **PDC Manager**

Dashboard for all post-dated cheques:
- **KPI Cards**: Pending, Deposited, Cleared, Bounced counts
- **Cheque List**: All cheques grouped by lease
- **Status Updates**: Change cheque status (e.g., from Pending to Deposited)
- **Replace**: Replace a bounced or cancelled cheque with a new one

### 6.6 Reports (Property)

Navigating: **Reports**

Property-specific report views:

| Tab | Content |
|-----|---------|
| Overview | Summary KPIs |
| Balance Sheet | Financial position |
| Profit & Loss | Revenue vs expenses |
| Trial Balance | All account balances |
| Rent Collection | Rent payment summary by property/unit |
| PDC Summary | All post-dated cheques |
| Lease Expiry | Leases expiring within date range |

Each report has a **Export CSV** button.

### 6.7 Documents (Property)

Navigating: **Documents**

Read-only view of property documents. Upload and delete documents from within the module.

---

## 7. Settings

Navigating: **Settings**

### General Tab
- **Theme**: Toggle between Light and Dark mode
- **Currency**: Select display currency (AED, USD, EUR, GBP, SAR, etc.)
- **Date Format**: Choose DD/MM/YYYY, MM/DD/YYYY, or YYYY-MM-DD
- **Language**: Select English, Arabic, or French
- **Auto Logout**: Set timeout (feature is UI-only — not yet functional)

### Password Tab
1. Enter current password
2. Enter new password
3. Confirm new password
4. Click **Change Password**

### Users Tab
View user list with name, role, and status. Admin users can see all profiles.

### Logs Tab
Activity log showing:
- **User**: Who performed the action
- **Action**: What was done
- **Time**: When it happened

### Danger Zone (Admin Only)
**Reset All Data**: Click to clear all localStorage data and reset the application to its initial state. Requires double confirmation. **This action cannot be undone.**

---

## 8. Export & Reporting

### CSV Export
Available on all report views. Click the **Export CSV** button to download:
- The file is saved to your computer's Downloads folder
- Compatible with Microsoft Excel, Google Sheets, and any CSV reader

### Report Views Available for Export
- Investment: Overview, Balance Sheet, P&L, Trial Balance, Holdings, Cash Position, Investment Position, Purchase Report, Bank Position, Cash Flow, General Journal, General Ledger
- Property: Overview, Balance Sheet, P&L, Trial Balance, Rent Collection, PDC Summary, Lease Expiry

### Bank Statement Export
On the Bank Accounts page, click **Export** to save the account statement as a file.

---

## 9. Keyboard Navigation & Accessibility

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| Tab | Move between form fields |
| Enter | Submit form / Confirm dialog |
| Escape | Close modal / Cancel |
| Space | Toggle / Activate button |

### Accessibility Features
- `aria-label` on icon-only buttons for screen readers
- `aria-current="page"` on active navigation items
- `aria-selected` on tab components
- `aria-modal="true"` on dialogs
- `:focus-visible` outlines on all interactive elements
- Full keyboard navigation through all forms and tables

---

## 10. Troubleshooting

### Application Won't Start
1. Ensure your system meets minimum requirements
2. Try reinstalling the application
3. Check if your antivirus is blocking the executable

### Data Appears Incorrect
1. Use **Settings → Logs** to check recent activity
2. Use the **History** page to review past changes
3. If data is corrupted, use **Reset All Data** (Settings → Danger Zone) and restart

### A Feature Seems Broken
1. Check the column headers for sort/filter indicators
2. Ensure you are in the correct module (Investment vs Property)
3. Forms require all mandatory fields — check for validation errors

### Cannot Find Expected Data
1. Seed data is loaded only on first launch. If you cleared data, it will re-seed on next launch.
2. Check if you have the correct year selected in the History view
3. Ensure filters are cleared (set to "All" / show all types)

### Contact
This is a standalone application. For support, refer to your internal IT team or the project documentation.

---

## 11. Data & Storage

### How Data Is Stored
All data is stored locally in your browser's `localStorage` under keys prefixed with `insacc_`:
- `insacc_investments` — Investment records
- `insacc_transactions` — Transaction records
- `insacc_bank_accounts` — Bank account records
- `insacc_bank_transactions` — Bank transaction records
- `insacc_purchases` — Purchase records
- `insacc_documents` — Uploaded documents
- `insacc_prop_*` — Property module data
- `insacc_vouchers` — Accounting vouchers
- `insacc_accounts` — Chart of accounts
- `insacc_clear_version` — Schema version (used for data migration)

### Data Limitations
- **Storage capacity**: ~5-10MB maximum (browser localStorage limit)
- **No cloud sync**: Data stays on this machine only
- **No backup**: Export critical reports to CSV for record-keeping

### Resetting Data
**Admin users only**: Go to Settings → (scroll to bottom) → **Reset All Data**
- Double confirmation required
- All data will be permanently deleted
- Application will restart with fresh seed data

---

*End of User Manual*
