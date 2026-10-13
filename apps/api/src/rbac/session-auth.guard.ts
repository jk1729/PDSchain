import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AccountStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../security/crypto.service';
import { ALLOW_UNVERIFIED_METADATA_KEY, SKIP_CSRF_METADATA_KEY } from './decorators';
import { AuthenticatedPrincipal, AuthenticatedRequest } from './rbac.types';

export const CSRF_HEADER_NAME = 'x-csrf-token';
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class SessionAuthGuard implements CanActivate {
  private readonly sessionCookieName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {
    this.sessionCookieName = this.configService.get<string>(
      'SESSION_COOKIE_NAME',
      'pdschain_session',
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const rawSessionToken = request.cookies?.[this.sessionCookieName];

    if (!rawSessionToken || typeof rawSessionToken !== 'string') {
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication session is required to access this resource.',
      });
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
      throw new UnauthorizedException({
        code: 'SESSION_EXPIRED_OR_REVOKED',
        message: 'Your session has expired or is no longer valid. Please sign in again.',
      });
    }

    const { user } = session;

    // 1. Account State: Suspended users are immediately rejected and their session is revoked
    if (user.status === AccountStatus.SUSPENDED) {
      await this.prisma.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now },
      });
      await this.auditService.recordEvent({
        eventType: 'SESSION_REJECTED_SUSPENDED_USER',
        outcome: 'DENIED',
        actorUserId: user.id,
        targetUserId: user.id,
        ipAddress: request.ip,
        correlationId: request.correlationId,
      });
      throw new ForbiddenException({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your account is suspended and cannot access protected resources.',
      });
    }

    // 2. Account State: Email verification check
    const allowUnverified = this.reflector.getAllAndOverride<boolean>(
      ALLOW_UNVERIFIED_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!allowUnverified && user.emailVerifiedAt === null) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email verification is required before accessing this resource.',
      });
    }

    // 3. CSRF Check on state-changing requests
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!skipCsrf && STATE_CHANGING_METHODS.has(request.method.toUpperCase())) {
      const incomingCsrf = request.header(CSRF_HEADER_NAME);
      if (!incomingCsrf) {
        throw new ForbiddenException({
          code: 'CSRF_TOKEN_MISSING',
          message: 'State-changing request is missing required X-CSRF-Token header.',
        });
      }
      const incomingCsrfHash = this.cryptoService.hashOpaqueToken(incomingCsrf);
      const csrfValid = this.cryptoService.constantTimeEqualHex(
        incomingCsrfHash,
        session.csrfTokenHash,
      );
      if (!csrfValid) {
        throw new ForbiddenException({
          code: 'CSRF_TOKEN_INVALID',
          message: 'CSRF token validation failed for current session.',
        });
      }
    }

    const activeAssignments = user.roleAssignments.map((assignment) => ({
      assignmentId: assignment.id,
      role: assignment.role,
      districtCode: assignment.districtCode,
      warehouseCode: assignment.warehouseCode,
      shopCode: assignment.shopCode,
      grantedAt: assignment.createdAt.toISOString(),
    }));

    const distinctRoles = Array.from(new Set(activeAssignments.map((a) => a.role)));

    const principal: AuthenticatedPrincipal = {
      userId: user.id,
      sessionId: session.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      emailVerified: user.emailVerifiedAt !== null,
      emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
      roles: distinctRoles,
      assignments: activeAssignments,
    };

    request.principal = principal;
    return true;
  }
}
