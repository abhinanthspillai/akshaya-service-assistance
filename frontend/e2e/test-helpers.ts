import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface EnvSecrets {
  jwtSecret: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
}

let cachedSecrets: EnvSecrets | null = null;

export function getLocalSecrets(): EnvSecrets {
  if (cachedSecrets) return cachedSecrets;

  const envPath = path.resolve(__dirname, '../../backend/.env');
  let jwtSecret = process.env.JWT_SECRET_KEY || '';
  let razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
  let razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';

  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (key === 'JWT_SECRET_KEY' && !jwtSecret) jwtSecret = val;
      if (key === 'RAZORPAY_KEY_ID' && !razorpayKeyId) razorpayKeyId = val;
      if (key === 'RAZORPAY_KEY_SECRET' && !razorpayKeySecret) razorpayKeySecret = val;
    }
  }

  cachedSecrets = {
    jwtSecret: jwtSecret || 'replace_with_secure_secret',
    razorpayKeyId: razorpayKeyId || 'rzp_test_placeholder',
    razorpayKeySecret: razorpayKeySecret || 'placeholder_secret',
  };

  return cachedSecrets;
}

export function computeRazorpaySignature(orderId: string, paymentId: string, secret?: string): string {
  const actualSecret = secret || getLocalSecrets().razorpayKeySecret;
  const payload = `${orderId}|${paymentId}`;
  return crypto.createHmac('sha256', actualSecret).update(payload).digest('hex');
}

export const API_BASE = 'http://127.0.0.1:8000/api/v1';
export const PASSWORD = 'Password123!';

export async function getBearerToken(email: string, password = PASSWORD): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: email, password }).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to login ${email}: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}
