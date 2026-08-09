const LANG: Record<string, Record<string, string>> = {
  English: {
    dashboard: 'Dashboard',
    investments: 'Investments',
    accounting: 'Accounting',
    'bank-accounts': 'Bank Accounts',
    reports: 'Reports',
    documents: 'Documents',
    history: 'History',
    settings: 'Settings',
    'purchase-ledger': 'Purchase Ledger',
    logout: 'Logout',
    totalWealth: 'Total Wealth',
    totalInvested: 'Total Invested',
    bankBalance: 'Bank Balance',
    totalProfit: 'Total Profit',
    capital: 'Capital',
    monthlyIncome: 'Monthly Income',
    monthlyExpense: 'Monthly Expense',
    vsLastMonth: 'vs last month',
    managePortfolio: 'Manage your investment portfolio',
    trackAccounting: 'Payment Voucher, Receipt Voucher & Journal Voucher tracking',
    manageAccounts: 'Manage your bank accounts and balances',
    generateReports: 'Generate financial reports and statements',
    manageDocs: 'Store and manage investment documents',
    viewHistory: 'View your investment history and timeline',
    systemConfig: 'System configuration and preferences',
    welcomeBack: 'Welcome back',
    profileSelect: 'Select your profile to continue',
    pinLogin: 'PIN Login',
    password: 'Password',
    enterPin: 'Enter your 4-digit PIN',
  },
  Arabic: {
    dashboard: 'لوحة التحكم',
    investments: 'الاستثمارات',
    accounting: 'المحاسبة',
    'bank-accounts': 'الحسابات البنكية',
    reports: 'التقارير',
    documents: 'المستندات',
    history: 'السجل',
    settings: 'الإعدادات',
    'purchase-ledger': 'دفتر المشتريات',
    logout: 'تسجيل الخروج',
    totalWealth: 'إجمالي الثروة',
    totalInvested: 'إجمالي المستثمر',
    bankBalance: 'الرصيد البنكي',
    totalProfit: 'إجمالي الربح',
    capital: 'رأس المال',
    monthlyIncome: 'الدخل الشهري',
    monthlyExpense: 'المصروفات الشهرية',
    vsLastMonth: 'مقارنة بالشهر الماضي',
    managePortfolio: 'إدارة محفظتك الاستثمارية',
    trackAccounting: 'تتبع سندات الدفع والاستلام والقيود',
    manageAccounts: 'إدارة حساباتك البنكية والأرصدة',
    generateReports: 'إنشاء التقارير المالية',
    manageDocs: 'تخزين وإدارة مستندات الاستثمار',
    viewHistory: 'عرض سجل الاستثمار والجدول الزمني',
    systemConfig: 'إعدادات النظام والتفضيلات',
    welcomeBack: 'مرحباً بعودتك',
    profileSelect: 'اختر ملفك الشخصي للمتابعة',
    pinLogin: 'دخول برقم التعريف',
    password: 'كلمة المرور',
    enterPin: 'أدخل رقم التعريف المكون من 4 أرقام',
  },
  French: {
    dashboard: 'Tableau de bord',
    investments: 'Investissements',
    accounting: 'Comptabilité',
    'bank-accounts': 'Comptes bancaires',
    reports: 'Rapports',
    documents: 'Documents',
    history: 'Historique',
    settings: 'Paramètres',
    'purchase-ledger': 'Registre des achats',
    logout: 'Déconnexion',
    totalWealth: 'Patrimoine total',
    totalInvested: 'Total investi',
    bankBalance: 'Solde bancaire',
    totalProfit: 'Bénéfice total',
    capital: 'Capital',
    monthlyIncome: 'Revenu mensuel',
    monthlyExpense: 'Dépenses mensuelles',
    vsLastMonth: 'vs mois dernier',
    managePortfolio: 'Gérer votre portefeuille',
    trackAccounting: 'Suivi des reçus, paiements et écritures',
    manageAccounts: 'Gérer vos comptes bancaires',
    generateReports: 'Générer des rapports financiers',
    manageDocs: 'Stocker et gérer les documents',
    viewHistory: 'Voir votre historique',
    systemConfig: 'Configuration du système',
    welcomeBack: 'Bon retour',
    profileSelect: 'Sélectionnez votre profil',
    pinLogin: 'Code PIN',
    password: 'Mot de passe',
    enterPin: 'Entrez votre code PIN à 4 chiffres',
  },
}

export function t(key: string, lang: string = 'English'): string {
  return LANG[lang]?.[key] || LANG['English']?.[key] || key
}

export function formatDate(dateStr: string, format: string = 'DD/MM/YYYY'): string {
  if (!dateStr) return ''
  
  // Strip time portion from ISO datetime strings
  const datePart = dateStr.split('T')[0]
  
  // Handle dash separated (YYYY-MM-DD or DD-MM-YYYY)
  const dashParts = datePart.split('-')
  if (dashParts.length === 3) {
    let [y, m, d] = dashParts
    if (y.length !== 4 && d.length === 4) {
      // It's DD-MM-YYYY
      d = dashParts[0]
      m = dashParts[1]
      y = dashParts[2]
    }
    
    if (format === 'MM/DD/YYYY') return `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`
    if (format === 'YYYY-MM-DD') return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
  }
  
  // Handle slash separated (DD/MM/YYYY, D/M/YY, YYYY/MM/DD)
  const slashParts = datePart.split('/')
  if (slashParts.length === 3) {
    let [dStr, mStr, yStr] = slashParts
    if (dStr.length === 4) {
      // It's YYYY/MM/DD
      yStr = slashParts[0]
      mStr = slashParts[1]
      dStr = slashParts[2]
    }
    
    if (yStr.length === 2) {
      yStr = '20' + yStr // Assume 2000s for 2-digit years
    }
    
    const y = yStr.padStart(4, '0')
    const m = mStr.padStart(2, '0')
    const d = dStr.padStart(2, '0')
    
    if (format === 'MM/DD/YYYY') return `${m}/${d}/${y}`
    if (format === 'YYYY-MM-DD') return `${y}-${m}-${d}`
    return `${d}/${m}/${y}`
  }
  
  // Fallback to JS Date parsing
  const dObj = new Date(dateStr)
  if (!isNaN(dObj.getTime())) {
    const y = String(dObj.getFullYear())
    const m = String(dObj.getMonth() + 1).padStart(2, '0')
    const d = String(dObj.getDate()).padStart(2, '0')
    
    if (format === 'MM/DD/YYYY') return `${m}/${d}/${y}`
    if (format === 'YYYY-MM-DD') return `${y}-${m}-${d}`
    return `${d}/${m}/${y}`
  }

  return dateStr
}

export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber === '----') return ''
  return `****${accountNumber.slice(-4)}`
}

export function getBankDisplayName(bank?: { institution: string } | null): string {
  if (!bank) return 'Unknown Bank'
  return bank.institution
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / Math.pow(1024, i)
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatModifiedDateTime(isoStr: string): string {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return isoStr
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const dd = String(d.getDate()).padStart(2, '0')
  const mmm = months[d.getMonth()]
  const yyyy = d.getFullYear()
  
  let hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12
  const hh = String(hours).padStart(2, '0')
  
  return `${dd} ${mmm} ${yyyy} ${hh}:${minutes} ${ampm}`
}
