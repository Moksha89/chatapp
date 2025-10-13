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
WebRTC call signaling (MVP)
- Signaling: Reuses /ws?conversation_id=... messages with types: call-offer, call-answer, call-candidate, call-end.
- Frontend: CallPanel in web/src/CallPanel.tsx; helpers in web/src/webrtc.ts; integrated in ChatPage.
- TURN/STUN: Configure via web/.env.example: VITE_TURN_URL, VITE_TURN_USERNAME, VITE_TURN_PASSWORD; falls back to Google STUN if unset.
- Manual test:
  1) Open two tabs http://93.127.142.206, login as two users, join same conversation.
  2) Tab A: Start Call; grant mic/camera.
  3) Tab B: Answer; verify remote video/audio both ways.
  4) End on either tab; verify teardown.
- Troubleshooting:
  - If media doesn’t connect: verify TURN 3478 reachability; check browser console for ICE failures; try STUN-only by clearing TURN env.
  - Ensure Nginx proxies /ws with Upgrade headers; see infra/nginx/nginx.conf.
