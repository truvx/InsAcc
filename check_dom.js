const puppeteer = require('puppeteer');
(async () => {
  try {
    const browserURL = 'http://127.0.0.1:9222';
    const browser = await puppeteer.connect({ browserURL });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('5175') || p.url().includes('localhost'));
    
    if (page) {
      const domStatus = await page.evaluate(() => {
        const divs = Array.from(document.querySelectorAll('div'));
        const syncDiv = divs.find(d => {
          const style = window.getComputedStyle(d);
          return style.zIndex === '9999' && style.position === 'fixed';
        });
        
        if (!syncDiv) return "NOT FOUND";
        
        return {
          html: syncDiv.outerHTML,
          opacity: window.getComputedStyle(syncDiv).opacity,
          display: window.getComputedStyle(syncDiv).display,
          pointerEvents: window.getComputedStyle(syncDiv).pointerEvents,
          textContent: syncDiv.textContent
        };
      });
      console.log('DOM Status:', JSON.stringify(domStatus, null, 2));
    }
    browser.disconnect();
  } catch (e) {
    console.error(e.message);
  }
})();
