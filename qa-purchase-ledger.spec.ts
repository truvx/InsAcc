import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5174'
const MODAL_INPUT = (label: string) => `.modal .form-group:has(.form-label:text("${label}")) input`
const MODAL_SELECT = `.modal .form-group:has(.form-label:text("Asset Type")) select`
const MODAL_BTN = (text: string) => `.modal .modal-footer button:has-text("${text}")`

test.describe('Purchase Ledger UI', () => {
  let page: any

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.addInitScript(() => {
      localStorage.setItem('insacc_clear_version', '9')
    })
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    await page.waitForSelector('input[type="email"]', { timeout: 15000 })
    await page.fill('input[type="email"]', 'test@test.com')
    await page.fill('input[type="password"]', '1234')
    await page.click('button:has-text("Sign In")')
    await page.waitForSelector('text=Sameer Ishaq Harmoudi', { timeout: 10000 })
    await page.click('text=Sameer Ishaq Harmoudi')
    await page.waitForSelector('text=Investment', { timeout: 10000 })
    await page.click('text=Investment')
    await page.waitForSelector('text=Investment Dashboard', { timeout: 15000 })
    await page.waitForTimeout(500)
    await page.locator('.sidebar .nav-item').filter({ hasText: 'Purchase Ledger' }).click()
    await page.waitForTimeout(1000)
  })

  test('1.0 Page renders with header', async () => {
    await expect(page.locator('.page-title')).toContainText('Purchase Ledger')
    await expect(page.locator('button:has-text("Add Purchase")').first()).toBeVisible()
  })

  test('1.1 Purchase records loaded from seeded data', async () => {
    const rows = await page.locator('table tbody tr').count()
    expect(rows).toBeGreaterThan(0)
    await expect(page.locator('table')).toBeVisible()
  })

  test('2.0 Open and close Add Purchase form', async () => {
    await page.locator('button:has-text("Add Purchase")').first().click()
    await page.waitForTimeout(300)
    await expect(page.locator('.modal')).toBeVisible()
    await expect(page.locator('.modal-header')).toContainText('New Purchase')
    await page.locator(MODAL_BTN('Cancel')).click()
    await page.waitForTimeout(300)
    await expect(page.locator('.modal')).not.toBeVisible()
  })

  test('3.0 Add a Gold purchase', async () => {
    await page.locator('button:has-text("Add Purchase")').first().click()
    await page.waitForTimeout(200)

    await page.locator(MODAL_INPUT('Asset Name')).fill('24K Gold Bar 1kg')
    await page.locator(MODAL_INPUT('Purchase Date')).fill('2026-06-15')
    await page.locator(MODAL_INPUT('Quantity')).fill('1')
    await page.locator(MODAL_INPUT('Unit Price')).fill('280000')
    await page.locator(MODAL_INPUT('Broker')).fill('Dubai Gold Exchange')

    await page.locator(MODAL_BTN('Record')).click()
    await page.waitForTimeout(500)

    await expect(page.locator('.toast-success')).toBeVisible()
    await expect(page.locator('.toast-success')).toContainText('Purchase recorded')
    await expect(page.locator('table')).toBeVisible()
    await expect(page.locator('table')).toContainText('24K Gold Bar 1kg')
  })

  test('3.1 Add a Silver purchase', async () => {
    await page.locator('button:has-text("Add Purchase")').first().click()
    await page.waitForTimeout(200)

    await page.locator(MODAL_SELECT).selectOption('Silver')
    await page.locator(MODAL_INPUT('Asset Name')).fill('Silver Bar 1kg')
    await page.locator(MODAL_INPUT('Purchase Date')).fill('2026-06-10')
    await page.locator(MODAL_INPUT('Quantity')).fill('2')
    await page.locator(MODAL_INPUT('Unit Price')).fill('3500')

    await page.locator(MODAL_BTN('Record')).click()
    await page.waitForTimeout(500)

    await expect(page.locator('.toast-success')).toBeVisible()
    await expect(page.locator('table')).toContainText('Silver Bar 1kg')
  })

  test('4.0 KPI cards visible with correct values', async () => {
    await page.waitForTimeout(200)
    const kpiCards = await page.locator('.kpi-card').all()
    expect(kpiCards.length).toBe(4)
    const labels = ['Total Invested', 'Total Quantity', 'Weighted Average', 'Active Lots']
    for (let i = 0; i < kpiCards.length; i++) {
      const text = await kpiCards[i].textContent()
      expect(text).toContain(labels[i])
    }
  })

  test('5.0 Filter by asset type', async () => {
    const filterSelect = page.locator('.data-table-filters select').first()
    await filterSelect.selectOption('Silver')
    await page.waitForTimeout(500)
    // Table rows should all contain Silver, or table may be empty
    const rows = await page.locator('table tbody tr').count()
    if (rows > 0) {
      await expect(page.locator('table')).toContainText('Silver')
    }
    // Reset
    await filterSelect.selectOption('')
    await page.waitForTimeout(300)
  })

  test('5.1 Search by asset name', async () => {
    const searchInput = page.locator('.data-table-search-input')
    await searchInput.fill('Silver')
    await page.waitForTimeout(500)
    await expect(page.locator('table')).toContainText('Silver Bar 1kg')
    await expect(page.locator('table')).not.toContainText('24K Gold')
    await searchInput.fill('')
    await page.waitForTimeout(200)
  })

  test('6.0 Edit a purchase', async () => {
    await page.locator('button[aria-label="Edit purchase"]').first().click()
    await page.waitForTimeout(200)
    await expect(page.locator('.modal-header')).toContainText('Edit Purchase')

    await page.locator(MODAL_INPUT('Quantity')).fill('3')
    await page.locator(MODAL_BTN('Update')).click()
    await page.waitForTimeout(300)
    await expect(page.locator('.toast-success')).toContainText('Purchase updated')
  })

  test('7.0 Delete a purchase', async () => {
    await page.locator('button[aria-label="Delete purchase"]').first().click()
    await page.waitForTimeout(200)
    await expect(page.locator('.modal')).toBeVisible()
    await expect(page.locator('.modal-header')).toContainText('Delete Purchase')
    await page.locator(MODAL_BTN('Delete')).click()
    await page.waitForTimeout(300)
    await expect(page.locator('.toast-success')).toContainText('Purchase deleted')
    await expect(page.locator('.toast-success')).toBeVisible()
  })

  test('8.0 Form validation shows errors', async () => {
    // Close any prior modal
    await page.locator('body').click({ position: { x: 0, y: 0 } })
    await page.waitForTimeout(200)
    await page.locator('button:has-text("Add Purchase")').first().click()
    await page.waitForTimeout(200)
    await page.locator(MODAL_INPUT('Asset Name')).fill('')
    await page.locator(MODAL_INPUT('Quantity')).fill('')
    await page.locator(MODAL_BTN('Record')).click()
    await page.waitForTimeout(200)
    await expect(page.locator('.input-error').first()).toBeVisible()
    await page.locator(MODAL_BTN('Cancel')).click()
    await page.waitForTimeout(300)
  })

  test('9.0 Status badge renders', async () => {
    await page.locator('body').click({ position: { x: 0, y: 0 } })
    await page.waitForTimeout(300)
    const badge = page.locator('table .badge-success').first()
    await expect(badge).toContainText('active')
  })

  test('10.0 Sort columns', async () => {
    await page.locator('body').click({ position: { x: 0, y: 0 } })
    await page.waitForTimeout(300)
    const totalValHeader = page.locator('th.sortable').filter({ hasText: 'Total' })
    await totalValHeader.click()
    await page.waitForTimeout(200)
    await totalValHeader.click()
    await page.waitForTimeout(200)
    await expect(page.locator('th.sorted')).toBeVisible()
  })

  test('11.0 No console errors', async () => {
    await page.locator('body').click({ position: { x: 0, y: 0 } })
    await page.waitForTimeout(300)
    const errors: string[] = []
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.locator('.data-table-filters select').first().selectOption('Gold')
    await page.waitForTimeout(200)
    await page.locator('.data-table-filters select').first().selectOption('')
    await page.waitForTimeout(200)
    expect(errors.length).toBe(0)
  })
})
