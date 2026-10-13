import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CanonicalRole, StaffRequestStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedPrincipal } from '../rbac/rbac.types';
import { CreateStaffRequestDto } from './dto/create-staff-request.dto';

@Injectable()
export class StaffRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createRequest(
    principal: AuthenticatedPrincipal,
    dto: CreateStaffRequestDto,
    meta: { ipAddress?: string; correlationId?: string },
  ) {
    const districtCode = dto.districtCode.trim().toUpperCase();
    const warehouseCode = dto.warehouseCode ? dto.warehouseCode.trim().toUpperCase() : null;
    const shopCode = dto.shopCode ? dto.shopCode.trim().toUpperCase() : null;

    if (dto.requestedRole === CanonicalRole.WAREHOUSE_MANAGER && !warehouseCode) {
      throw new BadRequestException({
        code: 'WAREHOUSE_CODE_REQUIRED',
        message: 'Warehouse manager requests must specify a warehouseCode.',
      });
    }

    if (dto.requestedRole === CanonicalRole.FPS_OPERATOR && !shopCode) {
      throw new BadRequestException({
        code: 'SHOP_CODE_REQUIRED',
        message: 'FPS operator requests must specify a shopCode.',
      });
    }

    if (dto.requestedRole === CanonicalRole.DISTRICT_OFFICER && (warehouseCode || shopCode)) {
      throw new BadRequestException({
        code: 'INVALID_SCOPE_FOR_ROLE',
        message: 'District officer requests must not specify warehouseCode or shopCode.',
      });
    }

    // Check for existing active role assignment
    const alreadyHoldsRole = principal.assignments.some((a) => {
      if (a.role !== dto.requestedRole) return false;
      const districtMatch = a.districtCode?.toUpperCase() === districtCode;
      if (dto.requestedRole === CanonicalRole.DISTRICT_OFFICER) {
        return districtMatch;
      }
      if (dto.requestedRole === CanonicalRole.WAREHOUSE_MANAGER) {
        return districtMatch && a.warehouseCode?.toUpperCase() === warehouseCode;
      }
      if (dto.requestedRole === CanonicalRole.FPS_OPERATOR) {
        return districtMatch && a.shopCode?.toUpperCase() === shopCode;
      }
      return false;
    });

    if (alreadyHoldsRole) {
      throw new ConflictException({
        code: 'ROLE_ALREADY_ASSIGNED',
        message: 'You already hold an approved active assignment for this role and scope.',
      });
    }

    // Check for existing pending request for the same role and scope
    const existingPending = await this.prisma.staffAccessRequest.findFirst({
      where: {
        requesterId: principal.userId,
        requestedRole: dto.requestedRole,
        districtCode,
        warehouseCode,
        shopCode,
        status: StaffRequestStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new ConflictException({
        code: 'DUPLICATE_PENDING_REQUEST',
        message:
          'You already have a pending access request for this role and scope under administrator review.',
      });
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const request = await tx.staffAccessRequest.create({
        data: {
          requesterId: principal.userId,
          requestedRole: dto.requestedRole,
          districtCode,
          warehouseCode,
          shopCode,
          justification: dto.justification.trim(),
          status: StaffRequestStatus.PENDING,
        },
      });

      await this.auditService.recordEvent(
        {
          eventType: 'STAFF_REQUEST_CREATED',
          outcome: 'SUCCESS',
          actorUserId: principal.userId,
          targetResourceType: 'STAFF_REQUEST',
          targetResourceId: request.id,
          ipAddress: meta.ipAddress,
          correlationId: meta.correlationId,
          metadata: {
            requestedRole: dto.requestedRole,
            districtCode,
            warehouseCode,
            shopCode,
          },
        },
        tx,
      );

      return request;
    });

    return {
      status: 'pending',
      message:
        'Your staff access request has been submitted for administrator review. No privileges have been granted yet.',
      request: {
        id: created.id,
        requestedRole: created.requestedRole,
        districtCode: created.districtCode,
        warehouseCode: created.warehouseCode,
        shopCode: created.shopCode,
        justification: created.justification,
        status: created.status,
        createdAt: created.createdAt.toISOString(),
      },
    };
  }

  async getMyRequests(principal: AuthenticatedPrincipal) {
    const list = await this.prisma.staffAccessRequest.findMany({
      where: { requesterId: principal.userId },
      orderBy: { createdAt: 'desc' },
    });

    return list.map((r) => ({
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
    }));
  }

  async getRequestById(id: string, principal: AuthenticatedPrincipal) {
    const request = await this.prisma.staffAccessRequest.findUnique({
      where: { id },
      include: {
        requester: {
          select: { id: true, email: true, fullName: true },
        },
        reviewer: {
          select: { id: true, email: true, fullName: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException({
        code: 'REQUEST_NOT_FOUND',
        message: 'Staff access request not found.',
      });
    }

    const isRequester = request.requesterId === principal.userId;
    const isAdmin = principal.roles.includes(CanonicalRole.ADMIN);

    if (!isRequester && !isAdmin) {
      throw new ForbiddenException({
        code: 'ACCESS_DENIED',
        message: 'You are not authorized to view this staff access request.',
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
    };
  }

  async cancelMyRequest(
    id: string,
    principal: AuthenticatedPrincipal,
    meta: { ipAddress?: string; correlationId?: string },
  ) {
    const existing = await this.prisma.staffAccessRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'REQUEST_NOT_FOUND',
        message: 'Staff access request not found.',
      });
    }

    if (existing.requesterId !== principal.userId) {
      throw new ForbiddenException({
        code: 'ACCESS_DENIED',
        message: 'You can only cancel your own access requests.',
      });
    }

    if (existing.status !== StaffRequestStatus.PENDING) {
      throw new BadRequestException({
        code: 'CANNOT_CANCEL_REQUEST',
        message: `Request cannot be cancelled because its status is ${existing.status}.`,
      });
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.staffAccessRequest.update({
        where: { id },
        data: {
          status: StaffRequestStatus.CANCELLED,
          reviewNotes: 'Cancelled by requester.',
          reviewedAt: now,
        },
      });

      await this.auditService.recordEvent(
        {
          eventType: 'STAFF_REQUEST_CANCELLED',
          outcome: 'SUCCESS',
          actorUserId: principal.userId,
          targetResourceType: 'STAFF_REQUEST',
          targetResourceId: id,
          ipAddress: meta.ipAddress,
          correlationId: meta.correlationId,
        },
        tx,
      );
    });

    return {
      status: 'cancelled',
      message: 'Your access request has been cancelled.',
    };
  }
}
