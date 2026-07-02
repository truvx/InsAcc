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
            - generic [ref=e96]: AED 17,185,515
          - generic [ref=e97]:
            - generic [ref=e98]: Total Payments
            - generic [ref=e99]: AED 17,051,536
          - generic [ref=e100]:
            - generic [ref=e101]: Net Cash Flow
            - generic [ref=e102]: AED 133,979
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
              - row "TXN-170 02/02/2026 Receipt Voucher Professional Fees -AED 3,577 Completed Posted" [ref=e142]:
                - cell "TXN-170" [ref=e143]
                - cell "02/02/2026" [ref=e144]
                - cell "Receipt Voucher" [ref=e145]:
                  - generic [ref=e146]: Receipt Voucher
                - cell "Professional Fees" [ref=e147]
                - cell "-AED 3,577" [ref=e148]:
                  - generic [ref=e149]: "-AED 3,577"
                - cell "Completed" [ref=e150]:
                  - generic [ref=e151]: Completed
                - cell "Posted" [ref=e152]:
                  - generic [ref=e154]: Posted
              - row "TXN-086 02/02/2026 Receipt Voucher Maintenance -AED 4,924 Completed Posted" [ref=e155]:
                - cell "TXN-086" [ref=e156]
                - cell "02/02/2026" [ref=e157]
                - cell "Receipt Voucher" [ref=e158]:
                  - generic [ref=e159]: Receipt Voucher
                - cell "Maintenance" [ref=e160]
                - cell "-AED 4,924" [ref=e161]:
                  - generic [ref=e162]: "-AED 4,924"
                - cell "Completed" [ref=e163]:
                  - generic [ref=e164]: Completed
                - cell "Posted" [ref=e165]:
                  - generic [ref=e167]: Posted
              - row "TXN-824 12/08/2026 Receipt Voucher Management Fees -AED 4,958 Completed Posted" [ref=e168]:
                - cell "TXN-824" [ref=e169]
                - cell "12/08/2026" [ref=e170]
                - cell "Receipt Voucher" [ref=e171]:
                  - generic [ref=e172]: Receipt Voucher
                - cell "Management Fees" [ref=e173]
                - cell "-AED 4,958" [ref=e174]:
                  - generic [ref=e175]: "-AED 4,958"
                - cell "Completed" [ref=e176]:
                  - generic [ref=e177]: Completed
                - cell "Posted" [ref=e178]:
                  - generic [ref=e180]: Posted
              - row "TXN-776 20/08/2026 Receipt Voucher Maintenance -AED 4,963 Completed Posted" [ref=e181]:
                - cell "TXN-776" [ref=e182]
                - cell "20/08/2026" [ref=e183]
                - cell "Receipt Voucher" [ref=e184]:
                  - generic [ref=e185]: Receipt Voucher
                - cell "Maintenance" [ref=e186]
                - cell "-AED 4,963" [ref=e187]:
                  - generic [ref=e188]: "-AED 4,963"
                - cell "Completed" [ref=e189]:
                  - generic [ref=e190]: Completed
                - cell "Posted" [ref=e191]:
                  - generic [ref=e193]: Posted
              - row "TXN-071 15/11/2026 Receipt Voucher Maintenance -AED 4,977 Completed Posted" [ref=e194]:
                - cell "TXN-071" [ref=e195]
                - cell "15/11/2026" [ref=e196]
                - cell "Receipt Voucher" [ref=e197]:
                  - generic [ref=e198]: Receipt Voucher
                - cell "Maintenance" [ref=e199]
                - cell "-AED 4,977" [ref=e200]:
                  - generic [ref=e201]: "-AED 4,977"
                - cell "Completed" [ref=e202]:
                  - generic [ref=e203]: Completed
                - cell "Posted" [ref=e204]:
                  - generic [ref=e206]: Posted
              - row "TXN-788 04/08/2026 Receipt Voucher Insurance -AED 5,475 Completed Posted" [ref=e207]:
                - cell "TXN-788" [ref=e208]
                - cell "04/08/2026" [ref=e209]
                - cell "Receipt Voucher" [ref=e210]:
                  - generic [ref=e211]: Receipt Voucher
                - cell "Insurance" [ref=e212]
                - cell "-AED 5,475" [ref=e213]:
                  - generic [ref=e214]: "-AED 5,475"
                - cell "Completed" [ref=e215]:
                  - generic [ref=e216]: Completed
                - cell "Posted" [ref=e217]:
                  - generic [ref=e219]: Posted
              - row "TXN-314 06/02/2026 Receipt Voucher Management Fees -AED 5,784 Completed Posted" [ref=e220]:
                - cell "TXN-314" [ref=e221]
                - cell "06/02/2026" [ref=e222]
                - cell "Receipt Voucher" [ref=e223]:
                  - generic [ref=e224]: Receipt Voucher
                - cell "Management Fees" [ref=e225]
                - cell "-AED 5,784" [ref=e226]:
                  - generic [ref=e227]: "-AED 5,784"
                - cell "Completed" [ref=e228]:
                  - generic [ref=e229]: Completed
                - cell "Posted" [ref=e230]:
                  - generic [ref=e232]: Posted
              - row "TXN-896 28/08/2026 Receipt Voucher Maintenance -AED 5,814 Completed Posted" [ref=e233]:
                - cell "TXN-896" [ref=e234]
                - cell "28/08/2026" [ref=e235]
                - cell "Receipt Voucher" [ref=e236]:
                  - generic [ref=e237]: Receipt Voucher
                - cell "Maintenance" [ref=e238]
                - cell "-AED 5,814" [ref=e239]:
                  - generic [ref=e240]: "-AED 5,814"
                - cell "Completed" [ref=e241]:
                  - generic [ref=e242]: Completed
                - cell "Posted" [ref=e243]:
                  - generic [ref=e245]: Posted
              - row "TXN-287 07/11/2026 Receipt Voucher Utilities -AED 6,190 Completed Posted" [ref=e246]:
                - cell "TXN-287" [ref=e247]
                - cell "07/11/2026" [ref=e248]
                - cell "Receipt Voucher" [ref=e249]:
                  - generic [ref=e250]: Receipt Voucher
                - cell "Utilities" [ref=e251]
                - cell "-AED 6,190" [ref=e252]:
                  - generic [ref=e253]: "-AED 6,190"
                - cell "Completed" [ref=e254]:
                  - generic [ref=e255]: Completed
                - cell "Posted" [ref=e256]:
                  - generic [ref=e258]: Posted
              - row "TXN-794 10/02/2026 Receipt Voucher Management Fees -AED 6,204 Completed Posted" [ref=e259]:
                - cell "TXN-794" [ref=e260]
                - cell "10/02/2026" [ref=e261]
                - cell "Receipt Voucher" [ref=e262]:
                  - generic [ref=e263]: Receipt Voucher
                - cell "Management Fees" [ref=e264]
                - cell "-AED 6,204" [ref=e265]:
                  - generic [ref=e266]: "-AED 6,204"
                - cell "Completed" [ref=e267]:
                  - generic [ref=e268]: Completed
                - cell "Posted" [ref=e269]:
                  - generic [ref=e271]: Posted
          - generic [ref=e272]:
            - generic [ref=e273]: 11–20 of 333
            - generic [ref=e274]:
              - button [ref=e275] [cursor=pointer]:
                - img [ref=e276]
              - button "1" [ref=e278] [cursor=pointer]
              - button "2" [active] [ref=e279] [cursor=pointer]
              - button "3" [ref=e280] [cursor=pointer]
              - button "4" [ref=e281] [cursor=pointer]
              - button "5" [ref=e282] [cursor=pointer]
              - button "6" [ref=e283] [cursor=pointer]
              - button "7" [ref=e284] [cursor=pointer]
              - button "8" [ref=e285] [cursor=pointer]
              - button "9" [ref=e286] [cursor=pointer]
              - button "10" [ref=e287] [cursor=pointer]
              - button "11" [ref=e288] [cursor=pointer]
              - button "12" [ref=e289] [cursor=pointer]
              - button "13" [ref=e290] [cursor=pointer]
              - button "14" [ref=e291] [cursor=pointer]
              - button "15" [ref=e292] [cursor=pointer]
              - button "16" [ref=e293] [cursor=pointer]
              - button "17" [ref=e294] [cursor=pointer]
              - button "18" [ref=e295] [cursor=pointer]
              - button "19" [ref=e296] [cursor=pointer]
              - button "20" [ref=e297] [cursor=pointer]
              - button "21" [ref=e298] [cursor=pointer]
              - button "22" [ref=e299] [cursor=pointer]
              - button "23" [ref=e300] [cursor=pointer]
              - button "24" [ref=e301] [cursor=pointer]
              - button "25" [ref=e302] [cursor=pointer]
              - button "26" [ref=e303] [cursor=pointer]
              - button "27" [ref=e304] [cursor=pointer]
              - button "28" [ref=e305] [cursor=pointer]
              - button "29" [ref=e306] [cursor=pointer]
              - button "30" [ref=e307] [cursor=pointer]
              - button "31" [ref=e308] [cursor=pointer]
              - button "32" [ref=e309] [cursor=pointer]
              - button "33" [ref=e310] [cursor=pointer]
              - button "34" [ref=e311] [cursor=pointer]
              - button [ref=e312] [cursor=pointer]:
                - img [ref=e314]
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