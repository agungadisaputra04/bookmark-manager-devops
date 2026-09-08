# Bookmark Manager API — DevOps Engineering Portfolio

DevOps implementation of a developer-provided Node.js application.

## Overview

This repository demonstrates the process of taking an existing application
handoff from a developer and preparing it for reliable deployment and
operations.

The application source code is treated as a developer deliverable. The
primary focus of this repository is the DevOps engineering required to build,
deploy, secure, observe, and operate the application.

The original developer handoff is preserved in:

`docs/developer-handoff.md`

---

## Application

The application is a Bookmark Manager API consisting of three main
components:

- REST API server
- Background worker
- PostgreSQL database

The API and worker run as separate stateless processes and share the same
PostgreSQL database.

```text
                    ┌─────────────────┐
                    │     Client      │
                    └────────┬────────┘
                             │ HTTP
                             ▼
                    ┌─────────────────┐
                    │    API Server   │
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

---

## DevOps Scope

The project is developed incrementally through the following stages.

| Stage | Scope | Status |
|---|---|---|
| 1 | Developer handoff & baseline validation | In Progress |
| 2 | Containerization | Planned |
| 3 | Local orchestration | Planned |
| 4 | Networking & reverse proxy | Planned |
| 5 | TLS / HTTPS | Planned |
| 6 | CI/CD | Planned |
| 7 | Security hardening | Planned |
| 8 | Logging & monitoring | Planned |
| 9 | Kubernetes deployment | Planned |
| 10 | Scaling & operations | Planned |

The stages are implemented progressively so that each phase represents an
actual infrastructure or operational improvement.

---

## DevOps Responsibilities

This project focuses on operational concerns around the application:

- Environment and configuration management
- Containerization
- Container image design
- Process separation
- Service networking
- Reverse proxy
- TLS termination
- Secrets management
- Health checks
- Logging
- Monitoring
- CI/CD automation
- Security hardening
- Kubernetes deployment
- Resource management
- Scaling
- Operational documentation

The application business logic is intentionally kept outside the primary
scope of this portfolio.

---

## Engineering Approach

The system will evolve through the following process:

```text
Developer Handoff
       │
       ▼
Baseline Validation
       │
       ▼
Containerization
       │
       ▼
Local Deployment
       │
       ▼
Networking
       │
       ▼
CI/CD
       │
       ▼
Security
       │
       ▼
Observability
       │
       ▼
Kubernetes
       │
       ▼
Scaling & Operations
```

Each stage documents:

1. The problem
2. The engineering decision
3. The implementation
4. The validation
5. The operational trade-offs

---

## Baseline Validation

Before introducing infrastructure changes, the application is validated in its
original developer-provided state.

The baseline includes:

- Dependency installation
- Application tests
- PostgreSQL connectivity
- Database migration
- API startup
- Liveness health check
- Readiness health check
- Worker startup

This establishes a known-good application baseline before DevOps
modifications are introduced.

---

## Engineering Decisions

Important infrastructure decisions are documented as Architecture Decision
Records (ADRs).

Examples include:

- Separating the API and worker into independent containers
- Separating the database from application containers
- Introducing a reverse proxy
- Designing application health checks
- Managing configuration and secrets
- Introducing Kubernetes
- Defining application scaling strategy

---

## Repository Structure

```text
bookmark-manager-api/
│
├── docs/
│   └── developer-handoff.md
│
├── migrations/
├── scripts/
├── src/
├── tests/
│
├── .env.example
├── .gitignore
├── jest.config.js
├── package.json
├── package-lock.json
└── README.md
```

Infrastructure-specific directories will be added as the project progresses.

---

## Portfolio Objective

The objective of this project is to demonstrate practical DevOps engineering
through an end-to-end application lifecycle rather than isolated technology
examples.

The final system should demonstrate the ability to take a developer-provided
application and operate it through:

**Build → Deploy → Secure → Observe → Scale → Operate**

---

## Disclaimer

The application source code is treated as a developer-provided application
handoff.

The DevOps work in this repository focuses on infrastructure, deployment,
automation, security, observability, scalability, and operational engineering
around that application.