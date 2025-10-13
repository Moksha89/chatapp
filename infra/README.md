# Infra

Services via docker-compose:
- Postgres (port 5432)
- Redis (port 6379)
- coturn (3478 UDP/TCP, 49152-65535/udp)
- Nginx reverse proxy (80, 443)

Usage
- Copy example envs to real envs.
- `docker compose up -d`
