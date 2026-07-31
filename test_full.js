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
        if (text.includes('DISPATCHED')) logs.push(text);
      });
      
      await page.evaluate(() => {
        window.__origDispatch = window.dispatchEvent;
        window.dispatchEvent = function(event) {
          if (event.type && event.type.startsWith('insacc-sync')) {
            console.log('DISPATCHED: ' + event.type + ' ' + (event.detail ? event.detail.key : ''));
          }
          return window.__origDispatch.apply(this, arguments);
        };
      });
      
      console.log('Injected logger, now clicking Add Expense...');
      
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
          amountInput.value = '150';
          amountInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Save Expense');
        if (saveBtn) saveBtn.click();
      });
      
      await new Promise(r => setTimeout(r, 2000));
      
      console.log('Logs captured:', logs);
      
      // Take screenshot
      await page.screenshot({ path: '/Users/t6ux/.gemini/antigravity-ide/brain/ccd3f296-f265-4e37-a50d-7ee89d7b0207/test_full_screenshot.png' });
    }
    browser.disconnect();
  } catch (e) {
    console.error(e.message);
  }
})();
