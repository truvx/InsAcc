import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5174/'
const MODAL_INPUT = (label: string) => `.modal .form-group:has-text("${label}") input`
const MODAL_BTN = (text: string) => `.modal button:has-text("${text}")`

async function selectCustomOption(page: any, label: string, optionIndex: number) {
  const container = page.locator(`.modal .form-group:has-text("${label}")`).first()
  const trigger = container.locator('.custom-select-trigger')
  await trigger.click()
  await page.waitForTimeout(500)
  
  const dropdown = page.locator('.custom-select-dropdown').last()
  const options = await dropdown.locator('.custom-select-option').all()
  if (options.length > optionIndex) {
    await options[optionIndex].click()
  } else {
    throw new Error(`Option index ${optionIndex} not found in dropdown for label ${label}`)
  }
  await page.waitForTimeout(500)
}

async function performLoginAndNavigation(page: any) {
  // Login
  await page.fill('input[type="email"]', 'test@test.com')
  await page.fill('input[type="password"]', '1234')
  await page.click('button:has-text("Sign In")')

  // Select profile
  const profileCard = page.locator('.ps-card').first()
  await profileCard.waitFor({ state: 'visible', timeout: 10000 })
  await profileCard.click()

  // Select Properties module
  const moduleCard = page.locator('.ms-card').filter({ hasText: /PROPERTIES/i }).first()
  await moduleCard.waitFor({ state: 'visible', timeout: 10000 })
  await moduleCard.click()

  // Wait for Property Dashboard
  await page.waitForSelector('text=Property Dashboard', { timeout: 15000 })
  await page.waitForTimeout(1000)
}

test.describe('PDC Schedule Generation & Edit Sync', () => {
  let page: any

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.addInitScript(() => {
      localStorage.setItem('insacc_clear_version', '9')
      localStorage.setItem('insacc_all_datasets_cleared_v3', 'true')
      localStorage.setItem('insacc_leases_cleared_v1', 'true')
      localStorage.setItem('insacc_main_categories', JSON.stringify([
        { id: 'mc-1', name: 'Building' }
      ]))
      localStorage.setItem('insacc_hierarchy_properties', JSON.stringify([
        { id: 'prop-1', mainCategoryId: 'mc-1', name: 'Test Tower' }
      ]))
      localStorage.setItem('insacc_income_categories', JSON.stringify([
        { id: 'ic-1', propertyId: 'prop-1', name: 'Floor 1' }
      ]))
      localStorage.setItem('insacc_customers', JSON.stringify([
        { id: 'c-1', incomeCategoryId: 'ic-1', name: 'Unit 101' }
      ]))
    })
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    await performLoginAndNavigation(page)
  })

  test('1.0 Create Lease with 12 PDCs and Verify Count', async () => {
    // Navigate to Leases page (Lease Management)
    await page.click('text=Lease Management')
    await page.waitForSelector('text=Lease Management', { timeout: 10000 })
    await page.waitForTimeout(500)

    // Click Create Lease
    await page.click('button:has-text("Create Lease")')
    await page.waitForSelector('.modal-header:has-text("Create New Lease")', { timeout: 5000 })

    // Fill form using selectCustomOption helper
    await selectCustomOption(page, 'Property *', 1) // first property option
    await selectCustomOption(page, 'Unit *', 1)     // first unit option
    
    // Dates
    await page.locator(MODAL_INPUT('Start Date')).fill('2026-07-01')
    await page.locator(MODAL_INPUT('End Date')).fill('2027-06-30')
    
    // Rent & Deposit
    await page.locator(MODAL_INPUT('Monthly Rent')).fill('5000')
    await page.locator(MODAL_INPUT('Annual Rent')).fill('60000')
    await page.locator(MODAL_INPUT('Security Deposit')).fill('3000')
    
    // Tenant Details - check Create New Tenant checkbox
    const newTenantCheckbox = page.locator('label:has-text("Create New Tenant") input[type="checkbox"]')
    const isNewTenantChecked = await newTenantCheckbox.isChecked()
    if (!isNewTenantChecked) {
      await newTenantCheckbox.click()
    }
    await page.waitForTimeout(300)
    await page.locator(MODAL_INPUT('Tenant Name')).fill('Test PDC Tenant')
    await page.locator(MODAL_INPUT('Contact Phone')).fill('971501234567')

    // PDC count = 12, frequency = Monthly
    await page.locator(MODAL_INPUT('PDC Cheques Count')).fill('12')
    
    // Check "Generate PDC slots" is checked
    const generateCheckbox = page.locator('label:has-text("Generate PDC slots") input[type="checkbox"]')
    const isGenerateChecked = await generateCheckbox.isChecked()
    if (!isGenerateChecked) {
      await generateCheckbox.click()
    }

    // Submit Lease creation
    await page.click(MODAL_BTN('Create Lease'))
    await page.waitForSelector('.toast-success', { timeout: 10000 })
    await expect(page.locator('.toast-success')).toContainText('Lease created successfully')
    await page.waitForTimeout(1000)

    // Expand Accounts in sidebar if not expanded
    const pdcVisible = await page.getByRole('button', { name: 'PDC Manager', exact: true }).isVisible().catch(() => false)
    if (!pdcVisible) {
      await page.getByRole('button', { name: 'Accounts', exact: true }).click()
      await page.waitForTimeout(500)
    }

    // Navigate to PDC Manager
    await page.click('text=PDC Manager')
    await page.waitForSelector('.page-title:has-text("PDC Manager")', { timeout: 10000 })
    await page.waitForTimeout(1000)

    // Count PDCs in the list
    const rowsCount = await page.locator('table tbody tr').count()
    console.log(`[Test] Total PDC rows visible in PDC Manager after creation: ${rowsCount}`)
    expect(rowsCount).toBe(12)
  })

  test('2.0 Reopening the page does not generate additional PDCs', async () => {
    // Refresh/reload page
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Log in again since reload logs out
    await performLoginAndNavigation(page)

    // Expand Accounts in sidebar if not expanded
    const pdcVisible = await page.getByRole('button', { name: 'PDC Manager', exact: true }).isVisible().catch(() => false)
    if (!pdcVisible) {
      await page.getByRole('button', { name: 'Accounts', exact: true }).click()
      await page.waitForTimeout(500)
    }

    // Navigate to PDC Manager
    await page.click('text=PDC Manager')
    await page.waitForSelector('.page-title:has-text("PDC Manager")', { timeout: 10000 })
    await page.waitForTimeout(1000)

    const rowsCount = await page.locator('table tbody tr').count()
    console.log(`[Test] Total PDC rows visible in PDC Manager after reload: ${rowsCount}`)
    expect(rowsCount).toBe(12)
  })

  test('3.0 Editing a Lease updates the existing schedule instead of appending', async () => {
    // Navigate back to Leases
    await page.click('text=Lease Management')
    await page.waitForSelector('text=Lease Management', { timeout: 10000 })
    await page.waitForTimeout(1000)

    // Click edit on the first lease
    await page.locator('button[title="Edit Lease"]').first().click()
    await page.waitForSelector('.modal-header:has-text("Edit Lease Details")', { timeout: 5000 })

    // Change PDC count to 6
    await page.locator(MODAL_INPUT('PDC Cheques Count')).fill('6')

    // Click Update
    await page.click(MODAL_BTN('Update'))
    await page.waitForSelector('.toast-success', { timeout: 10000 })
    await expect(page.locator('.toast-success')).toContainText('Lease updated')
    await page.waitForTimeout(1000)

    // Expand Accounts in sidebar if not expanded
    const pdcVisible = await page.getByRole('button', { name: 'PDC Manager', exact: true }).isVisible().catch(() => false)
    if (!pdcVisible) {
      await page.getByRole('button', { name: 'Accounts', exact: true }).click()
      await page.waitForTimeout(500)
    }

    // Navigate to PDC Manager
    await page.click('text=PDC Manager')
    await page.waitForSelector('.page-title:has-text("PDC Manager")', { timeout: 10000 })
    await page.waitForTimeout(1000)

    // Count PDCs in the list
    const rowsCount = await page.locator('table tbody tr').count()
    console.log(`[Test] Total PDC rows visible in PDC Manager after editing lease to 6 PDCs: ${rowsCount}`)
    expect(rowsCount).toBe(6)
  })
})
