import { test, expect } from '@playwright/test';
import {
  API_BASE,
  PASSWORD,
  computeRazorpaySignature,
  getAuthHeaders,
  getBearerToken,
} from './test-helpers';

test.describe('Paid Service Payment Workflow', () => {
  let createdRequestId: string;
  let citizenToken: string;
  let staffToken: string;
  let paymentId: string;
  const citizenEmail = `e2e.pay.${Date.now()}@akshaya.test`;

  test.beforeAll(async ({ request }) => {
    // 1. Register citizen
    const regRes = await request.post(`${API_BASE}/auth/register`, {
      data: {
        email: citizenEmail,
        password: PASSWORD,
        full_name: 'Payment Test Citizen',
        phone: '9876543219',
        address_line1: 'MG Road',
        city: 'Kochi',
        district: 'Ernakulam',
        pincode: '682001',
      },
    });
    expect(regRes.ok()).toBeTruthy();

    citizenToken = await getBearerToken(citizenEmail, PASSWORD);
    staffToken = await getBearerToken('employee1.ernakulam@akshaya.test', PASSWORD);

    // 2. Look up paid service and Kaloor centre
    const servicesRes = await request.get(`${API_BASE}/services/`, {
      headers: getAuthHeaders(citizenToken),
    });
    const services = await servicesRes.json();
    const incomeServiceSummary = services.find((s: { code: string }) => s.code === 'INC_CERT');

    const serviceDetailRes = await request.get(`${API_BASE}/services/${incomeServiceSummary.id}`, {
      headers: getAuthHeaders(citizenToken),
    });
    const incomeService = await serviceDetailRes.json();

    const centresRes = await request.get(`${API_BASE}/centres/?active=true`, {
      headers: getAuthHeaders(citizenToken),
    });
    const centres = await centresRes.json();
    const kaloorCentre = centres.find((c: { name: string }) => c.name.includes('Kaloor'));

    // 3. Create draft request
    const reqRes = await request.post(`${API_BASE}/requests/`, {
      headers: getAuthHeaders(citizenToken),
      data: { service_id: incomeService.id },
    });
    const reqData = await reqRes.json();
    createdRequestId = reqData.id;

    // 4. Select centre
    await request.post(`${API_BASE}/requests/${createdRequestId}/select-centre`, {
      headers: getAuthHeaders(citizenToken),
      data: { centre_id: kaloorCentre.id },
    });

    // 5. Upload required documents
    for (const docReq of incomeService.document_requirements) {
      await request.post(`${API_BASE}/requests/${createdRequestId}/documents`, {
        headers: getAuthHeaders(citizenToken),
        multipart: {
          requirement_id: docReq.id,
          file: {
            name: `${docReq.name.replace(/\s+/g, '_')}.pdf`,
            mimeType: 'application/pdf',
            buffer: Buffer.from('%PDF-1.4 payment test doc'),
          },
        },
      });
    }

    // 6. Submit request
    await request.post(`${API_BASE}/requests/${createdRequestId}/submit`, {
      headers: getAuthHeaders(citizenToken),
    });

    // 7. Staff accepts request
    await request.post(`${API_BASE}/requests/${createdRequestId}/accept-and-start-review`, {
      headers: getAuthHeaders(staffToken),
    });

    // 8. Staff approves all documents
    await request.post(`${API_BASE}/requests/${createdRequestId}/documents/approve-all`, {
      headers: getAuthHeaders(staffToken),
    });
  });

  test('(10) on a paid service staff see "Request payment" and do NOT see "Mark ready and start processing"', async ({
    page,
  }) => {
    await page.goto('/login');
    const staffLogin = page.locator('[data-testid="login-form"]:visible');
    await staffLogin.locator('input[type="email"]').fill('employee1.ernakulam@akshaya.test');
    await staffLogin.locator('input[type="password"]').fill(PASSWORD);
    await staffLogin.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*\/queue/);

    await page.goto(`/employee/requests/${createdRequestId}`);
    await expect(page.locator('button:has-text("Back to Request Queue")')).toBeVisible();

    // Verify "Request payment" is visible and "Mark ready and start processing" is NOT visible
    await expect(page.locator('button:has-text("Request payment")')).toBeVisible();
    await expect(page.locator('button:has-text("Mark ready and start processing")')).not.toBeVisible();
  });

  test('(11) calling mark-ready-and-start-processing and complete without a confirmed payment returns 409', async ({
    request,
  }) => {
    // Attempt mark-ready-and-start-processing without confirmed payment
    const markRes = await request.post(
      `${API_BASE}/requests/${createdRequestId}/mark-ready-and-start-processing`,
      { headers: getAuthHeaders(staffToken) }
    );
    expect(markRes.status()).toBe(409);

    // Attempt complete without confirmed payment
    const completeRes = await request.post(`${API_BASE}/requests/${createdRequestId}/complete`, {
      headers: getAuthHeaders(staffToken),
      data: {
        collection_instructions: 'Collect from office',
        fee_collected: true,
        amount: 50,
      },
    });
    expect(completeRes.status()).toBe(409);
  });

  test('(12) an invalid payment signature returns 400 and the request stays out of Processing', async ({
    request,
  }) => {
    // 1. Staff requests payment
    const reqPayRes = await request.post(`${API_BASE}/requests/${createdRequestId}/request-payment`, {
      headers: getAuthHeaders(staffToken),
    });
    expect(reqPayRes.ok()).toBeTruthy();
    const payData = await reqPayRes.json();
    paymentId = payData.id;

    // 2. Create Razorpay order via API
    const orderRes = await request.post(
      `${API_BASE}/requests/${createdRequestId}/payments/${paymentId}/razorpay-order`,
      { headers: getAuthHeaders(citizenToken) }
    );
    expect(orderRes.ok()).toBeTruthy();
    const orderData = await orderRes.json();

    // 3. Attempt verify with deliberately invalid signature
    const verifyRes = await request.post(
      `${API_BASE}/requests/${createdRequestId}/payments/${paymentId}/razorpay-verify`,
      {
        headers: getAuthHeaders(citizenToken),
        data: {
          razorpay_order_id: orderData.order_id,
          razorpay_payment_id: `pay_test_${Date.now()}`,
          razorpay_signature: 'deliberately_invalid_signature_hex_1234567890abcdef',
        },
      }
    );
    expect(verifyRes.status()).toBe(400);

    // 4. Verify request status is still PAYMENT_PENDING (not PROCESSING)
    const checkReq = await request.get(`${API_BASE}/requests/${createdRequestId}`, {
      headers: getAuthHeaders(citizenToken),
    });
    const statusData = await checkReq.json();
    expect(statusData.status).toBe('PAYMENT_PENDING');
  });

  test('(13) a valid signature moves the request to Processing automatically and the receipt shows on the request page', async ({
    page,
    request,
  }) => {
    // 1. Create a new order or get existing order info
    const orderRes = await request.post(
      `${API_BASE}/requests/${createdRequestId}/payments/${paymentId}/razorpay-order`,
      { headers: getAuthHeaders(citizenToken) }
    );
    expect(orderRes.ok()).toBeTruthy();
    const orderData = await orderRes.json();

    const paymentRefId = `pay_test_${Date.now()}`;
    const validSignature = computeRazorpaySignature(orderData.order_id, paymentRefId);

    // 2. Call verify endpoint with valid HMAC signature
    const verifyRes = await request.post(
      `${API_BASE}/requests/${createdRequestId}/payments/${paymentId}/razorpay-verify`,
      {
        headers: getAuthHeaders(citizenToken),
        data: {
          razorpay_order_id: orderData.order_id,
          razorpay_payment_id: paymentRefId,
          razorpay_signature: validSignature,
        },
      }
    );
    expect(verifyRes.ok()).toBeTruthy();
    const verifyData = await verifyRes.json();
    expect(verifyData.status).toBe('CONFIRMED');

    // 3. Request moved to PROCESSING automatically
    const checkReq = await request.get(`${API_BASE}/requests/${createdRequestId}`, {
      headers: getAuthHeaders(citizenToken),
    });
    const statusData = await checkReq.json();
    expect(statusData.status).toBe('PROCESSING');

    // 4. Citizen visits request page and sees receipt
    await page.goto('/login');
    const citLogin = page.locator('[data-testid="login-form"]:visible');
    await citLogin.locator('input[type="email"]').fill(citizenEmail);
    await citLogin.locator('input[type="password"]').fill(PASSWORD);
    await citLogin.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*\/dashboard/);

    await page.goto(`/requests/${createdRequestId}`);
    await expect(page.getByText('Processing', { exact: true })).toBeVisible();
    await expect(page.getByText('CONFIRMED', { exact: true })).toBeVisible();
    await expect(page.getByText('Paid on:', { exact: false })).toBeVisible();
  });

  test('(14) staff complete the request with a certificate upload, and the citizen can download it', async ({
    page,
  }) => {
    // 1. Staff logs in to request workspace
    await page.goto('/login');
    const staffLogin = page.locator('[data-testid="login-form"]:visible');
    await staffLogin.locator('input[type="email"]').fill('employee1.ernakulam@akshaya.test');
    await staffLogin.locator('input[type="password"]').fill(PASSWORD);
    await staffLogin.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*\/queue/);

    await page.goto(`/employee/requests/${createdRequestId}`);
    await expect(page.locator('button:has-text("Mark completed")')).toBeVisible();

    // 2. Click "Mark completed" and fill instructions
    await page.locator('button:has-text("Mark completed")').click();
    await expect(page.getByText('Complete Service Delivery')).toBeVisible();

    const instructionsTextarea = page.locator('textarea').first();
    await instructionsTextarea.fill('Income certificate #INC-2026-999 is signed and available for collection at Kaloor centre.');
    await page.locator('button:has-text("Complete & Deliver Output")').click();

    // Verify staff sees completion notification and status Completed
    await expect(page.getByText('Request completed and output delivered.')).toBeVisible();
    await expect(page.getByText('Completed', { exact: true })).toBeVisible();

    // 3. Citizen views request page and sees output collection instructions
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
    await expect(page.getByText('Request Completed', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Income certificate #INC-2026-999 is signed and available for collection at Kaloor centre.')
    ).toBeVisible();
  });
});
