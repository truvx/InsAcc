---
title: "Volume 06: Developer Architecture Guide - Chapter 04: UI Design System and Tokens"
document_id: "INSACC-DOC-V06-CH04"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 06: Developer Architecture & Technical Specification
## Chapter 04: UI Design System and Tokens

> **Single Source of Truth Reference**: All design tokens, CSS custom properties, typography rules, and UI component standards defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Design Tokens Architecture (`theme.css`)](#71-design-tokens-architecture-themecss)
  - [7.2 Typography System & Bundled Font Assets](#72-typography-system--bundled-font-assets)
  - [7.3 Palette Tokens (Dark Mode Baseline vs Light Mode)](#73-palette-tokens-dark-mode-baseline-vs-light-mode)
  - [7.4 Micro-Animations, Glassmorphism & Elevation Shadow Tokens](#74-micro-animations-glassmorphism--elevation-shadow-tokens)
  - [7.5 Design Component Library & Interactive Showcase (`DesignSystem.tsx`)](#75-design-component-library--interactive-showcase-designsystemtsex)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter defines the enterprise UI design system, CSS custom property tokens, typography rules, color palettes, micro-animation parameters, and component library specifications for InsAcc.

---

## 2. Scope

This specification covers:
- Core CSS custom properties in `src/renderer/styles/theme.css`.
- Typography hierarchy using the bundled Inter font family (`.woff2`).
- Dark mode baseline palette (`#0C0C0D`, `#1C1C1F`) and Light mode overrides.
- Glassmorphism backdrop filters and shadow elevation tokens.
- Component design gallery (`src/renderer/components/design/DesignSystem.tsx`).
- Reusable UI design components (`VoucherLifecycleActions.tsx`, `VoucherDetailsModal.tsx`).

Out of Scope:
- General React component tree routing (covered in [Volume 06 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_01_System_Architecture_and_CQRS.md)).
- Playwright visual QA testing (covered in [Volume 06 Chapter 05](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_05_Playwright_Test_Framework.md)).

---

## 3. Audience

This document is authored for:
- User Interface (UI) and User Experience (UX) Engineers
- Frontend React Developers
- Design System Maintainers

---

## 4. Prerequisites

Before modifying CSS design tokens:
1. Review UI standards defined in [MASTER_ARCHITECTURE.md#13-ui-standards](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md#13-ui-standards).
2. Understand vanilla CSS custom property scoping (`:root` vs `.dark-mode`).

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **HARDCODED HEX COLOR PROHIBITION**: Developers MUST NOT hardcode raw hex color strings (e.g., `#6366F1`) inside inline styles or component CSS rules. All colors MUST reference predefined CSS variables (e.g., `var(--color-brand)`). Hardcoding hex strings breaks theme switching functionality.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Zero External CSS Framework Dependency**: InsAcc uses pure Vanilla CSS custom properties without Tailwind CSS or Bootstrap dependencies. This guarantees total styling control, zero CSS specificity bloat, and sub-millisecond styling performance.

---

## 7. Main Content

### 7.1 Design Tokens Architecture (`theme.css`)

Design tokens are declared centrally in `src/renderer/styles/theme.css`:

```css
:root {
  /* Font Family Definition */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
  /* Spacing Scale Tokens */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  
  /* Border Radius Tokens */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 9999px;
  
  /* Micro-Animation Timing */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

### 7.2 Typography System & Bundled Font Assets

InsAcc bundles the **Inter** font family locally in `public/fonts/` (Weights 400, 500, 600, 700 in `.woff2` format).

| Token Name | Font Size | Font Weight | Line Height | Target UI Usage |
|---|---|---|---|---|
| `--text-xs` | 11px | 400 (Regular) | 1.4 | Badge labels, table footers |
| `--text-sm` | 13px | 400 / 500 | 1.4 | Table cell text, form labels |
| `--text-md` | 15px | 500 (Medium) | 1.5 | Body text, button titles |
| `--text-lg` | 18px | 600 (SemiBold)| 1.3 | Card titles, section headers |
| `--text-xl` | 24px | 700 (Bold) | 1.2 | Page title header (`.page-title`) |
| `--text-kpi` | 32px | 700 (Bold) | 1.1 | Dashboard KPI numbers |

---

### 7.3 Palette Tokens (Dark Mode Baseline vs Light Mode)

```css
/* Dark Mode Palette (Default Baseline) */
:root, .dark-mode {
  --bg-primary: #0C0C0D;
  --bg-surface: #1C1C1F;
  --bg-surface-hover: #26262A;
  --border-color: #2E2E32;
  
  --text-primary: #F4F4F5;
  --text-secondary: #A1A1AA;
  --text-muted: #71717A;
  
  --color-brand: #6366F1;       /* Primary Indigo Accent */
  --color-gold: #F59E0B;        /* Wealth Asset Accent */
  --color-success: #10B981;     /* Positive Return / Posted Status */
  --color-warning: #F59E0B;     /* Pending Approval / Draft Status */
  --color-danger: #EF4444;      /* Bounced Cheque / Loss / Cancelled */
}

/* Light Mode Overrides */
html:not(.dark-mode) {
  --bg-primary: #F8FAFC;
  --bg-surface: #FFFFFF;
  --bg-surface-hover: #F1F5F9;
  --border-color: #E2E8F0;
  
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-muted: #94A3B8;
}
```

---

### 7.4 Micro-Animations, Glassmorphism & Elevation Shadow Tokens

#### 1. Glassmorphism Backdrop Tokens:
```css
--glass-bg: rgba(28, 28, 31, 0.75);
--glass-backdrop: blur(12px);
--glass-border: 1px solid rgba(255, 255, 255, 0.08);
```

#### 2. Elevation Shadows:
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
```

---

### 7.5 Design Component Library & Interactive Showcase (`DesignSystem.tsx`)

Developers can preview and inspect the component library via `src/renderer/components/design/DesignSystem.tsx`:

- **`VoucherLifecycleActions.tsx`**: Renders 5-stage voucher state transition buttons (`Approve`, `Post`, `Cancel`, `Reverse`).
- **`VoucherDetailsModal.tsx`**: Renders double-entry voucher line items with debit/credit balance indicators.

---

## 8. Summary

The InsAcc design system establishes a consistent UI visual identity powered by CSS custom property tokens, local Inter typography, glassmorphism card elevation, and Dark/Light palette switching.

---

## 9. Chapter Appendix

### CSS Token Cheat Sheet Reference

| Property Type | Variable Token | Dark Mode Default | Light Mode Value |
|---|---|---|---|
| **Primary Background** | `var(--bg-primary)` | `#0C0C0D` | `#F8FAFC` |
| **Surface Card** | `var(--bg-surface)` | `#1C1C1F` | `#FFFFFF` |
| **Brand Primary** | `var(--color-brand)` | `#6366F1` | `#6366F1` |
| **Gold Accent** | `var(--color-gold)` | `#F59E0B` | `#D97706` |
| **Border Line** | `var(--border-color)` | `#2E2E32` | `#E2E8F0` |

---

## 10. Glossary

- **CSS Custom Properties (CSS Variables)**: Entities defined by CSS authors that contain specific values to be reused throughout a document.
- **Glassmorphism**: A design trend characterized by translucent frosted-glass backgrounds with subtle light borders and background blur.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- System Architecture & CQRS: [Volume 06 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_01_System_Architecture_and_CQRS.md)
- Playwright Test Framework: [Volume 06 Chapter 05](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_05_Playwright_Test_Framework.md)
