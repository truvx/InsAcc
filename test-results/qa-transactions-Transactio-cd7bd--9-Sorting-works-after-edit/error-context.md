# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa-transactions.spec.ts >> Transactions Final QA >> Sorting >> 4.9 Sorting works after edit
- Location: qa-transactions.spec.ts:431:9

# Error details

```
TimeoutError: locator.click: Timeout 20000ms exceeded.
Call log:
  - waiting for locator('button[aria-label="Edit"]').first()

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]: IA
      - generic [ref=e7]: InsAcc
    - generic [ref=e8]:
      - generic [ref=e9]: S
      - generic [ref=e10]:
        - generic [ref=e11]: Sameer Ishaq Harmoudi
        - generic [ref=e12]: Admin
    - generic [ref=e13]:
      - generic [ref=e14]: Investment
      - button "Dashboard" [ref=e15] [cursor=pointer]:
        - img [ref=e16]
        - generic [ref=e21]: Dashboard
      - button "Holdings" [ref=e22] [cursor=pointer]:
        - img [ref=e23]
        - generic [ref=e26]: Holdings
      - button "Investments" [ref=e27] [cursor=pointer]:
        - img [ref=e28]
        - generic [ref=e30]: Investments
      - button "Transactions" [active] [ref=e31] [cursor=pointer]:
        - img [ref=e32]
        - generic [ref=e34]: Transactions
      - button "Bank Accounts" [ref=e35] [cursor=pointer]:
        - img [ref=e36]
        - generic [ref=e39]: Bank Accounts
      - button "Reports" [ref=e40] [cursor=pointer]:
        - img [ref=e41]
        - generic [ref=e42]: Reports
      - button "Documents" [ref=e43] [cursor=pointer]:
        - img [ref=e44]
        - generic [ref=e47]: Documents
      - button "History" [ref=e48] [cursor=pointer]:
        - img [ref=e49]
        - generic [ref=e52]: History
      - button "Purchase Ledger" [ref=e53] [cursor=pointer]:
        - img [ref=e54]
        - generic [ref=e56]: Purchase Ledger
      - button "Settings" [ref=e57] [cursor=pointer]:
        - img [ref=e58]
        - generic [ref=e61]: Settings
      - generic [ref=e62]: Accounts
      - button "Accounts" [ref=e63] [cursor=pointer]:
        - img [ref=e64]
        - generic [ref=e66]: Accounts
    - generic [ref=e67]:
      - button "Switch to Property" [ref=e68] [cursor=pointer]:
        - img [ref=e69]
        - text: Switch to Property
      - button "Sign Out" [ref=e74] [cursor=pointer]:
        - img [ref=e75]
        - text: Sign Out
  - generic [ref=e78]:
    - button "Change Profile" [ref=e80] [cursor=pointer]:
      - img [ref=e81]
      - text: Change Profile
    - generic [ref=e86]:
      - generic [ref=e89]:
        - generic [ref=e90]: Accounting
        - generic [ref=e91]: Payment Voucher, Receipt Voucher & Journal Voucher tracking
      - generic [ref=e92]:
        - generic [ref=e93]:
          - generic [ref=e94]:
            - generic [ref=e95]: Total Receipts
            - generic [ref=e96]: AED 0
          - generic [ref=e97]:
            - generic [ref=e98]: Total Payments
            - generic [ref=e99]: AED 0
          - generic [ref=e100]:
            - generic [ref=e101]: Net Cash Flow
            - generic [ref=e102]: AED 0
        - generic [ref=e103]:
          - generic [ref=e105]:
            - button "All" [ref=e106] [cursor=pointer]
            - button "Today" [ref=e107] [cursor=pointer]
            - button "This Week" [ref=e108] [cursor=pointer]
            - button "This Month" [ref=e109] [cursor=pointer]
            - button "This Year" [ref=e110] [cursor=pointer]
            - button "Custom" [ref=e111] [cursor=pointer]
          - generic [ref=e112]:
            - img [ref=e113]
            - textbox "Search by category, ID, or type..." [ref=e116]
        - generic [ref=e117]:
          - generic [ref=e119]:
            - button "All" [ref=e120] [cursor=pointer]
            - button "Payment Voucher" [ref=e121] [cursor=pointer]
            - button "Receipt Voucher" [ref=e122] [cursor=pointer]
            - button "Journal Voucher" [ref=e123] [cursor=pointer]
          - button "Add Entry" [ref=e124] [cursor=pointer]:
            - img [ref=e125]
            - text: Add Entry
        - table [ref=e128]:
          - rowgroup [ref=e129]:
            - row "ID Date Type Category Amount Status Actions" [ref=e130]:
              - columnheader "ID" [ref=e131] [cursor=pointer]
              - columnheader "Date" [ref=e132] [cursor=pointer]
              - columnheader "Type" [ref=e133] [cursor=pointer]
              - columnheader "Category" [ref=e134] [cursor=pointer]
              - columnheader "Amount" [ref=e135] [cursor=pointer]:
                - text: Amount
                - img [ref=e137]
              - columnheader "Status" [ref=e139] [cursor=pointer]
              - columnheader "Actions" [ref=e140]
          - rowgroup [ref=e141]:
            - row "No accounting entries found Try adjusting your search or filters" [ref=e142]:
              - cell "No accounting entries found Try adjusting your search or filters" [ref=e143]:
                - generic [ref=e144]:
                  - img [ref=e146]
                  - generic [ref=e149]: No accounting entries found
                  - generic [ref=e150]: Try adjusting your search or filters
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | const BASE = 'http://localhost:5174'
  4   | 
  5   | let page: any
  6   | 
  7   | test.describe('Transactions Final QA', () => {
  8   |   test.beforeAll(async ({ browser }) => {
  9   |     page = await browser.newPage()
  10  |     await page.addInitScript(() => {
  11  |       localStorage.setItem('insacc_clear_version', '9')
  12  |     })
  13  |     await page.goto(BASE, { waitUntil: 'networkidle' })
  14  |     await page.waitForTimeout(2000)
  15  |     await page.evaluate(() => localStorage.removeItem('insacc_transactions'))
  16  |     await page.reload()
  17  |     await page.waitForSelector('input[type="email"]', { timeout: 15000 })
  18  |     await page.fill('input[type="email"]', 'test@test.com')
  19  |     await page.fill('input[type="password"]', '1234')
  20  |     await page.click('button:has-text("Sign In")')
  21  |     await page.waitForSelector('text=Sameer Ishaq Harmoudi', { timeout: 10000 })
  22  |     await page.click('text=Sameer Ishaq Harmoudi')
  23  |     await page.waitForSelector('text=Investment', { timeout: 10000 })
  24  |     await page.click('text=Investment')
  25  |     await page.waitForSelector('text=Investment Dashboard', { timeout: 10000 })
  26  |   })
  27  | 
  28  |   test.afterAll(async () => {
  29  |     await page.close()
  30  |   })
  31  | 
  32  |   async function navigateTo(page: any, label: string, waitFor: string) {
  33  |     await page.click(`text=${label}`)
  34  |     await page.waitForSelector(`text=${waitFor}`, { timeout: 10000 })
  35  |     await page.waitForTimeout(200)
  36  |   }
  37  | 
  38  |   async function addTransaction(
  39  |     page: any, type: string, category: string, amount: string,
  40  |     date?: string
  41  |   ) {
  42  |     await page.click('button:has-text("Add Entry")')
  43  |     await page.waitForSelector('text=New Entry', { timeout: 5000 })
  44  | 
  45  |     const typeSelect = page.locator('label:has-text("Type")').locator('..').locator('select')
  46  |     await typeSelect.selectOption(type)
  47  |     await page.waitForTimeout(100)
  48  | 
  49  |     const catSelect = page.locator('label:has-text("Category")').locator('..').locator('select')
  50  |     await catSelect.selectOption(category)
  51  | 
  52  |     if (date) {
  53  |       await page.locator('label:has-text("Date")').locator('..').locator('input[type="date"]').fill(date)
  54  |     }
  55  | 
  56  |     await page.locator('label:has-text("Amount")').locator('..').locator('input[type="number"]').fill(amount)
  57  | 
  58  |     await page.click('button:has-text("Add")')
  59  |     await page.waitForTimeout(300)
  60  |   }
  61  | 
  62  |   async function editTransaction(page: any, rowIndex: number, newCategory: string, newAmount: string) {
> 63  |     await page.locator('button[aria-label="Edit"]').nth(rowIndex).click()
      |                                                                   ^ TimeoutError: locator.click: Timeout 20000ms exceeded.
  64  |     await page.waitForSelector('text=Edit Entry', { timeout: 5000 })
  65  | 
  66  |     await page.locator('label:has-text("Category")').locator('..').locator('select').selectOption(newCategory)
  67  |     await page.locator('label:has-text("Amount")').locator('..').locator('input[type="number"]').fill(newAmount)
  68  | 
  69  |     await page.click('button:has-text("Update")')
  70  |     await page.waitForTimeout(300)
  71  |   }
  72  | 
  73  |   async function deleteTransaction(page: any, rowIndex: number) {
  74  |     await page.locator('button[aria-label="Delete"]').nth(rowIndex).click()
  75  |     await page.waitForSelector('text=Delete Entry', { timeout: 5000 })
  76  |     await page.click('button:has-text("Delete")')
  77  |     await page.waitForTimeout(300)
  78  |   }
  79  | 
  80  |   async function resetFilters(page: any) {
  81  |     const allDateBtn = page.locator('.data-table-toolbar').first().locator('button:has-text("All")')
  82  |     const allTypeBtn = page.locator('.data-table-toolbar').nth(1).locator('button:has-text("All")')
  83  |     const clearBtn = page.locator('.data-table-search-clear')
  84  |     if (await allDateBtn.isVisible()) await allDateBtn.click()
  85  |     if (await allTypeBtn.isVisible()) await allTypeBtn.click()
  86  |     if (await clearBtn.isVisible()) await clearBtn.click()
  87  |     await page.waitForTimeout(200)
  88  |   }
  89  | 
  90  |   // ============================================================
  91  |   // SUITE 1: CRUD Operations
  92  |   // ============================================================
  93  | 
  94  |   test.describe.serial('CRUD Operations', () => {
  95  |     test('1.1 Add Income transaction', async () => {
  96  |       await navigateTo(page, 'Transactions', 'Payment Voucher')
  97  |       await addTransaction(page, 'Income', 'Dividend', '50000', '2026-06-01')
  98  |       await expect(page.locator('text=Entry recorded')).toBeVisible()
  99  |       await expect(page.locator('text=TXN-001')).toBeVisible()
  100 |       await expect(page.locator('text=Dividend')).toBeVisible()
  101 |       await expect(page.locator('text=+AED 50,000')).toBeVisible()
  102 |       // KPI check
  103 |       const incomeKpi = await page.locator('.kpi-card').first().textContent()
  104 |       expect(incomeKpi).toContain('50,000')
  105 |     })
  106 | 
  107 |     test('1.2 Add Expense transaction', async () => {
  108 |       await addTransaction(page, 'Expense', 'Maintenance', '15000', '2026-06-15')
  109 |       await expect(page.locator('text=Entry recorded')).toBeVisible()
  110 |       await expect(page.locator('text=TXN-002')).toBeVisible()
  111 |       await expect(page.locator('text=Maintenance')).toBeVisible()
  112 |     })
  113 | 
  114 |     test('1.3 Add Journal transaction', async () => {
  115 |       await addTransaction(page, 'Journal', 'Adjustment', '10000', '2026-06-10')
  116 |       await expect(page.locator('text=Entry recorded')).toBeVisible()
  117 |       await expect(page.locator('text=TXN-003')).toBeVisible()
  118 |       // Journal should not affect income/expense KPIs
  119 |       const kpis = await page.locator('.kpi-card').allTextContents()
  120 |       // Income = 50000, Expense = 15000 (Journal doesn't affect)
  121 |       expect(kpis[0]).toContain('50,000')
  122 |       expect(kpis[1]).toContain('15,000')
  123 |     })
  124 | 
  125 |     test('1.4 Edit Journal transaction (first row) to Income', async () => {
  126 |       // First row is TXN-003 (Journal)
  127 |       await page.locator('button[aria-label="Edit"]').first().click()
  128 |       await page.waitForSelector('text=Edit Entry')
  129 |       // Change type to Income
  130 |       await page.locator('label:has-text("Type")').locator('..').locator('select').selectOption('Income')
  131 |       await page.waitForTimeout(200)
  132 |       // Now the category options have changed; select 'Dividend'
  133 |       await page.locator('label:has-text("Category")').locator('..').locator('select').selectOption('Dividend')
  134 |       await page.locator('label:has-text("Amount")').locator('..').locator('input[type="number"]').fill('75000')
  135 |       await page.click('button:has-text("Update")')
  136 |       await expect(page.locator('text=Entry updated')).toBeVisible()
  137 |       await expect(page.locator('text=Dividend').first()).toBeVisible()
  138 |       // KPI: Income now = 50000 (TXN-001) + 75000 (edited TXN-003) = 125000
  139 |       const kpiText = await page.locator('.kpi-card').first().textContent()
  140 |       expect(kpiText).toContain('125,000')
  141 |     })
  142 | 
  143 |     test('1.5 Edit second row (Expense)', async () => {
  144 |       // Second row is TXN-002 (Expense, Maintenance)
  145 |       await page.locator('button[aria-label="Edit"]').nth(1).click()
  146 |       await page.waitForSelector('text=Edit Entry')
  147 |       await page.locator('label:has-text("Category")').locator('..').locator('select').selectOption('Utilities')
  148 |       await page.locator('label:has-text("Amount")').locator('..').locator('input[type="number"]').fill('20000')
  149 |       await page.click('button:has-text("Update")')
  150 |       await expect(page.locator('text=Entry updated')).toBeVisible()
  151 |       await expect(page.locator('text=Utilities')).toBeVisible()
  152 |     })
  153 | 
  154 |     test('1.7 Delete first transaction', async () => {
  155 |       // Current state: [TXN-003 (Income, Dividend, 75K), TXN-002 (Expense, Utilities, 20K), TXN-001 (Income, Dividend, 50K)]
  156 |       // Delete first row = TXN-003 (Income, 75K)
  157 |       await deleteTransaction(page, 0)
  158 |       await expect(page.locator('text=Entry deleted')).toBeVisible()
  159 |       // Remaining Income = TXN-001 (50K)
  160 |       const kpiText = await page.locator('.kpi-card').first().textContent()
  161 |       expect(kpiText).toContain('50,000')
  162 |     })
  163 | 
```