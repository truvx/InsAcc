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
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const [y, m, d] = parts
  if (format === 'MM/DD/YYYY') return `${m}/${d}/${y}`
  if (format === 'YYYY-MM-DD') return `${y}-${m}-${d}`
  return `${d}/${m}/${y}`
}

export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber === '----') return ''
  return `****${accountNumber.slice(-4)}`
}
