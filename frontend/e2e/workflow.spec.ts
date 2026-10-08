import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';

// Use seeded users for the E2E workflow
const EMPLOYEE_EMAIL = 'employee1.ernakulam@akshaya.test'; // Approved employee from seed data
const PASSWORD = 'Password123!';

test.describe.serial('Akshaya Service Assistance Full E2E Workflow', () => {
  const newCitizenEmail = `test.citizen.${Date.now()}@akshaya.test`;
  let requestId: string;

  test.beforeAll(() => {
    // Clear employee assignments before testing to prevent hitting the 10 request limit
    const backendDir = path.resolve('../backend');
    execSync('.venv\\\\Scripts\\\\python clear_assignments.py', { cwd: backendDir, stdio: 'inherit' });
  });

  test('Full E2E Flow', async ({ browser }) => {
    test.setTimeout(120000); // Increase timeout to 2 minutes for full E2E flow

  // We need two contexts: one for citizen, one for employee (to simulate them being on different machines/sessions)
  const citizenContext = await browser.newContext();
  const employeeContext = await browser.newContext();

  const citizenPage = await citizenContext.newPage();
  const employeePage = await employeeContext.newPage();

  await test.step('1. Citizen Registration and Login', async () => {
    // Navigate to register
    await citizenPage.goto('/register');
    const registerForm = citizenPage.locator('form:visible').filter({ hasText: 'Create Account' }).first();
    await registerForm.locator('input[placeholder="John Doe"]').fill('Test Citizen');
    await registerForm.locator('input[type="email"]').fill(newCitizenEmail);
    await registerForm.locator('input[type="password"]').nth(0).fill(PASSWORD);
    await registerForm.locator('input[type="password"]').nth(1).fill(PASSWORD);

    // Submit (Create Account button)
    await registerForm.locator('button[type="submit"]').click();

    // Should redirect to login
    await expect(citizenPage).toHaveURL(/.*\/login/);

    // Login with new citizen
    const loginForm = citizenPage.locator('form:visible').filter({ hasText: 'Forgot Password?' }).first();
    await loginForm.locator('input[type="email"]').fill(newCitizenEmail);
    await loginForm.locator('input[type="password"]').fill(PASSWORD);
    await loginForm.locator('button[type="submit"]').click();

    // Should redirect to citizen dashboard
    await expect(citizenPage).toHaveURL(/.*\/dashboard/);
  });

  await test.step('2. Citizen creates a new request', async () => {
    // Go to Services
    await citizenPage.getByRole('button', { name: 'New Request' }).click();
    await expect(citizenPage).toHaveURL(/.*\/services/);

    // Select the first service
    await citizenPage.locator('main button.group').first().click();

    // Click Apply Now
    await citizenPage.click('text=Start Request');
    await expect(citizenPage).toHaveURL(/.*\/request/);

    // Complete Step 1: Requirements Acknowledge
    await citizenPage.getByRole('button', { name: 'Acknowledge & Continue' }).click();
    
    // Select the Kaloor centre so it matches employee1
    await citizenPage.waitForTimeout(1000); // Wait for centres to load
    await citizenPage.locator('label:has-text("Kaloor")').first().click();
    await citizenPage.getByRole('button', { name: 'Confirm Centre' }).click();
    
    // Wait for the next step to render
    await citizenPage.waitForTimeout(2000);
    
    // Upload dummy document if Documents step is visible
    const continueBtn = citizenPage.getByRole('button', { name: 'Continue' });
    if (await continueBtn.isVisible()) {
      let chooseBtn = citizenPage.getByRole('button', { name: '[ Choose File ]' }).first();
      let i = 0;
      while (await chooseBtn.isVisible().catch(() => false)) {
        const fileChooserPromise = citizenPage.waitForEvent('filechooser');
        await chooseBtn.click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles({
          name: `dummy_${i}.pdf`,
          mimeType: 'application/pdf',
          buffer: Buffer.from('dummy content')
        });
        // Click the specific Upload button that appears
        const uploadBtn = citizenPage.getByRole('button', { name: 'Upload' }).first();
        await uploadBtn.click();
        await expect(uploadBtn).not.toBeVisible({ timeout: 5000 }); // Wait for upload to complete
        
        chooseBtn = citizenPage.getByRole('button', { name: '[ Choose File ]' }).first();
        i++;
      }
      await citizenPage.waitForTimeout(1500); // wait for all uploads
      await continueBtn.click();
    }
    
    // Submit
    await citizenPage.getByRole('button', { name: 'Submit Request' }).click();

    // Verify success and redirect to requests list
    await citizenPage.waitForURL(/\/requests\/[0-9a-fA-F-]{36}/);
    const url = citizenPage.url();
    requestId = url.split('/').pop() || '';
    expect(requestId).toBeTruthy();
  });

  await test.step('3. Employee processes the request', async () => {
    // Login as employee in separate context
    await employeePage.goto('/login');
    const loginForm = employeePage.locator('form:visible').filter({ hasText: 'Forgot Password?' }).first();
    await loginForm.locator('input[type="email"]').fill(EMPLOYEE_EMAIL);
    await loginForm.locator('input[type="password"]').fill(PASSWORD);
    await loginForm.locator('button[type="submit"]').click();

    // Should go to employee queue
    await expect(employeePage).toHaveURL(/.*\/queue/);

    // Go directly to the request workspace
    await employeePage.goto(`/employee/requests/${requestId}`);

    // Accept the request
    await employeePage.locator('button:has-text("Accept and start review")').click();

    // Reject the first document (Needs Correction)
    await employeePage.locator('button:has-text("Request Correction")').first().click();
    await employeePage.locator('textarea').fill('Document is blurry, please re-upload.');
    await employeePage.locator('button:has-text("Submit Correction Request")').click();

    // Verify employee dashboard reflects status
    await expect(employeePage.locator('text=Correction Requested').first()).toBeVisible();
  });

  await test.step('4. Citizen re-uploads document', async () => {
    await citizenPage.goto(`/requests/${requestId}`);

    // Find the reupload section
    await expect(citizenPage.locator('text=Correction: Document is blurry, please re-upload.').first()).toBeVisible();

    const fileChooserPromise = citizenPage.waitForEvent('filechooser');
    // Click the "Replace" label
    await citizenPage.locator('label:has-text("Replace")').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'fixed_doc.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fixed content')
    });
    
    // Wait for the upload to finish (loading spinner disappears and Replace comes back or success)
    await citizenPage.waitForTimeout(1500);
    // Since there's no separate Submit button for corrections, we just proceed.
  });

  await test.step('5. Employee approves and requests payment', async () => {
    await employeePage.reload();
    
    // Approve all documents
    await employeePage.locator('button:has-text("Approve all documents")').click();
    const markReadyBtn = employeePage.locator('button:has-text("Mark ready and start processing")');
    await expect(markReadyBtn).toBeVisible({ timeout: 10000 });
    
    // Mark ready and start processing
    await markReadyBtn.click();
    // Request Payment
    // Expand the More actions section first
    await employeePage.locator('summary:has-text("More actions")').click();
    const requestFeeBtn = employeePage.locator('button:has-text("Request Fee Payment")');
    await expect(requestFeeBtn).toBeVisible({ timeout: 10000 });
    await requestFeeBtn.click();
  });

  await test.step('6. Citizen completes payment', async () => {
    await citizenPage.reload();
    
    // Confirm payment
    await citizenPage.locator('button:has-text("Confirm Mock Payment")').click();
  });

  await test.step('7. Employee completes request', async () => {
    await employeePage.reload();
    await employeePage.locator('button:has-text("Mark completed")').click();
    
    // Fill collection instructions
    await employeePage.locator('textarea').fill('Certificate is ready for download.');
    await employeePage.locator('button:has-text("Complete & Deliver Output")').click();
    
    // Assert completion
    await expect(employeePage.locator('text=COMPLETED').first()).toBeVisible();
  });
});
});
