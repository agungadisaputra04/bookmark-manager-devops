# Developer Handoff — Bookmark Manager API

This document is the technical reference for engineers working on or taking over this codebase: architecture, repository layout, configuration, dependencies, database requirements, and API surface.

For the project overview and DevOps implementation, see the [root README](../README.md).

## Application Overview

The application consists of two separate processes running from a single codebase:

- **API server** (`src/server.js`) — REST API for user registration/login and bookmark CRUD.
- **Worker** (`src/worker.js`) — a separate cron-scheduled process that periodically checks whether bookmarked URLs are still reachable and updates their status (`ok` / `broken`) in the database.

Both processes read the same configuration and connect to the same PostgreSQL database.

## Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 18+ |
| Web framework | Express 4 |
| Database | PostgreSQL (driver: `pg`) |
| Auth | JWT (`jsonwebtoken`) + bcrypt |
| Scheduler (worker) | `node-cron` |
| Testing | Jest + Supertest |

## Repository Structure

```text
bookmark-manager-api/

├── migrations/
│   └── 001_init.sql          # database schema
│
├── scripts/
│   └── migrate.js            # migration runner
│
├── src/
│   ├── config.js             # reads and validates environment variables
│   ├── db.js                 # PostgreSQL connection pool
│   ├── app.js                # Express app wiring for testing
│   ├── server.js             # API process entrypoint
│   ├── worker.js             # worker process entrypoint
│   │
│   ├── middleware/
│   │   ├── auth.js            # JWT verification
│   │   └── errorHandler.js    # centralized error handler
│   │
│   ├── routes/
│   │   ├── auth.js            # POST /auth/register, /auth/login
│   │   ├── bookmarks.js       # bookmark CRUD
│   │   └── health.js          # health endpoints
│   │
│   ├── services/
│   │   ├── bookmarkService.js # bookmark database queries
│   │   └── linkChecker.js     # URL check logic
│   │
│   └── utils/
│       └── validators.js       # email/URL validation
│
├── tests/
│   ├── validators.test.js
│   └── app.test.js
│
├── .env.example
├── jest.config.js
├── package.json
└── package-lock.json
```

## Local Development

Prerequisites:

- Node.js 18+
- npm
- An accessible PostgreSQL instance

Install dependencies:

```bash
npm install
```

Create the local environment file:

```bash
cp .env.example .env
```

Adjust `.env` to match the local database connection and provide a JWT secret.

Run the database migration:

```bash
npm run migrate
```

Start the API:

```bash
npm run dev
```

The development server uses `nodemon` for automatic reloads.

Run the worker separately:

```bash
npm run worker
```

## Dependencies

See `package.json` for the complete dependency list.

Main runtime dependencies:

- `express`
- `pg`
- `jsonwebtoken`
- `bcryptjs`
- `node-cron`
- `dotenv`

Development dependencies:

- `jest`
- `supertest`
- `nodemon`

## Configuration

Application configuration is provided through environment variables and loaded through `src/config.js`.

In development, `.env` is loaded through `dotenv`.

Configuration values should not be hardcoded into the application source.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | API server HTTP port |
| `NODE_ENV` | No | `development` | Application mode |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `PGSSL` | No | `false` | Enables PostgreSQL SSL when set to `true` |
| `JWT_SECRET` | Yes | — | Secret used to sign JWTs |
| `JWT_EXPIRES_IN` | No | `1h` | JWT token lifetime |
| `LINK_CHECK_CRON` | No | `*/15 * * * *` | Worker cron schedule |
| `LINK_CHECK_TIMEOUT_MS` | No | `5000` | Timeout for each URL check |
| `LINK_CHECK_CONCURRENCY` | No | `5` | Maximum parallel URL checks per batch |

`DATABASE_URL` and `JWT_SECRET` are required. The application fails to start when either required value is missing.

## Ports

- **API server:** `PORT` (default `3000`)
- **Worker:** no listening port; it runs as an internal scheduled process

The application itself does not terminate TLS. HTTPS and TLS termination are infrastructure responsibilities.

## Database Requirement

The application requires a reachable PostgreSQL instance accessible from both the API and worker processes.

The database schema is defined in:

```text
migrations/001_init.sql
```

The initial schema contains:

- `users`
- `bookmarks`

Apply the schema with:

```bash
npm run migrate
```

The migration runner reads SQL files from the `migrations/` directory in filename order.

Database provisioning, backups, high availability, and database operations are outside the scope of the application code.

## External Services

The worker makes outbound HTTP requests to URLs stored as user bookmarks.

The worker first attempts a `HEAD` request and falls back to `GET` when required by the link-checking logic.

Therefore, the worker requires outbound internet access.

No third-party API is required by the application.

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register a new user |
| POST | `/auth/login` | No | Log in and receive a JWT |
| GET | `/bookmarks` | Yes | List the user's bookmarks |
| POST | `/bookmarks` | Yes | Create a new bookmark |
| GET | `/bookmarks/:id` | Yes | Get a bookmark's details |
| PATCH | `/bookmarks/:id` | Yes | Update a bookmark's title/tags |
| DELETE | `/bookmarks/:id` | Yes | Delete a bookmark |
| GET | `/health/live` | No | Liveness check |
| GET | `/health/ready` | No | Readiness check including database connectivity |

The `/bookmarks` endpoint supports optional filters:

```text
?tag=<tag>
?status=<status>
```

Authenticated endpoints use:

```text
Authorization: Bearer <token>
```

## Health Checks

### Liveness

```text
GET /health/live
```

The endpoint indicates whether the API process is running.

Expected response:

```json
{
  "status": "ok"
}
```

### Readiness

```text
GET /health/ready
```

The endpoint verifies that the API can reach its PostgreSQL dependency.

Expected healthy response:

```json
{
  "status": "ok",
  "database": "connected"
}
```

When the database is unavailable, the endpoint reports an unhealthy state.

The worker does not expose an HTTP health endpoint because it is not an HTTP server. Its runtime state is observable through process/container status and logs.

## Testing

Run the automated test suite with:

```bash
npm test
```

Tests use Jest and Supertest.

The application database module is mocked where required so that the test suite can run without requiring a real PostgreSQL instance.

`tests/validators.test.js` contains validator unit tests.

`tests/app.test.js` validates API behavior through the Express application.

## Running the Application

Install dependencies:

```bash
npm install
```

Configure the environment:

```bash
cp .env.example .env
```

Run migrations:

```bash
npm run migrate
```

Start the API:

```bash
npm start
```

Start the worker in a separate terminal:

```bash
npm run worker
```

## Handoff Notes

The application is designed to run as two independent processes:

```text
                 ┌─────────────────┐
                 │   API Process   │
                 │  src/server.js  │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │   PostgreSQL    │
                 └────────▲────────┘
                          │
                 ┌────────┴────────┐
                 │ Worker Process  │
                 │  src/worker.js  │
                 └─────────────────┘
```

The API and worker can therefore be deployed as separate runtime processes while sharing the same database and configuration.

Important operational dependencies are:

- PostgreSQL must be reachable.
- The API requires `DATABASE_URL` and `JWT_SECRET`.
- The worker requires outbound internet access for bookmark URL checks.
- Database migrations must be applied before the application relies on the schema.
- The API exposes liveness and readiness endpoints for infrastructure-level health validation.

This document describes the application as handed over by the developer. Containerization, orchestration, CI/CD, deployment, networking, TLS, monitoring, and other infrastructure concerns are documented separately in the DevOps project documentation.