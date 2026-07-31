const puppeteer = require('puppeteer');
(async () => {
  try {
    const browserURL = 'http://127.0.0.1:9222';
    const browser = await puppeteer.connect({ browserURL });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('5175') || p.url().includes('localhost'));
    
    if (page) {
      await page.evaluate(() => {
        window.lastSyncEvents = [];
        window.addEventListener('insacc-sync-start', (e) => window.lastSyncEvents.push('start:' + e.detail.key));
        window.addEventListener('insacc-sync-end', (e) => window.lastSyncEvents.push('end:' + e.detail.key));
        
        // Let's trigger a fake save using the local storage hook if we can
        // Wait, the best way is to tell the user to click save, and then read window.lastSyncEvents!
      });
      console.log('Injected event listeners into user page');
    }
    browser.disconnect();
  } catch (e) {
    console.error(e.message);
  }
})();
