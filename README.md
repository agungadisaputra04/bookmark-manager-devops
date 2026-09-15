# Bookmark Manager API — DevOps Engineering Portfolio

DevOps implementation of a developer-provided Node.js application.

## Overview

The repository demonstrates the process of taking an existing application handoff from a developer and preparing it for reliable deployment and operations.

The application source code is treated as a developer deliverable. The primary focus of this repository is the DevOps engineering required to build, deploy, secure, observe, and operate the application — not the application's business logic itself.

The original developer handoff is preserved in [`docs/developer-handoff.md`](./docs/developer-handoff.md).

---

## Application

The application is a Bookmark Manager API consisting of three main components:

- REST API server (Node.js / Express)
- Background worker (`node-cron`) — periodically checks bookmark URLs and updates their status
- PostgreSQL database

The API and worker run as separate stateless processes and share the same PostgreSQL database.

```text
                    ┌─────────────────┐
                    │     Client      │
                    └────────┬────────┘
                             │ HTTP
                             ▼
                    ┌─────────────────┐
                    │   API Server    │
                    │   Node/Express  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    └────────▲────────┘
                             │
                    ┌────────┴────────┐
                    │ Background      │
                    │ Worker          │
                    │ node-cron       │
                    └─────────────────┘
```

A rendered version of the runtime architecture is available at [`docs/architecture/baseline-architecture.png`](./docs/architecture/baseline-architecture.png).

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 18+ |
| Web framework | Express 4 |
| Database | PostgreSQL (`pg`) |
| Auth | JWT (`jsonwebtoken`) + bcrypt |
| Scheduler (worker) | `node-cron` |
| Containerization | Docker |
| Orchestration | Docker Compose |
| Container Registry | GitHub Container Registry (GHCR) |
| CI/CD | Jenkins |
| Testing | Jest + Supertest |
| Deployment target | Ubuntu Server VM on Proxmox |

---

## DevOps Scope

The project is developed incrementally through the following stages.

| Stage | Scope | Status |
|-------|-------|--------|
| 1 | Developer handoff & baseline validation | **Completed** — [`docs/baseline-validation.md`](./docs/baseline-validation.md) |
| 2 | Containerization & local orchestration | **Completed** — [`docs/docker-validation.md`](./docs/docker-validation.md) |
| 3 | CI/CD & application deployment | **Completed** — [`docs/cicd-validation.md`](./docs/cicd-validation.md) |
| 4 | Networking & reverse proxy | **Completed** — [`docs/networking-reverse-proxy.md`](./docs/networking-reverse-proxy.md) |
| 5 | TLS / HTTPS | **Completed** — [`docs/tls-https.md`](./docs/tls-https.md) |
| 6 | Security hardening | **Completed** — [`docs/security-hardening.md`](./docs/security-hardening.md) |
| 7 | Logging & monitoring | Planned |
| 8 | Kubernetes deployment | Planned |
| 9 | Scaling & operations | Planned |

Stages are implemented progressively so that each phase represents an actual infrastructure or operational improvement, validated with evidence before moving to the next.

---

## Deployment Architecture

The application is first validated locally using Docker Desktop and Docker Compose.

For the CI/CD stage, the application is built and tested by Jenkins, published as a container image to GitHub Container Registry, and deployed to a dedicated Linux VM.

```text
                         ┌─────────────────┐
                         │     GitHub      │
                         │   Source Code   │
                         └────────┬────────┘
                                  │
                                  │ SSH
                                  ▼
                         ┌─────────────────┐
                         │ Jenkins VM102   │
                         │ lab-devops-01   │
                         │                 │
                         │ Checkout        │
                         │ npm ci          │
                         │ npm test        │
                         │ Docker Build    │
                         │ Push to GHCR    │
                         │ Deploy          │
                         └────────┬────────┘
                                  │
                                  │ Docker Image
                                  ▼
                         ┌─────────────────┐
                         │      GHCR       │
                         │ Container Image │
                         └────────┬────────┘
                                  │
                                  │ Pull
                                  ▼
                    ┌──────────────────────────┐
                    │ VM101 — lab-app-01       │
                    │ Ubuntu Server             │
                    │                          │
                    │ Docker Compose            │
                    │                          │
                    │ ┌──────────┐              │
                    │ │   API    │              │
                    │ └────┬─────┘              │
                    │      │                    │
                    │ ┌────▼─────┐              │
                    │ │PostgreSQL│              │
                    │ └──────────┘              │
                    │                          │
                    │ ┌──────────┐              │
                    │ │  Worker  │              │
                    │ └──────────┘              │
                    └──────────────────────────┘
```

The CI server and application runtime are intentionally separated.

- VM102 (`lab-devops-01`) is used for Jenkins and CI/CD execution.
- VM101 (`lab-app-01`) is used as the application deployment target.
- GHCR is used as the container image registry between CI and deployment.

This separation keeps CI infrastructure independent from the application runtime.

---

## DevOps Responsibilities

This project focuses on operational concerns around the application:

- Environment and configuration management
- Containerization and container image design
- Process separation (API vs. worker)
- Service networking
- Database migration
- Health checks (liveness/readiness)
- Logging and log rotation
- CI/CD automation
- Container image registry management
- Deployment automation
- Secrets management
- Resource management
- Monitoring
- Reverse proxy and TLS
- Security hardening
- Kubernetes deployment
- Scaling and operations
- Operational documentation

The application business logic is intentionally kept outside the primary scope of this portfolio.

---

## Engineering Approach

```text
Developer Handoff
       │
       ▼
Baseline Validation          ← completed
       │
       ▼
Containerization             ← completed
       │
       ▼
Local Docker Validation      ← completed
       │
       ▼
CI/CD & Application Deploy   ← completed
       │
       ▼
Networking & Reverse Proxy   ← completed
       │
       ▼
TLS / HTTPS                  ← completed
       │
       ▼
Security Hardening           ← completed
       │
       ▼
Observability                ← planned
       │
       ▼
Kubernetes                   ← planned
       │
       ▼
Scaling & Operations         ← planned
```

Each stage documents:

1. The problem
2. The engineering decision
3. The implementation
4. The validation
5. The operational trade-offs

The project intentionally progresses from application handoff and validation toward containerization, automation, deployment, and eventually production-oriented operations.

---

## Current Implementation

The completed stages currently provide the following capabilities.

### Baseline

- Developer handoff documented
- Node.js application dependencies validated
- Automated tests passing
- PostgreSQL connectivity validated
- Database migration validated
- API liveness validated
- API readiness validated
- Background worker startup validated

### Docker

- Multi-process application separated into API and Worker containers
- PostgreSQL separated from application containers
- Production-oriented Node.js container image
- Non-root container execution
- Docker healthchecks
- Persistent PostgreSQL volume
- CPU and memory limits
- Container log rotation
- Docker Compose orchestration
- Failure validation for database availability

### CI/CD

- Jenkins running on dedicated CI VM
- GitHub repository integrated through SSH
- Automated dependency installation
- Automated test execution
- Docker image build
- Image publication to GHCR
- Deployment to dedicated Linux VM
- Database migration during deployment
- API liveness validation after deployment
- API readiness validation after deployment
- Worker runtime validation
- Deployed image verification

The latest validated deployment uses the GHCR image generated by Jenkins Build #10.

---

## CI/CD Flow

The current CI/CD pipeline follows this flow:

```text
GitHub
   │
   ▼
Checkout
   │
   ▼
Install Dependencies
   │
   ▼
Test
   │
   ▼
Build Docker Image
   │
   ▼
Push Image to GHCR
   │
   ▼
Deploy to VM101
   │
   ├── Pull Image
   ├── Start PostgreSQL
   ├── Wait for PostgreSQL Health
   ├── Run Database Migration
   ├── Start API + Worker
   ├── Wait for API Health
   ├── Check API Liveness
   ├── Check API Readiness
   ├── Check Worker
   └── Verify Deployed Image
   │
   ▼
Deployment Successful
```

CI/CD evidence is stored in [`docs/evidence/`](./docs/evidence/).

Relevant evidence includes:

- [`jenkins-pipeline-success.png`](./docs/evidence/jenkins-pipeline-success.png)
- [`jenkins-deploy-console.png`](./docs/evidence/jenkins-deploy-console.png)
- [`ghcr-image-10.png`](./docs/evidence/ghcr-image-10.png)
- [`vm101-deployment.png`](./docs/evidence/vm101-deployment.png)
- [`vm101-health-check.png`](./docs/evidence/vm101-health-check.png)

---

## Quick Start

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

Fill in the required database configuration and JWT secret.

Run the database migration:

```bash
npm run migrate
```

Start the API:

```bash
npm run dev
```

Start the background worker in a separate terminal:

```bash
npm run worker
```

---

## With Docker Compose

The application can also be run using Docker Compose:

```bash
docker compose up -d
```

This runs:

- API
- Worker
- PostgreSQL

The Compose configuration includes:

- PostgreSQL healthcheck
- API healthcheck
- Persistent database storage
- Resource limits
- Log rotation
- Service dependency handling

See [`docs/docker-validation.md`](./docs/docker-validation.md) for the local Docker validation results.

---

## Production Deployment

The deployment target is a dedicated Ubuntu Server VM running on the Proxmox homelab.

Production deployment uses:

```text
Jenkins VM102
      │
      ▼
GHCR
      │
      ▼
VM101
      │
      ▼
Docker Compose
      │
      ├── API
      ├── Worker
      └── PostgreSQL
```

The production Compose configuration is maintained separately from the local configuration.

The production deployment:

- Pulls the application image from GHCR
- Keeps PostgreSQL internal to the Compose network
- Stores PostgreSQL data in a persistent Docker volume
- Runs API and Worker as separate containers
- Uses healthchecks
- Applies resource limits
- Applies log rotation
- Runs database migration before starting the application
- Validates API liveness and readiness
- Validates Worker availability

Application secrets are provided on the deployment target and are not committed to Git.

---

## Testing

Run the automated test suite with:

```bash
npm test
```

The current baseline test suite passes successfully.

Test evidence is available at:

[`docs/evidence/tests-passed.png`](./docs/evidence/tests-passed.png)

---

## Database Migration

Database schema changes are maintained under:

```text
migrations/
```

The initial schema is defined in:

```text
migrations/001_init.sql
```

The migration runner is:

```text
scripts/migrate.js
```

Local migration:

```bash
npm run migrate
```

During deployment, Jenkins executes the migration on VM101 before starting the API and Worker.

This ensures the deployment process includes database schema initialization as part of the application release flow.

Migration evidence is available at:

[`docs/evidence/migration-success.png`](./docs/evidence/migration-success.png)

---

## Health Checks

The application exposes two health endpoints.

### Liveness

```text
GET /health/live
```

Used to determine whether the API process is alive.

### Readiness

```text
GET /health/ready
```

Used to determine whether the API can access its required database dependency.

The distinction allows the deployment system to differentiate between:

- An API process that is running
- An API process that is operationally ready

Both checks are used during the deployment validation process.

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | no | Register a new user |
| POST | `/auth/login` | no | Log in, returns a JWT |
| GET | `/bookmarks` | yes | List bookmarks (filters: `?tag=`, `?status=`) |
| POST | `/bookmarks` | yes | Create a bookmark |
| GET | `/bookmarks/:id` | yes | Get a bookmark's details |
| PATCH | `/bookmarks/:id` | yes | Update a bookmark's title/tags |
| DELETE | `/bookmarks/:id` | yes | Delete a bookmark |
| GET | `/health/live` | no | Liveness probe |
| GET | `/health/ready` | no | Readiness probe (checks database connectivity) |

Full application reference: [`docs/developer-handoff.md`](./docs/developer-handoff.md).

---

## Engineering Decisions

Notable infrastructure decisions are documented as the project evolves.

### Implemented

- Separating the API and Worker into independent containers
- Separating PostgreSQL from application containers
- Using Docker Compose for local and deployment orchestration
- Using healthchecks for service validation
- Running application containers as a non-root user
- Applying container CPU and memory limits
- Applying container log rotation
- Separating CI infrastructure from application runtime
- Using Jenkins as the CI/CD engine
- Using SSH authentication for GitHub access from Jenkins
- Publishing application images to GitHub Container Registry (GHCR)
- Using a dedicated registry credential for image publication
- Using a separate read-only registry credential on the deployment target
- Deploying the application to a dedicated Linux VM (`lab-app-01`)
- Keeping application secrets outside the Git repository
- Running database migration as part of deployment
- Validating the deployment using liveness, readiness, and worker checks

### Planned

- Introducing a reverse proxy
- TLS / HTTPS termination
- Further security hardening
- Centralized monitoring
- Metrics collection
- Alerting
- Kubernetes deployment
- Application scaling strategy
- Operational automation

---

## Repository Structure

```text
bookmark-manager-api/

│
├── docker/
│   └── Dockerfile
│
├── docs/
│   ├── developer-handoff.md
│   ├── baseline-validation.md
│   ├── docker-validation.md
│   │
│   ├── architecture/
│   │   ├── baseline-architecture.png
│   │   └── baseline-architecture.svg
│   │
│   └── evidence/
│       └── *.png
│
├── migrations/
│   └── 001_init.sql
│
├── scripts/
│
├── src/
│
├── tests/
│
├── .dockerignore
├── .env.example
├── .gitignore
├── compose.yaml
├── compose.prod.yaml
├── Jenkinsfile
├── jest.config.js
├── package.json
├── package-lock.json
└── README.md
```

Infrastructure-specific directories such as `k8s/` will be added as the project progresses through later stages.

---

## Evidence

Evidence is maintained separately from implementation documentation so that each major engineering stage can be independently validated.

### Baseline and Testing

- `tests-passed.png`
- `postgres-running.png`
- `migration-success.png`
- `api-liveness.png`
- `api-readiness.png`
- `worker-started.png`

### Docker

- `docker-compose-healthy.png`
- `docker-resource-limits.png`
- `docker-log-rotation.png`
- `docker-readiness-failure.png`

### CI/CD and Deployment

- `jenkins-pipeline-success.png`
- `jenkins-deploy-console.png`
- `ghcr-image-10.png`
- `vm101-deployment.png`
- `vm101-health-check.png`

The evidence demonstrates both local Docker validation and deployment to the Linux application VM.

---

## Portfolio Objective

The objective of this project is to demonstrate practical DevOps engineering through an end-to-end application lifecycle rather than isolated technology examples.

The project demonstrates the progression from a developer-provided application toward an operational deployment:

**Validate → Containerize → Automate → Deploy → Secure → Observe → Scale → Operate**

The current implementation has completed the validation, containerization, and CI/CD deployment stages.

The remaining stages will progressively introduce production-oriented networking, TLS, security hardening, observability, Kubernetes, and scaling.

---

## Disclaimer

The application source code is treated as a developer-provided application handoff.

The DevOps work in this repository focuses on infrastructure, deployment, automation, security, observability, scalability, and operational engineering around that application.