import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5174'

test.describe('Reports Visual QA', () => {
  let page: any

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.addInitScript(() => {
      localStorage.setItem('insacc_clear_version', '9')
      localStorage.setItem('insacc_all_datasets_cleared_v3', 'true')
    })
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    // Seed representative financial data
    await page.evaluate(() => {
      const now = Date.now()
      const investments = [
        { id: 'inv-1', type: 'Gold', assetName: 'Gold Bar 1kg', purchaseValue: 280000, quantity: 1, purchaseDate: '2025-01-15', date: '2025-01-15', buyer: 'Dubai Gold', currentPrice: 290000, totalValue: 290000, profitLoss: 10000, returnRate: 3.6 },
        { id: 'inv-2', type: 'Shares', assetName: 'ADNOC Stock', purchaseValue: 150000, quantity: 500, purchaseDate: '2025-03-20', date: '2025-03-20', buyer: 'AD Securities', currentPrice: 320, totalValue: 160000, profitLoss: 10000, returnRate: 6.7 },
        { id: 'inv-3', type: 'Real Estate', assetName: 'Dubai Marina Apt', purchaseValue: 1200000, quantity: 1, purchaseDate: '2025-06-01', date: '2025-06-01', buyer: 'ERA Real Estate', currentPrice: 1350000, totalValue: 1350000, profitLoss: 150000, returnRate: 12.5 },
        { id: 'inv-4', type: 'Mutual Funds', assetName: 'S&P 500 Index', purchaseValue: 75000, quantity: 100, purchaseDate: '2025-09-10', date: '2025-09-10', buyer: 'Fidelity', currentPrice: 820, totalValue: 82000, profitLoss: 7000, returnRate: 9.3 },
        { id: 'inv-5', type: 'Bonds', assetName: 'UAE Govt Bond', purchaseValue: 200000, quantity: 200, purchaseDate: '2025-11-01', date: '2025-11-01', buyer: 'NBAD', currentPrice: 1010, totalValue: 202000, profitLoss: 2000, returnRate: 1.0 },
      ]
      localStorage.setItem('insacc_investments', JSON.stringify(investments))

      const transactions = [
        { id: 'txn-1', type: 'Income', category: 'Salary', amount: 50000, date: '2026-06-01', description: 'Monthly salary', status: 'cleared' },
        { id: 'txn-2', type: 'Expense', category: 'Rent', amount: 15000, date: '2026-06-02', description: 'Office rent', status: 'cleared' },
        { id: 'txn-3', type: 'Expense', category: 'Utilities', amount: 2500, date: '2026-06-05', description: 'DEWA bill', status: 'cleared' },
        { id: 'txn-4', type: 'Income', category: 'Dividend', amount: 8000, date: '2026-06-10', description: 'Stock dividend', status: 'cleared' },
        { id: 'txn-5', type: 'Expense', category: 'Maintenance', amount: 4200, date: '2026-06-12', description: 'AC repair', status: 'cleared' },
        { id: 'txn-6', type: 'Income', category: 'Consulting', amount: 25000, date: '2026-05-15', description: 'Consulting project', status: 'cleared' },
        { id: 'txn-7', type: 'Expense', category: 'Food', amount: 3500, date: '2026-05-20', description: 'Team lunch', status: 'cleared' },
        { id: 'txn-8', type: 'Expense', category: 'Transport', amount: 1800, date: '2026-04-10', description: 'Fuel & toll', status: 'cleared' },
        { id: 'txn-9', type: 'Income', category: 'Salary', amount: 50000, date: '2026-05-01', description: 'Monthly salary', status: 'cleared' },
        { id: 'txn-10', type: 'Expense', category: 'Rent', amount: 15000, date: '2026-05-02', description: 'Office rent', status: 'cleared' },
        { id: 'txn-11', type: 'Income', category: 'Bonus', amount: 30000, date: '2026-04-01', description: 'Annual bonus', status: 'cleared' },
        { id: 'txn-12', type: 'Expense', category: 'Insurance', amount: 5000, date: '2026-04-15', description: 'Health insurance', status: 'cleared' },
      ]
      localStorage.setItem('insacc_transactions', JSON.stringify(transactions))

      const bankAccounts = [
        { id: 'ba-1', institution: 'Investment Reserve Bank', accountNumber: '****1234', currency: 'AED', openingBalance: 50000, theme: 'emerald', icon: 'bank', status: 'active', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z', createdBy: 'test', updatedBy: 'test' },
        { id: 'ba-2', institution: 'Alternative Bank', accountNumber: '****5678', currency: 'AED', openingBalance: 200000, theme: 'blue', icon: 'bank', status: 'active', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z', createdBy: 'test', updatedBy: 'test' },
        { id: 'ba-3', institution: 'Petty Cash', accountNumber: '', currency: 'AED', openingBalance: 10000, theme: 'gold', icon: 'wallet', status: 'active', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z', createdBy: 'test', updatedBy: 'test' },
      ]
      localStorage.setItem('insacc_bank_accounts', JSON.stringify(bankAccounts))

      const bankTransactions = [
        { id: 'bt-1', accountId: 'ba-1', date: '2026-06-01', type: 'credit', amount: 50000, description: 'Salary deposit', category: 'Income:Salary', status: 'cleared', reference: '', createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z', createdBy: 'test', updatedBy: 'test' },
        { id: 'bt-2', accountId: 'ba-1', date: '2026-06-02', type: 'debit', amount: 15000, description: 'Rent payment', category: 'Expense:Rent', status: 'cleared', reference: '', createdAt: '2026-06-02T00:00:00.000Z', updatedAt: '2026-06-02T00:00:00.000Z', createdBy: 'test', updatedBy: 'test' },
        { id: 'bt-3', accountId: 'ba-2', date: '2026-06-01', type: 'credit', amount: 10000, description: 'Interest credit', category: 'Interest', status: 'cleared', reference: '', createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z', createdBy: 'test', updatedBy: 'test' },
        { id: 'bt-4', accountId: 'ba-1', date: '2026-05-15', type: 'debit', amount: 4200, description: 'AC repair', category: 'Expense:Maintenance', status: 'cleared', reference: '', createdAt: '2026-05-15T00:00:00.000Z', updatedAt: '2026-05-15T00:00:00.000Z', createdBy: 'test', updatedBy: 'test' },
        { id: 'bt-5', accountId: 'ba-3', date: '2026-06-05', type: 'debit', amount: 1500, description: 'Office supplies', category: 'Expense:Supplies', status: 'cleared', reference: '', createdAt: '2026-06-05T00:00:00.000Z', updatedAt: '2026-06-05T00:00:00.000Z', createdBy: 'test', updatedBy: 'test' },
      ]
      localStorage.setItem('insacc_bank_transactions', JSON.stringify(bankTransactions))
      localStorage.setItem('insacc_clear_version', '9')
      localStorage.setItem('insacc_all_datasets_cleared_v3', 'true')
    })
    await page.reload()
    await page.waitForTimeout(1000)

    await page.waitForSelector('input[type="email"]', { timeout: 15000 })
    await page.fill('input[type="email"]', 'test@test.com')
    await page.fill('input[type="password"]', '1234')
    await page.click('button:has-text("Sign In")')
    await page.waitForSelector('text=Sameer Ishaq Harmoudi', { timeout: 10000 })
    await page.click('text=Sameer Ishaq Harmoudi')
    await page.waitForSelector('text=Investment', { timeout: 10000 })
    await page.click('text=Investment')
    await page.waitForSelector('text=Investment Dashboard', { timeout: 10000 })

    await page.click('text=Reports')
    await page.waitForTimeout(1000)
  })

  test.afterAll(async () => {
    await page.close()
  })

  test('1.0 Screenshot — 1440px light mode', async () => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.evaluate(() => document.documentElement.classList.remove('dark-mode'))
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'qa-reports-1440-light.png', fullPage: true })
    expect(await page.locator('.page-title').textContent()).toContain('Reports')
  })

  test('1.1 Screenshot — 1440px dark mode', async () => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.evaluate(() => document.documentElement.classList.add('dark-mode'))
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'qa-reports-1440-dark.png', fullPage: true })
  })

  test('1.2 Screenshot — 1200px light mode', async () => {
    await page.evaluate(() => document.documentElement.classList.remove('dark-mode'))
    await page.setViewportSize({ width: 1200, height: 900 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'qa-reports-1200-light.png', fullPage: true })
  })

  test('1.3 Screenshot — 1200px dark mode', async () => {
    await page.evaluate(() => document.documentElement.classList.add('dark-mode'))
    await page.setViewportSize({ width: 1200, height: 900 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'qa-reports-1200-dark.png', fullPage: true })
  })

  test('1.4 Screenshot — 1024px light mode', async () => {
    await page.evaluate(() => document.documentElement.classList.remove('dark-mode'))
    await page.setViewportSize({ width: 1024, height: 900 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'qa-reports-1024-light.png', fullPage: true })
  })

  test('1.5 Screenshot — 1024px dark mode', async () => {
    await page.evaluate(() => document.documentElement.classList.add('dark-mode'))
    await page.setViewportSize({ width: 1024, height: 900 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'qa-reports-1024-dark.png', fullPage: true })
  })

  test('1.6 Screenshot — 768px light mode', async () => {
    await page.evaluate(() => document.documentElement.classList.remove('dark-mode'))
    await page.setViewportSize({ width: 768, height: 900 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'qa-reports-768-light.png', fullPage: true })
  })

  test('1.7 Screenshot — 768px dark mode', async () => {
    await page.evaluate(() => document.documentElement.classList.add('dark-mode'))
    await page.setViewportSize({ width: 768, height: 900 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'qa-reports-768-dark.png', fullPage: true })
  })

  test('2.0 KPI cards render with correct labels', async () => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(300)
    const kpis = await page.locator('.kpi-card').all()
    expect(kpis.length).toBe(6)
    const kpiLabels = ['Net Worth', 'Cash', 'Investments', 'Bank Balance', 'Revenue', 'Expenses']
    for (let i = 0; i < kpis.length; i++) {
      const text = await kpis[i].textContent()
      expect(text).toContain(kpiLabels[i])
    }
  })

  test('2.1 KPI cards show AED currency values', async () => {
    const kpiTexts = await page.locator('.kpi-card').allTextContents()
    for (const text of kpiTexts) {
      expect(text).toContain('AED')
    }
  })

  test('3.0 Tabs are visible and selectable', async () => {
    const tabs = page.locator('.tabs')
    await expect(tabs).toBeVisible()
    const tabItems = await page.locator('.tab').all()
    expect(tabItems.length).toBeGreaterThanOrEqual(5)
    await tabItems[1].click()
    await page.waitForTimeout(300)
    await expect(tabItems[1]).toHaveClass(/active/)
    await tabItems[0].click()
    await page.waitForTimeout(300)
  })

  test('4.0 Balance Sheet tab renders table', async () => {
    await page.locator('.tab:text("Balance Sheet")').click()
    await page.waitForTimeout(500)
    await expect(page.locator('table')).toBeVisible()
    await page.locator('.tab').first().click()
    await page.waitForTimeout(300)
  })

  test('5.0 Quick Links card visible', async () => {
    await expect(page.locator('text=Quick Links').first()).toBeVisible()
  })

  test('6.0 No console errors during Reports interaction', async () => {
    const errors: string[] = []
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    // Navigate through several tabs
    const tabLabels = ['Balance Sheet', 'Profit & Loss', 'Trial Balance', 'Holdings']
    for (const label of tabLabels) {
      const tab = page.locator(`.tab:text("${label}")`)
      if (await tab.isVisible()) {
        await tab.click()
        await page.waitForTimeout(300)
      }
    }
    await page.locator('.tab').first().click()
    await page.waitForTimeout(300)
    expect(errors.length).toBe(0)
  })
})
