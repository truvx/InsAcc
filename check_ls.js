const puppeteer = require('puppeteer');
(async () => {
  try {
    const browserURL = 'http://127.0.0.1:9222';
    const browser = await puppeteer.connect({ browserURL });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('5175') || p.url().includes('localhost'));
    
    if (page) {
      const ls = await page.evaluate(() => {
        return {
          enabled: localStorage.getItem('insacc_supabase_enabled'),
          url: localStorage.getItem('insacc_supabase_url'),
          key: localStorage.getItem('insacc_supabase_key'),
          initialized: window.supabaseSyncInitialized
        };
      });
      console.log('LocalStorage:', ls);
    }
    browser.disconnect();
  } catch (e) {
    console.error(e.message);
  }
})();
