# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa-transactions.spec.ts >> Transactions Final QA >> Persistence >> 7.2 Dashboard reflects persisted data
- Location: qa-transactions.spec.ts:693:9

# Error details

```
TimeoutError: locator.textContent: Timeout 20000ms exceeded.
Call log:
  - waiting for locator('.kpi-card').nth(2)

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
      - generic [ref=e89]:
        - generic [ref=e90]: Accounting
        - generic [ref=e91]: Payment Voucher, Receipt Voucher & Journal Voucher tracking
      - generic [ref=e92]:
        - generic [ref=e93]:
          - generic [ref=e94]:
            - generic [ref=e95]: Total Receipts
            - generic [ref=e96]: AED 16,355,952
          - generic [ref=e97]:
            - generic [ref=e98]: Total Payments
            - generic [ref=e99]: AED 17,060,288
          - generic [ref=e100]:
            - generic [ref=e101]: Net Cash Flow
            - generic [ref=e102]: AED 704,336
        - generic [ref=e103]:
          - generic [ref=e105]:
            - button "All" [ref=e106] [cursor=pointer]
            - button "Today" [ref=e107] [cursor=pointer]
            - button "This Week" [ref=e108] [cursor=pointer]
            - button "This Month" [ref=e109] [cursor=pointer]
            - button "This Year" [ref=e110] [cursor=pointer]
            - button "Custom" [ref=e111] [cursor=pointer]
          - generic [ref=e112]:
            - img [ref=e113]
            - textbox "Search by category, ID, or type..." [ref=e116]
        - generic [ref=e117]:
          - generic [ref=e119]:
            - button "All" [ref=e120] [cursor=pointer]
            - button "Payment Voucher" [ref=e121] [cursor=pointer]
            - button "Receipt Voucher" [ref=e122] [cursor=pointer]
            - button "Journal Voucher" [ref=e123] [cursor=pointer]
          - button "Add Entry" [ref=e124] [cursor=pointer]:
            - img [ref=e125]
            - text: Add Entry
        - generic [ref=e126]:
          - table [ref=e128]:
            - rowgroup [ref=e129]:
              - row "ID Date Type Category Amount Status Actions" [ref=e130]:
                - columnheader "ID" [ref=e131] [cursor=pointer]
                - columnheader "Date" [ref=e132] [cursor=pointer]
                - columnheader "Type" [ref=e133] [cursor=pointer]
                - columnheader "Category" [ref=e134] [cursor=pointer]
                - columnheader "Amount" [ref=e135] [cursor=pointer]:
                  - text: Amount
                  - img [ref=e137]
                - columnheader "Status" [ref=e139] [cursor=pointer]
                - columnheader "Actions" [ref=e140]
            - rowgroup [ref=e141]:
              - row "TXN-029 01/05/2026 Receipt Voucher Management Fees -AED 5,298 Completed Edit Delete" [ref=e142]:
                - cell "TXN-029" [ref=e143]
                - cell "01/05/2026" [ref=e144]
                - cell "Receipt Voucher" [ref=e145]:
                  - generic [ref=e146]: Receipt Voucher
                - cell "Management Fees" [ref=e147]
                - cell "-AED 5,298" [ref=e148]:
                  - generic [ref=e149]: "-AED 5,298"
                - cell "Completed" [ref=e150]:
                  - generic [ref=e151]: Completed
                - cell "Edit Delete" [ref=e152]:
                  - generic [ref=e153]:
                    - button "Edit" [ref=e154] [cursor=pointer]:
                      - img [ref=e155]
                    - button "Delete" [ref=e158] [cursor=pointer]:
                      - img [ref=e159]
              - row "TXN-716 16/08/2026 Receipt Voucher Maintenance -AED 5,721 Completed Edit Delete" [ref=e162]:
                - cell "TXN-716" [ref=e163]
                - cell "16/08/2026" [ref=e164]
                - cell "Receipt Voucher" [ref=e165]:
                  - generic [ref=e166]: Receipt Voucher
                - cell "Maintenance" [ref=e167]
                - cell "-AED 5,721" [ref=e168]:
                  - generic [ref=e169]: "-AED 5,721"
                - cell "Completed" [ref=e170]:
                  - generic [ref=e171]: Completed
                - cell "Edit Delete" [ref=e172]:
                  - generic [ref=e173]:
                    - button "Edit" [ref=e174] [cursor=pointer]:
                      - img [ref=e175]
                    - button "Delete" [ref=e178] [cursor=pointer]:
                      - img [ref=e179]
              - row "TXN-449 01/05/2026 Receipt Voucher Management Fees -AED 6,270 Completed Edit Delete" [ref=e182]:
                - cell "TXN-449" [ref=e183]
                - cell "01/05/2026" [ref=e184]
                - cell "Receipt Voucher" [ref=e185]:
                  - generic [ref=e186]: Receipt Voucher
                - cell "Management Fees" [ref=e187]
                - cell "-AED 6,270" [ref=e188]:
                  - generic [ref=e189]: "-AED 6,270"
                - cell "Completed" [ref=e190]:
                  - generic [ref=e191]: Completed
                - cell "Edit Delete" [ref=e192]:
                  - generic [ref=e193]:
                    - button "Edit" [ref=e194] [cursor=pointer]:
                      - img [ref=e195]
                    - button "Delete" [ref=e198] [cursor=pointer]:
                      - img [ref=e199]
              - row "TXN-743 15/11/2026 Receipt Voucher Insurance -AED 6,476 Completed Edit Delete" [ref=e202]:
                - cell "TXN-743" [ref=e203]
                - cell "15/11/2026" [ref=e204]
                - cell "Receipt Voucher" [ref=e205]:
                  - generic [ref=e206]: Receipt Voucher
                - cell "Insurance" [ref=e207]
                - cell "-AED 6,476" [ref=e208]:
                  - generic [ref=e209]: "-AED 6,476"
                - cell "Completed" [ref=e210]:
                  - generic [ref=e211]: Completed
                - cell "Edit Delete" [ref=e212]:
                  - generic [ref=e213]:
                    - button "Edit" [ref=e214] [cursor=pointer]:
                      - img [ref=e215]
                    - button "Delete" [ref=e218] [cursor=pointer]:
                      - img [ref=e219]
              - row "TXN-143 03/11/2026 Receipt Voucher Insurance -AED 6,672 Completed Edit Delete" [ref=e222]:
                - cell "TXN-143" [ref=e223]
                - cell "03/11/2026" [ref=e224]
                - cell "Receipt Voucher" [ref=e225]:
                  - generic [ref=e226]: Receipt Voucher
                - cell "Insurance" [ref=e227]
                - cell "-AED 6,672" [ref=e228]:
                  - generic [ref=e229]: "-AED 6,672"
                - cell "Completed" [ref=e230]:
                  - generic [ref=e231]: Completed
                - cell "Edit Delete" [ref=e232]:
                  - generic [ref=e233]:
                    - button "Edit" [ref=e234] [cursor=pointer]:
                      - img [ref=e235]
                    - button "Delete" [ref=e238] [cursor=pointer]:
                      - img [ref=e239]
              - row "TXN-434 14/02/2026 Receipt Voucher Management Fees -AED 7,029 Completed Edit Delete" [ref=e242]:
                - cell "TXN-434" [ref=e243]
                - cell "14/02/2026" [ref=e244]
                - cell "Receipt Voucher" [ref=e245]:
                  - generic [ref=e246]: Receipt Voucher
                - cell "Management Fees" [ref=e247]
                - cell "-AED 7,029" [ref=e248]:
                  - generic [ref=e249]: "-AED 7,029"
                - cell "Completed" [ref=e250]:
                  - generic [ref=e251]: Completed
                - cell "Edit Delete" [ref=e252]:
                  - generic [ref=e253]:
                    - button "Edit" [ref=e254] [cursor=pointer]:
                      - img [ref=e255]
                    - button "Delete" [ref=e258] [cursor=pointer]:
                      - img [ref=e259]
              - row "TXN-503 27/11/2026 Receipt Voucher Insurance -AED 7,410 Completed Edit Delete" [ref=e262]:
                - cell "TXN-503" [ref=e263]
                - cell "27/11/2026" [ref=e264]
                - cell "Receipt Voucher" [ref=e265]:
                  - generic [ref=e266]: Receipt Voucher
                - cell "Insurance" [ref=e267]
                - cell "-AED 7,410" [ref=e268]:
                  - generic [ref=e269]: "-AED 7,410"
                - cell "Completed" [ref=e270]:
                  - generic [ref=e271]: Completed
                - cell "Edit Delete" [ref=e272]:
                  - generic [ref=e273]:
                    - button "Edit" [ref=e274] [cursor=pointer]:
                      - img [ref=e275]
                    - button "Delete" [ref=e278] [cursor=pointer]:
                      - img [ref=e279]
              - row "TXN-551 19/11/2026 Receipt Voucher Maintenance -AED 7,663 Completed Edit Delete" [ref=e282]:
                - cell "TXN-551" [ref=e283]
                - cell "19/11/2026" [ref=e284]
                - cell "Receipt Voucher" [ref=e285]:
                  - generic [ref=e286]: Receipt Voucher
                - cell "Maintenance" [ref=e287]
                - cell "-AED 7,663" [ref=e288]:
                  - generic [ref=e289]: "-AED 7,663"
                - cell "Completed" [ref=e290]:
                  - generic [ref=e291]: Completed
                - cell "Edit Delete" [ref=e292]:
                  - generic [ref=e293]:
                    - button "Edit" [ref=e294] [cursor=pointer]:
                      - img [ref=e295]
                    - button "Delete" [ref=e298] [cursor=pointer]:
                      - img [ref=e299]
              - row "TXN-521 17/05/2026 Receipt Voucher Maintenance -AED 8,281 Completed Edit Delete" [ref=e302]:
                - cell "TXN-521" [ref=e303]
                - cell "17/05/2026" [ref=e304]
                - cell "Receipt Voucher" [ref=e305]:
                  - generic [ref=e306]: Receipt Voucher
                - cell "Maintenance" [ref=e307]
                - cell "-AED 8,281" [ref=e308]:
                  - generic [ref=e309]: "-AED 8,281"
                - cell "Completed" [ref=e310]:
                  - generic [ref=e311]: Completed
                - cell "Edit Delete" [ref=e312]:
                  - generic [ref=e313]:
                    - button "Edit" [ref=e314] [cursor=pointer]:
                      - img [ref=e315]
                    - button "Delete" [ref=e318] [cursor=pointer]:
                      - img [ref=e319]
              - row "TXN-083 27/11/2026 Receipt Voucher Insurance -AED 8,348 Completed Edit Delete" [ref=e322]:
                - cell "TXN-083" [ref=e323]
                - cell "27/11/2026" [ref=e324]
                - cell "Receipt Voucher" [ref=e325]:
                  - generic [ref=e326]: Receipt Voucher
                - cell "Insurance" [ref=e327]
                - cell "-AED 8,348" [ref=e328]:
                  - generic [ref=e329]: "-AED 8,348"
                - cell "Completed" [ref=e330]:
                  - generic [ref=e331]: Completed
                - cell "Edit Delete" [ref=e332]:
                  - generic [ref=e333]:
                    - button "Edit" [ref=e334] [cursor=pointer]:
                      - img [ref=e335]
                    - button "Delete" [ref=e338] [cursor=pointer]:
                      - img [ref=e339]
          - generic [ref=e342]:
            - generic [ref=e343]: 11–20 of 333
            - generic [ref=e344]:
              - button [ref=e345] [cursor=pointer]:
                - img [ref=e346]
              - button "1" [ref=e348] [cursor=pointer]
              - button "2" [active] [ref=e349] [cursor=pointer]
              - button "3" [ref=e350] [cursor=pointer]
              - button "4" [ref=e351] [cursor=pointer]
              - button "5" [ref=e352] [cursor=pointer]
              - button "6" [ref=e353] [cursor=pointer]
              - button "7" [ref=e354] [cursor=pointer]
              - button "8" [ref=e355] [cursor=pointer]
              - button "9" [ref=e356] [cursor=pointer]
              - button "10" [ref=e357] [cursor=pointer]
              - button "11" [ref=e358] [cursor=pointer]
              - button "12" [ref=e359] [cursor=pointer]
              - button "13" [ref=e360] [cursor=pointer]
              - button "14" [ref=e361] [cursor=pointer]
              - button "15" [ref=e362] [cursor=pointer]
              - button "16" [ref=e363] [cursor=pointer]
              - button "17" [ref=e364] [cursor=pointer]
              - button "18" [ref=e365] [cursor=pointer]
              - button "19" [ref=e366] [cursor=pointer]
              - button "20" [ref=e367] [cursor=pointer]
              - button "21" [ref=e368] [cursor=pointer]
              - button "22" [ref=e369] [cursor=pointer]
              - button "23" [ref=e370] [cursor=pointer]
              - button "24" [ref=e371] [cursor=pointer]
              - button "25" [ref=e372] [cursor=pointer]
              - button "26" [ref=e373] [cursor=pointer]
              - button "27" [ref=e374] [cursor=pointer]
              - button "28" [ref=e375] [cursor=pointer]
              - button "29" [ref=e376] [cursor=pointer]
              - button "30" [ref=e377] [cursor=pointer]
              - button "31" [ref=e378] [cursor=pointer]
              - button "32" [ref=e379] [cursor=pointer]
              - button "33" [ref=e380] [cursor=pointer]
              - button "34" [ref=e381] [cursor=pointer]
              - button [ref=e382] [cursor=pointer]:
                - img [ref=e384]
```

# Test source

```ts
  597 |       await page.click('th:has-text("Amount")')
  598 |       await page.waitForTimeout(300)
  599 |       const elapsed = Date.now() - start
  600 |       expect(elapsed).toBeLessThan(3000)
  601 |     })
  602 | 
  603 |     test('6.4 500 transactions — pagination responsive', async () => {
  604 |       // Use JS click to bypass visibility checks since many page buttons exist
  605 |       const totalBtns = await page.locator('.data-table-page-btn').count()
  606 |       expect(totalBtns).toBe(50) // 500/10
  607 |       // Navigate to page 2 using the next button
  608 |       const nextBtn = page.locator('button:has-text("ChevronLeftIcon")').last()
  609 |       // Actually use the pagination arrow (rotated chevron)
  610 |       const arrowBtn = page.locator('.data-table-pagination-actions button').last()
  611 |       await arrowBtn.click()
  612 |       await page.waitForTimeout(300)
  613 |       const info = await page.locator('.data-table-pagination-info').textContent()
  614 |       expect(info).toContain('11') // page 2 starts at item 11
  615 |     })
  616 | 
  617 |     test('6.5 1000 transactions — all operations', async () => {
  618 |       await seedTransactions(page, 1000)
  619 |       // Search
  620 |       let start = Date.now()
  621 |       await page.fill('.data-table-search-input', 'Insurance')
  622 |       await page.waitForTimeout(300)
  623 |       expect(Date.now() - start).toBeLessThan(3000)
  624 |       // Clear search, filter
  625 |       if (await page.locator('.data-table-search-clear').isVisible()) {
  626 |         await page.locator('.data-table-search-clear').click()
  627 |       }
  628 |       await page.waitForTimeout(100)
  629 |       start = Date.now()
  630 |       await page.click('button:has-text("Receipt Voucher")')
  631 |       await page.waitForTimeout(300)
  632 |       expect(Date.now() - start).toBeLessThan(2000)
  633 |       // Sort
  634 |       start = Date.now()
  635 |       await page.click('th:has-text("Amount")')
  636 |       await page.waitForTimeout(300)
  637 |       expect(Date.now() - start).toBeLessThan(3000)
  638 |       // Paginate
  639 |       start = Date.now()
  640 |       const totalPages = await page.locator('.data-table-page-btn').count()
  641 |       if (totalPages > 1) {
  642 |         await page.locator('.data-table-page-btn').nth(1).click()
  643 |         await page.waitForTimeout(300)
  644 |       }
  645 |       expect(Date.now() - start).toBeLessThan(2000)
  646 |     })
  647 |   })
  648 | 
  649 |   // ============================================================
  650 |   // SUITE 7: Persistence
  651 |   // ============================================================
  652 | 
  653 |   test.describe.serial('Persistence', () => {
  654 |     let persistPage: any
  655 |     let persistCtx: any
  656 | 
  657 |     test('7.1 Transactions persist after page reload', async ({ browser }) => {
  658 |       // Use a clean browser context (no addInitScript)
  659 |       persistCtx = await browser.newContext()
  660 |       persistPage = await persistCtx.newPage()
  661 |       await persistPage.goto(BASE, { waitUntil: 'networkidle' })
  662 |       await persistPage.waitForTimeout(2000)
  663 |       // Seed transactions
  664 |       await persistPage.evaluate(() => {
  665 |       localStorage.setItem('insacc_clear_version', '9')
  666 |         localStorage.setItem('insacc_transactions', JSON.stringify([
  667 |           { id: 'TXN-001', date: '2026-06-01', type: 'Income', category: 'Dividend', amount: 120000, status: 'Completed' },
  668 |           { id: 'TXN-002', date: '2026-06-15', type: 'Expense', category: 'Utilities', amount: 35000, status: 'Completed' },
  669 |         ]))
  670 |       })
  671 |       // Reload and login
  672 |       await persistPage.reload()
  673 |       await persistPage.waitForSelector('input[type="email"]', { timeout: 15000 })
  674 |       await persistPage.fill('input[type="email"]', 'test@test.com')
  675 |       await persistPage.fill('input[type="password"]', '1234')
  676 |       await persistPage.click('button:has-text("Sign In")')
  677 |       await persistPage.waitForSelector('text=Sameer Ishaq Harmoudi', { timeout: 10000 })
  678 |       await persistPage.click('text=Sameer Ishaq Harmoudi')
  679 |       await persistPage.waitForSelector('text=Investment', { timeout: 10000 })
  680 |       await persistPage.click('text=Investment')
  681 |       await persistPage.waitForSelector('text=Investment Dashboard', { timeout: 10000 })
  682 |       // Navigate to Transactions
  683 |       await persistPage.click('text=Transactions')
  684 |       await persistPage.waitForSelector('text=Payment Voucher', { timeout: 10000 })
  685 |       await persistPage.waitForTimeout(500)
  686 |       // Should see the persisted transactions
  687 |       await expect(persistPage.locator('text=TXN-001')).toBeVisible()
  688 |       await expect(persistPage.locator('text=TXN-002')).toBeVisible()
  689 |       const incomeKpi = await persistPage.locator('.kpi-card').first().textContent()
  690 |       expect(incomeKpi).toContain('120,000')
  691 |     })
  692 | 
  693 |     test('7.2 Dashboard reflects persisted data', async () => {
  694 |       await persistPage.click('text=Dashboard')
  695 |       await persistPage.waitForSelector('text=Investment Dashboard', { timeout: 10000 })
  696 |       await persistPage.waitForTimeout(500)
> 697 |       const netKpi = await persistPage.locator('.kpi-card').nth(2).textContent()
      |                                                                    ^ TimeoutError: locator.textContent: Timeout 20000ms exceeded.
  698 |       expect(netKpi).toContain('AED')
  699 |     })
  700 | 
  701 |     test('7.3 Filters reset on page reload', async () => {
  702 |       await persistPage.click('text=Transactions')
  703 |       await persistPage.waitForSelector('text=Payment Voucher', { timeout: 10000 })
  704 |       await persistPage.waitForTimeout(500)
  705 |       // Apply a filter
  706 |       await persistPage.click('button:has-text("Payment Voucher")')
  707 |       await persistPage.waitForTimeout(200)
  708 |       const incomeBtn = persistPage.locator('button:has-text("Payment Voucher")')
  709 |       await expect(incomeBtn).toHaveClass(/primary/)
  710 |       // Reload
  711 |       await persistPage.reload()
  712 |       await persistPage.waitForSelector('input[type="email"]', { timeout: 15000 })
  713 |       await persistPage.fill('input[type="email"]', 'test@test.com')
  714 |       await persistPage.fill('input[type="password"]', '1234')
  715 |       await persistPage.click('button:has-text("Sign In")')
  716 |       await persistPage.waitForSelector('text=Sameer Ishaq Harmoudi', { timeout: 10000 })
  717 |       await persistPage.click('text=Sameer Ishaq Harmoudi')
  718 |       await persistPage.waitForSelector('text=Investment', { timeout: 10000 })
  719 |       await persistPage.click('text=Investment')
  720 |       await persistPage.waitForSelector('text=Investment Dashboard', { timeout: 10000 })
  721 |       await persistPage.click('text=Transactions')
  722 |       await persistPage.waitForSelector('text=Payment Voucher', { timeout: 10000 })
  723 |       await persistPage.waitForTimeout(500)
  724 |       // Filter should reset
  725 |       const allBtn = persistPage.locator('.data-table-toolbar').nth(0).locator('button:has-text("All")')
  726 |       await expect(allBtn).toHaveClass(/primary/)
  727 |       // Clean up
  728 |       await persistPage.close()
  729 |       await persistCtx.close()
  730 |     })
  731 |   })
  732 | })
  733 | 
```