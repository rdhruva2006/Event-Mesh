# Microservices Assignment — User & Notification System

A small microservices-based backend consisting of two backend services
(**User Service**, **Notification Service**) and an **API Gateway**, built
to demonstrate distributed-systems fundamentals: secure inter-service
communication over a message broker (not REST/WebSockets), event-driven
architecture, reliability, and clean code practices.

See also:
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — component diagram, sequence
  diagram, and design rationale (reliability, security, scalability)
- [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) — full REST API
  reference for every gateway-exposed endpoint

## Tech Stack

| Concern | Choice |
|---|---|
| Language / runtime | Node.js 20 (Express) |
| Inter-service messaging | **NATS JetStream** (persistent, ack-based, durable consumers) |
| Auth | JWT (HS256) + bcrypt password hashing |
| Containerization | Docker + Docker Compose |
| Data storage | lowdb (JSON file) — isolated behind a small interface so it can be swapped for Postgres/Mongo without touching business logic |

## Project Structure

```
microservices-assignment/
├── docker-compose.yml
├── README.md
├── ARCHITECTURE.md
├── API_DOCUMENTATION.md
├── api-gateway/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js
│       ├── middleware/ (auth.js, rateLimiter.js)
│       └── routes/proxy.js
├── user-service/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js
│       ├── config/ (nats.js, db.js)
│       ├── controllers/userController.js
│       ├── events/publisher.js
│       ├── middleware/ (auth.js, validate.js)
│       ├── models/User.js
│       ├── routes/userRoutes.js
│       └── utils/jwt.js
└── notification-service/
    ├── Dockerfile
    ├── package.json
    ├── .env.example
    └── src/
        ├── index.js
        ├── config/nats.js
        ├── handlers/notificationHandler.js
        ├── services/emailService.js
        ├── store/notificationStore.js
        └── routes/notificationRoutes.js
```

## Prerequisites

- Docker & Docker Compose (recommended — no local Node install needed), **or**
- Node.js 20+ and a locally running NATS server (`-js` flag) if you
  prefer to run each service without containers

## Quick Start (Docker Compose — recommended)

```bash
# 1. Clone the repository
git clone <your-repository-url>
cd microservices-assignment

# 2. Copy environment templates (each service needs its own .env)
cp api-gateway/.env.example api-gateway/.env
cp user-service/.env.example user-service/.env
cp notification-service/.env.example notification-service/.env

# 3. IMPORTANT: JWT_SECRET must be identical in api-gateway/.env and
#    user-service/.env, since the gateway verifies tokens issued by
#    the User Service. Generate one and paste it into both files:
openssl rand -hex 64

# 4. Build and start everything (NATS + all 3 services)
docker compose up --build

# 5. In another terminal, confirm everything is healthy
curl http://localhost:3000/health
```

The API Gateway is now reachable at `http://localhost:3000`. See
[`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) for the full endpoint
reference and copy-pasteable `curl` examples.

To stop everything:

```bash
docker compose down
```

To wipe stored data and start fresh:

```bash
docker compose down -v
rm -f user-service/data/users.json notification-service/data/notifications.json
docker compose up --build
```

## Running the Services Locally (Without Docker)

Useful for active development with hot-reload.

```bash
# 1. Start a local NATS server with JetStream enabled
#    (install: https://docs.nats.io/running-a-nats-service/introduction/installation)
nats-server -js

# 2. In separate terminals, install deps and start each service
cd user-service && cp .env.example .env && npm install && npm run dev
cd notification-service && cp .env.example .env && npm install && npm run dev
cd api-gateway && cp .env.example .env && npm install && npm run dev
```

Each service's `.env` defaults to `NATS_URL=nats://localhost:4222`, which
matches a locally running `nats-server`.

## Verifying the Event Flow End-to-End

1. Register a user — this triggers the User Service to publish a
   `user.created` event to NATS:
   ```bash
   curl -X POST http://localhost:3000/api/users/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Div Sachdeva","email":"div@example.com","password":"SecurePass123"}'
   ```
2. Watch the `notification-service` container/terminal logs — you should
   see it receive the event and log a simulated welcome email within a
   second or two:
   ```
   [notification] (simulated) sending email to div@example.com: "Welcome to the platform, Div Sachdeva!"
   [notification] recorded welcome notification for user <userId>
   ```
3. Confirm it was persisted by querying the Notification Service through
   the gateway (use the `token` and `user.id` from step 1's response):
   ```bash
   curl http://localhost:3000/api/notifications/<userId> \
     -H "Authorization: Bearer <token>"
   ```

This confirms the User Service and Notification Service never talked to
each other directly — the entire handoff happened asynchronously through
NATS JetStream.

## Design Notes / Why These Choices

- **NATS JetStream over RabbitMQ**: the assignment lists NATS as
  preferred. JetStream specifically (not core NATS pub/sub) was chosen
  because it adds persistence, explicit acks, durable consumers, and
  bounded redelivery — the properties needed for "secure, reliable,
  production-ready, asynchronous" communication. See
  [`ARCHITECTURE.md`](./ARCHITECTURE.md#reliability--delivery-guarantees)
  for the full reasoning.
- **Gateway does not parse bodies**: it proxies the raw request stream to
  keep large/streamed payloads efficient; body parsing and validation
  happen once, at the owning service.
- **Defense in depth on auth**: both the gateway and each service verify
  the JWT independently, so a service is never left exposed if called
  directly (e.g., during local debugging).

## Known Limitations (and how they'd be addressed in production)

| Limitation | Production fix |
|---|---|
| `lowdb` JSON-file storage | Swap for PostgreSQL/MongoDB behind the existing `models/`/`store/` interfaces |
| Simulated email sending | Integrate a real provider (SendGrid/SES) behind `services/emailService.js` |
| Self-signed / no TLS between services | Terminate TLS at the gateway (e.g. via a reverse proxy/ingress) and enable NATS TLS + auth (`nats.conf` with credentials) |
| Single NATS node | Run a NATS cluster (3+ nodes) for broker high availability |
| No CI/CD | Add a pipeline that runs lint/tests and builds/pushes each service's Docker image on merge |

## Submission Checklist

- [x] Source code / GitHub repository
- [x] README with setup instructions (this file)
- [x] Architecture diagram (`ARCHITECTURE.md`)
- [x] API documentation (`API_DOCUMENTATION.md`)
- [x] Instructions to run the services locally (above)
