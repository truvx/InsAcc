const puppeteer = require('puppeteer');
(async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    let logs = [];
    page.on('console', msg => logs.push(msg.text()));
    
    // intercept network or just inject a script to override console?
    // Let's just modify useLazyPersistedState.ts to add console.logs!
  } catch (e) {
    console.error(e.message);
  }
})();
