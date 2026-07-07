import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  emailOrderReceived,
  emailNewOrderAdmin,
  emailStatusUpdate,
} from '@/lib/email';

const ITEMS = [{ item_name: 'Jollof Rice', qty: 2, unit_price: 3500 }];

function fetchMock() {
  return vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('fetch', fetchMock());
  // Reset env read at call time.
  delete process.env.RESEND_API_KEY;
  delete process.env.ADMIN_EMAIL;
  process.env.RESEND_FROM_EMAIL = 'Chop & Drop <test@resend.dev>';
});

describe('emailOrderReceived', () => {
  it('POSTs to Resend with auth header, recipient and "received" subject when key is set', async () => {
    process.env.RESEND_API_KEY = 'test-key-123';
    await emailOrderReceived({
      email: 'diner@example.com',
      name: 'Ada',
      orderId: 'abcdef1234567890',
      items: ITEMS,
      total: 7000,
      mode: 'delivery',
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = (fetch as any).mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(opts.headers.Authorization).toBe('Bearer test-key-123');
    const body = JSON.parse(opts.body);
    expect(body.to).toBe('diner@example.com');
    expect(body.subject.toLowerCase()).toContain('received');
  });

  it('does NOT call fetch when RESEND_API_KEY is unset', async () => {
    await expect(
      emailOrderReceived({
        email: 'diner@example.com',
        name: 'Ada',
        orderId: 'abcdef1234567890',
        items: ITEMS,
        total: 7000,
        mode: 'delivery',
      })
    ).resolves.not.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('emailNewOrderAdmin', () => {
  const payload = {
    orderId: 'abcdef1234567890',
    customerName: 'Ada',
    customerEmail: 'diner@example.com',
    customerPhone: '08031234567',
    items: ITEMS,
    total: 7000,
    mode: 'delivery',
  };

  it('does NOT call fetch when ADMIN_EMAIL is unset, even with API key set', async () => {
    process.env.RESEND_API_KEY = 'test-key-123';
    await emailNewOrderAdmin(payload);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('calls fetch to the admin email when both env vars are set', async () => {
    process.env.RESEND_API_KEY = 'test-key-123';
    process.env.ADMIN_EMAIL = 'admin@chop.ng';
    await emailNewOrderAdmin(payload);

    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(body.to).toBe('admin@chop.ng');
  });
});

describe('emailStatusUpdate', () => {
  const base = {
    email: 'diner@example.com',
    name: 'Ada',
    orderId: 'abcdef1234567890',
  };

  it('does NOT call fetch for an unknown status', async () => {
    process.env.RESEND_API_KEY = 'test-key-123';
    await emailStatusUpdate({ ...base, status: 'bogus' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('calls fetch with a subject reflecting a known status', async () => {
    process.env.RESEND_API_KEY = 'test-key-123';
    await emailStatusUpdate({ ...base, status: 'delivered' });

    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(body.subject.toLowerCase()).toContain('delivered');
  });
});
