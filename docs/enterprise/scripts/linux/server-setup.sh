#!/usr/bin/env bash
# InsAcc Ubuntu Server Provisioning Script [To Be Implemented]
# Target OS: Ubuntu Server 24.04 LTS

set -euo pipefail

echo "=================================================="
echo " InsAcc Enterprise Server Provisioning Script"
echo "=================================================="

# Check root privileges
if [ "$EUID" -ne 0 ]; then
    echo "[ERROR] This script must be executed as root (sudo)."
    exit 1
fi

echo "[1/4] Updating APT packages..."
apt-get update && apt-get upgrade -y

echo "[2/4] Installing Core Dependencies (Node.js 22 LTS, Nginx, PostgreSQL 17, Git, UFW)..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs nginx postgresql postgresql-contrib ufw git

echo "[3/4] Configuring UFW Firewall Rules..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "[4/4] Verifying Service Statuses..."
systemctl status nginx --no-pager
systemctl status postgresql --no-pager

echo "=================================================="
echo " Server Provisioning Complete!"
echo " Next step: Execute init-database.sh to setup PostgreSQL."
echo "=================================================="
