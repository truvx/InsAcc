# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa-reports-visual.spec.ts >> Reports Visual QA >> 4.0 Balance Sheet tab renders table
- Location: qa-reports-visual.spec.ts:170:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('table')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('table')

```

```yaml
- text: IA InsAcc S Sameer Ishaq Harmoudi Admin Investment
- button "Dashboard":
  - img
  - text: Dashboard
- button "Holdings":
  - img
  - text: Holdings
- button "Investments":
  - img
  - text: Investments
- button "Transactions":
  - img
  - text: Transactions
- button "Bank Accounts":
  - img
  - text: Bank Accounts
- button "Reports":
  - img
  - text: Reports
- button "Documents":
  - img
  - text: Documents
- button "History":
  - img
  - text: History
- button "Purchase Ledger":
  - img
  - text: Purchase Ledger
- button "Settings":
  - img
  - text: Settings
- text: Accounts
- button "Accounts":
  - img
  - text: Accounts
- button "Switch to Property":
  - img
  - text: Switch to Property
- button "Sign Out":
  - img
  - text: Sign Out
- button "Change Profile":
  - img
  - text: Change Profile
- text: Reports Accounting-driven investment reports
- button "Overview"
- button "Balance Sheet"
- button "Profit & Loss"
- button "Trial Balance"
- button "Investment Holdings"
- button "Cash Position"
- button "Investment Position"
- button "Purchase Report"
- button "Bank Position"
- button "Cash Flow"
- button "General Journal"
- button "General Ledger"
- text: Balance Sheet
- button "Export CSV"
- text: No balance sheet data. Post vouchers to see data.
```

# Test source

```ts
  73  | 
  74  |     await page.click('text=Reports')
  75  |     await page.waitForTimeout(1000)
  76  |   })
  77  | 
  78  |   test.afterAll(async () => {
  79  |     await page.close()
  80  |   })
  81  | 
  82  |   test('1.0 Screenshot — 1440px light mode', async () => {
  83  |     await page.setViewportSize({ width: 1440, height: 900 })
  84  |     await page.evaluate(() => document.documentElement.classList.remove('dark-mode'))
  85  |     await page.waitForTimeout(500)
  86  |     await page.screenshot({ path: 'qa-reports-1440-light.png', fullPage: true })
  87  |     expect(await page.locator('.page-title').textContent()).toContain('Reports')
  88  |   })
  89  | 
  90  |   test('1.1 Screenshot — 1440px dark mode', async () => {
  91  |     await page.setViewportSize({ width: 1440, height: 900 })
  92  |     await page.evaluate(() => document.documentElement.classList.add('dark-mode'))
  93  |     await page.waitForTimeout(500)
  94  |     await page.screenshot({ path: 'qa-reports-1440-dark.png', fullPage: true })
  95  |   })
  96  | 
  97  |   test('1.2 Screenshot — 1200px light mode', async () => {
  98  |     await page.evaluate(() => document.documentElement.classList.remove('dark-mode'))
  99  |     await page.setViewportSize({ width: 1200, height: 900 })
  100 |     await page.waitForTimeout(500)
  101 |     await page.screenshot({ path: 'qa-reports-1200-light.png', fullPage: true })
  102 |   })
  103 | 
  104 |   test('1.3 Screenshot — 1200px dark mode', async () => {
  105 |     await page.evaluate(() => document.documentElement.classList.add('dark-mode'))
  106 |     await page.setViewportSize({ width: 1200, height: 900 })
  107 |     await page.waitForTimeout(500)
  108 |     await page.screenshot({ path: 'qa-reports-1200-dark.png', fullPage: true })
  109 |   })
  110 | 
  111 |   test('1.4 Screenshot — 1024px light mode', async () => {
  112 |     await page.evaluate(() => document.documentElement.classList.remove('dark-mode'))
  113 |     await page.setViewportSize({ width: 1024, height: 900 })
  114 |     await page.waitForTimeout(500)
  115 |     await page.screenshot({ path: 'qa-reports-1024-light.png', fullPage: true })
  116 |   })
  117 | 
  118 |   test('1.5 Screenshot — 1024px dark mode', async () => {
  119 |     await page.evaluate(() => document.documentElement.classList.add('dark-mode'))
  120 |     await page.setViewportSize({ width: 1024, height: 900 })
  121 |     await page.waitForTimeout(500)
  122 |     await page.screenshot({ path: 'qa-reports-1024-dark.png', fullPage: true })
  123 |   })
  124 | 
  125 |   test('1.6 Screenshot — 768px light mode', async () => {
  126 |     await page.evaluate(() => document.documentElement.classList.remove('dark-mode'))
  127 |     await page.setViewportSize({ width: 768, height: 900 })
  128 |     await page.waitForTimeout(500)
  129 |     await page.screenshot({ path: 'qa-reports-768-light.png', fullPage: true })
  130 |   })
  131 | 
  132 |   test('1.7 Screenshot — 768px dark mode', async () => {
  133 |     await page.evaluate(() => document.documentElement.classList.add('dark-mode'))
  134 |     await page.setViewportSize({ width: 768, height: 900 })
  135 |     await page.waitForTimeout(500)
  136 |     await page.screenshot({ path: 'qa-reports-768-dark.png', fullPage: true })
  137 |   })
  138 | 
  139 |   test('2.0 KPI cards render with correct labels', async () => {
  140 |     await page.setViewportSize({ width: 1440, height: 900 })
  141 |     await page.waitForTimeout(300)
  142 |     const kpis = await page.locator('.kpi-card').all()
  143 |     expect(kpis.length).toBe(6)
  144 |     const kpiLabels = ['Net Worth', 'Cash', 'Investments', 'Bank Balance', 'Revenue', 'Expenses']
  145 |     for (let i = 0; i < kpis.length; i++) {
  146 |       const text = await kpis[i].textContent()
  147 |       expect(text).toContain(kpiLabels[i])
  148 |     }
  149 |   })
  150 | 
  151 |   test('2.1 KPI cards show AED currency values', async () => {
  152 |     const kpiTexts = await page.locator('.kpi-card').allTextContents()
  153 |     for (const text of kpiTexts) {
  154 |       expect(text).toContain('AED')
  155 |     }
  156 |   })
  157 | 
  158 |   test('3.0 Tabs are visible and selectable', async () => {
  159 |     const tabs = page.locator('.tabs')
  160 |     await expect(tabs).toBeVisible()
  161 |     const tabItems = await page.locator('.tab').all()
  162 |     expect(tabItems.length).toBeGreaterThanOrEqual(5)
  163 |     await tabItems[1].click()
  164 |     await page.waitForTimeout(300)
  165 |     await expect(tabItems[1]).toHaveClass(/active/)
  166 |     await tabItems[0].click()
  167 |     await page.waitForTimeout(300)
  168 |   })
  169 | 
  170 |   test('4.0 Balance Sheet tab renders table', async () => {
  171 |     await page.locator('.tab:text("Balance Sheet")').click()
  172 |     await page.waitForTimeout(500)
> 173 |     await expect(page.locator('table')).toBeVisible()
      |                                         ^ Error: expect(locator).toBeVisible() failed
  174 |     await page.locator('.tab').first().click()
  175 |     await page.waitForTimeout(300)
  176 |   })
  177 | 
  178 |   test('5.0 Quick Links card visible', async () => {
  179 |     await expect(page.locator('text=Quick Links').first()).toBeVisible()
  180 |   })
  181 | 
  182 |   test('6.0 No console errors during Reports interaction', async () => {
  183 |     const errors: string[] = []
  184 |     page.on('console', (msg: any) => {
  185 |       if (msg.type() === 'error') errors.push(msg.text())
  186 |     })
  187 |     // Navigate through several tabs
  188 |     const tabLabels = ['Balance Sheet', 'Profit & Loss', 'Trial Balance', 'Holdings']
  189 |     for (const label of tabLabels) {
  190 |       const tab = page.locator(`.tab:text("${label}")`)
  191 |       if (await tab.isVisible()) {
  192 |         await tab.click()
  193 |         await page.waitForTimeout(300)
  194 |       }
  195 |     }
  196 |     await page.locator('.tab').first().click()
  197 |     await page.waitForTimeout(300)
  198 |     expect(errors.length).toBe(0)
  199 |   })
  200 | })
  201 | 
```