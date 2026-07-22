#!/usr/bin/env bash
# InsAcc PostgreSQL Database Initialization Script [To Be Implemented]

set -euo pipefail

DB_NAME="insacc_db"
DB_USER="insacc_user"
DB_PASS="SecurePassword123"

echo "[INFO] Initializing PostgreSQL database '${DB_NAME}'..."

sudo -u postgres psql <<EOF
-- Create User if not exists
DO \$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
        CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
    END IF;
END
\$$;

-- Create Database
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

-- Grant Privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF

echo "[SUCCESS] PostgreSQL Database '${DB_NAME}' successfully initialized for user '${DB_USER}'."
