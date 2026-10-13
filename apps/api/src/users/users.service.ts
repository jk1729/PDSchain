import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedPrincipal, CanonicalRole } from '../rbac/rbac.types';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getMyProfile(principal: AuthenticatedPrincipal) {
    const user = await this.prisma.user.findUnique({
      where: { id: principal.userId },
      include: {
        roleAssignments: {
          where: { revokedAt: null },
          orderBy: { createdAt: 'asc' },
        },
        staffRequests: {
          orderBy: { createdAt: 'desc' },
          take: 10,
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
      termsAcceptedAt: user.termsAcceptedAt.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      roles: Array.from(new Set(user.roleAssignments.map((a) => a.role))),
      assignments: user.roleAssignments.map((a) => ({
        assignmentId: a.id,
        role: a.role,
        districtCode: a.districtCode,
        warehouseCode: a.warehouseCode,
        shopCode: a.shopCode,
        grantedAt: a.createdAt.toISOString(),
      })),
      recentStaffRequests: user.staffRequests.map((r) => ({
        id: r.id,
        requestedRole: r.requestedRole,
        districtCode: r.districtCode,
        warehouseCode: r.warehouseCode,
        shopCode: r.shopCode,
        status: r.status,
        justification: r.justification,
        reviewNotes: r.reviewNotes,
        createdAt: r.createdAt.toISOString(),
        reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
      })),
    };
  }

  async updateMyProfile(
    principal: AuthenticatedPrincipal,
    dto: UpdateProfileDto,
    meta: { ipAddress?: string; correlationId?: string },
  ) {
    const updated = await this.prisma.user.update({
      where: { id: principal.userId },
      data: {
        fullName: dto.fullName.trim(),
      },
    });

    await this.auditService.recordEvent({
      eventType: 'USER_PROFILE_UPDATED',
      outcome: 'SUCCESS',
      actorUserId: principal.userId,
      targetUserId: principal.userId,
      ipAddress: meta.ipAddress,
      correlationId: meta.correlationId,
      metadata: {
        updatedFields: ['fullName'],
      },
    });

    return {
      status: 'updated',
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async getUserById(
    targetUserId: string,
    principal: AuthenticatedPrincipal,
    meta: { ipAddress?: string; correlationId?: string },
  ) {
    const isSelf = targetUserId === principal.userId;
    const isAdmin = principal.roles.includes(CanonicalRole.ADMIN);

    if (!isSelf && !isAdmin) {
      await this.auditService.recordEvent({
        eventType: 'AUTHORIZATION_DENIED_PROFILE_READ',
        outcome: 'DENIED',
        actorUserId: principal.userId,
        targetUserId,
        ipAddress: meta.ipAddress,
        correlationId: meta.correlationId,
      });

      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'You are not authorized to access another user’s profile.',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        roleAssignments: {
          where: { revokedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Requested user does not exist.',
      });
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      emailVerified: user.emailVerifiedAt !== null,
      emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      roles: Array.from(new Set(user.roleAssignments.map((a) => a.role))),
      assignments: user.roleAssignments.map((a) => ({
        assignmentId: a.id,
        role: a.role,
        districtCode: a.districtCode,
        warehouseCode: a.warehouseCode,
        shopCode: a.shopCode,
        grantedAt: a.createdAt.toISOString(),
      })),
    };
  }
}
