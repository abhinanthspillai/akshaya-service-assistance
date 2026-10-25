import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const PASSWORD = 'Password123!';

test.describe('Paid Service Citizen Request Flow', () => {
  const timestamp = Date.now();
  const citizenEmail = `e2e.flow.cit.${timestamp}@akshaya.test`;
  let createdRequestId: string = '';

  test('(6) citizen selects service, centre, chooses ALL documents, uses single "Upload and continue" button, reviews and submits without error banner', async ({ page, context }) => {
    // Grant geolocation permission so centre distance lookup can proceed smoothly
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 9.996, longitude: 76.295 });

    // 1. Citizen registers and logs in
    await page.goto('/register');
    const regForm = page.locator('[data-testid="register-form"]:visible');
    await regForm.locator('input[placeholder="John Doe"]').fill('Income Applicant');
    await regForm.locator('input[type="email"]').fill(citizenEmail);
    await regForm.locator('input[type="password"]').nth(0).fill(PASSWORD);
    await regForm.locator('input[type="password"]').nth(1).fill(PASSWORD);
    await regForm.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*\/login/);

    const loginForm = page.locator('[data-testid="login-form"]:visible');
    await loginForm.locator('input[type="email"]').fill(citizenEmail);
    await loginForm.locator('input[type="password"]').fill(PASSWORD);
    await loginForm.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*\/dashboard/);

    // 2. Navigate to Services Catalogue and find Income Certificate
    await page.goto('/services');
    await expect(page.locator('h1:has-text("Services")')).toBeVisible();

    const serviceCard = page.locator('div:has-text("Income Certificate")').first();
    await expect(serviceCard).toBeVisible();
    await serviceCard.click();

    // On Service Detail page, click Start Request
    const startReqBtn = page.locator('button:has-text("Start Request")');
    await expect(startReqBtn).toBeVisible();
    await startReqBtn.click();

    // Step 1: Requirements review -> Continue
    const continueBtn = page.locator('button:has-text("Acknowledge & Continue")');
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();

    // Step 2: Centre selection -> choose Kaloor centre
    await expect(page.locator('text=Select Akshaya Centre')).toBeVisible();
    const kaloorCentre = page.locator('h3:has-text("Akshaya Centre Kochi (Kaloor)")');
    await expect(kaloorCentre).toBeVisible();
    await kaloorCentre.click();

    const continueDocsBtn = page.locator('button:has-text("Confirm Centre")');
    await expect(continueDocsBtn).toBeEnabled();
    await continueDocsBtn.click();

    // Step 3: Document uploads
    await expect(page.locator('h2:has-text("Upload Documents")')).toBeVisible();

    // ASSERTION: Verify that NO individual per-document "Upload" buttons exist!
    // Every file input should only stage the file. There should not be multiple Upload buttons.
    const individualUploadBtns = page.locator('button:has-text("Upload"):not(:has-text("Upload and continue"))');
    await expect(individualUploadBtns).toHaveCount(0);

    const uploadAndContinueBtn = page.locator('button:has-text("Upload and continue")');
    await expect(uploadAndContinueBtn).toBeVisible();
    // The button must stay disabled until every document is chosen
    await expect(uploadAndContinueBtn).toBeDisabled();
    await expect(page.locator('text=Select all documents to continue')).toBeVisible();

    // Prepare a mock dummy file to upload
    const dummyFilePath = path.join(process.cwd(), 'e2e-dummy.pdf');
    fs.writeFileSync(dummyFilePath, '%PDF-1.4 dummy test document content');

    try {
      // Find all file inputs on the documents step
      const fileInputs = page.locator('input[type="file"]');
      const count = await fileInputs.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        await fileInputs.nth(i).setInputFiles(dummyFilePath);
      }

      // Now all documents are staged; button should be enabled
      await expect(uploadAndContinueBtn).toBeEnabled();
      await uploadAndContinueBtn.click();

      // Step 4: Review and Submit
      await expect(page.locator('h2:has-text("Review & Submit")')).toBeVisible();
      const submitBtn = page.locator('button:has-text("Submit Request")');
      await expect(submitBtn).toBeVisible();
      await submitBtn.click();

      // Verify redirection to /requests/{id}
      await expect(page).toHaveURL(/.*\/requests\/[a-f0-9-]+/);

      // Verify that NO "Failed to load request details" banner appears!
      await expect(page.locator('text=Failed to load request details')).not.toBeVisible();

      // Verify request status badge shows submitted or waiting for centre
      await expect(page.locator('text=Waiting for Akshaya Centre')).toBeVisible();

      // Extract request id from URL for subsequent workflow steps
      const currentUrl = page.url();
      const matches = currentUrl.match(/requests\/([a-f0-9-]+)/);
      expect(matches).not.toBeNull();
      createdRequestId = matches![1];
    } finally {
      if (fs.existsSync(dummyFilePath)) {
        fs.unlinkSync(dummyFilePath);
      }
    }
  });

  test('(7) staff of the same centre sees the request, staff of another centre does not', async ({ page }) => {
    // 1. Log in as TVM Staff (employee1.tvm@akshaya.test) -> should NOT see the Kaloor request
    await page.goto('/login');
    const loginForm = page.locator('[data-testid="login-form"]:visible');
    await loginForm.locator('input[type="email"]').fill('employee1.tvm@akshaya.test');
    await loginForm.locator('input[type="password"]').fill(PASSWORD);
    await loginForm.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*\/queue/);

    await page.goto('/employee/requests');
    // Assert TVM employee does NOT see the request
    const shortId = createdRequestId.slice(0, 8).toUpperCase();
    await expect(page.locator(`text=${shortId}`)).not.toBeVisible();

    // Log out TVM staff
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // 2. Log in as Kaloor Staff (employee1.ernakulam@akshaya.test) -> SHOULD see the request
    await page.goto('/login');
    const loginForm2 = page.locator('[data-testid="login-form"]:visible');
    await loginForm2.locator('input[type="email"]').fill('employee1.ernakulam@akshaya.test');
    await loginForm2.locator('input[type="password"]').fill(PASSWORD);
    await loginForm2.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*\/queue/);

    await page.goto('/employee/requests');
    // Kaloor employee sees the request in the requests list
    const requestRow = page.locator(`tr:has-text("${shortId}")`);
    await expect(requestRow).toBeVisible();
  });

  test('(8) "Accept and start review" works, and chat is unavailable before accepting and available after', async ({ page }) => {
    // 1. First verify Citizen side: Chat should NOT be enabled when WAITING_FOR_CENTRE
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    const loginForm = page.locator('[data-testid="login-form"]:visible');
    await loginForm.locator('input[type="email"]').fill(citizenEmail);
    await loginForm.locator('input[type="password"]').fill(PASSWORD);
    await loginForm.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*\/dashboard/);

    await page.goto(`/requests/${createdRequestId}`);

    // Chat unavailable notice on citizen request detail page
    await expect(page.locator('text=Chat will be available once a staff member accepts your request')).toBeVisible();

    // 2. Switch to Kaloor staff to accept the request
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    const staffLogin = page.locator('[data-testid="login-form"]:visible');
    await staffLogin.locator('input[type="email"]').fill('employee1.ernakulam@akshaya.test');
    await staffLogin.locator('input[type="password"]').fill(PASSWORD);
    await staffLogin.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*\/queue/);

    // Open workspace
    await page.goto(`/employee/requests/${createdRequestId}`);

    // Click "Accept and start review"
    const acceptBtn = page.locator('button:has-text("Accept and start review")');
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();

    // Status transitions to UNDER_REVIEW
    await expect(page.getByText('Under Review', { exact: true })).toBeVisible();
    await expect(page.locator('button:has-text("Message Citizen")')).toBeVisible();

    // 3. Switch back to citizen to verify Chat is now available
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    const citLogin = page.locator('[data-testid="login-form"]:visible');
    await citLogin.locator('input[type="email"]').fill(citizenEmail);
    await citLogin.locator('input[type="password"]').fill(PASSWORD);
    await citLogin.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*\/dashboard/);

    await page.goto(`/requests/${createdRequestId}`);

    // Notice is gone, Message input is visible
    await expect(page.locator('text=Chat will be available once a staff member accepts your request')).not.toBeVisible();
    await expect(page.locator('input[placeholder="Write a request message"]')).toBeVisible();
  });

  test('(9) staff reject one document, the citizen re-uploads it, staff approve all documents', async ({ page }) => {
    // 1. Staff requests correction on first document
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    const staffLogin = page.locator('[data-testid="login-form"]:visible');
    await staffLogin.locator('input[type="email"]').fill('employee1.ernakulam@akshaya.test');
    await staffLogin.locator('input[type="password"]').fill(PASSWORD);
    await staffLogin.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*\/queue/);

    await page.goto(`/employee/requests/${createdRequestId}`);
    await expect(page.locator('button:has-text("Back to Request Queue")')).toBeVisible();

    // Click "Request Correction" on first document
    const correctBtn = page.locator('button:has-text("Request Correction")').first();
    await expect(correctBtn).toBeVisible();
    await correctBtn.click();

    // Modal appears -> choose template or fill reason
    await page.locator('button:has-text("Document image is blurry / illegible.")').click();
    await page.locator('button:has-text("Submit Correction Request")').click();

    // Status is now CORRECTION_REQUIRED
    await expect(page.getByText('Correction Required', { exact: true })).toBeVisible();

    // 2. Citizen re-uploads the requested document
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    const citLogin = page.locator('[data-testid="login-form"]:visible');
    await citLogin.locator('input[type="email"]').fill(citizenEmail);
    await citLogin.locator('input[type="password"]').fill(PASSWORD);
    await citLogin.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*\/dashboard/);

    await page.goto(`/requests/${createdRequestId}`);

    await expect(page.locator('text=Correction: Document image is blurry / illegible.')).toBeVisible();

    const dummyFilePath = path.join(process.cwd(), 'e2e-replacement.pdf');
    fs.writeFileSync(dummyFilePath, '%PDF-1.4 fixed replacement document');

    try {
      // Find the card with the correction message and upload replacement file
      const correctionMsg = page.locator('text=Correction: Document image is blurry / illegible.');
      await expect(correctionMsg).toBeVisible();

      // The 3rd document (Voter ID) was the one with the correction request
      // Let's locate its input[type="file"]
      const replaceInputs = page.locator('input[type="file"]');
      const replaceInput = replaceInputs.nth(2);
      
      const uploadPromise = page.waitForResponse((r) => r.url().includes('/documents') && r.request().method() === 'POST');
      await replaceInput.setInputFiles(dummyFilePath);
      const uploadResp = await uploadPromise;
      expect(uploadResp.status()).toBe(201);

      // Wait for uploaded v2 badge
      await expect(page.locator('text=v2')).toBeVisible();
    } finally {
      if (fs.existsSync(dummyFilePath)) {
        fs.unlinkSync(dummyFilePath);
      }
    }

    // 3. Staff returns and approves all documents
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    const staffLogin2 = page.locator('[data-testid="login-form"]:visible');
    await staffLogin2.locator('input[type="email"]').fill('employee1.ernakulam@akshaya.test');
    await staffLogin2.locator('input[type="password"]').fill(PASSWORD);
    await staffLogin2.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*\/queue/);

    await page.goto(`/employee/requests/${createdRequestId}`);
    await expect(page.locator('button:has-text("Back to Request Queue")')).toBeVisible();

    // The request transitioned automatically to UNDER_REVIEW on re-upload
    // Click "Approve all documents" button
    const approveAllBtn = page.locator('button:has-text("Approve all documents")');
    await expect(approveAllBtn).toBeVisible({ timeout: 10000 });
    await approveAllBtn.click();

    // Verify all documents are marked Approved
    await expect(page.locator('text=All documents approved.')).toBeVisible();
  });
});
