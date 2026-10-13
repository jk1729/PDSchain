import { Module } from '@nestjs/common';
import { StaffRequestsController } from './staff-requests.controller';
import { StaffRequestsService } from './staff-requests.service';

@Module({
  controllers: [StaffRequestsController],
  providers: [StaffRequestsService],
  exports: [StaffRequestsService],
})
export class StaffRequestsModule {}
