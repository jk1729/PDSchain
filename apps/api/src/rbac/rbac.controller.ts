import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CurrentUser, Roles } from './decorators';
import { RbacPolicyService } from './rbac-policy.service';
import { AuthenticatedPrincipal, AuthenticatedRequest, CanonicalRole } from './rbac.types';
import { RolesGuard } from './roles.guard';
import { SessionAuthGuard } from './session-auth.guard';

@Controller('rbac/scopes')
@UseGuards(SessionAuthGuard, RolesGuard)
export class RbacController {
  constructor(
    private readonly rbacPolicy: RbacPolicyService,
    private readonly auditService: AuditService,
  ) {}

  @Get('districts/:districtCode')
  @Roles(CanonicalRole.DISTRICT_OFFICER, CanonicalRole.ADMIN)
  async verifyDistrictScope(
    @Param('districtCode') districtCode: string,
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      this.rbacPolicy.assertDistrictAccess(principal, districtCode);
    } catch (err) {
      await this.auditService.recordEvent({
        eventType: 'SCOPE_ACCESS_DENIED',
        outcome: 'DENIED',
        actorUserId: principal.userId,
        targetResourceType: 'DISTRICT',
        targetResourceId: districtCode.toUpperCase(),
        ipAddress: req.ip,
        correlationId: req.correlationId,
      });
      throw err;
    }

    return {
      status: 'authorized',
      resourceType: 'DISTRICT',
      districtCode: districtCode.trim().toUpperCase(),
      actorUserId: principal.userId,
      actorRoles: principal.roles,
    };
  }

  @Get('warehouses/:warehouseCode')
  @Roles(CanonicalRole.WAREHOUSE_MANAGER, CanonicalRole.DISTRICT_OFFICER, CanonicalRole.ADMIN)
  async verifyWarehouseScope(
    @Param('warehouseCode') warehouseCode: string,
    @Query('districtCode') districtCode: string | undefined,
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      this.rbacPolicy.assertWarehouseAccess(principal, { warehouseCode, districtCode });
    } catch (err) {
      await this.auditService.recordEvent({
        eventType: 'SCOPE_ACCESS_DENIED',
        outcome: 'DENIED',
        actorUserId: principal.userId,
        targetResourceType: 'WAREHOUSE',
        targetResourceId: warehouseCode.toUpperCase(),
        ipAddress: req.ip,
        correlationId: req.correlationId,
      });
      throw err;
    }

    return {
      status: 'authorized',
      resourceType: 'WAREHOUSE',
      warehouseCode: warehouseCode.trim().toUpperCase(),
      districtCode: districtCode ? districtCode.trim().toUpperCase() : null,
      actorUserId: principal.userId,
      actorRoles: principal.roles,
    };
  }

  @Get('shops/:shopCode')
  @Roles(CanonicalRole.FPS_OPERATOR, CanonicalRole.DISTRICT_OFFICER, CanonicalRole.ADMIN)
  async verifyShopScope(
    @Param('shopCode') shopCode: string,
    @Query('districtCode') districtCode: string | undefined,
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      this.rbacPolicy.assertShopAccess(principal, { shopCode, districtCode });
    } catch (err) {
      await this.auditService.recordEvent({
        eventType: 'SCOPE_ACCESS_DENIED',
        outcome: 'DENIED',
        actorUserId: principal.userId,
        targetResourceType: 'FPS_SHOP',
        targetResourceId: shopCode.toUpperCase(),
        ipAddress: req.ip,
        correlationId: req.correlationId,
      });
      throw err;
    }

    return {
      status: 'authorized',
      resourceType: 'FPS_SHOP',
      shopCode: shopCode.trim().toUpperCase(),
      districtCode: districtCode ? districtCode.trim().toUpperCase() : null,
      actorUserId: principal.userId,
      actorRoles: principal.roles,
    };
  }
}
