const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
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
  
  // Add some fake data to make it look nice
  await page.evaluate(() => {
    // Inject some fake text into dashboard so it doesn't look empty
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      // Just so it's rendering something
    }
  });
  
  // Dispatch the event and take a screenshot!
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('insacc-sync-start', { detail: { key: 'test' } }));
  });
  
  // Wait 100ms for React to render the SyncIndicator
  await new Promise(r => setTimeout(r, 100));
  
  await page.screenshot({ path: 'sync_indicator_saving.png' });
  
  // Now simulate end event
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('insacc-sync-end', { detail: { key: 'test', success: true } }));
  });
  
  // Wait for the minDisplayTime (800ms) to pass so it switches to Synced
  await new Promise(r => setTimeout(r, 900));
  
  await page.screenshot({ path: 'sync_indicator_synced.png' });
  
  await browser.close();
})();
