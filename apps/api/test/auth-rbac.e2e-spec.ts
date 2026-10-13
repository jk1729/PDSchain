import * as fs from 'node:fs';
import * as path from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureNestApp } from '../src/common/setup-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { CanonicalRole, StaffRequestStatus } from '@prisma/client';

function extractCookie(setCookies: string[] | undefined, name: string): string | undefined {
  if (!setCookies) return undefined;
  for (const cookieStr of setCookies) {
    const parts = cookieStr.split(';')[0].split('=');
    if (parts[0].trim() === name) {
      return parts.slice(1).join('=');
    }
  }
  return undefined;
}

function parseCookies(setCookies: string[] | undefined): {
  sessionCookie?: string;
  csrfToken?: string;
  cookieHeader: string;
} {
  const session = extractCookie(setCookies, 'pdschain_session');
  const csrf = extractCookie(setCookies, 'pdschain_csrf');
  const cookieHeader = [
    session ? `pdschain_session=${session}` : '',
    csrf ? `pdschain_csrf=${csrf}` : '',
  ]
    .filter(Boolean)
    .join('; ');

  return { sessionCookie: session, csrfToken: csrf, cookieHeader };
}

import { MailService } from '../src/mail/mail.service';

describe('PDSChain v2 API — Phase 2 Authentication & RBAC (Integration Suite)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mailService: MailService;
  let devMailboxDir: string;

  const testTimestamp = Date.now();
  const citizenEmail = `citizen_${testTimestamp}@pdschain.test`;
  const citizenPassword = 'CitizenPassword2026!';
  const citizenName = 'Aarav Sharma';

  const adminEmail = `admin_${testTimestamp}@pdschain.test`;
  const adminPassword = 'AdminPassword2026!';
  const adminName = 'System Administrator';

  let citizenCookies: { sessionCookie?: string; csrfToken?: string; cookieHeader: string };
  let adminCookies: { sessionCookie?: string; csrfToken?: string; cookieHeader: string };
  let citizenUserId: string;
  let adminUserId: string;
  let staffRequestId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureNestApp(app);
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    mailService = app.get<MailService>(MailService);
    devMailboxDir = mailService.getOutboxDir();
  });

  afterAll(async () => {
    // Clean up test mailbox files
    if (fs.existsSync(devMailboxDir)) {
      const files = fs.readdirSync(devMailboxDir);
      for (const file of files) {
        if (file.includes(String(testTimestamp))) {
          try {
            fs.unlinkSync(path.join(devMailboxDir, file));
          } catch {
            // Ignore unlink errors in cleanup
          }
        }
      }
    }

    if (app) {
      await app.close();
    }
  });

  describe('1. Citizen Registration & Dev-Mailbox Verification', () => {
    it('validates registration input and rejects weak passwords', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: '123',
          confirmPassword: '123',
          fullName: 'Test User',
          acceptTerms: true,
        })
        .expect(400);

      expect(res.body.status).toBe('error');
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('successfully registers a new citizen with default CITIZEN role', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: citizenEmail,
          password: citizenPassword,
          confirmPassword: citizenPassword,
          fullName: citizenName,
          acceptTerms: true,
        })
        .expect(201);

      expect(res.body.status).toBe('registered');
      expect(res.body.emailDelivery.delivered).toBe(true);

      const dbUser = await prisma.user.findUnique({
        where: { email: citizenEmail.toLowerCase() },
        include: { roleAssignments: true },
      });
      expect(dbUser).toBeDefined();
      expect(dbUser!.roleAssignments.map((a) => a.role)).toContain(CanonicalRole.CITIZEN);
      citizenUserId = dbUser!.id;

      // Confirm dev mailbox received verification token
      const messages = mailService.readDevOutboxForRecipient(citizenEmail);
      expect(messages.length).toBeGreaterThan(0);
      const latest = messages[messages.length - 1];
      expect(latest.subject).toContain('Verify your PDSChain');
      expect(latest.token).toBeDefined();
    });

    it('handles duplicate email registration with anti-enumeration protection', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: citizenEmail.toUpperCase(),
          password: citizenPassword,
          confirmPassword: citizenPassword,
          fullName: 'Duplicate Citizen',
          acceptTerms: true,
        })
        .expect(201);

      expect(res.body.status).toBe('registered');

      const audit = await prisma.securityAuditEvent.findFirst({
        where: {
          eventType: 'AUTH_REGISTER_DUPLICATE_EMAIL',
          targetUserId: citizenUserId,
        },
      });
      expect(audit).toBeDefined();
    });

    it('prevents login before email verification', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: citizenEmail,
          password: citizenPassword,
        })
        .expect(403);

      expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('verifies citizen email using the dev outbox token', async () => {
      const messages = mailService.readDevOutboxForRecipient(citizenEmail);
      expect(messages.length).toBeGreaterThan(0);
      const token = messages[messages.length - 1].token;

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token })
        .expect(200);

      expect(res.body.status).toBe('verified');

      // Verify token cannot be re-used
      const reuseRes = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token })
        .expect(400);

      expect(reuseRes.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    });
  });

  describe('2. Authentication, Session Cookies & CSRF Defense', () => {
    it('rejects invalid password with generic failure', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: citizenEmail,
          password: 'WrongPassword2026!',
        })
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('authenticates verified citizen and issues session + CSRF cookies', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: citizenEmail,
          password: citizenPassword,
        })
        .expect(200);

      expect(res.body.status).toBe('authenticated');
      expect(res.body.user.email).toBe(citizenEmail.toLowerCase());
      expect(res.body.csrfToken).toBeDefined();

      const setCookies = res.headers['set-cookie'] as unknown as string[];
      expect(setCookies).toBeDefined();
      citizenCookies = parseCookies(setCookies);
      expect(citizenCookies.sessionCookie).toBeDefined();
      expect(citizenCookies.csrfToken).toBeDefined();
    });

    it('returns authenticated user profile via /auth/me with session cookie', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', citizenCookies.cookieHeader)
        .expect(200);

      expect(res.body.status).toBe('authenticated');
      expect(res.body.user.userId).toBe(citizenUserId);
      expect(res.body.user.roles).toEqual([CanonicalRole.CITIZEN]);
    });

    it('rejects state-changing mutating request without CSRF token header', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Cookie', citizenCookies.cookieHeader)
        .send({ fullName: 'Tampered Name' })
        .expect(403);

      expect(res.body.error.code).toBe('CSRF_TOKEN_MISSING');
    });

    it('accepts state-changing mutating request with valid CSRF token header', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Cookie', citizenCookies.cookieHeader)
        .set('x-csrf-token', citizenCookies.csrfToken!)
        .send({ fullName: 'Aarav Sharma Updated' })
        .expect(200);

      expect(res.body.fullName).toBe('Aarav Sharma Updated');
    });
  });

  describe('3. Password Reset Flow & Immediate Session Invalidation', () => {
    it('initiates forgot-password and stores reset token in dev outbox', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: citizenEmail })
        .expect(200);

      expect(res.body.status).toBe('accepted');

      const messages = mailService.readDevOutboxForRecipient(citizenEmail);
      expect(messages.length).toBeGreaterThan(0);
      const latest = messages[messages.length - 1];
      expect(latest.subject).toContain('password reset');
      expect(latest.token).toBeDefined();
    });

    it('resets password and invalidates all existing sessions immediately', async () => {
      const messages = mailService.readDevOutboxForRecipient(citizenEmail);
      const token = messages[messages.length - 1].token;

      const newPassword = 'NewCitizenPassword2026!';
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token,
          newPassword,
          confirmPassword: newPassword,
        })
        .expect(200);

      expect(res.body.status).toBe('password_reset');

      // Old session cookie MUST now be rejected (immediate revocation)
      const invalidSessionRes = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', citizenCookies.cookieHeader)
        .expect(401);

      expect(invalidSessionRes.body.error.code).toBe('SESSION_EXPIRED_OR_REVOKED');

      // Re-login with new password
      const reLoginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: citizenEmail,
          password: newPassword,
        })
        .expect(200);

      citizenCookies = parseCookies(reLoginRes.headers['set-cookie'] as unknown as string[]);
      expect(citizenCookies.sessionCookie).toBeDefined();
    });
  });

  describe('4. Staff Access Request Lifecycle & Scoped Authorization', () => {
    beforeAll(async () => {
      // Register and verify an admin for the review flow
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: adminEmail,
          password: adminPassword,
          confirmPassword: adminPassword,
          fullName: adminName,
          acceptTerms: true,
        })
        .expect(201);

      const dbAdmin = await prisma.user.findUnique({
        where: { email: adminEmail.toLowerCase() },
      });
      adminUserId = dbAdmin!.id;

      // Extract verification token and verify admin
      const adminMessages = mailService.readDevOutboxForRecipient(adminEmail);
      expect(adminMessages.length).toBeGreaterThan(0);
      const token = adminMessages[adminMessages.length - 1].token;
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token })
        .expect(200);

      // Grant ADMIN role in database for testing
      await prisma.userRoleAssignment.create({
        data: {
          userId: adminUserId,
          role: CanonicalRole.ADMIN,
        },
      });

      // Login admin to obtain cookies
      const adminLoginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: adminEmail,
          password: adminPassword,
        })
        .expect(200);

      adminCookies = parseCookies(adminLoginRes.headers['set-cookie'] as unknown as string[]);
    });

    it('allows verified citizen to submit a staff access request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/staff-access-requests')
        .set('Cookie', citizenCookies.cookieHeader)
        .set('x-csrf-token', citizenCookies.csrfToken!)
        .send({
          requestedRole: CanonicalRole.FPS_OPERATOR,
          districtCode: 'DIST-CENTRAL',
          shopCode: 'FPS-101',
          justification: 'Assigned as primary operator for Central FPS #101',
        })
        .expect(201);

      expect(res.body.request.requestedRole).toBe(CanonicalRole.FPS_OPERATOR);
      expect(res.body.request.status).toBe(StaffRequestStatus.PENDING);
      staffRequestId = res.body.request.id;
    });

    it('prevents citizen from submitting duplicate pending request for same scope', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/staff-access-requests')
        .set('Cookie', citizenCookies.cookieHeader)
        .set('x-csrf-token', citizenCookies.csrfToken!)
        .send({
          requestedRole: CanonicalRole.FPS_OPERATOR,
          districtCode: 'DIST-CENTRAL',
          shopCode: 'FPS-101',
          justification: 'Duplicate request attempt for identical shop',
        })
        .expect(409);

      expect(res.body.error.code).toBe('DUPLICATE_PENDING_REQUEST');
    });

    it('denies citizen from approving staff requests (RBAC protection)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/staff-access-requests/${staffRequestId}/approve`)
        .set('Cookie', citizenCookies.cookieHeader)
        .set('x-csrf-token', citizenCookies.csrfToken!)
        .send({ notes: 'Self approval attempt' })
        .expect(403);

      expect(res.body.error.code).toBe('INSUFFICIENT_ROLE_PERMISSIONS');
    });

    it('admin views staff request queue and approves the request', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/admin/staff-access-requests?status=PENDING')
        .set('Cookie', adminCookies.cookieHeader)
        .expect(200);

      expect(Array.isArray(listRes.body)).toBe(true);
      expect(listRes.body.length).toBeGreaterThanOrEqual(1);

      const approveRes = await request(app.getHttpServer())
        .post(`/api/v1/admin/staff-access-requests/${staffRequestId}/approve`)
        .set('Cookie', adminCookies.cookieHeader)
        .set('x-csrf-token', adminCookies.csrfToken!)
        .send({ notes: 'Verified official documentation. Approved.' })
        .expect(200);

      expect(approveRes.body.status).toBe('approved');
    });

    it('citizen re-authenticates to reflect new FPS_OPERATOR role and scoped access', async () => {
      // Re-login citizen to refresh role list
      const reLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: citizenEmail,
          password: 'NewCitizenPassword2026!',
        })
        .expect(200);

      citizenCookies = parseCookies(reLogin.headers['set-cookie'] as unknown as string[]);
      expect(reLogin.body.user.roles).toContain(CanonicalRole.FPS_OPERATOR);

      // Scoped endpoint test: allowed for assigned FPS-101
      const scopedSuccess = await request(app.getHttpServer())
        .get('/api/v1/rbac/scopes/shops/FPS-101')
        .set('Cookie', citizenCookies.cookieHeader)
        .expect(200);

      expect(scopedSuccess.body.shopCode).toBe('FPS-101');

      // Scoped endpoint test: denied for unassigned FPS-999
      const scopedForbidden = await request(app.getHttpServer())
        .get('/api/v1/rbac/scopes/shops/FPS-999')
        .set('Cookie', citizenCookies.cookieHeader)
        .expect(403);

      expect(scopedForbidden.body.error.code).toBe('SCOPE_ACCESS_DENIED');
    });
  });

  describe('5. Account Suspension, Revocation & Security Audit Trail', () => {
    it('admin suspends the citizen account and terminates all active sessions', async () => {
      const suspendRes = await request(app.getHttpServer())
        .post(`/api/v1/admin/users/${citizenUserId}/suspend`)
        .set('Cookie', adminCookies.cookieHeader)
        .set('x-csrf-token', adminCookies.csrfToken!)
        .send({ reason: 'Investigation into irregular offline ration allocations' })
        .expect(200);

      expect(suspendRes.body.status).toBe('suspended');

      // Suspended user's existing session is immediately rejected
      const meRes = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', citizenCookies.cookieHeader)
        .expect(401);

      expect(meRes.body.error.code).toBe('SESSION_EXPIRED_OR_REVOKED');

      // Suspended user cannot log in
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: citizenEmail,
          password: 'NewCitizenPassword2026!',
        })
        .expect(403);

      expect(loginRes.body.error.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('admin reactivates citizen account', async () => {
      const reactivateRes = await request(app.getHttpServer())
        .post(`/api/v1/admin/users/${citizenUserId}/reactivate`)
        .set('Cookie', adminCookies.cookieHeader)
        .set('x-csrf-token', adminCookies.csrfToken!)
        .expect(200);

      expect(reactivateRes.body.status).toBe('active');
    });

    it('records clean security audit events without leaking secrets or tokens', async () => {
      const events = await prisma.securityAuditEvent.findMany({
        where: {
          OR: [{ actorUserId: citizenUserId }, { targetUserId: citizenUserId }],
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(events.length).toBeGreaterThan(0);

      // Verify no event metadata contains passwords, session hashes, or raw tokens
      for (const ev of events) {
        const serialized = JSON.stringify(ev.metadata);
        expect(serialized).not.toContain('password');
        expect(serialized).not.toContain('token');
        expect(serialized).not.toContain('secret');
      }
    });

    it('logs out admin and clears session cookie', async () => {
      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', adminCookies.cookieHeader)
        .set('x-csrf-token', adminCookies.csrfToken!)
        .expect(200);

      expect(logoutRes.body.status).toBe('logged_out');

      // Confirm session cookie is cleared
      const setCookies = logoutRes.headers['set-cookie'] as unknown as string[];
      expect(setCookies).toBeDefined();
      const clearedSession = extractCookie(setCookies, 'pdschain_session');
      expect(clearedSession).toBe('');
    });
  });
});
