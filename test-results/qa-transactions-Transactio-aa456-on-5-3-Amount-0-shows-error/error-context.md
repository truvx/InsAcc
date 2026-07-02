# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa-transactions.spec.ts >> Transactions Final QA >> Validation >> 5.3 Amount = 0 shows error
- Location: qa-transactions.spec.ts:483:9

# Error details

```
TimeoutError: locator.selectOption: Timeout 20000ms exceeded.
Call log:
  - waiting for locator('label:has-text("Category")').locator('..').locator('select')
    - locator resolved to <select class="input">…</select>
  - attempting select option action
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
    - waiting 20ms
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
      - waiting 100ms
    40 × waiting for element to be visible and enabled
       - did not find some options
     - retrying select option action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]: IA
      - generic [ref=e7]: InsAcc
    - generic [ref=e8]:
      - generic [ref=e9]: S
      - generic [ref=e10]:
        - generic [ref=e11]: Sameer Ishaq Harmoudi
        - generic [ref=e12]: Admin
    - generic [ref=e13]:
      - generic [ref=e14]: Investment
      - button "Dashboard" [ref=e15] [cursor=pointer]:
        - img [ref=e16]
        - generic [ref=e21]: Dashboard
      - button "Holdings" [ref=e22] [cursor=pointer]:
        - img [ref=e23]
        - generic [ref=e26]: Holdings
      - button "Investments" [ref=e27] [cursor=pointer]:
        - img [ref=e28]
        - generic [ref=e30]: Investments
      - button "Transactions" [ref=e31] [cursor=pointer]:
        - img [ref=e32]
        - generic [ref=e34]: Transactions
      - button "Bank Accounts" [ref=e35] [cursor=pointer]:
        - img [ref=e36]
        - generic [ref=e39]: Bank Accounts
      - button "Reports" [ref=e40] [cursor=pointer]:
        - img [ref=e41]
        - generic [ref=e42]: Reports
      - button "Documents" [ref=e43] [cursor=pointer]:
        - img [ref=e44]
        - generic [ref=e47]: Documents
      - button "History" [ref=e48] [cursor=pointer]:
        - img [ref=e49]
        - generic [ref=e52]: History
      - button "Purchase Ledger" [ref=e53] [cursor=pointer]:
        - img [ref=e54]
        - generic [ref=e56]: Purchase Ledger
      - button "Settings" [ref=e57] [cursor=pointer]:
        - img [ref=e58]
        - generic [ref=e61]: Settings
      - generic [ref=e62]: Accounts
      - button "Accounts" [ref=e63] [cursor=pointer]:
        - img [ref=e64]
        - generic [ref=e66]: Accounts
    - generic [ref=e67]:
      - button "Switch to Property" [ref=e68] [cursor=pointer]:
        - img [ref=e69]
        - text: Switch to Property
      - button "Sign Out" [ref=e74] [cursor=pointer]:
        - img [ref=e75]
        - text: Sign Out
  - generic [ref=e78]:
    - button "Change Profile" [ref=e80] [cursor=pointer]:
      - img [ref=e81]
      - text: Change Profile
    - generic [ref=e86]:
      - dialog "New Entry" [ref=e89]:
        - generic [ref=e90]:
          - generic [ref=e91]: New Entry
          - button "Close" [ref=e92] [cursor=pointer]:
            - img [ref=e93]
        - generic [ref=e97]:
          - generic [ref=e98]:
            - generic [ref=e99]: Type
            - combobox [ref=e100] [cursor=pointer]:
              - option "Payment Voucher" [selected]
              - option "Receipt Voucher"
              - option "Journal Voucher"
          - generic [ref=e101]:
            - generic [ref=e102]: Category
            - combobox [ref=e103] [cursor=pointer]:
              - option "Select category" [selected]
              - option "➕ Custom..."
          - generic [ref=e104]:
            - generic [ref=e105]: Date
            - textbox [ref=e106]: 2026-07-02
          - generic [ref=e107]:
            - generic [ref=e108]: Amount (AED)
            - spinbutton [ref=e109]
        - generic [ref=e110]:
          - button "Cancel" [ref=e111] [cursor=pointer]
          - button "Add" [ref=e112] [cursor=pointer]
      - generic [ref=e115]:
        - generic [ref=e116]: Accounting
        - generic [ref=e117]: Payment Voucher, Receipt Voucher & Journal Voucher tracking
      - generic [ref=e118]:
        - generic [ref=e119]:
          - generic [ref=e120]:
            - generic [ref=e121]: Total Receipts
            - generic [ref=e122]: AED 0
          - generic [ref=e123]:
            - generic [ref=e124]: Total Payments
            - generic [ref=e125]: AED 0
          - generic [ref=e126]:
            - generic [ref=e127]: Net Cash Flow
            - generic [ref=e128]: AED 0
        - generic [ref=e129]:
          - generic [ref=e131]:
            - button "All" [ref=e132] [cursor=pointer]
            - button "Today" [ref=e133] [cursor=pointer]
            - button "This Week" [ref=e134] [cursor=pointer]
            - button "This Month" [ref=e135] [cursor=pointer]
            - button "This Year" [ref=e136] [cursor=pointer]
            - button "Custom" [ref=e137] [cursor=pointer]
          - generic [ref=e138]:
            - img [ref=e139]
            - textbox "Search by category, ID, or type..." [ref=e142]
        - generic [ref=e143]:
          - generic [ref=e145]:
            - button "All" [ref=e146] [cursor=pointer]
            - button "Payment Voucher" [ref=e147] [cursor=pointer]
            - button "Receipt Voucher" [ref=e148] [cursor=pointer]
            - button "Journal Voucher" [ref=e149] [cursor=pointer]
          - button "Add Entry" [active] [ref=e150] [cursor=pointer]:
            - img [ref=e151]
            - text: Add Entry
        - table [ref=e154]:
          - rowgroup [ref=e155]:
            - row "ID Date Type Category Amount Status Actions" [ref=e156]:
              - columnheader "ID" [ref=e157] [cursor=pointer]
              - columnheader "Date" [ref=e158] [cursor=pointer]
              - columnheader "Type" [ref=e159] [cursor=pointer]
              - columnheader "Category" [ref=e160] [cursor=pointer]
              - columnheader "Amount" [ref=e161] [cursor=pointer]
              - columnheader "Status" [ref=e162] [cursor=pointer]
              - columnheader "Actions" [ref=e163]
          - rowgroup [ref=e164]:
            - row "No accounting entries found Try adjusting your search or filters" [ref=e165]:
              - cell "No accounting entries found Try adjusting your search or filters" [ref=e166]:
                - generic [ref=e167]:
                  - img [ref=e169]
                  - generic [ref=e172]: No accounting entries found
                  - generic [ref=e173]: Try adjusting your search or filters
```

# Test source

```ts
  386 | 
  387 |   test.describe.serial('Sorting', () => {
  388 |     const sortableColumns = ['ID', 'Date', 'Type', 'Category', 'Amount', 'Status']
  389 | 
  390 |     for (const col of sortableColumns) {
  391 |       test(`4.${sortableColumns.indexOf(col) + 1} Sort by ${col}`, async () => {
  392 |         await navigateTo(page, 'Transactions', 'Payment Voucher')
  393 |         // Click to sort asc
  394 |         await page.click(`th:has-text("${col}")`)
  395 |         await page.waitForTimeout(300)
  396 |         const header = page.locator(`th:has-text("${col}")`)
  397 |         await expect(header).toHaveClass(/sorted/)
  398 |         // Click for desc
  399 |         await page.click(`th:has-text("${col}")`)
  400 |         await page.waitForTimeout(200)
  401 |         // Click to unsort
  402 |         await page.click(`th:has-text("${col}")`)
  403 |         await page.waitForTimeout(200)
  404 |       })
  405 |     }
  406 | 
  407 |     test('4.7 Sorting works after search filter', async () => {
  408 |       await page.fill('.data-table-search-input', 'Income')
  409 |       await page.waitForTimeout(300)
  410 |       await page.click('th:has-text("Amount")')
  411 |       await page.waitForTimeout(300)
  412 |       const amounts = await page.locator('tbody tr td:nth-child(5)').allTextContents()
  413 |       if (amounts.length >= 2) {
  414 |         const firstVal = parseInt(amounts[0].replace(/[^0-9]/g, ''))
  415 |         const lastVal = parseInt(amounts[amounts.length - 1].replace(/[^0-9]/g, ''))
  416 |         expect(firstVal).toBeLessThanOrEqual(lastVal)
  417 |       }
  418 |     })
  419 | 
  420 |     test('4.8 Sorting works after type filter', async () => {
  421 |       const clearBtn = page.locator('.data-table-search-clear')
  422 |       if (await clearBtn.isVisible()) await clearBtn.click()
  423 |       await page.waitForTimeout(100)
  424 |       await page.click('button:has-text("Payment Voucher")')
  425 |       await page.waitForTimeout(200)
  426 |       await page.click('th:has-text("Amount")')
  427 |       await page.waitForTimeout(300)
  428 |       await expect(page.locator('th:has-text("Amount").sorted')).toBeVisible()
  429 |     })
  430 | 
  431 |     test('4.9 Sorting works after edit', async () => {
  432 |       await navigateTo(page, 'Transactions', 'Payment Voucher')
  433 |       await page.waitForTimeout(200)
  434 |       await editTransaction(page, 0, 'Dividend', '50000')
  435 |       // Reset sort state by cycling through ID column (asc → desc → unsort)
  436 |       for (let i = 0; i < 3; i++) {
  437 |         await page.click('th:has-text("ID")')
  438 |         await page.waitForTimeout(100)
  439 |       }
  440 |       await page.click('th:has-text("Amount")')
  441 |       await page.waitForTimeout(300)
  442 |       await expect(page.locator('th:has-text("Amount")')).toHaveClass(/sorted/)
  443 |     })
  444 | 
  445 |     test('4.10 Sorting works after delete', async () => {
  446 |       const editBtns = page.locator('button[aria-label="Edit"]')
  447 |       if (await editBtns.count() > 0) {
  448 |         await deleteTransaction(page, 0)
  449 |       }
  450 |       await page.click('th:has-text("Amount")')
  451 |       await page.waitForTimeout(300)
  452 |       await expect(page.locator('th:has-text("Amount").sorted')).toBeVisible()
  453 |     })
  454 |   })
  455 | 
  456 |   // ============================================================
  457 |   // SUITE 5: Validation
  458 |   // ============================================================
  459 | 
  460 |   test.describe.serial('Validation', () => {
  461 |     test.beforeEach(async () => {
  462 |       await navigateTo(page, 'Transactions', 'Payment Voucher')
  463 |       await resetFilters(page)
  464 |     })
  465 | 
  466 |     test('5.1 Empty form shows validation toast', async () => {
  467 |       await page.click('button:has-text("Add Entry")')
  468 |       await page.waitForSelector('text=New Entry')
  469 |       await page.click('button:has-text("Add")')
  470 |       await expect(page.locator('text=Please select a category')).toBeVisible()
  471 |       await page.locator('button:has-text("Cancel")').click()
  472 |     })
  473 | 
  474 |     test('5.2 Missing category shows error', async () => {
  475 |       await page.click('button:has-text("Add Entry")')
  476 |       await page.waitForSelector('text=New Entry')
  477 |       await page.locator('label:has-text("Amount")').locator('..').locator('input[type="number"]').fill('50000')
  478 |       await page.click('button:has-text("Add")')
  479 |       await expect(page.locator('text=Please select a category')).toBeVisible()
  480 |       await page.locator('button:has-text("Cancel")').click()
  481 |     })
  482 | 
  483 |     test('5.3 Amount = 0 shows error', async () => {
  484 |       await page.click('button:has-text("Add Entry")')
  485 |       await page.waitForSelector('text=New Entry')
> 486 |       await page.locator('label:has-text("Category")').locator('..').locator('select').selectOption('Dividend')
      |                                                                                        ^ TimeoutError: locator.selectOption: Timeout 20000ms exceeded.
  487 |       await page.locator('label:has-text("Amount")').locator('..').locator('input[type="number"]').fill('0')
  488 |       await page.click('button:has-text("Add")')
  489 |       await expect(page.locator('text=Amount must be greater than zero')).toBeVisible()
  490 |       await page.locator('button:has-text("Cancel")').click()
  491 |     })
  492 | 
  493 |     test('5.4 Negative amount shows error', async () => {
  494 |       await page.click('button:has-text("Add Entry")')
  495 |       await page.waitForSelector('text=New Entry')
  496 |       await page.locator('label:has-text("Category")').locator('..').locator('select').selectOption('Dividend')
  497 |       await page.locator('label:has-text("Amount")').locator('..').locator('input[type="number"]').fill('-500')
  498 |       await page.click('button:has-text("Add")')
  499 |       await expect(page.locator('text=Amount must be greater than zero')).toBeVisible()
  500 |       await page.locator('button:has-text("Cancel")').click()
  501 |     })
  502 | 
  503 |     test('5.5 Valid form succeeds', async () => {
  504 |       await page.click('button:has-text("Add Entry")')
  505 |       await page.waitForSelector('text=New Entry')
  506 |       await page.locator('label:has-text("Type")').locator('..').locator('select').selectOption('Income')
  507 |       await page.waitForTimeout(100)
  508 |       await page.locator('label:has-text("Category")').locator('..').locator('select').selectOption('Dividend')
  509 |       await page.locator('label:has-text("Amount")').locator('..').locator('input[type="number"]').fill('50000')
  510 |       await page.click('button:has-text("Add")')
  511 |       await expect(page.locator('text=Entry recorded')).toBeVisible()
  512 |     })
  513 | 
  514 |     test('5.6 Edit validation — empty amount', async () => {
  515 |       await page.locator('button[aria-label="Edit"]').first().click()
  516 |       await page.waitForSelector('text=Edit Entry')
  517 |       await page.locator('label:has-text("Amount")').locator('..').locator('input[type="number"]').fill('')
  518 |       await page.click('button:has-text("Update")')
  519 |       await expect(page.locator('text=Amount must be greater than zero')).toBeVisible()
  520 |       await page.locator('button:has-text("Cancel")').click()
  521 |       // Clean up remaining transaction
  522 |       await page.waitForTimeout(200)
  523 |       const delBtns = page.locator('button[aria-label="Delete"]')
  524 |       if (await delBtns.count() > 0) {
  525 |         await delBtns.first().click()
  526 |         await page.waitForSelector('text=Delete Entry')
  527 |         await page.click('button:has-text("Delete")')
  528 |       }
  529 |     })
  530 |   })
  531 | 
  532 |   // ============================================================
  533 |   // SUITE 6: Performance
  534 |   // ============================================================
  535 | 
  536 |   test.describe.serial('Performance', () => {
  537 |     async function seedTransactions(page: any, count: number) {
  538 |       const types = ['Income', 'Expense', 'Journal']
  539 |       const cats: Record<string, string[]> = {
  540 |         Income: ['Dividend', 'Rental Income', 'Interest', 'Capital Gain', 'Other Investment Income'],
  541 |         Expense: ['Maintenance', 'Utilities', 'Insurance', 'Management Fees', 'Professional Fees'],
  542 |         Journal: ['Adjustment', 'Transfer', 'Opening Balance', 'Correction'],
  543 |       }
  544 |       const txns: any[] = []
  545 |       for (let i = 0; i < count; i++) {
  546 |         const type = types[i % 3]
  547 |         const cat = cats[type][i % cats[type].length]
  548 |         txns.push({
  549 |           id: `TXN-${String(i + 1).padStart(3, '0')}`,
  550 |           date: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
  551 |           type,
  552 |           category: cat,
  553 |           amount: Math.round(Math.random() * 100000) + 1000,
  554 |           status: 'Completed',
  555 |         })
  556 |       }
  557 |       await page.evaluate((data) => {
  558 |         localStorage.setItem('insacc_transactions', JSON.stringify(data))
  559 |       }, txns)
  560 |       await page.reload()
  561 |       await page.waitForSelector('input[type="email"]', { timeout: 15000 })
  562 |       await page.fill('input[type="email"]', 'test@test.com')
  563 |       await page.fill('input[type="password"]', '1234')
  564 |       await page.click('button:has-text("Sign In")')
  565 |       await page.waitForSelector('text=Sameer Ishaq Harmoudi', { timeout: 10000 })
  566 |       await page.click('text=Sameer Ishaq Harmoudi')
  567 |       await page.waitForSelector('text=Investment', { timeout: 10000 })
  568 |       await page.click('text=Investment')
  569 |       await page.waitForSelector('text=Investment Dashboard', { timeout: 10000 })
  570 |       await navigateTo(page, 'Transactions', 'Payment Voucher')
  571 |       await page.waitForTimeout(500)
  572 |     }
  573 | 
  574 |     test('6.1 100 transactions — search responsive', async () => {
  575 |       await seedTransactions(page, 100)
  576 |       const start = Date.now()
  577 |       await page.fill('.data-table-search-input', 'Dividend')
  578 |       await page.waitForTimeout(300)
  579 |       const elapsed = Date.now() - start
  580 |       expect(elapsed).toBeLessThan(2000)
  581 |     })
  582 | 
  583 |     test('6.2 100 transactions — filter responsive', async () => {
  584 |       const clearBtn = page.locator('.data-table-search-clear')
  585 |       if (await clearBtn.isVisible()) await clearBtn.click()
  586 |       await page.waitForTimeout(100)
```