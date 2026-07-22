---
title: "Volume 04: End-User Manual - Chapter 04: Property and Lease Management"
document_id: "INSACC-DOC-V04-CH04"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 04: InsAcc End-User Operations Manual
## Chapter 04: Property and Lease Management

> **Single Source of Truth Reference**: All property data models, unit state machines, and lease contract structures defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Real Estate Hierarchy & Data Model](#71-real-estate-hierarchy--data-model)
  - [7.2 Property Categories & Building Master Setup](#72-property-categories--building-master-setup)
  - [7.3 Rentable Unit Setup & Occupancy State Machine](#73-rentable-unit-setup--occupancy-state-machine)
  - [7.4 Tenant Master Registration & KYC Metadata](#74-tenant-master-registration--kyc-metadata)
  - [7.5 Lease Contract Registration & Automated PDC Generation](#75-lease-contract-registration--automated-pdc-generation)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter provides operational procedures for building real estate hierarchies, managing property categories, registering rentable units, maintaining tenant records, executing lease contracts, and automating PDC cheque schedules in the InsAcc Property Management Module.

---

## 2. Scope

This specification covers:
- The 4-level real estate domain hierarchy (Categories $\rightarrow$ Buildings $\rightarrow$ Units $\rightarrow$ Leases).
- Building master setup (`PropertyBuilding`) and property category setup (`PropertyCategory`).
- Rentable unit setup (`PropertyUnit`) and unit state transitions (`Vacant` $\rightarrow$ `Occupied` $\rightarrow$ `Under Maintenance`).
- Tenant master registration (`PropertyTenant`) and Emirates ID / KYC tracking.
- Lease contract creation (`PropertyLeases.tsx`) and automatic PDC schedule generation.

Out of Scope:
- PDC cheque clearing & bounced workflow (covered in [Volume 04 Chapter 05](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_05_PDC_and_Rent_Collection.md)).
- Property maintenance payment vouchers (covered in [Volume 04 Chapter 07](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_07_Double_Entry_Voucher_Operations.md)).

---

## 3. Audience

This document is authored for:
- Property Operations Managers and Leasing Officers
- Real Estate Portfolio Accountants
- Property Administrators

---

## 4. Prerequisites

Before registering leases:
1. Log in to InsAcc and select the **`Property Manager`** profile.
2. Select the **Property Management Module**.
3. Ensure parent buildings and categories are configured in `insacc_prop_buildings`.

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **UNIT OCCUPANCY STATE CONFLICT**: Assigning a new lease to a unit currently marked as `Occupied` will throw an operational validation error (`UNIT_ALREADY_OCCUPIED`). Administrators MUST terminate or expire the active lease before attaching a new tenant contract.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Automatic PDC Schedule Calculation**: Registering a 1-year lease of AED 120,000 with `Quarterly` payment frequency automatically generates **4 Post-Dated Cheque entries** of AED 30,000 each, spaced exactly 3 months apart starting from the lease commencement date (`propertyPdcService.ts`).

---

## 7. Main Content

### 7.1 Real Estate Hierarchy & Data Model

Real estate operations are structured as a 4-level parent-child hierarchy:

```
Level 1: Property Category ──► Level 2: Building Master ──► Level 3: Unit ──► Level 4: Lease Contract
(Residential / Commercial)    (Al Riyan Tower)             (Unit 101)        (Tenant Lease & PDCs)
```

---

### 7.2 Property Categories & Building Master Setup

1. **Property Categories** (`insacc_prop_categories`): Defines broad property classes (`Residential`, `Commercial`, `Industrial`, `Retail`).
2. **Building Master Setup** (`PropertyBuilding.tsx`): Establishes building master records:
   ```typescript
   export interface PropertyBuilding {
     id: string              // Unique building ID (e.g. "bld-101")
     name: string            // Building title (e.g. "Al Riyan Tower")
     categoryId: string      // Parent category reference
     address: string         // Physical location / Plot number
     totalUnits: number      // Total unit count
     notes?: string          // Operational memo
   }
   ```

---

### 7.3 Rentable Unit Setup & Occupancy State Machine

Units belong to parent buildings and progress through a 3-state occupancy state machine:

```
                        ┌──────────────┐
                        │ Vacant State │
                        └──────┬───────┘
                               │
                  [ Action: Execute Lease ]
                               │
                               ▼
                        ┌──────────────┐
                        │Occupied State│
                        └──────┬───────┘
                               │
                [ Action: Lease Terminated ]
                               │
                               ▼
                  ┌──────────────────────────┐
                  │ Under Maintenance State  │
                  └──────────────────────────┘
```

#### Unit Interface Model (`PropertyUnit`):
```typescript
export interface PropertyUnit {
  id: string              // Unique unit ID (e.g. "unit-101")
  buildingId: string      // Parent building ID reference
  unitNumber: string      // Unit number (e.g. "A-101")
  type: string            // "1BHK" | "2BHK" | "3BHK" | "Studio" | "Office" | "Retail"
  annualRent: number      // Base annual target rent (AED)
  status: 'Vacant' | 'Occupied' | 'Under Maintenance'
  tenantId?: string       // Active tenant ID reference
}
```

---

### 7.4 Tenant Master Registration & KYC Metadata

Tenant master profiles persist in `insacc_prop_tenants`:

```typescript
export interface PropertyTenant {
  id: string              // Unique tenant ID (e.g. "ten-1001")
  name: string            // Full tenant / corporate entity name
  nationalId: string      // Emirates ID / Passport / Commercial License #
  phone: string           // Contact mobile number
  email: string           // Email address for notifications
  emergencyContact?: string
}
```

---

### 7.5 Lease Contract Registration & Automated PDC Generation

```
Open Leases View ──► Click [+ New Lease Contract] ──► Select Unit & Tenant ──► Save Lease
```

#### Steps to Register a Lease Contract:
1. Navigate to **Properties** $\rightarrow$ **Leases** $\rightarrow$ click **+ New Lease Contract**.
2. Complete lease parameters:
   - **Tenant**: Select registered tenant (e.g., `John Doe`).
   - **Property Unit**: Select a `Vacant` unit (e.g., `Unit 101`).
   - **Start Date**: (e.g., `2026-07-01`).
   - **End Date**: (e.g., `2027-06-30`).
   - **Annual Rent**: (e.g., `120,000 AED`).
   - **Payment Frequency**: Select `Annual` (1 cheque), `Semi-Annual` (2 cheques), `Quarterly` (4 cheques), or `Monthly` (12 cheques).
   - **Security Deposit**: (e.g., `5,000 AED`).
3. Click **Create Lease Contract**.

#### Automated System Execution:
1. Updates unit status from `Vacant` to `Occupied`.
2. Posts Security Deposit receipt voucher to `2120 Tenant Security Deposits`.
3. Automatically generates the Post-Dated Cheque schedule in `insacc_prop_rent`.

---

## 8. Summary

The Property Management Module structures real estate assets into a 4-level hierarchy. By managing unit occupancy states, tenant profiles, and lease terms, InsAcc automates security deposit accounting and Post-Dated Cheque schedule generation.

---

## 9. Chapter Appendix

### Payment Frequency & Cheque Schedule Matrix

| Payment Frequency | Cheque Count | Maturity Schedule Interval | Per-Cheque Amount (AED 120,000 Rent) |
|---|---|---|---|
| **Annual** | 1 Cheque | 12 Months | AED 120,000.00 |
| **Semi-Annual** | 2 Cheques | 6 Months | AED 60,000.00 |
| **Quarterly** | 4 Cheques | 3 Months | AED 30,000.00 |
| **Monthly** | 12 Cheques | 1 Month | AED 10,000.00 |

---

## 10. Glossary

- **KYC (Know Your Customer)**: The process of verifying the identity of clients or tenants before executing business contracts.
- **PDC (Post-Dated Cheque)**: A cheque written with a future maturity date that cannot be cashed until that specified date arrives.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- PDC and Rent Collection: [Volume 04 Chapter 05](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_05_PDC_and_Rent_Collection.md)
- Double-Entry Voucher Operations: [Volume 04 Chapter 07](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_04_End_User_Manual/Chapter_07_Double_Entry_Voucher_Operations.md)
