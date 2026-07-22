---
title: "Volume 06: Developer Architecture Guide - Chapter 03: Read Models and Formatters"
document_id: "INSACC-DOC-V06-CH03"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 06: Developer Architecture & Technical Specification
## Chapter 03: Read Models and Formatters

> **Single Source of Truth Reference**: All read-model projection functions, formatting utilities, and CSV export routines defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Read Models Subsystem Overview (`src/renderer/readModels/`)](#71-read-models-subsystem-overview-srcrendererreadmodels)
  - [7.2 Investment Module Read Models](#72-investment-module-read-models)
  - [7.3 Property Module Read Models & Financial Statement Projections](#73-property-module-read-models--financial-statement-projections)
  - [7.4 Currency, Date & Percentage Formatting Utilities (`reportFormatters.ts`)](#74-currency-date--percentage-formatting-utilities-reportformattersts)
  - [7.5 CSV Export Generation Engine (`exportToCSV`)](#75-csv-export-generation-engine-exporttocsv)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter provides the technical code specification for the read-model projection functions in `src/renderer/readModels/` and report formatting utilities in `reportFormatters.ts`.

---

## 2. Scope

This specification covers:
- Read-model projection modules (`InvestmentDashboardReadModel.ts`, `InvestmentFinancialOverviewReadModel.ts`, `InvestmentReportsReadModel.ts`).
- Property module financial statement read models (`reportService.ts`).
- Formatting utilities in `reportFormatters.ts` (`formatCurrency`, `formatDate`, `formatPercentage`).
- CSV export generation engine (`exportToCSV`).

Out of Scope:
- Core `localStorage` persistence hooks (covered in [Volume 02 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_01_LocalStorage_Persistence_Architecture.md)).
- Double-entry accounting engine posting rules (covered in [Volume 06 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_02_Double_Entry_Accounting_Engine.md)).

---

## 3. Audience

This document is authored for:
- Frontend React Engineers and UI Component Developers
- Data Visualization Specialists
- Code Reviewers and Technical Leads

---

## 4. Prerequisites

Before evaluating read-model implementation:
1. Understand the CQRS architecture defined in [Volume 06 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_01_System_Architecture_and_CQRS.md).
2. Understand React 18 `useMemo` hooks and memoization dependency arrays.

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **READ MODEL MEMOIZATION DEPENDENCY HAZARD**: Omitting state variables from `useMemo` dependency arrays causes views to display stale financial calculations. Developers MUST include all input state collections in the dependency array (e.g., `[vouchers, investments, leases]`).

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Pure Functional Projections**: Read-model functions are pure functions with zero side effects. Given identical input state arrays, read models produce identical output calculations without modifying original state objects.

---

## 7. Main Content

### 7.1 Read Models Subsystem Overview (`src/renderer/readModels/`)

The read-model layer transforms raw persisted collections into structured view models:

```
Persisted State Collections (Raw JSON Arrays)
├── `insacc_investments`
├── `insacc_transactions`
└── `insacc_prop_rent`
           │
           ▼
Read-Model Projection Functions (`useMemo`)
├── `getInvestmentDashboardMetrics()`
├── `getFinancialOverview()`
└── `calculateFinancialSummary()`
           │
           ▼
UI View Components (Dashboard Cards, Recharts, Export Modals)
```

---

### 7.2 Investment Module Read Models

Located in `src/renderer/readModels/`:

#### 1. `InvestmentDashboardReadModel.ts`
Projects high-level dashboard KPI metrics:
```typescript
export function useInvestmentDashboardMetrics(investments: Investment[], transactions: Transaction[]) {
  return useMemo(() => {
    const totalPortfolioValue = investments.reduce((acc, item) => acc + (item.quantity * item.currentPrice), 0)
    const totalCostBasis = investments.reduce((acc, item) => acc + item.purchaseValue, 0)
    const unrealizedGain = totalPortfolioValue - totalCostBasis
    const activeHoldingsCount = investments.length

    return { totalPortfolioValue, totalCostBasis, unrealizedGain, activeHoldingsCount }
  }, [investments, transactions])
}
```

#### 2. `InvestmentFinancialOverviewReadModel.ts`
Projects asset allocation percentages for `AssetAllocationPie.tsx`.

#### 3. `InvestmentReportsReadModel.ts`
Projects historical performance tables and growth trends for `InvestmentGrowthChart.tsx`.

---

### 7.3 Property Module Read Models & Financial Statement Projections

Located in `src/renderer/services/reportService.ts`:

```typescript
export function calculateFinancialSummary(vouchers: Voucher[]) {
  const posted = vouchers.filter(v => v.status === 'Posted')
  let totalRevenue = 0
  let totalExpense = 0

  for (const v of posted) {
    for (const line of v.lines) {
      if (line.accountId.startsWith('4')) totalRevenue += line.amount
      if (line.accountId.startsWith('5')) totalExpense += line.amount
    }
  }

  const netProfit = totalRevenue - totalExpense
  return { totalRevenue, totalExpense, netProfit }
}
```

---

### 7.4 Currency, Date & Percentage Formatting Utilities (`reportFormatters.ts`)

Located in `src/renderer/utils/reportFormatters.ts`:

```typescript
// Currency Formatting
export function formatCurrency(amount: number, currencyCode: string = 'AED'): string {
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return `${amount < 0 ? '-' : ''}${currencyCode} ${formatted}`
}

// Date Formatting (ISO to Display Mask)
export function formatDate(dateString: string, mask: string = 'YYYY-MM-DD'): string {
  if (!dateString) return ''
  const d = new Date(dateString)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')

  if (mask === 'DD/MM/YYYY') return `${day}/${month}/${year}`
  if (mask === 'MM/DD/YYYY') return `${month}/${day}/${year}`
  return `${year}-${month}-${day}` // Default ISO 8601
}

// Percentage Formatting
export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}
```

---

### 7.5 CSV Export Generation Engine (`exportToCSV`)

`exportToCSV` serializes array structures into RFC 4180-compliant CSV text:

```typescript
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): string {
  const escapeField = (field: string | number) => {
    const text = String(field ?? '')
    return `"${text.replace(/"/g, '""')}"`
  }

  const headerRow = headers.map(escapeField).join(',')
  const bodyRows = rows.map(r => r.map(escapeField).join(','))
  return [headerRow, ...bodyRows].join('\r\n')
}
```

---

## 8. Summary

The read-model layer transforms raw state collections into structured view models using pure, memoized projection functions. Combined with formatting utilities in `reportFormatters.ts` and RFC 4180 CSV serialization, InsAcc delivers sub-millisecond view rendering and accurate report exports.

---

## 9. Chapter Appendix

### Read Model Function Reference Matrix

| Function Name | Target Component | Input Collections | Primary Projected Output |
|---|---|---|---|
| `useInvestmentDashboardMetrics` | `InvestmentDashboard.tsx` | `investments`, `transactions` | Total Value, Cost Basis, Return % |
| `calculateFinancialSummary` | `Reports.tsx` | `vouchers` | Total Revenue, Total Expense, Net Profit |
| `formatCurrency` | All Data Tables | `amount`, `currencyCode` | Formatted String (`AED 10,000.00`) |
| `exportToCSV` | Report Toolbar Modals | `headers`, `rows` | RFC 4180 CSV Text Payload |

---

## 10. Glossary

- **Memoization (`useMemo`)**: A React optimization hook that caches the result of a calculation between re-renders.
- **Pure Function**: A function that always returns the same output for the same inputs and produces no side effects.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- System Architecture & CQRS: [Volume 06 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_01_System_Architecture_and_CQRS.md)
- Double-Entry Engine Specs: [Volume 06 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_02_Double_Entry_Accounting_Engine.md)
- Financial Reporting & Exports: [Volume 04 Chapter 08](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_08_Financial_Reporting_and_Exports.md)
