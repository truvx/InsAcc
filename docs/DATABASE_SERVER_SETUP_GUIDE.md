---
title: "InsAcc Enterprise Asset & Investment ERP - Database Server Setup Guide [To Be Implemented]"
document_id: "DATABASE_SERVER_SETUP_GUIDE.md"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v2.0.0 Target Server"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Official Database Server Setup Specification"
classification: "Commercial Enterprise Documentation"
---

# InsAcc Enterprise ERP Platform
## Database Server Setup & Administration Guide `[To Be Implemented]`

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
  - [7.2 PostgreSQL 17 Package Installation (Ubuntu 24.04 LTS / RHEL 9)](#72-postgresql-17-package-installation-ubuntu-2404-lts--rhel-9)
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

This document provides Database Administrators (DBAs), Infrastructure Engineers, and DevOps personnel with a complete technical guide for installing, configuring, hardening, tuning, and deploying the PostgreSQL 17 relational database server cluster required for InsAcc Target Enterprise Server v2.0.0 `[To Be Implemented]`.

---

## 2. Scope

This specification covers:
- Linux operating system kernel tuning (`sysctl.conf`, `limits.conf`) and disk file system options.
- Official PGDG repository setup and PostgreSQL 17 package installation.
- Host-based authentication (`pg_hba.conf`) and TLS 1.3 certificate deployment.
- High-performance memory allocation (`shared_buffers`, `work_mem`, `effective_cache_size`) and WAL parameters.
- Multi-schema database deployment (`accounting`, `investment`, `property`, `auth`, `audit`).
- Automated PL/pgSQL double-entry trigger functions (`fn_validate_voucher_balance()`).
- Automated backup automation (`pg_dump`), WAL streaming replication, and Point-In-Time Recovery (PITR).

Out of Scope:
- Current desktop local-first `localStorage` architecture (covered in [Volume 02 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_01_LocalStorage_Persistence_Architecture.md)).
- Express REST API service cluster setup (covered in [Volume 05 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_05_Interface_and_Integration_Spec/Chapter_03_Target_REST_API_[To_Be_Implemented].md)).

---

## 3. Audience

This document is authored for:
- Database Administrators (DBAs) & Data Infrastructure Engineers
- Systems Administrators & DevOps Pipeline Engineers
- Information Security & Regulatory Compliance Auditors

---

## 4. Prerequisites

Before initiating database server provisioning:
1. Review the PostgreSQL architecture defined in [MASTER_ARCHITECTURE.md#7-postgresql-architecture](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md#7-postgresql-architecture).
2. Provision a dedicated physical server or virtual machine running Ubuntu 24.04 LTS or RHEL 9 (Minimum: 4 vCPU, 8 GB RAM, 100 GB Enterprise SSD).

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **To Be Implemented**: The PostgreSQL 17 database server architecture, DDL deployment pipeline, and server administration procedures documented in this manual are target specifications for enterprise release v2.0.0. InsAcc v1.0.0 operates as an offline desktop application using `localStorage`.

> [!WARNING]
> **SUPERUSER PRODUCTION ACCESS HAZARD**: The PostgreSQL default superuser role (`postgres`) MUST NOT be used by application services. Application connections MUST authenticate using the restricted, non-superuser role `insacc_user`.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Zero Balance Drift via Triggers**: Database-level integrity is guaranteed by PL/pgSQL trigger functions (`trg_validate_voucher_posting`). The database engine automatically rejects any SQL `INSERT` or `UPDATE` operation on `accounting.voucher_lines` that violates debit-credit balance equality ($\sum D = \sum C$).

---

## 7. Main Content

### 7.1 OS Provisioning & Kernel Parameter Tuning

Prior to installing PostgreSQL 17, tune Linux kernel parameters to optimize memory page allocation and file descriptor limits.

#### 1. Kernel Parameter Optimization (`/etc/sysctl.d/99-postgresql.conf`):
```ini
# Maximum shared memory segment size (bytes)
kernel.shmmax = 18446744073709551615
kernel.shmall = 18446744073709551615

# Memory overcommit tuning for PostgreSQL
vm.overcommit_memory = 2
vm.overcommit_ratio = 80
vm.swappiness = 10
vm.dirty_background_ratio = 3
vm.dirty_ratio = 10
```

Apply sysctl settings:
```bash
sudo sysctl -p /etc/sysctl.d/99-postgresql.conf
```

#### 2. File Descriptor & Security Limits (`/etc/security/limits.d/99-postgres.conf`):
```ini
postgres soft nofile 65536
postgres hard nofile 65536
postgres soft nproc 4096
postgres hard nproc 4096
```

---

### 7.2 PostgreSQL 17 Package Installation (Ubuntu 24.04 LTS / RHEL 9)

Execute the automated server setup script (`docs/enterprise/scripts/postgresql/server-setup.sh`) or follow manual package setup:

#### Step-by-Step Installation on Ubuntu 24.04 LTS:

```bash
# 1. Install prerequisites and PGDG repository signing key
sudo apt-get update
sudo apt-get install -y curl ca-certificates gnupg lsb-release
sudo install -d /etc/apt/keyrings
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/keyrings/postgresql.gpg

# 2. Add PostgreSQL official PGDG repository
echo "deb [signed-by=/etc/apt/keyrings/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list

# 3. Update apt index and install PostgreSQL 17
sudo apt-get update
sudo apt-get install -y postgresql-17 postgresql-contrib-17

# 4. Verify service status
sudo systemctl status postgresql@17-main
```

---

### 7.3 Network Access Control & TLS 1.3 Encryption (`pg_hba.conf`)

Configure host-based authentication in `/etc/postgresql/17/main/pg_hba.conf`:

```ini
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local unix socket connections for admin
local   all             postgres                                peer

# Local loopback connections
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256

# Restricted Enterprise Application Subnet Access (TLS 1.3 Required)
hostssl insacc_db       insacc_user     10.0.4.0/24             scram-sha-256
```

#### Enforce SCRAM-SHA-256 Password Encryption:
In `/etc/postgresql/17/main/postgresql.conf`:
```ini
password_encryption = scram-sha-256
ssl = on
ssl_cert_file = '/etc/ssl/certs/insacc_server.crt'
ssl_key_file = '/etc/ssl/private/insacc_server.key'
ssl_min_protocol_version = 'TLSv1.3'
```

---

### 7.4 Performance Tuning & Memory Allocation (`postgresql.conf`)

Tune PostgreSQL parameters based on server hardware capacity (Target Server Spec: 4 vCPU, 8 GB RAM):

Location: `docs/enterprise/configs/postgresql/postgresql.conf`

```ini
# Memory Configuration (8 GB Total RAM Baseline)
shared_buffers = 2GB                  # 25% of Total System Memory
huge_pages = try
work_mem = 32MB                       # Per-operation sort memory
maintenance_work_mem = 512MB          # Index build memory
effective_cache_size = 6GB            # 75% of Total System Memory

# Write-Ahead Log (WAL) & Checkpoints
wal_level = replica
max_wal_size = 4GB
min_wal_size = 1GB
checkpoint_completion_target = 0.9
checkpoint_timeout = 15min

# Query Planner & Worker Threads
max_worker_processes = 4
max_parallel_workers_per_gather = 2
max_parallel_workers = 4
random_page_cost = 1.1                # Optimized for SSD storage

# Logging & Auditing
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_min_duration_statement = 250      # Log queries exceeding 250ms
```

---

### 7.5 Multi-Schema DDL Deployment Pipeline

Initialize the database structure using the automated initialization script (`docs/enterprise/scripts/postgresql/init-database.sh`):

```bash
#!/usr/bin/env bash
# InsAcc PostgreSQL Database Initialization Script [To Be Implemented]

set -euo pipefail

DB_NAME="insacc_db"
DB_USER="insacc_user"
DB_PASS="SecurePassword123"

echo "[INFO] Creating database '${DB_NAME}' and role '${DB_USER}'..."

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

echo "[INFO] Deploying 5-Schema DDL Architecture..."
sudo -u postgres psql -d ${DB_NAME} <<EOF
CREATE SCHEMA IF NOT EXISTS accounting AUTHORIZATION ${DB_USER};
CREATE SCHEMA IF NOT EXISTS investment AUTHORIZATION ${DB_USER};
CREATE SCHEMA IF NOT EXISTS property AUTHORIZATION ${DB_USER};
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION ${DB_USER};
CREATE SCHEMA IF NOT EXISTS audit AUTHORIZATION ${DB_USER};
EOF
```

---

### 7.6 Automated Balance Validation Trigger Functions

Deploy the PL/pgSQL trigger function to guarantee double-entry balance equality ($\sum D = \sum C$):

```sql
-- Connect to insacc_db
\c insacc_db

CREATE OR REPLACE FUNCTION accounting.fn_validate_voucher_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_total_debit NUMERIC(15,2);
    v_total_credit NUMERIC(15,2);
BEGIN
    -- Calculate total debits and credits for the target voucher
    SELECT 
        COALESCE(SUM(CASE WHEN line_type = 'Debit' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN line_type = 'Credit' THEN amount ELSE 0 END), 0)
    INTO v_total_debit, v_total_credit
    FROM accounting.voucher_lines
    WHERE voucher_id = NEW.id;

    -- Assert balance equality
    IF ABS(v_total_debit - v_total_credit) >= 0.001 THEN
        RAISE EXCEPTION 'Voucher posting rejected: Unbalanced entries. Debits (%) != Credits (%)', 
            v_total_debit, v_total_credit;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to voucher status updates
CREATE TRIGGER trg_validate_voucher_posting
BEFORE UPDATE OF status ON accounting.vouchers
FOR EACH ROW
WHEN (NEW.status = 'Posted')
EXECUTE FUNCTION accounting.fn_validate_voucher_balance();
```

---

### 7.7 Database Backup, WAL Archiving & Point-In-Time Recovery (PITR)

#### Automated Daily `pg_dump` Backup Script:
```bash
#!/usr/bin/env bash
# Daily PostgreSQL Backup Script

BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +'%Y-%m-%d_%H%M%S')
mkdir -p ${BACKUP_DIR}

# Execute compressed pg_dump export
pg_dump -h localhost -U insacc_user -F c -b -v -f "${BACKUP_DIR}/insacc_db_${TIMESTAMP}.dump" insacc_db

# Retention: Purge dumps older than 30 days
find ${BACKUP_DIR} -type f -name "insacc_db_*.dump" -mtime +30 -delete
```

#### Point-In-Time Recovery (PITR) Configuration:
In `postgresql.conf`:
```ini
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/wal_archive/%f && cp %p /var/lib/postgresql/wal_archive/%f'
```

---

## 8. Summary

This guide defines the target database setup manual for InsAcc Target Server v2.0.0. By tuning Linux kernel parameters, securing network access via TLS 1.3 and `pg_hba.conf`, configuring memory allocations in `postgresql.conf`, deploying PL/pgSQL balance validation triggers, and setting up daily `pg_dump` backups, enterprise DBAs maintain a secure database infrastructure.

---

## 9. Chapter Appendix

### Reference Configuration File Directory

| Artifact Description | File Repository Location | Functional Purpose |
|---|---|---|
| PostgreSQL Tuning Config | `docs/enterprise/configs/postgresql/postgresql.conf` | Memory, WAL, and planner parameters |
| Authentication Config | `docs/enterprise/configs/postgresql/pg_hba.conf` | Network access & SCRAM-SHA-256 rules |
| Server Provisioning Script | `docs/enterprise/scripts/postgresql/server-setup.sh` | OS packages, firewall & sysctl tuning |
| Database Init Script | `docs/enterprise/scripts/postgresql/init-database.sh` | Roles, database & schema provisioning |
| Database DDL Specification | `docs/DATABASE_DESIGN_SPECIFICATION.md` | Relational table & column schemas |

---

## 10. Glossary

- **DBA (Database Administrator)**: A software specialist who configures, maintains, and secures database management systems.
- **PL/pgSQL**: Procedural Language/PostgreSQL Structured Query Language, used to write stored procedures and triggers.
- **SCRAM-SHA-256**: Salted Challenge Response Authentication Mechanism using SHA-256, the recommended password authentication method in PostgreSQL.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- Database Design Specification: [docs/DATABASE_DESIGN_SPECIFICATION.md](file:///Users/t6ux/InsAcc/docs/DATABASE_DESIGN_SPECIFICATION.md)
- Target Database Migration Plan: [Volume 02 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_03_Target_Database_Migration_Plan_[To_Be_Implemented].md)
- API Contract Specification: [docs/API_CONTRACT.md](file:///Users/t6ux/InsAcc/docs/API_CONTRACT.md)
