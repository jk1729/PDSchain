import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../rbac/decorators';
import { AuthenticatedPrincipal, AuthenticatedRequest } from '../rbac/rbac.types';
import { SessionAuthGuard } from '../rbac/session-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(SessionAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() principal: AuthenticatedPrincipal) {
    return this.usersService.getMyProfile(principal);
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: UpdateProfileDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.updateMyProfile(principal, dto, {
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });
  }

  @Get(':id')
  async getUser(
    @Param('id') id: string,
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.getUserById(id, principal, {
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });
  }
}
