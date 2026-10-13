import { Global, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CryptoService } from './crypto.service';
import { RateLimiterService } from './rate-limiter.service';

@Global()
@Module({
  imports: [AuditModule],
  providers: [CryptoService, RateLimiterService],
  exports: [CryptoService, RateLimiterService],
})
export class SecurityModule {}
