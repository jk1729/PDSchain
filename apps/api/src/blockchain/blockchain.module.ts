import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockchainService } from './blockchain.service';
import { DistributionController } from './distribution.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [ConfigModule, PrismaModule, AuditModule, SecurityModule],
  controllers: [DistributionController],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
