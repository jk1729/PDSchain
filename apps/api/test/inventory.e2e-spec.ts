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

describe('PDSChain v2 API — Phase 4 Districts, Shops, Commodities & Inventory (E2E Suite)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testId = Date.now();
  const citizenEmail = `citizen_inv_${testId}@pdschain.test`;
  const adminEmail = `admin_inv_${testId}@pdschain.test`;
  const distOfficerEmail = `dist_inv_${testId}@pdschain.test`;
  const warehouseOpEmail = `wh_inv_${testId}@pdschain.test`;
  const fpsOpEmail = `fps_inv_${testId}@pdschain.test`;
  const otherWhOpEmail = `wh_other_${testId}@pdschain.test`;
  const password = 'SecurePassword2026!';

  let citizenCookies: { sessionCookie?: string; csrfToken?: string; cookieHeader: string };
  let adminCookies: { sessionCookie?: string; csrfToken?: string; cookieHeader: string };
  let distCookies: { sessionCookie?: string; csrfToken?: string; cookieHeader: string };
  let whCookies: { sessionCookie?: string; csrfToken?: string; cookieHeader: string };
  let fpsCookies: { sessionCookie?: string; csrfToken?: string; cookieHeader: string };
  let otherWhCookies: { sessionCookie?: string; csrfToken?: string; cookieHeader: string };

  const DISTRICT_CODE = 'DIST-BLR-URBAN';
  const WAREHOUSE_CODE = `WH-TEST-${testId}`;
  const FPS_CODE = `FPS-TEST-${testId}`;
  const COMMODITY_CODE = 'COMMODITY:RICE';
  const BATCH_NUMBER = `BATCH-TEST-${testId}`;

  let createdDispatchId: string;
  let createdReturnId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureNestApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    // Create isolated test warehouse and FPS
    const district = await prisma.district.findUnique({ where: { code: DISTRICT_CODE } });
    if (!district) throw new Error('District not found');

    const wh = await prisma.warehouse.create({
      data: {
        code: WAREHOUSE_CODE,
        name: `Test Warehouse ${testId}`,
        districtId: district.id,
        districtCode: district.code,
      },
    });

    await prisma.fairPriceShop.create({
      data: {
        code: FPS_CODE,
        name: `Test FPS ${testId}`,
        districtId: district.id,
        districtCode: district.code,
        warehouseId: wh.id,
        warehouseCode: wh.code,
      },
    });

    // Helper to register, activate, assign roles and log in
    async function createUser(
      email: string,
      role: CanonicalRole,
      scopes?: { district?: string; wh?: string; fps?: string },
    ) {
      await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        email,
        password,
        confirmPassword: password,
        fullName: 'Inventory Test User',
        acceptTerms: true,
      });

      const user = await prisma.user.update({
        where: { email: email.toLowerCase() },
        data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
      });

      if (role !== CanonicalRole.CITIZEN) {
        await prisma.userRoleAssignment.create({
          data: {
            userId: user.id,
            role,
            districtCode: scopes?.district ?? null,
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
    distCookies = await createUser(distOfficerEmail, CanonicalRole.DISTRICT_OFFICER, {
      district: DISTRICT_CODE,
    });
    whCookies = await createUser(warehouseOpEmail, CanonicalRole.WAREHOUSE_MANAGER, {
      wh: WAREHOUSE_CODE,
    });
    fpsCookies = await createUser(fpsOpEmail, CanonicalRole.FPS_OPERATOR, { fps: FPS_CODE });
    otherWhCookies = await createUser(otherWhOpEmail, CanonicalRole.WAREHOUSE_MANAGER, {
      wh: 'WH-KA-MYS-01',
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  // ===========================================================================
  // 1. Registry & Scope Enforcement (Districts, Warehouses, FPS, Commodities)
  // ===========================================================================
  describe('1. Registry CRUD and Scoped Authorization', () => {
    it('rejects unauthenticated requests to inventory endpoints', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/inventory/districts');
      expect(res.status).toBe(401);
    });

    it('allows authenticated citizen to view baseline districts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/districts')
        .set('Cookie', citizenCookies.cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('districts');
      expect(Array.isArray(res.body.districts)).toBe(true);
      expect(res.body.districts.some((d: { code: string }) => d.code === DISTRICT_CODE)).toBe(true);
    });

    it('rejects non-admin attempt to create a district', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/districts')
        .set('Cookie', distCookies.cookieHeader)
        .set('x-csrf-token', distCookies.csrfToken || '')
        .send({
          code: `DIST-TEST-${testId}`,
          name: 'Test District',
        });

      expect(res.status).toBe(403);
    });

    it('allows admin to create a new district', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/districts')
        .set('Cookie', adminCookies.cookieHeader)
        .set('x-csrf-token', adminCookies.csrfToken || '')
        .send({
          code: `DIST-NEW-${testId}`,
          name: 'New Test District',
          state: 'Karnataka',
        });

      expect(res.status).toBe(201);
      expect(res.body.district.code).toBe(`DIST-NEW-${testId}`);
    });

    it('allows district officer to create an FPS within their assigned district', async () => {
      const newFpsCode = `FPS-DO-NEW-${testId}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/fps')
        .set('Cookie', distCookies.cookieHeader)
        .set('x-csrf-token', distCookies.csrfToken || '')
        .send({
          code: newFpsCode,
          name: 'Test FPS Indiranagar',
          districtCode: DISTRICT_CODE,
          warehouseCode: WAREHOUSE_CODE,
          address: '42 Main Road',
        });

      expect(res.status).toBe(201);
      expect(res.body.shop.code).toBe(newFpsCode);
    });

    it('rejects district officer creating an FPS outside their assigned district', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/fps')
        .set('Cookie', distCookies.cookieHeader)
        .set('x-csrf-token', distCookies.csrfToken || '')
        .send({
          code: `FPS-CROSS-${testId}`,
          name: 'Cross District FPS',
          districtCode: 'DIST-PATNA',
        });

      expect(res.status).toBe(403);
    });
  });

  // ===========================================================================
  // 2. Inward Stock Receipts (Warehouse)
  // ===========================================================================
  describe('2. Inward Stock Receipts & Batch Creation', () => {
    it('rejects stock receipt from warehouse manager unauthorized for that warehouse', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/receipts')
        .set('Cookie', otherWhCookies.cookieHeader)
        .set('x-csrf-token', otherWhCookies.csrfToken || '')
        .send({
          warehouseCode: WAREHOUSE_CODE,
          commodityCode: COMMODITY_CODE,
          batchNumber: BATCH_NUMBER,
          quantity: 2000,
        });

      expect(res.status).toBe(403);
    });

    it('allows assigned warehouse manager to receive stock inward', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/receipts')
        .set('Cookie', whCookies.cookieHeader)
        .set('x-csrf-token', whCookies.csrfToken || '')
        .send({
          warehouseCode: WAREHOUSE_CODE,
          commodityCode: COMMODITY_CODE,
          batchNumber: BATCH_NUMBER,
          quantity: 2000,
          receiptRef: `REC-TEST-${testId}`,
        });

      expect(res.status).toBe(201);
      expect(res.body.batch.batchNumber).toBe(BATCH_NUMBER);
      expect(Number(res.body.batch.currentQuantity)).toBe(2000);
      expect(res.body.movement.movementType).toBe('RECEIPT_INWARD');
      expect(res.body.movement.direction).toBe('IN');
    });

    it('updates current batch quantity upon additional inward receipt', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/receipts')
        .set('Cookie', whCookies.cookieHeader)
        .set('x-csrf-token', whCookies.csrfToken || '')
        .send({
          warehouseCode: WAREHOUSE_CODE,
          commodityCode: COMMODITY_CODE,
          batchNumber: BATCH_NUMBER,
          quantity: 1000,
        });

      expect(res.status).toBe(201);
      expect(Number(res.body.batch.currentQuantity)).toBe(3000);
    });
  });

  // ===========================================================================
  // 3. Allocations & Dispatches (Concurrency and Balance Validation)
  // ===========================================================================
  describe('3. Stock Allocations and Concurrency-Safe Dispatches', () => {
    it('creates a stock allocation from warehouse to FPS', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/allocations')
        .set('Cookie', distCookies.cookieHeader)
        .set('x-csrf-token', distCookies.csrfToken || '')
        .send({
          sourceWarehouseCode: WAREHOUSE_CODE,
          destinationFpsCode: FPS_CODE,
          commodityCode: COMMODITY_CODE,
          allocatedQuantity: 1500,
          period: 202610,
        });

      expect(res.status).toBe(201);
      expect(res.body.allocation.sourceWarehouseCode).toBe(WAREHOUSE_CODE);
      expect(res.body.allocation.destinationFpsCode).toBe(FPS_CODE);
    });

    it('rejects allocation when warehouse stock is insufficient', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/allocations')
        .set('Cookie', distCookies.cookieHeader)
        .set('x-csrf-token', distCookies.csrfToken || '')
        .send({
          sourceWarehouseCode: WAREHOUSE_CODE,
          destinationFpsCode: FPS_CODE,
          commodityCode: COMMODITY_CODE,
          allocatedQuantity: 999999,
          period: 202610,
        });

      expect(res.status).toBe(400);
    });

    it('rejects dispatch exceeding current batch balance', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/dispatches')
        .set('Cookie', whCookies.cookieHeader)
        .set('x-csrf-token', whCookies.csrfToken || '')
        .send({
          sourceWarehouseCode: WAREHOUSE_CODE,
          destinationFpsCode: FPS_CODE,
          commodityCode: COMMODITY_CODE,
          batchNumber: BATCH_NUMBER,
          dispatchedQuantity: 50000, // Available is only 3000
        });

      expect(res.status).toBe(400);
    });

    it('successfully dispatches stock and atomically decrements warehouse batch', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/dispatches')
        .set('Cookie', whCookies.cookieHeader)
        .set('x-csrf-token', whCookies.csrfToken || '')
        .send({
          sourceWarehouseCode: WAREHOUSE_CODE,
          destinationFpsCode: FPS_CODE,
          commodityCode: COMMODITY_CODE,
          batchNumber: BATCH_NUMBER,
          dispatchedQuantity: 500,
          dispatchRef: `DSP-TEST-${testId}`,
        });

      expect(res.status).toBe(201);
      expect(res.body.dispatch.status).toBe('DISPATCHED');
      expect(Number(res.body.updatedBatch.currentQuantity)).toBe(2500);
      expect(res.body.movement.movementType).toBe('DISPATCH_OUTWARD');
      expect(res.body.movement.direction).toBe('OUT');

      createdDispatchId = res.body.dispatch.id;
    });
  });

  // ===========================================================================
  // 4. Receipt Confirmation & Discrepancy Tracking (FPS)
  // ===========================================================================
  describe('4. FPS Receipt Confirmation and Discrepancy Handling', () => {
    it('rejects confirmation by unauthorized FPS operator', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/inventory/confirmations/${createdDispatchId}`)
        .set('Cookie', whCookies.cookieHeader)
        .set('x-csrf-token', whCookies.csrfToken || '')
        .send({
          receivedQuantity: 500,
        });

      expect(res.status).toBe(403);
    });

    it('rejects receipt confirmation with mathematical mismatch', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/inventory/confirmations/${createdDispatchId}`)
        .set('Cookie', fpsCookies.cookieHeader)
        .set('x-csrf-token', fpsCookies.csrfToken || '')
        .send({
          receivedQuantity: 400, // Dispatched was 500, missing 100 without declaring shortage
          shortageQuantity: 0,
        });

      expect(res.status).toBe(400);
    });

    it('confirms receipt with recorded shortage and updates FPS inventory batch', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/inventory/confirmations/${createdDispatchId}`)
        .set('Cookie', fpsCookies.cookieHeader)
        .set('x-csrf-token', fpsCookies.csrfToken || '')
        .send({
          receivedQuantity: 490,
          shortageQuantity: 10,
          discrepancyReason: '10 KG bag damaged and lost in transit',
        });

      expect(res.status).toBe(201);
      expect(res.body.confirmation.status).toBe('DISCREPANCY_FLAGGED');
      expect(Number(res.body.fpsBatch.currentQuantity)).toBe(490);
      expect(res.body.movement.movementType).toBe('RECEIPT_CONFIRMATION');
      expect(res.body.movement.direction).toBe('IN');
    });

    it('rejects duplicate confirmation on already delivered dispatch', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/inventory/confirmations/${createdDispatchId}`)
        .set('Cookie', fpsCookies.cookieHeader)
        .set('x-csrf-token', fpsCookies.csrfToken || '')
        .send({
          receivedQuantity: 490,
          shortageQuantity: 10,
        });

      expect(res.status).toBe(400);
    });
  });

  // ===========================================================================
  // 5. Stock Returns (FPS -> Warehouse)
  // ===========================================================================
  describe('5. Stock Returns Lifecycle', () => {
    it('allows FPS operator to initiate return of damaged stock', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/returns')
        .set('Cookie', fpsCookies.cookieHeader)
        .set('x-csrf-token', fpsCookies.csrfToken || '')
        .send({
          sourceFpsCode: FPS_CODE,
          destinationWarehouseCode: WAREHOUSE_CODE,
          commodityCode: COMMODITY_CODE,
          batchNumber: BATCH_NUMBER,
          returnQuantity: 40,
          reason: 'Moisture ingress; unfit for distribution',
        });

      expect(res.status).toBe(201);
      expect(res.body.stockReturn.status).toBe('PENDING');
      expect(Number(res.body.updatedFpsBatch.currentQuantity)).toBe(450); // 490 - 40 = 450
      expect(res.body.movement.movementType).toBe('RETURN_OUTWARD');

      createdReturnId = res.body.stockReturn.id;
    });

    it('allows warehouse manager to confirm return and increment warehouse stock', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/inventory/returns/${createdReturnId}/confirm`)
        .set('Cookie', whCookies.cookieHeader)
        .set('x-csrf-token', whCookies.csrfToken || '')
        .send({
          status: 'CONFIRMED',
          remarks: 'Inspected and isolated in warehouse damaged lot',
        });

      expect(res.status).toBe(201);
      expect(res.body.stockReturn.status).toBe('CONFIRMED');
      expect(Number(res.body.whBatch.currentQuantity)).toBe(2540); // 2500 + 40 = 2540
      expect(res.body.movement.movementType).toBe('RETURN_INWARD');
    });
  });

  // ===========================================================================
  // 6. Stock Adjustments & Mathematical Reconciliation Engine
  // ===========================================================================
  describe('6. Stock Adjustments & Mathematical Reconciliation Engine', () => {
    it('creates an audited stock adjustment at warehouse', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/adjustments')
        .set('Cookie', whCookies.cookieHeader)
        .set('x-csrf-token', whCookies.csrfToken || '')
        .send({
          locationType: 'WAREHOUSE',
          locationCode: WAREHOUSE_CODE,
          commodityCode: COMMODITY_CODE,
          batchNumber: BATCH_NUMBER,
          adjustmentType: 'DECREASE',
          quantityChange: 10,
          reasonCode: 'SPILLAGE_AUDIT',
          explanation: 'Annual audit physical weigh-in spillage deduction',
        });

      expect(res.status).toBe(201);
      expect(Number(res.body.adjustment.previousBalance)).toBe(2540);
      expect(Number(res.body.adjustment.resultingBalance)).toBe(2530);
      expect(Number(res.body.batch.currentQuantity)).toBe(2530);
    });

    it('mathematically reconciles warehouse stock against the ledger with 0 drift', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/inventory/reconciliation?locationType=WAREHOUSE&locationCode=${WAREHOUSE_CODE}&commodityCode=${COMMODITY_CODE}`,
        )
        .set('Cookie', whCookies.cookieHeader);

      expect(res.status).toBe(200);
      const report = res.body.report;
      expect(report.status).toBe('RECONCILED');

      const commReport = report.commodities.find(
        (c: { commodityCode: string }) => c.commodityCode === COMMODITY_CODE,
      );
      expect(commReport).toBeDefined();
      expect(commReport.isReconciled).toBe(true);
      expect(Number(commReport.drift)).toBe(0);

      // Inbound: 2000 + 1000 + 40 = 3040
      // Outbound: 500
      // Adjustment Decrease: 10
      // Expected = 3040 - 500 - 10 = 2530
      // Actual = 2530
      expect(Number(commReport.actualBalance)).toBe(2530);
      expect(Number(commReport.expectedBalance)).toBe(2530);
    });

    it('mathematically reconciles FPS stock against the ledger with 0 drift', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/inventory/reconciliation?locationType=FPS&locationCode=${FPS_CODE}&commodityCode=${COMMODITY_CODE}`,
        )
        .set('Cookie', fpsCookies.cookieHeader);

      expect(res.status).toBe(200);
      const report = res.body.report;
      expect(report.status).toBe('RECONCILED');

      const commReport = report.commodities.find(
        (c: { commodityCode: string }) => c.commodityCode === COMMODITY_CODE,
      );
      expect(commReport).toBeDefined();
      expect(commReport.isReconciled).toBe(true);
      expect(Number(commReport.drift)).toBe(0);

      // Inbound: 490 (received)
      // Outbound: 40 (returned)
      // Expected = 490 - 40 = 450
      // Actual = 450
      expect(Number(commReport.actualBalance)).toBe(450);
      expect(Number(commReport.expectedBalance)).toBe(450);
    });

    it('fetches movement ledger with immutable audit trail', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/inventory/movements?locationType=WAREHOUSE&locationCode=${WAREHOUSE_CODE}&commodityCode=${COMMODITY_CODE}`,
        )
        .set('Cookie', whCookies.cookieHeader);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.movements)).toBe(true);
      expect(res.body.movements.length).toBeGreaterThanOrEqual(4);
    });
  });
});
