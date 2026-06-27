# InsAcc Design System — Target v2.0

> **Application:** InsAcc
> **Category:** Premium Asset & Investment Accounting Platform
> **Status:** Aspirational — not yet implemented
>
> This document describes the **target** design system. See `CURRENT_DESIGN_SYSTEM.md` for what exists today.

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

# Target Tech Stack

Frontend
- React 18 + TypeScript
- Tailwind CSS

Components
- shadcn/ui (built on Radix UI)

Charts
- Recharts

Animation
- Framer Motion

Icons
- Lucide React

Tables
- TanStack Table

Forms
- React Hook Form

Validation
- Zod

---

# Color Palette

## Dark Theme

| Token | Value |
|---|---|
| `--bg` | `#09090B` |
| `--surface` | `#111113` |
| `--card` | `#18181B` |
| `--border` | `#27272A` |
| `--primary` | `#6366F1` |
| `--success` | `#10B981` |
| `--warning` | `#F59E0B` |
| `--danger` | `#EF4444` |
| `--text-primary` | `#FAFAFA` |
| `--text-secondary` | `#A1A1AA` |
| `--text-muted` | `#71717A` |
| `--divider` | `#3F3F46` |

## Light Theme

| Token | Value |
|---|---|
| `--bg` | `#FFFFFF` |
| `--surface` | `#F8FAFC` |
| `--card` | `#FFFFFF` |
| `--border` | `#E4E4E7` |
| `--primary` | `#6366F1` |
| `--text-primary` | `#111827` |
| `--text-secondary` | `#6B7280` |

---

# Typography

| Style | Size | Weight |
|---|---|---|
| Heading | 32px | 700 |
| Section Title | 24px | 600 |
| Card Title | 18px | 600 |
| Body | 16px | 400 |
| Secondary | 14px | 400 |
| Label | 12px | 500 |

Primary Font: Inter
Fallback: Geist

---

# Spacing

Always use an 8-point grid. Allowed values: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.

---

# Border Radius

| Element | Radius |
|---|---|
| Buttons | 12px |
| Inputs | 12px |
| Cards | 18px |
| Dialogs | 20px |
| Charts | 18px |
| Tables | 16px |

---

# Shadows

| Element | Shadow |
|---|---|
| Cards | `0 8px 24px rgba(0,0,0,0.20)` |
| Dialogs | `0 20px 60px rgba(0,0,0,0.35)` |
| Buttons | Subtle only, no glowing |

---

# Layout

| Property | Value |
|---|---|
| Max Width | 1600px |
| Content Padding | 32px |
| Section Gap | 32px |
| Card Gap | 24px |
| Content Background | `--surface` (#111113) |

---

# Sidebar

| State | Width |
|---|---|
| Expanded | 280px |
| Collapsed | 72px |

Sections: Dashboard, Investments, Transactions, Bank Accounts, Reports, Documents, History, Settings
Bottom: Workspace, Profile, Theme Toggle, Logout

---

# Top Navigation

Contains:
- Global Search
- Notifications
- Quick Actions
- Profile
- Workspace Switcher

---

# Dashboard Layout

Top Row: Portfolio Value, Cash Balance, Monthly Income, Monthly Expenses
Second Row: Asset Allocation, Cash Flow, Performance
Bottom Row: Recent Transactions, Recent Investments, Activity Feed, Quick Actions

---

# KPI Cards

Every KPI Card contains:
- Icon
- Title
- Main Value
- Trend Indicator (e.g., ▲ 8.2%)
- Sparkline (mini chart)

---

# Tables

Must include:
- Sticky Header
- Sorting
- Filtering
- Search
- Pagination
- Export
- Responsive Layout
- Bulk Actions
- Row Hover
- Row Selection

Implemented with TanStack Table.

---

# Charts

Library: Recharts
Supported types: Area, Line, Bar, Donut, Pie
Animations: 200-300ms, smooth, professional, never flashy.

---

# Forms

Use React Hook Form + Zod Validation.
Requirements: Two-column desktop layout, validation, helper text, icons, autosave support, keyboard shortcuts.

---

# Buttons

Variants: Primary, Secondary, Ghost, Outline, Danger, Loading, Disabled.

---

# Dialogs

Rounded, blur background, animated, ESC closes, Enter confirms.

---

# Inputs

Rounded 12px, consistent 44px height, icons supported, clear labels, helper text, validation state.

---

# Navigation

Keyboard navigation, breadcrumbs, command palette (⌘K), global search.

---

# Command Palette

Shortcut: ⌘K / Ctrl+K
Supports: Search, Navigation, Quick Actions, Create Investment, Create Transaction, Switch Workspace.

---

# Empty States

Every page without data should include: Illustration, Helpful description, Primary CTA, Secondary CTA.

---

# Loading States

Never use spinner only. Always use: Skeleton Loaders, Placeholder Cards, Placeholder Charts, Placeholder Tables.

---

# Animations

Library: Framer Motion
Duration: 200-300ms
Use: Fade, Slide, Scale
Avoid: Bounce, Elastic, Flash

---

# Icons

Use only Lucide React. Do not mix icon libraries.

---

# Accessibility

AA Contrast, Keyboard Navigation, Focus Rings, ARIA Labels, Screen Reader Friendly.

---

# Performance

Lazy Loading, Memoization, Virtual Tables (TanStack), Code Splitting, Optimized Charts.

---

# Design Language

Every page should look consistent.
Every card should feel premium.
Every interaction should feel smooth.
Whitespace is more important than decoration.
Avoid unnecessary visual noise.
Financial software should communicate trust and clarity.

---

# Migration Path from v1.0

To reach this target from `CURRENT_DESIGN_SYSTEM.md`:

1. Install Tailwind CSS, configure with current CSS variable values
2. Install shadcn/ui components, migrate DesignSystem.tsx components one-by-one
3. Install Lucide React, replace all inline SVG icons
4. Install TanStack Table, migrate all plain HTML tables
5. Install React Hook Form + Zod, migrate form validation
6. Add top navigation bar with global search and quick actions
7. Add command palette (⌘K)
8. Add sparklines to KPI cards
9. Add skeleton loading states to every page
10. Add table sorting, filtering, search, pagination, export
11. Add breadcrumbs to page headers
12. Implement lazy loading and code splitting
13. Update CSS variable values to match target spec (radii, spacing, shadows)
14. Enforce 8-point spacing grid (currently 4-point)
