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
      
      console.log('HOOK-DEBUG Calling testSetPropExpenses');
      if (window.testSetPropExpenses) {
        window.testSetPropExpenses([{ id: 'test', amount: 100 }]);
      } else {
        console.log('HOOK-ERROR testSetPropExpenses is missing');
      }
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
  } catch (e) {
    console.error(e.message);
  }
})();
