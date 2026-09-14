# Docker & Docker Compose Validation

## Objective

Containerize the Bookmark Manager API and background worker, then orchestrate the full application stack — API, Worker, and PostgreSQL — using Docker Compose.

The validation focuses on production-oriented container concerns such as healthchecks, resource limits, persistent storage, log rotation, service dependencies, and failure behavior.

The objective is to verify that the application can run reliably as a containerized stack before introducing CI/CD and remote deployment.

## Stack

| Component | Purpose |
|-----------|---------|
| API container | Serves the REST API (`npm start`) |
| Worker container | Runs the link-checker cron job (`npm run worker`) |
| PostgreSQL container | Application database |
| Persistent volume | Keeps database data across container restarts |
| Docker healthchecks | Reports container-level health to the orchestrator |
| Resource limits | Caps CPU and memory per container |
| Log rotation | Bounds container log growth |
| Docker Compose | Defines and orchestrates the complete local stack |

## Runtime Architecture

![Docker Runtime Architecture](./architecture/baseline-architecture.png)

The containerized runtime consists of three services:

```text
                         Docker Compose
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ▼                ▼                ▼
       ┌───────────┐    ┌───────────┐    ┌──────────────┐
       │    API    │    │   Worker  │    │  PostgreSQL  │
       │ Node.js   │    │ node-cron │    │   postgres   │
       └─────┬─────┘    └─────┬─────┘    └──────┬───────┘
             │                │                  │
             └────────────────┴──────────────────┘
                              │
                         Docker Network
                              │
                              ▼
                    Persistent DB Volume
```

The API and Worker communicate with PostgreSQL through the Docker Compose service network rather than through `localhost`.

## Design Decision: Shared Image, Separate Roles

The API and Worker are built from the **same Docker image** rather than from two separate images.

The runtime role is determined by the container command:

- API container → `npm start`
- Worker container → `npm run worker`

This approach keeps the runtime dependencies and base image identical between the two processes.

It also reduces image duplication and image drift while still allowing the API and Worker to run, restart, and scale independently.

## Dockerfile Design

The application image is built from:

```text
node:24-bookworm-slim
```

The Dockerfile applies several production-oriented practices:

- Uses a slim Node.js base image
- Copies `package*.json` before application source to improve build-layer caching
- Uses `npm ci` for deterministic dependency installation
- Excludes development dependencies from the runtime image
- Cleans the npm cache
- Copies only the directories required at runtime
- Runs the application as the non-root `node` user
- Exposes port `3000`
- Uses `npm start` as the default API command

The Worker uses the same image but overrides the command with:

```text
npm run worker
```

## Healthchecks

| Service | Mechanism |
|---------|-----------|
| PostgreSQL | `pg_isready` |
| API | `GET /health/live` through a Docker healthcheck |
| API readiness | `GET /health/ready`, validating database connectivity |
| Worker | No HTTP health endpoint; runtime state is observed through container status and logs |

Liveness and readiness represent different operational signals.

**Liveness** answers:

> Is the API process still running?

**Readiness** answers:

> Can the API currently access its required database dependency?

This distinction was intentionally validated by stopping PostgreSQL while keeping the API process running.

## Validation Results

### 1. Compose Stack Startup

The complete stack was started with:

```bash
docker compose up -d
```

The resulting stack consists of:

```text
bookmark-postgres
bookmark-api
bookmark-worker
```

PostgreSQL and API healthchecks reached the expected healthy state.

**Result: PASS**

Evidence: [`docs/evidence/docker-compose-healthy.png`](./evidence/docker-compose-healthy.png)

### 2. API Liveness

The API liveness endpoint was tested from the development host:

```bash
curl.exe http://localhost:3000/health/live
```

Expected response:

```json
{
  "status": "ok"
}
```

**Result: PASS**

Evidence: [`docs/evidence/api-liveness.png`](./evidence/api-liveness.png)

### 3. API Readiness

The API readiness endpoint was tested:

```bash
curl.exe http://localhost:3000/health/ready
```

Expected healthy response:

```json
{
  "status": "ok",
  "database": "connected"
}
```

This confirms that the API is not only running but can also communicate with PostgreSQL.

**Result: PASS**

Evidence: [`docs/evidence/api-readiness.png`](./evidence/api-readiness.png)

### 4. Worker Execution

The Worker container was inspected through its logs:

```bash
docker logs --tail 20 bookmark-worker
```

Example output:

```text
link-checker worker started. Schedule: "*/15 * * * *"

Link-check batch complete: 1 bookmark(s) checked.
```

The Worker started successfully and executed the configured link-checking schedule.

**Result: PASS**

Evidence: [`docs/evidence/worker-started.png`](./evidence/worker-started.png)

### 5. Resource Limits

API and Worker containers are configured with:

```text
CPU limit    : 0.50
Memory limit : 512 MB
```

Observed usage during validation:

| Container | Memory Usage | Configured Limit |
|-----------|--------------|------------------|
| `bookmark-api` | 58.35 MiB | 512 MiB |
| `bookmark-worker` | 67.63 MiB | 512 MiB |

Resource configuration was verified using Docker inspection and runtime statistics.

Both containers remained comfortably below their configured memory limits during validation.

**Result: PASS**

Evidence: [`docs/evidence/docker-resource-limits.png`](./evidence/docker-resource-limits.png)

### 6. Log Rotation

All application containers use the Docker `json-file` logging driver with:

```text
Maximum log size : 10 MB
Maximum log files: 3
```

Configuration was verified with:

```bash
docker inspect bookmark-api --format "{{json .HostConfig.LogConfig}}"

docker inspect bookmark-worker --format "{{json .HostConfig.LogConfig}}"

docker inspect bookmark-postgres --format "{{json .HostConfig.LogConfig}}"
```

This prevents unbounded container log growth from consuming host storage.

**Result: PASS**

Evidence: [`docs/evidence/docker-log-rotation.png`](./evidence/docker-log-rotation.png)

### 7. Persistent PostgreSQL Storage

PostgreSQL uses a Docker named volume:

```text
bookmark-postgres-data
```

The volume is mounted to:

```text
/var/lib/postgresql/data
```

This separates database persistence from the PostgreSQL container lifecycle.

The PostgreSQL container can therefore be recreated without intentionally deleting the stored database volume.

### 8. Service Dependency

The API and Worker depend on PostgreSQL being healthy before they are started.

The Compose configuration uses:

```yaml
depends_on:
  postgres:
    condition: service_healthy
```

This ensures that the application services wait for the PostgreSQL healthcheck during startup.

This mechanism provides startup ordering and dependency readiness. It does not replace application-level readiness checks during runtime.

### 9. Failure Behavior — Database Down

PostgreSQL was deliberately stopped to validate application behavior during a real dependency failure.

The objective was to confirm that liveness and readiness provide different signals instead of both reporting the same state.

| Endpoint | Expected Behavior | Observed |
|----------|-------------------|----------|
| `/health/live` | API remains alive | `{"status":"ok"}` |
| `/health/ready` | API reports database unavailable | `{"status":"error","database":"unreachable"}` |

The API process remained alive while readiness correctly indicated that the database dependency was unavailable.

This demonstrates the intended distinction between:

```text
Alive
  ≠
Ready
```

The behavior is important for future orchestration because an infrastructure layer can use readiness to determine whether the service should receive traffic without unnecessarily treating every dependency failure as a process failure.

**Result: PASS**

Evidence: [`docs/evidence/docker-readiness-failure.png`](./evidence/docker-readiness-failure.png)

## Local vs Production Docker Usage

This document covers the **local Docker Compose validation stage**.

The local environment uses Docker Desktop on the development workstation.

The later CI/CD stage uses the same containerization principles but deploys the application to a dedicated Linux VM:

```text
Local Validation
Docker Desktop
      │
      └── Docker Compose
          ├── API
          ├── Worker
          └── PostgreSQL


CI/CD Deployment
Jenkins VM
      │
      ▼
GHCR
      │
      ▼
Application VM
      │
      └── Docker Compose
          ├── API
          ├── Worker
          └── PostgreSQL
```

The local validation therefore serves as the containerization baseline before introducing automated image delivery and remote deployment.

## Conclusion

The Bookmark Manager application was successfully containerized and orchestrated with Docker Compose.

The validation confirmed:

- API and Worker use a shared container image
- API and Worker run as independent containers
- PostgreSQL runs as a separate service
- PostgreSQL data uses persistent storage
- Docker service healthchecks operate correctly
- API liveness and readiness provide separate signals
- API readiness correctly detects database dependency failure
- PostgreSQL startup dependency is enforced through Compose
- CPU and memory limits are configured
- Container log rotation is configured
- Container networking allows application services to communicate with PostgreSQL
- The Worker starts and executes its scheduled process

The containerized application is therefore ready for the next engineering stage: automated build, image publication, and deployment through CI/CD.

CI/CD and remote deployment are documented separately through the Jenkins pipeline and deployment evidence.

## Next Step

The next stage introduces Jenkins-based CI/CD:

```text
GitHub
   ↓
Jenkins
   ↓
Test
   ↓
Docker Build
   ↓
GHCR
   ↓
Application VM
   ↓
Docker Compose
   ↓
API + Worker + PostgreSQL
```

This moves the project from manually validated containerization toward automated application delivery.