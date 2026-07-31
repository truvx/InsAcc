const puppeteer = require('puppeteer');
(async () => {
  try {
    const browserURL = 'http://127.0.0.1:9222';
    const browser = await puppeteer.connect({ browserURL });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('5175') || p.url().includes('localhost'));
    
    if (page) {
      const storageFired = await page.evaluate(() => {
        return new Promise((resolve) => {
          let fired = false;
          const handler = (e) => {
            if (e.key === 'test_key_sync') {
              fired = true;
            }
          };
          window.addEventListener('storage', handler);
          localStorage.setItem('test_key_sync', 'value');
          
          setTimeout(() => {
            window.removeEventListener('storage', handler);
            resolve(fired);
          }, 100);
        });
      });
      console.log('Did storage event fire in same window?', storageFired);
    }
    browser.disconnect();
  } catch (e) {
    console.error(e.message);
  }
})();
