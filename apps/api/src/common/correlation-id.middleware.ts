import { randomUUID } from 'node:crypto';
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

export interface CorrelatedRequest extends Request {
  correlationId?: string;
}

const SAFE_CORRELATION_ID_REGEX = /^[a-zA-Z0-9._-]{8,128}$/;

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HttpTraffic');

  use(req: CorrelatedRequest, res: Response, next: NextFunction): void {
    const incomingHeader = req.header(CORRELATION_ID_HEADER);
    const correlationId =
      incomingHeader && SAFE_CORRELATION_ID_REGEX.test(incomingHeader)
        ? incomingHeader
        : randomUUID();

    req.correlationId = correlationId;
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      if (process.env.NODE_ENV === 'test' && process.env.LOG_LEVEL !== 'debug') {
        return;
      }
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const logEntry = {
        event: 'http_request',
        correlationId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        timestamp: new Date().toISOString(),
      };
      this.logger.log(JSON.stringify(logEntry));
    });

    next();
  }
}
