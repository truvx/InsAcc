---
title: "Volume 03: System Administrator Guide - Chapter 01: Initial Setup and Company Configuration"
document_id: "INSACC-DOC-V03-CH01"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 03: InsAcc System Administrator Guide
## Chapter 01: Initial Setup and Company Configuration

> **Single Source of Truth Reference**: All administrative settings, locale parameters, and system preferences defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Accessing the Administration Console (`Settings.tsx`)](#71-accessing-the-administration-console-settingstsx)
  - [7.2 Base Currency & Currency Formatting Configuration](#72-base-currency--currency-formatting-configuration)
  - [7.3 Date Format Mask & Regional Formatting](#73-date-format-mask--regional-formatting)
  - [7.4 Multi-Language UI Translation Engine (`utils.ts`)](#74-multi-language-ui-translation-engine-utilsts)
  - [7.5 Interface Theme Palette Customization (Dark vs Light)](#75-interface-theme-palette-customization-dark-vs-light)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter provides system administrators with step-by-step instructions for configuring company-wide preferences, base reporting currency, date formatting masks, multi-language dictionaries, and interface theme palettes in the InsAcc ERP platform.

---

## 2. Scope

This specification covers:
- System settings administration in `Settings.tsx` (`src/renderer/components/Settings.tsx`).
- Base accounting currency selection (`AED`, `USD`, `EUR`, `GBP`, `SAR`, etc.) and formatting (`reportFormatters.ts`).
- Regional date format masks (`YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`).
- Language translation dictionary engine (`t()` helper function in `utils.ts`).
- Theme switching mechanisms (`.dark-mode` class toggling on `document.documentElement`).

Out of Scope:
- User profile creation and RBAC permissions (covered in [Volume 03 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_03_System_Administrator_Guide/Chapter_02_User_Profiles_and_Access_Control.md)).
- Chart of Accounts setup (covered in [Volume 03 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_03_System_Administrator_Guide/Chapter_03_Chart_of_Accounts_Management.md)).

---

## 3. Audience

This document is authored for:
- System Administrators and IT Operations Directors
- Financial Controllers and Chief Accountants
- Implementation Project Managers
- Technical Support Personnel

---

## 4. Prerequisites

Before configuring system preferences:
1. Log in to InsAcc with a user profile assigned the `Admin` role (`role === 'Admin'`).
2. Confirm company base currency requirements with the financial accounting department.

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **BASE CURRENCY SELECTION TIMING**: Changing the Base Currency parameter after financial transactions and double-entry vouchers have been posted will re-label currency symbols across historical reports without converting historical numeric values. System administrators MUST establish the Base Currency prior to entering operational data.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Instant Theme Application**: Toggling between Dark Mode and Light Mode executes instantly by updating CSS Custom Properties (`--bg`, `--surface`, `--border`, `--text-primary`). Theme switches do NOT require restarting the application or clearing browser storage.

---

## 7. Main Content

### 7.1 Accessing the Administration Console (`Settings.tsx`)

System administration options are centralized in the **Settings** view:

1. Click **Settings** at the bottom of the left-hand navigation sidebar.
2. The Settings console renders four primary administrative tabs:
   - **General Settings**: Currency, Date Format, Language, Theme preferences.
   - **User Management**: User creation, profile editing, and role assignment.
   - **Security**: Authentication PIN setup, password policies, and credentials.
   - **Data Management**: System backup exports (JSON), imports, and factory data resets.

---

### 7.2 Base Currency & Currency Formatting Configuration

InsAcc supports multi-currency display, but consolidates all financial statements into a single **Base Accounting Currency**:

```typescript
// Base Currency Parameters in Settings.tsx
export const SUPPORTED_CURRENCIES = [
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QAR' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'OMR' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BHD' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KWD' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' }
]
```

#### Formatting Execution (`reportFormatters.ts`):
```typescript
export function formatCurrency(value: number, currency: string = 'AED'): string {
  const isNegative = value < 0
  const absVal = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return `${isNegative ? '-' : ''}${currency} ${absVal}`
}
```

---

### 7.3 Date Format Mask & Regional Formatting

Administrators can select the global date presentation mask used in tables, forms, and report exports:

| Mask Format | Example Render | Target Use Case / Region |
|---|---|---|
| `YYYY-MM-DD` (Default) | `2026-06-30` | ISO 8601 International Standard / Enterprise Financials |
| `DD/MM/YYYY` | `30/06/2026` | United Kingdom, UAE, Europe, Commonwealth Standard |
| `MM/DD/YYYY` | `06/30/2026` | United States Regional Standard |

---

### 7.4 Multi-Language UI Translation Engine (`utils.ts`)

InsAcc incorporates a lightweight translation engine (`src/renderer/utils.ts`):

```typescript
export function t(key: string, lang: 'English' | 'Arabic' | 'French' = 'English'): string {
  const dictionary: Record<string, Record<string, string>> = {
    'Dashboard': { English: 'Dashboard', Arabic: 'لوحة التحكم', French: 'Tableau de bord' },
    'Investments': { English: 'Investments', Arabic: 'الاستثمارات', French: 'Investissements' },
    'Property': { English: 'Property Management', Arabic: 'إدارة العقارات', French: 'Gestion immobilière' },
    'Reports': { English: 'Financial Reports', Arabic: 'التقارير المالية', French: 'Rapports financiers' }
  }
  return dictionary[key]?.[lang] || key
}
```

---

### 7.5 Interface Theme Palette Customization (Dark vs Light)

InsAcc defaults to a dark mode palette (`#0C0C0D` background, `#1C1C1F` surface, `#6366F1` primary, `#F59E0B` gold accents).

```javascript
// Theme Toggle Handler in Settings.tsx
const toggleTheme = (newTheme) => {
  setTheme(newTheme)
  if (newTheme === 'dark') {
    document.documentElement.classList.add('dark-mode')
  } else {
    document.documentElement.classList.remove('dark-mode')
  }
}
```

---

## 8. Summary

The Settings console provides administrators with centralized control over currency, date masks, UI languages, and visual themes. Configuring these parameters during initial deployment establishes consistent financial formatting across all operational views and reports.

---

## 9. Chapter Appendix

### Global Settings Configuration Reference Matrix

| Setting Parameter | Available Values | Storage State Key | Default Value |
|---|---|---|---|
| `currency` | `AED`, `USD`, `EUR`, `GBP`, `SAR`, etc. | React State / `App.tsx` | `'AED'` |
| `dateFormat` | `YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY` | React State / `App.tsx` | `'YYYY-MM-DD'` |
| `language` | `English`, `Arabic`, `French` | React State / `App.tsx` | `'English'` |
| `theme` | `dark`, `light` | React State / `App.tsx` | `'dark'` |

---

## 10. Glossary

- **Base Currency**: The primary accounting currency in which a company's financial statements are consolidated and presented.
- **ISO 8601**: An international standard covering the worldwide exchange and communication of date and time-related data (`YYYY-MM-DD`).
- **Localization (L10n)**: The process of adapting software for a specific region or language by translating text and formatting dates/currencies.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- User Profiles & RBAC: [Volume 03 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_03_System_Administrator_Guide/Chapter_02_User_Profiles_and_Access_Control.md)
- Chart of Accounts Management: [Volume 03 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_03_System_Administrator_Guide/Chapter_03_Chart_of_Accounts_Management.md)
