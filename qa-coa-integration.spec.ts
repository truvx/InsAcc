import { test, expect, Page } from '@playwright/test'

const BASE = 'http://localhost:5174'

async function login(page: Page) {
  await page.goto(BASE)
  await page.waitForTimeout(1500)
  const emailTab = page.locator('.login-tab').filter({ hasText: /email/i }).first()
  if (await emailTab.isVisible({ timeout: 2000 }).catch(() => false)) await emailTab.click()
  const emailField = page.locator('input[type="email"]')
  if (await emailField.isVisible({ timeout: 1000 }).catch(() => false)) await emailField.fill('admin@insacc.com')
  await page.locator('input[type="password"]').fill('1234')
  await page.locator('button.login-signin-btn').click()
  await page.waitForTimeout(1000)
}

async function selectProfile(page: Page) {
  const card = page.locator('.ps-card').first()
  if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
    await card.click()
    await page.waitForTimeout(800)
  }
}

async function selectModule(page: Page, mod: 'investment' | 'property') {
  const text = mod === 'investment' ? 'INVESTMENT' : 'PROPERTIES'
  const card = page.locator('.ms-card').filter({ hasText: new RegExp(text, 'i') }).first()
  if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
    await card.click()
    await page.waitForTimeout(1200)
  }
}

async function nav(page: Page, label: string) {
  const item = page.getByRole('button', { name: label, exact: true })
  await item.waitFor({ state: 'visible', timeout: 8000 })
  await item.click()
  await page.waitForTimeout(800)
}

async function expandAccounts(page: Page) {
  const rvVisible = await page.getByRole('button', { name: 'Receipt Voucher', exact: true }).isVisible().catch(() => false)
  if (!rvVisible) {
    await page.getByRole('button', { name: 'Accounts', exact: true }).click()
    await page.waitForTimeout(500)
  }
}

test.describe('Chart of Accounts Integration Tests', () => {
  test('New Asset/Income accounts dynamically map to appropriate financial reports', async ({ page }) => {
    // Seed base clean setup
    await page.addInitScript(() => {
      localStorage.setItem('insacc_clear_version', '9')
      localStorage.setItem('insacc_all_datasets_cleared_v3', 'true')
    })

    page.on('console', (msg: any) => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`)
    })

    await login(page)
    await selectProfile(page)
    await selectModule(page, 'investment')

    await expandAccounts(page)
    await nav(page, 'Chart of Accounts')
    await page.waitForTimeout(500)

    // ——— 1. Create a New Asset Account ———
    await page.click('button:has-text("Add Account")')
    await page.waitForSelector('text=Add New Account')

    await page.fill('input[placeholder="e.g. 112001"]', '1255')
    await page.fill('input[placeholder="e.g. Operating Bank Account"]', 'E2E Test Asset Account')
    
    // Select Parent Account = Assets
    const parentSelect = page.locator('.custom-select-container', { hasText: 'Parent Account' })
    await parentSelect.locator('.custom-select-trigger').click()
    await page.locator('.custom-select-option', { hasText: '1000 — Assets' }).first().click()

    // Create
    await page.click('button:has-text("Create")')
    await page.waitForTimeout(800)

    // Verify it exists in Chart of Accounts table
    await expect(page.locator('text=E2E Test Asset Account')).toBeVisible()

    // ——— 2. Verify Asset Account in Trial Balance ———
    await nav(page, 'Trial Balance')
    await page.waitForTimeout(500)
    await expect(page.locator('text=E2E Test Asset Account')).toBeVisible()

    // ——— 3. Verify Asset Account in Balance Sheet ———
    await nav(page, 'Balance Sheet')
    await page.waitForTimeout(500)
    await expect(page.locator('text=E2E Test Asset Account')).toBeVisible()

    // ——— 4. Verify Asset Account is NOT in Profit & Loss ———
    await nav(page, 'Profit & Loss')
    await page.waitForTimeout(500)
    await expect(page.locator('text=E2E Test Asset Account')).not.toBeVisible()

    // ——— 5. Create a New Income Account ———
    await nav(page, 'Chart of Accounts')
    await page.waitForTimeout(500)
    await page.click('button:has-text("Add Account")')
    await page.waitForSelector('text=Add New Account')

    await page.fill('input[placeholder="e.g. 112001"]', '4055')
    await page.fill('input[placeholder="e.g. Operating Bank Account"]', 'E2E Test Income Account')
    
    // Select Parent Account = Revenue
    const parentSelect2 = page.locator('.custom-select-container', { hasText: 'Parent Account' })
    await parentSelect2.locator('.custom-select-trigger').click()
    await page.locator('.custom-select-option', { hasText: '4000 — Revenue' }).first().click()

    // Create
    await page.click('button:has-text("Create")')
    await page.waitForTimeout(800)

    // Verify it exists in Chart of Accounts table
    await expect(page.locator('text=E2E Test Income Account')).toBeVisible()

    // ——— 6. Verify Income Account in Trial Balance ———
    await nav(page, 'Trial Balance')
    await page.waitForTimeout(500)
    await expect(page.locator('text=E2E Test Income Account')).toBeVisible()

    // ——— 7. Verify Income Account in Profit & Loss ———
    await nav(page, 'Profit & Loss')
    await page.waitForTimeout(500)
    await expect(page.locator('text=E2E Test Income Account')).toBeVisible()

    // ——— 8. Verify Income Account is NOT in Balance Sheet ———
    await nav(page, 'Balance Sheet')
    await page.waitForTimeout(500)
    await expect(page.locator('text=E2E Test Income Account')).not.toBeVisible()
  })
})
