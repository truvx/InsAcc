---
title: "Volume 07: Disaster Recovery Guide - Chapter 01: Backup and State Export Procedures"
document_id: "INSACC-DOC-V07-CH01"
version: "1.0.0"
release_date: "2026-07-22"
app_version: "v1.0.0"
master_architecture_ref: "docs/MASTER_ARCHITECTURE.md"
status: "Production Ready"
classification: "Commercial Enterprise Documentation"
---

# Volume 07: InsAcc Disaster Recovery Guide
## Chapter 01: Backup and State Export Procedures

> **Reference Specification**: Disaster recovery strategies and backup protocols conform to [MASTER_ARCHITECTURE.md](file:///Users/t6ux/InsAcc/docs/MASTER_ARCHITECTURE.md).

---

### 1.1 Overview

Data protection and business continuity procedures are critical for enterprise ERP installations. Because InsAcc v1.0.0 persists data locally inside browser `localStorage`, regular automated and manual backup exports prevent data loss resulting from hardware failure, operating system re-installation, or accidental client state clearing.

This chapter details the 3-2-1 backup strategy, manual JSON state export procedures, and automated client backup scripts.

---

### 1.2 The Enterprise 3-2-1 Backup Strategy

InsAcc recommends enforcing the standard **3-2-1 Backup Rule** for workstation data protection:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            3-2-1 Backup Strategy                            │
├───────────────────────────────────┬─────────────────────────────────────────┤
│  3 Copies of Data                 │ 1 Primary Working Copy + 2 Backups      │
├───────────────────────────────────┼─────────────────────────────────────────┤
│  2 Different Media Types          │ Local SSD Storage + Secure Cloud / NAS  │
├───────────────────────────────────┼─────────────────────────────────────────┤
│  1 Off-Site Location              │ Off-site encrypted Cloud Storage / Vault│
└───────────────────────────────────┴─────────────────────────────────────────┘
```

---

### 1.3 Manual JSON State Snapshot Export

Users with `Admin` or `Accounts` roles can export a full system state snapshot at any time:

1. Navigate to **Settings** -> **Data Management**.
2. Click **Export System Backup (JSON)**.
3. The system generates a formatted JSON document containing all 16 `insacc_*` keys:
   `insacc_backup_2026-07-22_143000.json`
4. The IPC bridge writes the file directly to the user's Downloads directory.
5. Copy the backup file to an off-site enterprise network share or secure cloud storage.

---

### 1.4 Automated Shell Backup Script (`scripts/backup/backup.sh`)

For automated daily backups on Linux/macOS client machines or workstation management scripts, execute `scripts/backup/backup.sh`:

```bash
#!/usr/bin/env bash
# InsAcc Automated Local Backup Script
# Usage: ./backup.sh /path/to/backup/destination

set -euo pipefail

BACKUP_DIR="${1:-$HOME/InsAcc_Backups}"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
TARGET_FILE="${BACKUP_DIR}/insacc_backup_${TIMESTAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Initiating InsAcc local state snapshot..."

# Resolve OS-specific storage path
if [[ "$OSTYPE" == "darwin"* ]]; then
    STORAGE_PATH="$HOME/Library/Application Support/InsAcc"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    STORAGE_PATH="$HOME/.config/InsAcc"
else
    echo "[ERROR] Unsupported operating system: $OSTYPE"
    exit 1
fi

if [ -d "${STORAGE_PATH}" ]; then
    tar -czf "${TARGET_FILE}" -C "${STORAGE_PATH}" .
    echo "[SUCCESS] Backup successfully created at: ${TARGET_FILE}"
else
    echo "[WARNING] Storage path not found: ${STORAGE_PATH}. Ensure InsAcc has been launched."
fi
```

---

*Next Chapter: [Chapter 02: Data Restoration and Emergency Recovery](file:///Users/t6ux/InsAcc/docs/enterprise/Volume_07_Disaster_Recovery_Guide/Chapter_02_Data_Restoration_and_Emergency_Recovery.md)*
