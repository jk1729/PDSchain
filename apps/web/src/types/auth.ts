export type CanonicalRole =
  'CITIZEN' | 'FPS_OPERATOR' | 'WAREHOUSE_MANAGER' | 'DISTRICT_OFFICER' | 'ADMIN';

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'LOCKED';

export type StaffRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

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

export interface StaffAccessRequestItem {
  id: string;
  requesterId: string;
  requestedRole: CanonicalRole;
  districtCode: string;
  warehouseCode: string | null;
  shopCode: string | null;
  justification: string;
  status: StaffRequestStatus;
  reviewerId: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  requester?: {
    id: string;
    email: string;
    fullName: string;
    status: AccountStatus;
  };
  reviewer?: {
    id: string;
    email: string;
    fullName: string;
  } | null;
}

export interface UserSummaryItem {
  id: string;
  email: string;
  fullName: string;
  status: AccountStatus;
  emailVerified: boolean;
  createdAt: string;
  roles: CanonicalRole[];
  assignmentsCount: number;
}

export interface UserDetail {
  id: string;
  email: string;
  fullName: string;
  status: AccountStatus;
  suspendedAt: string | null;
  suspensionReason: string | null;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: CanonicalRole[];
  assignments: ActiveRoleScope[];
  staffRequests: StaffAccessRequestItem[];
}

export interface SecurityAuditEventItem {
  id: string;
  eventType: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'DENIED';
  actorUserId: string | null;
  targetUserId: string | null;
  targetResourceType: string | null;
  targetResourceId: string | null;
  ipAddress: string | null;
  correlationId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
