# Zalo Clone

Full-stack chat application inspired by Zalo, featuring real-time messaging (1-1 & group), voice/video calls, AI-powered features, media sharing, friend management, and an admin dashboard.

**Live demo:** [https://zalo-fullstack-app.vercel.app](https://zalo-fullstack-app.vercel.app)

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Spring Boot 3.4.2** (Java 21) | REST API, WebSocket server, dependency injection |
| **MySQL** (via Railway addon) | Primary database |
| **Flyway 10** | Database migration & version control |
| **Spring Security + JWT (HS256)** | Authentication & authorization |
| **STOMP over SockJS** | WebSocket real-time communication |
| **AWS SDK v2** (→ Cloudflare R2) | File storage (S3-compatible) |
| **Spring AI** (→ Groq API) | AI chat, smart reply, message summarization |
| **Redis** | Online status caching, rate limiting |
| **MapStruct + Lombok** | Code generation (mappers, getters/setters) |
| **HikariCP** | Connection pooling |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite 8** | Build tool & dev server |
| **Tailwind CSS 3** | Styling |
| **Zustand 5** | State management |
| **@stomp/stompjs 7 + SockJS** | WebSocket client |
| **Axios** | HTTP client |
| **React Router 7** | Client-side routing |
| **date-fns** | Date formatting |
| **Emoji Picker React** | Emoji reactions |
| **react-hot-toast** | Toast notifications |
| **lucide-react** | Icons |

### Infrastructure
| Service | Purpose |
|---|---|
| **Railway** | Backend hosting + MySQL database |
| **Vercel** | Frontend hosting |
| **Cloudflare R2** | File storage (S3-compatible, 10GB free, no egress fee) |
| **Groq** | AI inference (llama-3.1-8b-instant) |
| **Brevo** | Email service (verification, password reset) |

---

## Architecture

```
zalo-clone/
├── backend/                          # Spring Boot API (port 8080)
│   ├── src/main/java/com/example/backend/
│   │   ├── auth/                     # Register, login, email verification, password reset
│   │   ├── security/                 # JWT filter, Spring Security config, BCrypt
│   │   ├── user/                     # Profile, search, friend request, block
│   │   ├── chat/                     # 1-1 chat entity & service
│   │   ├── messaging/                # Message CRUD, reactions, recall, soft-delete
│   │   ├── group/                    # Group chat, members, roles, join requests, pin
│   │   ├── file/                     # S3 upload/download with HTTP Range support
│   │   ├── websocket/                # STOMP config, typing indicator, JWT auth interceptor
│   │   ├── ai/                       # AI chat, smart reply, message summarization
│   │   ├── call/                     # Call history, WebRTC signaling relay
│   │   ├── admin/                    # User/group management, stats, audit logs
│   │   ├── report/                   # User reporting & evidence upload
│   │   ├── reaction/                 # Shared reaction logic (message + group message)
│   │   └── shared/                   # BaseAuditingEntity, GlobalExceptionHandler, FlywayConfig
│   └── src/main/resources/
│       ├── db/migration/             # Flyway SQL migrations
│       └── csvdata/                  # Seed data (optional)
├── client/web/                       # React SPA (port 3000)
│   └── src/
│       ├── api/                      # Axios modules per domain
│       ├── store/                    # Zustand stores (auth, chat)
│       ├── hooks/                    # Custom hooks (useWebSocket)
│       ├── services/                 # WebSocket singleton
│       ├── pages/                    # Route pages
│       └── components/               # Reusable UI components
└── CLAUDE.md                         # AI assistant instructions
```

### Data Flow

**HTTP requests** → Axios (auto-refresh on 401) → Spring Boot controllers → Services → JPA repositories → MySQL

**Real-time messages** (via STOMP WebSocket):
```
Client ──publish──→ /app/chat/{chatId}/typing   ──→ Server
Server ──broadcast→ /topic/chat/{chatId}         ──→ All subscribers
Server ──send──→    /user/{email}/queue/messages ──→ Specific user
```

**File upload** → Multipart POST → Spring Boot → Cloudflare R2 (S3 API) → UUID key stored in DB

---

## Features

### Messaging
- Real-time 1-1 chat with typing indicators
- Message states: SENT → DELIVERED → SEEN
- Text, image, video, audio, file messages
- Message recall & delete-for-me
- Emoji reactions on messages
- Mark conversations as read

### Group Chat
- Create groups with multiple members
- Admin roles (promote/demote)
- Add/remove members, leave group, dissolve group
- Join request flow (request → admin approve/reject)
- Pin important messages
- Group media gallery

### Friend System
- Send, accept, reject friend requests
- Contact list
- Unfriend
- Block/unblock users

### Voice/Video Calls
- WebRTC-based signaling via STOMP
- Call offer/answer/reject/cancel/end
- ICE candidate exchange
- Call history per chat

### AI Features (Groq)
- AI chatbot with conversation history
- Smart reply suggestions for 1-1 and group chats
- Message summarization (with date range)

### Admin Dashboard
- User management: ban, unban, delete, promote/demote
- Group management: view & delete
- System statistics (users, messages, groups, online users)
- Audit logs
- Report management (user reports with evidence)

### Authentication
- Email/password registration
- Email verification (6-digit code via Brevo)
- JWT access token (24h) + refresh token (7d)
- Token rotation on re-login (forces logout on old devices)
- Forgot/reset password flow
- Rate limiting on AI endpoints

---

## Quick Start

### Prerequisites
- Java 21+
- Node.js 20+
- MySQL 8+ (or Railway MySQL addon)
- Maven 3.8+ (or use `./mvnw`)

### 1. Clone & Configure

```bash
git clone <repo-url>
cd zalo-clone

# Backend
cd backend
cp ../railway-env.example .env   # Edit with your credentials
```

Create MySQL database:
```sql
CREATE DATABASE zalo_clone CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Environment Variables

See `railway-env.example` at the project root for a complete list. Key variables:

| Variable | Default | Required | Description |
|---|---|---|---|
| `DB_HOST` | `localhost` | Yes | MySQL host |
| `DB_NAME` | `zalo_clone` | Yes | Database name |
| `DB_USERNAME` | `m0tnamk09` | Yes | MySQL user |
| `DB_PASSWORD` | `1509` | Yes | MySQL password |
| `JWT_SECRET` | — | Yes | HS256 key (min 32 chars) |
| `AWS_ACCESS_KEY_ID` | — | For files | Cloudflare R2 access key |
| `AWS_SECRET_ACCESS_KEY` | — | For files | Cloudflare R2 secret key |
| `AWS_S3_BUCKET` | — | For files | R2 bucket name |
| `AWS_S3_ENDPOINT` | — | For files | R2 endpoint URL |
| `GROQ_API_KEY` | — | For AI | Groq API key |
| `BREVO_API_KEY` | — | For email | Brevo SMTP API key |
| `BREVO_SENDER_EMAIL` | — | For email | Verified sender |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Yes | Comma-separated origins |

### 3. Run Backend

```bash
cd backend
./mvnw spring-boot:run
```

First launch: Flyway auto-creates schema, DataSeeder creates admin account and seed data.

### 4. Run Frontend

```bash
cd client/web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Demo Account

| Email | Password | Role |
|---|---|---|
| `admin@zalo.com` | `Admin@1234` | ADMIN |

---

## API Reference

**Base URL:** `http://localhost:8080`

**Authentication:** `Authorization: Bearer <accessToken>`

### Auth

All endpoints require JWT token.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | — | Register (email, password, firstName, lastName) |
| POST | `/api/v1/auth/verify-email` | — | Verify email with 6-digit code |
| POST | `/api/v1/auth/resend-verification` | — | Resend verification code |
| POST | `/api/v1/auth/login` | — | Login → returns accessToken + refreshToken |
| POST | `/api/v1/auth/forgot-password` | — | Request password reset (sends email) |
| POST | `/api/v1/auth/reset-password` | — | Reset password with token |
| POST | `/api/v1/auth/refresh` | — | Refresh token pair |
| POST | `/api/v1/auth/logout` | Yes | Logout (invalidate session) |

**Register request:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword",
  "firstName": "Nguyen",
  "lastName": "Van A"
}
```

**Login response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
  "userId": "uuid",
  "email": "user@example.com",
  "firstName": "Nguyen",
  "lastName": "Van A",
  "role": "USER",
  "online": true
}
```

### User

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/user/me` | Yes | Get own profile |
| PUT | `/api/v1/user/me` | Yes | Update name (firstName, lastName) |
| PATCH | `/api/v1/user/me/password` | Yes | Change password (currentPassword, newPassword) |
| POST | `/api/v1/user/me/avatar` | Yes | Upload avatar (multipart/form-data) |
| POST | `/api/v1/user/me/heartbeat` | Yes | Keep online status (call every 60s) |
| GET | `/api/v1/user/{userId}` | Yes | Get user by ID |
| GET | `/api/v1/user/search?keyword=` | Yes | Search users by name/email |

### Block

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/user/block/{userId}` | Yes | Block user |
| DELETE | `/api/v1/user/block/{userId}` | Yes | Unblock user |
| GET | `/api/v1/user/block` | Yes | List blocked users |

### Friend Requests

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/friend-request/send/{receiverId}` | Yes | Send friend request |
| POST | `/api/v1/friend-request/{requestId}/accept` | Yes | Accept friend request |
| POST | `/api/v1/friend-request/{requestId}/reject` | Yes | Reject friend request |
| GET | `/api/v1/friend-request/pending` | Yes | Pending incoming requests |
| GET | `/api/v1/friend-request/sent` | Yes | Sent requests |
| GET | `/api/v1/friend-request/contacts` | Yes | Friend list (accepted) |
| DELETE | `/api/v1/friend-request/unfriend/{friendId}` | Yes | Unfriend |

### Chat 1-1

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/chat` | Yes | List my chats (sorted by last activity) |
| GET | `/api/v1/chat/{chatId}` | Yes | Chat detail with recipient info |
| POST | `/api/v1/chat/start/{otherUserId}` | Yes | Get or create chat with user |
| DELETE | `/api/v1/chat/{chatId}` | Yes | Soft-delete chat |

### Messages (1-1)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/message` | Yes | Send text message |
| POST | `/api/v1/message/upload-media/{chatId}` | Yes | Upload media file (max 50MB) |
| GET | `/api/v1/message/chat/{chatId}?page=0&size=30` | Yes | Get messages (paginated, newest first) |
| PATCH | `/api/v1/message/seen/{chatId}` | Yes | Mark all messages as seen |
| PATCH | `/api/v1/message/delivered/{chatId}` | Yes | Mark messages as delivered |
| PATCH | `/api/v1/message/delivered/all` | Yes | Mark all as delivered |
| DELETE | `/api/v1/message/{messageId}/recall` | Yes | Recall message (soft delete) |
| DELETE | `/api/v1/message/{messageId}` | Yes | Delete message for me only |
| GET | `/api/v1/message/media/{key}?download=true` | — | Stream/download file (supports Range) |

**Send message request:**
```json
{
  "chatId": "uuid",
  "content": "Hello!",
  "type": "TEXT"
}
```

Media types: `TEXT`, `IMAGE`, `VIDEO`, `AUDIO`, `FILE`.

### Reactions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/message/{messageId}/reactions?emoji=❤️` | Yes | Toggle reaction on 1-1 message |
| DELETE | `/api/v1/message/{messageId}/reactions` | Yes | Remove reaction |
| GET | `/api/v1/message/{messageId}/reactions` | — | Get all reactions |
| POST | `/api/v1/group-message/{messageId}/reactions?emoji=❤️` | Yes | Toggle reaction on group message |
| DELETE | `/api/v1/group-message/{messageId}/reactions` | Yes | Remove group reaction |
| GET | `/api/v1/group-message/{messageId}/reactions` | — | Get all group message reactions |

### Group Chat

| Method | Endpoint | Auth | Admin | Description |
|---|---|---|---|---|
| POST | `/api/v1/group` | Yes | — | Create group (name, description, memberIds) |
| GET | `/api/v1/group` | Yes | — | List my groups |
| GET | `/api/v1/group/{groupId}` | Yes | — | Group detail with members |
| PUT | `/api/v1/group/{groupId}` | Yes | Yes | Update group name/description |
| POST | `/api/v1/group/{groupId}/avatar` | Yes | Yes | Upload group avatar |
| POST | `/api/v1/group/{groupId}/members` | Yes | Yes | Add members (userIds) |
| DELETE | `/api/v1/group/{groupId}/members/{userId}` | Yes | Yes | Remove member |
| DELETE | `/api/v1/group/{groupId}/leave?newAdminId=` | Yes | — | Leave group (optionally transfer admin) |
| PATCH | `/api/v1/group/{groupId}/members/{userId}/set-admin` | Yes | Yes | Promote member to admin |
| DELETE | `/api/v1/group/{groupId}/dissolve` | Yes | Yes | Dissolve group permanently |
| POST | `/api/v1/group/{groupId}/messages` | Yes | — | Send text message |
| POST | `/api/v1/group/{groupId}/upload-media` | Yes | — | Upload media message |
| GET | `/api/v1/group/{groupId}/messages?page=0&size=30` | Yes | — | Get messages (paginated) |
| DELETE | `/api/v1/group/{groupId}/messages/{messageId}/recall` | Yes | — | Recall group message |
| DELETE | `/api/v1/group/{groupId}/messages/{messageId}` | Yes | — | Delete group message for me |
| POST | `/api/v1/group/{groupId}/messages/{messageId}/pin` | Yes | Yes | Pin message |
| DELETE | `/api/v1/group/{groupId}/messages/{messageId}/pin` | Yes | Yes | Unpin message |
| GET | `/api/v1/group/{groupId}/pinned-messages` | Yes | — | List pinned messages |
| GET | `/api/v1/group/{groupId}/media` | Yes | — | Group media gallery |

### Join Requests

| Method | Endpoint | Auth | Admin | Description |
|---|---|---|---|---|
| POST | `/api/v1/group/{groupId}/join-requests` | Yes | — | Invite users to join (creates requests) |
| GET | `/api/v1/group/{groupId}/join-requests` | Yes | Yes | List pending join requests |
| PUT | `/api/v1/group/{groupId}/join-requests/{requestId}/approve` | Yes | Yes | Approve join request |
| PUT | `/api/v1/group/{groupId}/join-requests/{requestId}/reject` | Yes | Yes | Reject join request |

### AI Chat

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/ai/chat` | Yes | Send message to AI assistant |
| GET | `/api/v1/ai/history?page=0&size=30` | Yes | AI conversation history |
| DELETE | `/api/v1/ai/history` | Yes | Clear AI history |

**AI chat request:**
```json
{ "message": "Hello, how are you?" }
```

### AI Smart Reply & Summarize

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/chat/{chatId}/ai/smart-reply` | Yes | Get smart reply suggestions for 1-1 chat |
| POST | `/api/v1/chat/{chatId}/ai/summarize` | Yes | Summarize 1-1 chat (since: ISO date) |
| POST | `/api/v1/group/{groupId}/ai/smart-reply` | Yes | Get smart reply suggestions for group |
| POST | `/api/v1/group/{groupId}/ai/summarize` | Yes | Summarize group chat (since: ISO date) |

### Call History

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/calls` | Yes | Save call session record |
| GET | `/api/v1/calls/{chatId}` | Yes | Get call history for a chat |

### Reports

| Method | Endpoint | Auth | Admin | Description |
|---|---|---|---|---|
| POST | `/api/v1/report/evidence` | Yes | — | Upload evidence file → returns key |
| POST | `/api/v1/report/{userId}` | Yes | — | Report a user |
| GET | `/api/v1/admin/reports?status=&page=0&size=20` | Yes | Yes | List reports (filter by status) |
| PATCH | `/api/v1/admin/reports/{id}/resolve` | Yes | Yes | Resolve a report |

### Admin (ROLE_ADMIN only)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/admin/users?page=0&size=20` | List all users |
| GET | `/api/v1/admin/users/{userId}` | User detail |
| PATCH | `/api/v1/admin/users/{userId}/ban` | Ban user (body: { reason }) |
| PATCH | `/api/v1/admin/users/{userId}/unban` | Unban user |
| DELETE | `/api/v1/admin/users/{userId}` | Permanently delete user |
| PATCH | `/api/v1/admin/users/{userId}/promote` | Promote to ADMIN |
| PATCH | `/api/v1/admin/users/{userId}/demote` | Demote to USER |
| PATCH | `/api/v1/admin/users/{userId}/reset-password` | Force reset password |
| POST | `/api/v1/admin/accounts` | Create admin account |
| GET | `/api/v1/admin/groups?page=0&size=20` | List all groups |
| DELETE | `/api/v1/admin/groups/{groupId}` | Delete group |
| GET | `/api/v1/admin/stats` | System statistics |
| GET | `/api/v1/admin/audit-logs?page=0&size=20` | View audit logs |

**Admin stats response:**
```json
{
  "totalUsers": 120,
  "totalMessages": 5430,
  "totalGroups": 25,
  "onlineUsers": 18,
  "bannedUsers": 3,
  "dailyMessageCounts": [
    { "date": "2026-04-01", "count": 320 }
  ],
  "topActiveUsers": [
    { "userId": "uuid", "fullName": "Nguyen Van A", "messageCount": 230 }
  ]
}
```

---

## WebSocket Realtime

**Endpoint:** `ws://localhost:8080/ws` (SockJS fallback available)

**Protocol:** STOMP over WebSocket

**Authentication:** Pass `Authorization: Bearer <accessToken>` in STOMP CONNECT frame.

### Client Subscriptions

| Topic | Direction | Payload | Description |
|---|---|---|---|
| `/topic/chat/{chatId}` | Server → Client | `MessageDto` | 1-1 message broadcast (both sender & receiver) |
| `/topic/chat/{chatId}/typing` | Server → Client | `{ userId, isTyping }` | Typing indicator for 1-1 |
| `/topic/group/{groupId}` | Server → Client | `GroupMessageDto` | Group message broadcast |
| `/topic/group/{groupId}/typing` | Server → Client | `{ userId, isTyping }` | Typing indicator for group |
| `/topic/group/{groupId}/events` | Server → Client | `GroupEventDto` | Group management events (member added/removed, admin changed, group updated, message pinned/unpinned) |
| `/topic/user/{userId}/status` | Server → Client | `{ userId, isOnline }` | Online/offline status |
| `/topic/call/{userId}` | Server → Client | `CallSignalDto` | WebRTC signaling |
| `/user/queue/messages` | Server → Client | `MessageDto` | New 1-1 message notification |
| `/user/queue/seen` | Server → Client | `{ chatId }` | Messages marked as seen |
| `/user/queue/message-recalled` | Server → Client | `{ messageId, chatId }` | Message recalled |
| `/user/queue/reactions` | Server → Client | `{ messageId, chatId, reactions }` | Reaction updates |
| `/user/queue/friend-request` | Server → Client | `FriendRequestDto` | Incoming friend request |
| `/user/queue/friend-request-accepted` | Server → Client | `UserDto` | Friend request accepted |
| `/user/queue/group-events` | Server → Client | `GroupEventDto` | Removed from group notification |
| `/user/queue/force-logout` | Server → Client | `{ message }` | Force logout (session replaced) |

### Client Publications

| Destination | Payload | Description |
|---|---|---|
| `/app/chat/{chatId}/typing` | `{ typing: true/false }` | Send typing indicator (1-1) |
| `/app/group/{groupId}/typing` | `{ typing: true/false }` | Send typing indicator (group) |
| `/app/call/signal` | `CallSignalDto` | Relay WebRTC signaling |

### Important Notes

- Messages are sent via **REST API** (`POST /api/v1/message`), not WebSocket. WebSocket is for **real-time delivery** only.
- For 1-1 messages, the backend sends **both** `/topic/chat/{id}` (broadcast) and `/user/{email}/queue/messages` (personal notification).
- The `/topic` channel is the authoritative source for UI updates (lastMessage, unreadCount, sort).
- The `/user/queue/messages` channel only detects **new chats** not yet in the sidebar list.

### Call Signaling Flow (WebRTC)

```
Caller                           STOMP Relay                      Callee
  │── /app/call/signal (offer) ──→     │── /topic/call/{calleeId} ──→│
  │                                    │                             │
  │← /topic/call/{callerId} ──│── /app/call/signal (answer) ──│
  │                                    │                             │
  │← /topic/call/{callerId} ──│── /app/call/signal (ice-candidate) ─│
```

Signal types: `call-offer`, `call-answer`, `call-reject`, `call-cancel`, `call-end`, `ice-candidate`.

---

## Database Schema

Managed by Flyway (migrations in `backend/src/main/resources/db/migration/`).

| Table | Description |
|---|---|
| `user` | User accounts (email, password, name, avatar, role, banned, tokenVersion) |
| `chat` | 1-1 conversations (user1Id, user2Id) |
| `message` | 1-1 messages (chatId, senderId, content, type, state, deleted, mediaUrl, fileName) |
| `message_reaction` | Reactions on 1-1 messages (userId, messageId, emoji) |
| `group` | Group chats (name, description, avatar, createdBy) |
| `group_member` | Group membership (groupId, userId, admin flag, joinedAt) |
| `group_message` | Group messages (groupId, senderId, content, type, deleted, mediaUrl, fileName) |
| `group_message_reaction` | Reactions on group messages |
| `group_pinned_message` | Pinned messages in groups |
| `friend_request` | Friend requests (senderId, receiverId, status: PENDING/ACCEPTED/REJECTED) |
| `block` | Blocked users (blockerId, blockedId) |
| `ai_message` | AI chat history (userId, role: USER/ASSISTANT, content) |
| `call_session` | Call history (chatId, callerId, receiverId, startTime, endTime, status) |
| `report` | User reports (reporterId, reportedId, reason, status) |
| `report_evidence` | Evidence files for reports (reportId, fileKey) |
| `audit_log` | Admin action audit trail |
| `flyway_schema_history` | Flyway migration tracking |

### Entity Conventions
- All entities extend `BaseAuditingEntity` → auto-populated `createdDate`, `lastModifiedDate`
- IDs use UUID v7 stored as `CHAR(36)` in MySQL
- JPA mode: `validate` (Flyway owns the schema)

---

## File Storage

Files are uploaded to Cloudflare R2 (S3-compatible) with UUID-based keys.

- **Upload:** `POST /api/v1/message/upload-media/{chatId}` (multipart, max 50MB)
- **Download:** `GET /api/v1/message/media/{key}`
- Supports HTTP Range requests (206 Partial Content) for video/audio streaming
- Supported types: images, videos, audio, PDF, Office docs, zip, txt
- `fileName` column stores the original filename for display

---

## HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (async processing) |
| 206 | Partial Content (media streaming) |
| 400 | Bad request / validation error |
| 401 | Unauthenticated / token expired |
| 403 | Forbidden (not admin, blocked) |
| 404 | Resource not found |
| 409 | Conflict (email exists, already friends) |
| 429 | Rate limited (AI endpoints) |
| 500 | Internal server error |

---

## Deployment

### Backend (Railway)
```bash
cd backend
# Railway auto-detects the Dockerfile
# Set env vars via Railway Dashboard → Variables (see railway-env.example)
git push railway main
```

The `Dockerfile` uses multi-stage build (JAR via Maven → JRE runtime, 256-512MB heap, G1GC).

### Frontend (Vercel)
```bash
cd client/web
npm run build
vercel --prod
```

Set `VITE_WS_URL` env var to the Railway backend URL for WebSocket connection.

---

## Development Commands

### Backend
```bash
./mvnw spring-boot:run           # Start dev server (port 8080)
./mvnw test                       # Run tests (Testcontainers)
./mvnw clean package -DskipTests  # Build JAR
```

### Frontend
```bash
npm run dev    # Start dev server (port 3000)
npm run build  # Production build
npm run lint   # ESLint
```

---

## Project Status

All core features implemented and deployed. This is a personal portfolio project demonstrating full-stack development with real-time communication, file storage, AI integration, and admin capabilities.
