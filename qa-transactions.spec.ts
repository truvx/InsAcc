import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5174'
const MODAL_INPUT = (label: string) => `.modal .form-group:has(.form-label:text("${label}")) input`
const MODAL_BTN = (text: string) => `.modal .modal-footer button:has-text("${text}")`

async function selectCustomOption(page: any, label: string, optionText: string) {
  const container = page.locator(`.modal .form-group:has-text("${label}")`).first()
  const trigger = container.locator('.custom-select-trigger')
  await trigger.click()
  await page.waitForTimeout(300)
  
  const dropdown = page.locator('.custom-select-dropdown').last()
  const option = dropdown.locator(`.custom-select-option:has-text("${optionText}")`).first()
  await option.click()
  await page.waitForTimeout(300)
}

async function navigateTo(page: any, label: string, waitFor: string) {
  await page.locator('.sidebar .nav-item').filter({ hasText: label }).first().click()
  await page.waitForSelector(`text=${waitFor}`, { timeout: 10000 })
  await page.waitForTimeout(200)
}

async function addTransaction(
  page: any, type: string, category: string, amount: string,
  date?: string, description?: string
) {
  await page.locator('button:has-text("Add Transaction")').first().click()
  await page.waitForSelector('text=New Transaction', { timeout: 5000 })

  await selectCustomOption(page, 'Type', type)
  await selectCustomOption(page, 'Category', category)

  if (date) {
    await page.locator('.modal .form-group:has(.form-label:text("Date")) input').fill(date)
  }

  await page.locator('.modal .form-group:has(.form-label:has-text("Amount")) input').fill(amount)

  if (description) {
    await page.locator('.modal .form-group:has(.form-label:has-text("Description")) input').fill(description)
  }

  await page.locator('.modal button:has-text("Add")').first().click()
  await page.waitForTimeout(500)
}

async function deleteTransaction(page: any, rowIndex: number) {
  await page.locator('table tbody tr').nth(rowIndex).locator('button[aria-label="Delete"]').click()
  await page.waitForSelector('text=Delete Transaction', { timeout: 5000 })
  await page.locator('button:has-text("Delete")').first().click()
  await page.waitForTimeout(500)
}

async function resetFilters(page: any) {
  await page.locator('.data-table-filters button').filter({ hasText: 'All' }).click()
  const clearBtn = page.locator('.data-table-search-clear')
  if (await clearBtn.isVisible()) await clearBtn.click()
  await page.waitForTimeout(200)
}

test.describe('Transactions Final QA', () => {
  let page: any

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.addInitScript(() => {
      localStorage.setItem('insacc_clear_version', '9')
      localStorage.setItem('insacc_all_datasets_cleared_v3', 'true')
    })
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.evaluate(() => {
      localStorage.removeItem('insacc_prop_transactions')
    })
    await page.reload({ waitUntil: 'networkidle' })

    await page.waitForSelector('input[type="email"]', { timeout: 15000 })
    await page.fill('input[type="email"]', 'test@test.com')
    await page.fill('input[type="password"]', '1234')
    await page.click('button:has-text("Sign In")')
    await page.waitForSelector('text=Sameer Ishaq Harmoudi', { timeout: 10000 })
    await page.click('text=Sameer Ishaq Harmoudi')
    await page.waitForSelector('text=Properties', { timeout: 10000 })
    await page.click('text=Properties')
    await page.waitForSelector('text=Property Dashboard', { timeout: 15000 })
    await page.waitForTimeout(500)
    await page.locator('.sidebar .nav-item').filter({ hasText: 'Transactions' }).click()
    await page.waitForTimeout(1000)
  })

  test.afterAll(async () => {
    await page.close()
  })

  test.describe.serial('CRUD Operations', () => {
    test('1.1 Add Income transaction', async () => {
      await addTransaction(page, 'Income', 'Building Rental Income', '50000', '2026-06-01')
      await expect(page.locator('.toast-success')).toBeVisible()
      await expect(page.locator('.toast-success')).toContainText('Transaction recorded')
      await expect(page.locator('table')).toContainText('Building Rental Income')
      await expect(page.locator('table')).toContainText('50,000')

      const incomeKpi = await page.locator('.kpi-card').filter({ hasText: 'Total Income' }).textContent()
      expect(incomeKpi).toContain('50,000')
    })

    test('1.2 Add Expense transaction', async () => {
      await addTransaction(page, 'Expense', 'Repair Expense', '15000', '2026-06-15')
      await expect(page.locator('.toast-success')).toBeVisible()
      await expect(page.locator('.toast-success')).toContainText('Transaction recorded')
      await expect(page.locator('table')).toContainText('Repair Expense')
      await expect(page.locator('table')).toContainText('15,000')

      const expenseKpi = await page.locator('.kpi-card').filter({ hasText: 'Total Expenses' }).textContent()
      expect(expenseKpi).toContain('15,000')
    })

    test('1.3 Create custom category and add custom expense transaction', async () => {
      await page.locator('button:has-text("Add Transaction")').first().click()
      await page.waitForSelector('text=New Transaction', { timeout: 5000 })

      // Select Type: Expense first so custom category defaults to Expense type!
      await selectCustomOption(page, 'Type', 'Expense')

      // Click Category trigger, select custom category option
      await selectCustomOption(page, 'Category', '+ Add Custom Category')
      await page.waitForSelector('text=Add Custom Category', { timeout: 5000 })

      await page.locator('.modal:has-text("Add Custom Category") input').fill('Legal Advisory')
      await page.locator('.modal:has-text("Add Custom Category") button:has-text("Save")').click()
      await expect(page.locator('.toast-success')).toContainText('Custom category created')
      await page.waitForTimeout(500)

      // The new category should be active. Now fill other details
      await selectCustomOption(page, 'Category', 'Legal Advisory')
      await page.locator('.modal .form-group:has(.form-label:text("Date")) input').fill('2026-06-10')
      await page.locator('.modal .form-group:has(.form-label:has-text("Amount")) input').fill('10000')

      await page.locator('.modal button:has-text("Add")').first().click()
      await page.waitForTimeout(500)
      await expect(page.locator('.toast-success')).toContainText('Transaction recorded')
      await expect(page.locator('table')).toContainText('Legal Advisory')
    })

    test('1.4 Edit first transaction (which is Legal Advisory expense) to Income', async () => {
      await page.locator('table tbody tr').first().locator('button[aria-label="Edit"]').click()
      await page.waitForSelector('text=Edit Transaction', { timeout: 5000 })

      await selectCustomOption(page, 'Type', 'Income')
      await selectCustomOption(page, 'Category', 'Building Rental Income')
      await page.locator('.modal .form-group:has(.form-label:has-text("Amount")) input').fill('75000')
      await page.locator('.modal button:has-text("Update")').first().click()
      await page.waitForTimeout(500)
      await expect(page.locator('.toast-success')).toContainText('Transaction updated')

      // Total Income KPI should now be 50k + 75k = 125k
      const incomeKpi = await page.locator('.kpi-card').filter({ hasText: 'Total Income' }).textContent()
      expect(incomeKpi).toContain('125,000')
    })

    test('1.5 Edit second row (Expense)', async () => {
      await page.locator('table tbody tr').nth(1).locator('button[aria-label="Edit"]').click()
      await page.waitForSelector('text=Edit Transaction', { timeout: 5000 })

      await selectCustomOption(page, 'Category', 'Utility Bills')
      await page.locator('.modal .form-group:has(.form-label:has-text("Amount")) input').fill('20000')
      await page.locator('.modal button:has-text("Update")').first().click()
      await page.waitForTimeout(500)
      await expect(page.locator('.toast-success')).toContainText('Transaction updated')
      await expect(page.locator('table')).toContainText('Utility Bills')
    })

    test('1.6 Delete first transaction', async () => {
      // First transaction is the edited 75k Income
      await deleteTransaction(page, 0)
      await expect(page.locator('.toast-success')).toContainText('Transaction deleted')

      // Remaining Income KPI should be 50k
      const incomeKpi = await page.locator('.kpi-card').filter({ hasText: 'Total Income' }).textContent()
      expect(incomeKpi).toContain('50,000')
    })

    test('1.7 Delete remaining transactions', async () => {
      await deleteTransaction(page, 0)
      await deleteTransaction(page, 0)
      await expect(page.locator('text=No property transactions yet')).toBeVisible()
    })

    test('1.8 ID uniqueness after delete and re-add', async () => {
      await addTransaction(page, 'Income', 'Building Rental Income', '10000', '2026-01-01')
      await expect(page.locator('table')).toContainText('Building Rental Income')
      
      await addTransaction(page, 'Expense', 'Utility Bills', '5000', '2026-01-02')
      await expect(page.locator('table')).toContainText('Utility Bills')

      // Delete Utility Bills
      await deleteTransaction(page, 1)

      // Add new one
      await addTransaction(page, 'Income', 'Building Rental Income', '30000', '2026-01-03')
      const rows = await page.locator('table tbody tr').allTextContents()
      expect(rows.length).toBe(2)

      // Clean up for next suite
      await deleteTransaction(page, 0)
      await deleteTransaction(page, 0)
    })
  })

  test.describe.serial('Dashboard Integration', () => {
    test('2.1 Transactions KPIs update Dashboard', async () => {
      await addTransaction(page, 'Income', 'Building Rental Income', '120000', '2026-06-01')

      const txnKpi = await page.locator('.kpi-card').filter({ hasText: 'Total Income' }).textContent()
      expect(txnKpi).toContain('120,000')

      await navigateTo(page, 'Dashboard', 'Property Dashboard')

      // Net Property Income card should reflect 120,000 formatted as 120.0K
      const dashKpi = await page.locator('.kpi-card').filter({ hasText: 'Net Property Income' }).textContent()
      expect(dashKpi).toContain('120.0K')
    })

    test('2.2 Dashboard reflects deleted transactions', async () => {
      await navigateTo(page, 'Transactions', 'Add Transaction')
      await deleteTransaction(page, 0)

      await navigateTo(page, 'Dashboard', 'Property Dashboard')
      const dashKpi = await page.locator('.kpi-card').filter({ hasText: 'Net Property Income' }).textContent()
      expect(dashKpi).not.toContain('120.0K')
    })
  })

  test.describe.serial('Filter and Search Combinations', () => {
    test.beforeAll(async () => {
      await navigateTo(page, 'Transactions', 'Add Transaction')
      await resetFilters(page)

      // Seed transactions
      await addTransaction(page, 'Income', 'Building Rental Income', '100000', '2026-01-15')
      await addTransaction(page, 'Income', 'Parking Rent', '25000', '2026-03-10')
      await addTransaction(page, 'Expense', 'Utility Bills', '12000', '2026-02-20', 'Quarterly bills')
      await addTransaction(page, 'Expense', 'Insurance', '8000', '2026-04-05', 'Annual coverage')
    })

    test.beforeEach(async () => {
      await resetFilters(page)
    })

    test('3.1 Verify seeded list count', async () => {
      const rows = await page.locator('table tbody tr').count()
      expect(rows).toBe(4)
    })

    test('3.2 Search only - by category', async () => {
      await page.fill('.data-table-search-input', 'Parking Rent')
      await page.waitForTimeout(300)
      const rows = await page.locator('table tbody tr').count()
      expect(rows).toBe(1)
    })

    test('3.3 Search only - by description text', async () => {
      await page.fill('.data-table-search-input', 'coverage')
      await page.waitForTimeout(300)
      const rows = await page.locator('table tbody tr').count()
      expect(rows).toBe(1)
    })

    test('3.4 Type filter only - Income', async () => {
      await page.locator('.data-table-filters button').filter({ hasText: 'Income' }).click()
      await page.waitForTimeout(300)
      const rows = await page.locator('table tbody tr').count()
      expect(rows).toBe(2)
    })

    test('3.5 Type filter only - Expense', async () => {
      await page.locator('.data-table-filters button').filter({ hasText: 'Expense' }).click()
      await page.waitForTimeout(300)
      const rows = await page.locator('table tbody tr').count()
      expect(rows).toBe(2)
    })

    test('3.6 Search and Type filter combo', async () => {
      await page.locator('.data-table-filters button').filter({ hasText: 'Income' }).click()
      await page.fill('.data-table-search-input', 'Parking Rent')
      await page.waitForTimeout(300)
      let rows = await page.locator('table tbody tr').count()
      expect(rows).toBe(1)

      // Search for an expense while income filter is active -> should find nothing
      await page.fill('.data-table-search-input', 'Insurance')
      await page.waitForTimeout(300)
      await expect(page.locator('text=No transactions found')).toBeVisible()
    })
  })
})
