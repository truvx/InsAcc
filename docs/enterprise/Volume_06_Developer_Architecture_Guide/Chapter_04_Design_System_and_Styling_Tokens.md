---
title: "Volume 06: Developer Architecture Guide - Chapter 04: Design System and Styling Tokens"
document_id: "INSACC-DOC-V06-CH04"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 06: InsAcc Developer Architecture Guide
## Chapter 04: Design System and Styling Tokens

> **Reference Specification**: UI design system tokens and component guidelines adhere strictly to [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

---

### 4.1 Overview

InsAcc implements a custom, high-performance design system driven by CSS Custom Properties (`src/renderer/styles/theme.css`) and reusable React components (`src/renderer/components/design/DesignSystem.tsx`).

This chapter details design tokens, theme color palettes, typography specifications, the 4-point spacing grid, and reusable UI components.

---

### 4.2 CSS Custom Properties & Color Tokens

Theme variables are defined at the `:root` level and overridden when `.dark-mode` is active on `document.documentElement`:

```css
/* theme.css Token Specifications */
:root {
  /* Dark Mode Default Palette */
  --bg: #0C0C0D;
  --surface: #1C1C1F;
  --surface-hover: #252529;
  --border: #27272A;
  --border-heavy: #3D3D43;
  
  /* Primary & Accent Colors */
  --primary: #6366F1;
  --primary-hover: #5558E6;
  --gold: #F59E0B;
  --success: #22C55E;
  --warning: #F59E0B;
  --danger: #EF4444;
  --info: #06B6D4;
  
  /* Typography Colors */
  --text-primary: #F4F4F5;
  --text-secondary: #A1A1AA;
  --muted: #71717A;
  
  /* Border Radius Scale */
  --radius-sm: 8px;
  --radius: 10px;
  --radius-lg: 16px;
  --radius-xl: 20px;
}
```

---

### 4.3 Typography & Spacing Grid

#### Typography Tokens:
- **Font Family**: Inter (`woff2` local font files embedded in `src/renderer/styles/fonts/`).
- **Font Sizes**: Body (`13px`), Label (`11px`), Card Title (`15px`), Section Title (`20px`), Page Title (`17px`), Large Heading (`30px`).

#### 4-Point Spacing Grid:
- `--space-1`: 4px | `--space-2`: 8px | `--space-3`: 12px | `--space-4`: 16px | `--space-6`: 24px | `--space-8`: 32px | `--space-10`: 40px | `--space-12`: 48px

---

### 4.4 Reusable Component Palette (`DesignSystem.tsx`)

| Component | Props & Options | Rendered HTML / Behavior |
|---|---|---|
| **`Button`** | `variant` (`primary` / `secondary` / `ghost` / `danger`), `size` (`sm` / `md` / `lg`), `loading` | Styled button with smooth scale transform on active state. |
| **`Input`** | `label`, `error`, `hint`, `ref` | Text/Number/Date input with focus ring and error text. |
| **`Select`** | `label`, `options: { value, label }[]` | Styled dropdown select control matching theme variables. |
| **`Badge`** | `variant` (`primary` / `success` / `warning` / `danger` / `neutral`) | Pill badge container for entity status rendering. |
| **`Card`** | `title`, `actions`, `children` | Surface container (`#1C1C1F`) with `--radius-lg` (16px) corners. |
| **`KpiCard`** | `label`, `value`, `change`, `icon`, `accentColor` | Metric card with gold top border highlight on hover. |
| **`Modal`** | `isOpen`, `onClose`, `title`, `children` | React portal dialog overlay with backdrop blur animation. |
| **`EmptyState`** | `icon`, `title`, `text`, `action` | Centered placeholder layout for collections with 0 records. |

---

*Next Chapter: [Chapter 05: Playwright Test Framework](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_05_Playwright_Test_Framework.md)*
