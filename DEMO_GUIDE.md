# InsAcc Demo Guide — v1.0.0

**Duration:** 5–10 minutes
**Audience:** Client stakeholders
**Goal:** Showcase all key workflows end-to-end

---

## Before You Begin

1. Open the application
2. If data has been reset, **login and navigate once** to trigger seed data generation (first launch auto-seeds)
3. Ensure your screen is 1440×900 or larger for best viewing
4. The app should be in light mode for projector visibility

---

## Workflow 1: Investment Portfolio (2 min)

### 1.1 Login & Navigation
1. Enter any email and password `1234`
2. Select **Sameer Ishaq Harmoudi** (Admin profile)
3. Select **Investment Portfolio** module
4. Point out the **Sidebar**: 10 navigation items with icons, user avatar, and module switch

### 1.2 Dashboard Overview
1. Navigate to **Dashboard** → **Investment Dashboard**
2. Show the **4 KPI cards**: Portfolio Value, Active Investments, This Month, YTD Return
3. Click through tabs: **Overview**, **Monthly Performance**
4. Point out charts: Asset Allocation (Pie), Performance (Bar), Growth (Area), Cash Flow (Bar)
5. Show the **Purchase Averages** table at the bottom

### 1.3 Purchase Ledger
1. Navigate to **Purchase Ledger**
2. Show seeded purchase records in the table
3. Point out the **4 KPI cards**: Total Invested, Total Quantity, Weighted Average, Active Lots
4. Click **Add Purchase**, fill in: Asset Name = "Platinum Bar 500g", Quantity = 5, Unit Price = 45000
5. Click **Record** — observe success toast and new row in table
6. Use the **asset type filter** dropdown to filter by "Gold"
7. Click a **column header** to sort (e.g., "Total Value")
8. Click the **Edit** button, change quantity, and save
9. Click the **Delete** button, confirm deletion

### 1.4 Investment Holdings
1. Navigate to **Holdings**
2. Show grouped view by asset type/name
3. Point out Quantity, Cost Basis, Market Value, Unrealised Gain/Loss columns
4. Show portfolio percentage breakdown

---

## Workflow 2: Double-Entry Accounting (2 min)

### 2.1 Receipt Voucher
1. Navigate to **Accounts** → **Receipt Voucher**
2. Point out the voucher form: Debit Bank, Credit Revenue account
3. Explain: this is a **double-entry system** — every transaction debits one account and credits another
4. Select a bank account, enter amount 50000, select "Dividend Income"
5. Click **Record** — observe success
6. Show the **Voucher Timeline**: Draft → Approved → Posted

### 2.2 Payment Voucher
1. Navigate to **Payment Voucher**
2. Select a bank account (credit), select an expense account (debit)
3. Enter amount 15000, description "Office Maintenance"
4. Click **Record**
5. Show the voucher appearing in the **voucher list** below the form

### 2.3 Journal Voucher
1. Navigate to **Journal Voucher**
2. Add two lines: Debit "Computer Equipment" 10000, Credit "Cash at Bank" 10000
3. Show that **debits equal credits** (balanced entry)
4. Click **Record**

### 2.4 Chart of Accounts
1. Navigate to **Chart of Accounts**
2. Show the hierarchical tree: Assets → Current Assets → Cash at Bank → individual bank accounts
3. Expand/collapse nodes
4. Search for an account by name

### 2.5 Trial Balance
1. Navigate to **Trial Balance**
2. Show all accounts with debit/credit totals
3. Point out that **total debits = total credits** (accounting equation balanced)
4. Click an account to drill down into its detailed ledger

### 2.6 Balance Sheet
1. Navigate to **Balance Sheet**
2. Show Assets, Liabilities, and Equity sections
3. Point out that **Assets = Liabilities + Equity**
4. Click any account for drill-down

### 2.7 Profit & Loss
1. Navigate to **Profit & Loss**
2. Show Revenue vs Expenses
3. Point out **Net Income / Net Loss** at the bottom
4. Click any account for drill-down

---

## Workflow 3: Property Management (2 min)

### 3.1 Switch Module
1. Click **Switch Module** in the sidebar
2. Select **Property Management**
3. Note the sidebar changes to property-specific items

### 3.2 Property Dashboard
1. Navigate to **Dashboard**
2. Show KPIs: Total Properties, Units, Tenants, Occupancy Rate, Monthly Rent, Bank Balance
3. Point out the allocation and expense charts

### 3.3 Properties & Units
1. Navigate to **Properties**
2. Show categories: Building, Villa, Apartment
3. Expand a category to show buildings
4. Click a building to show units with rent amounts and vacant/occupied status
5. Edit a unit's rent inline

### 3.4 Tenants & Leases
1. Navigate to **Tenants**
2. Show tenant list with search
3. Navigate to **Leases**
4. Show lease details: tenant, property, unit, rent, PDC cheques
5. Point out security deposit and PDC cheque tracking

### 3.5 PDC Manager
1. Navigate to **Accounts** → **PDC Manager**
2. Show cheque list with statuses (Pending, Deposited, Cleared, Bounced)
3. Point out KPI cards: Pending, Deposited, Cleared, Bounced
4. Change a cheque status from "Pending" to "Deposited"

### 3.6 Rent Collection
1. Navigate to a lease record
2. Show rent payment history
3. Point out paid/pending/overdue status badges

---

## Workflow 4: Reports & Exports (1 min)

### 4.1 Investment Reports
1. Switch back to **Investment Portfolio** module
2. Navigate to **Reports**
3. Click through each tab:
   - **Overview**: Summary KPIs
   - **Balance Sheet**: Financial position
   - **Profit & Loss**: Revenue vs expenses
   - **Trial Balance**: All accounts
   - **Holdings**: Portfolio breakdown
   - **Cash Position**: Cash accounts summary
   - **Investment Position**: Investment accounts
   - **Purchase Report**: Purchase history
   - **Bank Position**: Bank balances
   - **Cash Flow**: Cash inflows/outflows
   - **General Journal**: All journal entries
   - **General Ledger**: All ledger entries

### 4.2 Export
1. On any report tab, find the **Export CSV** button
2. Click it — file is saved to your Downloads folder
3. Open the exported CSV in Excel/Spreadsheet to verify

### 4.3 Property Reports
1. Switch to **Property Management** module
2. Navigate to **Reports**
3. Show tabs: Overview, Balance Sheet, P&L, Trial Balance, Rent Collection, PDC Summary, Lease Expiry
4. Export any report as CSV

---

## Workflow 5: Transactions & Banking (1 min)

### 5.1 Transactions
1. Navigate to **Transactions** (in Investment module)
2. Click **Add Entry**
3. Select "Income", category "Dividend", amount "25000", date today
4. Click **Add** — observe row appearing in table
5. Show the **filter tabs**: All / Payment Voucher / Receipt Voucher / Journal Voucher
6. Search for "Dividend" in the search bar
7. Use the **date filter** to show "This Year"
8. Click an **Edit** button, change the amount
9. Click a **Delete** button, confirm deletion

### 5.2 Bank Accounts
1. Navigate to **Bank Accounts**
2. Show the account cards with balances
3. Click **Deposit** on an account, enter 50000, description "Investment returns"
4. Show the new statement entry with running balance
5. Click **Export** to save the statement

---

## Workflow 6: History (30 sec)

1. Navigate to **History**
2. Show the year selector dropdown
3. Point out summary cards: Total Investments, Investments Made, Profit Generated, Transactions
4. Scroll through the timeline — entries are colour-coded by type
5. Click a date to drill into details

---

## Workflow 7: Settings & Admin (30 sec)

1. Navigate to **Settings**
2. **General tab**: Toggle dark mode, change currency to USD, change date format
3. **Password tab**: Demonstrate change password flow
4. **Users tab**: Show user list with Admin/Accounts roles
5. **Logs tab**: Show activity log with action/user/time entries
6. **Danger Zone**: Show "Reset All Data" button (Admin only, double confirmation)

---

## Summary Script for Closing

"InsAcc provides a complete, offline-first financial management platform with:

- **Full double-entry accounting** with chart of accounts, vouchers, trial balance, balance sheet, and P&L
- **Investment portfolio tracking** with purchases, holdings, and performance analytics
- **Property management** with tenants, leases, PDC cheques, and rent collection
- **Comprehensive reporting** with CSV export for all views
- **Premium user experience** with dark mode, responsive layout, and role-based access

All data is stored locally on this machine — no internet connection required, no servers to maintain, and instant responsiveness."

---

## Quick Reference

| Workflow | Navigation Path | Key Feature |
|----------|----------------|-------------|
| Dashboard | Dashboard → Investment Dashboard | 4 KPIs + 4 charts |
| Purchase Ledger | Purchase Ledger | Full CRUD with KPIs |
| Holdings | Holdings | Grouped by asset |
| Transactions | Transactions | Income/Expense/Journal |
| Bank Accounts | Bank Accounts | Deposit/Withdraw/Transfer |
| Receipt Voucher | Accounts → Receipt Voucher | Debit bank, credit revenue |
| Payment Voucher | Accounts → Payment Voucher | Credit bank, debit expense |
| Journal Voucher | Accounts → Journal Voucher | Multi-line balanced entry |
| Trial Balance | Accounts → Trial Balance | All accounts balanced |
| Balance Sheet | Accounts → Balance Sheet | Assets = Liabilities + Equity |
| P&L | Accounts → Profit & Loss | Revenue - Expenses |
| Reports | Reports | 12 views + CSV export |
| History | History | Timeline + summary cards |
| Settings | Settings | Theme, currency, users, logs |
| Property | Switch Module → Property | Dashboard, Properties, Tenants, Leases |
| Property Reports | Property → Reports | 7 views + CSV export |
| PDC Manager | Property → Accounts → PDC Manager | Cheque lifecycle |
