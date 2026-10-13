import { AccountStatus, CanonicalRole } from '@prisma/client';
import { CorrelatedRequest } from '../common/correlation-id.middleware';

export { AccountStatus, CanonicalRole };

export const CANONICAL_ROLES: readonly CanonicalRole[] = [
  CanonicalRole.CITIZEN,
  CanonicalRole.FPS_OPERATOR,
  CanonicalRole.WAREHOUSE_MANAGER,
  CanonicalRole.DISTRICT_OFFICER,
  CanonicalRole.ADMIN,
] as const;

export const REQUESTABLE_STAFF_ROLES: readonly CanonicalRole[] = [
  CanonicalRole.FPS_OPERATOR,
  CanonicalRole.WAREHOUSE_MANAGER,
  CanonicalRole.DISTRICT_OFFICER,
] as const;

const LEGACY_ROLE_MAP: Readonly<Record<string, CanonicalRole>> = {
  CITIZEN: CanonicalRole.CITIZEN,
  FPS_OPERATOR: CanonicalRole.FPS_OPERATOR,
  FPS_DEALER: CanonicalRole.FPS_OPERATOR,
  WAREHOUSE_MANAGER: CanonicalRole.WAREHOUSE_MANAGER,
  DISTRICT_OFFICER: CanonicalRole.DISTRICT_OFFICER,
  ADMIN: CanonicalRole.ADMIN,
  STATE_ADMIN: CanonicalRole.ADMIN,
};

/**
 * Resolves legacy or canonical role names into the single canonical role enum.
 * Returns null for unrecognized or unsupported roles (e.g. unapproved AUDITOR).
 */
export function mapLegacyRoleToCanonical(rawRole: string): CanonicalRole | null {
  if (!rawRole || typeof rawRole !== 'string') {
    return null;
  }
  const normalized = rawRole.trim().toUpperCase();
  return LEGACY_ROLE_MAP[normalized] ?? null;
}

export interface ActiveRoleScope {
  assignmentId: string;
  role: CanonicalRole;
  districtCode: string | null;
  warehouseCode: string | null;
  shopCode: string | null;
  grantedAt: string;
}

export interface AuthenticatedPrincipal {
  userId: string;
  sessionId: string;
  email: string;
  fullName: string;
  status: AccountStatus;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  roles: CanonicalRole[];
  assignments: ActiveRoleScope[];
}

export interface AuthenticatedRequest extends CorrelatedRequest {
  principal?: AuthenticatedPrincipal;
}
