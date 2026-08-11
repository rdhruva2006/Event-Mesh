# API Documentation

All requests go through the **API Gateway** at `http://localhost:3000`.
Do not call `user-service` or `notification-service` directly — they are
not published to the host and are only reachable inside the Docker
network.

Base path: `/api`

Authenticated routes require the header:

```
Authorization: Bearer <JWT>
```

The token is returned by `/api/users/register` and `/api/users/login`.

---

## Health Checks

Each service exposes an unauthenticated health endpoint.

| Method | Path (via gateway) | Description |
|--------|---------------------|--------------|
| GET | `/health` | API Gateway health |

(`user-service` and `notification-service` each also expose their own
`/health` internally, used by `docker-compose` and can be checked from
inside the network for debugging.)

---

## User Service

### Register a new user

`POST /api/users/register`

Rate-limited to 10 requests / 15 minutes / IP at the gateway.

**Request body**

```json
{
  "name": "Div Sachdeva",
  "email": "div@example.com",
  "password": "SecurePass123"
}
```

| Field | Type | Rules |
|-------|------|-------|
| name | string | 2–80 characters |
| email | string | valid email format |
| password | string | min 8 characters, at least one digit |

**Response `201 Created`**

```json
{
  "user": {
    "id": "b3e1c2b0-...-...",
    "name": "Div Sachdeva",
    "email": "div@example.com",
    "createdAt": "2026-08-10T21:40:00.000Z"
  },
  "token": "eyJhbGciOi..."
}
```

**Errors**

| Status | Reason |
|--------|--------|
| 400 | Validation failed (see `errors` array in body) |
| 409 | Email already registered |
| 429 | Rate limit exceeded |

**Side effect:** publishes a `user.created` event to NATS JetStream,
which the Notification Service consumes asynchronously to send a welcome
notification. This does not block or delay the HTTP response.

---

### Log in

`POST /api/users/login`

Rate-limited to 10 requests / 15 minutes / IP at the gateway.

**Request body**

```json
{
  "email": "div@example.com",
  "password": "SecurePass123"
}
```

**Response `200 OK`**

```json
{
  "user": { "id": "...", "name": "...", "email": "...", "createdAt": "..." },
  "token": "eyJhbGciOi..."
}
```

**Errors**

| Status | Reason |
|--------|--------|
| 400 | Validation failed |
| 401 | Invalid email or password |
| 429 | Rate limit exceeded |

---

### Get a user by ID

`GET /api/users/:id` — **requires `Authorization: Bearer <JWT>`**

**Response `200 OK`**

```json
{ "user": { "id": "...", "name": "...", "email": "...", "createdAt": "..." } }
```

| Status | Reason |
|--------|--------|
| 401 | Missing/invalid/expired token |
| 404 | User not found |

---

### List all users

`GET /api/users` — **requires `Authorization: Bearer <JWT>`**

**Response `200 OK`**

```json
{ "users": [ { "id": "...", "name": "...", "email": "..." } ], "count": 1 }
```

---

## Notification Service

### List notifications for a user

`GET /api/notifications/:userId` — **requires `Authorization: Bearer <JWT>`**

**Response `200 OK`**

```json
{
  "notifications": [
    {
      "id": "9f2a...",
      "userId": "b3e1c2b0-...",
      "type": "welcome_email",
      "message": "Welcome to the platform, Div Sachdeva!",
      "sourceEventId": "b7c4...",
      "createdAt": "2026-08-10T21:40:01.500Z"
    }
  ],
  "count": 1
}
```

### List all notifications (debug/admin)

`GET /api/notifications` — **requires `Authorization: Bearer <JWT>`**

Same shape as above, unfiltered.

---

## Example end-to-end flow (curl)

```bash
# 1. Register
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Div Sachdeva","email":"div@example.com","password":"SecurePass123"}'

# -> copy "token" and "user.id" from the response

# 2. Confirm the Notification Service received the async event
#    (allow a second or two for the event to propagate)
curl http://localhost:3000/api/notifications/<userId> \
  -H "Authorization: Bearer <token>"

# 3. Log in again later
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"div@example.com","password":"SecurePass123"}'
```

## Error Response Shape

All errors follow a consistent shape:

```json
{ "error": "human readable message" }
```

or, for validation errors specifically:

```json
{ "errors": ["name must be 2-80 characters", "..."] }
```
