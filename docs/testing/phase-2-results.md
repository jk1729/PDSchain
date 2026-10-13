# PDSChain v2 — Phase 2 Verification & Test Results Report

## 1. Test Summary Overview

Phase 2 introduces a multi-tier automated test suite guaranteeing end-to-end functionality, cryptographically sound authentication, granular role-based authorization, and real browser verification:

| Workspace                 | Test Runner              | File                         |     Tests      |     Status      |
| :------------------------ | :----------------------- | :--------------------------- | :------------: | :-------------: |
| `@pdschain/api`           | Jest + Supertest         | `test/health.e2e-spec.ts`    |       6        | **PASS** (100%) |
| `@pdschain/api`           | Jest + Supertest         | `test/auth-rbac.e2e-spec.ts` |       27       | **PASS** (100%) |
| `@pdschain/web`           | Vitest + Testing Library | `tests/app.test.tsx`         |       5        | **PASS** (100%) |
| `@pdschain/web`           | Vitest + Testing Library | `tests/auth-rbac.test.tsx`   |       8        | **PASS** (100%) |
| `@pdschain/contracts`     | Hardhat + Ethers.js      | `test/PDSChainSmoke.test.ts` |       4        | **PASS** (100%) |
| Root E2E Browser          | Playwright (Chromium)    | `tests/smoke.spec.ts`        |       2        | **PASS** (100%) |
| Root E2E Browser          | Playwright (Chromium)    | `tests/auth-rbac.spec.ts`    | 1 (6 Journeys) | **PASS** (100%) |
| **Total Automated Tests** | —                        | —                            |  **53 Tests**  | **ALL PASSING** |

---

## 2. API Integration Tests (`test/auth-rbac.e2e-spec.ts`)

### Coverage Domains:

1. **User Registration & Email Verification**:
   - Rejection of invalid emails and short passwords (`BAD_REQUEST`).
   - Default assignment of canonical role `CITIZEN`.
   - Anti-enumeration defense returning idempotent success on duplicate emails.
   - Offline development mailbox delivery (`.dev-mailbox/`).
   - Token hashing (SHA-256) preventing database plaintext leakage.
   - Token single-use enforcement preventing replay attacks.
2. **Session Authentication & CSRF Protection**:
   - Invalid password rejection (`INVALID_CREDENTIALS`).
   - Rejection of unverified accounts (`EMAIL_NOT_VERIFIED`).
   - Issuance of `HttpOnly` session cookies and `SameSite=Lax` cookies.
   - CSRF validation: mutating requests (`PATCH`, `POST`, `DELETE`) rejected with `CSRF_TOKEN_MISSING` if `x-csrf-token` header is absent.
   - Session introspection via `/api/v1/auth/me`.
3. **Password Reset & Immediate Revocation**:
   - Forgot-password token dispatch.
   - Password update with Argon2id re-hashing.
   - Verification that previous session cookies are immediately rejected (`SESSION_EXPIRED_OR_REVOKED`).
4. **Staff Access Request & Scoped RBAC**:
   - Verified citizen applies for `FPS_OPERATOR` with `districtCode: DIST-PATNA`, `shopCode: FPS-101`.
   - Prevention of duplicate pending requests for identical scope (`DUPLICATE_PENDING_REQUEST`).
   - Citizen denied administrative approval rights (`INSUFFICIENT_ROLE_PERMISSIONS`).
   - Admin approves request; user receives scoped role assignment.
   - Re-authenticated citizen gains access to authorized scope (`FPS-101`), while requests for unassigned shop (`FPS-999`) fail with `403 Forbidden`.
5. **Account Suspension & Audit Trail**:
   - Admin suspends citizen account.
   - Active sessions immediately terminated (`SESSION_EXPIRED_OR_REVOKED`).
   - Login attempts rejected with `ACCOUNT_SUSPENDED`.
   - Immutable security audit events logged for all actions (`LOGIN_SUCCESS`, `STAFF_REQUEST_SUBMITTED`, `STAFF_REQUEST_APPROVED`, `USER_SUSPENDED`).

---

## 3. Frontend Unit & Component Tests (`apps/web`)

1. **`tests/app.test.tsx`**:
   - Welcome screen loads with live health summary.
   - Error display fallback on unreachable backend.
   - ErrorBoundary catches and isolates component crashes.
   - Diagnostic ping form validation and interactive acknowledgment.
2. **`tests/auth-rbac.test.tsx`**:
   - Login page form submission with valid credentials.
   - API error message rendering on invalid credentials.
   - ProtectedRoute redirects unauthenticated visitors to `/login`.
   - ProtectedRoute enforces RBAC: redirects `CITIZEN` attempting access to `/admin/users` to `/unauthorized` (403).
   - Allows `ADMIN` user access to `/admin/users` dashboard.
   - Client-side registration form validation (password matching, minimum length, terms checkbox).
   - Verify email token submission.
   - Password reset request submission.

---

## 4. Playwright Browser Journeys (`tests/auth-rbac.spec.ts`)

The end-to-end browser test verifies real human user workflows through the Vite React single-page app interacting with the NestJS API and PostgreSQL:

- **Journey A (Citizen Registration & Email Activation)**: Fills registration form, retrieves CSPRNG verification token from `.dev-mailbox/`, activates account via `/verify-email`.
- **Journey B (Authentication Lifecycle)**: Tests failed login alert, successful login redirect to `/profile`, session persistence across browser reload (`F5`), and clean logout.
- **Journey C (Password Reset & Session Invalidation)**: Requests reset link, extracts token, submits new password, confirms old password fails, and verifies new password succeeds.
- **Journey D (Staff Access Application & Admin Approval Queue)**: Submits staff access request for `FPS_OPERATOR` on `DIST-PATNA` / `FPS-108`. Admin reviews and approves in `/admin/staff-requests`. Citizen profile dynamically reflects active `FPS_OPERATOR` badge.
- **Journey E (Privilege Escalation Rejection)**: Citizen attempts direct navigation to `/admin/users` and `/admin/audit` and is blocked by the RBAC router, landing on `/unauthorized` (403).
- **Journey F (Account Suspension & Revocation)**: Admin searches user, revokes `FPS_OPERATOR` assignment, and suspends account. Subsequent login attempts by citizen are rejected as suspended.
