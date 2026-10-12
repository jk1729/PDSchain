import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface DatabaseProbeResult {
  status: 'up' | 'down';
  latencyMs: number;
  message: string;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.LOG_LEVEL === 'debug' ? ['query', 'warn', 'error'] : ['warn', 'error'],
    });
  }

  /**
   * Executes a real PostgreSQL `SELECT 1` probe to confirm live database connectivity.
   * Never leaks connection strings or database credentials in the returned message.
   */
  async probeDatabase(): Promise<DatabaseProbeResult> {
    const startNs = process.hrtime.bigint();
    try {
      await this.$queryRaw`SELECT 1 AS ok`;
      const latencyMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
      return {
        status: 'up',
        latencyMs: Number(latencyMs.toFixed(2)),
        message: 'PostgreSQL connection verified via SELECT 1',
      };
    } catch {
      const latencyMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
      if (process.env.NODE_ENV !== 'test') {
        this.logger.warn('PostgreSQL readiness probe failed');
      }
      return {
        status: 'down',
        latencyMs: Number(latencyMs.toFixed(2)),
        message: 'PostgreSQL database is unreachable or did not respond to query probe',
      };
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
