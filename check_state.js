const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch({ headless: true });
  const page = await b.newPage();
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle', timeout: 15000 });
  
  const state = await page.evaluate(() => {
    const result = {};
    
    // Check supabase settings
    result.supabaseEnabled = localStorage.getItem('insacc_supabase_enabled');
    result.supabaseUrl = localStorage.getItem('insacc_supabase_url')?.slice(0, 80);
    
    // Check if there are vouchers in the investment module that reference bank accounts
    const invVouchersRaw = localStorage.getItem('insacc_vouchers');
    if (invVouchersRaw) {
      const invVouchers = JSON.parse(invVouchersRaw);
      result.invVouchersCount = invVouchers.length;
      // Find bank-related vouchers
      const bankRelated = invVouchers.filter(v => 
        v.lines?.some(l => 
          l.accountId?.includes('1120') || 
          l.accountId?.includes('dib') || 
          l.accountId?.includes('fab') || 
          l.accountId?.startsWith('acct-')
        )
      );
      result.invBankRelatedVouchers = bankRelated.length;
      if (bankRelated.length > 0) {
        result.sampleBankVoucher = bankRelated[0];
      }
    }
    
    // Check prop vouchers
    const propVouchersRaw = localStorage.getItem('insacc_prop_vouchers');
    if (propVouchersRaw) {
      const propVouchers = JSON.parse(propVouchersRaw);
      result.propVouchersCount = propVouchers.length;
      // Check if any voucher references bank accounts
      const bankRelated = propVouchers.filter(v => 
        v.lines?.some(l => 
          l.accountId?.includes('1120') || 
          l.accountId?.includes('dib') || 
          l.accountId?.includes('fab') || 
          l.accountId?.startsWith('acct-')
        )
      );
      result.propBankRelatedVouchers = bankRelated.length;
    }
    
    // Count ALL localStorage keys
    result.totalKeys = localStorage.length;
    
    return result;
  });
  
  console.log(JSON.stringify(state, null, 2));
  await b.close();
})();
