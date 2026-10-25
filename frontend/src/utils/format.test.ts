import { describe, it, expect } from 'vitest';
import { formatFee, formatStatus, formatRelativeTime } from './format';

describe('formatFee', () => {
  it('formats positive numbers correctly', () => {
    expect(formatFee(50)).toBe('₹50.00');
    expect(formatFee(12.5)).toBe('₹12.50');
  });

  it('formats numeric strings (e.g. from backend Decimal serialization) correctly', () => {
    expect(formatFee('50.00')).toBe('₹50.00');
    expect(formatFee('25')).toBe('₹25.00');
    expect(formatFee('100.75')).toBe('₹100.75');
  });

  it('returns "Free" for zero, negative, null, undefined, or empty values', () => {
    expect(formatFee(0)).toBe('Free');
    expect(formatFee('0')).toBe('Free');
    expect(formatFee('0.00')).toBe('Free');
    expect(formatFee(-10)).toBe('Free');
    expect(formatFee(null)).toBe('Free');
    expect(formatFee(undefined)).toBe('Free');
    expect(formatFee('')).toBe('Free');
    expect(formatFee('abc')).toBe('Free');
  });
});

describe('formatStatus', () => {
  it('formats known status codes', () => {
    expect(formatStatus('SUBMITTED')).toBe('Submitted');
    expect(formatStatus('WAITING_FOR_CENTRE')).toBe('Waiting for Akshaya Centre');
  });

  it('formats unknown status codes into title case', () => {
    expect(formatStatus('custom_status_code')).toBe('Custom Status Code');
  });
});

describe('formatRelativeTime', () => {
  it('returns readable relative time', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('Just now');
  });
});
