import { expect, test } from '@playwright/test';

test.describe('PDSChain v2 Phase 4 — Districts, Warehouses, FPS & Inventory Reconciliation E2E', () => {
  const adminEmail = 'admin@pdschain.local';
  const adminPassword = 'AdminSecure2026!';
  const timestamp = Date.now();

  const testDistrictCode = `DIST-E2E-${timestamp.toString().slice(-6)}`;
  const testDistrictName = `E2E District ${timestamp.toString().slice(-4)}`;
  const testWarehouseCode = `WH-E2E-${timestamp.toString().slice(-6)}`;
  const testWarehouseName = `E2E Central Depot ${timestamp.toString().slice(-4)}`;
  const testFpsCode = `FPS-E2E-${timestamp.toString().slice(-6)}`;
  const testFpsName = `E2E Ration Center ${timestamp.toString().slice(-4)}`;
  const testBatchRef = `BATCH-E2E-${timestamp.toString().slice(-6)}`;
  const testDeliveryRef = `DN-FCI-${timestamp.toString().slice(-6)}`;

  test('executes complete Phase 4 lifecycle: facility registries, batch receipt, quota allocation, dispatch, receipt confirmation with discrepancy, stock return, and zero-drift mathematical reconciliation', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const uncaughtErrors: string[] = [];
    page.on('pageerror', (err) => {
      uncaughtErrors.push(err.message);
    });

    // -------------------------------------------------------------------------
    // 1. Admin Authentication
    // -------------------------------------------------------------------------
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Sign in to PDSChain/i })).toBeVisible();

    await page.getByLabel(/Email Address/i).fill(adminEmail);
    await page.getByLabel(/^Password$/i).fill(adminPassword);
    await page.getByRole('button', { name: /^Sign In$/i }).click();

    await expect(page).toHaveURL(/\/(admin\/staff-requests|profile)/, { timeout: 15_000 });
    await expect(page.getByText('ADMIN').first()).toBeVisible();

    // -------------------------------------------------------------------------
    // 2. Scenario 1: Districts, Warehouses, FPS & Commodities Registries
    // -------------------------------------------------------------------------
    // Step A: Register District
    await page.goto('/districts');
    await expect(page.getByRole('heading', { name: /Districts Registry/i })).toBeVisible();

    await page.getByRole('button', { name: /Add District/i }).click();
    await page.getByPlaceholder('DIST-MYS-01').fill(testDistrictCode);
    await page.getByPlaceholder('Mysore Rural').fill(testDistrictName);
    await page.getByPlaceholder('Karnataka').fill('Karnataka');
    await page.getByRole('button', { name: /Register District/i }).click();

    await expect(
      page.getByText(new RegExp(`District ${testDistrictCode} registered successfully`, 'i')),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(testDistrictName)).toBeVisible();

    // Step B: Register Warehouse
    await page.goto('/warehouses');
    await expect(page.getByRole('heading', { name: /Warehouses Registry/i })).toBeVisible();

    await page.getByRole('button', { name: /Add Warehouse/i }).click();
    await page.getByPlaceholder('WH-KA-MYS-01').fill(testWarehouseCode);
    await page.getByPlaceholder('Mysore Central Depot 01').fill(testWarehouseName);
    await page.getByLabel(/District/i).selectOption({ value: testDistrictCode });
    await page.getByPlaceholder('Industrial Area, Sector 4').fill('12 Industrial Area, Block B');
    await page.getByPlaceholder('5000').fill('5000');
    await page.getByRole('button', { name: /Register Warehouse/i }).click();

    await expect(
      page.getByText(new RegExp(`Warehouse ${testWarehouseCode} registered successfully`, 'i')),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(testWarehouseName)).toBeVisible();

    // Step C: Register Fair Price Shop (FPS)
    await page.goto('/fair-price-shops');
    await expect(
      page.getByRole('heading', { name: /Fair Price Shops \(FPS\) Registry/i }),
    ).toBeVisible();

    await page.getByRole('button', { name: /Add FPS/i }).click();
    await page.getByPlaceholder('FPS-KA-BLR-045').fill(testFpsCode);
    await page.getByPlaceholder('Fair Price Shop 45 Koramangala').fill(testFpsName);
    await page.getByLabel(/District/i).selectOption({ value: testDistrictCode });
    await page
      .getByLabel(/Designated Source Warehouse/i)
      .selectOption({ value: testWarehouseCode });
    await page
      .getByPlaceholder('Shop No. 12, Main Bazar, 5th Block')
      .fill('Station Road, Building 4');
    await page.getByRole('button', { name: /Register FPS/i }).click();

    await expect(
      page.getByText(new RegExp(`Fair Price Shop ${testFpsCode} registered successfully`, 'i')),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(testFpsName)).toBeVisible();

    // Step D: Verify Commodities Registry
    await page.goto('/commodities');
    await expect(page.getByRole('heading', { name: /Commodities Registry/i })).toBeVisible();
    await expect(page.getByText('Common Sona Masoori Rice')).toBeVisible();

    // -------------------------------------------------------------------------
    // 3. Scenario 2: Warehouse Inward Stock Receipt
    // -------------------------------------------------------------------------
    await page.goto('/inventory');
    await expect(
      page.getByRole('heading', { name: /Inventory & Logistics Operations/i }),
    ).toBeVisible();

    // Switch to Inward Receipt tab
    await page.getByRole('button', { name: /Inward Receipt/i }).click();
    await expect(page.getByRole('heading', { name: /Record Inward Stock Receipt/i })).toBeVisible();

    await page.getByPlaceholder('WH-KA-BLR-01').fill(testWarehouseCode);
    await page.getByPlaceholder('BATCH-RICE-2026-01').fill(testBatchRef);
    await page.getByPlaceholder('5000').fill('1000');
    await page.getByPlaceholder('FCI-DN-2026-9981').fill(testDeliveryRef);
    await page.getByRole('button', { name: /Receive Stock Inward/i }).click();

    await expect(
      page.getByText(
        new RegExp(`Successfully received 1000 units inward into batch ${testBatchRef}`, 'i'),
      ),
    ).toBeVisible({ timeout: 10_000 });

    // Switch to Batches & Stock tab and verify batch is listed
    await page.getByRole('button', { name: /Batches & Stock/i }).click();
    await expect(page.getByText(testBatchRef).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(testWarehouseCode).first()).toBeVisible();

    // -------------------------------------------------------------------------
    // 4. Scenario 3: Stock Allocation (District Officer / Admin)
    // -------------------------------------------------------------------------
    await page.getByRole('button', { name: /^Allocations$/i }).click();
    await expect(page.getByRole('heading', { name: /Create Stock Allocation/i })).toBeVisible();

    await page.getByPlaceholder('WH-KA-BLR-01').fill(testWarehouseCode);
    await page.getByPlaceholder('FPS-KA-BLR-042').fill(testFpsCode);
    await page.getByPlaceholder('1000').fill('400');
    await page.getByRole('button', { name: /Create Allocation/i }).click();

    await expect(
      page.getByText(/Stock quota allocation of 400 units created successfully/i),
    ).toBeVisible({ timeout: 10_000 });

    // Verify allocation record in table
    await expect(page.getByText(testWarehouseCode).first()).toBeVisible();
    await expect(page.getByText(testFpsCode).first()).toBeVisible();

    // -------------------------------------------------------------------------
    // 5. Scenario 4: Stock Dispatch (Warehouse Manager / Admin)
    // -------------------------------------------------------------------------
    await page.getByRole('button', { name: /^Dispatches$/i }).click();
    await expect(page.getByRole('heading', { name: /Dispatch Stock Consignment/i })).toBeVisible();

    await page.getByPlaceholder('WH-KA-BLR-01').fill(testWarehouseCode);
    await page.getByPlaceholder('FPS-KA-BLR-042').fill(testFpsCode);
    await page.getByPlaceholder('BATCH-RICE-2026-01').fill(testBatchRef);
    await page.getByPlaceholder('400').fill('400');
    await page.getByRole('button', { name: /Dispatch Consignment/i }).click();

    await expect(
      page.getByText(
        new RegExp(
          `Dispatched 400 units from warehouse ${testWarehouseCode} to FPS ${testFpsCode}`,
          'i',
        ),
      ),
    ).toBeVisible({ timeout: 10_000 });

    // Verify dispatch in table has status DISPATCHED
    await expect(page.getByText('DISPATCHED').first()).toBeVisible({ timeout: 10_000 });

    // -------------------------------------------------------------------------
    // 6. Scenario 5: FPS Delivery Confirmation with Discrepancy Tracking
    // -------------------------------------------------------------------------
    await page.getByRole('button', { name: /FPS Receipts/i }).click();
    await expect(
      page.getByRole('heading', { name: /Confirm Received Consignment/i }),
    ).toBeVisible();

    // Select the consignment for our testFpsCode from the dropdown
    const dispatchSelect = page.locator('select').first();
    await expect(dispatchSelect).toBeVisible();
    const targetOption = dispatchSelect.locator('option', { hasText: testFpsCode });
    const optionVal = await targetOption.getAttribute('value');
    if (optionVal) {
      await dispatchSelect.selectOption(optionVal);
    } else {
      await dispatchSelect.selectOption({ index: 1 });
    }

    // Fill Received 390, Shortage 10
    await page.getByPlaceholder('395').fill('390');
    await page.getByPlaceholder('5', { exact: true }).fill('10');
    await page.getByPlaceholder('0', { exact: true }).fill('0');
    await page
      .getByPlaceholder(/Shortage noticed on weigh-in/i)
      .fill('10 kg transit leakage noted upon weigh-in');
    await page.getByRole('button', { name: /Confirm Delivery/i }).click();

    await expect(page.getByText(/Receipt confirmation recorded successfully/i)).toBeVisible({
      timeout: 10_000,
    });

    // Verify confirmation row in table
    await expect(page.getByText(testFpsCode).first()).toBeVisible();
    await expect(page.getByText('10 kg transit leakage noted upon weigh-in').first()).toBeVisible();

    // -------------------------------------------------------------------------
    // 7. Scenario 6: Stock Return Lifecycle (FPS Operator -> Warehouse Manager)
    // -------------------------------------------------------------------------
    await page.getByRole('button', { name: /Stock Returns/i }).click();
    await expect(
      page.getByRole('heading', { name: /Initiate Stock Return to Warehouse/i }),
    ).toBeVisible();

    await page.getByPlaceholder('FPS-KA-BLR-042').fill(testFpsCode);
    await page.getByPlaceholder('WH-KA-BLR-01').fill(testWarehouseCode);
    await page.getByPlaceholder('15', { exact: true }).fill('10');
    await page
      .getByPlaceholder(/Moisture ingress, damaged grain lot/i)
      .fill('Damaged lot during transport inspection');
    await page.getByRole('button', { name: /Initiate Return/i }).click();

    await expect(page.getByText(/Initiated return of 10 units back to warehouse/i)).toBeVisible({
      timeout: 10_000,
    });

    // Confirm the return as Warehouse Manager/Admin
    await expect(page.getByRole('button', { name: /Confirm Receipt/i }).first()).toBeVisible({
      timeout: 10_000,
    });
    await page
      .getByRole('button', { name: /Confirm Receipt/i })
      .first()
      .click();

    await expect(page.getByText(/Return confirmed into warehouse inventory/i)).toBeVisible({
      timeout: 10_000,
    });

    // -------------------------------------------------------------------------
    // 8. Scenario 7: Mathematical Stock Reconciliation Engine
    // -------------------------------------------------------------------------
    await page.getByRole('button', { name: /Reconciliation Engine/i }).click();
    await expect(
      page.getByRole('heading', { name: /Mathematical Stock Reconciliation Engine/i }),
    ).toBeVisible();

    // Run reconciliation on Warehouse WH-E2E
    await page.getByPlaceholder('WH-KA-BLR-01').fill(testWarehouseCode);
    await page.getByRole('button', { name: /Run Reconciliation Probe/i }).click();

    // Verify RECONCILED status badge
    await expect(page.getByText('RECONCILED').first()).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(
        new RegExp(`Reconciliation Audit Report: WAREHOUSE \\[${testWarehouseCode}\\]`, 'i'),
      ),
    ).toBeVisible();
    await expect(page.getByText('BALANCED').first()).toBeVisible();

    // Verify mathematical equality: Inbound = +1010, Outbound = -400, Balance = 610, Drift = 0.0000
    await expect(page.getByText('+1010').first()).toBeVisible();
    await expect(page.getByText('-400').first()).toBeVisible();
    await expect(page.getByText('610').first()).toBeVisible();
    await expect(page.getByText('0.0000').first()).toBeVisible();

    // Switch to Audit Ledger tab
    await page.getByRole('button', { name: /Audit Ledger/i }).click();
    await expect(
      page.getByRole('heading', { name: /Authoritative Stock Movements Ledger/i }),
    ).toBeVisible();
    await expect(page.getByText('RECEIPT').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('DISPATCH').first()).toBeVisible();

    // Ensure zero runtime script errors throughout all journeys
    expect(uncaughtErrors).toEqual([]);
  });

  test('enforces RBAC route protections for inventory & facility management pages', async ({
    page,
  }) => {
    // Unauthenticated attempt to access /districts redirects to /login
    await page.goto('/districts');
    await expect(page).toHaveURL(/\/login/);

    // Unauthenticated attempt to access /warehouses redirects to /login
    await page.goto('/warehouses');
    await expect(page).toHaveURL(/\/login/);

    // Unauthenticated attempt to access /fair-price-shops redirects to /login
    await page.goto('/fair-price-shops');
    await expect(page).toHaveURL(/\/login/);

    // Unauthenticated attempt to access /commodities redirects to /login
    await page.goto('/commodities');
    await expect(page).toHaveURL(/\/login/);

    // Unauthenticated attempt to access /inventory redirects to /login
    await page.goto('/inventory');
    await expect(page).toHaveURL(/\/login/);
  });
});
