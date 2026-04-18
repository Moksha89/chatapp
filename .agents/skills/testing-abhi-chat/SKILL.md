# Testing Abhi Chat

## Overview
Abhi Chat is a WhatsApp-style messaging app with NestJS backend, Next.js web frontend, and Kotlin Android app. The production deployment is at https://abhi.so.

## Stack
- **Backend:** NestJS + Prisma + PostgreSQL + Redis + Socket.IO + LiveKit
- **Web:** Next.js 14 + Tailwind CSS
- **Android:** Kotlin + Jetpack Compose + Hilt + LiveKit SDK
- **Server:** 104.219.250.32 (root, Namecheap dedicated)
- **GPU Server (builds):** 173.208.243.135 (administrator)
- **Domain:** abhi.so via Cloudflare

## Devin Secrets Needed
- `PROD_SSH_PASSWORD` — root password for 104.219.250.32
- Firebase `google-services.json` and service account key (for FCM push notifications)

## How to Test

### 1. Login Flow
- Navigate to https://abhi.so
- Enter any phone number (e.g., +919999900033)
- Use OTP `123456` (DEV_OTP mock provider)
- Register with a display name
- Verify main chat screen loads

### 2. Two-User Real-Time Messaging
This is the most important test. Use Playwright to create a second browser context:

```javascript
// Register User B via API
const sendOtp = await fetch('https://abhi.so/auth/send-otp', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ phone: '+919999900044' })
});
const verifyOtp = await fetch('https://abhi.so/auth/verify-otp', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ phone: '+919999900044', otp: '123456' })
});
// If new user, register:
const register = await fetch('https://abhi.so/auth/register', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ phone: '+919999900044', otp: '123456', displayName: 'TestBeta' })
});
```

Then use socket.io-client to connect as User B and send a message:
```javascript
const { io } = require('socket.io-client');
const socket = io('https://abhi.so/chat', {
  auth: { token: userBToken },
  transports: ['polling'] // Cloudflare may block WebSocket upgrade
});
socket.emit('message:send', { chatId: '<chat-id>', text: 'Reply from Beta' });
```

**Key:** The message must appear on User A's browser WITHOUT page refresh.

### 3. Call UI Testing
- Click phone/video icon in chat header
- Verify CallDialog renders with: heading, Ringing... status, Mute/Speaker/End buttons, E2E badge
- Call should auto-end after 45s timeout if no answer
- VM has no mic/camera — call media can't be tested in headless environments

### 4. Infrastructure Verification (Shell)
```bash
# APK download
curl -s https://abhi.so/uploads/abhi-chat.apk -o /dev/null -w "%{http_code} %{content_type} %{size_download}"
# LiveKit health
ssh root@104.219.250.32 "curl -s http://localhost:7880/"
# LiveKit service
ssh root@104.219.250.32 "systemctl is-active livekit"
# OTP endpoint
curl -s https://abhi.so/auth/send-otp -X POST -H 'Content-Type: application/json' -d '{"phone":"+19999999999"}'
```

### 5. Settings + Profile Persistence
- Click avatar → Settings sidebar opens
- Edit display name → save
- Reload page → verify name persisted

## Known Limitations
- **Socket.IO namespace:** Backend uses `/chat` namespace, NOT default `/`
- **Cloudflare WebSocket:** May return 400 on WebSocket upgrade — Socket.IO falls back to polling (works fine, just higher latency)
- **Call media:** Requires HTTPS + real mic/camera. Use synthetic media fallback for headless testing
- **Android emulator:** Needs GPU server (173.208.243.135) — standard VPS won't boot the emulator
- **SSH username:** Production server uses `root`, GPU server uses `administrator`

## Common Issues
- **Stale browser cache:** After deploys, users may see old JS chunks. Add `Cache-Control: no-cache` to index.html or purge Cloudflare cache
- **OTP field names:** Backend expects `otp` not `code` in verify-otp/register endpoints
- **Register endpoint:** Requires `phone`, `otp`, AND `displayName` in body — not just displayName with auth header
