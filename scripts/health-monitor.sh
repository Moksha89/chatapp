#!/bin/bash
# Health monitoring script for ChatApp
# Run via cron every 5 minutes: */5 * * * * /path/to/health-monitor.sh
# Checks backend health, restarts if down, logs status

set -e

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:8888}"
LOG_FILE="${LOG_FILE:-/var/log/chatapp-health.log}"
PM2_BACKEND="${PM2_BACKEND:-whatsapp-backend}"
PM2_FRONTEND="${PM2_FRONTEND:-chitchat}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

check_endpoint() {
    local url=$1
    curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000"
}

restart_service() {
    local service=$1
    log "WARN: Restarting $service..."
    pm2 restart "$service" 2>/dev/null || {
        log "ERROR: Failed to restart $service via pm2"
        return 1
    }
    sleep 5
    log "INFO: $service restarted"
}

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Check backend
BACKEND_STATUS=$(check_endpoint "$BACKEND_URL/health")
if [ "$BACKEND_STATUS" = "200" ]; then
    log "OK: Backend healthy (HTTP $BACKEND_STATUS)"
else
    log "ERROR: Backend unhealthy (HTTP $BACKEND_STATUS)"
    restart_service "$PM2_BACKEND"
    sleep 3
    BACKEND_STATUS=$(check_endpoint "$BACKEND_URL/health")
    if [ "$BACKEND_STATUS" = "200" ]; then
        log "OK: Backend recovered after restart"
    else
        log "CRITICAL: Backend still unhealthy after restart (HTTP $BACKEND_STATUS)"
    fi
fi

# Check frontend
FRONTEND_STATUS=$(check_endpoint "$FRONTEND_URL")
if [ "$FRONTEND_STATUS" = "200" ] || [ "$FRONTEND_STATUS" = "304" ]; then
    log "OK: Frontend healthy (HTTP $FRONTEND_STATUS)"
else
    log "ERROR: Frontend unhealthy (HTTP $FRONTEND_STATUS)"
    restart_service "$PM2_FRONTEND"
    sleep 3
    FRONTEND_STATUS=$(check_endpoint "$FRONTEND_URL")
    if [ "$FRONTEND_STATUS" = "200" ] || [ "$FRONTEND_STATUS" = "304" ]; then
        log "OK: Frontend recovered after restart"
    else
        log "CRITICAL: Frontend still unhealthy after restart (HTTP $FRONTEND_STATUS)"
    fi
fi

# Check database via backend health endpoint
HEALTH_BODY=$(curl -s --max-time 10 "$BACKEND_URL/health" 2>/dev/null || echo '{}')
DB_STATUS=$(echo "$HEALTH_BODY" | grep -o '"database":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
if [ "$DB_STATUS" = "connected" ]; then
    log "OK: Database connected"
else
    log "CRITICAL: Database status: $DB_STATUS"
fi

# Check disk usage
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 90 ]; then
    log "CRITICAL: Disk usage at ${DISK_USAGE}%"
elif [ "$DISK_USAGE" -gt 80 ]; then
    log "WARN: Disk usage at ${DISK_USAGE}%"
else
    log "OK: Disk usage at ${DISK_USAGE}%"
fi

# Check memory usage
MEM_USAGE=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
if [ "$MEM_USAGE" -gt 90 ]; then
    log "CRITICAL: Memory usage at ${MEM_USAGE}%"
elif [ "$MEM_USAGE" -gt 80 ]; then
    log "WARN: Memory usage at ${MEM_USAGE}%"
else
    log "OK: Memory usage at ${MEM_USAGE}%"
fi

log "--- Health check complete ---"
