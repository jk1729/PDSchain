import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, CanonicalRole, StaffRequestStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedPrincipal } from '../rbac/rbac.types';
import {
  ApproveStaffRequestDto,
  RejectStaffRequestDto,
  RevokeRoleDto,
  SuspendUserDto,
} from './dto/admin-actions.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listStaffRequests(status?: StaffRequestStatus) {
    const where = status ? { status } : {};
    const requests = await this.prisma.staffAccessRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        requester: {
          select: { id: true, email: true, fullName: true, status: true },
        },
        reviewer: {
          select: { id: true, email: true, fullName: true },
        },
      },
    });

    return requests.map((r) => ({
      id: r.id,
      requestedRole: r.requestedRole,
      districtCode: r.districtCode,
      warehouseCode: r.warehouseCode,
      shopCode: r.shopCode,
      justification: r.justification,
      status: r.status,
      reviewNotes: r.reviewNotes,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
      requester: r.requester,
      reviewer: r.reviewer,
    }));
  }

  async getStaffRequestById(id: string) {
    const request = await this.prisma.staffAccessRequest.findUnique({
      where: { id },
      include: {
        requester: {
          select: {
            id: true,
            email: true,
            fullName: true,
            status: true,
            emailVerifiedAt: true,
            createdAt: true,
          },
        },
        reviewer: {
          select: { id: true, email: true, fullName: true },
        },
        grantedRoleRecord: true,
      },
    });

    if (!request) {
      throw new NotFoundException({
        code: 'REQUEST_NOT_FOUND',
        message: 'Staff access request not found.',
      });
    }

    return {
      id: request.id,
      requestedRole: request.requestedRole,
      districtCode: request.districtCode,
      warehouseCode: request.warehouseCode,
      shopCode: request.shopCode,
      justification: request.justification,
      status: request.status,
      reviewNotes: request.reviewNotes,
      createdAt: request.createdAt.toISOString(),
      reviewedAt: request.reviewedAt ? request.reviewedAt.toISOString() : null,
      requester: request.requester,
      reviewer: request.reviewer,
      grantedRoleRecord: request.grantedRoleRecord,
    };
  }

  async approveStaffRequest(
    id: string,
    admin: AuthenticatedPrincipal,
    dto: ApproveStaffRequestDto,
    meta: { ipAddress?: string; correlationId?: string },
  ) {
    const request = await this.prisma.staffAccessRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException({
        code: 'REQUEST_NOT_FOUND',
        message: 'Staff access request not found.',
      });
    }

    // 1. Self-approval prevention
    if (request.requesterId === admin.userId) {
      await this.auditService.recordEvent({
        eventType: 'STAFF_REQUEST_APPROVAL_DENIED_SELF',
        outcome: 'DENIED',
        actorUserId: admin.userId,
        targetUserId: admin.userId,
        targetResourceType: 'STAFF_REQUEST',
        targetResourceId: id,
        ipAddress: meta.ipAddress,
        correlationId: meta.correlationId,
      });

      throw new ForbiddenException({
        code: 'SELF_APPROVAL_FORBIDDEN',
        message: 'Administrators cannot approve their own staff access requests.',
      });
    }

    if (request.status !== StaffRequestStatus.PENDING) {
      throw new ConflictException({
        code: 'REQUEST_NOT_PENDING',
        message: `This request cannot be approved because its current status is ${request.status}.`,
      });
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // 2. Atomic transition: ensure request is STILL PENDING
      const transitionResult = await tx.staffAccessRequest.updateMany({
        where: { id, status: StaffRequestStatus.PENDING },
        data: {
          status: StaffRequestStatus.APPROVED,
          reviewerId: admin.userId,
          reviewedAt: now,
          reviewNotes: dto.notes?.trim() ?? 'Approved by administrator.',
        },
      });

      if (transitionResult.count !== 1) {
        throw new ConflictException({
          code: 'CONCURRENT_APPROVAL_CONFLICT',
          message: 'The request has already been reviewed or modified by another transaction.',
        });
      }

      // 3. Create the approved UserRoleAssignment
      const assignment = await tx.userRoleAssignment.create({
        data: {
          userId: request.requesterId,
          role: request.requestedRole,
          districtCode: request.districtCode,
          warehouseCode: request.warehouseCode,
          shopCode: request.shopCode,
          grantedById: admin.userId,
          grantedFromRequestId: request.id,
        },
      });

      await this.auditService.recordEvent(
        {
          eventType: 'STAFF_REQUEST_APPROVED',
          outcome: 'SUCCESS',
          actorUserId: admin.userId,
          targetUserId: request.requesterId,
          targetResourceType: 'STAFF_REQUEST',
          targetResourceId: request.id,
          ipAddress: meta.ipAddress,
          correlationId: meta.correlationId,
          metadata: {
            role: request.requestedRole,
            districtCode: request.districtCode,
            warehouseCode: request.warehouseCode,
            shopCode: request.shopCode,
          },
        },
        tx,
      );

      await this.auditService.recordEvent(
        {
          eventType: 'ROLE_ASSIGNED',
          outcome: 'SUCCESS',
          actorUserId: admin.userId,
          targetUserId: request.requesterId,
          targetResourceType: 'ROLE_ASSIGNMENT',
          targetResourceId: assignment.id,
          ipAddress: meta.ipAddress,
          correlationId: meta.correlationId,
          metadata: {
            role: request.requestedRole,
            assignmentId: assignment.id,
          },
        },
        tx,
      );

      return assignment;
    });

    return {
      status: 'approved',
      message: `Staff access request approved. Role ${request.requestedRole} has been assigned.`,
      assignmentId: result.id,
    };
  }

  async rejectStaffRequest(
    id: string,
    admin: AuthenticatedPrincipal,
    dto: RejectStaffRequestDto,
    meta: { ipAddress?: string; correlationId?: string },
  ) {
    const request = await this.prisma.staffAccessRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException({
        code: 'REQUEST_NOT_FOUND',
        message: 'Staff access request not found.',
      });
    }

    if (request.requesterId === admin.userId) {
      throw new ForbiddenException({
        code: 'SELF_REVIEW_FORBIDDEN',
        message: 'Administrators cannot review their own staff access requests.',
      });
    }

    if (request.status !== StaffRequestStatus.PENDING) {
      throw new ConflictException({
        code: 'REQUEST_NOT_PENDING',
        message: `This request cannot be rejected because its current status is ${request.status}.`,
      });
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const transitionResult = await tx.staffAccessRequest.updateMany({
        where: { id, status: StaffRequestStatus.PENDING },
        data: {
          status: StaffRequestStatus.REJECTED,
          reviewerId: admin.userId,
          reviewedAt: now,
          reviewNotes: dto.reason.trim(),
        },
      });

      if (transitionResult.count !== 1) {
        throw new ConflictException({
          code: 'CONCURRENT_REVIEW_CONFLICT',
          message: 'The request has already been reviewed or modified by another transaction.',
        });
      }

      await this.auditService.recordEvent(
        {
          eventType: 'STAFF_REQUEST_REJECTED',
          outcome: 'SUCCESS',
          actorUserId: admin.userId,
          targetUserId: request.requesterId,
          targetResourceType: 'STAFF_REQUEST',
          targetResourceId: request.id,
          ipAddress: meta.ipAddress,
          correlationId: meta.correlationId,
          metadata: {
            rejectionReason: dto.reason.trim(),
          },
        },
        tx,
      );
    });

    return {
      status: 'rejected',
      message: 'Staff access request has been rejected.',
    };
  }

  async listUsers(search?: string) {
    const where = search
      ? {
          OR: [
            { email: { contains: search.trim().toLowerCase() } },
            { fullName: { contains: search.trim() } },
          ],
        }
      : {};

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        roleAssignments: {
          where: { revokedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      status: u.status,
      emailVerified: u.emailVerifiedAt !== null,
      emailVerifiedAt: u.emailVerifiedAt ? u.emailVerifiedAt.toISOString() : null,
      suspendedAt: u.suspendedAt ? u.suspendedAt.toISOString() : null,
      suspensionReason: u.suspensionReason,
      createdAt: u.createdAt.toISOString(),
      roles: Array.from(new Set(u.roleAssignments.map((a) => a.role))),
      assignments: u.roleAssignments.map((a) => ({
        assignmentId: a.id,
        role: a.role,
        districtCode: a.districtCode,
        warehouseCode: a.warehouseCode,
        shopCode: a.shopCode,
        grantedAt: a.createdAt.toISOString(),
      })),
    }));
  }

  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleAssignments: {
          orderBy: { createdAt: 'desc' },
        },
        staffRequests: {
          orderBy: { createdAt: 'desc' },
        },
        sessions: {
          where: { revokedAt: null, expiresAt: { gt: new Date() } },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User account not found.',
      });
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      emailVerified: user.emailVerifiedAt !== null,
      emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
      suspendedAt: user.suspendedAt ? user.suspendedAt.toISOString() : null,
      suspensionReason: user.suspensionReason,
      termsAcceptedAt: user.termsAcceptedAt.toISOString(),
      createdAt: user.createdAt.toISOString(),
      activeSessionsCount: user.sessions.length,
      assignments: user.roleAssignments.map((a) => ({
        assignmentId: a.id,
        role: a.role,
        districtCode: a.districtCode,
        warehouseCode: a.warehouseCode,
        shopCode: a.shopCode,
        revokedAt: a.revokedAt ? a.revokedAt.toISOString() : null,
        revocationReason: a.revocationReason,
        grantedAt: a.createdAt.toISOString(),
      })),
      staffRequests: user.staffRequests.map((r) => ({
        id: r.id,
        requestedRole: r.requestedRole,
        districtCode: r.districtCode,
        warehouseCode: r.warehouseCode,
        shopCode: r.shopCode,
        status: r.status,
        justification: r.justification,
        reviewNotes: r.reviewNotes,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async suspendUser(
    targetUserId: string,
    admin: AuthenticatedPrincipal,
    dto: SuspendUserDto,
    meta: { ipAddress?: string; correlationId?: string },
  ) {
    if (targetUserId === admin.userId) {
      throw new ForbiddenException({
        code: 'SELF_SUSPENSION_FORBIDDEN',
        message: 'Administrators cannot suspend their own account.',
      });
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User account not found.',
      });
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          status: AccountStatus.SUSPENDED,
          suspendedAt: now,
          suspensionReason: dto.reason.trim(),
        },
      });

      // Revoke all active sessions for this suspended user immediately
      await tx.session.updateMany({
        where: { userId: targetUserId, revokedAt: null },
        data: { revokedAt: now },
      });

      await this.auditService.recordEvent(
        {
          eventType: 'USER_SUSPENDED',
          outcome: 'SUCCESS',
          actorUserId: admin.userId,
          targetUserId,
          ipAddress: meta.ipAddress,
          correlationId: meta.correlationId,
          metadata: {
            reason: dto.reason.trim(),
          },
        },
        tx,
      );
    });

    return {
      status: 'suspended',
      message: 'User account has been suspended and all active sessions revoked.',
    };
  }

  async reactivateUser(
    targetUserId: string,
    admin: AuthenticatedPrincipal,
    meta: { ipAddress?: string; correlationId?: string },
  ) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User account not found.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          status: AccountStatus.ACTIVE,
          suspendedAt: null,
          suspensionReason: null,
        },
      });

      await this.auditService.recordEvent(
        {
          eventType: 'USER_REACTIVATED',
          outcome: 'SUCCESS',
          actorUserId: admin.userId,
          targetUserId,
          ipAddress: meta.ipAddress,
          correlationId: meta.correlationId,
        },
        tx,
      );
    });

    return {
      status: 'active',
      message: 'User account has been reactivated.',
    };
  }

  async revokeRoleAssignment(
    targetUserId: string,
    assignmentId: string,
    admin: AuthenticatedPrincipal,
    dto: RevokeRoleDto,
    meta: { ipAddress?: string; correlationId?: string },
  ) {
    const assignment = await this.prisma.userRoleAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment || assignment.userId !== targetUserId) {
      throw new NotFoundException({
        code: 'ROLE_ASSIGNMENT_NOT_FOUND',
        message: 'Role assignment not found for this user.',
      });
    }

    if (assignment.role === CanonicalRole.CITIZEN) {
      throw new BadRequestException({
        code: 'CANNOT_REVOKE_CITIZEN_ROLE',
        message: 'Baseline CITIZEN role cannot be revoked.',
      });
    }

    if (assignment.role === CanonicalRole.ADMIN && targetUserId === admin.userId) {
      throw new ForbiddenException({
        code: 'SELF_ADMIN_REVOCATION_FORBIDDEN',
        message: 'Administrators cannot revoke their own administrator role.',
      });
    }

    if (assignment.revokedAt !== null) {
      throw new ConflictException({
        code: 'ROLE_ALREADY_REVOKED',
        message: 'This role assignment has already been revoked.',
      });
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.userRoleAssignment.update({
        where: { id: assignmentId },
        data: {
          revokedAt: now,
          revokedById: admin.userId,
          revocationReason: dto.reason.trim(),
        },
      });

      await this.auditService.recordEvent(
        {
          eventType: 'ROLE_REVOKED',
          outcome: 'SUCCESS',
          actorUserId: admin.userId,
          targetUserId,
          targetResourceType: 'ROLE_ASSIGNMENT',
          targetResourceId: assignmentId,
          ipAddress: meta.ipAddress,
          correlationId: meta.correlationId,
          metadata: {
            role: assignment.role,
            reason: dto.reason.trim(),
          },
        },
        tx,
      );
    });

    return {
      status: 'revoked',
      message: `Role assignment for ${assignment.role} has been revoked.`,
    };
  }

  async listAuditEvents(limit = 100) {
    return this.auditService.listRecentEvents(limit);
  }
}
