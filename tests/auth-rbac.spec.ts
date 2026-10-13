import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect, test } from '@playwright/test';

function getLatestDevOutboxToken(
  email: string,
  template: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET',
): string {
  const normalized = email.toLowerCase().trim();
  const safeRecipientFile = normalized.replace(/[^a-z0-9._@-]/gi, '_');
  const outboxDir = path.resolve(process.cwd(), '.dev-mailbox');
  const filePath = path.join(outboxDir, `${safeRecipientFile}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`No dev outbox mailbox found at: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const messages = JSON.parse(raw);
  const matching = messages.filter((m: { template: string }) => m.template === template);

  if (matching.length === 0) {
    throw new Error(`No outbox message matching template '${template}' found in ${filePath}`);
  }

  const latest = matching[matching.length - 1];
  return latest.token;
}

test.describe('PDSChain v2 Phase 2 — Complete Auth, User Management & RBAC Browser Journeys', () => {
  const timestamp = Date.now();
  const citizenEmail = `citizen.e2e.${timestamp}@pdschain.local`;
  const citizenName = `Sita Devi ${timestamp.toString().slice(-4)}`;
  const initialPassword = 'InitialCitizenSecure2026!';
  const updatedPassword = 'NewCitizenSecure2026!';
  const adminEmail = 'admin@pdschain.local';
  const adminPassword = 'AdminSecure2026!';

  test('executes end-to-end user journeys: registration, email verification, session lifecycle, password reset, staff request approval, RBAC enforcement, and suspension', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    // Collect page errors to enforce zero unexpected runtime exceptions
    const uncaughtErrors: string[] = [];
    page.on('pageerror', (err) => {
      uncaughtErrors.push(err.message);
    });

    // -------------------------------------------------------------------------
    // JOURNEY A: Citizen Registration & Dev-Outbox Email Verification
    // -------------------------------------------------------------------------
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /Citizen Registration/i })).toBeVisible();

    await page.getByLabel(/Full Name/i).fill(citizenName);
    await page.getByLabel(/Email Address/i).fill(citizenEmail);
    await page.getByLabel(/Password \(min 10/i).fill(initialPassword);
    await page.getByLabel(/Confirm Password/i).fill(initialPassword);
    await page.getByRole('checkbox').check();

    await page.getByRole('button', { name: /Register as Citizen/i }).click();

    // Verify confirmation panel appears
    await expect(page.getByRole('heading', { name: /Registration Submitted/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(citizenEmail)).toBeVisible();

    // Fetch verification token from dev outbox
    const verificationToken = getLatestDevOutboxToken(citizenEmail, 'EMAIL_VERIFICATION');
    expect(verificationToken).toBeTruthy();

    // Navigate to verify email page with the token
    await page.goto(`/verify-email?token=${encodeURIComponent(verificationToken)}`);
    await expect(page.getByText(/Email Verified Successfully/i)).toBeVisible({
      timeout: 10_000,
    });

    // -------------------------------------------------------------------------
    // JOURNEY B: Authentication Lifecycle (Invalid/Valid Login, Session Reload, Logout)
    // -------------------------------------------------------------------------
    await page.getByRole('button', { name: /Proceed to Sign In/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // 1. Invalid credentials rejection
    await page.getByLabel(/Email Address/i).fill(citizenEmail);
    await page.getByLabel(/^Password$/i).fill('IncorrectPassword999!');
    await page.getByRole('button', { name: /^Sign In$/i }).click();

    await expect(page.getByText(/Invalid email or password/i)).toBeVisible({ timeout: 10_000 });

    // 2. Valid credentials authentication
    await page.getByLabel(/^Password$/i).fill(initialPassword);
    await page.getByRole('button', { name: /^Sign In$/i }).click();

    // Successfully logged in and redirected to /profile
    await expect(page).toHaveURL(/\/profile/, { timeout: 10_000 });
    await expect(page.getByText(citizenName).first()).toBeVisible();
    await expect(page.getByText('CITIZEN').first()).toBeVisible();

    // 3. Session persistence across hard browser reload
    await page.reload();
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByText(citizenName).first()).toBeVisible();

    // 4. Logout
    await page.getByRole('button', { name: /Sign Out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // -------------------------------------------------------------------------
    // JOURNEY C: Password Reset Flow & Session Invalidation
    // -------------------------------------------------------------------------
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: /Reset Password/i })).toBeVisible();

    await page.getByLabel(/Account Email Address/i).fill(citizenEmail);
    await page.getByRole('button', { name: /Send Reset Link/i }).click();

    await expect(page.getByText(/Reset Instructions Dispatched/i)).toBeVisible({
      timeout: 10_000,
    });

    const resetToken = getLatestDevOutboxToken(citizenEmail, 'PASSWORD_RESET');
    expect(resetToken).toBeTruthy();

    await page.goto(`/reset-password?token=${encodeURIComponent(resetToken)}`);
    await expect(page.getByRole('heading', { name: /Set New Password/i })).toBeVisible();

    await page.getByLabel(/^New Password/i).fill(updatedPassword);
    await page.getByLabel(/Confirm New Password/i).fill(updatedPassword);
    await page.getByRole('button', { name: /Save New Password/i }).click();

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page.getByText(/Password successfully updated/i)).toBeVisible({
      timeout: 10_000,
    });

    // Verify old password no longer works
    await page.goto('/login');
    await page.getByLabel(/Email Address/i).fill(citizenEmail);
    await page.getByLabel(/^Password$/i).fill(initialPassword);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await expect(page.getByText(/Invalid email or password/i)).toBeVisible({ timeout: 10_000 });

    // Verify new password works
    await page.getByLabel(/^Password$/i).fill(updatedPassword);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await expect(page).toHaveURL(/\/profile/, { timeout: 10_000 });

    // -------------------------------------------------------------------------
    // JOURNEY D: Staff Access Request Submission & Admin Approval
    // -------------------------------------------------------------------------
    await page.goto('/staff-requests/new');
    await expect(page.getByRole('heading', { name: /Submit Staff Access Request/i })).toBeVisible();

    await page.getByLabel(/Requested Operational Role/i).selectOption('FPS_OPERATOR');
    await page.getByLabel(/District Code/i).fill('DIST-PATNA');
    await page.getByLabel(/Fair Price Shop Code/i).fill('FPS-108');
    await page
      .getByLabel(/Official Justification & Order Reference/i)
      .fill('Authorized operator for Patna Central Fair Price Shop Ward 4.');

    await page.getByRole('button', { name: /Submit Request for Administrator Review/i }).click();

    // Redirected to /profile with pending request listed
    await expect(page).toHaveURL(/\/profile/, { timeout: 10_000 });
    await expect(page.getByText('PENDING')).toBeVisible();
    await expect(page.getByText('DIST-PATNA')).toBeVisible();

    // Citizen logs out
    await page.getByRole('button', { name: /Sign Out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // Admin logs in
    await page.getByLabel(/Email Address/i).fill(adminEmail);
    await page.getByLabel(/^Password$/i).fill(adminPassword);
    await page.getByRole('button', { name: /^Sign In$/i }).click();

    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
    await page.goto('/admin/staff-requests');
    await expect(page.getByRole('heading', { name: /Staff Access Review Queue/i })).toBeVisible();

    // Find the pending request for citizenName
    await expect(page.getByText(citizenEmail)).toBeVisible();
    await page
      .getByRole('button', { name: /Approve & Assign Role/i })
      .first()
      .click();

    // Approve the request modal
    await expect(page.getByRole('heading', { name: /Approve Staff Request/i })).toBeVisible();
    await page
      .getByLabel(/Approval Audit Notes/i)
      .fill('Verified government appointment certificate.');
    await page.getByRole('button', { name: /Confirm Approval/i }).click();

    // Notification of approval appears
    await expect(page.getByText(/approved/i)).toBeVisible({
      timeout: 10_000,
    });

    // Admin logs out
    await page.getByRole('button', { name: /Sign Out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // Citizen logs back in to verify active role
    await page.getByLabel(/Email Address/i).fill(citizenEmail);
    await page.getByLabel(/^Password$/i).fill(updatedPassword);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile/, { timeout: 10_000 });

    // Citizen now has FPS_OPERATOR role active in header / profile!
    await expect(page.getByText('FPS_OPERATOR').first()).toBeVisible();

    // -------------------------------------------------------------------------
    // JOURNEY E: Privilege Escalation Rejection (RBAC Enforcement)
    // -------------------------------------------------------------------------
    // Non-admin user attempts direct navigation to administrative routes
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/unauthorized/);
    await expect(page.getByRole('heading', { name: /403 — Access Denied/i })).toBeVisible();
    await expect(page.getByText(/Role-Based Access Policy Enforced/i)).toBeVisible();

    await page.goto('/admin/audit-events');
    await expect(page).toHaveURL(/\/unauthorized/);
    await expect(page.getByRole('heading', { name: /403 — Access Denied/i })).toBeVisible();

    // Citizen logs out
    await page.getByRole('button', { name: /Sign Out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // -------------------------------------------------------------------------
    // JOURNEY F: Account Suspension & Role Revocation
    // -------------------------------------------------------------------------
    // Admin logs in
    await page.getByLabel(/Email Address/i).fill(adminEmail);
    await page.getByLabel(/^Password$/i).fill(adminPassword);
    await page.getByRole('button', { name: /^Sign In$/i }).click();

    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: /User & Access Management/i })).toBeVisible();

    // Search for citizen
    await page.getByPlaceholder(/Search by email or name/i).fill(citizenEmail);
    await page.getByRole('button', { name: /Search users/i }).click();

    // Click on the user item in the list
    await page.getByText(citizenEmail).first().click();

    // User details panel loads
    await expect(page.getByRole('heading', { name: citizenName })).toBeVisible();

    // Revoke the FPS_OPERATOR role assignment
    await page.getByRole('button', { name: /^Revoke$/i }).click();
    await expect(page.getByRole('heading', { name: /Revoke Role Assignment/i })).toBeVisible();
    await page.getByLabel(/Revocation Reason/i).fill('Annual rotation and dealer audit completed.');
    await page.getByRole('button', { name: /Confirm Revocation/i }).click();

    await expect(page.getByText(/has been revoked/i)).toBeVisible({
      timeout: 10_000,
    });

    // Suspend the user account
    await page.getByRole('button', { name: /Suspend Account/i }).click();
    await expect(page.getByRole('heading', { name: /Suspend User Account/i })).toBeVisible();
    await page
      .getByLabel(/Suspension Reason/i)
      .fill('Account suspended pending identity re-verification.');
    await page.getByRole('button', { name: /Confirm Suspension/i }).click();

    await expect(page.getByText(/has been suspended/i)).toBeVisible({
      timeout: 10_000,
    });

    // Admin logs out
    await page.getByRole('button', { name: /Sign Out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // Suspended user attempts to log in
    await page.getByLabel(/Email Address/i).fill(citizenEmail);
    await page.getByLabel(/^Password$/i).fill(updatedPassword);
    await page.getByRole('button', { name: /^Sign In$/i }).click();

    // Login is rejected with account suspended message
    await expect(page.getByText(/suspended/i)).toBeVisible({ timeout: 10_000 });

    // Assert that no unhandled JavaScript runtime exceptions occurred
    expect(uncaughtErrors).toEqual([]);
  });
});
