#!/bin/bash
# Database backup script for ChatApp
# Supports both Docker and native PostgreSQL installations
# Run this script via cron: 0 2 * * * /path/to/backup-db.sh

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/chatapp}"
POSTGRES_USER="${POSTGRES_USER:-chatapp}"
POSTGRES_DB="${POSTGRES_DB:-chatapp}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/chatapp_backup_$TIMESTAMP.sql.gz"

echo "Starting database backup at $(date)"

# Try Docker first, then fall back to native pg_dump
if command -v docker &>/dev/null && docker ps --format '{{.Names}}' 2>/dev/null | grep -q "${POSTGRES_CONTAINER:-chatapp-postgres}"; then
    echo "Using Docker pg_dump..."
    docker exec "${POSTGRES_CONTAINER:-chatapp-postgres}" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_FILE"
elif command -v pg_dump &>/dev/null; then
    echo "Using native pg_dump..."
    PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_FILE"
else
    echo "ERROR: Neither Docker nor native pg_dump found"
    exit 1
fi

# Check if backup was successful
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    echo "Backup created successfully: $BACKUP_FILE"
    echo "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo "ERROR: Backup failed or file is empty"
    exit 1
fi

# Remove old backups (older than RETENTION_DAYS)
echo "Removing backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "chatapp_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# List current backups
echo "Current backups:"
ls -lh "$BACKUP_DIR"/chatapp_backup_*.sql.gz 2>/dev/null || echo "No backups found"

echo "Backup completed at $(date)"
