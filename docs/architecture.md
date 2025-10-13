# Akirah Architecture

- Backend: FastAPI (REST + WebSocket), Postgres, Redis
- Realtime: WebSocket for messaging & signaling; WebRTC for A/V and screen share
- TURN: coturn (long-term creds)
- Web: React TS (Vite)
- Android: Kotlin, Compose, libwebrtc
- Reverse proxy: Nginx

Message over WS
- presence, typing, message, ack
Call signaling over WS
- offer, answer, candidate
