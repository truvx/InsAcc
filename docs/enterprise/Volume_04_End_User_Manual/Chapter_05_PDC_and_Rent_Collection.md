---
title: "Volume 04: End-User Manual - Chapter 05: PDC and Rent Collection"
document_id: "INSACC-DOC-V04-CH05"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 04: InsAcc End-User Operations Manual
## Chapter 05: PDC and Rent Collection

> **Single Source of Truth Reference**: All Post-Dated Cheque state machines, collection workflows, and general ledger journal postings defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Post-Dated Cheque (PDC) Operational Overview](#71-post-dated-cheque-pdc-operational-overview)
  - [7.2 The 5-State PDC Lifecycle State Machine (`PropertyPdcManager.tsx`)](#72-the-5-state-pdc-lifecycle-state-machine-propertypdcmanagertsex)
  - [7.3 Deposit Slip Generation & Bank Collection Submission](#73-deposit-slip-generation--bank-collection-submission)
  - [7.4 Clearing Cheques & Revenue Recognition Journal Entries](#74-clearing-cheques--revenue-recognition-journal-entries)
  - [7.5 Bounced Cheque Handling, Replacements & Legal Recourse](#75-bounced-cheque-handling-replacements--legal-recourse)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter provides step-by-step operational procedures for managing Post-Dated Cheques (PDCs), processing bank deposit collections, clearing matured cheques, recording revenue recognition journal entries, and handling bounced cheque replacements in the InsAcc Property Management Module.

---

## 2. Scope

This specification covers:
- The 5-state PDC lifecycle (`Received` $\rightarrow$ `Deposited` $\rightarrow$ `Cleared` / `Bounced` $\rightarrow$ `Replaced` / `Cancelled`).
- PDC Manager dashboard interface (`PropertyPdcManager.tsx` and `propertyPdcService.ts`).
- Bank deposit slip compilation and collection tracking.
- Automated double-entry journal postings upon cheque clearance.
- Bounced cheque accounting reversals to Rent Receivable (`1130`) and replacement workflows.

Out of Scope:
- Lease contract registration (covered in [Volume 04 Chapter 04](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_04_Property_and_Lease_Management.md)).
- Bank account reconciliation matching (covered in [Volume 04 Chapter 06](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_06_Banking_and_Reconciliation.md)).

---

## 3. Audience

This document is authored for:
- Rent Collection & Accounts Receivable Officers
- Property Managers and Leasing Operations Technicians
- Financial Accountants and General Ledger Staff

---

## 4. Prerequisites

Before processing PDC collections:
1. Log in to InsAcc with `Property Manager` or `Accounts` profile access.
2. Confirm active lease contracts have generated PDC records in `insacc_prop_rent`.

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **PREMATURE CHEQUE CLEARANCE HAZARD**: Marking a PDC cheque status as `Cleared` prior to actual bank clearance confirmation inflates bank cash balances and recognizes earned rental revenue prematurely. Operators MUST verify bank deposit statement clearance before triggering the `Cleared` status transition.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Automated Revenue Conversion**: Clearing a PDC cheque executes a dual entry: it transfers funds from `1410 PDC Held` to `1120 Bank Account` AND simultaneously converts deferred `2110 Unearned Rent` into earned `4120 Rental Revenue`.

---

## 7. Main Content

### 7.1 Post-Dated Cheque (PDC) Operational Overview

In UAE and regional real estate markets, annual rent is collected via post-dated cheques written at lease signing. InsAcc tracks every cheque from initial vault receipt through bank clearance.

---

### 7.2 The 5-State PDC Lifecycle State Machine (`PropertyPdcManager.tsx`)

```
               ┌────────────────┐
               │ Received State │ ──► (Cheque held in safe vault)
               └───────┬────────┘
                       │
       [ Action: Deposit to Bank ]
                       │
                       ▼
               ┌────────────────┐
               │Deposited State │ ──► (Submitted to bank for collection)
               └───────┬────────┘
                       │
      ┌────────────────┴────────────────┐
      │                                 │
 [ Bank Confirms Clearance ]    [ Bank Rejects / Insufficient Funds ]
      │                                 │
      ▼                                 ▼
┌──────────────┐                 ┌──────────────┐
│Cleared State │                 │Bounced State │ ──► (Transfers to Rent Receivable)
└──────────────┘                 └──────┬───────┘
                                        │
                            [ Tenant Delivers New Cheque ]
                                        │
                                        ▼
                                 ┌──────────────┐
                                 │Replaced State│
                                 └──────────────┘
```

---

### 7.3 Deposit Slip Generation & Bank Collection Submission

1. Open **Property** $\rightarrow$ **PDC Manager**.
2. Filter cheques by **Maturity Status** $\rightarrow$ select **Maturing This Week**.
3. Select the cheques maturing on or before the current date.
4. Click **Generate Bank Deposit Slip**.
5. Select target receiving bank (e.g., `1120.001 Emirates Islamic Bank`).
6. Click **Confirm Deposit**. Cheque status transitions from `Received` to `Deposited`.

---

### 7.4 Clearing Cheques & Revenue Recognition Journal Entries

When the bank confirms clearance, transition the cheque in **PDC Manager**:

```
Select Deposited Cheque ──► Click [Mark as Cleared] ──► System Generates Double Entry
```

#### Automated Journal Entry Generated on Clearance:
1. **Asset Transfer**:
   - $\text{Debit: 1120.001 Emirates Islamic Bank (Asset)} = \text{AED 30,000}$
   - $\text{Credit: 1410 PDC Cheques Held (Asset)} = \text{AED 30,000}$
2. **Revenue Recognition**:
   - $\text{Debit: 2110 Unearned Rent Liability (Liability)} = \text{AED 30,000}$
   - $\text{Credit: 4120 Rental Revenue (Revenue)} = \text{AED 30,000}$

---

### 7.5 Bounced Cheque Handling, Replacements & Legal Recourse

If a deposited cheque is rejected by the bank due to insufficient funds:

1. Open **PDC Manager** $\rightarrow$ locate the cheque in `Deposited` status.
2. Click **Mark as Bounced**. Enter bank bounce date and penalty fee if applicable.
3. **Automated Accounting Adjustment**:
   - $\text{Debit: 1130 Tenant Rent Receivable (Asset)} = \text{Cheque Amount}$
   - $\text{Credit: 1410 PDC Cheques Held (Asset)} = \text{Cheque Amount}$
4. **Replacement Workflow**:
   - Contact the tenant to secure a replacement cheque or manager's cheque.
   - Click **Record Replacement Cheque**. Enter new cheque number and maturity date.
   - The status updates to `Replaced`, and the new cheque enters the `Received` state.

---

## 8. Summary

The PDC Manager subsystem provides complete lifecycle tracking for post-dated cheques. By enforcing state machine transitions, automating bank deposit slips, and executing double-entry postings upon clearance or bounce, InsAcc maintains complete audit control over rent collections.

---

## 9. Chapter Appendix

### Cheque Lifecycle State & Accounting Matrix

| Lifecycle State | Balance Sheet / Income Statement Impact | Target Account Codes Involved |
|---|---|---|
| **Received** | Asset: PDC Held / Liability: Unearned Rent | Debit `1410` / Credit `2110` |
| **Deposited** | Internal tracking change (In Transit) | No net ledger balance change |
| **Cleared** | Cash increases / Revenue recognized | Debit `1120`, Credit `1410` & Debit `2110`, Credit `4120` |
| **Bounced** | Transfers asset from PDC to Receivable | Debit `1130` / Credit `1410` |
| **Replaced** | Replaces bounced cheque with new PDC | Debit `1410` / Credit `1130` |

---

## 10. Glossary

- **Deferred Revenue (Unearned Rent)**: Payment received from a tenant for future rental periods that has not yet been earned.
- **Deposit Slip**: An itemized slip showing the date, bank account number, and cheque items deposited into a bank account.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- Property & Lease Management: [Volume 04 Chapter 04](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_04_Property_and_Lease_Management.md)
- Banking & Reconciliation: [Volume 04 Chapter 06](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_06_Banking_and_Reconciliation.md)
- Accounting Engine Specs: [Volume 06 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_06_Developer_Architecture_Guide/Chapter_02_Double_Entry_Accounting_Engine.md)
