#!/bin/bash
# Database restore script for ChatApp
# Usage: ./restore-db.sh /path/to/backup.sql.gz

set -e

# Configuration
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-chatapp-postgres}"
POSTGRES_USER="${POSTGRES_USER:-chatapp}"
POSTGRES_DB="${POSTGRES_DB:-chatapp}"

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

# Drop and recreate database
echo "Dropping existing database..."
docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"
docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -c "CREATE DATABASE $POSTGRES_DB;"

# Restore from backup
echo "Restoring from backup..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" "$POSTGRES_DB"

echo "Restore completed at $(date)"
echo "Please restart the backend service: docker-compose restart backend"
