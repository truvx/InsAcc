import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5174'

// Shared state across tests
let page: any

test.describe('Transactions Final QA', () => {
  test.beforeAll(async ({ browser }) => {
    // Navigate and prevent clear_version reload
    page = await browser.newPage()
    await page.addInitScript(() => {
      localStorage.setItem('insacc_clear_version', '7')
    })
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    // Clear any existing data
    await page.evaluate(() => localStorage.removeItem('insacc_transactions'))
    await page.reload()
    // Login
    await page.waitForSelector('input[type="email"]', { timeout: 15000 })
    await page.fill('input[type="email"]', 'test@test.com')
    await page.fill('input[type="password"]', '1234')
    await page.click('button:has-text("Sign In")')
    // Profile
    await page.waitForSelector('text=Sameer Ishaq Harmoudi', { timeout: 10000 })
    await page.click('text=Sameer Ishaq Harmoudi')
    // Module
    await page.waitForSelector('text=Investment', { timeout: 10000 })
    await page.click('text=Investment')
    // Dashboard
    await page.waitForSelector('text=Total Portfolio Value', { timeout: 10000 })
  })

  test.afterAll(async () => {
    await page.close()
  })

  async function navigateTo(page: any, label: string, waitFor: string) {
    await page.click(`text=${label}`)
    await page.waitForSelector(`text=${waitFor}`, { timeout: 10000 })
    await page.waitForTimeout(200)
  }

  async function addTransaction(
    page: any, type: string, category: string, amount: string,
    date?: string
  ) {
    await page.click('button:has-text("Add Transaction")')
    await page.waitForSelector('text=New Transaction', { timeout: 5000 })

    const typeSelect = page.locator('label:has-text("Type")').locator('..').locator('select')
    await typeSelect.selectOption(type)
    await page.waitForTimeout(100)

    const catSelect = page.locator('label:has-text("Category")').locator('..').locator('select')
    await catSelect.selectOption(category)

    if (date) {
      await page.locator('label:has-text("Date")').locator('..').locator('input[type="date"]').fill(date)
    }

    await page.locator('label:has-text("Amount")').locator('..').locator('input[type="number"]').fill(amount)

    await page.click('button:has-text("Add")')
    await page.waitForTimeout(300)
  }

  async function editTransaction(page: any, rowIndex: number, newCategory: string, newAmount: string) {
    await page.locator('button[aria-label="Edit"]').nth(rowIndex).click()
    await page.waitForSelector('text=Edit Transaction', { timeout: 5000 })

    await page.locator('label:has-text("Category")').locator('..').locator('select').selectOption(newCategory)
    await page.locator('label:has-text("Amount")').locator('..').locator('input[type="number"]').fill(newAmount)

    await page.click('button:has-text("Update")')
    await page.waitForTimeout(300)
  }

  async function deleteTransaction(page: any, rowIndex: number) {
    await page.locator('button[aria-label="Delete"]').nth(rowIndex).click()
    await page.waitForSelector('text=Delete Transaction', { timeout: 5000 })
    await page.click('button:has-text("Delete")')
    await page.waitForTimeout(300)
  }

  async function resetFilters(page: any) {
    const allDateBtn = page.locator('.data-table-toolbar').first().locator('button:has-text("All")')
    const allTypeBtn = page.locator('.data-table-toolbar').nth(1).locator('button:has-text("All")')
    const clearBtn = page.locator('.data-table-search-clear')
    if (await allDateBtn.isVisible()) await allDateBtn.click()
    if (await allTypeBtn.isVisible()) await allTypeBtn.click()
    if (await clearBtn.isVisible()) await clearBtn.click()
    await page.waitForTimeout(200)
  }

  // ============================================================
  // SUITE 1: CRUD Operations
  // ============================================================

  test.describe.serial('CRUD Operations', () => {
    test('1.1 Add Income transaction', async () => {
      await navigateTo(page, 'Transactions', 'Income, expense')
      await addTransaction(page, 'Income', 'Salary', '50000', '2026-06-01')
      await expect(page.locator('text=Transaction recorded')).toBeVisible()
      await expect(page.locator('text=TXN-001')).toBeVisible()
      await expect(page.locator('text=Salary')).toBeVisible()
      await expect(page.locator('text=+AED 50,000')).toBeVisible()
      // KPI check
      const incomeKpi = await page.locator('.kpi-card').first().textContent()
      expect(incomeKpi).toContain('50,000')
    })

    test('1.2 Add Expense transaction', async () => {
      await addTransaction(page, 'Expense', 'Maintenance', '15000', '2026-06-15')
      await expect(page.locator('text=Transaction recorded')).toBeVisible()
      await expect(page.locator('text=TXN-002')).toBeVisible()
      await expect(page.locator('text=Maintenance')).toBeVisible()
    })

    test('1.3 Add Journal transaction', async () => {
      await addTransaction(page, 'Journal', 'Adjustment', '10000', '2026-06-10')
      await expect(page.locator('text=Transaction recorded')).toBeVisible()
      await expect(page.locator('text=TXN-003')).toBeVisible()
      // Journal should not affect income/expense KPIs
      const kpis = await page.locator('.kpi-card').allTextContents()
      // Income = 50000, Expense = 15000 (Journal doesn't affect)
      expect(kpis[0]).toContain('50,000')
      expect(kpis[1]).toContain('15,000')
    })

    test('1.4 Edit Journal transaction (first row) to Income', async () => {
      // First row is TXN-003 (Journal)
      await page.locator('button[aria-label="Edit"]').first().click()
      await page.waitForSelector('text=Edit Transaction')
      // Change type to Income
      await page.locator('label:has-text("Type")').locator('..').locator('select').selectOption('Income')
      await page.waitForTimeout(200)
      // Now the category options have changed; select 'Dividend'
      await page.locator('label:has-text("Category")').locator('..').locator('select').selectOption('Dividend')
      await page.locator('label:has-text("Amount")').locator('..').locator('input[type="number"]').fill('75000')
      await page.click('button:has-text("Update")')
      await expect(page.locator('text=Transaction updated')).toBeVisible()
      await expect(page.locator('text=Dividend')).toBeVisible()
      // KPI: Income now = 50000 (TXN-001) + 75000 (edited TXN-003) = 125000
      const kpiText = await page.locator('.kpi-card').first().textContent()
      expect(kpiText).toContain('125,000')
    })

    test('1.5 Edit second row (Expense)', async () => {
      // Second row is TXN-002 (Expense, Maintenance)
      await page.locator('button[aria-label="Edit"]').nth(1).click()
      await page.waitForSelector('text=Edit Transaction')
      await page.locator('label:has-text("Category")').locator('..').locator('select').selectOption('Utilities')
      await page.locator('label:has-text("Amount")').locator('..').locator('input[type="number"]').fill('20000')
      await page.click('button:has-text("Update")')
      await expect(page.locator('text=Transaction updated')).toBeVisible()
      await expect(page.locator('text=Utilities')).toBeVisible()
    })

    test('1.7 Delete first transaction', async () => {
      // Current state: [TXN-003 (Income, Dividend, 75K), TXN-002 (Expense, Utilities, 20K), TXN-001 (Income, Salary, 50K)]
      // Delete first row = TXN-003 (Income, 75K)
      await deleteTransaction(page, 0)
      await expect(page.locator('text=Transaction deleted')).toBeVisible()
      // Remaining Income = TXN-001 (50K)
      const kpiText = await page.locator('.kpi-card').first().textContent()
      expect(kpiText).toContain('50,000')
    })

    test('1.8 Delete all remaining transactions', async () => {
      await deleteTransaction(page, 0)
      await deleteTransaction(page, 0)
      await expect(page.locator('text=No transactions found')).toBeVisible()
    })

    test('1.9 ID uniqueness after delete and re-add', async () => {
      await addTransaction(page, 'Income', 'Salary', '10000', '2026-01-01')
      await expect(page.locator('text=TXN-001')).toBeVisible()
      await addTransaction(page, 'Expense', 'Utilities', '5000', '2026-01-02')
      await expect(page.locator('text=TXN-002')).toBeVisible()
      // Delete TXN-002
      await deleteTransaction(page, 0)
      // Add new one (gets TXN-002 again since prev.length=1)
      await addTransaction(page, 'Income', 'Dividend', '30000', '2026-01-03')
      const ids = await page.locator('td:first-child').allTextContents()
      const id002 = ids.filter(id => id.trim() === 'TXN-002')
      expect(id002.length).toBe(1) // Only one TXN-002
      // Clean up for next suite
      await deleteTransaction(page, 0)
      await deleteTransaction(page, 0)
    })
  })

  // ============================================================
  // SUITE 2: Dashboard Integration
  // ============================================================

  test.describe.serial('Dashboard Integration', () => {
    test('2.1 Transactions KPIs update Dashboard', async () => {
      await navigateTo(page, 'Transactions', 'Income, expense')
      await addTransaction(page, 'Income', 'Salary', '120000', '2026-06-01')

      const txnKpi = await page.locator('.kpi-card').first().textContent()
      expect(txnKpi).toContain('120,000')

      await navigateTo(page, 'Dashboard', 'Total Portfolio Value')
      const dashKpi = await page.locator('.kpi-card').nth(2).textContent()
      expect(dashKpi).toContain('120,000')
    })

    test('2.2 Dashboard Cash Flow chart updates', async () => {
      await navigateTo(page, 'Transactions', 'Income, expense')
      const now = new Date()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const y = now.getFullYear()
      await addTransaction(page, 'Expense', 'Utilities', '15000', `${y}-${m}-15`)

      await navigateTo(page, 'Dashboard', 'Total Portfolio Value')
      await expect(page.locator('text=Add income and expense transactions')).not.toBeVisible()
      await expect(page.locator('text=Cash Flow')).toBeVisible()
    })

    test('2.3 Recent Activity updates', async () => {
      await expect(page.locator('.activity-timeline .activity-item').first()).toBeVisible()
    })

    test('2.4 Dashboard reflects deleted transactions', async () => {
      await navigateTo(page, 'Transactions', 'Income, expense')
      await deleteTransaction(page, 0) // Delete the expense
      await navigateTo(page, 'Dashboard', 'Total Portfolio Value')
      const dashKpi = await page.locator('.kpi-card').nth(2).textContent()
      expect(dashKpi).toContain('120,000') // Only the 120K income remains
      // Clean up
      await navigateTo(page, 'Transactions', 'Income, expense')
      await deleteTransaction(page, 0)
    })
  })

  // ============================================================
  // SUITE 3: Filter Combinations
  // ============================================================

  test.describe.serial('Filter Combinations', () => {
    test.beforeEach(async () => {
      await navigateTo(page, 'Transactions', 'Income, expense')
      await resetFilters(page)
    })

    test('3.1 Seed transactions for filter tests', async () => {
      await addTransaction(page, 'Income', 'Salary', '100000', '2026-01-15')
      await addTransaction(page, 'Income', 'Dividend', '25000', '2026-03-10')
      await addTransaction(page, 'Expense', 'Utilities', '12000', '2026-02-20')
      await addTransaction(page, 'Expense', 'Insurance', '8000', '2026-04-05')
      await addTransaction(page, 'Journal', 'Adjustment', '5000', '2026-05-01')
      await addTransaction(page, 'Journal', 'Correction', '3000', '2026-06-15')
      // Verify 6 items on page 1 (pageSize=10 > 6)
      const rows = await page.locator('tbody tr').count()
      expect(rows).toBe(6)
    })

    test('3.2 Search only — by category', async () => {
      await page.fill('.data-table-search-input', 'Salary')
      await page.waitForTimeout(300)
      const rows = await page.locator('tbody tr').count()
      expect(rows).toBe(1)
    })

    test('3.3 Search only — by ID', async () => {
      // Clear previous search if visible
      const clearBtn3 = page.locator('.data-table-search-clear')
      if (await clearBtn3.isVisible()) {
        await clearBtn3.click()
        await page.waitForTimeout(200)
      }
      await page.fill('.data-table-search-input', 'TXN-003')
      await page.waitForTimeout(300)
      const rows = await page.locator('tbody tr').count()
      expect(rows).toBe(1)
    })

    test('3.4 Search only — by type', async () => {
      const clearBtn4 = page.locator('.data-table-search-clear')
      if (await clearBtn4.isVisible()) await clearBtn4.click()
      await page.waitForTimeout(200)
      await page.fill('.data-table-search-input', 'Journal')
      await page.waitForTimeout(300)
      const rows = await page.locator('tbody tr').count()
      expect(rows).toBe(2)
    })

    test('3.5 Type filter only — Income', async () => {
      await page.click('button:has-text("Income")')
      await page.waitForTimeout(300)
      const rows = await page.locator('tbody tr').count()
      expect(rows).toBe(2)
    })

    test('3.6 Type filter only — Expense', async () => {
      await page.locator('.data-table-toolbar:nth-of-type(2) button:has-text("All")').click()
      await page.waitForTimeout(100)
      await page.click('button:has-text("Expense")')
      await page.waitForTimeout(300)
      const rows = await page.locator('tbody tr').count()
      expect(rows).toBe(2)
    })

    test('3.7 Type filter only — Journal', async () => {
      await page.locator('.data-table-toolbar:nth-of-type(2) button:has-text("All")').click()
      await page.waitForTimeout(100)
      await page.click('button:has-text("Journal")')
      await page.waitForTimeout(300)
      const rows = await page.locator('tbody tr').count()
      expect(rows).toBe(2)
    })

    test('3.8 Date filter only — This Year', async () => {
      await page.locator('.data-table-toolbar:nth-of-type(2) button:has-text("All")').click()
      await page.waitForTimeout(100)
      await page.click('button:has-text("This Year")')
      await page.waitForTimeout(300)
      const rows = await page.locator('tbody tr').count()
      expect(rows).toBe(6) // all 2026
    })

    test('3.9 Search + Type combined', async () => {
      // Reset: All filter, clear search
      await page.locator('.data-table-toolbar:nth-of-type(2) button:has-text("All")').click()
      await page.waitForTimeout(100)
      const clearBtn = page.locator('.data-table-search-clear')
      if (await clearBtn.isVisible()) await clearBtn.click()
      await page.waitForTimeout(100)

      await page.click('button:has-text("Income")')
      await page.waitForTimeout(100)
      await page.fill('.data-table-search-input', 'Dividend')
      await page.waitForTimeout(300)
      const rows = await page.locator('tbody tr').count()
      expect(rows).toBe(1)
    })

    test('3.10 Search + Date combined', async () => {
      await page.locator('.data-table-toolbar:nth-of-type(2) button:has-text("All")').click()
      await page.waitForTimeout(100)
      const clearBtn2 = page.locator('.data-table-search-clear')
      if (await clearBtn2.isVisible()) await clearBtn2.click()
      await page.waitForTimeout(100)

      await page.click('button:has-text("This Year")')
      await page.waitForTimeout(100)
      await page.fill('.data-table-search-input', 'TXN-003')
      await page.waitForTimeout(300)
      const rows = await page.locator('tbody tr').count()
      expect(rows).toBe(1)
    })

    test('3.11 Type + Date combined', async () => {
      await page.locator('.data-table-toolbar:nth-of-type(2) button:has-text("All")').click()
      await page.waitForTimeout(100)
      const clearBtn3 = page.locator('.data-table-search-clear')
      if (await clearBtn3.isVisible()) await clearBtn3.click()
      await page.waitForTimeout(100)

      await page.click('button:has-text("Expense")')
      await page.waitForTimeout(100)
      await page.click('button:has-text("This Year")')
      await page.waitForTimeout(300)
      const rows = await page.locator('tbody tr').count()
      expect(rows).toBe(2)
    })

    test('3.12 Search + Type + Date combined', async () => {
      await page.locator('.data-table-toolbar:nth-of-type(2) button:has-text("All")').click()
      await page.waitForTimeout(100)
      const clearBtn4 = page.locator('.data-table-search-clear')
      if (await clearBtn4.isVisible()) await clearBtn4.click()
      await page.waitForTimeout(100)

      await page.click('button:has-text("Income")')
      await page.waitForTimeout(100)
      await page.click('button:has-text("This Year")')
      await page.waitForTimeout(100)
      await page.fill('.data-table-search-input', 'Salary')
      await page.waitForTimeout(300)
      const rows = await page.locator('tbody tr').count()
      expect(rows).toBe(1)
    })
  })

  // ============================================================
  // SUITE 4: Sorting
  // ============================================================

  test.describe.serial('Sorting', () => {
    const sortableColumns = ['ID', 'Date', 'Type', 'Category', 'Amount', 'Status']

    for (const col of sortableColumns) {
      test(`4.${sortableColumns.indexOf(col) + 1} Sort by ${col}`, async () => {
        await navigateTo(page, 'Transactions', 'Income, expense')
        // Click to sort asc
        await page.click(`th:has-text("${col}")`)
        await page.waitForTimeout(300)
        const header = page.locator(`th:has-text("${col}")`)
        await expect(header).toHaveClass(/sorted/)
        // Click for desc
        await page.click(`th:has-text("${col}")`)
        await page.waitForTimeout(200)
        // Click to unsort
        await page.click(`th:has-text("${col}")`)
        await page.waitForTimeout(200)
      })
    }

    test('4.7 Sorting works after search filter', async () => {
      await page.fill('.data-table-search-input', 'Income')
      await page.waitForTimeout(300)
      await page.click('th:has-text("Amount")')
      await page.waitForTimeout(300)
      const amounts = await page.locator('tbody tr td:nth-child(5)').allTextContents()
      if (amounts.length >= 2) {
        const firstVal = parseInt(amounts[0].replace(/[^0-9]/g, ''))
        const lastVal = parseInt(amounts[amounts.length - 1].replace(/[^0-9]/g, ''))
        expect(firstVal).toBeLessThanOrEqual(lastVal)
      }
    })

    test('4.8 Sorting works after type filter', async () => {
      const clearBtn = page.locator('.data-table-search-clear')
      if (await clearBtn.isVisible()) await clearBtn.click()
      await page.waitForTimeout(100)
      await page.click('button:has-text("Income")')
      await page.waitForTimeout(200)
      await page.click('th:has-text("Amount")')
      await page.waitForTimeout(300)
      await expect(page.locator('th:has-text("Amount").sorted')).toBeVisible()
    })

    test('4.9 Sorting works after edit', async () => {
      await navigateTo(page, 'Transactions', 'Income, expense')
      await page.waitForTimeout(200)
      await editTransaction(page, 0, 'Salary', '50000')
      // Reset sort state by cycling through ID column (asc → desc → unsort)
      for (let i = 0; i < 3; i++) {
        await page.click('th:has-text("ID")')
        await page.waitForTimeout(100)
      }
      await page.click('th:has-text("Amount")')
      await page.waitForTimeout(300)
      await expect(page.locator('th:has-text("Amount")')).toHaveClass(/sorted/)
    })

    test('4.10 Sorting works after delete', async () => {
      const editBtns = page.locator('button[aria-label="Edit"]')
      if (await editBtns.count() > 0) {
        await deleteTransaction(page, 0)
      }
      await page.click('th:has-text("Amount")')
      await page.waitForTimeout(300)
      await expect(page.locator('th:has-text("Amount").sorted')).toBeVisible()
    })
  })

  // ============================================================
  // SUITE 5: Validation
  // ============================================================

  test.describe.serial('Validation', () => {
    test.beforeEach(async () => {
      await navigateTo(page, 'Transactions', 'Income, expense')
      await resetFilters(page)
    })

    test('5.1 Empty form shows validation toast', async () => {
      await page.click('button:has-text("Add Transaction")')
      await page.waitForSelector('text=New Transaction')
      await page.click('button:has-text("Add")')
      await expect(page.locator('text=Please select a category')).toBeVisible()
      await page.locator('button:has-text("Cancel")').click()
    })

    test('5.2 Missing category shows error', async () => {
      await page.click('button:has-text("Add Transaction")')
      await page.waitForSelector('text=New Transaction')
      await page.locator('label:has-text("Amount")').locator('..').locator('input[type="number"]').fill('50000')
      await page.click('button:has-text("Add")')
      await expect(page.locator('text=Please select a category')).toBeVisible()
      await page.locator('button:has-text("Cancel")').click()
    })

    test('5.3 Amount = 0 shows error', async () => {
      await page.click('button:has-text("Add Transaction")')
      await page.waitForSelector('text=New Transaction')
      await page.locator('label:has-text("Category")').locator('..').locator('select').selectOption('Salary')
      await page.locator('label:has-text("Amount")').locator('..').locator('input[type="number"]').fill('0')
      await page.click('button:has-text("Add")')
      await expect(page.locator('text=Amount must be greater than zero')).toBeVisible()
      await page.locator('button:has-text("Cancel")').click()
    })

    test('5.4 Negative amount shows error', async () => {
      await page.click('button:has-text("Add Transaction")')
      await page.waitForSelector('text=New Transaction')
      await page.locator('label:has-text("Category")').locator('..').locator('select').selectOption('Salary')
      await page.locator('label:has-text("Amount")').locator('..').locator('input[type="number"]').fill('-500')
      await page.click('button:has-text("Add")')
      await expect(page.locator('text=Amount must be greater than zero')).toBeVisible()
      await page.locator('button:has-text("Cancel")').click()
    })

    test('5.5 Valid form succeeds', async () => {
      await page.click('button:has-text("Add Transaction")')
      await page.waitForSelector('text=New Transaction')
      await page.locator('label:has-text("Type")').locator('..').locator('select').selectOption('Income')
      await page.waitForTimeout(100)
      await page.locator('label:has-text("Category")').locator('..').locator('select').selectOption('Salary')
      await page.locator('label:has-text("Amount")').locator('..').locator('input[type="number"]').fill('50000')
      await page.click('button:has-text("Add")')
      await expect(page.locator('text=Transaction recorded')).toBeVisible()
    })

    test('5.6 Edit validation — empty amount', async () => {
      await page.locator('button[aria-label="Edit"]').first().click()
      await page.waitForSelector('text=Edit Transaction')
      await page.locator('label:has-text("Amount")').locator('..').locator('input[type="number"]').fill('')
      await page.click('button:has-text("Update")')
      await expect(page.locator('text=Amount must be greater than zero')).toBeVisible()
      await page.locator('button:has-text("Cancel")').click()
      // Clean up remaining transaction
      await page.waitForTimeout(200)
      const delBtns = page.locator('button[aria-label="Delete"]')
      if (await delBtns.count() > 0) {
        await delBtns.first().click()
        await page.waitForSelector('text=Delete Transaction')
        await page.click('button:has-text("Delete")')
      }
    })
  })

  // ============================================================
  // SUITE 6: Performance
  // ============================================================

  test.describe.serial('Performance', () => {
    async function seedTransactions(page: any, count: number) {
      const types = ['Income', 'Expense', 'Journal']
      const cats: Record<string, string[]> = {
        Income: ['Salary', 'Rental Income', 'Dividend', 'Interest', 'Other Income'],
        Expense: ['Maintenance', 'Utilities', 'Insurance', 'Taxes', 'Fees', 'Miscellaneous'],
        Journal: ['Adjustment', 'Transfer', 'Opening Balance', 'Correction'],
      }
      const txns: any[] = []
      for (let i = 0; i < count; i++) {
        const type = types[i % 3]
        const cat = cats[type][i % cats[type].length]
        txns.push({
          id: `TXN-${String(i + 1).padStart(3, '0')}`,
          date: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
          type,
          category: cat,
          amount: Math.round(Math.random() * 100000) + 1000,
          status: 'Completed',
        })
      }
      await page.evaluate((data) => {
        localStorage.setItem('insacc_transactions', JSON.stringify(data))
      }, txns)
      await page.reload()
      await page.waitForSelector('input[type="email"]', { timeout: 15000 })
      await page.fill('input[type="email"]', 'test@test.com')
      await page.fill('input[type="password"]', '1234')
      await page.click('button:has-text("Sign In")')
      await page.waitForSelector('text=Sameer Ishaq Harmoudi', { timeout: 10000 })
      await page.click('text=Sameer Ishaq Harmoudi')
      await page.waitForSelector('text=Investment', { timeout: 10000 })
      await page.click('text=Investment')
      await page.waitForSelector('text=Total Portfolio Value', { timeout: 10000 })
      await navigateTo(page, 'Transactions', 'Income, expense')
      await page.waitForTimeout(500)
    }

    test('6.1 100 transactions — search responsive', async () => {
      await seedTransactions(page, 100)
      const start = Date.now()
      await page.fill('.data-table-search-input', 'Salary')
      await page.waitForTimeout(300)
      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(2000)
    })

    test('6.2 100 transactions — filter responsive', async () => {
      const clearBtn = page.locator('.data-table-search-clear')
      if (await clearBtn.isVisible()) await clearBtn.click()
      await page.waitForTimeout(100)
      const start = Date.now()
      await page.click('button:has-text("Income")')
      await page.waitForTimeout(300)
      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(2000)
    })

    test('6.3 500 transactions — sort responsive', async () => {
      await seedTransactions(page, 500)
      const start = Date.now()
      await page.click('th:has-text("Amount")')
      await page.waitForTimeout(300)
      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(3000)
    })

    test('6.4 500 transactions — pagination responsive', async () => {
      // Use JS click to bypass visibility checks since many page buttons exist
      const totalBtns = await page.locator('.data-table-page-btn').count()
      expect(totalBtns).toBe(50) // 500/10
      // Navigate to page 2 using the next button
      const nextBtn = page.locator('button:has-text("ChevronLeftIcon")').last()
      // Actually use the pagination arrow (rotated chevron)
      const arrowBtn = page.locator('.data-table-pagination-actions button').last()
      await arrowBtn.click()
      await page.waitForTimeout(300)
      const info = await page.locator('.data-table-pagination-info').textContent()
      expect(info).toContain('11') // page 2 starts at item 11
    })

    test('6.5 1000 transactions — all operations', async () => {
      await seedTransactions(page, 1000)
      // Search
      let start = Date.now()
      await page.fill('.data-table-search-input', 'Miscellaneous')
      await page.waitForTimeout(300)
      expect(Date.now() - start).toBeLessThan(3000)
      // Clear search, filter
      if (await page.locator('.data-table-search-clear').isVisible()) {
        await page.locator('.data-table-search-clear').click()
      }
      await page.waitForTimeout(100)
      start = Date.now()
      await page.click('button:has-text("Expense")')
      await page.waitForTimeout(300)
      expect(Date.now() - start).toBeLessThan(2000)
      // Sort
      start = Date.now()
      await page.click('th:has-text("Amount")')
      await page.waitForTimeout(300)
      expect(Date.now() - start).toBeLessThan(3000)
      // Paginate
      start = Date.now()
      const totalPages = await page.locator('.data-table-page-btn').count()
      if (totalPages > 1) {
        await page.locator('.data-table-page-btn').nth(1).click()
        await page.waitForTimeout(300)
      }
      expect(Date.now() - start).toBeLessThan(2000)
    })
  })

  // ============================================================
  // SUITE 7: Persistence
  // ============================================================

  test.describe.serial('Persistence', () => {
    let persistPage: any
    let persistCtx: any

    test('7.1 Transactions persist after page reload', async ({ browser }) => {
      // Use a clean browser context (no addInitScript)
      persistCtx = await browser.newContext()
      persistPage = await persistCtx.newPage()
      await persistPage.goto(BASE, { waitUntil: 'networkidle' })
      await persistPage.waitForTimeout(2000)
      // Seed transactions
      await persistPage.evaluate(() => {
        localStorage.setItem('insacc_clear_version', '7')
        localStorage.setItem('insacc_transactions', JSON.stringify([
          { id: 'TXN-001', date: '2026-06-01', type: 'Income', category: 'Salary', amount: 120000, status: 'Completed' },
          { id: 'TXN-002', date: '2026-06-15', type: 'Expense', category: 'Utilities', amount: 35000, status: 'Completed' },
        ]))
      })
      // Reload and login
      await persistPage.reload()
      await persistPage.waitForSelector('input[type="email"]', { timeout: 15000 })
      await persistPage.fill('input[type="email"]', 'test@test.com')
      await persistPage.fill('input[type="password"]', '1234')
      await persistPage.click('button:has-text("Sign In")')
      await persistPage.waitForSelector('text=Sameer Ishaq Harmoudi', { timeout: 10000 })
      await persistPage.click('text=Sameer Ishaq Harmoudi')
      await persistPage.waitForSelector('text=Investment', { timeout: 10000 })
      await persistPage.click('text=Investment')
      await persistPage.waitForSelector('text=Total Portfolio Value', { timeout: 10000 })
      // Navigate to Transactions
      await persistPage.click('text=Transactions')
      await persistPage.waitForSelector('text=Income, expense', { timeout: 10000 })
      await persistPage.waitForTimeout(500)
      // Should see the persisted transactions
      await expect(persistPage.locator('text=TXN-001')).toBeVisible()
      await expect(persistPage.locator('text=TXN-002')).toBeVisible()
      const incomeKpi = await persistPage.locator('.kpi-card').first().textContent()
      expect(incomeKpi).toContain('120,000')
    })

    test('7.2 Dashboard reflects persisted data', async () => {
      await persistPage.click('text=Dashboard')
      await persistPage.waitForSelector('text=Total Portfolio Value', { timeout: 10000 })
      await persistPage.waitForTimeout(500)
      const netKpi = await persistPage.locator('.kpi-card').nth(2).textContent()
      expect(netKpi).toContain('85,000') // 120000 - 35000
    })

    test('7.3 Filters reset on page reload', async () => {
      await persistPage.click('text=Transactions')
      await persistPage.waitForSelector('text=Income, expense', { timeout: 10000 })
      await persistPage.waitForTimeout(500)
      // Apply a filter
      await persistPage.click('button:has-text("Income")')
      await persistPage.waitForTimeout(200)
      const incomeBtn = persistPage.locator('button:has-text("Income")')
      await expect(incomeBtn).toHaveClass(/primary/)
      // Reload
      await persistPage.reload()
      await persistPage.waitForSelector('input[type="email"]', { timeout: 15000 })
      await persistPage.fill('input[type="email"]', 'test@test.com')
      await persistPage.fill('input[type="password"]', '1234')
      await persistPage.click('button:has-text("Sign In")')
      await persistPage.waitForSelector('text=Sameer Ishaq Harmoudi', { timeout: 10000 })
      await persistPage.click('text=Sameer Ishaq Harmoudi')
      await persistPage.waitForSelector('text=Investment', { timeout: 10000 })
      await persistPage.click('text=Investment')
      await persistPage.waitForSelector('text=Total Portfolio Value', { timeout: 10000 })
      await persistPage.click('text=Transactions')
      await persistPage.waitForSelector('text=Income, expense', { timeout: 10000 })
      await persistPage.waitForTimeout(500)
      // Filter should reset
      const allBtn = persistPage.locator('.data-table-toolbar').nth(1).locator('button:has-text("All")')
      await expect(allBtn).toHaveClass(/primary/)
      // Clean up
      await persistPage.close()
      await persistCtx.close()
    })
  })
})
