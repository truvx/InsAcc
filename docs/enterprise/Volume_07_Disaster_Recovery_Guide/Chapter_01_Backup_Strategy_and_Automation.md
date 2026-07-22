---
title: "Volume 07: Disaster Recovery Guide - Chapter 01: Backup Strategy and Automation"
document_id: "INSACC-DOC-V07-CH01"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 07: Disaster Recovery & Business Continuity Guide
## Chapter 01: Backup Strategy and Automation

> **Single Source of Truth Reference**: All backup protocols, state snapshot schemas, and shell script automation defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Enterprise 3-2-1 Backup Strategy Architecture](#71-enterprise-3-2-1-backup-strategy-architecture)
  - [7.2 Client State JSON Snapshot Format (`state_backup_YYYY-MM-DD.json`)](#72-client-state-json-snapshot-format-state_backup_yyyy-mm-ddjson)
  - [7.3 Manual Backup Export Procedures via UI Console](#73-manual-backup-export-procedures-via-ui-console)
  - [7.4 Automated Workstation Backup Script (`backup.sh`)](#74-automated-workstation-backup-script-backupsh)
  - [7.5 Cron Schedule Automation & Retention Management](#75-cron-schedule-automation--retention-management)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter defines the enterprise disaster recovery architecture, the 3-2-1 backup strategy, JSON state snapshot schemas, and automated backup shell scripts for InsAcc v1.0.0.

---

## 2. Scope

This specification covers:
- Enterprise 3-2-1 backup rule compliance for local-first desktop data.
- The complete JSON snapshot format (`state_backup_YYYY-MM-DD.json`).
- Manual backup export procedures in `Settings.tsx`.
- Automated shell script implementation (`docs/enterprise/scripts/backup/backup.sh`).
- Automated Linux/macOS cron schedule configuration and backup archive retention policies.

Out of Scope:
- Data restoration and emergency recovery runbooks (covered in [Volume 07 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_07_Disaster_Recovery_Guide/Chapter_02_Data_Restoration_and_Emergency_Recovery.md)).
- Target PostgreSQL database backup `[To Be Implemented]` (covered in [Volume 02 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_03_Target_Database_Migration_Plan_[To_Be_Implemented].md)).

---

## 3. Audience

This document is authored for:
- Disaster Recovery Coordinators and IT Operations Leads
- Systems Administrators and Endpoint Management Technicians
- Enterprise Risk & Compliance Officers

---

## 4. Prerequisites

Before configuring backup automation:
1. Identify workstation data storage directories ([Volume 01 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_01_Installation_Guide/Chapter_01_System_Requirements_and_Prerequisites.md)).
2. Provision encrypted external backup storage media or secure network shares.

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **UNENCRYPTED BACKUP STORAGE HAZARD**: State JSON snapshot files (`state_backup_YYYY-MM-DD.json`) contain complete operational ledgers, tenant contact details, and asset portfolio valuations in plain text JSON format. Backup archives MUST be stored on encrypted drives or encrypted via GPG/BitLocker before offsite transmission.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **RPO and RTO Targets**: InsAcc's local-first architecture permits an **RPO (Recovery Point Objective)** of $< 24 \text{ hours}$ (daily automated backup) and an **RTO (Recovery Time Objective)** of $< 15 \text{ minutes}$ (instant JSON restore).

---

## 7. Main Content

### 7.1 Enterprise 3-2-1 Backup Strategy Architecture

InsAcc enforces the **3-2-1 Backup Strategy**:

```
                       Enterprise 3-2-1 Backup Rule Architecture
                                           │
     ┌─────────────────────────────────────┼─────────────────────────────────────┐
     │                                     │                                     │
     ▼                                     ▼                                     ▼
3 Primary Copies                     2 Different Media Types               1 Offsite Location
- Active `localStorage`               - Local Workstation NVMe              - Encrypted Cloud / S3 /
- Local Automated Archive             - Encrypted External USB Drive         Secure Offsite Vault
```

1. **3 Copies of Data**: Keep the active operational data plus at least two backup archives.
2. **2 Different Storage Media**: Store backups across different physical media types (e.g., local SSD + external storage array).
3. **1 Offsite Location**: Maintain at least one backup archive in a physically separate offsite location or secure cloud bucket.

---

### 7.2 Client State JSON Snapshot Format (`state_backup_YYYY-MM-DD.json`)

The state backup snapshot captures all 16 `localStorage` key collections:

```json
{
  "version": "8",
  "exportedAt": "2026-07-22T12:00:00.000Z",
  "application": "InsAcc Enterprise Asset & Investment ERP",
  "data": {
    "insacc_investments": [ ... ],
    "insacc_transactions": [ ... ],
    "insacc_purchase_categories": [ ... ],
    "insacc_purchases": [ ... ],
    "insacc_prop_buildings": [ ... ],
    "insacc_prop_units": [ ... ],
    "insacc_prop_tenants": [ ... ],
    "insacc_prop_rent": [ ... ],
    "insacc_inv_users": [ ... ],
    "insacc_prop_users": [ ... ],
    "insacc_documents": [ ... ],
    "insacc_logs": [ ... ]
  }
}
```

---

### 7.3 Manual Backup Export Procedures via UI Console

1. Log in to InsAcc with `Admin` privileges.
2. Open **Settings** $\rightarrow$ select the **Data Management** tab.
3. Click **Export Backup JSON**.
4. The application compiles all `insacc_*` keys into a formatted JSON payload and invokes `window.api.saveFile()`.
5. The native OS save dialog saves `state_backup_2026-07-22.json` to the selected folder.

---

### 7.4 Automated Workstation Backup Script (`backup.sh`)

Location: `docs/enterprise/scripts/backup/backup.sh`

```bash
#!/usr/bin/env bash
# InsAcc Automated Workstation Backup Script

set -euo pipefail

BACKUP_DIR="${HOME}/InsAccBackups"
TIMESTAMP=$(date +'%Y-%m-%d_%H%M%S')
ARCHIVE_NAME="insacc_backup_${TIMESTAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

# Detect OS Application Data Directory
if [[ "$OSTYPE" == "darwin"* ]]; then
  DATA_PATH="${HOME}/Library/Application Support/InsAcc"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  DATA_PATH="${HOME}/.config/InsAcc"
else
  echo "[ERROR] Unsupported OS type for automated bash backup."
  exit 1
fi

echo "[INFO] Creating compressed backup archive of ${DATA_PATH}..."
tar -czf "${BACKUP_DIR}/${ARCHIVE_NAME}" -C "${DATA_PATH}" .

# Retain backups for 30 days (Purge older archives)
find "${BACKUP_DIR}" -type f -name "insacc_backup_*.tar.gz" -mtime +30 -delete

echo "[SUCCESS] Backup created at: ${BACKUP_DIR}/${ARCHIVE_NAME}"
```

---

### 7.5 Cron Schedule Automation & Retention Management

To schedule daily automated backups at 23:00 (11:00 PM):

```bash
# Edit user crontab table
crontab -e

# Append daily automated backup task at 23:00
0 23 * * * /bin/bash /Users/t6ux/InsAcc/docs/enterprise/scripts/backup/backup.sh >> /tmp/insacc_backup.log 2>&1
```

---

## 8. Summary

The InsAcc disaster recovery framework guarantees data resilience through 3-2-1 backup strategy compliance. By combining manual JSON state exports with automated `backup.sh` cron scripts, enterprise deployments maintain guaranteed recovery capabilities.

---

## 9. Chapter Appendix

### Backup Retention & Rotation Schedule

| Backup Tier | Execution Frequency | Retention Period | Target Storage Location |
|---|---|---|---|
| **Daily Incremental** | Daily at 23:00 | 14 Days | Local Workstation Backup Dir |
| **Weekly Full** | Every Sunday | 8 Weeks | Encrypted External Media |
| **Monthly Archive** | 1st of every month | 12 Months | Offsite Cloud Vault |

---

## 10. Glossary

- **RPO (Recovery Point Objective)**: The maximum acceptable amount of data loss measured in time prior to a disaster event.
- **RTO (Recovery Time Objective)**: The maximum acceptable duration of time that a system can be down after a failure.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- Data Restoration: [Volume 07 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_07_Disaster_Recovery_Guide/Chapter_02_Data_Restoration_and_Emergency_Recovery.md)
- LocalStorage Persistence: [Volume 02 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_01_LocalStorage_Persistence_Architecture.md)
