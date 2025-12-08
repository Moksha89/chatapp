#!/bin/bash
# Database backup script for ChatApp
# Run this script via cron: 0 2 * * * /path/to/backup-db.sh

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/chatapp}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-chatapp-postgres}"
POSTGRES_USER="${POSTGRES_USER:-chatapp}"
POSTGRES_DB="${POSTGRES_DB:-chatapp}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/chatapp_backup_$TIMESTAMP.sql.gz"

echo "Starting database backup at $(date)"

# Create backup using pg_dump inside the container
docker exec "$POSTGRES_CONTAINER" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_FILE"

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
