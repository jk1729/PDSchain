import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { CorrelatedRequest } from '../common/correlation-id.middleware';
import { DiagnosticPingDto } from './dto/diagnostic-ping.dto';
import {
  HealthService,
  HealthSummaryPayload,
  LivenessPayload,
  ReadinessPayload,
} from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  getLive(@Req() req: CorrelatedRequest): LivenessPayload {
    return this.healthService.getLiveness(req.correlationId ?? 'unassigned');
  }

  @Get('ready')
  async getReady(@Req() req: CorrelatedRequest): Promise<ReadinessPayload> {
    return this.healthService.getReadiness(req.correlationId ?? 'unassigned');
  }

  @Get()
  async getSummary(@Req() req: CorrelatedRequest): Promise<HealthSummaryPayload> {
    return this.healthService.getHealthSummary(req.correlationId ?? 'unassigned');
  }

  @Post('ping')
  @HttpCode(HttpStatus.OK)
  postPing(@Body() dto: DiagnosticPingDto, @Req() req: CorrelatedRequest) {
    return this.healthService.createPingAck(dto, req.correlationId ?? 'unassigned');
  }
}
