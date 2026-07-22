---
title: "Volume 04: End-User Manual - Chapter 03: Purchase Ledger Operations"
document_id: "INSACC-DOC-V04-CH03"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 04: InsAcc End-User Operations Manual
## Chapter 03: Purchase Ledger Operations

> **Single Source of Truth Reference**: All purchase ledger models, cost averaging formulas, and item statistics defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

---

## Revision History

| Version | Release Date | Primary Author | Summary of Changes | Approved By |
|---|---|---|---|---|
| 1.0.0 | 2026-07-22 | Lead Enterprise Documentation Architect | Initial publication-grade enterprise release | Chief Architecture Review Board |

---

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Scope](#2-scope)
- [3. Audience](#3-audience)
- [4. Prerequisites](#4-prerequisites)
- [5. Warnings & Operational Hazards](#5-warnings--operational-hazards)
- [6. Notes & Architecture Context](#6-notes--architecture-context)
- [7. Main Content](#7-main-content)
  - [7.1 Purchase Ledger Rationale & Architecture (`PurchaseLedger.tsx`)](#71-purchase-ledger-rationale--architecture-purchaseledgertsx)
  - [7.2 The `PurchaseRecord` Interface & Category Taxonomy](#72-the-purchaserecord-interface--category-taxonomy)
  - [7.3 Recording Individual Purchase Transactions](#73-recording-individual-purchase-transactions)
  - [7.4 Item Cost Averaging Engine (`computeAverages()`)](#74-item-cost-averaging-engine-computeaverages)
  - [7.5 Weighted Average Unit Price vs Simple Average Comparison](#75-weighted-average-unit-price-vs-simple-average-comparison)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter provides operational procedures for recording physical asset acquisitions, managing purchase ledger categories, and computing weighted average unit cost metrics in the InsAcc Purchase Ledger Module.

---

## 2. Scope

This specification covers:
- Purchase ledger architecture in `PurchaseLedger.tsx` and `purchaseLedgerService.ts`.
- The `PurchaseRecord` TypeScript interface specification.
- Recording purchase lots (date, quantity, unit price, buyer, notes).
- Item cost averaging calculation engine (`computeAverages()` in `purchaseService.ts`).
- Weighted average cost vs simple average mathematical comparison.

Out of Scope:
- General investment portfolio holdings overview (covered in [Volume 04 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_02_Investment_Portfolio_Management.md)).
- Double-entry payment vouchers for purchase settlements (covered in [Volume 04 Chapter 07](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_07_Double_Entry_Voucher_Operations.md)).

---

## 3. Audience

This document is authored for:
- Bullion & Precious Metals Procurement Officers
- Inventory Accounting Technicians
- Asset Operations Personnel
- Internal Financial Auditors

---

## 4. Prerequisites

Before recording purchase transactions:
1. Log in to InsAcc and select the **`Investor`** profile.
2. Ensure purchase asset categories (e.g., `Gold`, `Silver`, `Commodities`) have been established in `insacc_purchase_categories`.

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **WEIGHTED COST BASIS ACCURACY**: When recording purchase lots, entering an incorrect `quantity` or `unitPrice` corrupts the calculated **Weighted Average Unit Price** across all historical cost summaries. Users MUST verify invoice values prior to saving purchase entries.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Consolidated Service Function**: The `computeAverages()` cost calculation function is centralized in `src/renderer/services/purchaseService.ts` and shared across both `Dashboard.tsx` and `PurchaseLedger.tsx` to eliminate code duplication.

---

## 7. Main Content

### 7.1 Purchase Ledger Rationale & Architecture (`PurchaseLedger.tsx`)

The Purchase Ledger acts as a granular transaction log for physical asset lot acquisitions (e.g., bullion bars, coin lots, silver bullion, physical commodities). While the Holdings view tracks cumulative position state, the Purchase Ledger records every individual purchase lot over time.

---

### 7.2 The `PurchaseRecord` Interface & Category Taxonomy

Purchase lot transactions are structured according to the `PurchaseRecord` interface:

```typescript
export interface PurchaseRecord {
  id: string              // Unique transaction identifier (e.g. "PL-1719500000000")
  purchaseDate: string    // ISO date string (YYYY-MM-DD)
  assetType: string       // Asset category (e.g. "Gold", "Silver")
  assetName: string       // Item description (e.g. "24K Gold Bar 100g")
  quantity: number        // Quantity of units purchased
  unitPrice: number       // Unit purchase price (AED)
  totalValue: number      // Derived: quantity * unitPrice (AED)
  buyer?: string          // Custodian / Purchasing entity
  notes?: string          // Operational memo
}
```

---

### 7.3 Recording Individual Purchase Transactions

```
Open Purchase Ledger ──► Select Category & Item ──► Fill Purchase Form ──► Save Lot
```

1. Navigate to **Purchase Ledger**.
2. Select **Category** (e.g., `Gold`) and **Item Name** (e.g., `24K Gold Bar 100g`).
3. Under **Add Purchase Lot**:
   - **Date**: Select transaction economic date (e.g., `2026-06-15`).
   - **Quantity**: Enter units acquired (e.g., `5`).
   - **Unit Price**: Enter unit price (e.g., `28,500 AED`).
4. The system calculates **Total Value** (`142,500 AED`).
5. Click **Record Purchase**. The purchase lot is serialized to `insacc_purchases` and updates item cost summary cards.

---

### 7.4 Item Cost Averaging Engine (`computeAverages()`)

When multiple purchase lots exist for an item, InsAcc computes aggregate metrics via `computeAverages()`:

```typescript
export interface ItemAverages {
  itemId: string
  itemName: string
  categoryName: string
  purchaseCount: number
  totalQuantity: number
  totalValue: number
  avgUnitPrice: number
  avgValue: number
  avgQuantity: number
}
```

#### Cost Averaging Formulas:
1. **Total Units Acquired**: 
   $$\text{Total Qty} = \sum_{i=1}^{n} \text{quantity}_i$$
2. **Total Cost Basis**: 
   $$\text{Total Value} = \sum_{i=1}^{n} (\text{quantity}_i \times \text{unitPrice}_i)$$
3. **Weighted Average Unit Price**: 
   $$\text{Weighted Avg Unit Price} = \frac{\text{Total Value}}{\text{Total Qty}}$$
4. **Average Lot Size**: 
   $$\text{Avg Lot Size} = \frac{\text{Total Qty}}{n}$$

---

### 7.5 Weighted Average Unit Price vs Simple Average Comparison

InsAcc uses **Weighted Average Costing** rather than Simple Average to ensure financial precision:

#### Scenario Example:
- Lot 1: 10 units @ AED 100/unit (Total = AED 1,000)
- Lot 2: 90 units @ AED 200/unit (Total = AED 18,000)
- **Total Quantity** = 100 units | **Total Cost** = AED 19,000

#### Mathematical Comparison:
- **Simple Average**: $\frac{100 + 200}{2} = \text{AED 150.00 / unit}$ (Incorrect Valuation: $100 \times 150 = \text{AED 15,000}$)
- **Weighted Average (InsAcc Rule)**: $\frac{19,000}{100} = \text{AED 190.00 / unit}$ (Correct Valuation: $100 \times 190 = \text{AED 19,000}$)

---

## 8. Summary

The Purchase Ledger Module provides granular lot tracking and accurate weighted average cost calculations for physical asset acquisitions. By relying on `computeAverages()` to calculate unit price baselines, InsAcc eliminates valuation errors inherent in simple averaging methods.

---

## 9. Chapter Appendix

### Sample Item Cost Summary Matrix

| Item Description | Lot Count | Total Qty | Total Cost Basis | Weighted Avg Unit Price |
|---|---|---|---|---|
| 24K Gold Bar 1kg | 3 | 5 kg | AED 1,425,000.00 | AED 285,000.00 / kg |
| 24K Gold Bar 100g | 8 | 400 g | AED 114,000.00 | AED 285.00 / g |
| Silver Bullion 100oz | 4 | 400 oz | AED 44,000.00 | AED 110.00 / oz |

---

## 10. Glossary

- **Lot**: A distinct quantity of a commodity or security specified in a single purchase transaction.
- **Weighted Average Costing**: An inventory/asset valuation method that calculates the average cost of items based on total expenditure divided by total units purchased.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- Investment Portfolio Management: [Volume 04 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_02_Investment_Portfolio_Management.md)
- Double-Entry Voucher Operations: [Volume 04 Chapter 07](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_07_Double_Entry_Voucher_Operations.md)
