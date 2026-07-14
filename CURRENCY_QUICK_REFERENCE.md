# Currency Display Quick Reference

One-page reference for standardized currency formatting in InsAcc.

---

## Standard Format

```
AED 1,234.56
```

Always: Code + single space + formatted number with 2 decimals

---

## Component Usage

```tsx
import { CurrencyText } from './components/design/DesignSystem'

// Basic
<CurrencyText value={1234.56} />

// With currency
<CurrencyText value={1234.56} currency="AED" />

// Sizes
<CurrencyText value={amount} size="xs" />   // 12px
<CurrencyText value={amount} size="sm" />   // 13px
<CurrencyText value={amount} size="md" />   // 15px (default)
<CurrencyText value={amount} size="lg" />   // 18px
<CurrencyText value={amount} size="xl" />   // 24px
<CurrencyText value={amount} size="2xl" />  // 30px

// Colors
<CurrencyText value={profit} variant="positive" />  // Green
<CurrencyText value={loss} variant="negative" />    // Red
<CurrencyText value={total} variant="primary" />    // Accent color
<CurrencyText value={note} variant="muted" />       // Gray

// Combined
<CurrencyText value={total} size="xl" variant="primary" />
```

---

## Function Usage

```tsx
import { formatCurrency } from '../utils/reportFormatters'

const formatted = formatCurrency(1234.56, 'AED')
// Returns: "AED 1,234.56"
```

---

## CSS Classes (if needed)

```html
<span class="currency-amount">AED 1,234.56</span>
<span class="currency-amount currency-amount-lg">AED 1,234.56</span>
<span class="currency-amount currency-amount-positive">AED 1,234.56</span>
```

---

## Migration Patterns

### ❌ Don't Do This

```tsx
{currency} {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
{currency} {amount.toFixed(2)}
<span style={{ fontWeight: 600 }}>{currency} {amount}</span>
<div style={{ fontSize: 18, fontWeight: 700 }}>{currency} {amount}</div>
```

### ✅ Do This Instead

```tsx
<CurrencyText value={amount} currency={currency} />
<CurrencyText value={amount} size="lg" />
```

---

## Common Use Cases

### Dashboard KPI
```tsx
<div className="kpi-value">
  <CurrencyText value={totalWealth} size="xl" />
</div>
```

### Table Cell
```tsx
<td style={{ textAlign: 'right' }}>
  <CurrencyText value={row.amount} />
</td>
```

### Positive/Negative
```tsx
<CurrencyText 
  value={profit} 
  variant={profit >= 0 ? 'positive' : 'negative'} 
/>
```

### Small Print
```tsx
<CurrencyText value={fee} size="xs" variant="muted" />
```

---

## Typography Specs

```css
Font: Inter
Size: 15px (default)
Weight: 600 (default)
Spacing: -0.01em
Line Height: 1.4
Variant: tabular-nums
```

---

## Search & Replace

Find inline formatting:
```regex
{currency}\s*\{.*\.toLocaleString
AED\s*\{.*\.toFixed\(2\)
fontWeight.*currency
```

---

## Import Path

```tsx
import { CurrencyText } from './components/design/DesignSystem'
import { formatCurrency } from '../utils/reportFormatters'
```

---

## Props Reference

```typescript
interface CurrencyTextProps {
  value: number                    // Required
  currency?: string                // Default: 'AED'
  size?: 'xs'|'sm'|'md'|'lg'|'xl'|'2xl'
  variant?: 'default'|'positive'|'negative'|'primary'|'muted'
  className?: string
  // + all HTMLSpanElement props
}
```

---

## Examples by Context

| Context | Code |
|---------|------|
| Header Total | `<CurrencyText value={total} size="2xl" />` |
| KPI Card | `<CurrencyText value={metric} size="xl" />` |
| Table Amount | `<CurrencyText value={amount} />` |
| Subtotal | `<CurrencyText value={subtotal} size="lg" />` |
| Fee/Tax | `<CurrencyText value={fee} size="sm" variant="muted" />` |
| Profit | `<CurrencyText value={profit} variant="positive" />` |
| Loss | `<CurrencyText value={loss} variant="negative" />` |

---

**Need more?** See `CURRENCY_STANDARDIZATION_GUIDE.md`
