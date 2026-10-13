import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditService } from '../audit/audit.service';
import { ROLES_METADATA_KEY } from './decorators';
import { RbacPolicyService } from './rbac-policy.service';
import { AuthenticatedRequest, CanonicalRole } from './rbac.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacPolicy: RbacPolicyService,
    private readonly auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<CanonicalRole[]>(ROLES_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = request.principal;

    if (!principal) {
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required.',
      });
    }

    const authorized = this.rbacPolicy.hasAnyRole(principal, requiredRoles);
    if (!authorized) {
      await this.auditService.recordEvent({
        eventType: 'AUTHORIZATION_DENIED_ROLE',
        outcome: 'DENIED',
        actorUserId: principal.userId,
        targetResourceType: 'HTTP_ROUTE',
        targetResourceId: `${request.method} ${request.originalUrl ?? request.url}`,
        ipAddress: request.ip,
        correlationId: request.correlationId,
        metadata: {
          requiredRoles,
          actorRoles: principal.roles,
        },
      });

      throw new ForbiddenException({
        code: 'INSUFFICIENT_ROLE_PERMISSIONS',
        message: 'You do not hold an active role assignment required for this resource.',
      });
    }

    return true;
  }
}
