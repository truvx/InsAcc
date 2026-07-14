import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5174/'

test.describe('PDC Manager Redesign E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Seed initial state with correct keys and migration flags
    await page.addInitScript(() => {
      localStorage.setItem('insacc_clear_version', '9')
      localStorage.setItem('insacc_all_datasets_cleared_v3', 'true')
      localStorage.setItem('insacc_leases_cleared_v1', 'true')
      localStorage.setItem('insacc_inv_bank_ob_zeroed_v4', 'true')
      
      const properties = [
        { id: 'prop-tower', mainCategoryId: 'mc-1', name: 'Al Ameera Tower' },
        { id: 'prop-villa', mainCategoryId: 'mc-2', name: 'Oasis Villa' }
      ]
      localStorage.setItem('insacc_main_categories', JSON.stringify([
        { id: 'mc-1', name: 'Building' },
        { id: 'mc-2', name: 'Villa' }
      ]))
      localStorage.setItem('insacc_hierarchy_properties', JSON.stringify(properties))
      
      const leases = [
        { id: 'lease-101', leaseNumber: 'L-101', tenantId: 't-1', propertyId: 'prop-tower', unitId: 'u-1', startDate: '2026-01-01', endDate: '2026-12-31', monthlyRent: 4000, annualRent: 48000, pdcCount: 12, status: 'Active' },
        { id: 'lease-202', leaseNumber: 'L-202', tenantId: 't-2', propertyId: 'prop-villa', unitId: 'u-2', startDate: '2026-02-01', endDate: '2027-01-31', monthlyRent: 8000, annualRent: 96000, pdcCount: 6, status: 'Active' }
      ]
      localStorage.setItem('insacc_prop_leases', JSON.stringify(leases))

      const tenants = [
        { id: 't-1', name: 'John Doe', phone: '971501112222', email: 'john@example.com' },
        { id: 't-2', name: 'Jane Smith', phone: '971503334444', email: 'jane@example.com' }
      ]
      localStorage.setItem('insacc_prop_tenants', JSON.stringify(tenants))

      const cheques = [
        { id: 'chq-1', leaseId: 'lease-101', slotIndex: 0, chequeNumber: 'CHQ-001', chequeDate: '2026-07-01', dueDate: '2026-07-01', amount: 4000, status: 'Pending', depositedAt: null, clearedAt: null, bouncedAt: null, replacedByChequeId: null, voucherId: null, createdBy: 'user', createdAt: '2026-06-30T12:00:00Z', updatedAt: '2026-06-30T12:00:00Z' },
        { id: 'chq-2', leaseId: 'lease-101', slotIndex: 1, chequeNumber: 'CHQ-002', chequeDate: '2026-08-01', dueDate: '2026-08-01', amount: 4000, status: 'Deposited', depositedAt: '2026-08-01', clearedAt: null, bouncedAt: null, replacedByChequeId: null, voucherId: null, createdBy: 'user', createdAt: '2026-06-30T12:00:00Z', updatedAt: '2026-08-01T12:00:00Z', bankAccountId: 'bank-1' },
        { id: 'chq-3', leaseId: 'lease-101', slotIndex: 2, chequeNumber: 'CHQ-003', chequeDate: '2026-09-01', dueDate: '2026-09-01', amount: 4000, status: 'Cleared', depositedAt: '2026-09-01', clearedAt: '2026-09-02', bouncedAt: null, replacedByChequeId: null, voucherId: 'v-101', createdBy: 'user', createdAt: '2026-06-30T12:00:00Z', updatedAt: '2026-09-02T12:00:00Z', bankAccountId: 'bank-1', clearedVoucherId: 'v-101' },
        { id: 'chq-4', leaseId: 'lease-202', slotIndex: 0, chequeNumber: 'CHQ-201', chequeDate: '2026-07-15', dueDate: '2026-07-15', amount: 16000, status: 'Bounced', depositedAt: '2026-07-15', clearedAt: null, bouncedAt: '2026-07-16', replacedByChequeId: null, voucherId: null, createdBy: 'user', createdAt: '2026-06-30T12:00:00Z', updatedAt: '2026-07-16T12:00:00Z', bankAccountId: 'bank-1', bounceReason: 'Insufficient Funds' }
      ]
      localStorage.setItem('insacc_pdc_cheques', JSON.stringify(cheques))

      const propAccounts = [
        { id: 'bank-1', accountName: 'ADCB Rent Account', accountNumber: '123456789', institution: 'ADCB', currency: 'AED', currentBalance: 500000 }
      ]
      localStorage.setItem('insacc_prop_bank_accounts', JSON.stringify(propAccounts))
    })
    
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Login & Navigate
    await page.fill('input[type="email"]', 'test@test.com')
    await page.fill('input[type="password"]', '1234')
    await page.click('button:has-text("Sign In")')

    const profileCard = page.locator('.ps-card').first()
    await profileCard.waitFor({ state: 'visible', timeout: 10000 })
    await profileCard.click()

    const moduleCard = page.locator('.ms-card').filter({ hasText: /PROPERTIES/i }).first()
    await moduleCard.waitFor({ state: 'visible', timeout: 10000 })
    await moduleCard.click()

    await page.waitForSelector('text=Property Dashboard', { timeout: 15000 })
    
    // Expand Accounts in sidebar if needed and navigate to PDC Manager
    const pdcVisible = await page.getByRole('button', { name: 'PDC Manager', exact: true }).isVisible().catch(() => false)
    if (!pdcVisible) {
      await page.getByRole('button', { name: 'Accounts', exact: true }).click()
      await page.waitForTimeout(500)
    }
    await page.click('text=PDC Manager')
    await page.waitForSelector('.page-title:has-text("PDC Manager")', { timeout: 10000 })
    await page.waitForTimeout(500)
  })

  test('KPIs, segmented status pills and filters layout', async ({ page }) => {
    // 1. Check KPI Row displays the correct 4 cards
    await expect(page.locator('.kpi-card:has-text("Pending")').locator('.kpi-value')).toContainText('1')
    await expect(page.locator('.kpi-card:has-text("Due This Week")').locator('.kpi-value')).toBeVisible()
    await expect(page.locator('.kpi-card:has-text("Cleared")').locator('.kpi-value')).toContainText('1')
    await expect(page.locator('.kpi-card:has-text("Failed / Bounced")').locator('.kpi-value')).toContainText('1')

    // 2. Check Segmented Status Pills counts
    await expect(page.locator('.pdc-pill:has-text("All") .pdc-pill-count')).toContainText('4')
    await expect(page.locator('.pdc-pill:has-text("Pending") .pdc-pill-count')).toContainText('1')
    await expect(page.locator('.pdc-pill:has-text("Deposited") .pdc-pill-count')).toContainText('1')
    await expect(page.locator('.pdc-pill:has-text("Cleared") .pdc-pill-count')).toContainText('1')
    await expect(page.locator('.pdc-pill:has-text("Bounced") .pdc-pill-count')).toContainText('1')

    // 3. Click Pending status pill and verify table row count drops to 1
    await page.locator('.pdc-pill:has-text("Pending")').first().click()
    await page.waitForTimeout(300)
    expect(await page.locator('table tbody tr').count()).toBe(1)
    await expect(page.locator('table tbody tr').first()).toContainText('CHQ-001')

    // 4. Click Deposited status pill
    await page.locator('.pdc-pill:has-text("Deposited")').first().click()
    await page.waitForTimeout(300)
    expect(await page.locator('table tbody tr').count()).toBe(1)
    await expect(page.locator('table tbody tr').first()).toContainText('CHQ-002')

    // Go back to All
    await page.locator('.pdc-pill:has-text("All")').first().click()
    await page.waitForTimeout(300)
    expect(await page.locator('table tbody tr').count()).toBe(4)

    // 5. Test filter search input
    await page.locator('.pdc-filter-search input').fill('Jane')
    await page.waitForTimeout(500)
    expect(await page.locator('table tbody tr').count()).toBe(1)
    await expect(page.locator('table tbody tr').first()).toContainText('CHQ-201')

    // Clear search using input fill
    await page.locator('.pdc-filter-search input').fill('')
    await page.waitForTimeout(300)
    expect(await page.locator('table tbody tr').count()).toBe(4)
  })

  test('3-dot kebab menu actions: View Details modal', async ({ page }) => {
    // Locate the row for CHQ-201 (Jane Smith) and click its kebab button
    const janeRow = page.locator('table tbody tr:has-text("CHQ-201")')
    await janeRow.locator('.pdc-kebab-btn').click()
    await page.waitForTimeout(300)

    // Verify Portal-rendered dropdown options are visible
    const dropdown = page.locator('.pdc-action-menu')
    await expect(dropdown).toBeVisible()
    await expect(dropdown.locator('text=View Details')).toBeVisible()

    // Click View Details
    await dropdown.locator('text=View Details').click()
    await page.waitForTimeout(300)

    // Verify Modal details are correct
    const modal = page.locator('.modal')
    await expect(modal).toBeVisible()
    await expect(modal.locator('.modal-header')).toContainText('Cheque Details')
    await expect(modal.locator('.pdc-detail-row:has-text("Tenant") .pdc-detail-value')).toContainText('Jane Smith')
    await expect(modal.locator('.pdc-detail-row:has-text("Property") .pdc-detail-value')).toContainText('Oasis Villa')
    await expect(modal.locator('.pdc-detail-row:has-text("Amount") .pdc-detail-value')).toContainText('AED 16,000.00')

    // Close Modal
    await modal.locator('button:has-text("Close")').click()
    await page.waitForTimeout(300)
    await expect(modal).not.toBeVisible()
  })

  test('Kebab menu closes on click outside', async ({ page }) => {
    const firstRowKebab = page.locator('table tbody tr').first().locator('.pdc-kebab-btn')
    await firstRowKebab.click()
    await page.waitForTimeout(300)

    const dropdown = page.locator('.pdc-action-menu')
    await expect(dropdown).toBeVisible()

    // Click on page header to close the menu
    await page.click('.page-title:has-text("PDC Manager")')
    await page.waitForTimeout(300)
    await expect(dropdown).not.toBeVisible()
  })

  test('Header actions: Generate PDC success toast', async ({ page }) => {
    // Click Generate PDC
    await page.locator('button:has-text("Generate PDC")').click()
    await page.waitForSelector('.toast-success', { timeout: 5000 })
    await expect(page.locator('.toast-success')).toContainText('PDC cheques check complete')
  })
})
