# Currency Display Standardization Guide

**Date**: 2026-07-06  
**Purpose**: Ensure consistent currency typography across all InsAcc components

---

## Overview

All monetary values in InsAcc now use a standardized global font, size, weight, and formatting. This ensures visual consistency across dashboards, reports, vouchers, and all other views.

## Global Standard

**Format**: `AED 1,234.56`

- Currency code followed by single space
- Comma thousand separators
- Always 2 decimal places
- No alternative formats (د.إ, AED:, etc.)

## Typography Standard

All currency amounts use consistent typography defined in `/src/renderer/styles/theme.css`:

```css
--currency-font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--currency-font-size: 15px;
--currency-font-weight: 600;
--currency-letter-spacing: -0.01em;
--currency-line-height: 1.4;
--currency-color: var(--text-primary);
```

## Implementation

### Using CurrencyText Component (Recommended)

The `CurrencyText` component automatically applies the global currency style:

```tsx
import { CurrencyText } from './components/design/DesignSystem'

// Basic usage
<CurrencyText value={1234.56} currency="AED" />

// With size variant
<CurrencyText value={1234.56} size="lg" />
<CurrencyText value={1234.56} size="sm" />

// With color variant
<CurrencyText value={profit} variant="positive" />
<CurrencyText value={loss} variant="negative" />
<CurrencyText value={total} variant="primary" />

// With custom className (additional styling)
<CurrencyText value={1234.56} className="my-custom-class" />
```

### Size Variants

- `xs`: 12px, weight 600
- `sm`: 13px, weight 600
- `md`: 15px, weight 600 (default)
- `lg`: 18px, weight 700
- `xl`: 24px, weight 700
- `2xl`: 30px, weight 700

### Color Variants

- `default`: Uses `--text-primary`
- `positive`: Green color for gains/profits
- `negative`: Red color for losses/expenses
- `primary`: Module accent color
- `muted`: Secondary text color

### Using formatCurrency Function

For cases where you need the formatted string directly:

```tsx
import { formatCurrency } from '../utils/reportFormatters'

const formattedAmount = formatCurrency(1234.56, 'AED')
// Returns: "AED 1,234.56"
```

## Migration Pattern

### ❌ OLD (Inconsistent)

```tsx
// Inline formatting with toLocaleString
<span>{currency} {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>

// Inline with toFixed
<span>AED {amount.toFixed(2)}</span>

// With custom inline styles
<span style={{ fontWeight: 600 }}>{currency} {amount.toLocaleString()}</span>

// Various font weights
<div style={{ fontWeight: 700 }}>{currency} {amount}</div>
<div style={{ fontWeight: 500 }}>{currency} {amount}</div>
```

### ✅ NEW (Standardized)

```tsx
// Use CurrencyText component
<CurrencyText value={amount} currency={currency} />

// With size variant for emphasis
<CurrencyText value={totalAmount} size="xl" />

// With appropriate color variant
<CurrencyText value={profit} variant="positive" />
```

## Component Updates Required

### High Priority (User-facing)

1. **Dashboards**
   - InvestmentDashboard.tsx
   - PropertyDashboard.tsx
   - All KPI cards

2. **Financial Statements**
   - InvestmentTrialBalance.tsx
   - InvestmentBalanceSheet.tsx
   - InvestmentProfitLoss.tsx
   - PropertyTrialBalance.tsx
   - PropertyBalanceSheet.tsx
   - PropertyProfitLoss.tsx

3. **Vouchers**
   - InvestmentReceiptVoucher.tsx
   - InvestmentPaymentVoucher.tsx
   - InvestmentJournalVoucher.tsx
   - PropertyReceiptVoucher.tsx
   - PropertyPaymentVoucher.tsx
   - PropertyJournalVoucher.tsx

4. **Reports**
   - InvestmentReports.tsx
   - PropertyReports.tsx

### Medium Priority

5. **Holdings & Transactions**
   - InvestmentHoldings.tsx
   - PropertyExpenses.tsx
   - PropertyDepositManager.tsx
   - PropertyPdcManager.tsx

6. **Bank Management**
   - InvestmentBankAccounts.tsx
   - PropertyBankAccounts.tsx
   - BankReconciliationDashboard.tsx

### Low Priority

7. **Modals & Dialogs**
   - All modal components displaying currency
   - Export preview components
   - Print preview components

## Search & Replace Pattern

Use these patterns to find inconsistent currency formatting:

```regex
# Find inline toLocaleString with currency
{currency}\s*\{.*\.toLocaleString

# Find inline toFixed with currency
AED\s*\{.*\.toFixed\(2\)

# Find fontWeight with currency display
fontWeight.*\d+.*currency

# Find hardcoded AED with inline formatting
AED\s*\$\{
```

## CSS Classes Available

For edge cases where you can't use the component:

```css
/* Base class (applies all currency typography) */
.currency-amount

/* Size modifiers */
.currency-amount-xs
.currency-amount-sm
.currency-amount-md  /* default */
.currency-amount-lg
.currency-amount-xl
.currency-amount-2xl

/* Color modifiers */
.currency-amount-positive
.currency-amount-negative
.currency-amount-primary
.currency-amount-muted
```

## Examples

### Dashboard KPI Card

```tsx
// Before
<div className="kpi-value">
  {currency} {totalWealth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
</div>

// After
<div className="kpi-value">
  <CurrencyText value={totalWealth} currency={currency} size="2xl" />
</div>
```

### Table Cell

```tsx
// Before
<td style={{ fontWeight: 600, textAlign: 'right' }}>
  {currency} {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
</td>

// After
<td style={{ textAlign: 'right' }}>
  <CurrencyText value={row.amount} currency={currency} />
</td>
```

### Positive/Negative Values

```tsx
// Before
<span style={{ color: profit >= 0 ? '#22C55E' : '#EF4444', fontWeight: 600 }}>
  {profit >= 0 ? '+' : ''}{currency} {Math.abs(profit).toLocaleString(...)}
</span>

// After
<CurrencyText 
  value={profit} 
  currency={currency} 
  variant={profit >= 0 ? 'positive' : 'negative'} 
/>
```

## Verification Checklist

- [ ] All dashboard KPIs use CurrencyText
- [ ] All financial statements use CurrencyText
- [ ] All voucher forms use CurrencyText
- [ ] All report tables use CurrencyText
- [ ] All charts display consistent currency
- [ ] All modals display consistent currency
- [ ] Export previews use standard formatting
- [ ] Print previews use standard formatting
- [ ] No inline `toLocaleString` for currency
- [ ] No inline `toFixed(2)` for currency
- [ ] No hardcoded font-weight for currency
- [ ] No inconsistent spacing (AED1234 vs AED 1234)

## Testing

After migration, verify:

1. Open each major screen (Dashboard, Reports, Vouchers, etc.)
2. Check that all currency amounts look identical in style
3. Verify no bold vs semi-bold inconsistencies
4. Check spacing between currency code and number
5. Ensure decimal places always show (e.g., .00 not missing)

## Notes

- The `formatCurrency` function in `utils/reportFormatters.ts` is the single source of truth for formatting logic
- The `CurrencyText` component wraps this function with consistent styling
- All currency amounts should have `font-variant-numeric: tabular-nums` for proper alignment in tables
- Never use inline styles for currency typography; always use the component or CSS classes

---

**Questions?** Refer to:
- `/src/renderer/components/design/DesignSystem.tsx` - CurrencyText component
- `/src/renderer/utils/reportFormatters.ts` - formatCurrency function
- `/src/renderer/styles/theme.css` - CSS variables and classes
