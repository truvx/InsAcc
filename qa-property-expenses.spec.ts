import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5174'
const MODAL_BTN = (text: string) => `.modal .modal-footer button:has-text("${text}")`

async function nav(page: any, label: string) {
  const item = page.getByRole('button', { name: label, exact: true })
  if (!(await item.isVisible().catch(() => false))) {
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

test.describe('Property Expenses Actions E2E Tests', () => {
  test('Pending expense actions flow: Mark as Paid, Duplicate, and Delete', async ({ page }) => {
    // Setup clean state with seeded property and pending expense
    await page.addInitScript(() => {
      localStorage.setItem('insacc_clear_version', '9')
      localStorage.setItem('insacc_all_datasets_cleared_v3', 'true')
      
      const seedProperty = {
        id: 'prop-seed-1',
        name: 'Marina Heights',
        code: 'MH',
        unitsCount: 1,
        address: 'Dubai Marina',
        ownerName: 'Sameer Ishaq Harmoudi',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      localStorage.setItem('insacc_prop_properties', JSON.stringify([seedProperty]))

      const seedExpense = {
        id: 'exp-seed-1',
        expenseNo: 'EXP-0001',
        date: '2026-06-10',
        propertyId: 'prop-seed-1',
        unitId: null,
        category: 'Building Maintenance',
        paidTo: 'Al Futtaim Engineering',
        description: 'AC Servicing',
        amount: 2500,
        tax: 125,
        totalAmount: 2625,
        paymentMethod: 'Bank Transfer',
        bankAccountId: 'pt-dib-current',
        paymentMode: 'Bank Transfer',
        paymentChannel: 'Bank Account',
        status: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      localStorage.setItem('insacc_prop_expenses', JSON.stringify([seedExpense]))
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
    
    // Choose Property module (using text=Properties since the button says PROPERTIES MANAGEMENT)
    await page.waitForSelector('text=Properties', { timeout: 10000 })
    await page.click('text=Properties')
    
    await page.waitForSelector('text=Property Dashboard', { timeout: 15000 })
    await page.waitForTimeout(500)

    // Navigate to Expenses page
    await nav(page, 'Expenses')
    await page.waitForSelector('table tbody tr', { timeout: 10000 })
    
    // Verify the seed pending expense is loaded
    const expenseRow = page.locator('table tbody tr').first()
    await expect(expenseRow).toContainText('EXP-0001')
    await expect(expenseRow).toContainText('Pending')

    // Click Actions kebab button to open ActionsMenu using evaluate (avoids scroll auto-close)
    const kebab = expenseRow.locator('button[aria-label="Actions"]')
    await kebab.evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(300)

    // Locate actions directly on page
    await expect(page.locator('button:has-text("Mark as Paid")')).toBeVisible()
    await expect(page.locator('button:has-text("Duplicate")')).toBeVisible()

    // 1. Test Mark as Paid
    await page.click('button:has-text("Mark as Paid")')
    await page.waitForTimeout(500)
    await expect(page.locator('.toast-success')).toBeVisible()
    
    // The status should now be updated to Paid
    await expect(expenseRow).toContainText('Paid')

    // Click Actions kebab again and verify "Mark as Paid" is no longer visible
    await kebab.evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(300)
    await expect(page.locator('button:has-text("Mark as Paid")')).toHaveCount(0)

    // 2. Test Duplicate
    await page.click('button:has-text("Duplicate")')
    await page.waitForTimeout(500)
    await expect(page.locator('.toast-success')).toBeVisible()

    // A new row with EXP-0002 should now be visible in the table
    const firstRow = page.locator('table tbody tr').first()
    await expect(firstRow).toContainText('EXP-0002')

    // 3. Test Delete
    const secondRow = page.locator('table tbody tr').nth(1) // this is the original EXP-0001
    await secondRow.locator('button[aria-label="Actions"]').evaluate((el: HTMLElement) => el.click())
    await page.waitForTimeout(300)
    await page.click('button:has-text("Delete")')
    await page.waitForTimeout(300)

    // Confirm dialog should appear
    await page.click('button:has-text("Delete")')
    await page.waitForTimeout(500)
    await expect(page.locator('.toast-success')).toBeVisible()

    // EXP-0001 should be removed
    const remainingRows = page.locator('table tbody tr')
    await expect(remainingRows).toHaveCount(1)
    await expect(remainingRows.first()).toContainText('EXP-0002')
  })
})
