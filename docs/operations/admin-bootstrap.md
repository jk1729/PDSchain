# PDSChain v2 — Phase 2 Administrative Bootstrap & Operations Guide

## 1. Overview

Because PDSChain v2 enforces a strict self-contained RBAC model where ordinary citizens cannot grant themselves staff or administrative privileges, a cryptographically secure administrative bootstrap mechanism is required to initialize the system root account.

The administrative provisioning script is implemented in [`scripts/provision-admin.mjs`](file:///d:/pdschain-v2/scripts/provision-admin.mjs) and exposed via `npm run admin:provision`.

---

## 2. Configuration Parameters

The bootstrap process reads credentials from the environment (`.env`) or command line arguments:

| Environment Variable | Default Value          | Description                                                                                            |
| :------------------- | :--------------------- | :----------------------------------------------------------------------------------------------------- |
| `ADMIN_EMAIL`        | `admin@pdschain.local` | Email address of the primary root system administrator.                                                |
| `ADMIN_PASSWORD`     | `AdminSecure2026!`     | Initial password for the administrator (must satisfy 10+ chars, uppercase, lowercase, number, symbol). |
| `ADMIN_FULL_NAME`    | `System Administrator` | Official display name of the root administrator.                                                       |

---

## 3. Provisioning Mechanics & Idempotency

Executing `npm run admin:provision` performs the following steps:

1. **Database Connectivity Verification**:
   Validates active TCP connection to PostgreSQL (port 5432).
2. **Idempotency Check**:
   Queries `users` table for `ADMIN_EMAIL`.
   - If the account already exists and holds the `ADMIN` role, the script logs confirmation and exits with code 0 without modifying the existing password or active sessions.
   - If the account exists as a citizen without admin rights, it assigns the `ADMIN` canonical role in `user_role_assignments`.
3. **Argon2id Key Derivation**:
   Derives an Argon2id hash using the system standard parameters (64 MiB RAM, 3 iterations, 4 threads).
4. **Atomic Transaction**:
   Inside a Prisma database transaction:
   - Inserts record into `users` with `emailVerified = true`, `emailVerifiedAt = now()`, `status = 'ACTIVE'`.
   - Inserts global scope record into `user_role_assignments` with `role = 'ADMIN'`, `grantedById = 'SYSTEM_BOOTSTRAP'`.
   - Emits a structured record into `security_audit_events` with `action = 'ADMIN_BOOTSTRAP_PROVISIONED'`.

---

## 4. Operational Runbook

### 4.1 Running the Bootstrap

```powershell
# Default bootstrap:
npm run admin:provision

# Custom production administrator credentials:
$env:ADMIN_EMAIL="secops@bihar.pds.gov.in"
$env:ADMIN_PASSWORD="ProdCompliantKey998#!"
$env:ADMIN_FULL_NAME="PDS State Security Officer"
npm run admin:provision
```

### 4.2 Production Security Hardening

1. **Immediate Password Change**: Upon initial access, log into the web portal (`/login`) and immediately update the initial bootstrap password via account settings or the password reset flow.
2. **Session Security**: Confirm `SESSION_COOKIE_SECURE=true` in production to mandate TLS HTTPS cookie transmission.
3. **Environment Cleanup**: Remove or restrict access to any temporary setup script environment variables.
