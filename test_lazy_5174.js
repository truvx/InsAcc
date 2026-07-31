const puppeteer = require('puppeteer');
(async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    let allLogs = [];
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
      sessionStorage.setItem('insacc_pin_verified', 'true');
    });
    
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 4000));
    
    await page.evaluate(() => {
      window.location.hash = '#/property/expenses';
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
          i.value = '250';
          i.dispatchEvent(new Event('input', { bubbles: true }));
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
