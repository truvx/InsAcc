---
title: "Volume 07: Disaster Recovery Guide - Chapter 02: Data Restoration and Emergency Recovery"
document_id: "INSACC-DOC-V07-CH02"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 07: Disaster Recovery & Business Continuity Guide
## Chapter 02: Data Restoration and Emergency Recovery

> **Single Source of Truth Reference**: All restoration procedures, recovery algorithms, and emergency runbooks defined in this document derive strictly from [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

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
  - [7.1 Emergency Disaster Recovery Rationale & Protocols](#71-emergency-disaster-recovery-rationale--protocols)
  - [7.2 UI State Restoration via JSON Snapshot Upload](#72-ui-state-restoration-via-json-snapshot-upload)
  - [7.3 Automated Workstation Restoration Script (`restore.sh`)](#73-automated-workstation-restoration-script-restoresh)
  - [7.4 Corrupted Storage Recovery & Emergency Factory Reset](#74-corrupted-storage-recovery--emergency-factory-reset)
  - [7.5 Post-Restoration Data Integrity & Balance Verification](#75-post-restoration-data-integrity--balance-verification)
- [8. Summary](#8-summary)
- [9. Chapter Appendix](#9-chapter-appendix)
- [10. Glossary](#10-glossary)
- [11. References](#11-references)

---

## 1. Purpose

This chapter provides step-by-step procedures for restoring financial datasets, recovering from corrupted browser `localStorage` states, executing automated restoration shell scripts (`restore.sh`), and verifying post-restoration ledger integrity in InsAcc.

---

## 2. Scope

This specification covers:
- UI JSON state snapshot restoration in `Settings.tsx`.
- Automated shell script restoration (`docs/enterprise/scripts/restore/restore.sh`).
- Troubleshooting corrupted browser storage states and version mismatches.
- Hardware failure workstation replacement runbook.
- Post-restoration double-entry ledger balance verification ($\sum D = \sum C$).

Out of Scope:
- Backup strategy and cron scheduling (covered in [Volume 07 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_07_Disaster_Recovery_Guide/Chapter_01_Backup_Strategy_and_Automation.md)).
- Database migration DDL `[To Be Implemented]` (covered in [Volume 02 Chapter 03](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_03_Target_Database_Migration_Plan_[To_Be_Implemented].md)).

---

## 3. Audience

This document is authored for:
- Systems Administrators and Technical Support Engineers
- Disaster Recovery Response Teams
- Enterprise IT Helpdesk Personnel

---

## 4. Prerequisites

Before performing a data restoration:
1. Locate a verified JSON backup snapshot (`state_backup_YYYY-MM-DD.json`) or tarball archive (`insacc_backup_*.tar.gz`).
2. Log in with `Admin` role privileges.

---

## 5. Warnings & Operational Hazards

> [!WARNING]
> **EXISTING STATE OVERWRITE HAZARD**: Executing a state restoration replaces all active `insacc_*` keys in `localStorage` with the snapshot data. Any un-backed-up transactions recorded *after* the backup creation timestamp will be permanently overwritten.

---

## 6. Notes & Architecture Context

> [!NOTE]
> **Sub-15 Minute RTO Guarantee**: Because data restoration involves uncompressing local file archives or writing JSON objects directly to `localStorage`, system restoration completes in under 15 minutes without external network bottlenecks.

---

## 7. Main Content

### 7.1 Emergency Disaster Recovery Rationale & Protocols

System failure scenarios requiring data restoration include:
1. **Workstation Hardware Failure**: Physical crash of client workstation requiring deployment to a new machine.
2. **Data Storage Corruption**: Corrupted JSON strings in `localStorage` causing startup crashes.
3. **Accidental Admin Data Deletion**: Accidental invocation of system data reset.

---

### 7.2 UI State Restoration via JSON Snapshot Upload

To restore application state from a JSON backup file (`state_backup_YYYY-MM-DD.json`):

```
Open Settings Console ──► Select Data Management ──► Click [Restore JSON] ──► Upload File
```

1. Launch InsAcc $\rightarrow$ open **Settings** $\rightarrow$ select **Data Management**.
2. Click **Restore from Backup JSON**.
3. Select the target backup file (e.g., `state_backup_2026-07-22.json`).
4. System validates the snapshot schema version (`"version": "8"`).
5. Upon successful validation, the system writes all key collections to `localStorage` and reloads the application window.

---

### 7.3 Automated Workstation Restoration Script (`restore.sh`)

Location: `docs/enterprise/scripts/restore/restore.sh`

```bash
#!/usr/bin/env bash
# InsAcc Automated Workstation Restoration Script

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "[ERROR] Usage: $0 /path/to/insacc_backup_YYYY-MM-DD_HHMMSS.tar.gz"
  exit 1
fi

BACKUP_ARCHIVE="$1"

if [ ! -f "${BACKUP_ARCHIVE}" ]; then
  echo "[ERROR] Backup archive '${BACKUP_ARCHIVE}' not found."
  exit 1
fi

# Detect OS Application Data Directory
if [[ "$OSTYPE" == "darwin"* ]]; then
  DATA_PATH="${HOME}/Library/Application Support/InsAcc"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  DATA_PATH="${HOME}/.config/InsAcc"
else
  echo "[ERROR] Unsupported OS type for automated restore script."
  exit 1
fi

mkdir -p "${DATA_PATH}"

echo "[INFO] Restoring archive ${BACKUP_ARCHIVE} to ${DATA_PATH}..."
tar -xzf "${BACKUP_ARCHIVE}" -C "${DATA_PATH}"

echo "[SUCCESS] Application data restored successfully. Relaunch InsAcc desktop application."
```

---

### 7.4 Corrupted Storage Recovery & Emergency Factory Reset

If corrupted data prevents InsAcc from rendering the Settings view:

1. Open DevTools inside Electron: `Ctrl + Shift + I` (Windows/Linux) or `Cmd + Option + I` (macOS).
2. Open the **Console** tab.
3. Execute the emergency storage wipe command:
   ```javascript
   localStorage.clear();
   location.reload();
   ```
4. InsAcc re-initializes factory default seed datasets.
5. Proceed to Section 7.2 to restore the latest JSON backup snapshot.

---

### 7.5 Post-Restoration Data Integrity & Balance Verification

Following any data restoration procedure, administrators MUST verify general ledger balance integrity:

```
Open Reports ──► Select Trial Balance Tree ──► Verify Balance Check: Total Debits == Total Credits
```

1. Navigate to **Reports** $\rightarrow$ **Trial Balance Tree**.
2. Assert that **Total Debits** equal **Total Credits** ($\sum D = \sum C$).
3. Verify that the ending bank balance matches bank statements as of the backup timestamp.

---

## 8. Summary

The InsAcc restoration framework guarantees rapid disaster recovery through UI JSON snapshot uploads, automated `restore.sh` shell scripts, and emergency DevTools storage reset procedures. With built-in post-restoration Trial Balance checks ($\sum D = \sum C$), enterprise deployments ensure zero financial data drift after emergency recovery.

---

## 9. Chapter Appendix

### Emergency Disaster Recovery Runbook Checklist

| Sequence Step | Disaster Recovery Task | Operational Target | Verification Status |
|---|---|---|---|
| **DR-01** | Replace Workstation Hardware | Provision new workstation | OS Installed |
| **DR-02** | Install Client Executable | Run installer executable | App Launches |
| **DR-03** | Restore Data Archive | Run `restore.sh` or UI Restore | Storage Populated |
| **DR-04** | Verify Schema Version | Check `insacc_clear_version` | Version = `'8'` |
| **DR-05** | Audit Trial Balance | Assert $\sum D = \sum C$ in Reports | **✓ Balanced** |

---

## 10. Glossary

- **Cold Restore**: Restoring data to a fresh, newly provisioned workstation after a complete hardware failure.
- **RTO (Recovery Time Objective)**: The targeted duration of time and a service level within which a business process must be restored after a disaster.

---

## 11. References

- Master Architecture Specification: [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md)
- Backup Strategy & Automation: [Volume 07 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_07_Disaster_Recovery_Guide/Chapter_01_Backup_Strategy_and_Automation.md)
- LocalStorage Persistence: [Volume 02 Chapter 01](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_01_LocalStorage_Persistence_Architecture.md)
- Schema Versioning: [Volume 02 Chapter 02](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_02_Data_Management_Guide/Chapter_02_Schema_Versioning_and_Migrations.md)
