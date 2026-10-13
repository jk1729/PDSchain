import { Global, Module } from '@nestjs/common';
import { RbacPolicyService } from './rbac-policy.service';
import { RbacController } from './rbac.controller';
import { RolesGuard } from './roles.guard';
import { SessionAuthGuard } from './session-auth.guard';

@Global()
@Module({
  controllers: [RbacController],
  providers: [RbacPolicyService, SessionAuthGuard, RolesGuard],
  exports: [RbacPolicyService, SessionAuthGuard, RolesGuard],
})
export class RbacModule {}
