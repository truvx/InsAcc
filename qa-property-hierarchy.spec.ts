import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5174'

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

// Click the toggle arrow button on a tree row containing the given text
async function expandRow(page: any, text: string) {
  const row = page.locator(`.tree-row:has-text("${text}")`).first()
  const arrow = row.locator('button').first()
  await arrow.click()
  await page.waitForTimeout(300)
}

test.describe('Property Hierarchy Tree E2E Tests', () => {
  test('Hierarchy tree: expand, collapse, search, add, edit, delete', async ({ page }) => {
    // Seed hierarchy data
    await page.addInitScript(() => {
      localStorage.setItem('insacc_clear_version', '9')
      localStorage.setItem('insacc_all_datasets_cleared_v3', 'true')

      const mainCategories = [
        { id: 'mc-building', name: 'Building' },
        { id: 'mc-villa', name: 'Villa' },
      ]
      localStorage.setItem('insacc_main_categories', JSON.stringify(mainCategories))

      const hierarchyProperties = [
        { id: 'prop-fatma', mainCategoryId: 'mc-building', name: 'Fatma Ibrahim Moosa - Ajman' },
        { id: 'prop-b2', mainCategoryId: 'mc-building', name: 'Building 2' },
      ]
      localStorage.setItem('insacc_hierarchy_properties', JSON.stringify(hierarchyProperties))

      const incomeCategories = [
        { id: 'ic-unit-rent', propertyId: 'prop-fatma', name: 'Unit Rent' },
        { id: 'ic-shop-rent', propertyId: 'prop-fatma', name: 'Shop Rent' },
        { id: 'ic-b2-unit', propertyId: 'prop-b2', name: 'Unit Rent' },
      ]
      localStorage.setItem('insacc_income_categories', JSON.stringify(incomeCategories))

      const customers = [
        { id: 'cust-101', incomeCategoryId: 'ic-unit-rent', name: 'unit 101 Ajman' },
        { id: 'cust-102', incomeCategoryId: 'ic-unit-rent', name: 'unit 102 Ajman' },
        { id: 'cust-shop1', incomeCategoryId: 'ic-shop-rent', name: 'Shop 1 Ajman' },
      ]
      localStorage.setItem('insacc_customers', JSON.stringify(customers))

      // Clear any persisted expanded state from previous runs
      localStorage.removeItem('insacc_hierarchy_expanded_v2')
    })

    page.on('console', (msg: any) => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`)
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

    // Choose Property module
    await page.waitForSelector('text=Properties', { timeout: 10000 })
    await page.click('text=Properties')

    await page.waitForSelector('text=Property Dashboard', { timeout: 15000 })
    await page.waitForTimeout(500)

    // Navigate to Properties hierarchy page
    await nav(page, 'Properties')
    await page.waitForTimeout(500)

    // ——— 1. Verify top-level categories are visible ———
    await expect(page.locator('.tree-row:has-text("Building")').first()).toBeVisible()
    await expect(page.locator('.tree-row:has-text("Villa")')).toBeVisible()

    // Verify dynamic counts: Building shows "2 Buildings"
    await expect(page.locator('text=2 Buildings')).toBeVisible()

    // ——— 2. Test Expand/Collapse ———
    // Expand Building
    await expandRow(page, 'Building')
    await expect(page.locator('text=Fatma Ibrahim Moosa - Ajman')).toBeVisible()
    await expect(page.locator('.tree-row:has-text("Building 2")')).toBeVisible()

    // Expand Fatma
    await expandRow(page, 'Fatma Ibrahim Moosa')
    await expect(page.locator('.tree-row:has-text("Unit Rent")').first()).toBeVisible()
    await expect(page.locator('.tree-row:has-text("Shop Rent")').first()).toBeVisible()

    // Expand Unit Rent under Fatma to see customers
    await expandRow(page, 'Unit Rent')
    await expect(page.locator('text=unit 101 Ajman')).toBeVisible()
    await expect(page.locator('text=unit 102 Ajman')).toBeVisible()

    // Collapse Building — children should hide but Villa stays visible
    await expandRow(page, 'Building')
    await expect(page.locator('text=Fatma Ibrahim Moosa - Ajman')).not.toBeVisible()
    await expect(page.locator('.tree-row:has-text("Villa")')).toBeVisible()

    // ——— 3. Test Search auto-expand ———
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('unit 101')
    await page.waitForTimeout(500)

    // Search should auto-expand the path: Building → Fatma → Unit Rent → unit 101
    await expect(page.locator('text=unit 101 Ajman')).toBeVisible()
    // The matched text should be highlighted with <mark>
    await expect(page.locator('mark')).toBeVisible()

    // ——— 4. Test Add Customer (while search is active, clear it first) ———
    await searchInput.fill('')
    await page.waitForTimeout(300)

    // After clearing search, manually expand the tree fresh
    // Building was collapsed before, so expand it again
    await expandRow(page, 'Building')
    await page.waitForTimeout(200)
    // Fatma was expanded before collapse, toggling it now should collapse it; 
    // but since Building was collapsed AND Fatma was independently expanded,
    // after re-expanding Building, Fatma should be visible and expanded.
    // Let's verify: if Fatma's children are visible, skip toggling
    const unitRentVisible = await page.locator('.tree-row:has-text("Unit Rent")').first().isVisible().catch(() => false)
    if (!unitRentVisible) {
      await expandRow(page, 'Fatma Ibrahim Moosa')
    }
    const custVisible = await page.locator('text=unit 101 Ajman').isVisible().catch(() => false)
    if (!custVisible) {
      await expandRow(page, 'Unit Rent')
    }

    // Click "Add customer" on Unit Rent row
    const unitRentRow = page.locator('.tree-row:has-text("Unit Rent")').first()
    await unitRentRow.hover()
    await page.waitForTimeout(200)
    await unitRentRow.locator('button[title="Add customer"]').click()
    await page.waitForTimeout(300)

    // Fill modal
    await page.fill('input[placeholder="Enter name"]', 'unit 103 Ajman')
    await page.click('button:has-text("Save")')
    await page.waitForTimeout(300)

    // Verify new customer appears
    await expect(page.locator('text=unit 103 Ajman')).toBeVisible()

    // ——— 5. Test Edit Customer ———
    const cust103Row = page.locator('.tree-row:has-text("unit 103 Ajman")')
    await cust103Row.hover()
    await page.waitForTimeout(200)
    await cust103Row.locator('button[title="Edit"]').click()
    await page.waitForTimeout(300)

    const editInput = page.locator('input[placeholder="Enter name"]')
    await editInput.fill('unit 103 RENAMED')
    await page.click('button:has-text("Save")')
    await page.waitForTimeout(300)

    await expect(page.locator('text=unit 103 RENAMED')).toBeVisible()

    // ——— 6. Test Delete Customer ———
    const renamedRow = page.locator('.tree-row:has-text("unit 103 RENAMED")')
    await renamedRow.hover()
    await page.waitForTimeout(200)
    await renamedRow.locator('button[title="Delete"]').click()
    await page.waitForTimeout(300)

    // Confirm deletion
    await page.click('button:has-text("Delete")')
    await page.waitForTimeout(300)

    await expect(page.locator('text=unit 103 RENAMED')).not.toBeVisible()
    await expect(page.locator('text=unit 101 Ajman')).toBeVisible()
    await expect(page.locator('text=unit 102 Ajman')).toBeVisible()

    // ——— 7. Verify correct icons ———
    const buildingRow = page.locator('.tree-row:has-text("Building")').first()
    await expect(buildingRow.locator('text=🏢')).toBeVisible()

    const fatmaRow = page.locator('.tree-row:has-text("Fatma Ibrahim Moosa")')
    await expect(fatmaRow.locator('text=🏠')).toBeVisible()

    await expect(unitRentRow.locator('text=💰')).toBeVisible()

    const custRow = page.locator('.tree-row:has-text("unit 101 Ajman")')
    await expect(custRow.locator('text=👤')).toBeVisible()
  })
})
