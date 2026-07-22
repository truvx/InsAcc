---
title: "Volume 04: End-User Manual - Chapter 02: Investment Portfolio Management"
document_id: "INSACC-DOC-V04-CH02"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 04: InsAcc End-User Operations Manual
## Chapter 02: Investment Portfolio Management

> **Single Source of Truth Reference**: All investment data structures, valuation algorithms, and read-model calculations defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Investment Dashboard Overview (`InvestmentDashboard.tsx`)](#71-investment-dashboard-overview-investmentdashboardtsx)
  - [7.2 Asset Allocation & Growth Visualizations](#72-asset-allocation--growth-visualizations)
  - [7.3 Holdings Table & Asset Taxonomy (`InvestmentHoldings.tsx`)](#73-holdings-table--asset-taxonomy-investmentholdingstsx)
  - [7.4 Position Metrics & Unrealized Gain/Loss Calculations](#74-position-metrics--unrealized-gainloss-calculations)
  - [7.5 Adding and Editing Portfolio Positions](#75-adding-and-editing-portfolio-positions)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter provides operational procedures for managing wealth assets, tracking holdings, monitoring cost basis vs current market valuations, analyzing asset class allocations, and recording new investment positions in the InsAcc Investment Portfolio Module.

---

## 2. Scope

This specification covers:
- Investment Dashboard KPI cards and Recharts visual analytics (`InvestmentDashboard.tsx`).
- Asset allocation pie charts (`AssetAllocationPie.tsx`) and cash flow charts (`CashFlowChart.tsx`).
- Active holdings management across asset types (Gold, Silver, Stocks, Bonds, Mutual Funds, ETFs).
- Cost basis, market value, unrealized profit/loss, and portfolio weight calculations.
- Portfolio position CRUD workflows in `InvestmentHoldings.tsx`.

Out of Scope:
- Physical bullion purchase ledger lot tracking (covered in [Volume 04 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_03_Purchase_Ledger_Operations.md)).
- Double-entry voucher postings for dividends and sales (covered in [Volume 04 Chapter 07](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_07_Double_Entry_Voucher_Operations.md)).

---

## 3. Audience

This document is authored for:
- Wealth Managers and Private Portfolio Accountants
- Asset Operations Personnel
- Family Office Financial Technicians

---

## 4. Prerequisites

Before managing investment holdings:
1. Log in to InsAcc and select the **`Investor`** profile.
2. Select the **Investment Portfolio Module**.
3. Confirm base currency formatting settings ([Volume 03 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_03_System_Administrator_Guide/Chapter_01_Initial_Setup_and_Company_Configuration.md)).

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **UNREALIZED VS REALIZED GAIN DISCREPANCY**: Updating the `currentPrice` of an asset position updates **Unrealized Gain / Loss** metrics across dashboard charts and reports, but does NOT generate a double-entry general ledger voucher. Realized gains or losses are recognized ONLY when an asset sale voucher (`INVESTMENT_SALE`) is posted.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Memoized Projection Performance**: Portfolio valuation totals and percentage returns are projected dynamically using React `useMemo` hooks calling `investmentReadModels.ts`. This ensures sub-millisecond dashboard updates even when managing large portfolio collections.

---

## 7. Main Content

### 7.1 Investment Dashboard Overview (`InvestmentDashboard.tsx`)

The Investment Dashboard presents four real-time KPI summary cards:

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Total Portfolio  │  │ Active Asset     │  │ Monthly Net      │  │ YTD Portfolio    │
│  AED 1,250,000   │  │   12 Holdings    │  │  +AED 45,000     │  │  Return: +14.2%  │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

1. **Total Portfolio Value**: Sum of current market valuations across all active holdings ($\sum \text{quantity} \times \text{currentPrice}$).
2. **Active Asset Holdings**: Total number of distinct investment positions in `insacc_investments`.
3. **Monthly Net Income**: Total dividend/interest income received minus investment management fees in the active month.
4. **YTD Portfolio Return %**: Aggregate percentage return across all portfolio holdings.

---

### 7.2 Asset Allocation & Growth Visualizations

```
Asset Allocation Donut Chart               Investment Growth Area Chart
 ┌─────────────────────────┐               ┌─────────────────────────┐
 │   ■ Gold (40%)          │               │     /─── Market Value │
 │   ■ Stocks (35%)        │               │    /                  │
 │   ■ Real Estate (25%)   │               │   /─── Cost Basis     │
 └─────────────────────────┘               └─────────────────────────┘
```

#### Visualization Components:
1. **Asset Allocation Donut Chart (`AssetAllocationPie.tsx`)**: Displays portfolio distribution percentage broken down by asset class (Gold, Silver, Stocks, Bonds, Mutual Funds, ETFs).
2. **Investment Growth Area Chart (`InvestmentGrowthChart.tsx`)**: Plots trailing historical market value trends against original cost basis baselines.
3. **Cash Flow Bar Chart (`CashFlowChart.tsx`)**: Renders monthly investment income deposits vs operational costs.

---

### 7.3 Holdings Table & Asset Taxonomy (`InvestmentHoldings.tsx`)

The **Holdings** view catalog all asset positions persisted in `insacc_investments`:

```typescript
export interface Investment {
  id: string              // Unique position identifier (e.g. "inv-1719500000000")
  assetName: string       // Asset description (e.g. "24K Gold Bar 1kg")
  assetType: string       // "Gold" | "Silver" | "Stocks" | "Bonds" | "Mutual Funds" | "ETFs"
  quantity: number        // Quantity owned
  purchaseValue: number   // Total cost basis (AED)
  currentPrice: number    // Market price per unit (AED)
  buyer?: string          // Custodian / Purchasing entity
  notes?: string          // Operational memo
}
```

---

### 7.4 Position Metrics & Unrealized Gain/Loss Calculations

For each position line in the Holdings table, the system projects metrics in real time:

#### Valuation Formulas:
1. **Position Cost Basis**: 
   $$\text{Cost Basis} = \text{purchaseValue}$$
2. **Current Position Market Value**: 
   $$\text{Market Value} = \text{quantity} \times \text{currentPrice}$$
3. **Unrealized Gain / Loss (AED)**: 
   $$\text{Unrealized Profit} = \text{Market Value} - \text{Cost Basis}$$
4. **Return Percentage (%)**: 
   $$\text{Return \%} = \left( \frac{\text{Market Value} - \text{Cost Basis}}{\text{Cost Basis}} \right) \times 100$$
5. **Portfolio Weight (%)**: 
   $$\text{Portfolio Weight \%} = \left( \frac{\text{Position Market Value}}{\sum \text{Total Portfolio Market Value}} \right) \times 100$$

---

### 7.5 Adding and Editing Portfolio Positions

```
Open Holdings View ──► Click [+ Add Investment] ──► Fill Modal Form ──► Save Position
```

1. Navigate to **Investments** $\rightarrow$ click **+ Add Investment**.
2. Complete position fields in the modal dialog:
   - **Asset Name**: (e.g., `Apple Inc. (AAPL)`).
   - **Asset Type**: Select `Stocks`, `Gold`, `Bonds`, etc.
   - **Quantity**: Units owned (e.g., `100`).
   - **Total Purchase Value**: Total historical cost basis (e.g., `65,000 AED`).
   - **Current Price / Unit**: Active market valuation (e.g., `720 AED`).
3. Click **Save Investment**.
4. The system serializes updated state to `insacc_investments` and updates dashboard KPI cards immediately.

---

## 8. Summary

The Investment Portfolio Module provides wealth managers with real-time tracking of asset positions, asset allocations, and return percentages. By dynamically projecting market valuations against cost basis baselines, InsAcc delivers instant visibility into overall portfolio performance.

---

## 9. Chapter Appendix

### Standard Asset Class Taxonomy Dictionary

| Asset Class Code | Category Name | Description & Typical Instruments |
|---|---|---|
| `Gold` | Physical Gold | Bullion bars (1kg, 100g), gold coins, vaulted physical metal |
| `Silver` | Physical Silver | Silver bullion bars, industrial silver lots, coins |
| `Stocks` | Equities | Publicly traded common stock shares, equity securities |
| `Bonds` | Fixed Income | Government treasury bonds, corporate sukuk, fixed income |
| `Mutual Funds` | Managed Funds | Open-ended mutual funds, institutional pool accounts |
| `ETFs` | Exchange Traded Funds | Index tracking ETFs, sector commodity funds |

---

## 10. Glossary

- **Cost Basis**: The original value of an asset for tax and accounting purposes, usually equal to the purchase price plus fees.
- **Unrealized Gain/Loss**: An increase or decrease in the paper value of an asset holding that has not yet been sold for cash.
- **YTD (Year-to-Date)**: The period starting from the beginning of the current calendar or fiscal year up to the present date.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- Purchase Ledger Operations: [Volume 04 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_03_Purchase_Ledger_Operations.md)
- Financial Reports: [Volume 04 Chapter 08](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_08_Financial_Reporting_and_Exports.md)
- Accounting Engine Specs: [Volume 06 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_02_Double_Entry_Accounting_Engine.md)
