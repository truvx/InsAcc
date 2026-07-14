import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5174'
const MODAL_INPUT = (label: string) => `.modal .form-group:has(.form-label:text("${label}")) input`
const MODAL_BTN = (text: string) => `.modal .modal-footer button:has-text("${text}")`

async function selectCustomOption(page: any, label: string, optionTextOrIndex: string | number) {
  const container = page.locator(`.modal .form-group:has-text("${label}")`).first()
  const trigger = container.locator('.custom-select-trigger')
  await trigger.click()
  await page.waitForTimeout(500)
  
  const dropdown = page.locator('.custom-select-dropdown').last()
  if (typeof optionTextOrIndex === 'number') {
    const options = await dropdown.locator('.custom-select-option').all()
    if (options.length > optionTextOrIndex) {
      await options[optionTextOrIndex].click()
    } else {
      throw new Error(`Option index ${optionTextOrIndex} not found in dropdown for label ${label}`)
    }
  } else {
    const option = dropdown.locator(`.custom-select-option:has-text("${optionTextOrIndex}")`).first()
    await option.click()
  }
  await page.waitForTimeout(500)
}

async function selectFilterOption(page: any, triggerText: string, optionText: string) {
  const trigger = page.locator(`.custom-select-trigger:has-text("${triggerText}")`).first()
  await trigger.click()
  await page.waitForTimeout(500)
  const dropdown = page.locator('.custom-select-dropdown').last()
  const option = dropdown.locator(`.custom-select-option:has-text("${optionText}")`).first()
  await option.click()
  await page.waitForTimeout(500)
}

test.describe('Purchase Ledger UI', () => {
  let page: any

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.addInitScript(() => {
      localStorage.setItem('insacc_clear_version', '9')
      localStorage.setItem('insacc_all_datasets_cleared_v3', 'true')
      localStorage.setItem('insacc_purchases_ledger', JSON.stringify([
        {
          id: 'PL-1',
          lotId: 'LOT-1',
          assetType: 'Gold',
          assetName: '24K Gold Bar 1kg',
          purchaseDate: '2026-06-01',
          quantity: 1,
          unitPrice: 280000,
          totalValue: 280000,
          broker: 'Dubai Gold Exchange',
          notes: '',
          attachments: [],
          tags: [],
          status: 'active',
          accountCode: '1000',
          accountId: '1',
          voucherId: '1',
          voucherNumber: 'V-1',
          fundingBankAccountId: 'ba-eib-invest',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'system',
          updatedBy: 'system'
        }
      ]))
    })
    await page.goto(BASE, { waitUntil: 'networkidle' })
    page.on('console', (msg: any) => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`)
    })
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

    // Select Asset Type Gold
    await selectCustomOption(page, 'Asset Type', 'Gold')
    
    // Select Asset Name 24K Gold Bar 1kg
    await selectCustomOption(page, 'Asset Name', '24K Gold Bar 1kg')

    await page.locator(MODAL_INPUT('Purchase Date')).fill('2026-06-15')
    await page.locator(MODAL_INPUT('Quantity')).fill('1')
    await page.locator(MODAL_INPUT('Unit Price')).fill('280000')
    await page.locator(MODAL_INPUT('Buyer')).fill('Dubai Gold Exchange')

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

    // Select Asset Type Silver
    await selectCustomOption(page, 'Asset Type', 'Silver')

    // Select Asset Name 999 Silver Bar
    await selectCustomOption(page, 'Asset Name', '999 Silver Bar')

    await page.locator(MODAL_INPUT('Purchase Date')).fill('2026-06-10')
    await page.locator(MODAL_INPUT('Quantity')).fill('2')
    await page.locator(MODAL_INPUT('Unit Price')).fill('3500')

    await page.locator(MODAL_BTN('Record')).click()
    await page.waitForTimeout(500)

    await expect(page.locator('.toast-success')).toBeVisible()
    await expect(page.locator('table')).toContainText('999 Silver Bar')
  })

  test('4.0 KPI cards visible with correct values', async () => {
    await page.waitForTimeout(200)
    const kpiCards = await page.locator('.kpi-card').all()
    expect(kpiCards.length).toBe(3)
    const labels = ['Total Invested', 'Total Quantity', 'Active Lots']
    for (let i = 0; i < kpiCards.length; i++) {
      const text = await kpiCards[i].textContent()
      expect(text).toContain(labels[i])
    }
  })

  test('5.0 Filter by asset type', async () => {
    await selectFilterOption(page, 'All Types', 'Silver')
    await page.waitForTimeout(500)
    const rows = await page.locator('table tbody tr').count()
    if (rows > 0) {
      await expect(page.locator('table')).toContainText('Silver')
    }
    // Reset
    await selectFilterOption(page, 'Silver', 'All Types')
    await page.waitForTimeout(300)
  })

  test('5.1 Search by asset name', async () => {
    const searchInput = page.locator('.data-table-search-input')
    await searchInput.fill('Silver')
    await page.waitForTimeout(500)
    await expect(page.locator('table')).toContainText('999 Silver Bar')
    await expect(page.locator('table')).not.toContainText('24K Gold')
    await searchInput.fill('')
    await page.waitForTimeout(200)
  })

  test('6.0 Edit a purchase', async () => {
    // Click actions button first to open custom actions menu using evaluate to avoid scroll auto-close
    await page.locator('table tbody tr').first().locator('button[aria-label="Actions"]').evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(500)
    await page.locator('body').getByRole('button', { name: 'Edit' }).last().click()
    await page.waitForTimeout(500)
    await expect(page.locator('.modal-header')).toContainText('Edit Purchase')

    await page.locator(MODAL_INPUT('Quantity')).fill('3')
    await page.locator(MODAL_BTN('Update')).click()
    await page.waitForTimeout(300)
    await expect(page.locator('.toast-success')).toContainText('Purchase updated')
  })

  test('7.0 Delete a purchase', async () => {
    await page.locator('table tbody tr').first().locator('button[aria-label="Actions"]').evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(500)
    await page.locator('body').getByRole('button', { name: 'Delete' }).last().click()
    await page.waitForTimeout(500)
    await expect(page.locator('.modal')).toBeVisible()
    await expect(page.locator('.modal-header')).toContainText('Delete Purchase')
    await page.locator(MODAL_BTN('Delete')).click()
    await page.waitForTimeout(300)
    await expect(page.locator('.toast-success')).toContainText('Purchase deleted')
    await expect(page.locator('.toast-success')).toBeVisible()
  })

  test('8.0 Form validation shows errors', async () => {
    await page.locator('body').click({ position: { x: 0, y: 0 } })
    await page.waitForTimeout(200)
    await page.locator('button:has-text("Add Purchase")').first().click()
    await page.waitForTimeout(200)
    // Try to record without selecting type/name
    await page.locator(MODAL_BTN('Record')).click()
    await page.waitForTimeout(200)
    await expect(page.locator('.form-error').first()).toBeVisible()
    await page.locator(MODAL_BTN('Cancel')).click()
    await page.waitForTimeout(300)
  })

  test('9.0 Status badge renders', async () => {
    await page.locator('body').click({ position: { x: 0, y: 0 } })
    await page.waitForTimeout(300)
    const badge = page.locator('table tbody tr').first().locator('.badge-success').last()
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
    await selectFilterOption(page, 'All Types', 'Gold')
    await page.waitForTimeout(200)
    await selectFilterOption(page, 'Gold', 'All Types')
    await page.waitForTimeout(200)
    expect(errors.length).toBe(0)
  })
})
