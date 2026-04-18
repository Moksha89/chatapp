# Testing Abhi Chat Real-Time Features

## Overview
Abhi Chat is a WhatsApp-style messaging app with NestJS backend, Next.js web frontend, and Kotlin Android app. Real-time features use Socket.IO for messaging/signaling and LiveKit for audio/video media.

## Devin Secrets Needed
- `PROD_SSH_PASSWORD` — root password for production server (104.219.250.32)
- `GPU_SERVER_PASSWORD` — password for GPU server used for Android emulator testing (173.208.243.135)

## Test Environment
- Production: https://abhi.so (Cloudflare HTTPS)
- Backend: NestJS on port 3000 (proxied via nginx)
- OTP: mock mode, code `123456` for any phone number
- Test users: TestAlpha (+919999900033), TestBeta (+919999900044)
- Socket.IO namespace: `/chat` (NOT root `/`)

## Two-User Testing Approach

Single browser can only hold one authenticated session. Use **socket.io-client** (Node.js) for the second user:

```javascript
const io = require('socket.io-client');
// Get token via REST
const token = await getTokenViaOTP('+919999900044');
// Connect to /chat namespace with auth
const socket = io('https://abhi.so/chat', {
  auth: { token },
  transports: ['polling', 'websocket'],
});
// CRITICAL: Send heartbeats every 25s or server marks user stale after 60s
setInterval(() => socket.emit('heartbeat'), 25000);
```

**Important:** The backend heartbeat check (`@SubscribeMessage('heartbeat')`) marks users as stale/disconnected after 60s without heartbeat. Always include heartbeat in socket.io-client listeners.

## Key Test Procedures

### Real-Time Messaging
1. Log in as User A in browser
2. Start socket.io-client listener as User B (with heartbeat)
3. User A sends message via browser
4. Verify User B receives `message:new` event via socket
5. User B sends message via `socket.emit('message:send', { chatId, text })`
6. Verify message appears on User A's browser without refresh

### Call Signaling
1. Start socket.io-client for User B with `call:incoming` listener
2. Click voice/video call button in browser (User A)
3. Verify User B receives `call:incoming` with fields: `callerId`, `callerName`, `chatId`, `type`, `livekitRoom`
4. Verify caller sees CallDialog with "Ringing...", Mute/Speaker/End buttons, E2E badge

### Call Timeout (45s)
1. Initiate call from browser
2. Do NOT answer on User B
3. Wait 45 seconds
4. Verify User B receives `call:timeout` event
5. Verify caller's CallDialog auto-dismisses
6. Verify `call:ended` event follows timeout

### PiP Mode
- PiP minimize button only appears when `callState === 'connected'`
- Connected state requires actual LiveKit media connection (mic/camera)
- On VMs without mic/camera: verify via code review of CallDialog.tsx lines 206-248
- On real devices: click minimize button -> verify floating window at bottom-right

## Common Issues

### Socket disconnects silently
- Root cause: Missing heartbeat. Backend heartbeat check runs every 30s, marks stale after 60s.
- Fix: Always send `socket.emit('heartbeat')` every 25s.

### Messages not delivered in real-time
- Check Socket.IO namespace — must be `/chat`, not root `/`
- Check frontend `activeChatRef` — stale closures can cause messages to be silently dropped
- Check backend logs for `message:new` emission

### Calls end immediately
- Check for stale call records in DB (status 'ringing' or 'active' from failed calls)
- Backend `calls.service.ts` should auto-clean stale calls before creating new ones
- Check `targetUserId` is correctly passed through navigation chain

### getUserMedia fails
- On HTTP: WebRTC requires HTTPS for mic/camera access
- On VMs: No physical audio hardware — use synthetic fallback stream for testing
- Check nginx `Permissions-Policy` header — must allow `camera=(self), microphone=(self)`

## File Logging for Background Listeners
Write socket.io-client output to a file (not just stdout) for reliable capture:
```javascript
const fs = require('fs');
function log(msg) { fs.appendFileSync('/tmp/test-output.log', `${msg}\n`); }
```

## Android Emulator Testing
- GPU server (173.208.243.135) has RTX A6000 + Android SDK installed
- Use `adb` commands for input since Compose text fields may not accept `adb shell input text`
- Token injection via `adb shell am start` with intent extras works for bypassing login
- Emulator doesn't fully support background FCM — test push notifications on real devices
