# Docker & Docker Compose Validation

## Objective

Containerize the Bookmark Manager API and background worker, then orchestrate the application stack using Docker Compose.

## Stack

The Docker Compose stack consists of:

- API container
- Worker container
- PostgreSQL container
- Persistent PostgreSQL volume
- Docker healthchecks
- Resource limits
- Log rotation

## Runtime Architecture

The Docker Compose runtime architecture is shown below.

![Docker Runtime Architecture](./architecture/baseline-architecture.png)

## Shared Application Image

The API and Worker use the same Docker image: `bookmark-manager:local`.

The API runs `npm start`, while the Worker overrides the command with `npm run worker`.

This allows both runtime roles to use the same application image while remaining separate processes.

## Healthchecks

PostgreSQL uses `pg_isready` to verify database availability.

The API container uses `GET /health/live` as its Docker healthcheck.

Application readiness is verified through `GET /health/ready`, which checks PostgreSQL connectivity.

## Validation Results

### Compose Stack

The stack was started using:

```bash
docker compose up -d
```

All services started successfully.

Evidence: `docs/evidence/docker-compose-healthy.png`

### API Liveness

Command:

```bash
curl.exe http://localhost:3000/health/live
```

Result:

```json
{"status":"ok"}
```

**Result: PASS**

Evidence: `docs/evidence/api-liveness.png`

### API Readiness

Command:

```bash
curl.exe http://localhost:3000/health/ready
```

Result:

```json
{"status":"ok","database":"connected"}
```

**Result: PASS**

Evidence: `docs/evidence/api-readiness.png`

### Worker

Command:

```bash
docker logs --tail 20 bookmark-worker
```

Observed:

```text
link-checker worker started. Schedule: "*/15 * * * *"
Link-check batch complete: 1 bookmark(s) checked.
```

**Result: PASS**

Evidence: `docs/evidence/worker-started.png`

## Resource Limits

API and Worker containers are configured with:

- CPU limit: `0.50`
- Memory limit: `512 MB`

Validated using:

```bash
docker stats --no-stream
```

Observed:

- bookmark-api: `58.35 MiB / 512 MiB`
- bookmark-worker: `67.63 MiB / 512 MiB`

**Result: PASS**

Evidence: `docs/evidence/docker-resource-limits.png`

## Log Rotation

All containers use Docker `json-file` logging with:

- Maximum log size: `10 MB`
- Maximum log files: `3`

The configuration was validated using:

```bash
docker inspect bookmark-api --format "{{json .HostConfig.LogConfig}}"
docker inspect bookmark-worker --format "{{json .HostConfig.LogConfig}}"
docker inspect bookmark-postgres --format "{{json .HostConfig.LogConfig}}"
```

**Result: PASS**

Evidence: `docs/evidence/docker-log-rotation.png`

## Failure Validation

PostgreSQL was intentionally stopped to validate application readiness behavior.

Expected behavior:

- `/health/live` remains available because the API process is still running.
- `/health/ready` reports the database as unreachable.

Observed:

- Liveness: `{"status":"ok"}`
- Readiness: `{"status":"error","database":"unreachable"}`

This confirms that liveness and readiness are separate health signals.

Evidence: `docs/evidence/docker-readiness-failure.png`

## Conclusion

The Bookmark Manager application is successfully containerized and orchestrated with Docker Compose.

The following capabilities have been validated:

- Production Node.js Docker image
- Shared API and Worker image
- PostgreSQL container
- Persistent database volume
- Docker healthchecks
- Service startup dependency
- API liveness and readiness
- Resource limits
- Log rotation
- Docker networking
- Database failure behavior
- Docker Compose orchestration