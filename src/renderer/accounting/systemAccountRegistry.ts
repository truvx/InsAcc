import { Account } from './types'
import { resolveAccount } from './chartOfAccountsService'

export const SystemAccountRegistry = {
  getInvestmentAssetAccount(accounts: Account[]): Account | undefined {
    return resolveAccount('1200', accounts) || resolveAccount('Investment Assets', accounts) || resolveAccount('Investments', accounts)
  },

  getPropertyAssetAccount(accounts: Account[]): Account | undefined {
    return resolveAccount('1270', accounts) || resolveAccount('Property Assets', accounts) || resolveAccount('Real Estate', accounts)
  },

  getCashAccount(accounts: Account[]): Account | undefined {
    return resolveAccount('1110-inv', accounts) || resolveAccount('1110-prop', accounts) || resolveAccount('1110', accounts) || resolveAccount('Cash', accounts) || resolveAccount('Cash In Hand', accounts) || resolveAccount('Cash on Hand', accounts)
  },

  getBankAccount(accounts: Account[]): Account | undefined {
    return resolveAccount('1120', accounts) || resolveAccount('Bank', accounts) || resolveAccount('Bank Accounts', accounts) || resolveAccount('Cash and Bank Accounts', accounts)
  },

  getBuildingRentalIncomeAccount(accounts: Account[]): Account | undefined {
    return resolveAccount('4120', accounts) || resolveAccount('Building Rental Income', accounts)
  },

  getVillaRentalIncomeAccount(accounts: Account[]): Account | undefined {
    return resolveAccount('4200', accounts) || resolveAccount('Villa Rental Income', accounts)
  },

  getApartmentRentalIncomeAccount(accounts: Account[]): Account | undefined {
    return resolveAccount('4210', accounts) || resolveAccount('Apartment Rental Income', accounts)
  },

  /** @deprecated Use getBuildingRentalIncomeAccount instead */
  getRentalIncomeAccount(accounts: Account[]): Account | undefined {
    return resolveAccount('4120', accounts) || resolveAccount('Building Rental Income', accounts)
  },

  getInvestmentIncomeAccount(accounts: Account[]): Account | undefined {
    return resolveAccount('4200', accounts) || resolveAccount('Investment Income', accounts)
  },

  getSecurityDepositLiability(accounts: Account[]): Account | undefined {
    return resolveAccount('2120', accounts) || resolveAccount('Security Deposit Liability', accounts) || resolveAccount('Security Deposits Held', accounts)
  },

  getAccountsReceivable(accounts: Account[]): Account | undefined {
    return resolveAccount('1320', accounts) || resolveAccount('Accounts Receivable', accounts)
  },

  getAccountsPayable(accounts: Account[]): Account | undefined {
    return resolveAccount('2100', accounts) || resolveAccount('Accounts Payable', accounts)
  },

  getExpenseAccount(accounts: Account[]): Account | undefined {
    return resolveAccount('5000', accounts) || resolveAccount('Expenses', accounts)
  },

  getOwnerEquityAccount(accounts: Account[]): Account | undefined {
    return resolveAccount('3000', accounts) || resolveAccount('Owner Equity', accounts)
  },

  getRetainedEarningsAccount(accounts: Account[]): Account | undefined {
    return resolveAccount('3200', accounts) || resolveAccount('Current Year Earnings', accounts) || resolveAccount('Retained Earnings', accounts)
  },

  getPdcReceivablesAccount(accounts: Account[]): Account | undefined {
    return resolveAccount('1410', accounts) || resolveAccount('Post-dated Cheques Receivable', accounts) || resolveAccount('PDC Receivables', accounts)
  },

  getDividendIncomeAccount(accounts: Account[]): Account | undefined {
    return resolveAccount('4110', accounts) || resolveAccount('Dividend Income', accounts)
  },

  getInterestIncomeAccount(accounts: Account[]): Account | undefined {
    return resolveAccount('4140', accounts) || resolveAccount('Interest Income', accounts)
  },

  getLateFeeIncomeAccount(accounts: Account[]): Account | undefined {
    return resolveAccount('4150', accounts) || resolveAccount('Late Fee Income', accounts)
  },

  getMaintenanceExpenseAccount(accounts: Account[]): Account | undefined {
    return resolveAccount('5120', accounts) || resolveAccount('Maintenance Expense', accounts)
  },

  getInterestExpenseAccount(accounts: Account[]): Account | undefined {
    return resolveAccount('5170', accounts) || resolveAccount('Interest Expense', accounts)
  },

  getTaxExpenseAccount(accounts: Account[]): Account | undefined {
    return resolveAccount('5180', accounts) || resolveAccount('Tax Expense', accounts)
  },

  getDamageRecoveryIncomeAccount(accounts: Account[]): Account | undefined {
    return resolveAccount('4160', accounts) || resolveAccount('Damage Recovery Income', accounts)
  }
}
