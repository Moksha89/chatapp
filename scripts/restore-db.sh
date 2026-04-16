#!/bin/bash
# Database restore script for ChatApp
# Supports both Docker and native PostgreSQL installations
# Usage: ./restore-db.sh /path/to/backup.sql.gz

set -e

# Configuration
POSTGRES_USER="${POSTGRES_USER:-chatapp}"
POSTGRES_DB="${POSTGRES_DB:-chatapp}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo "Example: $0 /var/backups/chatapp/chatapp_backup_20231201_020000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "WARNING: This will overwrite the current database!"
echo "Backup file: $BACKUP_FILE"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

echo "Starting database restore at $(date)"

# Try Docker first, then fall back to native psql
if command -v docker &>/dev/null && docker ps --format '{{.Names}}' 2>/dev/null | grep -q "${POSTGRES_CONTAINER:-chatapp-postgres}"; then
    echo "Using Docker psql..."
    docker exec "${POSTGRES_CONTAINER:-chatapp-postgres}" psql -U "$POSTGRES_USER" -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"
    docker exec "${POSTGRES_CONTAINER:-chatapp-postgres}" psql -U "$POSTGRES_USER" -c "CREATE DATABASE $POSTGRES_DB;"
    gunzip -c "$BACKUP_FILE" | docker exec -i "${POSTGRES_CONTAINER:-chatapp-postgres}" psql -U "$POSTGRES_USER" "$POSTGRES_DB"
elif command -v psql &>/dev/null; then
    echo "Using native psql..."
    PGPASSWORD="${POSTGRES_PASSWORD:-}" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"
    PGPASSWORD="${POSTGRES_PASSWORD:-}" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -c "CREATE DATABASE $POSTGRES_DB;"
    gunzip -c "$BACKUP_FILE" | PGPASSWORD="${POSTGRES_PASSWORD:-}" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" "$POSTGRES_DB"
else
    echo "ERROR: Neither Docker nor native psql found"
    exit 1
fi

echo "Restore completed at $(date)"
echo "Please restart the backend service: pm2 restart whatsapp-backend"
