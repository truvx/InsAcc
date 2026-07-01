import React, { createContext, useContext } from 'react'
import type { Currency, TaxCode, PaymentTerm, Vendor, MasterCustomer, AssetType, FixedAsset } from '../data/masterData'

/**
 * MasterDataContext
 *
 * Provides centralized access to all enterprise master data entities.
 * Components can consume this context instead of receiving master data via prop drilling.
 *
 * Usage:
 *   const { currencies, taxCodes } = useMasterData()
 */

export interface MasterDataState {
  currencies: Currency[]
  setCurrencies: React.Dispatch<React.SetStateAction<Currency[]>>
  taxCodes: TaxCode[]
  setTaxCodes: React.Dispatch<React.SetStateAction<TaxCode[]>>
  paymentTerms: PaymentTerm[]
  setPaymentTerms: React.Dispatch<React.SetStateAction<PaymentTerm[]>>
  vendors: Vendor[]
  setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>
  customers: MasterCustomer[]
  setCustomers: React.Dispatch<React.SetStateAction<MasterCustomer[]>>
  assetTypes: AssetType[]
  setAssetTypes: React.Dispatch<React.SetStateAction<AssetType[]>>
  fixedAssets: FixedAsset[]
  setFixedAssets: React.Dispatch<React.SetStateAction<FixedAsset[]>>
}

const MasterDataContext = createContext<MasterDataState | null>(null)

export function MasterDataProvider({
  value,
  children,
}: {
  value: MasterDataState
  children: React.ReactNode
}) {
  return (
    <MasterDataContext.Provider value={value}>
      {children}
    </MasterDataContext.Provider>
  )
}

export function useMasterData(): MasterDataState {
  const ctx = useContext(MasterDataContext)
  if (!ctx) {
    throw new Error('useMasterData must be used within a MasterDataProvider')
  }
  return ctx
}

export default MasterDataContext
