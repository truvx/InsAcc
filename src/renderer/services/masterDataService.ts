import type { Currency, TaxCode, PaymentTerm, Vendor, MasterCustomer } from '../data/masterData'
import { now } from '../../shared/utils/dateUtils'

export function getDefaultCurrencies(): Currency[] {
  return [
    { id: 'cur-aed', code: 'AED', symbol: 'د.إ', exchangeRate: 1, isBase: true },
    { id: 'cur-usd', code: 'USD', symbol: '$', exchangeRate: 3.6725, isBase: false },
  ]
}

export function getDefaultTaxCodes(): TaxCode[] {
  return [
    { id: 'tax-exempt', code: 'EXEMPT', name: 'Exempt Tax (0%)', rate: 0 },
    { id: 'tax-vat-5', code: 'VAT-5', name: 'VAT 5%', rate: 0.05 },
    { id: 'tax-vat-zero', code: 'VAT-ZERO', name: 'VAT Zero Rated (0%)', rate: 0 },
  ]
}

export function getDefaultPaymentTerms(): PaymentTerm[] {
  return [
    { id: 'term-receipt', name: 'Due on Receipt', dueDays: 0 },
    { id: 'term-net-15', name: 'Net 15', dueDays: 15 },
    { id: 'term-net-30', name: 'Net 30', dueDays: 30 },
    { id: 'term-net-60', name: 'Net 60', dueDays: 60 },
  ]
}

export function createVendor(
  name: string,
  code: string,
  options?: Partial<Omit<Vendor, 'id' | 'name' | 'code' | 'isActive' | 'createdAt' | 'updatedAt'>>,
): Vendor {
  const ts = now()
  const randomSuffix = Math.random().toString(36).substring(2, 6)
  return {
    id: `ven-${Date.now()}-${randomSuffix}`,
    name,
    code,
    email: options?.email,
    phone: options?.phone,
    taxRegistrationNumber: options?.taxRegistrationNumber,
    taxCodeId: options?.taxCodeId ?? 'tax-exempt',
    paymentTermId: options?.paymentTermId ?? 'term-net-30',
    payablesAccountId: options?.payablesAccountId ?? '2100', // AP ledger account
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  }
}

export function createCustomer(
  name: string,
  code: string,
  options?: Partial<Omit<MasterCustomer, 'id' | 'name' | 'code' | 'isActive' | 'createdAt' | 'updatedAt'>>,
): MasterCustomer {
  const ts = now()
  const randomSuffix = Math.random().toString(36).substring(2, 6)
  return {
    id: `cust-${Date.now()}-${randomSuffix}`,
    name,
    code,
    email: options?.email,
    phone: options?.phone,
    taxRegistrationNumber: options?.taxRegistrationNumber,
    taxCodeId: options?.taxCodeId ?? 'tax-exempt',
    paymentTermId: options?.paymentTermId ?? 'term-net-30',
    receivablesAccountId: options?.receivablesAccountId ?? '1320', // AR ledger account
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  }
}

export function calculateTaxAmount(amount: number, taxRate: number): number {
  return Math.round(amount * taxRate * 100) / 100
}
