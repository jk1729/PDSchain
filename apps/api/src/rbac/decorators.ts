import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { AuthenticatedPrincipal, AuthenticatedRequest, CanonicalRole } from './rbac.types';

export const ROLES_METADATA_KEY = 'pdschain:roles';
export const ALLOW_UNVERIFIED_METADATA_KEY = 'pdschain:allow_unverified';
export const SKIP_CSRF_METADATA_KEY = 'pdschain:skip_csrf';

export const Roles = (...roles: CanonicalRole[]) => SetMetadata(ROLES_METADATA_KEY, roles);
export const AllowUnverified = () => SetMetadata(ALLOW_UNVERIFIED_METADATA_KEY, true);
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_METADATA_KEY, true);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedPrincipal => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.principal) {
      throw new Error('CurrentUser decorator used on a route without SessionAuthGuard');
    }
    return request.principal;
  },
);
