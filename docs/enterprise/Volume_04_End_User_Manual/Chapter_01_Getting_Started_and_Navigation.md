---
title: "Volume 04: End-User Manual - Chapter 01: Getting Started and Navigation"
document_id: "INSACC-DOC-V04-CH01"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 04: InsAcc End-User Operations Manual
## Chapter 01: Getting Started and Navigation

> **Single Source of Truth Reference**: All UI navigation structures, layout components, and screen transition flows defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 4-Stage Screen Transition Workflow](#71-4-stage-screen-transition-workflow)
  - [7.2 Stage 1: Authentication & Security PIN Entry (`Login.tsx`)](#72-stage-1-authentication--security-pin-entry-logintsx)
  - [7.3 Stage 2: Functional Domain Profile Selection (`ProfileSelection.tsx`)](#73-stage-2-functional-domain-profile-selection-profileselectiontsx)
  - [7.4 Stage 3: Operational Module Selection (`ModuleSelection.tsx`)](#74-stage-3-operational-module-selection-moduleselectiontsx)
  - [7.5 Stage 4: Main Workspace Application Shell Layout](#75-stage-4-main-workspace-application-shell-layout)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter provides operational personnel with an overview of the InsAcc application interface, screen navigation workflows, module switching mechanisms, sidebar navigation controls, and layout structure.

---

## 2. Scope

This specification covers:
- The 4-stage screen transition pipeline (`login` $\rightarrow$ `profiles` $\rightarrow$ `module` $\rightarrow$ `dashboard`).
- User authentication and security PIN entry (`Login.tsx`).
- Profile selection (`Investor` vs `Property Manager` in `ProfileSelection.tsx`).
- Operational module selection (`Investment Portfolio` vs `Property Management` in `ModuleSelection.tsx`).
- Main application shell layout (`Sidebar.tsx`, `.page-header`, `.page-body`).
- User profile avatar badges and logout procedures.

Out of Scope:
- Portfolio holdings management (covered in [Volume 04 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_02_Investment_Portfolio_Management.md)).
- Property unit and lease creation (covered in [Volume 04 Chapter 04](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_04_Property_and_Lease_Management.md)).

---

## 3. Audience

This document is authored for:
- Asset Portfolio Managers and Family Office Technicians
- Property Operations Technicians and Property Managers
- Financial Accountants and Bookkeepers
- New Operational End Users

---

## 4. Prerequisites

Before logging in:
1. Ensure the desktop application has been installed ([Volume 01 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_01_Installation_Guide/Chapter_02_Desktop_Client_Deployment.md)).
2. Obtain your security PIN or password from your system administrator.

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **UNSAVED DRAFT FORMS ON LOGOUT**: Logging out or closing the application while editing an uncommitted voucher or lease form will discard ephemeral form state. Users MUST save vouchers as `Draft` or submit forms before logging out.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Responsive Collapsible Sidebar**: At screen resolutions below $\le 768\text{px}$ (tablet portrait viewports), the left sidebar automatically collapses from 240px to 56px, displaying icon-only navigation to maximize workspace area (`Sidebar.tsx`).

---

## 7. Main Content

### 7.1 4-Stage Screen Transition Workflow

When launching InsAcc, users navigate through a 4-stage screen sequence (`App.tsx` routing):

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Stage 1:     │ ──► │ Stage 2: Profile  │ ──► │ Stage 3: Module  │ ──► │ Stage 4: Main   │
│ Login Screen │     │ Selection Screen  │     │ Selection Screen │     │ Workspace Shell │
└──────────────┘     └───────────────────┘     └──────────────────┘     └─────────────────┘
```

---

### 7.2 Stage 1: Authentication & Security PIN Entry (`Login.tsx`)

1. Launch InsAcc from your desktop shortcut or Applications menu.
2. The **Login Screen** renders a central security PIN pad:
   - Enter your assigned 4-digit security PIN or password.
   - Click **Login**.
3. Upon successful validation against `storedPassword` in state, the system advances to Stage 2.

---

### 7.3 Stage 2: Functional Domain Profile Selection (`ProfileSelection.tsx`)

Select your working domain profile:
- **`Investor` Profile**: Configured for wealth managers and portfolio accountants. Accesses `invUsers` settings.
- **`Property Manager` Profile**: Configured for real estate operations teams. Accesses `propUsers` settings.

---

### 7.4 Stage 3: Operational Module Selection (`ModuleSelection.tsx`)

Choose the operational module for your current session:
1. **Investment Portfolio Module**: Wealth tracking, precious metals holdings, purchase ledger cost averaging, dividend income, and investment banking.
2. **Property Management Module**: Property categories, buildings, units, tenant lease contracts, PDC cheque lifecycle manager, security deposits, and rent collection.

---

### 7.5 Stage 4: Main Workspace Application Shell Layout

Upon module selection, the main workspace shell initializes:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Page Header (Module Title, Active Profile Badge, Currency/Theme Actions)     │
├───────────────┬─────────────────────────────────────────────────────────────┤
│ Sidebar Nav   │ Main Content Workspace area (`.page-body`)                   │
│ (Dashboard,   │                                                             │
│  Holdings,    │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  Transactions,│   │ KPI Card 1   │  │ KPI Card 2   │  │ KPI Card 3   │      │
│  Banking,     │   └──────────────┘  └──────────────┘  └──────────────┘      │
│  Reports,     │                                                             │
│  Settings)    │   [ Recharts Chart Area / Data Tables / Form Modals ]       │
└───────────────┴─────────────────────────────────────────────────────────────┘
```

#### 1. Navigation Sidebar (`Sidebar.tsx`)
- Located on the left side of the screen (240px wide).
- Displays primary navigation links: **Dashboard**, **Holdings** (or **Properties**), **Transactions**, **Banking**, **Reports**, **Settings**.
- Bottom section displays the active user avatar, role badge (`Admin` / `Accounts`), and **Logout** button.

#### 2. Page Header (`.page-header`)
- Displays current page title, active module indicator, and action toolbars (e.g., `+ Add Transaction`, `Export CSV`).

#### 3. Workspace Area (`.page-body`)
- Scrollable workspace area rendering KPI summary cards, interactive charts, and data tables.

---

## 8. Summary

InsAcc provides a structured 4-stage login and module selection sequence leading to a unified application shell. With dedicated sidebar navigation, clear active profile indicators, and module isolation, operational users can navigate between portfolio management and property real estate accounting seamlessly.

---

## 9. Chapter Appendix

### Application Navigation Hotkey Reference

| Action / Shortcut | Operational Purpose |
|---|---|
| `Tab` / `Shift+Tab` | Navigate between form input fields in modal dialogs |
| `Esc` | Close active modal dialog or popup window |
| `Enter` | Submit focused form or confirm primary modal action |

---

## 10. Glossary

- **Application Shell**: The minimal HTML, CSS, and JavaScript required to power the user interface structure, including navigation bars and workspace frames.
- **Hot Module Replacement (HMR)**: Live code replacement feature active in development mode.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- User Profiles & Access Control: [Volume 03 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_03_System_Administrator_Guide/Chapter_02_User_Profiles_and_Access_Control.md)
- Investment Portfolio Management: [Volume 04 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_02_Investment_Portfolio_Management.md)
- Property Management: [Volume 04 Chapter 04](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_04_Property_and_Lease_Management.md)
