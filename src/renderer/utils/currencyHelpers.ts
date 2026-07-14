/**
 * Currency Display Helpers
 * 
 * Provides utilities for consistent currency formatting across the application.
 * All monetary values should use the CurrencyText component or formatCurrency function
 * to ensure consistent typography.
 */

import { formatCurrency as baseFormatCurrency } from './reportFormatters'

/**
 * Format a number as currency with standardized display
 * @param value - The numeric value to format
 * @param currency - Currency code (default: 'AED')
 * @returns Formatted currency string in the format "AED 1,234.56"
 * 
 * @example
 * formatCurrency(1234.56) // "AED 1,234.56"
 * formatCurrency(1234.56, 'INR') // "INR 1,234.56"
 * formatCurrency(-1234.56) // "-AED 1,234.56"
 */
export function formatCurrency(value: number, currency: string = 'AED'): string {
  return baseFormatCurrency(value, currency);
}

/**
 * Deprecated: Use CurrencyText component or formatCurrency() instead
 * This inline formatting style is inconsistent and should be avoided
 * 
 * @deprecated
 */
export function inlineFormatCurrency(value: number, currency: string = 'AED'): string {
  console.warn('inlineFormatCurrency is deprecated. Use CurrencyText component or formatCurrency() instead')
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
}

/**
 * Parse a formatted currency string back to a number
 * @param formattedCurrency - String like "AED 1,234.56"
 * @returns The numeric value
 */
export function parseCurrency(formattedCurrency: string): number {
  // Remove currency code and spaces
  const numericPart = formattedCurrency.replace(/[A-Z]{3}\s+/gi, '').replace(/,/g, '')
  return parseFloat(numericPart) || 0
}

/**
 * Get currency symbol for a currency code
 * Note: Most currencies in this app use the code (AED, INR, GBP) rather than symbols
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    AED: 'AED',
    INR: '₹',
    GBP: '£',
    USD: '$',
  }
  return symbols[currency] || currency
}
