---
title: "Volume 06: Developer Architecture Guide - Chapter 03: Read Model Projection Service"
document_id: "INSACC-DOC-V06-CH03"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 06: InsAcc Developer Architecture Guide
## Chapter 03: Read Model Projection Service

> **Reference Specification**: Read-model projection logic and formatting layers strictly conform to [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

---

### 3.1 Overview

Read models compute dynamic UI projections, financial statement views, and portfolio performance metrics from raw domain collections. To ensure high rendering performance, read services are pure functions operating on in-memory collections.

This chapter details the read projection layer, memoization strategies, and strict separation between numeric calculation and string formatting.

---

### 3.2 Read Architecture & Formatting Layer Separation

```
┌────────────────────────────────────────────────────────────┐
│                    Reports.tsx (UI)                         │
│  useMemo → reportService (raw numbers)                     │
│  useMemo → reportFormatters (formatted strings)            │
│  Pure presentation — no calculations, no formatting         │
├────────────────────────────────────────────────────────────┤
│              reportFormatters (formatting)                  │
│  formatCurrency | formatCompactCurrency                     │
│  formatPercentage | formatCompactNumber                     │
│  formatTrend | formatMonth | formatDateRange                │
│  Pure functions — no React, no localStorage, no calculations│
├────────────────────────────────────────────────────────────┤
│              reportService (calculations)                   │
│  18 pure functions — raw numbers only                       │
│  No formatting, no React, no localStorage                   │
├────────────────────────────────────────────────────────────┤
│              bankingService | data types                    │
│  deriveBalance() | Investment | Transaction | BankAccount    │
└────────────────────────────────────────────────────────────┘
```

#### Strict Separation Rules:
1. **`reportService.ts`**: Contains 18 calculation functions. Operates strictly on numeric inputs. Returns raw numbers or typed objects. Zero React or formatting imports.
2. **`reportFormatters.ts`**: Contains 8 pure string formatting functions (`formatCurrency`, `formatPercentage`, `formatMonth`). Operates at UI render time.
3. **`investmentReadModels.ts`**: Computes portfolio cost basis, market value, and asset allocation breakdown.

---

### 3.3 Example Projection Implementation

```typescript
// reportService.ts — Pure Calculation
export function calculateNetWorth(investments: Investment[], bankAccounts: BankAccount[], bankTransactions: BankTransaction[]): number {
  const totalInvestments = investments.reduce((sum, inv) => sum + (inv.quantity * inv.currentPrice), 0)
  const totalCash = bankAccounts.reduce((sum, account) => sum + deriveAccountBalance(account.id, bankTransactions, account.openingBalance), 0)
  return totalInvestments + totalCash
}

// reportFormatters.ts — Pure String Formatting
export function formatCurrency(value: number, currency: string = 'AED'): string {
  const isNegative = value < 0
  const absVal = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${isNegative ? '-' : ''}${currency} ${absVal}`
}
```

---

*Next Chapter: [Chapter 04: Design System and Styling Tokens](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_04_Design_System_and_Styling_Tokens.md)*
