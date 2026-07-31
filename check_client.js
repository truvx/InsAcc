const puppeteer = require('puppeteer');
(async () => {
  try {
    const browserURL = 'http://127.0.0.1:9222';
    const browser = await puppeteer.connect({ browserURL });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('5175') || p.url().includes('localhost'));
    
    if (page) {
      const clientCreationResult = await page.evaluate(() => {
        try {
          const { createClient } = window.supabase || {};
          // Wait, createClient is bundled, it's not on window.supabase in a Vite app usually.
          return 'Cannot test directly, but let us look for errors in console';
        } catch (e) {
          return e.message;
        }
      });
      console.log(clientCreationResult);
      
      const logs = await page.evaluate(() => {
        return window.debugLogs || 'No logs captured';
      });
      console.log(logs);
    }
    browser.disconnect();
  } catch (e) {
    console.error(e.message);
  }
})();
