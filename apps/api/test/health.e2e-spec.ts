import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureNestApp } from '../src/common/setup-app';
import { validateApiEnv } from '../src/config/env.validation';
import { PrismaService } from '../src/prisma/prisma.service';

describe('PDSChain v2 API — Phase 1 Foundation (Integration & Unit)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureNestApp(app);
    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Environment Configuration Validation', () => {
    it('accepts valid PostgreSQL and server configuration', () => {
      const config = validateApiEnv({
        NODE_ENV: 'development',
        API_PORT: '4000',
        DATABASE_URL: 'postgresql://pdschain:pass@127.0.0.1:5432/pdschain_v2?schema=public',
        CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
      });
      expect(config.API_PORT).toBe(4000);
      expect(config.NODE_ENV).toBe('development');
    });

    it('rejects missing DATABASE_URL or non-PostgreSQL protocols', () => {
      expect(() =>
        validateApiEnv({
          NODE_ENV: 'development',
          API_PORT: '4000',
        }),
      ).toThrow(/DATABASE_URL/);

      expect(() =>
        validateApiEnv({
          NODE_ENV: 'development',
          API_PORT: '4000',
          DATABASE_URL: 'file:./dev.db',
        }),
      ).toThrow(/PostgreSQL/);
    });

    it('rejects wildcard (*) CORS origins in production', () => {
      expect(() =>
        validateApiEnv({
          NODE_ENV: 'production',
          API_PORT: '4000',
          DATABASE_URL: 'postgresql://pdschain:pass@127.0.0.1:5432/pdschain_v2',
          CORS_ALLOWED_ORIGINS: '*',
        }),
      ).toThrow(/Wildcard/);
    });
  });

  describe('GET /api/v1/health/live', () => {
    it('returns HTTP 200 liveness confirmation and attaches correlation ID header', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/live')
        .set('x-correlation-id', 'test-corr-live-001')
        .expect(200);

      expect(response.headers['x-correlation-id']).toBe('test-corr-live-001');
      expect(response.body).toMatchObject({
        status: 'ok',
        service: 'pdschain-v2',
        phase: 1,
        check: 'liveness',
        correlationId: 'test-corr-live-001',
      });
      expect(typeof response.body.uptimeSeconds).toBe('number');
    });

    it('succeeds even if PostgreSQL is unreachable', async () => {
      const spy = jest.spyOn(prismaService, 'probeDatabase').mockResolvedValueOnce({
        status: 'down',
        latencyMs: 1,
        message: 'Simulated DB outage',
      });

      const response = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);
      expect(response.body.status).toBe('ok');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('GET /api/v1/health/ready', () => {
    it('returns HTTP 200 when real PostgreSQL SELECT 1 probe succeeds', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);

      expect(response.body).toMatchObject({
        status: 'ready',
        service: 'pdschain-v2',
        phase: 1,
        check: 'readiness',
        dependencies: {
          database: {
            status: 'up',
          },
        },
      });
      expect(typeof response.body.dependencies.database.latencyMs).toBe('number');
    });

    it('returns HTTP 503 Service Unavailable when PostgreSQL is unreachable', async () => {
      const spy = jest.spyOn(prismaService, 'probeDatabase').mockResolvedValueOnce({
        status: 'down',
        latencyMs: 2.5,
        message: 'PostgreSQL database is unreachable or did not respond to query probe',
      });

      const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(503);

      expect(response.body).toMatchObject({
        status: 'error',
        error: {
          code: 'DEPENDENCY_UNAVAILABLE',
          statusCode: 503,
          path: '/api/v1/health/ready',
          details: {
            status: 'not_ready',
            dependencies: {
              database: {
                status: 'down',
              },
            },
          },
        },
      });

      spy.mockRestore();
    });
  });

  describe('GET /api/v1/health', () => {
    it('returns concise health summary without leaking secrets or connection strings', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'pdschain-v2',
        version: '0.1.0',
        phase: 1,
        checks: {
          api: { status: 'up' },
          database: { status: 'up' },
        },
      });

      const serialized = JSON.stringify(response.body);
      expect(serialized).not.toContain('postgresql://');
      expect(serialized).not.toContain('POSTGRES_PASSWORD');
      expect(serialized).not.toContain('pdschain_local_dev');
    });

    it('reports degraded status when PostgreSQL probe fails', async () => {
      const spy = jest.spyOn(prismaService, 'probeDatabase').mockResolvedValueOnce({
        status: 'down',
        latencyMs: 1.2,
        message: 'PostgreSQL database is unreachable or did not respond to query probe',
      });

      const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
      expect(response.body.status).toBe('degraded');
      expect(response.body.checks.database.status).toBe('down');

      spy.mockRestore();
    });
  });

  describe('POST /api/v1/health/ping (DTO Validation & Centralized Error Handling)', () => {
    it('accepts valid payload and returns structured acknowledgment', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/health/ping')
        .send({ clientName: 'web-status-panel', note: 'Phase 1 connectivity test' })
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'acknowledged',
        service: 'pdschain-v2',
        phase: 1,
        clientName: 'web-status-panel',
        note: 'Phase 1 connectivity test',
      });
    });

    it('rejects invalid or non-whitelisted DTO payloads with HTTP 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/health/ping')
        .send({ clientName: '', unexpectedField: 'not-allowed' })
        .expect(400);

      expect(response.body).toMatchObject({
        status: 'error',
        error: {
          code: 'BAD_REQUEST',
          statusCode: 400,
          message: 'Request payload validation failed',
          path: '/api/v1/health/ping',
        },
      });
      expect(Array.isArray(response.body.error.details)).toBe(true);
    });

    it('returns standardized HTTP 404 envelope for unknown endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/non-existent-route')
        .expect(404);

      expect(response.body).toMatchObject({
        status: 'error',
        error: {
          code: 'NOT_FOUND',
          statusCode: 404,
          path: '/api/v1/non-existent-route',
        },
      });
      expect(typeof response.body.error.correlationId).toBe('string');
    });
  });
});
