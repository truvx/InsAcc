const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  
  await page.goto('http://localhost:5174');
  
  // Wait for React to load
  await page.waitForFunction(() => !!window.testSetPropExpenses, { timeout: 10000 }).catch(e => console.log('testSetPropExpenses not found'));
  
  console.log('Dispatching test sync start...');
  await page.evaluate(() => {
    window.addEventListener('insacc-sync-start', (e) => console.log('GOT insacc-sync-start:', e.detail.key));
    window.addEventListener('insacc-sync-end', (e) => console.log('GOT insacc-sync-end:', e.detail.key));
    
    if (window.testSetPropExpenses) {
      window.testSetPropExpenses([{ id: 'test', amount: 100 }]);
    } else {
      console.log('testSetPropExpenses is undefined');
    }
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
