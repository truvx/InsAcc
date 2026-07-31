const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://localhost:4173');
  // wait a bit for app to load
  await page.waitForTimeout(3000);
  
  const state = await page.evaluate(() => {
    return {
      propAccounts: JSON.parse(localStorage.getItem('insacc_prop_accounts') || '[]'),
      propBankMappings: JSON.parse(localStorage.getItem('insacc_prop_bank_mappings') || '[]'),
      propChartAccounts: JSON.parse(localStorage.getItem('insacc_prop_chart_accounts') || '[]'),
      vouchers: JSON.parse(localStorage.getItem('insacc_prop_vouchers') || '[]')
    };
  });
  
  console.log('propAccounts:', state.propAccounts.length, JSON.stringify(state.propAccounts.map(a => ({ id: a.id, name: a.institution, chartAccountId: a.chartAccountId }))));
  console.log('propBankMappings:', state.propBankMappings.length, JSON.stringify(state.propBankMappings));
  
  const bankAccounts = state.propChartAccounts.filter(a => a.code.startsWith('112'));
  console.log('bankAccounts in COA:', JSON.stringify(bankAccounts.map(a => ({ id: a.id, code: a.code, name: a.name, isActive: a.isActive, parentId: a.parentId }))));
  
  const bankVoucherLines = state.vouchers.flatMap(v => v.lines).filter(l => bankAccounts.some(ba => ba.id === l.accountId));
  console.log('bankVoucherLines:', bankVoucherLines.length, JSON.stringify(bankVoucherLines.map(l => ({ accountId: l.accountId, amount: l.baseAmount, type: l.type }))));
  
  await browser.close();
})();
