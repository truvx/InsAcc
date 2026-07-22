---
title: "Volume 03: System Administrator Guide - Chapter 02: User Profiles and Access Control"
document_id: "INSACC-DOC-V03-CH02"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 03: InsAcc System Administrator Guide
## Chapter 02: User Profiles and Access Control

> **Single Source of Truth Reference**: All user profile structures, domain isolation models, and Role-Based Access Control (RBAC) rules defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Profile Architecture & Functional Domain Isolation](#71-profile-architecture--functional-domain-isolation)
  - [7.2 Role-Based Access Control (RBAC) Permission Matrix](#72-role-based-access-control-rbac-permission-matrix)
  - [7.3 The `UserEntry` Interface & Storage Schemas](#73-the-userentry-interface--storage-schemas)
  - [7.4 User Account Creation, Edit, and Deactivation Workflows](#74-user-account-creation-edit-and-deactivation-workflows)
  - [7.5 PIN & Password Security Enforcement](#75-pin--password-security-enforcement)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter details the security architecture, domain profile isolation, and Role-Based Access Control (RBAC) models in InsAcc v1.0.0. It provides instructions for managing user profiles, assigning operational roles (`Admin` vs `Accounts`), and enforcing credential security policies.

---

## 2. Scope

This specification covers:
- Profile domain separation (`invUsers` persisted in `insacc_inv_users` vs `propUsers` persisted in `insacc_prop_users`).
- The complete 10-point RBAC permission matrix for `Admin` and `Accounts` roles.
- The `UserEntry` TypeScript interface specification.
- Administrative user CRUD workflows in `Settings.tsx`.
- Security PIN validation and password policies.

Out of Scope:
- General application settings (covered in [Volume 03 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_03_System_Administrator_Guide/Chapter_01_Initial_Setup_and_Company_Configuration.md)).
- Security vulnerability audit findings & hardening roadmap (covered in [Volume 08 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_08_Security_Guide/Chapter_02_Credential_Storage_and_Authentication_Gaps.md)).

---

## 3. Audience

This document is authored for:
- Systems Administrators and Security Compliance Officers
- IT Service Desk Leads and Access Management Engineers
- Internal Audit Technicians

---

## 4. Prerequisites

Before managing user access:
1. Log in to InsAcc with a user profile assigned `Admin` privileges.
2. Review security governance standards in [MASTER_ARCHITECTURE.md#9-authentication-architecture](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md#9-authentication-architecture).

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **ADMIN ROLE ASSIGNMENT HAZARD**: Users assigned the `Admin` role possess unrestricted authority to execute factory data resets, unlock closed fiscal periods, and delete general ledger accounts. Administrators MUST limit `Admin` role assignments to authorized IT and senior accounting personnel.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Profile Storage Separation**: Investment module users (`invUsers`) and Property module users (`propUsers`) are stored in isolated `localStorage` keys (`insacc_inv_users` and `insacc_prop_users`). This ensures clear separation of duties between portfolio wealth managers and real estate property operations personnel.

---

## 7. Main Content

### 7.1 Profile Architecture & Functional Domain Isolation

Upon logging into InsAcc, users select a functional domain profile (`ProfileSelection.tsx`):

```
                                  Profile Selection Screen
                                   (ProfileSelection.tsx)
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      │                                             │
                      ▼                                             ▼
        Investment Admin Profile                       Property Manager Profile
         `invUsers` Collection                          `propUsers` Collection
      (`insacc_inv_users` key)                       (`insacc_prop_users` key)
                      │                                             │
                      ▼                                             ▼
         Investment Module Scope                         Property Module Scope
   (Holdings, Purchases, Investments)              (Units, Tenants, Leases, PDCs)
```

---

### 7.2 Role-Based Access Control (RBAC) Permission Matrix

InsAcc enforces a 2-tier role hierarchy: **`Admin`** and **`Accounts`**.

| System Operation / Feature Access | `Admin` Role | `Accounts` Role |
|---|---|---|
| **View Dashboards & Financial Reports** | ✓ Allowed | ✓ Allowed |
| **Record Double-Entry Vouchers (`RV`, `PV`, `JV`)** | ✓ Allowed | ✓ Allowed |
| **Approve & Post Vouchers to General Ledger** | ✓ Allowed | ✓ Allowed |
| **Record Asset Purchases & Holdings** | ✓ Allowed | ✓ Allowed |
| **Manage Tenants, Leases & PDC Cheques** | ✓ Allowed | ✓ Allowed |
| **Add / Edit / Archive Bank Accounts** | ✓ Allowed | ✗ Read-Only |
| **Add / Edit / Remove User Profiles** | ✓ Allowed | ✗ Access Denied |
| **Execute Period Closing Wizard Operations** | ✓ Allowed | ✗ Access Denied |
| **Reopen Closed Fiscal Periods** | ✓ Allowed | ✗ Access Denied |
| **Execute Factory Data Reset** | ✓ Allowed | ✗ Access Denied |

---

### 7.3 The `UserEntry` Interface & Storage Schemas

User records are structured according to the `UserEntry` TypeScript interface:

```typescript
export interface UserEntry {
  id: string                  // Unique user identifier (e.g. "usr-1719500000000")
  name: string                // Full user display name (e.g. "Sarah Jenkins")
  email: string               // User email address
  role: 'Admin' | 'Accounts'  // Assigned RBAC authorization role
}
```

---

### 7.4 User Account Creation, Edit, and Deactivation Workflows

System administrators manage user accounts via **Settings** $\rightarrow$ **User Management**:

```
Settings Console ──► User Management ──► [+ Add User] ──► Save to Storage Key
```

#### Adding a User Account:
1. Open **Settings** $\rightarrow$ select the **Users** tab.
2. Click **+ Add User**.
3. Complete user details:
   - **Full Name**: (e.g., `Robert Vance`).
   - **Email Address**: (e.g., `robert.vance@company.com`).
   - **Assigned Role**: Select `Admin` or `Accounts`.
4. Click **Save User**.
5. The system serializes the updated user array to `insacc_inv_users` or `insacc_prop_users`.

---

### 7.5 PIN & Password Security Enforcement

- **PIN Authentication**: Application access requires entering a numeric security PIN on the Login screen (`Login.tsx`).
- **Password Modification**: Administrators update master passwords via **Settings** $\rightarrow$ **Security** $\rightarrow$ **Change Password**.

---

## 8. Summary

InsAcc provides domain isolation between Investment and Property modules, supported by a 2-tier RBAC framework (`Admin` vs `Accounts`). By segregating duties and restricting sensitive administrative actions, InsAcc maintains access control integrity across enterprise operations.

---

## 9. Chapter Appendix

### Standard User Profile Dictionary

| User ID | Profile Name | Default Role | Assigned Domain Scope |
|---|---|---|---|
| `usr-1001` | Investor Admin | `Admin` | Investment Portfolio Module (`invUsers`) |
| `usr-1002` | Property Operations Manager | `Admin` | Property Management Module (`propUsers`) |
| `usr-1003` | Staff Accountant | `Accounts` | Shared Operational Voucher Entry |

---

## 10. Glossary

- **RBAC (Role-Based Access Control)**: An approach to restricting system access to authorized users based on their assigned organizational roles.
- **Separation of Duties (SoD)**: The concept of having more than one person required to complete a task to prevent fraud and error.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- Initial Setup: [Volume 03 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_03_System_Administrator_Guide/Chapter_01_Initial_Setup_and_Company_Configuration.md)
- Chart of Accounts: [Volume 03 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_03_System_Administrator_Guide/Chapter_03_Chart_of_Accounts_Management.md)
- Credential Security Audit: [Volume 08 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_08_Security_Guide/Chapter_02_Credential_Storage_and_Authentication_Gaps.md)
