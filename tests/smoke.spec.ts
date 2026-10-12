import { expect, test } from '@playwright/test';

test.describe('PDSChain v2 Phase 1 — Browser & End-to-End Smoke Suite', () => {
  test('loads welcome screen, verifies real backend health, tests status console, and handles 404 routes without console/request errors', async ({
    page,
  }) => {
    const uncaughtPageErrors: string[] = [];
    const consoleErrors: string[] = [];
    const failedAppRequests: string[] = [];

    page.on('pageerror', (err) => {
      uncaughtPageErrors.push(err.message);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('requestfailed', (request) => {
      failedAppRequests.push(
        `${request.method()} ${request.url()} -> ${request.failure()?.errorText ?? 'failed'}`,
      );
    });

    // 1 & 2. Open frontend and confirm welcome page loads
    await page.goto('/');

    // 3. Check expected page heading and core UI elements
    await expect(
      page.getByRole('heading', {
        name: /PDSChain v2 — Traceable Public Distribution System Platform/i,
      }),
    ).toBeVisible();

    await expect(page.getByText('Core Platform Architecture Pillars')).toBeVisible();
    await expect(page.getByText('Strict 7-Phase Engineering Roadmap')).toBeVisible();

    // Verify real backend health snapshot on the welcome page
    await expect(page.getByTestId('welcome-health-summary')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('All Foundation Services Ready')).toBeVisible();
    await expect(page.getByText(/PostgreSQL connection verified via SELECT 1/i)).toBeVisible();

    // 4 & 5. Navigate to Service Status page and confirm real backend & PostgreSQL readiness results
    await page.getByRole('link', { name: /Service Status/i }).click();
    await expect(page).toHaveURL(/\/status$/);
    await expect(
      page.getByRole('heading', { name: /Service Status & Readiness Diagnostics/i }),
    ).toBeVisible();

    await expect(page.getByTestId('service-status-grid')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('api-status-badge')).toHaveText('Operational');
    await expect(page.getByTestId('db-status-badge')).toHaveText('Ready (Connected)');

    // Submit the interactive DTO diagnostic ping form and verify backend acknowledgment
    await page.getByRole('button', { name: /Send Diagnostic Ping/i }).click();
    await expect(page.getByTestId('ping-ack-panel')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Backend Acknowledged Diagnostic Ping')).toBeVisible();

    // 7. Verify that the not-found route behaves correctly
    await page.goto('/non-existent-phase1-route');
    await expect(
      page.getByRole('heading', { name: /Requested Page Does Not Exist/i }),
    ).toBeVisible();
    await page.getByRole('link', { name: /Return to Platform Overview/i }).click();
    await expect(page).toHaveURL(/\/$/);

    // 6. Assert zero uncaught page errors, console errors, or failed application requests
    expect(uncaughtPageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(failedAppRequests).toEqual([]);
  });

  test('distinguishes unavailable backend/database readiness from healthy state in the browser UI', async ({
    page,
  }) => {
    await page.route('**/api/v1/health/ready', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        headers: { 'x-correlation-id': 'e2e-simulated-db-outage' },
        body: JSON.stringify({
          status: 'error',
          error: {
            code: 'DEPENDENCY_UNAVAILABLE',
            statusCode: 503,
            message: 'Application dependencies are not ready: PostgreSQL connectivity check failed',
            path: '/api/v1/health/ready',
            timestamp: new Date().toISOString(),
            correlationId: 'e2e-simulated-db-outage',
          },
        }),
      });
    });

    await page.goto('/status');
    await expect(page.getByTestId('error-display')).toBeVisible();
    await expect(page.getByText('DEPENDENCY_UNAVAILABLE')).toBeVisible();
    await expect(
      page.getByText(
        /Application dependencies are not ready: PostgreSQL connectivity check failed/i,
      ),
    ).toBeVisible();
  });
});
