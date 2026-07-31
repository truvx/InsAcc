const puppeteer = require('puppeteer');
(async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    let logs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('HOOK') || text.includes('DISPATCHED')) {
        console.log('BROWSER-LOG:', text);
      }
    });
    
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
    
    await page.evaluate(() => {
      localStorage.setItem('insacc_supabase_enabled', 'true');
      localStorage.setItem('insacc_supabase_url', '"https://example.com"');
      localStorage.setItem('insacc_supabase_key', '"key"');
      localStorage.setItem('insacc_has_seen_onboarding', 'true');
      localStorage.setItem('insacc_has_seen_module_selection', 'true');
      localStorage.setItem('insacc_profile_name', '"Test"');
      localStorage.setItem('insacc_active_module', '"property"');
      sessionStorage.setItem('insacc_pin_verified', 'true');
    });
    
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 4000));
    
    await page.evaluate(() => {
      const origDispatch = window.dispatchEvent;
      window.dispatchEvent = function(e) {
        if (e.type && e.type.startsWith('insacc-sync')) {
          console.log('DISPATCHED:', e.type, e.detail ? e.detail.key : 'none');
        }
        return origDispatch.apply(this, arguments);
      }
    });
    
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.sidebar-item'));
      const expensesBtn = btns.find(b => b.textContent.includes('Expenses'));
      if (expensesBtn) expensesBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const addBtn = btns.find(b => b.textContent.includes('Add Expense'));
      if (addBtn) addBtn.click();
      else console.log('HOOK-ERROR Add Expense button not found');
    });
    await new Promise(r => setTimeout(r, 1000));
    
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      for (let i of inputs) {
        if (i.placeholder === '0.00' || i.type === 'number') {
          i.value = '350';
          i.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      
      const selects = document.querySelectorAll('select');
      for (let s of selects) {
        if (s.innerHTML.includes('Repair')) {
          s.value = s.options[1].value;
          s.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      
      const btns = Array.from(document.querySelectorAll('button'));
      const saveBtn = btns.find(b => b.textContent === 'Save Expense');
      if (saveBtn) {
        saveBtn.click();
        console.log('HOOK-DEBUG clicked save');
      }
      else console.log('HOOK-ERROR Save Expense button not found');
    });
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
  } catch (e) {
    console.error(e.message);
  }
})();
