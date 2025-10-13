# Runbook

Ports
- HTTP: 80 (Nginx reverse proxy)
- HTTPS: 443 (TLS when domain ready)
- API upstream: 8000
- TURN: 3478 (UDP/TCP)
- TURN relays: 49152-65535/udp

First-time
- Set backend/.env and web/.env
- Start infra: docker compose up -d
- Apply Alembic migrations
- Create initial user

Health
- GET /api/health -> 200 OK
- WS /ws -> send {"type":"ping"} expect {"type":"pong"}
