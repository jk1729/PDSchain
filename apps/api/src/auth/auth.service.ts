import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountStatus, CanonicalRole } from '@prisma/client';
import { Response } from 'express';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedPrincipal } from '../rbac/rbac.types';
import { CryptoService } from '../security/crypto.service';
import { RateLimiterService } from '../security/rate-limiter.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterCitizenDto } from './dto/register-citizen.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

export interface RequestMetadataContext {
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  existingSessionCookie?: string;
}

@Injectable()
export class AuthService {
  private readonly sessionCookieName: string;
  private readonly csrfCookieName: string;
  private readonly sessionTtlHours: number;
  private readonly sessionCookieSecure: boolean;
  private readonly verificationTtlMinutes: number;
  private readonly passwordResetTtlMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly rateLimiter: RateLimiterService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    this.sessionCookieName = this.configService.get<string>(
      'SESSION_COOKIE_NAME',
      'pdschain_session',
    );
    this.csrfCookieName = this.configService.get<string>('CSRF_COOKIE_NAME', 'pdschain_csrf');
    this.sessionTtlHours = this.configService.get<number>('SESSION_TTL_HOURS', 24);
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    this.sessionCookieSecure =
      nodeEnv === 'production' || this.configService.get<boolean>('SESSION_COOKIE_SECURE', false);
    this.verificationTtlMinutes = this.configService.get<number>(
      'EMAIL_VERIFICATION_TTL_MINUTES',
      60,
    );
    this.passwordResetTtlMinutes = this.configService.get<number>('PASSWORD_RESET_TTL_MINUTES', 30);
  }

  public getSessionCookieName(): string {
    return this.sessionCookieName;
  }

  public getCsrfCookieName(): string {
    return this.csrfCookieName;
  }

  public attachSessionCookies(
    res: Response,
    rawSessionToken: string,
    rawCsrfToken: string,
    expiresAt: Date,
  ): void {
    res.cookie(this.sessionCookieName, rawSessionToken, {
      httpOnly: true,
      secure: this.sessionCookieSecure,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    res.cookie(this.csrfCookieName, rawCsrfToken, {
      httpOnly: false,
      secure: this.sessionCookieSecure,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });
  }

  public clearSessionCookies(res: Response): void {
    res.clearCookie(this.sessionCookieName, {
      httpOnly: true,
      secure: this.sessionCookieSecure,
      sameSite: 'lax',
      path: '/',
    });
    res.clearCookie(this.csrfCookieName, {
      httpOnly: false,
      secure: this.sessionCookieSecure,
      sameSite: 'lax',
      path: '/',
    });
  }

  async registerCitizen(dto: RegisterCitizenDto, ctx: RequestMetadataContext) {
    await this.rateLimiter.consumeOrThrow({
      action: 'auth:register',
      key: ctx.ipAddress ?? 'unknown-ip',
      ipAddress: ctx.ipAddress,
      correlationId: ctx.correlationId,
    });

    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException({
        code: 'PASSWORD_MISMATCH',
        message: 'Password and confirm password do not match.',
      });
    }

    if (dto.acceptTerms !== true) {
      throw new BadRequestException({
        code: 'TERMS_ACCEPTANCE_REQUIRED',
        message: 'You must accept the terms and privacy notice to register.',
      });
    }

    const normalizedEmail = this.cryptoService.normalizeEmail(dto.email);
    const trimmedName = dto.fullName.trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const genericSuccessMessage =
      'Registration submitted. Please check your email for a verification link to activate your account.';

    if (existingUser) {
      await this.cryptoService.verifyDummyPassword(dto.password);
      await this.auditService.recordEvent({
        eventType: 'AUTH_REGISTER_DUPLICATE_EMAIL',
        outcome: 'DENIED',
        targetUserId: existingUser.id,
        ipAddress: ctx.ipAddress,
        correlationId: ctx.correlationId,
      });

      return {
        status: 'registered',
        message: genericSuccessMessage,
        emailDelivery: {
          delivered: true,
          mode: this.configService.get<string>('EMAIL_DELIVERY_MODE', 'dev_outbox'),
        },
      };
    }

    const passwordHash = await this.cryptoService.hashPassword(dto.password);
    const { rawToken, tokenHash } = this.cryptoService.generateOpaqueToken(32);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.verificationTtlMinutes * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          fullName: trimmedName,
          passwordHash,
          emailVerifiedAt: null,
          status: AccountStatus.ACTIVE,
          termsAcceptedAt: now,
        },
      });

      await tx.userRoleAssignment.create({
        data: {
          userId: createdUser.id,
          role: CanonicalRole.CITIZEN,
        },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: createdUser.id,
          tokenHash,
          expiresAt,
        },
      });

      await this.auditService.recordEvent(
        {
          eventType: 'AUTH_REGISTER_SUCCESS',
          outcome: 'SUCCESS',
          actorUserId: createdUser.id,
          targetUserId: createdUser.id,
          ipAddress: ctx.ipAddress,
          correlationId: ctx.correlationId,
          metadata: {
            initialRole: CanonicalRole.CITIZEN,
            emailVerified: false,
          },
        },
        tx,
      );
    });

    const delivery = await this.mailService.sendVerificationEmail({
      to: normalizedEmail,
      fullName: trimmedName,
      rawToken,
      expiresAt,
    });

    return {
      status: 'registered',
      message: genericSuccessMessage,
      emailDelivery: delivery,
    };
  }

  async verifyEmail(dto: VerifyEmailDto, ctx: RequestMetadataContext) {
    const tokenHash = this.cryptoService.hashOpaqueToken(dto.token.trim());
    const now = new Date();

    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!tokenRecord || tokenRecord.consumedAt !== null || tokenRecord.expiresAt <= now) {
      await this.auditService.recordEvent({
        eventType: 'EMAIL_VERIFICATION_FAILURE',
        outcome: 'FAILURE',
        targetUserId: tokenRecord?.userId ?? null,
        ipAddress: ctx.ipAddress,
        correlationId: ctx.correlationId,
        metadata: {
          reason: !tokenRecord
            ? 'TOKEN_NOT_FOUND'
            : tokenRecord.consumedAt
              ? 'TOKEN_ALREADY_CONSUMED'
              : 'TOKEN_EXPIRED',
        },
      });

      throw new BadRequestException({
        code: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'Email verification token is invalid, expired, or has already been used.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.emailVerificationToken.updateMany({
        where: {
          id: tokenRecord.id,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          consumedAt: now,
        },
      });

      if (consumed.count !== 1) {
        throw new BadRequestException({
          code: 'INVALID_OR_EXPIRED_TOKEN',
          message: 'Email verification token has already been used.',
        });
      }

      await tx.emailVerificationToken.updateMany({
        where: {
          userId: tokenRecord.userId,
          consumedAt: null,
        },
        data: {
          consumedAt: now,
        },
      });

      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: {
          emailVerifiedAt: now,
        },
      });

      await this.auditService.recordEvent(
        {
          eventType: 'EMAIL_VERIFIED',
          outcome: 'SUCCESS',
          actorUserId: tokenRecord.userId,
          targetUserId: tokenRecord.userId,
          ipAddress: ctx.ipAddress,
          correlationId: ctx.correlationId,
        },
        tx,
      );
    });

    return {
      status: 'verified',
      message: 'Your email address has been verified. You may now sign in.',
    };
  }

  async resendVerification(dto: ResendVerificationDto, ctx: RequestMetadataContext) {
    const normalizedEmail = this.cryptoService.normalizeEmail(dto.email);

    await this.rateLimiter.consumeOrThrow({
      action: 'auth:resend_verification',
      key: `${ctx.ipAddress ?? 'ip'}:${normalizedEmail}`,
      maxAttempts: 5,
      ipAddress: ctx.ipAddress,
      correlationId: ctx.correlationId,
    });

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const genericResponse = {
      status: 'accepted',
      message:
        'If an unverified account matches that email address, a new verification message has been dispatched.',
    };

    if (!user || user.status !== AccountStatus.ACTIVE || user.emailVerifiedAt !== null) {
      return genericResponse;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.verificationTtlMinutes * 60 * 1000);
    const { rawToken, tokenHash } = this.cryptoService.generateOpaqueToken(32);

    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: now },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      await this.auditService.recordEvent(
        {
          eventType: 'EMAIL_VERIFICATION_RESENT',
          outcome: 'SUCCESS',
          actorUserId: user.id,
          targetUserId: user.id,
          ipAddress: ctx.ipAddress,
          correlationId: ctx.correlationId,
        },
        tx,
      );
    });

    const emailDelivery = await this.mailService.sendVerificationEmail({
      to: user.email,
      fullName: user.fullName,
      rawToken,
      expiresAt,
    });

    return {
      ...genericResponse,
      emailDelivery,
    };
  }

  async login(dto: LoginDto, ctx: RequestMetadataContext, res: Response) {
    const normalizedEmail = this.cryptoService.normalizeEmail(dto.email);

    await this.rateLimiter.consumeOrThrow({
      action: 'auth:login',
      key: `${ctx.ipAddress ?? 'ip'}:${normalizedEmail}`,
      ipAddress: ctx.ipAddress,
      correlationId: ctx.correlationId,
    });

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        roleAssignments: {
          where: { revokedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user) {
      await this.cryptoService.verifyDummyPassword(dto.password);
      await this.auditService.recordEvent({
        eventType: 'AUTH_LOGIN_FAILURE',
        outcome: 'FAILURE',
        ipAddress: ctx.ipAddress,
        correlationId: ctx.correlationId,
        metadata: { reason: 'USER_NOT_FOUND' },
      });
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    const passwordValid = await this.cryptoService.verifyPassword(user.passwordHash, dto.password);

    if (!passwordValid) {
      await this.auditService.recordEvent({
        eventType: 'AUTH_LOGIN_FAILURE',
        outcome: 'FAILURE',
        targetUserId: user.id,
        ipAddress: ctx.ipAddress,
        correlationId: ctx.correlationId,
        metadata: { reason: 'INVALID_PASSWORD' },
      });
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    if (user.status === AccountStatus.SUSPENDED) {
      await this.auditService.recordEvent({
        eventType: 'AUTH_LOGIN_DENIED_SUSPENDED',
        outcome: 'DENIED',
        actorUserId: user.id,
        targetUserId: user.id,
        ipAddress: ctx.ipAddress,
        correlationId: ctx.correlationId,
      });
      throw new ForbiddenException({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended. Please contact an administrator.',
      });
    }

    if (user.emailVerifiedAt === null) {
      await this.auditService.recordEvent({
        eventType: 'AUTH_LOGIN_DENIED_UNVERIFIED',
        outcome: 'DENIED',
        actorUserId: user.id,
        targetUserId: user.id,
        ipAddress: ctx.ipAddress,
        correlationId: ctx.correlationId,
      });
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before signing in.',
      });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTtlHours * 60 * 60 * 1000);
    const sessionPair = this.cryptoService.generateOpaqueToken(32);
    const csrfPair = this.cryptoService.generateOpaqueToken(24);

    const createdSession = await this.prisma.$transaction(async (tx) => {
      if (ctx.existingSessionCookie) {
        const oldHash = this.cryptoService.hashOpaqueToken(ctx.existingSessionCookie);
        await tx.session.updateMany({
          where: { tokenHash: oldHash, revokedAt: null },
          data: { revokedAt: now },
        });
      }

      const session = await tx.session.create({
        data: {
          userId: user.id,
          tokenHash: sessionPair.tokenHash,
          csrfTokenHash: csrfPair.tokenHash,
          ipAddress: ctx.ipAddress ?? null,
          userAgent: ctx.userAgent ? ctx.userAgent.slice(0, 255) : null,
          expiresAt,
          lastActiveAt: now,
        },
      });

      await this.auditService.recordEvent(
        {
          eventType: 'AUTH_LOGIN_SUCCESS',
          outcome: 'SUCCESS',
          actorUserId: user.id,
          targetUserId: user.id,
          targetResourceType: 'SESSION',
          targetResourceId: session.id,
          ipAddress: ctx.ipAddress,
          correlationId: ctx.correlationId,
        },
        tx,
      );

      return session;
    });

    this.attachSessionCookies(res, sessionPair.rawToken, csrfPair.rawToken, expiresAt);

    const assignments = user.roleAssignments.map((a) => ({
      assignmentId: a.id,
      role: a.role,
      districtCode: a.districtCode,
      warehouseCode: a.warehouseCode,
      shopCode: a.shopCode,
      grantedAt: a.createdAt.toISOString(),
    }));

    const principal: AuthenticatedPrincipal = {
      userId: user.id,
      sessionId: createdSession.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      emailVerified: true,
      emailVerifiedAt: user.emailVerifiedAt.toISOString(),
      roles: Array.from(new Set(assignments.map((a) => a.role))),
      assignments,
    };

    return {
      status: 'authenticated',
      user: principal,
      csrfToken: csrfPair.rawToken,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async logout(principal: AuthenticatedPrincipal, ctx: RequestMetadataContext, res: Response) {
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.session.updateMany({
        where: { id: principal.sessionId, revokedAt: null },
        data: { revokedAt: now },
      });

      await this.auditService.recordEvent(
        {
          eventType: 'AUTH_LOGOUT',
          outcome: 'SUCCESS',
          actorUserId: principal.userId,
          targetUserId: principal.userId,
          targetResourceType: 'SESSION',
          targetResourceId: principal.sessionId,
          ipAddress: ctx.ipAddress,
          correlationId: ctx.correlationId,
        },
        tx,
      );
    });

    this.clearSessionCookies(res);

    return {
      status: 'logged_out',
      message: 'Session has been terminated.',
    };
  }

  async getCurrentUserPrincipal(rawSessionToken?: string): Promise<AuthenticatedPrincipal | null> {
    if (!rawSessionToken || typeof rawSessionToken !== 'string') {
      return null;
    }

    const tokenHash = this.cryptoService.hashOpaqueToken(rawSessionToken);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            roleAssignments: {
              where: { revokedAt: null },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    const now = new Date();
    if (!session || session.revokedAt !== null || session.expiresAt <= now) {
      return null;
    }

    if (session.user.status === AccountStatus.SUSPENDED) {
      return null;
    }

    const assignments = session.user.roleAssignments.map((a) => ({
      assignmentId: a.id,
      role: a.role,
      districtCode: a.districtCode,
      warehouseCode: a.warehouseCode,
      shopCode: a.shopCode,
      grantedAt: a.createdAt.toISOString(),
    }));

    return {
      userId: session.user.id,
      sessionId: session.id,
      email: session.user.email,
      fullName: session.user.fullName,
      status: session.user.status,
      emailVerified: session.user.emailVerifiedAt !== null,
      emailVerifiedAt: session.user.emailVerifiedAt?.toISOString() ?? null,
      roles: Array.from(new Set(assignments.map((a) => a.role))),
      assignments,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto, ctx: RequestMetadataContext) {
    const normalizedEmail = this.cryptoService.normalizeEmail(dto.email);

    await this.rateLimiter.consumeOrThrow({
      action: 'auth:forgot_password',
      key: `${ctx.ipAddress ?? 'ip'}:${normalizedEmail}`,
      maxAttempts: 5,
      ipAddress: ctx.ipAddress,
      correlationId: ctx.correlationId,
    });

    const genericMessage =
      'If an active account is registered with that email address, password reset instructions have been sent.';

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || user.status !== AccountStatus.ACTIVE) {
      await this.auditService.recordEvent({
        eventType: 'PASSWORD_RESET_REQUESTED_UNKNOWN_OR_INACTIVE',
        outcome: 'DENIED',
        ipAddress: ctx.ipAddress,
        correlationId: ctx.correlationId,
      });
      return {
        status: 'accepted',
        message: genericMessage,
      };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.passwordResetTtlMinutes * 60 * 1000);
    const { rawToken, tokenHash } = this.cryptoService.generateOpaqueToken(32);

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: now },
      });

      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      await this.auditService.recordEvent(
        {
          eventType: 'PASSWORD_RESET_REQUESTED',
          outcome: 'SUCCESS',
          actorUserId: user.id,
          targetUserId: user.id,
          ipAddress: ctx.ipAddress,
          correlationId: ctx.correlationId,
        },
        tx,
      );
    });

    const emailDelivery = await this.mailService.sendPasswordResetEmail({
      to: user.email,
      fullName: user.fullName,
      rawToken,
      expiresAt,
    });

    return {
      status: 'accepted',
      message: genericMessage,
      emailDelivery,
    };
  }

  async resetPassword(dto: ResetPasswordDto, ctx: RequestMetadataContext, res: Response) {
    await this.rateLimiter.consumeOrThrow({
      action: 'auth:reset_password',
      key: ctx.ipAddress ?? 'unknown-ip',
      maxAttempts: 8,
      ipAddress: ctx.ipAddress,
      correlationId: ctx.correlationId,
    });

    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException({
        code: 'PASSWORD_MISMATCH',
        message: 'New password and confirm password do not match.',
      });
    }

    const tokenHash = this.cryptoService.hashOpaqueToken(dto.token.trim());
    const now = new Date();

    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!tokenRecord || tokenRecord.consumedAt !== null || tokenRecord.expiresAt <= now) {
      await this.auditService.recordEvent({
        eventType: 'PASSWORD_RESET_FAILURE',
        outcome: 'FAILURE',
        targetUserId: tokenRecord?.userId ?? null,
        ipAddress: ctx.ipAddress,
        correlationId: ctx.correlationId,
      });
      throw new BadRequestException({
        code: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'Password reset token is invalid, expired, or has already been used.',
      });
    }

    const newPasswordHash = await this.cryptoService.hashPassword(dto.newPassword);

    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: tokenRecord.id,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });

      if (consumed.count !== 1) {
        throw new BadRequestException({
          code: 'INVALID_OR_EXPIRED_TOKEN',
          message: 'Password reset token has already been used.',
        });
      }

      await tx.passwordResetToken.updateMany({
        where: { userId: tokenRecord.userId, consumedAt: null },
        data: { consumedAt: now },
      });

      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordHash: newPasswordHash },
      });

      // Revoke ALL existing sessions for this user upon password reset
      const revokedSessions = await tx.session.updateMany({
        where: { userId: tokenRecord.userId, revokedAt: null },
        data: { revokedAt: now },
      });

      await this.auditService.recordEvent(
        {
          eventType: 'PASSWORD_RESET_COMPLETED',
          outcome: 'SUCCESS',
          actorUserId: tokenRecord.userId,
          targetUserId: tokenRecord.userId,
          ipAddress: ctx.ipAddress,
          correlationId: ctx.correlationId,
          metadata: {
            revokedSessionsCount: revokedSessions.count,
          },
        },
        tx,
      );
    });

    this.clearSessionCookies(res);

    return {
      status: 'password_reset',
      message:
        'Your password has been reset and all previous sessions have been revoked. Please sign in with your new password.',
    };
  }
}
