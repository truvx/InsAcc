import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import type { Profile } from './data/sampleData'
import type { UserEntry, LogEntry } from './data/types'
import type { BankAccount, BankTransaction, StatementEntry } from './data/banking'
import type { AuditEvent } from './data/auditTypes'
import type { PropAccount, PropTransaction, PropertyEntry, UnitEntry, TenantEntry, LeaseEntry, PdcCheque, PropDocItem, MainCategory, PropProperty, IncomeCategory, Customer, SecurityDeposit, SecurityDepositTransaction, SecurityDepositGlMappings, PropertyExpense, PropertyTransactionCategory, VendorEntry } from './data/propertyTypes'
import {
  getDefaultPropertyTransactionCategories,
  getDefaultMainCategories,
  getDefaultHierarchyProperties,
  getDefaultIncomeCategories,
  getDefaultCustomers
} from './data/propertyTypes'
import type { Investment } from './components/Investments'
import type { Transaction } from './components/Transactions'
import type { DocItem } from './components/Documents'
import type { PurchaseCategory, Purchase } from './data/purchaseData'
import { getDefaultCategories } from './data/purchaseData'
import type { PurchaseRecord } from './data/purchaseLedger'
import type { Account, Voucher, BankMapping, BankReconciliationRecord, FiscalYear } from './accounting/types'
import type { Currency, TaxCode, PaymentTerm, Vendor as MasterVendor, MasterCustomer, AssetType, FixedAsset } from './data/masterData'
import type { InvestmentCategory, InvestmentAsset } from './data/investmentMasterData'
import { getDefaultInvestmentCategories, getDefaultInvestmentAssets } from './data/investmentMasterData'
import type { MasterDataState } from './contexts/MasterDataContext'
import { createAccountingEngine } from './accounting/accountingEngine'
import { initializeDefaultChartOfAccounts, generateChildCode, shortenAccountCodes } from './accounting/chartOfAccountsService'
import { syncAllInvestments } from './services/investmentAggregationService'
import { getDefaultCurrencies, getDefaultTaxCodes, getDefaultPaymentTerms } from './services/masterDataService'
import { initializeApplication } from './services/initializationService'
import { getDefaultFiscalYears } from './accounting/periodService'
import { invalidateBalanceCache } from './accounting/ledgerService'

import { useLazyPersistedState, clearPersistedCache } from './utils/lazyPersistedState'
import { MasterDataProvider } from './contexts/MasterDataContext'
import SupabaseSyncManager from './components/SupabaseSyncManager'
import SyncIndicator from './components/SyncIndicator'
import { getSupabaseClient, pushState, pushAllLocalData } from './services/supabaseSyncService'
import { initHistory, undo, redo, canUndo, canRedo, subscribeToHistory } from './services/historyService'
import { Undo2, Redo2 } from 'lucide-react'

export interface LoginEntry {
  email: string
  password: string
  name: string
  role: 'Admin' | 'Accounts'
}

// One-time localStorage migrations (fast on warm boot — only checks migration keys)
function runMigrations() {
  try {
    const shortenVouchersKey = 'insacc_shorten_voucher_numbers_v1'
    if (!localStorage.getItem(shortenVouchersKey)) {
      try {
        const regex = /^([A-Z]+-\d{4})-000(\d{3})$/
        
        const invRaw = localStorage.getItem('insacc_vouchers')
        if (invRaw) {
          const invVouchers = JSON.parse(invRaw)
          if (Array.isArray(invVouchers)) {
            let modified = false
            const updated = invVouchers.map((v: any) => {
              if (v.number && regex.test(v.number)) {
                modified = true
                return { ...v, number: v.number.replace(regex, '$1-$2') }
              }
              return v
            })
            if (modified) localStorage.setItem('insacc_vouchers', JSON.stringify(updated))
          }
        }

        const propRaw = localStorage.getItem('insacc_prop_vouchers')
        if (propRaw) {
          const propVouchers = JSON.parse(propRaw)
          if (Array.isArray(propVouchers)) {
            let modified = false
            const updated = propVouchers.map((v: any) => {
              if (v.number && regex.test(v.number)) {
                modified = true
                return { ...v, number: v.number.replace(regex, '$1-$2') }
              }
              return v
            })
            if (modified) localStorage.setItem('insacc_prop_vouchers', JSON.stringify(updated))
          }
        }
      } catch (e) {
        console.error('Failed to shorten voucher numbers:', e)
      }
      localStorage.setItem(shortenVouchersKey, 'true')
    }

    const hierarchyResetKey = 'insacc_hierarchy_reset_v5'
    if (!localStorage.getItem(hierarchyResetKey)) {
      const isE2E = typeof window !== 'undefined' && window.navigator.webdriver;
      if (!isE2E) {
        localStorage.removeItem('insacc_main_categories')
        localStorage.removeItem('insacc_hierarchy_properties')
        localStorage.removeItem('insacc_income_categories')
        localStorage.removeItem('insacc_customers')
      }
      localStorage.setItem(hierarchyResetKey, 'true')
    }

    const zeroedSeedBalanceKey = 'insacc_inv_bank_ob_zeroed_v4'
    if (!localStorage.getItem(zeroedSeedBalanceKey)) {
      try {
        const baRaw = localStorage.getItem('insacc_bank_accounts')
        if (baRaw) {
          const bas = JSON.parse(baRaw)
          if (Array.isArray(bas)) {
            const patched = bas.map((ba: any) =>
              ba.id === 'ba-eib-invest' && Number(ba.openingBalance) === 500000 ? { ...ba, openingBalance: 0 } : ba
            )
            localStorage.setItem('insacc_bank_accounts', JSON.stringify(patched))
          }
        }
        const accRaw = localStorage.getItem('insacc_accounts')
        if (accRaw) {
          const accs = JSON.parse(accRaw)
          if (Array.isArray(accs)) {
            const patched = accs.map((a: any) =>
              (a.id === 'acc-eib-invest' || (a.code && a.code.startsWith('1120') && Number(a.openingBalance) === 500000)) ? { ...a, openingBalance: 0 } : a
            )
            localStorage.setItem('insacc_accounts', JSON.stringify(patched))
          }
        }
      } catch (_e) {}
      localStorage.setItem(zeroedSeedBalanceKey, 'true')
    }

    const clearedLeasesKey = 'insacc_leases_cleared_v1'
    if (!localStorage.getItem(clearedLeasesKey)) {
      localStorage.setItem('insacc_prop_leases', '[]')
      localStorage.setItem('insacc_pdc_cheques', '[]')
      localStorage.setItem('insacc_security_deposits', '[]')
      localStorage.setItem(clearedLeasesKey, 'true')
    }

    const receivablesConsolidationKey = 'insacc_prop_receivables_consolidation_v1'
    if (!localStorage.getItem(receivablesConsolidationKey)) {
      try {
        const propRaw = localStorage.getItem('insacc_prop_chart_accounts')
        if (propRaw) {
          const propAccts = JSON.parse(propRaw)
          if (Array.isArray(propAccts)) {
            const filtered = propAccts.filter((a: any) => a.code !== '1320' && a.code !== '1130')
            localStorage.setItem('insacc_prop_chart_accounts', JSON.stringify(filtered))
          }
        }
        const vouchersRaw = localStorage.getItem('insacc_prop_vouchers')
        if (vouchersRaw) {
          const vouchers = JSON.parse(vouchersRaw)
          if (Array.isArray(vouchers)) {
            const remapped = vouchers.map((v: any) => {
              if (!v?.lines) return v
              const lines = v.lines.map((l: any) => {
                if (l.accountId === '1320' || l.accountId === '1130') {
                  return { ...l, accountId: '1410' }
                }
                return l
              })
              return { ...v, lines }
            })
            localStorage.setItem('insacc_prop_vouchers', JSON.stringify(remapped))
          }
        }
        localStorage.setItem(receivablesConsolidationKey, 'true')
      } catch (e) {
        console.error('Receivables consolidation migration failed:', e)
      }
    }

    const removeRedundantPdcVouchersKey = 'insacc_prop_remove_redundant_pdc_vouchers_v1'
    if (!localStorage.getItem(removeRedundantPdcVouchersKey)) {
      try {
        const vouchersRaw = localStorage.getItem('insacc_prop_vouchers')
        if (vouchersRaw) {
          const vouchers = JSON.parse(vouchersRaw)
          if (Array.isArray(vouchers)) {
            const cleaned = vouchers.filter(v => {
              const desc = v.description || ''
              const isPdcReceived = desc.includes('PDC Received: Chq') || v.number?.startsWith('JV-PDC-FIX')
              return !isPdcReceived
            })
            localStorage.setItem('insacc_prop_vouchers', JSON.stringify(cleaned))
          }
        }
        localStorage.setItem(removeRedundantPdcVouchersKey, 'true')
      } catch (e) {
        console.error('Failed to remove redundant PDC vouchers:', e)
      }
    }

    const securityDepositFixKey = 'insacc_prop_security_deposit_fix_v1'
    if (!localStorage.getItem(securityDepositFixKey)) {
      try {
        const depositsRaw = localStorage.getItem('insacc_security_deposits')
        const vouchersRaw = localStorage.getItem('insacc_prop_vouchers')
        const accountsRaw = localStorage.getItem('insacc_prop_chart_accounts')
        if (depositsRaw && vouchersRaw && accountsRaw) {
          const deposits = JSON.parse(depositsRaw)
          const vouchers = JSON.parse(vouchersRaw)
          const accounts = JSON.parse(accountsRaw)
          
          if (Array.isArray(deposits) && Array.isArray(vouchers) && Array.isArray(accounts)) {
            let modifiedVouchers = false
            let modifiedDeposits = false
            
            const updatedDeposits = deposits.map(d => {
              const rxTx = d.transactions?.find((t: any) => t.type === 'Receipt')
              if (rxTx && (!rxTx.voucherId || !vouchers.some(v => v.id === rxTx.voucherId))) {
                const amount = rxTx.amount || d.amount || 0
                if (amount > 0) {
                  const isCheque = rxTx.paymentMode === 'Security Cheque' || rxTx.paymentMode === 'Cheque'
                  const bankAcctId = rxTx.bankAccountId || (rxTx.paymentMode === 'Cash' ? accounts.find(a => a.code === '1110')?.id : accounts.find(a => a.code?.startsWith('1120') && a.code.length > 4)?.id)
                  
                  const ts = new Date().toISOString()
                  const voucherId = `v-sec-dep-fix-${Date.now()}-${Math.random()}`
                  const desc = `Security Deposit Receipt (${rxTx.paymentMode || 'Security Cheque'}): Lease ${d.leaseNumber || ''} — Tenant: ${d.tenantName || ''}`
                  
                  const lines = isCheque ? [
                    { accountId: '1420', type: 'Debit', amount, narration: 'Security deposit PDC receivable' },
                    { accountId: '2120', type: 'Credit', amount, narration: 'Security deposit liability' }
                  ] : [
                    { accountId: bankAcctId || '1110-prop', type: 'Debit', amount, narration: 'Security deposit received' },
                    { accountId: '2120', type: 'Credit', amount, narration: 'Security deposit liability' }
                  ]
                  
                  const newVoucher = {
                    id: voucherId,
                    number: `RV-SEC-FIX`,
                    type: 'Receipt',
                    date: rxTx.date || d.createdAt?.split('T')[0] || '2025-12-05',
                    description: desc,
                    referenceType: 'Lease',
                    referenceId: d.leaseId,
                    status: 'Posted',
                    createdBy: 'system',
                    createdAt: ts,
                    updatedAt: ts,
                    lines
                  }
                  
                  vouchers.unshift(newVoucher)
                  modifiedVouchers = true
                  
                  const updatedTxs = d.transactions.map((t: any) => t.type === 'Receipt' ? { ...t, voucherId } : t)
                  modifiedDeposits = true
                  return { ...d, transactions: updatedTxs }
                }
              }
              return d
            })
            
            if (modifiedVouchers) {
              localStorage.setItem('insacc_prop_vouchers', JSON.stringify(vouchers))
            }
            if (modifiedDeposits) {
              localStorage.setItem('insacc_security_deposits', JSON.stringify(updatedDeposits))
            }
          }
        }
        localStorage.setItem(securityDepositFixKey, 'true')
      } catch (e) {
        console.error('Security deposit fix migration failed:', e)
      }
    }

    const securityDepositCollectFixKey = 'insacc_prop_security_deposit_collect_fix_v2'
    if (!localStorage.getItem(securityDepositCollectFixKey)) {
      try {
        const depositsRaw = localStorage.getItem('insacc_security_deposits')
        const vouchersRaw = localStorage.getItem('insacc_prop_vouchers')
        const accountsRaw = localStorage.getItem('insacc_prop_chart_accounts')
        if (depositsRaw && vouchersRaw && accountsRaw) {
          const deposits = JSON.parse(depositsRaw)
          const vouchers = JSON.parse(vouchersRaw)
          const accounts = JSON.parse(accountsRaw)
          
          if (Array.isArray(deposits) && Array.isArray(vouchers) && Array.isArray(accounts)) {
            let modifiedVouchers = false
            let modifiedDeposits = false
            
            const updatedDeposits = deposits.map(d => {
              if (d.status === 'Expected') {
                const amount = d.amount || 1000
                if (amount > 0) {
                  const ts = new Date().toISOString()
                  const voucherId = `v-sec-dep-collect-fix-${Date.now()}`
                  const desc = `Security Deposit Receipt (Security Cheque): Lease ${d.leaseId || ''} — Tenant: ${d.tenantName || ''}`
                  
                  const newVoucher = {
                    id: voucherId,
                    number: `RV-SEC-COLLECT`,
                    type: 'Receipt',
                    date: d.createdAt?.split('T')[0] || '2025-12-05',
                    description: desc,
                    referenceType: 'Lease',
                    referenceId: d.leaseId,
                    status: 'Posted',
                    createdBy: 'system',
                    createdAt: ts,
                    updatedAt: ts,
                    lines: [
                      { accountId: '1420', type: 'Debit', amount, narration: 'Security deposit PDC receivable' },
                      { accountId: '2120', type: 'Credit', amount, narration: 'Security deposit liability' }
                    ]
                  }
                  
                  vouchers.unshift(newVoucher)
                  modifiedVouchers = true
                  
                  const rxTx = {
                    id: `tx-sec-dep-${Date.now()}`,
                    depositId: d.id,
                    type: 'Receipt',
                    amount,
                    date: d.createdAt?.split('T')[0] || '2025-12-05',
                    voucherId,
                    notes: 'Deposit collected automatically on lease creation.',
                    paymentMode: 'Security Cheque',
                    status: 'Posted',
                    createdBy: 'system',
                    createdAt: ts,
                    updatedAt: ts
                  }
                  
                  modifiedDeposits = true
                  return {
                    ...d,
                    status: 'Held',
                    transactions: [...(d.transactions || []), rxTx]
                  }
                }
              }
              return d
            })
            
            if (modifiedVouchers) {
              localStorage.setItem('insacc_prop_vouchers', JSON.stringify(vouchers))
            }
            if (modifiedDeposits) {
              localStorage.setItem('insacc_security_deposits', JSON.stringify(updatedDeposits))
            }
          }
        }
        localStorage.setItem(securityDepositCollectFixKey, 'true')
      } catch (e) {
        console.error('Security deposit collect fix migration failed:', e)
      }
    }

    const securityDepositRemapFixKey = 'insacc_prop_security_deposit_remap_fix_v3'
    if (!localStorage.getItem(securityDepositRemapFixKey)) {
      try {
        const depositsRaw = localStorage.getItem('insacc_security_deposits')
        const vouchersRaw = localStorage.getItem('insacc_prop_vouchers')
        if (depositsRaw && vouchersRaw) {
          const deposits = JSON.parse(depositsRaw)
          const vouchers = JSON.parse(vouchersRaw)
          
          if (Array.isArray(deposits) && Array.isArray(vouchers)) {
            let modifiedVouchers = false
            let modifiedDeposits = false
            
            const updatedDeposits = deposits.map(d => {
              if (d.transactions) {
                const hasReceipt = d.transactions.some((t: any) => t.type === 'Receipt')
                if (hasReceipt) {
                  const updatedTxs = d.transactions.map((t: any) => {
                    if (t.type === 'Receipt') {
                      modifiedDeposits = true
                      return { ...t, paymentMode: 'Security Cheque', bankAccountId: undefined }
                    }
                    return t
                  })
                  return { ...d, transactions: updatedTxs }
                }
              }
              return d
            })
            
            const updatedVouchers = vouchers.map(v => {
              const has2120Credit = v.lines?.some((l: any) => l.accountId === '2120' && l.type === 'Credit')
              const bankDebitLine = v.lines?.find((l: any) => (l.accountId?.startsWith('1120') || l.accountId?.startsWith('1110')) && l.type === 'Debit')
              
              if (has2120Credit && bankDebitLine) {
                modifiedVouchers = true
                const updatedLines = v.lines.map((l: any) => {
                  if (l === bankDebitLine) {
                    return { ...l, accountId: '1420', narration: 'Security deposit PDC receivable' }
                  }
                  return l
                })
                return { ...v, description: v.description?.replace('Bank Transfer', 'Security Cheque'), lines: updatedLines }
              }
              return v
            })
            
            if (modifiedVouchers) {
              localStorage.setItem('insacc_prop_vouchers', JSON.stringify(updatedVouchers))
            }
            if (modifiedDeposits) {
              localStorage.setItem('insacc_security_deposits', JSON.stringify(updatedDeposits))
            }
          }
        }
        localStorage.setItem(securityDepositRemapFixKey, 'true')
      } catch (e) {
        console.error('Security deposit remap fix migration failed:', e)
      }
    }

    const pdcFixKey = 'insacc_prop_pdc_fix_13000_v1'
    if (!localStorage.getItem(pdcFixKey)) {
      try {
        const vouchersRaw = localStorage.getItem('insacc_prop_vouchers')
        if (vouchersRaw) {
          const vouchers = JSON.parse(vouchersRaw)
          if (Array.isArray(vouchers)) {
            const hasDiscrepancyVoucher = vouchers.some(v => v.description?.includes('PDC Received') && v.lines?.some((l: any) => l.accountId === '1410' && Math.abs(l.amount - 13000.04) < 0.05))
            if (!hasDiscrepancyVoucher) {
              const leaseVoucher = vouchers.find(v => v.description?.includes('LS-2026-0001') && v.lines?.some((l: any) => l.accountId === '1130' && Math.abs(l.amount - 66200) < 0.05))
              if (leaseVoucher) {
                const ts = new Date().toISOString()
                const newVoucher = {
                  id: `v-pdc-fix-13000-${Date.now()}`,
                  number: `JV-PDC-FIX`,
                  type: 'Journal',
                  date: leaseVoucher.date || '2025-12-05',
                  description: 'PDC Received: Chq PDC-1 for Lease LS-2026-0001',
                  referenceType: 'Lease',
                  referenceId: leaseVoucher.referenceId,
                  status: 'Posted',
                  createdBy: 'system',
                  createdAt: ts,
                  updatedAt: ts,
                  lines: [
                    { accountId: '1410', type: 'Debit', amount: 13000.04, narration: 'Post-dated cheque received' },
                    { accountId: '1130', type: 'Credit', amount: 13000.04, narration: 'PDC receivable from tenant' }
                  ]
                }
                vouchers.unshift(newVoucher)
                localStorage.setItem('insacc_prop_vouchers', JSON.stringify(vouchers))
              }
            }
          }
        }
        localStorage.setItem(pdcFixKey, 'true')
      } catch (e) {
        console.error('PDC fix migration failed:', e)
      }
    }

    const roundingFixKey = 'insacc_prop_pdc_rounding_fix_v3'
    if (!localStorage.getItem(roundingFixKey)) {
      try {
        const vouchersRaw = localStorage.getItem('insacc_prop_vouchers')
        if (vouchersRaw) {
          const vouchers = JSON.parse(vouchersRaw)
          if (Array.isArray(vouchers)) {
            // Find all lease creation vouchers (debit to 1130)
            const leaseVouchers = vouchers.filter(v => v.referenceType === 'Lease' && v.lines?.some((l: any) => l.accountId === '1130' && l.type === 'Debit'))
            let modified = false
            for (const lv of leaseVouchers) {
              const leaseId = lv.referenceId
              if (!leaseId) continue
              const totalRent = lv.lines.find((l: any) => l.accountId === '1130' && l.type === 'Debit')?.amount || 0
              if (totalRent <= 0) continue

              // Find all FUTURE_PDC_RECEIVED vouchers for this leaseId (debit to 1410)
              const pdcVouchers = vouchers.filter(v => v.referenceId === leaseId && v.lines?.some((l: any) => l.accountId === '1410' && l.type === 'Debit'))
              if (pdcVouchers.length === 0) continue

              const sumPdcs = pdcVouchers.reduce((acc, v) => acc + (v.lines.find((l: any) => l.accountId === '1410' && l.type === 'Debit')?.amount || 0), 0)
              const diff = Math.round((totalRent - sumPdcs) * 100) / 100

              if (Math.abs(diff) > 0 && Math.abs(diff) < 1.00) {
                // Adjust the last PDC voucher's amount by the difference
                const targetV = pdcVouchers[pdcVouchers.length - 1]
                targetV.lines = targetV.lines.map((l: any) => {
                  if (l.accountId === '1410' || l.accountId === '1130') {
                    return { ...l, amount: Math.round((l.amount + diff) * 100) / 100 }
                  }
                  return l
                })
                targetV.amount = Math.round((targetV.amount + diff) * 100) / 100
                modified = true
              }
            }
            if (modified) {
              localStorage.setItem('insacc_prop_vouchers', JSON.stringify(vouchers))
            }
          }
        }
        localStorage.setItem(roundingFixKey, 'true')
      } catch (e) {
        console.error('Rounding fix migration failed:', e)
      }
    }

    const coaPatches = ['insacc_accounts', 'insacc_prop_chart_accounts']
    coaPatches.forEach(key => {
      const raw = localStorage.getItem(key)
      if (raw) {
        try {
          const list = JSON.parse(raw)
          if (Array.isArray(list)) {
            let modified = false
            const hasVat = list.some((a: any) => a.code === '5210')
            let updated = list.map((a: any) => {
              if (a.code === '1120' && a.name === 'Cash and Bank Accounts') { modified = true; return { ...a, name: 'Bank Accounts' } }
              if (a.code === '5210' && a.name !== 'Purchase Input VAT Expense') { modified = true; return { ...a, name: 'Purchase Input VAT Expense', description: 'Purchase Input VAT Expense' } }
              return a
            })
            if (!hasVat) {
              const ts = new Date().toISOString()
              updated.push({ id: '5210', code: '5210', name: 'Purchase Input VAT Expense', type: 'expense', normalBalance: 'debit', parentId: '5000', isActive: true, description: 'Purchase Input VAT Expense', currency: 'AED', createdAt: ts, updatedAt: ts, module: key === 'insacc_accounts' ? 'investment' : 'property' })
              modified = true
            }
            const has1420 = list.some((a: any) => a.code === '1420')
            if (!has1420) {
              const ts = new Date().toISOString()
              updated.push({ id: '1420', code: '1420', name: 'Security Cheques Received', type: 'asset', normalBalance: 'debit', parentId: '1000', isActive: true, description: 'Security Cheques Received Pool', currency: 'AED', createdAt: ts, updatedAt: ts, module: key === 'insacc_accounts' ? 'investment' : 'property' })
              modified = true
            }
            if (modified) localStorage.setItem(key, JSON.stringify(updated))
          }
        } catch (_) {}
      }
    })

    const cleanBankSuffix = (name: string): string => {
      if (!name) return name
      return name.replace(/ - Investment Account/gi, '').replace(/ - Property Account/gi, '').replace(/ - Main Account/gi, '').replace(/ - Default Account/gi, '').replace(/ - Primary Account/gi, '')
    }

    ;['insacc_accounts', 'insacc_prop_chart_accounts'].forEach(key => {
      const raw = localStorage.getItem(key)
      if (raw) {
        try {
          const list = JSON.parse(raw)
          if (Array.isArray(list)) {
            let modified = false
            const updated = list.map((a: any) => {
              const cleanedName = cleanBankSuffix(a.name)
              const cleanedDesc = cleanBankSuffix(a.description || '')
              if (cleanedName !== a.name || cleanedDesc !== (a.description || '')) { modified = true; return { ...a, name: cleanedName, description: cleanedDesc } }
              return a
            })
            if (modified) localStorage.setItem(key, JSON.stringify(updated))
          }
        } catch (_) {}
      }
    })

    ;['insacc_bank_accounts', 'insacc_prop_bank_accounts'].forEach(key => {
      const raw = localStorage.getItem(key)
      if (raw) {
        try {
          const list = JSON.parse(raw)
          if (Array.isArray(list)) {
            let modified = false
            const updated = list.map((ba: any) => {
              const cleanedInst = cleanBankSuffix(ba.institution)
              if (cleanedInst !== ba.institution) { modified = true; return { ...ba, institution: cleanedInst } }
              return ba
            })
            if (modified) localStorage.setItem(key, JSON.stringify(updated))
          }
        } catch (_) {}
      }
    })

    ;['insacc_bank_mappings', 'insacc_prop_bank_mappings'].forEach(key => {
      const raw = localStorage.getItem(key)
      if (raw) {
        try {
          const list = JSON.parse(raw)
          if (Array.isArray(list)) {
            let modified = false
            const updated = list.map((m: any) => {
              const cleanedName = cleanBankSuffix(m.accountName)
              if (cleanedName !== m.accountName) { modified = true; return { ...m, accountName: cleanedName } }
              return m
            })
            if (modified) localStorage.setItem(key, JSON.stringify(updated))
          }
        } catch (_) {}
      }
    })

    ;['insacc_vouchers', 'insacc_prop_vouchers'].forEach(key => {
      const raw = localStorage.getItem(key)
      if (raw) {
        try {
          const list = JSON.parse(raw)
          if (Array.isArray(list)) {
            let modified = false
            const updated = list.map((v: any) => {
              let vMod = false
              const cleanedDesc = cleanBankSuffix(v.description || '')
              if (cleanedDesc !== (v.description || '')) { v.description = cleanedDesc; vMod = true }
              const lines = v.lines ? v.lines.map((l: any) => {
                const cleanedNarration = cleanBankSuffix(l.narration || '')
                if (cleanedNarration !== (l.narration || '')) { vMod = true; return { ...l, narration: cleanedNarration } }
                return l
              }) : v.lines
              if (vMod) { modified = true; return { ...v, lines } }
              return v
            })
            if (modified) localStorage.setItem(key, JSON.stringify(updated))
          }
        } catch (_) {}
      }
    })

    const forcePostAllVouchersKey = 'insacc_force_post_all_vouchers_v1'
    if (!localStorage.getItem(forcePostAllVouchersKey)) {
      ;['insacc_vouchers', 'insacc_prop_vouchers'].forEach(key => {
        const raw = localStorage.getItem(key)
        if (raw) {
          try {
            const list = JSON.parse(raw)
            if (Array.isArray(list)) {
              let modified = false
              const updated = list.map((v: any) => {
                if (v.status === 'Draft' || v.status === 'Pending Approval' || v.status === 'Approved') {
                  modified = true
                  return { ...v, status: 'Posted', postedAt: v.postedAt || v.updatedAt || v.createdAt || new Date().toISOString(), postedBy: v.postedBy || v.createdBy || 'user' }
                }
                return v
              })
              if (modified) localStorage.setItem(key, JSON.stringify(updated))
            }
          } catch (_) {}
        }
      })
      localStorage.setItem(forcePostAllVouchersKey, 'true')
    }

    ;['insacc_vouchers', 'insacc_prop_vouchers'].forEach(key => {
      const raw = localStorage.getItem(key)
      if (raw) {
        try {
          const list = JSON.parse(raw)
          if (Array.isArray(list)) {
            let modified = false
            const updated = list.map((v: any) => {
              let vMod = false
              let desc = v.description
              if (desc && desc.includes('Commodity Tax')) { desc = desc.replace(/Commodity Tax/g, 'Purchase Input VAT Expense'); vMod = true }
              const lines = v.lines ? v.lines.map((l: any) => {
                let narration = l.narration
                if (narration && narration.includes('Commodity Tax')) { narration = narration.replace(/Commodity Tax/g, 'Purchase Input VAT Expense'); vMod = true; return { ...l, narration } }
                return l
              }) : v.lines
              if (vMod) { modified = true; return { ...v, description: desc, lines } }
              return v
            })
            if (modified) localStorage.setItem(key, JSON.stringify(updated))
          }
        } catch (_) {}
      }
    })

    const purchasesLedgerKey = 'insacc_purchases_ledger'
    const plRaw = localStorage.getItem(purchasesLedgerKey)
    if (plRaw) {
      try {
        const list = JSON.parse(plRaw)
        if (Array.isArray(list)) {
          let modified = false
          const updated = list.map((p: any) => {
            if (p.additionalCosts && Array.isArray(p.additionalCosts)) {
              let pMod = false
              const updatedCosts = p.additionalCosts.map((c: any) => {
                if (c.expenseType === 'Commodity Tax' || c.expenseType === 'Purchase Input VAT Expense' || c.expenseType === '5210') { pMod = true; return { ...c, expenseType: 'EXP_PURCHASE_INPUT_VAT' } }
                if (c.expenseType === 'Brokerage Fees') { pMod = true; return { ...c, expenseType: '5130' } }
                if (c.expenseType === 'Bank Charges') { pMod = true; return { ...c, expenseType: '5150' } }
                if (c.expenseType === 'Transportation') { pMod = true; return { ...c, expenseType: '5220' } }
                if (c.expenseType === 'Insurance') { pMod = true; return { ...c, expenseType: '5230' } }
                if (c.expenseType === 'Documentation') { pMod = true; return { ...c, expenseType: '5240' } }
                if (c.expenseType === 'Transfer Fees') { pMod = true; return { ...c, expenseType: '5140' } }
                if (c.expenseType === 'Other Expenses') { pMod = true; return { ...c, expenseType: '5180' } }
                return c
              })
              if (pMod) { modified = true; return { ...p, additionalCosts: updatedCosts } }
            }
            return p
          })
          if (modified) localStorage.setItem(purchasesLedgerKey, JSON.stringify(updated))
        }
      } catch (_) {}
    }

    const migrateAccKeys = ['insacc_accounts', 'insacc_vouchers', 'insacc_bank_mappings', 'insacc_prop_chart_accounts', 'insacc_prop_vouchers', 'insacc_prop_bank_mappings', 'insacc_security_deposits', 'insacc_security_deposit_mappings', 'insacc_purchases_ledger']
    for (const key of migrateAccKeys) {
      const val = localStorage.getItem(key)
      if (val && val.includes('acc-')) {
        localStorage.setItem(key, val.replace(/acc-/g, ''))
      }
    }

    const pdc1320MigrationKey = 'insacc_prop_pdc_1410_4120_to_1410_1320_v2'
    if (!localStorage.getItem(pdc1320MigrationKey)) {
      const raw = localStorage.getItem('insacc_prop_vouchers')
      if (raw) {
        try {
          const vouchers: any[] = JSON.parse(raw)
          if (Array.isArray(vouchers)) {
            let modified = false
            const migrated = vouchers.map((v: any) => {
              if (!v?.lines) return v
              const hasPdcDebit1410 = v.lines.some(
                (l: any) => l.accountId === '1410' && l.type === 'Debit'
              )
              const hasIncomeCredit = v.lines.some(
                (l: any) =>
                  (l.accountId === '4120' || l.accountId === '4200' || l.accountId === '4210') &&
                  l.type === 'Credit'
              )
              const isLeaseReferenced = v.referenceType === 'Lease' || v.reference

              if (!hasIncomeCredit) return v
              if (!hasPdcDebit1410 && v.type !== 'Receipt') return v
              if (v.type === 'Receipt' && !isLeaseReferenced) return v

              modified = true
              return {
                ...v,
                lines: v.lines.map((l: any) => {
                  const isIncomeCredit =
                    (l.accountId === '4120' || l.accountId === '4200' || l.accountId === '4210') &&
                    l.type === 'Credit'
                  if (!isIncomeCredit) return l
                  return {
                    ...l,
                    accountId: '1320',
                    narration: 'Accounts receivable',
                  }
                }),
              }
            })
            if (modified) {
              invalidateBalanceCache()
              localStorage.setItem('insacc_prop_vouchers', JSON.stringify(migrated))
            }
          }
        } catch (_) {}
      }
      localStorage.setItem(pdc1320MigrationKey, 'true')
    }

    // Seed default Chart of Accounts for both modules if empty
    const invRaw = localStorage.getItem('insacc_accounts')
    if (!invRaw || invRaw === '[]') {
      const defaultInvAccounts = initializeDefaultChartOfAccounts('UAE', 'investment')
      localStorage.setItem('insacc_accounts', JSON.stringify(defaultInvAccounts))
    }
    const propRaw = localStorage.getItem('insacc_prop_chart_accounts')
    if (!propRaw || propRaw === '[]') {
      const defaultPropAccounts = initializeDefaultChartOfAccounts('UAE', 'property')
      localStorage.setItem('insacc_prop_chart_accounts', JSON.stringify(defaultPropAccounts))
    }

    // ---- Bank hierarchy repair ----
    // Ensure 1120 is a parent grouping account with bank children under it
    // Investment module: only ensures parent exists; bank children created by ensureBankAccountMappings
    // Property module: ensures DIB and FAB children exist under 1120
    for (const cfg of [
      { key: 'insacc_accounts', mappingsKey: 'insacc_bank_mappings', module: 'investment' as const },
      { key: 'insacc_prop_chart_accounts', mappingsKey: 'insacc_prop_bank_mappings', module: 'property' as const,
        dibId: 'acc-dib-current', fabId: 'acc-fab-current' },
    ]) {
      const raw = localStorage.getItem(cfg.key)
      if (!raw || raw === '[]') continue
      try {
        const accts: Account[] = JSON.parse(raw)
        let changed = false
        const ts = new Date().toISOString()

        // 1. Find or create 1120 as parent grouping account
        let bankParent = accts.find(a => a.code === '1120')
        if (bankParent) {
          if (bankParent.name !== 'Bank Accounts') {
            bankParent = { ...bankParent, name: 'Bank Accounts' }
            changed = true
          }
          if (bankParent.parentId !== '1000') {
            bankParent = { ...bankParent, parentId: '1000' }
            changed = true
          }
          const idx = accts.findIndex(a => a.id === bankParent!.id)
          if (idx >= 0 && changed) accts[idx] = bankParent
        } else {
          bankParent = {
            id: '1120', code: '1120', name: 'Bank Accounts',
            type: 'asset', normalBalance: 'debit', parentId: '1000',
            isActive: true, description: 'Bank Accounts',
            currency: 'AED', createdAt: ts, updatedAt: ts, module: 'shared',
          }
          accts.push(bankParent)
          changed = true
        }

        // 2. For property module, ensure DIB and FAB children exist under 1120
        if (cfg.module === 'property') {
          const hasDib = accts.some(a =>
            a.isActive && a.parentId === bankParent.id &&
            (a.code === '112001' || a.name.toLowerCase().includes('dubai islamic'))
          )
          if (!hasDib) {
            accts.push({
              id: cfg.dibId!, code: '112001', name: 'Dubai Islamic Bank',
              type: 'asset', normalBalance: 'debit', parentId: bankParent.id,
              isActive: true, description: 'Dubai Islamic Bank Current Account',
              currency: 'AED', createdAt: ts, updatedAt: ts, module: cfg.module,
            })
            changed = true
          }

          const hasFab = accts.some(a =>
            a.isActive && a.parentId === bankParent.id &&
            (a.code === '112002' || a.name.toLowerCase().includes('first abu dhabi'))
          )
          if (!hasFab) {
            accts.push({
              id: cfg.fabId!, code: '112002', name: 'First Abu Dhabi Bank (FAB)',
              type: 'asset', normalBalance: 'debit', parentId: bankParent.id,
              isActive: true, description: 'First Abu Dhabi Bank (FAB) Current Account',
              currency: 'AED', createdAt: ts, updatedAt: ts, module: cfg.module,
            })
            changed = true
          }
        }

        // Move misparented bank accounts (directly under 1000) under 1120
        for (const a of accts) {
          if (a.parentId === '1000' && a.code.startsWith('1120') && a.code.length > 4 && a.isActive) {
            const idx = accts.findIndex(x => x.id === a.id)
            if (idx >= 0) { accts[idx] = { ...accts[idx], parentId: bankParent.id }; changed = true }
          }
        }

        if (changed) localStorage.setItem(cfg.key, JSON.stringify(accts))

        // Fix bank mappings that point to parent 1120 instead of a child
        const mappingsRaw = localStorage.getItem(cfg.mappingsKey)
        if (mappingsRaw && mappingsRaw !== '[]') {
          try {
            const mappings: BankMapping[] = JSON.parse(mappingsRaw)
            let mappingsChanged = false

            if (cfg.module === 'property') {
              const dibChild = accts.find(a => a.isActive && a.parentId === bankParent.id && (a.code === '112001' || a.name.toLowerCase().includes('dubai islamic')))
              const fabChild = accts.find(a => a.isActive && a.parentId === bankParent.id && (a.code === '112002' || a.name.toLowerCase().includes('first abu dhabi')))

              // Fix DIB mapping
              if (dibChild) {
                const dibMapping = mappings.find(m => m.bankAccountId === 'pt-dib-current')
                if (dibMapping && (dibMapping.accountId === '1120' || dibMapping.accountCode === '1120')) {
                  const idx = mappings.findIndex(m => m.bankAccountId === dibMapping.bankAccountId)
                  if (idx >= 0) {
                    mappings[idx] = { ...mappings[idx], accountId: dibChild.id, accountCode: dibChild.code, accountName: dibChild.name }
                    mappingsChanged = true
                  }
                }
              }

              // Fix FAB mapping
              if (fabChild) {
                const fabMapping = mappings.find(m => m.bankAccountId === 'pt-fab-current')
                if (fabMapping && (fabMapping.accountId === '1120' || fabMapping.accountCode === '1120')) {
                  const idx = mappings.findIndex(m => m.bankAccountId === fabMapping.bankAccountId)
                  if (idx >= 0) {
                    mappings[idx] = { ...mappings[idx], accountId: fabChild.id, accountCode: fabChild.code, accountName: fabChild.name }
                    mappingsChanged = true
                  }
                }
              }
            }

            if (mappingsChanged) localStorage.setItem(cfg.mappingsKey, JSON.stringify(mappings))
          } catch (_) {}
        }
      } catch (_) {}
    }

    // ---- Remove FAB (112002) from Investment module ----
    // Permanently removes FAB from ALL investment data sources:
    //   1. Chart of Accounts  (insacc_accounts)
    //   2. Bank Accounts      (insacc_bank_accounts)
    //   3. Bank Mappings      (insacc_bank_mappings)
    //   4. Vouchers           (insacc_vouchers) — remap to EIB
    const fabRemoveKey = 'insacc_inv_fab_remove_v2'
    if (!localStorage.getItem(fabRemoveKey)) {
      try {
        const isFab = (acct: { id?: string; code?: string; name?: string }) =>
          acct.code === '112002' ||
          (acct.name && /first abu dhabi/i.test(acct.name)) ||
          (acct.id && /fab/i.test(acct.id))

        let anyModified = false

        // 1. Remove FAB from investment Chart of Accounts
        const invRaw = localStorage.getItem('insacc_accounts')
        if (invRaw && invRaw !== '[]') {
          const invAccts = JSON.parse(invRaw)
          const fabIds = invAccts.filter(isFab).map((a: any) => a.id)

          if (fabIds.length > 0) {
            const eibAcct = invAccts.find((a: any) =>
              a.isActive && (a.code === '112001' || (a.code && a.code.startsWith('1120') && a.code.length > 4)) &&
              (a.name && (/emirates islamic/i.test(a.name) || /investment reserve/i.test(a.name)))
            )

            // Remap vouchers referencing FAB to EIB
            if (eibAcct) {
              const vouchersRaw = localStorage.getItem('insacc_vouchers')
              if (vouchersRaw && vouchersRaw !== '[]') {
                const vouchers = JSON.parse(vouchersRaw)
                let vMod = false
                const remapped = vouchers.map((v: any) => {
                  if (!v?.lines) return v
                  let changed = false
                  const lines = v.lines.map((l: any) => {
                    if (fabIds.includes(l.accountId) || l.accountId === '112002') {
                      changed = true
                      return { ...l, accountId: eibAcct.id }
                    }
                    return l
                  })
                  if (changed) { vMod = true; return { ...v, lines } }
                  return v
                })
                if (vMod) {
                  localStorage.setItem('insacc_vouchers', JSON.stringify(remapped))
                  anyModified = true
                }
              }

              // Remap bank mappings referencing FAB
              const mapRaw = localStorage.getItem('insacc_bank_mappings')
              if (mapRaw && mapRaw !== '[]') {
                const mappings = JSON.parse(mapRaw)
                let mMod = false
                const remapped = mappings.map((m: any) => {
                  if (fabIds.includes(m.accountId) || m.accountCode === '112002' || isFab(m)) {
                    mMod = true
                    return { ...m, accountId: eibAcct.id, accountCode: eibAcct.code, accountName: eibAcct.name }
                  }
                  return m
                })
                if (mMod) {
                  localStorage.setItem('insacc_bank_mappings', JSON.stringify(remapped))
                  anyModified = true
                }
              }
            }

            // Remove FAB(s) from the accounts array entirely
            const cleaned = invAccts.filter((a: any) => !fabIds.includes(a.id))
            localStorage.setItem('insacc_accounts', JSON.stringify(cleaned))
            anyModified = true

            // Clean up DIB (112001) that was left inactive by old migration
            const dibRemaining = cleaned.filter((a: any) => a.code === '112001' && !a.isActive)
            if (dibRemaining.length > 0) {
              const noDib = cleaned.filter((a: any) => a.code !== '112001')
              localStorage.setItem('insacc_accounts', JSON.stringify(noDib))
              anyModified = true
            }
          }
        }

        // 2. Remove FAB bank accounts from investment bank accounts
        const baRaw = localStorage.getItem('insacc_bank_accounts')
        if (baRaw && baRaw !== '[]') {
          const bas = JSON.parse(baRaw)
          const filtered = bas.filter((ba: any) => !isFab(ba))
          if (filtered.length !== bas.length) {
            localStorage.setItem('insacc_bank_accounts', JSON.stringify(filtered))
            anyModified = true
          }
        }

        if (anyModified) {
          localStorage.removeItem('insacc_opening_balance_cache')
          clearPersistedCache()
        }
      } catch (_) {}
      localStorage.setItem(fabRemoveKey, 'true')
    }

    // ---- Rename Investment Reserve Bank to Emirates Islamic Bank ----
    const renameBankKey = 'insacc_eib_rename_v1'
    if (!localStorage.getItem(renameBankKey)) {
      const baRaw = localStorage.getItem('insacc_bank_accounts')
      if (baRaw && baRaw !== '[]') {
        try {
          const bas = JSON.parse(baRaw)
          let changed = false
          const renamed = bas.map((ba: any) => {
            if (ba.id === 'ba-eib-invest' && ba.institution === 'Investment Reserve Bank') {
              changed = true
              return { ...ba, institution: 'Emirates Islamic Bank', accountNumber: 'EIB-INV-7777' }
            }
            return ba
          })
          if (changed) localStorage.setItem('insacc_bank_accounts', JSON.stringify(renamed))
        } catch (_) {}
      }
      localStorage.setItem(renameBankKey, 'true')
    }
  } catch (e) {
    console.error('Migration failed:', e)
  }
}

runMigrations()

const Login = lazy(() => import('./components/Login'))
const ModuleSelection = lazy(() => import('./components/ModuleSelection'))
const ProfileSelection = lazy(() => import('./components/ProfileSelection'))
const Sidebar = lazy(() => import('./components/Sidebar'))
const InvestmentRouter = lazy(() => import('./components/InvestmentRouter'))
const PropertyRouter = lazy(() => import('./components/PropertyRouter'))
const PageTransition = lazy(() => import('./components/PageTransition'))

function LoadingFallback() {
  return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
    <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#3BA549', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>
}

const defaultPurchaseCategories = getDefaultCategories()
const defaultInvestmentCategories = getDefaultInvestmentCategories()
const defaultInvestmentAssets = getDefaultInvestmentAssets()
const defaultMainCats = getDefaultMainCategories()
const defaultHierarchyProps = getDefaultHierarchyProperties()
const defaultIncomeCats = getDefaultIncomeCategories()
const defaultCustomers = getDefaultCustomers()
const defaultPropTxCats = getDefaultPropertyTransactionCategories()

type Screen = 'profiles' | 'login' | 'module' | 'dashboard'
type Module = 'investment' | 'property'

export default function App() {
  const [undoAvailable, setUndoAvailable] = useState(false)
  const [redoAvailable, setRedoAvailable] = useState(false)

  useEffect(() => {
    initHistory()
    const unsub = subscribeToHistory(() => {
      setUndoAvailable(canUndo())
      setRedoAvailable(canRedo())
    })
    return unsub
  }, [])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((window as any).isManualUnload) return

      setIsUnloading(true)
      const url = localStorage.getItem('insacc_supabase_url')
      const anonKey = localStorage.getItem('insacc_supabase_key')
      const enabled = localStorage.getItem('insacc_supabase_enabled') === 'true'
      
      if (enabled && url && anonKey) {
        pushAllLocalData(url, anonKey)
          .finally(() => setIsUnloading(false))
          .catch(console.error)
      } else {
        setTimeout(() => setIsUnloading(false), 100)
      }

      e.preventDefault()
      e.returnValue = ''
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'r' || e.key === 'F5') {
        e.preventDefault()
        setIsUnloading(true)
        ;(window as any).isManualUnload = true
        
        const url = localStorage.getItem('insacc_supabase_url')
        const anonKey = localStorage.getItem('insacc_supabase_key')
        const enabled = localStorage.getItem('insacc_supabase_enabled') === 'true'
        
        if (enabled && url && anonKey) {
          pushAllLocalData(url, anonKey).finally(() => window.location.reload())
        } else {
          window.location.reload()
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('keydown', handleKeyDown)

    if ((window as any).api && (window as any).api.onAppCloseRequested) {
      ;(window as any).api.onAppCloseRequested(() => {
        setIsUnloading(true)
        ;(window as any).isManualUnload = true
        
        const url = localStorage.getItem('insacc_supabase_url')
        const anonKey = localStorage.getItem('insacc_supabase_key')
        const enabled = localStorage.getItem('insacc_supabase_enabled') === 'true'
        
        if (enabled && url && anonKey) {
          pushAllLocalData(url, anonKey).finally(() => (window as any).api.notifySyncCompleted())
        } else {
          ;(window as any).api.notifySyncCompleted()
        }
      })
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const [isUnloading, setIsUnloading] = useState(false)
  const [screen, setScreen] = useState<'login' | 'profiles' | 'module' | 'dashboard'>('login')
  const [loggedInUser, setLoggedInUser] = useState<string>(() => {
    return localStorage.getItem('loggedInUser') || 'Admin'
  })
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)

  const [activeModule, setActiveModule] = useState<Module>('investment')
  const [activePage, setActivePage] = useState<string>('dashboard')
  const [theme, setTheme] = useLazyPersistedState<string>('insacc_theme', 'light')
  const [storedPassword, setStoredPassword] = useState('1234')
  const [currency, setCurrency] = useState('AED')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [language, setLanguage] = useState('English')
  const [autoLogout, setAutoLogout] = useState('15 minutes')
  const [investments, setInvestments, resetInvestments] = useLazyPersistedState<Investment[]>('insacc_investments', [])
  const [transactions, setTransactions, resetTransactions] = useLazyPersistedState<Transaction[]>('insacc_transactions', [])
  const [bankAccounts, setBankAccounts, resetBankAccounts] = useLazyPersistedState<BankAccount[]>('insacc_bank_accounts', [])
  const [bankTransactions, setBankTransactions, resetBankTransactions] = useLazyPersistedState<BankTransaction[]>('insacc_bank_transactions', [])
  const [statement, setStatement, resetStatement] = useLazyPersistedState<StatementEntry[]>('insacc_statement', [])
  const [balance, setBalance, resetBalance] = useLazyPersistedState<number>('insacc_balance', 0)
  const [documents, setDocuments, resetDocuments] = useLazyPersistedState<DocItem[]>('insacc_documents', [])
  const [storedLogs, setStoredLogs, resetLogs] = useLazyPersistedState<LogEntry[]>('insacc_logs', [])
  const [purchaseCategories, setPurchaseCategories] = useLazyPersistedState<PurchaseCategory[]>('insacc_purchase_categories', defaultPurchaseCategories)
  const [purchases, setPurchases, resetPurchases] = useLazyPersistedState<Purchase[]>('insacc_purchases', [])
  const [purchaseRecords, setPurchaseRecords] = useLazyPersistedState<PurchaseRecord[]>('insacc_purchases_ledger', [])
  const [invUsers, setInvUsers] = useLazyPersistedState<UserEntry[]>('insacc_inv_users_v2', [
    { name: 'Sameer Ishaq Harmoudi', role: 'Admin', status: 'Active' },
    { name: 'Accounts', role: 'Accounts', status: 'Active' }
  ])
  const [incomeCustomCategories, setIncomeCustomCategories] = useLazyPersistedState<string[]>('insacc_income_custom_categories', [])
  const [expenseCustomCategories, setExpenseCustomCategories] = useLazyPersistedState<string[]>('insacc_expense_custom_categories', [])
  const [auditEvents, setAuditEvents] = useLazyPersistedState<AuditEvent[]>('insacc_audit_events', [])

  const storedLoginProfiles: Profile[] = useMemo(() => {
    return invUsers.map((user, idx) => ({
      id: idx + 1,
      name: user.name,
      role: user.role as 'Admin' | 'Accounts',
      avatar: '',
      initials: user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      locked: false
    }))
  }, [invUsers])
  const [accounts, setAccounts] = useLazyPersistedState<Account[]>('insacc_accounts', [])
  const [vouchers, setVouchers] = useLazyPersistedState<Voucher[]>('insacc_vouchers', [])
  const [bankMappings, setBankMappings] = useLazyPersistedState<BankMapping[]>('insacc_bank_mappings', [])
  const [propChartAccounts, setPropChartAccounts] = useLazyPersistedState<Account[]>('insacc_prop_chart_accounts', [])
  
  useEffect(() => {
    if (accounts.length > 0) {
      const updated = shortenAccountCodes(accounts)
      if (updated !== accounts) setAccounts(updated)
    }
  }, [accounts, setAccounts])

  useEffect(() => {
    if (propChartAccounts.length > 0) {
      const updated = shortenAccountCodes(propChartAccounts)
      if (updated !== propChartAccounts) setPropChartAccounts(updated)
    }
  }, [propChartAccounts, setPropChartAccounts])

  useEffect(() => {
    if (vouchers.length > 0) {
      const regex = /^([A-Z]+-\d{4})-000(\d{3})$/
      let modified = false
      const updated = vouchers.map(v => {
        if (v.number && regex.test(v.number)) {
          modified = true
          return { ...v, number: v.number.replace(regex, '$1-$2') }
        }
        return v
      })
      if (modified) setVouchers(updated)
    }
  }, [vouchers, setVouchers])

  useEffect(() => {
    if (purchaseRecords.length > 0) {
      const regex = /^([A-Z]+-\d{4})-000(\d{3})$/
      let modified = false
      const updated = purchaseRecords.map(r => {
        if (r.voucherNumber && regex.test(r.voucherNumber)) {
          modified = true
          return { ...r, voucherNumber: r.voucherNumber.replace(regex, '$1-$2') }
        }
        return r
      })
      if (modified) setPurchaseRecords(updated)
    }
  }, [purchaseRecords, setPurchaseRecords])

  // Migration removed per user request



  const [propVouchers, setPropVouchers] = useLazyPersistedState<Voucher[]>('insacc_prop_vouchers', [])
  
  useEffect(() => {
    if (propVouchers.length > 0) {
      const regex = /^([A-Z]+-\d{4})-000(\d{3})$/
      let modified = false
      const updated = propVouchers.map(v => {
        if (v.number && regex.test(v.number)) {
          modified = true
          return { ...v, number: v.number.replace(regex, '$1-$2') }
        }
        return v
      })
      if (modified) setPropVouchers(updated)
    }
  }, [propVouchers, setPropVouchers])

  const [propBankMappings, setPropBankMappings] = useLazyPersistedState<BankMapping[]>('insacc_prop_bank_mappings', [])

  const [propAccounts, setPropAccounts] = useLazyPersistedState<PropAccount[]>('insacc_prop_bank_accounts', [])
  const [propTransactions, setPropTransactions] = useLazyPersistedState<PropTransaction[]>('insacc_prop_transactions', [])
  const [propProperties, setPropProperties] = useLazyPersistedState<PropertyEntry[]>('insacc_prop_properties', [])
  const [propUnits, setPropUnits] = useLazyPersistedState<UnitEntry[]>('insacc_prop_units', [])
  const [propTenants, setPropTenants] = useLazyPersistedState<TenantEntry[]>('insacc_prop_tenants', [])
  const [propLeases, setPropLeases] = useLazyPersistedState<LeaseEntry[]>('insacc_prop_leases', [])
  const [pdcCheques, setPdcCheques] = useLazyPersistedState<PdcCheque[]>('insacc_pdc_cheques', [])
  const [securityDeposits, setSecurityDeposits] = useLazyPersistedState<SecurityDeposit[]>('insacc_security_deposits', [])
  const [depositMappings, setDepositMappings] = useLazyPersistedState<SecurityDepositGlMappings>('insacc_security_deposit_mappings', {
    liabilityAccountId: '2120',
    forfeitureIncomeAccountId: '4160',
  })
  const [propDocuments, setPropDocuments] = useLazyPersistedState<PropDocItem[]>('insacc_prop_documents', [])
  const [propAuditEvents, setPropAuditEvents] = useLazyPersistedState<import('./data/auditTypes').AuditEvent[]>('insacc_prop_audit_events', [])
  const [propExpenses, setPropExpenses] = useLazyPersistedState<PropertyExpense[]>('insacc_prop_expenses', [])
  const [propVendors, setPropVendors] = useLazyPersistedState<VendorEntry[]>('insacc_prop_vendors', [])
  const [propertyTransactionCategories, setPropertyTransactionCategories] = useLazyPersistedState<PropertyTransactionCategory[]>('insacc_property_transaction_categories', defaultPropTxCats)

  const [investmentCategories, setInvestmentCategories] = useLazyPersistedState<InvestmentCategory[]>('insacc_inv_categories', defaultInvestmentCategories)
  const [investmentAssets, setInvestmentAssets] = useLazyPersistedState<InvestmentAsset[]>('insacc_inv_assets', defaultInvestmentAssets)

  const [mainCategories, setMainCategories] = useLazyPersistedState<MainCategory[]>('insacc_main_categories', defaultMainCats)
  const [hierarchyProperties, setHierarchyProperties] = useLazyPersistedState<PropProperty[]>('insacc_hierarchy_properties', defaultHierarchyProps)
  const [incomeCategories, setIncomeCategories] = useLazyPersistedState<IncomeCategory[]>('insacc_income_categories', defaultIncomeCats)
  const [customers, setCustomers] = useLazyPersistedState<Customer[]>('insacc_customers', defaultCustomers)

  const [masterCurrencies, setMasterCurrencies] = useLazyPersistedState<Currency[]>('insacc_master_currencies', [])
  const [masterTaxCodes, setMasterTaxCodes] = useLazyPersistedState<TaxCode[]>('insacc_master_tax_codes', [])
  const [masterPaymentTerms, setMasterPaymentTerms] = useLazyPersistedState<PaymentTerm[]>('insacc_master_payment_terms', [])
  const [masterVendors, setMasterVendors] = useLazyPersistedState<MasterVendor[]>('insacc_master_vendors', [])
  const [masterCustomers, setMasterCustomers] = useLazyPersistedState<MasterCustomer[]>('insacc_master_customers', [])
  const [masterAssetTypes, setMasterAssetTypes] = useLazyPersistedState<AssetType[]>('insacc_master_asset_types', [])
  const [masterFixedAssets, setMasterFixedAssets] = useLazyPersistedState<FixedAsset[]>('insacc_master_fixed_assets', [])

  // Automatically repair due dates of existing pending PDCs
  React.useEffect(() => {
    if (pdcCheques.length === 0) return
    
    let updated = false
    const newCheques = pdcCheques.map(cheque => {
      if (cheque.status !== 'Pending') return cheque
      if (cheque.dueDate !== cheque.chequeDate) {
        updated = true
        return { ...cheque, dueDate: cheque.chequeDate }
      }
      return cheque
    })
    
    if (updated) {
      setPdcCheques(newCheques)
    }
  }, [pdcCheques, setPdcCheques])

  // Sync new default investment assets if they are missing from local storage,
  // and ensure all displayOrders match the latest master definition.
  React.useEffect(() => {
    const defaultMap = new Map(defaultInvestmentAssets.map(a => [a.id, a]))
    let needsUpdate = false
    const existingIds = new Set((investmentAssets || []).map(a => a.id))
    const missing = defaultInvestmentAssets.filter(a => !existingIds.has(a.id))
    
    if (missing.length > 0) {
      needsUpdate = true
    } else {
      for (const a of investmentAssets || []) {
        const defaultAsset = defaultMap.get(a.id)
        if (defaultAsset && defaultAsset.displayOrder !== a.displayOrder) {
          needsUpdate = true
          break
        }
      }
    }

    if (needsUpdate) {
      setInvestmentAssets(prev => {
        const prevList = prev || []
        const updatedList = prevList.map(a => {
          const defaultAsset = defaultMap.get(a.id)
          if (defaultAsset) {
            return { ...a, displayOrder: defaultAsset.displayOrder }
          }
          return a
        })
        const seen = new Set(updatedList.map(a => a.id))
        const toAdd = missing.filter(a => !seen.has(a.id))
        return [...updatedList, ...toAdd]
      })
    }
  }, [defaultInvestmentAssets, investmentAssets, setInvestmentAssets])
  const [bankReconciliations, setBankReconciliations] = useLazyPersistedState<BankReconciliationRecord[]>('insacc_bank_reconciliations', [])
  const [propBankReconciliations, setPropBankReconciliations] = useLazyPersistedState<BankReconciliationRecord[]>('insacc_prop_bank_reconciliations', [])
  const [propFiscalYears, setPropFiscalYears] = useLazyPersistedState<FiscalYear[]>('insacc_prop_fiscal_years', [])
  const [invFiscalYears, setInvFiscalYears] = useLazyPersistedState<FiscalYear[]>('insacc_fiscal_years', [])

  const [supabaseUrl, setSupabaseUrl] = useLazyPersistedState<string>('insacc_supabase_url', '')
  const [supabaseKey, setSupabaseKey] = useLazyPersistedState<string>('insacc_supabase_key', '')
  const [supabaseEnabled, setSupabaseEnabled] = useLazyPersistedState<boolean>('insacc_supabase_enabled', false)

  const [loginEntries, setLoginEntries] = useLazyPersistedState<LoginEntry[]>('insacc_login_entries', [
    { email: 'admin@insacc.com', password: '1234', name: 'Sameer Ish...', role: 'Admin' }
  ])

  const propEngine = useMemo(() => createAccountingEngine(), [])
  const invEngine = useMemo(() => createAccountingEngine(), [])

  useEffect(() => { propEngine.setFiscalYears(propFiscalYears) }, [propEngine, propFiscalYears])
  useEffect(() => { invEngine.setFiscalYears(invFiscalYears) }, [invEngine, invFiscalYears])

  useEffect(() => {
    if (masterCurrencies.length === 0) setMasterCurrencies(getDefaultCurrencies())
    if (masterTaxCodes.length === 0) setMasterTaxCodes(getDefaultTaxCodes())
    if (masterPaymentTerms.length === 0) setMasterPaymentTerms(getDefaultPaymentTerms())
  }, [])

  useEffect(() => {
    if (propFiscalYears.length === 0) {
      setPropFiscalYears(getDefaultFiscalYears())
    }
    if (invFiscalYears.length === 0) {
      setInvFiscalYears(getDefaultFiscalYears())
    }
  }, [propFiscalYears.length, invFiscalYears.length])

  useEffect(() => {
    if (accounts.length === 0 || propChartAccounts.length === 0) {
      const init = initializeApplication({ country: (currency === 'INR' ? 'India' : currency === 'GBP' ? 'UK' : 'UAE') as any })
      if (accounts.length === 0) setAccounts(init.accounts)
      if (propChartAccounts.length === 0) setPropChartAccounts(init.propChartAccounts)
      if (bankAccounts.length === 0) setBankAccounts(init.bankAccounts)
      if (propAccounts.length === 0) setPropAccounts(init.propAccounts)
      if (bankMappings.length === 0) setBankMappings(init.bankMappings)
      if (propBankMappings.length === 0) setPropBankMappings(init.propBankMappings)
    }
  }, [accounts.length, propChartAccounts.length, currency])

  useEffect(() => {
    // 1. Remove the old outside categories, properties, and units if they exist
    setMainCategories(prev => prev.filter(c => c && c.id !== 'mc-parking-rent'))
    setHierarchyProperties(prev => prev.filter(p => p && p.id !== 'prop-parking-rent'))
    setIncomeCategories(prev => prev.filter(i => i && i.id !== 'ic-parking-rent-contract'))
    setCustomers(prev => prev.filter(c => c && c.id !== 'cust-fatma-parking-402' && !c.id.startsWith('cust-parking-')))

    // 2. Clean up any duplicates in remaining categories
    setMainCategories(prev => {
      const seen = new Set()
      return prev.filter(c => {
        if (!c || seen.has(c.id)) return false
        seen.add(c.id)
        return true
      })
    })
    setHierarchyProperties(prev => {
      const seen = new Set()
      return prev.filter(p => {
        if (!p || seen.has(p.id)) return false
        seen.add(p.id)
        return true
      })
    })
    setIncomeCategories(prev => {
      // Also update the name of the parking income category inside Fatma Moosa
      const updated = prev.map(i => {
        if (i && i.id === 'ic-parking-rent-prop-fatma') {
          return { ...i, name: 'Parking and Rent Contract' }
        }
        return i
      })
      const seen = new Set()
      return updated.filter(i => {
        if (!i || seen.has(i.id)) return false
        seen.add(i.id)
        return true
      })
    })
    setCustomers(prev => {
      const seen = new Set()
      return prev.filter(c => {
        if (!c || seen.has(c.id)) return false
        seen.add(c.id)
        return true
      })
    })

    // 3. Append the 12 Parking units under ic-parking-rent-prop-fatma if missing
    setCustomers(prev => {
      const hasParking1 = prev.some(c => c && c.id === 'cust-fatma-parking-1')
      if (hasParking1) return prev
      const newParkingUnits: Customer[] = []
      for (let p = 1; p <= 12; p++) {
        newParkingUnits.push({
          id: `cust-fatma-parking-${p}`,
          incomeCategoryId: 'ic-parking-rent-prop-fatma',
          name: `Parking ${p}`
        })
      }
      return [...prev, ...newParkingUnits]
    })
  }, [setMainCategories, setHierarchyProperties, setIncomeCategories, setCustomers])

  useEffect(() => {
    if (accounts.length === 0) return
    let changed = false
    const filteredAccounts = accounts.filter(a => {
      if (a.code === '1270' || a.code === '1130' || a.code === '2120' || a.name === 'Real Estate' || a.name === 'Rent Receivable' || a.name === 'Security Deposits Held') {
        changed = true
        return false
      }
      return true
    })
    let hasOwner = filteredAccounts.some(a => a.id === '2200-inv')
    let updatedAccounts = [...filteredAccounts]
    if (!hasOwner) {
      const ts = new Date().toISOString()
      updatedAccounts.push({
        id: '2200-inv',
        code: '2200',
        name: 'Owner Account',
        type: 'liability',
        normalBalance: 'credit',
        parentId: '2000',
        isActive: true,
        description: 'Investment Owner Account',
        currency: currency === 'INR' ? 'INR' : currency === 'GBP' ? 'GBP' : 'AED',
        createdAt: ts,
        updatedAt: ts,
        module: 'investment'
      })
      changed = true
    }
    const migratedAccounts = updatedAccounts.map(a => {
      if (a.id === '1110' || a.name === 'Cash on Hand') {
        changed = true
        return { ...a, id: '1110-inv', name: 'Cash In Hand' }
      }
      return a
    })
    if (changed) {
      setAccounts(migratedAccounts)
    }
  }, [accounts, setAccounts, currency])

  useEffect(() => {
    if (propChartAccounts.length === 0) return
    let changed = false
    let hasOwner = propChartAccounts.some(a => a.id === '2200-prop')
    let updatedPropAccounts = [...propChartAccounts]
    if (!hasOwner) {
      const ts = new Date().toISOString()
      updatedPropAccounts.push({
        id: '2200-prop',
        code: '2200',
        name: 'Owner Account',
        type: 'liability',
        normalBalance: 'credit',
        parentId: '2000',
        isActive: true,
        description: 'Property Owner Account',
        currency: currency === 'INR' ? 'INR' : currency === 'GBP' ? 'GBP' : 'AED',
        createdAt: ts,
        updatedAt: ts,
        module: 'property'
      })
      changed = true
    }
    let hasSecurityDeposit = updatedPropAccounts.some(a => a.code === '2120')
    if (!hasSecurityDeposit) {
      const ts = new Date().toISOString()
      updatedPropAccounts.push({
        id: '2120',
        code: '2120',
        name: 'Security Deposits Held',
        type: 'liability',
        normalBalance: 'credit',
        parentId: '2000',
        isActive: true,
        description: 'Security Deposit Liability',
        currency: currency === 'INR' ? 'INR' : currency === 'GBP' ? 'GBP' : 'AED',
        createdAt: ts,
        updatedAt: ts,
        module: 'property'
      })
      changed = true
    }
    let hasDamageRecovery = updatedPropAccounts.some(a => a.code === '4160')
    if (!hasDamageRecovery) {
      const ts = new Date().toISOString()
      updatedPropAccounts.push({
        id: '4160',
        code: '4160',
        name: 'Damage Recovery Income',
        type: 'revenue',
        normalBalance: 'credit',
        parentId: '4000',
        isActive: true,
        description: 'Security deposit forfeiture & damage recovery income',
        currency: currency === 'INR' ? 'INR' : currency === 'GBP' ? 'GBP' : 'AED',
        createdAt: ts,
        updatedAt: ts,
        module: 'property'
      })
      changed = true
    }
    updatedPropAccounts = updatedPropAccounts.map(a => {
      if (a.code === '4120' && (a.name === 'Rental Income' || a.name === 'Property Leases Revenues')) {
        changed = true
        return { ...a, name: 'Building Rental Income', description: 'Building Rental Income', module: 'property' as const }
      }
      if (a.code === '4200' && (a.name === 'Property Income' || a.name === 'Other Property Income') && (a.module === 'property' || !a.module)) {
        changed = true
        return { ...a, name: 'Villa Rental Income', description: 'Villa Rental Income', module: 'property' as const }
      }
      return a
    })
    const hasVillaRental = updatedPropAccounts.some(a => a.code === '4200' && a.module === 'property')
    if (!hasVillaRental) {
      const ts = new Date().toISOString()
      updatedPropAccounts.push({
        id: '4200',
        code: '4200',
        name: 'Villa Rental Income',
        type: 'revenue',
        normalBalance: 'credit',
        parentId: '4000',
        isActive: true,
        description: 'Villa Rental Income',
        currency: currency === 'INR' ? 'INR' : currency === 'GBP' ? 'GBP' : 'AED',
        createdAt: ts,
        updatedAt: ts,
        module: 'property'
      })
      changed = true
    }
    const hasApartmentRental = updatedPropAccounts.some(a => a.code === '4210')
    if (!hasApartmentRental) {
      const ts = new Date().toISOString()
      updatedPropAccounts.push({
        id: '4210',
        code: '4210',
        name: 'Apartment Rental Income',
        type: 'revenue',
        normalBalance: 'credit',
        parentId: '4000',
        isActive: true,
        description: 'Apartment Rental Income',
        currency: currency === 'INR' ? 'INR' : currency === 'GBP' ? 'GBP' : 'AED',
        createdAt: ts,
        updatedAt: ts,
        module: 'property'
      })
      changed = true
    }
    const has1420 = updatedPropAccounts.some(a => a.code === '1420')
    if (!has1420) {
      const ts = new Date().toISOString()
      updatedPropAccounts.push({
        id: '1420',
        code: '1420',
        name: 'Security Cheques Received',
        type: 'asset',
        normalBalance: 'debit',
        parentId: '1000',
        isActive: true,
        description: 'Security Cheques Received Pool',
        currency: currency === 'INR' ? 'INR' : currency === 'GBP' ? 'GBP' : 'AED',
        createdAt: ts,
        updatedAt: ts,
        module: 'property'
      })
      changed = true
    }
    const has2120 = updatedPropAccounts.some(a => a.code === '2120')
    if (!has2120) {
      const ts = new Date().toISOString()
      updatedPropAccounts.push({
        id: '2120',
        code: '2120',
        name: 'Security Deposits Held',
        type: 'liability',
        normalBalance: 'credit',
        parentId: '2000',
        isActive: true,
        description: 'Security Deposit Liability',
        currency: currency === 'INR' ? 'INR' : currency === 'GBP' ? 'GBP' : 'AED',
        createdAt: ts,
        updatedAt: ts,
        module: 'property'
      })
      changed = true
    }
    const has4160 = updatedPropAccounts.some(a => a.code === '4160')
    if (!has4160) {
      const ts = new Date().toISOString()
      updatedPropAccounts.push({
        id: '4160',
        code: '4160',
        name: 'Damage Recovery Income',
        type: 'revenue',
        normalBalance: 'credit',
        parentId: '4000',
        isActive: true,
        description: 'Security deposit forfeiture & damage recovery income',
        currency: currency === 'INR' ? 'INR' : currency === 'GBP' ? 'GBP' : 'AED',
        createdAt: ts,
        updatedAt: ts,
        module: 'property'
      })
      changed = true
    }
    const has1320 = updatedPropAccounts.some(a => a.code === '1320')
    const has1130 = updatedPropAccounts.some(a => a.code === '1130')
    if (has1320 || has1130) {
      updatedPropAccounts = updatedPropAccounts.filter(a => a.code !== '1320' && a.code !== '1130')
      changed = true
    }
    const migratedPropAccounts = updatedPropAccounts.map(a => {
      if (a.id === '1110' || a.name === 'Cash on Hand') {
        changed = true
        return { ...a, id: '1110-prop', name: 'Cash In Hand' }
      }
      return a
    })

    // Deduplicate accounts with the exact same ID (e.g. '50001')
    const idCounts = new Map<string, number>()
    const deduplicatedAccounts: Account[] = []
    for (const a of migratedPropAccounts) {
      const count = idCounts.get(a.id) || 0
      if (count > 0) {
        // Assign a new unique ID for the duplicate
        const newId = `acct-migrated-${Date.now()}-${Math.floor(Math.random() * 10000)}`
        deduplicatedAccounts.push({ ...a, id: newId })
        changed = true
      } else {
        deduplicatedAccounts.push(a)
      }
      idCounts.set(a.id, count + 1)
    }

    if (changed) {
      setPropChartAccounts(deduplicatedAccounts)
    }
  }, [propChartAccounts, setPropChartAccounts, currency])

  React.useEffect(() => {
    let changed = false
    const filteredVouchers = propVouchers.filter(v => {
      const desc = v.description || ''
      const isPdcReceived = desc.includes('PDC Received: Chq') || v.number?.startsWith('JV-PDC-FIX')
      if (isPdcReceived) changed = true
      return !isPdcReceived
    })
    const updatedPropVouchers = filteredVouchers.map(v => {
      let vChanged = false
      const updatedLines = v.lines.map(l => {
        if (l.accountId === '1320' || l.accountId === '1130') {
          vChanged = true
          return { ...l, accountId: '1410' }
        }
        return l
      })
      if (vChanged) {
        changed = true
        return { ...v, lines: updatedLines }
      }
      return v
    })
    if (changed) {
      setPropVouchers(updatedPropVouchers)
    }
  }, [propVouchers, setPropVouchers])

  useEffect(() => {
    let changed = false
    const updatedVouchers = vouchers.map(v => {
      let vChanged = false
      const updatedLines = v.lines.map(l => {
        if (l.accountId === '1110') {
          vChanged = true
          return { ...l, accountId: '1110-inv' }
        }
        if (l.accountId === '3000' || l.accountId === '3110') {
          vChanged = true
          return { ...l, accountId: '2200-inv' }
        }
        return l
      })
      if (vChanged) {
        changed = true
        return { ...v, lines: updatedLines }
      }
      return v
    })
    if (changed) {
      setVouchers(updatedVouchers)
    }
  }, [vouchers, setVouchers])

  useEffect(() => {
    let changed = false
    const updatedPropVouchers = propVouchers.map(v => {
      let vChanged = false
      const updatedLines = v.lines.map(l => {
        if (l.accountId === '1110') {
          vChanged = true
          return { ...l, accountId: '1110-prop' }
        }
        if (l.accountId === '3000' || l.accountId === '3110') {
          vChanged = true
          return { ...l, accountId: '2200-prop' }
        }
        return l
      })
      if (vChanged) {
        changed = true
        return { ...v, lines: updatedLines }
      }
      return v
    })
    if (changed) {
      setPropVouchers(updatedPropVouchers)
    }
  }, [propVouchers, setPropVouchers])

  // Fix deposit mappings if persisted with wrong account codes
  useEffect(() => {
    const needsFix =
      !depositMappings ||
      !depositMappings.liabilityAccountId ||
      !depositMappings.forfeitureIncomeAccountId ||
      !depositMappings.securityChequesAccountId ||
      !depositMappings.cashAccountId ||
      !depositMappings.pdcReceivableAccountId ||
      depositMappings.liabilityAccountId !== '2120' ||
      depositMappings.forfeitureIncomeAccountId !== '4160' ||
      depositMappings.securityChequesAccountId !== '1420' ||
      depositMappings.cashAccountId !== '1110' ||
      depositMappings.pdcReceivableAccountId !== '1410'
    if (needsFix) {
      setDepositMappings({
        liabilityAccountId: '2120',
        forfeitureIncomeAccountId: '4160',
        securityChequesAccountId: '1420',
        cashAccountId: '1110',
        pdcReceivableAccountId: '1410'
      })
    }
    let changedAccounts = false
    const incorrectRevenueAccounts = propChartAccounts.filter(a =>
      a.name.toLowerCase() === 'security deposit received' ||
      a.name.toLowerCase() === 'security deposit refund'
    )
    const incorrectAcctIds = new Set(incorrectRevenueAccounts.map(a => a.id))
    if (incorrectRevenueAccounts.length > 0) {
      setPropChartAccounts(prev => prev.filter(a => !incorrectAcctIds.has(a.id)))
      changedAccounts = true
    }
    let changedVouchers = false
    const updatedPropVouchers = propVouchers.map(v => {
      let vChanged = false
      const updatedLines = v.lines.map(l => {
        if (incorrectAcctIds.has(l.accountId)) {
          vChanged = true
          return { ...l, accountId: '2120' }
        }
        const isSecDepText =
          (v.description || '').toLowerCase().includes('security deposit') ||
          (l.narration && l.narration.toLowerCase().includes('security deposit'))
        if (isSecDepText) {
          const targetAcct = propChartAccounts.find(a => a.id === l.accountId)
          if (l.type === 'Credit' && targetAcct?.type === 'revenue' && l.accountId !== '2120') {
            vChanged = true
            return { ...l, accountId: '2120' }
          }
          if (l.type === 'Debit' && (targetAcct?.type === 'expense' || targetAcct?.type === 'revenue') && l.accountId !== '2120') {
            vChanged = true
            return { ...l, accountId: '2120' }
          }
        }
        return l
      })
      if (vChanged) {
        changedVouchers = true
        return { ...v, lines: updatedLines }
      }
      return v
    })
    if (changedVouchers) {
      setPropVouchers(updatedPropVouchers)
    }
  }, [propChartAccounts, setPropChartAccounts, propVouchers, setPropVouchers, depositMappings, setDepositMappings])

  useEffect(() => {
    const migratedKey = 'insacc_ptcat_sd_removed_v5'
    if (localStorage.getItem(migratedKey)) return
    setPropertyTransactionCategories(prev =>
      prev.map(c =>
        c.name === 'Security Deposit Received' && c.type === 'credit'
          ? { ...c, isActive: false }
          : c
      )
    )
    localStorage.setItem(migratedKey, 'true')
  }, [setPropertyTransactionCategories])

  // Backfill: create SECURITY_DEPOSIT_RECEIVED vouchers for existing deposits
  useEffect(() => {
    const migratedKey = 'insacc_sd_voucher_backfill_v2'
    if (localStorage.getItem(migratedKey)) return
    if (!propChartAccounts.length) return

    const bankAcct =
      propChartAccounts.find(a => a.code === '112002' || a.id === 'fab-current') ||
      propChartAccounts.find(a => a.code?.startsWith('112') && a.id !== '1120') ||
      propChartAccounts.find(a => a.id === '1110-prop')
    const liabAcct = propChartAccounts.find(a => a.code === '2120')
    if (!bankAcct || !liabAcct) return

    let depositsChanged = false
    const updatedDeposits = [...securityDeposits]
    const newVouchers: Voucher[] = []

    for (let i = 0; i < updatedDeposits.length; i++) {
      const dep = updatedDeposits[i]
      const hasReceiptVoucher = dep.transactions.some(t => t.type === 'Receipt' && !!t.voucherId)
      if (hasReceiptVoucher) continue

      const chargeTx = dep.transactions.find(t => t.type === 'Charge')
      if (!chargeTx || chargeTx.amount <= 0) continue

      const now = new Date().toISOString()
      const voucherId = `v-sd-mig-${i}-${Date.now()}`
      const voucherNum = `SD-MIG-${String(i + 1).padStart(4, '0')}`

      const voucher: Voucher = {
        id: voucherId,
        number: voucherNum,
        date: chargeTx.date.split('T')[0],
        type: 'Receipt',
        reference: dep.leaseId,
        description: `Security deposit received (migration) — ${dep.leaseId}`,
        status: 'Posted',
        currency: 'AED',
        exchangeRate: 1,
        baseCurrency: 'AED',
        createdBy: 'system',
        createdAt: now,
        updatedAt: now,
        postedBy: 'system',
        postedAt: now,
        lines: [
          {
            id: `${voucherId}-dr`,
            accountId: bankAcct.id,
            type: 'Debit',
            amount: chargeTx.amount,
            baseAmount: chargeTx.amount,
            currency: 'AED',
            narration: 'Security deposit received',
            referenceType: 'Lease',
            referenceId: dep.leaseId,
          },
          {
            id: `${voucherId}-cr`,
            accountId: liabAcct.id,
            type: 'Credit',
            amount: chargeTx.amount,
            baseAmount: chargeTx.amount,
            currency: 'AED',
            narration: 'Security deposit liability',
            referenceType: 'Lease',
            referenceId: dep.leaseId,
          },
        ],
      }
      newVouchers.push(voucher)

      const receiptTx: SecurityDepositTransaction = {
        id: `${voucherId}-tx`,
        depositId: dep.id,
        type: 'Receipt',
        amount: chargeTx.amount,
        date: chargeTx.date.split('T')[0],
        bankAccountId: bankAcct.id,
        voucherId: voucher.id,
        notes: 'Auto-created by system migration',
        status: 'Posted',
        createdBy: 'system',
        createdAt: now,
        updatedAt: now,
      }

      updatedDeposits[i] = {
        ...dep,
        transactions: [...dep.transactions, receiptTx],
        status: 'Held',
        updatedAt: now,
        auditHistory: [
          ...(dep.auditHistory || []),
          {
            timestamp: now,
            previousStatus: dep.status,
            newStatus: 'Held',
            user: 'system',
            amount: chargeTx.amount,
            notes: 'Backfill: security deposit voucher auto-created',
            voucherId: voucher.id,
          },
        ],
      }
      depositsChanged = true
    }

    if (depositsChanged) {
      setSecurityDeposits(updatedDeposits)
      setPropVouchers(prev => [...newVouchers, ...prev])
    }

    localStorage.setItem(migratedKey, 'true')
  }, [propChartAccounts, securityDeposits, setSecurityDeposits, propVouchers, setPropVouchers, depositMappings])

  // Fix orphaned account references in vouchers (e.g., 112001 -> fab-current)
  useEffect(() => {
    const migratedKey = 'insacc_orphan_acct_fix_v1'
    if (localStorage.getItem(migratedKey)) return

    const bankAcct = propChartAccounts.find(a => a.code === '112002' || a.id === 'fab-current')
    if (!bankAcct) return

    let changed = false
    const updatedPropVouchers = propVouchers.map(v => {
      let vChanged = false
      const updatedLines = v.lines.map(l => {
        if (l.accountId === '112001') {
          vChanged = true
          return { ...l, accountId: bankAcct.id }
        }
        return l
      })
      if (vChanged) {
        changed = true
        return { ...v, lines: updatedLines }
      }
      return v
    })
    if (changed) {
      setPropVouchers(updatedPropVouchers)
    }

    localStorage.setItem(migratedKey, 'true')
  }, [propChartAccounts, propVouchers, setPropVouchers])

  // Purge vouchers whose top-level referenceType='Lease' points to a deleted lease
  // (PDC migration vouchers are stored this way and are missed by the cascade delete)
  useEffect(() => {
    if (!propVouchers.length || !propLeases.length) return
    const activeLeaseIds = new Set(propLeases.map(l => l.id))
    const activeLeaseNumbers = new Set(propLeases.map(l => l.leaseNumber))
    const filtered = propVouchers.filter(v => {
      const vAny = v as any
      if (vAny.referenceType === 'Lease') {
        const refId = vAny.referenceId || ''
        // If it points to a lease that no longer exists, remove it
        if (refId && !activeLeaseIds.has(refId) && !activeLeaseNumbers.has(refId)) return false
      }
      return true
    })
    if (filtered.length !== propVouchers.length) {
      setPropVouchers(filtered)
    }
  }, [propLeases, propVouchers, setPropVouchers])

  useEffect(() => {
    const oldVal = localStorage.getItem('insacc_prop_accounts')
    if (oldVal) {
      localStorage.setItem('insacc_prop_bank_accounts', oldVal)
      localStorage.removeItem('insacc_prop_accounts')
    }
  }, [])

  useEffect(() => {
    const migratedKey = 'insacc_mixed_data_split_v6'
    if (localStorage.getItem(migratedKey)) return
    let bankAccountsChanged = false
    let propAccountsChanged = false
    const allInvBanks = [...bankAccounts]
    const allPropBanks = [...propAccounts]
    const actualInvBanks = allInvBanks.filter(ba => {
      const isProp = ba.id.startsWith('pt-')
      if (isProp) {
        if (!allPropBanks.some(p => p.id === ba.id)) {
          allPropBanks.push(ba as any)
          propAccountsChanged = true
        }
        bankAccountsChanged = true
        return false
      }
      return true
    })
    const actualPropBanks = allPropBanks.filter(ba => {
      const isInv = ba.id.startsWith('ba-')
      if (isInv) {
        if (!allInvBanks.some(i => i.id === ba.id)) {
          allInvBanks.push(ba as any)
          bankAccountsChanged = true
        }
        propAccountsChanged = true
        return false
      }
      return true
    })
    if (bankAccountsChanged) setBankAccounts(actualInvBanks)
    if (propAccountsChanged) setPropAccounts(actualPropBanks)
    let bankMappingsChanged = false
    let propMappingsChanged = false
    const allInvMappings = [...bankMappings]
    const allPropMappings = [...propBankMappings]
    const actualInvMappings = allInvMappings.filter(m => {
      const isProp = m.bankAccountId.startsWith('pt-')
      if (isProp) {
        if (!allPropMappings.some(pm => pm.bankAccountId === m.bankAccountId)) {
          allPropMappings.push(m)
          propMappingsChanged = true
        }
        bankMappingsChanged = true
        return false
      }
      return true
    })
    const actualPropMappings = allPropMappings.filter(m => {
      const isInv = m.bankAccountId.startsWith('ba-')
      if (isInv) {
        if (!allInvMappings.some(im => im.bankAccountId === m.bankAccountId)) {
          allInvMappings.push(m)
          bankMappingsChanged = true
        }
        propMappingsChanged = true
        return false
      }
      return true
    })
    if (bankMappingsChanged) setBankMappings(actualInvMappings)
    if (propMappingsChanged) setPropBankMappings(actualPropMappings)
    const sharedRaw = localStorage.getItem('insacc_bank_reconciliations')
    if (sharedRaw) {
      try {
        const sharedRecons = JSON.parse(sharedRaw)
        if (Array.isArray(sharedRecons)) {
          const propAccountIds = new Set(actualPropBanks.map(a => a.id))
          const propRecons = sharedRecons.filter(r => propAccountIds.has(r.bankAccountId) || r.bankAccountId.startsWith('pt-'))
          const invRecons = sharedRecons.filter(r => !propAccountIds.has(r.bankAccountId) && !r.bankAccountId.startsWith('pt-'))
          setPropBankReconciliations(propRecons)
          setBankReconciliations(invRecons)
        }
      } catch (e) {
        console.error('Failed to split bank reconciliations:', e)
      }
    }
    localStorage.setItem(migratedKey, 'true')
  }, [bankAccounts, propAccounts, bankMappings, propBankMappings, setBankAccounts, setPropAccounts, setBankMappings, setPropBankMappings, setBankReconciliations, setPropBankReconciliations])

  useEffect(() => {
    let changed = false
    const updatedMappings = bankMappings.map(m => {
      if (m.accountId === '1110') {
        changed = true
        return { ...m, accountId: '1110-inv' }
      }
      return m
    })
    if (changed) {
      setBankMappings(updatedMappings)
    }
  }, [bankMappings, setBankMappings])

  useEffect(() => {
    let changed = false
    const updatedPropMappings = propBankMappings.map(m => {
      if (m.accountId === '1110') {
        changed = true
        return { ...m, accountId: '1110-prop' }
      }
      return m
    })
    if (changed) {
      setPropBankMappings(updatedPropMappings)
    }
  }, [propBankMappings, setPropBankMappings])

  useEffect(() => {
    const renameMigrationKey = 'insacc_bank_names_to_real_v2'
    if (localStorage.getItem(renameMigrationKey)) return
    let accountsUpdated = false
    const renamedAccounts = accounts.map(a => {
      if (a.name === 'Investment Reserve Bank') {
        accountsUpdated = true
        return { ...a, name: 'Emirates Islamic Bank', description: 'Emirates Islamic Bank' }
      }
      return a
    })
    let propChartUpdated = false
    const renamedPropChartAccounts = propChartAccounts.map(a => {
      if (a.name === 'Property Operating Bank') {
        propChartUpdated = true
        return { ...a, name: 'Dubai Islamic Bank', description: 'Dubai Islamic Bank' }
      }
      if (a.name === 'Property Reserve Bank') {
        propChartUpdated = true
        return { ...a, name: 'First Abu Dhabi Bank (FAB)', description: 'First Abu Dhabi Bank (FAB)' }
      }
      return a
    })
    let propAccountsUpdated = false
    const renamedPropAccounts = propAccounts.map(ba => {
      if (ba.institution === 'Property Operating Bank') {
        propAccountsUpdated = true
        return { ...ba, institution: 'Dubai Islamic Bank', accountNumber: ba.accountNumber === 'OP-CURR-1234' ? 'DIB-CURR-1234' : ba.accountNumber }
      }
      if (ba.institution === 'Property Reserve Bank') {
        propAccountsUpdated = true
        return { ...ba, institution: 'First Abu Dhabi Bank (FAB)', accountNumber: ba.accountNumber === 'RES-CURR-9999' ? 'FAB-CURR-9999' : ba.accountNumber }
      }
      return ba
    })
    let propBankMappingsUpdated = false
    const renamedPropBankMappings = propBankMappings.map(m => {
      if (m.accountName.includes('Property Operating Bank')) {
        propBankMappingsUpdated = true
        return { ...m, accountName: m.accountName.replace('Property Operating Bank', 'Dubai Islamic Bank') }
      }
      if (m.accountName.includes('Property Reserve Bank')) {
        propBankMappingsUpdated = true
        return { ...m, accountName: m.accountName.replace('Property Reserve Bank', 'First Abu Dhabi Bank (FAB)') }
      }
      return m
    })
    if (accountsUpdated) setAccounts(renamedAccounts)
    if (propChartUpdated) setPropChartAccounts(renamedPropChartAccounts)
    if (propAccountsUpdated) setPropAccounts(renamedPropAccounts)
    if (propBankMappingsUpdated) setPropBankMappings(renamedPropBankMappings)
    localStorage.setItem(renameMigrationKey, 'true')
    invalidateBalanceCache()
  }, [
    accounts, propChartAccounts, propAccounts, propBankMappings,
    setAccounts, setPropChartAccounts, setPropAccounts, setPropBankMappings
  ])

  useEffect(() => {
    const cleanedKey = 'insacc_bank_names_clean_v2'
    if (localStorage.getItem(cleanedKey)) return
    let changed = false
    const cleaned = accounts.map(a => {
      const m = bankMappings.find(m => m.accountId === a.id)
      if (!m) return a
      const bank = bankAccounts.find(ba => ba.id === m.bankAccountId)
      if (!bank) return a
      if (a.name === bank.institution) return a
      changed = true
      return { ...a, name: bank.institution }
    })
    const propCleaned = propChartAccounts.map(a => {
      const m = propBankMappings.find(m => m.accountId === a.id)
      if (!m) return a
      const bank = propAccounts.find(ba => ba.id === m.bankAccountId)
      if (!bank) return a
      if (a.name === bank.institution) return a
      changed = true
      return { ...a, name: bank.institution }
    })
    if (changed) {
      setAccounts(cleaned)
      setPropChartAccounts(propCleaned)
    }
    localStorage.setItem(cleanedKey, 'true')
  }, [accounts, bankMappings, bankAccounts, propChartAccounts, propBankMappings, propAccounts, setAccounts, setPropChartAccounts])

  useEffect(() => {
    const fabMigrationKey = 'insacc_prop_fab_account_v1'
    if (localStorage.getItem(fabMigrationKey)) return
    const fabExists = propAccounts.some(ba => ba.id === 'pt-fab-current')
    if (fabExists) {
      localStorage.setItem(fabMigrationKey, 'true')
      return
    }
    const now = new Date().toISOString()
    const newFabAccount: PropAccount = {
      id: 'pt-fab-current',
      institution: 'First Abu Dhabi Bank (FAB)',
      accountNumber: 'FAB-CURR-9999',
      currency: currency,
      openingBalance: 0,
      theme: 'blue',
      icon: 'bank',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      updatedBy: 'system',
    }
    const bankParent1120 = propChartAccounts.find(a => a.code === '1120')
    const newFabMapping: BankMapping = {
      bankAccountId: newFabAccount.id,
      accountId: bankParent1120?.id || '',
      accountCode: '1120',
      accountName: 'Bank Accounts',
    }
    setPropAccounts(prev => [...prev, newFabAccount])
    setPropBankMappings(prev => [...prev, newFabMapping])
    invalidateBalanceCache()
    localStorage.setItem(fabMigrationKey, 'true')
  }, [propAccounts, propChartAccounts, propBankMappings, setPropAccounts, setPropBankMappings, currency])

  useEffect(() => {
    const coaMigrationKey = 'insacc_prop_bank_coa_cleanup_v1'
    if (localStorage.getItem(coaMigrationKey)) return
    let changed = false
    const bankParent = propChartAccounts.find(a => a.code === '1120')
    if (!bankParent) return
    const childIds = new Set<string>()
    const cleanedAccounts = propChartAccounts.map(a => {
      if ((a.code.startsWith('1120') && a.code !== '1120' && a.parentId === bankParent.id && a.isActive) ||
          (a.parentId === bankParent.id && a.code !== '1120' && a.isActive)) {
        childIds.add(a.id)
        changed = true
        return { ...a, isActive: false, updatedAt: new Date().toISOString() }
      }
      return a
    })
    const cleanedMappings = propBankMappings.map(m => {
      if (childIds.has(m.accountId)) {
        changed = true
        return {
          ...m,
          accountId: bankParent.id,
          accountCode: bankParent.code,
          accountName: bankParent.name,
        }
      }
      return m
    })
    if (changed) {
      setPropChartAccounts(cleanedAccounts)
      setPropBankMappings(cleanedMappings)
      invalidateBalanceCache()
    }
    localStorage.setItem(coaMigrationKey, 'true')
  }, [propChartAccounts, propBankMappings, setPropChartAccounts, setPropBankMappings])

  useEffect(() => {
    const repairMigrationKey = 'insacc_prop_bank_coa_repair_v2'
    if (localStorage.getItem(repairMigrationKey)) return
    if (propAccounts.length === 0 || propChartAccounts.length === 0) return // Wait for data to load

    let accountsChanged = false
    let mappingsChanged = false
    let vouchersChanged = false

    const bankParent = propChartAccounts.find(a => a.code === '1120')
    if (!bankParent) return

    const newAccounts = [...propChartAccounts]
    const newMappings = [...propBankMappings]
    const newVouchers = [...propVouchers]

    // Helper to generate a new child code
    const getNextChildCode = (parentCode: string) => {
      let maxNum = 0
      newAccounts.forEach(a => {
        if (a.code.startsWith(parentCode) && a.code !== parentCode) {
          const num = parseInt(a.code.slice(parentCode.length), 10)
          if (!isNaN(num) && num > maxNum) maxNum = num
        }
      })
      return `${parentCode}${maxNum + 1}`
    }

    for (const bank of propAccounts) {
      const mappingIdx = newMappings.findIndex(m => m.bankAccountId === bank.id)
      let targetLedgerAccountId = ''

      // Look for an existing ledger account that either is already mapped, or has matching name
      let childAcctIdx = newAccounts.findIndex(a => 
        a.parentId === bankParent.id && 
        ((mappingIdx >= 0 && a.id === newMappings[mappingIdx].accountId && a.id !== bankParent.id) || 
         a.name.toLowerCase().includes(bank.institution.toLowerCase()) || 
         bank.institution.toLowerCase().includes(a.name.toLowerCase()))
      )

      if (childAcctIdx >= 0) {
        // We found an existing child account. Reactivate it if needed.
        targetLedgerAccountId = newAccounts[childAcctIdx].id
        if (!newAccounts[childAcctIdx].isActive) {
          newAccounts[childAcctIdx] = { ...newAccounts[childAcctIdx], isActive: true, updatedAt: new Date().toISOString() }
          accountsChanged = true
        }
      } else {
        // Create a new child account
        targetLedgerAccountId = `acct-${Date.now()}-${Math.random().toString(36).substring(2,6)}`
        newAccounts.push({
          id: targetLedgerAccountId,
          code: getNextChildCode(bankParent.code),
          name: bank.institution,
          type: bankParent.type,
          normalBalance: bankParent.normalBalance,
          classification: bankParent.classification,
          currency: bank.currency || 'AED',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'system',
          parentId: bankParent.id,
          description: 'Bank Account',
          module: 'property',
        } as any)
        accountsChanged = true
      }

      // Update mapping
      if (mappingIdx >= 0) {
        if (newMappings[mappingIdx].accountId !== targetLedgerAccountId) {
          newMappings[mappingIdx] = {
            ...newMappings[mappingIdx],
            accountId: targetLedgerAccountId,
            accountCode: newAccounts.find(a => a.id === targetLedgerAccountId)?.code || '',
            accountName: bank.institution
          }
          mappingsChanged = true
        }
      } else {
        newMappings.push({
          bankAccountId: bank.id,
          accountId: targetLedgerAccountId,
          accountCode: newAccounts.find(a => a.id === targetLedgerAccountId)?.code || '',
          accountName: bank.institution
        })
        mappingsChanged = true
      }

      // Repair vouchers pointing to the parent (1120) or any other invalid account
      // that have referenceId === bank.id
      for (let i = 0; i < newVouchers.length; i++) {
        let voucherChanged = false
        const updatedLines = newVouchers[i].lines.map(line => {
          if (line.referenceId === bank.id && line.accountId !== targetLedgerAccountId) {
            voucherChanged = true
            return { ...line, accountId: targetLedgerAccountId }
          }
          return line
        })
        if (voucherChanged) {
          newVouchers[i] = { ...newVouchers[i], lines: updatedLines }
          vouchersChanged = true
        }
      }
    }

    // Also update propAccounts chartAccountId to point to the correct child
    let propAccountsChanged = false
    const newPropAccounts = propAccounts.map(bank => {
      const mapping = newMappings.find(m => m.bankAccountId === bank.id)
      if (mapping && bank.chartAccountId !== mapping.accountId) {
        propAccountsChanged = true
        return { ...bank, chartAccountId: mapping.accountId }
      }
      return bank
    })

    if (accountsChanged) setPropChartAccounts(newAccounts)
    if (mappingsChanged) setPropBankMappings(newMappings)
    if (vouchersChanged) setPropVouchers(newVouchers)
    if (propAccountsChanged) setPropAccounts(newPropAccounts)

    if (accountsChanged || mappingsChanged || vouchersChanged || propAccountsChanged) {
      invalidateBalanceCache()
    }
    
    localStorage.setItem(repairMigrationKey, 'true')
  }, [propAccounts, propChartAccounts, propBankMappings, propVouchers, setPropChartAccounts, setPropBankMappings, setPropVouchers, setPropAccounts])

  useEffect(() => {
    const fabSeedKey = 'insacc_prop_fab_seed_v1'
    if (localStorage.getItem(fabSeedKey)) return
    if (propAccounts.length === 0) {
      localStorage.setItem(fabSeedKey, 'true')
      return
    }
    const hasFab = propAccounts.some(
      a => a.id === 'pt-fab-current'
    )
    if (hasFab) {
      localStorage.setItem(fabSeedKey, 'true')
      return
    }
    const now = new Date().toISOString()
    const newFab: PropAccount = {
      id: 'pt-fab-current',
      institution: 'First Abu Dhabi Bank (FAB)',
      accountNumber: 'FAB-CURR-9999',
      currency,
      openingBalance: 0,
      theme: 'blue',
      icon: 'bank',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      updatedBy: 'system',
    }
    setPropAccounts(prev => [...prev, newFab])
    const bankParent = propChartAccounts.find(a => a.code === '1120')
    const parentId = bankParent?.id || '1120'
    setPropBankMappings(prev => [...prev, {
      bankAccountId: newFab.id,
      accountId: parentId,
      accountCode: '1120',
      accountName: 'Bank Accounts',
    }])
    invalidateBalanceCache()
    localStorage.setItem(fabSeedKey, 'true')
  }, [
    propAccounts, propChartAccounts, currency,
    setPropAccounts, setPropChartAccounts, setPropBankMappings
  ])

  useEffect(() => {
    const bankParent = propChartAccounts.find(a => a.code === '1120')
    if (!bankParent) return

    let changed = false
    const cleanAccounts = propChartAccounts.filter(a => {
      const isChild = a.id !== bankParent.id && (a.parentId === bankParent.id || a.parentId === '1120-prop' || (a.code && a.code.startsWith('1120') && a.code.length > 4))
      if (!isChild) return true

      const hasActiveBank = propAccounts.some(ba => {
        if (ba.status !== 'active') return false
        const mapping = propBankMappings.find(m => m.bankAccountId === ba.id)
        if (mapping && (mapping.accountId === a.id || mapping.accountCode === a.code)) return true
        if (ba.chartAccountId && (ba.chartAccountId === a.id || ba.chartAccountId === a.code)) return true
        return false
      })

      if (!hasActiveBank) {
        changed = true
        return false // Remove the orphaned node
      }
      return true
    })

    const cleanMappings = propBankMappings.filter(m => {
      const bankExists = propAccounts.some(ba => ba.id === m.bankAccountId)
      const accountExists = m.accountId === bankParent.id || cleanAccounts.some(a => a.id === m.accountId || a.code === m.accountCode)
      if (!bankExists || !accountExists) {
        changed = true
        return false
      }
      return true
    })

    if (changed) {
      setPropChartAccounts(cleanAccounts)
      setPropBankMappings(cleanMappings)
      invalidateBalanceCache()
    }
  }, [propAccounts, propChartAccounts, propBankMappings, setPropChartAccounts, setPropBankMappings])

  useEffect(() => {
    const migrationKey = 'insacc_prop_default_banks_reset_v1'
    if (localStorage.getItem(migrationKey)) return

    const now = new Date().toISOString()
    
    const defaultBanks: PropAccount[] = [
      {
        id: 'pt-dib-current',
        institution: 'Dubai Islamic Bank',
        accountNumber: 'DIB-CURR-1234',
        currency: currency,
        openingBalance: 0,
        theme: 'emerald',
        icon: 'bank',
        status: 'active',
        chartAccountId: 'acc-dib-current',
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
        updatedBy: 'system'
      },
      {
        id: 'pt-fab-current',
        institution: 'First Abu Dhabi Bank (FAB)',
        accountNumber: 'FAB-CURR-9999',
        currency: currency,
        openingBalance: 0,
        theme: 'blue',
        icon: 'bank',
        status: 'active',
        chartAccountId: 'acc-fab-current',
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
        updatedBy: 'system'
      }
    ]

    setPropAccounts(defaultBanks)

    const bankParent = propChartAccounts.find(a => a.code === '1120')
    const parentId = bankParent?.id || '1120'

    const dibCoa: Account = {
      id: 'acc-dib-current',
      code: '112001',
      name: 'Dubai Islamic Bank',
      type: 'asset',
      normalBalance: 'debit',
      classification: 'current',
      currency: currency,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      description: 'Dubai Islamic Bank Current Account',
      parentId: parentId,
      module: 'property',
      openingBalance: 0
    }

    const fabCoa: Account = {
      id: 'acc-fab-current',
      code: '112002',
      name: 'First Abu Dhabi Bank (FAB)',
      type: 'asset',
      normalBalance: 'debit',
      classification: 'current',
      currency: currency,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      description: 'First Abu Dhabi Bank (FAB) Current Account',
      parentId: parentId,
      module: 'property',
      openingBalance: 0
    }

    const filteredCOA = propChartAccounts.filter(a => {
      if (a.id === parentId || a.code === '1120') return true
      const isChild = a.parentId === parentId || a.parentId === '1120-prop' || (a.code && a.code.startsWith('1120') && a.code.length > 4)
      return !isChild
    })

    const finalCOA = [...filteredCOA, dibCoa, fabCoa]
    setPropChartAccounts(finalCOA)

    const defaultMappings: BankMapping[] = [
      {
        bankAccountId: 'pt-dib-current',
        accountId: 'acc-dib-current',
        accountCode: '112001',
        accountName: 'Dubai Islamic Bank'
      },
      {
        bankAccountId: 'pt-fab-current',
        accountId: 'acc-fab-current',
        accountCode: '112002',
        accountName: 'First Abu Dhabi Bank (FAB)'
      }
    ]

    setPropBankMappings(defaultMappings)
    invalidateBalanceCache()
    localStorage.setItem(migrationKey, 'true')
  }, [propChartAccounts, currency, setPropAccounts, setPropChartAccounts, setPropBankMappings])

  useEffect(() => {
    const needsFix = propAccounts.some(ba => !ba.chartAccountId)
    if (!needsFix) return
    let changed = false
    const updated = propAccounts.map(ba => {
      if (ba.chartAccountId) return ba
      const mapping = propBankMappings.find(m => m.bankAccountId === ba.id)
      if (mapping) {
        changed = true
        return { ...ba, chartAccountId: mapping.accountId }
      }
      if (ba.id === 'pt-dib-current') {
        const coa = propChartAccounts.find(a => a.code === '112001' || a.id === 'acc-dib-current')
        if (coa) {
          changed = true
          return { ...ba, chartAccountId: coa.id }
        }
      }
      if (ba.id === 'pt-fab-current') {
        const coa = propChartAccounts.find(a => a.code === '112002' || a.id === 'acc-fab-current')
        if (coa) {
          changed = true
          return { ...ba, chartAccountId: coa.id }
        }
      }
      return ba
    })
    if (changed) {
      setPropAccounts(updated)
      invalidateBalanceCache()
    }
  }, [propAccounts, propBankMappings, propChartAccounts, setPropAccounts])

  // DIB recreation: wipe all existing DIB data and recreate fresh
  useEffect(() => {
    const fixKey = 'insacc_dib_recreate_v1'
    if (localStorage.getItem(fixKey)) return

    const bank = propAccounts.find(a =>
      a.status === 'active' && (a.institution.toLowerCase().includes('dib') || a.id === 'pt-dib-current')
    )
    if (!bank) { localStorage.setItem(fixKey, 'true'); return }

    const bankId = bank.id
    const coaIds: string[] = []
    if (bank.chartAccountId) coaIds.push(bank.chartAccountId)
    propBankMappings.filter(m => m.bankAccountId === bankId).forEach(m => {
      if (!coaIds.includes(m.accountId)) coaIds.push(m.accountId)
    })
    // Also find CoA by the old canonical ID
    const oldCanonical = propChartAccounts.find(a => a.id === 'acc-dib-current')
    if (oldCanonical && !coaIds.includes(oldCanonical.id)) coaIds.push(oldCanonical.id)

    // Filter out all data referencing DIB
    const filteredPdc = pdcCheques.filter(c => c.bankAccountId !== bankId)
    if (filteredPdc.length !== pdcCheques.length) setPdcCheques(filteredPdc)

    const filteredTxn = propTransactions.filter(t => t.accountId !== bankId)
    if (filteredTxn.length !== propTransactions.length) setPropTransactions(filteredTxn)

    const filteredRecon = propBankReconciliations.filter(r => r.bankAccountId !== bankId)
    if (filteredRecon.length !== propBankReconciliations.length) setPropBankReconciliations(filteredRecon)

    const filteredSecDep = securityDeposits.filter(sd => !sd.transactions.some(tx => tx.bankAccountId === bankId))
    if (filteredSecDep.length !== securityDeposits.length) setSecurityDeposits(filteredSecDep)

    // For vouchers: remove any voucher that references a DIB CoA account
    const filteredVouchers = propVouchers.filter(v => {
      const hasDib = v.lines.some(l => coaIds.includes(l.accountId))
      return !hasDib
    })
    if (filteredVouchers.length !== propVouchers.length) setPropVouchers(filteredVouchers)

    // Remove DIB mapping
    const filteredMappings = propBankMappings.filter(m => m.bankAccountId !== bankId)
    if (filteredMappings.length !== propBankMappings.length) setPropBankMappings(filteredMappings)

    // Deactivate DIB CoA accounts
    const updatedCoa = propChartAccounts.map(a =>
      coaIds.includes(a.id) ? { ...a, isActive: false, updatedAt: new Date().toISOString() } : a
    )
    const coaChanged = updatedCoa.some((a, i) => a !== propChartAccounts[i])
    if (coaChanged) setPropChartAccounts(updatedCoa)

    // Remove DIB bank account
    const filteredAccounts = propAccounts.filter(a => a.id !== bankId)
    if (filteredAccounts.length !== propAccounts.length) setPropAccounts(filteredAccounts)

    // --- Recreate fresh DIB ---
    const now = new Date().toISOString()
    const baseCurrency = currency || 'AED'
    const parent = updatedCoa.find(a => a.code === '1120')
    const newCode = generateChildCode('1120', updatedCoa.filter(a => a.isActive))
    const newCoaId = `acct-${Date.now()}`
    const newBankId = `pt-${Date.now()}`

    const newCoa: Account = {
      id: newCoaId,
      code: newCode,
      name: 'Dubai Islamic Bank',
      type: 'asset',
      normalBalance: 'debit',
      classification: 'current',
      currency: baseCurrency,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      description: 'Dubai Islamic Bank Current Account',
      parentId: parent?.id || '1120',
      module: 'property',
      openingBalance: 0,
    }

    const newBank: PropAccount = {
      id: newBankId,
      institution: 'Dubai Islamic Bank',
      accountNumber: 'DIB-CURR-1234',
      currency: baseCurrency,
      openingBalance: 0,
      theme: 'emerald',
      icon: 'bank',
      status: 'active',
      chartAccountId: newCoaId,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      updatedBy: 'system',
    }

    const newMapping: BankMapping = {
      bankAccountId: newBankId,
      accountId: newCoaId,
      accountCode: newCode,
      accountName: 'Dubai Islamic Bank',
    }

    setPropChartAccounts(prev => [...prev, newCoa])
    setPropAccounts(prev => [...prev, newBank])
    setPropBankMappings(prev => [...prev, newMapping])
    invalidateBalanceCache()

    localStorage.setItem(fixKey, 'true')
  }, [propAccounts, propChartAccounts, propBankMappings, propVouchers, pdcCheques, propTransactions, propBankReconciliations, securityDeposits, currency])

  const recordAuditEvent = useCallback((event: AuditEvent) => {
    setAuditEvents(prev => [event, ...prev])
  }, [])

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
  }, [theme])

  const derivedInvestments = useMemo(
    () => syncAllInvestments(purchaseRecords, investments),
    [purchaseRecords, investments]
  )

  const masterDataValue: MasterDataState = useMemo(() => ({
    currencies: masterCurrencies,
    setCurrencies: setMasterCurrencies,
    taxCodes: masterTaxCodes,
    setTaxCodes: setMasterTaxCodes,
    paymentTerms: masterPaymentTerms,
    setPaymentTerms: setMasterPaymentTerms,
    vendors: masterVendors,
    setVendors: setMasterVendors,
    customers: masterCustomers,
    setCustomers: setMasterCustomers,
    assetTypes: masterAssetTypes,
    setAssetTypes: setMasterAssetTypes,
    fixedAssets: masterFixedAssets,
    setFixedAssets: setMasterFixedAssets,
  }), [
    masterCurrencies, masterTaxCodes, masterPaymentTerms,
    masterVendors, masterCustomers, masterAssetTypes, masterFixedAssets,
  ])

  const handleLoginSuccess = useCallback((userName: string) => {
    localStorage.setItem('loggedInUser', userName)
    setLoggedInUser(userName)
    setScreen('profiles')
  }, [])

  const handleProfileSelect = useCallback((profile: Profile) => {
    setSelectedProfile(profile)
    localStorage.setItem('loggedInUser', profile.name)
    setLoggedInUser(profile.name)
    setScreen('module')
  }, [])

  const handleModuleSelect = useCallback((mod: Module) => {
    setActiveModule(mod)
    setActivePage('dashboard')
    setScreen('dashboard')
  }, [])

  const handleBackToModule = useCallback(() => {
    setScreen('module')
  }, [])

  const handleGoBack = useCallback(() => {
    if (activePage === 'dashboard') {
      setScreen('module')
    } else {
      setActivePage('dashboard')
    }
  }, [activePage])

  const handleBackToProfiles = useCallback(() => {
    setScreen('profiles')
  }, [])

  const handleChangeProfile = useCallback(() => {
    setSelectedProfile(null)
    setScreen('profiles')
  }, [])

  const handleLogout = useCallback(() => {
    setSelectedProfile(null)
    setScreen('login')
  }, [])

  const handleDeleteAuditEvent = useCallback((eventId: string) => {
    setPropAuditEvents(prev => prev.filter(e => e.id !== eventId))
    setAuditEvents(prev => prev.filter(e => e.id !== eventId))
  }, [])

  const handleClearTransactions = useCallback(() => {
    const performClear = async () => {
      // Clean up dynamic asset sub-accounts that were auto-created for previous purchases
      let cleanedAccounts = accounts
      try {
        cleanedAccounts = accounts.filter(a => !a.description?.includes('Auto-created for purchase'))
        setAccounts(cleanedAccounts)
      } catch (err) {
        console.error('Error cleaning dynamic accounts:', err)
      }

      // 1. Clear Investment Module transaction/history states locally
      setVouchers([])
      setAuditEvents([])
      setPurchaseRecords([])
      setPurchases([])
      setTransactions([])
      setBankTransactions([])
      setBankReconciliations([])
      setStatement([])
      setBalance(0)
      setDocuments([])

      // 2. Clear Property Module transaction/history states locally
      setPropVouchers([])
      setPropAuditEvents([])
      setPdcCheques([])
      setSecurityDeposits([])
      setPropDocuments([])
      setPropTransactions([])
      setPropBankReconciliations([])

      invalidateBalanceCache()

      // 3. Sync cleared states to Supabase and wait for all to complete
      try {
        const enabledVal = localStorage.getItem('insacc_supabase_enabled')
        const enabled = enabledVal ? JSON.parse(enabledVal) === true : false
        
        const rawUrl = localStorage.getItem('insacc_supabase_url')
        const url = rawUrl ? JSON.parse(rawUrl) : ''
        
        const rawKey = localStorage.getItem('insacc_supabase_key')
        const anonKey = rawKey ? JSON.parse(rawKey) : ''
        
        if (enabled && url && anonKey) {

          const client = getSupabaseClient(url, anonKey)
          if (client) {
            await Promise.all([
              pushState(client, 'insacc_accounts', cleanedAccounts),
              pushState(client, 'insacc_vouchers', []),
              pushState(client, 'insacc_audit_events', []),
              pushState(client, 'insacc_purchases_ledger', []),
              pushState(client, 'insacc_purchases', []),
              pushState(client, 'insacc_transactions', []),
              pushState(client, 'insacc_bank_transactions', []),
              pushState(client, 'insacc_bank_reconciliations', []),
              pushState(client, 'insacc_statement', []),
              pushState(client, 'insacc_balance', 0),
              pushState(client, 'insacc_documents', []),
              pushState(client, 'insacc_prop_vouchers', []),
              pushState(client, 'insacc_prop_audit_events', []),
              pushState(client, 'insacc_pdc_cheques', []),
              pushState(client, 'insacc_security_deposits', []),
              pushState(client, 'insacc_prop_documents', []),
              pushState(client, 'insacc_prop_transactions', []),
              pushState(client, 'insacc_prop_bank_reconciliations', [])
            ])
          }
        }
      } catch (err) {
        console.error('Failed to sync cleared history to Supabase:', err)
      }

      // 4. Reload page to restart all read models and state machines cleanly
      window.location.reload()
    }

    performClear()
  }, [
    accounts, setAccounts, setVouchers, setAuditEvents, setPurchaseRecords, setPurchases, setTransactions,
    setBankTransactions, setBankReconciliations, setStatement, setBalance, setDocuments,
    setPropVouchers, setPropAuditEvents, setPropExpenses, setPropTenants, setPropLeases,
    setPdcCheques, setSecurityDeposits, setPropDocuments, setPropTransactions, setPropBankReconciliations,
    setMasterVendors, setPropVendors
  ])

  const handleResetAllData = useCallback(async () => {
    resetInvestments()
    resetTransactions()
    resetBankAccounts()
    resetBankTransactions()
    resetStatement()
    resetBalance()
    resetDocuments()
    resetLogs()
    resetPurchases()
    setPurchaseCategories(getDefaultCategories())
    setPurchaseRecords([])
    setInvUsers([])
    setIncomeCustomCategories([])
    setExpenseCustomCategories([])
    setAuditEvents([])
    setAccounts([])
    setVouchers([])
    setBankMappings([])
    setPropChartAccounts([])
    setPropVouchers([])
    setPropBankMappings([])
    setMainCategories([])
    setHierarchyProperties([])
    setIncomeCategories([])
    setCustomers([])
    setBankReconciliations([])
    setPropBankReconciliations([])
    setPropFiscalYears(getDefaultFiscalYears())
    setInvFiscalYears(getDefaultFiscalYears())
    
    // Wipe Supabase database before reloading so the old data isn't pulled back
    try {
      const enabledVal = localStorage.getItem('insacc_supabase_enabled')
      const enabled = enabledVal ? JSON.parse(enabledVal) === true : false
      
      const rawUrl = localStorage.getItem('insacc_supabase_url')
      const url = rawUrl ? JSON.parse(rawUrl) : ''
      
      const rawKey = localStorage.getItem('insacc_supabase_key')
      const anonKey = rawKey ? JSON.parse(rawKey) : ''
      
      if (enabled && url && anonKey) {

        const client = getSupabaseClient(url, anonKey)
        if (client) {
          // Delete all records except the status
          await client.from('app_sync_state').delete().neq('key', 'insacc_supabase_status')
        }
      }
    } catch (err) {
      console.error('Failed to clear Supabase data on reset:', err)
    }

    window.location.reload()
  }, [
    resetInvestments, resetTransactions, resetBankAccounts, resetBankTransactions,
    resetStatement, resetBalance, resetDocuments, resetLogs, resetPurchases,
    setPurchaseCategories, setPurchaseRecords, setInvUsers,
    setIncomeCustomCategories, setExpenseCustomCategories, setAuditEvents,
    setAccounts, setVouchers, setBankMappings, setPropChartAccounts,
    setPropVouchers, setPropBankMappings, setMainCategories,
    setHierarchyProperties, setIncomeCategories, setCustomers,
    setBankReconciliations, setPropBankReconciliations,
    setPropFiscalYears, setInvFiscalYears,
  ])



  const renderPageContent = useCallback(() => {
    if (activeModule === 'property') {
      return (
        <PropertyRouter
          activePage={activePage}
          onNavigate={setActivePage}
          currency={currency}
          dateFormat={dateFormat}
          language={language}
          supabaseUrl={supabaseUrl}
          setSupabaseUrl={setSupabaseUrl}
          supabaseKey={supabaseKey}
          setSupabaseKey={setSupabaseKey}
          supabaseEnabled={supabaseEnabled}
          setSupabaseEnabled={setSupabaseEnabled}
          onClearTransactions={handleClearTransactions}
          onResetAllData={handleResetAllData}
          onDeleteEvent={handleDeleteAuditEvent}
          loggedInUser={selectedProfile ? selectedProfile.name : loggedInUser}
          loginEntries={loginEntries}
          setLoginEntries={setLoginEntries}
          accounts={propChartAccounts}
          setAccounts={setPropChartAccounts}
          vouchers={propVouchers}
          setVouchers={setPropVouchers}
          bankMappings={propBankMappings}
          setBankMappings={setPropBankMappings}
          propAccounts={propAccounts}
          setPropAccounts={setPropAccounts}
          propTransactions={propTransactions}
          setPropTransactions={setPropTransactions}
          propProperties={propProperties}
          setPropProperties={setPropProperties}
          propUnits={propUnits}
          setPropUnits={setPropUnits}
          propTenants={propTenants}
          setPropTenants={setPropTenants}
          propLeases={propLeases}
          setPropLeases={setPropLeases}
          pdcCheques={pdcCheques}
          setPdcCheques={setPdcCheques}
          propDocuments={propDocuments}
          setPropDocuments={setPropDocuments}
          propAuditEvents={propAuditEvents}
          setPropAuditEvents={setPropAuditEvents}
          accountingEngine={propEngine}
          mainCategories={mainCategories}
          setMainCategories={setMainCategories}
          hierarchyProperties={hierarchyProperties}
          setHierarchyProperties={setHierarchyProperties}
          incomeCategories={incomeCategories}
          setIncomeCategories={setIncomeCategories}
          customers={customers}
          setCustomers={setCustomers}
          bankReconciliations={propBankReconciliations}
          setBankReconciliations={setPropBankReconciliations}
          securityDeposits={securityDeposits}
          setSecurityDeposits={setSecurityDeposits}
          depositMappings={depositMappings}
          setDepositMappings={setDepositMappings}
          propExpenses={propExpenses}
          setPropExpenses={setPropExpenses}
          propVendors={propVendors}
          setPropVendors={setPropVendors}
          propertyTransactionCategories={propertyTransactionCategories}
          setPropertyTransactionCategories={setPropertyTransactionCategories}
          fiscalYears={propFiscalYears}
          setFiscalYears={setPropFiscalYears}
        />
      )
    }
    return (
      <InvestmentRouter
        activePage={activePage}
        onNavigate={setActivePage}
        currency={currency}
        dateFormat={dateFormat}
        language={language}
        supabaseUrl={supabaseUrl}
        setSupabaseUrl={setSupabaseUrl}
        supabaseKey={supabaseKey}
        setSupabaseKey={setSupabaseKey}
        supabaseEnabled={supabaseEnabled}
        setSupabaseEnabled={setSupabaseEnabled}
        onClearTransactions={handleClearTransactions}
        onDeleteEvent={handleDeleteAuditEvent}
        loggedInUser={selectedProfile ? selectedProfile.name : loggedInUser}
        loginEntries={loginEntries}
        setLoginEntries={setLoginEntries}
        accounts={accounts}
        setAccounts={setAccounts}
        vouchers={vouchers}
        setVouchers={setVouchers}
        bankMappings={bankMappings}
        setBankMappings={setBankMappings}
        bankAccounts={bankAccounts}
        setBankAccounts={setBankAccounts}
        incomeCustomCategories={incomeCustomCategories}
        expenseCustomCategories={expenseCustomCategories}
        setIncomeCustomCategories={setIncomeCustomCategories}
        setExpenseCustomCategories={setExpenseCustomCategories}
        documents={documents}
        setDocuments={setDocuments}
        purchaseRecords={purchaseRecords}
        setPurchaseRecords={setPurchaseRecords}
        auditEvents={auditEvents}
        setAuditEvents={setAuditEvents}
        invUsers={invUsers}
        setInvUsers={setInvUsers}
        storedLogs={storedLogs}
        setStoredLogs={setStoredLogs}
        accountingEngine={invEngine}
        storedPassword={storedPassword}
        onSetStoredPassword={setStoredPassword}
        theme={theme}
        onThemeChange={setTheme}
        onResetAllData={handleResetAllData}
        recordAuditEvent={recordAuditEvent}
        bankReconciliations={bankReconciliations}
        setBankReconciliations={setBankReconciliations}
        investmentCategories={investmentCategories}
        setInvestmentCategories={setInvestmentCategories}
        investmentAssets={investmentAssets}
        setInvestmentAssets={setInvestmentAssets}
        fiscalYears={invFiscalYears}
        setFiscalYears={setInvFiscalYears}
      />
    )
  }, [
    activeModule, activePage, currency, dateFormat, language,
    propChartAccounts, setPropChartAccounts, propVouchers, setPropVouchers,
    propBankMappings, setPropBankMappings, propAccounts, setPropAccounts,
    propTransactions, setPropTransactions, propProperties, setPropProperties,
    propUnits, setPropUnits, propTenants, setPropTenants, propLeases,
    setPropLeases, pdcCheques, setPdcCheques, propDocuments, setPropDocuments,
    propAuditEvents, setPropAuditEvents, propEngine, invEngine, mainCategories,
    setMainCategories, hierarchyProperties, setHierarchyProperties,
    incomeCategories, setIncomeCategories, customers, setCustomers,
    propBankReconciliations, setPropBankReconciliations, securityDeposits,
    setSecurityDeposits, depositMappings, setDepositMappings, propExpenses,
    setPropExpenses, propertyTransactionCategories, setPropertyTransactionCategories,
    accounts, setAccounts, vouchers, setVouchers, bankMappings, setBankMappings,
    bankAccounts, setBankAccounts, incomeCustomCategories, expenseCustomCategories,
    setIncomeCustomCategories, setExpenseCustomCategories, documents, setDocuments,
    purchaseRecords, setPurchaseRecords, auditEvents, setAuditEvents,
    invUsers, setInvUsers, storedLogs, setStoredLogs, storedPassword,
    theme, handleResetAllData, recordAuditEvent, bankReconciliations,
    setBankReconciliations, investmentCategories, setInvestmentCategories,
    investmentAssets, setInvestmentAssets, propFiscalYears, setPropFiscalYears,
    invFiscalYears, setInvFiscalYears,
    supabaseUrl, setSupabaseUrl, supabaseKey, setSupabaseKey, supabaseEnabled, setSupabaseEnabled,
    loginEntries, setLoginEntries,
  ])

  if (screen === 'login') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Login
          onSuccess={handleLoginSuccess}
          storedPassword={storedPassword}
          loginEntries={loginEntries}
        />
      </Suspense>
    )
  }

  if (screen === 'profiles') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <ProfileSelection
          profiles={storedLoginProfiles}
          onSelect={handleProfileSelect}
          onBackToLogin={() => setScreen('login')}
        />
      </Suspense>
    )
  }

    if (screen === 'module') {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <ModuleSelection 
            onSelect={handleModuleSelect} 
            onBackToProfiles={() => setScreen('profiles')} 
            onBackToLogin={() => setScreen('login')}
          />
        </Suspense>
      )
    }

  if (screen === 'dashboard') {
    const renderPage = () => {
      return (
        <MasterDataProvider value={masterDataValue}>
          <SupabaseSyncManager />
          <SyncIndicator />
          {renderPageContent()}
        </MasterDataProvider>
      )
    }

    return (
      <div className="app-shell" data-module={activeModule}>
        <Suspense fallback={null}>
          <Sidebar
            activeModule={activeModule}
            activePage={activePage}
            onNavigate={(page) => setActivePage(page)}
            onLogout={handleLogout}
            onModuleChange={(mod) => { setActiveModule(mod); setActivePage('dashboard') }}
            theme={theme as 'light' | 'dark'}
            profileName={selectedProfile?.name || 'User'}
            profileRole={selectedProfile?.role || 'Admin'}
          />
        </Suspense>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px',
              height: 48,
              flexShrink: 0,
              background: 'var(--header-bg)',
              borderBottom: '1px solid var(--header-border)',
            }}
          >
            <button
              onClick={handleGoBack}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: 6,
                fontSize: 14,
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 500,
                color: '#5C6A86',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = activeModule === 'property' ? 'rgba(222,141,169,0.08)' : 'rgba(59,165,73,0.08)'
                e.currentTarget.style.color = activeModule === 'property' ? '#DE8DA9' : '#3BA549'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#5C6A86'
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              {activePage === 'dashboard' ? 'Back to Portfolios' : 'Back to Dashboard'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={undo}
                disabled={!undoAvailable}
                title="Undo last action"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: undoAvailable ? 'pointer' : 'not-allowed',
                  borderRadius: 6,
                  fontSize: 14,
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 500,
                  color: undoAvailable ? '#5C6A86' : '#CBD5E1',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => {
                  if (undoAvailable) {
                    e.currentTarget.style.background = '#EDF9F0'
                    e.currentTarget.style.color = '#3BA549'
                  }
                }}
                onMouseLeave={e => {
                  if (undoAvailable) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#5C6A86'
                  }
                }}
              >
                <Undo2 size={16} /> Undo
              </button>
              <button
                onClick={redo}
                disabled={!redoAvailable}
                title="Redo action"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: redoAvailable ? 'pointer' : 'not-allowed',
                  borderRadius: 6,
                  fontSize: 14,
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 500,
                  color: redoAvailable ? '#5C6A86' : '#CBD5E1',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => {
                  if (redoAvailable) {
                    e.currentTarget.style.background = '#EDF9F0'
                    e.currentTarget.style.color = '#3BA549'
                  }
                }}
                onMouseLeave={e => {
                  if (redoAvailable) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#5C6A86'
                  }
                }}
              >
                <Redo2 size={16} /> Redo
              </button>
              <button
                onClick={handleChangeProfile}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderRadius: 6,
                  fontSize: 14,
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 500,
                  color: '#5C6A86',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#EDF9F0'
                  e.currentTarget.style.color = '#3BA549'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#5C6A86'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Change Profile
              </button>
            </div>
          </div>
          <Suspense fallback={<LoadingFallback />}>
            <AnimatePresence mode="wait">
              <PageTransition pageKey={activePage + '-' + activeModule} module={activeModule}>
                {renderPage()}
              </PageTransition>
            </AnimatePresence>
          </Suspense>
        </div>
        {isUnloading && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            color: '#fff',
            fontFamily: "'Inter', sans-serif"
          }}>
            <div style={{
              width: 50,
              height: 50,
              border: '4px solid rgba(255, 255, 255, 0.3)',
              borderTop: '4px solid #fff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: 20
            }}></div>
            <style>
              {`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}
            </style>
            <h2 style={{ margin: 0, fontWeight: 600, fontSize: 24, letterSpacing: '-0.02em' }}>Syncing with Cloud</h2>
            <p style={{ marginTop: 8, color: 'rgba(255, 255, 255, 0.7)' }}>Please wait while your data is securely saved...</p>
          </div>
        )}
      </div>
    )
  }

  return null
}
