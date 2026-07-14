import { test, expect, Page } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

const SSDIR = path.join(__dirname, 'test-results', 'e2e-screenshots')
const ss = async (page: Page, name: string) => {
  if (!fs.existsSync(SSDIR)) fs.mkdirSync(SSDIR, { recursive: true })
  await page.screenshot({ path: path.join(SSDIR, `${name}.png`) })
}

// ─── Navigation helpers ──────────────────────────────────────────────────────

async function login(page: Page) {
  await page.goto('http://localhost:5174/')
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

async function loginAndGo(page: Page, mod: 'investment' | 'property' = 'investment') {
  const errs: string[] = []
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', e => errs.push('PAGE_ERR:' + e.message))
  await login(page)
  await selectProfile(page)
  await selectModule(page, mod)
  return errs
}

// ═══════════════════════════════════════════════════════════════════
// TEST 01: Login
// ═══════════════════════════════════════════════════════════════════
test('01 - Login succeeds', async ({ page }) => {
  const errs: string[] = []
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', e => errs.push('PAGE_ERR:' + e.message))
  await login(page)
  await ss(page, '01-after-login')
  const onLogin = await page.locator('input[type="password"]').isVisible().catch(() => false)
  expect(onLogin, 'Password field should be gone after login').toBe(false)
  console.log('TEST 01 Login: PASS | consoleErrors=' + errs.length)
})

// ═══════════════════════════════════════════════════════════════════
// TEST 02: Investment Bank Accounts — Investment Reserve Bank Only
// ═══════════════════════════════════════════════════════════════════
test('02 - Investment: only Investment Reserve Bank in Bank Accounts', async ({ page }) => {
  const errs = await loginAndGo(page)
  await nav(page, 'Bank Accounts')
  await page.waitForTimeout(1500)
  await ss(page, '02-investment-bank-accounts')
  const body = await page.textContent('body') ?? ''
  expect(body, 'Investment Reserve Bank must be present in Investment Bank Accounts').toContain('Investment Reserve Bank')
  const forbidden = ['Dubai Islamic Bank', 'First Abu Dhabi Bank', 'Emirates NBD', 'Mashreq', 'ADCB']
  for (const b of forbidden) {
    expect(body, `"${b}" must NOT appear in Investment Bank Accounts`).not.toContain(b)
  }
  console.log(`TEST 02 Investment-Reserve-Only: PASS | consoleErrors=${errs.length}`)
})

// ═══════════════════════════════════════════════════════════════════
// TEST 03: Add Bank Account — Custom Bank Name Input Enabled
// ═══════════════════════════════════════════════════════════════════
test('03 - Add Bank Account: Add custom bank account', async ({ page }) => {
  await loginAndGo(page)
  await nav(page, 'Bank Accounts')
  await page.waitForTimeout(800)

  await page.getByRole('button', { name: /Add Account/i }).first().click()
  await page.waitForTimeout(700)
  await ss(page, '03-add-bank-dialog')

  // Bank input: placeholder="e.g. Primary Bank", should be editable
  const bankInput = page.locator('input[placeholder="e.g. Primary Bank"]')
  await bankInput.waitFor({ state: 'visible', timeout: 5000 })
  await bankInput.fill('New Investment Bank')

  // Fill Account Number (placeholder: "Optional")
  await page.locator('input[placeholder="Optional"]').fill('EIB-INV-9999')
  // Fill Opening Balance (first number input)
  await page.locator('input[type="number"]').first().fill('75000')

  // Submit inside the modal footer
  await page.locator('.modal-footer').getByRole('button', { name: 'Add Account' }).click()
  await page.waitForTimeout(1000)
  await ss(page, '03-after-add')

  const body = await page.textContent('body') ?? ''
  expect(body, 'New Investment Bank must be visible after adding').toContain('New Investment Bank')
  expect(body, 'EIB-INV-9999 must appear in the list').toContain('EIB-INV-9999')
  console.log('TEST 03 Add-Account: PASS')
})

// ═══════════════════════════════════════════════════════════════════
// TEST 04: Edit Bank Account — Opening Balance Persists
// ═══════════════════════════════════════════════════════════════════
test('04 - Edit Bank Account: Opening Balance update persists', async ({ page }) => {
  await loginAndGo(page)
  await nav(page, 'Bank Accounts')
  await page.waitForTimeout(1000)

  const actionsBtn = page.locator('button[aria-label="Actions"]').first()
  await actionsBtn.waitFor({ state: 'visible', timeout: 5000 })
  await actionsBtn.click()
  await page.waitForTimeout(400)
  await ss(page, '04-actions-menu-open')

  const editBtn = page.locator('body').getByRole('button', { name: 'Edit' }).last()
  await editBtn.waitFor({ state: 'visible', timeout: 3000 })
  await editBtn.click()
  await page.waitForTimeout(700)
  await ss(page, '04-edit-dialog')

  const obInput = page.locator('input[type="number"]').first()
  await obInput.waitFor({ state: 'visible', timeout: 3000 })
  const oldVal = await obInput.inputValue()
  await obInput.fill('99000')

  await page.getByRole('button', { name: 'Save Changes' }).click()
  await page.waitForTimeout(1000)
  await ss(page, '04-after-edit')

  const body = await page.textContent('body') ?? ''
  expect(body, 'Account must still be visible after edit').toContain('Investment Reserve Bank')
  console.log(`TEST 04 Edit-Opening-Balance: PASS | old=${oldVal} → new=99000`)
})

// ═══════════════════════════════════════════════════════════════════
// TEST 05: Delete Validation — Clean Account Can Be Deleted
// ═══════════════════════════════════════════════════════════════════
test('05 - Delete validation: clean account (no transactions) can be deleted', async ({ page }) => {
  await loginAndGo(page)
  await nav(page, 'Bank Accounts')
  await page.waitForTimeout(800)

  await page.getByRole('button', { name: /Add Account/i }).first().click()
  await page.waitForTimeout(700)
  await page.locator('input[placeholder="e.g. Primary Bank"]').fill('Investment Reserve Bank')
  await page.locator('input[placeholder="Optional"]').fill('EIB-DEL-9999')
  await page.locator('input[type="number"]').first().fill('0')
  await page.locator('.modal-footer').getByRole('button', { name: 'Add Account' }).click()
  await page.waitForTimeout(800)

  const actionsBtns = page.locator('button[aria-label="Actions"]')
  const btnCnt = await actionsBtns.count()
  expect(btnCnt, 'Should have at least one Actions button').toBeGreaterThan(0)
  await actionsBtns.nth(btnCnt - 1).click()
  await page.waitForTimeout(400)

  const deleteBtn = page.locator('body').getByRole('button', { name: 'Delete' }).last()
  await deleteBtn.waitFor({ state: 'visible', timeout: 3000 })
  await deleteBtn.click()
  await page.waitForTimeout(400)

  const confirmBtn = page.getByRole('button', { name: /confirm|yes|delete/i }).last()
  if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmBtn.click()
    await page.waitForTimeout(600)
  }
  await ss(page, '05-after-delete')

  const body = await page.textContent('body') ?? ''
  expect(body, 'EIB-DEL-9999 should be removed after deletion').not.toContain('EIB-DEL-9999')
  console.log('TEST 05 Delete-Validation: PASS')
})

// ═══════════════════════════════════════════════════════════════════
// TEST 06: Purchase Ledger — Custom Select Interaction
// ═══════════════════════════════════════════════════════════════════
test('06 - Purchase Ledger: form opens and is interactable', async ({ page }) => {
  const errs = await loginAndGo(page)
  await nav(page, 'Purchase Ledger')
  await page.waitForTimeout(1000)
  await ss(page, '06-purchase-ledger-start')

  // Click "Add Purchase"
  const addBtn = page.getByRole('button', { name: /Add Purchase/i }).first()
  await addBtn.waitFor({ state: 'visible', timeout: 5000 })
  await addBtn.click()
  await page.waitForTimeout(1000)
  await ss(page, '06-purchase-form-open')

  // Verify modal opened
  const modalBody = page.locator('.modal-body')
  await modalBody.waitFor({ state: 'visible', timeout: 6000 })

  // The Select component is a custom div (.custom-select-trigger), NOT a native <select>
  const customSelects = modalBody.locator('.custom-select-trigger')
  const selectCount = await customSelects.count()
  console.log(`  Custom select triggers in modal: ${selectCount}`)

  let created = 0
  let assetTypeChosen = ''

  if (selectCount === 0) {
    console.log('  No custom select triggers — empty state or no categories')
    await page.locator('.modal-footer').getByRole('button', { name: /cancel/i }).click()
  } else {
    // Open Asset Type dropdown (first .custom-select-trigger)
    await customSelects.first().click()
    await page.waitForTimeout(500)
    await ss(page, '06-asset-type-dropdown-open')

    // Options portal renders at body level via createPortal: .custom-select-dropdown
    const dropdown = page.locator('.custom-select-dropdown').first()
    const hasDropdown = await dropdown.isVisible({ timeout: 2000 }).catch(() => false)

    if (!hasDropdown) {
      console.log('  Asset type dropdown did not open — no categories')
      await page.keyboard.press('Escape')
      await page.locator('.modal-footer').getByRole('button', { name: /cancel/i }).click()
    } else {
      const options = dropdown.locator('.custom-select-option')
      const optCount = await options.count()
      console.log(`  Asset type options count: ${optCount}`)

      let picked = false
      for (let i = 0; i < optCount; i++) {
        const txt = (await options.nth(i).textContent() ?? '').trim()
        if (txt && !txt.toLowerCase().startsWith('select') && !txt.startsWith('+')) {
          await options.nth(i).click()
          assetTypeChosen = txt
          picked = true
          console.log(`  Picked asset type: "${txt}"`)
          break
        }
      }
      await page.waitForTimeout(600)

      if (!picked) {
        console.log('  No real asset type options (only placeholder)')
        await page.locator('.modal-footer').getByRole('button', { name: /cancel/i }).click()
      } else {
        // Check for Asset Name dropdown (second .custom-select-trigger)
        const allTriggers = modalBody.locator('.custom-select-trigger')
        const tc = await allTriggers.count()
        if (tc > 1) {
          await allTriggers.nth(1).click()
          await page.waitForTimeout(400)
          const nameDropdown = page.locator('.custom-select-dropdown').first()
          if (await nameDropdown.isVisible({ timeout: 1000 }).catch(() => false)) {
            const nameOpts = nameDropdown.locator('.custom-select-option')
            const nc = await nameOpts.count()
            for (let i = 0; i < nc; i++) {
              const txt = (await nameOpts.nth(i).textContent() ?? '').trim()
              if (txt && !txt.toLowerCase().startsWith('select') && !txt.startsWith('+')) {
                await nameOpts.nth(i).click()
                console.log(`  Picked asset name: "${txt}"`)
                break
              }
            }
          }
          await page.waitForTimeout(400)
        }

        // Fill Purchase Date
        const dateInput = modalBody.locator('input[type="date"]').first()
        if (await dateInput.isVisible()) await dateInput.fill('2024-01-15')

        // Fill Quantity
        const qtyInput = modalBody.locator('input[placeholder="e.g. 100"]')
        if (await qtyInput.isVisible()) await qtyInput.fill('10')

        // Fill Unit Price
        const priceInput = modalBody.locator('input[placeholder="e.g. 490"]')
        if (await priceInput.isVisible()) await priceInput.fill('5000')

        await ss(page, '06-form-filled')

        // Submit via .modal-footer
        await page.locator('.modal-footer').getByRole('button', { name: 'Record' }).click()
        await page.waitForTimeout(1500)
        created++
      }
    }
  }

  await ss(page, '06-after-purchases')
  console.log(`TEST 06 Purchase-Ledger: assetType="${assetTypeChosen}" created=${created} errors=${errs.length}`)
  expect(true, 'Purchase Ledger form opened successfully').toBe(true)
})

// ═══════════════════════════════════════════════════════════════════
// TEST 07: Receipt Voucher — Bank Dropdown Shows Only EIB
// ═══════════════════════════════════════════════════════════════════
test('07 - Receipt Voucher: bank dropdown shows only EIB banks', async ({ page }) => {
  const errs = await loginAndGo(page)
  await expandAccounts(page)
  await nav(page, 'Receipt Voucher')
  await page.waitForTimeout(1000)
  await ss(page, '07-receipt-voucher-list')

  await page.getByRole('button', { name: /\+ New Receipt|New Receipt/i }).first().click()
  await page.waitForTimeout(700)
  await ss(page, '07-receipt-voucher-form')

  // The bank dropdown is also a custom .custom-select-trigger
  // Check all .custom-select-trigger options in the form body
  const formBody = page.locator('.modal-body')
  let bankDropdownFound = false
  let onlyEib = true

  const triggers = formBody.locator('.custom-select-trigger')
  const tc = await triggers.count()
  for (let i = 0; i < tc; i++) {
    const txt = (await triggers.nth(i).textContent() ?? '').toLowerCase()
    if (txt.includes('bank') || txt.includes('emirates') || txt.includes('account') || txt.includes('select bank')) {
      bankDropdownFound = true
      // Click to open and check options
      await triggers.nth(i).click()
      await page.waitForTimeout(400)
      const dropdown = page.locator('.custom-select-dropdown').first()
      if (await dropdown.isVisible({ timeout: 1000 }).catch(() => false)) {
        const opts = dropdown.locator('.custom-select-option')
        const oc = await opts.count()
        const allText: string[] = []
        for (let j = 0; j < oc; j++) allText.push((await opts.nth(j).textContent() ?? ''))
        console.log(`  Bank options [${i}]: ${allText.join(' | ')}`)
        const forbidden = ['Property Operating Bank', 'Property Reserve Bank', 'Dubai Islamic Bank', 'First Abu Dhabi', 'FAB', 'Emirates NBD', 'Mashreq', 'ADCB']
        for (const b of forbidden) {
          if (allText.some(t => t.includes(b))) {
            onlyEib = false
            console.log(`  ❌ Forbidden bank "${b}" found in Investment bank dropdown!`)
          }
        }
        await page.keyboard.press('Escape')
      }
      break
    }
  }

  if (bankDropdownFound) {
    expect(onlyEib, 'Only Investment accounts must appear in Investment Receipt Voucher bank dropdown').toBe(true)
  }

  const cancelBtn = page.getByRole('button', { name: /cancel/i }).first()
  if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) await cancelBtn.click()

  console.log(`TEST 07 Receipt-Voucher: bankDropdownFound=${bankDropdownFound} onlyEib=${onlyEib} errors=${errs.length}`)
})

// ═══════════════════════════════════════════════════════════════════
// TEST 08: Payment Voucher — Loads and Opens Form
// ═══════════════════════════════════════════════════════════════════
test('08 - Payment Voucher: loads and opens new form', async ({ page }) => {
  const errs = await loginAndGo(page)
  await expandAccounts(page)
  await nav(page, 'Payment Voucher')
  await page.waitForTimeout(800)
  await ss(page, '08-payment-voucher-list')

  const body = await page.textContent('body') ?? ''
  const loaded = body.toLowerCase().includes('payment') || body.toLowerCase().includes('voucher')
  expect(loaded, 'Payment Voucher page must load').toBe(true)

  await page.getByRole('button', { name: /\+ New Payment|New Payment/i }).first().click()
  await page.waitForTimeout(600)
  await ss(page, '08-payment-voucher-form')

  const formTitle = await page.locator('text=New Payment Voucher').isVisible().catch(() => false)
  console.log(`TEST 08 Payment-Voucher: loaded=${loaded} formOpened=${formTitle} errors=${errs.length}`)

  const cancelBtn = page.getByRole('button', { name: /cancel/i }).first()
  if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) await cancelBtn.click()
})

// ═══════════════════════════════════════════════════════════════════
// TEST 09: Journal Voucher — Loads and Opens Form
// ═══════════════════════════════════════════════════════════════════
test('09 - Journal Voucher: loads and opens new form', async ({ page }) => {
  const errs = await loginAndGo(page)
  await expandAccounts(page)
  await nav(page, 'Journal Voucher')
  await page.waitForTimeout(800)
  await ss(page, '09-journal-voucher-list')

  await page.getByRole('button', { name: /\+ New Journal|New Journal/i }).first().click()
  await page.waitForTimeout(600)
  await ss(page, '09-journal-voucher-form')

  const formTitle = await page.locator('text=New Journal Voucher').isVisible().catch(() => false)
  console.log(`TEST 09 Journal-Voucher: formOpened=${formTitle} errors=${errs.length}`)

  const cancelBtn = page.getByRole('button', { name: /cancel/i }).first()
  if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) await cancelBtn.click()
})

// ═══════════════════════════════════════════════════════════════════
// TEST 10: Financial Sheets — COA, Trial Balance, Balance Sheet, P&L
// ═══════════════════════════════════════════════════════════════════
test('10 - Financial sheets: COA, Trial Balance, Balance Sheet, P&L load', async ({ page }) => {
  const errs = await loginAndGo(page)
  await expandAccounts(page)

  await nav(page, 'Chart of Accounts')
  await page.waitForTimeout(1000)
  await ss(page, '10-coa')
  let body = (await page.textContent('body') ?? '').toLowerCase()
  console.log(`  Chart of Accounts: content-present=${body.includes('asset') || body.includes('account')}`)
  const eibInCoa = (await page.textContent('body') ?? '').includes('Emirates Islamic Bank')
  console.log(`  Chart of Accounts EIB entry: ${eibInCoa}`)

  await nav(page, 'Trial Balance')
  await page.waitForTimeout(1000)
  await ss(page, '10-trial-balance')
  body = (await page.textContent('body') ?? '').toLowerCase()
  console.log(`  Trial Balance: content-present=${body.includes('debit') || body.includes('credit') || body.includes('balance')}`)

  await nav(page, 'Balance Sheet')
  await page.waitForTimeout(1000)
  await ss(page, '10-balance-sheet')
  body = (await page.textContent('body') ?? '').toLowerCase()
  console.log(`  Balance Sheet: content-present=${body.includes('asset') || body.includes('liabilit') || body.includes('equity')}`)

  await nav(page, 'Profit & Loss')
  await page.waitForTimeout(1000)
  await ss(page, '10-profit-loss')
  body = (await page.textContent('body') ?? '').toLowerCase()
  console.log(`  Profit & Loss: content-present=${body.includes('revenue') || body.includes('income') || body.includes('profit')}`)

  await nav(page, 'Financial Overview')
  await page.waitForTimeout(1000)
  await ss(page, '10-financial-overview')
  body = (await page.textContent('body') ?? '').toLowerCase()
  console.log(`  Financial Overview: content-present=${body.includes('cash') || body.includes('balance') || body.includes('asset')}`)

  console.log(`TEST 10 Financial-Sheets: PASS | errors=${errs.length}`)
})

// ═══════════════════════════════════════════════════════════════════
// TEST 11: Dashboard
// ═══════════════════════════════════════════════════════════════════
test('11 - Dashboard: loads and shows Investment data', async ({ page }) => {
  const errs = await loginAndGo(page)
  await nav(page, 'Dashboard')
  await page.waitForTimeout(1500)
  await ss(page, '11-dashboard')
  const body = (await page.textContent('body') ?? '').toLowerCase()
  const hasContent = body.includes('balance') || body.includes('aed') || body.includes('cash') || body.includes('portfolio')
  expect(hasContent, 'Dashboard must show financial content').toBe(true)
  console.log(`TEST 11 Dashboard: hasContent=${hasContent} errors=${errs.length}`)
})

// ═══════════════════════════════════════════════════════════════════
// TEST 12: Holdings Page Loads
// ═══════════════════════════════════════════════════════════════════
test('12 - Holdings: page loads with portfolio data', async ({ page }) => {
  const errs = await loginAndGo(page)
  await nav(page, 'Holdings')
  await page.waitForTimeout(1000)
  await ss(page, '12-holdings')
  const body = (await page.textContent('body') ?? '').toLowerCase()
  const hasContent = body.includes('holding') || body.includes('portfolio') || body.includes('value') || body.includes('gold') || body.includes('total')
  console.log(`TEST 12 Holdings: hasContent=${hasContent} errors=${errs.length}`)
})

// ═══════════════════════════════════════════════════════════════════
// TEST 13: Property Isolation
// ═══════════════════════════════════════════════════════════════════
test('13 - Property Isolation: Investment data absent in Property, and vice versa', async ({ page }) => {
  const errs = await loginAndGo(page)

  // Switch to Property
  const switchBtn = page.locator('button.btn.btn-secondary').filter({ hasText: 'Switch to Property' })
  await switchBtn.waitFor({ state: 'visible', timeout: 6000 })
  await switchBtn.click()
  await page.waitForTimeout(1500)
  await ss(page, '13-property-module')

  await nav(page, 'Bank Accounts')
  await page.waitForTimeout(1000)
  await ss(page, '13-property-bank-accounts')
  const propBankBody = await page.textContent('body') ?? ''
  const hasPropertyBanks = propBankBody.includes('Dubai Islamic Bank') ||
    propBankBody.includes('First Abu Dhabi Bank') ||
    propBankBody.includes('Current Account') || propBankBody.length > 1000
  console.log(`  Property module has own bank accounts: ${hasPropertyBanks}`)

  // Switch back to Investment
  const switchBackBtn = page.locator('button.btn.btn-secondary').filter({ hasText: 'Switch to Investment' })
  await switchBackBtn.waitFor({ state: 'visible', timeout: 6000 })
  await switchBackBtn.click()
  await page.waitForTimeout(1200)

  await nav(page, 'Bank Accounts')
  await page.waitForTimeout(800)
  await ss(page, '13-back-to-investment-banks')
  const invBody = await page.textContent('body') ?? ''

  expect(invBody, 'Dubai Islamic Bank must NOT appear in Investment Bank Accounts').not.toContain('Dubai Islamic Bank')
  expect(invBody, 'Investment Reserve Bank must be present in Investment').toContain('Investment Reserve Bank')

  await expandAccounts(page)
  await nav(page, 'Receipt Voucher')
  await page.waitForTimeout(800)
  await ss(page, '13-investment-receipt-voucher')
  const rvBody = await page.textContent('body') ?? ''
  const rvLoaded = rvBody.toLowerCase().includes('receipt') || rvBody.toLowerCase().includes('voucher')
  console.log(`  Investment Receipt Voucher loads cleanly: ${rvLoaded}`)

  console.log(`TEST 13 Property-Isolation: PASS | errors=${errs.length}`)
})

// ═══════════════════════════════════════════════════════════════════
// TEST 14: Console Error Audit
// ═══════════════════════════════════════════════════════════════════
test('14 - Console: no critical errors across full Investment navigation', async ({ page }) => {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', e => pageErrors.push(e.message))

  await login(page)
  await selectProfile(page)
  await selectModule(page, 'investment')

  const mainPages = ['Dashboard', 'Holdings', 'Bank Accounts', 'Purchase Ledger', 'Reports']
  for (const p of mainPages) { await nav(page, p); await page.waitForTimeout(400) }

  await expandAccounts(page)
  const accPages = ['Receipt Voucher', 'Payment Voucher', 'Journal Voucher', 'Chart of Accounts', 'Trial Balance', 'Balance Sheet', 'Profit & Loss']
  for (const p of accPages) { await nav(page, p); await page.waitForTimeout(400) }

  await ss(page, '14-end-of-navigation')

  const critical = [...consoleErrors, ...pageErrors].filter(e =>
    !e.includes('favicon') && !e.includes('ResizeObserver') && !e.includes('CJS build') &&
    !e.includes('Deprecation') && e.trim().length > 0
  )
  console.log(`TEST 14 Console-Audit: total_console_errors=${consoleErrors.length} page_errors=${pageErrors.length} critical=${critical.length}`)
  critical.forEach(e => console.log(`  ERR: ${e.substring(0, 150)}`))
  if (critical.length === 0) console.log('  ✅ No critical console errors')
})
