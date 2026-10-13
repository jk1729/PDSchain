# PDSChain v2 — Phase 2 Threat Model & Security Posture

## 1. Scope & System Assets

Phase 2 protects the identity, authorization boundaries, and auditable governance logs of the Public Distribution System against unauthorized manipulation, privilege escalation, and credential abuse.

### Critical Assets:

1. **User Identity & Credentials**: Argon2id password hashes, recovery tokens, active session cookies.
2. **Access Control Integrity**: Canonical role assignments (`CITIZEN`, `FPS_OPERATOR`, `WAREHOUSE_MANAGER`, `DISTRICT_OFFICER`, `ADMIN`) and geographical/facility scopes (`districtCode`, `warehouseCode`, `shopCode`).
3. **Security Audit Trail**: Non-repudiable log of authentication attempts, role approvals, suspensions, and access rejections.

---

## 2. Threat Analysis & Mitigations

### 2.1 Threat: Credential Guessing & Brute Force Attacks

- **Vector**: Automated dictionary or brute-force attacks against `/api/v1/auth/login`.
- **Mitigations**:
  - **In-Memory Rate Limiting**: `RateLimiter` enforces strict quotas: 5 consecutive failed login attempts trigger a progressive lockout per IP/email tuple.
  - **High-Cost Argon2id Hashing**: Parameterized with $m = 65,536\text{ KiB}$ and $t = 3$, imposing high computational and memory overhead on automated offline and online guessing tools.
  - **Constant-Time Verification**: Password verification is isolated via `@node-rs/argon2` native bindings.

### 2.2 Threat: Cross-Site Request Forgery (CSRF)

- **Vector**: A malicious third-party site tricks an authenticated user's browser into submitting state-changing requests (e.g. submitting a fraudulent staff access request or administrative role grant).
- **Mitigations**:
  - **Double Submit Cookie Pattern**: The NestJS server drops a random CSRF secret into `pdschain_csrf`.
  - **SameSite=Lax**: Prevents cookie transmission on cross-origin POST requests.
  - **Header Verification**: Every mutating HTTP request (`POST`, `PUT`, `PATCH`, `DELETE`) must provide `X-CSRF-Token` header matching the active session state.

### 2.3 Threat: Session Fixation & Session Hijacking

- **Vector**: Interception or manipulation of session identifiers over the network or via script injection.
- **Mitigations**:
  - **HttpOnly Cookies**: Session cookie `pdschain_session` cannot be read via `document.cookie` or injected JavaScript.
  - **Hashed Session Tokens**: The database stores only $\text{SHA-256}(\text{sessionToken})$. If the database is read or dumped, session values cannot be hijacked.
  - **Session Invalidation on Password Reset**: Resetting a password immediately invalidates all existing sessions in PostgreSQL (`revokedAt = now()`), forcefully terminating any stale or compromised connections.
  - **Admin Remote Revocation**: Administrators can terminate all sessions of any user at any moment.

### 2.4 Threat: Privilege Escalation & Scope Tampering

- **Vector**: A malicious citizen directly calls administrative endpoints or attempts to inspect another district's grain storage.
- **Mitigations**:
  - **Dual Guards**: Every protected endpoint enforces both `SessionAuthGuard` (identity validation) and `RolesGuard` (canonical role policy).
  - **Backend Authority**: Role memberships and scope values (`districtCode`, `warehouseCode`, `shopCode`) are read exclusively from the database on every request, never trusted from client JWT payloads or request bodies.
  - **Admin Approval Gate**: Staff roles cannot be self-assigned; they require explicit review and approval by an authenticated `ADMIN`.

### 2.5 Threat: Token Leakage & Replay Attacks

- **Vector**: An attacker intercepts an email verification or password reset token and attempts replay.
- **Mitigations**:
  - **One-Way Token Hashing**: Verification tokens are hashed with SHA-256 before persistence.
  - **Single-Use Enforcement**: Tokens track `usedAt`. Subsequent redemption attempts are denied.
  - **Strict Expiry Windows**: Email tokens expire in 24 hours; password reset tokens expire in 1 hour.

---

## 3. Security Audit Logging

All security-sensitive operations generate structured rows in `security_audit_events`:

- `LOGIN_SUCCESS` / `LOGIN_FAILURE`
- `LOGOUT`
- `REGISTRATION_CITIZEN`
- `EMAIL_VERIFIED`
- `PASSWORD_RESET_REQUESTED` / `PASSWORD_RESET_COMPLETED`
- `STAFF_REQUEST_SUBMITTED` / `STAFF_REQUEST_APPROVED` / `STAFF_REQUEST_REJECTED`
- `USER_SUSPENDED` / `USER_UNSUSPENDED`
- `ROLE_ASSIGNED` / `ROLE_REVOKED`

Each event captures `userId`, `action`, `resource`, `ipAddress`, `userAgent`, and a `metadata` JSON blob for forensic auditability.
