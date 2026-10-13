import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StaffRequestStatus } from '@prisma/client';
import { CurrentUser, Roles } from '../rbac/decorators';
import { AuthenticatedPrincipal, AuthenticatedRequest, CanonicalRole } from '../rbac/rbac.types';
import { RolesGuard } from '../rbac/roles.guard';
import { SessionAuthGuard } from '../rbac/session-auth.guard';
import { AdminService } from './admin.service';
import {
  ApproveStaffRequestDto,
  RejectStaffRequestDto,
  RevokeRoleDto,
  SuspendUserDto,
} from './dto/admin-actions.dto';

@Controller('admin')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(CanonicalRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('staff-access-requests')
  async listStaffRequests(@Query('status') status?: StaffRequestStatus) {
    return this.adminService.listStaffRequests(status);
  }

  @Get('staff-access-requests/:id')
  async getStaffRequestById(@Param('id') id: string) {
    return this.adminService.getStaffRequestById(id);
  }

  @Post('staff-access-requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveStaffRequest(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedPrincipal,
    @Body() dto: ApproveStaffRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.approveStaffRequest(id, admin, dto, {
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });
  }

  @Post('staff-access-requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectStaffRequest(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedPrincipal,
    @Body() dto: RejectStaffRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.rejectStaffRequest(id, admin, dto, {
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });
  }

  @Get('users')
  async listUsers(@Query('search') search?: string) {
    return this.adminService.listUsers(search);
  }

  @Get('users/:id')
  async getUserDetails(@Param('id') id: string) {
    return this.adminService.getUserDetails(id);
  }

  @Post('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendUser(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedPrincipal,
    @Body() dto: SuspendUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.suspendUser(id, admin, dto, {
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });
  }

  @Post('users/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateUser(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedPrincipal,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.reactivateUser(id, admin, {
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });
  }

  @Post('users/:id/roles/:assignmentId/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeRole(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() admin: AuthenticatedPrincipal,
    @Body() dto: RevokeRoleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.revokeRoleAssignment(id, assignmentId, admin, dto, {
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });
  }

  @Get('audit-events')
  async listAuditEvents(@Query('limit') limit?: number) {
    return this.adminService.listAuditEvents(limit ? Number(limit) : 100);
  }
}
