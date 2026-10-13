import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../rbac/decorators';
import { AuthenticatedPrincipal, AuthenticatedRequest } from '../rbac/rbac.types';
import { SessionAuthGuard } from '../rbac/session-auth.guard';
import { CreateStaffRequestDto } from './dto/create-staff-request.dto';
import { StaffRequestsService } from './staff-requests.service';

@Controller('staff-access-requests')
@UseGuards(SessionAuthGuard)
export class StaffRequestsController {
  constructor(private readonly service: StaffRequestsService) {}

  @Post()
  async create(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: CreateStaffRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.createRequest(principal, dto, {
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });
  }

  @Get('me')
  async getMyRequests(@CurrentUser() principal: AuthenticatedPrincipal) {
    return this.service.getMyRequests(principal);
  }

  @Get(':id')
  async getById(@Param('id') id: string, @CurrentUser() principal: AuthenticatedPrincipal) {
    return this.service.getRequestById(id, principal);
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.cancelMyRequest(id, principal, {
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });
  }
}
