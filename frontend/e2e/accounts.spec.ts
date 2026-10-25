import { test, expect } from '@playwright/test';

const PASSWORD = 'Password123!';

test.describe.serial('Account Registration, Approvals & Dual-Manager Conflict', () => {
  const timestamp = Date.now();
  const citizenEmail = `e2e.citizen.${timestamp}@akshaya.test`;
  const staffEmail = `e2e.staff.${timestamp}@akshaya.test`;
  const managerEmail = `e2e.mgr.${timestamp}@akshaya.test`;

  test('(3) citizen registration and login', async ({ page }) => {
    await page.goto('/register');

    const form = page.locator('[data-testid="register-form"]:visible');
    await form.locator('input[placeholder="John Doe"]').fill('Test Citizen');
    await form.locator('input[type="email"]').fill(citizenEmail);
    await form.locator('input[type="password"]').nth(0).fill(PASSWORD);
    await form.locator('input[type="password"]').nth(1).fill(PASSWORD);
    await form.locator('button[type="submit"]').click();

    // After registration, redirected to /login
    await expect(page).toHaveURL(/.*\/login/);

    // Login with new citizen
    const loginForm = page.locator('[data-testid="login-form"]:visible');
    await loginForm.locator('input[type="email"]').fill(citizenEmail);
    await loginForm.locator('input[type="password"]').fill(PASSWORD);
    await loginForm.locator('button[type="submit"]').click();

    // Redirection to citizen home/dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('(4) staff signup goes to pending, a manager or system admin approves, then staff can log in', async ({ page }) => {
    // 1. Staff sign up
    await page.goto('/register');
    // Select "Centre Staff" tab
    await page.locator('button:has-text("Centre Staff"):visible').click();

    const form = page.locator('[data-testid="register-form"]:visible');
    await form.locator('input[placeholder="John Doe"]').fill('E2E Staff Member');
    await form.locator('input[type="email"]').fill(staffEmail);
    // Select first available Akshaya Centre
    const selectElem = form.locator('select');
    await selectElem.waitFor({ state: 'visible' });
    await selectElem.selectOption({ index: 1 });

    await form.locator('input[type="password"]').nth(0).fill(PASSWORD);
    await form.locator('input[type="password"]').nth(1).fill(PASSWORD);
    await form.locator('button[type="submit"]').click();

    // Redirected to login with notice
    await expect(page).toHaveURL(/.*\/login/);

    // 2. Staff tries to log in immediately -> should be blocked because status is pending
    const loginForm = page.locator('[data-testid="login-form"]:visible');
    await loginForm.locator('input[type="email"]').fill(staffEmail);
    await loginForm.locator('input[type="password"]').fill(PASSWORD);
    await loginForm.locator('button[type="submit"]').click();
    await expect(page.locator('text=Your account is awaiting approval')).toBeVisible();

    // 3. System Admin logs in and approves staff
    await page.goto('/login');
    await loginForm.locator('input[type="email"]').fill('admin@akshaya.test');
    await loginForm.locator('input[type="password"]').fill(PASSWORD);
    await loginForm.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*\/sysadmin\/dashboard/);

    // Look for row with staff email in AccountRequestsSection and click Approve
    const staffRow = page.locator(`tr:has-text("${staffEmail}")`);
    await expect(staffRow).toBeVisible();
    await staffRow.locator('button:has-text("Approve")').click();
    await expect(staffRow).not.toBeVisible();

    // Log out admin
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // 4. Staff logs in successfully
    await page.goto('/login');
    await loginForm.locator('input[type="email"]').fill(staffEmail);
    await loginForm.locator('input[type="password"]').fill(PASSWORD);
    await loginForm.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*\/queue/);
  });

  test('(5) manager signup is approved only by the System Admin, and a second manager request for the same centre is blocked or flagged', async ({ page }) => {
    // 1. Manager sign up for an Akshaya Centre that doesn't have an approved manager
    await page.goto('/register');
    await page.locator('button:has-text("Centre Manager"):visible').click();

    const form = page.locator('[data-testid="register-form"]:visible');
    await form.locator('input[placeholder="John Doe"]').fill('E2E New Manager');
    await form.locator('input[type="email"]').fill(managerEmail);
    const selectElem = form.locator('select');
    await selectElem.waitFor({ state: 'visible' });

    // Select Kozhikode (Mavoor Road) centre which has no manager assigned
    await selectElem.selectOption({ label: 'Akshaya Centre Kozhikode (Mavoor Road) (Kozhikode)' });

    await form.locator('input[type="password"]').nth(0).fill(PASSWORD);
    await form.locator('input[type="password"]').nth(1).fill(PASSWORD);
    await form.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*\/login/);

    // 2. Second manager request for the Kaloor centre (AKC_EKM_01 which already has admin.kaloor@akshaya.test)
    await page.goto('/register');
    await page.locator('button:has-text("Centre Manager"):visible').click();
    const form2 = page.locator('[data-testid="register-form"]:visible');
    await form2.locator('input[placeholder="John Doe"]').fill('Conflict Manager');
    await form2.locator('input[type="email"]').fill(`conflict.mgr.${timestamp}@akshaya.test`);
    // Select Kaloor centre explicitly by label
    const selectElem2 = form2.locator('select');
    await selectElem2.waitFor({ state: 'visible' });
    await selectElem2.selectOption({ label: 'Akshaya Centre Kochi (Kaloor) (Ernakulam)' });
    await form2.locator('input[type="password"]').nth(0).fill(PASSWORD);
    await form2.locator('input[type="password"]').nth(1).fill(PASSWORD);
    await form2.locator('button[type="submit"]').click();

    // Verify error: centre already has active or pending manager
    await expect(page.locator('text=already has an active manager or a pending manager request')).toBeVisible();

    // 3. Verify Manager signup is visible to and approved by System Admin ONLY
    await page.goto('/login');
    const loginForm = page.locator('[data-testid="login-form"]:visible');
    await loginForm.locator('input[type="email"]').fill('admin@akshaya.test');
    await loginForm.locator('input[type="password"]').fill(PASSWORD);
    await loginForm.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*\/sysadmin\/dashboard/);

    // Verify manager request is in table
    const mgrRow = page.locator(`tr:has-text("${managerEmail}")`);
    await expect(mgrRow).toBeVisible();
    await expect(mgrRow.locator('text=Centre Manager')).toBeVisible();
    await mgrRow.locator('button:has-text("Approve")').click();
    await expect(mgrRow).not.toBeVisible();
  });
});
