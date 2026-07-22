#!/usr/bin/env bash
# InsAcc Automated Local Backup Script
# Usage: ./backup.sh [destination_directory]

set -euo pipefail

BACKUP_DIR="${1:-$HOME/InsAcc_Backups}"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
TARGET_FILE="${BACKUP_DIR}/insacc_backup_${TIMESTAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Initiating InsAcc local state backup..."

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
    echo "[WARNING] Storage directory not found: ${STORAGE_PATH}. Launch InsAcc to initialize."
fi
