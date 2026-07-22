#!/usr/bin/env bash
# InsAcc Automated Local Data Restoration Script
# Usage: ./restore.sh /path/to/backup/archive.tar.gz

set -euo pipefail

BACKUP_ARCHIVE="${1:-}"

if [ -z "${BACKUP_ARCHIVE}" ] || [ ! -f "${BACKUP_ARCHIVE}" ]; then
    echo "[ERROR] Valid backup archive file path required."
    echo "Usage: ./restore.sh /path/to/insacc_backup_YYYY-MM-DD.tar.gz"
    exit 1
fi

if [[ "$OSTYPE" == "darwin"* ]]; then
    STORAGE_PATH="$HOME/Library/Application Support/InsAcc"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    STORAGE_PATH="$HOME/.config/InsAcc"
else
    echo "[ERROR] Unsupported operating system: $OSTYPE"
    exit 1
fi

echo "[INFO] Restoring InsAcc state from ${BACKUP_ARCHIVE} to ${STORAGE_PATH}..."

mkdir -p "${STORAGE_PATH}"
tar -xzf "${BACKUP_ARCHIVE}" -C "${STORAGE_PATH}"

echo "[SUCCESS] Restoration complete. Launch InsAcc to verify application state."
