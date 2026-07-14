import type { AccountingEngine } from './accountingEngine'
import type { Account, Voucher, PostingResult } from './types'

export interface LeaseInfo {
  id: string
  leaseNumber: string
  tenantName: string
  totalValue: number
  startDate: string
  endDate: string
  propertyType?: 'Building' | 'Villa' | 'Apartment' | 'Commercial' | 'Land' | string
}

export class PropertyAccountingService {
  private engine: AccountingEngine
  private accounts: Account[]
  private vouchers: Voucher[]

  constructor(engine: AccountingEngine, accounts: Account[], vouchers: Voucher[]) {
    this.engine = engine
    this.accounts = accounts
    this.vouchers = vouchers
  }

  public processSecurityDeposit(
    lease: LeaseInfo,
    amount: number,
    bankAccountId: string,
    baseCurrency: string = 'AED',
    userId: string = 'user'
  ): PostingResult {
    const sdAcct = this.accounts.find(a => a.code === '2120') // Security Deposits Liability
    
    if (!sdAcct) {
      return { success: false, errors: [{ field: 'accounts', message: 'Security Deposit Liability account (2120) not found.', code: 'ACCOUNT_NOT_FOUND' }] }
    }

    return this.engine.processAccountingEvent(
      'SECURITY_DEPOSIT_RECEIVED',
      {
        amount,
        date: lease.startDate,
        description: `Security Deposit for Lease ${lease.leaseNumber} - ${lease.tenantName}`,
        currency: baseCurrency,
        exchangeRate: 1,
        baseCurrency,
        bankAccount: bankAccountId,
        creditAccount: sdAcct.id,
        referenceType: 'Lease',
        referenceId: lease.id,
        createdBy: userId,
      },
      this.accounts,
      this.vouchers
    )
  }

  public processSecurityDepositPdcReceived(
    lease: LeaseInfo,
    amount: number,
    baseCurrency: string = 'AED',
    userId: string = 'user'
  ): PostingResult {
    const sdAcct = this.accounts.find(a => a.code === '2120')

    if (!sdAcct) {
      return { success: false, errors: [{ field: 'accounts', message: 'Security Deposit Liability account (2120) not found.', code: 'ACCOUNT_NOT_FOUND' }] }
    }

    return this.engine.processAccountingEvent(
      'SECURITY_DEPOSIT_PDC_RECEIVED',
      {
        amount,
        date: lease.startDate,
        description: `Security Deposit PDC for Lease ${lease.leaseNumber} - ${lease.tenantName}`,
        currency: baseCurrency,
        exchangeRate: 1,
        baseCurrency,
        creditAccount: sdAcct.id,
        referenceType: 'Lease',
        referenceId: lease.id,
        createdBy: userId,
      },
      this.accounts,
      this.vouchers
    )
  }

  public processFuturePdcReceived(
    lease: LeaseInfo,
    amount: number,
    chequeNumber: string,
    baseCurrency: string = 'AED',
    userId: string = 'user'
  ): PostingResult {
    const pdcAcct = this.accounts.find(a => a.code === '1410') // PDC on Hand

    if (!pdcAcct) {
      return { success: false, errors: [{ field: 'accounts', message: 'PDC Receivables account (1410) not found.', code: 'ACCOUNT_NOT_FOUND' }] }
    }

    return this.engine.processAccountingEvent(
      'FUTURE_PDC_RECEIVED',
      {
        amount,
        date: lease.startDate,
        description: `PDC Received: Chq ${chequeNumber} for Lease ${lease.leaseNumber}`,
        currency: baseCurrency,
        exchangeRate: 1,
        baseCurrency,
        referenceType: 'Lease',
        referenceId: lease.id,
        createdBy: userId,
      },
      this.accounts,
      this.vouchers
    )
  }
}

