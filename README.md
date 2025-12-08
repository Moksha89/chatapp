# WhatsApp Business-Style Chat Application

A comprehensive WhatsApp Business-style chat system with Android app, Web client, and backend with end-to-end encrypted messaging support.

## Project Structure

```
chatapp/
├── backend/          # NestJS backend API
├── web/              # React web client
├── android/          # Android app (Kotlin)
└── docs/             # Documentation
    ├── ARCHITECTURE.md
    └── SECURITY.md
```

## Phase 1 - Current Implementation

This is Phase 1 of the implementation which includes:

- **Backend**: NestJS with TypeScript
  - Authentication (OTP-based login/registration)
  - User management
  - Device management (multi-device support)
  - Business profiles
  - Contacts management
  - Chat & messaging (plaintext for now)
  - Labels & quick replies
  - WebSocket/Socket.IO for real-time messaging
  - Crypto module (placeholder for E2EE)
  - Media upload support

- **Web Client**: React with TypeScript
  - WhatsApp-style UI
  - Login/registration flow
  - Chat list sidebar
  - Real-time messaging
  - Typing indicators
  - Message status (sent/delivered/read)

- **Android App**: Kotlin with Jetpack Compose
  - Clean architecture (data/domain/presentation layers)
  - Login screen
  - Chat list screen
  - Chat screen with messages
  - Material 3 design

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Android Studio (for Android development)

### Backend Setup

```bash
cd backend
npm install
npm run start:dev
```

The backend will start at `http://localhost:3000`

API documentation is available at `http://localhost:3000/api/docs`

### Web Client Setup

```bash
cd web
npm install
npm run dev
```

The web client will start at `http://localhost:5173`

### Android App Setup

1. Open the `android` folder in Android Studio
2. Sync Gradle files
3. Run on emulator or device

Note: The Android app connects to `http://10.0.2.2:3000` by default (localhost for Android emulator)

## Demo Users

For testing, you can use the following demo credentials:

**User 1 (Regular User):**
- Phone: `+1234567890`
- Name: Alice Demo

**User 2 (Business User):**
- Phone: `+0987654321`
- Name: Bob Business

### Login Flow

1. Enter phone number
2. Click "Send OTP"
3. In development mode, the OTP will be displayed in the UI and logged to the backend console
4. Enter the OTP to login
5. If the user doesn't exist, you'll be prompted to register

## API Endpoints

### Authentication
- `POST /auth/send-otp` - Send OTP to phone number
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with OTP
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout

### Users
- `GET /users/me` - Get current user profile
- `PATCH /users/me` - Update profile
- `GET /users/:id` - Get user by ID
- `POST /users/search` - Search users by phone

### Chats
- `GET /chats` - List chats
- `POST /chats` - Create chat
- `GET /chats/:id` - Get chat details
- `GET /chats/:id/messages` - Get messages
- `POST /chats/:id/messages` - Send message
- `POST /chats/:id/messages/read` - Mark messages as read

### Business
- `GET /business/profile` - Get business profile
- `PUT /business/profile` - Update business profile

### Labels
- `GET /labels` - List labels
- `POST /labels` - Create label
- `PATCH /labels/:id` - Update label
- `DELETE /labels/:id` - Delete label

### Quick Replies
- `GET /quick-replies` - List quick replies
- `POST /quick-replies` - Create quick reply
- `PATCH /quick-replies/:id` - Update quick reply
- `DELETE /quick-replies/:id` - Delete quick reply

## WebSocket Events

Connect to `/chat` namespace with JWT token in auth.

### Client Events
- `message:send` - Send a message
- `message:delivered` - Mark message as delivered
- `message:read` - Mark messages as read
- `typing:start` - Start typing indicator
- `typing:stop` - Stop typing indicator

### Server Events
- `message:new` - New message received
- `message:sent` - Message sent confirmation
- `message:delivered` - Message delivered
- `message:read` - Messages read
- `typing:indicator` - Typing indicator
- `presence:update` - User presence update

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=3000
CORS_ORIGIN=*
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d
```

### Web Client (.env)
```
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

## Future Phases

- **Phase 2**: End-to-end encryption (Signal Protocol)
- **Phase 3**: Business features (labels, quick replies, CRM)
- **Phase 4**: QR-based web login, multi-device sync
- **Phase 5**: Polish, offline support, push notifications

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System architecture and design
- [Security](docs/SECURITY.md) - Security and E2EE documentation

## License

MIT
