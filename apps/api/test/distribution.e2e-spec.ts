import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureNestApp } from '../src/common/setup-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { CanonicalRole } from '@prisma/client';

function extractCookie(setCookies: string[] | undefined, name: string): string | undefined {
  if (!setCookies) return undefined;
  for (const cookieStr of setCookies) {
    const parts = cookieStr.split(';')[0].split('=');
    if (parts[0].trim() === name) {
      return parts.slice(1).join('=');
    }
  }
  return undefined;
}

function parseCookies(setCookies: string[] | undefined): {
  sessionCookie?: string;
  csrfToken?: string;
  cookieHeader: string;
} {
  const session = extractCookie(setCookies, 'pdschain_session');
  const csrf = extractCookie(setCookies, 'pdschain_csrf');
  const cookieHeader = [
    session ? `pdschain_session=${session}` : '',
    csrf ? `pdschain_csrf=${csrf}` : '',
  ]
    .filter(Boolean)
    .join('; ');

  return { sessionCookie: session, csrfToken: csrf, cookieHeader };
}

describe('PDSChain v2 API — Phase 3 Distribution & Smart Contract Business Logic (E2E Suite)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testId = Date.now();
  const citizenEmail = `citizen_dist_${testId}@pdschain.test`;
  const adminEmail = `admin_dist_${testId}@pdschain.test`;
  const warehouseOpEmail = `wh_op_${testId}@pdschain.test`;
  const fpsOpEmail = `fps_op_${testId}@pdschain.test`;
  const password = 'SecurePassword2026!';

  let citizenCookies: { sessionCookie?: string; csrfToken?: string; cookieHeader: string };
  let adminCookies: { sessionCookie?: string; csrfToken?: string; cookieHeader: string };
  let whCookies: { sessionCookie?: string; csrfToken?: string; cookieHeader: string };
  let fpsCookies: { sessionCookie?: string; csrfToken?: string; cookieHeader: string };

  const WAREHOUSE_CODE = 'WH-KA-BLR-01';
  const FPS_CODE = 'FPS-KA-BLR-042';
  const BENEFICIARY_REF = `BENEFICIARY:RC-${testId}`;
  const COMMODITY_ID = `COMMODITY:RICE-${testId}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureNestApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    // Setup helper to register and verify user
    async function createUser(
      email: string,
      role: CanonicalRole,
      scopes?: { wh?: string; fps?: string },
    ) {
      const regRes = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        email,
        password,
        confirmPassword: password,
        fullName: 'Test User',
        acceptTerms: true,
      });

      if (regRes.status !== 201) {
        throw new Error(`Register failed: ${JSON.stringify(regRes.body)}`);
      }

      const user = await prisma.user.update({
        where: { email: email.toLowerCase() },
        data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
      });

      if (role !== CanonicalRole.CITIZEN) {
        await prisma.userRoleAssignment.create({
          data: {
            userId: user.id,
            role,
            warehouseCode: scopes?.wh ?? null,
            shopCode: scopes?.fps ?? null,
          },
        });
      }

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password });

      return parseCookies(loginRes.get('Set-Cookie'));
    }

    citizenCookies = await createUser(citizenEmail, CanonicalRole.CITIZEN);
    adminCookies = await createUser(adminEmail, CanonicalRole.ADMIN);
    whCookies = await createUser(warehouseOpEmail, CanonicalRole.WAREHOUSE_MANAGER, {
      wh: WAREHOUSE_CODE,
    });
    fpsCookies = await createUser(fpsOpEmail, CanonicalRole.FPS_OPERATOR, { fps: FPS_CODE });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('1. Authentication and Public/Role Access', () => {
    it('rejects unauthenticated requests to list commodities', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/distribution/commodities');
      expect(res.status).toBe(401);
    });

    it('allows authenticated citizen to view commodities', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/distribution/commodities')
        .set('Cookie', citizenCookies.cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('commodities');
      expect(Array.isArray(res.body.commodities)).toBe(true);
    });

    it('prevents citizen from registering a commodity (RBAC denial)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/distribution/commodities')
        .set('Cookie', citizenCookies.cookieHeader)
        .set('X-CSRF-Token', citizenCookies.csrfToken!)
        .send({
          commodityId: 'COMMODITY:ROGUE',
          name: 'Rogue Rice',
          unit: 'kg',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('2. Admin Commodity & Beneficiary On-Chain Setup', () => {
    it('allows admin to register a new commodity', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/distribution/commodities')
        .set('Cookie', adminCookies.cookieHeader)
        .set('X-CSRF-Token', adminCookies.csrfToken!)
        .send({
          commodityId: COMMODITY_ID,
          name: 'Test Rice Premium',
          unit: 'kg',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.action).toBe('COMMODITY_REGISTERED');
    });

    it('allows admin to register a beneficiary', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/distribution/beneficiaries')
        .set('Cookie', adminCookies.cookieHeader)
        .set('X-CSRF-Token', adminCookies.csrfToken!)
        .send({
          beneficiaryRef: BENEFICIARY_REF,
          districtCode: 'DIST-BLR-URBAN',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.action).toBe('BENEFICIARY_REGISTERED');
    });

    it('allows admin to set monthly entitlement quota', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/distribution/entitlements')
        .set('Cookie', adminCookies.cookieHeader)
        .set('X-CSRF-Token', adminCookies.csrfToken!)
        .send({
          beneficiaryRef: BENEFICIARY_REF,
          period: 202610,
          commodityId: COMMODITY_ID,
          allocatedQuantity: 35,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.action).toBe('ENTITLEMENT_CONFIGURED');
    });
  });

  describe('3. Warehouse Inventory & Transfer Workflow', () => {
    it('allows authorized warehouse manager to record stock receipt', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/distribution/inventory/warehouse/receipt')
        .set('Cookie', whCookies.cookieHeader)
        .set('X-CSRF-Token', whCookies.csrfToken!)
        .send({
          warehouseId: WAREHOUSE_CODE,
          commodityId: COMMODITY_ID,
          quantity: 5000,
          batchReference: `BATCH-${testId}-01`,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.action).toBe('WAREHOUSE_STOCK_RECEIVED');
      expect(res.body.quantity).toBe(5000);
    });

    it('rejects warehouse manager attempting to record stock for an unauthorized warehouse', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/distribution/inventory/warehouse/receipt')
        .set('Cookie', whCookies.cookieHeader)
        .set('X-CSRF-Token', whCookies.csrfToken!)
        .send({
          warehouseId: 'WH-KA-MYS-99', // Not in operator scope
          commodityId: COMMODITY_ID,
          quantity: 500,
          batchReference: 'BATCH-UNAUTH-01',
        });

      expect(res.status).toBe(403);
    });

    it('allows authorized warehouse manager to transfer stock to FPS', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/distribution/inventory/warehouse/transfer')
        .set('Cookie', whCookies.cookieHeader)
        .set('X-CSRF-Token', whCookies.csrfToken!)
        .send({
          warehouseId: WAREHOUSE_CODE,
          fpsId: FPS_CODE,
          commodityId: COMMODITY_ID,
          quantity: 1200,
          transferReference: `TRANSFER-${testId}-01`,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.action).toBe('STOCK_TRANSFERRED_FPS');
    });

    it('rejects warehouse transfer exceeding available warehouse inventory', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/distribution/inventory/warehouse/transfer')
        .set('Cookie', whCookies.cookieHeader)
        .set('X-CSRF-Token', whCookies.csrfToken!)
        .send({
          warehouseId: WAREHOUSE_CODE,
          fpsId: FPS_CODE,
          commodityId: COMMODITY_ID,
          quantity: 100000, // Exceeds available stock
          transferReference: `TRANSFER-OVERFLOW`,
        });

      expect(res.status).toBe(400);
    });
  });

  describe('4. FPS Ration Distribution & Replay Prevention', () => {
    const claimRef1 = `CLAIM-${testId}-001`;
    const claimRef2 = `CLAIM-${testId}-002`;

    it('allows authorized FPS operator to distribute ration to eligible beneficiary', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/distribution/distribute')
        .set('Cookie', fpsCookies.cookieHeader)
        .set('X-CSRF-Token', fpsCookies.csrfToken!)
        .send({
          fpsId: FPS_CODE,
          beneficiaryRef: BENEFICIARY_REF,
          period: 202610,
          commodityId: COMMODITY_ID,
          quantity: 20,
          claimRef: claimRef1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.action).toBe('RATION_DISTRIBUTED');
      expect(res.body.quantity).toBe(20);
    });

    it('rejects duplicate distribution claim with same claimRef (replay protection)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/distribution/distribute')
        .set('Cookie', fpsCookies.cookieHeader)
        .set('X-CSRF-Token', fpsCookies.csrfToken!)
        .send({
          fpsId: FPS_CODE,
          beneficiaryRef: BENEFICIARY_REF,
          period: 202610,
          commodityId: COMMODITY_ID,
          quantity: 10,
          claimRef: claimRef1, // Duplicate claim
        });

      expect(res.status).toBe(409);
    });

    it('rejects distribution exceeding remaining monthly quota', async () => {
      // 20kg was distributed out of 35kg quota. Remaining is 15kg. Attempt 16kg.
      const res = await request(app.getHttpServer())
        .post('/api/v1/distribution/distribute')
        .set('Cookie', fpsCookies.cookieHeader)
        .set('X-CSRF-Token', fpsCookies.csrfToken!)
        .send({
          fpsId: FPS_CODE,
          beneficiaryRef: BENEFICIARY_REF,
          period: 202610,
          commodityId: COMMODITY_ID,
          quantity: 16,
          claimRef: claimRef2,
        });

      expect(res.status).toBe(400);
    });

    it('verifies that confirmed transactions appear in the ledger query', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/distribution/transactions')
        .set('Cookie', adminCookies.cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('transactions');
      const distTx = res.body.transactions.find(
        (t: { claimRef?: string; txType?: string }) => t.claimRef === claimRef1,
      );
      expect(distTx).toBeDefined();
      expect(distTx.txType).toBe('RATION_DISTRIBUTED');
    });
  });
});
