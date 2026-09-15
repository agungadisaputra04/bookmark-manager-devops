# Security Hardening

## Objective

Harden the production deployment against common container and application security risks.

## Implemented Controls

| Control | Implementation |
|---|---|
| Secrets | Production secrets stored in `.env`, excluded from Git |
| Container user | API and Worker run as non-root `node` user |
| Port exposure | Only Nginx exposes host ports 80/443 |
| Privilege escalation | `no-new-privileges` enabled |
| Security headers | Nginx adds baseline security headers |
| TLS | HTTPS terminated at Nginx |

## Validation

| Check | Result |
|---|---|
| API runs as non-root | PASS |
| Worker runs as non-root | PASS |
| Only Nginx exposes host ports | PASS |
| `.env` protected with `600` permissions | PASS |
| `no-new-privileges` enabled | PASS |
| Nginx security headers present | PASS |
| HTTPS endpoint accessible | PASS |

## Evidence

- [Non-root containers](evidence/security-non-root.png)
- [Port exposure](evidence/security-port-exposure.png)
- [Environment protection](evidence/security-env-protection.png)
- [No-new-privileges](evidence/security-no-new-privileges.png)
- [Nginx security headers](evidence/security-headers.png)

## Residual Risks

- TLS uses a self-signed certificate in the homelab environment.
- TLS private key remains on VM101 and is not stored in Git.
- GHCR pull credentials are stored in the Docker client configuration.
- PostgreSQL credential rotation remains an operational procedure.

## Result

The production deployment now applies basic container, network, secret, privilege, and HTTP security controls while keeping the application architecture simple and reproducible.