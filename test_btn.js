const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  
  await page.goto('http://localhost:5174');
  
  // Fake supabase initialized
  await page.evaluate(() => {
    window.supabaseSyncInitialized = true;
    localStorage.setItem('insacc_supabase_enabled', 'true');
    localStorage.setItem('insacc_supabase_url', '"http://fake.url"');
    localStorage.setItem('insacc_supabase_key', '"fake_key"');
  });
  
  await new Promise(r => setTimeout(r, 1000)); // wait for renders

  // Wait for Property router link or something to navigate
  await page.evaluate(() => {
    window.addEventListener('insacc-sync-start', (e) => console.log('SYNC-START:', e.detail.key));
  });

  // Since we are not authenticated to the router maybe we need to mock it.
  // Actually, let's just trigger testSetPropExpenses if available
  await page.evaluate(() => {
    if (window.testSetPropExpenses) {
      window.testSetPropExpenses([{ id: 'test_btn', amount: 100 }]);
    }
  });

  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
