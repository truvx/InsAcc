const puppeteer = require('puppeteer');
(async () => {
  try {
    const browserURL = 'http://127.0.0.1:9222';
    const browser = await puppeteer.connect({ browserURL });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('5175') || p.url().includes('localhost'));
    
    if (page) {
      let logs = [];
      page.on('console', msg => {
        const text = msg.text();
        if (text.includes('HOOK')) logs.push(text);
      });
      
      await page.evaluate(() => {
        // We can't directly mock useEffect, but we can mock localStorage.setItem!
        const origSetItem = localStorage.setItem;
        localStorage.setItem = function(key, val) {
          if (key === 'insacc_prop_expenses') {
            console.log('HOOK: setItem called for insacc_prop_expenses');
          }
          return origSetItem.apply(this, arguments);
        };
      });
      
      // Simulate clicking Add Expense
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addBtn = buttons.find(b => b.textContent.includes('Add Expense'));
        if (addBtn) addBtn.click();
      });
      
      await new Promise(r => setTimeout(r, 500));
      
      // Fill out form
      await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input, select'));
        const amountInput = inputs.find(i => i.placeholder === '0.00' || i.type === 'number');
        if (amountInput) {
          amountInput.value = '200';
          amountInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Save Expense');
        if (saveBtn) saveBtn.click();
      });
      
      await new Promise(r => setTimeout(r, 1000));
      
      console.log('Logs captured:', logs);
    }
    browser.disconnect();
  } catch (e) {
    console.error(e.message);
  }
})();
