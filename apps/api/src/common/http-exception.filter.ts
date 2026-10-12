import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { CorrelatedRequest, CORRELATION_ID_HEADER } from './correlation-id.middleware';

export interface StandardErrorResponse {
  status: 'error';
  error: {
    code: string;
    statusCode: number;
    message: string;
    details?: unknown;
    path: string;
    timestamp: string;
    correlationId: string;
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<CorrelatedRequest>();
    const response = ctx.getResponse<Response>();

    const correlationId =
      request.correlationId ??
      (typeof response.getHeader(CORRELATION_ID_HEADER) === 'string'
        ? (response.getHeader(CORRELATION_ID_HEADER) as string)
        : 'unassigned');

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected internal server error occurred.';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      code = HttpStatus[statusCode] ?? 'HTTP_ERROR';
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resObj = exceptionResponse as Record<string, unknown>;
        if (typeof resObj.code === 'string') {
          code = resObj.code;
        }
        if (Array.isArray(resObj.message)) {
          message = 'Request payload validation failed';
          details = resObj.message;
        } else if (typeof resObj.message === 'string') {
          message = resObj.message;
        }
        if (resObj.details !== undefined) {
          details = resObj.details;
        }
      }
    } else if (exception instanceof Error) {
      if (process.env.NODE_ENV !== 'test') {
        this.logger.error(
          JSON.stringify({
            event: 'unhandled_exception',
            correlationId,
            path: request.originalUrl,
            errorName: exception.name,
            errorMessage: 'Unhandled internal error',
          }),
        );
      }
    }

    const payload: StandardErrorResponse = {
      status: 'error',
      error: {
        code,
        statusCode,
        message,
        ...(details !== undefined ? { details } : {}),
        path: request.originalUrl ?? request.url,
        timestamp: new Date().toISOString(),
        correlationId,
      },
    };

    response.status(statusCode).json(payload);
  }
}
