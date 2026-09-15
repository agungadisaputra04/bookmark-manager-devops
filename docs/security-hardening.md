# Security Hardening

## Objective

Harden the production deployment of Bookmark Manager by reducing common container, network, secret-management, and HTTP security risks.

The hardening is applied at the deployment and reverse-proxy layer without changing the application architecture.

## Security Controls Implemented

### 1. Secrets Externalized

Production database credentials are no longer hardcoded in `compose.prod.yaml`.

The production Compose file reads database configuration from environment variables:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `JWT_SECRET`

The actual production `.env` file exists only on VM101 and is excluded from Git.

The repository only contains `.env.example` with placeholder values.

This prevents production credentials from being committed to source control.

### 2. Production `.env` Protection

The production environment file is stored on VM101:

```text
/opt/bookmark-manager/.env
```

Its permissions are restricted to the deployment user:

```text
-rw------- 1 agung agung .env
```

The file is not tracked by Git.

### 3. Non-Root Containers

The API and Worker containers run using the non-root `node` user provided by the Node.js base image.

Runtime validation:

```bash
docker exec bookmark-api id
docker exec bookmark-worker id
```

Expected result:

```text
uid=1000(node) gid=1000(node) groups=1000(node)
```

Running application processes as a non-root user reduces the impact of a potential container compromise.

### 4. Internal-Only Application and Database Ports

Only Nginx exposes ports to the VM host:

```text
80  → Nginx HTTP
443 → Nginx HTTPS
```

The API, Worker, and PostgreSQL services remain internal to the Docker network.

Runtime validation:

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

Current exposure:

```text
bookmark-nginx      0.0.0.0:80->80/tcp
bookmark-nginx      0.0.0.0:443->443/tcp
bookmark-api        3000/tcp
bookmark-worker     3000/tcp
bookmark-postgres   5432/tcp
```

This prevents direct external access to the API and PostgreSQL ports.

### 5. `no-new-privileges`

The API, Worker, and Nginx containers use:

```yaml
security_opt:
  - no-new-privileges:true
```

Runtime validation:

```bash
docker inspect -f '{{.Name}} security_opt={{json .HostConfig.SecurityOpt}}' \
  bookmark-api bookmark-worker bookmark-nginx
```

Expected result:

```text
["no-new-privileges:true"]
```

This prevents processes inside the container from gaining additional Linux privileges through mechanisms such as `setuid` or `setgid`.

### 6. Nginx Security Headers

Nginx adds baseline security headers to HTTPS responses:

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "no-referrer" always;
```

Purpose:

| Header | Purpose |
|---|---|
| `X-Content-Type-Options: nosniff` | Prevents browsers from MIME-sniffing responses |
| `X-Frame-Options: DENY` | Prevents the application from being embedded in an iframe |
| `Referrer-Policy: no-referrer` | Prevents the browser from sending the originating URL as the referrer |

Validation:

```powershell
curl.exe -k -I https://192.168.50.10/health/live
```

Expected response includes:

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
```

### 7. Nginx as Security Boundary

The deployment uses Nginx as the only externally exposed application entry point.

```text
Client
  │
  │ HTTPS :443
  ▼
Nginx
  │
  │ Docker internal network
  ▼
API :3000
  │
  ▼
PostgreSQL :5432

Worker ───────► PostgreSQL
```

The API and database are therefore not directly reachable from the external network.

## Validation Summary

| Control | Result |
|---|---|
| Production secrets externalized | PASS |
| `.env` excluded from Git | PASS |
| `.env` permissions restricted | PASS |
| API runs as non-root | PASS |
| Worker runs as non-root | PASS |
| API port not exposed to host | PASS |
| Worker port not exposed to host | PASS |
| PostgreSQL port not exposed to host | PASS |
| `no-new-privileges` enabled | PASS |
| Nginx security headers | PASS |
| HTTPS endpoint remains accessible | PASS |

## Residual Risks

This implementation is designed for the homelab environment and still has several known limitations:

1. TLS currently uses a self-signed certificate because the environment does not use a public DNS name.
2. The TLS private key is stored on VM101 and is intentionally not committed to Git.
3. The VM101 Docker registry credential is a read-only GHCR token, but Docker stores the credential in the local Docker configuration without encrypted credential storage.
4. PostgreSQL credentials are externalized from Git, but credential rotation should be handled separately as an operational procedure.

## Evidence

- `docs/evidence/security-non-root.png`
- `docs/evidence/security-port-exposure.png`
- `docs/evidence/security-env-protection.png`
- `docs/evidence/security-no-new-privileges.png`
- `docs/evidence/security-headers.png`

## Conclusion

The production deployment has been hardened against several common risks:

- accidental secret exposure through source control
- unnecessary root privileges inside containers
- unnecessary host port exposure
- privilege escalation inside containers
- missing baseline browser security headers

The resulting architecture keeps Nginx as the external security boundary while API, Worker, and PostgreSQL remain isolated inside the Docker network.