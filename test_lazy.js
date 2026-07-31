const puppeteer = require('puppeteer');
(async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.goto('http://localhost:5175', { waitUntil: 'networkidle0' });
    
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
    
    // Wait for boot to finish and get to dashboard
    await new Promise(r => setTimeout(r, 4000));
    
    let logs = [];
    page.on('console', msg => logs.push(msg.text()));
    
    // Add event listener to track dispatches
    await page.evaluate(() => {
      window.addEventListener('insacc-sync-start', (e) => console.log('HOOK-START', e.detail.key));
      window.addEventListener('insacc-sync-end', (e) => console.log('HOOK-END', e.detail.key));
    });
    
    // Go to Property Expenses
    await page.evaluate(() => {
      window.location.hash = '#/property/expenses';
    });
    await new Promise(r => setTimeout(r, 1000));
    
    // Click Add Expense
    await page.evaluate(() => {
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add Expense'));
      if (addBtn) addBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    
    // Fill form
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select'));
      const amountInput = inputs.find(i => i.placeholder === '0.00' || i.type === 'number');
      if (amountInput) {
        amountInput.value = '250';
        amountInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      const categorySelect = Array.from(document.querySelectorAll('select')).find(s => s.innerHTML.includes('Repair'));
      if (categorySelect) {
        categorySelect.value = categorySelect.options[1].value;
        categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Save Expense');
      if (saveBtn) saveBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('Logs captured:', logs.filter(l => l.includes('HOOK')));
    
    await browser.close();
  } catch (e) {
    console.error(e.message);
  }
})();
