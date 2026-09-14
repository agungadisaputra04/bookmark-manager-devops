# CI/CD & Application Deployment Validation

## Objective

Automate the delivery of the Bookmark Manager application from source
control to the application VM using Jenkins.

The pipeline validates the complete delivery path:

``` text
GitHub
   ↓
Jenkins
   ↓
npm ci
   ↓
npm test
   ↓
Docker build
   ↓
GHCR
   ↓
VM101
   ↓
Docker Compose
   ↓
API + Worker + PostgreSQL
```

The goal is to demonstrate a working CI/CD workflow with separate CI
infrastructure and application runtime, immutable image tags, remote
deployment, database migration, health validation, and deployment
verification.

## Environment

  Component                 Role
  ------------------------- -------------------------------------------------
  GitHub                    Source code repository
  VM102 / `lab-devops-01`   Jenkins CI/CD server
  Jenkins                   Pipeline execution and deployment orchestration
  GHCR                      Private Docker image registry
  VM101 / `lab-app-01`      Application deployment target
  Docker Compose            Production application orchestration
  PostgreSQL                Application database

The deployment architecture is:

``` text
                    ┌─────────────────┐
                    │     GitHub      │
                    │      main       │
                    └────────┬────────┘
                             │ SSH
                             ▼
                    ┌─────────────────┐
                    │ Jenkins VM102   │
                    │ lab-devops-01   │
                    └───────┬─────────┘
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
          npm ci          npm test     Docker build
                                            │
                                            ▼
                                      ┌─────────────┐
                                      │     GHCR    │
                                      │ image:<tag> │
                                      └──────┬──────┘
                                             │
                                             │ SSH + pull
                                             ▼
                                    ┌─────────────────┐
                                    │ Application VM101│
                                    │  lab-app-01     │
                                    └────────┬────────┘
                                             │
                                      Docker Compose
                                             │
                           ┌─────────────────┼─────────────────┐
                           ▼                 ▼                 ▼
                         API              Worker          PostgreSQL
```

## Jenkins Configuration

Jenkins is installed natively on VM102 rather than inside Docker.

This keeps the CI server independent from the application containers it
builds and deploys.

Jenkins runs as the `jenkins` system user and has controlled access to:

-   GitHub through an SSH key
-   Docker on VM102
-   GHCR through a dedicated credential
-   VM101 through a dedicated deployment SSH key

## GitHub Access

The Jenkins GitHub SSH key is stored under the Jenkins account:

``` text
/var/lib/jenkins/.ssh/id_ed25519
```

The corresponding public key is registered in GitHub as:

``` text
Jenkins - lab-devops-01
```

Authentication was validated with:

``` bash
sudo -u jenkins ssh -T git@github.com
```

The connection authenticated successfully against the GitHub account
used by the repository.

Jenkins therefore retrieves source code through SSH rather than
embedding a GitHub password or token in the pipeline.

## Jenkins Job

The Jenkins job is:

``` text
bookmark-manager-ci
```

The job uses:

``` text
Definition: Pipeline script from SCM
SCM: Git
Repository: git@github.com:agungadisaputra04/bookmark-manager-devops.git
Credentials: github-ssh
Branch: */main
Script Path: Jenkinsfile
```

This keeps the pipeline definition inside the repository and makes the
CI/CD configuration version-controlled.

## Jenkins Credentials

Three separate credential purposes are used.

  Credential           Purpose
  -------------------- ------------------------------------
  `github-ssh`         Jenkins → GitHub repository access
  `ghcr-credentials`   Jenkins → GHCR image push
  `vm101-deploy-ssh`   Jenkins → VM101 deployment access

The credentials are intentionally separated by function.

The GHCR credential has write capability because Jenkins publishes
images.

The VM101 host uses a separate read-only GHCR token for pulling images.
The Jenkins write credential is not copied to the application VM.

## Docker Access from Jenkins

Jenkins requires Docker access to build the application image.

The Jenkins user was added to the Docker group:

``` bash
sudo usermod -aG docker jenkins
```

After restarting Jenkins, Docker access was validated with:

``` bash
sudo -u jenkins docker info
```

This confirms that Jenkins can invoke Docker directly on VM102 without
using Docker-in-Docker.

## Node.js Runtime

Node.js is installed on VM102 because the pipeline executes the
application's dependency installation and test commands before building
the image.

The runtime used during validation was Node.js 24 with npm 11.

The application itself also uses Node.js 24 in the Docker image.

## GHCR Image Strategy

The Docker image is published to:

``` text
ghcr.io/agungadisaputra04/bookmark-manager-devops
```

The pipeline uses the Jenkins build number as the image tag:

``` text
IMAGE_TAG = BUILD_NUMBER
```

For example:

``` text
ghcr.io/agungadisaputra04/bookmark-manager-devops:10
```

Using build-number tags provides an immutable reference to the image
produced by a specific Jenkins build.

The deployment target therefore does not need to rely on an ambiguous
`latest` tag.

## Pipeline Stages

The Jenkins pipeline contains these stages:

``` text
Checkout
   ↓
Install Dependencies
   ↓
Test
   ↓
Build Docker Image
   ↓
Push to GHCR
   ↓
Deploy
```

### 1. Checkout

Jenkins checks out the `main` branch from GitHub using the configured
SSH credential.

Purpose:

-   Retrieve the exact source revision
-   Load the repository's `Jenkinsfile`
-   Provide the source tree for testing and image building

### 2. Install Dependencies

The pipeline executes:

``` bash
npm ci
```

`npm ci` is used instead of `npm install` because the CI environment
should install the dependency versions represented by the lockfile.

### 3. Test

The pipeline executes:

``` bash
npm test
```

The existing application test suite must pass before Docker image
publication.

This prevents an image from being published when the application tests
fail.

### 4. Build Docker Image

The pipeline builds the image using:

``` bash
docker build \
  -f docker/Dockerfile \
  -t ${IMAGE_NAME}:${IMAGE_TAG} .
```

The image is tagged using the Jenkins build number.

Example:

``` text
ghcr.io/agungadisaputra04/bookmark-manager-devops:10
```

### 5. Push to GHCR

Jenkins authenticates to GHCR using the `ghcr-credentials` credential.

The pipeline executes:

``` bash
echo "$GHCR_TOKEN" | docker login ghcr.io \
  -u "$GHCR_USER" \
  --password-stdin

docker push ${IMAGE_NAME}:${IMAGE_TAG}

docker logout ghcr.io
```

The token is supplied to the command through Jenkins credentials binding
rather than being written directly into the Jenkinsfile.

### 6. Deploy

The deployment stage performs the following operations:

``` text
Copy compose.prod.yaml
        ↓
SSH to VM101
        ↓
Pull image
        ↓
Start PostgreSQL
        ↓
Wait for PostgreSQL healthy
        ↓
Run database migration
        ↓
Start API + Worker
        ↓
Wait for API healthy
        ↓
Check liveness
        ↓
Check readiness
        ↓
Check Worker
        ↓
Verify deployed image
        ↓
Show final Compose status
```

## VM101 Deployment Target

The application is deployed to:

``` text
Host: lab-app-01
IP: 192.168.50.10
Directory: /opt/bookmark-manager
```

The deployment directory contains the production Compose configuration
and runtime environment.

The production `.env` file is kept on the VM and is not committed to
Git.

Its permissions are restricted:

``` text
chmod 600
```

## Production Compose Configuration

The deployment uses:

``` text
compose.prod.yaml
```

The production Compose file runs:

``` text
bookmark-api
bookmark-worker
bookmark-postgres
```

Unlike the local Compose configuration, PostgreSQL does not publish port
`5432` to the host.

The database is therefore reachable by the application services through
the internal Docker network.

The API publishes:

``` text
3000:3000
```

for external access from the application VM.

## Image Pull

The VM101 deployment uses the exact image tag produced by Jenkins.

For Build #10:

``` text
ghcr.io/agungadisaputra04/bookmark-manager-devops:10
```

VM101 authenticates to GHCR using a separate pull-only credential with
package read permission.

This creates the intended permission separation:

``` text
Jenkins
  └── GHCR write

VM101
  └── GHCR read
```

## Database Migration

Database migration is executed during deployment after PostgreSQL
becomes healthy.

The command is:

``` bash
IMAGE_TAG="$IMAGE_TAG" docker compose \
  -f compose.prod.yaml \
  run --rm -T api npm run migrate </dev/null
```

The migration runs using the same application image that is being
deployed.

This keeps the migration runtime aligned with the application runtime.

The migration must complete successfully before the API and Worker are
started.

## PostgreSQL Health Validation

The deployment waits for the PostgreSQL Docker healthcheck:

``` bash
docker inspect -f '{{.State.Health.Status}}' bookmark-postgres
```

The deployment continues only when:

``` text
healthy
```

is reported.

A timeout is treated as a deployment failure.

## API Health Validation

After API startup, the deployment waits for:

``` text
bookmark-api = healthy
```

The Docker healthcheck uses:

``` text
GET /health/live
```

The deployment then explicitly checks both application endpoints.

### Liveness

``` text
/health/live
```

Validation:

``` bash
docker exec bookmark-api node -e "
    require('http').get(
        'http://localhost:3000/health/live',
        r => process.exit(r.statusCode === 200 ? 0 : 1)
    ).on('error', () => process.exit(1))
"
```

### Readiness

``` text
/health/ready
```

Validation:

``` bash
docker exec bookmark-api node -e "
    require('http').get(
        'http://localhost:3000/health/ready',
        r => process.exit(r.statusCode === 200 ? 0 : 1)
    ).on('error', () => process.exit(1))
"
```

Readiness confirms that the API can communicate with PostgreSQL.

## Worker Validation

The Worker is not an HTTP service, so the deployment checks its
container state:

``` bash
docker inspect -f '{{.State.Status}}' bookmark-worker
```

Expected state:

``` text
running
```

If the Worker is not running, the deployment fails and the recent Worker
logs are displayed.

## Image Verification

The deployment explicitly verifies the image configured for the API and
Worker:

``` bash
docker inspect bookmark-api \
  --format 'API image: {{.Config.Image}}'

docker inspect bookmark-worker \
  --format 'Worker image: {{.Config.Image}}'
```

For Build #10, the expected image is:

``` text
ghcr.io/agungadisaputra04/bookmark-manager-devops:10
```

This provides evidence that the VM is running the image produced by the
corresponding Jenkins build.

## Successful Deployment --- Build #10

Build #10 completed the complete CI/CD flow successfully.

Validated stages:

``` text
Checkout             PASS
Install Dependencies  PASS
Test                  PASS
Build Docker Image    PASS
Push to GHCR          PASS
Deploy                PASS
```

The application VM reported:

``` text
bookmark-api       Up (healthy)
bookmark-worker    Up
bookmark-postgres  Up (healthy)
```

The deployed API and Worker used image tag:

``` text
:10
```

## Deployment Validation Results

  Validation                    Result
  ----------------------------- --------
  GitHub checkout               PASS
  Dependency installation       PASS
  Application tests             PASS
  Docker image build            PASS
  GHCR image push               PASS
  VM101 SSH deployment          PASS
  PostgreSQL startup            PASS
  PostgreSQL healthcheck        PASS
  Database migration            PASS
  API startup                   PASS
  API liveness                  PASS
  API readiness                 PASS
  Worker startup                PASS
  Deployed image verification   PASS

## Evidence

The CI/CD implementation is supported by the following repository
evidence:

  --------------------------------------------------------------------------------
  Evidence                                       Purpose
  ---------------------------------------------- ---------------------------------
  `docs/evidence/jenkins-pipeline-success.png`   Jenkins pipeline stages completed
                                                 successfully

  `docs/evidence/jenkins-deploy-console.png`     Deployment console output and
                                                 validation results

  `docs/evidence/ghcr-image-10.png`              Image tag `:10` published to GHCR

  `docs/evidence/vm101-deployment.png`           VM101 production containers and
                                                 deployed image

  `docs/evidence/vm101-health-check.png`         API health validation on the
                                                 deployment target
  --------------------------------------------------------------------------------

## Troubleshooting: Remote Migration Command

An earlier deployment attempt exposed an issue with the SSH heredoc used
by the Jenkins deployment script.

The migration command originally used:

``` bash
docker compose -f compose.prod.yaml run --rm api npm run migrate
```

`docker compose run` keeps standard input attached by default.

Because the command was executed inside an SSH heredoc, the command
consumed the remaining heredoc input. The remote deployment script
therefore terminated before executing the remaining deployment steps.

The Jenkins build could appear successful even though the application
deployment had not completed.

The fix was:

``` bash
docker compose -f compose.prod.yaml run --rm -T api npm run migrate </dev/null
```

Two details are important:

-   `-T` disables pseudo-TTY allocation
-   `</dev/null` prevents the Compose command from consuming the SSH
    heredoc input

The deployment script was also changed to explicitly propagate the image
tag:

``` bash
IMAGE_TAG="$IMAGE_TAG" docker compose ...
```

This ensures every Compose operation uses the image tag generated by the
current Jenkins build.

The corrected pipeline was validated successfully by Build #10.

## Security Considerations

The pipeline separates credentials by responsibility.

``` text
GitHub SSH key
    → source checkout

GHCR write credential
    → image publication

VM101 SSH key
    → remote deployment

VM101 GHCR read-only token
    → image pull
```

Secrets are not stored in Git.

The production JWT secret is stored in the VM101 environment file.

The Jenkins pipeline obtains the GHCR token through Jenkins credential
binding.

The VM101 deployment does not receive Jenkins' GHCR write credential.

## Engineering Decisions

### Separate CI and Application VMs

Jenkins runs on VM102 while the application runs on VM101.

This provides separation between:

``` text
CI/CD infrastructure
        ≠
Application runtime
```

A CI failure or Jenkins maintenance therefore does not require the
application containers to run on the same VM.

### Immutable Build Tags

Jenkins build numbers are used as image tags.

Example:

``` text
Build #10
    ↓
image:10
```

This makes the deployed artifact traceable to a specific CI execution.

### Migration Before Application Startup

The deployment runs the database migration after PostgreSQL is healthy
and before starting API and Worker.

This creates an explicit deployment sequence rather than relying on
application startup to implicitly prepare the database.

### Deployment Verification

The pipeline does not stop after `docker compose up`.

It verifies:

-   PostgreSQL health
-   API health
-   API liveness
-   API readiness
-   Worker runtime state
-   deployed image tag
-   final Compose status

This reduces the chance of reporting a successful deployment when the
runtime is actually unhealthy.

## Conclusion

The Bookmark Manager project now has a working CI/CD delivery path from
source control to the application VM.

The validated flow is:

``` text
GitHub
  ↓
Jenkins VM102
  ↓
Install + Test
  ↓
Docker Build
  ↓
GHCR
  ↓
VM101
  ↓
Docker Compose
  ↓
Database Migration
  ↓
API + Worker + PostgreSQL
  ↓
Health & Deployment Verification
```

Build #10 successfully demonstrated the complete flow using image tag
`:10`.

The project has therefore progressed from:

``` text
Developer handoff
      ↓
Baseline validation
      ↓
Docker containerization
      ↓
CI/CD
      ↓
Remote application deployment
```

The next planned engineering stage is networking and reverse proxy
configuration, followed by TLS/HTTPS, security hardening, observability,
Kubernetes, and scaling.
