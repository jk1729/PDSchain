import { expect, test } from '@playwright/test';

test.describe('PDSChain v2 Phase 3 — Smart Contract & Distribution E2E Journeys', () => {
  const adminEmail = 'admin@pdschain.local';
  const adminPassword = 'AdminSecure2026!';
  const timestamp = Date.now();
  const testBeneficiaryRef = `BENEFICIARY:RC-E2E-${timestamp}`;
  const testBatchRef = `BATCH-E2E-${timestamp}`;
  const testTransferRef = `TR-E2E-${timestamp}`;

  test('executes complete on-chain lifecycle: beneficiary enrollment, quota allocation, warehouse inward receipt, dispatch to FPS, ration disbursement, and ledger audit', async ({
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
    // 2. Beneficiary Enrollment & Entitlement Quota
    // -------------------------------------------------------------------------
    await page.goto('/beneficiary-entitlements');
    await expect(
      page.getByRole('heading', { name: /Beneficiary Entitlements & Public Quota Portal/i }),
    ).toBeVisible();

    // Step A: Register New Beneficiary Reference
    await page.getByRole('button', { name: /Enroll Beneficiary/i }).click();
    await expect(
      page.getByRole('heading', { name: /Enroll Beneficiary on Blockchain Ledger/i }),
    ).toBeVisible();

    const registerModal = page.locator('.fixed');
    await registerModal
      .getByPlaceholder(/e\.g\. BENEFICIARY:RC-2026-0001/i)
      .fill(testBeneficiaryRef);
    await registerModal.getByRole('button', { name: /Register Beneficiary/i }).click();

    // Confirm success message
    await expect(
      page.getByText(new RegExp(`Successfully registered beneficiary ${testBeneficiaryRef}`, 'i')),
    ).toBeVisible({ timeout: 15_000 });

    // Step B: Allocate Monthly Entitlement Quota
    await page.getByRole('button', { name: /Set \/ Adjust Entitlement/i }).click();
    await expect(
      page.getByRole('heading', { name: /Configure Monthly Entitlement Quota/i }),
    ).toBeVisible();

    const configModal = page.locator('.fixed');
    await configModal.getByPlaceholder('e.g. 35').fill('40');
    await configModal.getByRole('button', { name: /Save Entitlement/i }).click();

    await expect(
      page.getByText(/Monthly entitlement successfully configured on-chain/i),
    ).toBeVisible({ timeout: 15_000 });

    // -------------------------------------------------------------------------
    // 3. Warehouse Inward Stock Receipt & Custody Transfer to FPS
    // -------------------------------------------------------------------------
    await page.goto('/warehouse-inventory');
    await expect(
      page.getByRole('heading', { name: /Warehouse Inventory & Custody Transfers/i }),
    ).toBeVisible();

    // Record Incoming Stock Batch
    await page.getByPlaceholder('e.g. 5000').fill('500');
    await page.getByPlaceholder('e.g. BATCH-2026-FCI-001').fill(testBatchRef);
    await page.getByRole('button', { name: /Commit Inward Stock to Ledger/i }).click();

    await expect(page.getByText(/Successfully received 500 kg into warehouse/i)).toBeVisible({
      timeout: 15_000,
    });

    // Dispatch / Transfer Stock to Fair Price Shop
    await page.getByPlaceholder('e.g. 1500').fill('150');
    await page.getByPlaceholder('e.g. DISPATCH-2026-KA-001').fill(testTransferRef);
    await page.getByRole('button', { name: /Transfer Custody to Shop/i }).click();

    await expect(page.getByText(/Successfully dispatched 150 to FPS FPS-KA-BLR-042/i)).toBeVisible({
      timeout: 15_000,
    });

    // -------------------------------------------------------------------------
    // 4. Fair Price Shop — Ration Disbursement to Beneficiary
    // -------------------------------------------------------------------------
    await page.goto('/fps-distribution');
    await expect(
      page.getByRole('heading', { name: /Fair Price Shop — Ration Disbursement/i }),
    ).toBeVisible();

    // Wait for commodity cards to render
    await expect(page.getByText('Fortified Rice Grade A')).toBeVisible({ timeout: 10_000 });

    // Look up and verify enrolled beneficiary
    await page
      .getByPlaceholder(/Enter Non-Sensitive Beneficiary Reference/i)
      .fill(testBeneficiaryRef);
    await page.getByRole('button', { name: /Verify Beneficiary & Quota/i }).click();

    // Verify Active status and remaining quota of 40 kg
    await expect(page.getByText(testBeneficiaryRef)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Step 2: Dispense Ration Quota to Beneficiary')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/40\s*kg/i).first()).toBeVisible();

    // Dispense 15 kg ration quota
    await page.getByPlaceholder('e.g. 20').fill('15');
    await page.getByRole('button', { name: /Record On-Chain Ration Disbursement/i }).click();

    // Verify success banner and mined on-chain transaction hash
    await expect(page.getByText(new RegExp(`Successfully distributed 15 kg`, 'i'))).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Mined On-Chain Tx Hash:/i)).toBeVisible();

    // Verify remaining quota decremented to 25 kg
    await expect(page.getByText(/25\s*kg/i).first()).toBeVisible({ timeout: 10_000 });

    // -------------------------------------------------------------------------
    // 5. On-Chain Ledger Audit Page
    // -------------------------------------------------------------------------
    await page.goto('/distribution-ledger');
    await expect(
      page.getByRole('heading', { name: /On-Chain Custody & Distribution Ledger/i }),
    ).toBeVisible();

    // Verify ledger contains confirmed transactions
    await expect(page.getByText('RATION_DISTRIBUTED').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('15 kg').first()).toBeVisible();
    await expect(page.getByText(testBeneficiaryRef).first()).toBeVisible();

    // Ensure zero runtime script errors
    expect(uncaughtErrors).toEqual([]);
  });

  test('enforces RBAC route protections for distribution screens', async ({ page }) => {
    // Unauthenticated attempt to access /warehouse-inventory redirects to /login
    await page.goto('/warehouse-inventory');
    await expect(page).toHaveURL(/\/login/);

    // Unauthenticated attempt to access /fps-distribution redirects to /login
    await page.goto('/fps-distribution');
    await expect(page).toHaveURL(/\/login/);
  });
});
