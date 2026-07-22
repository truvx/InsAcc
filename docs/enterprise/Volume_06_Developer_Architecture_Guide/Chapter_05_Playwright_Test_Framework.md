---
title: "Volume 06: Developer Architecture Guide - Chapter 05: Playwright Test Framework"
document_id: "INSACC-DOC-V06-CH05"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 06: Developer Architecture & Technical Specification
## Chapter 05: Playwright Test Framework

> **Single Source of Truth Reference**: All automated test specifications, Playwright test suite configurations, and multi-viewport matrices defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Playwright Integration Test Framework Overview](#71-playwright-integration-test-framework-overview)
  - [7.2 Playwright Configuration Architecture (`playwright.config.ts`)](#72-playwright-configuration-architecture-playwrightconfigts)
  - [7.3 The 76-Test Pipeline Breakdown Across 3 Test Modules](#73-the-76-test-pipeline-breakdown-across-3-test-modules)
  - [7.4 Multi-Viewport & Light/Dark Theme Snapshot Matrix](#74-multi-viewport--lightdark-theme-snapshot-matrix)
  - [7.5 Executing Automated Tests & Interactive Debugging](#75-executing-automated-tests--interactive-debugging)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter defines the technical implementation of the automated end-to-end (E2E) integration test framework in InsAcc using Microsoft Playwright.

---

## 2. Scope

This specification covers:
- Playwright configuration in `playwright.config.ts`.
- Directory structure for automated integration tests (`tests/`).
- The 76-test integration pipeline across 3 test modules (`purchase-ledger.spec.ts`, `reports-visual.spec.ts`, `transactions.spec.ts`).
- Multi-viewport visual QA matrix across 4 viewport resolutions in Light and Dark modes.
- Command-line test execution, HTML report generation, and interactive UI debugging mode.

Out of Scope:
- General pre-production manual QA procedures (covered in [Volume 01 Chapter 04](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_01_Installation_Guide/Chapter_04_Deployment_Verification.md)).
- CI/CD pipeline automation setup (covered in [Volume 01 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_01_Installation_Guide/Chapter_03_Build_From_Source.md)).

---

## 3. Audience

This document is authored for:
- Test Automation Engineers and Quality Assurance Leads
- Frontend Core Engineers and Maintainers
- DevOps & CI/CD Pipeline Engineers

---

## 4. Prerequisites

Before running automated Playwright tests:
1. Ensure Node.js 22 LTS is installed and dependencies are synchronized (`npm ci`).
2. Install Playwright browser binaries via `npx playwright install`.

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **DYNAMIC STRESS DISPOSITION IN CI**: Running Playwright tests with `fullyParallel: true` on resource-constrained CI runner nodes can cause browser context instantiation timeouts. On low-spec CI runners, constrain worker concurrency via `--workers=2`.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Local WebServer Auto-Start**: `playwright.config.ts` includes a `webServer` block that automatically launches Vite on port 5174 (`http://localhost:5174`) before running test suites, eliminating the need to manually start a dev server prior to testing.

---

## 7. Main Content

### 7.1 Playwright Integration Test Framework Overview

InsAcc uses Microsoft Playwright for end-to-end integration and visual regression testing. The suite validates UI component interactions, form inputs, dynamic calculations, and responsive layouts across viewports.

---

### 7.2 Playwright Configuration Architecture (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
    { name: 'chromium-laptop',  use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'tablet-landscape', use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } } },
    { name: 'tablet-portrait',  use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } }
  ]
})
```

---

### 7.3 The 76-Test Pipeline Breakdown Across 3 Test Modules

The test suite contains **76 end-to-end integration tests**:

```
Playwright Integration Suite (76 Total Tests)
├── `tests/purchase-ledger.spec.ts`  ──► 14 Tests (Purchase lot CRUD, weighted cost calculations)
├── `tests/reports-visual.spec.ts`   ──► 14 Tests (Visual QA across 4 viewports in Light/Dark mode)
└── `tests/transactions.spec.ts`     ──► 48 Tests (Voucher lifecycle, double-entry balance, filters)
```

#### Test Suite Breakdown:
1. **`tests/purchase-ledger.spec.ts` (14 Tests)**: Validates lot creation, modal forms, category dropdowns, cost basis calculations, and `computeAverages()` weighted average outputs.
2. **`tests/reports-visual.spec.ts` (14 Tests)**: Captures screenshot baselines across financial statement views (Trial Balance, P&L, Balance Sheet) to prevent layout regressions.
3. **`tests/transactions.spec.ts` (48 Tests)**: Validates voucher creation, line addition/deletion, debit-credit balance assertions ($\sum D = \sum C$), voucher posting, and reversal workflows.

---

### 7.4 Multi-Viewport & Light/Dark Theme Snapshot Matrix

Visual QA tests in `tests/reports-visual.spec.ts` execute against a 4-viewport grid:

| Viewport Name | Resolution | Target Device Form Factor | Sidebar Layout State |
|---|---|---|---|
| **Chromium Desktop** | 1920 x 1080 | Full HD 1080p Desktop | Expanded (240px) |
| **Chromium Laptop** | 1440 x 900 | Standard Laptop Display | Expanded (240px) |
| **Tablet Landscape** | 1024 x 768 | Tablet Horizontal Mode | Expanded (240px) |
| **Tablet Portrait** | 768 x 1024 | Tablet Vertical Mode | Collapsed Icon-Only (56px) |

---

### 7.5 Executing Automated Tests & Interactive Debugging

#### Command-Line Execution Scripts:

```bash
# Run all 76 Playwright integration tests headless
npx playwright test

# Execute a specific test specification file
npx playwright test tests/transactions.spec.ts

# Launch Playwright Interactive UI Mode (Visual Debugger)
npx playwright test --ui

# Open generated HTML test execution report
npx playwright show-report
```

---

## 8. Summary

The Playwright test framework provides automated quality assurance for InsAcc. With 76 integration tests across 3 spec files, multi-viewport layout validation, and automated dev server launching, Playwright prevents visual regressions and maintains double-entry accounting integrity across code changes.

---

## 9. Chapter Appendix

### Sample Playwright Test Assertion Code Snippet

```typescript
import { test, expect } from '@playwright/test'

test('should create a balanced Receipt Voucher (RV) and update bank balance', async ({ page }) => {
  await page.goto('/')
  
  // 1. Select Investor profile and navigate to Transactions
  await page.click('text=Proceed')
  await page.click('text=Transactions')
  
  // 2. Click + New Voucher
  await page.click('button:has-text("+ New Voucher")')
  
  // 3. Fill Voucher Form
  await page.selectOption('select[name="voucherType"]', 'Receipt')
  await page.fill('input[name="narration"]', 'Playwright Integration Test Deposit')
  
  // 4. Assert Balance Indicator displays "Balanced"
  await expect(page.locator('.balance-indicator')).toHaveText('Balanced')
  
  // 5. Submit Form
  await page.click('button:has-text("Save Voucher")')
  
  // 6. Verify Voucher appears in Transactions Table with status "Draft"
  await expect(page.locator('table')).toContainText('Playwright Integration Test Deposit')
})
```

---

## 10. Glossary

- **Headless Browser**: A web browser without a graphical user interface, controlled programmatically for automated testing.
- **Visual Regression Testing**: A software testing technique that captures screenshots of UI elements before and after code changes to detect unintended visual modifications.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- Deployment Verification: [Volume 01 Chapter 04](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_01_Installation_Guide/Chapter_04_Deployment_Verification.md)
- System Architecture & CQRS: [Volume 06 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_01_System_Architecture_and_CQRS.md)
- UI Design System: [Volume 06 Chapter 04](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_04_UI_Design_System_and_Tokens.md)
