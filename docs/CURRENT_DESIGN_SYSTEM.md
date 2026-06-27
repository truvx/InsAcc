# InsAcc Design System v1.0

> **Application:** InsAcc
> **Category:** Premium Asset & Investment Accounting Platform
> **Version:** 1.0

---

# Overview

InsAcc is a premium desktop application for managing assets and investments.

The interface should feel like a modern financial platform rather than a generic admin dashboard.

## Inspiration

Primary
- Stripe Dashboard
- Linear
- Mercury
- Vercel Dashboard
- Notion

Secondary
- Zoho Books
- Xero
- Ramp

---

# Design Principles

The application must feel:

- Premium
- Professional
- Trustworthy
- Fast
- Minimal
- Elegant
- Calm

Avoid:

- Cartoonish UI
- Excessive gradients
- Excessive glassmorphism
- Bootstrap-looking layouts
- Neon colors
- Heavy animations

---

# Tech Stack

Frontend
- React 18 + TypeScript

Bundler
- Vite 5

Desktop
- Electron 28

Charts
- Recharts 2.x

Animation
- Framer Motion 11

Styling
- CSS Custom Properties (theme.css, 1534 lines)
- Light/dark mode via `.dark-mode` class

Icons
- Inline SVG Components (11 icon components in DesignSystem.tsx)
- No external icon library

Font
- Inter (bundled woff2, 8 weights)

Persistence
- localStorage via `usePersistedState` hook

Build/Distribution
- electron-builder, portable target only

---

# Color Palette

## Dark Theme

Background
#0C0C0D

Surface
#1C1C1F

Surface Hover
#252529

Border
#27272A

Border Heavy
#3D3D43

Primary
#6366F1

Primary Hover
#5558E6

Primary Active
#4F46E5

Success
#22C55E

Warning
#F59E0B

Danger
#EF4444

Info
#06B6D4

Text Primary
#F4F4F5

Text Secondary
#A1A1AA

Muted
#71717A

Divider
#3F3F46

Sidebar Background
#0C0C0D

Sidebar Width
240px (expanded), 56px (collapsed at ≤768px)

---

## Light Theme

Background
#F8FAFC

Surface
#FFFFFF

Border
#E2E8F0

Primary
#6366F1

Text Primary
#0F172A

Text Secondary
#475569

Muted
#94A3B8

---

# Typography

Primary Font
Inter

Fallback
-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif

Body
13px / 400

Secondary
12px / 400

Label
11px / 500

Card Title
15px / 600

Section Title
20px / 600

Page Title
17px / 600

Heading
24px / 700

Large Heading
30px / 700

Line Heights
Tight: 1.25, Normal: 1.5, Relaxed: 1.625

---

# Spacing

Always use the 4-point grid.

Available spacing values (`--space-*`):
- `--space-1`: 4px
- `--space-2`: 8px
- `--space-3`: 12px
- `--space-4`: 16px
- `--space-5`: 20px
- `--space-6`: 24px
- `--space-8`: 32px
- `--space-10`: 40px
- `--space-12`: 48px
- `--space-16`: 64px

Never use arbitrary spacing.

---

# Border Radius

Buttons
10px (`--radius`)

Inputs
10px (`--radius`)

Cards
16px (`--radius-lg`)

Dialogs
20px (`--radius-xl`)

Tables
16px (`--radius-lg`)

Small elements
8px (`--radius-sm`)

---

# Shadows

Cards
0 1px 2px rgba(0,0,0,0.3) (`--shadow-sm`)

Card Hover
0 4px 12px rgba(0,0,0,0.4) (`--shadow-md`)

Dialogs
0 12px 36px rgba(0,0,0,0.6) (`--shadow-xl`)

Buttons
Subtle only. No glowing shadows.

---

# Layout

Maximum Width
1600px

Content Padding
24px (`--space-6`)

Section Gap
24px (`--space-6`)

Card Gap
16px (`--space-4`)

Page Header
20px vertical / 24px horizontal padding, background `--header-bg`, bottom border

Page Body
24px padding, scrollable

---

# Sidebar

Expanded
240px (`--sidebar-width`)

Collapsed (≤768px)
56px (header, user info hidden; nav icons centered)

Sections
Dashboard
Investments
Transactions
Bank Accounts
Reports
Documents
History
Settings

Bottom
Profile
Logout

---

# Dashboard Layout

Top Row (KPI Grid)
Portfolio Value
Cash Balance
Monthly Income
Monthly Expenses

Second Row (Chart Grid)
Asset Allocation (Recharts PieChart)
Investment Growth (Recharts AreaChart)
Cash Flow (Recharts BarChart)
Performance (custom ranking list)

Bottom Row
Recent Transactions
Recent Investments

---

# KPI Cards

Each KPI Card contains:
- Label
- Main Value
- Optional Change Indicator (positive/negative/neutral)
- Gradient top edge on hover

No sparklines currently implemented.

---

# Tables

Current implementation:
- Sticky header
- Row hover
- Plain HTML `<table>` with CSS styling
- No sorting, filtering, search, pagination, export, or bulk actions yet

---

# Charts

Library
Recharts 2.x

Supported Charts
Area (InvestmentGrowthChart)
Bar (CashFlowChart)
Donut/Pie (AssetAllocationPie)

Not yet implemented:
Line, stacked variants, custom tooltips beyond defaults

Animations
200-300ms
Smooth
Professional
Never flashy.

---

# Forms

Current implementation:
- Plain `useState` for field values
- Manual validation with inline error display
- Single-column layout
- Two-column via `.form-row` grid at container level

Not yet implemented:
React Hook Form
Zod validation
Autosave

---

# Buttons

Variants
Primary (`#6366F1` background, white text)
Secondary (surface background, border)
Ghost (transparent, text-secondary)
Danger (`#EF4444` background, white text)

Sizes
Small: 26px height
Default: 34px height
Large: 40px height

Icon Button
32x32px square, 16px SVG

States
Hover, Active (translateY(1px)), Disabled (opacity 0.5)

---

# Dialogs

Rounded (20px)
Blur background (backdrop-filter on modal-backdrop)
Animated (scale + fade, 200ms)
ESC closes (via Modal component)
Enter confirms (via form submit)

---

# Inputs

Height
38px

Border Radius
10px

Background
`--bg` (#0C0C0D dark / #F8FAFC light)

States
Hover (border-heavy), Focus (primary border + 3px glow), Disabled (opacity 0.5)

---

# Navigation

Current implementation:
- Sidebar navigation with active state highlighting
- No keyboard navigation shortcuts beyond native focus
- No command palette
- No breadcrumbs
- No global search

---

# Empty States

Every page without data should include:
- Icon (SVG from DesignSystem)
- Title
- Description
- Primary CTA (add action button)

---

# Loading States

Skeleton CSS classes defined in theme.css but not used by any component:
- `.skeleton` — base pulse animation
- `.skeleton-text` — text line placeholder
- `.skeleton-kpi` — KPI card placeholder
- `.skeleton-row` — table row placeholder

Currently no loading states implemented — content renders immediately from localStorage.

---

# Animations

Library
Framer Motion 11

Duration
200-300ms

CSS Animations
@keyframes: pulse, toastIn, toastOut, overlayFade, modalIn, spin, pageEnter

Use
Fade
Slide (toast)
Scale (modal, page enter)

Avoid
Bounce
Elastic
Flash

---

# Icons

Use only inline SVG components defined in DesignSystem.tsx:
- CloseIcon, ChevronDownIcon, PlusIcon, SearchIcon
- TrashIcon, EditIcon, DownloadIcon, UploadIcon
- FilterIcon, RefreshIcon, ChevronLeftIcon
- CheckIcon, XIcon (Toast)

No external icon library. Do not use emoji for UI elements.

---

# Accessibility

AA Contrast (verified against CSS variable values)
Keyboard Navigation (native form focus, tab order)
Focus Rings (2px primary outline on `:focus-visible`)
ARIA Labels (present on IconButton, Tabs, nav items)
Role attributes (tab, tablist, dialog)

---

# Performance

No lazy loading or code splitting (single-bundle app)
`useMemo` for expensive computations (purchase averages)
CSS animations via `@keyframes` and `transition`
Framer Motion for component animations (spring physics)

---

# Design Language

Every page should look consistent.
Every card should feel premium.
Every interaction should feel smooth.
Whitespace is more important than decoration.
Avoid unnecessary visual noise.
Financial software should communicate trust and clarity.

---

# Not Yet Implemented

The following features from the original aspirational design spec are NOT yet implemented:
- Tailwind CSS utility framework (using CSS Custom Properties instead)
- shadcn/ui component library (using custom DesignSystem.tsx instead)
- Lucide React icons (using inline SVGs instead)
- TanStack Table (using plain HTML tables instead)
- React Hook Form + Zod (using useState + manual validation instead)
- Top navigation bar (global search, notifications, quick actions, profile)
- Command palette (⌘K)
- KPI sparklines
- Skeleton loading states
- Table sorting, filtering, search, pagination, export
- Breadcrumbs
- Maximum width container constraint
- Performance optimizations (lazy loading, code splitting, virtual tables)

---

# AI Development Rules

When any AI modifies this project:

- Never change business logic.
- Never change APIs.
- Never change authentication.
- Never change database models.
- Never redesign unrelated pages.
- Preserve functionality.
- Follow this design system exactly.

Always use:
- React 18 + TypeScript
- CSS Custom Properties (from theme.css)
- DesignSystem.tsx components and SVG icons
- Framer Motion for animations
- Recharts for charts

Maintain consistency across the entire application.

If unsure, prioritize readability, maintainability, and professional financial software aesthetics over visual effects.
