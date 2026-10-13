import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';

interface RateLimitBucket {
  timestamps: number[];
}

export interface RateLimitCheckOptions {
  action: string;
  key: string;
  maxAttempts?: number;
  windowSeconds?: number;
  actorUserId?: string;
  ipAddress?: string;
  correlationId?: string;
}

@Injectable()
export class RateLimiterService {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly defaultWindowSeconds: number;
  private readonly defaultMaxAttempts: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    this.defaultWindowSeconds = this.configService.get<number>('RATE_LIMIT_WINDOW_SECONDS', 60);
    this.defaultMaxAttempts = this.configService.get<number>('RATE_LIMIT_MAX_ATTEMPTS', 10);
  }

  async consumeOrThrow(options: RateLimitCheckOptions): Promise<void> {
    const windowMs = (options.windowSeconds ?? this.defaultWindowSeconds) * 1000;
    const maxAttempts = options.maxAttempts ?? this.defaultMaxAttempts;
    const now = Date.now();
    const compositeKey = `${options.action}:${options.key}`;

    const existing = this.buckets.get(compositeKey) ?? { timestamps: [] };
    const activeTimestamps = existing.timestamps.filter((ts) => now - ts < windowMs);

    if (activeTimestamps.length >= maxAttempts) {
      this.buckets.set(compositeKey, { timestamps: activeTimestamps });
      await this.auditService.recordEvent({
        eventType: 'RATE_LIMIT_EXCEEDED',
        outcome: 'DENIED',
        actorUserId: options.actorUserId,
        ipAddress: options.ipAddress,
        correlationId: options.correlationId,
        metadata: {
          action: options.action,
          windowSeconds: Math.round(windowMs / 1000),
          maxAttempts,
        },
      });

      throw new HttpException(
        {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests for this operation. Please wait before trying again.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    activeTimestamps.push(now);
    this.buckets.set(compositeKey, { timestamps: activeTimestamps });
  }

  resetAll(): void {
    this.buckets.clear();
  }
}
