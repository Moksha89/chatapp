# WhatsApp Business-Style Chat Application Architecture

## 1. High-Level System Architecture

```
+------------------+     +------------------+     +------------------+
|   Android App    |     |    Web Client    |     |   Other Clients  |
|    (Kotlin)      |     |     (React)      |     |    (Future)      |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         |    HTTPS/WSS          |                        |
         +------------------------+------------------------+
                                 |
                    +------------+------------+
                    |      Load Balancer      |
                    +------------+------------+
                                 |
         +------------------------+------------------------+
         |                        |                        |
+--------+---------+    +--------+---------+    +--------+---------+
|   API Gateway    |    |  WebSocket Server |    |   Media Server   |
|   (REST API)     |    |   (Socket.IO)     |    |   (File Upload)  |
+--------+---------+    +--------+---------+    +--------+---------+
         |                        |                        |
         +------------------------+------------------------+
                                 |
                    +------------+------------+
                    |    Backend Services     |
                    |      (NestJS/TS)        |
                    +------------+------------+
                                 |
         +------------------------+------------------------+
         |                        |                        |
+--------+---------+    +--------+---------+    +--------+---------+
|   PostgreSQL     |    |      Redis       |    |   Object Store   |
|   (Primary DB)   |    |  (Cache/Session) |    |   (S3/MinIO)     |
+------------------+    +------------------+    +------------------+
```

## 2. Service Architecture

### 2.1 Backend Services (NestJS Modules)

```
backend/
├── src/
│   ├── auth/                 # Authentication & Authorization
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   ├── strategies/       # JWT, Local strategies
│   │   └── guards/           # Auth guards
│   │
│   ├── users/                # User Management
│   │   ├── users.module.ts
│   │   ├── users.service.ts
│   │   ├── users.controller.ts
│   │   └── entities/
│   │
│   ├── business/             # Business Profile Management
│   │   ├── business.module.ts
│   │   ├── business.service.ts
│   │   └── business.controller.ts
│   │
│   ├── contacts/             # Contact Management
│   │   ├── contacts.module.ts
│   │   ├── contacts.service.ts
│   │   └── contacts.controller.ts
│   │
│   ├── chats/                # Chat & Message Management
│   │   ├── chats.module.ts
│   │   ├── chats.service.ts
│   │   ├── chats.controller.ts
│   │   └── messages/
│   │
│   ├── labels/               # Labels & CRM
│   │   ├── labels.module.ts
│   │   ├── labels.service.ts
│   │   └── labels.controller.ts
│   │
│   ├── quick-replies/        # Quick Reply Templates
│   │   ├── quick-replies.module.ts
│   │   └── quick-replies.service.ts
│   │
│   ├── devices/              # Device & Session Management
│   │   ├── devices.module.ts
│   │   ├── devices.service.ts
│   │   └── devices.controller.ts
│   │
│   ├── media/                # Media Upload/Download
│   │   ├── media.module.ts
│   │   ├── media.service.ts
│   │   └── media.controller.ts
│   │
│   ├── notifications/        # Push Notifications (FCM)
│   │   ├── notifications.module.ts
│   │   └── notifications.service.ts
│   │
│   ├── websocket/            # WebSocket Gateway
│   │   ├── websocket.module.ts
│   │   ├── websocket.gateway.ts
│   │   └── events/
│   │
│   └── crypto/               # E2EE Key Management (Server-side)
│       ├── crypto.module.ts
│       ├── crypto.service.ts
│       └── crypto.controller.ts
```

## 3. Data Flow Diagrams

### 3.1 Message Sending Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Sender    │     │   Backend   │     │    Redis    │     │  Recipient  │
│   Client    │     │   Server    │     │   PubSub    │     │   Client    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │ 1. Encrypt msg    │                   │                   │
       │    locally        │                   │                   │
       │                   │                   │                   │
       │ 2. Send encrypted │                   │                   │
       │    message (WS)   │                   │                   │
       │──────────────────>│                   │                   │
       │                   │                   │                   │
       │                   │ 3. Validate &     │                   │
       │                   │    store cipher   │                   │
       │                   │                   │                   │
       │                   │ 4. Publish event  │                   │
       │                   │──────────────────>│                   │
       │                   │                   │                   │
       │ 5. ACK (sent)     │                   │ 6. Notify         │
       │<──────────────────│                   │    recipient      │
       │                   │                   │──────────────────>│
       │                   │                   │                   │
       │                   │                   │ 7. Deliver        │
       │                   │                   │    ciphertext     │
       │                   │<──────────────────│──────────────────>│
       │                   │                   │                   │
       │                   │                   │                   │ 8. Decrypt
       │                   │                   │                   │    locally
       │                   │                   │                   │
       │                   │ 9. Delivery ACK   │                   │
       │                   │<──────────────────│<──────────────────│
       │                   │                   │                   │
       │ 10. Delivered     │                   │                   │
       │     status        │                   │                   │
       │<──────────────────│                   │                   │
       │                   │                   │                   │
```

### 3.2 Message Receiving Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Recipient  │     │   Backend   │     │  Database   │
│   Client    │     │   Server    │     │ (PostgreSQL)│
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1. Connect WS     │                   │
       │   (with JWT)      │                   │
       │──────────────────>│                   │
       │                   │                   │
       │                   │ 2. Validate JWT   │
       │                   │    & register     │
       │                   │    connection     │
       │                   │                   │
       │ 3. Request        │                   │
       │    pending msgs   │                   │
       │──────────────────>│                   │
       │                   │                   │
       │                   │ 4. Fetch pending  │
       │                   │    messages       │
       │                   │──────────────────>│
       │                   │                   │
       │                   │ 5. Return         │
       │                   │    ciphertext     │
       │                   │<──────────────────│
       │                   │                   │
       │ 6. Deliver        │                   │
       │    ciphertext     │                   │
       │<──────────────────│                   │
       │                   │                   │
       │ 7. Decrypt        │                   │
       │    locally        │                   │
       │                   │                   │
       │ 8. Send read      │                   │
       │    receipt        │                   │
       │──────────────────>│                   │
       │                   │                   │
       │                   │ 9. Update status  │
       │                   │──────────────────>│
       │                   │                   │
```

## 4. End-to-End Encryption (E2EE) Architecture

### 4.1 Key Management Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                           CLIENT DEVICE                                 │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────────┐    ┌─────────────────────┐                   │
│  │   Identity Key Pair │    │   Signed PreKey     │                   │
│  │   (Long-term)       │    │   Pair              │                   │
│  │                     │    │                     │                   │
│  │  Private: STORED    │    │  Private: STORED    │                   │
│  │  LOCALLY ONLY       │    │  LOCALLY ONLY       │                   │
│  │                     │    │                     │                   │
│  │  Public: Uploaded   │    │  Public: Uploaded   │                   │
│  │  to server          │    │  to server          │                   │
│  └─────────────────────┘    └─────────────────────┘                   │
│                                                                        │
│  ┌─────────────────────┐    ┌─────────────────────┐                   │
│  │   One-Time PreKeys  │    │   Session Keys      │                   │
│  │   (Ephemeral)       │    │   (Per conversation)│                   │
│  │                     │    │                     │                   │
│  │  Generated in batch │    │  Derived via X3DH   │                   │
│  │  Uploaded to server │    │  + Double Ratchet   │                   │
│  │  Used once & deleted│    │                     │                   │
│  └─────────────────────┘    └─────────────────────┘                   │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    SECURE KEY STORAGE                            │  │
│  │  Android: EncryptedSharedPreferences / Android Keystore         │  │
│  │  Web: IndexedDB + Web Crypto API                                 │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Public Keys Only
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                              SERVER                                     │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    PUBLIC KEY STORE                              │  │
│  │                                                                  │  │
│  │  - User Identity Public Keys                                     │  │
│  │  - Device Public Keys                                            │  │
│  │  - Signed PreKey Public Keys                                     │  │
│  │  - One-Time PreKey Public Keys (consumed on use)                 │  │
│  │                                                                  │  │
│  │  NOTE: Server NEVER has access to private keys                   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    MESSAGE STORE                                 │  │
│  │                                                                  │  │
│  │  - Ciphertext only (encrypted message content)                   │  │
│  │  - Message metadata (sender, recipient, timestamp)               │  │
│  │  - Delivery status                                               │  │
│  │                                                                  │  │
│  │  NOTE: Server CANNOT decrypt message content                     │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Session Establishment (X3DH Protocol)

```
┌─────────────┐                              ┌─────────────┐
│   Alice     │                              │    Bob      │
│  (Sender)   │                              │ (Recipient) │
└──────┬──────┘                              └──────┬──────┘
       │                                            │
       │  1. Alice wants to message Bob             │
       │                                            │
       │  2. Fetch Bob's key bundle from server:    │
       │     - Identity Key (IKb)                   │
       │     - Signed PreKey (SPKb)                 │
       │     - One-Time PreKey (OPKb) [if available]│
       │                                            │
       │  3. Alice generates ephemeral key (EKa)    │
       │                                            │
       │  4. X3DH Key Agreement:                    │
       │     DH1 = DH(IKa, SPKb)                    │
       │     DH2 = DH(EKa, IKb)                     │
       │     DH3 = DH(EKa, SPKb)                    │
       │     DH4 = DH(EKa, OPKb) [if OPK used]      │
       │                                            │
       │     SK = KDF(DH1 || DH2 || DH3 || DH4)     │
       │                                            │
       │  5. Initialize Double Ratchet with SK      │
       │                                            │
       │  6. Encrypt first message                  │
       │                                            │
       │  7. Send to Bob:                           │
       │     - Alice's Identity Key (IKa)           │
       │     - Ephemeral Key (EKa)                  │
       │     - OPK identifier (if used)             │
       │     - Ciphertext                           │
       │─────────────────────────────────────────────>
       │                                            │
       │                                            │  8. Bob performs same
       │                                            │     X3DH calculation
       │                                            │
       │                                            │  9. Bob derives SK
       │                                            │
       │                                            │ 10. Bob initializes
       │                                            │     Double Ratchet
       │                                            │
       │                                            │ 11. Bob decrypts
       │                                            │     message
       │                                            │
```

### 4.3 Double Ratchet Algorithm

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DOUBLE RATCHET STATE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    DH RATCHET (Asymmetric)                       │   │
│  │                                                                  │   │
│  │  - Each party has a DH key pair                                  │   │
│  │  - Keys rotate with each message exchange                        │   │
│  │  - Provides forward secrecy                                      │   │
│  │                                                                  │   │
│  │  Alice sends: Uses Bob's public DH key                           │   │
│  │  Bob receives: Generates new DH key pair, sends public key       │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    ROOT CHAIN                                    │   │
│  │                                                                  │   │
│  │  Root Key (RK) → KDF → New Root Key + Chain Key                  │   │
│  │                                                                  │   │
│  │  Updated on each DH ratchet step                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│              ┌───────────────┴───────────────┐                          │
│              ▼                               ▼                          │
│  ┌─────────────────────────┐    ┌─────────────────────────┐            │
│  │    SENDING CHAIN        │    │   RECEIVING CHAIN       │            │
│  │                         │    │                         │            │
│  │  Chain Key → KDF →      │    │  Chain Key → KDF →      │            │
│  │  Message Key + New CK   │    │  Message Key + New CK   │            │
│  │                         │    │                         │            │
│  │  Each message uses      │    │  Each message uses      │            │
│  │  unique message key     │    │  unique message key     │            │
│  └─────────────────────────┘    └─────────────────────────┘            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 5. Database Schema (ERD)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USERS                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ id (PK)          │ UUID                                                 │
│ phone_number     │ VARCHAR(20) UNIQUE                                   │
│ display_name     │ VARCHAR(100)                                         │
│ profile_photo    │ VARCHAR(255)                                         │
│ is_business      │ BOOLEAN DEFAULT FALSE                                │
│ status           │ VARCHAR(255)                                         │
│ last_seen        │ TIMESTAMP                                            │
│ created_at       │ TIMESTAMP                                            │
│ updated_at       │ TIMESTAMP                                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│        DEVICES          │ │   BUSINESS_PROFILES     │ │       CONTACTS          │
├─────────────────────────┤ ├─────────────────────────┤ ├─────────────────────────┤
│ id (PK)                 │ │ id (PK)                 │ │ id (PK)                 │
│ user_id (FK)            │ │ user_id (FK) UNIQUE     │ │ owner_id (FK)           │
│ device_id               │ │ business_name           │ │ contact_user_id (FK)    │
│ device_name             │ │ description             │ │ name                    │
│ device_type             │ │ category                │ │ phone_number            │
│ identity_public_key     │ │ address                 │ │ email                   │
│ signed_prekey_public    │ │ business_hours          │ │ notes                   │
│ signed_prekey_signature │ │ email                   │ │ last_contact_date       │
│ is_primary              │ │ website                 │ │ created_at              │
│ last_seen               │ │ created_at              │ │ updated_at              │
│ is_active               │ │ updated_at              │ └─────────────────────────┘
│ created_at              │ └─────────────────────────┘
│ updated_at              │
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│     ONE_TIME_PREKEYS    │
├─────────────────────────┤
│ id (PK)                 │
│ device_id (FK)          │
│ key_id                  │
│ public_key              │
│ is_used                 │
│ created_at              │
└─────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              CHATS                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ id (PK)          │ UUID                                                 │
│ type             │ ENUM('direct', 'group')                              │
│ name             │ VARCHAR(100) -- for groups                           │
│ created_at       │ TIMESTAMP                                            │
│ updated_at       │ TIMESTAMP                                            │
└─────────────────────────────────────────────────────────────────────────┘
            │
            ├───────────────────────────────────┐
            ▼                                   ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│   CHAT_PARTICIPANTS     │         │       MESSAGES          │
├─────────────────────────┤         ├─────────────────────────┤
│ id (PK)                 │         │ id (PK)                 │
│ chat_id (FK)            │         │ chat_id (FK)            │
│ user_id (FK)            │         │ sender_id (FK)          │
│ role                    │         │ sender_device_id (FK)   │
│ joined_at               │         │ ciphertext              │
│ last_read_at            │         │ type                    │
└─────────────────────────┘         │ status                  │
                                    │ created_at              │
                                    │ delivered_at            │
                                    │ read_at                 │
                                    └─────────────────────────┘

┌─────────────────────────┐         ┌─────────────────────────┐
│        LABELS           │         │      CHAT_LABELS        │
├─────────────────────────┤         ├─────────────────────────┤
│ id (PK)                 │         │ id (PK)                 │
│ user_id (FK)            │◄────────│ label_id (FK)           │
│ name                    │         │ chat_id (FK)            │
│ color                   │         │ created_at              │
│ created_at              │         └─────────────────────────┘
│ updated_at              │
└─────────────────────────┘

┌─────────────────────────┐         ┌─────────────────────────┐
│     QUICK_REPLIES       │         │    REFRESH_TOKENS       │
├─────────────────────────┤         ├─────────────────────────┤
│ id (PK)                 │         │ id (PK)                 │
│ user_id (FK)            │         │ user_id (FK)            │
│ shortcode               │         │ device_id (FK)          │
│ message                 │         │ token_hash              │
│ created_at              │         │ expires_at              │
│ updated_at              │         │ created_at              │
└─────────────────────────┘         └─────────────────────────┘

┌─────────────────────────┐
│     WEB_SESSIONS        │
├─────────────────────────┤
│ id (PK)                 │
│ pairing_code            │
│ user_id (FK)            │
│ device_id (FK)          │
│ status                  │
│ expires_at              │
│ created_at              │
└─────────────────────────┘
```

## 6. WebSocket Events

### 6.1 Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `message:send` | `{ chatId, ciphertext, type, tempId }` | Send encrypted message |
| `message:delivered` | `{ messageId }` | Acknowledge message delivery |
| `message:read` | `{ chatId, messageIds[] }` | Mark messages as read |
| `typing:start` | `{ chatId }` | User started typing |
| `typing:stop` | `{ chatId }` | User stopped typing |
| `presence:online` | `{}` | User is online |
| `presence:offline` | `{}` | User going offline |

### 6.2 Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `message:new` | `{ message }` | New message received |
| `message:sent` | `{ tempId, messageId, timestamp }` | Message sent confirmation |
| `message:delivered` | `{ messageId, deliveredAt }` | Message delivered to recipient |
| `message:read` | `{ messageIds[], readAt }` | Messages read by recipient |
| `typing:indicator` | `{ chatId, userId, isTyping }` | Typing indicator |
| `presence:update` | `{ userId, status, lastSeen }` | User presence update |
| `device:linked` | `{ deviceId }` | New device linked |

## 7. API Endpoints Overview

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/verify-otp` - Verify OTP
- `POST /auth/login` - Login with phone + OTP
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout (invalidate tokens)

### Users & Profiles
- `GET /users/me` - Get current user profile
- `PATCH /users/me` - Update profile
- `GET /users/:id` - Get user by ID
- `POST /users/search` - Search users by phone

### Business Profiles
- `GET /business/profile` - Get business profile
- `PUT /business/profile` - Update business profile

### Devices
- `GET /devices` - List user devices
- `POST /devices` - Register new device
- `DELETE /devices/:id` - Remove device
- `POST /devices/pair` - Pair web device via QR

### Contacts
- `GET /contacts` - List contacts
- `POST /contacts` - Add contact
- `PATCH /contacts/:id` - Update contact
- `DELETE /contacts/:id` - Delete contact
- `POST /contacts/sync` - Sync contacts from device

### Chats
- `GET /chats` - List chats
- `POST /chats` - Create new chat
- `GET /chats/:id` - Get chat details
- `GET /chats/:id/messages` - Get chat messages (paginated)

### Labels
- `GET /labels` - List labels
- `POST /labels` - Create label
- `PATCH /labels/:id` - Update label
- `DELETE /labels/:id` - Delete label
- `POST /chats/:id/labels` - Assign labels to chat
- `DELETE /chats/:id/labels/:labelId` - Remove label from chat

### Quick Replies
- `GET /quick-replies` - List quick replies
- `POST /quick-replies` - Create quick reply
- `PATCH /quick-replies/:id` - Update quick reply
- `DELETE /quick-replies/:id` - Delete quick reply

### Crypto (Key Management)
- `POST /crypto/keys` - Upload public keys
- `GET /crypto/keys/:userId` - Get user's public keys
- `GET /crypto/prekeys/:userId` - Get prekey bundle for session setup

### Media
- `POST /media/upload` - Upload media file
- `GET /media/:id` - Get media (signed URL)

## 8. Security Considerations

### 8.1 Transport Security
- All communications over HTTPS/WSS
- TLS 1.3 preferred
- Certificate pinning on mobile apps

### 8.2 Authentication Security
- Short-lived access tokens (15 minutes)
- Refresh tokens stored securely
- Rate limiting on auth endpoints
- Device fingerprinting

### 8.3 E2EE Security
- Private keys never leave device
- Server stores only ciphertext
- Forward secrecy via Double Ratchet
- Key verification via safety numbers

### 8.4 Known Limitations
- Metadata (sender, recipient, timestamps) visible to server
- Group membership visible to server
- Media files encrypted but stored on server
- Push notification content may be visible to push provider

## 9. Technology Stack Summary

| Component | Technology |
|-----------|------------|
| Backend | Node.js + NestJS + TypeScript |
| Database | PostgreSQL |
| Cache | Redis |
| WebSocket | Socket.IO |
| Web Client | React + TypeScript |
| Android | Kotlin + Jetpack Compose |
| E2EE | libsodium (X25519, Ed25519, ChaCha20-Poly1305) |
| Auth | JWT + Passport.js |
| ORM | Prisma |
| API Docs | Swagger/OpenAPI |
