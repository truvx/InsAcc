# InsAcc ERP Changelog

## Sprint 16.1 — Architectural Cleanup (2026-07-02)

### Shared Date Utility
- Created `src/shared/utils/dateUtils.ts` with centralized `now()` function.
- Replaced 5 duplicate `now()` implementations across:
  - `accounting/accountingEngine.ts`
  - `accounting/periodService.ts`
  - `accounting/voucherService.ts`
  - `accounting/chartOfAccountsService.ts`
  - `services/masterDataService.ts`

### Customer Interface Rename
- Renamed `Customer` → `MasterCustomer` in `data/masterData.ts` to eliminate namespace collision with `propertyTypes.Customer`.
- Updated `services/masterDataService.ts` import and `createCustomer` return type.
- Simplified `App.tsx` import (removed alias, uses `MasterCustomer` directly).

### MasterDataContext
- Created `src/renderer/contexts/MasterDataContext.tsx`.
- Exposes: Currencies, TaxCodes, PaymentTerms, Vendors, MasterCustomers, AssetTypes, FixedAssets.
- Wired `MasterDataProvider` around dashboard rendering in `App.tsx`.
- Added `masterAssetTypes` and `masterFixedAssets` persisted state hooks.

### Documentation
- Created `docs/ARCHITECTURE_OVERVIEW.md`.
- Created `docs/CHANGELOG.md`.

---

## Sprint 16 — Enterprise Master Data Foundation (2026-07-01)

### Master Data Schemas
- Created `src/renderer/data/masterData.ts` with interfaces for Currency, TaxCode, PaymentTerm, Vendor, Customer, AssetType, FixedAsset.

### Master Data Services
- Created `src/renderer/services/masterDataService.ts` with default seed generators and factory functions.

### Type Cleanup
- Removed duplicate `Voucher` interface from `accounting/types.ts` (lines 104–123).

### Root State Integration
- Added master data `usePersistedState` hooks in `App.tsx`.
- Added startup migration `useEffect` to seed defaults.
