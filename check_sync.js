const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Set fake local storage to enable sync logic
  await page.goto('http://localhost:5174');
  await page.evaluate(() => {
    localStorage.setItem('insacc_supabase_enabled', 'true');
    localStorage.setItem('insacc_supabase_url', '"https://fake.supabase.co"');
    localStorage.setItem('insacc_supabase_key', '"fakekey"');
    window.supabaseSyncInitialized = true;
  });
  
  await page.reload();
  await new Promise(r => setTimeout(r, 2000));
  
  // Dispatch an event
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('insacc-sync-start', { detail: { key: 'test' } }));
  });
  
  await new Promise(r => setTimeout(r, 500));
  
  // Take a screenshot
  await page.screenshot({ path: 'sync_indicator_test.png' });
  
  await browser.close();
})();
