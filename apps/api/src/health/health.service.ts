import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseProbeResult, PrismaService } from '../prisma/prisma.service';
import { DiagnosticPingDto } from './dto/diagnostic-ping.dto';

export interface LivenessPayload {
  status: 'ok';
  service: string;
  phase: number;
  check: 'liveness';
  uptimeSeconds: number;
  timestamp: string;
  correlationId: string;
}

export interface ReadinessPayload {
  status: 'ready' | 'not_ready';
  service: string;
  phase: number;
  check: 'readiness';
  dependencies: {
    database: DatabaseProbeResult;
  };
  timestamp: string;
  correlationId: string;
}

export interface HealthSummaryPayload {
  status: 'healthy' | 'degraded';
  service: string;
  version: string;
  phase: number;
  environment: string;
  uptimeSeconds: number;
  checks: {
    api: {
      status: 'up';
      message: string;
    };
    database: DatabaseProbeResult;
  };
  timestamp: string;
  correlationId: string;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  getLiveness(correlationId: string): LivenessPayload {
    return {
      status: 'ok',
      service: this.configService.get<string>('APP_NAME', 'pdschain-v2'),
      phase: 1,
      check: 'liveness',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      correlationId,
    };
  }

  async getReadiness(correlationId: string): Promise<ReadinessPayload> {
    const dbProbe = await this.prismaService.probeDatabase();
    const service = this.configService.get<string>('APP_NAME', 'pdschain-v2');
    const timestamp = new Date().toISOString();

    if (dbProbe.status !== 'up') {
      throw new ServiceUnavailableException({
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'Application dependencies are not ready: PostgreSQL connectivity check failed',
        details: {
          status: 'not_ready',
          service,
          phase: 1,
          check: 'readiness',
          dependencies: {
            database: dbProbe,
          },
          timestamp,
          correlationId,
        },
      });
    }

    return {
      status: 'ready',
      service,
      phase: 1,
      check: 'readiness',
      dependencies: {
        database: dbProbe,
      },
      timestamp,
      correlationId,
    };
  }

  async getHealthSummary(correlationId: string): Promise<HealthSummaryPayload> {
    const dbProbe = await this.prismaService.probeDatabase();
    const isHealthy = dbProbe.status === 'up';

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      service: this.configService.get<string>('APP_NAME', 'pdschain-v2'),
      version: '0.1.0',
      phase: 1,
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      uptimeSeconds: Math.floor(process.uptime()),
      checks: {
        api: {
          status: 'up',
          message: 'NestJS API process is active and serving requests',
        },
        database: dbProbe,
      },
      timestamp: new Date().toISOString(),
      correlationId,
    };
  }

  createPingAck(dto: DiagnosticPingDto, correlationId: string) {
    return {
      status: 'acknowledged',
      service: this.configService.get<string>('APP_NAME', 'pdschain-v2'),
      phase: 1,
      clientName: dto.clientName,
      note: dto.note ?? null,
      timestamp: new Date().toISOString(),
      correlationId,
    };
  }
}
