# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa-purchase-ledger.spec.ts >> Purchase Ledger UI >> 1.1 Purchase records loaded from seeded data
- Location: qa-purchase-ledger.spec.ts:38:7

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
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
      - button "Transactions" [ref=e31] [cursor=pointer]:
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
      - button "Purchase Ledger" [active] [ref=e53] [cursor=pointer]:
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
    - generic [ref=e87]:
      - generic [ref=e88]:
        - generic [ref=e89]:
          - generic [ref=e90]: Purchase Ledger
          - generic [ref=e91]: Record purchases and track average costs
        - button "Add Purchase" [ref=e93] [cursor=pointer]:
          - img [ref=e94]
          - text: Add Purchase
      - generic [ref=e97]:
        - img [ref=e99]
        - generic [ref=e102]: No purchases yet
        - generic [ref=e103]: Record your first purchase to start tracking your investment portfolio.
        - button "Add Purchase" [ref=e105] [cursor=pointer]:
          - img [ref=e106]
          - text: Add Purchase
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | const BASE = 'http://localhost:5174'
  4   | const MODAL_INPUT = (label: string) => `.modal .form-group:has(.form-label:text("${label}")) input`
  5   | const MODAL_SELECT = `.modal .form-group:has(.form-label:text("Asset Type")) select`
  6   | const MODAL_BTN = (text: string) => `.modal .modal-footer button:has-text("${text}")`
  7   | 
  8   | test.describe('Purchase Ledger UI', () => {
  9   |   let page: any
  10  | 
  11  |   test.beforeAll(async ({ browser }) => {
  12  |     page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  13  |     await page.addInitScript(() => {
  14  |       localStorage.setItem('insacc_clear_version', '9')
  15  |     })
  16  |     await page.goto(BASE, { waitUntil: 'networkidle' })
  17  |     await page.waitForTimeout(1500)
  18  | 
  19  |     await page.waitForSelector('input[type="email"]', { timeout: 15000 })
  20  |     await page.fill('input[type="email"]', 'test@test.com')
  21  |     await page.fill('input[type="password"]', '1234')
  22  |     await page.click('button:has-text("Sign In")')
  23  |     await page.waitForSelector('text=Sameer Ishaq Harmoudi', { timeout: 10000 })
  24  |     await page.click('text=Sameer Ishaq Harmoudi')
  25  |     await page.waitForSelector('text=Investment', { timeout: 10000 })
  26  |     await page.click('text=Investment')
  27  |     await page.waitForSelector('text=Investment Dashboard', { timeout: 15000 })
  28  |     await page.waitForTimeout(500)
  29  |     await page.locator('.sidebar .nav-item').filter({ hasText: 'Purchase Ledger' }).click()
  30  |     await page.waitForTimeout(1000)
  31  |   })
  32  | 
  33  |   test('1.0 Page renders with header', async () => {
  34  |     await expect(page.locator('.page-title')).toContainText('Purchase Ledger')
  35  |     await expect(page.locator('button:has-text("Add Purchase")').first()).toBeVisible()
  36  |   })
  37  | 
  38  |   test('1.1 Purchase records loaded from seeded data', async () => {
  39  |     const rows = await page.locator('table tbody tr').count()
> 40  |     expect(rows).toBeGreaterThan(0)
      |                  ^ Error: expect(received).toBeGreaterThan(expected)
  41  |     await expect(page.locator('table')).toBeVisible()
  42  |   })
  43  | 
  44  |   test('2.0 Open and close Add Purchase form', async () => {
  45  |     await page.locator('button:has-text("Add Purchase")').first().click()
  46  |     await page.waitForTimeout(300)
  47  |     await expect(page.locator('.modal')).toBeVisible()
  48  |     await expect(page.locator('.modal-header')).toContainText('New Purchase')
  49  |     await page.locator(MODAL_BTN('Cancel')).click()
  50  |     await page.waitForTimeout(300)
  51  |     await expect(page.locator('.modal')).not.toBeVisible()
  52  |   })
  53  | 
  54  |   test('3.0 Add a Gold purchase', async () => {
  55  |     await page.locator('button:has-text("Add Purchase")').first().click()
  56  |     await page.waitForTimeout(200)
  57  | 
  58  |     await page.locator(MODAL_INPUT('Asset Name')).fill('24K Gold Bar 1kg')
  59  |     await page.locator(MODAL_INPUT('Purchase Date')).fill('2026-06-15')
  60  |     await page.locator(MODAL_INPUT('Quantity')).fill('1')
  61  |     await page.locator(MODAL_INPUT('Unit Price')).fill('280000')
  62  |     await page.locator(MODAL_INPUT('Broker')).fill('Dubai Gold Exchange')
  63  | 
  64  |     await page.locator(MODAL_BTN('Record')).click()
  65  |     await page.waitForTimeout(500)
  66  | 
  67  |     await expect(page.locator('.toast-success')).toBeVisible()
  68  |     await expect(page.locator('.toast-success')).toContainText('Purchase recorded')
  69  |     await expect(page.locator('table')).toBeVisible()
  70  |     await expect(page.locator('table')).toContainText('24K Gold Bar 1kg')
  71  |   })
  72  | 
  73  |   test('3.1 Add a Silver purchase', async () => {
  74  |     await page.locator('button:has-text("Add Purchase")').first().click()
  75  |     await page.waitForTimeout(200)
  76  | 
  77  |     await page.locator(MODAL_SELECT).selectOption('Silver')
  78  |     await page.locator(MODAL_INPUT('Asset Name')).fill('Silver Bar 1kg')
  79  |     await page.locator(MODAL_INPUT('Purchase Date')).fill('2026-06-10')
  80  |     await page.locator(MODAL_INPUT('Quantity')).fill('2')
  81  |     await page.locator(MODAL_INPUT('Unit Price')).fill('3500')
  82  | 
  83  |     await page.locator(MODAL_BTN('Record')).click()
  84  |     await page.waitForTimeout(500)
  85  | 
  86  |     await expect(page.locator('.toast-success')).toBeVisible()
  87  |     await expect(page.locator('table')).toContainText('Silver Bar 1kg')
  88  |   })
  89  | 
  90  |   test('4.0 KPI cards visible with correct values', async () => {
  91  |     await page.waitForTimeout(200)
  92  |     const kpiCards = await page.locator('.kpi-card').all()
  93  |     expect(kpiCards.length).toBe(4)
  94  |     const labels = ['Total Invested', 'Total Quantity', 'Weighted Average', 'Active Lots']
  95  |     for (let i = 0; i < kpiCards.length; i++) {
  96  |       const text = await kpiCards[i].textContent()
  97  |       expect(text).toContain(labels[i])
  98  |     }
  99  |   })
  100 | 
  101 |   test('5.0 Filter by asset type', async () => {
  102 |     const filterSelect = page.locator('.data-table-filters select').first()
  103 |     await filterSelect.selectOption('Silver')
  104 |     await page.waitForTimeout(500)
  105 |     // Table rows should all contain Silver, or table may be empty
  106 |     const rows = await page.locator('table tbody tr').count()
  107 |     if (rows > 0) {
  108 |       await expect(page.locator('table')).toContainText('Silver')
  109 |     }
  110 |     // Reset
  111 |     await filterSelect.selectOption('')
  112 |     await page.waitForTimeout(300)
  113 |   })
  114 | 
  115 |   test('5.1 Search by asset name', async () => {
  116 |     const searchInput = page.locator('.data-table-search-input')
  117 |     await searchInput.fill('Silver')
  118 |     await page.waitForTimeout(500)
  119 |     await expect(page.locator('table')).toContainText('Silver Bar 1kg')
  120 |     await expect(page.locator('table')).not.toContainText('24K Gold')
  121 |     await searchInput.fill('')
  122 |     await page.waitForTimeout(200)
  123 |   })
  124 | 
  125 |   test('6.0 Edit a purchase', async () => {
  126 |     await page.locator('button[aria-label="Edit purchase"]').first().click()
  127 |     await page.waitForTimeout(200)
  128 |     await expect(page.locator('.modal-header')).toContainText('Edit Purchase')
  129 | 
  130 |     await page.locator(MODAL_INPUT('Quantity')).fill('3')
  131 |     await page.locator(MODAL_BTN('Update')).click()
  132 |     await page.waitForTimeout(300)
  133 |     await expect(page.locator('.toast-success')).toContainText('Purchase updated')
  134 |   })
  135 | 
  136 |   test('7.0 Delete a purchase', async () => {
  137 |     await page.locator('button[aria-label="Delete purchase"]').first().click()
  138 |     await page.waitForTimeout(200)
  139 |     await expect(page.locator('.modal')).toBeVisible()
  140 |     await expect(page.locator('.modal-header')).toContainText('Delete Purchase')
```