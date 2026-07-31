const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5174');
  
  const mappings = await page.evaluate(() => localStorage.getItem('insacc_prop_bank_mappings'));
  const propAccounts = await page.evaluate(() => localStorage.getItem('insacc_prop_accounts'));
  const chartAccounts = await page.evaluate(() => localStorage.getItem('insacc_prop_chart_of_accounts'));
  const vouchers = await page.evaluate(() => localStorage.getItem('insacc_prop_vouchers'));

  console.log("MAPPINGS:", mappings);
  console.log("PROPACCOUNTS:", propAccounts);
  // console.log("CHARTACCOUNTS:", chartAccounts);
  
  await browser.close();
})();
