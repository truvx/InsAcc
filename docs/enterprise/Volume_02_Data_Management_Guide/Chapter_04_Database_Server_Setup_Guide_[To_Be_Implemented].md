---
title: "Volume 02: Data Management & Persistence Guide - Chapter 04: Database Server Setup Guide [To Be Implemented]"
document_id: "INSACC-DOC-V02-CH04"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v2.0.0 Target Server"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Target Architecture Specification"
classification: "Commercial Enterprise Documentation"
---

# Volume 02: Data Management & Persistence Guide
## Chapter 04: Database Server Setup Guide `[To Be Implemented]`

> **Single Source of Truth Reference**: All server provisioning rules, PostgreSQL 17 configurations, memory tuning parameters, and DDL schema deployments defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

---

## Revision History

| Version | Release Date | Primary Author | Summary of Changes | Approved By |
|---|---|---|---|---|
| 1.0.0 | 2026-07-22 | Lead Enterprise Documentation Architect | Initial publication-grade enterprise database setup specification | Chief Architecture Review Board |

---

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Scope](#2-scope)
- [3. Audience](#3-audience)
- [4. Prerequisites](#4-prerequisites)
- [5. Warnings & Operational Hazards](#5-warnings--operational-hazards)
- [6. Notes & Architecture Context](#6-notes--architecture-context)
- [7. Main Content](#7-main-content)
  - [7.1 OS Provisioning & Kernel Parameter Tuning](#71-os-provisioning--kernel-parameter-tuning)
  - [7.2 PostgreSQL 17 Package Installation](#72-postgresql-17-package-installation)
  - [7.3 Network Access Control & TLS 1.3 Encryption (`pg_hba.conf`)](#73-network-access-control--tls-13-encryption-pg_hbaconf)
  - [7.4 Performance Tuning & Memory Allocation (`postgresql.conf`)](#74-performance-tuning--memory-allocation-postgresqlconf)
  - [7.5 Multi-Schema DDL Deployment Pipeline](#75-multi-schema-ddl-deployment-pipeline)
  - [7.6 Automated Balance Validation Trigger Functions](#76-automated-balance-validation-trigger-functions)
  - [7.7 Database Backup, WAL Archiving & Point-In-Time Recovery (PITR)](#77-database-backup-wal-archiving--point-in-time-recovery-pitr)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter provides Database Administrators (DBAs) and Infrastructure Engineers with a step-by-step technical setup manual for installing, tuning, securing, and deploying PostgreSQL 17 target enterprise database servers `[To Be Implemented]`.

---

## 2. Scope

This specification covers:
- Linux kernel tuning (`sysctl.conf`, `limits.conf`) and storage options.
- PostgreSQL 17 installation via PGDG repository setup.
- Network security (`pg_hba.conf`) and TLS 1.3 encryption.
- Memory tuning parameters in `postgresql.conf`.
- Multi-schema deployment (`accounting`, `investment`, `property`, `auth`, `audit`).
- Automated double-entry balance validation triggers.
- Database backup automation (`pg_dump`) and PITR recovery.

Out of Scope:
- Desktop client `localStorage` architecture (covered in [Volume 02 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_01_LocalStorage_Persistence_Architecture.md)).

---

## 3. Audience

This document is authored for:
- Database Administrators & Infrastructure Engineers
- Systems Administrators & DevOps Leads
- Enterprise Compliance Officers

---

## 4. Prerequisites

1. Review PostgreSQL standards in [MASTER_ARCHITECTURE.md#7-postgresql-architecture](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md#7-postgresql-architecture).
2. Provision an Ubuntu 24.04 LTS or RHEL 9 server node (4 vCPU, 8 GB RAM, 100 GB SSD).

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **To Be Implemented**: The PostgreSQL 17 server setup procedures described in this chapter are target specifications for enterprise release v2.0.0.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Automated Trigger Defense**: Double-entry balance equality ($\sum D = \sum C$) is enforced directly at the database engine level via `trg_validate_voucher_posting`.

---

## 7. Main Content

### 7.1 OS Provisioning & Kernel Parameter Tuning

Optimize kernel parameters in `/etc/sysctl.d/99-postgresql.conf`:
```ini
kernel.shmmax = 18446744073709551615
kernel.shmall = 18446744073709551615
vm.overcommit_memory = 2
vm.overcommit_ratio = 80
vm.swappiness = 10
```

---

### 7.2 PostgreSQL 17 Package Installation

```bash
# Install PGDG key and repository
sudo apt-get update && sudo apt-get install -y curl ca-certificates gnupg
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/keyrings/postgresql.gpg
echo "deb [signed-by=/etc/apt/keyrings/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list
sudo apt-get update && sudo apt-get install -y postgresql-17 postgresql-contrib-17
```

---

### 7.3 Network Access Control & TLS 1.3 Encryption (`pg_hba.conf`)

Configure host-based authentication in `/etc/postgresql/17/main/pg_hba.conf`:
```ini
local   all             postgres                                peer
hostssl insacc_db       insacc_user     10.0.4.0/24             scram-sha-256
```

---

### 7.4 Performance Tuning & Memory Allocation (`postgresql.conf`)

Location: `docs/enterprise/configs/postgresql/postgresql.conf`
```ini
shared_buffers = 2GB
work_mem = 32MB
maintenance_work_mem = 512MB
effective_cache_size = 6GB
wal_level = replica
max_wal_size = 4GB
```

---

### 7.5 Multi-Schema DDL Deployment Pipeline

Deploy the 5 enterprise schemas:
```sql
CREATE SCHEMA IF NOT EXISTS accounting AUTHORIZATION insacc_user;
CREATE SCHEMA IF NOT EXISTS investment AUTHORIZATION insacc_user;
CREATE SCHEMA IF NOT EXISTS property AUTHORIZATION insacc_user;
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION insacc_user;
CREATE SCHEMA IF NOT EXISTS audit AUTHORIZATION insacc_user;
```

---

### 7.6 Automated Balance Validation Trigger Functions

```sql
CREATE OR REPLACE FUNCTION accounting.fn_validate_voucher_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_total_debit NUMERIC(15,2);
    v_total_credit NUMERIC(15,2);
BEGIN
    SELECT 
        COALESCE(SUM(CASE WHEN line_type = 'Debit' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN line_type = 'Credit' THEN amount ELSE 0 END), 0)
    INTO v_total_debit, v_total_credit
    FROM accounting.voucher_lines WHERE voucher_id = NEW.id;

    IF ABS(v_total_debit - v_total_credit) >= 0.001 THEN
        RAISE EXCEPTION 'Voucher posting rejected: Unbalanced entries. Debits (%) != Credits (%)', v_total_debit, v_total_credit;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### 7.7 Database Backup, WAL Archiving & Point-In-Time Recovery (PITR)

Automated daily backup command:
```bash
pg_dump -h localhost -U insacc_user -F c -b -v -f "/var/backups/postgresql/insacc_db_$(date +%Y-%m-%d).dump" insacc_db
```

---

## 8. Summary

Chapter 04 provides a complete database server setup manual for InsAcc Target Server v2.0.0, covering kernel tuning, security hardening, memory optimization, DDL triggers, and backup automation.

---

## 9. Chapter Appendix

### Reference Configuration Directory

| Artifact | File Location | Purpose |
|---|---|---|
| Dedicated Setup Spec | `docs/DATABASE_SERVER_SETUP_GUIDE.md` | Full database setup manual |
| PostgreSQL Config | `docs/enterprise/configs/postgresql/postgresql.conf` | Server tuning parameters |
| Authentication Config | `docs/enterprise/configs/postgresql/pg_hba.conf` | CIDR access control rules |

---

## 10. Glossary

- **DBA**: Database Administrator.
- **PL/pgSQL**: Procedural language for PostgreSQL trigger logic.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- Dedicated Server Setup Guide: [docs/DATABASE_SERVER_SETUP_GUIDE.md](file:///Users/t6ux/InsAcc/docs/DATABASE_SERVER_SETUP_GUIDE.md)
- Database Design Spec: [docs/DATABASE_DESIGN_SPECIFICATION.md](file:///Users/t6ux/InsAcc/docs/DATABASE_DESIGN_SPECIFICATION.md)
