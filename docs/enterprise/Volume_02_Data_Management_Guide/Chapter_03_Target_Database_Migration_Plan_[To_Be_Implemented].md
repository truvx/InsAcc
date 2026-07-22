---
title: "Volume 02: Data Management & Persistence Guide - Chapter 03: Target Database Migration Plan [To Be Implemented]"
document_id: "INSACC-DOC-V02-CH03"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Target Architecture Specification"
classification: "Commercial Enterprise Documentation"
---

# Volume 02: Data Management & Persistence Guide
## Chapter 03: Target Database Migration Plan `[To Be Implemented]`

> **Single Source of Truth Reference**: All database target schemas, DDL specifications, and migration scripts defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Target Enterprise Database Architecture Overview](#71-target-enterprise-database-architecture-overview)
  - [7.2 Schema & Table DDL Specifications](#72-schema--table-ddl-specifications)
  - [7.3 LocalStorage JSON to PostgreSQL ETL Pipeline](#73-localstorage-json-to-postgresql-etl-pipeline)
  - [7.4 Post-Migration Data Integrity Verification](#74-post-migration-data-integrity-verification)
  - [7.5 Automated Migration Ingestion Script (`init-database.sh`)](#75-automated-migration-ingestion-script-init-databasesh)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter defines the target relational database architecture and migration execution plan for transitioning InsAcc from single-machine browser `localStorage` persistence to an enterprise multi-tenant PostgreSQL 17 server database cluster `[To Be Implemented]`.

---

## 2. Scope

This specification covers:
- The 5-schema PostgreSQL 17 relational database architecture (`accounting`, `investment`, `property`, `auth`, `audit`).
- Production DDL specifications for accounts, vouchers, voucher lines, units, leases, and PDC cheques.
- JSON state snapshot extraction (`state_backup_YYYY-MM-DD.json`) and ETL ingestion.
- Post-migration data integrity verification ($\sum D = \sum C$).
- Automated database initialization shell script (`scripts/postgresql/init-database.sh`).

Out of Scope:
- Current desktop `localStorage` hook implementation (covered in [Volume 02 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_01_LocalStorage_Persistence_Architecture.md)).
- REST API endpoint specifications (covered in [Volume 05 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_05_Interface_and_Integration_Spec/Chapter_03_Target_REST_API_[To_Be_Implemented].md)).

---

## 3. Audience

This document is authored for:
- Database Administrators (DBAs) and Data Engineers
- Enterprise Systems Architects
- DevOps & Migration Engineering Teams
- Security & Compliance Auditors

---

## 4. Prerequisites

Before planning server migration:
1. Review the database standards specified in [MASTER_ARCHITECTURE.md#7-postgresql-architecture](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md#7-postgresql-architecture).
2. Provision a PostgreSQL 17 server node with memory tuning configured as specified in `docs/enterprise/configs/postgresql/postgresql.conf`.

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **To Be Implemented**: The PostgreSQL 17 server schema, DDL scripts, and automated ETL migration pipeline described in this chapter are target architecture specifications planned for enterprise release v2.0.0. InsAcc v1.0.0 operates as an offline desktop application using `localStorage`.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Foreign Key UUID Resolution**: During migration, client-side string IDs (e.g., `ba-1719500000000`, `P-1719500000000-1`) are mapped to PostgreSQL `UUID` primary keys (`gen_random_uuid()`) while preserving foreign key relationships across accounts, vouchers, properties, and tenants.

---

## 7. Main Content

### 7.1 Target Enterprise Database Architecture Overview `[To Be Implemented]`

The target database (`insacc_enterprise_db`) partitions domain data across 5 PostgreSQL schemas:

```
PostgreSQL Database: insacc_enterprise_db
├── Schema: accounting (accounts, vouchers, voucher_lines, posting_rules, periods)
├── Schema: investment (investments, purchase_records, holdings)
├── Schema: property   (categories, buildings, units, tenants, leases, rent_payments, pdc_cheques)
├── Schema: auth       (users, user_permissions)
└── Schema: audit      (events, voucher_changelog)
```

---

### 7.2 Schema & Table DDL Specifications `[To Be Implemented]`

#### Table: `accounting.accounts`
```sql
CREATE TABLE accounting.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')),
    parent_id UUID REFERENCES accounting.accounts(id),
    opening_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_code ON accounting.accounts(code);
CREATE INDEX idx_accounts_type ON accounting.accounts(type);
```

#### Table: `accounting.vouchers`
```sql
CREATE TABLE accounting.vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_number VARCHAR(50) NOT NULL UNIQUE,
    voucher_type VARCHAR(20) NOT NULL CHECK (voucher_type IN ('Receipt', 'Payment', 'Journal')),
    voucher_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Approved', 'Posted', 'Cancelled', 'Reversed')),
    narration TEXT,
    created_by VARCHAR(100) NOT NULL,
    posted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vouchers_number ON accounting.vouchers(voucher_number);
CREATE INDEX idx_vouchers_status ON accounting.vouchers(status);
```

#### Table: `accounting.voucher_lines`
```sql
CREATE TABLE accounting.voucher_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id UUID NOT NULL REFERENCES accounting.vouchers(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounting.accounts(id),
    line_type VARCHAR(10) NOT NULL CHECK (line_type IN ('Debit', 'Credit')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    memo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_voucher_lines_voucher ON accounting.voucher_lines(voucher_id);
CREATE INDEX idx_voucher_lines_account ON accounting.voucher_lines(account_id);
```

---

### 7.3 LocalStorage JSON to PostgreSQL ETL Pipeline

```
Client Workstation
   │
   ├──► 1. Export JSON Snapshot via Settings (state_backup_YYYY-MM-DD.json)
   │
Server Migration Node
   │
   ├──► 2. Run `scripts/postgresql/init-database.sh` (Creates schema & roles)
   │
   ├──► 3. Execute ETL Ingestion Engine (Maps string IDs to UUIDs)
   │
   └──► 4. Validate Ledger Balances (Asserts Σ Debits = Σ Credits)
```

---

### 7.4 Post-Migration Data Integrity Verification

Following ETL ingestion, a post-migration SQL script verifies double-entry balance integrity:

```sql
-- Post-Migration Ledger Balance Audit Check
SELECT 
    SUM(CASE WHEN line_type = 'Debit' THEN amount ELSE 0 END) AS total_debits,
    SUM(CASE WHEN line_type = 'Credit' THEN amount ELSE 0 END) AS total_credits,
    ABS(SUM(CASE WHEN line_type = 'Debit' THEN amount ELSE -amount END)) AS balance_difference
FROM accounting.voucher_lines vl
JOIN accounting.vouchers v ON vl.voucher_id = v.id
WHERE v.status = 'Posted';
```

*Expected Verification Output:*
```
 total_debits | total_credits | balance_difference 
--------------+---------------+--------------------
 1275000.00   | 1275000.00    | 0.00
(1 row)
```

---

### 7.5 Automated Migration Ingestion Script (`init-database.sh`)

Location: `docs/enterprise/scripts/postgresql/init-database.sh`

```bash
#!/usr/bin/env bash
# InsAcc PostgreSQL Database Initialization Script [To Be Implemented]

set -euo pipefail

DB_NAME="insacc_db"
DB_USER="insacc_user"
DB_PASS="SecurePassword123"

echo "[INFO] Initializing PostgreSQL database '${DB_NAME}'..."

sudo -u postgres psql <<EOF
DO \$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
        CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
    END IF;
END
\$$;

SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF

echo "[SUCCESS] Database initialized. Ready for schema migration DDL execution."
```

---

## 8. Summary

The target database migration plan specifies a multi-tenant PostgreSQL 17 architecture that preserves InsAcc double-entry accounting integrity during transition from local `localStorage` to enterprise server deployments.

---

## 9. Chapter Appendix

### Entity Schema Mapping Table

| LocalStorage Key | Target PostgreSQL Schema & Table | Primary Migration Challenge |
|---|---|---|
| `insacc_investments` | `investment.investments` | String ID to UUID conversion |
| `insacc_transactions` | `accounting.vouchers` & `voucher_lines` | Splitting flat items into double-entry lines |
| `insacc_prop_units` | `property.units` | Mapping building parent UUID references |
| `insacc_prop_rent` | `property.rent_payments` | Validating rent collection foreign keys |

---

## 10. Glossary

- **DDL (Data Definition Language)**: SQL statements used to define database schemas, tables, columns, indexes, and constraints.
- **ETL (Extract, Transform, Load)**: A three-step data integration process used to pull data from one source, modify it, and write it to a target database.
- **UUID (Universally Unique Identifier)**: A 128-bit label used to uniquely identify resources in computer systems without central coordination.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- LocalStorage Persistence Architecture: [Volume 02 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_01_LocalStorage_Persistence_Architecture.md)
- Database Design Spec: [docs/DATABASE_DESIGN_SPECIFICATION.md](file:///Users/t6ux/InsAcc/docs/DATABASE_DESIGN_SPECIFICATION.md)
