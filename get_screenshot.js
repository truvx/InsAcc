const puppeteer = require('puppeteer');
(async () => {
  try {
    const browserURL = 'http://127.0.0.1:9222';
    const browser = await puppeteer.connect({ browserURL });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('5175') || p.url().includes('localhost'));
    
    if (page) {
      await page.evaluate(() => {
        // Force the sync indicator to show!
        window.dispatchEvent(new CustomEvent('insacc-sync-start', { detail: { key: 'test_force' } }));
      });
      
      // Wait for it to render
      await new Promise(r => setTimeout(r, 200));
      
      await page.screenshot({ path: '/Users/t6ux/.gemini/antigravity-ide/brain/ccd3f296-f265-4e37-a50d-7ee89d7b0207/user_active_tab.png' });
      console.log('Saved screenshot of user tab');
    } else {
      console.log('User tab not found');
    }
    browser.disconnect();
  } catch (e) {
    console.error(e.message);
  }
})();
