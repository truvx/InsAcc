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

async function nav(page: any, label: string) {
  const item = page.getByRole('button', { name: label, exact: true })
  if (!(await item.isVisible().catch(() => false))) {
    // If not visible, expand possible parent categories
    const parents = ['Financial Sheets', 'Accounts', 'Settings']
    for (const p of parents) {
      const pBtn = page.getByRole('button', { name: p, exact: true })
      if (await pBtn.isVisible().catch(() => false)) {
        await pBtn.click()
        await page.waitForTimeout(300)
      }
    }
  }
  await item.click()
  await page.waitForTimeout(500)
}

test.describe('Additional Acquisition Costs E2E Tests', () => {
  test('Complete purchase, verify P&L, edit costs, and delete workflow', async ({ page }) => {
    // Setup and clean state
    await page.addInitScript(() => {
      localStorage.setItem('insacc_clear_version', '9')
      localStorage.setItem('insacc_all_datasets_cleared_v3', 'true')
    })
    page.on('console', (msg: any) => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`)
    })
    page.on('pageerror', (err: any) => {
      console.log(`[Browser PageError] ${err.message}`)
    })
    await page.goto(BASE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)

    // Login
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

    // =========================================================================
    // Step 1: Create Purchase with Additional Acquisition Costs
    // =========================================================================
    await nav(page, 'Purchase Ledger')
    await page.waitForTimeout(500)

    // Open add form
    await page.click('button:has-text("Add Purchase")')
    await page.waitForTimeout(300)

    // Select Asset Type
    await selectCustomOption(page, 'Asset Type', 'Gold')
    // Select Asset Name
    await selectCustomOption(page, 'Asset Name', '24K Gold Bar 1kg')

    // Fill quantities and prices
    await page.fill(MODAL_INPUT('Quantity'), '2')
    await page.fill(MODAL_INPUT('Unit Price'), '50000')

    // Add VAT/Purchase Input VAT Expense
    await page.click('button:has-text("Add Expense")')
    await page.waitForTimeout(200)
    
    // Choose Expense Type in first row
    const row1 = page.locator('.modal').locator('div[style*="display: grid"]').first()
    await row1.locator('.custom-select-trigger').click()
    await page.waitForTimeout(200)
    await page.locator('.custom-select-dropdown').last().locator('.custom-select-option:has-text("Purchase Input VAT Expense")').first().click()
    await page.waitForTimeout(200)
    await row1.locator('input[placeholder*="VAT/Brokerage"]').fill('VAT 5%')
    await row1.locator('input[placeholder="0.00"]').fill('5000')

    // Add Brokerage Fee
    await page.click('button:has-text("Add Expense")')
    await page.waitForTimeout(200)
    
    const row2 = page.locator('.modal').locator('div[style*="display: grid"]').last()
    await row2.locator('.custom-select-trigger').click()
    await page.waitForTimeout(200)
    await page.locator('.custom-select-dropdown').last().locator('.custom-select-option:has-text("Brokerage Fees")').first().click()
    await page.waitForTimeout(200)
    await row2.locator('input[placeholder*="VAT/Brokerage"]').fill('Dealer fee')
    await row2.locator('input[placeholder="0.00"]').fill('1500')

    // Verify dynamic totals calculation
    const commodityPriceLoc = page.locator('span:has-text("Commodity Price:") + span')
    const addCostsTotalLoc = page.locator('span:has-text("+ Additional Costs:") + span')
    const totalPurchaseCostLoc = page.locator('span:has-text("Total Purchase Cost:") + span')

    await expect(commodityPriceLoc).toContainText('100,000')
    await expect(addCostsTotalLoc).toContainText('6,500')
    await expect(totalPurchaseCostLoc).toContainText('106,500')

    // Submit form
    await page.click(MODAL_BTN('Record'))
    await page.waitForTimeout(500)
    await expect(page.locator('.toast-success')).toBeVisible()

    // =========================================================================
    // Step 2: Verify P&L and Bank Balance updates
    // =========================================================================
    // Check Profit & Loss statement
    await nav(page, 'Profit & Loss')
    await page.waitForTimeout(500)

    // Expect to see Purchase Input VAT Expense (5,000) and Brokerage Fees (1,500)
    const commodityTaxRow = page.locator('table tbody tr:has-text("Purchase Input VAT Expense")')
    const brokerageFeesRow = page.locator('table tbody tr:has-text("Brokerage Fees")')
    
    await expect(commodityTaxRow).toContainText('5,000')
    await expect(brokerageFeesRow).toContainText('1,500')

    // Check Bank Accounts ledger balance
    await nav(page, 'Bank Accounts')
    await page.waitForTimeout(500)

    // Seed EIB balance was 0, total payment was 106,500, so ledger balance should be -106,500
    const bankBalance = page.locator('.kpi-card:has-text("Total Balance") .kpi-value')
    await expect(bankBalance).toContainText('-106,500')

    // =========================================================================
    // Step 3: Edit Purchase and update costs
    // =========================================================================
    // Return to Purchase Ledger
    await nav(page, 'Purchase Ledger')
    await page.waitForSelector('table tbody tr', { timeout: 10000 })
    await page.waitForTimeout(500)

    // Edit the purchase row
    await page.locator('table tbody tr').first().locator('button[aria-label="Actions"]').evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(500)
    await page.locator('body').getByRole('button', { name: 'Edit' }).last().click()
    await page.waitForTimeout(500)

    // Remove the Brokerage Fees row (second cost row)
    const row2Edit = page.locator('.modal').locator('div[style*="display: grid"]').last()
    await row2Edit.locator('button[title="Remove expense line"]').click()
    await page.waitForTimeout(200)

    // Change Purchase Input VAT Expense amount to 3000
    const row1Edit = page.locator('.modal').locator('div[style*="display: grid"]').first()
    await row1Edit.locator('input[placeholder="0.00"]').fill('3000')

    // Save
    await page.click(MODAL_BTN('Update'))
    await page.waitForTimeout(500)
    await expect(page.locator('.toast-success')).toBeVisible()

    // Verify in P&L
    await nav(page, 'Profit & Loss')
    await page.waitForTimeout(500)

    const commodityTaxRow2 = page.locator('table tbody tr:has-text("Purchase Input VAT Expense")')
    const brokerageFeesRow2 = page.locator('table tbody tr:has-text("Brokerage Fees")')
    
    await expect(commodityTaxRow2).toContainText('3,000')
    // Brokerage fees row remains in list, but must show 0.00 balance
    await expect(brokerageFeesRow2).toContainText('0.00')

    // Verify Bank account balance is updated to -103,000
    await nav(page, 'Bank Accounts')
    await page.waitForTimeout(500)
    const bankBalance2 = page.locator('.kpi-card:has-text("Total Balance") .kpi-value')
    await expect(bankBalance2).toContainText('-103,000')

    // =========================================================================
    // Step 4: Delete purchase and reverse all ledger/bank impacts
    // =========================================================================
    // Return to Purchase Ledger
    await nav(page, 'Purchase Ledger')
    await page.waitForSelector('table tbody tr', { timeout: 10000 })
    await page.waitForTimeout(500)

    // Delete purchase row
    await page.locator('table tbody tr').first().locator('button[aria-label="Actions"]').evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(500)
    await page.locator('body').getByRole('button', { name: 'Delete' }).last().click()
    await page.waitForTimeout(500)
    await page.click('button:has-text("Delete")')
    await page.waitForTimeout(500)
    await expect(page.locator('.toast-success')).toBeVisible()

    // Verify P&L shows 0.00 for both expenses
    await nav(page, 'Profit & Loss')
    await page.waitForTimeout(500)
    const commodityTaxRow3 = page.locator('table tbody tr:has-text("Purchase Input VAT Expense")')
    const brokerageFeesRow3 = page.locator('table tbody tr:has-text("Brokerage Fees")')
    await expect(commodityTaxRow3).toContainText('0.00')
    await expect(brokerageFeesRow3).toContainText('0.00')

    // Verify Bank balance returned to 0
    await nav(page, 'Bank Accounts')
    await page.waitForTimeout(500)
    const bankBalance3 = page.locator('.kpi-card:has-text("Total Balance") .kpi-value')
    await expect(bankBalance3).toContainText('AED 0')
  })
})
