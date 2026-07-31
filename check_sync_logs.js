const puppeteer = require('puppeteer');
(async () => {
  try {
    const browserURL = 'http://127.0.0.1:9222';
    const browser = await puppeteer.connect({ browserURL });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('5175') || p.url().includes('localhost'));
    
    if (page) {
      // Intercept console.log
      let logs = [];
      page.on('console', msg => logs.push(msg.text()));
      
      // Override dispatchEvent to log it!
      await page.evaluate(() => {
        const originalDispatch = window.dispatchEvent;
        window.dispatchEvent = function(event) {
          if (event.type.startsWith('insacc-sync')) {
            console.log('DISPATCHED:', event.type, event.detail?.key);
          }
          return originalDispatch.apply(this, arguments);
        };
        console.log('Injected dispatchEvent logger');
      });
      
      console.log('Please click "Save Expense" in the user interface!');
      
      // We wait for 5 seconds to see if any logs appear
      await new Promise(r => setTimeout(r, 5000));
      
      console.log('Logs captured during those 5 seconds:', logs);
      
      // Restore
      await page.evaluate(() => {
        // can't easily restore without keeping a reference on window, but it's fine for now
      });
    }
    browser.disconnect();
  } catch (e) {
    console.error(e.message);
  }
})();
