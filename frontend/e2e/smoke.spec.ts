import { test, expect } from '@playwright/test';

const PASSWORD = 'Password123!';

test.describe('Smoke Tests: Public Routes, Auth Guards & Role Logins', () => {
  test('(1) landing page at /, protected route redirects to /login', async ({ page }) => {
    // 1. Visit landing page
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Kerala’s Public Services').or(page.locator('text=Akshaya Services'))).toBeVisible();

    // 2. Try to access protected route when logged out -> should redirect to /login
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/login/);

    await page.goto('/queue');
    await expect(page).toHaveURL(/.*\/login/);

    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('(2) wrong password error, and each demo role logs in to its dashboard', async ({ page }) => {
    await page.goto('/login');
    // Helper to get visible login form
    const getLoginForm = () => page.locator('[data-testid="login-form"]:visible');

    // 1. Test wrong password error
    await getLoginForm().locator('input[type="email"]').fill('admin@akshaya.test');
    await getLoginForm().locator('input[type="password"]').fill('WrongPassword999!');
    await getLoginForm().locator('button[type="submit"]').click();

    // Error message banner should appear
    await expect(page.locator('text=Incorrect email or password').or(page.locator('text=Invalid email or password'))).toBeVisible();

    // 2. Test Role Logins
    const loginRole = async (email: string, expectedPathRegex: RegExp) => {
      await page.goto('/login');
      await getLoginForm().locator('input[type="email"]').fill(email);
      await getLoginForm().locator('input[type="password"]').fill(PASSWORD);
      await getLoginForm().locator('button[type="submit"]').click();
      await expect(page).toHaveURL(expectedPathRegex);
      // Clear token for next login
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    };

    // System Admin -> /sysadmin/dashboard
    await loginRole('admin@akshaya.test', /.*\/sysadmin\/dashboard/);

    // Centre Manager -> /admin/dashboard
    await loginRole('admin.kaloor@akshaya.test', /.*\/admin\/dashboard/);

    // Centre Employee -> /queue
    await loginRole('employee1.ernakulam@akshaya.test', /.*\/queue/);
  });
});
